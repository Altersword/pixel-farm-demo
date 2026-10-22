/* Boundary fixtures are separate from the ordinary new-save acceptance runs. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {pathToFileURL}=require('node:url');const{read}=require('./helpers.cjs');
require('../js/data.js');const C=require('../js/model.js');require('../js/story.js');require('../js/activities.js');require('../js/world.js');require('../js/environment.js');require('../js/neighbors.js');require('../js/exploration.js');
const out=process.env.FOREST_OUTPUT||path.resolve(__dirname,'../../../outputs/v1.1');
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});try{
 const context=await browser.newContext({viewport:{width:1440,height:980}});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);await page.locator('[data-action=welcome]').click();
 const fixture=C.newGame();fixture.player={map:'village',x:2,y:9,facing:'right'};fixture.world.elapsed=179200;fixture.settings.onboardingSeen=true;
 await page.locator('[data-menu=settings]').click();await page.locator('#import-file').setInputFiles({name:'period-boundary-fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});
 await page.waitForFunction(()=>!document.querySelector('#panel').open);
 const start=await page.evaluate(()=>ForestArt.view.actors);
 await page.waitForFunction(()=>ForestArt.view.actors.some(o=>o.moving),null,{timeout:6000});
 assert.ok(await page.evaluate(()=>ForestArt.view.actors.some(o=>o.visualX!==o.x||o.visualY!==o.y)),'NPC visibly interpolates');
 const view=await page.evaluate(()=>ForestArt.view),actor=view.actors.find(o=>o.id==='hippo');
 await page.locator('#world').click({position:{x:(actor.visualX+.5)*view.tile-view.x,y:(actor.visualY+.5)*view.tile-view.y}});
 await page.waitForFunction(()=>document.querySelector('#panel').open&&document.querySelector('#panel-title').textContent.includes('河河'),null,{timeout:15000});
 await page.keyboard.press('Escape');await page.keyboard.press('j');await page.locator('[data-action=follow][data-id=hippo]').click();
 await page.waitForTimeout(1200);assert.equal(await page.locator('[data-action=gift][data-id=hippo]').count(),1,'reopening a nearby neighbor survives queued dialog close');
 const frozen=await page.evaluate(()=>ForestArt.view.actors);await page.waitForTimeout(800);assert.deepEqual(await page.evaluate(()=>ForestArt.view.actors),frozen);
 await page.keyboard.press('Escape');await page.waitForTimeout(600);
 assert.notDeepEqual(await page.evaluate(()=>ForestArt.view.actors),start);
 // Loss of focus clears held movement, including a pointer that never receives pointerup.
 await page.setViewportSize({width:390,height:844});const box=await page.locator('[data-dir=down]').boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(200);
 await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.mouse.up();await page.locator('[data-menu=journal]').first().click();const stopped=(await read(page)).player;await page.keyboard.press('Escape');await page.waitForTimeout(500);assert.deepEqual((await read(page)).player,stopped);
 const beforeHidden=(await read(page)).world.elapsed;
 const other=await page.context().newPage();await other.goto('about:blank');await other.bringToFront();
 const hidden=await page.evaluate(()=>document.hidden);
 await page.waitForTimeout(1200);await page.bringToFront();await other.close();
 if(hidden)assert.ok((await read(page)).world.elapsed-beforeHidden<250);
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'schedule-boundary-result.json'),JSON.stringify({passed:true,boundaryFixture:true,normalAcceptanceSeparate:true,movingNpcTracking:true,menuPause:true,inputBlur:true,actualTabHidden:hidden,errors},null,2));
 console.log('PASS schedule boundary fixture: actual animated route transition, tracking moving neighbor, frozen dialog, mobile blur stop.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
