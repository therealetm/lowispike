/* Interruptible sheet motion and keyboard access; no external animation dependency. */
(function(){
'use strict';
const D=document,H=D.documentElement,R2=window.LowiR2;
/* Herb Tamagotchi is loaded from this already-live shell file so the 3.2 MB app entry point stays untouched. */
(function loadHerb(attempt){
  if(window.__LOWI_HERB_READY)return;
  if(!window.LowiR2){if((attempt||0)<120)setTimeout(()=>loadHerb((attempt||0)+1),50);else{try{if(window.LowiBoot)window.LowiBoot.loaded();}catch(x){}}return;}
  if(window.__LOWI_HERB_LOADING)return;window.__LOWI_HERB_LOADING=true;window.__LOWI_HERB_READY=true;
  const v='20261015-220000';
  if(!D.getElementById('tmgCss')){const spiritCss=D.createElement('link');spiritCss.rel='stylesheet';spiritCss.href='spirit.css?v='+v;D.head.append(spiritCss);const l=D.createElement('link');l.id='tmgCss';l.rel='stylesheet';l.href='herb-tamagotchi.css?v='+v;D.head.appendChild(l);const bc=D.createElement('link');bc.id='betaCss';bc.rel='stylesheet';bc.href='beta.css?v='+v;D.head.appendChild(bc);const wx=D.createElement('link');wx.id='wxCss';wx.rel='stylesheet';wx.href='weather-sky.css?v='+v;D.head.appendChild(wx);const fb=D.createElement('link');fb.id='fbCss';fb.rel='stylesheet';fb.href='fast-bubble.css?v='+v;D.head.appendChild(fb);const ht=D.createElement('link');ht.id='htCss';ht.rel='stylesheet';ht.href='herb-touch.css?v='+v;D.head.appendChild(ht);const wl=D.createElement('link');wl.id='wideCss';wl.rel='stylesheet';wl.href='wide-layout.css?v='+v;D.head.appendChild(wl);const li=D.createElement('link');li.id='liCss';li.rel='stylesheet';li.href='lowi-icons.css?v='+v;D.head.appendChild(li);const dr=D.createElement('link');dr.id='drCss';dr.rel='stylesheet';dr.href='daily-ritual.css?v='+v;D.head.appendChild(dr);const tbc=D.createElement('link');tbc.id='tbCss';tbc.rel='stylesheet';tbc.href='top-bar.css?v='+v;D.head.appendChild(tbc);}
  const files=['weather-sky-core.js','weather-sky.js','herb-config.js','herb-core.js','herb-identity-core.js','starter-core.js','herb-start.js','herb-quests-core.js','herb-quests.js','spirit-core.js','lowi-icons.js','herb-tamagotchi-core.js','herb-shop-core.js','herb-identity.js','herb-tamagotchi.js','herb-tamagotchi-polish.js','herb-tamagotchi-mount-fix.js','cell-world.js','herb-touch.js','spirit.js','herb-shop.js','beta.js','fast-bubble.js','living-home.js','sun-meter.js','praise.js','finch-extras.js','daily-ritual.js','micro-book-core.js','micro-book.js','cell-room-core.js','cell-room.js','body-world-3d.js','body-world-regions.js','top-bar.js','body-trips.js','world-health-core.js','body-ride-core.js','body-ride.js','season-core.js','season.js','atmosphere-core.js','atmosphere.js','microbe-buddies-core.js','microbe-buddies.js','arrival-core.js','arrival-cards.js','fast-edit-core.js','fast-edit.js','xp-tap-core.js','xp-tap.js','world-mood-core.js','world-audio-core.js','world-audio.js','world-mood.js','companion-core.js','companion.js','world-home-core.js','world-home.js'];
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
  const s={ov,sh,y:sh.getBoundingClientRect().height+30,v:0,target:0,raf:0,last:0,closing:false,trigger};
  states.set(ov,s);ov.classList.add('au-physics');
  const heading=sh.querySelector('h1,h2,.h1,.h2');if(heading){if(!heading.id)heading.id='au-sheet-title-'+(++sequence);sh.setAttribute('aria-labelledby',heading.id);}
  sh.tabIndex=-1;render(s);settle(s,0,0);
  requestAnimationFrame(()=>{if(R2.top()===ov&&!sh.contains(D.activeElement))sh.focus({preventScroll:true});});
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
R2.motionClose=function(ov,remove){
  const s=states.get(ov);if(!s)return false;s.closing=true;
  settle(s,s.sh.getBoundingClientRect().height+40,s.v,()=>{remove();states.delete(ov);if(!R2.top()&&s.trigger&&s.trigger.isConnected)s.trigger.focus({preventScroll:true});});return true;
};
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
