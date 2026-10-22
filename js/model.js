(function (root) {
  'use strict';
  const D = root.ForestData;
  const emptyPlot = () => ({ crop: null, progress: 0, watered: false, plantedAt: null });
  function newGame() {
    return {
      version: 3, coins: 100, tool: 'plant', selectedSeed: 'tomato',
      plots: Array.from({ length: 15 }, emptyPlot), inventory: {},
      seeds: { tomato: 5, carrot: 3, corn: 2, strawberry: 2, watermelon: 2 },
      ordersCompleted: 0, player: { map: 'farm', x: 14, y: 8, facing: 'down' },
      world: { elapsed: 0, visited: ['farm'], gathered: {} }, settings: { mute: true, reducedMotion: false, onboardingSeen: false },
      materials: { wood: 0, stone: 0 }, crafted: {}, expansion: 0, decorations: [],
    };
  }
  function migrate(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('存档必须是有效的对象');
    if (input.version !== undefined && input.version !== 2 && input.version !== 3) throw new Error('此存档版本暂不支持');
    const state = newGame();
    const nonnegative = value => Number.isSafeInteger(value) && value >= 0 && value <= 1e9;
    for (const field of ['coins', 'ordersCompleted']) {
      if (input[field] !== undefined) {
        if (!nonnegative(input[field])) throw new Error(`${field} 数值无效`);
        state[field] = input[field];
      }
    }
    for (const field of ['seeds', 'inventory']) {
      if (input[field] !== undefined) {
        if (!input[field] || typeof input[field] !== 'object' || Array.isArray(input[field])) throw new Error('库存格式无效');
        const allowed = field === 'seeds' ? Object.keys(D.crops) : [...Object.keys(D.crops), ...Object.keys(D.items)];
        state[field] = {};
        for (const key of allowed) {
          const value = input[field][key];
          if (value !== undefined) {
            if (!nonnegative(value)) throw new Error('库存数量无效');
            state[field][key] = value;
          } else if (field === 'seeds') state[field][key] = 2;
        }
      }
    }
    if (input.plots !== undefined) {
      if (!Array.isArray(input.plots) || input.plots.length > 30) throw new Error('农田格式无效');
      state.plots = input.plots.map(plot => {
        if (!plot || typeof plot !== 'object' || (plot.crop !== null && (typeof plot.crop !== 'string' || !Object.hasOwn(D.crops, plot.crop)))) throw new Error('未知作物');
        const p = emptyPlot();
        p.crop = plot.crop;
        if (p.crop) {
          if (!Number.isFinite(plot.plantedAt) || plot.plantedAt < 0) throw new Error('种植时间无效');
          p.plantedAt = plot.plantedAt;
          p.watered = !!plot.watered;
          p.progress = Math.max(0, Math.min(Number(plot.progress) || 0, 100));
        }
        if (plot.decoration) {
          const id = D.legacyDecor[plot.decoration] || plot.decoration;
          if (!D.items[id] || D.items[id].kind !== 'decor') throw new Error('未知装饰');
          p.decoration = id;
        }
        return p;
      });
      while (state.plots.length < 15) state.plots.push(emptyPlot());
    }
    if (typeof input.selectedSeed === 'string' && Object.hasOwn(D.crops,input.selectedSeed)) state.selectedSeed = input.selectedSeed;
    if (['plant', 'water', 'harvest'].includes(input.tool)) state.tool = input.tool;
    if (input.player && ['farm', 'forest', 'village'].includes(input.player.map)
      && Number.isInteger(input.player.x) && input.player.x >= 1 && input.player.x <= 26
      && Number.isInteger(input.player.y) && input.player.y >= 1 && input.player.y <= 18) {
      state.player = { map: input.player.map, x: input.player.x, y: input.player.y, facing: ['up', 'down', 'left', 'right'].includes(input.player.facing) ? input.player.facing : 'down' };
    }
    if (input.world) {
      if (Number.isFinite(input.world.elapsed) && input.world.elapsed >= 0) state.world.elapsed = input.world.elapsed;
      if (Array.isArray(input.world.visited)) state.world.visited = ['farm', 'forest', 'village'].filter(x => input.world.visited.includes(x));
    }
    if (input.settings) state.settings = { mute: input.settings.mute !== false, reducedMotion: !!input.settings.reducedMotion, onboardingSeen: input.settings.onboardingSeen !== false };
    else state.settings.onboardingSeen = true;
    for (const field of ['materials', 'crafted']) {
      if (input[field] !== undefined) {
        if (!input[field] || typeof input[field] !== 'object' || Array.isArray(input[field])) throw new Error('家园库存格式无效');
        for (const id of field === 'materials' ? ['wood', 'stone'] : Object.keys(D.recipes)) {
          if (input[field][id] !== undefined) {
            if (!nonnegative(input[field][id])) throw new Error('家园库存数量无效');
            state[field][id] = input[field][id];
          }
        }
      }
    }
    state.expansion = Math.min(3, Math.max(0, Math.ceil((state.plots.length - 15) / 5)));
    if (input.expansion !== undefined) {
      if (!Number.isInteger(input.expansion) || input.expansion < 0 || input.expansion > 3 || input.expansion !== state.expansion) throw new Error('扩建等级与农田数量不一致');
    }
    while (state.plots.length < 15 + state.expansion * 5) state.plots.push(emptyPlot());
    if (input.decorations !== undefined) {
      if (!Array.isArray(input.decorations) || input.decorations.length > 3 + state.expansion * 2) throw new Error('装饰位置无效');
      state.decorations = input.decorations.map(id => {
        if (id === null) return null;
        if (typeof id !== 'string' || !Object.hasOwn(D.items,id) || D.items[id].kind !== 'decor') throw new Error('未知家园装饰');
        return id;
      });
    }
    if (input.world && input.world.gathered) for (const node of D.resources) {
      const day = input.world.gathered[node.id];
      if (day !== undefined) {
        if (!nonnegative(day) || day > Math.floor(state.world.elapsed / D.dayLength)) throw new Error('采集记录无效');
        state.world.gathered[node.id] = day;
      }
    }
    return state;
  }
  function grow(state, now = Date.now()) {
    for (const p of state.plots) {
      if (p.crop) p.progress = Math.min(100, Math.max(0, (now - p.plantedAt) / (D.crops[p.crop].growTime * (p.watered ? 700 : 1000)) * 100));
    }
  }
  function farm(state, index, now = Date.now(), random = Math.random) {
    const p = state.plots[index];
    if (!p) return { ok: false, message: '这块农田还未开放。' };
    if (p.decoration) {
      state.inventory[p.decoration] = (state.inventory[p.decoration] || 0) + 1;
      delete p.decoration;
      return { ok: true, message: '装饰已收回背包。' };
    }
    grow(state, now);
    if (state.tool === 'plant') {
      if (p.crop) return { ok: false, message: '这里已经有作物，换一块空地吧。' };
      if (!(state.seeds[state.selectedSeed] > 0)) return { ok: false, message: '种子用完了，去村庄的杂货铺看看。' };
      Object.assign(p, emptyPlot(), { crop: state.selectedSeed, plantedAt: now });
      state.seeds[state.selectedSeed]--;
      return { ok: true, message: `种下${D.crops[p.crop].name}，浇水会长得更快。` };
    }
    if (!p.crop) return { ok: false, message: '这里还没有作物。' };
    if (state.tool === 'water') {
      if (p.watered || p.progress >= 100) return { ok: false, message: p.watered ? '这株作物已经喝饱水了。' : '作物成熟了，可以收获。' };
      p.watered = true;
      return { ok: true, message: '水滴落进泥土，生长时间缩短 30%。' };
    }
    if (p.progress < 100) return { ok: false, message: `再等一会儿，已经长到 ${Math.floor(p.progress)}% 了。` };
    const id = p.crop;
    state.inventory[id] = (state.inventory[id] || 0) + 1;
    state.seeds[id] = (state.seeds[id] || 0) + 1 + Math.floor(random() * 2);
    Object.assign(p, emptyPlot());
    return { ok: true, message: `收获${D.crops[id].name}，还留下了种子。` };
  }
  const currentOrder = s => D.orders[s.ordersCompleted % D.orders.length];
  const reward = order => Math.ceil(Object.entries(order.wants).reduce((sum, [key, n]) => sum + D.crops[key].sellPrice * n, 0) * 1.5);
  const canDeliver = s => Object.entries(currentOrder(s).wants).every(([id, n]) => (s.inventory[id] || 0) >= n);
  function deliver(s) {
    if (!canDeliver(s)) return { ok: false, message: '背包里的作物还没凑齐。' };
    const order = currentOrder(s), amount = reward(order);
    for (const [id, n] of Object.entries(order.wants)) s.inventory[id] -= n;
    s.coins += amount; s.ordersCompleted++;
    return { ok: true, message: `「${order.name}」已送达，收到 ${amount} 枚叶币。` };
  }
  function buy(s, id, seed = false) {
    const item = seed ? D.crops[id] : D.items[id];
    if (!item) return { ok: false, message: '没有这件商品。' };
    const cost = seed ? item.seedPrice : item.price;
    if (!Number.isFinite(cost)) return { ok: false, message: '这件物品需要亲手制作。' };
    if (s.coins < cost) return { ok: false, message: '叶币还不够，收获或完成订单再来吧。' };
    s.coins -= cost;
    const bag = seed ? s.seeds : s.inventory;
    bag[id] = (bag[id] || 0) + 1;
    return { ok: true, message: `${item.name}${seed ? '种子' : ''}放进背包了。` };
  }
  function sell(s, id) {
    if (!(s.inventory[id] > 0)) return { ok: false, message: '背包里没有这件物品。' };
    const item = D.items[id];
    const amount = D.crops[id] ? D.crops[id].sellPrice : item && item.kind !== 'decor' ? Math.floor(item.price * (item.kind === 'snack' ? 0.5 : 0.6)) : 0;
    if (!amount) return { ok: false, message: '装饰品可以留在家园。' };
    s.inventory[id]--; s.coins += amount;
    return { ok: true, message: `获得 ${amount} 枚叶币。` };
  }
  const day = s => Math.floor(s.world.elapsed / D.dayLength);
  const affordable = (s, costs) => Object.entries(costs).every(([id, n]) => (s.materials[id] || 0) >= n);
  function spend(s, costs) { for (const [id, n] of Object.entries(costs)) s.materials[id] -= n; }
  function gather(s, id) {
    const node = D.resources.find(n => n.id === id);
    if (!node) return { ok: false, message: '这里没有可采集的材料。' };
    if (s.world.gathered[id] === day(s)) return { ok: false, message: '今天已采集过，明天再来看看。' };
    s.world.gathered[id] = day(s); s.materials[node.resource] += 3;
    return { ok: true, message: `收集到 3 份${D.materialNames[node.resource]}，谢谢森林的礼物。` };
  }
  function craft(s, id) {
    const recipe = D.recipes[id];
    if (!recipe || !affordable(s, recipe.costs)) return { ok: false, message: '材料还不够，去森林找找吧。' };
    spend(s, recipe.costs); s.inventory[id] = (s.inventory[id] || 0) + 1; s.crafted[id] = (s.crafted[id] || 0) + 1;
    return { ok: true, message: `${recipe.name}做好了！放进背包，回空装饰位旁摆放。` };
  }
  function expand(s) {
    const e = D.expansions[s.expansion];
    if (!e) return { ok: false, message: '家园已扩建到最大。' };
    if (s.coins < e.coins || !affordable(s, e.costs)) return { ok: false, message: '扩建需要的叶币或材料还不够。' };
    spend(s, e.costs); s.coins -= e.coins; s.expansion++;
    for (let i = 0; i < 5; i++) s.plots.push(emptyPlot());
    return { ok: true, message: `「${e.name}」完工！新增 5 块农田与 2 个装饰位。` };
  }
  function place(s, id, index) {
    if (!D.items[id] || D.items[id].kind !== 'decor' || !(s.inventory[id] > 0)) return { ok: false, message: '背包里没有这件装饰。' };
    if (!Number.isInteger(index) || index < 0 || index >= 3 + s.expansion * 2 || s.decorations[index]) return { ok: false, message: '请选一个开放的空装饰位。' };
    while (s.decorations.length <= index) s.decorations.push(null);
    s.decorations[index] = id; s.inventory[id]--;
    return { ok: true, message: '家里又多了一处喜欢的风景。' };
  }
  function retrieve(s, index) {
    const id = s.decorations[index];
    if (!id) return { ok: false, message: '这里还空着。' };
    s.inventory[id] = (s.inventory[id] || 0) + 1; s.decorations[index] = null;
    return { ok: true, message: '已收回背包，换个地方再布置也好。' };
  }
  function rest(s) {
    s.world.elapsed = (day(s) + 1) * D.dayLength;
    return { ok: true, message: '在鸟鸣里醒来，新的一天到了。森林材料已补充，作物仍按现实时间成长。' };
  }
  root.ForestCore = { newGame, migrate, emptyPlot, grow, farm, currentOrder, reward, canDeliver, deliver, buy, sell, day, affordable, gather, craft, expand, place, retrieve, rest };
  if (typeof module !== 'undefined') module.exports = root.ForestCore;
})(globalThis);
