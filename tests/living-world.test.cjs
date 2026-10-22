const {test}=require('node:test'),assert=require('node:assert/strict');
require('../js/data.js');const C=require('../js/model.js');require('../js/story.js');require('../js/activities.js');const W=require('../js/world.js');require('../js/sprites.js');require('../js/art.js');
test('render movement interpolates without changing collision or saved position',()=>{
 global.devicePixelRatio=1;
 const ctx={fillRect(){},setTransform(){},strokeRect(){},fillText(){},measureText(t){return{width:t.length*8}},save(){},restore(){},translate(){},scale(){}};
 const renderer=ForestArt.create({clientWidth:800,clientHeight:560,getContext:()=>ctx}),s=C.newGame();
 renderer.draw(s,100);assert.ok(W.move(s,0,1));renderer.draw(s,110);renderer.draw(s,185);
 assert.equal(s.player.y,9);assert.ok(ForestArt.view.playerY>8&&ForestArt.view.playerY<9);
 renderer.draw(s,270);assert.equal(ForestArt.view.playerY,9);
 s.settings.reducedMotion=true;W.move(s,0,1);renderer.draw(s,280);assert.equal(ForestArt.view.playerY,10);
 s.player={map:'village',x:2,y:9,facing:'right'};renderer.draw(s,290);assert.equal(ForestArt.view.playerX,2);
});

const E=require('../js/environment.js'),N=require('../js/neighbors.js'),D=global.ForestData;
test('weather and four periods wrap deterministically at exact boundaries',()=>{
 const s=C.newGame();assert.equal(E.weather(s),'sun');assert.equal(E.weather(s,1),'rain');
 for(let day=0;day<6;day++)for(let period=0;period<4;period++){
  s.world.elapsed=day*D.dayLength+period*D.dayLength/4;
  assert.equal(E.period(s),period);assert.equal(E.weather(s),['sun','rain','mist'][day%3]);
 }
 s.world.elapsed=D.dayLength-1;E.advance(s,1);assert.equal(E.period(s),0);assert.equal(E.weather(s),'rain');
});
test('pause never advances simulation and rain uses the existing watering benefit',()=>{
 const s=C.newGame();const elapsed=s.world.elapsed;E.advance(s,100,true);assert.equal(s.world.elapsed,elapsed);
 C.farm(s,0,1000);C.rest(s);assert.equal(E.weather(s),'rain');assert.equal(s.plots[0].watered,true);
 C.farm(s,1,1000);assert.equal(s.plots[1].watered,true);assert.equal(s.plots[1].plantedAt,1000);
 C.grow(s,22000);assert.equal(s.plots[0].progress,100);assert.equal(s.plots[1].progress,100);
 C.rest(s);assert.equal(E.weather(s),'mist');C.farm(s,2,1000);assert.equal(s.plots[2].watered,false);
});
test('all neighbor destinations and complete daily routes are accessible and nonblocking',()=>{
 const s=C.newGame();
 for(let day=0;day<3;day++)for(let p=0;p<4;p++){
  N.objects(s,'village');s.world.elapsed=day*D.dayLength+p*D.dayLength/4;
  for(const n of D.neighbors){const dest=N.destination(s,n.id);assert.ok(W.walkable(W.maps.village,dest.x,dest.y));
   const current=N.whereabouts(s,n.id);const route=W.pathTo({...s,player:{map:'village',x:current.x,y:current.y,facing:'down'}},dest.x,dest.y);
   assert.ok(route,'route '+n.id);assert.ok(N.dialogue(s,n.id).length>20);
  }
  for(let i=0;i<180;i++)N.update(s,100);
  for(const n of D.neighbors){const a=N.whereabouts(s,n.id),d=N.destination(s,n.id);assert.equal(a.x,d.x);assert.equal(a.y,d.y);}
  const objects=W.objects(W.maps.village,s).filter(o=>o.kind==='npc');assert.equal(objects.length,6);
  assert.equal(new Set(objects.map(o=>o.x+','+o.y)).size,6,'distinct destinations');
 }
});
test('neighbors freeze with menus and rejoin their routes afterward',()=>{
 const s=C.newGame();N.objects(s,'village');s.world.elapsed=D.dayLength/4;N.update(s,100);
 const before=JSON.stringify(N.objects(s,'village'));N.update(s,10000,true);assert.equal(JSON.stringify(N.objects(s,'village')),before);
 for(let i=0;i<80;i++)N.update(s,100);assert.equal(N.whereabouts(s,'rabbit').travelling,false);
 assert.ok(!Object.hasOwn(s,'actors'),'animation is never saved');
});
