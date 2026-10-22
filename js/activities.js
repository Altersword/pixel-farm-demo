/* Small, distinct preparations for the gathering; no combat or paid services. */
(function(root) {
  'use strict';
  const C=root.ForestCore,D=root.ForestData;
  D.activities={
    rabbit:{title:'棉棉的春日沙拉',desc:'带一份番茄、胡萝卜和玉米，给聚会准备一盘有颜色的沙拉。',costs:{tomato:1,carrot:1,corn:1}},
    squirrel:{title:'栗栗的松果寻宝',desc:'找回森林中的四颗金松果：西边的草甸、北方的树梢下、东南的溪流旁、南边的林间空地。'},
    bear:{title:'蜜朵的果香小锅',desc:'用两份草莓和一份玉米做甜甜的果香浓汤。看准火候，搅拌三次。',costs:{strawberry:2,corn:1}},
    hippo:{title:'河河的池塘来信',desc:'去森林池塘旁的小木牌练习垂钓。浮标进入绿色区域时收线，带回三封来自池塘的问候。'},
    fox:{title:'枫叶的落叶拼图',desc:'把八片落叶按 1–8 的顺序摆好，空格留在右下角。点击与空格相邻的叶片移动。'},
    owl:{title:'星灯的星光记忆',desc:'看一会儿星星出现的顺序，等它们藏起来后依次点亮。完成三段星光故事。'},
  };
  D.treasures=[{id:'acorn-west',x:2,y:12},{id:'acorn-north',x:10,y:3},{id:'acorn-stream',x:25,y:17},{id:'acorn-south',x:20,y:16}];
  const fresh=s=>{s.story.activities=Object.fromEntries(D.neighbors.map(n=>[n.id,false]));s.story.treasures=[];s.story.catches=0;return s;};
  const newGame=C.newGame;C.newGame=()=>fresh(newGame());
  const migrate=C.migrate;C.migrate=function(input){
    const s=fresh(migrate(input)),q=input.story;
    if(q&&q.activities!==undefined){
      if(!q.activities||typeof q.activities!=='object'||Array.isArray(q.activities))throw new Error('聚会心意格式无效');
      for(const n of D.neighbors)if(q.activities[n.id]!==undefined){if(typeof q.activities[n.id]!=='boolean')throw new Error('聚会心意记录无效');s.story.activities[n.id]=q.activities[n.id];}
    }
    if(q&&q.treasures!==undefined){if(!Array.isArray(q.treasures)||q.treasures.length>4||q.treasures.some(id=>!D.treasures.some(t=>t.id===id)))throw new Error('寻宝记录无效');s.story.treasures=[...new Set(q.treasures)];}
    if(q&&q.catches!==undefined){if(!Number.isInteger(q.catches)||q.catches<0||q.catches>3)throw new Error('垂钓记录无效');s.story.catches=q.catches;}
    return s;
  };
  function complete(s,id){
    if(s.story.activities[id])return {ok:false,message:'这份聚会心意已经准备好了。'};
    s.story.activities[id]=true;s.coins+=20;
    const f=s.friends[id];f.points=Math.min(100,f.points+2);
    if(f.points>=3&&!f.rewarded){f.rewarded=true;s.inventory[id+'_keepsake']=(s.inventory[id+'_keepsake']||0)+1;}
    return {ok:true,message:`${D.neighbors.find(n=>n.id===id).name}的聚会心意准备好了，好感 +2，收到 20 叶币。`};
  }
  C.supplyActivity=function(s,id){
    const a=D.activities[id];
    if(!a||!a.costs||s.story.activities[id])return {ok:false,message:'这份心意已经备好，去看看其他朋友吧。'};
    if(!Object.entries(a.costs).every(([k,n])=>(s.inventory[k]||0)>=n))return {ok:false,message:'食材还没凑齐，先留住一些收获吧。'};
    for(const [k,n]of Object.entries(a.costs))s.inventory[k]-=n;
    return complete(s,id);
  };
  C.discover=function(s,id){
    if(!D.treasures.some(t=>t.id===id))return {ok:false,message:'这里没有金松果。'};
    if(s.story.treasures.includes(id))return {ok:false,message:'这颗松果已经收好了。'};
    s.story.treasures.push(id);
    return s.story.treasures.length===4?complete(s,'squirrel'):{ok:true,message:`找到一颗金松果！已经收好 ${s.story.treasures.length}/4 颗。`};
  };
  C.catchFish=function(s,success){
    if(!success)return {ok:false,message:'小鱼轻轻游开了。看准绿色区域，再试一次吧。'};
    if(s.story.catches>=3)return {ok:false,message:'池塘的三份问候已经收到了。'};
    s.story.catches++;
    return s.story.catches===3?complete(s,'hippo'):{ok:true,message:`收到了第 ${s.story.catches}/3 份池塘问候，放小鱼回到水里。`};
  };
  C.solveActivity=function(s,id,solved){
    if(!['fox','owl'].includes(id)||!solved)return {ok:false,message:'再观察一下，小小谜题里藏着耐心。'};
    return complete(s,id);
  };
  const quest=C.quest;C.quest=function(s){const q=quest(s);if(s.story.stage!==4)return q;const count=Object.values(s.story.activities).filter(Boolean).length;return {...q,desc:q.desc+' 再为六位邻居各准备一份专属聚会心意。',progress:q.progress+` · 心意 ${count}/6`,done:q.done&&count===6};};
  root.ForestActivities={fresh};
})(globalThis);
