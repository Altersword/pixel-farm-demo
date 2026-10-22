/* Interior grid and inventory-conserving furnishing. */
(function(root){
 'use strict';
 const C=root.ForestCore,D=root.ForestData,W=root.ForestWorld;
 D.homeRecipes={low_table:{name:'林木矮桌',sprite:'low_table',costs:{wood:4}},wood_chair:{name:'小木椅',sprite:'wood_chair',costs:{wood:2}},bookshelf:{name:'矮书架',sprite:'bookshelf',costs:{wood:5,stone:1}}};
 for(const[id,r]of Object.entries(D.homeRecipes))D.items[id]={name:r.name,sprite:r.sprite,kind:'decor'};
 const map={id:'home',name:'灯暖小屋',subtitle:'把收获放上餐桌，把喜欢留在身边',tiles:Array.from({length:W.H},()=>Array(W.W).fill('void')),objects:[],portals:[{x:14,y:14,map:'farm',toX:6,toY:6,label:'回到农场 ↓'}]};
 for(let y=4;y<=15;y++)for(let x=6;x<=21;x++)map.tiles[y][x]=x===6||x===21||y===4||y===15?'wall':'floor';
 const fixed=[['bed','bed',8,6,'柔软的小床',2,2],['stove','stove',18,6,'小屋灶台',2,1],['cabinet','bag',8,10,'储物柜',2,1],['dining','dining',15,9,'朋友的餐桌',2,1],['guest-seat','seat',17,9,'客人的座位',1,1]];
 map.objects=fixed.map(([id,kind,x,y,name,w,h])=>({id,kind,x,y,name,w,h}));W.maps.home=map;
 const fresh=()=>({furniture:[],made:{}});
 const newGame=C.newGame;C.newGame=function(){const s=newGame();s.home=fresh();return s;};
 function furniture(s){return (s.home?s.home.furniture:[]).map(f=>({...f,id:'room-'+f.x+'-'+f.y,kind:'room-decor',name:D.items[f.item].name,w:1,h:1}));}
 function reserved(x,y){return x===14&&(y===13||y===14);}
 function validLayout(s,items=s.home.furniture){
  const keys=new Set();
  for(const f of items){
   if(!f||!Number.isInteger(f.x)||!Number.isInteger(f.y)||map.tiles[f.y]?.[f.x]!=='floor'||reserved(f.x,f.y)||typeof f.item!=='string'||!Object.hasOwn(D.items,f.item)||D.items[f.item].kind!=='decor')return false;
   const key=f.x+','+f.y;if(keys.has(key)||map.objects.some(o=>f.x>=o.x&&f.x<o.x+o.w&&f.y>=o.y&&f.y<o.y+o.h))return false;keys.add(key);
  }
  const sim={...s,home:{...s.home,furniture:items},player:{map:'home',x:14,y:14,facing:'up'}};
  if(!W.walkable(map,14,14,sim))return false;
  const queue=[[14,14]],seen=new Set(['14,14']);
  while(queue.length){const[x,y]=queue.shift();for(const[dx,dy]of [[0,1],[0,-1],[1,0],[-1,0]]){const nx=x+dx,ny=y+dy,key=nx+','+ny;if(!seen.has(key)&&W.walkable(map,nx,ny,sim)){seen.add(key);queue.push([nx,ny]);}}}
  if(s.player.map==='home'&&!seen.has(s.player.x+','+s.player.y))return false;
  return map.objects.every(o=>[...seen].some(key=>{const[x,y]=key.split(',').map(Number);return W.near({x,y},o);}));
 }
 const migrate=C.migrate;C.migrate=function(input){
  const s=migrate(input);s.home=fresh();
  if(input.home!==undefined){const h=input.home;
   if(!h||typeof h!=='object'||!Array.isArray(h.furniture)||h.furniture.length>140||!h.made||typeof h.made!=='object'||Array.isArray(h.made))throw new Error('小屋记录格式无效');
   s.home.furniture=h.furniture.map(f=>({item:f?.item,x:f?.x,y:f?.y}));
   for(const id of Object.keys(D.homeRecipes))if(h.made[id]!==undefined){if(!Number.isSafeInteger(h.made[id])||h.made[id]<0||h.made[id]>1e9)throw new Error('家具制作数量无效');s.home.made[id]=h.made[id];}
  }
  if(!validLayout(s))throw new Error('小屋家具位置冲突或堵住了必要通路');return s;
 };
 function canPlace(s,item,x,y){
  if(s.player.map!=='home'||!Object.hasOwn(D.items,item)||D.items[item].kind!=='decor'||!(s.inventory[item]>0))return {ok:false,message:'先进入小屋，选择背包里的装饰。'};
  if(x===s.player.x&&y===s.player.y)return {ok:false,message:'这里正站着你，换个位置吧。'};
  if(!validLayout(s,[...s.home.furniture,{item,x,y}]))return {ok:false,message:'这里放不下；请留出门口和设施旁的通路。'};
  return {ok:true,message:'这个位置可以摆放。'};
 }
 C.placeHome=function(s,item,x,y){const result=canPlace(s,item,x,y);if(!result.ok)return result;s.home.furniture.push({item,x,y});s.inventory[item]--;return {ok:true,message:'小屋里又多了一点喜欢。'};};
 C.retrieveHome=function(s,x,y){if(s.player.map!=='home')return {ok:false,message:'回小屋再收回家具吧。'};const i=s.home.furniture.findIndex(f=>f.x===x&&f.y===y);if(i<0)return {ok:false,message:'这里没有可收回的家具。'};const[f]=s.home.furniture.splice(i,1);s.inventory[f.item]=(s.inventory[f.item]||0)+1;return {ok:true,message:'家具已收回背包。'};};
 C.craftHome=function(s,id){const r=Object.hasOwn(D.homeRecipes,id)&&D.homeRecipes[id];if(!r||!C.affordable(s,r.costs))return {ok:false,message:'材料还不够，去森林找找吧。'};for(const[k,n]of Object.entries(r.costs))s.materials[k]-=n;s.inventory[id]=(s.inventory[id]||0)+1;s.home.made[id]=(s.home.made[id]||0)+1;return {ok:true,message:r.name+'做好了，带回小屋布置吧。'};};
 C.enterHome=function(s){if(s.player.map!=='farm'||!W.near(s.player,W.maps.farm.objects.find(o=>o.id==='home')))return {ok:false,message:'先走到农场小屋门前。'};Object.assign(s.player,{map:'home',x:14,y:13,facing:'up'});return {ok:true,message:'欢迎回家。门口向南回农场，床边可以休息。'};};
 root.ForestHome={map,furniture,reserved,validLayout,canPlace};if(typeof module!=='undefined')module.exports=root.ForestHome;
})(globalThis);
