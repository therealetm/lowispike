(function(){
'use strict';
const D=document;
if(window.__LOWI_HERB_MOUNT_FIX)return;
window.__LOWI_HERB_MOUNT_FIX=true;
const langIndex=()=>({de:1,es:2})[(D.documentElement.lang||'en').slice(0,2)]||0;
const stageName=m=>{const n=m&&m.current&&m.current.name;return Array.isArray(n)?(n[langIndex()]||n[0]||'Seedling'):(n||'Seedling');};
const strings={
  level:['Herb Lv','Kraut Lv','Hierba Nv'],
  next:['to next','bis zur nächsten','para la siguiente'],
  max:['All stages unlocked','Alle Stufen frei','Todas las etapas'],
  star:['✦ Star sign','✦ Sternzeichen','✦ Signo'],
  open:['Open companion','Begleiter öffnen','Abrir compañero'],
  line:['Your herb is ready for one small win.','Dein Kraut ist bereit für einen kleinen Erfolg.','Tu hierba está lista para una pequeña victoria.']
};
const tr=k=>strings[k][langIndex()]||strings[k][0];
function navHomeButton(){return D.querySelector('#tabbar .tb[data-tab="home"],#tabbar .tb[data-tab="today"],#tabbar .tb[data-page="home"],#tabbar .tb[data-page="today"]');}
function targetFromControl(b){if(!b)return null;const id=b.getAttribute('aria-controls')||(b.getAttribute('href')||'').replace(/^#/,'');return id?D.getElementById(id):null;}
function homeHost(){
  const direct=D.querySelector('#tab-home,#home,#today,[data-page="home"],[data-page="today"],[data-view="home"],[data-view="today"]');
  if(direct)return direct;
  const b=navHomeButton(),controlled=targetFromControl(b);if(controlled)return controlled;
  const activeNav=D.querySelector('#tabbar .tb.active,#tabbar .tb[aria-current="page"]');
  const key=((activeNav&&((activeNav.dataset&&activeNav.dataset.tab)||(activeNav.dataset&&activeNav.dataset.page)))||'').toLowerCase();
  if(key==='home'||key==='today')return D.querySelector('.tab.active,.page.active,.view.active,main .active');
  return null;
}
function appState(){try{const r=window.LowiR2,s=r&&r.S&&r.S();if(s&&typeof s==='object')return s;}catch(e){}return {xp:0,ledger:[],logs:[],user:{}};}
function fallbackModel(){
  const s=appState(),xp=Math.max(0,Number(s.xp)||0),C=window.LOWI_HERB_CONFIG,T=window.LowiHerbTamagotchiCore;
  if(T&&C&&typeof T.model==='function')try{return T.model(s,{createdAt:Date.now(),highestStage:Math.max(0,Number(s.herb&&s.herb.stageIndex)||0),starSign:'',personality:''});}catch(e){}
  const stages=C&&Array.isArray(C.stages)&&C.stages.length?C.stages:[{xp:0,name:['Seedling','Keimling','Brote']},{xp:100,name:['Sprout','Spross','Brote joven']},{xp:300,name:['Young Herb','Junges Kraut','Hierba joven']},{xp:700,name:['Flourishing Herb','Blühendes Kraut','Hierba floreciente']},{xp:1500,name:['Radiant Herb','Strahlendes Kraut','Hierba radiante']},{xp:3000,name:['Legendary Bloom','Legendäre Blüte','Flor legendaria']}];
  let index=0;for(let i=0;i<stages.length;i++)if(xp>=Number(stages[i].xp||0))index=i;
  const current=stages[index],next=stages[index+1]||null,start=Number(current.xp)||0,end=next?Number(next.xp)||start+1:start+1;
  return {index,current,next,xp,left:next?Math.max(0,end-xp):0,progress:next?Math.max(0,Math.min(1,(xp-start)/(end-start))):1,dim:false,profile:{sign:null,palette:{a:'#8dcfbc',b:'#c4b1eb'}}};
}
function simplePlant(m){
  const i=Math.max(0,Math.min(5,Number(m&&m.index)||0));
  const stem=i?'<path d="M50 79Q50 54 50 31" fill="none" stroke="var(--tmg-a)" stroke-width="4" stroke-linecap="round"/>':'';
  const leaves=i?'<ellipse cx="39" cy="48" rx="14" ry="7" transform="rotate(-28 39 48)" fill="var(--tmg-a)"/><ellipse cx="61" cy="43" rx="14" ry="7" transform="rotate(28 61 43)" fill="var(--tmg-b)"/>':'';
  const extra=i>=2?'<ellipse cx="36" cy="32" rx="12" ry="6" transform="rotate(-32 36 32)" fill="var(--tmg-b)"/><ellipse cx="64" cy="27" rx="12" ry="6" transform="rotate(32 64 27)" fill="var(--tmg-a)"/>':'';
  const bloom=i>=4?'<circle cx="50" cy="18" r="8" fill="var(--tmg-b)"/><circle cx="42" cy="20" r="6" fill="var(--tmg-a)"/><circle cx="58" cy="20" r="6" fill="var(--tmg-a)"/>':'';
  const seed=i===0?'<ellipse cx="50" cy="67" rx="10" ry="7" fill="var(--tmg-a)"/>':'';
  const halo=i===5?'<circle cx="50" cy="37" r="31" fill="none" stroke="var(--tmg-b)" stroke-width="2" opacity=".55"/>':'';
  return `<svg class="tmg-plant" viewBox="0 0 100 100" role="img" aria-label="${stageName(m)}"><circle class="tmg-glow" cx="50" cy="45" r="38"/>${halo}${stem}${leaves}${extra}${bloom}${seed}<path class="tmg-pot" d="M30 72H70L65 91Q50 98 35 91Z"/><path class="tmg-rim" d="M27 69H73V76H27Z"/></svg>`;
}
function model(){const api=window.LowiHerbTamagotchi;if(api&&typeof api.current==='function')try{const x=api.current();if(x&&x.m)return x.m;}catch(e){}return fallbackModel();}
function renderCard(card,m,api){
  m=m||fallbackModel();
  const pct=Math.max(0,Math.min(100,Math.round((Number(m.progress)||0)*100)));
  const profile=m.profile||{},palette=profile.palette||{a:'#8dcfbc',b:'#c4b1eb'};
  const sign=profile.sign?`${profile.sign.symbol||'✦'} ${profile.sign.name||''}`.trim():tr('star');
  const xp=Math.floor(Number(m.xp)||0),left=Math.floor(Number(m.left)||0);
  const xpText=m.next?`${xp} XP · ${left} XP ${tr('next')}`:`${xp} XP · ${tr('max')}`;
  const sig=[m.index,xp,left,pct,m.dim?1:0,sign,stageName(m)].join('|');
  if(card.dataset.tmgSig===sig&&card.children.length)return;
  let line=tr('line');try{if(api&&typeof api.lineFor==='function')line=api.lineFor('home',m)||line;}catch(e){}
  let plant=simplePlant(m);try{if(api&&typeof api.plantHTML==='function')plant=api.plantHTML(m)||plant;}catch(e){}
  card.style.setProperty('--tmg-a',palette.a||'#8dcfbc');
  card.style.setProperty('--tmg-b',palette.b||'#c4b1eb');
  card.innerHTML=`<div class="tmg-mini">${plant}</div><div class="tmg-copy"><div class="tmg-title"><b>${stageName(m)}</b><span class="tmg-level">${tr('level')} ${(Number(m.index)||0)+1}</span></div></div><span class="tmg-badge">${sign}</span><div class="tmg-line">${line}</div><div class="tmg-xprow"><span class="tmg-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></span><span class="tmg-xptxt">${xpText}</span></div>`;
  card.dataset.tmgSig=sig;
}
function ensure(){
  const host=homeHost();if(!host)return false;
  let card=D.getElementById('tmgHomeCard');
  if(!card){card=D.createElement('button');card.type='button';card.id='tmgHomeCard';card.className='tmg-home-card rs-cols';card.setAttribute('data-noi18n','');card.addEventListener('click',()=>{const api=window.LowiHerbTamagotchi;if(api&&typeof api.open==='function')api.open();});}
  if(card.parentElement!==host){host.prepend(card);card.dataset.tmgSig='';}
  card.hidden=false;card.setAttribute('aria-label',tr('open'));
  try{renderCard(card,model(),window.LowiHerbTamagotchi);}catch(e){card.dataset.tmgSig='';try{renderCard(card,fallbackModel(),null);}catch(_) {card.textContent='🌱 Seedling · 0 XP';}}
  return true;
}
function tick(){ensure();}
function boot(){
  tick();
  D.addEventListener('click',e=>{if(e.target.closest('#tabbar .tb,[data-tab],[data-page]'))setTimeout(tick,100);},true);
  D.addEventListener('visibilitychange',()=>{if(!D.hidden)tick();});
  if(window.MutationObserver)new MutationObserver(()=>{const c=D.getElementById('tmgHomeCard');if(!c||!c.isConnected||!c.children.length)setTimeout(tick,0);}).observe(D.body,{childList:true,subtree:true});
  setInterval(tick,1500);
}
if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();