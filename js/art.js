(function (root) {
  'use strict';
  const D = root.ForestData, W = root.ForestWorld;
  function create(canvas) {
    const ctx = canvas.getContext('2d');
    const sprites = root.ForestSprites.create(ctx);
    let lastPlayer = null, strideUntil = 0;
    let view = { x: 0, y: 0, tile: 40, width: 800, height: 560 };
    const rect = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h)); };
    function draw(s, time) {
      const width = canvas.clientWidth, height = canvas.clientHeight, ratio = Math.min(devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) { canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.imageSmoothingEnabled = false;
      const T = width < 500 ? 34 : 42, p = s.player, map = W.maps[p.map];
      if (lastPlayer && (p.x !== lastPlayer.x || p.y !== lastPlayer.y)) strideUntil = time + 160;
      lastPlayer = { x: p.x, y: p.y };
      const phase = s.world.elapsed % D.dayLength / D.dayLength;
      const darkness = phase < .55 ? 0 : phase < .75 ? (phase - .55) * 1.7 : .34;
      view = { x: Math.max(0, Math.min(W.W * T - width, p.x * T - width / 2)), y: Math.max(0, Math.min(W.H * T - height, p.y * T - height / 2)), tile: T, width, height };
      const px = x => x * T - view.x, py = y => y * T - view.y;
      for (let y = 0; y < W.H; y++) for (let x = 0; x < W.W; x++) {
        const type = map.tiles[y][x], hash = (x * 31 + y * 73) % 17, xx = px(x), yy = py(y);
        const colors = { grass: hash % 3 ? '#8da975' : '#91ad79', path: hash % 2 ? '#d4c49b' : '#d8c9a4', soil: '#9f835e', water: '#78a8aa', tree: '#69895c' };
        rect(xx, yy, T + 1, T + 1, colors[type]);
        if (type === 'grass' && hash < 5) { rect(xx + 8, yy + 18, 2, 4, '#759962'); rect(xx + 11, yy + 16, 2, 6, '#a7bc85'); }
        if (type === 'grass' && (x * 17 + y * 13) % 29 === 1) { rect(xx + 17, yy + 21, 2, 5, '#6f8b50'); rect(xx + 15, yy + 19, 6, 3, '#e3c47f'); rect(xx + 17, yy + 17, 2, 6, '#eddfac'); }
        if (type === 'water') { rect(xx + 6, yy + 10, T / 3, 2, '#a3c7c0'); rect(xx + 18, yy + 28, T / 4, 2, '#8db9b8'); }
        if (type === 'water') {
          if (map.tiles[y - 1] && map.tiles[y - 1][x] !== 'water') rect(xx, yy, T, 5, '#b7c59b');
          if (map.tiles[y + 1] && map.tiles[y + 1][x] !== 'water') rect(xx, yy + T - 4, T, 4, '#5a8c83');
          if (!s.settings.reducedMotion) rect(xx + 6 + Math.sin(time / 1400 + x) * 3, yy + 20, 9, 1, '#b2cebf');
        }
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
            sprites.crop(plot.crop, plot.progress, x, y, T);
            if (plot.progress < 100) { rect(x + 6, y + T - 5, T - 12, 2, '#66553f'); rect(x + 6, y + T - 5, (T - 12) * plot.progress / 100, 2, '#c5d391'); }
            else { rect(x + T - 7, y + 4, 3, 3, '#f3df9c'); }
          }
          if (plot.decoration) sprites.furniture(D.items[plot.decoration].sprite, x, y, T);
        } else if (o.kind === 'tree') {
          sprites.tree(x, y, T);
        } else if (['home', 'shop', 'house'].includes(o.kind)) {
          rect(x + 2, y + h - 7, w + 6, 14, '#789360'); rect(x + 4, y + 10, w - 8, h - 10, '#efdfb5');
          rect(x - 5, y - 12, w + 10, 35, o.kind === 'shop' ? '#7b9672' : '#b98067'); rect(x + 3, y - 19, w - 6, 12, o.kind === 'shop' ? '#8ba181' : '#c98d71');
          rect(x + w / 2 - 12, y + h - 42, 24, 42, '#7b644b'); rect(x + 18, y + 35, 24, 22, '#8eb1a3'); rect(x + w - 45, y + 35, 24, 22, '#8eb1a3');
          for (let yy = 26; yy < h - 3; yy += 15) { rect(x + 5, y + yy, w - 10, 1, '#dacba5'); }
          for (let yy = -10; yy < 20; yy += 7) for (let xx = 1; xx < w - 7; xx += 18) { rect(x + xx + (yy % 2 ? 8 : 0), y + yy, 14, 1, o.kind === 'shop' ? '#6e8966' : '#ac7159'); }
          for (const xx of [18, w - 45]) { rect(x + xx - 2, y + 33, 28, 3, '#8d7657'); rect(x + xx + 10, y + 35, 3, 22, '#ede0bc'); rect(x + xx, y + 45, 24, 2, '#ede0bc'); rect(x + xx - 4, y + 56, 32, 4, '#ad8f62'); if (darkness) rect(x + xx + 2, y + 37, 7, 7, '#ead6a0'); }
          rect(x + w / 2 - 15, y + h - 6, 30, 6, '#b5a277'); rect(x + w / 2 + 6, y + h - 23, 3, 3, '#d5b477');
          rect(x + w - 29, y - 32, 12, 22, '#927960'); rect(x + w - 32, y - 34, 18, 4, '#bfa988');
          sprites.furniture('flowerbox', x + 10, y + h - 30, 30);
          label(o.name, x + w / 2, y + h + 15);
        } else if (o.kind === 'player' || o.kind === 'npc') {
          const n = D.neighbors.find(n => n.id === o.id);
          const stride = !s.settings.reducedMotion && o.kind === 'player' && time < strideUntil ? Math.floor(time / 90) % 2 : 0;
          sprites.character(o.id || 'player', x, y, T, p.facing, stride);
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
      if (darkness) { ctx.fillStyle = `rgba(30,48,77,${darkness})`; ctx.fillRect(0, 0, width, height); }
      if (phase > .75 && !s.settings.reducedMotion) {
        for (let i = 0; i < 14; i++) { const xx = (i * 193 + Math.sin(time / 2400 + i) * 18) % width, yy = (i * 97 + Math.cos(time / 2000 + i) * 9) % height; ctx.fillStyle = '#eedf9a'; ctx.globalAlpha = .4 + Math.sin(time / 900 + i) * .3; ctx.fillRect(xx, yy, 2, 2); }
        ctx.globalAlpha = 1;
      }
      function label(text, x, y) { ctx.font = '11px "Microsoft YaHei", sans-serif'; ctx.textAlign = 'center'; const w = ctx.measureText(text).width; rect(x - w / 2 - 5, y - 11, w + 10, 16, '#f8efd9c9'); ctx.fillStyle = '#344f3e'; ctx.fillText(text, x, y); }
    }
    return { draw, tileAt(clientX, clientY) { const r = canvas.getBoundingClientRect(); return { x: Math.floor((clientX - r.left + view.x) / view.tile), y: Math.floor((clientY - r.top + view.y) / view.tile) }; }, get view() { return view; } };
  }
  root.ForestArt = { create };
})(globalThis);
