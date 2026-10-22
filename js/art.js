(function (root) {
  'use strict';
  const D = root.ForestData, W = root.ForestWorld;
  let latestView = null;
  function create(canvas) {
    const ctx = canvas.getContext('2d');
    const sprites = root.ForestSprites.create(ctx);
    let lastPlayer = null, strideUntil = 0, visual = null, motion = null, previousTime = 0;
    let view = { x: 0, y: 0, tile: 40, width: 800, height: 560 };
    const rect = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h)); };
    function draw(s, time, placement = null) {
      const width = canvas.clientWidth, height = canvas.clientHeight, ratio = Math.min(devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) { canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.imageSmoothingEnabled = false;
      const T = width < 500 ? 34 : 42, p = s.player, map = W.maps[p.map];
      const changedMap = !lastPlayer || p.map !== lastPlayer.map;
      if (changedMap || s.settings.reducedMotion) { visual = { x: p.x, y: p.y }; motion = null; }
      else if (p.x !== lastPlayer.x || p.y !== lastPlayer.y) {
        motion = { x: visual.x, y: visual.y, start: time }; strideUntil = time + 150;
      }
      if (motion) {
        const progress = Math.min(1, (time - motion.start) / 150);
        visual = { x: motion.x + (p.x - motion.x) * progress, y: motion.y + (p.y - motion.y) * progress };
        if (progress === 1) motion = null;
      }
      lastPlayer = { x: p.x, y: p.y, map: p.map };
      const phase = s.world.elapsed % D.dayLength / D.dayLength;
      const darkness = phase < .55 ? 0 : phase < .75 ? (phase - .55) * 1.7 : .34;
      const anchorX=map.id==='home'&&width>=16*T?14:placement?placement.x:visual.x;
      const anchorY=map.id==='home'&&height>=12*T?10:placement?placement.y:visual.y;
      const aimX = Math.max(0, Math.min(W.W * T - width, anchorX * T - width / 2));
      const aimY = Math.max(0, Math.min(W.H * T - height, anchorY * T - height / 2));
      const snap = changedMap || s.settings.reducedMotion || width !== view.width || height !== view.height;
      const easing = snap ? 1 : 1 - Math.exp(-Math.min(100, Math.max(0, time - previousTime)) / 55);
      view = { x: view.x + (aimX - view.x) * easing, y: view.y + (aimY - view.y) * easing, tile: T, width, height };
      latestView = { ...view, playerX: visual.x, playerY: visual.y, actors: W.objects(map,s).filter(o=>['npc','guest'].includes(o.kind)).map(o=>({...o})) }; previousTime = time;
      const px = x => x * T - view.x, py = y => y * T - view.y;
      for (let y = 0; y < W.H; y++) for (let x = 0; x < W.W; x++) {
        const type = map.tiles[y][x], hash = (x * 31 + y * 73) % 17, xx = px(x), yy = py(y);
        const colors = { void:'#514d3b',wall:'#b59270',floor:'#d6bc92',grass: hash % 3 ? '#8da975' : '#91ad79', path: hash % 2 ? '#d4c49b' : '#d8c9a4', soil: '#9f835e', water: '#78a8aa', tree: '#69895c' };
        rect(xx, yy, T + 1, T + 1, colors[type]);
        if(type==='floor'){rect(xx,yy+T-2,T,2,'#b99c75');rect(xx+(y%2?0:T/2),yy,1,T,'#c1a77f');if(hash<4)rect(xx+9,yy+15,14,1,'#c3a67b');}
        if(type==='wall'){rect(xx,yy+T-5,T,5,'#8d6f51');rect(xx,yy+8,T,2,'#c9ae87');}
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
      const drawObjects = W.objects(map, s).map(o => ({ ...o, sort: (o.visualY === undefined ? o.y : o.visualY) + o.h }));
      drawObjects.push({ kind: 'player', x: visual.x, y: visual.y, w: 1, h: 1, sort: visual.y + 1.1 });
      for (let y = 0; y < W.H; y++) for (let x = 0; x < W.W; x++) if (map.tiles[y][x] === 'tree') drawObjects.push({ kind: 'tree', x, y, w: 1, h: 1, sort: y + 1 });
      drawObjects.sort((a, b) => a.sort - b.sort);
      for (const o of drawObjects) {
        const x = px(o.visualX === undefined ? o.x : o.visualX), y = py(o.visualY === undefined ? o.y : o.visualY), w = o.w * T, h = o.h * T;
        if (x + w < -T || x > width + T || y + h < -T || y > height + T) continue;
        if(s.player.map==='home'&&['bed','stove','bag','dining','seat','room-decor'].includes(o.kind)){
          const sprite=o.kind==='room-decor'?D.items[o.item].sprite:{bed:'bed',stove:'stove',bag:'bookshelf',dining:'low_table',seat:'wood_chair'}[o.kind];
          ctx.save();ctx.translate(x,y);ctx.scale(o.w,o.h);sprites.furniture(sprite,0,0,T);ctx.restore();
          if(target&&target.id===o.id)label(o.name,x+w/2,y-5);
        } else if (o.kind === 'plot') {
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
        } else if (o.kind === 'decor') {
          const index = Number(o.id.slice(6)), id = s.decorations[index];
          if (index < 3 + s.expansion * 2) {
            rect(x + 2, y + 3, T - 4, T - 6, '#9eaf7b');
            if (id) sprites.furniture(D.items[id].sprite, x, y, T);
            else { rect(x + T / 2 - 3, y + T / 2, 7, 1, '#dce1b0'); rect(x + T / 2, y + T / 2 - 3, 1, 7, '#dce1b0'); }
          }
        } else if (o.kind === 'resource') {
          const node = D.resources.find(n => n.id === o.id), spent = s.world.gathered[o.id] === Math.floor(s.world.elapsed / D.dayLength);
          if (node.resource === 'wood') { rect(x + 6,y+19,T-12,12,spent?'#8d8860':'#95724e'); rect(x + 8,y+17,T-16,5,spent?'#a69b70':'#c2a16e'); if(!spent) {rect(x+12,y+19,3,10,'#7e6045');rect(x+25,y+19,2,10,'#d2b17e');} }
          else { rect(x+6,y+15,T-12,16,spent?'#8d9c7c':'#9eaa9f');rect(x+10,y+11,T-20,9,spent?'#9eac8a':'#b9c1ae');rect(x+7,y+27,T-14,4,'#81917e'); }
          if (!spent) rect(x+T-8,y+10,3,3,'#ead6a0');
        } else if (o.kind === 'treasure') {
          if (!s.story.treasures.includes(o.id)) { rect(x+15,y+15,12,12,'#bf965b');rect(x+12,y+12,18,5,'#896b44');rect(x+18,y+9,4,4,'#c9b27c');rect(x+16,y+18,3,5,'#e4c98b'); }
        } else if (o.kind === 'exploration') {
          const complete=s.exploration.completed.includes(o.id), available=root.ForestEnvironment.weather(s)===o.weather;
          const sway=s.settings.reducedMotion||o.sprite!=='chime'?0:Math.sin(time/750)*1.2;
          sprites.furniture(o.sprite,x+sway,y,T);
          if(!complete&&available)rect(x+T-7,y+3,4,4,'#f9e5a0');
          if(complete)rect(x+T-8,y+5,5,2,'#7b9b64');
          if(target&&target.id===o.id)label(o.name,x+T/2,y-5);
        } else if (o.kind === 'tree') {
          sprites.tree(x, y, T);
        } else if (['home', 'shop', 'house', 'bakery'].includes(o.kind)) {
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
        } else if (o.kind === 'player' || o.kind === 'npc' || o.kind === 'guest') {
          const n = D.neighbors.find(n => n.id === o.id);
          const stride = !s.settings.reducedMotion && ((o.kind === 'player' && time < strideUntil) || o.moving) ? Math.floor(time / 90) % 2 : 0;
          sprites.character(o.id || 'player', x, y, T, o.facing || p.facing, stride);
          if (n) label(n.name, x + T / 2, y - 7);
          if(o.kind==='guest'&&s.hospitality.active.served)sprites.furniture('meal',px(15.5),py(9),T);
        } else if (o.kind === 'festival') {
          rect(x+3,y+10,w-6,23,'#ae8a5c');rect(x+5,y+12,w-10,16,'#eddbad');
          for(let i=0;i<3;i++){rect(x+10+i*23,y+17,12,7,'#f8edcc');rect(x+13+i*23,y+19,5,3,['#ce765b','#93a160','#dda44e'][i]);}
          if(s.story&&s.story.festival) {sprites.furniture('bunting',x-4,y-35,w+8);label('森林聚会 · 欢迎回家',x+w/2,y-40);}
        } else {
          const color = { orders: '#b3895f', workbench: '#a1845e', bag: '#ad8254', festival: '#d4b68b', expand: '#b4a278', sign: '#b4a278' }[o.kind] || '#b4a278';
          rect(x + 6, y + 5, w - 12, h - 10, color); rect(x + 9, y + 8, w - 18, 5, '#e9d7aa');
          if (o.kind === 'orders') rect(x + 12, y + 15, 13, 13, '#f5e8c6');
          if (target && target.id === o.id) label(o.name, x + w / 2, y - 5);
        }
        if (target && target.id === o.id) { ctx.strokeStyle = '#fff0bb'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2); }
      }
      for (const gate of map.portals) { const x = px(gate.x), y = py(gate.y); rect(x + 7, y + 5, T - 14, T - 10, '#e5dbb9'); label(gate.label, x + T / 2, y - 8); }
      if(map.id==='home'){
        const windowWeather=root.ForestEnvironment.weather(s);
        for(const wx of [10,17]){const xx=px(wx),yy=py(4);rect(xx,yy-12,T*2,36,'#795f48');rect(xx+4,yy-8,T*2-8,28,phase>.75?'#6c8090':windowWeather==='rain'?'#93adb2':windowWeather==='mist'?'#d5d5bf':'#b7d0c0');rect(xx+T-2,yy-8,4,28,'#e6d1a5');rect(xx+4,yy+6,T*2-8,3,'#e6d1a5');if(windowWeather==='rain'&&!s.settings.reducedMotion)for(let i=0;i<4;i++)rect(xx+10+i*15,yy-6+(time*.03+i*5)%18,1,4,'#e3ece4');}
        sprites.furniture('lamp',px(6),py(9),T);
        if(phase>.75){ctx.fillStyle='#f2c97a0d';ctx.fillRect(0,0,width,height);}
        rect(px(12),py(8),T*2,T*3,'#c6977c55');
      }
      if (darkness && map.id!=='home') { ctx.fillStyle = `rgba(30,48,77,${darkness})`; ctx.fillRect(0, 0, width, height); }
      const weather = map.id==='home'?'indoor':root.ForestEnvironment ? root.ForestEnvironment.weather(s) : 'sun';
      if (weather === 'rain') {
        ctx.fillStyle = '#526f8426'; ctx.fillRect(0,0,width,height);
        if (!s.settings.reducedMotion) for(let i=0;i<65;i++){
          const xx=(i*113+time*.025)%width, yy=(i*71+time*.24)%height;
          rect(xx,yy,1,6,'#d4e2dd9c');
        }
      } else if(weather === 'mist') {
        ctx.fillStyle = '#eceddf38';ctx.fillRect(0,0,width,height);
        if(!s.settings.reducedMotion)for(let i=0;i<4;i++){
          const xx=((time*.008+i*227)%(width+300))-200;
          rect(xx,70+i*95,260,25,'#f1eddf24');
        }
      }
      if (phase > .75 && map.id!=='home' && !s.settings.reducedMotion) {
        for (let i = 0; i < 14; i++) { const xx = (i * 193 + Math.sin(time / 2400 + i) * 18) % width, yy = (i * 97 + Math.cos(time / 2000 + i) * 9) % height; ctx.fillStyle = '#eedf9a'; ctx.globalAlpha = .4 + Math.sin(time / 900 + i) * .3; ctx.fillRect(xx, yy, 2, 2); }
        ctx.globalAlpha = 1;
      }
      if(placement){
        const ok=root.ForestHome.canPlace(s,placement.item,placement.x,placement.y).ok;
        ctx.globalAlpha=.65;sprites.furniture(D.items[placement.item].sprite,px(placement.x),py(placement.y),T);ctx.globalAlpha=1;
        ctx.strokeStyle=ok?'#4c8056':'#b75f50';ctx.lineWidth=3;ctx.strokeRect(px(placement.x)+1,py(placement.y)+1,T-2,T-2);
      }
      function label(text, x, y) { ctx.font = '11px "Microsoft YaHei", sans-serif'; ctx.textAlign = 'center'; const w = ctx.measureText(text).width; rect(x - w / 2 - 5, y - 11, w + 10, 16, '#f8efd9c9'); ctx.fillStyle = '#344f3e'; ctx.fillText(text, x, y); }
    }
    return { draw, pointAt(clientX,clientY) { const r=canvas.getBoundingClientRect(); return {x:(clientX-r.left+view.x)/view.tile,y:(clientY-r.top+view.y)/view.tile}; }, tileAt(clientX, clientY) { const r = canvas.getBoundingClientRect(); return { x: Math.floor((clientX - r.left + view.x) / view.tile), y: Math.floor((clientY - r.top + view.y) / view.tile) }; }, get view() { return view; } };
  }
  root.ForestArt = { create, get view() { return latestView && { ...latestView }; } };
})(globalThis);
