(function(root){
  'use strict';
  const D=root.ForestData,C=root.ForestCore;
  const stars=['北星','晨星','河星','叶星','风星','月星'];
  const patterns=[[0,3,1],[4,1,5,2],[2,0,4,3,1]];
  function create(app,hooks){
    let game={id:'',phase:'ready',round:0,board:[]};
    const btn=(label,action,id='',disabled=false)=>`<button class="btn" data-action="${action}" data-id="${id}" ${disabled?'disabled':''}>${label}</button>`;
    function start(id){
      game={id,phase:'ready',round:0,board:[1,2,3,4,5,6,7,8,0],moves:0};
      // Scramble by legal moves so the leaf puzzle is always solvable.
      if(id==='fox'){
        let last=-1;
        for(let i=0;i<28;i++){
          const blank=game.board.indexOf(0),neighbors=[blank-3,blank+3,blank%3?blank-1:-1,blank%3<2?blank+1:-1].filter(n=>n>=0&&n<9&&n!==last);
          const next=neighbors[(i*7+3)%neighbors.length];[game.board[blank],game.board[next]]=[game.board[next],game.board[blank]];last=blank;
        }
      }
    }
    function readyCosts(s,id){return Object.entries(D.activities[id].costs||{}).every(([k,n])=>(s.inventory[k]||0)>=n);}
    function render(id){
      const s=app.state,a=D.activities[id],done=s.story.activities[id];
      let html=`<p class="panel-copy">${a.desc}</p>`;
      if(done)return html+`<div class="celebration"><h3>这一份心意已经备好。</h3><p>带上它，也带上你的好心情，期待下一次相聚。</p></div>${btn('回到聊天','activity-back',id)}`;
      if(a.costs)html+=`<p class="pill">${Object.entries(a.costs).map(([k,n])=>`${D.crops[k].name} ${s.inventory[k]||0}/${n}`).join(' · ')}</p>`;
      if(id==='rabbit')html+=`<p class="dialogue-copy">「颜色越多，春天就越近。」</p>${btn('把新鲜蔬菜装进沙拉篮','activity-supply',id,!readyCosts(s,id))}`;
      if(id==='squirrel')html+=`<p class="pill">金松果 ${s.story.treasures.length}/4</p><div class="treasure-hints">${['西边草甸：听松针落在草上的声音。','北方树梢下：抬头看树，低头找光。','东南溪流旁：沿着水声往南走。','南边林间空地：回家的路边也藏着惊喜。'].map((text,i)=>`<p>${s.story.treasures.includes(D.treasures[i].id)?'●':'○'} ${text}</p>`).join('')}</div><p class="panel-copy">走近金松果，按 E 或点击拾起。找到四颗后会自动记入这份心意。</p>`;
      if(id==='fox')html+=`<p class="panel-copy">已移动 ${game.moves} 次。每片落叶都能找到它的位置。</p><div class="leaf-puzzle" role="group" aria-label="落叶滑块拼图">${game.board.map((n,i)=>`<button data-action="activity-leaf" data-id="${i}" data-leaf="${n}" class="leaf leaf-${n}" ${n?'':'disabled'} aria-label="${n?'移动落叶 '+n:'空格'}">${n||''}</button>`).join('')}</div>`;
      if(id==='owl'){
        html+=`<p class="pill">星光故事 ${game.round+1}/3</p>`;
        if(game.phase==='ready')html+=`<p class="dialogue-copy">「先看见，再记住。星星会等你的。」</p>${btn('看看这段星光','activity-memory-start')}`;
        if(game.phase==='show')html+=`<p class="panel-copy">记住这个顺序，稍后星星会藏起来。</p><div class="memory-sequence">${patterns[game.round].map(n=>`<span data-star="${n}">${stars[n]}</span>`).join(' → ')}</div><p class="panel-copy">不必着急，失败可以重新看。</p>`;
        if(game.phase==='input')html+=`<p class="panel-copy">按记忆依次点亮 · ${game.cursor}/${patterns[game.round].length}</p><div class="star-grid">${stars.map((n,i)=>btn(n,'activity-star',i)).join('')}</div>`;
      }
      if(id==='hippo'||id==='bear'){
        const fishing=id==='hippo';
        html+=`<p class="pill">${fishing?'池塘问候 '+s.story.catches+'/3':'搅拌 '+game.round+'/3'}</p>`;
        if(game.phase==='ready')html+=`<p class="dialogue-copy">${fishing?'「轻轻放下鱼线，听听水说什么。」':'「慢慢搅拌，香味就会醒来。」'}</p>${fishing&&s.player.map!=='forest'?'<p class="notice">去风铃森林池塘西侧的小木牌旁，才能开始垂钓。</p>':''}${btn(fishing?'抛下鱼线':'开始做果香浓汤',fishing?'activity-cast':'activity-cook','',fishing?s.player.map!=='forest':!readyCosts(s,id))}`;
        if(game.phase==='waiting')html+='<p class="panel-copy">水面起了一圈涟漪，等浮标动起来……</p><div class="pond-wait">﹏ ﹏ ﹏</div>';
        if(game.phase==='meter')html+=`<p class="panel-copy">指针进入绿色区域时，${fishing?'轻轻收线':'搅拌一次'}。也可用 Tab 选中按钮，按 Enter。</p><div class="timing-meter" role="meter" aria-label="${fishing?'浮标位置':'火候'}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span class="timing-zone" style="left:${fishing?68:35}%;width:${fishing?20:30}%"></span><span id="timing-needle"></span></div>${btn(fishing?'收线':'搅拌','activity-timing')}`;
      }
      return html+`<p class="panel-copy">准备好这份心意：好感 +2，20 叶币。奖励仅发放一次。</p>${btn('回到聊天','activity-back',id)}`;
    }
    const ratio=()=>((Math.sin((Date.now()-game.started)/900-Math.PI/2)+1)/2);
    function action(action,id){
      const s=app.state;
      if(action==='activity-supply')app.perform(()=>C.supplyActivity(s,id));
      if(action==='activity-leaf'){
        const at=Number(id),blank=game.board.indexOf(0);
        if(Number.isInteger(at)&&at>=0&&at<9&&Math.abs(at%3-blank%3)+Math.abs(Math.floor(at/3)-Math.floor(blank/3))===1){
          [game.board[at],game.board[blank]]=[game.board[blank],game.board[at]];game.moves++;
          if(game.board.every((n,i)=>n===(i+1)%9))app.perform(()=>C.solveActivity(s,'fox',true));
        }
      }
      if(action==='activity-memory-start'){game.phase='show';game.deadline=Date.now()+5000;game.cursor=0;}
      if(action==='activity-star'){
        if(game.phase!=='input')return;
        if(Number(id)!==patterns[game.round][game.cursor]){game.phase='ready';game.cursor=0;hooks.toast('星星藏到别处去了，再看一次这一段吧。');}
        else if(++game.cursor===patterns[game.round].length){
          game.round++;
          if(game.round===3)app.perform(()=>C.solveActivity(s,'owl',true));
          else{game.phase='show';game.deadline=Date.now()+5000;game.cursor=0;}
        }
      }
      if(action==='activity-cast'){game.phase='waiting';game.deadline=Date.now()+2500;}
      if(action==='activity-cook'&&readyCosts(s,'bear')){game.phase='meter';game.started=Date.now();game.round=0;}
      if(action==='activity-timing'&&game.phase==='meter'){
        const value=ratio(),fishing=game.id==='hippo',ok=fishing?value>=.68&&value<=.88:value>=.35&&value<=.65;
        if(fishing){app.perform(()=>C.catchFish(s,ok));game.phase='ready';}
        else if(ok){game.round++;if(game.round===3){app.perform(()=>C.supplyActivity(s,'bear'));game.phase='ready';}else{game.started=Date.now();hooks.toast('香味更浓了，再搅拌一下。');}}
        else{game.phase='ready';game.round=0;hooks.toast('火候偏了一点，食材还在。再试一次吧。');}
      }
      hooks.refresh();
    }
    function tick(){
      if(game.phase==='show'&&Date.now()>=game.deadline){game.phase='input';hooks.refresh();}
      if(game.phase==='waiting'&&Date.now()>=game.deadline){game.phase='meter';game.started=Date.now();hooks.refresh();}
      if(game.phase==='meter'){
        const needle=document.querySelector('#timing-needle'),meter=document.querySelector('.timing-meter');
        if(needle)needle.style.left=(ratio()*100)+'%';if(meter)meter.setAttribute('aria-valuenow',Math.round(ratio()*100));
      }
    }
    return {start,render,action,tick};
  }
  root.ForestActivitiesUI={create};
})(globalThis);
