/* LOWiSPIKE Rooms (OWNER-REQUESTS 6, Emmanuel 23 Oct 2026): rooms people create themselves, Discord style, for the same goal or the
   same struggle ("same illness or goal"). Opens from the Community menu (Rooms, first item).
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
 rooms:['Rooms','Räume','Salas'],sub:['Rooms for the same goal or the same struggle. Everyone can read along, the creator lets people in. Up to {cap} per room.','Räume für dasselbe Ziel oder dasselbe Thema. Alle dürfen mitlesen, wer den Raum erstellt hat, lässt Leute rein. Bis zu {cap} pro Raum.','Salas para el mismo objetivo o el mismo tema. Todos pueden leer, quien crea la sala deja entrar. Hasta {cap} por sala.'],
 make:['Create a room','Raum erstellen','Crear sala'],makeGo:['Create','Erstellen','Crear'],name:['Name, e.g. Type 2 together','Name, z. B. Typ 2 gemeinsam','Nombre, p. ej. Tipo 2 juntos'],topic:['What is it about? (optional)','Worum geht es? (freiwillig)','¿De qué trata? (opcional)'],
 icon:['Pick a bubble','Wähle eine Bubble','Elige una burbuja'],empty:['No rooms yet. Start the first one.','Noch keine Räume. Starte den ersten.','Aún no hay salas. Crea la primera.'],
 count:['{c}/{cap}','{c}/{cap}','{c}/{cap}'],yours:['Yours','Deiner','Tuya'],inRoom:['In','Drin','Dentro'],asked:['Asked','Angefragt','Pedido'],full:['Full','Voll','Llena'],
 by:['by {n}','von {n}','de {n}'],ask:['Ask to join','Beitritt anfragen','Pedir entrar'],waiting:['Asked. {n} decides.','Angefragt. {n} entscheidet.','Pedido. {n} decide.'],fullLong:['This room is full ({cap} of {cap}).','Dieser Raum ist voll ({cap} von {cap}).','Esta sala está llena ({cap} de {cap}).'],
 readAlong:['You can read along. Ask to join to write.','Du kannst mitlesen. Frag an, um zu schreiben.','Puedes leer. Pide entrar para escribir.'],
 asks:['Wants to join','Möchte rein','Quiere entrar'],letIn:['Let in','Reinlassen','Dejar entrar'],notNow:['Not now','Jetzt nicht','Ahora no'],members:['Members','Mitglieder','Miembros'],
 say:['Write to the room…','Schreib in den Raum…','Escribe a la sala…'],send:['Send','Senden','Enviar'],quiet:['No messages yet. Say hi.','Noch keine Nachrichten. Sag Hallo.','Aún no hay mensajes. Saluda.'],
 leave:['Leave room','Raum verlassen','Salir de la sala'],del:['Delete room','Raum löschen','Borrar sala'],delQ:['Delete this room and its members list? Messages stay hidden.','Diesen Raum und seine Mitgliederliste löschen?','¿Borrar esta sala y su lista de miembros?'],
 back:['Back','Zurück','Atrás'],close:['Close','Schließen','Cerrar'],cancel:['Cancel','Abbrechen','Cancelar'],you:['You','Du','Tú'],
 e_full:['The room is full.','Der Raum ist voll.','La sala está llena.'],e_limit:['You can create up to {m} rooms.','Du kannst bis zu {m} Räume erstellen.','Puedes crear hasta {m} salas.'],
 e_members:['Only members can write here.','Nur Mitglieder können hier schreiben.','Solo los miembros pueden escribir aquí.'],e_offline:['You’re offline. Try again in a moment.','Du bist offline. Versuch es gleich noch mal.','Sin conexión. Inténtalo de nuevo.'],
 e_soon:['Rooms are coming soon.','Räume kommen bald.','Las salas llegan pronto.'],e_error:['That didn’t work. Try again.','Das hat nicht geklappt. Versuch es noch mal.','No funcionó. Inténtalo de nuevo.'],
 e_sign:['Sign in to use Rooms.','Melde dich an, um Räume zu nutzen.','Inicia sesión para usar las salas.'],asked1:['Asked. {n} gets your request.','Angefragt. {n} bekommt deine Anfrage.','Pedido. {n} recibe tu solicitud.'],
 now:['now','jetzt','ahora']};
function lang(){try{return Math.max(0,['en','de','es'].indexOf((W.LowiLang&&W.LowiLang.get())||localStorage.getItem('lowispike.lang')||'en'));}catch(e){return 0;}}
function tr(k,v){let s=(T[k]||[k])[lang()]||T[k][0];v=Object.assign({cap:K.CAP,m:K.MAX_OWN},v||{});for(const x in v)s=s.split('{'+x+'}').join(String(v[x]));return s;}
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const X=()=>W.LOWI_CLOUD_X||null;
function me(){try{const x=X();return (x&&x.state().uid)||'';}catch(e){return '';}}
function myName(){try{const s=JSON.parse(localStorage.getItem('lowispike.v2')||'{}');const n=s&&s.user&&s.user.name;if(n)return String(n).trim().slice(0,40);}catch(e){}return 'Member';}
async function sb(){const x=X();if(!x||!x.client)throw new Error('offline');return x.client();}
async function q(p){const r=await Promise.race([p,new Promise((_,no)=>setTimeout(()=>no(new Error('timeout')),12000))]);if(r&&r.error)throw r.error;return r?r.data:null;}
let el=null,rooms=[],members=[],msgs=[],cur='',mode='list',err='',busy=false,poll=0,origin='50% 30%',loaded=false,soon=false,draft='',mkIcon=K.ICONS[0],mkName='',mkTopic='';
async function load(){if(!me()){err='sign';return;}
 try{const c=await sb();const [r,m]=await Promise.all([q(c.from('user_rooms').select('id,owner_id,owner_name,name,topic,icon,created_at').order('created_at',{ascending:false}).limit(300)),q(c.from('user_room_members').select('room_id,user_id,who,status,created_at').limit(9000))]);
  rooms=r||[];members=m||[];loaded=true;soon=false;if(err==='soon'||err==='offline'||err==='sign')err='';}
 catch(e){const w=K.why(e);if(w==='soon')soon=true;err=w;}}
async function loadMsgs(){if(!cur)return;try{const c=await sb();const r=await q(c.from('messages').select('id,user_id,who,body,created_at').eq('room',K.chan(cur)).order('created_at',{ascending:false}).limit(100));msgs=(r||[]).reverse();}catch(e){}}
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
function roomHtml(){const r=room();if(!r)return listHtml();const id=me(),st=K.status(r,members,id),inn=K.inside(r,members,id),act=K.action(st,inn.full),owner=r.owner_name||'…';
 let h='<header class="ur-top"><button type="button" class="ur-back" data-ur="list" aria-label="'+esc(tr('back'))+'">‹</button><div class="ur-title">'+orb(K.icon(r.icon),'ur-sm'+(st==='none'?'':' ur-mine'))+'<span><h2 class="ur-h">'+esc(r.name)+'</h2><small>'+esc(tr('by',{n:owner}))+' · '+esc(tr('count',{c:inn.count}))+'</small></span></div><button type="button" class="ur-x" data-ur="close" aria-label="'+esc(tr('close'))+'">×</button></header>';
 if(r.topic)h+='<p class="ur-sub">'+esc(r.topic)+'</p>';
 h+='<div class="ur-people" aria-label="'+esc(tr('members'))+'">'+inn.people.slice(0,K.CAP).map(p=>'<span class="ur-p'+(p.user_id===r.owner_id?' ur-p-own':'')+'" title="'+esc(p.who||'')+'"><i>'+esc(K.initials(p.user_id===id?myName():p.who||'?'))+'</i><small>'+esc(p.user_id===id?tr('you'):(p.who||'').split(' ')[0])+'</small></span>').join('')+'</div>';
 if(inn.asks.length)h+='<div class="ur-asks"><p class="ur-lab">'+esc(tr('asks'))+'</p>'+inn.asks.map(a=>'<div class="ur-ask"><b>'+esc(a.who||'Member')+'</b><span><button type="button" class="ur-yes" data-ur="let" data-u="'+esc(a.user_id)+'"'+(inn.full?' disabled':'')+'>'+esc(tr('letIn'))+'</button><button type="button" class="ur-no" data-ur="deny" data-u="'+esc(a.user_id)+'">'+esc(tr('notNow'))+'</button></span></div>').join('')+'</div>';
 h+='<ol class="ur-msgs" aria-live="polite">'+(msgs.length?msgs.map(m=>'<li class="'+(m.user_id===id?'ur-me':'')+'"><b>'+esc(m.user_id===id?tr('you'):(m.who||'Member'))+'</b><span>'+esc(m.body)+'</span><time>'+esc(timeOf(m.created_at))+'</time></li>').join(''):'<li class="ur-quiet">'+esc(tr('quiet'))+'</li>')+'</ol>';
 if(err==='full'||err==='members')h+='<p class="ur-err" role="status">'+esc(tr('e_'+err))+'</p>';
 if(act==='write')h+='<form class="ur-say" data-ur-form="say"><input class="ur-in ur-text" maxlength="'+K.BODY_MAX+'" autocomplete="off" enterkeyhint="send" placeholder="'+esc(tr('say'))+'" aria-label="'+esc(tr('say'))+'" value="'+esc(draft)+'"><button type="submit" class="ur-go"'+(busy?' disabled':'')+'>'+esc(tr('send'))+'</button></form>';
 else h+='<div class="ur-foot"><p>'+esc(act==='asked'?tr('waiting',{n:owner}):act==='full'?tr('fullLong'):tr('readAlong'))+'</p>'+(act==='ask'?'<button type="button" class="ur-go" data-ur="ask"'+(busy?' disabled':'')+'>'+esc(tr('ask'))+'</button>':act==='asked'?'<button type="button" class="ur-no" data-ur="leave">'+esc(tr('cancel'))+'</button>':'')+'</div>';
 if(st==='member')h+='<button type="button" class="ur-quietbtn" data-ur="leave">'+esc(tr('leave'))+'</button>';
 if(st==='owner')h+='<button type="button" class="ur-quietbtn ur-del" data-ur="del">'+esc(tr('del'))+'</button>';
 return h;}
function paint(){if(!el)return;const card=el.querySelector('.ur-card');const a=D.activeElement,keep=a&&card.contains(a)&&a.classList&&a.classList.contains('ur-in')?{cls:[...a.classList].find(c=>c!=='ur-in'),s:a.selectionStart,e:a.selectionEnd}:null;
 const h=mode==='make'?makeHtml():mode==='room'?roomHtml():listHtml();if(card.__h===h)return;const ol=card.querySelector('.ur-msgs'),atEnd=!ol||ol.scrollTop+ol.clientHeight>=ol.scrollHeight-40;
 card.innerHTML=h;card.__h=h;card.dataset.mode=mode;
 const ol2=card.querySelector('.ur-msgs');if(ol2&&atEnd)ol2.scrollTop=ol2.scrollHeight;
 if(keep&&keep.cls){const n=card.querySelector('.'+keep.cls);if(n){n.focus({preventScroll:true});try{n.setSelectionRange(keep.s,keep.e);}catch(e){}}}}
function go(m,id,from){mode=m;if(id!=null)cur=id;err='';const card=el&&el.querySelector('.ur-card');
 if(card){if(from&&from.getBoundingClientRect){const b=from.getBoundingClientRect(),c=card.getBoundingClientRect();origin=Math.round(b.left+b.width/2-c.left)+'px '+Math.round(b.top+b.height/2-c.top)+'px';}
  card.style.setProperty('--ur-o',origin);card.classList.remove('ur-zoom-in','ur-zoom-out');void card.offsetWidth;card.classList.add(m==='list'?'ur-zoom-out':'ur-zoom-in');}
 if(m==='room'){msgs=[];loadMsgs().then(paint);}paint();}
async function act(fn,after){if(busy)return;busy=true;err='';paint();try{await fn();await load();if(after)await after();}catch(e){err=K.why(e);if(err==='soon')soon=true;}busy=false;paint();}
async function onClick(e){if(e.target===el){close();return;}const b=e.target.closest('[data-ur]');if(!b||b.disabled)return;const k=b.dataset.ur,id=me();
 if(k==='close')close();else if(k==='list')go('list');else if(k==='make'){mkName='';mkTopic='';mkIcon=K.ICONS[0];go('make',null,b);setTimeout(()=>{const n=el&&el.querySelector('.ur-name');if(n)n.focus({preventScroll:true});},260);}
 else if(k==='open')go('room',b.dataset.id,b);
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
 const r=room();if(!r)return;draft='';const id=me(),mid='u'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
 msgs.push({id:mid,user_id:id,who:myName(),body,created_at:new Date().toISOString()});paint();
 try{const c=await sb();await q(c.from('messages').insert({id:mid,user_id:id,room:K.chan(r.id),who:myName(),body}));err='';}catch(x){err=K.why(x);msgs=msgs.filter(m=>m.id!==mid);draft=body;}
 paint();const n=el&&el.querySelector('.ur-text');if(n)n.focus({preventScroll:true});}
function onInput(e){const t=e.target;if(t.classList.contains('ur-name')){mkName=t.value;const g=el.querySelector('.ur-go');if(g)g.disabled=!K.cleanName(mkName)||busy;}else if(t.classList.contains('ur-topic'))mkTopic=t.value;else if(t.classList.contains('ur-text'))draft=t.value;}
function onKey(e){if(e.key==='Escape'){e.stopPropagation();if(mode==='list')close();else go('list');}else if(e.key==='Enter'&&e.target.classList&&e.target.classList.contains('ur-name')){e.preventDefault();const g=el.querySelector('[data-ur="create"]');if(g&&!g.disabled)g.click();}}
function open(roomId){if(!el){el=D.createElement('div');el.className='ur';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('data-noi18n','');el.innerHTML='<div class="ur-card"></div>';
  el.addEventListener('click',onClick);el.addEventListener('submit',onSubmit);el.addEventListener('input',onInput);el.addEventListener('keydown',onKey);}
 el.setAttribute('aria-label',tr('rooms'));if(!el.isConnected)D.body.appendChild(el);D.documentElement.classList.add('ur-open');
 mode=roomId?'room':'list';cur=roomId||'';err='';paint();const card=el.querySelector('.ur-card');card.classList.remove('ur-zoom-out');void card.offsetWidth;card.classList.add('ur-zoom-in');
 load().then(()=>{paint();if(mode==='room')loadMsgs().then(paint);});
 clearInterval(poll);poll=setInterval(()=>{if(!el||!el.isConnected||D.hidden)return;load().then(()=>{if(mode==='room')return loadMsgs();}).then(paint);},6000);
 setTimeout(()=>{const x=el&&el.querySelector('.ur-x');if(x)x.focus({preventScroll:true});},60);}
function close(){clearInterval(poll);poll=0;if(el&&el.parentNode)el.parentNode.removeChild(el);D.documentElement.classList.remove('ur-open');mode='list';cur='';err='';}
W.LowiUserRooms={open,close,isOpen:()=>!!(el&&el.isConnected),_state:()=>({mode,cur,rooms:rooms.length,members:members.length,msgs:msgs.length,err,soon,loaded})};
})(window,document);
