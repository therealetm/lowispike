/* LOWiSPIKE herb-first start + starter plan (Oct 15, 2026).
   1. Herb-first: a new user plants and names the herb before the account form; the herb asks their name; a first small reward lands.
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
 en:{over:'YOUR HERB',plantH:'Every glow-up starts with a seed.',plantP:'Plant your herb. It grows every time you look after yourself.',plantBtn:'Plant my herb',have:'I already have an account',back:'Back',
  nameOver:'IT SPROUTED',nameH:'What should your herb be called?',nameLabel:'Herb name',shuffle:'Shuffle',later:'You can change this later.',nameBtn:'That\u2019s the one',
  askOver:'HELLO',ask:'Hi, I\u2019m {herb}! Thanks for planting me. And what\u2019s your name?',youLabel:'Your first name',askBtn:'Nice to meet you',needName:'Tell {herb} your name first.',
  rewOver:'FIRST LEAF',rew:'{name}! When you look after yourself, you look after me too. Let\u2019s grow together.',chip:'+5 XP \u00b7 first leaf',saveBtn:'Keep {herb} safe: free account',fine:'Free. Takes 20 seconds.',firstLeaf:'First leaf',
  ivOver:'STARTER PLAN',ivH:'{herb} wants to grow with you.',ivP:'Up to 4 quick questions so your first steps fit your day. Every one is optional. No health questions.',go:'Let\u2019s go',notNow:'Not now',skipQ:'Skip',
  think:'{herb} is picking your first steps\u2026',planH:'Your next steps',planP:'They sit on Today. Each one opens the part of the app that does it.',planBtn:'Let\u2019s do it',
  rowT:'Next steps',rowAll:'All done for today',rowQ:'{herb} has a question',why:'Why this?',goBtn:'Go',change:'Change',remove:'Remove',addOne:'Add a step',doneLbl:'Done today',pickOne:'Pick a step',cancel:'Cancel',
  redo:'Redo the questions',hide:'Hide from Today',show:'Show on Today',profT:'Starter plan',profNone:'4 optional questions with your herb. It sets 3 or 4 next steps on Today.',profHas:'{n} next steps on Today',profStart:'Start',
  skipped:'Any time: Profile \u203a About you \u203a Starter plan.',saved:'Your next steps are on Today.',qNot:'Not now',qThanks:'Got it. I changed your steps.',allDone:'All steps done. {herb} is glowing.'},
 de:{over:'DEIN KRAUT',plantH:'Jede Verwandlung beginnt mit einem Samen.',plantP:'Pflanz dein Kraut. Es w\u00e4chst jedes Mal, wenn du gut f\u00fcr dich sorgst.',plantBtn:'Mein Kraut pflanzen',have:'Ich habe schon ein Konto',back:'Zur\u00fcck',
  nameOver:'ES KEIMT',nameH:'Wie soll dein Kraut hei\u00dfen?',nameLabel:'Name des Krauts',shuffle:'Mischen',later:'Du kannst das sp\u00e4ter \u00e4ndern.',nameBtn:'Passt perfekt',
  askOver:'HALLO',ask:'Hi, ich bin {herb}! Danke, dass du mich gepflanzt hast. Und wie hei\u00dft du?',youLabel:'Dein Vorname',askBtn:'Freut mich',needName:'Sag {herb} zuerst deinen Namen.',
  rewOver:'ERSTES BLATT',rew:'{name}! Wenn du gut f\u00fcr dich sorgst, sorgst du auch f\u00fcr mich. Lass uns zusammen wachsen.',chip:'+5 XP \u00b7 erstes Blatt',saveBtn:'{herb} sichern: kostenloses Konto',fine:'Kostenlos. Dauert 20 Sekunden.',firstLeaf:'Erstes Blatt',
  ivOver:'STARTPLAN',ivH:'{herb} will mit dir wachsen.',ivP:'Bis zu 4 kurze Fragen, damit deine ersten Schritte zu deinem Tag passen. Alle freiwillig. Keine Gesundheitsfragen.',go:'Los geht\u2019s',notNow:'Jetzt nicht',skipQ:'\u00dcberspringen',
  think:'{herb} sucht deine ersten Schritte aus\u2026',planH:'Deine n\u00e4chsten Schritte',planP:'Sie stehen auf Heute. Jeder \u00f6ffnet den Teil der App, der ihn erledigt.',planBtn:'Los geht\u2019s',
  rowT:'N\u00e4chste Schritte',rowAll:'Heute alles geschafft',rowQ:'{herb} hat eine Frage',why:'Warum das?',goBtn:'Los',change:'\u00c4ndern',remove:'Entfernen',addOne:'Schritt hinzuf\u00fcgen',doneLbl:'Heute erledigt',pickOne:'Schritt ausw\u00e4hlen',cancel:'Abbrechen',
  redo:'Fragen neu beantworten',hide:'Auf Heute ausblenden',show:'Auf Heute zeigen',profT:'Startplan',profNone:'4 freiwillige Fragen mit deinem Kraut. Daraus werden 3 oder 4 n\u00e4chste Schritte auf Heute.',profHas:'{n} n\u00e4chste Schritte auf Heute',profStart:'Starten',
  skipped:'Jederzeit: Profil \u203a \u00dcber dich \u203a Startplan.',saved:'Deine n\u00e4chsten Schritte stehen auf Heute.',qNot:'Jetzt nicht',qThanks:'Verstanden. Ich habe deine Schritte angepasst.',allDone:'Alle Schritte geschafft. {herb} leuchtet.'},
 es:{over:'TU HIERBA',plantH:'Todo cambio empieza con una semilla.',plantP:'Planta tu hierba. Crece cada vez que te cuidas.',plantBtn:'Plantar mi hierba',have:'Ya tengo una cuenta',back:'Atr\u00e1s',
  nameOver:'\u00a1BROT\u00d3!',nameH:'\u00bfC\u00f3mo se llamar\u00e1 tu hierba?',nameLabel:'Nombre de la hierba',shuffle:'Otro',later:'Puedes cambiarlo despu\u00e9s.',nameBtn:'Ese es',
  askOver:'HOLA',ask:'\u00a1Hola, soy {herb}! Gracias por plantarme. \u00bfY t\u00fa c\u00f3mo te llamas?',youLabel:'Tu nombre',askBtn:'Encantado',needName:'Dile primero tu nombre a {herb}.',
  rewOver:'PRIMERA HOJA',rew:'\u00a1{name}! Cuando te cuidas, tambi\u00e9n me cuidas a m\u00ed. Crezcamos juntos.',chip:'+5 XP \u00b7 primera hoja',saveBtn:'Protege a {herb}: cuenta gratis',fine:'Gratis. Tarda 20 segundos.',firstLeaf:'Primera hoja',
  ivOver:'PLAN INICIAL',ivH:'{herb} quiere crecer contigo.',ivP:'Hasta 4 preguntas r\u00e1pidas para que tus primeros pasos encajen en tu d\u00eda. Todas opcionales. Sin preguntas de salud.',go:'Vamos',notNow:'Ahora no',skipQ:'Saltar',
  think:'{herb} est\u00e1 eligiendo tus primeros pasos\u2026',planH:'Tus pr\u00f3ximos pasos',planP:'Est\u00e1n en Hoy. Cada uno abre la parte de la app que lo hace.',planBtn:'\u00a1A por ello!',
  rowT:'Pr\u00f3ximos pasos',rowAll:'Todo hecho hoy',rowQ:'{herb} tiene una pregunta',why:'\u00bfPor qu\u00e9?',goBtn:'Ir',change:'Cambiar',remove:'Quitar',addOne:'A\u00f1adir paso',doneLbl:'Hecho hoy',pickOne:'Elige un paso',cancel:'Cancelar',
  redo:'Repetir las preguntas',hide:'Ocultar de Hoy',show:'Mostrar en Hoy',profT:'Plan inicial',profNone:'4 preguntas opcionales con tu hierba. Crea 3 o 4 pr\u00f3ximos pasos en Hoy.',profHas:'{n} pr\u00f3ximos pasos en Hoy',profStart:'Empezar',
  skipped:'Cuando quieras: Perfil \u203a Sobre ti \u203a Plan inicial.',saved:'Tus pr\u00f3ximos pasos est\u00e1n en Hoy.',qNot:'Ahora no',qThanks:'Entendido. Ajust\u00e9 tus pasos.',allDone:'Todos los pasos hechos. {herb} brilla.'}
};
const t=(k,o)=>C.fmt((TX[lang()]||TX.en)[k]||TX.en[k]||k,o);

/* ---------- herb art: own drawing, LOWiSPIKE glow ---------- */
let ART=0;
function herbArt(stage,cls){const u='hs'+(++ART);
 const leaves=stage>=1?'<g class="hs-sprout"><path class="hs-stem" d="M60 92 C60 80 60 70 60 60"/>'+
  '<path fill="url(#'+u+'l)" class="hs-leaf hs-l1" d="M60 66 C48 64 40 54 40 44 C52 44 60 54 60 66Z"/><path fill="url(#'+u+'l)" class="hs-leaf hs-l2" d="M60 62 C72 60 82 50 82 38 C68 38 60 50 60 62Z"/>'+
  (stage>=3?'<path fill="url(#'+u+'l)" class="hs-leaf hs-l3" d="M60 76 C70 76 78 70 80 62 C70 60 62 66 60 76Z"/>':'')+
  (stage>=2?'<g class="hs-face"><circle cx="53" cy="104" r="2.6"/><circle cx="67" cy="104" r="2.6"/><path d="M55 111 Q60 115 65 111"/></g>':'')+'</g>'
  :'<g class="hs-seed"><ellipse cx="60" cy="88" rx="7" ry="9"/><path d="M60 80 C62 84 62 90 60 96"/></g>';
 return '<svg class="hs-art '+(cls||'')+'" viewBox="0 0 120 140" aria-hidden="true"><defs><linearGradient id="'+u+'p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b3557"/><stop offset="1" stop-color="#141a33"/></linearGradient>'+
  '<linearGradient id="'+u+'l" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8dffc4"/><stop offset="1" stop-color="#2fcf8f"/></linearGradient><radialGradient id="'+u+'g"><stop offset="0" stop-color="#5cffc0" stop-opacity=".45"/><stop offset="1" stop-color="#5cffc0" stop-opacity="0"/></radialGradient></defs>'+
  '<circle class="hs-glow" cx="60" cy="80" r="52" fill="url(#'+u+'g)"/><ellipse cx="60" cy="132" rx="30" ry="4" fill="#000" opacity=".35"/>'+
  '<path d="M30 92 H90 L84 128 Q83 132 79 132 H41 Q37 132 36 128Z" fill="url(#'+u+'p)" stroke="rgba(140,220,255,.45)" stroke-width="1.4"/><rect x="26" y="86" width="68" height="10" rx="5" fill="#222b4a" stroke="rgba(140,220,255,.6)" stroke-width="1.4"/>'+
  '<ellipse cx="60" cy="91" rx="30" ry="3" fill="#3a2a20" opacity=".9"/>'+leaves+'</svg>';}

/* ---------- 1. herb-first start (inside the sign-in gate) ---------- */
function hs(){try{return JSON.parse(localStorage.getItem(KEY)||'null')||null;}catch(e){return null;}}
function hsSet(o){try{localStorage.setItem(KEY,JSON.stringify(o));}catch(e){}}
function core(){return window.LowiHerbIdentityCore||null;}
function want(back){const s=S();if(!s)return false;try{if(R().isAccount&&R().isAccount())return false;}catch(e){}
 if(s.setupDone||(s.logs&&s.logs.length))return false;if(back&&!hs())return false;return true;}
function html(){let st=hs();if(!st){st={step:0,seed:Math.floor(Math.random()*1e6),herb:'',user:''};hsSet(st);}
 const step=Math.max(0,Math.min(3,+st.step||0)),herb=st.herb||C.suggestName(core(),st.seed),pick=window.LowiA2&&LowiA2.picker?LowiA2.picker():'';
 const top='<div class="hs-top">'+(step?'<button type="button" class="hs-back" data-hs="back" aria-label="'+esc(t('back'))+'">\u2039</button>':'<span></span>')+'<div class="hs-dots" aria-hidden="true">'+[0,1,2,3].map(i=>'<i'+(i<=step?' class="on"':'')+'></i>').join('')+'</div>'+(step?'<span></span>':pick)+'</div>';
 let body='';
 if(step===0)body='<div class="hs-scene" id="hsScene">'+herbArt(0)+'</div><div class="hs-copy"><p class="hs-over">'+esc(t('over'))+'</p><h1>'+esc(t('plantH'))+'</h1><p class="hs-p">'+esc(t('plantP'))+'</p></div>'+
  '<div class="hs-acts"><button type="button" class="r2-btn pri big" data-hs="plant">'+esc(t('plantBtn'))+'</button><button type="button" class="hs-link" data-r2a="signin">'+esc(t('have'))+'</button></div>';
 else if(step===1)body='<div class="hs-scene">'+herbArt(1)+'</div><div class="hs-copy"><p class="hs-over">'+esc(t('nameOver'))+'</p><h1>'+esc(t('nameH'))+'</h1>'+
  '<div class="hs-namebox"><label class="hs-lbl" for="hsHerb">'+esc(t('nameLabel'))+'</label><div class="hs-namerow"><input id="hsHerb" class="hs-in" maxlength="24" autocomplete="off" enterkeyhint="done" value="'+esc(herb)+'"><button type="button" class="hs-shuf" data-hs="shuffle">'+ico('repeat')+'<span>'+esc(t('shuffle'))+'</span></button></div><p class="hs-fine">'+esc(t('later'))+'</p></div></div>'+
  '<div class="hs-acts"><button type="button" class="r2-btn pri big" data-hs="name">'+esc(t('nameBtn'))+'</button></div>';
 else if(step===2)body='<div class="hs-scene">'+herbArt(2)+'<div class="hs-bubble" role="status">'+esc(t('ask',{herb}))+'</div></div><div class="hs-copy"><p class="hs-over">'+esc(t('askOver'))+'</p>'+
  '<label class="hs-lbl" for="hsYou">'+esc(t('youLabel'))+'</label><input id="hsYou" class="hs-in" maxlength="24" autocomplete="given-name" enterkeyhint="done" value="'+esc(st.user||'')+'"><p class="hs-err" id="hsErr" role="alert"></p></div>'+
  '<div class="hs-acts"><button type="button" class="r2-btn pri big" data-hs="you">'+esc(t('askBtn'))+'</button></div>';
 else body='<div class="hs-scene rew">'+(reduce()?'':'<div class="hs-burst" aria-hidden="true">'+Array.from({length:12},(_,i)=>'<i style="--i:'+i+'"></i>').join('')+'</div>')+herbArt(3)+'<div class="hs-bubble" role="status">'+esc(t('rew',{name:st.user||'',herb}))+'</div></div>'+
  '<div class="hs-copy"><p class="hs-over">'+esc(t('rewOver'))+'</p><span class="hs-chip">'+ico('leaf')+esc(t('chip'))+'</span></div>'+
  '<div class="hs-acts"><button type="button" class="r2-btn pri big" data-r2a="signup">'+esc(t('saveBtn',{herb}))+'</button><p class="hs-fine">'+esc(t('fine'))+'</p><button type="button" class="hs-link" data-r2a="signin">'+esc(t('have'))+'</button></div>';
 return '<div class="r2-start hs" data-hs-step="'+step+'" data-noi18n><div class="r2-orbs" aria-hidden="true"><i></i><i></i><i></i></div>'+top+body+'</div>';}
function gate(){return D.getElementById('r2gate');}
function paint(focus){const g=gate();if(!g)return;g.innerHTML=html();const f=g.firstElementChild;if(f&&!reduce())f.classList.add('r2-swap');
 if(focus!==false){const i=g.querySelector('.hs-in');if(i&&matchMedia('(pointer:fine)').matches)setTimeout(()=>{try{i.focus();}catch(e){}},60);}}
function setHerbName(v){try{if(window.LowiHerbIdentity&&LowiHerbIdentity.setCustomName){LowiHerbIdentity.setCustomName(v);return;}}catch(e){}
 const s=S();if(s){s.herb=s.herb&&typeof s.herb==='object'?s.herb:{};s.herb.name=v;save();}}
function herbName(){try{if(window.LowiHerbIdentity&&LowiHerbIdentity.current){const c=LowiHerbIdentity.current();if(c&&c.name)return c.name;}}catch(e){}
 const s=S();if(s&&s.herb&&s.herb.name)return s.herb.name;const st=hs();return (st&&st.herb)||(lang()==='de'?'dein Kraut':lang()==='es'?'tu hierba':'your herb');}
function firstReward(){try{if(window.LowiHost&&LowiHost.award)LowiHost.award('herb-first',null,{amt:5,label:t('firstLeaf'),eventId:'herb-first:planted'});}catch(e){}}
function onGateClick(e){const b=e.target.closest('[data-hs]');if(!b||!b.closest('.r2-start.hs'))return;const a=b.getAttribute('data-hs'),st=hs()||{step:0,seed:0};
 e.preventDefault();
 if(a==='back'){st.step=Math.max(0,(+st.step||0)-1);hsSet(st);paint(false);return;}
 if(a==='plant'){const sc=D.getElementById('hsScene');const next=()=>{st.step=1;st.herb=st.herb||C.suggestName(core(),st.seed);hsSet(st);paint();};
  if(reduce()||!sc){next();return;}b.disabled=true;sc.innerHTML=herbArt(1,'grow');setTimeout(next,1100);return;}
 if(a==='shuffle'){st.seed=(+st.seed||0)+1+Math.floor(Math.random()*40);const cur=(D.getElementById('hsHerb')||{}).value;st.herb=C.suggestName(core(),st.seed,cur);hsSet(st);const i=D.getElementById('hsHerb');if(i){i.value=st.herb;if(!reduce()){i.classList.remove('pop');void i.offsetWidth;i.classList.add('pop');}}return;}
 if(a==='name'){const v=C.cleanName((D.getElementById('hsHerb')||{}).value)||C.suggestName(core(),st.seed);st.herb=v;st.step=2;hsSet(st);setHerbName(v);paint();return;}
 if(a==='you'){const v=C.cleanName((D.getElementById('hsYou')||{}).value,30);if(!v){const er=D.getElementById('hsErr');if(er)er.textContent=t('needName',{herb:st.herb||herbName()});const i=D.getElementById('hsYou');if(i)i.focus();return;}
  st.user=v;st.step=3;hsSet(st);const s=S();if(s){s.user=s.user||{};s.user.name=v;save();}firstReward();paint(false);return;}}
function onGateKey(e){if(e.key!=='Enter')return;const i=e.target;if(!i||!i.classList||!i.classList.contains('hs-in'))return;e.preventDefault();const b=D.querySelector('.r2-start.hs [data-hs="name"],.r2-start.hs [data-hs="you"]');if(b)b.click();}

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
const AV=f=>({goal:(f&&f.waterGoal)||8});

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
   p.actions.map(a=>'<li><span class="hs-ic">'+ico(C.ACTIONS[a.id].ic)+'</span><span><b>'+esc(C.actionText(a.id,lang(),AV(f)))+'</b><small>'+esc(C.whyText(a.why,lang()))+'</small></span></li>').join('')+'</ol></div>'+
   '<div class="hs-acts"><button type="button" class="r2-btn pri big" data-hsi="done">'+esc(t('planBtn'))+'</button></div>';}
 el.innerHTML=h;el.setAttribute('data-step',IV.step);const f=el.querySelector('.hs-opt.on,.hs-opt,[data-hsi="start"],[data-hsi="done"]');if(f&&matchMedia('(pointer:fine)').matches)try{f.focus({preventScroll:true});}catch(e){}}
function ivNext(){if(!IV)return;IV.step++;if(IV.step===C.QUESTIONS.length){IV.plan=C.newPlan(IV.answers);ivPaint();setTimeout(()=>{if(IV){IV.step++;ivPaint();}},reduce()?250:1300);return;}ivPaint();}
function onIvClick(e){const b=e.target.closest('[data-hsi]');if(!b||!IV)return;const a=b.getAttribute('data-hsi');e.preventDefault();
 if(a==='start'){IV.step=0;ivPaint();return;}
 if(a==='later'){const p=plan();if(!p){const s=S();if(s){s.starter={v:2,skipped:true,actions:[],asked:{},created:Date.now(),hidden:true};save();}}ivClose();try{R().toast&&R().toast(t('skipped'));}catch(e){}refresh();return;}
 if(a==='back'){IV.step=Math.max(-1,IV.step-1);ivPaint();return;}
 if(a==='skip'){delete IV.answers[C.QUESTIONS[IV.step].id];ivNext();return;}
 if(a==='opt'){IV.answers[C.QUESTIONS[IV.step].id]=b.getAttribute('data-v');b.parentNode.querySelectorAll('.hs-opt').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-checked',x===b);});setTimeout(ivNext,reduce()?60:220);return;}
 if(a==='done'){const p=IV.plan;p.asked={};setPlan(p);ivClose();try{window.LowiHost&&LowiHost.go('home');}catch(e){}try{R().toast&&R().toast(t('saved'));}catch(e){}refresh();setTimeout(refresh,400);setTimeout(refresh,1000);return;}}

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
  '<details class="hs-why"><summary>'+esc(t('why'))+'</summary><p>'+esc(C.whyText(a.why,lang()))+'</p></details>'+
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
const sig=h=>{h=String(h).replace(/\bhs\d+/g,'hs');let x=0;for(let i=0;i<h.length;i++)x=(x*31+h.charCodeAt(i))|0;return String(x);};
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
function afterSetup(){try{localStorage.removeItem(KEY);}catch(e){}if(plan()||(S()||{}).starter)return;setTimeout(ivOpen,reduce()?150:650);}

/* ---------- wiring ---------- */
D.addEventListener('click',e=>{onGateClick(e);onIvClick(e);onSheetClick(e);const o=e.target.closest('[data-hs-open]');if(o){e.preventDefault();const k=o.getAttribute('data-hs-open');if(k==='plan')openSheet();else if(k==='redo')ivOpen();}},false);
D.addEventListener('keydown',onGateKey,true);
['lowi:reward','lowi:care','lowi:meal-logged','lowi:layout'].forEach(ev=>window.addEventListener(ev,soon));
D.addEventListener('visibilitychange',()=>{if(!D.hidden)soon();});
try{new MutationObserver(ms=>{if(busy)return;for(const m of ms){const tg=m.target;if(!tg||!tg.closest||tg.closest('#hsPlan,#hsProf'))continue;if(tg.closest('#tab-home,#tab-profile')||tg.id==='tab-home'||tg.id==='tab-profile'){soon();return;}}}).observe(D.body,{childList:true,subtree:true});}catch(e){}
try{new MutationObserver(()=>{if(D.querySelector('.r2-start.hs'))paint(false);if(IV)ivPaint();if(D.getElementById('hsSheet'))sheetPaint();soon();}).observe(H,{attributes:true,attributeFilter:['lang']});}catch(e){}
setInterval(()=>{if(!D.hidden&&D.getElementById('hsPlan'))refresh();},60000);

window.LowiHerbStart={want,html,paint,afterSetup,openInterview:ivOpen,openPlan:openSheet,refresh,facts,go,plan};
/* the gate may already be up with the old start page: repaint it herb-first */
try{const g=gate();if(g&&R().gateUp&&R().gateUp()&&g.querySelector('.r2-start')&&!g.querySelector('.r2-start.form,.r2-start.hs,input')&&want(!!(S()&&S().user&&S().user.name)))R().showGate('home');}catch(e){}
soon();
})();
