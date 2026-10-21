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
 tabs:['Community sections','Community-Bereiche','Secciones de la comunidad'],community:['Community','Community','Comunidad'],hereNow:['{c} here now','{c} gerade da','{c} aquí ahora'],
 menu:['Community menu','Community-Menü','Menú de la comunidad'],mPeople:['Rooms & people','Räume & Leute','Salas y gente'],mProfile:['Edit profile','Profil bearbeiten','Editar perfil'],mInvite:['Copy invite link','Einladungslink kopieren','Copiar enlace de invitación'],
 mCopyAff:['Copy Affiliates link','Affiliates-Link kopieren','Copiar enlace de Afiliados'],mCopyCreate:['Copy Creation link','Erstellen-Link kopieren','Copiar enlace de Crear'],mSettings:['Chat settings','Chat-Einstellungen','Ajustes del chat'],mWelcome:['Welcome & rules','Willkommen & Regeln','Bienvenida y normas'],people:['People in your room','Leute in deinem Raum','Gente en tu sala']};
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
   own shareable address (create/, affiliates/); the tab shows that page in a frame, so the app and the shared link are one thing.
   21 Oct evening (Eman: "cramped, old, we can't even see the writing"; inspiration: the Eden app's community): the bar is now an
   Eden-style header in LOWiSPIKE's own look. Row 1: the community name with a menu (Rooms & people, Find someone, Edit profile,
   Copy invite link, Copy this page's link, Chat settings, Welcome & rules) and live presence from the real room (avatars of the
   people in it, a green dot, "12 here now"); nothing is invented, so with no room it just says Rooms. Row 2: the four sections as
   one glass segmented control. The old separate "Copy link" button now lives in the menu. The Day/Night switch and the profile
   picture keep floating top right; row 1 reserves their width (--rm-tr), so nothing ever sits under them. */
const VIEWS={create:'create/',aff:'affiliates/'};let view='';const frames={};
function showView(v){if(!VIEWS[v])return;const c=W.LowiCommunity;if(open()&&c&&c.thread)c.thread(false);view=v;paint();}
function viewUrl(v){try{return new URL(VIEWS[v],location.href.split('#')[0]).href;}catch(e){return VIEWS[v];}}
function inviteUrl(){try{return location.href.split('#')[0].split('?')[0]+'#community';}catch(e){return '#community';}}
function ensureView(pane){let box=pane.querySelector(':scope>.rm-view');
 if(!box){box=D.createElement('section');box.className='rm-view';box.setAttribute('data-noi18n','');pane.appendChild(box);}
 if(view&&!frames[view]){const f=D.createElement('iframe');f.className='rm-frame';f.src=VIEWS[view]+'?embed=1';/* not lazy: it is only made when its tab is opened, and lazy frames in WebKit can wait for a scroll */f.dataset.view=view;frames[view]=f;box.appendChild(f);}
 for(const k in frames)frames[k].hidden=k!==view;
 for(const k in frames)frames[k].title=k==='aff'?tr('aff'):tr('create');
 return box;}
function copyText(u,label){const done=()=>note(label+': '+u);
 if(navigator.clipboard&&W.isSecureContext)navigator.clipboard.writeText(u).then(done,()=>note(u));else note(u);}
function copyView(v){v=v||view;if(!VIEWS[v])return copyText(inviteUrl(),tr('copied'));copyText(viewUrl(v),tr('copied'));}
let bar=null,banner=null,sheet=null,menu=null,q='',msg='',msgT=0;
function ensure(){const pane=D.getElementById('cmPaneChat');if(!pane||!pane.hasAttribute('data-spirit-chat'))return null;
 if(bar&&bar.isConnected&&bar.parentNode===pane)return bar;
 bar=D.createElement('nav');bar.className='rm-bar';bar.setAttribute('data-noi18n','');
 bar.innerHTML='<div class="rm-head"><button type="button" class="rm-id rm-menu-btn" data-rm="menu" aria-haspopup="menu" aria-expanded="false"><span class="rm-logo" aria-hidden="true"><i></i></span><span class="rm-idt"><b class="rm-name"></b><span class="rm-live"></span></span><span class="rm-chev" aria-hidden="true"></span></button></div>'
  +'<div class="rm-tabs" role="tablist"><button type="button" role="tab" class="rm-tab" data-rm="room"></button><button type="button" role="tab" class="rm-tab" data-rm="chat"></button><button type="button" role="tab" class="rm-tab" data-rm="create"></button><button type="button" role="tab" class="rm-tab" data-rm="aff"></button></div><div class="rm-banner" role="status" aria-live="polite"></div>';
 pane.insertBefore(bar,pane.firstChild);banner=bar.querySelector('.rm-banner');
 for(const ms of [60,250,600,1100])setTimeout(()=>fit(bar),ms);
 bar.addEventListener('click',e=>{const b=e.target.closest('[data-rm]');if(!b)return;const a=b.dataset.rm;
  if(a==='room')setTab(false);else if(a==='chat')setTab(true);else if(a==='create'||a==='aff')showView(a);else if(a==='copy')copyView();else if(a==='sheet')openSheet();else if(a==='menu')toggleMenu();
  else if(a==='letin'){R()&&R().letIn(b.dataset.uid).then(paint);}else if(a==='notnow'){R()&&R().dismiss(b.dataset.uid);paint();}});
 bar.querySelector('.rm-tabs').addEventListener('keydown',e=>{if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft')return;const ts=[...bar.querySelectorAll('.rm-tab')],i=ts.indexOf(D.activeElement);if(i<0)return;e.preventDefault();const n=ts[(i+(e.key==='ArrowRight'?1:ts.length-1))%ts.length];n.focus();n.click();});
 return bar;}
function note(s){msg=s;clearTimeout(msgT);if(s)msgT=setTimeout(()=>{msg='';paint();},6000);paint();}
function initials(n){const p=String(n||'').trim().split(/\s+/).filter(Boolean);return ((p[0]||'?')[0]+((p[1]||'')[0]||'')).toUpperCase();}
function colorOf(uid){try{return (W.LowiCommunity&&W.LowiCommunity.colorOf&&W.LowiCommunity.colorOf(uid))||'';}catch(e){return '';}}
function liveHTML(){const r=R(),c=C();if(!r||!c)return '<span class="rm-sub">'+esc(tr('community'))+'</span>';const st=r.status();
 if(st!=='in')return '<span class="rm-sub">'+esc(st==='joining'?tr('joining'):tr('rooms'))+'</span>';
 const ms=r.members(),id=me(),faces=ms.filter(u=>u!==id).map(u=>({u,n:nameOf(u)})).filter(x=>x.n).slice(0,3);
 return (faces.length?'<span class="rm-faces" aria-hidden="true">'+faces.map(f=>'<i style="'+(colorOf(f.u)?'--fc:'+esc(colorOf(f.u)):'')+'">'+esc(initials(f.n))+'</i>').join('')+'</span>':'')
  +'<span class="rm-dot" aria-hidden="true"></span><span class="rm-sub">'+esc(tr('hereNow',{c:ms.length}))+'<span class="rm-sep"> · </span>'+esc(tr('roomN',{n:r.num()}))+'</span>';}
function paint(){const b=ensure();if(!b)return;const r=R(),chat=open();
 if(chat&&view)view='';/* the message room was opened by other code: Chat wins */
 const pane=b.parentNode,sel=view||(chat?'chat':'room');
 const tabs=b.querySelectorAll('.rm-tab');tabs[0].textContent=tr('room');tabs[1].textContent=tr('chat');tabs[2].textContent=tr('create');tabs[3].textContent=tr('aff');b.querySelector('.rm-tabs').setAttribute('aria-label',tr('tabs'));
 tabs.forEach(t=>{const on=t.dataset.rm===sel;t.setAttribute('aria-selected',on?'true':'false');t.tabIndex=on?0:-1;});
 if(view){pane.setAttribute('data-rm-view',view);D.documentElement.classList.add('rm-view');ensureView(pane);}
 else{pane.removeAttribute('data-rm-view');D.documentElement.classList.remove('rm-view');if(pane.querySelector(':scope>.rm-view'))ensureView(pane);}
 const nm=b.querySelector('.rm-name');if(nm.textContent!==tr('community'))nm.textContent=tr('community');
 const lv=b.querySelector('.rm-live'),lh=liveHTML();if(lv.__h!==lh){lv.innerHTML=lh;lv.__h=lh;}
 const st=r&&C()?r.status():'';b.querySelector('.rm-menu-btn').setAttribute('aria-label',tr('menu')+' · '+(st==='in'?tr('youIn',{n:r.num(),c:r.members().length,cap:r.cap()}):tr('community')));
 const ks=r?r.knocks():[];let h='';
 if(ks.length){const k=ks[ks.length-1];h='<span>'+esc(tr('wants',{name:k.name||nameOf(k.from)||'Member'}))+'</span><button type="button" class="rm-yes" data-rm="letin" data-uid="'+esc(k.from)+'">'+esc(tr('letIn'))+'</button><button type="button" class="rm-no" data-rm="notnow" data-uid="'+esc(k.from)+'">'+esc(tr('notNow'))+'</button>';}
 else if(msg)h='<span>'+esc(msg)+'</span>';
 if(banner.__h!==h){banner.innerHTML=h;banner.__h=h;}banner.toggleAttribute('data-on',!!h);
 fit(b);
 if(menu&&!menu.hidden)paintMenu();
 if(sheet&&sheet.isConnected)paintSheet();}
/* Community menu (Eden's dropdown): only things that really work here. */
function menuItems(){const it=[['people','👥',tr('mPeople')],['find','🔎',tr('find')]];
 if(D.getElementById('pfBtn'))it.push(['profile','👤',tr('mProfile')]);
 it.push(['invite','🔗',tr('mInvite')]);if(view)it.push(['copyview','📋',tr(view==='aff'?'mCopyAff':'mCopyCreate')]);
 if(W.LowiCommunity&&W.LowiCommunity.settings)it.push(['settings','⚙️',tr('mSettings')]);
 if(W.LowiCommunityWelcome&&W.LowiCommunityWelcome.open)it.push(['welcome','📜',tr('mWelcome')]);
 return it;}
function paintMenu(){const h='<div class="rm-menu-card" role="menu" aria-label="'+esc(tr('menu'))+'">'+menuItems().map(([k,ic,t])=>'<button type="button" role="menuitem" data-rmm="'+k+'"><span class="rm-mi" aria-hidden="true">'+ic+'</span><span>'+esc(t)+'</span></button>').join('')+'</div>';
 if(menu.__h!==h){menu.innerHTML=h;menu.__h=h;}
 const btn=bar&&bar.querySelector('.rm-menu-btn');if(btn){const r=btn.getBoundingClientRect();menu.style.setProperty('--rm-mt',Math.round(r.bottom+8)+'px');menu.style.setProperty('--rm-ml',Math.round(Math.max(10,r.left))+'px');}}
function toggleMenu(force){const on=force==null?!(menu&&!menu.hidden):!!force;
 if(!menu){menu=D.createElement('div');menu.className='rm-menu';menu.hidden=true;menu.setAttribute('data-noi18n','');D.body.appendChild(menu);
  menu.addEventListener('click',e=>{if(e.target===menu){toggleMenu(false);return;}const b=e.target.closest('[data-rmm]');if(!b)return;const k=b.dataset.rmm;toggleMenu(false);
   if(k==='people')openSheet();else if(k==='find'){openSheet();setTimeout(()=>{const f=sheet&&sheet.querySelector('.rm-find');if(f)f.focus({preventScroll:true});},60);}
   else if(k==='profile'){const p=D.getElementById('pfBtn');if(p)p.click();}else if(k==='invite')copyText(inviteUrl(),tr('copied'));else if(k==='copyview')copyView();
   else if(k==='settings'){try{W.LowiCommunity.settings();}catch(x){}}else if(k==='welcome'){try{W.LowiCommunityWelcome.open();}catch(x){}}});
  menu.addEventListener('keydown',e=>{const bs=[...menu.querySelectorAll('[data-rmm]')],i=bs.indexOf(D.activeElement);
   if(e.key==='Escape'){e.stopPropagation();toggleMenu(false);}else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const n=bs[(i+(e.key==='ArrowDown'?1:bs.length-1)+bs.length)%bs.length];if(n)n.focus();}});}
 if(!menu.isConnected)D.body.appendChild(menu);
 menu.hidden=!on;const btn=bar&&bar.querySelector('.rm-menu-btn');if(btn)btn.setAttribute('aria-expanded',on?'true':'false');
 if(on){paintMenu();setTimeout(()=>{const f=menu.querySelector('[data-rmm]');if(f)f.focus({preventScroll:true});},30);}else if(btn&&menu.contains(D.activeElement))btn.focus({preventScroll:true});}
D.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu&&!menu.hidden){e.stopPropagation();toggleMenu(false);}},true);
/* 21 Oct 2026 (Eman: the day/night button covers the word "Room"): the Day/Night switch (#tbTheme) and the profile picture
   (#pfBtn) float over the top right of every page. Row 1 of the header reserves their width (--rm-tr) so the name and the live
   presence end 8 px before them. top-bar.js always puts the switch 10 px left of the picture, so its spot is reserved even
   before it is placed. Row 2 (the tabs) sits below the buttons, so it gets the full width. */
function clearLeft(br){let left=Infinity;
 for(const id of ['tbTheme','pfBtn']){const e=D.getElementById(id);if(!e||!e.getBoundingClientRect)continue;const s=W.getComputedStyle?W.getComputedStyle(e):null;
  if(s&&(s.display==='none'||s.visibility==='hidden'))continue;const r=e.getBoundingClientRect();
  if(r.width<1||r.bottom<=br.top||r.top>=br.top+56||r.right<=br.left)continue;left=Math.min(left,r.left,id==='pfBtn'?r.left-52:Infinity);}
 return left;}
function fit(b){if(!b||!b.getBoundingClientRect)return;const head=b.querySelector('.rm-head')||b,br=head.getBoundingClientRect();if(br.width<1)return;
 const left=clearLeft(br),need=left===Infinity?0:Math.max(0,Math.ceil(br.right-left+8));
 const v=need+'px';if(b.__fit!==v){b.__fit=v;b.style.setProperty('--rm-tr',v);}}
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
function closeSheet(){if(sheet&&sheet.parentNode)sheet.parentNode.removeChild(sheet);q='';const b=bar&&bar.querySelector('.rm-menu-btn');if(b)b.focus({preventScroll:true});}
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
/* Invite links (menu > Copy invite link): …/lowispike/#community opens Community; #community/affiliates and #community/create open that tab. */
(function deep(){let h='';try{h=location.hash||'';}catch(e){}const m=h.match(/^#community(?:\/(affiliates|create))?$/);if(!m)return;let n=0;
 const tick=()=>{n++;if(typeof W.goTab!=='function'||!D.getElementById('whPad')){if(n<60)setTimeout(tick,500);return;}
  try{W.goTab('foryou');}catch(e){}const v=m[1]==='affiliates'?'aff':m[1]==='create'?'create':'';
  let k=0;const t2=()=>{k++;if(!ensure()){if(k<30)setTimeout(t2,300);return;}if(v)showView(v);try{history.replaceState(null,'',location.pathname+location.search);}catch(e){}};setTimeout(t2,400);};
 setTimeout(tick,600);})();
W.LowiRoomsUI={paint,openSheet,closeSheet,setTab,fit,showView,view:()=>view,menu:toggleMenu,copyView,inviteUrl};
})(window,document);
