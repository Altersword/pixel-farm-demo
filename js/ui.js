(function (root) {
  'use strict';
  const D = root.ForestData, C = root.ForestCore, W = root.ForestWorld, E = root.ForestEnvironment, N = root.ForestNeighbors;
  const $ = s => document.querySelector(s);
  const esc = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function create(app) {
    const panel = $('#panel'), content = $('#panel-content');
    let openKind = '', context = null, toastTimer, lastHTML = '', eventStep = 0;
    const button = (label, action, id = '', disabled = false, secondary = false) => `<button class="btn${secondary ? ' secondary' : ''}" data-action="${action}" data-id="${id}" ${disabled ? 'disabled' : ''}>${label}</button>`;
    const mini = root.ForestActivitiesUI.create(app, { toast, refresh });
    function row(name, desc, actions, color = '#b9c69b') { return `<div class="item-row"><span class="swatch" style="--item-color:${color}"></span><div class="item-body"><h3>${esc(name)}</h3><p>${desc}</p></div>${actions}</div>`; }
    function toast(text) {
      clearTimeout(toastTimer); $('#scene-toast').textContent = text; $('#scene-toast').classList.add('show');
      const notice = $('#panel-notice'); notice.textContent = text; notice.hidden = !panel.open;
      toastTimer = setTimeout(() => { $('#scene-toast').classList.remove('show'); notice.hidden = true; }, 5000);
    }
    function refresh() {
      const s = app.state, map = W.maps[s.player.map], order = C.currentOrder(s);
      $('#coin-amount').textContent = s.coins;
      $('#area-name').textContent = $('#map-label').textContent = map.name;
      $('#area-subtitle').textContent = map.subtitle;
      $('#current-tool').textContent = { plant: '种植' + D.crops[s.selectedSeed].name, water: '浇水', harvest: '收获' }[s.tool];
      const quest = C.quest(s);
      $('#quest-preview').innerHTML = `<p class="side-label">${quest.complete ? '故事仍在继续' : '下一页故事'}</p><h3 class="side-title">${quest.title}</h3><p class="side-copy">${quest.desc}<br>${quest.progress}</p><button class="side-link" data-menu="journal">${quest.done ? '心愿已完成 · 领取来信 ↗' : '翻开生活手札 ↗'}</button>`;
      $('#order-preview').innerHTML = `<p class="side-label">邻里的小心愿 / ${s.ordersCompleted} 单已送达</p><h3 class="side-title">${order.name}</h3><p class="side-copy">${Object.entries(order.wants).map(([id, n]) => `${D.crops[id].name} ${s.inventory[id] || 0}/${n}`).join(' · ')}</p><p class="side-copy">报酬 ${C.reward(order)} 叶币</p>`;
      const target = W.target(s);
      $('#interaction-label').textContent = target ? target.kind === 'plot' ? `${target.name} · ${s.tool === 'plant' ? '种植' : s.tool === 'water' ? '浇水' : '收获'}` : target.name : '点地图走走，或用方向键移动';
      const day = Math.floor(s.world.elapsed / D.dayLength) + 1, t = (s.world.elapsed % D.dayLength) / D.dayLength;
      $('#day-time').textContent = `第 ${day} 天 · ${E.periods[E.period(s)]}`;
      $('#day-phase').textContent = `${E.names[E.weather(s)]} · 明日${E.names[E.weather(s,1)]}`;
      if (panel.open) render();
    }
    function open(kind, data = null) {
      if(app.placement)app.cancelPlacement();
      openKind = kind; context = data; eventStep = 0; $('#panel-notice').hidden = true; app.stopWalking();
      if (kind === 'activity') mini.start(data.id);
      render();
      if (!panel.open) panel.showModal();
    }
    function close() { panel.close(); openKind = ''; app.canvas.focus({ preventScroll: true }); }
    function render() {
      const s = app.state; let title = '', html = '';
      if (openKind === 'welcome') {
        title = '欢迎搬来苔光小筑';
        html = `<p class="dialogue-copy">「森林不赶时间。<br>我们也慢慢来。」</p><div class="item-row"><p class="panel-copy">① 方向键 / WASD 移动，也能点击地图自动走近。</p></div><div class="item-row"><p class="panel-copy">② 选好种子，靠近农田按 E；1/2/3 切换种植、浇水、收获。</p></div><div class="item-row"><p class="panel-copy">③ 向北探索森林，向东拜访小镇。用收获完成邻居订单，手札会记录下一步。</p></div><p class="panel-copy">你的进度会自动保存在这个浏览器，设置里可以导出备份。声音默认关闭，随时可以开启。</p>${button('种下第一份期待','welcome')}`;
      } else if (openKind === 'tools') {
        title = '口袋里的种植工具';
        html = '<p class="panel-copy">选好工具，走到农田旁按 E，或直接点击地块走近操作。</p><div class="btn-row">' + ['plant', 'water', 'harvest'].map(id => button({ plant: '种植', water: '浇水', harvest: '收获' }[id], 'tool', id, false, s.tool !== id)).join('') + '</div>';
        html += Object.entries(D.crops).map(([id, crop]) => row(crop.name, `种子 ${s.seeds[id] || 0} 颗 · 生长 ${crop.growTime} 秒`, button(s.selectedSeed === id ? '已选' : '选择', 'seed', id), crop.color)).join('');
      } else if (openKind === 'bag') {
        title = '随身的小背包';
        html = `<p class="panel-copy">收获可以出售，也可以留给订单。装饰品可在农场摆放，也能带回小屋自由布置。</p><p class="pill">木材 ${s.materials.wood} · 石料 ${s.materials.stone}</p>`;
        html += Object.entries(s.inventory).filter(([, n]) => n > 0).map(([id, n]) => {
          const crop = D.crops[id], item = D.items[id];
          if(item?.kind==='food')return row(item.name+' × '+n,'在小屋餐桌旁留给朋友，不出售。',button('上桌招待','serve',id,!s.hospitality.active||s.hospitality.active.served||s.player.map!=='home'));
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
        const n = D.neighbors.find(n => n.id === context.id), f=s.friends[n.id]; title = n.name + '的问候';
        html = `<p class="eyebrow">${n.species} / ${f.points>=6?'亲密朋友':f.points>=3?'森林朋友':'初识的邻居'}</p><p class="dialogue-copy">「${C.dialogue(s,n.id)}」</p><p class="panel-copy">${esc(N.dialogue(s,n.id))}</p><p class="pill">好感 ${f.points} · 最喜欢${D.crops[n.likes].name}</p><p class="panel-copy">每天首次聊天 +1；交付这位邻居的订单 +2；每天可送一份喜欢的作物 +2。好感达到 3 收到纪念礼，达到 6 解锁新对话。</p>${button(`送一份${D.crops[n.likes].name}（拥有 ${s.inventory[n.likes]||0}）`,'gift',n.id,!(s.inventory[n.likes]>0)||f.lastGiftDay===C.day(s))}`;
        html += `<div class="btn-row">${button(s.story.activities[n.id]?'聚会心意已备好':'一起准备一份聚会心意','activity-open',n.id)}</div>`;
      } else if (openKind === 'activity') {
        title = D.activities[context.id].title; html = mini.render(context.id);
      } else if (openKind === 'exploration') {
        const e = root.ForestExploration.get(context.id), complete=s.exploration.completed.includes(e.id), available=E.weather(s)===e.weather;
        title = e.name;
        html = `<p class="pill">${E.names[e.weather]}的小故事 · ${e.hint}</p><p class="dialogue-copy">「${complete?e.after:e.intro}」</p>`;
        if(complete) html += '<p class="notice">已经记进手札。这里的风景会陪你继续生活。</p>';
        else if(!available) html += `<p class="panel-copy">等到${E.names[e.weather]}再来看看吧。今天${E.names[E.weather(s)]}，明天${E.names[E.weather(s,1)]}。回小屋休息就能迎接下一天。</p>`;
        else html += `<p class="panel-copy">${eventStep?'你已经完成了第一步，接下来……':'慢慢来，动手给森林留一点温柔。'}</p>${button(e.steps[eventStep], 'explore-step', e.id)}<p class="panel-copy">完成后收到 5 叶币；累计三个故事获得风铃，六个故事获得鸟屋。</p>`;
      } else if(openKind==='stove'){
        title='灶台上的小确幸';html='<p class="panel-copy">用自己的收获，做一份温暖。不需要计时，确认后即刻做好。</p>';
        html+=Object.entries(D.dishes).map(([id,d])=>row(d.name,Object.entries(d.costs).map(([k,n])=>`${D.crops[k].name} ${s.inventory[k]||0}/${n}`).join(' · ')+`<br>已做 ${s.cooking.made[id]||0} 份 · ${D.neighbors.find(n=>n.id===d.favorite).name}最喜欢`,button('制作','cook',id,!Object.entries(d.costs).every(([k,n])=>(s.inventory[k]||0)>=n)),d.color)).join('');
      } else if(openKind==='dining'){
        title='给朋友留一张餐椅';const v=s.hospitality.active;
        html='<p class="panel-copy">每次邀请一位已经认识的邻居，立即来访。每位朋友每天可获得一次料理好感：喜欢的料理 +2，其他料理 +1。</p>';
        if(v){const n=D.neighbors.find(n=>n.id===v.neighbor);html+=`<p class="pill">${n.name}正在做客 · ${v.served?'已经用餐':'等你上菜'}</p><p class="dialogue-copy">「${root.ForestCooking.dialogue(s)}」</p>`;
          if(!v.served)html+=Object.entries(D.dishes).map(([id,d])=>row(d.name,`拥有 ${s.inventory[id]||0} 份 · ${d.favorite===n.id?'最喜欢':'也会喜欢与你分享'}${s.hospitality.lastMealDay[n.id]===C.day(s)?'<br>今天已获得料理好感，本次不再加分':''}`,button('上桌','serve',id,!(s.inventory[id]>0)),d.color)).join('');
          html+=button('送朋友回家','end-visit','',false,true);
        }else html+=D.neighbors.map(n=>row(n.name,`${s.story.met.includes(n.id)?'已认识':'先去小镇打个招呼'} · 喜欢${Object.values(D.dishes).find(d=>d.favorite===n.id).name}${s.hospitality.hosted.includes(n.id)?' · 已招待':''}`,button('邀请做客','invite',n.id,!s.story.met.includes(n.id)))).join('');
      } else if (openKind === 'workbench') {
        title = '让双手做一点喜欢的东西';
        html = `<p class="panel-copy">材料来自风铃森林。每日可重新采集，也可以回小屋休息迎接新的一天。</p><p class="pill">木材 ${s.materials.wood} · 石料 ${s.materials.stone}</p>`;
        html += Object.entries(D.recipes).map(([id, r]) => row(r.name, Object.entries(r.costs).map(([k,n]) => `${D.materialNames[k]} ${n}`).join(' · ') + ` · 已制作 ${s.crafted[id] || 0} 件`, button('制作', 'craft', id, !C.affordable(s,r.costs)))).join('');
        html += '<h3 class="side-title">小屋家具</h3>';
        html += Object.entries(D.homeRecipes).map(([id,r])=>row(r.name,Object.entries(r.costs).map(([k,n])=>`${D.materialNames[k]} ${n}`).join(' · '),button('制作','craft-home',id,!C.affordable(s,r.costs)))).join('');
      } else if (openKind === 'expand') {
        title = '把家园慢慢种大'; const next = D.expansions[s.expansion];
        html = `<p class="panel-copy">扩建等级 ${s.expansion} / 3 · 农田 ${s.plots.length} 块 · 装饰位 ${3+s.expansion*2} 个。每级新增 5 块农田和 2 个装饰位。</p>`;
        html += next ? `<div class="order-card"><h3>${next.name}</h3><p class="panel-copy">${next.coins} 叶币 · ${Object.entries(next.costs).map(([k,n])=>`${D.materialNames[k]} ${s.materials[k]}/${n}`).join(' · ')}</p>${button('开始扩建', 'expand', '', s.coins < next.coins || !C.affordable(s,next.costs))}</div>` : '<p class="notice">家园已经全部开放。好好享受你亲手布置的小天地吧。</p>';
      } else if (openKind === 'home') {
        title = '灯亮着的地方就是家';
        html = `<p class="panel-copy">今天${E.names[E.weather(s)]}，明天${E.names[E.weather(s,1)]}。休息会迎来下一个清晨，森林材料会重新出现。作物依旧按现实时间慢慢成长。</p>${s.player.map==='farm'?button('进入小屋','enter-home'):''}${button('休息到明天', 'rest')}<div class="btn-row">${button('翻开手札', 'journal', '', false, true)}</div>`;
      } else if (openKind === 'settings') {
        title = '把日子调成喜欢的样子';
        html = `<label class="setting-row">静音<input type="checkbox" data-setting="mute" ${s.settings.mute ? 'checked' : ''}></label><label class="setting-row">减少动态效果<input type="checkbox" data-setting="reducedMotion" ${s.settings.reducedMotion ? 'checked' : ''}></label><p class="panel-copy">存档保存在当前浏览器。换浏览器或设备前，请先导出备份。</p><div class="btn-row">${button('导出存档', 'export')}${button('导入存档', 'import', '', false, true)}${button('导出原始备份', 'raw', '', false, true)}</div><p class="panel-copy">WASD / 方向键移动，E 互动，B 背包，J 手札，Esc 关闭。点击地图会自动走近目标；手机也能用底部方向按钮。</p>${app.protected ? `<p class="notice">原始存档有问题，自动保存已暂停。可先导出原始备份，导入有效存档恢复；也可保留损坏备份后启用当前新进度。</p>${button('启用新存档，保留损坏备份','recover')}` : ''}`;
      } else if (openKind === 'journal') {
        title = '森林生活手札'; const q=C.quest(s);
        html = `<div class="order-card"><span class="eyebrow">${q.complete?'A STORY THAT GOES ON':'A LETTER FOR YOU'}</span><h3>${q.title}</h3><p class="panel-copy">${q.desc}</p><p class="panel-copy">${q.progress}</p>${q.reward?button(`领取来信 · ${q.reward} 叶币`,'claim','',!q.done):''}</div><h3 class="side-title" style="margin-top:24px">邻居通讯录</h3>`;
        html += D.neighbors.map(n=>{const location=N.whereabouts(s,n.id);return row(n.name+' · '+n.species,`${s.story.met.includes(n.id)?'已认识':'尚未见面'} · 好感 ${s.friends[n.id].points}<br>${W.maps[location.map].name} · ${location.travelling?'正在前往':''}${location.name}`,button('去找'+n.name,'follow',n.id,false,true),n.color);}).join('');
        html += `<h3 class="side-title" style="margin-top:24px">天气里的小故事 · ${s.exploration.completed.length}/6</h3><p class="panel-copy">三个故事：风的问候铃；六个故事：林间鸟屋。故事没有截止日期，也不影响聚会主线。</p>`;
        html += root.ForestExploration.events.map(e=>row(e.name,`${s.exploration.completed.includes(e.id)?'已完成':s.exploration.discovered.includes(e.id)?'已发现':'等待发现'} · ${E.names[e.weather]}<br>${W.maps[e.map].name} · ${e.hint}`,'')).join('');
        html += '<p class="panel-copy">小屋休息后，森林材料和聊天送礼次数会补充。作物按现实时间成长；可趁等待时探索、拜访和制作。地图点击可自动寻路，1/2/3 快速切换农具。</p>';
      } else if (openKind === 'festival') {
        title = s.story.festival ? '灯火亮起，我们都是家人' : '为森林留一张团聚的桌子';
        html = s.story.festival ? `<div class="celebration"><span class="eyebrow">THE WOODS FEEL LIKE HOME</span><h3>欢迎成为森林的一部分。</h3><p>果酱、蔬菜汤和一桌熟悉的笑脸。<br>你种下的不只是作物，也是一段新的生活。</p></div>${D.neighbors.map(n=>row(n.name,C.dialogue(s,n.id),'',n.color)).join('')}<p class="panel-copy">主线完成后可以继续经营、制作、交付订单，与朋友们迎接更多清晨。</p>` : `<p class="dialogue-copy">「等到灯亮起来，我们就在这里见。」</p><p class="panel-copy">${C.quest(s).desc}</p>${button('邀请大家，开始森林聚会','festival','',s.story.stage!==5)}`;
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
      if (action === 'gift') app.perform(() => C.gift(s,id));
      if (action === 'claim') app.perform(() => C.claimQuest(s));
      if (action === 'festival') app.perform(() => C.festival(s));
      if (action === 'enter-home') { const result=app.perform(()=>C.enterHome(s));if(result.ok)close(); }
      if(action==='cook')app.perform(()=>C.cook(s,id));
      if(action==='invite')app.perform(()=>C.invite(s,id));
      if(action==='serve')app.perform(()=>C.serve(s,id));
      if(action==='end-visit')app.perform(()=>C.endVisit(s));
      if (action === 'craft-home') app.perform(()=>C.craftHome(s,id));
      if (action === 'craft') app.perform(() => C.craft(s, id));
      if (action === 'expand') app.perform(() => C.expand(s));
      if (action === 'rest') { app.perform(() => C.rest(s)); close(); }
      if (action === 'journal') open('journal');
      if (action === 'follow') app.follow(id);
      if (action === 'explore-step' && openKind === 'exploration' && context.id === id) {
        if(eventStep === 0) { eventStep=1; toast('第一步完成了，再留下一点心意。'); render(); }
        else { app.perform(() => root.ForestExploration.complete(s,id)); }
      }
      if (action === 'activity-open') open('activity', { id });
      else if (action === 'activity-back') open('npc', { id });
      else if (action.startsWith('activity-')) mini.action(action,id);
      if (action === 'welcome') { s.settings.onboardingSeen = true; app.save(); close(); }
      if (action === 'recover') app.recover();
      if (action === 'place') {
        if(s.player.map==='home'){app.startPlacement(id);return;}
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
    panel.addEventListener('close', () => { if (!panel.open) { openKind = ''; app.canvas.focus({ preventScroll: true }); } });
    $('#farm-tools').addEventListener('click', () => open('tools'));
    return { open, close, refresh, toast, tick() { if (panel.open && openKind === 'activity') mini.tick(); }, get isOpen() { return panel.open; } };
  }
  root.ForestUI = { create, esc };
})(globalThis);
