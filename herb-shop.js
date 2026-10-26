/* LOWiSPIKE herb shop UI (Oct 15): pay what you want as a voluntary Ko-fi tip (opens over the app), plus Kometa's daily gift.
   Oct 15 later (user: "dressing up Misty is too much ... we go the Pokémon route"): the cosmetic shop, try-on and outfit gifts are
   retired. What stays: ONE small gift spot on the world Home (a calm body fact once a day, no XP, no items) and, inside its card,
   the door to the Ko-fi support view. Nothing was ever sold in the app and XP was never spent, so nobody loses anything. */
(function(root){'use strict';
const D=root.document,K=root.LowiHerbShopCore,WC=root.LowiHerbTamagotchiCore;if(!D||!K||!WC||root.LowiHerbShop)return;
const mq=root.matchMedia?root.matchMedia('(prefers-reduced-motion: reduce)'):null,reduced=()=>!!(mq&&mq.matches);
const li=()=>{try{const l=String(root.LowiLang&&LowiLang.get?LowiLang.get():(D.documentElement.lang||'en')).slice(0,2);return l==='de'?1:l==='es'?2:0;}catch(e){return 0;}};
const L=(e,d,s)=>[e,d,s][li()];
/* Oct 19 (aura-rename task): "Misty's gift" says the user's companion's own name */
const nmL=t=>{try{const B=root.LowiBirthCompanion;return B&&B.withName?B.withName(t):t;}catch(e){return t;}};
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=(n,f)=>{try{return root.LowiIcons&&LowiIcons.has(n)?LowiIcons.svg(n):(f||'');}catch(e){return f||'';}};
const nm=c=>c?(c.names||[c.name])[li()]||c.name:'';
const uid=()=>{try{return String((root.S&&S.user&&(S.user.id||S.user.uid||S.user.name))||'me');}catch(e){return'me';}};
function read(){try{return K.clean(JSON.parse(localStorage.getItem(K.SKEY)||'null'));}catch(e){return K.blank();}}
function save(st){st=K.clean({...st,ts:Date.now()});try{localStorage.setItem(K.SKEY,JSON.stringify(st));}catch(e){}WC.setOwned(st.owned);
 try{clearTimeout(save.t);save.t=setTimeout(()=>{const X=root.LOWI_CLOUD_X;if(X&&X.backupNow)X.backupNow().catch(()=>{});},1500);}catch(e){}return st;}
/* Account restore may bring a newer shop state: keep wardrobe ownership in step. */
root.addEventListener('storage',e=>{if(e.key===K.SKEY)WC.setOwned(read().owned);});
function herb(){try{return root.LowiHerbTamagotchi.current();}catch(e){return null;}}
const V={open:false,view:'shop',sel:'',msg:'',back:null,timer:0,ov:null,away:0,back2:false};
function entryHTML(){return'';}
function entryHTMLOld(){const st=read(),now=Date.now(),gift=!K.freeClaimed(st,now);
 return'<button type="button" class="hs-entry" data-shop="open" aria-label="'+esc(L('Kometa\'s shop','Kometas Laden','Tienda de Kometa')+(gift?' · '+L('a free gift is waiting','ein Gratis-Geschenk wartet','te espera un regalo'):''))+'">'+icon('bag')+'<span>'+esc(L('Shop','Laden','Tienda'))+'</span>'+(gift?'<i class="hs-dot" aria-hidden="true"></i>':'')+'</button>';}
const KOMETA='<svg class="hs-kometa" viewBox="0 0 120 100" aria-hidden="true"><defs><radialGradient id="hsKb" cx=".35" cy=".3" r=".8"><stop stop-color="#fff7df"/><stop offset=".55" stop-color="#ffd88a"/><stop offset="1" stop-color="#e58fb6"/></radialGradient><linearGradient id="hsKt" x1="1" x2="0"><stop stop-color="#ffe6a2" stop-opacity=".9"/><stop offset="1" stop-color="#9d8cff" stop-opacity="0"/></linearGradient></defs><path class="hs-k-tail" d="M58 52Q30 30 4 38Q26 48 6 62Q32 60 58 60Z" fill="url(#hsKt)"/><g class="hs-k-body"><path d="M66 30l4-14M84 30l-2-14" stroke="#ffe6a2" stroke-width="2.2" stroke-linecap="round"/><circle cx="70" cy="15" r="3" fill="#fff3c4"/><circle cx="82" cy="15" r="3" fill="#fff3c4"/><ellipse cx="76" cy="55" rx="25" ry="24" fill="url(#hsKb)" stroke="#fff1c9" stroke-width="1.4"/><path d="M57 62q19 12 38 0" fill="none" stroke="#c76d97" stroke-width="1.2" opacity=".5"/><circle cx="68" cy="52" r="3.2" fill="#2a2a46"/><circle cx="84" cy="52" r="3.2" fill="#2a2a46"/><circle cx="69" cy="51" r="1" fill="#fff"/><circle cx="85" cy="51" r="1" fill="#fff"/><path d="M71 60q5 4 10 0" fill="none" stroke="#2a2a46" stroke-width="1.8" stroke-linecap="round"/><circle cx="63" cy="58" r="3" fill="#f59ab9" opacity=".55"/><circle cx="89" cy="58" r="3" fill="#f59ab9" opacity=".55"/><path d="M52 72q24 10 48 0l-3 8q-21 8-42 0Z" fill="#7a6ad8" stroke="#c8b0ff" stroke-width="1"/><path d="M76 74l2 4 4 1-4 1-2 4-2-4-4-1 4-1Z" fill="#ffe6a2"/></g></svg>';
function status(c,st,now,xp,offer){const own=st.owned.includes(c.id)||WC.owns(c.id,xp);
 if(c.premium)return{k:'premium',t:L('Premium · not available yet','Premium · noch nicht verfügbar','Premium · aún no disponible')};
 if(own)return{k:'own',t:L('Yours','Deins','Tuyo')};
 if(offer&&offer.id===c.id&&!K.freeClaimed(st,now))return{k:'free',t:L('Free today','Heute gratis','Gratis hoy')};
 if(c.season)return K.canClaim(WC,st,c.id,now,xp)?{k:'claim',t:L('Ready to take','Bereit zum Holen','Lista para llevar')}:{k:'locked',t:L('From '+c.xp+' XP','Ab '+c.xp+' XP','Desde '+c.xp+' XP')};
 return{k:'locked',t:L('From '+c.xp+' XP','Ab '+c.xp+' XP','Desde '+c.xp+' XP')};}
function tile(c,st,now,xp,offer,h){const s=status(c,st,now,xp,offer),pv=h?WC.previewEquip({},c.id,1e9):null;
 let art='';try{art=h?root.LowiHerbTamagotchi.plantHTML(h.m,'node',h.p,{preview:pv,crop:c.kind,hidden:true}):'';}catch(e){}
 return'<button type="button" class="hs-tile hs-'+s.k+'" data-shop="pick" data-item="'+c.id+'" aria-pressed="'+(V.sel===c.id)+'" aria-label="'+esc(nm(c)+', '+s.t)+'"><span class="hs-thumb">'+art+(s.k==='own'?'<span class="hs-badge" aria-hidden="true">'+icon('check','✓')+'</span>':s.k==='free'?'<span class="hs-badge hs-b-free" aria-hidden="true">'+icon('gift')+'</span>':s.k==='premium'?'<span class="hs-badge" aria-hidden="true">'+icon('sparkle')+'</span>':'')+'</span><b>'+esc(nm(c))+'</b><small>'+esc(s.t)+'</small></button>';}
function action(c,st,now,xp,offer){const s=status(c,st,now,xp,offer);
 if(s.k==='free')return'<button type="button" class="hs-act hs-go" data-shop="free">'+icon('gift')+esc(L('Take the gift','Geschenk annehmen','Aceptar el regalo'))+'</button>';
 if(s.k==='claim')return'<button type="button" class="hs-act hs-go" data-shop="claim" data-item="'+c.id+'">'+esc(L('Take it, it\'s yours','Holen, gehört dir','Llévatela, es tuya'))+'</button>';
 if(s.k==='own')return'<button type="button" class="hs-act" data-shop="wear" data-item="'+c.id+'">'+esc(L('Wear it in the wardrobe','Im Kleiderschrank anziehen','Ponértela en el armario'))+'</button>';
 if(s.k==='premium')return'<button type="button" class="hs-act" disabled>'+esc(s.t)+'</button><button type="button" class="hs-link" data-shop="plus">'+esc(L('How premium is meant to work','Wie Premium funktionieren soll','Cómo funcionará premium'))+'</button>';
 const more=Math.max(0,Math.ceil(c.xp-xp));return'<button type="button" class="hs-act" disabled>'+esc(L(more+' XP to go','noch '+more+' XP','faltan '+more+' XP'))+'</button>';}
function catalogHTML(st,now,xp,offer,drop){const rows=WC.COSMETICS.concat(drop?drop.drop.items:[],WC.PREMIUM);
 return'<details class="hs-cat"><summary><h3>'+esc(L('Every piece and how to get it','Alle Teile und wie du sie bekommst','Todas las piezas y c\u00f3mo conseguirlas'))+'</h3><small>'+esc(L('The list stays the same. Earn with XP, or get one as the daily gift.','Die Liste bleibt gleich. Freispielen mit XP oder eins als Tagesgeschenk.','La lista no cambia. Desbloquea con XP o recibe una como regalo diario.'))+'</small></summary><ul>'+rows.map(c=>{const s=status(c,st,now,xp,offer),pct=c.xp?Math.min(100,Math.round(xp/c.xp*100)):100;
  const how=c.premium?L('Plus preview only','Nur Plus-Vorschau','Solo vista previa Plus'):s.k==='own'?L('Yours','Deins','Tuyo'):c.season?L('Season piece \u00b7 '+c.xp+' XP','Saison-Teil \u00b7 '+c.xp+' XP','Pieza de temporada \u00b7 '+c.xp+' XP'):c.xp+' XP';
  return'<li class="hs-c-'+s.k+'"><button type="button" data-shop="pick" data-item="'+c.id+'"><span>'+esc(nm(c))+'</span><small>'+esc(how)+'</small>'+(s.k==='locked'||s.k==='claim'||s.k==='free'?'<i class="hs-bar" role="progressbar" aria-label="'+esc(nm(c))+'" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+pct+'"><i style="width:'+pct+'%"></i></i>':'')+'</button></li>';}).join('')+'</ul></details>';}
function shopHTML(){const now=Date.now(),st=read(),h=herb(),xp=h?+h.m.xp||0:0,u=uid(),offer=K.freeOffer(WC,st,now,xp,u),sh=K.shelf(WC,st,now,xp,u),drop=K.activeDrop(now),nd=drop?null:K.nextDrop(now),given=K.freeClaimed(st,now);
 const all=[...(drop?drop.drop.items:[]),...(offer?[offer]:[]),...sh.items,...(given&&st.free?[WC.cosmetic(st.free.id)].filter(Boolean):[])];
 if(!V.sel||!all.some(c=>c.id===V.sel))V.sel=(offer&&!given?offer.id:(sh.items[0]||all[0]||{}).id)||'';
 const sel=WC.cosmetic(V.sel),seed=Math.floor(now/36e5);
 const say=V.msg||(!given&&offer?K.line('gift',li(),seed):drop?K.line(seed%2?'drop':'hello',li(),seed):K.line('hello',li(),seed));
 let stage='';if(sel&&h){try{stage=root.LowiHerbTamagotchi.plantHTML(h.m,'card',h.p,{preview:WC.previewEquip(h.p.equipment,sel.id,1e9),label:L('Trying on: ','Anprobe: ','Probando: ')+nm(sel)});}catch(e){}}
 const tomorrow=new Date(now);tomorrow.setHours(24,0,0,0);
 return'<div class="hs-panel" data-view="shop"><header class="hs-head"><button type="button" class="hs-x" data-shop="close" aria-label="'+esc(L('Close','Schließen','Cerrar'))+'">×</button><h2 id="hsTitle">'+esc(L('Kometa\'s shop','Kometas Laden','Tienda de Kometa'))+'</h2><span class="hs-xp">'+esc(xp+' XP')+'</span></header><div class="hs-scroll">'+
  '<section class="hs-keeper">'+KOMETA+'<p class="hs-say" aria-live="polite"><b>Kometa</b>'+esc(say)+'</p></section>'+
  (drop?'<section class="hs-drop" style="--hs-tint:'+drop.drop.tint+'" aria-labelledby="hsDrop"><div class="hs-drop-top"><span class="hs-over">'+esc(L('Seasonal drop','Saison-Drop','Drop de temporada'))+'</span><span class="hs-time" data-shop-count="'+drop.end+'">'+icon('calendar')+'<span>'+esc(L('runs until ','läuft bis ','hasta ')+K.when(drop.end-1,now,li()).replace(/^(on |am |el )/,''))+'</span></span></div><h3 id="hsDrop">'+esc(drop.drop.names[li()])+'</h3><p>'+esc(L('Three pieces for this season. Take them with your XP while the drop runs; whatever you take stays yours. Missed pieces come back next year.','Drei Teile für diese Saison. Hol sie dir mit deinen XP, solange der Drop läuft; was du holst, bleibt deins. Verpasste Teile kommen nächstes Jahr wieder.','Tres piezas para esta temporada. Llévatelas con tus XP mientras dure el drop; lo que te lleves es tuyo. Las que te pierdas vuelven el año que viene.'))+'</p><div class="hs-row">'+drop.drop.items.map(c=>tile(c,st,now,xp,offer,h)).join('')+'</div></section>'
   :nd?'<section class="hs-drop hs-drop-next" style="--hs-tint:'+nd.drop.tint+'"><div class="hs-drop-top"><span class="hs-over">'+esc(L('Next seasonal drop','Nächster Saison-Drop','Próximo drop'))+'</span><span class="hs-time" data-shop-count="'+nd.start+'">'+icon('calendar')+'<span>'+esc(L('starts ','startet ','empieza ')+K.when(nd.start,now,li()))+'</span></span></div><h3>'+esc(nd.drop.names[li()])+'</h3></section>':'')+
  '<section class="hs-stage" aria-live="polite">'+(sel?'<div class="hs-mirror"><span class="hs-tag">'+esc(L('Trying on','Anprobe','Probando'))+'</span>'+stage+'</div><div class="hs-info"><b>'+esc(nm(sel))+'</b><small>'+esc(status(sel,st,now,xp,offer).t)+'</small>'+action(sel,st,now,xp,offer)+'</div>':'')+'</section>'+
  '<section class="hs-free" aria-labelledby="hsFree"><div class="hs-sec-top"><h3 id="hsFree">'+icon('gift')+esc(L('Today\'s gift','Geschenk des Tages','Regalo del día'))+'</h3><span class="hs-time" data-shop-count="'+tomorrow.getTime()+'">'+icon('clock')+'<span>'+esc(L('a new one tomorrow','morgen ein neues','otro mañana'))+'</span></span></div>'+
   (given?'<p class="hs-given">'+esc(L('Taken today: ','Heute geholt: ','Hoy recogido: ')+nm(WC.cosmetic(st.free.id)))+'</p>':offer?'<div class="hs-row hs-row-1">'+tile(offer,st,now,xp,offer,h)+'</div>':'<p class="hs-given">'+esc(L('You own every piece. Kometa is impressed.','Du hast jedes Teil. Kometa ist beeindruckt.','Tienes todas las piezas. Kometa está impresionada.'))+'</p>')+'</section>'+
  '<section class="hs-shelf" aria-labelledby="hsShelf"><div class="hs-sec-top"><h3 id="hsShelf">'+esc(L('The shelf','Das Regal','La estantería'))+'</h3><span class="hs-time" data-shop-count="'+sh.next+'">'+icon('clock')+'<span>'+esc(L('new picks ','neue Auswahl ','nueva selección ')+K.when(sh.next,now,li()))+'</span></span></div>'+(sh.items.length?'<div class="hs-row hs-row-4">'+sh.items.map(c=>tile(c,st,now,xp,offer,h)).join('')+'</div>':'<p class="hs-given">'+esc(L('Nothing left to show. You have it all.','Nichts mehr zu zeigen. Du hast alles.','No queda nada. Lo tienes todo.'))+'</p>')+'</section>'+
  catalogHTML(st,now,xp,offer,drop)+
  '<button type="button" class="hs-plus-card" data-shop="plus"><span class="hs-over">'+esc(L('Voluntary · via Ko-fi','Freiwillig · über Ko-fi','Voluntario · con Ko-fi'))+'</span><b>'+esc(L('Support LOWiSPIKE: pay what you want','LOWiSPIKE unterstützen: Zahl, was du willst','Apoya LOWiSPIKE: paga lo que quieras'))+'</b><small>'+esc(L(money(0)+' is completely fine. Supporting unlocks nothing.',money(0)+' ist völlig okay. Unterstützen schaltet nichts frei.',money(0)+' está bien. Apoyar no desbloquea nada.'))+'</small></button>'+
  '<p class="hs-honest">'+esc(L('No discounts, no countdown tricks, nothing to buy. XP is never spent here, and every piece you get stays yours.','Keine Rabatte, keine Countdown-Tricks, nichts zu kaufen. XP werden hier nie ausgegeben, und jedes Teil, das du bekommst, bleibt deins.','Sin descuentos, sin trucos de cuenta atrás, nada que comprar. Aquí nunca se gastan XP y cada pieza que consigas es tuya.'))+'</p></div></div>';}
const money=a=>li()===0?'€'+a:a+' €';
function fmtDay(t){try{return new Date(t).toLocaleDateString(['en','de','es'][li()],{weekday:'short',day:'numeric',month:'short'});}catch(e){return'';}}
/* Support on Ko-fi: voluntary, nothing unlocks, 0 € is a real choice. Ko-fi opens over the app (target=_blank), see herb-shop-core.js. */
function plusHTML(){const st=read(),m=st.support,url=K.kofiUrl();
 const modes=[['free',money(0),L('Just stay','Einfach dabei sein','Solo quedarte')],['once',L('One-time','Einmalig','Una vez'),L('You pick the amount','Betrag frei wählbar','Tú eliges la cantidad')],['month',L('Monthly','Monatlich','Mensual'),L('Cancel any time','Jederzeit kündbar','Cancela cuando quieras')]];
 const away=L('Ko-fi opens on top of LOWiSPIKE. Close it and you are right back here.','Ko-fi öffnet sich über LOWiSPIKE. Schließen, und du bist wieder hier.','Ko-fi se abre sobre LOWiSPIKE. Ciérralo y vuelves aquí.');
 const facts=m==='free'?[L('Nothing happens and nothing is charged.','Nichts passiert, es wird nichts berechnet.','No pasa nada y no se cobra nada.'),nmL(L('You keep everything: scan, log, fasting, Misty in every form, and the daily gift.','Du behältst alles: Scan, Loggen, Fasten, Misty in jeder Form und das Tagesgeschenk.','Te quedas con todo: escanear, registrar, ayuno, Misty en todas sus formas y el regalo diario.'))]
  :m==='once'?[away,L('On Ko-fi you choose the amount and pay by card or PayPal.','Bei Ko-fi wählst du den Betrag und zahlst mit Karte oder PayPal.','En Ko-fi eliges la cantidad y pagas con tarjeta o PayPal.'),L('Charged once. No subscription, nothing renews.','Einmal abgebucht. Kein Abo, nichts verlängert sich.','Se cobra una vez. Sin suscripción, nada se renueva.')]
  :[away,L('On Ko-fi tap "Monthly" and choose the amount.','Bei Ko-fi auf „Monthly“ tippen und den Betrag wählen.','En Ko-fi toca «Monthly» y elige la cantidad.'),L('First payment right away, then the same amount on the same day every month.','Erste Zahlung sofort, danach jeden Monat am gleichen Tag der gleiche Betrag.','Primer pago al momento, luego la misma cantidad el mismo día cada mes.'),L('Cancel any time in your Ko-fi account or in PayPal.','Kündigen jederzeit in deinem Ko-fi-Konto oder bei PayPal.','Cancela cuando quieras en tu cuenta de Ko-fi o en PayPal.')];
 return'<div class="hs-panel" data-view="plus"><header class="hs-head"><button type="button" class="hs-x hs-back" data-shop="close" aria-label="'+esc(L('Close','Schließen','Cerrar'))+'">×</button><h2 id="hsTitle">'+esc(L('Pay what you want','Zahl, was du willst','Paga lo que quieras'))+'</h2><button type="button" class="hs-x" data-shop="close" aria-label="'+esc(L('Close','Schließen','Cerrar'))+'">×</button></header><div class="hs-scroll">'+
  (V.back2?'<p class="hs-thanks" role="status">'+esc(L('Welcome back. Thank you if you supported LOWiSPIKE. Nothing in the app changes either way.','Willkommen zurück. Danke, falls du LOWiSPIKE unterstützt hast. In der App ändert sich so oder so nichts.','Bienvenido de nuevo. Gracias si apoyaste LOWiSPIKE. En la app no cambia nada, lo hagas o no.'))+'</p>':'')+
  '<p class="hs-must" role="note">'+icon('heart')+'<span><b>'+esc(L('Voluntary, straight to the maker of LOWiSPIKE.','Freiwillig, direkt an den Macher von LOWiSPIKE.','Voluntario, directo al creador de LOWiSPIKE.'))+'</b> '+esc(L('Everything in the app stays free. Supporting unlocks nothing: no XP, no pieces, no advantage.','Alles in der App bleibt kostenlos. Unterstützen schaltet nichts frei: keine XP, keine Teile, kein Vorteil.','Todo en la app sigue gratis. Apoyar no desbloquea nada: ni XP, ni piezas, ni ventajas.'))+'</span></p>'+
  '<div class="hs-modes" role="radiogroup" aria-label="'+esc(L('How you want to support','Wie du unterstützen willst','Cómo quieres apoyar'))+'">'+modes.map(([k,t,d])=>'<button type="button" role="radio" aria-checked="'+(k===m)+'" data-shop="mode" data-mode="'+k+'"><b>'+esc(t)+'</b><small>'+esc(d)+'</small></button>').join('')+'</div>'+
  '<ul class="hs-facts">'+facts.map(f=>'<li>'+esc(f)+'</li>').join('')+'</ul>'+
  (m==='free'?'<button type="button" class="hs-act hs-cta" data-shop="close">'+esc(L('Done','Fertig','Listo'))+'</button>'
   :'<a class="hs-act hs-cta hs-kofi" href="'+esc(url)+'" target="_blank" rel="noopener" data-shop="kofi">'+esc(m==='month'?L('Support monthly on Ko-fi','Monatlich bei Ko-fi unterstützen','Apoyar cada mes en Ko-fi'):L('Support once on Ko-fi','Einmalig bei Ko-fi unterstützen','Apoyar una vez en Ko-fi'))+'<span class="hs-ext" aria-hidden="true">↗</span></a>')+
  '<p class="hs-fine">'+esc(L('Payment happens on Ko-fi, not in LOWiSPIKE. The app sees no payment details and does not know whether or how much you give.','Bezahlt wird bei Ko-fi, nicht in LOWiSPIKE. Die App sieht keine Zahlungsdaten und weiß nicht, ob oder wie viel du gibst.','El pago se hace en Ko-fi, no en LOWiSPIKE. La app no ve datos de pago y no sabe si das ni cuánto.'))+'</p></div></div>';}
function paint(focusSel){if(!V.ov)return;const sc=V.ov.querySelector('.hs-scroll'),top=sc?sc.scrollTop:0;const catOpen=!!V.ov.querySelector('.hs-cat[open]');V.ov.innerHTML=V.view==='plus'?plusHTML():shopHTML();if(catOpen){const c=V.ov.querySelector('.hs-cat');if(c)c.open=true;}const ns=V.ov.querySelector('.hs-scroll');if(ns&&focusSel!=='top')ns.scrollTop=top;
 const f=focusSel&&focusSel!=='top'?V.ov.querySelector(focusSel):null;(f||V.ov.querySelector('.hs-head .hs-x:last-of-type')||V.ov).focus({preventScroll:true});}
function tick(){if(!V.ov)return;const now=Date.now();let stale=false;V.ov.querySelectorAll('[data-shop-count]').forEach(el=>{const t=+el.dataset.shopCount;if(t<=now)stale=true;});if(stale){V.msg='';paint();}}
function open(view){if(V.ov)return;V.back=D.activeElement;V.view='plus';V.back2=false;V.msg='';V.sel='';
 const ov=D.createElement('div');ov.className='hs-ov';ov.setAttribute('role','dialog');ov.setAttribute('aria-modal','true');ov.setAttribute('aria-labelledby','hsTitle');ov.tabIndex=-1;if(reduced())ov.dataset.still='';
 V.ov=ov;D.body.appendChild(ov);paint('top');V.timer=setInterval(tick,30000);root.dispatchEvent(new CustomEvent('lowi:shop',{detail:{open:true}}));}
function close(then){if(!V.ov)return;clearInterval(V.timer);V.ov.remove();V.ov=null;
 /* repaint an open wardrobe so new pieces show up */
 const tab=D.querySelector('#spWd .wd-tabs [aria-selected="true"]');if(tab)tab.click();
 if(typeof then==='function')then();else{const t=D.querySelector('#spWd .hs-entry')||V.back;if(t&&t.focus&&D.contains(t))t.focus({preventScroll:true});}
 root.dispatchEvent(new CustomEvent('lowi:shop',{detail:{open:false}}));}
function wear(id){const c=WC.cosmetic(id);close(()=>{if(!c)return;const tab=D.querySelector('#spWd [data-sp="wdTab"][data-kind="'+c.kind+'"]');if(tab)tab.click();setTimeout(()=>{const it=D.querySelector('#spWd [data-sp="wdPick"][data-item="'+id+'"]');if(it){it.click();setTimeout(()=>{const b=D.querySelector('#spWd .wd-act[data-sp="equip"][data-item="'+id+'"]');(b||D.querySelector('#spWd'))&&(b||it).focus({preventScroll:true});},30);}},30);});}
D.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-shop]');if(!b||b.tagName==='INPUT')return;const a=b.dataset.shop;
 if(a==='kofi'){if(V.ov&&V.ov.contains(b)){V.away=Date.now();e.stopPropagation();}return;}/* real link: let the browser open Ko-fi over the app */
 if(a==='open'){e.preventDefault();e.stopPropagation();open();return;}
 if(!V.ov||!V.ov.contains(b))return;e.preventDefault();e.stopPropagation();const h=herb(),xp=h?+h.m.xp||0:0,now=Date.now();
 if(a==='close')close();
 else if(a==='pick'&&0){V.sel=b.dataset.item;V.msg='';paint('.hs-stage .hs-act:not([disabled]),.hs-stage .hs-act');const st=V.ov&&V.ov.querySelector('.hs-stage');if(st&&st.scrollIntoView)st.scrollIntoView({block:'nearest',behavior:reduced()?'auto':'smooth'});}
 else if(a==='free'&&0){const n=K.claimFree(WC,read(),now,xp,uid());if(n){save(n);V.sel=n.free.id;V.msg=K.line('given',li(),0);}paint('.hs-stage .hs-act');}
 else if(a==='claim'&&0){const n=K.claim(WC,read(),b.dataset.item,now,xp);if(n){save(n);V.msg=L('It\'s yours. Find it in the wardrobe.','Gehört dir. Du findest es im Kleiderschrank.','Es tuya. La encontrarás en el armario.');}paint('.hs-stage .hs-act');}
 else if(a==='plus'){V.view='plus';V.back2=false;paint('top');}
 else if(a==='shop')close();
 else if(a==='mode'){save({...read(),support:b.dataset.mode});V.back2=false;paint('[data-shop="mode"][aria-checked="true"]');}
},true);
D.addEventListener('change',e=>{const t=e.target;if(!V.ov||!V.ov.contains(t)||!t.dataset||!t.dataset.shop)return;if(t.dataset.shop==='remind'){save({...read(),remind:t.checked});paint('[data-shop="remind"]');}else if(t.dataset.shop==='notify')save({...read(),notify:t.checked});},true);
D.addEventListener('keydown',e=>{if(!V.ov)return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();return;}
 if(e.key==='Tab'){const f=[...V.ov.querySelectorAll('button:not([disabled]),a[href],input,[tabindex="0"]')];if(!f.length)return;const i=f.indexOf(D.activeElement);if(e.shiftKey&&(i<=0)){e.preventDefault();f[f.length-1].focus();}else if(!e.shiftKey&&i===f.length-1){e.preventDefault();f[0].focus();}else if(i<0){e.preventDefault();f[0].focus();}e.stopImmediatePropagation();}},true);
if(!D.getElementById('hsShopCss')){const l=D.createElement('link');l.id='hsShopCss';l.rel='stylesheet';l.href='herb-shop.css?v='+(((D.querySelector('meta[name="lowi-build"]')||{}).content)||'');D.head.appendChild(l);}
/* Back from Ko-fi: one calm thank-you line, no tracking, nothing unlocked. */
function back(){if(!V.away||D.visibilityState==='hidden')return;if(Date.now()-V.away<800)return;V.away=0;if(V.ov&&V.view==='plus'){V.back2=true;paint('.hs-thanks');}}
D.addEventListener('visibilitychange',back);root.addEventListener('focus',back);root.addEventListener('pageshow',back);

/* ---------- Kometa's daily gift: one small cell spot on the world Home (Oct 15) ----------
   Bottom left of the world, mirrored to the zoom button. Shows once a day until tapped. The gift is a short body fact:
   no XP (only real actions earn XP), no items. Its card also holds the quiet door to the Ko-fi support view. */
const GKEY='lowispike.gift.v1';
const FACTS=[
 ['Your liver stores sugar as glycogen and releases it between meals.','Deine Leber speichert Zucker als Glykogen und gibt ihn zwischen den Mahlzeiten frei.','Tu hígado guarda azúcar como glucógeno y lo libera entre comidas.'],
 ['A ten-minute walk after eating flattens the sugar curve.','Zehn Minuten Gehen nach dem Essen glätten die Zuckerkurve.','Caminar diez minutos después de comer suaviza la curva de azúcar.'],
 ['Fibre first, carbs last: the same meal spikes less.','Erst Ballaststoffe, dann Kohlenhydrate: dieselbe Mahlzeit steigt weniger an.','Primero fibra, luego carbohidratos: la misma comida sube menos.'],
 ['Working muscles take up sugar even without much insulin.','Arbeitende Muskeln nehmen Zucker auch mit wenig Insulin auf.','Los músculos en movimiento absorben azúcar incluso con poca insulina.'],
 ['Water instead of juice or soda: no liquid sugar.','Wasser statt Saft oder Limo: kein flüssiger Zucker.','Agua en vez de zumo o refresco: nada de azúcar líquido.'],
 ['Deep sleep makes your cells more sensitive to insulin the next day.','Tiefer Schlaf macht deine Zellen am nächsten Tag empfindlicher für Insulin.','El sueño profundo hace tus células más sensibles a la insulina al día siguiente.'],
 ['Optional: a little vinegar with a meal may help some people a bit.','Optional: Etwas Essig zum Essen kann bei manchen etwas helfen.','Opcional: un poco de vinagre con la comida puede ayudar algo a algunas personas.']];
function giftRead(){try{const g=JSON.parse(localStorage.getItem(GKEY)||'null');return g&&typeof g==='object'?g:{};}catch(e){return{};}}
function giftTaken(now){return giftRead().day===K.dayKey(now||Date.now());}
/* Oct 17 (E-man): a fact is only "taken" after a deliberate tap (Nice or Support). Opening it, an outside tap, Escape,
   or the autopilot taking over closes it unread, and the spot stays for later. No gift spot while Misty flies. */
function giftAck(now){now=now||Date.now();try{localStorage.setItem(GKEY,JSON.stringify({day:K.dayKey(now),ts:now}));}catch(e){}}
function flying(){const h=D.documentElement;return !!(h&&h.classList.contains('mf-on'));}
function giftFact(now){const d=new Date(now||Date.now()),n=Math.floor((d-new Date(d.getFullYear(),0,0))/864e5);return FACTS[n%FACTS.length][li()];}
const G={pop:null,t:0};
function ensureGift(){const hud=D.getElementById('whHud');let b=D.querySelector('.hs-gift');
 if(hud&&flying()&&!giftTaken()){if(G.pop){clearTimeout(G.t);G.pop.remove();G.pop=null;}if(b)b.remove();return null;}
 if(!hud||giftTaken()){if(b&&!G.pop)b.remove();return null;}
 if(b&&b.parentNode!==hud){b.remove();b=null;}
 if(!b){b=D.createElement('button');b.type='button';b.className='hs-gift';b.setAttribute('data-shop','gift');
  b.innerHTML='<span class="hs-gift-core" aria-hidden="true"></span>';hud.appendChild(b);}
 {const gl=nmL(L('Misty\'s gift of the day','Mistys Geschenk des Tages','El regalo del día de Misty'));if(b.getAttribute('aria-label')!==gl)b.setAttribute('aria-label',gl);}
 /* iPad: the tab bar is a rail on the left, so the spot sits just right of it */
 try{const tb=D.getElementById('tabbar'),r=tb&&tb.getBoundingClientRect();const rail=r&&r.height>r.width&&r.left<root.innerWidth/3;const gl=rail?Math.round(r.right+16)+'px':'';/* write only on change */if(b.style.getPropertyValue('--hs-gl')!==gl)b.style.setProperty('--hs-gl',gl);if(G.pop&&G.pop.style.getPropertyValue('--hs-gl')!==gl)G.pop.style.setProperty('--hs-gl',gl);}catch(e){}
 return b;}
function closeGift(){if(!G.pop)return;clearTimeout(G.t);G.pop.remove();G.pop=null;ensureGift();}
function openGift(){const now=Date.now();if(G.pop||flying())return;
 const b=D.querySelector('.hs-gift');if(b)b.classList.add('is-open');
 const pop=D.createElement('div');pop.className='hs-giftpop';pop.setAttribute('role','dialog');pop.setAttribute('aria-labelledby','hsGiftT');
 pop.className='hs-giftpop mpop';
 pop.innerHTML='<b id="hsGiftT">'+esc(nmL(L('Misty\'s gift of the day','Mistys Geschenk des Tages','El regalo del día de Misty')))+'</b>'+
  '<p>'+esc(giftFact(now))+'</p>'+
  '<div class="hs-giftrow"><button type="button" class="hs-giftok" data-shop="giftok">'+esc(L('Nice','Schön','Genial'))+'</button>'+
  '<button type="button" class="hs-giftkofi" data-shop="giftkofi">'+icon('heart','♥')+'<span>'+esc(L('Support LOWiSPIKE','LOWiSPIKE unterstützen','Apoyar LOWiSPIKE'))+'</span></button></div>';
 (D.getElementById('whHud')||D.body).appendChild(pop);G.pop=pop;if(b&&b.style.getPropertyValue('--hs-gl'))pop.style.setProperty('--hs-gl',b.style.getPropertyValue('--hs-gl'));
 const ok=pop.querySelector('.hs-giftok');if(ok)ok.focus({preventScroll:true});
 G.t=setTimeout(()=>{if(G.pop&&!G.pop.contains(D.activeElement))closeGift();},12000);
 if(b)setTimeout(()=>{if(b.parentNode&&!b.classList.contains('keep'))b.remove();},reduced()?0:420);}
D.addEventListener('click',e=>{const t=e.target;const b=t.closest&&t.closest('[data-shop]');const a=b&&b.dataset.shop;
 if(a==='gift'){e.preventDefault();e.stopPropagation();openGift();return;}
 if(a==='giftok'){e.preventDefault();e.stopPropagation();giftAck();closeGift();return;}
 if(a==='giftkofi'){e.preventDefault();e.stopPropagation();giftAck();closeGift();open('plus');return;}
 if(G.pop&&!G.pop.contains(t))closeGift();},true);
D.addEventListener('keydown',e=>{if(G.pop&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();closeGift();}},true);
setInterval(ensureGift,2000);root.addEventListener('resize',()=>ensureGift());D.addEventListener('visibilitychange',()=>{if(D.visibilityState==='visible')ensureGift();});setTimeout(ensureGift,600);
root.LowiHerbShop={open,close,entryHTML,gift:{spot:ensureGift,open:openGift,close:closeGift,taken:giftTaken,ack:giftAck},state:read,isOpen:()=>!!V.ov,kofiUrl:()=>K.kofiUrl()};
})(window);
