/* Runtime routes are deliberately not part of the save. */
(function(root){
 'use strict';
 const D=root.ForestData,W=root.ForestWorld,E=root.ForestEnvironment;
 const places={
  shop:{name:'杂货铺门前',tiles:[[5,7],[6,7],[7,7],[8,7],[9,7],[10,7]]},
  bakery:{name:'果酱屋门前',tiles:[[16,7],[17,7],[18,7],[19,7],[20,7],[21,7]]},
  library:{name:'书屋旁',tiles:[[5,15],[6,15],[7,15],[8,15],[9,15],[10,15]]},
  pond:{name:'小镇池畔',tiles:[[21,4],[21,5],[21,6],[21,7],[21,8],[21,9]]},
  square:{name:'聚会广场',tiles:[[12,13],[13,13],[14,13],[15,13],[16,13],[17,13]]},
 };
 const plans={rabbit:['square','shop','pond','library'],squirrel:['shop','pond','square','shop'],bear:['bakery','square','bakery','library'],hippo:['pond','square','pond','library'],fox:['square','library','square','shop'],owl:['library','pond','square','library']};
 const lines={
  rabbit:['早上的花瓣还带着露珠，我想把今天也过得软软的。','来挑一点种子吧，窗边的小花盆还空着呢。','太阳要回家了，我也给花儿留一口水。','书页翻得轻一点，晚安也可以说得轻一点。'],
  squirrel:['货架整理好了，最上面给松果留了一个位置。','我在数水面的光，可它们总是跑得比我快。','今天捡到一片像信封的叶子，要寄给谁呢？','关铺前再看看，明天的期待都摆好了。'],
  bear:['锅里的果香刚刚醒来，今天先从甜甜的事开始。','广场的桌子晒暖了，坐下来喝口茶吧。','把最后一锅果酱收好，留一瓶给朋友。','睡前读一页故事，比多放一勺糖还让人安心。'],
  hippo:['我陪池塘慢慢醒来，水里的云还没洗脸呢。','这里每个座位都有名字，你的也留着。','听，水在告诉岸边的石头今天的故事。','我想找一本关于远方河流的书，今晚就游到梦里。'],
  fox:['我把晨光当成地图，看看今天能走到哪里。','这本书的页角像一片叶子，也许它去过森林。','黄昏把影子拉长，也把朋友拉得更近。','来看看明天要用的绳子，新的风景要绑得牢一点。'],
  owl:['清晨也有星星，只是藏进了书里。','池面是一张白天的星图，你找到最亮的那一颗了吗？','灯还没亮，我们可以先把故事讲起来。','这时候读书最好，窗外每盏灯都是一个句号。'],
 };
 const runtimes=new WeakMap();
 function destination(s,id){
  const i=D.neighbors.findIndex(n=>n.id===id);if(i<0)return null;
  let key=plans[id][E.period(s)];
  if(E.weather(s)==='rain'&&['pond','square'].includes(key))key=['shop','bakery','library'][i%3];
  const place=places[key],[x,y]=place.tiles[i];return {key,name:place.name,x,y,map:'village'};
 }
 function runtime(s){
  if(!runtimes.has(s))runtimes.set(s,Object.fromEntries(D.neighbors.map(n=>{const d=destination(s,n.id);return[n.id,{x:d.x,y:d.y,fromX:d.x,fromY:d.y,age:200,facing:'down',route:[],key:d.key}];})));
  return runtimes.get(s);
 }
 function path(s,a,d){return W.pathTo({...s,player:{map:'village',x:a.x,y:a.y,facing:a.facing}},d.x,d.y)||[];}
 function update(s,dt,paused=false){
  if(paused||dt<=0)return;
  const actors=runtime(s);
  for(const n of D.neighbors){
   const a=actors[n.id],d=destination(s,n.id);
   if(a.key!==d.key){a.key=d.key;a.route=path(s,a,d);}
   a.age+=dt;
   if(a.age<200||!a.route.length)continue;
   const [dx,dy]=a.route.shift();a.fromX=a.x;a.fromY=a.y;a.x+=dx;a.y+=dy;a.age=0;
   a.facing=dx<0?'left':dx>0?'right':dy<0?'up':'down';
  }
 }
 function objects(s,map){
  if(map!=='village')return[];
  const actors=runtime(s);
  return D.neighbors.map(n=>{const a=actors[n.id],t=s.settings.reducedMotion?1:Math.min(1,a.age/200);
   return{id:n.id,kind:'npc',name:n.name,x:a.x,y:a.y,w:1,h:1,facing:a.facing,visualX:a.fromX+(a.x-a.fromX)*t,visualY:a.fromY+(a.y-a.fromY)*t,moving:t<1};});
 }
 function whereabouts(s,id){const a=runtime(s)[id],d=destination(s,id);return {...d,x:a.x,y:a.y,travelling:a.x!==d.x||a.y!==d.y};}
 function dialogue(s,id){const weather=E.weather(s);return lines[id][E.period(s)]+(weather==='rain'?' 下雨了，先在屋檐下躲一躲，心事也可以慢慢说。':weather==='mist'?' 雾会散开，熟悉的路一直都在。':' 今天的风很轻，适合出门遇见朋友。');}
 function reset(s){runtimes.delete(s);}
 root.ForestNeighbors={places,plans,destination,objects,update,whereabouts,dialogue,reset};
 if(typeof module!=='undefined')module.exports=root.ForestNeighbors;
})(globalThis);
