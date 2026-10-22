/* Simulation time is independent from crop wall-clock growth. */
(function(root){
 'use strict';
 const C=root.ForestCore,D=root.ForestData;
 const weatherIds=['sun','rain','mist'],names={sun:'晴天',rain:'小雨',mist:'薄雾'},periods=['清晨','午后','黄昏','夜晚'];
 const weather=(s,offset=0)=>weatherIds[(C.day(s)+offset)%3];
 const period=s=>Math.floor((s.world.elapsed%D.dayLength)/(D.dayLength/4));
 function irrigate(s){
  if(weather(s)!=='rain')return false;
  let changed=false;
  for(const p of s.plots)if(p.crop&&!p.watered&&p.progress<100){p.watered=true;changed=true;}
  return changed;
 }
 function advance(s,dt,paused=false){
  if(paused||!Number.isFinite(dt)||dt<=0)return false;
  s.world.elapsed+=Math.min(dt,100);return irrigate(s);
 }
 const farm=C.farm;C.farm=function(s,...args){const result=farm(s,...args);if(result.ok)irrigate(s);return result;};
 const rest=C.rest;C.rest=function(s){const result=rest(s);if(result.ok)irrigate(s);return result;};
 root.ForestEnvironment={weather,period,names,periods,irrigate,advance};
 if(typeof module!=='undefined')module.exports=root.ForestEnvironment;
})(globalThis);
