const { test } = require('node:test');
const assert = require('node:assert/strict');
const D = require('../js/data.js');
const C = require('../js/model.js');
const W = require('../js/world.js');
const S = require('../js/storage.js');
const memory = () => { const data = new Map(); return { getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,v) }; };
test('harvesting and order delivery consume crops and preserve seed income', () => {
 const s=C.newGame(), now=100000;
 for(let i=0;i<2;i++){assert.ok(C.farm(s,i,now).ok);s.tool='water';assert.ok(C.farm(s,i,now).ok);s.tool='plant';}
 s.tool='harvest';assert.equal(C.farm(s,0,now+20000).ok,false);
 assert.ok(C.farm(s,0,now+22000,()=>0).ok);assert.ok(C.farm(s,1,now+22000,()=>0).ok);
 assert.equal(s.seeds.tomato,5);assert.ok(C.deliver(s).ok);assert.equal(s.coins,130);assert.equal(s.inventory.tomato,0);assert.equal(s.ordersCompleted,1);
});
test('shortages cannot award money or consume items',()=>{const s=C.newGame();s.inventory.tomato=1;const before=JSON.stringify(s);assert.equal(C.deliver(s).ok,false);assert.equal(JSON.stringify(s),before);});
test('orders rotate after six and retain their 50 percent premium',()=>{const s=C.newGame();for(let i=0;i<6;i++){const o=C.currentOrder(s);s.inventory={...o.wants};const amount=C.reward(o);const coins=s.coins;C.deliver(s);assert.equal(s.coins-coins,amount);}assert.equal(C.currentOrder(s).neighbor,'rabbit');});
test('legacy migration preserves 0 and 1 seeds, plots, currency and orders',()=>{const s=C.newGame();delete s.version;s.seeds={tomato:0,carrot:1};s.coins=321;s.ordersCompleted=8;s.plots[0].decoration='🪴';const m=C.migrate(s);assert.equal(m.coins,321);assert.equal(m.ordersCompleted,8);assert.equal(m.seeds.tomato,0);assert.equal(m.seeds.carrot,1);assert.equal(m.seeds.corn,2);assert.equal(m.plots[0].decoration,'flower_pot');});
test('import rejects malformed data before replacing storage',()=>{const mem=memory(),store=S.create(mem),s=C.newGame();store.save(s);const before=store.raw();for(const invalid of ['null','[]','{',JSON.stringify({...s,coins:-1}),JSON.stringify({...s,version:999})])assert.throws(()=>store.import(invalid));assert.equal(store.raw(),before);});
test('migration backs up old data and damaged saves stay protected',()=>{const mem=memory(),store=S.create(mem),s=C.newGame();delete s.version;mem.setItem(S.key,JSON.stringify(s));assert.equal(store.load().state.version,2);assert.equal(mem.getItem(S.key+'_legacy_backup'),JSON.stringify(s));mem.setItem(S.key,'broken');assert.equal(store.load().protected,true);assert.equal(store.raw(),'broken');});
test('export/import round trip retains inventory, progress and position',()=>{const store=S.create(memory()),s=C.newGame();s.player={map:'village',x:12,y:11,facing:'up'};s.inventory.corn=17;s.ordersCompleted=7;assert.deepEqual(store.import(store.export(s)),s);});
test('water and houses block movement',()=>{const s=C.newGame();s.player={map:'farm',x:20,y:14,facing:'right'};assert.equal(W.move(s,1,0),false);s.player={map:'farm',x:3,y:6,facing:'up'};assert.equal(W.move(s,0,-1),false);});
test('all portals and interactive objects have accessible routes',()=>{for(const map of Object.values(W.maps)){const s=C.newGame();s.player={map:map.id,x:14,y:9,facing:'down'};for(const gate of map.portals)assert.ok(W.pathTo(s,gate.x,gate.y),map.id+' '+gate.label);for(const o of map.objects)assert.ok(W.pathTo(s,o.x,o.y,true),map.id+' '+o.id);}});
test('walking through portals updates visited places and returns safely',()=>{const s=C.newGame();for(const [map,x,y,dx,dy,to] of [['farm',25,9,1,0,'village'],['village',2,9,-1,0,'farm'],['farm',14,2,0,-1,'forest'],['forest',14,17,0,1,'farm']]){s.player={map,x,y,facing:'up'};assert.ok(W.move(s,dx,dy));assert.equal(s.player.map,to);}assert.deepEqual(s.world.visited,['farm','village','forest']);});
test('renderer draws day/night and all original sprites without external assets',()=>{
 require('../js/sprites.js');require('../js/art.js');global.devicePixelRatio=1;
 const fills=[];const ctx={fillStyle:'',globalAlpha:1,fillRect(){fills.push(this.fillStyle)},setTransform(){},strokeRect(){},fillText(){},measureText(t){return{width:t.length*10}},save(){},restore(){},translate(){},scale(){}};
 const canvas={clientWidth:800,clientHeight:560,getContext:()=>ctx};const renderer=global.ForestArt.create(canvas),s=C.newGame();
 renderer.draw(s,1000);assert.ok(!fills.some(x=>x.startsWith('rgba(30')));fills.length=0;
 s.world.elapsed=600000;renderer.draw(s,2000);assert.ok(fills.some(x=>x.startsWith('rgba(30')));
 for(const id of Object.keys(D.crops))for(const stage of [0,50,100])global.ForestSprites.create(ctx).crop(id,stage,0,0,42);
 for(const n of D.neighbors)global.ForestSprites.create(ctx).character(n.id,0,0,42);
});
