/* Neighbor relationships and the finite story; free play continues afterward. */
(function(root) {
  'use strict';
  const C = root.ForestCore, D = root.ForestData;
  const letters = {
    rabbit: ['我的小花盆送给你。愿你每天醒来，都能看见一点新绿。', '以前我一个人吃早餐，现在总想着多备一副碗筷。'],
    squirrel: ['今天留了一阵风给你，装在这个小风车里。', '松果还没长成森林，可我们已经成了邻居。'],
    bear: ['这只花箱曾放在我窗边。以后它也会喜欢你的阳光。', '新熬的果酱留了一瓶，等森林聚会的时候一起尝吧。'],
    hippo: ['给你一张长椅。忙碌的时候，别忘记坐下来看看云。', '我想把聚会的座位摆成一圈，这样没有人会坐在角落。'],
    fox: ['这段小栅栏用来围花，别用来围住自己的好奇心。', '今天的落叶像一封没写字的信。我们已经不需要太多客套了。'],
    owl: ['送你一盏路灯。愿你的归途，总有一小片光。', '你看，村庄的灯比星星还暖。那是因为里面有朋友。'],
  };
  const rewardSprites = ['flowerbox', 'windmill', 'flowerbox', 'bench', 'fence', 'lamp'];
  for (const [i,n] of D.neighbors.entries()) D.items[n.id+'_keepsake'] = { name: n.name+'的纪念礼', kind:'decor', sprite:rewardSprites[i] };
  D.items.festival_bunting = { name:'森林聚会花架',kind:'decor',sprite:'bunting' };
  const fresh = () => ({ stage:0, met:[], harvests:0, gathered:0, festival:false });
  const friend = () => ({ points:0,lastTalkDay:-1,lastGiftDay:-1,rewarded:false });
  const newGame = C.newGame;
  C.newGame = function() { const s=newGame();s.story=fresh();s.friends=Object.fromEntries(D.neighbors.map(n=>[n.id,friend()]));return s; };
  const migrate = C.migrate;
  C.migrate = function(input) {
    const s=migrate(input);s.story=fresh();s.friends=Object.fromEntries(D.neighbors.map(n=>[n.id,friend()]));
    const integer=(n,min=0,max=1e9)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
    if (input.story !== undefined) {
      const q=input.story;
      if (!q || !integer(q.stage,0,6) || !integer(q.harvests) || !integer(q.gathered) || !Array.isArray(q.met) || q.met.some(id=>typeof id!=='string'||!D.neighbors.some(n=>n.id===id)) || typeof q.festival!=='boolean' || (q.festival !== (q.stage===6))) throw new Error('手札进度格式无效');
      s.story={stage:q.stage,met:[...new Set(q.met)],harvests:q.harvests,gathered:q.gathered,festival:q.festival};
    }
    if(input.friends!==undefined) {
      if(!input.friends||typeof input.friends!=='object'||Array.isArray(input.friends))throw new Error('邻居关系格式无效');
      for(const n of D.neighbors) if(input.friends[n.id]!==undefined) {
        const f=input.friends[n.id];
        if(!f||!integer(f.points,0,100)||!integer(f.lastTalkDay,-1,C.day(s))||!integer(f.lastGiftDay,-1,C.day(s))||typeof f.rewarded!=='boolean')throw new Error('邻居关系记录无效');
        s.friends[n.id]={points:f.points,lastTalkDay:f.lastTalkDay,lastGiftDay:f.lastGiftDay,rewarded:f.rewarded};
      }
    }
    return s;
  };
  function addFriend(s,id,amount) {
    const f=s.friends[id]; f.points=Math.min(100,f.points+amount);
    if(f.points>=3&&!f.rewarded) { f.rewarded=true;s.inventory[id+'_keepsake']=(s.inventory[id+'_keepsake']||0)+1;return ' 还收到一份纪念礼，已放进背包。'; }
    return '';
  }
  C.addFriend=addFriend;
  C.talk=function(s,id) {
    const n=D.neighbors.find(n=>n.id===id); if(!n)return {ok:false,message:'风吹过，没有人回答。'};
    if(!s.story.met.includes(id))s.story.met.push(id);
    const f=s.friends[id]; if(f.lastTalkDay===C.day(s))return {ok:true,message:`${n.name}：今天能见到你，真好。`};
    f.lastTalkDay=C.day(s);const gift=addFriend(s,id,1);
    return {ok:true,message:`与${n.name}聊了会儿天，好感 +1。${gift}`};
  };
  C.gift=function(s,id) {
    const n=D.neighbors.find(n=>n.id===id), f=s.friends[id];
    if(!n||!f)return {ok:false,message:'找不到这位邻居。'};
    if(f.lastGiftDay===C.day(s))return {ok:false,message:'今天已经送过心意了，留一份给明天吧。'};
    if(!(s.inventory[n.likes]>0))return {ok:false,message:`${n.name}喜欢${D.crops[n.likes].name}，背包里还没有。`};
    s.inventory[n.likes]--;f.lastGiftDay=C.day(s);if(!s.story.met.includes(id))s.story.met.push(id);
    return {ok:true,message:`送出${D.crops[n.likes].name}，${n.name}好感 +2。${addFriend(s,id,2)}`};
  };
  const farm=C.farm;
  C.farm=function(s,index,...args){const crop=s.plots[index]&&s.plots[index].crop,tool=s.tool,result=farm(s,index,...args);if(result.ok&&crop&&tool==='harvest'&&!s.plots[index].crop)s.story.harvests++;return result;};
  const gather=C.gather;
  C.gather=function(s,...args){const result=gather(s,...args);if(result.ok)s.story.gathered+=3;return result;};
  const deliver=C.deliver;
  C.deliver=function(s){const id=C.currentOrder(s).neighbor,result=deliver(s);if(result.ok)result.message+=' 好感 +2。'+addFriend(s,id,2);return result;};
  C.dialogue=function(s,id){const n=D.neighbors.find(n=>n.id===id),p=s.friends[id].points;return p>=6?letters[id][1]:p>=3?letters[id][0]:n.greeting;};
  C.quest=function(s) {
    const met=s.story.met.length, made=Object.values(s.crafted).reduce((a,n)=>a+n,0), placed=s.decorations.filter(Boolean).length;
    const allCrafts=Object.keys(D.recipes).every(id=>s.crafted[id]>0), close=D.neighbors.filter(n=>s.friends[n.id].points>=3).length;
    return [
      {title:'第一章 · 搬来森林的那天',desc:'探索三个地方，亲手收获三株作物。',progress:`探索 ${s.world.visited.length}/3 · 收获 ${Math.min(s.story.harvests,3)}/3`,done:s.world.visited.length===3&&s.story.harvests>=3,reward:60},
      {title:'第二章 · 把风景带回家',desc:'采集至少六份材料，亲手制作一件家具。',progress:`材料 ${Math.min(s.story.gathered,6)}/6 · 制作 ${Math.min(made,1)}/1`,done:s.story.gathered>=6&&made>=1,reward:30},
      {title:'第三章 · 多一畦期待',desc:'到农场告示牌完成第一次扩建。',progress:`扩建 ${Math.min(s.expansion,1)}/1`,done:s.expansion>=1,reward:80},
      {title:'第四章 · 六扇温暖的门',desc:'走近六位邻居，和他们打个招呼。',progress:`认识邻居 ${met}/6`,done:met===6,reward:60},
      {title:'第五章 · 为相聚做准备',desc:'完成两轮订单、全部扩建与三种制作；与六位邻居成为朋友，在家园装饰位摆三件装饰。',progress:`订单 ${Math.min(s.ordersCompleted,12)}/12 · 扩建 ${s.expansion}/3 · 配方 ${Object.keys(D.recipes).filter(id=>s.crafted[id]>0).length}/3 · 朋友 ${close}/6 · 布置 ${Math.min(placed,3)}/3`,done:s.ordersCompleted>=12&&s.expansion===3&&allCrafts&&close===6&&placed>=3,reward:100},
      {title:'终章 · 森林里的一桌晚餐',desc:'去栗风小镇的聚会广场，邀请大家一起庆祝。',progress:'走近广场，按 E 开始聚会。',done:false,reward:0,festival:true},
      {title:'故事之后 · 每天都是新的一页',desc:'主线已完成。继续种植、收集、聊天，布置属于自己的家。',progress:`已送达 ${s.ordersCompleted} 单 · 已收获 ${s.story.harvests} 株`,done:false,reward:0,complete:true},
    ][s.story.stage];
  };
  C.claimQuest=function(s) {
    const q=C.quest(s);if(!q.done)return {ok:false,message:'这一页的心愿还没完成。'};
    s.coins+=q.reward;s.story.stage++;
    if(s.story.stage===5)s.inventory.festival_bunting=(s.inventory.festival_bunting||0)+1;
    return {ok:true,message:`手札翻到下一页，收到 ${q.reward} 叶币。${s.story.stage===5?'聚会花架也放进背包了。':''}`};
  };
  C.festival=function(s) {
    if(s.story.stage!==5)return {ok:false,message:s.story.festival?'聚会的回忆会一直留在这里。':'先完成手札里的筹备，一起期待那一天。'};
    s.story.stage=6;s.story.festival=true;
    return {ok:true,message:'灯火亮起，朋友们围坐在一起。欢迎你，成为这片森林的一部分。'};
  };
  root.ForestStory={letters};
})(globalThis);
