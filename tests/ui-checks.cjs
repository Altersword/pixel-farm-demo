const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const path=require('node:path');const {pathToFileURL}=require('node:url');
const {read}=require('./helpers.cjs');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],remote=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url());});
  await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
  await page.locator('[data-action=welcome]').click();
  const before=(await read(page)).player;
  // Use real pointer capture, as on a touch screen.
  const down=await page.locator('[data-dir=down]').boundingBox();await page.mouse.move(down.x+down.width/2,down.y+down.height/2);await page.mouse.down();
  await page.waitForFunction(y=>JSON.parse(localStorage.getItem('pixel_farm_save')).player.y>y,before.y,{timeout:3000});await page.mouse.up();
  assert.ok((await read(page)).player.y>before.y);
  await page.locator('#farm-tools').click();
  await page.locator('[data-action=seed][data-id=carrot]').focus();
  await page.waitForTimeout(1500);assert.equal(await page.evaluate(()=>document.activeElement.dataset.id),'carrot');
  await page.keyboard.press('Enter');assert.equal((await read(page)).selectedSeed,'carrot');await page.keyboard.press('Escape');
  await page.locator('[data-menu=settings]').click();
  const saved=await read(page);
  await page.locator('#import-file').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{broken')});
  await page.waitForFunction(()=>document.querySelector('#panel-notice').textContent.includes('导入失败'));
  assert.equal(await page.locator('#panel-notice').isVisible(),true);assert.equal((await read(page)).coins,saved.coins);
  await page.locator('[data-setting=mute]').uncheck();assert.equal((await read(page)).settings.mute,false);
  await page.locator('[data-setting=mute]').check();await page.locator('[data-setting=reducedMotion]').check();
  await page.keyboard.press('Escape');assert.equal(await page.locator('body').evaluate(n=>n.classList.contains('reduced-motion')),true);
  for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow at '+width);}
  await page.reload();assert.equal((await read(page)).settings.reducedMotion,true);assert.equal((await read(page)).settings.mute,true);
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
  console.log('PASS UI: mobile controls, keyboard focus across refresh, visible invalid-import feedback, persisted settings, 320–1440 px layout, zero remote requests and page errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
