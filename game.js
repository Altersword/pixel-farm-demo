/* Browser entry: coordinates the pure model, world, renderer and accessible UI. */
(function () {
  'use strict';
  const C = ForestCore, W = ForestWorld, D = ForestData;
  const canvas = document.querySelector('#world');
  const storage = ForestStorage.create(localStorage), loaded = storage.load();
  const audio = ForestAudio.create();
  const app = {
    state: loaded.state, protected: !!loaded.protected, canvas,
    stopWalking() { route = []; pending = null; held = ''; },
    save() {
      if (app.protected) return;
      try { storage.save(app.state); document.querySelector('#save-status').textContent = '已保存在此浏览器'; }
      catch (_) { document.querySelector('#save-status').textContent = '保存失败，请在设置中导出备份'; }
    },
    perform(action) { const result = action(); if (result.ok) app.save(); audio.effect(result.ok); ui.toast(result.message); ui.refresh(); return result; },
    applySettings() { document.body.classList.toggle('reduced-motion', app.state.settings.reducedMotion); audio.set(app.state.settings.mute).catch(() => ui.toast('声音暂时无法启用，游戏仍可正常游玩。')); },
    download(raw = false) {
      const data = raw ? storage.raw() : storage.export(app.state);
      if (!data) { ui.toast('还没有原始存档。'); return; }
      const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = raw ? 'moss-original-backup.json' : 'moss-and-morning-save.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
  };
  let route = [], pending = null, held = '', lastStep = 0, lastFrame = 0, lastGrowth = 0, lastSave = 0;
  const art = ForestArt.create(canvas), ui = ForestUI.create(app);
  const dirs = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  function interact(object = W.target(app.state)) {
    if (!object || !W.near(app.state.player, object)) { ui.toast('走近一点，就能和这里的生活打招呼。'); return; }
    app.stopWalking();
    if (object.kind === 'plot') { app.perform(() => C.farm(app.state, Number(object.id.slice(5)))); return; }
    if (object.kind === 'resource') { app.perform(() => C.gather(app.state, object.id)); return; }
    if (object.kind === 'decor') {
      const index = Number(object.id.slice(6));
      if (index >= 3 + app.state.expansion * 2) { ui.toast('继续扩建农场，就能开放这个装饰位。'); return; }
      if (app.state.decorations[index]) app.perform(() => C.retrieve(app.state, index));
      else ui.open('bag', object);
      return;
    }
    if (object.kind === 'sign') { ui.toast(object.name); return; }
    ui.open({ home: 'home', bag: 'bag', shop: 'shop', orders: 'orders', npc: 'npc' }[object.kind] || object.kind, object);
  }
  function step(dx, dy) {
    const before = app.state.player.map;
    const moved = W.move(app.state, dx, dy);
    if (moved) {
      if (before !== app.state.player.map) { route = []; pending = null; ui.toast('来到' + W.maps[app.state.player.map].name); }
      app.save(); ui.refresh();
    }
    return moved;
  }
  canvas.addEventListener('click', event => {
    if (ui.isOpen) return;
    canvas.focus({ preventScroll: true });
    const pos = art.tileAt(event.clientX, event.clientY), map = W.maps[app.state.player.map];
    const object = W.objectAt(map, pos.x, pos.y);
    const next = W.pathTo(app.state, pos.x, pos.y, !!object);
    if (!next) { ui.toast('那边暂时走不过去，换条小路吧。'); return; }
    app.stopWalking(); route = next; pending = object;
    if (!route.length && pending) interact(pending);
  });
  const keys = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };
  document.addEventListener('keydown', e => {
    if (ui.isOpen || e.ctrlKey || e.metaKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (keys[e.key]) { e.preventDefault(); route = []; pending = null; held = keys[e.key]; }
    if (!e.repeat && e.key.toLowerCase() === 'e') { e.preventDefault(); interact(); }
    if (!e.repeat && e.key.toLowerCase() === 'b') ui.open('bag');
    if (!e.repeat && e.key.toLowerCase() === 'j') ui.open('journal');
    if (!e.repeat && ['1', '2', '3'].includes(e.key)) { app.state.tool = ['plant', 'water', 'harvest'][Number(e.key) - 1]; app.save(); ui.refresh(); }
  });
  document.addEventListener('keyup', e => { if (keys[e.key] === held) held = ''; });
  window.addEventListener('blur', () => app.stopWalking());
  document.addEventListener('pointerdown', () => { if (!app.state.settings.mute) audio.set(false).catch(() => {}); }, { once: true });
  for (const button of document.querySelectorAll('[data-dir]')) {
    button.addEventListener('pointerdown', e => { e.preventDefault(); button.setPointerCapture(e.pointerId); app.stopWalking(); held = button.dataset.dir; });
    button.addEventListener('pointerup', () => { held = ''; }); button.addEventListener('pointercancel', () => { held = ''; }); button.addEventListener('lostpointercapture', () => { held = ''; });
  }
  document.querySelector('#interact').addEventListener('click', () => interact());
  document.querySelector('#touch-interact').addEventListener('click', () => interact());
  document.querySelector('#import-file').addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    try {
      if (file.size > 1000000) throw new Error('文件过大，请选择小于 1 MB 的存档');
      const next = storage.import(await file.text()); app.state = next; app.protected = false;
      validatePosition(); app.stopWalking(); app.applySettings(); ui.close(); ui.refresh(); ui.toast('存档导入成功，欢迎回家。');
    } catch (error) { ui.toast('导入失败：' + error.message); }
    e.target.value = '';
  });
  function validatePosition() {
    const p = app.state.player;
    if (!W.walkable(W.maps[p.map], p.x, p.y)) Object.assign(p, { map: 'farm', x: 14, y: 8 });
  }
  function frame(time) {
    const dt = lastFrame ? Math.min(time - lastFrame, 100) : 0; lastFrame = time;
    if (!document.hidden && !ui.isOpen) {
      app.state.world.elapsed += dt;
      if (time - lastStep > 150) {
        lastStep = time;
        if (held) step(...dirs[held]);
        else if (route.length) { const direction = route.shift(); if (!step(...direction)) app.stopWalking(); }
        else if (pending) { const target = pending; pending = null; interact(target); }
      }
    }
    if (time - lastGrowth > 1000) { C.grow(app.state); ui.refresh(); lastGrowth = time; }
    if (time - lastSave > 5000) { app.save(); lastSave = time; }
    art.draw(app.state, time);
    audio.scene(app.state.player.map, app.state.world.elapsed % D.dayLength / D.dayLength > .75);
    requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', () => { lastFrame = 0; app.stopWalking(); app.save(); });
  window.addEventListener('pagehide', () => app.save());
  validatePosition(); C.grow(app.state); app.applySettings(); ui.refresh(); app.save();
  if (loaded.error) ui.toast(loaded.error); else ui.toast('欢迎回家。向北是森林，向东是小镇。');
  requestAnimationFrame(frame);
})();
