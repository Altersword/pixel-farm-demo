/* Cooking and a single persistent guest visit; no timers or hunger. */
(function(root){
 'use strict';
 const C=root.ForestCore,D=root.ForestData,W=root.ForestWorld;
 D.dishes={
  tomato_soup:{name:'番茄暖汤',costs:{tomato:2},favorite:'fox',color:'#c7785f'},
  carrot_chowder:{name:'胡萝卜玉米浓汤',costs:{carrot:1,corn:1},favorite:'rabbit',color:'#d6a45f'},
  roast_corn:{name:'香烤玉米',costs:{corn:2},favorite:'squirrel',color:'#d7b86e'},
  berry_jam:{name:'草莓果酱',costs:{strawberry:2},favorite:'bear',color:'#bd7780'},
  melon_drink:{name:'西瓜冰饮',costs:{watermelon:1},favorite:'hippo',color:'#9aaf7a'},
  forest_pie:{name:'森林蔬菜派',costs:{tomato:1,carrot:1,corn:1},favorite:'owl',color:'#ae9d6f'},
 };
 D.items.hearth={name:'暖房纪念壁炉',kind:'decor',sprite:'hearth'};
 for(const[id,d]of Object.entries(D.dishes))D.items[id]={name:d.name,kind:'food',sprite:'meal'};
 const welcomes={rabbit:'我把今天最柔软的一声早安带来了。这里的窗边真适合养花。',squirrel:'包里没有松果掉出来吧？第一次来你家，总想带一点小惊喜。',bear:'屋子里的香味真好闻。今天轮到我乖乖坐着等开饭啦。',hippo:'这把椅子很舒服。有一个被朋友留好的位置，真好。',fox:'你的家像一封刚拆开的信，每个角落都有新故事。',owl:'我带来一页没写完的故事，正好用今天的晚餐接下去。'};
 const favorites={rabbit:'一勺里有两种颜色，像把春天端上了桌。',squirrel:'烤得香香的玉米！这一口我会记到明天。',bear:'这个果酱像阳光一样甜。下次换我请你。',hippo:'清凉的西瓜，把池塘的微风也带进来了。',fox:'暖汤里藏着回家的路，我已经闻到了。',owl:'蔬菜派的层次像一本书，每一页都很好吃。'};
 const ordinary={rabbit:'谢谢你留一份给我。一起吃，什么都会暖一点。',squirrel:'我吃得慢一点，这样做客的时间就会长一点。',bear:'有人为我做饭，心里已经甜甜的了。',hippo:'今天的故事，可以从这张餐桌开始讲。',fox:'原来熟悉的食材，也能长出新的味道。',owl:'我会把这顿饭记进今晚的故事里。'};
 const newGame=C.newGame;C.newGame=function(){const s=newGame();s.cooking={made:{}};s.hospitality={active:null,lastMealDay:{},hosted:[],warmed:false};return s;};
 const migrate=C.migrate;C.migrate=function(input){
  const s=migrate(input);s.cooking={made:{}};s.hospitality={active:null,lastMealDay:{},hosted:[],warmed:false};
  const integer=(n,min=0,max=1e9)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
  if(input.cooking!==undefined){const c=input.cooking;if(!c||!c.made||typeof c.made!=='object'||Array.isArray(c.made))throw new Error('料理记录格式无效');for(const id of Object.keys(D.dishes))if(c.made[id]!==undefined){if(!integer(c.made[id]))throw new Error('料理制作数量无效');s.cooking.made[id]=c.made[id];}}
  if(input.hospitality!==undefined){
   const h=input.hospitality,known=id=>typeof id==='string'&&D.neighbors.some(n=>n.id===id);
   if(!h||!Array.isArray(h.hosted)||h.hosted.some(id=>!known(id)||!s.story.met.includes(id))||new Set(h.hosted).size!==h.hosted.length||!h.lastMealDay||typeof h.lastMealDay!=='object'||Array.isArray(h.lastMealDay)||typeof h.warmed!=='boolean')throw new Error('来访记录格式无效');
   s.hospitality.hosted=[...h.hosted];s.hospitality.warmed=h.warmed;
   for(const[id,day]of Object.entries(h.lastMealDay)){if(!known(id)||!integer(day,0,C.day(s))||!h.hosted.includes(id))throw new Error('招待日期无效');s.hospitality.lastMealDay[id]=day;}
   if(h.hosted.some(id=>!Object.hasOwn(h.lastMealDay,id)))throw new Error('招待记录缺少日期');
   if(h.active!==null){const v=h.active;if(!v||!known(v.neighbor)||!s.story.met.includes(v.neighbor)||s.player.map!=='home'||typeof v.served!=='boolean'||(v.served?typeof v.dish!=='string'||!Object.hasOwn(D.dishes,v.dish)||!h.hosted.includes(v.neighbor)||!Object.hasOwn(h.lastMealDay,v.neighbor):v.dish!==null))throw new Error('当前来访记录无效');s.hospitality.active={neighbor:v.neighbor,served:v.served,dish:v.dish};}
  }
  if(s.hospitality.warmed&&(s.hospitality.hosted.length!==6||!Object.keys(D.dishes).every(id=>s.cooking.made[id]>0)))throw new Error('暖房完成记录不一致');
  return s;
 };
 const near=id=>s=>s.player.map==='home'&&W.near(s.player,W.maps.home.objects.find(o=>o.id===id));
 C.cook=function(s,id){const d=typeof id==='string'&&Object.hasOwn(D.dishes,id)&&D.dishes[id];if(!near('stove')(s)||!d)return {ok:false,message:'走近小屋灶台，选择一道料理吧。'};if(!Object.entries(d.costs).every(([k,n])=>(s.inventory[k]||0)>=n))return {ok:false,message:'食材还没凑齐，先留一些收获吧。'};for(const[k,n]of Object.entries(d.costs))s.inventory[k]-=n;s.inventory[id]=(s.inventory[id]||0)+1;s.cooking.made[id]=(s.cooking.made[id]||0)+1;return {ok:true,message:d.name+'做好了！已放入背包，可以招待朋友。'};};
 C.invite=function(s,id){if(!near('dining')(s)||!D.neighbors.some(n=>n.id===id)||!s.story.met.includes(id))return {ok:false,message:'在小屋餐桌旁，邀请已经认识的朋友吧。'};if(s.hospitality.active)return {ok:false,message:'先陪好眼前的客人，再邀请下一位吧。'};s.hospitality.active={neighbor:id,served:false,dish:null};return {ok:true,message:s.hospitality.hosted.includes(id)?'朋友又来做客了，熟悉的餐桌总让人很安心。':welcomes[id]};};
 C.serve=function(s,id){const v=s.hospitality.active,d=typeof id==='string'&&Object.hasOwn(D.dishes,id)&&D.dishes[id];if(!v||(!near('dining')(s)&&!near('guest-seat')(s)))return {ok:false,message:'先到餐桌旁邀请一位朋友。'};if(v.served)return {ok:false,message:'这次的料理已经上桌，坐下来聊聊吧。'};if(!d||!(s.inventory[id]>0))return {ok:false,message:'背包里还没有这道料理。'};
  const bonus=s.hospitality.lastMealDay[v.neighbor]===C.day(s)?0:d.favorite===v.neighbor?2:1;
  s.inventory[id]--;v.served=true;v.dish=id;if(!s.hospitality.hosted.includes(v.neighbor))s.hospitality.hosted.push(v.neighbor);s.hospitality.lastMealDay[v.neighbor]=C.day(s);
  const gift=bonus?C.addFriend(s,v.neighbor,bonus):'';
  return {ok:true,message:(d.favorite===v.neighbor?favorites[v.neighbor]:ordinary[v.neighbor])+(bonus?' 好感 +'+bonus+'。':' 今天的料理好感已获得，这次只分享温暖。')+gift};
 };
 C.endVisit=function(s){if(!s.hospitality?.active)return {ok:false,message:'今天的小屋正安静地等着朋友。'};s.hospitality.active=null;return {ok:true,message:'朋友带着暖意回去了。下次再一起吃饭。'};};
 const rest=C.rest;C.rest=function(s){if(s.hospitality?.active)C.endVisit(s);return rest(s);};
 const sell=C.sell;C.sell=function(s,id){if(Object.hasOwn(D.dishes,id))return {ok:false,message:'料理留给餐桌上的朋友，不出售。'};return sell(s,id);};
 C.homeGoal=function(s){const recipes=Object.keys(D.dishes).filter(id=>s.cooking.made[id]>0).length,placed=s.home.furniture.length,hosted=s.hospitality.hosted.length;return {recipes,placed,hosted,done:recipes===6&&placed>=4&&hosted===6,complete:s.hospitality.warmed,progress:`料理 ${recipes}/6 · 室内布置 ${Math.min(placed,4)}/4 · 招待朋友 ${hosted}/6`};};
 C.warmHouse=function(s){const q=C.homeGoal(s);if(!near('dining')(s)||!q.done||q.complete)return {ok:false,message:q.complete?'这份暖房的回忆已经收好了。':'先完成小屋手札里的心愿，再到餐桌旁庆祝。'};C.endVisit(s);s.hospitality.warmed=true;s.inventory.hearth=(s.inventory.hearth||0)+1;return {ok:true,message:'灯光落在餐桌上，朋友们把祝福留在这里。收到暖房纪念壁炉，愿每次回家都暖暖的。'};};
 function guest(s){const v=s.hospitality?.active;if(!v)return[];const n=D.neighbors.find(n=>n.id===v.neighbor);return[{id:n.id,kind:'guest',name:n.name,x:17,y:9,w:1,h:1,facing:'left'}];}
 function dialogue(s){const v=s.hospitality?.active;if(!v)return '';return v.served?(D.dishes[v.dish].favorite===v.neighbor?favorites[v.neighbor]:ordinary[v.neighbor]):s.hospitality.hosted.includes(v.neighbor)?'又来打扰啦。熟悉的餐桌，总让人很安心。':welcomes[v.neighbor];}
 root.ForestCooking={guest,dialogue};if(typeof module!=='undefined')module.exports=root.ForestCooking;
})(globalThis);
