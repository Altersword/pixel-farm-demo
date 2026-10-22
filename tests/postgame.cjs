/* Continues the accepted, ordinary browser save to verify free play and offline growth. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');const {read,walk,clickTile}=require('./helpers.cjs');
const root=path.resolve(__dirname,'..'),output=process.env.FOREST_OUTPUT||path.resolve(root,'../../outputs');
const profile=process.env.FOREST_PROFILE||path.resolve(root,'../normal-play-profile');
(async()=>{
 const context=await chromium.launchPersistentContext(profile,{headless:true,channel:'chrome',viewport:{width:1440,height:980}});
 let page=context.pages()[0]||await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  const url=pathToFileURL(path.join(root,'index.html')).href;await page.goto(url);assert.equal((await read(page)).story.stage,6);
  async function close(){if(await page.locator('#panel').evaluate(n=>n.open))await page.keyboard.press('Escape');}
  async function go(id){await close();const o=await page.evaluate(id=>{const s=JSON.parse(localStorage.getItem('pixel_farm_save'));return ForestWorld.maps[s.player.map].objects.find(o=>o.id===id)},id);await walk(page,o.x,o.y,true);await clickTile(page,o.x,o.y);}
  let state=await read(page);
  if(state.player.map==='forest')await walk(page,14,18);
  if((await read(page)).player.map==='farm')await walk(page,26,9);
  await go('shop');
  for(const id of ['tomato','carrot','corn','strawberry','watermelon'])while(((await read(page)).seeds[id]||0)<3)await page.locator(`[data-action=buyseed][data-id=${id}]`).click();
  await close();await walk(page,1,9);let planted=[];
  for(const id of ['tomato','carrot','corn','strawberry','watermelon']){
   await page.locator('#farm-tools').click();await page.locator(`[data-action=seed][data-id=${id}]`).click();await close();
   for(let i=0;i<3;i++){const s=await read(page),index=s.plots.findIndex(p=>!p.crop&&!p.decoration);assert.ok(index>=0);await go('plot-'+index);assert.equal((await read(page)).plots[index].crop,id);planted.push(index);}
  }
  await page.keyboard.press('2');for(const index of planted)await go('plot-'+index);
  const before=await read(page);console.log('Postgame: planted and watered 15 crops through the normal UI. Closing the page for 10 real seconds.');
  await page.close();await new Promise(resolve=>setTimeout(resolve,10000));page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
  const after=await read(page);assert.equal(after.plots[planted[0]].plantedAt,before.plots[planted[0]].plantedAt);assert.ok(after.plots[planted[0]].progress>before.plots[planted[0]].progress);assert.ok(after.world.elapsed-before.world.elapsed<500);assert.equal(after.story.stage,6);
  console.log('PASS: world time paused while page was closed; crops continued by their original timestamps.');
  await page.waitForFunction(indices=>{const s=JSON.parse(localStorage.getItem('pixel_farm_save'));return indices.every(i=>s.plots[i].progress>=100)},planted,{timeout:150000});
  await walk(page,12,10);
  await page.screenshot({path:path.join(output,'forest-life-farm.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(output,'forest-life-farm-mobile.png'),fullPage:true});await page.setViewportSize({width:1440,height:980});
  await page.keyboard.press('3');await go('plot-'+planted[0]);await go('plot-'+planted[1]);await go('farm-orders');await page.locator('[data-action=deliver]').click();await close();
  state=await read(page);assert.equal(state.ordersCompleted,13);assert.equal(state.story.stage,6);assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(output,'postgame-result.json'),JSON.stringify({passed:true,normalUI:true,postgameOrders:state.ordersCompleted,storyStage:state.story.stage,offlineGrowth:true,worldPausedWhileClosed:true,planted:15,errors},null,2));
  console.log('PASS: after the ending, planting, harvesting and the 13th order still work; farm screenshots captured.');
 }finally{await context.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
