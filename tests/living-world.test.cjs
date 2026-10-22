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
