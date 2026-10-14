/* Herb identity runtime: one name, sign, type, colour and symbol for the herb on Home, in the herb world,
   in Profile and in Community. The star sign is playful styling only. */
(function(){
'use strict';
const C=window.LowiHerbIdentityCore;if(!C||window.LowiHerbIdentity)return;
const D=document,R5KEY='lowispike.r5.v1',VOICE_KEY='lowi.herb.voice.v1';
const R=()=>window.LowiR2||{},HT=()=>window.LowiHerbTamagotchi,F=()=>window.LowiFood;
const lang=()=>{try{const l=window.LowiLang&&LowiLang.get();return ['en','de','es'].includes(l)?l:'en';}catch(e){return'en';}};
const state=()=>{try{return R().S&&R().S()||null;}catch(e){return null;}};
const prefs=()=>{try{return HT()&&HT().readPrefs()||null;}catch(e){return null;}};
const savePrefs=p=>{try{HT()&&HT().savePrefs(p);}catch(e){}};
const r5=()=>{try{return F()&&F().state()||null;}catch(e){return null;}};
const saveR5=r=>{try{localStorage.setItem(R5KEY,JSON.stringify(r));}catch(e){}};
const saveState=()=>{try{R().save&&R().save();}catch(e){}};
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const COPY={
 en:{sign:'Star sign',type:'Personality',noSign:'Add your birthday',noType:'No type yet',voice:'Voice',style:'{sign} style',nameFrom:'Name from {sign} + {type}',nameCustom:'Your own name · automatic would be {auto}',namePartial:'A first name for now. With {missing} it becomes truly yours.',birthday:'your birthday',typeWord:'your type',and:' and ',fun:'The star sign is just style and fun, not psychology.',resetName:'Use automatic name',quiz:'Mini test (4 questions)',quizAgain:'Redo mini test',orProfile:'You can also pick your type in Profile.'},
 de:{sign:'Sternzeichen',type:'Persönlichkeit',noSign:'Geburtstag eintragen',noType:'Noch kein Typ',voice:'Stimme',style:'{sign}-Stil',nameFrom:'Name aus {sign} + {type}',nameCustom:'Eigener Name · automatisch wäre {auto}',namePartial:'Erst mal ein Vorname. Mit {missing} wird er ganz deiner.',birthday:'deinem Geburtstag',typeWord:'deinem Typ',and:' und ',fun:'Sternzeichen ist nur Stil und Spaß, keine Psychologie.',resetName:'Automatischen Namen nutzen',quiz:'Mini-Test (4 Fragen)',quizAgain:'Mini-Test wiederholen',orProfile:'Deinen Typ kannst du auch im Profil wählen.'},
 es:{sign:'Signo',type:'Personalidad',noSign:'Añade tu cumpleaños',noType:'Aún sin tipo',voice:'Voz',style:'Estilo {sign}',nameFrom:'Nombre de {sign} + {type}',nameCustom:'Nombre propio · el automático sería {auto}',namePartial:'Un primer nombre por ahora. Con {missing} será de verdad tuyo.',birthday:'tu cumpleaños',typeWord:'tu tipo',and:' y ',fun:'El signo es solo estilo y diversión, no psicología.',resetName:'Usar nombre automático',quiz:'Mini test (4 preguntas)',quizAgain:'Repetir mini test',orProfile:'También puedes elegir tu tipo en Perfil.'}};
const fmt=(s,o)=>String(s).replace(/\{(\w+)\}/g,(m,k)=>o[k]!=null?o[k]:m);

/* One type for the whole app: Profile (R5.mbti) leads, the herb quiz and older herb prefs fill the gaps. */
function syncType(){const r=r5(),s=state(),p=prefs();if(!s)return '';const u=s.user||(s.user={});
 const a=C.normType(r&&r.mbti),b=C.normType(u.mbti),c=C.normType(p&&p.personality),t=a||b||c;if(!t)return '';
 if(r&&a!==t){r.mbti=t;saveR5(r);}
 if(b!==t){u.mbti=t;saveState();}
 if(p&&c!==t){p.personality=t;savePrefs(p);}
 return t;}
function setType(t){t=C.normType(t);const r=r5(),s=state(),p=prefs();
 if(r&&C.normType(r.mbti)!==t){r.mbti=t;saveR5(r);}
 if(s){const u=s.user||(s.user={});if(C.normType(u.mbti)!==t||(!t&&u.mbti)){u.mbti=t;saveState();}}
 if(p&&(C.normType(p.personality)!==t||(!t&&p.personality))){p.personality=t;savePrefs(p);}
 applyLook();return t;}
function herbStore(s){if(!s)return null;if(!s.herb||typeof s.herb!=='object')s.herb={name:'',personalize:true};return s.herb;}
function current(){const s=state(),p=prefs()||{},type=syncType(),u=s&&s.user||{};
 const r=C.resolve({bday:u.bday,starSign:p.starSign,types:[type]}),h=herbStore(s),st=C.stableName(h&&h.identity,r.sign,r.type);
 if(st.changed&&h){h.identity=st.store;saveState();}
 const custom=String(p.name||(h&&h.name)||'').trim().slice(0,24);
 return{...r,auto:st.name,custom,name:custom||st.name,key:st.key,lang:lang(),userName:String(u.name||'').trim()};}
function autoName(){const id=applyLook();return (id||current()).auto;}
function name(){const id=applyLook();return (id||current()).name;}
function signLabel(sign){return C.signLabel(sign,lang())||String(sign||'');}
/* the same sign colours Profile and Community use (LowiGlass / LS_PAL) */
function palette(sign){sign=C.normSign(sign);if(!sign)return null;try{if(window.LowiGlass&&LowiGlass.palette){const x=LowiGlass.palette(sign.toLowerCase());if(Array.isArray(x)&&x[0])return{a:x[0],b:x[1]||x[0]};if(x&&x.a)return x;}}catch(e){}return null;}
function path(sign){try{return window.LowiSpiritCore&&LowiSpiritCore.paths&&LowiSpiritCore.paths[sign]||'';}catch(e){return'';}}
function sigil(sign,cls){const d=path(C.normSign(sign));if(!d)return'';return '<svg class="sp-symbol hi-sigil'+(cls?' '+cls:'')+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="'+d+'"/></svg>';}
let lastLook='';
/* The sign symbol as a mask, so Home and the herb world can show it next to the name even when the name text is replaced. */
function applyLook(){let id;try{id=current();}catch(e){return;}const root=D.documentElement,look=id.sign+'|'+id.type+'|'+id.name+'|'+!!window.LowiGlass+'|'+!!window.LowiSpiritCore;if(look===lastLook)return id;lastLook=look;
 const d=path(id.sign);
 if(id.sign&&d){const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="'+d+'"/></svg>';
  root.style.setProperty('--hi-sigil','url("data:image/svg+xml,'+encodeURIComponent(svg)+'")');root.classList.add('hi-signed');}
 else{root.style.removeProperty('--hi-sigil');root.classList.remove('hi-signed');}
 const pal=palette(id.sign);if(pal){root.style.setProperty('--hi-a',pal.a);root.style.setProperty('--hi-b',pal.b||pal.a);}else{root.style.removeProperty('--hi-a');root.style.removeProperty('--hi-b');}
 root.dataset.hiSign=id.sign||'';root.dataset.hiType=id.type||'';return id;}

/* ---------- voice ---------- */
function recent(){try{const x=JSON.parse(localStorage.getItem(VOICE_KEY)||'[]');return Array.isArray(x)?x:[];}catch(e){return[];}}
function keep(list){try{localStorage.setItem(VOICE_KEY,JSON.stringify(list));}catch(e){}}
function line(moment){const id=current(),all=C.pool({lang:id.lang,moment,sign:id.sign,type:id.type,name:id.name});const rec=recent(),l=C.pick(all,rec);if(l)keep(C.remember(rec,l,24));return l;}
function wrapVoice(){const T=window.LowiHerbTamagotchiCore;if(!T||T.__hiVoice||typeof T.nextLine!=='function')return;const base=T.nextLine;
 T.nextLine=function(page,used,opts){opts=opts||{};const m=opts.model||{};
  if(opts.dim||m.dim)return base.apply(this,arguments);
  const moment=opts.moment==='dizzy'?'dizzy':page==='tap'?'tap':(page==='home'||page==='room')&&!opts.moment?(opts.period||m.period||'day'):'';
  if(!moment)return base.apply(this,arguments);
  try{const id=current(),all=C.pool({lang:id.lang,moment,sign:id.sign,type:id.type,name:id.name}),u=Array.isArray(used)?used:[],free=all.filter(l=>!u.includes(l)),rec=recent(),l=C.pick(free.length?free:all,rec);
   if(l){keep(C.remember(rec,l,24));return l;}}catch(e){}
  return base.apply(this,arguments);};
 T.__hiVoice=true;}

/* ---------- herb profile card (used by the herb world sheet) ---------- */
function cardHTML(){const id=applyLook()||current(),l=id.lang,t=COPY[l],sl=C.signLabel(id.sign,l),tl=C.typeLabel(id.type,l),traits=C.traits(id.type,l),style=C.styleWord(id.sign,l);
 const missing=[!id.sign&&t.birthday,!id.type&&t.typeWord].filter(Boolean).join(t.and);
 const how=id.custom?fmt(t.nameCustom,{auto:esc(id.auto)}):id.complete?fmt(t.nameFrom,{sign:esc(sl),type:esc(id.type)}):fmt(t.namePartial,{missing:esc(missing)});
 const pal=palette(id.sign),st=pal?' style="--hi-a:'+esc(pal.a)+';--hi-b:'+esc(pal.b||pal.a)+'"':'';
 return '<div class="hi-card"'+st+'><div class="hi-mark">'+(id.sign?sigil(id.sign):'<span class="hi-mark-leaf"></span>')+'</div><h2 class="hi-name">'+esc(id.name)+'</h2><p class="hi-how">'+how+'</p>'+
  '<div class="hi-chips"><span class="hi-chip'+(id.sign?'':' off')+'"><small>'+esc(t.sign)+'</small><b>'+(id.sign?esc(sl):esc(t.noSign))+'</b></span><span class="hi-chip'+(id.type?'':' off')+'"><small>'+esc(t.type)+'</small><b>'+(id.type?esc(id.type)+' · '+esc(tl):esc(t.noType))+'</b></span></div>'+
  (traits.length||style?'<p class="hi-voice">'+(traits.length?'<b>'+esc(t.voice)+':</b> '+esc(traits.join(', ')):'')+(style?(traits.length?' · ':'')+'<b>'+esc(fmt(t.style,{sign:sl}))+':</b> '+esc(style):'')+'</p>':'')+
  '<small class="hi-fun">'+esc(t.fun)+(id.type?'':' '+esc(t.orProfile))+'</small></div>';}
function copy(k){return COPY[lang()][k]||COPY.en[k]||k;}
function resetName(){const s=state(),p=prefs();if(p&&p.name){p.name='';savePrefs(p);}if(s&&s.herb&&s.herb.name){s.herb.name='';saveState();}refreshAll();}
function setCustomName(v){v=String(v||'').trim().slice(0,24);const id=current(),s=state(),p=prefs();const custom=v&&v!==id.auto?v:'';
 if(p){p.name=custom;savePrefs(p);}const h=herbStore(s);if(h&&(h.name||custom)){h.name=custom;saveState();}return custom;}
function refreshAll(){lastLook='';applyLook();try{window.LowiSpirit&&LowiSpirit.refresh&&LowiSpirit.refresh();}catch(e){}try{HT()&&HT().refresh&&HT().refresh(true);}catch(e){}}

/* Profile type picker -> herb (and clearing it clears the herb's type too). */
D.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-r5="mbti"]');if(!b||!b.hasAttribute('data-v'))return;
 setTimeout(()=>{const r=r5();setType(r&&r.mbti||'');refreshAll();},0);});
function css(){if(D.getElementById('hiCss'))return;const m=D.querySelector('meta[name="lowi-build"]'),l=D.createElement('link');l.id='hiCss';l.rel='stylesheet';l.href='herb-identity.css?v='+encodeURIComponent(m&&m.content||'1');D.head.appendChild(l);}
function boot(){css();wrapVoice();applyLook();}
window.LowiHerbIdentity={current,name,autoName,setType,syncType,signLabel,typeLabel:t=>C.typeLabel(t,lang()),sigil,palette,cardHTML,copy,resetName,setCustomName,refresh:refreshAll,applyLook,line};
boot();
let tries=0;const again=setInterval(()=>{wrapVoice();applyLook();if(++tries>20)clearInterval(again);},500);
D.addEventListener('visibilitychange',()=>{if(!D.hidden){lastLook='';applyLook();}});
window.addEventListener('storage',e=>{if(e.key===R5KEY){lastLook='';applyLook();}});
})();
