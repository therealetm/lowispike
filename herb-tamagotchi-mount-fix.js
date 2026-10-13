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
  open:['Open companion','Begleiter öffnen','Abrir compañero']
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
function renderCard(card,m,api){
  const pct=Math.max(0,Math.min(100,Math.round((m.progress||0)*100)));
  const sign=m.profile&&m.profile.sign?`${m.profile.sign.symbol||'✦'} ${m.profile.sign.name||''}`.trim():tr('star');
  const xp=Math.floor(Number(m.xp)||0),left=Math.floor(Number(m.left)||0);
  const xpText=m.next?`${xp} XP · ${left} XP ${tr('next')}`:`${xp} XP · ${tr('max')}`;
  let line='';try{line=api.lineFor('home',m)||'';}catch(e){}
  card.style.setProperty('--tmg-a',m.profile&&m.profile.palette?m.profile.palette.a:'#69a96b');
  card.style.setProperty('--tmg-b',m.profile&&m.profile.palette?m.profile.palette.b:'#d9b86c');
  card.innerHTML=`<div class="tmg-mini">${api.plantHTML(m)}</div><div class="tmg-copy"><div class="tmg-title"><b>${stageName(m)}</b><span class="tmg-level">${tr('level')} ${(m.index||0)+1}</span></div></div><span class="tmg-badge">${sign}</span><div class="tmg-line">${line}</div><div class="tmg-xprow"><span class="tmg-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></span><span class="tmg-xptxt">${xpText}</span></div>`;
}
function ensure(){
  const api=window.LowiHerbTamagotchi;if(!api||!api.current||!api.plantHTML)return false;
  const host=homeHost();if(!host)return false;
  let card=D.getElementById('tmgHomeCard');
  if(!card){card=D.createElement('button');card.type='button';card.id='tmgHomeCard';card.className='tmg-home-card rs-cols';card.setAttribute('data-noi18n','');card.addEventListener('click',()=>api.open());}
  if(card.parentElement!==host)host.prepend(card);
  card.hidden=false;card.setAttribute('aria-label',tr('open'));
  try{renderCard(card,api.current().m,api);}catch(e){return false;}
  return true;
}
function tick(){ensure();}
function boot(){
  tick();
  D.addEventListener('click',e=>{if(e.target.closest('#tabbar .tb,[data-tab],[data-page]'))setTimeout(tick,100);},true);
  D.addEventListener('visibilitychange',()=>{if(!D.hidden)tick();});
  if(window.MutationObserver)new MutationObserver(()=>tick()).observe(D.body,{childList:true,subtree:true});
  setInterval(tick,1500);
}
if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();