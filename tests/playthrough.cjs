/* Real-time acceptance run. Reads saved state, operates only keyboard/mouse/UI.
 * Does not write localStorage, call gameplay functions, change clocks or seed items.
 * A persistent browser profile preserves ordinary progress if the runner stops. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { read, walk, clickTile } = require('./helpers.cjs');
const D = require('../js/data.js');
const activities = require('./activities-browser.cjs');
const root = path.resolve(__dirname, '..');
const output = process.env.FOREST_OUTPUT || path.resolve(root, '../../outputs');
const profile = process.env.FOREST_PROFILE || path.resolve(root, '../normal-play-profile');
const started = Date.now(), events = [];
function log(message) {
  const line = `[${((Date.now() - started) / 1000).toFixed(1)}s] ${message}`;
  events.push(line); console.log(line);
  fs.writeFileSync(path.join(output, 'normal-playthrough-log.txt'), events.join('\n') + '\n');
}
async function run(page) {
  const close = async () => { if (await page.locator('#panel').evaluate(n => n.open)) await page.keyboard.press('Escape'); };
  async function area(id) {
    await close(); let s = await read(page);
    if (s.player.map === id) return;
    if (s.player.map === 'village') await walk(page, 1, 9);
    else if (s.player.map === 'forest') await walk(page, 14, 18);
    if (id === 'village') await walk(page, 26, 9);
    if (id === 'forest') await walk(page, 14, 1);
    assert.equal((await read(page)).player.map, id);
  }
  async function go(id) {
    await close();
    const o = await page.evaluate(id => {
      const s = JSON.parse(localStorage.getItem('pixel_farm_save'));
      return ForestWorld.objects(ForestWorld.maps[s.player.map],s).find(o => o.id === id);
    }, id);
    assert.ok(o, id); await walk(page, o.x, o.y, true); await clickTile(page, o.x, o.y);
  }
  async function claim() {
    await close(); await page.keyboard.press('j');
    for (let i = 0; i < 6; i++) {
      const claim = page.locator('[data-action=claim]');
      if (!(await claim.count()) || !(await claim.isEnabled())) break;
      await claim.click(); log('手札章节推进到 ' + (await read(page)).story.stage);
    }
    await close();
  }
  async function gather() {
    await area('forest');
    for (const n of D.resources) {
      const s = await read(page);
      if (s.world.gathered[n.id] !== Math.floor(s.world.elapsed / D.dayLength)) await go(n.id);
    }
    log('森林采集完成：' + JSON.stringify((await read(page)).materials));
    await area('farm');
  }
  async function plant() {
    await area('farm'); let s = await read(page);
    const needs = Object.fromEntries(Object.keys(D.crops).map(id => [id, 0]));
    for (let i = s.ordersCompleted; i < 12; i++) for (const [id, n] of Object.entries(D.orders[i % 6].wants)) needs[id] += n;
    const activityData = await page.evaluate(()=>ForestData.activities);
    for (const [id,a] of Object.entries(activityData)) if (!s.story.activities[id] && a.costs) for (const [crop,n] of Object.entries(a.costs)) needs[crop] += n;
    let planted = 0;
    for (const id of Object.keys(D.crops)) {
      s = await read(page);
      const active = s.plots.filter(p => p.crop === id).length;
      let count = Math.min(Math.max(0, needs[id] - (s.inventory[id] || 0) - active), s.seeds[id] || 0, s.plots.filter(p => !p.crop && !p.decoration).length);
      if (!count) continue;
      await page.locator('#farm-tools').click(); await page.locator(`[data-action=seed][data-id=${id}]`).click(); await close();
      while (count-- > 0) {
        s = await read(page); const index = s.plots.findIndex(p => !p.crop && !p.decoration);
        await go('plot-' + index); assert.equal((await read(page)).plots[index].crop, id); planted++;
      }
    }
    s = await read(page); await page.keyboard.press('2');
    for (const [index, plot] of s.plots.entries()) if (plot.crop && !plot.watered && plot.progress < 100) await go('plot-' + index);
    if (planted) log('种下并照料 ' + planted + ' 株作物');
    return planted;
  }
  async function harvest() {
    await area('farm'); const s = await read(page); let count = 0;
    await page.keyboard.press('3');
    for (const [index, plot] of s.plots.entries()) if (plot.crop && plot.progress >= 100) { await go('plot-' + index); assert.equal((await read(page)).plots[index].crop, null); count++; }
    if (count) log('收获 ' + count + ' 株作物');
    return count;
  }
  async function build() {
    await area('farm'); let s = await read(page);
    for (const [id, recipe] of Object.entries(D.recipes)) {
      if (s.crafted[id] || !Object.entries(recipe.costs).every(([k, n]) => s.materials[k] >= n)) continue;
      await go('bench'); await page.locator(`[data-action=craft][data-id=${id}]`).click(); await close();
      s = await read(page); assert.ok(s.crafted[id]); log('制作 ' + recipe.name);
    }
    for (const [index, id] of ['flowerbox', 'bench', 'lamp'].entries()) {
      s = await read(page); if (s.decorations[index] || !(s.inventory[id] > 0)) continue;
      await go('decor-' + index); await page.locator(`[data-action=place][data-id=${id}]`).click(); await close(); assert.equal((await read(page)).decorations[index], id);
    }
    await claim();
    for (let i = 0; i < 3; i++) {
      s = await read(page); const e = D.expansions[s.expansion];
      if (!e || s.coins < e.coins || !Object.entries(e.costs).every(([k, n]) => s.materials[k] >= n)) break;
      await go('expand'); await page.locator('[data-action=expand]').click(); await close(); log('扩建至 ' + (await read(page)).expansion + ' 级'); await claim();
    }
  }
  await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
  await page.waitForFunction(() => localStorage.getItem('pixel_farm_save'));
  if (await page.locator('[data-action=welcome]').count()) await page.locator('[data-action=welcome]').click();
  let s = await read(page);
  log(`正常存档起点：章节 ${s.story.stage}，订单 ${s.ordersCompleted}，金币 ${s.coins}`);
  const activityHelpers={area,go,close,log};
  if (s.story.stage < 4) {
    await plant(); await gather(); await area('village');
    for (const n of D.neighbors) { await go(n.id); await page.waitForSelector('#panel[open]'); await close(); }
    log('认识全部六位邻居'); await build(); await harvest(); await claim();
    // Daily materials replenish via the ordinary home interaction, not the clock.
    await go('home'); await page.locator('[data-action=rest]').click(); await gather(); await build();
  }
  await activities.nonFood(page,activityHelpers);
  for (let loop = 0; loop < 100; loop++) {
    s = await read(page); if (s.ordersCompleted >= 12) break;
    await harvest(); await claim(); await build(); await plant();
    s = await read(page); const order = D.orders[s.ordersCompleted % 6];
    if (Object.entries(order.wants).every(([id, n]) => (s.inventory[id] || 0) >= n)) {
      await go('farm-orders'); await page.locator('[data-action=deliver]').click(); await close();
      log(`交付第 ${(await read(page)).ordersCompleted} 单：${order.name}`); continue;
    }
    assert.ok(s.plots.some(p => p.crop), 'Missing crops must be growing through ordinary gameplay');
    log('等待实际生长时间；没有更改时钟、库存或种植时间');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('pixel_farm_save')).plots.some(p => p.crop && p.progress >= 100), null, { timeout: 150000 });
  }
  assert.equal((await read(page)).ordersCompleted, 12);
  for(let tries=0;tries<10;tries++){
    if(await activities.food(page,activityHelpers))break;
    await harvest();await plant();
    const state=await read(page);
    if(!state.plots.some(p=>p.crop))throw new Error('Party ingredients could not be grown');
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('pixel_farm_save')).plots.some(p=>p.crop&&p.progress>=100),null,{timeout:150000});
  }
  await build(); await claim();
  s = await read(page); assert.equal(s.story.stage, 5); assert.equal(s.expansion, 3);
  assert.ok(Object.keys(D.recipes).every(id => s.crafted[id] > 0)); assert.ok(D.neighbors.every(n => s.friends[n.id].points >= 3));
  await area('village'); await go('festival'); await page.waitForSelector('#panel[open]'); await page.locator('[data-action=festival]').click();
  assert.equal((await read(page)).story.festival, true); log('森林聚会完成：主线通关');
  await page.screenshot({ path: path.join(output, 'forest-life-celebration.png'), fullPage: true });
  await close(); await page.reload(); assert.equal((await read(page)).story.stage, 6); assert.equal((await read(page)).story.festival, true);
  await page.screenshot({ path: path.join(output, 'forest-life-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 }); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: path.join(output, 'forest-life-mobile.png'), fullPage: true });
  log('刷新保留结局，桌面与手机截图已保存');
  // UI-only save round trip after the normal run is complete.
  await page.locator('[data-menu=settings]').click();
  const downloadPromise = page.waitForEvent('download'); await page.locator('[data-action=export]').click(); const download = await downloadPromise;
  const save = fs.readFileSync(await download.path()); const exported = JSON.parse(save);
  await page.locator('#import-file').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('null') });
  await page.waitForFunction(() => document.querySelector('#panel-notice').textContent.includes('导入失败'));
  assert.equal((await read(page)).story.stage, 6);
  await page.locator('#import-file').setInputFiles({ name: 'valid.json', mimeType: 'application/json', buffer: save });
  await page.waitForFunction(() => !document.querySelector('#panel').open);
  assert.equal((await read(page)).coins, exported.coins); assert.equal((await read(page)).ordersCompleted, 12);
  log('通过设置面板完成导出、拒绝非法导入和有效导入；主线进度保持');
  return await read(page);
}
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const context = await chromium.launchPersistentContext(profile, { headless: true, channel: 'chrome', viewport: { width: 1440, height: 980 }, acceptDownloads: true });
  const page = context.pages()[0] || await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    const state = await run(page); assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(output, 'normal-playthrough-result.json'), JSON.stringify({ passed: true, realElapsedSeconds: (Date.now() - started) / 1000, orders: state.ordersCompleted, story: state.story, expansion: state.expansion, crafted: state.crafted, friends: state.friends, errors, saveManipulation: false, clockManipulation: false }, null, 2));
    log('PASS：正常新存档主线、刷新恢复、存档导入导出、手机布局；没有页面脚本错误。');
  } catch (error) { log('FAIL: ' + error.stack); process.exitCode = 1; }
  finally { await context.close(); }
})();
