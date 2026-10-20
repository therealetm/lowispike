/* LOWiSPIKE Community page top bar (20 Oct 2026): two tabs, Room (the galaxy game) and Chat (the message room), plus the room
   chip ("Room 3 · 12 here") that opens the rooms sheet: who is in your room, other rooms, find a person, join or knock.
   Only the active tab renders: Chat open = galaxy hidden and paused (community-galaxy.css, body-world-3d.js cr-room check);
   Room = the message list is emptied (community-chat.js paint). Knocks show as a small banner with Let in / Not now. */
(function(W,D){
'use strict';
const T={room:['Room','Raum','Sala'],chat:['Chat','Chat','Chat'],rooms:['Rooms','Räume','Salas'],here:['here','da','aquí'],roomN:['Room {n}','Raum {n}','Sala {n}'],
 youIn:['You’re in Room {n} · {c} of {cap} here','Du bist in Raum {n} · {c} von {cap} da','Estás en la sala {n} · {c} de {cap} aquí'],
 find:['Find someone','Jemanden finden','Buscar a alguien'],join:['Join','Beitreten','Entrar'],knock:['Knock','Anklopfen','Tocar'],full:['Full','Voll','Llena'],yours:['Your room','Dein Raum','Tu sala'],
 knocking:['Knocked. Waiting for {name} to let you in…','Angeklopft. Warte, bis {name} dich reinlässt…','Has tocado. Esperando a que {name} te deje entrar…'],
 noAnswer:['{name} didn’t answer. Try again later.','{name} hat nicht geantwortet. Versuch es später.','{name} no respondió. Inténtalo más tarde.'],
 wants:['{name} would like to join your room','{name} möchte in deinen Raum','{name} quiere entrar en tu sala'],letIn:['Let in','Reinlassen','Dejar entrar'],notNow:['Not now','Jetzt nicht','Ahora no'],
 moved:['You’re in Room {n} now','Du bist jetzt in Raum {n}','Ahora estás en la sala {n}'],offline:['Rooms are offline. Chat shows the last messages.','Räume sind offline. Der Chat zeigt die letzten Nachrichten.','Las salas están sin conexión.'],
 nobody:['Not in a room right now','Gerade in keinem Raum','Ahora no está en ninguna sala'],close:['Close','Schließen','Cerrar'],joining:['Finding your room…','Suche deinen Raum…','Buscando tu sala…'],
 tabs:['Community sections','Community-Bereiche','Secciones de la comunidad'],people:['People in your room','Leute in deinem Raum','Gente en tu sala']};
function lang(){try{return Math.max(0,['en','de','es'].indexOf((W.LowiLang&&W.LowiLang.get())||localStorage.getItem('lowispike.lang')||'en'));}catch(e){return 0;}}
function tr(k,v){let s=(T[k]||[k])[lang()]||T[k][0];for(const x in v||{})s=s.split('{'+x+'}').join(String(v[x]));return s;}
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const R=()=>W.LowiRooms,C=()=>W.LowiRoomsCore,H=()=>W.LowiCommunityHost;
function people(){try{return (H()&&H().people&&H().people())||[];}catch(e){return [];}}
function nameOf(uid){const p=people().find(x=>x&&x.uid===uid);return p&&p.n?String(p.n):'';}
function me(){try{return (H()&&H().uid&&H().uid())||'';}catch(e){return '';}}
function open(){const t=D.getElementById('cgThread');return !!(t&&t.hasAttribute('data-open'));}
function setTab(chat){const c=W.LowiCommunity;if(!c||!c.thread)return;if(chat!==open())c.thread(chat);paint();}
let bar=null,banner=null,sheet=null,q='',msg='',msgT=0;
function ensure(){const pane=D.getElementById('cmPaneChat');if(!pane||!pane.hasAttribute('data-spirit-chat'))return null;
 if(bar&&bar.isConnected&&bar.parentNode===pane)return bar;
 bar=D.createElement('nav');bar.className='rm-bar';bar.setAttribute('data-noi18n','');
 bar.innerHTML='<div class="rm-tabs" role="tablist"><button type="button" role="tab" class="rm-tab" data-rm="room"></button><button type="button" role="tab" class="rm-tab" data-rm="chat"></button></div><button type="button" class="rm-chip" data-rm="sheet" aria-haspopup="dialog"></button><div class="rm-banner" role="status" aria-live="polite"></div>';
 pane.insertBefore(bar,pane.firstChild);banner=bar.querySelector('.rm-banner');
 bar.addEventListener('click',e=>{const b=e.target.closest('[data-rm]');if(!b)return;const a=b.dataset.rm;
  if(a==='room')setTab(false);else if(a==='chat')setTab(true);else if(a==='sheet')openSheet();
  else if(a==='letin'){R()&&R().letIn(b.dataset.uid).then(paint);}else if(a==='notnow'){R()&&R().dismiss(b.dataset.uid);paint();}});
 return bar;}
function note(s){msg=s;clearTimeout(msgT);if(s)msgT=setTimeout(()=>{msg='';paint();},6000);paint();}
function paint(){const b=ensure();if(!b)return;const r=R(),c=C(),chat=open();
 const tabs=b.querySelectorAll('.rm-tab');tabs[0].textContent=tr('room');tabs[1].textContent=tr('chat');b.querySelector('.rm-tabs').setAttribute('aria-label',tr('tabs'));
 tabs[0].setAttribute('aria-selected',chat?'false':'true');tabs[1].setAttribute('aria-selected',chat?'true':'false');
 const chip=b.querySelector('.rm-chip');
 if(!r||!c){chip.hidden=true;}else{chip.hidden=false;const st=r.status();
  chip.innerHTML=st==='in'?'<b>'+esc(tr('roomN',{n:r.num()}))+'</b><span>'+r.members().length+' '+esc(tr('here'))+'</span>':'<span>'+esc(st==='joining'?tr('joining'):tr('rooms'))+'</span>';
  chip.setAttribute('aria-label',st==='in'?tr('youIn',{n:r.num(),c:r.members().length,cap:r.cap()}):tr('rooms'));}
 const ks=r?r.knocks():[];let h='';
 if(ks.length){const k=ks[ks.length-1];h='<span>'+esc(tr('wants',{name:k.name||nameOf(k.from)||'Member'}))+'</span><button type="button" class="rm-yes" data-rm="letin" data-uid="'+esc(k.from)+'">'+esc(tr('letIn'))+'</button><button type="button" class="rm-no" data-rm="notnow" data-uid="'+esc(k.from)+'">'+esc(tr('notNow'))+'</button>';}
 else if(msg)h='<span>'+esc(msg)+'</span>';
 if(banner.__h!==h){banner.innerHTML=h;banner.__h=h;}banner.toggleAttribute('data-on',!!h);
 if(sheet&&sheet.isConnected)paintSheet();}
/* Rooms sheet */
function openSheet(){if(!R())return;if(!sheet){sheet=D.createElement('div');sheet.className='rm-sheet';sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('data-noi18n','');
  sheet.innerHTML='<div class="rm-card"><header><h2 class="rm-h"></h2><button type="button" class="rm-x" data-rs="close">×</button></header><p class="rm-you"></p><div class="rm-crew"></div><input class="rm-find" type="search" autocomplete="off" enterkeyhint="search"><ul class="rm-list"></ul></div>';
  sheet.addEventListener('click',e=>{if(e.target===sheet){closeSheet();return;}const b=e.target.closest('[data-rs]');if(!b)return;const a=b.dataset.rs;
   if(a==='close')closeSheet();else if(a==='join'){b.disabled=true;R().joinRoom(+b.dataset.n).then(res=>{if(res.ok){closeSheet();note(tr('moved',{n:R().num()}));}else{note(tr('full'));refreshDir();}});}
   else if(a==='person'){b.disabled=true;const uid=b.dataset.uid,nm=b.dataset.name;if(b.dataset.mode==='knock')note(tr('knocking',{name:nm}));closeSheet();
    R().joinPerson(uid).then(res=>{if(res.ok){note(res.why==='here'?'':tr('moved',{n:R().num()}));}else note(res.why==='no-answer'?tr('noAnswer',{name:nm}):res.why==='full'?tr('full'):tr('nobody'));});}});
  sheet.querySelector('.rm-find').addEventListener('input',e=>{q=e.target.value.trim().toLowerCase();paintSheet();});
  sheet.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();closeSheet();}});}
 D.body.appendChild(sheet);sheet.querySelector('.rm-h').textContent=tr('rooms');sheet.querySelector('.rm-x').setAttribute('aria-label',tr('close'));const f=sheet.querySelector('.rm-find');f.placeholder=tr('find');f.setAttribute('aria-label',tr('find'));
 paintSheet();refreshDir();setTimeout(()=>{const x=sheet.querySelector('.rm-x');if(x)x.focus({preventScroll:true});},30);}
function closeSheet(){if(sheet&&sheet.parentNode)sheet.parentNode.removeChild(sheet);q='';const b=bar&&bar.querySelector('.rm-chip');if(b)b.focus({preventScroll:true});}
let dirBusy=false;function refreshDir(){if(dirBusy||!R())return;dirBusy=true;R().readDirectory().catch(()=>{}).then(()=>{dirBusy=false;paintSheet();});}
function paintSheet(){if(!sheet||!sheet.isConnected)return;const r=R(),cap=r.cap(),mine=r.num(),id=me();
 sheet.querySelector('.rm-you').textContent=r.status()==='in'?tr('youIn',{n:mine,c:r.members().length,cap}):tr(r.status()==='joining'?'joining':'offline');
 const crew=r.members().filter(u=>u!==id).map(u=>nameOf(u)).filter(Boolean).slice(0,24);
 sheet.querySelector('.rm-crew').innerHTML=crew.length?'<span class="rm-lab">'+esc(tr('people'))+'</span> '+crew.map(n=>'<span class="rm-p">'+esc(n)+'</span>').join(''):'';
 let rows=[];const list=r.rooms();
 if(q){for(const room of list)for(const u of room.u){if(u===id)continue;const n=nameOf(u);if(!n||n.toLowerCase().indexOf(q)<0)continue;const mode=room.n===mine?'here':C().joinMode(room,cap,room.g);
   rows.push('<li><span class="rm-who"><b>'+esc(n)+'</b><small>'+esc(tr('roomN',{n:room.n}))+'</small></span>'+(mode==='here'?'<em>'+esc(tr('yours'))+'</em>':mode==='full'?'<em>'+esc(tr('full'))+'</em>':'<button type="button" data-rs="person" data-mode="'+mode+'" data-uid="'+esc(u)+'" data-name="'+esc(n)+'">'+esc(tr(mode==='knock'?'knock':'join'))+'</button>')+'</li>');if(rows.length>=30)break;}}
 else for(const room of list){const names=room.u.map(nameOf).filter(Boolean),more=Math.max(0,room.c-names.slice(0,3).length);
   rows.push('<li'+(room.n===mine?' class="rm-mine"':'')+'><span class="rm-who"><b>'+esc(tr('roomN',{n:room.n}))+' · '+room.c+'/'+cap+'</b><small>'+esc(names.slice(0,3).join(', '))+(more?' +'+more:'')+'</small></span>'+(room.n===mine?'<em>'+esc(tr('yours'))+'</em>':room.c<cap?'<button type="button" data-rs="join" data-n="'+room.n+'">'+esc(tr('join'))+'</button>':'<em>'+esc(tr('full'))+'</em>')+'</li>');}
 const ul=sheet.querySelector('.rm-list'),h=rows.join('');if(ul.__h!==h){ul.innerHTML=h;ul.__h=h;}}
D.addEventListener('lowi:room',e=>{const t=e.detail&&e.detail.type;if(t==='knock'&&W.LowiSfx&&W.LowiSfx.play)try{W.LowiSfx.play('ping');}catch(x){}paint();try{W.LowiCommunity&&W.LowiCommunity.refresh();}catch(x){}});
D.addEventListener('lowi:chat',()=>paint());
/* keep the tab state honest when other code opens or closes the message room (history button, Escape, back) */
const mo=typeof MutationObserver==='function'?new MutationObserver(()=>paint()):null;
function watch(){const t=D.getElementById('cgThread');if(t&&mo&&!t.__rmWatch){t.__rmWatch=1;mo.observe(t,{attributes:true,attributeFilter:['data-open']});}paint();}
setInterval(watch,1500);if(D.readyState!=='loading')watch();else D.addEventListener('DOMContentLoaded',watch);
W.LowiRoomsUI={paint,openSheet,closeSheet,setTab};
})(window,document);
