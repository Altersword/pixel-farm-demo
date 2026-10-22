/* Six small stories, with deterministic conditions and one-time rewards. */
(function(root){
 'use strict';
 const C=root.ForestCore,D=root.ForestData,E=root.ForestEnvironment,W=root.ForestWorld;
 const events=[
  {id:'windchime',name:'把风铃修好',weather:'sun',map:'farm',x:16,y:5,sprite:'chime',hint:'农场工作台东侧的小风铃架',intro:'枫叶留了一张纸条：绳结松了，风路过时少了一声问候。',steps:['重新系紧绳结','轻轻拨响风铃'],reply:'叮——棉棉从远处挥了挥手。「这声音真像一句早安。」',after:'风铃安稳地挂着，路过的风都有了声音。'},
  {id:'picnic',name:'留一处野餐角',weather:'sun',map:'forest',x:5,y:10,sprite:'picnic',hint:'森林西侧小路旁的野餐垫',intro:'蜜朵说，野餐不一定要等节日。树荫里刚好缺一张铺好的餐巾。',steps:['把餐巾铺平','摆好大家的小杯子'],reply:'「连还没来的人，都有一个位置。」河河把最后一只杯子放好了。',after:'杯子排成了小小一圈，树荫替朋友们留着座位。'},
  {id:'paperboat',name:'纸船向雨里出发',weather:'rain',map:'farm',x:20,y:15,sprite:'boat',hint:'农场东南池塘的西岸',intro:'栗栗把一张旧包装纸折了一半。「雨水连起了小河，能帮我送它出发吗？」',steps:['折好纸船的两边','轻轻放进水面'],reply:'纸船转了一个小圈。「它一定会把今天的好心情带到下游。」',after:'池边还有纸船留下的小小涟漪，故事已经向下游出发。'},
  {id:'mushrooms',name:'雨中蘑菇观察记',weather:'rain',map:'forest',x:11,y:12,sprite:'mushroom',hint:'森林中央小路南侧的蘑菇丛',intro:'星灯蹲在蘑菇旁：「我们只观察，不采走。它们也有自己的小伞。」',steps:['看看菌盖上的斑点','画进观察手札'],reply:'你画了三把小伞。星灯添上一行字：「雨天，森林也在长大。」',after:'观察小牌立在一旁，三把小伞仍在听雨。'},
  {id:'signpost',name:'让路标找到方向',weather:'mist',map:'forest',x:15,y:15,sprite:'sign',hint:'森林南边，回家小路的东侧',intro:'雾把远处藏了起来。枫叶发现路标转歪了：「回家的箭头应该朝南。」',steps:['把箭头转向南方','扎紧路标上的布条'],reply:'向南的箭头稳稳指着家。枫叶笑了：「路熟悉了，雾也没那么陌生。」',after:'布条轻轻垂下，南方是一直亮着灯的家。'},
  {id:'birdsong',name:'收下一段林间鸟鸣',weather:'mist',map:'forest',x:9,y:5,sprite:'bird',hint:'森林西北草甸，石堆北边的观察桩',intro:'棉棉悄悄停下脚步：「看不清的时候，可以先听一听。别惊动枝头的朋友。」',steps:['安静听完一段鸟鸣','画下歌声的起伏'],reply:'你画了三道弯弯的线。「像一条会唱歌的小路。」棉棉把声音留在了记忆里。',after:'小鸟停在观察桩上，新的歌声已经开始。'},
 ];
 D.items.explorer_chime={name:'风的问候铃',kind:'decor',sprite:'chime'};
 D.items.explorer_birdhouse={name:'林间鸟屋',kind:'decor',sprite:'birdhouse'};
 for(const event of events)W.maps[event.map].objects.push({...event,kind:'exploration',w:1,h:1});
 const fresh=()=>({discovered:[],completed:[],rewards:[]});
 const newGame=C.newGame;C.newGame=function(){const s=newGame();s.exploration=fresh();return s;};
 const migrate=C.migrate;C.migrate=function(input){
  const s=migrate(input);s.exploration=fresh();
  if(input.exploration!==undefined){
   const p=input.exploration,validIds=events.map(e=>e.id);
   if(!p||typeof p!=='object'||Array.isArray(p))throw new Error('探索记录格式无效');
   for(const field of ['discovered','completed','rewards']){
    const allowed=field==='rewards'?['explorer_chime','explorer_birdhouse']:validIds;
    if(!Array.isArray(p[field])||p[field].some(id=>typeof id!=='string'||!allowed.includes(id))||new Set(p[field]).size!==p[field].length)throw new Error('探索记录无效');
    s.exploration[field]=[...p[field]];
   }
   const q=s.exploration;
   if(q.completed.some(id=>!q.discovered.includes(id))||q.rewards.includes('explorer_chime')!==(q.completed.length>=3)||q.rewards.includes('explorer_birdhouse')!==(q.completed.length===6))throw new Error('探索奖励记录不一致');
  }
  return s;
 };
 function get(id){return events.find(e=>e.id===id);}
 function discover(s,id){const e=get(id);if(!e)return {ok:false,message:'这里还没有故事。'};if(!s.exploration.discovered.includes(id))s.exploration.discovered.push(id);return {ok:true,message:e.intro};}
 function complete(s,id){
  const e=get(id),p=s.exploration;
  if(!e||!p.discovered.includes(id))return {ok:false,message:'先走近这个角落，看看发生了什么。'};
  if(p.completed.includes(id))return {ok:false,message:e.after};
  if(E.weather(s)!==e.weather)return {ok:false,message:'等到'+E.names[e.weather]+'，再来看看。小屋休息可以迎接下一天。'};
  p.completed.push(id);s.coins+=5;let extra='';
  for(const [count,item]of [[3,'explorer_chime'],[6,'explorer_birdhouse']])if(p.completed.length>=count&&!p.rewards.includes(item)){
   p.rewards.push(item);s.inventory[item]=(s.inventory[item]||0)+1;extra+=' 收到'+D.items[item].name+'，已放入背包。';
  }
  return {ok:true,message:e.reply+' 收到 5 叶币。'+extra};
 }
 root.ForestExploration={events,get,discover,complete};
 if(typeof module!=='undefined')module.exports=root.ForestExploration;
})(globalThis);
