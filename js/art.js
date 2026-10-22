(function (root) {
  'use strict';
  const D = root.ForestData, W = root.ForestWorld;
  function create(canvas) {
    const ctx = canvas.getContext('2d');
    let view = { x: 0, y: 0, tile: 40, width: 800, height: 560 };
    const rect = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h)); };
    function draw(s, time) {
      const width = canvas.clientWidth, height = canvas.clientHeight, ratio = Math.min(devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) { canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.imageSmoothingEnabled = false;
      const T = width < 500 ? 34 : 42, p = s.player, map = W.maps[p.map];
      view = { x: Math.max(0, Math.min(W.W * T - width, p.x * T - width / 2)), y: Math.max(0, Math.min(W.H * T - height, p.y * T - height / 2)), tile: T, width, height };
      const px = x => x * T - view.x, py = y => y * T - view.y;
      for (let y = 0; y < W.H; y++) for (let x = 0; x < W.W; x++) {
        const type = map.tiles[y][x], hash = (x * 31 + y * 73) % 17, xx = px(x), yy = py(y);
        const colors = { grass: hash % 3 ? '#8da975' : '#91ad79', path: hash % 2 ? '#d4c49b' : '#d8c9a4', soil: '#9f835e', water: '#78a8aa', tree: '#69895c' };
        rect(xx, yy, T + 1, T + 1, colors[type]);
        if (type === 'grass' && hash < 5) { rect(xx + 8, yy + 18, 2, 4, '#759962'); rect(xx + 11, yy + 16, 2, 6, '#a7bc85'); }
        if (type === 'water') { rect(xx + 6, yy + 10, T / 3, 2, '#a3c7c0'); rect(xx + 18, yy + 28, T / 4, 2, '#8db9b8'); }
        if (type === 'path' && hash < 4) rect(xx + 10, yy + 14, 3, 2, '#c3b58d');
      }
      const target = W.target(s);
      const drawObjects = map.objects.map(o => ({ ...o, sort: o.y + o.h }));
      drawObjects.push({ kind: 'player', x: p.x, y: p.y, w: 1, h: 1, sort: p.y + 1.1 });
      for (let y = 0; y < W.H; y++) for (let x = 0; x < W.W; x++) if (map.tiles[y][x] === 'tree') drawObjects.push({ kind: 'tree', x, y, w: 1, h: 1, sort: y + 1 });
      drawObjects.sort((a, b) => a.sort - b.sort);
      for (const o of drawObjects) {
        const x = px(o.x), y = py(o.y), w = o.w * T, h = o.h * T;
        if (x + w < -T || x > width + T || y + h < -T || y > height + T) continue;
        if (o.kind === 'plot') {
          const i = Number(o.id.slice(5)), plot = s.plots[i];
          if (!plot) { rect(x + 3, y + 3, T - 6, T - 6, '#9e976c'); continue; }
          rect(x + 2, y + 3, T - 4, T - 5, plot.watered ? '#796348' : '#94704d');
          for (let n = 0; n < 3; n++) rect(x + 6, y + 9 + n * 9, T - 12, 2, plot.watered ? '#68523d' : '#806040');
          if (plot.crop) {
            rect(x + T / 2 - 1, y + 12, 3, 15, '#668047'); rect(x + 9, y + 15, 11, 5, '#a6bb67'); rect(x + 21, y + 11, 10, 6, '#799958');
            if (plot.progress >= 100) rect(x + 14, y + 15, 14, 12, D.crops[plot.crop].color);
            else { rect(x + 6, y + T - 7, T - 12, 2, '#66553f'); rect(x + 6, y + T - 7, (T - 12) * plot.progress / 100, 2, '#c5d391'); }
          }
          if (plot.decoration) rect(x + 8, y + 10, T - 16, T - 16, '#e1ae86');
        } else if (o.kind === 'tree') {
          rect(x + T * .4, y + T * .5, T * .2, T * .55, '#775a43');
          rect(x + 2, y - T * .3, T - 4, T * .8, '#51774d'); rect(x + T * .15, y - T * .5, T * .7, T * .7, '#618451'); rect(x + T * .3, y - T * .6, T * .4, T * .45, '#77965f');
        } else if (['home', 'shop', 'house'].includes(o.kind)) {
          rect(x + 2, y + h - 7, w + 6, 14, '#789360'); rect(x + 4, y + 10, w - 8, h - 10, '#efdfb5');
          rect(x - 5, y - 12, w + 10, 35, o.kind === 'shop' ? '#7b9672' : '#b98067'); rect(x + 3, y - 19, w - 6, 12, o.kind === 'shop' ? '#8ba181' : '#c98d71');
          rect(x + w / 2 - 12, y + h - 42, 24, 42, '#7b644b'); rect(x + 18, y + 35, 24, 22, '#8eb1a3'); rect(x + w - 45, y + 35, 24, 22, '#8eb1a3');
          label(o.name, x + w / 2, y + h + 15);
        } else if (o.kind === 'player' || o.kind === 'npc') {
          const n = D.neighbors.find(n => n.id === o.id), color = n ? n.color : '#e4c59d';
          rect(x + 7, y + T - 6, T - 14, 6, '#6b805a');
          rect(x + 11, y + 19, T - 22, 16, n ? '#b7b086' : '#607e7b'); rect(x + 9, y + 7, T - 18, 18, color);
          if (n) { rect(x + 10, y + 2, 6, 10, color); rect(x + T - 16, y + 2, 6, 10, color); }
          else { rect(x + 6, y + 5, T - 12, 6, '#d2ad70'); rect(x + 12, y, T - 24, 8, '#e4c98e'); }
          rect(x + 14, y + 14, 2, 3, '#3b493b'); rect(x + T - 16, y + 14, 2, 3, '#3b493b');
          if (n) label(n.name, x + T / 2, y - 7);
        } else {
          const color = { orders: '#b3895f', workbench: '#a1845e', bag: '#ad8254', festival: '#d4b68b', expand: '#b4a278', sign: '#b4a278' }[o.kind] || '#b4a278';
          rect(x + 6, y + 5, w - 12, h - 10, color); rect(x + 9, y + 8, w - 18, 5, '#e9d7aa');
          if (o.kind === 'orders') rect(x + 12, y + 15, 13, 13, '#f5e8c6');
          if (target && target.id === o.id) label(o.name, x + w / 2, y - 5);
        }
        if (target && target.id === o.id) { ctx.strokeStyle = '#fff0bb'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2); }
      }
      for (const gate of map.portals) { const x = px(gate.x), y = py(gate.y); rect(x + 7, y + 5, T - 14, T - 10, '#e5dbb9'); label(gate.label, x + T / 2, y - 8); }
      function label(text, x, y) { ctx.font = '11px "Microsoft YaHei", sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#344f3e'; ctx.fillText(text, x, y); }
    }
    return { draw, tileAt(clientX, clientY) { const r = canvas.getBoundingClientRect(); return { x: Math.floor((clientX - r.left + view.x) / view.tile), y: Math.floor((clientY - r.top + view.y) / view.tile) }; }, get view() { return view; } };
  }
  root.ForestArt = { create };
})(globalThis);
