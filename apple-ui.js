/* Interruptible sheet motion and keyboard access; no external animation dependency. */
(function(){
'use strict';
const D=document,H=D.documentElement,R2=window.LowiR2;
/* Herb Tamagotchi is loaded from this already-live shell file so the 3.2 MB app entry point stays untouched. */
(function loadHerb(attempt){
  if(window.__LOWI_HERB_READY)return;
  if(!window.LowiR2){if((attempt||0)<120)setTimeout(()=>loadHerb((attempt||0)+1),50);else{try{if(window.LowiBoot)window.LowiBoot.loaded();}catch(x){}}return;}
  if(window.__LOWI_HERB_LOADING)return;window.__LOWI_HERB_LOADING=true;window.__LOWI_HERB_READY=true;
  const v='20261023-192323';
  if(!D.getElementById('tmgCss')){const spiritCss=D.createElement('link');spiritCss.rel='stylesheet';spiritCss.href='spirit.css?v='+v;D.head.append(spiritCss);const l=D.createElement('link');l.id='tmgCss';l.rel='stylesheet';l.href='herb-tamagotchi.css?v='+v;D.head.appendChild(l);const bc=D.createElement('link');bc.id='betaCss';bc.rel='stylesheet';bc.href='beta.css?v='+v;D.head.appendChild(bc);const wx=D.createElement('link');wx.id='wxCss';wx.rel='stylesheet';wx.href='weather-sky.css?v='+v;D.head.appendChild(wx);const fb=D.createElement('link');fb.id='fbCss';fb.rel='stylesheet';fb.href='fast-bubble.css?v='+v;D.head.appendChild(fb);const ht=D.createElement('link');ht.id='htCss';ht.rel='stylesheet';ht.href='herb-touch.css?v='+v;D.head.appendChild(ht);const wl=D.createElement('link');wl.id='wideCss';wl.rel='stylesheet';wl.href='wide-layout.css?v='+v;D.head.appendChild(wl);const li=D.createElement('link');li.id='liCss';li.rel='stylesheet';li.href='lowi-icons.css?v='+v;D.head.appendChild(li);const dr=D.createElement('link');dr.id='drCss';dr.rel='stylesheet';dr.href='daily-ritual.css?v='+v;D.head.appendChild(dr);const tbc=D.createElement('link');tbc.id='tbCss';tbc.rel='stylesheet';tbc.href='top-bar.css?v='+v;D.head.appendChild(tbc);}
  const files=['weather-sky-core.js','weather-sky.js','herb-config.js','herb-core.js','herb-identity-core.js','starter-core.js','companion-birth-core.js','companion-birth.js','herb-start.js','herb-quests-core.js','herb-quests.js','meal-db-core.js','spirit-core.js','lowi-icons.js','herb-tamagotchi-core.js','herb-shop-core.js','herb-identity.js','herb-tamagotchi.js','herb-tamagotchi-polish.js','herb-tamagotchi-mount-fix.js','cell-world.js','herb-touch.js','spirit.js','herb-shop.js','beta.js','fast-bubble.js','living-home.js','sun-meter.js','praise.js','finch-extras.js','daily-ritual.js','micro-book-core.js','micro-book.js','cell-room-core.js','cell-room.js','body-world-3d.js','body-world-regions.js','top-bar.js','body-trips.js','world-health-core.js','inside-row.js','season-core.js','season.js','atmosphere-core.js','atmosphere.js','region-pals-core.js','region-pals.js','world-sci-core.js','world-sci.js','arrival-core.js','arrival-cards.js','fast-edit-core.js','fast-edit.js','xp-tap-core.js','xp-tap.js','world-mood-core.js','calm-sound-core.js','sound-strings.js','world-audio-core.js','world-audio.js','world-mood.js','companion-core.js','companion.js','world-home-core.js','world-home.js'];
  /* Oct 15 clean start: all companion files download at once; async=false still runs them one after another in list order.
     (They used to download one by one, each waiting for the last, which made opening the app take seconds.)
     When every file has run or failed, LowiBoot (index.html head) shows the finished app in one step. */
  let left=0;const boot=()=>{try{if(window.LowiBoot)window.LowiBoot.loaded();}catch(x){}};const one=()=>{if(--left<=0)boot();};
  for(const f of files){const id='tmg-'+f.replace(/\W/g,'-');if(D.getElementById(id))continue;const s=D.createElement('script');s.id=id;s.src=f+'?v='+v;s.async=false;left++;s.onload=one;s.onerror=()=>{console.warn('Herb companion could not load',f);one();};D.head.appendChild(s);}
  if(!left)boot();
})(0);
H.classList.add('apple-ui');
if(!R2 || !R2.sheet) return;
const states=new WeakMap(), reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
let sequence=0;
function render(s){s.sh.style.setProperty('transform','translate3d(0,'+s.y+'px,0)','important');}
function stop(s){cancelAnimationFrame(s.raf);s.raf=0;s.last=0;}
function settle(s,target,velocity,done){
  stop(s);s.target=target;s.v=Number.isFinite(velocity)?velocity:s.v;s.done=done;
  if(reduced()){s.y=target;s.v=0;render(s);if(done)done();return;}
  const tick=time=>{
    const dt=s.last?Math.min((time-s.last)/1000,.025):1/60;s.last=time;
    const stiffness=360,damping=s.release?32:38;
    s.v+=(-stiffness*(s.y-s.target)-damping*s.v)*dt;s.y+=s.v*dt;render(s);
    if(Math.abs(s.y-s.target)<.5&&Math.abs(s.v)<3){s.y=s.target;s.v=0;render(s);s.raf=0;s.last=0;if(s.done){const cb=s.done;s.done=null;cb();}}else s.raf=requestAnimationFrame(tick);
  };
  s.raf=requestAnimationFrame(tick);
}
const sheet=R2.sheet;
R2.sheet=function(html,opts){
  opts=opts||{};const trigger=D.activeElement,ov=sheet.apply(this,arguments),sh=ov&&ov.querySelector('.r2-sh');
  if(!sh||opts.noClose) return ov;
  /* Home's panels bloom out of the bubble you tapped (misty-bloom.js) instead of sliding up; the grab-to-dismiss spring stays */
  const bloom=!!(window.LowiBloom&&LowiBloom.wants(sh,opts));
  const s={ov,sh,y:bloom?0:sh.getBoundingClientRect().height+30,v:0,target:0,raf:0,last:0,closing:false,trigger,bloom};
  states.set(ov,s);ov.classList.add('au-physics');
  const heading=sh.querySelector('h1,h2,.h1,.h2');if(heading){if(!heading.id)heading.id='au-sheet-title-'+(++sequence);sh.setAttribute('aria-labelledby',heading.id);}
  sh.tabIndex=-1;render(s);if(bloom)LowiBloom.open(sh);else settle(s,0,0);
  requestAnimationFrame(()=>{if(R2.top()===ov&&!sh.contains(D.activeElement))sh.focus({preventScroll:true});});
  /* Oct 23 (sheets-linger): a sheet opened right after another one closed (Gap > Log a meal: Gap fades for 260 ms, its close puts
     focus back on the page) could end up with focus outside it, so Escape closed nothing. Check again once the open has settled. */
  setTimeout(()=>{if(R2.top()===ov&&ov.isConnected&&strayFocus(D.activeElement))try{sh.focus({preventScroll:true});}catch(e){}},320);
  const grab=sh.querySelector('.r2-grab');
  if(grab&&!opts.full){
    let drag=null;
    grab.addEventListener('pointerdown',e=>{
      if(e.button!==0||s.closing)return;stop(s);drag={id:e.pointerId,start:e.clientY,base:s.y,lastY:e.clientY,lastTime:e.timeStamp,velocity:s.v};
      grab.setPointerCapture(e.pointerId);ov.classList.add('au-drag');e.preventDefault();
    });
    grab.addEventListener('pointermove',e=>{
      if(!drag||e.pointerId!==drag.id)return;
      const raw=drag.base+e.clientY-drag.start;
      s.y=raw>=0?raw:(raw*200*.55)/(200+.55*Math.abs(raw));
      const dt=Math.max(1,e.timeStamp-drag.lastTime);drag.velocity=.6*drag.velocity+.4*((e.clientY-drag.lastY)/dt*1000);drag.lastY=e.clientY;drag.lastTime=e.timeStamp;render(s);
    });
    const end=(e,cancelled)=>{
      if(!drag||e.pointerId!==drag.id)return;
      const v=e.timeStamp-drag.lastTime>100?0:drag.velocity;
      const projected=s.y+(v/1000)*.99/(1-.99),threshold=Math.min(160,sh.getBoundingClientRect().height*.3);
      drag=null;ov.classList.remove('au-drag');s.release=true;
      if(!cancelled&&s.y>10&&projected>threshold){s.v=v;R2.close(ov);}else settle(s,0,v);
    };
    grab.addEventListener('pointerup',e=>end(e,false));grab.addEventListener('pointercancel',e=>end(e,true));
  }
  ov.addEventListener('keydown',e=>{
    if(R2.top()!==ov)return;
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();R2.close(ov);}
    if(e.key==='Tab'){
      const nodes=Array.from(sh.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')).filter(n=>!n.hidden&&n.getClientRects().length);
      if(!nodes.length){e.preventDefault();return;}
      const first=nodes[0],last=nodes[nodes.length-1];
      if(e.shiftKey&&(D.activeElement===first||D.activeElement===sh)){e.preventDefault();last.focus();}else if(!e.shiftKey&&(D.activeElement===last||D.activeElement===sh)){e.preventDefault();first.focus();}
    }
  });
  return ov;
};
/* Oct 20, bug hunt run 17 (BH-016): a sheet closing over another sheet (Glow over the companion card, any sheet opened from a
   sheet) left keyboard focus on the closing sheet and then on <body>, because focus only went back when no sheet was left.
   With focus on <body> the card underneath no longer got Escape or Tab (iPad with a keyboard, VoiceOver lost its place).
   Now focus goes straight back into the sheet that is on top again: to the button that opened the closing sheet when it is
   still there, else to that sheet itself. */
function refocusTop(closing,trigger){
  const top=R2.top();if(!top||top===closing)return false;
  const a=D.activeElement;if(a&&a!==D.body&&a!==H&&top.contains(a))return false;
  const sh=top.querySelector('.r2-sh');if(!sh)return false;
  const t=trigger&&trigger.isConnected&&!trigger.hidden&&sh.contains(trigger)?trigger:sh;
  try{t.focus({preventScroll:true});}catch(e){}
  return true;
}
R2.motionClose=function(ov,remove){
  const s=states.get(ov);if(!s)return false;s.closing=true;
  const a=D.activeElement;if(!a||a===D.body||a===H||ov.contains(a))refocusTop(ov,s.trigger);
  const gone=()=>{remove();states.delete(ov);const b=D.activeElement,free=!b||b===D.body||b===H;/* Oct 23: never pull focus out of a field the user is already typing in (camera food-name field) */if(!R2.top()){if(free&&s.trigger&&s.trigger.isConnected)s.trigger.focus({preventScroll:true});}else if(free)refocusTop(ov,s.trigger);};
  if(s.bloom&&s.y<12&&LowiBloom.close(s.sh,gone))return true;
  settle(s,s.sh.getBoundingClientRect().height+40,s.v,gone);return true;
};
/* BH-016: a sheet that repaints itself (the companion card after a mood tap, the Glow sheet after an aura pick) swapped its
   whole content and dropped focus to <body>. keepFocus swaps the old element for the new one and puts focus back on the same
   control (same data-* keys), or on the sheet when that control is gone. */
function focusKey(el){
  if(!el||!el.getAttribute)return '';
  const k=['data-mh','data-mood','data-wh','data-tab','data-id','data-mhrnx','name'].map(n=>{const v=el.getAttribute(n);return v==null?'':n+'='+v;}).filter(Boolean).join('|');
  return k?(el.tagName||'')+'|'+k:'';
}
R2.keepFocus=function(oldEl,newEl){
  if(!oldEl||!newEl)return newEl;
  const a=D.activeElement,had=!!(a&&a!==oldEl&&oldEl.contains(a))||a===oldEl,key=had&&a!==oldEl?focusKey(a):'';
  oldEl.replaceWith(newEl);
  if(!had)return newEl;
  let t=null;
  if(key)t=Array.from(newEl.querySelectorAll('*')).find(n=>focusKey(n)===key&&!n.hidden&&!n.disabled)||null;
  if(!t){const ov=newEl.closest&&newEl.closest('.r2-ov');t=(ov&&ov.querySelector('.r2-sh'))||null;}
  if(t)try{t.focus({preventScroll:true});}catch(e){}
  return newEl;
};
/* BH-016 safety net: focus fell to <body> while a closable sheet is the top layer and nothing covers it (another app layer,
   the tutorial card, the scanner): Escape closes that sheet and Tab steps back into it, like it does from inside. */
/* Oct 23 (sheets-linger): focus that no sheet can hear: on <body>, gone from the page, inside a parked / inert / closing layer,
   or on a page button underneath while a sheet covers it. A text field (or any real control with its own keys) keeps them. */
const LAYER='.r2-ov,[role=dialog],[aria-modal=true],.tut-ov,#ltTour,.cf-ov,.gv-ov,.fe-ov,.hs-ov,.cr-ov,.stp-ov,.gh-ov,.wj-ov,.yd-ov,.bs-ov,#sheetwrap';
function strayFocus(a){
  if(!a||a===D.body||a===H||!a.isConnected)return true;
  try{if(a.closest('[inert],.r2-parked,.r2-ov.off'))return true;const l=a.closest(LAYER);if(!l)return !(/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName||'')||a.isContentEditable);if(l.matches('.gv-ov')&&!l.classList.contains('on'))return true;}catch(e){}
  return false;
}
function bodyKey(e){
  if(e.key!=='Escape'&&e.key!=='Tab')return;
  if(e.defaultPrevented)return;
  const a=D.activeElement;if(!strayFocus(a))return;
  const top=R2.top();if(!top||!states.has(top))return;
  const sh=top.querySelector('.r2-sh');if(!sh)return;
  const r=sh.getBoundingClientRect();if(!r.width||!r.height)return;
  let hit=null;try{hit=D.elementFromPoint(r.left+r.width/2,r.top+Math.min(r.height/2,48));}catch(x){}
  if(!hit||!top.contains(hit))return;
  e.preventDefault();
  if(e.key==='Escape')R2.close(top);else refocusTop(null,null);
}
D.addEventListener('keydown',bodyKey);
const toast=D.getElementById('toast');if(toast){toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');toast.setAttribute('aria-atomic','true');}
const nav=D.getElementById('tabbar');
if(nav){
  nav.setAttribute('aria-label','Main navigation');
  for(const b of nav.querySelectorAll('.tb')){
    if(!b.querySelector('.tbl')){
      const label=D.createElement('span');label.className='tbl';
      const textNodes=Array.from(b.childNodes).filter(n=>n.nodeType===3&&n.textContent.trim());
      if(textNodes.length){label.textContent=textNodes.map(n=>n.textContent.trim()).join(' ');textNodes.forEach(n=>n.replaceWith(label));}
      else{const old=Array.from(b.children).find(n=>n.tagName==='SPAN'&&!n.className);if(old){old.classList.add('tbl');}}
    }
  }
  const current=()=>nav.querySelectorAll('.tb').forEach(b=>{if(b.classList.contains('active'))b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  current();new MutationObserver(current).observe(nav,{subtree:true,attributes:true,attributeFilter:['class']});
}
})();
