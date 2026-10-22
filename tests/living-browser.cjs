const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {pathToFileURL}=require('node:url');const{read,walk,clickTile}=require('./helpers.cjs');
const root=path.resolve(__dirname,'..'),out=process.env.FOREST_OUTPUT||path.resolve(root,'../../outputs/v1.1');
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});try{
 const page=await browser.newPage({viewport:{width:1440,height:980}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.join(root,'index.html')).href);await page.locator('[data-action=welcome]').click();
 async function close(){if(await page.locator('#panel').evaluate(n=>n.open))await page.keyboard.press('Escape');}
 async function area(id){await close();const p=(await read(page)).player;if(p.map===id)return;if(p.map==='village')await walk(page,1,9);if(p.map==='forest')await walk(page,14,18);if(id==='village')await walk(page,26,9);if(id==='forest')await walk(page,14,1);}
 async function go(id){await close();let o=await page.evaluate(id=>{const s=JSON.parse(localStorage.getItem('pixel_farm_save'));return ForestWorld.objects(ForestWorld.maps[s.player.map],s).find(o=>o.id===id)},id);assert.ok(o,id);await walk(page,o.x,o.y,true);await clickTile(page,o.x,o.y);}
 const weatherNames=['晴天','小雨','薄雾'];
 for(let day=0;day<3;day++){
  assert.match(await page.locator('#day-phase').innerText(),new RegExp(weatherNames[day]));
  await area('village');await page.keyboard.press('j');await page.locator('[data-action=follow][data-id=rabbit]').click();
  await page.waitForFunction(()=>document.querySelector('#panel').open&&document.querySelector('#panel-title').textContent.includes('棉棉'),null,{timeout:20000});
  const before=(await read(page)).world.elapsed,actors=await page.evaluate(()=>ForestNeighbors.objects(JSON.parse(localStorage.getItem('pixel_farm_save')),'village'));
  await page.waitForTimeout(1200);assert.ok((await read(page)).world.elapsed-before<250);
  assert.deepEqual(await page.evaluate(()=>ForestNeighbors.objects(JSON.parse(localStorage.getItem('pixel_farm_save')),'village')),actors);
  await close();await page.waitForTimeout(300);await page.screenshot({path:path.join(out,'weather-'+day+'-desktop.png'),fullPage:true});
  if(day===1){await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(out,'weather-rain-mobile.png'),fullPage:true});await page.setViewportSize({width:1440,height:980});}
  if(day<2){await area('farm');if(day===0){await page.keyboard.press('1');await go('plot-0');assert.equal((await read(page)).plots[0].watered,false);}
   await go('home');await page.locator('[data-action=rest]').click();if(day===0)assert.equal((await read(page)).plots[0].watered,true);
  }
 }
 assert.deepEqual(errors,[]);console.log('PASS living world: three weather days via ordinary rest, rain watering, journal neighbor tracking, paused dialogs, screenshots, no script errors.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
