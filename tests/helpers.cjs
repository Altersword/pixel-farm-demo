const assert=require('node:assert/strict');
async function read(page){return page.evaluate(()=>JSON.parse(localStorage.getItem('pixel_farm_save')));}
async function walk(page,x,y,adjacent=false){
 const route=await page.evaluate(({x,y,adjacent})=>ForestWorld.pathTo(JSON.parse(localStorage.getItem('pixel_farm_save')),x,y,adjacent),{x,y,adjacent});assert.ok(route,'route exists');
 for(const [dx,dy]of route){const before=(await read(page)).player;const key=dx<0?'ArrowLeft':dx>0?'ArrowRight':dy<0?'ArrowUp':'ArrowDown';await page.keyboard.down(key);await page.waitForFunction(p=>{const n=JSON.parse(localStorage.getItem('pixel_farm_save')).player;return n.x!==p.x||n.y!==p.y||n.map!==p.map},before,{timeout:3000});await page.keyboard.up(key);if((await read(page)).player.map!==before.map)break;}
}
async function clickTile(page,x,y){const p=(await read(page)).player;const r=await page.locator('#world').boundingBox();const t=r.width<500?34:42;const cx=Math.max(0,Math.min(28*t-r.width,p.x*t-r.width/2)),cy=Math.max(0,Math.min(20*t-r.height,p.y*t-r.height/2));await page.locator('#world').click({position:{x:(x+.5)*t-cx,y:(y+.5)*t-cy}});}

module.exports={read,walk,clickTile};
