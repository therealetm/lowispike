/* Personal diary windows. No glucose curve, causal claim, name-based nutrition guess or fake data. */
(function(root){
  'use strict';
  const C=(typeof module==='object'&&module.exports?require('./herb-config.js'):root.LOWI_HERB_CONFIG).body;
  const MIN=60000,HOUR=60*MIN,DAY=24*HOUR;
  const number=x=>x!==''&&x!==null&&x!==undefined&&Number.isFinite(+x)?+x:null;
  const normalize=x=>String(x||'').trim().toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');
  const day=t=>{const d=new Date(t);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
  const validStamp=(t,now)=>Number.isFinite(+t)&&+t>0&&+t<=now;
  // Health already uses account-specific device persistence and is excluded from cloud backup.
  function ensure(s){if(!s.health||typeof s.health!=='object')s.health={};if(!s.health.body||typeof s.health.body!=='object')s.health.body={};const b=s.health.body;['observations','sleep','weights'].forEach(k=>{if(!Array.isArray(b[k]))b[k]=[];});return b;}
  const mealId=l=>l.id||String(l.ts)+':'+normalize(l.t||l.name);
  function meals(s,now){return (s.logs||[]).filter(l=>!l.voided&&validStamp(l.ts,now)).slice().sort((a,b)=>+a.ts-+b.ts);}
  function lastMeal(s,at){return meals(s,at).filter(l=>at-l.ts<=C.mealAssociationHours*HOUR).pop()||null;}
  function lastSleep(b,at){return (b.sleep||[]).filter(x=>validStamp(x.wake,at)&&+x.bed>0&&+x.bed<+x.wake&&at-x.wake<=C.sleepFreshHours*HOUR).slice().sort((a,b)=>b.wake-a.wake)[0]||null;}
  function moveMinutes(m,from,to){return Math.round((m&&m.sessions||[]).filter(x=>validStamp(x.ts,to)&&x.ts>=from).reduce((n,x)=>n+Math.max(0,number(x.moved)||0),0)/60);}
  function context(s,m,at,meal){const sl=lastSleep(ensure(s),at),hours=sl?(sl.wake-sl.bed)/HOUR:null;return {sleepHours:hours,wakeAt:sl?sl.wake:null,movementMins:meal?moveMinutes(m,meal.ts,Math.min(at,+meal.ts+C.postMealMovementMinutes*MIN)):0};}
  const sleepBucket=h=>h===null||h===undefined?'unknown':Math.floor(h/2);
  const activityBucket=m=>m>=5?'moved':'not-recorded';
  function observe(s,m,input,now){
    now=now||Date.now();const b=ensure(s),ts=number(input.ts)||now,energy=number(input.energy);
    if(ts>now||now-ts>C.observationLookbackDays*DAY||energy!==null&&(!Number.isInteger(energy)||energy<1||energy>5))throw Error('Invalid observation.');
    if(energy===null&&typeof input.hungry!=='boolean'&&typeof input.sleepy!=='boolean')throw Error('Choose how you feel.');
    const meal=lastMeal(s,ts),ctx=context(s,m,ts,meal),fingerprint=Math.floor(ts/MIN);
    const entry={id:'feeling:'+fingerprint,ts,energy,hungry:typeof input.hungry==='boolean'?input.hungry:null,sleepy:typeof input.sleepy==='boolean'?input.sleepy:null,mealId:meal?mealId(meal):null,mealKey:meal?normalize(meal.t):null,mealAt:meal?+meal.ts:null,...ctx};
    const old=b.observations.findIndex(x=>x.id===entry.id);if(old>=0)b.observations[old]=entry;else b.observations.push(entry);return entry;
  }
  function sleep(s,input,now){
    now=now||Date.now();const bed=number(input.bed),wake=number(input.wake),b=ensure(s);
    if(bed===null||wake===null||bed>=wake||wake>now||wake-bed>24*HOUR||now-wake>C.observationLookbackDays*DAY)throw Error('Enter a past bedtime and wake time.');
    const entry={id:'sleep:'+day(wake),bed,wake,source:'self-reported'};
    const i=b.sleep.findIndex(x=>x.id===entry.id);if(i>=0)b.sleep[i]=entry;else b.sleep.push(entry);return entry;
  }
  function trackWeight(s,now){
    const b=ensure(s),w=number(s.health&&s.health.weight);
    if(b.lastWeight===undefined){b.lastWeight=w;return;}
    if(w!==null&&w>0&&w!==b.lastWeight)b.weights.push({ts:now||Date.now(),kg:w,source:'profile-save'});
    b.lastWeight=w;
  }
  function bmi(s,now){
    const w=number(s.health&&s.health.weight),h=number(s.health&&s.health.heightCm),date=s.user&&s.user.bday;
    if(!w||!h||w<=0||h<40||h>300||!/^\d{4}-\d{2}-\d{2}$/.test(date||''))return null;
    const born=new Date(date+'T12:00:00'),d=new Date(now||Date.now()),parts=date.split('-').map(Number);if(born.getMonth()+1!==parts[1]||born.getDate()!==parts[2])return null;let age=d.getFullYear()-born.getFullYear();if(d.getMonth()<born.getMonth()||d.getMonth()===born.getMonth()&&d.getDate()<born.getDate())age--;
    if(!Number.isFinite(+born)||age<20)return null;return Math.round(w/((h/100)**2)*10)/10;
  }
  function range(values){
    if(values.length<C.minimumIndependentSamples)return null;
    const unit=C.observationBucketMinutes,pad=C.estimatePaddingMinutes;
    return {lo:Math.max(0,Math.floor((Math.min(...values)-pad)/unit)*unit),hi:Math.ceil((Math.max(...values)+pad)/unit)*unit,n:values.length};
  }
  function mealWindow(s,m,meal,kind,now){
    if(!meal)return null;const b=ensure(s),key=normalize(meal.t),ctx=context(s,m,now,meal),byMeal=new Map(),known=new Map(meals(s,now).map(l=>[mealId(l),l]));
    // First observed signal per independent meal; repeated taps cannot manufacture sample size.
    for(const o of b.observations.slice().sort((a,b)=>a.ts-b.ts)){
      if(!validStamp(o.ts,now)||now-o.ts>C.observationLookbackDays*DAY||o.mealKey!==key||!o.mealId||o.mealId===mealId(meal)||!validStamp(o.mealAt,now))continue;
      const original=known.get(o.mealId);if(!original||normalize(original.t)!==o.mealKey||+original.ts!==o.mealAt)continue;
      if(sleepBucket(o.sleepHours)!==sleepBucket(ctx.sleepHours)||activityBucket(o.movementMins)!==activityBucket(ctx.movementMins))continue;
      const minutes=(o.ts-o.mealAt)/MIN,hit=kind==='hunger'?o.hungry===true:o.energy!==null&&+o.energy<=2;
      if(hit&&minutes>=15&&minutes<=C.mealAssociationHours*60&&!byMeal.has(o.mealId))byMeal.set(o.mealId,minutes);
    }
    const r=range([...byMeal.values()]);return r?{...r,from:+meal.ts+r.lo*MIN,to:+meal.ts+r.hi*MIN,kind,basis:'same-meal-sleep-and-movement-context',confidence:'early-personal-pattern'}:null;
  }
  function sleepyWindow(s,now){
    const b=ensure(s),sl=lastSleep(b,now);if(!sl)return null;const byWake=new Map();
    for(const o of b.observations.slice().sort((a,b)=>a.ts-b.ts)){
      if(!validStamp(o.ts,now)||now-o.ts>C.observationLookbackDays*DAY||o.sleepy!==true||!validStamp(o.wakeAt,now)||o.wakeAt===sl.wake)continue;
      if(sleepBucket(o.sleepHours)!==sleepBucket((sl.wake-sl.bed)/HOUR))continue;
      const minutes=(o.ts-o.wakeAt)/MIN;if(minutes>=60&&minutes<=20*60&&!byWake.has(day(o.wakeAt)))byWake.set(day(o.wakeAt),minutes);
    }
    const r=range([...byWake.values()]);return r?{...r,from:sl.wake+r.lo*MIN,to:sl.wake+r.hi*MIN,kind:'sleepy',basis:'reported-sleep-and-sleepiness',confidence:'early-personal-pattern'}:null;
  }
  function mealInsights(s,now){
    const known=new Map(meals(s,now).map(l=>[mealId(l),l])),groups=new Map(),seen=new Set();
    for(const o of ensure(s).observations.slice().sort((a,b)=>a.ts-b.ts)){
      const l=known.get(o.mealId);if(!l||seen.has(o.mealId)||o.energy===null||o.energy<1||o.energy>5||!validStamp(o.ts,now)||now-o.ts>C.observationLookbackDays*DAY)continue;
      if(normalize(l.t)!==o.mealKey||+l.ts!==o.mealAt)continue;
      const elapsed=(o.ts-o.mealAt)/MIN;if(elapsed<60||elapsed>180)continue;seen.add(o.mealId);
      const key=o.mealKey+':'+sleepBucket(o.sleepHours)+':'+activityBucket(o.movementMins),g=groups.get(key)||{title:l.t,values:[],moved:o.movementMins>=5,sleepHours:o.sleepHours,last:0};
      g.values.push(o.energy);g.last=Math.max(g.last,o.ts);groups.set(key,g);
    }
    return [...groups.values()].filter(g=>g.values.length>=C.minimumIndependentSamples).sort((a,b)=>b.last-a.last).slice(0,4).map(g=>({title:g.title,n:g.values.length,energy:Math.round(g.values.reduce((a,b)=>a+b,0)/g.values.length*10)/10,moved:g.moved,sleepHours:g.sleepHours}));
  }
  function timeline(s,m,now){
    const b=ensure(s),d=day(now),out=meals(s,now).filter(l=>day(l.ts)===d).map(l=>({kind:'meal',ts:+l.ts,title:l.t||l.name,id:mealId(l),record:l}));
    (s.logs||[]).filter(l=>!l.voided&&!l.ts&&l.day===d).forEach(l=>out.push({kind:'meal',ts:null,title:l.t,id:mealId(l),record:l}));
    (m&&m.sessions||[]).filter(x=>validStamp(x.ts,now)&&day(x.ts)===d).forEach(x=>out.push({kind:'move',ts:+x.ts,title:x.name||x.fmt,mins:Math.round((+x.moved||0)/60),record:x}));
    b.sleep.filter(x=>validStamp(x.wake,now)&&day(x.wake)===d).forEach(x=>out.push({kind:'sleep',ts:+x.wake,hours:Math.round((x.wake-x.bed)/HOUR*10)/10,record:x}));
    b.observations.filter(x=>validStamp(x.ts,now)&&day(x.ts)===d).forEach(x=>out.push({kind:'feeling',ts:+x.ts,record:x}));
    return out.sort((a,b)=>b.ts-a.ts);
  }
  function summary(s,m,now){
    now=now||Date.now();m=m||{};const b=ensure(s),meal=meals(s,now).pop()||null,sl=lastSleep(b,now),recent=meal&&now-meal.ts<=C.mealAssociationHours*HOUR?meal:null;
    const energy=b.observations.filter(x=>validStamp(x.ts,now)&&x.energy!==null&&x.energy>=1&&x.energy<=5&&now-x.ts<=C.reportFreshHours*HOUR).slice().sort((a,b)=>b.ts-a.ts)[0]||null;
    return {meal,energy,sleep:sl,sleepHours:sl?Math.round((sl.wake-sl.bed)/HOUR*10)/10:null,awakeMinutes:sl?Math.floor((now-sl.wake)/MIN):null,mealMinutes:meal?Math.floor((now-meal.ts)/MIN):null,
      hunger:mealWindow(s,m,recent,'hunger',now),dip:mealWindow(s,m,recent,'dip',now),sleepy:sleepyWindow(s,now),checkAt:recent?+recent.ts+C.checkAfterMealMinutes*MIN:null,
      steps:Math.max(0,number((m.steps||{})[day(now)])||0),movementMins:moveMinutes(m,new Date(new Date(now).setHours(0,0,0,0)).getTime(),now),weight:number(s.health&&s.health.weight),bmi:bmi(s,now),insights:mealInsights(s,now),events:timeline(s,m,now)};
  }
  const api={ensure,day,normalize,mealId,meals,lastMeal,observe,sleep,trackWeight,bmi,mealWindow,sleepyWindow,mealInsights,summary};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.LowiBodyCore=api;
})(typeof window!=='undefined'?window:globalThis);
