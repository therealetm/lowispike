/* LOWiSPIKE Circles, formerly Rooms (OWNER-REQUESTS 6, Emmanuel 23 Oct 2026; renamed in the app the same day): circles people create themselves, Discord style, for the same goal or the
   same struggle ("same illness or goal"). Opens from the Community menu (Circles, first item).
   - The creator can also add people directly (Add people: real people only, no bots or test accounts); normal members can't.
   - Everyone signed in sees every room as a living bubble and can read along (public).
   - Join = ask. Only the creator lets people in (Let in / Not now). At most 30 members. The server enforces all of it
     (supabase/proposals/user_rooms_20261023.sql); the app only mirrors it.
   - Members write; the messages live in the existing messages table with room 'u:<id>', so the galaxy chat never shows them.
   - Tapping a room bubble zooms into the room from that bubble (transform-origin = the bubble), back zooms out again.
   Rules: user-rooms-core.js. Look: user-rooms.css. Tests: tests/user-rooms.test.cjs, browser check tools/user-rooms/check.cjs. */
(function(W,D){
'use strict';
const K=W.LowiUserRoomsCore;if(!K)return;
const T={
 rooms:['Circles','Circles','Círculos'],sub:['Circles for the same goal or the same struggle. Everyone can read along. The creator lets people in or adds them. Up to {cap} per circle.','Circles für dasselbe Ziel oder dasselbe Thema. Alle dürfen mitlesen. Wer den Circle erstellt hat, lässt Leute rein oder fügt sie hinzu. Bis zu {cap} pro Circle.','Círculos para el mismo objetivo o el mismo tema. Todos pueden leer. Quien crea el círculo deja entrar o añade gente. Hasta {cap} por círculo.'],
 make:['Create a circle','Circle erstellen','Crear círculo'],makeGo:['Create','Erstellen','Crear'],name:['Name, e.g. Type 2 together','Name, z. B. Typ 2 gemeinsam','Nombre, p. ej. Tipo 2 juntos'],topic:['What is it about? (optional)','Worum geht es? (freiwillig)','¿De qué trata? (opcional)'],
 icon:['Pick a bubble','Wähle eine Bubble','Elige una burbuja'],empty:['No circles yet. Start the first one.','Noch keine Circles. Starte den ersten.','Aún no hay círculos. Crea el primero.'],
 count:['{c}/{cap}','{c}/{cap}','{c}/{cap}'],yours:['Yours','Deiner','Tuyo'],inRoom:['In','Drin','Dentro'],asked:['Asked','Angefragt','Pedido'],full:['Full','Voll','Lleno'],
 by:['by {n}','von {n}','de {n}'],ask:['Ask to join','Beitritt anfragen','Pedir entrar'],waiting:['Asked. {n} decides.','Angefragt. {n} entscheidet.','Pedido. {n} decide.'],fullLong:['This circle is full ({cap} of {cap}).','Dieser Circle ist voll ({cap} von {cap}).','Este círculo está lleno ({cap} de {cap}).'],
 readAlong:['You can read along. Ask to join to write.','Du kannst mitlesen. Frag an, um zu schreiben.','Puedes leer. Pide entrar para escribir.'],
 asks:['Wants to join','Möchte rein','Quiere entrar'],letIn:['Let in','Reinlassen','Dejar entrar'],notNow:['Not now','Jetzt nicht','Ahora no'],members:['Members','Mitglieder','Miembros'],
 say:['Write to the circle…','Schreib in den Circle…','Escribe al círculo…'],send:['Send','Senden','Enviar'],quiet:['No messages yet. Say hi.','Noch keine Nachrichten. Sag Hallo.','Aún no hay mensajes. Saluda.'],
 leave:['Leave circle','Circle verlassen','Salir del círculo'],del:['Delete circle','Circle löschen','Borrar círculo'],delQ:['Delete this circle and its members list? Messages stay hidden.','Diesen Circle und seine Mitgliederliste löschen?','¿Borrar este círculo y su lista de miembros?'],
 back:['Back','Zurück','Atrás'],close:['Close','Schließen','Cerrar'],cancel:['Cancel','Abbrechen','Cancelar'],you:['You','Du','Tú'],
 add:['Add people','Leute hinzufügen','Añadir gente'],addSub:['Tap Add and they are in your circle right away.','Tippe auf Hinzufügen und sie sind sofort in deinem Circle.','Toca Añadir y entran a tu círculo al momento.'],
 find:['Search a name','Namen suchen','Buscar un nombre'],addOne:['Add','Hinzufügen','Añadir'],added:['{n} is in.','{n} ist drin.','{n} ya está dentro.'],looking:['Looking for people…','Suche Leute…','Buscando gente…'],
 noPeople:['Nobody to add right now.','Gerade niemand zum Hinzufügen.','Ahora no hay nadie para añadir.'],noMatch:['No one with that name.','Niemand mit diesem Namen.','Nadie con ese nombre.'],
 e_full:['The circle is full.','Der Circle ist voll.','El círculo está lleno.'],e_limit:['You can create up to {m} circles.','Du kannst bis zu {m} Circles erstellen.','Puedes crear hasta {m} círculos.'],
 e_members:['Only members can write here.','Nur Mitglieder können hier schreiben.','Solo los miembros pueden escribir aquí.'],e_offline:['You’re offline. Try again in a moment.','Du bist offline. Versuch es gleich noch mal.','Sin conexión. Inténtalo de nuevo.'],
 e_owner:['Only the creator can add people.','Nur wer den Circle erstellt hat, kann Leute hinzufügen.','Solo quien crea el círculo puede añadir gente.'],e_bot:['Bots can’t join circles.','Bots können keinem Circle beitreten.','Los bots no pueden unirse a círculos.'],
 e_soon:['Circles are coming soon.','Circles kommen bald.','Los círculos llegan pronto.'],e_error:['That didn’t work. Try again.','Das hat nicht geklappt. Versuch es noch mal.','No funcionó. Inténtalo de nuevo.'],
 e_sign:['Sign in to use Circles.','Melde dich an, um Circles zu nutzen.','Inicia sesión para usar los círculos.'],asked1:['Asked. {n} gets your request.','Angefragt. {n} bekommt deine Anfrage.','Pedido. {n} recibe tu solicitud.'],
 now:['now','jetzt','ahora'],
 info:['Circle info','Circle-Info','Info del círculo'],more:['More','Mehr','Más'],copy:['Copy','Kopieren','Copiar'],copied:['Copied','Kopiert','Copiado'],delMsg:['Delete message','Nachricht löschen','Borrar mensaje'],
 react:['React','Reagieren','Reaccionar'],today:['Today','Heute','Hoy'],yesterday:['Yesterday','Gestern','Ayer'],askBar:['{n} wants to join','{n} möchte rein','{n} quiere entrar'],
 askBarN:['{c} want to join','{c} möchten rein','{c} quieren entrar'],e_slow:['Slow down a little, then send again.','Kurz langsamer, dann noch mal senden.','Más despacio y vuelve a enviar.']};
function lang(){try{return Math.max(0,['en','de','es'].indexOf((W.LowiLang&&W.LowiLang.get())||localStorage.getItem('lowispike.lang')||'en'));}catch(e){return 0;}}
function tr(k,v){let s=(T[k]||[k])[lang()]||T[k][0];v=Object.assign({cap:K.CAP,m:K.MAX_OWN},v||{});for(const x in v)s=s.split('{'+x+'}').join(String(v[x]));return s;}
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const X=()=>W.LOWI_CLOUD_X||null;
function me(){try{const x=X();return (x&&x.state().uid)||'';}catch(e){return '';}}
function myName(){try{const s=JSON.parse(localStorage.getItem('lowispike.v2')||'{}');const n=s&&s.user&&s.user.name;if(n)return String(n).trim().slice(0,40);}catch(e){}return 'Member';}
async function sb(){const x=X();if(!x||!x.client)throw new Error('offline');return x.client();}
async function q(p){const r=await Promise.race([p,new Promise((_,no)=>setTimeout(()=>no(new Error('timeout')),12000))]);if(r&&r.error)throw r.error;return r?r.data:null;}
let el=null,rooms=[],members=[],msgs=[],cur='',mode='list',err='',busy=false,poll=0,origin='50% 30%',loaded=false,soon=false,draft='',mkIcon=K.ICONS[0],mkName='',mkTopic='',cands=null,find='',addedName='',testIds=null,rx=[],pick='',info=null,sent=[],copied='';
async function load(){if(!me()){err='sign';return;}
 try{const c=await sb();const [r,m]=await Promise.all([q(c.from('user_rooms').select('id,owner_id,owner_name,name,topic,icon,created_at').order('created_at',{ascending:false}).limit(300)),q(c.from('user_room_members').select('room_id,user_id,who,status,created_at').limit(9000))]);
  if(!testIds){try{testIds=new Set((await q(c.from('profiles').select('id').eq('test',true).limit(5000))||[]).map(x=>x.id));}catch(x){testIds=new Set();}}
  rooms=K.visible(r||[],testIds,me());members=m||[];loaded=true;soon=false;if(err==='soon'||err==='offline'||err==='sign')err='';}
 catch(e){const w=K.why(e);if(w==='soon')soon=true;err=w;}}
async function loadMsgs(){if(!cur)return;const at=cur;try{const c=await sb();const r=await q(c.from('messages').select('id,user_id,who,body,created_at').eq('room',K.chan(cur)).order('created_at',{ascending:false}).limit(100));if(at!==cur)return;
  const fresh=(r||[]).reverse(),local=msgs.filter(m=>m.local&&!fresh.some(f=>f.id===m.id));msgs=fresh.concat(local);
  const ids=fresh.map(m=>m.id);if(ids.length){try{const x=await q(c.from('reactions').select('message_id,user_id,emoji').in('message_id',ids));if(at===cur&&!rxBusy)rx=x||[];}catch(e){}}else rx=[];
  const last=fresh[fresh.length-1];if(last&&W.LowiChatSwitch)W.LowiChatSwitch.markSeen(cur,last.created_at);}catch(e){}}
function room(){return rooms.find(r=>r.id===cur)||null;}
function timeOf(ts){const d=Date.now()-(Date.parse(ts)||0);if(d<60e3)return tr('now');if(d<3600e3)return Math.floor(d/60e3)+' min';if(d<86400e3)return Math.floor(d/3600e3)+' h';try{return new Date(ts).toLocaleDateString();}catch(e){return '';}}
function orb(ic,cls){return '<span class="ur-orb'+(cls?' '+cls:'')+'" aria-hidden="true"><i>'+esc(ic)+'</i></span>';}
function chip(st,full){return st==='owner'?'<em class="ur-chip ur-own">'+esc(tr('yours'))+'</em>':st==='member'?'<em class="ur-chip ur-in">'+esc(tr('inRoom'))+'</em>':st==='pending'?'<em class="ur-chip">'+esc(tr('asked'))+'</em>':full?'<em class="ur-chip ur-full">'+esc(tr('full'))+'</em>':'';}
function listHtml(){const id=me(),L=K.list(rooms,members,id);
 let h='<header class="ur-top"><h2 class="ur-h">'+esc(tr('rooms'))+'</h2><button type="button" class="ur-x" data-ur="close" aria-label="'+esc(tr('close'))+'">×</button></header><p class="ur-sub">'+esc(tr('sub'))+'</p>';
 if(err&&err!=='full'&&err!=='limit'&&err!=='members')h+='<p class="ur-err" role="status">'+esc(tr('e_'+err))+'</p>';
 if(soon||err==='sign')return h;
 h+='<div class="ur-grid">';
 if(K.canCreate(rooms,id))h+='<button type="button" class="ur-room ur-new" data-ur="make">'+orb('+','ur-plus')+'<b>'+esc(tr('make'))+'</b></button>';
 for(const r of L)h+='<button type="button" class="ur-room" data-ur="open" data-id="'+esc(r.id)+'">'+orb(r.icon,r.status==='none'?'':'ur-mine')+'<b>'+esc(r.name)+'</b><small>'+esc(tr('count',{c:r.count}))+'</small>'+chip(r.status,r.full)+'</button>';
 h+='</div>';if(loaded&&!L.length)h+='<p class="ur-empty">'+esc(tr('empty'))+'</p>';
 if(err==='limit')h+='<p class="ur-err" role="status">'+esc(tr('e_limit'))+'</p>';return h;}
function makeHtml(){const ok=!!K.cleanName(mkName);
 return '<header class="ur-top"><button type="button" class="ur-back" data-ur="list" aria-label="'+esc(tr('back'))+'">‹</button><h2 class="ur-h">'+esc(tr('make'))+'</h2><button type="button" class="ur-x" data-ur="close" aria-label="'+esc(tr('close'))+'">×</button></header>'
  +'<div class="ur-make"><div class="ur-preview">'+orb(mkIcon,'ur-big ur-mine')+'</div><p class="ur-lab">'+esc(tr('icon'))+'</p><div class="ur-icons" role="radiogroup" aria-label="'+esc(tr('icon'))+'">'
  +K.ICONS.map(ic=>'<button type="button" role="radio" aria-checked="'+(ic===mkIcon)+'" data-ur="icon" data-ic="'+esc(ic)+'">'+esc(ic)+'</button>').join('')+'</div>'
  +'<input class="ur-in ur-name" maxlength="'+K.NAME_MAX+'" autocomplete="off" enterkeyhint="next" placeholder="'+esc(tr('name'))+'" aria-label="'+esc(tr('name'))+'" value="'+esc(mkName)+'">'
  +'<textarea class="ur-in ur-topic" rows="2" maxlength="'+K.TOPIC_MAX+'" placeholder="'+esc(tr('topic'))+'" aria-label="'+esc(tr('topic'))+'">'+esc(mkTopic)+'</textarea>'
  +(err&&err!=='full'?'<p class="ur-err" role="status">'+esc(tr('e_'+err))+'</p>':'')
  +'<button type="button" class="ur-go" data-ur="create"'+(ok&&!busy?'':' disabled')+'>'+esc(tr('makeGo'))+'</button></div>';}
/* Circle chat (chat redesign, 24 Oct 2026): the same clean presentation as the community chat. Header = back, the circle's
   name (tap it for Circle info: topic, people, Add people, asks, leave/delete), close. Under it the room switcher strip
   (chat-switcher.js). Messages as bubbles: yours on the right, others on the left with their companion's face and name,
   grouped while the same person keeps writing, the time inside the bubble, day dividers. Each bubble has one quiet ···
   button: the standard reactions (counts under the bubble), Copy, and Delete for your own message. Members only write and
   react; people reading along see the thread and Ask to join. */
const RX=()=>{const C=W.LowiChatCore;return (C&&C.EMOJI)||['\u{1F44D}','\u2764\uFE0F','\u{1F602}','\u{1F62E}','\u{1F622}','\u{1F64F}'];};
const RX_ALL=()=>{const C=W.LowiChatCore;return (C&&C.ALL_EMOJI)||RX();};
let rxBusy=0;
function loc(){return ['en-GB','de-DE','es-ES'][lang()];}
function hm(ts){try{return new Date(ts).toLocaleTimeString(loc(),{hour:'2-digit',minute:'2-digit'});}catch(e){return '';}}
function dayOf(ts){const d=new Date(Date.parse(ts)||Date.now());return d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate();}
function dayLabel(ts){const t=Date.parse(ts)||Date.now(),k=dayOf(ts);if(k===dayOf(new Date().toISOString()))return tr('today');if(k===dayOf(new Date(Date.now()-864e5).toISOString()))return tr('yesterday');
 try{return new Date(t).toLocaleDateString(loc(),{weekday:'short',day:'numeric',month:'short'});}catch(e){return '';}}
function faceHtml(uid,who){const C=W.LowiCommunity;let f='';try{f=C&&C.face?C.face(uid,'')||'':'';}catch(e){f='';}
 return f?'<span class="ur-face">'+f+'</span>':'<span class="ur-face ur-face-i"><i>'+esc(K.initials(who||'?'))+'</i></span>';}
function hue(uid){try{const C=W.LowiCommunity;return C&&C.colorOf?C.colorOf(uid)||'':'';}catch(e){return '';}}
function blockedBy(uid){try{const C=W.LowiCommunity;return !!(C&&C.blocked&&C.blocked(uid));}catch(e){return false;}}
function rxOf(mid){const id=me(),by={};for(const r of rx)if(r.message_id===mid){const o=by[r.emoji]||(by[r.emoji]={n:0,on:false});o.n++;if(r.user_id===id)o.on=true;}
 return RX_ALL().filter(e=>by[e]&&by[e].n).map(e=>({e,n:by[e].n,on:by[e].on}));}
function msgHtml(m,prev,next,can){const id=me(),mine=m.user_id===id,joins=(a,b)=>a&&b&&a.user_id===b.user_id&&dayOf(a.created_at)===dayOf(b.created_at)&&Math.abs((Date.parse(b.created_at)||0)-(Date.parse(a.created_at)||0))<5*60e3;
 const first=!joins(prev,m),last=!joins(m,next),who=mine?tr('you'):(m.who||'Member'),R=rxOf(m.id),open=pick===m.id;
 let h='<li class="ur-m '+(mine?'ur-me':'ur-them')+(first?' ur-first':'')+(last?' ur-last':'')+(m.local?' ur-sending':'')+'" data-mid="'+esc(m.id)+'">';
 if(!mine)h+=last?'<button type="button" class="ur-av" data-ur="who" data-u="'+esc(m.user_id)+'" data-n="'+esc(who)+'" aria-label="'+esc(who)+'">'+faceHtml(m.user_id,who)+'</button>':'<span class="ur-av ur-av-gap" aria-hidden="true"></span>';
 h+='<div class="ur-col"><div class="ur-bub">';
 if(!mine&&first){const c=hue(m.user_id);h+='<button type="button" class="ur-who" data-ur="who" data-u="'+esc(m.user_id)+'" data-n="'+esc(who)+'"'+(c?' style="color:'+esc(c)+'"':'')+'>'+esc(who)+'</button>';}
 h+='<span class="ur-body">'+esc(m.body)+'</span><span class="ur-meta"><time datetime="'+esc(m.created_at)+'">'+esc(hm(m.created_at))+'</time></span>';
 if(!m.local)h+='<button type="button" class="ur-more" data-ur="more" data-mid="'+esc(m.id)+'" aria-haspopup="menu" aria-expanded="'+open+'" aria-label="'+esc(tr('more'))+'"><i aria-hidden="true"></i></button>';
 h+='</div>';
 if(R.length)h+='<div class="ur-rx">'+R.map(x=>'<button type="button" class="ur-rxc'+(x.on?' ur-on':'')+'" data-ur="rx" data-mid="'+esc(m.id)+'" data-em="'+esc(x.e)+'" aria-pressed="'+x.on+'"'+(can?'':' disabled')+'>'+esc(x.e)+'<b>'+x.n+'</b></button>').join('')+'</div>';
 if(open){h+='<div class="ur-menu" role="menu" aria-label="'+esc(tr('more'))+'">';
  if(can)h+='<div class="ur-rxrow" role="group" aria-label="'+esc(tr('react'))+'">'+RX().map(e=>{const on=R.some(x=>x.e===e&&x.on);return '<button type="button" role="menuitemcheckbox" aria-checked="'+on+'" class="ur-rxe'+(on?' ur-on':'')+'" data-ur="rx" data-mid="'+esc(m.id)+'" data-em="'+esc(e)+'">'+esc(e)+'</button>';}).join('')+'</div>';
  h+='<button type="button" role="menuitem" class="ur-mi" data-ur="copy" data-mid="'+esc(m.id)+'">'+esc(copied===m.id?tr('copied'):tr('copy'))+'</button>';
  if(mine)h+='<button type="button" role="menuitem" class="ur-mi ur-mi-del" data-ur="delm" data-mid="'+esc(m.id)+'">'+esc(tr('delMsg'))+'</button>';
  h+='</div>';}
 return h+'</div></li>';}
function threadHtml(can){const L=msgs.filter(m=>m.user_id===me()||!blockedBy(m.user_id));if(!L.length)return '<ol class="ur-msgs ur-thread" aria-live="polite"><li class="ur-quiet">'+esc(tr('quiet'))+'</li></ol>';
 let h='<ol class="ur-msgs ur-thread" aria-live="polite">',day='';
 L.forEach((m,i)=>{const d=dayOf(m.created_at);if(d!==day){day=d;h+='<li class="ur-day" role="separator"><span>'+esc(dayLabel(m.created_at))+'</span></li>';}h+=msgHtml(m,L[i-1],L[i+1],can);});
 return h+'</ol>';}
function infoHtml(r,st,inn,id){let h='<section class="ur-info" aria-label="'+esc(tr('info'))+'">';
 if(r.topic)h+='<p class="ur-sub">'+esc(r.topic)+'</p>';
 h+='<p class="ur-lab">'+esc(tr('members'))+' · '+esc(tr('count',{c:inn.count}))+'</p><div class="ur-people" aria-label="'+esc(tr('members'))+'">'+inn.people.slice(0,K.CAP).map(p=>{const self=p.user_id===id,n=self?myName():p.who||'?';
  return '<button type="button" class="ur-p'+(p.user_id===r.owner_id?' ur-p-own':'')+'" data-ur="who" data-u="'+esc(p.user_id)+'" data-n="'+esc(n)+'" title="'+esc(p.who||'')+'"'+(self?' disabled':'')+'>'+faceHtml(p.user_id,n)+'<small>'+esc(self?tr('you'):(p.who||'').split(' ')[0])+'</small></button>';}).join('')+'</div>';
 if(st==='owner')h+='<button type="button" class="ur-addbtn" data-ur="add"'+(K.canAdd(st,inn.full)?'':' disabled')+'><i aria-hidden="true">+</i>'+esc(tr('add'))+'</button>';
 if(st==='owner'&&addedName)h+='<p class="ur-ok" role="status">'+esc(tr('added',{n:addedName}))+'</p>';
 if(inn.asks.length)h+='<div class="ur-asks"><p class="ur-lab">'+esc(tr('asks'))+'</p>'+inn.asks.map(a=>'<div class="ur-ask"><b>'+esc(a.who||'Member')+'</b><span><button type="button" class="ur-yes" data-ur="let" data-u="'+esc(a.user_id)+'"'+(inn.full?' disabled':'')+'>'+esc(tr('letIn'))+'</button><button type="button" class="ur-no" data-ur="deny" data-u="'+esc(a.user_id)+'">'+esc(tr('notNow'))+'</button></span></div>').join('')+'</div>';
 if(st==='member')h+='<button type="button" class="ur-quietbtn" data-ur="leave">'+esc(tr('leave'))+'</button>';
 if(st==='owner')h+='<button type="button" class="ur-quietbtn ur-del" data-ur="del">'+esc(tr('del'))+'</button>';
 return h+'</section>';}
const SEND_SVG='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12l15-7-5 15-2.6-5.4z" fill="currentColor"/></svg>';
function roomHtml(){const r=room();if(!r)return listHtml();const id=me(),st=K.status(r,members,id),inn=K.inside(r,members,id),act=K.action(st,inn.full),owner=r.owner_name||'…';
 const can=st==='owner'||st==='member',showInfo=info==null?(st==='owner'&&(inn.count<=1||inn.asks.length>0)):info;
 let h='<header class="ur-top ur-chead"><button type="button" class="ur-back" data-ur="list" aria-label="'+esc(tr('back'))+'">‹</button>'
  +'<button type="button" class="ur-title ur-cname" data-ur="info" aria-expanded="'+showInfo+'" aria-label="'+esc(r.name+', '+tr('info'))+'">'+orb(K.icon(r.icon),'ur-sm'+(st==='none'?'':' ur-mine'))+'<span><h2 class="ur-h">'+esc(r.name)+'</h2><small>'+esc(tr('by',{n:owner}))+' · '+esc(tr('count',{c:inn.count}))+'</small></span><i class="ur-caret" aria-hidden="true"></i></button>'
  +'<button type="button" class="ur-x" data-ur="close" aria-label="'+esc(tr('close'))+'">×</button></header>';
 if(W.LowiChatSwitch)h+=W.LowiChatSwitch.html(r.id,can?null:{id:r.id,name:r.name,icon:K.icon(r.icon)});
 if(st==='owner'&&inn.asks.length&&!showInfo)h+='<button type="button" class="ur-askbar" data-ur="info">'+esc(inn.asks.length===1?tr('askBar',{n:inn.asks[0].who||'Member'}):tr('askBarN',{c:inn.asks.length}))+'</button>';
 if(showInfo)h+=infoHtml(r,st,inn,id);
 h+=threadHtml(can);
 if(err==='full'||err==='members'||err==='slow'||(err==='error'&&can))h+='<p class="ur-err" role="status">'+esc(tr('e_'+err))+'</p>';
 if(act==='write')h+='<form class="ur-say" data-ur-form="say"><input class="ur-in ur-text" maxlength="'+K.BODY_MAX+'" autocomplete="off" enterkeyhint="send" placeholder="'+esc(tr('say'))+'" aria-label="'+esc(tr('say'))+'" value="'+esc(draft)+'"><button type="submit" class="ur-go ur-send" aria-label="'+esc(tr('send'))+'"'+(busy?' disabled':'')+'>'+SEND_SVG+'</button></form>';
 else h+='<div class="ur-foot"><p>'+esc(act==='asked'?tr('waiting',{n:owner}):act==='full'?tr('fullLong'):tr('readAlong'))+'</p>'+(act==='ask'?'<button type="button" class="ur-go" data-ur="ask"'+(busy?' disabled':'')+'>'+esc(tr('ask'))+'</button>':act==='asked'?'<button type="button" class="ur-no" data-ur="leave">'+esc(tr('cancel'))+'</button>':'')+'</div>';
 return h;}
/* reactions: one per emoji per person (the server's key), optimistic, rolled back when the write fails */
async function toggleRx(mid,em){const id=me();if(!id||!RX_ALL().includes(em))return;const on=rx.some(r=>r.message_id===mid&&r.user_id===id&&r.emoji===em);
 if(!on&&!RX().includes(em))return;const before=rx.slice();rx=on?rx.filter(r=>!(r.message_id===mid&&r.user_id===id&&r.emoji===em)):rx.concat([{message_id:mid,user_id:id,emoji:em}]);pick='';rxBusy++;paint();
 try{const c=await sb();if(on)await q(c.from('reactions').delete().match({message_id:mid,user_id:id,emoji:em}));else await q(c.from('reactions').insert({message_id:mid,user_id:id,who:myName(),emoji:em}));}
 catch(e){rx=before;err='error';}rxBusy--;paint();}
/* light anti-spam on top of the server's member-only rule: at most 5 messages in 10 seconds, and not the same text twice in a row within a minute */
function tooFast(body){const now=Date.now();sent=sent.filter(x=>now-x.t<60e3);if(sent.filter(x=>now-x.t<10e3).length>=5)return true;const l=sent[sent.length-1];return !!(l&&l.b===body&&now-l.t<60e3);}
/* Add people (creator only): real people, nobody already in or asked, search by name, Add puts them straight in */
function botCheck(){const demo=new Set((W.LOWI_BOTS||[]).map(b=>String((b&&(b.name||b.n))||b||'').toLowerCase()).filter(Boolean)),BA=W.LowiBotAccounts,HA=W.LowiHiddenAccounts,RC=W.LowiRankingCore;
 return p=>{try{if(demo.has(String(p.name||'').toLowerCase()))return true;if(BA&&BA.isBot&&BA.isBot(p))return true;if(HA&&HA.isHidden&&HA.isHidden(p.id))return true;
  if(RC&&RC.isOwner&&RC.OWNER&&RC.isOwner({uid:p.id,n:p.name})&&p.id!==RC.OWNER.main)return true;}catch(e){}return false;};}
async function loadCands(){try{const c=await sb();let r;
  try{r=await q(c.from('profiles').select('id,name,bot,test').neq('name','').limit(3000));}
  catch(e){r=await q(c.from('profiles').select('id,name').neq('name','').limit(3000));}
  cands=r||[];}
 catch(e){try{cands=(W.LOWI_CLOUD&&W.LOWI_CLOUD.people?W.LOWI_CLOUD.people():[])||[];}catch(x){cands=[];}}}
function addHtml(){const r=room();if(!r)return listHtml();const id=me(),st=K.status(r,members,id),inn=K.inside(r,members,id);if(st!=='owner')return roomHtml();
 const mine=cands&&cands.find(p=>p&&p.id===id),all=cands?K.addable(cands,r,members,id,botCheck(),!!(mine&&mine.test===true)):[],L=K.match(all,find);
 let h='<header class="ur-top"><button type="button" class="ur-back" data-ur="room" aria-label="'+esc(tr('back'))+'">‹</button><div class="ur-title">'+orb(K.icon(r.icon),'ur-sm ur-mine')+'<span><h2 class="ur-h">'+esc(tr('add'))+'</h2><small>'+esc(r.name)+' · '+esc(tr('count',{c:inn.count}))+'</small></span></div><button type="button" class="ur-x" data-ur="close" aria-label="'+esc(tr('close'))+'">×</button></header>';
 h+='<p class="ur-sub">'+esc(inn.full?tr('fullLong'):tr('addSub'))+'</p>';
 if(addedName)h+='<p class="ur-ok" role="status">'+esc(tr('added',{n:addedName}))+'</p>';
 if(err)h+='<p class="ur-err" role="status">'+esc(tr('e_'+err))+'</p>';
 h+='<input class="ur-in ur-find" type="search" autocomplete="off" enterkeyhint="search" placeholder="'+esc(tr('find'))+'" aria-label="'+esc(tr('find'))+'" value="'+esc(find)+'">';
 h+='<ul class="ur-cands">'+(!cands?'<li class="ur-quiet">'+esc(tr('looking'))+'</li>':!L.length?'<li class="ur-quiet">'+esc(tr(all.length?'noMatch':'noPeople'))+'</li>'
  :L.slice(0,200).map(p=>'<li class="ur-cand"><span class="ur-p"><i>'+esc(K.initials(p.name))+'</i></span><b>'+esc(p.name)+'</b><button type="button" class="ur-yes" data-ur="addp" data-u="'+esc(p.id)+'" data-n="'+esc(p.name)+'"'+(inn.full||busy?' disabled':'')+'>'+esc(tr('addOne'))+'</button></li>').join(''))+'</ul>';
 return h;}
function paint(){if(!el)return;const card=el.querySelector('.ur-card');const a=D.activeElement,keep=a&&card.contains(a)&&a.classList&&a.classList.contains('ur-in')?{cls:[...a.classList].find(c=>c!=='ur-in'),s:a.selectionStart,e:a.selectionEnd}:null;
 const h=mode==='make'?makeHtml():mode==='add'?addHtml():mode==='room'?roomHtml():listHtml();if(card.__h===h)return;const ol=card.querySelector('.ur-msgs'),atEnd=!ol||ol.scrollTop+ol.clientHeight>=ol.scrollHeight-40,top0=ol?ol.scrollTop:0,same=card.dataset.mode===mode&&card.dataset.cur===cur;
 card.innerHTML=h;card.__h=h;card.dataset.mode=mode;
 card.dataset.cur=cur;const ol2=card.querySelector('.ur-msgs');if(ol2){if(atEnd||!same)ol2.scrollTop=ol2.scrollHeight;else ol2.scrollTop=top0;
  if(pick&&same){const mn=ol2.querySelector('.ur-menu');if(mn){const a=mn.getBoundingClientRect(),o=ol2.getBoundingClientRect();if(a.bottom>o.bottom)ol2.scrollTop+=a.bottom-o.bottom+8;}}}
 if(keep&&keep.cls){const n=card.querySelector('.'+keep.cls);if(n){n.focus({preventScroll:true});try{n.setSelectionRange(keep.s,keep.e);}catch(e){}}}}
function go(m,id,from){if(m!=='add'&&m!=='room')addedName='';if(m!=='add')find='';mode=m;if(id!=null)cur=id;err='';const card=el&&el.querySelector('.ur-card');
 if(card){if(from&&from.getBoundingClientRect){const b=from.getBoundingClientRect(),c=card.getBoundingClientRect();origin=Math.round(b.left+b.width/2-c.left)+'px '+Math.round(b.top+b.height/2-c.top)+'px';}
  card.style.setProperty('--ur-o',origin);card.classList.remove('ur-zoom-in','ur-zoom-out');void card.offsetWidth;card.classList.add(m==='list'?'ur-zoom-out':'ur-zoom-in');}
 if(m==='room'){if(id!=null||!msgs.length){msgs=[];rx=[];info=null;}pick='';loadMsgs().then(paint);}if(m==='add'){cands=null;loadCands().then(paint);}paint();}
async function act(fn,after){if(busy)return;busy=true;err='';paint();try{await fn();await load();if(after)await after();}catch(e){err=K.why(e);if(err==='soon')soon=true;}busy=false;paint();}
async function onClick(e){if(e.target===el){close();return;}const b=e.target.closest('[data-ur]');if(pick&&(!b||!/^(more|rx|copy|delm)$/.test(b.dataset.ur))){pick='';paint();}if(!b||b.disabled)return;const k=b.dataset.ur,id=me();
 if(k==='close')close();else if(k==='list')go('list');else if(k==='make'){mkName='';mkTopic='';mkIcon=K.ICONS[0];go('make',null,b);setTimeout(()=>{const n=el&&el.querySelector('.ur-name');if(n)n.focus({preventScroll:true});},260);}
 else if(k==='open')go('room',b.dataset.id,b);
 else if(k==='info'){const r=room();if(!r)return;const st=K.status(r,members,id),inn=K.inside(r,members,id),now=info==null?(st==='owner'&&(inn.count<=1||inn.asks.length>0)):info;info=!now;pick='';paint();}
 else if(k==='more'){pick=pick===b.dataset.mid?'':b.dataset.mid;copied='';paint();}
 else if(k==='rx')await toggleRx(b.dataset.mid,b.dataset.em);
 else if(k==='copy'){const m=msgs.find(x=>x.id===b.dataset.mid);if(m){try{await W.navigator.clipboard.writeText(m.body);}catch(e){}copied=m.id;paint();setTimeout(()=>{if(copied===m.id){copied='';pick='';paint();}},900);}}
 else if(k==='delm'){const mid=b.dataset.mid,before=msgs.slice();msgs=msgs.filter(x=>x.id!==mid);pick='';paint();try{const c=await sb();await q(c.from('messages').delete().eq('id',mid).eq('user_id',id));}catch(e){msgs=before;err='error';paint();}}
 else if(k==='who'){const u=b.dataset.u,C=W.LowiCommunity;if(u&&u!==id&&C&&C.openProfile){try{C.openProfile(u,b.dataset.n||'');}catch(e){}}}
 else if(k==='room')go('room');
 else if(k==='add'){addedName='';go('add',null,b);}
 else if(k==='addp'){const u=b.dataset.u,n=K.cleanName(b.dataset.n)||'Member';addedName='';await act(async()=>{const c=await sb();await q(c.from('user_room_members').insert({room_id:cur,user_id:u,who:n,status:'member'}));});if(!err)addedName=n;paint();}
 else if(k==='icon'){mkIcon=K.icon(b.dataset.ic);paint();}
 else if(k==='create'){const name=K.cleanName(mkName);if(!name)return;let made=null;
  await act(async()=>{const c=await sb();made=await q(c.from('user_rooms').insert({owner_id:id,owner_name:myName(),name,topic:K.cleanTopic(mkTopic),icon:K.icon(mkIcon)}).select('id').single());});
  if(made&&made.id&&!err){mkName='';mkTopic='';go('room',made.id);}}
 else if(k==='ask'){await act(async()=>{const c=await sb();await q(c.from('user_room_members').insert({room_id:cur,user_id:id,who:myName()}));});}
 else if(k==='let'){const u=b.dataset.u;await act(async()=>{const c=await sb();await q(c.from('user_room_members').update({status:'member'}).eq('room_id',cur).eq('user_id',u));});}
 else if(k==='deny'){const u=b.dataset.u;await act(async()=>{const c=await sb();await q(c.from('user_room_members').delete().eq('room_id',cur).eq('user_id',u));});}
 else if(k==='leave'){await act(async()=>{const c=await sb();await q(c.from('user_room_members').delete().eq('room_id',cur).eq('user_id',id));});}
 else if(k==='del'){if(!W.confirm(tr('delQ')))return;await act(async()=>{const c=await sb();await q(c.from('user_rooms').delete().eq('id',cur).eq('owner_id',id));});if(!err)go('list');}}
async function onSubmit(e){const f=e.target.closest('[data-ur-form]');if(!f)return;e.preventDefault();const inp=f.querySelector('.ur-text'),body=K.cleanBody(inp&&inp.value);if(!body||busy)return;
 const r=room();if(!r)return;if(tooFast(body)){err='slow';paint();return;}sent.push({t:Date.now(),b:body});draft='';const id=me(),mid='u'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
 msgs.push({id:mid,user_id:id,who:myName(),body,created_at:new Date().toISOString(),local:true});err='';paint();
 try{const c=await sb();await q(c.from('messages').insert({id:mid,user_id:id,room:K.chan(r.id),who:myName(),body}));err='';const m=msgs.find(x=>x.id===mid);if(m)delete m.local;if(W.LowiChatSwitch)W.LowiChatSwitch.markSeen(r.id,new Date().toISOString());}catch(x){err=K.why(x);msgs=msgs.filter(m=>m.id!==mid);draft=body;}
 paint();const n=el&&el.querySelector('.ur-text');if(n)n.focus({preventScroll:true});}
function onInput(e){const t=e.target;if(t.classList.contains('ur-name')){mkName=t.value;const g=el.querySelector('.ur-go');if(g)g.disabled=!K.cleanName(mkName)||busy;}else if(t.classList.contains('ur-topic'))mkTopic=t.value;else if(t.classList.contains('ur-text'))draft=t.value;else if(t.classList.contains('ur-find')){find=t.value;paint();}}
function onKey(e){if(e.key==='Escape'){e.stopPropagation();if(pick){pick='';paint();return;}if(mode==='list')close();else go(mode==='add'?'room':'list');}else if(e.key==='Enter'&&e.target.classList&&e.target.classList.contains('ur-name')){e.preventDefault();const g=el.querySelector('[data-ur="create"]');if(g&&!g.disabled)g.click();}}
function open(roomId){if(!el){el=D.createElement('div');el.className='ur';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('data-noi18n','');el.innerHTML='<div class="ur-card"></div>';
  el.addEventListener('click',onClick);el.addEventListener('submit',onSubmit);el.addEventListener('input',onInput);el.addEventListener('keydown',onKey);}
 el.setAttribute('aria-label',tr('rooms'));if(!el.isConnected)D.body.appendChild(el);D.documentElement.classList.add('ur-open');
 mode=roomId?'room':'list';cur=roomId||'';err='';testIds=null;paint();const card=el.querySelector('.ur-card');card.classList.remove('ur-zoom-out');void card.offsetWidth;card.classList.add('ur-zoom-in');
 if(roomId){msgs=[];rx=[];info=null;pick='';}const SW=W.LowiChatSwitch;
 load().then(()=>{paint();if(mode==='room')loadMsgs().then(paint);if(SW&&SW.refresh)SW.refresh().then(paint);});
 clearInterval(poll);let n=0;poll=setInterval(()=>{if(!el||!el.isConnected||D.hidden)return;const SW=W.LowiChatSwitch;load().then(()=>{if(mode==='room')return loadMsgs();}).then(()=>(++n%5===0&&SW&&SW.refresh)?SW.refresh():null).then(paint);},6000);
 setTimeout(()=>{const x=el&&el.querySelector('.ur-x');if(x)x.focus({preventScroll:true});},60);}
function close(){clearInterval(poll);poll=0;pick='';try{if(W.LowiChatSwitch)W.LowiChatSwitch.tick(true);}catch(e){}if(el&&el.parentNode)el.parentNode.removeChild(el);D.documentElement.classList.remove('ur-open');mode='list';cur='';err='';}
W.LowiUserRooms={open,close,isOpen:()=>!!(el&&el.isConnected),_state:()=>({mode,cur,cands:cands?cands.length:-1,rooms:rooms.length,members:members.length,msgs:msgs.length,err,soon,loaded})};
})(window,document);
