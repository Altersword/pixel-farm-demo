(function (root) {
  'use strict';
  const W = 28, H = 20;
  function makeMap(id, name, subtitle) {
    const tiles = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => x === 0 || y === 0 || x === W - 1 || y === H - 1 ? 'tree' : 'grass'));
    return { id, name, subtitle, tiles, objects: [], portals: [] };
  }
  const maps = {
    farm: makeMap('farm', '苔光农场', '在自己的节奏里，种下一点期待'),
    forest: makeMap('forest', '风铃森林', '松针落下的地方，总有新发现'),
    village: makeMap('village', '栗风小镇', '六扇门，六个温柔的故事'),
  };
  function rect(map, x, y, w, h, type) {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) map.tiles[yy][xx] = type;
  }
  function object(map, id, kind, x, y, name, w = 1, h = 1) { map.objects.push({ id, kind, x, y, name, w, h }); }
  const f = maps.farm;
  rect(f, 1, 8, 26, 3, 'path'); rect(f, 13, 1, 3, 18, 'path');
  rect(f, 6, 7, 7, 10, 'soil');
  object(f, 'home', 'home', 3, 3, '林间小屋', 6, 3);
  object(f, 'bench', 'workbench', 10, 5, '手作工作台', 2, 1);
  object(f, 'farm-orders', 'orders', 18, 7, '邻里订单板');
  object(f, 'farm-bag', 'bag', 4, 12, '储物木箱');
  object(f, 'farm-sign', 'sign', 23, 10, '小镇向东 · 森林向北');
  object(f, 'expand', 'expand', 12, 16, '农场扩建告示');
  rect(f, 21, 14, 4, 3, 'water');
  f.portals.push({ x: 26, y: 9, map: 'village', toX: 2, toY: 9, label: '栗风小镇 →' }, { x: 14, y: 1, map: 'forest', toX: 14, toY: 17, label: '↑ 风铃森林' });
  for (let i = 0; i < 30; i++) object(f, 'plot-' + i, 'plot', 7 + i % 5, 8 + Math.floor(i / 5), '农田 ' + (i + 1));
  for (let i = 0; i < 9; i++) object(f, 'decor-' + i, 'decor', 18 + i % 3 * 2, 4 + Math.floor(i / 3) * 4, '家园装饰位 ' + (i + 1));
  const v = maps.village;
  rect(v, 1, 8, 26, 3, 'path'); rect(v, 12, 2, 3, 16, 'path'); rect(v, 4, 14, 19, 2, 'path');
  object(v, 'shop', 'shop', 5, 3, '栗栗杂货铺', 5, 3);
  object(v, 'bakery', 'house', 16, 3, '蜜朵的果酱屋', 5, 3);
  object(v, 'library', 'house', 5, 16, '星灯书屋', 3, 2);
  object(v, 'town-orders', 'orders', 13, 7, '邻里订单板');
  object(v, 'festival', 'festival', 13, 12, '森林聚会广场', 2, 1);
  rect(v, 22, 4, 4, 4, 'water');
  for (const n of root.ForestData.neighbors) object(v, n.id, 'npc', n.x, n.y, n.name);
  v.portals.push({ x: 1, y: 9, map: 'farm', toX: 25, toY: 9, label: '← 苔光农场' });
  const t = maps.forest;
  rect(t, 13, 1, 3, 18, 'path'); rect(t, 3, 9, 22, 2, 'path');
  rect(t, 19, 3, 6, 4, 'water');
  for (const [x, y] of [[3, 3], [6, 4], [9, 2], [4, 14], [8, 16], [18, 14], [22, 15], [24, 11], [18, 8]]) object(t, 'tree-' + x + '-' + y, 'tree', x, y, '松树');
  object(t, 'forest-sign', 'sign', 12, 16, '南方是家，北方有风');
  for (const n of root.ForestData.resources) object(t, n.id, 'resource', n.x, n.y, root.ForestData.materialNames[n.resource] + '采集点');
  t.portals.push({ x: 14, y: 18, map: 'farm', toX: 14, toY: 2, label: '↓ 苔光农场' });
  function objectAt(map, x, y) { return map.objects.find(o => x >= o.x && x < o.x + o.w && y >= o.y && y < o.y + o.h); }
  function walkable(map, x, y) {
    if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1 || ['tree', 'water'].includes(map.tiles[y][x])) return false;
    const o = objectAt(map, x, y);
    return !o || ['plot', 'festival', 'decor'].includes(o.kind);
  }
  function near(player, o) {
    const dx = Math.max(o.x - player.x, 0, player.x - (o.x + o.w - 1));
    const dy = Math.max(o.y - player.y, 0, player.y - (o.y + o.h - 1));
    return dx + dy <= 1;
  }
  function target(state) {
    const p = state.player, map = maps[p.map];
    const facing = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[p.facing];
    const front = objectAt(map, p.x + facing[0], p.y + facing[1]);
    const under = objectAt(map, p.x, p.y);
    return front || under || map.objects.find(o => near(p, o));
  }
  function move(state, dx, dy) {
    const p = state.player;
    p.facing = dx < 0 ? 'left' : dx > 0 ? 'right' : dy < 0 ? 'up' : 'down';
    const map = maps[p.map], x = p.x + dx, y = p.y + dy;
    if (!walkable(map, x, y)) return false;
    p.x = x; p.y = y;
    const portal = map.portals.find(o => o.x === x && o.y === y);
    if (portal) {
      Object.assign(p, { map: portal.map, x: portal.toX, y: portal.toY });
      if (!state.world.visited.includes(p.map)) state.world.visited.push(p.map);
    }
    return true;
  }
  // Breadth-first paths also serve as an accessibility aid for click-to-walk.
  function pathTo(state, x, y, adjacent = false) {
    const p = state.player, map = maps[p.map], queue = [[p.x, p.y, []]], seen = new Set([p.x + ',' + p.y]);
    const obj = objectAt(map, x, y);
    while (queue.length) {
      const [cx, cy, path] = queue.shift();
      if (adjacent && obj ? near({ x: cx, y: cy }, obj) : cx === x && cy === y) return path;
      for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
        const nx = cx + dx, ny = cy + dy, key = nx + ',' + ny;
        if (seen.has(key) || !walkable(map, nx, ny)) continue;
        seen.add(key); queue.push([nx, ny, [...path, [dx, dy]]]);
      }
    }
    return null;
  }
  root.ForestWorld = { maps, W, H, objectAt, walkable, near, target, move, pathTo };
  if (typeof module !== 'undefined') module.exports = root.ForestWorld;
})(globalThis);
