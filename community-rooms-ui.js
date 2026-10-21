/* LOWiSPIKE Community page top bar (20 Oct 2026; Creation + Affiliates tabs 21 Oct): Room (the galaxy game), Chat (the message room),
   Creation and Affiliates (their own pages, see showView), plus the room
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
 create:['Creation','Erstellen','Crear'],aff:['Affiliates','Affiliates','Afiliados'],copyLink:['Copy link','Link kopieren','Copiar enlace'],copied:['Link copied','Link kopiert','Enlace copiado'],
 tabs:['Community sections','Community-Bereiche','Secciones de la comunidad'],people:['People in your room','Leute in deinem Raum','Gente en tu sala']};
function lang(){try{return Math.max(0,['en','de','es'].indexOf((W.LowiLang&&W.LowiLang.get())||localStorage.getItem('lowispike.lang')||'en'));}catch(e){return 0;}}
function tr(k,v){let s=(T[k]||[k])[lang()]||T[k][0];for(const x in v||{})s=s.split('{'+x+'}').join(String(v[x]));return s;}
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const R=()=>W.LowiRooms,C=()=>W.LowiRoomsCore,H=()=>W.LowiCommunityHost;
function people(){try{return (H()&&H().people&&H().people())||[];}catch(e){return [];}}
function nameOf(uid){const p=people().find(x=>x&&x.uid===uid);return p&&p.n?String(p.n):'';}
function me(){try{return (H()&&H().uid&&H().uid())||'';}catch(e){return '';}}
function open(){const t=D.getElementById('cgThread');return !!(t&&t.hasAttribute('data-open'));}
function setTab(chat){view='';const c=W.LowiCommunity;if(!c||!c.thread){paint();return;}if(chat!==open())c.thread(chat);paint();}
/* Oct 21: two more tabs, Creation (LOWiSPIKE Create, being built) and Affiliates (the Master Blueprint). Each is its own page with its
   own shareable address (create/, affiliates/); the tab shows that page in a frame, so the app and the shared link are one thing. */
const VIEWS={create:'create/',aff:'affiliates/'};let view='';const frames={};
function showView(v){if(!VIEWS[v])return;const c=W.LowiCommunity;if(open()&&c&&c.thread)c.thread(false);view=v;paint();}
function viewUrl(v){try{return new URL(VIEWS[v],location.href.split('#')[0]).href;}catch(e){return VIEWS[v];}}
function ensureView(pane){let box=pane.querySelector(':scope>.rm-view');
 if(!box){box=D.createElement('section');box.className='rm-view';box.setAttribute('data-noi18n','');
  box.innerHTML='<div class="rm-view-top"><button type="button" class="rm-copy" data-rm="copy"></button></div>';pane.appendChild(box);
  box.addEventListener('click',e=>{if(e.target.closest('.rm-copy'))copyView();});/* the box sits outside the bar, so it needs its own listener */}
 if(view&&!frames[view]){const f=D.createElement('iframe');f.className='rm-frame';f.src=VIEWS[view]+'?embed=1';f.setAttribute('loading','lazy');f.dataset.view=view;frames[view]=f;box.appendChild(f);}
 for(const k in frames)frames[k].hidden=k!==view;
 const t=VIEWS[view]?(view==='aff'?tr('aff'):tr('create')):'';const cb=box.querySelector('.rm-copy');cb.textContent=tr('copyLink');cb.setAttribute('aria-label',tr('copyLink')+(t?' · '+t:''));
 for(const k in frames)frames[k].title=k==='aff'?tr('aff'):tr('create');
 return box;}
function copyView(){const u=viewUrl(view);const done=()=>note(tr('copied')+': '+u);
 if(navigator.clipboard&&W.isSecureContext)navigator.clipboard.writeText(u).then(done,()=>note(u));else note(u);}
let bar=null,banner=null,sheet=null,q='',msg='',msgT=0;
function ensure(){const pane=D.getElementById('cmPaneChat');if(!pane||!pane.hasAttribute('data-spirit-chat'))return null;
 if(bar&&bar.isConnected&&bar.parentNode===pane)return bar;
 bar=D.createElement('nav');bar.className='rm-bar';bar.setAttribute('data-noi18n','');
 bar.innerHTML='<div class="rm-tabs" role="tablist"><button type="button" role="tab" class="rm-tab" data-rm="room"></button><button type="button" role="tab" class="rm-tab" data-rm="chat"></button><button type="button" role="tab" class="rm-tab" data-rm="create"></button><button type="button" role="tab" class="rm-tab" data-rm="aff"></button></div><button type="button" class="rm-chip" data-rm="sheet" aria-haspopup="dialog"></button><div class="rm-banner" role="status" aria-live="polite"></div>';
 pane.insertBefore(bar,pane.firstChild);banner=bar.querySelector('.rm-banner');
 for(const ms of [60,250,600,1100])setTimeout(()=>fit(bar),ms);
 bar.addEventListener('click',e=>{const b=e.target.closest('[data-rm]');if(!b)return;const a=b.dataset.rm;
  if(a==='room')setTab(false);else if(a==='chat')setTab(true);else if(a==='create'||a==='aff')showView(a);else if(a==='copy')copyView();else if(a==='sheet')openSheet();
  else if(a==='letin'){R()&&R().letIn(b.dataset.uid).then(paint);}else if(a==='notnow'){R()&&R().dismiss(b.dataset.uid);paint();}});
 return bar;}
function note(s){msg=s;clearTimeout(msgT);if(s)msgT=setTimeout(()=>{msg='';paint();},6000);paint();}
function paint(){const b=ensure();if(!b)return;const r=R(),c=C(),chat=open();
 if(chat&&view)view='';/* the message room was opened by other code: Chat wins */
 const pane=b.parentNode,sel=view||(chat?'chat':'room');
 const tabs=b.querySelectorAll('.rm-tab');tabs[0].textContent=tr('room');tabs[1].textContent=tr('chat');tabs[2].textContent=tr('create');tabs[3].textContent=tr('aff');b.querySelector('.rm-tabs').setAttribute('aria-label',tr('tabs'));
 tabs.forEach(t=>t.setAttribute('aria-selected',t.dataset.rm===sel?'true':'false'));
 if(view){pane.setAttribute('data-rm-view',view);D.documentElement.classList.add('rm-view');ensureView(pane);const at=b.querySelector('.rm-tab[aria-selected="true"]');if(at&&at.scrollIntoView&&b.__rmShown!==view){b.__rmShown=view;try{at.scrollIntoView({block:'nearest',inline:'nearest'});}catch(e){}}}
 else{b.__rmShown='';pane.removeAttribute('data-rm-view');D.documentElement.classList.remove('rm-view');if(pane.querySelector(':scope>.rm-view'))ensureView(pane);}
 const chip=b.querySelector('.rm-chip');
 if(!r||!c){chip.hidden=true;}else{chip.hidden=false;const st=r.status();
  chip.innerHTML=st==='in'?'<b>'+esc(tr('roomN',{n:r.num()}))+'</b><span>'+r.members().length+' '+esc(tr('here'))+'</span>':'<span>'+esc(st==='joining'?tr('joining'):tr('rooms'))+'</span>';
  chip.setAttribute('aria-label',st==='in'?tr('youIn',{n:r.num(),c:r.members().length,cap:r.cap()}):tr('rooms'));}
 const ks=r?r.knocks():[];let h='';
 if(ks.length){const k=ks[ks.length-1];h='<span>'+esc(tr('wants',{name:k.name||nameOf(k.from)||'Member'}))+'</span><button type="button" class="rm-yes" data-rm="letin" data-uid="'+esc(k.from)+'">'+esc(tr('letIn'))+'</button><button type="button" class="rm-no" data-rm="notnow" data-uid="'+esc(k.from)+'">'+esc(tr('notNow'))+'</button>';}
 else if(msg)h='<span>'+esc(msg)+'</span>';
 if(banner.__h!==h){banner.innerHTML=h;banner.__h=h;}banner.toggleAttribute('data-on',!!h);
 fit(b);
 if(sheet&&sheet.isConnected)paintSheet();}
/* 21 Oct 2026 (Eman: the day/night button covers the word "Room"): the Day/Night switch (#tbTheme) and the profile picture
   (#pfBtn) float over the top right of every page, right where the room chip sat. The chip now keeps clear of them: beside
   the tabs with an 8 px gap when it fits there, else on its own line right under them (data-rm-wrap), never under them.
   top-bar.js always puts the switch 10 px left of the picture, so its spot is reserved even before it is placed. */
function clearLeft(br){let left=Infinity;
 for(const id of ['tbTheme','pfBtn']){const e=D.getElementById(id);if(!e||!e.getBoundingClientRect)continue;const s=W.getComputedStyle?W.getComputedStyle(e):null;
  if(s&&(s.display==='none'||s.visibility==='hidden'))continue;const r=e.getBoundingClientRect();
  if(r.width<1||r.bottom<=br.top||r.top>=br.top+44||r.right<=br.left)continue;left=Math.min(left,r.left,id==='pfBtn'?r.left-52:Infinity);}
 return left;}
function fit(b){if(!b||!b.getBoundingClientRect)return;const br=b.getBoundingClientRect();if(br.width<1)return;
 const tabs=b.querySelector('.rm-tabs'),chip=b.querySelector('.rm-chip');if(!tabs||!chip)return;
 const left=clearLeft(br),need=left===Infinity?0:Math.max(0,Math.ceil(br.right-left+8));
 const tr=tabs.getBoundingClientRect(),cr=chip.getBoundingClientRect(),below=cr.height>0&&tr.top>=cr.bottom-1;/* 21 Oct (four tabs): the tabs now take their own row under the chip, so the chip never needs to wrap */
 const room=left-8-tr.right-8,wrap=!below&&!chip.hidden&&need>0&&chip.offsetWidth>room;
 const v=wrap?'0px':need+'px';if(b.__fit!==v+wrap){b.__fit=v+wrap;b.style.setProperty('--rm-tr',v);b.toggleAttribute('data-rm-wrap',wrap);}}
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
W.addEventListener('resize',()=>{if(bar&&bar.isConnected)fit(bar);});
/* the profile picture and the switch appear, move and hide on their own (top-bar.js): re-fit the moment they do */
let fitRaf=0;const refit=()=>{if(fitRaf||!bar||!bar.isConnected)return;fitRaf=(W.requestAnimationFrame||setTimeout)(()=>{fitRaf=0;fit(bar);});};
const fmo=typeof MutationObserver==='function'?new MutationObserver(refit):null;
setInterval(()=>{if(!fmo)return;for(const e of [D.documentElement,D.getElementById('main'),D.getElementById('pfBtn'),D.getElementById('tbTheme')])
 if(e&&!e.__rmFit){e.__rmFit=1;fmo.observe(e,{attributes:true,attributeFilter:['class','style','hidden']});}},1000);
W.LowiRoomsUI={paint,openSheet,closeSheet,setTab,fit,showView,view:()=>view};
})(window,document);
