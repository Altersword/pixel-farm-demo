(function (root) {
  'use strict';
  function create() {
    let context, gain, timer, index = 0, enabled = false, map = 'farm', night = false;
    const notes = [261.63, 329.63, 392, 440, 523.25, 440, 392, 329.63];
    function note(frequency, duration = .65, volume = .1, type = 'sine') {
      if (!context || context.state !== 'running') return;
      const osc = context.createOscillator(), env = context.createGain(), t = context.currentTime;
      osc.type = type; osc.frequency.value = frequency;
      env.gain.setValueAtTime(0, t); env.gain.linearRampToValueAtTime(volume, t + .03); env.gain.exponentialRampToValueAtTime(.001, t + duration);
      osc.connect(env); env.connect(gain); osc.start(t); osc.stop(t + duration + .05);
      osc.onended = () => { osc.disconnect(); env.disconnect(); };
    }
    function tick() {
      if (!enabled || document.hidden) return;
      note(notes[index++ % notes.length] * (night ? .5 : 1), 1.4, .055);
      if (index % 4 === 0) note((map === 'forest' ? 1174.66 : 987.77), .18, .025);
      if (index % 8 === 0) note(notes[(index + 2) % notes.length] / 2, 2.3, .04, 'triangle');
    }
    async function set(mute) {
      enabled = !mute;
      if (!enabled) { clearInterval(timer); timer = null; if (context) await context.suspend(); return; }
      if (!context) {
        const AC = root.AudioContext || root.webkitAudioContext;
        if (!AC) return;
        context = new AC(); gain = context.createGain(); gain.gain.value = .35; gain.connect(context.destination);
      }
      await context.resume(); if (!timer) { tick(); timer = setInterval(tick, 1800); }
    }
    document.addEventListener('visibilitychange', () => { if (!context) return; if (document.hidden) context.suspend(); else if (enabled) context.resume().catch(() => {}); });
    return { set, scene(id, isNight) { map = id; night = isNight; }, effect(success) { if (enabled) note(success ? 659.25 : 220, .16, .065, 'triangle'); } };
  }
  root.ForestAudio = { create };
})(globalThis);
