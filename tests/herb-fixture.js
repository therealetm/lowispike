/* Isolated visual fixture; actual app award/bridge functions follow below. */
var RealDate=Date,fixtureNow=RealDate.now();var fixtureClock=new RealDate(fixtureNow);fixtureClock.setHours(12,0,0,0);fixtureNow=fixtureClock.getTime();
window.Date=class extends RealDate{constructor(...a){super(...(a.length?a:[fixtureNow]));}static now(){return fixtureNow;}};
var S={xp:95,ledger:[],logs:[],user:{name:'Herb fixture',bday:'1994-03-09',mbti:'INFP'},herb:{stageIndex:0},td:{day:new Date().toISOString().slice(0,10),plan:['rb_eggs'],ate:{}}},TAB='home',ICO={x:'',chk:''},CUR={title:'Eggs',r:'ja',emoji:'🥚'};
var today=()=>new Date().toISOString().slice(0,10),save=()=>{},levelOf=x=>({L:LowiHerbCore.stage(x).index+1}),toast=m=>{document.getElementById('qaStatus').textContent=m+' · total '+S.xp+' XP';},$$=()=>[],$=()=>({classList:{remove(){}}}),renderProfile=()=>{},renderHome=()=>{},renderAll=()=>{},questDone=()=>{},closeSheet=()=>{},resizeImage=()=>{},goTab=()=>{},curQuests=()=>[],recById=id=>({id,n:'Eggs',r:'ja',e:'🥚'}),avatar=()=>'',sheet=()=>{};
window.LowiR2={S:()=>S,X:()=>({state:()=>({uid:'herb-qa'})}),toast:toast};
localStorage.removeItem('lowi.herb.tamagotchi.v2:herb-qa');
function award(amt, label, el, src, eventId){
  if (!Number.isFinite(+amt) || +amt <= 0 || eventId && S.ledger.some(e => e.eventId === eventId)) return 0;
  const beforeXP = S.xp, before = levelOf(S.xp).L; S.xp += +amt;
  const entry = {ts:Date.now(), day:today(), amt:+amt, label, src:src || ""}; if (eventId) entry.eventId = eventId; S.ledger.push(entry);
  if (window.LowiHerbCore) LowiHerbCore.sync(S); save();
  try { window.dispatchEvent(new CustomEvent("lowi:reward", {detail:{entry,beforeXP,afterXP:S.xp}})); } catch(e){}
  const after = levelOf(S.xp).L;
  toast("+" + amt + " XP · " + label);
  $$(".lvchip").forEach(c => { c.classList.remove("pulse"); void c.offsetWidth; c.classList.add("pulse"); });
  if (after > before) setTimeout(() => toast(window.LowiFastStop ? LowiFastStop.lvl(after, (typeof T === "function" ? T(titleOf(after)) : titleOf(after))) : "Level " + after + " · you're a " + titleOf(after) + " now", 3000) /* fst-lvl */, 1600);
  return amt;
}

window.LowiHost = {
  award(src, el, ov){ ov = ov || {}; const t = today();
    if (ov.eventId && S.ledger.some(e => e.eventId === ov.eventId)) return 0;
    if (ov.perDay && S.ledger.filter(e => e.day === t && e.src === src).length >= ov.perDay) return 0;
    if (!ov.perDay && S.ledger.some(e => e.src === src)) return 0;
    const gained = award(ov.amt || 10, ov.label || "XP", el, src, ov.eventId); if (TAB === "profile") renderProfile(); return gained; },
  completeQuest(id){ if (id === "walk" && !S.quests.done.walk && curQuests().some(q => q.id === "walk")) { questDone("walk"); return 1; } return 0; },
  lastMeal(){ const l = S.logs[S.logs.length - 1]; return l ? {ts:l.ts, name:l.t, n:l.t, r:l.r, e:l.e} : null; },
  openSheet:html => sheet(html), closeSheet, toast,
  icon:{x:ICO.x, tick:ICO.chk, heart:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.6-9.5-9.2C1.2 8.6 3.2 5 6.6 5c2 0 3.5 1.1 4.4 2.5h2C13.9 6.1 15.4 5 17.4 5c3.4 0 5.4 3.6 4.1 6.8C19.5 16.4 12 21 12 21z"/></svg>'},
  refresh(){ if (TAB === "home") renderHome(); },
  user:() => S.user, level:() => levelOf(S.xp).L, tab:() => TAB, go:t => goTab(t === "swap" ? "scan" : t === "room" ? "foryou" : t === "moveScreen" ? "move" : t),
  onboarded:() => !!S.onboarded,
  avatar(size, name, img){ return avatar(size, img || name === S.user.name ? S.user : {name, bday:"", avatar:""}); },
  resizeImage
};

/* Companion bridge: native state, single XP ledger, stable IDs for completed actions. */
window.LowiVitalsBridge = {
  state:() => S, profile:() => S.user, save:() => save(),
  initialize(){ if (window.LowiHerbCore) { LowiHerbCore.sync(S); save(); } },
  openMeal(){ LowiHost.go("home"); const b=document.querySelector('[data-g2h-open="plan"]'); if(b)b.click(); },
  complete(kind,id,options){
    options=options||{}; const eventId="herb-care:"+today()+":"+id;
    const src=options.src||"herb-care:"+kind;
    const gained=options.amt?LowiHost.award(src,null,{...options,eventId}):0;
    if(!gained)try{window.dispatchEvent(new CustomEvent("lowi:care",{detail:{kind,id:eventId}}));}catch(e){}
    return gained;
  },
  planMeal(index,on){
    const td=S.td;if(!td||!td.plan||!td.plan[index])return false;td.ate=td.ate||{};td.ate[index]=!!on;
    if(on){const id="plan-meal:"+td.day+":"+index+":"+td.plan[index];
      if(!S.logs.some(l=>l.eventId===id)){const r=recById(td.plan[index]);if(!r){save();return false;}
        const n=S.logs.filter(l=>l.day===today()).length;
        S.logs.push({id,eventId:id,ts:Date.now(),day:td.day,t:r.n,r:r.r,e:r.e||"🍽️"});save();
        if(n<5)award(15,"Meal logged",null,"meal:plan",id);
        else try{window.dispatchEvent(new CustomEvent("lowi:care",{detail:{kind:"water",id}}));}catch(e){}
        questDone("eat",true);
      }
    }save();return true;
  }
};

var lastCare='water',fixtureActions={water:()=>LowiVitalsBridge.planMeal(0,true),sunlight:()=>LowiVitalsBridge.complete('sunlight','swap:qa-pasta',{src:'swaflo-save:qa-pasta',amt:10,label:'Swap chosen'}),dance:()=>LowiHost.award('move:session',null,{amt:10,perDay:3,eventId:'qa-move',label:'Move session'}),vitamin:()=>LowiVitalsBridge.complete('vitamin','scan:4000000000000',{amt:5,perDay:5,label:'Product scanned'}),bloom:()=>LowiVitalsBridge.complete('bloom','recipe:qa-eggs',{amt:20,perDay:3,label:'Recipe finished'})};
function qaRefresh(){if(window.LowiHerbTamagotchi)LowiHerbTamagotchi.refresh(true);document.getElementById('qaStatus').textContent='Total '+S.xp+' XP · '+S.ledger.length+' native rewards · '+S.logs.length+' meal logs';}
function resetStage(xp){S.xp=xp;S.herb={stageIndex:0};const p=LowiHerbTamagotchi.readPrefs();p.highestStage=0;p.lastSeenStage=LowiHerbCore.stage(xp).index;p.care=[];p.lastActionAt=fixtureNow;p.createdAt=fixtureNow;qaRefresh();}
document.addEventListener('click',e=>{const b=e.target.closest('[data-qa]');if(!b)return;const a=b.dataset.qa;
 if(a==='room')LowiHerbTamagotchi.open();
 else if(a==='evolve'){resetStage(95);LowiHost.award('qa-evolve',null,{amt:5,perDay:99,eventId:'qa-evolve:'+Math.random(),label:'Product scanned'});}
 else if(a==='jump'){resetStage(95);LowiHost.award('qa-jump',null,{amt:2905,perDay:99,eventId:'qa-jump:'+Math.random(),label:'Daily quest'});}
 else if(a==='wilt'){const p=LowiHerbTamagotchi.readPrefs();p.createdAt=fixtureNow-49*3600000;p.lastActionAt=p.createdAt;p.care=[];S.ledger=[];S.logs=[];S.td.ate={};qaRefresh();}
 else if(a==='repeat'){fixtureActions[lastCare]();qaRefresh();}
 else if(a==='reduced'){document.documentElement.classList.toggle('qa-reduced');let style=document.getElementById('qaReduced');if(!style){style=document.createElement('style');style.id='qaReduced';style.textContent='html.qa-reduced .lh-sprite *{animation:none!important}';document.head.append(style);}}
 else if(fixtureActions[a]){lastCare=a;fixtureActions[a]();qaRefresh();}
});
document.getElementById('qaTime').onchange=e=>{var d=new RealDate(fixtureNow);d.setHours(+e.target.value,0,0,0);fixtureNow=d.getTime();qaRefresh();};
document.getElementById('qaStage').onchange=e=>resetStage(+e.target.value);
document.getElementById('qaSign').onchange=e=>{LowiHerbTamagotchi.readPrefs().starSign=e.target.value;qaRefresh();};
