(function (root) {
  'use strict';
  const D = root.ForestData, C = root.ForestCore, W = root.ForestWorld;
  const $ = s => document.querySelector(s);
  const esc = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function create(app) {
    const panel = $('#panel'), content = $('#panel-content');
    let openKind = '', context = null, toastTimer, lastHTML = '';
    const button = (label, action, id = '', disabled = false, secondary = false) => `<button class="btn${secondary ? ' secondary' : ''}" data-action="${action}" data-id="${id}" ${disabled ? 'disabled' : ''}>${label}</button>`;
    function row(name, desc, actions, color = '#b9c69b') { return `<div class="item-row"><span class="swatch" style="--item-color:${color}"></span><div class="item-body"><h3>${esc(name)}</h3><p>${desc}</p></div>${actions}</div>`; }
    function toast(text) { clearTimeout(toastTimer); $('#scene-toast').textContent = text; $('#scene-toast').classList.add('show'); toastTimer = setTimeout(() => $('#scene-toast').classList.remove('show'), 3300); }
    function refresh() {
      const s = app.state, map = W.maps[s.player.map], order = C.currentOrder(s);
      $('#coin-amount').textContent = s.coins;
      $('#area-name').textContent = $('#map-label').textContent = map.name;
      $('#area-subtitle').textContent = map.subtitle;
      $('#current-tool').textContent = { plant: '种植' + D.crops[s.selectedSeed].name, water: '浇水', harvest: '收获' }[s.tool];
      $('#quest-preview').innerHTML = `<p class="side-label">下一页故事</p><h3 class="side-title">先去认识这片森林</h3><p class="side-copy">已探索 ${s.world.visited.length} / 3 个地方<br>种点蔬菜，带上收获拜访邻居。</p><button class="side-link" data-menu="journal">翻开生活手札 ↗</button>`;
      $('#order-preview').innerHTML = `<p class="side-label">邻里的小心愿 / ${s.ordersCompleted} 单已送达</p><h3 class="side-title">${order.name}</h3><p class="side-copy">${Object.entries(order.wants).map(([id, n]) => `${D.crops[id].name} ${s.inventory[id] || 0}/${n}`).join(' · ')}</p><p class="side-copy">报酬 ${C.reward(order)} 叶币</p>`;
      const target = W.target(s);
      $('#interaction-label').textContent = target ? target.kind === 'plot' ? `${target.name} · ${s.tool === 'plant' ? '种植' : s.tool === 'water' ? '浇水' : '收获'}` : target.name : '点地图走走，或用方向键移动';
      const day = Math.floor(s.world.elapsed / D.dayLength) + 1, t = (s.world.elapsed % D.dayLength) / D.dayLength;
      $('#day-time').textContent = `第 ${day} 天 · ${t < .25 ? '清晨' : t < .55 ? '午后' : t < .75 ? '黄昏' : '星夜'}`;
      if (panel.open) render();
    }
    function open(kind, data = null) {
      openKind = kind; context = data; app.stopWalking(); render();
      if (!panel.open) panel.showModal();
    }
    function close() { panel.close(); openKind = ''; app.canvas.focus({ preventScroll: true }); }
    function render() {
      const s = app.state; let title = '', html = '';
      if (openKind === 'tools') {
        title = '口袋里的种植工具';
        html = '<p class="panel-copy">选好工具，走到农田旁按 E，或直接点击地块走近操作。</p><div class="btn-row">' + ['plant', 'water', 'harvest'].map(id => button({ plant: '种植', water: '浇水', harvest: '收获' }[id], 'tool', id, false, s.tool !== id)).join('') + '</div>';
        html += Object.entries(D.crops).map(([id, crop]) => row(crop.name, `种子 ${s.seeds[id] || 0} 颗 · 生长 ${crop.growTime} 秒`, button(s.selectedSeed === id ? '已选' : '选择', 'seed', id), crop.color)).join('');
      } else if (openKind === 'bag') {
        title = '随身的小背包';
        html = `<p class="panel-copy">收获可以出售，也可以留给订单。装饰品可摆在农场的空装饰位或空地块上。</p><p class="pill">木材 ${s.materials.wood} · 石料 ${s.materials.stone}</p>`;
        html += Object.entries(s.inventory).filter(([, n]) => n > 0).map(([id, n]) => {
          const crop = D.crops[id], item = D.items[id];
          return row((crop || item).name + ' × ' + n, crop ? `出售 ${crop.sellPrice} 叶币 / 个` : item.kind === 'decor' ? '保留一份家的温度' : '食用或送出可换回部分叶币', button(crop ? '出售' : item.kind === 'decor' ? '摆放' : '使用', item && item.kind === 'decor' ? 'place' : 'sell', id), crop && crop.color);
        }).join('') || '<p class="empty">背包还空着，去种下第一颗种子吧。</p>';
        html += '<h3 class="side-title" style="margin-top:20px">种子口袋</h3><p class="panel-copy">' + Object.entries(D.crops).map(([id, c]) => c.name + ' ' + (s.seeds[id] || 0)).join(' · ') + '</p>';
      } else if (openKind === 'shop') {
        title = '栗栗杂货铺';
        html = '<p class="panel-copy">一颗种子，就是一个新的小计划。</p>';
        html += Object.entries(D.crops).map(([id, c]) => row(c.name + '种子', `拥有 ${s.seeds[id] || 0} 颗 · 成熟后可售 ${c.sellPrice} 叶币`, button(c.seedPrice + ' 叶币', 'buyseed', id, s.coins < c.seedPrice), c.color)).join('');
        html += '<h3 class="side-title" style="margin-top:20px">杂货与小礼物</h3>';
        html += Object.entries(D.items).filter(([, item]) => Number.isFinite(item.price)).map(([id, item]) => row(item.name, `拥有 ${s.inventory[id] || 0} 件`, button(item.price + ' 叶币', 'buy', id, s.coins < item.price))).join('');
      } else if (openKind === 'orders') {
        title = '邻里订单板'; const order = C.currentOrder(s), n = D.neighbors.find(n => n.id === order.neighbor);
        html = `<p class="panel-copy">没有截止日期。慢慢种，等作物成熟了再来。已完成 ${s.ordersCompleted} 单。</p><article class="order-card"><span class="eyebrow">来自${n.name}的信</span><h3>${order.name}</h3>${Object.entries(order.wants).map(([id, count]) => `<div class="ingredient ${(s.inventory[id] || 0) >= count ? 'enough' : ''}"><span>${D.crops[id].name}</span><span>${s.inventory[id] || 0} / ${count}</span></div>`).join('')}<div class="reward">${C.reward(order)} 叶币<small>比直接出售多 50% · 向上取整</small></div>${button('交付这一份心意', 'deliver', '', !C.canDeliver(s))}</article>`;
      } else if (openKind === 'npc') {
        const n = D.neighbors.find(n => n.id === context.id); title = n.name + '的问候'; html = `<p class="panel-copy">${n.greeting}</p><p class="pill">最喜欢${D.crops[n.likes].name}</p>`;
      } else if (openKind === 'workbench') {
        title = '让双手做一点喜欢的东西';
        html = `<p class="panel-copy">材料来自风铃森林。每日可重新采集，也可以回小屋休息迎接新的一天。</p><p class="pill">木材 ${s.materials.wood} · 石料 ${s.materials.stone}</p>`;
        html += Object.entries(D.recipes).map(([id, r]) => row(r.name, Object.entries(r.costs).map(([k,n]) => `${D.materialNames[k]} ${n}`).join(' · ') + ` · 已制作 ${s.crafted[id] || 0} 件`, button('制作', 'craft', id, !C.affordable(s,r.costs)))).join('');
      } else if (openKind === 'expand') {
        title = '把家园慢慢种大'; const next = D.expansions[s.expansion];
        html = `<p class="panel-copy">扩建等级 ${s.expansion} / 3 · 农田 ${s.plots.length} 块 · 装饰位 ${3+s.expansion*2} 个。每级新增 5 块农田和 2 个装饰位。</p>`;
        html += next ? `<div class="order-card"><h3>${next.name}</h3><p class="panel-copy">${next.coins} 叶币 · ${Object.entries(next.costs).map(([k,n])=>`${D.materialNames[k]} ${s.materials[k]}/${n}`).join(' · ')}</p>${button('开始扩建', 'expand', '', s.coins < next.coins || !C.affordable(s,next.costs))}</div>` : '<p class="notice">家园已经全部开放。好好享受你亲手布置的小天地吧。</p>';
      } else if (openKind === 'home') {
        title = '灯亮着的地方就是家';
        html = `<p class="panel-copy">今天也辛苦了。休息会迎来下一个清晨，森林材料会重新出现。作物依旧按现实时间慢慢成长。</p>${button('休息到明天', 'rest')}<div class="btn-row">${button('翻开手札', 'journal', '', false, true)}</div>`;
      } else if (openKind === 'settings') {
        title = '把日子调成喜欢的样子';
        html = `<label class="setting-row">静音<input type="checkbox" data-setting="mute" ${s.settings.mute ? 'checked' : ''}></label><label class="setting-row">减少动态效果<input type="checkbox" data-setting="reducedMotion" ${s.settings.reducedMotion ? 'checked' : ''}></label><p class="panel-copy">存档保存在当前浏览器。换浏览器或设备前，请先导出备份。</p><div class="btn-row">${button('导出存档', 'export')}${button('导入存档', 'import', '', false, true)}${button('导出原始备份', 'raw', '', false, true)}</div><p class="panel-copy">WASD / 方向键移动，E 互动，B 背包，J 手札，Esc 关闭。点击地图会自动走近目标；手机也能用底部方向按钮。</p>${app.protected ? '<p class="notice">原始存档有问题，自动保存已暂停。先导出原始备份，再导入有效存档恢复。</p>' : ''}`;
      } else if (openKind === 'journal') {
        title = '森林生活手札'; html = '<p class="panel-copy">欢迎搬来苔光小筑。这里没有催促你的钟声，只有等你浇水的幼苗。</p>' + ['农场：靠近地块，选种子、浇水、收获。', '向东：栗风小镇的杂货铺和邻居们。', '向北：风铃森林里有松树和池塘。', '订单：把收获留在背包，交付可赚更多叶币。', '保存：所有重要操作会立即存档。'].map(x => `<div class="item-row"><p class="panel-copy">${x}</p></div>`).join('');
      } else {
        title = context ? context.name : '林间的一角'; html = '<p class="panel-copy">这里的故事还在慢慢生长。先到森林与小镇看看，或者回农田种下新作物。</p>';
      }
      $('#panel-title').textContent = title;
      if (lastHTML !== html) {
        const active = document.activeElement, action = active && active.dataset.action, id = active && active.dataset.id;
        const scroll = panel.scrollTop; content.innerHTML = html; lastHTML = html; panel.scrollTop = scroll;
        if (action) { const next = Array.from(content.querySelectorAll('[data-action]')).find(n => n.dataset.action === action && n.dataset.id === id); if (next) next.focus({ preventScroll: true }); }
      }
    }
    document.addEventListener('click', e => {
      const menu = e.target.closest('[data-menu]'); if (menu) open(menu.dataset.menu);
      const node = e.target.closest('[data-action]'); if (!node || node.disabled) return;
      const id = node.dataset.id, action = node.dataset.action, s = app.state;
      if (action === 'tool') { s.tool = id; app.save(); refresh(); }
      if (action === 'seed') { s.selectedSeed = id; s.tool = 'plant'; app.save(); refresh(); }
      if (action === 'buyseed' || action === 'buy') app.perform(() => C.buy(s, id, action === 'buyseed'));
      if (action === 'sell') app.perform(() => C.sell(s, id));
      if (action === 'deliver') app.perform(() => C.deliver(s));
      if (action === 'craft') app.perform(() => C.craft(s, id));
      if (action === 'expand') app.perform(() => C.expand(s));
      if (action === 'rest') { app.perform(() => C.rest(s)); close(); }
      if (action === 'journal') open('journal');
      if (action === 'place') {
        if (s.player.map !== 'farm') { toast('回农场再布置吧。'); return; }
        const o = context && context.kind === 'decor' ? context : W.target(s);
        if (o && o.kind === 'decor' && W.near(s.player,o)) { app.perform(() => C.place(s, id, Number(o.id.slice(6)))); return; }
        const p = o && o.kind === 'plot' ? s.plots[Number(o.id.slice(5))] : null;
        if (!p || p.crop || p.decoration) { toast('先走到一块空农田旁，再从背包摆放。'); return; }
        p.decoration = id; s.inventory[id]--; app.save(); refresh(); toast('把喜欢的东西放在家里。');
      }
      if (action === 'export' || action === 'raw') app.download(action === 'raw');
      if (action === 'import') $('#import-file').click();
    });
    content.addEventListener('change', e => { const id = e.target.dataset.setting; if (id) { app.state.settings[id] = e.target.checked; app.applySettings(); app.save(); } });
    $('#close-panel').addEventListener('click', close);
    panel.addEventListener('close', () => { openKind = ''; app.stopWalking(); });
    $('#farm-tools').addEventListener('click', () => open('tools'));
    return { open, close, refresh, toast, get isOpen() { return panel.open; } };
  }
  root.ForestUI = { create, esc };
})(globalThis);
