/* LOWiSPIKE herb-first start + starter plan (Oct 15, 2026).
   1. Companion-first (Oct 16 redesign; birth companion later that day): a new user meets an unrevealed being of light (no name,
      face or colour until the birthday step brings it to life, see companion-birth.js), learns that healthy habits are its energy, tells it their name and
      gets a first small reward, all before the account form, on the living metabolic-world background (onboarding-world.css).
   2. Starter plan: after setup, up to 4 optional questions -> 3 or 4 next actions on Today. Each action has "Why this?", a direct
      link into the module that does it, and can be changed. Done-state is read live from those modules (LowiLiving, LowiFastStop);
      nothing is counted twice. "What makes this hard?" is asked later, only when that friction shows up.
   Existing users are never pushed through it: it is offered from Profile > About you. The sign-in handoff code is not touched. */
(function(){
'use strict';
if(window.LowiHerbStart)return;
const C=window.LowiStarterCore;if(!C)return;
const D=document,H=D.documentElement,KEY='lowi.hs.v1';
const R=()=>window.LowiR2||{};
if(!D.getElementById('hsCss')){const m=D.querySelector('meta[name="lowi-build"]');const l=D.createElement('link');l.id='hsCss';l.rel='stylesheet';l.href='herb-start.css?v='+encodeURIComponent(m&&m.content||'1');D.head.appendChild(l);}
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lang=()=>{let l='';try{l=(window.LowiLang&&LowiLang.get&&LowiLang.get())||localStorage.getItem('lowispike.lang')||H.lang||'en';}catch(e){l='en';}return C.L(String(l).slice(0,2).toLowerCase());};
const reduce=()=>{try{return matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){return false;}};
const ico=n=>{try{return window.LowiIcons&&LowiIcons.svg?LowiIcons.svg(n):'';}catch(e){return '';}};
const S=()=>{try{return R().S?R().S():LowiVitalsBridge.state();}catch(e){return null;}};
const save=()=>{try{if(R().save)R().save();else LowiVitalsBridge.save();}catch(e){}};
const dayKey=d=>{d=new Date(d||Date.now());return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};

const TX={
 en:{over:'FOOD & HABIT TRACKER',plantH:'Eat smarter. Become your healthiest self, as a game.',plantP:'Every healthy habit you track powers up your companion:',hab:['Shop & scan','Fuel (meals)','Water','Move','Gap (fasting)'],plantBtn:'Get started',have:'I already have an account',back:'Back',
  nameLabel:'Name',shuffle:'Shuffle',later:'You can change this later.',
  askOver:'YOUR NAME',ask:'Hi! I\u2019m your companion. What\u2019s your first name?',youLabel:'Your first name',askBtn:'Continue',needName:'Type your first name first.',
  rewOver:'YOUR FIRST XP',rew:'{name}, you earned your first spark! Create a free account to keep it.',chip:'+5 XP \u00b7 first spark',saveBtn:'Create free account',fine:'Free. Takes 20 seconds.',firstLeaf:'First spark',
  ivOver:'STARTER PLAN',ivH:'{herb} is ready for your first adventure.',ivP:'Up to 4 quick questions so your first steps fit your day. Every one is optional. No health questions.',go:'Start',notNow:'Not now',skipQ:'Skip',
  think:'{herb} is picking your first steps\u2026',planH:'Your next steps',planP:'They sit on Today. Each one opens the part of the app that does it.',planBtn:'Done',
  rowT:'Next steps',rowAll:'All done for today',rowQ:'{herb} has a question',why:'Why this?',goBtn:'Go',change:'Change',remove:'Remove',addOne:'Add a step',doneLbl:'Done today',pickOne:'Pick a step',cancel:'Cancel',
  redo:'Redo the questions',hide:'Hide from Today',show:'Show on Today',profT:'Starter plan',profNone:'4 optional questions with your companion. They set 3 or 4 next steps on Today.',profHas:'{n} next steps on Today',profStart:'Start',
  skipped:'Any time: Profile \u203a About you \u203a Starter plan.',saved:'Your next steps are on Today.',qNot:'Not now',qThanks:'Got it. I changed your steps.',allDone:'All steps done. {herb} is glowing.'},
 de:{over:'ESSEN- & GEWOHNHEITS-TRACKER',plantH:'Iss kl\u00fcger. Werde dein ges\u00fcndestes Ich, als Spiel.',plantP:'Jede gesunde Gewohnheit, die du eintr\u00e4gst, l\u00e4dt dein Lichtwesen auf:',hab:['Einkaufen & scannen','Essen','Wasser','Bewegung','Pause (Fasten)'],plantBtn:'Loslegen',have:'Ich habe schon ein Konto',back:'Zur\u00fcck',
  nameLabel:'Name',shuffle:'Mischen',later:'Du kannst das sp\u00e4ter \u00e4ndern.',
  askOver:'DEIN NAME',ask:'Hi! Ich bin dein Lichtwesen. Wie ist dein Vorname?',youLabel:'Dein Vorname',askBtn:'Weiter',needName:'Trag zuerst deinen Vornamen ein.',
  rewOver:'DEINE ERSTEN XP',rew:'{name}, dein erster Funke! Mit einem kostenlosen Konto bleibt dein Fortschritt gespeichert.',chip:'+5 XP \u00b7 erster Funke',saveBtn:'Kostenloses Konto erstellen',fine:'Kostenlos. Dauert 20 Sekunden.',firstLeaf:'Erster Funke',
  ivOver:'STARTPLAN',ivH:'{herb} ist bereit f\u00fcr euer erstes Abenteuer.',ivP:'Bis zu 4 kurze Fragen, damit deine ersten Schritte zu deinem Tag passen. Alle freiwillig. Keine Gesundheitsfragen.',go:'Starten',notNow:'Jetzt nicht',skipQ:'\u00dcberspringen',
  think:'{herb} sucht deine ersten Schritte aus\u2026',planH:'Deine n\u00e4chsten Schritte',planP:'Sie stehen auf Heute. Jeder \u00f6ffnet den Teil der App, der ihn erledigt.',planBtn:'Fertig',
  rowT:'N\u00e4chste Schritte',rowAll:'Heute alles geschafft',rowQ:'{herb} hat eine Frage',why:'Warum das?',goBtn:'Los',change:'\u00c4ndern',remove:'Entfernen',addOne:'Schritt hinzuf\u00fcgen',doneLbl:'Heute erledigt',pickOne:'Schritt ausw\u00e4hlen',cancel:'Abbrechen',
  redo:'Fragen neu beantworten',hide:'Auf Heute ausblenden',show:'Auf Heute zeigen',profT:'Startplan',profNone:'4 freiwillige Fragen. Daraus werden 3 oder 4 n\u00e4chste Schritte auf Heute.',profHas:'{n} n\u00e4chste Schritte auf Heute',profStart:'Starten',
  skipped:'Jederzeit: Profil \u203a \u00dcber dich \u203a Startplan.',saved:'Deine n\u00e4chsten Schritte stehen auf Heute.',qNot:'Jetzt nicht',qThanks:'Verstanden. Ich habe deine Schritte angepasst.',allDone:'Alle Schritte geschafft. {herb} leuchtet.'},
 es:{over:'APP DE COMIDA Y H\u00c1BITOS',plantH:'Come mejor. Convi\u00e9rtete en tu versi\u00f3n m\u00e1s sana, jugando.',plantP:'Cada h\u00e1bito sano que registras le da energ\u00eda a tu ser de luz:',hab:['Comprar y escanear','Comida','Agua','Movimiento','Pausa (ayuno)'],plantBtn:'Empezar',have:'Ya tengo una cuenta',back:'Atr\u00e1s',
  nameLabel:'Nombre',shuffle:'Otro',later:'Puedes cambiarlo despu\u00e9s.',
  askOver:'TU NOMBRE',ask:'\u00a1Hola! Soy tu ser de luz. \u00bfCu\u00e1l es tu nombre?',youLabel:'Tu nombre',askBtn:'Continuar',needName:'Primero escribe tu nombre.',
  rewOver:'TUS PRIMEROS XP',rew:'\u00a1{name}, tu primera chispa! Crea una cuenta gratis para no perderla.',chip:'+5 XP \u00b7 primera chispa',saveBtn:'Crear cuenta gratis',fine:'Es gratis y solo te lleva 20 segundos.',firstLeaf:'Primera chispa',
  ivOver:'PLAN INICIAL',ivH:'{herb} tiene todo listo para tu primera aventura.',ivP:'Hasta 4 preguntas r\u00e1pidas para que tus primeros pasos encajen en tu d\u00eda. Todas son opcionales y ninguna es sobre tu salud.',go:'Empezar',notNow:'Ahora no',skipQ:'Saltar',
  think:'{herb} est\u00e1 eligiendo tus primeros pasos\u2026',planH:'Tus pr\u00f3ximos pasos',planP:'Los tienes en Hoy. Al tocar uno, se abre la parte de la app donde se hace.',planBtn:'Listo',
  rowT:'Pr\u00f3ximos pasos',rowAll:'Todo hecho hoy',rowQ:'{herb} tiene una pregunta',why:'\u00bfPor qu\u00e9?',goBtn:'Ir',change:'Cambiar',remove:'Quitar',addOne:'A\u00f1adir paso',doneLbl:'Hecho hoy',pickOne:'Elige un paso',cancel:'Cancelar',
  redo:'Repetir las preguntas',hide:'Ocultar de Hoy',show:'Mostrar en Hoy',profT:'Plan inicial',profNone:'4 preguntas opcionales. Crean 3 o 4 pr\u00f3ximos pasos en Hoy.',profHas:'{n} pr\u00f3ximos pasos en Hoy',profStart:'Empezar',
  skipped:'Cuando quieras: Perfil \u203a Sobre ti \u203a Plan inicial.',saved:'Tus pr\u00f3ximos pasos est\u00e1n en Hoy.',qNot:'Ahora no',qThanks:'Entendido. He ajustado tus pasos.',allDone:'Todos los pasos hechos. {herb} brilla.'}
};
const wnm=s=>{try{const B=window.LowiBirthCompanion;return s&&B&&B.withName?B.withName(s):s;}catch(e){return s;}}; /* BH-045 */
const t=(k,o)=>C.fmt((TX[lang()]||TX.en)[k]||TX.en[k]||k,o);
const tl=k=>(TX[lang()]||TX.en)[k]||TX.en[k]||[];
const MISTY='Misty';

/* ---------- Misty art (Oct 16): the same companion drawing Home uses, in her glass bubble, blue comet look ---------- */
const BLUE={a:'#8fdcff',b:'#a9b8ff'};
function mistyInner(){try{const T=window.LowiHerbTamagotchi;if(T&&T.plantHTML&&T.current){const c=T.current();if(c&&c.m&&c.m.profile){
  const m=Object.assign({},c.m,{profile:Object.assign({},c.m.profile,{palette:BLUE}),dim:false,mood:'happy'});return T.plantHTML(m,'preview',c.p,{label:MISTY,hidden:true,preview:{effect:'comet'}});}}}catch(e){}
 return '';}
function mistyFallback(){return '<svg class="hs-fb" viewBox="0 0 120 120" aria-hidden="true"><defs><radialGradient id="hsFbB" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#eefaff"/><stop offset=".45" stop-color="#8fdcff"/><stop offset="1" stop-color="#4f86e8"/></radialGradient><linearGradient id="hsFbT" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9d8ff" stop-opacity="0"/><stop offset="1" stop-color="#a9d8ff" stop-opacity=".75"/></linearGradient></defs>'+
 '<path d="M98 18 Q70 38 52 50 L66 70 Q84 48 98 18Z" fill="url(#hsFbT)"/><circle cx="56" cy="66" r="30" fill="url(#hsFbB)"/><ellipse cx="46" cy="64" rx="3.4" ry="5" fill="#183d42"/><ellipse cx="64" cy="64" rx="3.4" ry="5" fill="#183d42"/><path d="M48 75 Q55 80 62 75" fill="none" stroke="#183d42" stroke-width="2.4" stroke-linecap="round"/></svg>';}
const cellReady=()=>{try{const T=window.LowiHerbTamagotchi;return !!(T&&T.plantHTML&&T.plantHTML.cell);}catch(e){return false;}};
/* Oct 16 birth companion: before the birthday (sign-in gate) it is a spark nobody has seen yet; once the user brought
   their own companion to life, that companion; Misty only for existing users who have not made theirs yet. */
function herbArt(stage,cls,gate){const LC=window.LowiBirthCompanion;
 if(LC&&LC.has())return '<div class="hs-misty hs-own '+(cls||'')+'" aria-hidden="true"><div class="hs-orb">'+LC.svg(null,{size:200})+'</div></div>';
 if(gate)return '<div class="hs-misty hs-mys '+(cls||'')+'" aria-hidden="true"><div class="hs-orb">'+(LC?LC.mysterySVG({size:200}):'')+'</div></div>';
 const inner=mistyInner(),done=inner&&cellReady();
 return '<div class="hs-misty '+(cls||'')+'" aria-hidden="true"><div class="hs-orb"'+(done?'':' data-fb="1"')+'>'+(inner||mistyFallback())+'</div></div>';}
/* the companion drawing (and the cell look Home gives it) loads a moment after this file: redraw Misty once it is there */
let FILL=0;
function fillArt(n){clearTimeout(FILL);const els=D.querySelectorAll('.hs-orb[data-fb]');if(!els.length)return;
 if(cellReady()){const inner=mistyInner();if(inner){els.forEach(e=>{e.innerHTML=mistyInner();e.removeAttribute('data-fb');});return;}}
 if((n||0)<40)FILL=setTimeout(()=>fillArt((n||0)+1),300);else{const inner=mistyInner();if(inner)els.forEach(e=>{e.innerHTML=mistyInner();e.removeAttribute('data-fb');});}}
/* Oct 17: 'Shop & scan' first, healthy days start in the grocery shop (barcode scanner + shopping rhythm) */
function habits(){const ic=['cart','salad','water','move','hourglass'];return '<ul class="hs-habits">'+tl('hab').map((h,i)=>'<li>'+ico(ic[i])+'<span>'+esc(h)+'</span></li>').join('')+'</ul>';}

/* ---------- 1. herb-first start (inside the sign-in gate) ---------- */
function hs(){try{return JSON.parse(localStorage.getItem(KEY)||'null')||null;}catch(e){return null;}}
function hsSet(o){try{localStorage.setItem(KEY,JSON.stringify(o));}catch(e){}}
function core(){return window.LowiHerbIdentityCore||null;}
function want(back){const s=S();if(!s)return false;try{if(R().isAccount&&R().isAccount())return false;}catch(e){}
 if(s.setupDone||(s.logs&&s.logs.length))return false;if(back&&!hs())return false;return true;}
/* Oct 21 (Eman: "apply everything he said in this video", Build in Public: simplify conversion pages): the start is 3 screens,
   not 5. 0 = what LOWiSPIKE is + why it helps + proof, 1 = your first name, 2 = first XP + free account. The how-you-play
   controls are taught in the app (misty-hints.js, misty-pad.js hints, the tutorial), not before the account. v:3 moves older saved progress. */
/* Oct 26 2026 (MAYA-HANDOFF 0.38): the Quick tour pill (quick-tour.js opens the promo video set in its VIDEO config, muted, Skip any time) */
function qtPill(){const Q=window.LowiQuickTour;return Q&&Q.label?'<button type="button" class="hs-qt" data-qt="open"><i aria-hidden="true">\u25B6</i>'+esc(Q.label(lang()))+'</button>':'';}
function html(){let st=hs();if(!st){st={v:3,step:0,seed:Math.floor(Math.random()*1e6),herb:'',user:''};hsSet(st);}
 if(st.v!==3){const o=+st.step||0;st.step=st.v===2?(o>=4?2:o>=1?1:0):(o>=3?2:o>=1?1:0);st.v=3;hsSet(st);}
 const step=Math.max(0,Math.min(2,+st.step||0)),herb=st.herb||MISTY,pick=window.LowiA2&&LowiA2.picker?LowiA2.picker():'';
 const top='<div class="hs-top">'+(step?'<button type="button" class="hs-back" data-hs="back" aria-label="'+esc(t('back'))+'">\u2039</button>':'<span></span>')+'<div class="hs-dots" aria-hidden="true">'+[0,1,2].map(i=>'<i'+(i<=step?' class="on"':'')+'></i>').join('')+'</div>'+(step?'<span></span>':pick)+'</div>';
 let body='';
 if(step===0)body='<div class="hs-scene" id="hsScene">'+herbArt(0,'',1)+'</div><div class="hs-copy"><p class="hs-over">'+esc(t('over'))+'</p><h1>'+esc(t('plantH'))+'</h1><p class="hs-p">'+esc(t('plantP'))+'</p>'+habits()+qtPill()+'</div>'+
  '<div class="hs-acts"><button type="button" class="r2-btn pri big" data-hs="plant">'+esc(t('plantBtn'))+'</button><button type="button" class="hs-link" data-r2a="signin">'+esc(t('have'))+'</button></div>';
 else if(step===1)body='<div class="hs-scene">'+herbArt(2,'',1)+'<div class="hs-bubble" role="status">'+esc(t('ask',{herb}))+'</div></div><div class="hs-copy"><p class="hs-over">'+esc(t('askOver'))+'</p>'+
  '<label class="hs-lbl" for="hsYou">'+esc(t('youLabel'))+'</label><input id="hsYou" class="hs-in" maxlength="24" autocomplete="given-name" enterkeyhint="done" value="'+esc(st.user||'')+'"><p class="hs-err" id="hsErr" role="alert"></p></div>'+
  '<div class="hs-acts"><button type="button" class="r2-btn pri big" data-hs="you">'+esc(t('askBtn'))+'</button></div>';
 else body='<div class="hs-scene rew">'+(reduce()?'':'<div class="hs-burst" aria-hidden="true">'+Array.from({length:12},(_,i)=>'<i style="--i:'+i+'"></i>').join('')+'</div>')+herbArt(3,'',1)+'<div class="hs-bubble" role="status">'+esc(t('rew',{name:st.user||'',herb}))+'</div></div>'+
  '<div class="hs-copy"><p class="hs-over">'+esc(t('rewOver'))+'</p><span class="hs-chip">'+ico('sparkle')+esc(t('chip'))+'</span></div>'+
  '<div class="hs-acts"><button type="button" class="r2-btn pri big" data-r2a="signup">'+esc(t('saveBtn',{herb}))+'</button><p class="hs-fine">'+esc(t('fine'))+'</p><button type="button" class="hs-link" data-r2a="signin">'+esc(t('have'))+'</button></div>';
 return '<div class="r2-start hs" data-hs-step="'+step+'" data-noi18n>'+top+body+'</div>';}
function gate(){return D.getElementById('r2gate');}
function paint(focus){const g=gate();if(!g)return;g.innerHTML=html();fillArt(0);const f=g.firstElementChild;if(f&&!reduce())f.classList.add('r2-swap');
 if(focus!==false){const i=g.querySelector('.hs-in');if(i&&matchMedia('(pointer:fine)').matches)setTimeout(()=>{try{i.focus();}catch(e){}},60);}}
function setHerbName(v){try{if(window.LowiHerbIdentity&&LowiHerbIdentity.setCustomName){LowiHerbIdentity.setCustomName(v);return;}}catch(e){}
 const s=S();if(s){s.herb=s.herb&&typeof s.herb==='object'?s.herb:{};s.herb.name=v;save();}}
function herbName(){try{if(window.LowiHerbIdentity&&LowiHerbIdentity.current){const c=LowiHerbIdentity.current();if(c&&c.name)return c.name;}}catch(e){}
 const s=S();if(s&&s.herb&&s.herb.name)return s.herb.name;const st=hs();return (st&&st.herb)||MISTY;}
function firstReward(){try{if(window.LowiHost&&LowiHost.award)LowiHost.award('herb-first',null,{amt:5,label:t('firstLeaf'),eventId:'herb-first:planted'});}catch(e){}}
function onGateClick(e){const b=e.target.closest('[data-hs]');if(!b||!b.closest('.r2-start.hs'))return;const a=b.getAttribute('data-hs'),st=hs()||{step:0,seed:0};
 e.preventDefault();
 if(a==='back'){st.step=Math.max(0,(+st.step||0)-1);hsSet(st);paint(false);return;}
 if(a==='plant'){const sc=D.getElementById('hsScene');const next=()=>{st.step=1;hsSet(st);paint();};
  if(reduce()||!sc){next();return;}b.disabled=true;const m=sc.querySelector('.hs-misty');if(m)m.classList.add('wake');setTimeout(next,750);return;}
 if(a==='shuffle'){st.seed=(+st.seed||0)+1+Math.floor(Math.random()*40);const cur=(D.getElementById('hsHerb')||{}).value;st.herb=C.suggestName(core(),st.seed,cur);hsSet(st);const i=D.getElementById('hsHerb');if(i){i.value=st.herb;if(!reduce()){i.classList.remove('pop');void i.offsetWidth;i.classList.add('pop');}}return;}
 if(a==='you'){const v=C.cleanName((D.getElementById('hsYou')||{}).value,30);if(!v){const er=D.getElementById('hsErr');if(er)er.textContent=t('needName');const i=D.getElementById('hsYou');if(i)i.focus();return;}
  st.user=v;st.step=2;hsSet(st);const s=S();if(s){s.user=s.user||{};s.user.name=v;save();}firstReward();paint(false);return;}}
function onGateKey(e){if(e.key!=='Enter')return;const i=e.target;if(!i||!i.classList||!i.classList.contains('hs-in'))return;e.preventDefault();const b=D.querySelector('.r2-start.hs [data-hs="you"]');if(b)b.click();}

/* ---------- 2. starter plan ---------- */
function plan(){const s=S();const p=s&&s.starter;return p&&p.v===2&&Array.isArray(p.actions)?p:null;}
function setPlan(p){const s=S();if(!s)return;s.starter=p;save();}
function facts(){let v={};try{v=window.LowiLiving&&LowiLiving.live?LowiLiving.live():{};}catch(e){}
 let fastH=0,best=0,short=false;const p=plan();
 try{const F=window.LowiFastStop;let f={};try{f=JSON.parse(localStorage.getItem('lowi_fast_v1')||'{}')||{};}catch(e){}
  const st=F&&F.startOf?+F.startOf():0;if(st&&st<Date.now())fastH=(Date.now()-st)/36e5;
  const k=dayKey(),hist=Array.isArray(f.hist)?f.hist:[];for(const r of hist){if(r&&dayKey(+r.e)===k)best=Math.max(best,+r.h||0);}
  const last=hist[hist.length-1];short=!!(last&&last.ok===false&&p&&+last.e>+p.created);}catch(e){}
 const s=S()||{},now=Date.now(),y=dayKey(now-864e5);
 const spike=!!(p&&(s.logs||[]).some(l=>l&&l.lvl==='high'&&+l.ts>+p.created&&now-+l.ts<36*36e5));
 const movedY=(s.ledger||[]).some(e=>e&&e.day===y&&/move|walk|workout|steps|dance/i.test((e.src||'')+' '+(e.label||'')));
 const age=p?Math.round((new Date(dayKey(now)).getTime()-new Date(dayKey(p.created)).getTime())/864e5):0;
 return Object.assign({},v,{fastH,fastBestTodayH:best,fastShortRecent:short,spikeRecent:spike,movedYesterday:movedY,planAgeDays:age});}
function status(p,f){f=f||facts();return p.actions.map(a=>({id:a.id,why:a.why,done:C.isDone(a.id,f)}));}
const AV=f=>({goal:(f&&f.waterGoal)||6});

/* deep links: each action opens its own module */
function spot(sel){let tries=0;const first=()=>{const el=D.querySelector(sel);const r=el&&el.getBoundingClientRect();
 /* Home may still be coming back (sheet closing, tab switch, tiles repainting): look again for a moment */
 if(!el||!r.width){if(++tries<12)setTimeout(first,150);return;}
 try{el.scrollIntoView({block:'center',behavior:reduce()?'auto':'smooth'});}catch(e){}el.classList.add('hs-spot');try{el.focus({preventScroll:true});}catch(e){}
 /* the living Home may repaint its tiles: keep the glow on whichever node is the tile now */
 const end=Date.now()+2400;const iv=setInterval(()=>{const n=D.querySelector(sel);if(Date.now()>=end){clearInterval(iv);D.querySelectorAll('.hs-spot').forEach(x=>x.classList.remove('hs-spot'));return;}if(n&&!n.classList.contains('hs-spot'))n.classList.add('hs-spot');},120);};
 setTimeout(first,200);}
const tile=k=>'#tab-home [data-lv-k="'+k+'"]';
function go(id){const a=C.ACTIONS[id];if(!a)return;try{if(R().closeAll)R().closeAll();}catch(e){}
 const H2=window.LowiHost;const tab=x=>{try{H2&&H2.go&&H2.go(x);}catch(e){}};
 switch(a.mod){
  case 'scan':try{if(window.LowiLiving&&LowiLiving.scan){tab('home');setTimeout(()=>LowiLiving.scan(),120);return;}}catch(e){}tab('scan');return;
  case 'meal':tab('home');setTimeout(()=>{const b=D.querySelector(tile('food'));if(b)b.click();},200);return;
  case 'water':tab('home');spot(tile('water'));return;
  case 'move':tab('move');return;
  case 'fast':tab('home');setTimeout(()=>{try{window.LowiFastStop&&LowiFastStop.open();}catch(e){}},200);return;
  case 'macros':tab('home');setTimeout(()=>{const b=D.querySelector(tile('macros'));if(b)b.click();},200);return;
 }}

/* the interview: intro, up to 4 optional questions, a short think, the result */
let IV=null;
function ivOpen(){if(IV&&IV.ov&&IV.ov.isConnected)return;if(!R().sheet)return;IV={step:-1,answers:{}};
 IV.ov=R().sheet('<div class="hs-iv" id="hsIv" data-noi18n></div>',{full:true,noClose:true,cls:'hs-ivov'});ivPaint();}
function ivClose(){if(IV&&IV.ov){try{R().close(IV.ov);}catch(e){}}IV=null;}
function ivPaint(){const el=D.getElementById('hsIv');if(!el||!IV)return;const herb=herbName(),Q=C.QUESTIONS,n=Q.length;let h='';
 if(IV.step===-1)h='<div class="hs-ivpane"><div class="hs-scene sm">'+herbArt(2)+'</div><p class="hs-over">'+esc(t('ivOver'))+'</p><h2>'+esc(t('ivH',{herb}))+'</h2><p class="hs-p">'+esc(t('ivP'))+'</p></div>'+
  '<div class="hs-acts"><button type="button" class="r2-btn pri big" data-hsi="start">'+esc(t('go'))+'</button><button type="button" class="hs-link" data-hsi="later">'+esc(t('notNow'))+'</button></div>';
 else if(IV.step<n){const q=C.questionText(Q[IV.step],lang()),cur=IV.answers[q.id];
  h='<div class="hs-ivtop"><button type="button" class="hs-back" data-hsi="back" aria-label="'+esc(t('back'))+'">\u2039</button><div class="hs-bar" role="progressbar" aria-valuemin="0" aria-valuemax="'+n+'" aria-valuenow="'+(IV.step+1)+'"><i style="--p:'+((IV.step+1)/n)+'"></i></div><button type="button" class="hs-skip" data-hsi="skip">'+esc(t('skipQ'))+'</button></div>'+
   '<div class="hs-ivpane q"><p class="hs-over">'+esc(q.over)+'</p><h2 id="hsQ">'+esc(q.q)+'</h2>'+(q.sub?'<p class="hs-p hs-qsub">'+esc(q.sub)+'</p>':'')+'<div class="hs-opts" role="radiogroup" aria-labelledby="hsQ">'+
   q.opts.map(o=>'<button type="button" class="hs-opt'+(cur===o.v?' on':'')+'" role="radio" aria-checked="'+(cur===o.v)+'" data-hsi="opt" data-v="'+esc(o.v)+'"><span>'+esc(o.t)+'</span><i aria-hidden="true"></i></button>').join('')+'</div></div>';}
 else if(IV.step===n)h='<div class="hs-ivpane think"><div class="hs-scene sm">'+herbArt(2,reduce()?'':'bob')+'</div><h2>'+esc(t('think',{herb}))+'</h2></div>';
 else{const p=IV.plan,f=facts();h='<div class="hs-ivpane res"><p class="hs-over">'+esc(t('ivOver'))+'</p><h2>'+esc(t('planH'))+'</h2><p class="hs-p">'+esc(t('planP'))+'</p><ol class="hs-res">'+
   p.actions.map(a=>'<li><span class="hs-ic">'+ico(C.ACTIONS[a.id].ic)+'</span><span><b>'+esc(C.actionText(a.id,lang(),AV(f)))+'</b><small>'+esc(wnm(C.whyText(a.why,lang())))+'</small></span></li>').join('')+'</ol></div>'+
   '<div class="hs-acts"><button type="button" class="r2-btn pri big" data-hsi="done">'+esc(t('planBtn'))+'</button></div>';}
 el.innerHTML=h;fillArt(0);el.setAttribute('data-step',IV.step);el.setAttribute('data-back-step',IV.step);const f=el.querySelector('.hs-opt.on,.hs-opt,[data-hsi="start"],[data-hsi="done"]');if(f&&matchMedia('(pointer:fine)').matches)try{f.focus({preventScroll:true});}catch(e){}}
function ivNext(){if(!IV)return;IV.step++;if(IV.step===C.QUESTIONS.length){IV.plan=C.newPlan(IV.answers);ivPaint();const n=IV.step;setTimeout(()=>{if(IV&&IV.step===n){IV.step++;ivPaint();}},reduce()?250:1300);return;}ivPaint();}
function ivLater(){const p=plan();if(!p){const s=S();if(s){s.starter={v:2,skipped:true,actions:[],asked:{},created:Date.now(),hidden:true};save();}}ivClose();try{R().toast&&R().toast(t('skipped'));}catch(e){}refresh();}
/* Oct 26 (bug hunt run 51, BH-050 sibling): the interview sheet has no close button (noClose) and had no Escape, so Safari's back
   swipe (back-swipe.js sends Escape) changed nothing and left LOWiSPIKE. Escape now does what the sheet's own buttons do: one
   question back (the \u2039 button), from the plan back to the last question, and on the first screen "Not now". The step sits in
   data-back-step, so back-swipe.js sees that back did something. */
function ivEsc(e){if(e.key!=='Escape'||!IV||!IV.ov||!IV.ov.isConnected)return;e.stopPropagation();const n=C.QUESTIONS.length;
 if(IV.step<=-1){pendClear();ivLater();return;}IV.step=IV.step>=n?n-1:IV.step-1;ivPaint();}
D.addEventListener('keydown',ivEsc,true);
function onIvClick(e){const b=e.target.closest('[data-hsi]');if(!b||!IV)return;const a=b.getAttribute('data-hsi');e.preventDefault();
 if(a==='start'){IV.step=0;ivPaint();return;}
 if(a==='later'){pendClear();ivLater();return;}
 if(a==='back'){IV.step=Math.max(-1,IV.step-1);ivPaint();return;}
 if(a==='skip'){delete IV.answers[C.QUESTIONS[IV.step].id];ivNext();return;}
 if(a==='opt'){IV.answers[C.QUESTIONS[IV.step].id]=b.getAttribute('data-v');b.parentNode.querySelectorAll('.hs-opt').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-checked',x===b);});setTimeout(ivNext,reduce()?60:220);return;}
 if(a==='done'){const p=IV.plan;p.asked={};setPlan(p);pendClear();try{const ft=C.fastTarget&&C.fastTarget(IV.answers),FK='lowi_fast_v1';if(ft){const fs=JSON.parse(localStorage.getItem(FK)||'{}')||{};fs.target=ft;localStorage.setItem(FK,JSON.stringify(fs));window.LowiFast&&LowiFast.refresh&&LowiFast.refresh();}}catch(e){}ivClose();try{window.LowiHost&&LowiHost.go('home');}catch(e){}try{R().toast&&R().toast(t('saved'));}catch(e){}refresh();setTimeout(refresh,400);setTimeout(refresh,1000);return;}}

/* Today: one row; the sheet holds the steps, "Why this?", Go, Change, and the friction question when it's due */
function rowHTML(p){const f=facts(),st=status(p,f),done=st.filter(x=>x.done).length,next=st.find(x=>!x.done),q=C.frictionDue(p,f),n=st.length,herb=herbName();
 return '<button type="button" id="hsPlan" class="hs-row'+(done===n?' all':'')+'" data-hs-open="plan" data-noi18n aria-label="'+esc(t('rowT')+' '+done+'/'+n+(next?', '+C.actionText(next.id,lang(),AV(f)):''))+'">'+
  '<span class="hs-ring" style="--p:'+(n?done/n:0).toFixed(3)+'"><b class="num">'+done+'/'+n+'</b></span><span class="hs-rt"><small>'+esc(t('rowT'))+'</small><b>'+esc(q?t('rowQ',{herb}):next?C.actionText(next.id,lang(),AV(f)):t('rowAll'))+'</b></span>'+(q?'<i class="hs-qdot" aria-hidden="true"></i>':'')+'<span class="hs-chev" aria-hidden="true">\u203a</span></button>';}
function sheetBody(){const p=plan();if(!p)return '';const f=facts(),st=status(p,f),q=C.frictionDue(p,f),herb=herbName();let h='';
 if(q){const ft=C.frictionText(q,lang());h+='<div class="hs-ask"><div class="hs-askh">'+herbArt(2,'mini')+'<div><p class="hs-over">'+esc(ft.over)+'</p><b>'+esc(ft.q)+'</b></div></div><div class="hs-chips">'+
  ft.opts.map(o=>'<button type="button" class="hs-chipb" data-hsp="fr" data-k="'+q+'" data-v="'+esc(o.v)+'">'+esc(o.t)+'</button>').join('')+'<button type="button" class="hs-chipb ghost" data-hsp="fr" data-k="'+q+'" data-v="">'+esc(t('qNot'))+'</button></div></div>';}
 if(PICK!=null){const alts=C.alternatives(p);h+='<div class="hs-pick"><b>'+esc(t('pickOne'))+'</b>'+alts.map(id=>'<button type="button" class="hs-alt" data-hsp="pick" data-id="'+id+'"><span class="hs-ic">'+ico(C.ACTIONS[id].ic)+'</span>'+esc(C.actionText(id,lang(),AV(f)))+'</button>').join('')+'<button type="button" class="hs-link" data-hsp="cancel">'+esc(t('cancel'))+'</button></div>';}
 h+='<ol class="hs-steps">'+st.map((a,i)=>'<li class="hs-step'+(a.done?' done':'')+'"><div class="hs-sline"><span class="hs-ic">'+(a.done?ico('check')||'\u2713':ico(C.ACTIONS[a.id].ic))+'</span><b>'+esc(C.actionText(a.id,lang(),AV(f)))+'</b>'+
  (a.done?'<span class="hs-done">'+esc(t('doneLbl'))+'</span>':'<button type="button" class="hs-go" data-hsp="go" data-id="'+a.id+'">'+esc(t('goBtn'))+' \u203a</button>')+'</div>'+
  '<details class="hs-why"><summary>'+esc(t('why'))+'</summary><p>'+esc(wnm(C.whyText(a.why,lang())))+'</p></details>'+
  '<div class="hs-edit"><button type="button" class="hs-mini" data-hsp="change" data-i="'+i+'">'+esc(t('change'))+'</button>'+(st.length>3?'<button type="button" class="hs-mini" data-hsp="remove" data-i="'+i+'">'+esc(t('remove'))+'</button>':'')+'</div></li>').join('')+'</ol>'+
  (st.length<4&&C.alternatives(p).length?'<button type="button" class="hs-mini add" data-hsp="add">+ '+esc(t('addOne'))+'</button>':'')+
  (st.every(a=>a.done)?'<p class="hs-alldone">'+esc(t('allDone',{herb}))+'</p>':'')+
  '<div class="hs-foot"><button type="button" class="hs-link" data-hsp="redo">'+esc(t('redo'))+'</button><button type="button" class="hs-link" data-hsp="hide">'+esc(p.hidden?t('show'):t('hide'))+'</button></div>';
 return h;}
let PICK=null;
function openSheet(){PICK=null;const p=plan();if(!p||!R().sheet)return;R().sheet('<div class="hs-sh" data-noi18n><h2 class="hs-shh">'+esc(t('rowT'))+'</h2><div id="hsSheet">'+sheetBody()+'</div></div>');}
function sheetPaint(){const el=D.getElementById('hsSheet');if(el)el.innerHTML=sheetBody();refresh();}
function onSheetClick(e){const b=e.target.closest('[data-hsp]');if(!b)return;const a=b.getAttribute('data-hsp'),p=plan();if(!p)return;e.preventDefault();
 if(a==='go'){go(b.getAttribute('data-id'));return;}
 if(a==='fr'){C.answerFriction(p,b.getAttribute('data-k'),b.getAttribute('data-v')||null);setPlan(p);if(b.getAttribute('data-v'))try{R().toast&&R().toast(t('qThanks'));}catch(e){}sheetPaint();return;}
 if(a==='change'){PICK=+b.getAttribute('data-i');sheetPaint();const pk=D.querySelector('.hs-pick');if(pk)try{pk.scrollIntoView({block:'nearest'});}catch(e){}return;}
 if(a==='add'){PICK=-1;sheetPaint();return;}
 if(a==='cancel'){PICK=null;sheetPaint();return;}
 if(a==='pick'){const id=b.getAttribute('data-id');if(PICK===-1)C.addAction(p,id);else C.replace(p,PICK,id);PICK=null;setPlan(p);sheetPaint();return;}
 if(a==='remove'){C.removeAction(p,+b.getAttribute('data-i'));setPlan(p);sheetPaint();return;}
 if(a==='redo'){try{R().closeAll&&R().closeAll();}catch(e){}setTimeout(ivOpen,120);return;}
 if(a==='hide'){p.hidden=!p.hidden;setPlan(p);sheetPaint();return;}}

/* row on Today (after the living-home tiles) and the card in Profile > About you */
let busy=false;
/* Oct 16 speed pass: the drawings number their gradient ids (lh26, lh27, lc5x...) on every render, so the signature changed every time,
   the card rebuilt itself, its own observer saw that and rebuilt it again ~6x a second forever. Ids no longer count. */
const sig=h=>{h=String(h).replace(/\b(?:hs|lh|lc)\d+(?:x\d+)?/g,'hs');let x=0;for(let i=0;i<h.length;i++)x=(x*31+h.charCodeAt(i))|0;return String(x);};
function refresh(){if(busy)return;busy=true;try{
 const home=D.getElementById('tab-home'),p=plan();const old=D.getElementById('hsPlan');
 if(home){if(p&&!p.hidden&&p.actions.length){const host=home.querySelector('.sp-log')||home.querySelector('#spHome');const html=rowHTML(p);
   if(host){if(old&&old.parentNode===host){if(old.getAttribute('data-sig')!==sig(html)){const tmp=D.createElement('div');tmp.innerHTML=html;tmp.firstChild.setAttribute('data-sig',sig(html));old.replaceWith(tmp.firstChild);}}
    else{if(old)old.remove();const tmp=D.createElement('div');tmp.innerHTML=html;tmp.firstChild.setAttribute('data-sig',sig(html));const dash=host.querySelector('#lvDash');if(dash&&dash.parentNode===host)dash.after(tmp.firstChild);else host.appendChild(tmp.firstChild);}}}
  else if(old)old.remove();}
 const prof=D.getElementById('tab-profile');if(prof){const pf=prof.querySelector('.r3a-pf');const ex=D.getElementById('hsProf');
  if(pf){const has=p&&!p.skipped&&p.actions.length;const html='<div class="card hs-pcard" id="hsProf" data-noi18n><div class="hs-pch">'+herbArt(2,'mini')+'<div><b>'+esc(t('profT'))+'</b><small>'+esc(has?t('profHas',{n:p.actions.length}):t('profNone'))+'</small></div></div><div class="hs-pcb">'+
    (has?'<button type="button" class="r2-btn" data-hs-open="plan">'+esc(t('rowT'))+'</button><button type="button" class="r2-btn ghost" data-hs-open="redo">'+esc(t('redo'))+'</button>':'<button type="button" class="r2-btn pri" data-hs-open="redo">'+esc(t('profStart'))+'</button>')+'</div></div>';
   const sg=sig(html);if(ex&&ex.previousElementSibling===pf){if(ex.getAttribute('data-sig')!==sg){const g=ex.getAttribute('data-g2e');ex.outerHTML=html;const n=D.getElementById('hsProf');if(n){n.setAttribute('data-sig',sg);if(g)n.setAttribute('data-g2e',g);}}}else{if(ex)ex.remove();pf.insertAdjacentHTML('afterend',html);const n=D.getElementById('hsProf');if(n){n.setAttribute('data-sig',sg);const g=pf.getAttribute('data-g2e');if(g)n.setAttribute('data-g2e',g);}}}}
}finally{busy=false;}}
let RT=0;const soon=()=>{clearTimeout(RT);RT=setTimeout(refresh,120);};

/* after the first-run setup: offer the questions once (never for people who already finished setup before) */
/* BH-010 (Oct 19 2026): the questions only lived in memory, so a reload (or iOS dropping the app) between the end of setup and
   "Make my plan" / "Not now" lost them for good: setupDone was saved, no plan, and nothing ever offered them again. Now afterSetup marks
   them pending (a lowispike.* key, so it is in the account backup) until a plan or "Not now" is saved, and the next start reopens them
   once Home is quiet. Accounts that finished setup before this have no mark and are never asked. */
const PEND='lowispike.hs-pending.v1';
function pendGet(){try{return !!localStorage.getItem(PEND);}catch(e){return false;}}
function pendSet(){try{localStorage.setItem(PEND,String(Date.now()));}catch(e){}}
function pendClear(){try{localStorage.removeItem(PEND);}catch(e){}}
function afterSetup(){try{localStorage.removeItem(KEY);}catch(e){}pendSet();if(plan()||(S()||{}).starter)return;setTimeout(ivOpen,reduce()?150:650);}
function resumeQuiet(){if(D.hidden)return false;try{if(R().gateUp&&R().gateUp())return false;}catch(e){}
 const home=D.getElementById('tab-home');if(home&&!home.classList.contains('active'))return false;
 if(D.querySelector('.r2-ov:not(.off),#ltTour'))return false;
 try{const T=window.LowiTutorial;if(T&&T.isOn&&T.isOn())return false;if(T&&T.busyBy&&T.busyBy())return false;}catch(e){}
 return true;}
let RQ=0;
/* true = nothing more to do (stop polling) */
function resumeTick(now){if(!pendGet())return true;const s=S();if(!s)return false;
 if(s.starter){pendClear();return true;}
 if(!s.setupDone)return false;
 if(IV&&IV.ov&&IV.ov.isConnected)return true;
 if(!resumeQuiet()){RQ=0;return false;}
 now=now||Date.now();if(!RQ){RQ=now;return false;}if(now-RQ<800)return false;
 ivOpen();return !!(IV&&IV.ov);}

/* ---------- wiring ---------- */
D.addEventListener('click',e=>{onGateClick(e);onIvClick(e);onSheetClick(e);const o=e.target.closest('[data-hs-open]');if(o){e.preventDefault();const k=o.getAttribute('data-hs-open');if(k==='plan')openSheet();else if(k==='redo')ivOpen();}},false);
D.addEventListener('keydown',onGateKey,true);
['lowi:reward','lowi:care','lowi:meal-logged','lowi:layout'].forEach(ev=>window.addEventListener(ev,soon));
D.addEventListener('visibilitychange',()=>{if(!D.hidden)soon();});
try{new MutationObserver(ms=>{if(busy)return;for(const m of ms){const tg=m.target;if(!tg||!tg.closest||tg.closest('#hsPlan,#hsProf'))continue;if(tg.closest('#tab-home,#tab-profile')||tg.id==='tab-home'||tg.id==='tab-profile'){soon();return;}}}).observe(D.body,{childList:true,subtree:true});}catch(e){}
try{new MutationObserver(()=>{if(D.querySelector('.r2-start.hs'))paint(false);if(IV)ivPaint();if(D.getElementById('hsSheet'))sheetPaint();soon();}).observe(H,{attributes:true,attributeFilter:['lang']});}catch(e){}
setInterval(()=>{if(!D.hidden&&D.getElementById('hsPlan'))refresh();},60000);

window.LowiHerbStart={want,html,paint,afterSetup,openInterview:ivOpen,openPlan:openSheet,refresh,facts,go,plan,resumeTick};
/* BH-010: questions cut off by a reload come back on the next start */
{const t0=Date.now();const RI=setInterval(()=>{let stop=true;try{stop=resumeTick();}catch(e){}if(stop||Date.now()-t0>600000)clearInterval(RI);},400);}
/* the gate may already be up with the old start page: repaint it herb-first */
try{const g=gate();if(g&&R().gateUp&&R().gateUp()&&g.querySelector('.r2-start')&&!g.querySelector('.r2-start.form,.r2-start.hs,input')&&want(!!(S()&&S().user&&S().user.name)))R().showGate('home');}catch(e){}
soon();
})();
