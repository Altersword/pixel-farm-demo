const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8');

// Exercise the real game and storage flow with a minimal DOM, without timers.
function boot(saved) {
  const elements = new Map();
  const element = () => ({
    innerHTML: '', textContent: '', dataset: {}, style: {},
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener() {}, appendChild() {},
  });
  const storage = new Map(saved ? [['pixel_farm_save', JSON.stringify(saved)]] : []);
  const context = vm.createContext({
    document: {
      querySelector(selector) {
        if (!elements.has(selector)) elements.set(selector, element());
        return elements.get(selector);
      },
      querySelectorAll: () => [], createElement: element,
    },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (k, v) => storage.set(k, v) },
    setTimeout() {}, setInterval() {}, clearTimeout() {},
  });
  vm.runInContext(source, context);
  return {
    run: code => vm.runInContext(code, context),
    saved: () => JSON.parse(storage.get('pixel_farm_save')),
  };
}

test('insufficient crops cannot consume inventory or grant a reward', () => {
  const game = boot();
  game.run('state.inventory.tomato = 1; deliverOrder()');
  assert.equal(game.run('state.coins'), 100);
  assert.equal(game.run('state.inventory.tomato'), 1);
  assert.equal(game.run('state.ordersCompleted'), 0);
});

test('delivery consumes only required crops, pays premium and saves next order', () => {
  const game = boot();
  game.run('state.inventory = { tomato: 3, carrot: 7 }; deliverOrder()');
  const saved = game.saved();
  assert.deepEqual(saved.inventory, { tomato: 1, carrot: 7 });
  assert.equal(saved.coins, 130);
  assert.equal(saved.ordersCompleted, 1);
  assert.equal(game.run('currentOrder().name'), '松鼠的野餐');
  game.run('deliverOrder()');
  assert.equal(game.run('state.coins'), 130);
});

test('reload preserves completed order and does not replay rewards', () => {
  const game = boot();
  game.run('state.inventory.tomato = 2; deliverOrder()');
  const reloaded = boot(game.saved());
  assert.equal(reloaded.run('state.ordersCompleted'), 1);
  reloaded.run('deliverOrder()');
  assert.equal(reloaded.run('state.coins'), 130);
});

test('all six orders pay 50% extra and rotate back after a full round', () => {
  const game = boot();
  game.run(`
    globalThis.expectedCoins = 100;
    for (let i = 0; i < ORDERS.length; i++) {
      const order = currentOrder();
      const base = Object.entries(order.wants).reduce((s, [key, n]) => s + CROPS[key].sellPrice * n, 0);
      if (orderReward(order) !== Math.ceil(base * 1.5)) throw new Error('Bad premium');
      expectedCoins += orderReward(order);
      state.inventory = { ...order.wants };
      deliverOrder();
    }
  `);
  assert.equal(game.run('state.coins'), game.run('expectedCoins'));
  assert.equal(game.run('state.ordersCompleted'), 6);
  assert.equal(game.run('currentOrder().name'), '兔兔的早餐');
});

test('legacy save keeps zero and one seeds, fills only absent crop kinds', () => {
  const original = boot().saved();
  original.seeds = { tomato: 0, carrot: 1 };
  delete original.ordersCompleted;
  const game = boot(original);
  assert.deepEqual(game.saved().seeds, { tomato: 0, carrot: 1, corn: 2, strawberry: 2, watermelon: 2 });
  assert.equal(game.saved().ordersCompleted, 0);
});

test('plant, water, grow, harvest and deliver work together', () => {
  const game = boot();
  game.run(`
    handlePlotClick(0); handlePlotClick(1);
    state.tool = 'water'; handlePlotClick(0); handlePlotClick(1);
    state.plots[0].plantedAt = Date.now() - 22000;
    state.plots[1].plantedAt = Date.now() - 22000;
    growthTick();
    state.tool = 'harvest'; handlePlotClick(0); handlePlotClick(1);
    deliverOrder();
  `);
  assert.equal(game.saved().coins, 130);
  assert.equal(game.saved().ordersCompleted, 1);
  assert.equal(game.saved().inventory.tomato, 0);
  assert.equal(game.saved().plots[0].crop, null);
});

test('removing a decoration is immediately persisted', () => {
  const game = boot();
  game.run("state.plots[0].decoration = '🪴'; handlePlotClick(0)");
  assert.equal(game.saved().plots[0].decoration, null);
  assert.equal(game.saved().inventory.flower_pot, 1);
});

test('invalid order counters in old saves start at the first order', () => {
  for (const invalid of [-1, 0.5, '2', null]) {
    const original = boot().saved();
    original.ordersCompleted = invalid;
    assert.equal(boot(original).saved().ordersCompleted, 0);
  }
});
