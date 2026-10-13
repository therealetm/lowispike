(function(){
'use strict';
const D=document,H=window.LowiHerbTamagotchi,G=window.LowiG1;
if(!H)return;
if(!D.getElementById('tmgMotion')){const s=D.createElement('style');s.id='tmgMotion';s.textContent='.tmg-hero-plant .tmg-plant{animation:tmgBreathe 3.6s ease-in-out infinite}.tmg-mini .tmg-glow{animation:tmgGlow 3.2s ease-in-out infinite}@keyframes tmgBreathe{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-3px) scale(1.012)}}@keyframes tmgGlow{0%,100%{opacity:.11}50%{opacity:.22}}@media(prefers-reduced-motion:reduce){.tmg-hero-plant .tmg-plant,.tmg-mini .tmg-glow{animation:none!important}}';D.head.append(s);}
if(G&&typeof G.line==='function'&&!G.__herbLine){const old=G.line;G.line=function(){const out=old.apply(this,arguments);requestAnimationFrame(()=>{try{const fb=D.querySelector('#g1Z .g1-fb');if(!fb)return;const m=H.current().m;fb.classList.add('tmg-guide');fb.style.setProperty('--tmg-a',m.profile.palette.a);fb.style.setProperty('--tmg-b',m.profile.palette.b);let p=fb.querySelector('.tmg-guide-plant');if(!p){p=D.createElement('span');p.className='tmg-guide-plant';fb.append(p);}p.innerHTML=H.plantHTML(m);}catch(e){}});return out;};G.__herbLine=true;}
})();
