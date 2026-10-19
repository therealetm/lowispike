/* LOWiSPIKE birth companion, page layer (Oct 16, 2026). Rules + art live in companion-birth-core.js.
   ONE SHARED API for the whole app (Today bubble, Community, workout player, roaming, ...):
     window.getCompanion()          -> same as LowiBirthCompanion.get()
     (window.LowiCompanion is a different, older module: Misty's forms/evolution in companion.js. Not this one.)
     LowiBirthCompanion.get()            -> this user's companion {name, sign, palette:{a,b,deep}, look, element, rhythm, ...}
                                       or the Misty fallback ({misty:true, name:'Misty', ...}) for users without one yet
     LowiBirthCompanion.has()            -> true once the user brought their own companion to life
     LowiBirthCompanion.svg(c?, {size})  -> the companion's glass-bubble SVG (no argument: this user's companion)
     LowiBirthCompanion.personality(c?)  -> {title, line} in the app language
     LowiBirthCompanion.reveal(host, {bday, btime}, onDone)  -> the "comes alive" moment inside any element
     LowiBirthCompanion.openCreator()    -> full-screen creator (Profile, for existing users)
     window event 'lowi:companion'  -> fired after a companion is saved or renamed
   Storage: localStorage 'lowispike.companion.v1' = {v,bday,btime,n,name,created}. Every lowispike.* key is in the
   Supabase user_state backup, so the companion follows the account to other devices. The look is recomputed from
   bday/btime (deterministic), so only the inputs and the chosen name are stored. */
(function(){
'use strict';
const C=window.LowiBirthCompanionCore;if(!C||window.LowiBirthCompanion)return;
const D=document,KEY='lowispike.companion.v1';
if(!D.getElementById('lcCss')){const m=D.querySelector('meta[name="lowi-build"]');const l=D.createElement('link');l.id='lcCss';l.rel='stylesheet';l.href='companion-birth.css?v='+encodeURIComponent(m?m.content:'1');D.head.appendChild(l);}
const lang=()=>{let l='';try{l=(window.LowiLang&&LowiLang.get&&LowiLang.get())||localStorage.getItem('lowispike.lang')||D.documentElement.lang||'en';}catch(e){l='en';}l=String(l).slice(0,2).toLowerCase();return C.LANGS.includes(l)?l:'en';};
const TX={
 en:{waking:'Something is waking up\u2026',over:'Your companion is here',sign:'{sign} \u00b7 {colour}',myth:'Born from {myth}, your star colour and the energy of your cells.',shuffle:'Shuffle name',go:'Continue',keep:'Keep {name}',
  profT:'Your companion',profNone:'Bring your own companion to life from your birthday.',profHas:'{sign} \u00b7 {type}',profBtn:'Bring it to life',profSee:'Open',bdayL:'Your birthday',timeL:'Birth time (optional)',timeHint:'Makes your companion even more yours.',
  create:'Bring it to life',close:'Close',need:'Add your birthday first.',ally:'{name}, your companion'},
 de:{waking:'Etwas erwacht\u2026',over:'Dein Begleiter ist da',sign:'{sign} \u00b7 {colour}',myth:'Geboren aus {myth}, deiner Sternfarbe und der Energie deiner Zellen.',shuffle:'Neuer Name',go:'Weiter',keep:'{name} behalten',
  profT:'Dein Begleiter',profNone:'Erwecke deinen eigenen Begleiter mit deinem Geburtstag zum Leben.',profHas:'{sign} \u00b7 {type}',profBtn:'Zum Leben erwecken',profSee:'\u00d6ffnen',bdayL:'Dein Geburtstag',timeL:'Geburtszeit (optional)',timeHint:'Macht deinen Begleiter noch pers\u00f6nlicher.',
  create:'Zum Leben erwecken',close:'Schlie\u00dfen',need:'Trag zuerst deinen Geburtstag ein.',ally:'{name}, dein Begleiter'},
 es:{waking:'Algo est\u00e1 despertando\u2026',over:'Tu compa\u00f1ero ya est\u00e1 aqu\u00ed',sign:'{sign} \u00b7 {colour}',myth:'Nace de {myth}, de tu color estelar y de la energ\u00eda de tus c\u00e9lulas.',shuffle:'Otro nombre',go:'Continuar',keep:'Quedarme con {name}',
  profT:'Tu compa\u00f1\u00eda',profNone:'Da vida a tu propia compa\u00f1\u00eda con tu fecha de nacimiento.',profHas:'{sign} \u00b7 {type}',profBtn:'Darle vida',profSee:'Abrir',bdayL:'Tu cumplea\u00f1os',timeL:'Hora de nacimiento (opcional)',timeHint:'Hace tu compa\u00f1\u00eda a\u00fan m\u00e1s tuya.',
  create:'Darle vida',close:'Cerrar',need:'A\u00f1ade primero tu cumplea\u00f1os.',ally:'{name}, tu compa\u00f1\u00eda'}};
const t=(k,o)=>String((TX[lang()]||TX.en)[k]||TX.en[k]||k).replace(/\{(\w+)\}/g,(_,x)=>o&&o[x]!=null?o[x]:'');
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const RM=()=>{try{return matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){return false;}};

function stored(){try{const v=JSON.parse(localStorage.getItem(KEY)||'null');return v&&C.validDate(v.bday)?v:null;}catch(e){return null;}}
let cache=null,cacheSig='';
function getCompanion(){const s=stored();if(!s)return Object.assign({},C.MISTY);const sig=JSON.stringify(s);if(cache&&sig===cacheSig)return cache;
 cache=C.generate({bday:s.bday,btime:s.btime,n:s.n,name:s.name});cacheSig=sig;return cache||Object.assign({},C.MISTY);}
function has(){return !!stored();}
function save(c){if(!c||!c.bday)return;const rec={v:1,bday:c.bday,btime:c.btime||'',n:c.n|0,name:C.cleanName(c.name)||c.autoName,created:(stored()||{}).created||Date.now()};
 try{localStorage.setItem(KEY,JSON.stringify(rec));}catch(e){}
 try{if(window.LowiHerbIdentity&&LowiHerbIdentity.setCustomName)LowiHerbIdentity.setCustomName(rec.name);}catch(e){}
 cache=null;try{window.dispatchEvent(new CustomEvent('lowi:companion',{detail:getCompanion()}));}catch(e){}
 setTimeout(mountProfile,0);return rec;}
/* Oct 19 (aura-rename task): rename the companion by hand, any time after it got its name. Only the name changes: the look comes
   from bday/btime/n and stays exactly the same. '' brings back the generated name (own companion) or Misty (no own companion yet).
   Returns {ok, name} or {ok:false, why}. Saved in lowispike.companion.v1 (own companion) or the herb name (Misty), both of
   which the account backup syncs; fires 'lowi:companion' so Home, Misty's card, Community and the tutorial redraw. */
function rename(v){const chk=C.renameCheck(v);if(!chk.ok)return{ok:false,why:chk.why};
 const s=stored();
 if(s){const g=C.generate({bday:s.bday,btime:s.btime,n:s.n});const nm=chk.name||(g&&g.autoName)||s.name;
  const rec=Object.assign({},s,{name:C.cleanName(nm)});try{localStorage.setItem(KEY,JSON.stringify(rec));}catch(e){return{ok:false,why:'save'};}
  try{if(window.LowiHerbIdentity&&LowiHerbIdentity.setCustomName)LowiHerbIdentity.setCustomName(rec.name);}catch(e){}}
 else{try{if(!(window.LowiHerbIdentity&&LowiHerbIdentity.setCustomName))return{ok:false,why:'save'};LowiHerbIdentity.setCustomName(chk.name);}catch(e){return{ok:false,why:'save'};}}
 cache=null;const c=getCompanion();const name=s?c.name:(chk.name||'Misty');
 try{window.dispatchEvent(new CustomEvent('lowi:companion',{detail:Object.assign({},c,{renamed:true,displayName:name})}));}catch(e){}
 setTimeout(mountProfile,0);return{ok:true,name,reset:!!chk.reset};}
function personality(c,l){return C.personality(c||getCompanion(),l||lang());}
function svg(c,o){return C.svg(c||getCompanion(),o);}

/* ---------- the reveal: mystery spark -> burst -> the companion comes alive ---------- */
function reveal(host,o,onDone){o=o||{};if(!host)return;let c=C.generate({bday:o.bday,btime:o.btime,n:0});if(!c){if(onDone)onDone(null);return;}
 const prev=stored();if(prev&&prev.bday===c.bday&&(prev.btime||'')===c.btime){c=C.generate({bday:c.bday,btime:c.btime,n:prev.n,name:prev.name});}
 host.innerHTML='<div class="lc-rev" data-noi18n><div class="lc-stage"><i class="lc-flash" aria-hidden="true"></i><div class="lc-art">'+C.mysterySVG({size:200})+'</div></div>'+
  '<p class="lc-over" aria-live="polite">'+esc(t('waking'))+'</p><h2 class="lc-name"></h2><p class="lc-sign"></p><p class="lc-pers"></p><p class="lc-myth"></p>'+
  '<div class="lc-btns"><button type="button" class="lc-glass" data-lc="shuffle" disabled>'+esc(t('shuffle'))+'</button><button type="button" class="lc-cta" data-lc="go" disabled>'+esc(o.goLabel||t('go'))+'</button></div></div>';
 const R=host.querySelector('.lc-rev'),q=s=>R.querySelector(s),L=lang();
 const paintText=()=>{const p=C.personality(c,L);q('.lc-name').textContent=c.name;q('.lc-sign').innerHTML='<span class="lc-glyph" style="color:'+c.palette.a+'">'+c.glyph+'</span> '+esc(t('sign',{sign:C.signLabel(c.sign,L),colour:C.colourName(c.sign,L)}));
  q('.lc-pers').innerHTML='<b>'+esc(p.title)+'</b> '+esc(p.line);q('.lc-myth').textContent=t('myth',{myth:C.myth(c.sign,L)}).replace(/\bde el /g,'del ');
  q('.lc-art svg')&&q('.lc-art svg').setAttribute('aria-label',t('ally',{name:c.name}));};
 const alive=()=>{R.style.setProperty('--lc-a',c.palette.a);R.style.setProperty('--lc-b',c.palette.b);q('.lc-art').innerHTML=C.svg(c,{size:200,cls:'lc-born',label:t('ally',{name:c.name})});
  q('.lc-over').textContent=t('over');paintText();R.classList.add('lc-alive');R.querySelectorAll('button').forEach(b=>b.disabled=false);};
 if(RM()||o.instant){alive();}else{R.classList.add('lc-waking');setTimeout(()=>{R.classList.add('lc-burst');},1100);setTimeout(alive,1500);}
 R.addEventListener('click',e=>{const b=e.target.closest('[data-lc]');if(!b||b.disabled)return;
  if(b.dataset.lc==='shuffle'){c=C.generate({bday:c.bday,btime:c.btime,n:c.n+1});const nm=q('.lc-name');nm.textContent=c.name;nm.classList.remove('lc-pop');void nm.offsetWidth;nm.classList.add('lc-pop');
   const s=q('.lc-art svg');if(s)s.setAttribute('aria-label',t('ally',{name:c.name}));try{navigator.vibrate&&navigator.vibrate(8);}catch(_){}}
  else if(b.dataset.lc==='go'){save(c);if(onDone)onDone(c);}});
 return c;}

/* ---------- creator overlay (Profile, existing users) ---------- */
function userBday(){try{const s=window.R2&&R2.S&&R2.S();const b=s&&s.user&&s.user.bday;if(C.validDate(b))return b;}catch(e){}const p=stored();return p?p.bday:'';}
function closeOv(){const ov=D.getElementById('lcOv');if(ov){ov.classList.remove('on');setTimeout(()=>ov.remove(),240);}}
function openCreator(){closeOv();const p=stored(),bday=userBday();
 const ov=D.createElement('div');ov.id='lcOv';ov.className='lc-ov';ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');ov.setAttribute('data-noi18n','');
 ov.innerHTML='<div class="lc-card"><button type="button" class="lc-x" data-lcx aria-label="'+esc(t('close'))+'">\u00d7</button><div class="lc-body">'+
  '<div class="lc-form"><div class="lc-art lc-small">'+(p?C.svg(getCompanion(),{size:150}):C.mysterySVG({size:150}))+'</div>'+
  '<label class="lc-l">'+esc(t('bdayL'))+'<input type="date" id="lcB" value="'+esc(bday)+'" max="'+new Date().toISOString().slice(0,10)+'"></label>'+
  '<label class="lc-l">'+esc(t('timeL'))+'<input type="time" id="lcT" value="'+esc(p?p.btime:'')+'"></label><small class="lc-hint">'+esc(t('timeHint'))+'</small>'+
  '<p class="lc-err" hidden>'+esc(t('need'))+'</p><button type="button" class="lc-cta" data-lcgo>'+esc(t('create'))+'</button></div></div></div>';
 D.body.appendChild(ov);requestAnimationFrame(()=>ov.classList.add('on'));
 ov.addEventListener('click',e=>{if(e.target===ov||e.target.closest('[data-lcx]')){closeOv();return;}
  if(e.target.closest('[data-lcgo]')){const b=C.validDate(ov.querySelector('#lcB').value),tm=C.validTime(ov.querySelector('#lcT').value);
   if(!b){ov.querySelector('.lc-err').hidden=false;return;}
   try{const s=window.R2&&R2.S&&R2.S();if(s&&s.user&&!s.user.bday){s.user.bday=b;R2.save&&R2.save();}}catch(_){}
   reveal(ov.querySelector('.lc-body'),{bday:b,btime:tm},()=>closeOv());}});}

/* ---------- Profile card ---------- */
function mountProfile(){const prof=D.getElementById('tab-profile');if(!prof)return;const pf=prof.querySelector('.r3a-pf');if(!pf)return;
 const c=getCompanion(),own=has(),L=lang();
 const html='<button type="button" class="card lc-pcard" id="lcProf" data-noi18n data-lcopen>'+(own?C.svg(c,{size:56}):C.mysterySVG({size:56}))+
  '<span class="lc-pt"><small>'+esc(t('profT'))+'</small><b>'+esc(own?c.name:t('profBtn'))+'</b><em>'+esc(own?t('profHas',{sign:C.signLabel(c.sign,L),type:C.personality(c,L).title}):t('profNone'))+'</em></span><span class="lc-chev" aria-hidden="true">\u203a</span></button>';
 const sig=(own?JSON.stringify(stored()):'none')+L;let ex=D.getElementById('lcProf');
 if(ex&&ex.getAttribute('data-sig')===sig&&ex.isConnected)return;
 if(ex)ex.remove();const anchor=D.getElementById('hsProf')||pf;anchor.insertAdjacentHTML('afterend',html);ex=D.getElementById('lcProf');if(ex)ex.setAttribute('data-sig',sig);}
D.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('[data-lcopen]'))openCreator();});
let q=0;const soon=()=>{if(q)return;q=requestAnimationFrame(()=>{q=0;try{mountProfile();}catch(e){}});};
try{new MutationObserver(ms=>{for(const m of ms){const tg=m.target;if(!tg||!tg.closest||tg.closest('#lcProf,#lcOv'))continue;if(tg.id==='tab-profile'||tg.closest('#tab-profile')){soon();return;}}}).observe(D.body,{childList:true,subtree:true});}catch(e){}
window.addEventListener('lowi:lang',soon);
if(D.readyState!=='loading')soon();else D.addEventListener('DOMContentLoaded',soon);

window.LowiBirthCompanion={KEY,get:getCompanion,getCompanion,has,save,rename,personality,svg,mysterySVG:C.mysterySVG,reveal,openCreator,core:C,
 clear(){try{localStorage.removeItem(KEY);}catch(e){}cache=null;soon();}};
/* the one-call way for any feature: window.getCompanion() (LowiCompanion is the older Misty forms/evolution module in companion.js) */
window.getCompanion=getCompanion;
})();
