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

const E=require('../js/environment.js'),N=require('../js/neighbors.js'),D=global.ForestData;const X=require('../js/exploration.js');
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

test('all six weather stories reward currency and two furniture items only once',()=>{
 const s=C.newGame(),start=s.coins;assert.equal(X.complete(s,'windchime').ok,false);
 for(let day=0;day<3;day++){
  s.world.elapsed=day*D.dayLength;
  for(const e of X.events.filter(e=>e.weather===E.weather(s))){
   X.discover(s,e.id);assert.ok(X.complete(s,e.id).ok);const before=JSON.stringify(s);
   assert.equal(X.complete(s,e.id).ok,false);assert.equal(JSON.stringify(s),before);
  }
 }
 assert.equal(s.coins,start+30);assert.equal(s.inventory.explorer_chime,1);assert.equal(s.inventory.explorer_birdhouse,1);
 assert.deepEqual(C.migrate(JSON.parse(JSON.stringify(s))),s);
 assert.ok(C.place(s,'explorer_chime',0).ok);assert.ok(C.retrieve(s,0).ok);assert.equal(s.inventory.explorer_chime,1);
});
test('wrong weather records discovery without charging or rewarding',()=>{
 const s=C.newGame();X.discover(s,'paperboat');const before=JSON.stringify(s);assert.equal(X.complete(s,'paperboat').ok,false);assert.equal(JSON.stringify(s),before);
 for(const e of X.events){const p={...s,player:{map:e.map,x:14,y:9,facing:'down'}};assert.ok(W.pathTo(p,e.x,e.y,true));}
});
test('v2 upgrade preserves full progress, creates v4 and retains the original backup',()=>{
 const s=C.newGame();s.version=2;delete s.exploration;s.coins=753;s.inventory.tomato=8;s.seeds.tomato=0;s.ordersCompleted=13;s.story.stage=6;s.story.festival=true;s.friends.rabbit.points=10;
 const data=new Map([['pixel_farm_save',JSON.stringify(s)]]),S=require('../js/storage.js'),store=S.create({getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)});
 const m=store.load().state;assert.equal(m.version,4);for(const field of ['coins','inventory','seeds','plots','story','friends','ordersCompleted','player'])assert.deepEqual(m[field],s[field]);
 assert.equal(store.backup(),JSON.stringify(s));store.save(m);assert.equal(store.load().state.version,4);assert.equal(store.backup(),JSON.stringify(s));
});
test('malformed exploration imports leave the current save and backup untouched',()=>{
 const S=require('../js/storage.js'),data=new Map(),store=S.create({getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)});store.save(C.newGame());const before=store.raw();
 for(const exploration of [{discovered:['bad'],completed:[],rewards:[]},{discovered:[],completed:['windchime'],rewards:[]},{discovered:[],completed:[],rewards:['explorer_chime']},{discovered:['windchime','windchime'],completed:[],rewards:[]}]){
  assert.throws(()=>store.import(JSON.stringify({...C.newGame(),exploration})));assert.equal(store.raw(),before);assert.equal(data.has('pixel_farm_save_import_backup'),false);
 }
});

test('click hit testing follows rendered NPC positions during interpolation',()=>{
 const s=C.newGame();N.objects(s,'village');s.world.elapsed=D.dayLength/4;N.update(s,200);N.update(s,50);
 for(const o of N.objects(s,'village'))if(o.moving){const hit=W.hitTest(W.maps.village,o.visualX+.5,o.visualY+.5,s);assert.equal(hit.id,o.id);}
});
// Exercise the real browser coordinator with a controllable document lifecycle.
// This fixture is independent from the UI-only normal playthroughs.
test('entry frame pauses when hidden or a panel is open, while crop timestamps still grow',()=>{
 const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),s=C.newGame();s.settings.onboardingSeen=true;
 const listeners={},nodes=new Map();let frame,modal=false;
 const node=()=>({addEventListener(){},classList:{toggle(){}},focus(){},textContent:''});
 const document={hidden:false,body:node(),querySelector(id){if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)},querySelectorAll(){return[]},addEventListener(id,fn){listeners[id]=fn}};
 const context={ForestCore:C,ForestWorld:W,ForestData:D,ForestEnvironment:E,ForestNeighbors:N,
  ForestStorage:{create:()=>({load:()=>({state:s}),save(){}})},ForestAudio:{create:()=>({set:()=>Promise.resolve(),effect(){},scene(){}})},
  ForestArt:{create:()=>({draw(){}})},ForestUI:{create:()=>({refresh(){},toast(){},open(){},tick(){},get isOpen(){return modal}})},
  document,window:{addEventListener(){}},localStorage:{},requestAnimationFrame(fn){frame=fn},setTimeout,URL,Blob};
 vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../game.js'),'utf8'),context);
 frame(100);frame(200);assert.equal(s.world.elapsed,100);
 document.hidden=true;listeners.visibilitychange();s.plots[0]={crop:'tomato',progress:0,watered:false,plantedAt:Date.now()-60000};
 frame(3000);frame(4000);assert.equal(s.world.elapsed,100);assert.equal(s.plots[0].progress,100);
 document.hidden=false;listeners.visibilitychange();frame(9000);assert.equal(s.world.elapsed,100);frame(9100);assert.equal(s.world.elapsed,200);
 modal=true;frame(9200);frame(10000);assert.equal(s.world.elapsed,200);modal=false;frame(10100);assert.equal(s.world.elapsed,300);
});
