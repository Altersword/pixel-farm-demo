const assert=require('node:assert/strict');
const {read}=require('./helpers.cjs');
// Solve from the visible numbered tiles. No game state or clock mutation.
function slidingPath(initial){
  const goal='123456780',key=b=>b.join(''),distance=b=>b.reduce((sum,n,i)=>n?sum+Math.abs(i%3-(n-1)%3)+Math.abs(Math.floor(i/3)-Math.floor((n-1)/3)):sum,0);
  const queue=[{b:initial,p:[],f:distance(initial)}],best=new Map([[key(initial),0]]);
  while(queue.length){
    queue.sort((a,b)=>b.f-a.f);const current=queue.pop();if(key(current.b)===goal)return current.p;
    const zero=current.b.indexOf(0),neighbors=[zero-3,zero+3,zero%3?zero-1:-1,zero%3<2?zero+1:-1].filter(n=>n>=0&&n<9);
    for(const at of neighbors){const b=[...current.b];[b[zero],b[at]]=[b[at],b[zero]];const k=key(b),g=current.p.length+1;if(best.has(k)&&best.get(k)<=g)continue;best.set(k,g);queue.push({b,p:[...current.p,at],f:g+distance(b)});}
  }
  throw new Error('Visible leaf puzzle has no solution');
}
async function timedClick(page,lower,upper){
  await page.waitForFunction(({lower,upper})=>{const m=document.querySelector('.timing-meter');if(!m)return false;const n=Number(m.getAttribute('aria-valuenow'));return n>=lower&&n<=upper;},{lower,upper},{timeout:10000});
  await page.locator('[data-action=activity-timing]').click();
}
async function nonFood(page,{area,go,close,log}){
  let s=await read(page);
  if(!s.story.activities.squirrel){
    await area('forest');const treasures=await page.evaluate(()=>ForestData.treasures);
    for(const t of treasures)if(!(await read(page)).story.treasures.includes(t.id))await go(t.id);
    assert.equal((await read(page)).story.activities.squirrel,true);log('栗栗：四颗金松果寻宝完成');
  }
  if(!(await read(page)).story.activities.hippo){
    await area('forest');await go('fishing');await page.waitForSelector('#panel[open]');
    for(let tries=0;tries<10&&(await read(page)).story.catches<3;tries++){
      await page.locator('[data-action=activity-cast]').click();await page.waitForSelector('.timing-meter');await timedClick(page,73,79);
    }
    assert.equal((await read(page)).story.activities.hippo,true);log('河河：三次真实垂钓与放流完成');await close();
  }
  await area('village');
  if(!(await read(page)).story.activities.fox){
    await go('fox');await page.locator('[data-action=activity-open]').click();
    const board=await page.locator('[data-leaf]').evaluateAll(nodes=>nodes.map(n=>Number(n.dataset.leaf))),moves=slidingPath(board);
    for(const at of moves)await page.locator(`[data-action=activity-leaf][data-id="${at}"]`).click();
    assert.equal((await read(page)).story.activities.fox,true);log('枫叶：从可见棋盘解开落叶拼图，移动 '+moves.length+' 次');await close();
  }
  if(!(await read(page)).story.activities.owl){
    await go('owl');await page.locator('[data-action=activity-open]').click();await page.locator('[data-action=activity-memory-start]').click();
    for(let round=0;round<3;round++){
      await page.waitForSelector('.memory-sequence');const pattern=await page.locator('[data-star]').evaluateAll(nodes=>nodes.map(n=>n.dataset.star));await page.waitForSelector('.star-grid',{timeout:10000});
      for(const id of pattern)await page.locator(`[data-action=activity-star][data-id="${id}"]`).click();
    }
    assert.equal((await read(page)).story.activities.owl,true);log('星灯：正常展示与作答，三轮星光记忆完成');await close();
  }
}
async function food(page,{area,go,close,log}){
  await area('village');let s=await read(page);
  if(!s.story.activities.rabbit){
    const costs={tomato:1,carrot:1,corn:1};if(!Object.entries(costs).every(([k,n])=>(s.inventory[k]||0)>=n))return false;
    await go('rabbit');await page.locator('[data-action=activity-open]').click();await page.locator('[data-action=activity-supply]').click();assert.equal((await read(page)).story.activities.rabbit,true);log('棉棉：三色沙拉准备完成');await close();
  }
  s=await read(page);
  if(!s.story.activities.bear){
    if(!(s.inventory.strawberry>=2&&s.inventory.corn>=1))return false;
    await go('bakery');await page.locator('[data-action=activity-cook]').click();
    for(let i=0;i<3;i++)await timedClick(page,43,52);
    assert.equal((await read(page)).story.activities.bear,true);log('蜜朵：真实火候判断，三次搅拌完成果香浓汤');await close();
  }
  return true;
}
module.exports={nonFood,food,slidingPath};
