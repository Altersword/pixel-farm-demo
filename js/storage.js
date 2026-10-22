(function (root) {
  'use strict';
  const key = 'pixel_farm_save';
  function create(storage) {
    return {
      load() {
        try {
          const raw = storage.getItem(key);
          if (!raw) return { state: root.ForestCore.newGame() };
          const parsed = JSON.parse(raw), state = root.ForestCore.migrate(parsed);
          if (!parsed.version) storage.setItem(key + '_legacy_backup', raw);
          return { state };
        } catch (error) {
          return { state: root.ForestCore.newGame(), error: `未能读取存档：${error.message}。原存档未覆盖，可导出原始备份。`, protected: true };
        }
      },
      save(state) { storage.setItem(key, JSON.stringify(state)); },
      export(state) { return JSON.stringify(state, null, 2); },
      import(text) {
        if (typeof text !== 'string' || text.length > 1000000) throw new Error('存档文件过大');
        const next = root.ForestCore.migrate(JSON.parse(text));
        const old = storage.getItem(key);
        if (old) storage.setItem(key + '_import_backup', old);
        storage.setItem(key, JSON.stringify(next));
        return next;
      },
      raw() { return storage.getItem(key); },
      recover() { const raw = storage.getItem(key); if (raw) storage.setItem(key + '_damaged_backup', raw); },
    };
  }
  root.ForestStorage = { create, key };
  if (typeof module !== 'undefined') module.exports = root.ForestStorage;
})(globalThis);
