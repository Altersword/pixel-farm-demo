/* Upgrade the real v1 acceptance profile; no save mutation or synthetic rewards. */
const{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const{pathToFileURL}=require('node:url');const{read,walk,clickTile}=require('./helpers.cjs');
const root=path.resolve(__dirname,'..'),out=process.env.FOREST_OUTPUT||path.resolve(root,'../../outputs/v1.1');
const profile=process.env.FOREST_LEGACY_PROFILE||path.resolve(root,'../normal-play-with-activities');
(async()=>{const context=await chromium.launchPersistentContext(profile,{headless:true,channel:'chrome',viewport:{width:1440,height:980}});try{
 const page=context.pages()[0]||await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(pathToFileURL(path.join(root,'index.html')).href);
 const original=await page.evaluate(()=>localStorage.getItem('pixel_farm_save_version_2_backup'));assert.ok(original,'real v1 backup exists');const old=JSON.parse(original),now=await read(page);assert.equal(old.version,2);assert.equal(old.story.stage,6);assert.equal(now.version,3);
 for(const key of ['coins','seeds','inventory','ordersCompleted','friends','story','expansion','decorations','crafted','materials'])assert.deepEqual(now[key],old[key],key+' preserved');
 assert.equal(now.story.stage,6);assert.equal(now.ordersCompleted,13);assert.equal(now.exploration.completed.length,0);
 // Exercise an actual new exploration event in the upgraded completed save.
 if(now.player.map==='village')await walk(page,1,9);if((await read(page)).player.map==='forest')await walk(page,14,18);
 await walk(page,3,3,true);await clickTile(page,3,3);await page.locator('[data-action=rest]').click();
 let s=await read(page);while(Math.floor(s.world.elapsed/720000)%3!==0){await clickTile(page,3,3);await page.locator('[data-action=rest]').click();s=await read(page);}
 await walk(page,16,5,true);await clickTile(page,16,5);await page.locator('[data-action=explore-step]').click();await page.locator('[data-action=explore-step]').click();assert.ok((await read(page)).exploration.completed.includes('windchime'));
 assert.equal((await read(page)).story.stage,6);assert.equal((await read(page)).ordersCompleted,13);assert.deepEqual(errors,[]);
 await page.keyboard.press('Escape');await page.locator('[data-menu=settings]').click();const download=page.waitForEvent('download');await page.locator('[data-action=raw]').click();assert.equal(fs.readFileSync(await(await download).path(),'utf8'),original);
 fs.writeFileSync(path.join(out,'v2-actual-save.json'),original);fs.writeFileSync(path.join(out,'upgrade-result.json'),JSON.stringify({passed:true,realV1CompletedSave:true,originalVersion:old.version,newVersion:now.version,ordersPreserved:13,storyPreserved:6,rawBackupExact:true,newExploration:true,errors},null,2));console.log('PASS real v1 profile upgrade: complete progression preserved, original export exact, new story playable.');
}finally{await context.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
