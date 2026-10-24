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
 create:['Creation','Erstellen','Crear'],rank:['Ranking','Rangliste','Ranking'],aff:['Affiliates','Affiliates','Afiliados'],copyLink:['Copy link','Link kopieren','Copiar enlace'],copied:['Link copied','Link kopiert','Enlace copiado'],
 tabs:['Community sections','Community-Bereiche','Secciones de la comunidad'],community:['Community','Community','Comunidad'],hereNow:['{c} here now','{c} gerade da','{c} aquí ahora'],
 menu:['Community menu','Community-Menü','Menú de la comunidad'],mRooms:['Circles','Circles','Círculos'],mPeople:['Chat rooms & people','Chat-Räume & Leute','Salas de chat y gente'],mDir:['People','Leute','Personas'],mProfile:['Edit profile','Profil bearbeiten','Editar perfil'],mInvite:['Copy invite link','Einladungslink kopieren','Copiar enlace de invitación'],
 mCopyAff:['Copy Affiliates link','Affiliates-Link kopieren','Copiar enlace de Afiliados'],mCopyCreate:['Copy Creation link','Erstellen-Link kopieren','Copiar enlace de Crear'],mSettings:['Chat settings','Chat-Einstellungen','Ajustes del chat'],mWelcome:['Welcome & rules','Willkommen & Regeln','Bienvenida y normas'],
 channels:['Channels','Kanäle','Canales'],chGalaxy:['Galaxy chat','Galaxie-Chat','Chat de la galaxia'],chGalaxyEmpty:['No messages yet. Say hi to everyone.','Noch keine Nachrichten. Sag allen Hallo.','Aún no hay mensajes. Saluda a todos.'],
 chReplies:['Replies & mentions','Antworten & Erwähnungen','Respuestas y menciones'],chRepliesEmpty:['Nothing for you yet.','Noch nichts für dich.','Todavía nada para ti.'],chRoomOut:['Find your room and the people in it.','Finde deinen Raum und die Leute darin.','Encuentra tu sala y a la gente que hay.'],
 chAff:['Video template (Webdesign or UGC) and what you earn per level.','Video-Template (Webdesign oder UGC) und was du pro Level verdienst.','Plantilla de vídeo (Webdesign o UGC) y lo que ganas por nivel.'],chCreate:['AI studio for creators, being built.','KI-Studio für Creator, im Aufbau.','Estudio de IA para creadores, en construcción.'],
 lHead:['Your galaxy','Deine Galaxie','Tu galaxia'],lSub:['Talk with everyone, see who’s in your room and pick up where you left off.','Schreib mit allen, sieh, wer in deinem Raum ist, und mach da weiter, wo du warst.','Habla con todos, mira quién está en tu sala y sigue donde lo dejaste.'],
 lGo:['Open galaxy chat','Galaxie-Chat öffnen','Abrir el chat de la galaxia'],back:['Back to channels','Zurück zu den Kanälen','Volver a los canales'],members:['Members','Mitglieder','Miembros'],
 you:['You','Du','Tú'],now:['now','jetzt','ahora'],min:[' min',' Min.',' min'],hr:[' h',' Std.',' h'],unreadN:['{c} unread','{c} ungelesen','{c} sin leer'],people:['People in your room','Leute in deinem Raum','Gente en tu sala'],seeProfile:['{name}: see profile','{name}: Profil ansehen','{name}: ver perfil']};
function lang(){try{return Math.max(0,['en','de','es'].indexOf((W.LowiLang&&W.LowiLang.get())||localStorage.getItem('lowispike.lang')||'en'));}catch(e){return 0;}}
function tr(k,v){let s=(T[k]||[k])[lang()]||T[k][0];for(const x in v||{})s=s.split('{'+x+'}').join(String(v[x]));return s;}
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const R=()=>W.LowiRooms,C=()=>W.LowiRoomsCore,H=()=>W.LowiCommunityHost;
/* real people only: server-flagged bots and test accounts never show in a Circle list (bot-accounts.js) */
function people(){try{const B=W.LowiBotAccounts;return ((H()&&H().people&&H().people())||[]).filter(p=>!(B&&p&&!p.me&&B.isBot(p)));}catch(e){return [];}}
function nameOf(uid){const p=people().find(x=>x&&x.uid===uid);return p&&p.n?String(p.n):'';}
function me(){try{return (H()&&H().uid&&H().uid())||'';}catch(e){return '';}}
/* tab order is the user's (community-tab-order.js: hold a tab to move it) */
function tabOrder(){const O=W.LowiCommunityTabs;try{return O&&O.order?O.order():['room','chat','create','aff','rank'];}catch(e){return ['room','chat','create','aff','rank'];}}
function open(){const t=D.getElementById('cgThread');return !!(t&&t.hasAttribute('data-open'));}
/* 21 Oct evening (Eden's Chat): the Chat tab opens the channel list; a channel opens its thread, "‹ Channels" comes back. */
/* 22 Oct (item 36, Emmanuel: "I don't understand what all these rooms are. Remove it so they get straight to the chat group."):
   the Chat tab opens the galaxy group chat itself. The channel landing ("Your galaxy" with Galaxy chat / Replies & mentions / Room
   rows) is no longer shown. Replies & mentions are messages in this same chat, and the newest one is one tap away in the Community
   menu; the people in your room are in the menu too (Rooms & people). Back from the chat (its arrow, an edge swipe, the phone's back
   button, Escape) goes to the Community tab you came from (`from`), else leaves Community. `entry` = opened as Community's first
   tab, so there is nothing to go back to. */
let from='',wasOpen=false,roomTapAt=0;
function cur(){return open()?'chat':view==='chans'?'chat':view||'room';}
function setTab(chat,entry){const c=W.LowiCommunity;
 if(chat){const was=cur();from=entry?'':(was!=='chat'?was:from);view='';if(c&&c.thread&&!open())c.thread(true);wasOpen=open();paint();return;}
 from='';view='';if(c&&c.thread&&open())c.thread(false);wasOpen=open();paint();}
/* back from the chat: true when it went to the tab you came from; false = nothing to go back to (the caller leaves Community) */
function back(){if(!open())return false;const f=from;from='';if(f==='create'||f==='aff'||f==='rank'){showView(f);return true;}if(f==='room'){setTab(false);return true;}return false;}
function goBack(){const S=W.LowiSections;if(S&&typeof S.back==='function'&&D.documentElement.classList.contains('rm-room-open')){S.back();return;}if(!back())setTab(false);}
function openThread(){view='';const c=W.LowiCommunity;if(c&&c.thread&&!open())c.thread(true);paint();}
/* Oct 21: two more tabs, Creation (LOWiSPIKE Create, being built) and Affiliates (the Master Blueprint). Each is its own page with its
   own shareable address (create/, affiliates/); the tab shows that page in a frame, so the app and the shared link are one thing.
   21 Oct evening (Eman: "cramped, old, we can't even see the writing"; inspiration: the Eden app's community): the bar is now an
   Eden-style header in LOWiSPIKE's own look. Row 1: the community name with a menu (Rooms & people, Find someone, Edit profile,
   Copy invite link, Copy this page's link, Chat settings, Welcome & rules) and live presence from the real room (avatars of the
   people in it, a green dot, "12 here now"); nothing is invented, so with no room it just says Rooms. Row 2: the four sections as
   one glass segmented control. The old separate "Copy link" button now lives in the menu. The Day/Night switch and the profile
   picture keep floating top right; row 1 reserves their width (--rm-tr), so nothing ever sits under them. */
const VIEWS={create:'create/',aff:'affiliates/'},PANES={chans:1,rank:1};let view='';const frames={};
function showView(v){if(v==='chans'){setTab(true);return;}if(!VIEWS[v]&&!PANES[v])return;const c=W.LowiCommunity;if(open()&&c&&c.thread)c.thread(false);view=v;paint();}
function viewUrl(v){try{return new URL(VIEWS[v],location.href.split('#')[0]).href;}catch(e){return VIEWS[v];}}
function inviteUrl(){try{return location.href.split('#')[0].split('?')[0]+'#community';}catch(e){return '#community';}}
/* Oct 22 (item 33 sweep): a rebuilt Community page (renderCommunity) left the cached frames detached: frames[view] still existed,
   so no new frame was made and Creation/Affiliates opened blank until the app was reloaded. A frame that is no longer in this box
   is dropped and made again. dropFrames() frees the hidden pages (each is a whole document in memory): when Community closes all
   of them go, when the chat room opens the ones not on screen go; they load again the next time their tab is opened. */
function pageActive(){const p=D.getElementById('tab-foryou');return !p||p.classList.contains('active');}
function dropFrames(keep){for(const k in frames){if(k===keep)continue;const f=frames[k];delete frames[k];try{f.src='about:blank';}catch(e){}if(f.parentNode)f.parentNode.removeChild(f);}}
function ensureView(pane){let box=pane.querySelector(':scope>.rm-view');
 if(!box){box=D.createElement('section');box.className='rm-view';box.setAttribute('data-noi18n','');pane.appendChild(box);}
 for(const k in frames)if(frames[k].parentNode!==box){const f=frames[k];delete frames[k];if(f.parentNode)f.parentNode.removeChild(f);}
 if(VIEWS[view]&&!frames[view]&&pageActive()){/* never load a page while Community is closed (a repaint after leaving made it again) */const f=D.createElement('iframe');f.className='rm-frame';f.src=VIEWS[view]+'?embed=1';/* not lazy: it is only made when its tab is opened, and lazy frames in WebKit can wait for a scroll */f.dataset.view=view;frames[view]=f;box.appendChild(f);}
 for(const k in frames)frames[k].hidden=k!==view;
 for(const k in frames)frames[k].title=k==='aff'?tr('aff'):tr('create');
 return box;}
function copyText(u,label){const done=()=>note(label+': '+u);
 if(navigator.clipboard&&W.isSecureContext)navigator.clipboard.writeText(u).then(done,()=>note(u));else note(u);}
function copyView(v){v=v||view;if(PANES[v])v='';if(!VIEWS[v])return copyText(inviteUrl(),tr('copied'));copyText(viewUrl(v),tr('copied'));}
let bar=null,banner=null,sheet=null,menu=null,q='',msg='',msgT=0;
function ensure(){const pane=D.getElementById('cmPaneChat');if(!pane||!pane.hasAttribute('data-spirit-chat'))return null;
 if(bar&&bar.isConnected&&bar.parentNode===pane)return bar;
 bar=D.createElement('nav');bar.className='rm-bar';bar.setAttribute('data-noi18n','');
 bar.innerHTML='<div class="rm-head"><button type="button" class="rm-id rm-menu-btn" data-rm="menu" aria-haspopup="menu" aria-expanded="false"><span class="rm-logo" aria-hidden="true"><i></i></span><span class="rm-idt"><b class="rm-name"></b><span class="rm-live"></span></span><span class="rm-chev" aria-hidden="true"></span></button></div>'
  +'<div class="rm-tabs" role="tablist">'+tabOrder().map(k=>'<button type="button" role="tab" class="rm-tab" data-rm="'+k+'"></button>').join('')+'</div><div class="rm-crumb" hidden><button type="button" class="rm-back" data-rm="back"></button><span class="rm-crumb-t"></span></div><div class="rm-banner" role="status" aria-live="polite"></div>';
 pane.insertBefore(bar,pane.firstChild);banner=bar.querySelector('.rm-banner');
 for(const ms of [60,250,600,1100])setTimeout(()=>fit(bar),ms);setTimeout(maybeWelcome,1200);
 bar.addEventListener('click',e=>{const b=e.target.closest('[data-rm]');if(!b)return;const a=b.dataset.rm;
  if(a==='back')goBack();else if(a==='room')setTab(false);else if(a==='chat')setTab(true);else if(a==='create'||a==='aff'||a==='rank')showView(a);else if(a==='copy')copyView();else if(a==='sheet')openSheet();else if(a==='menu')toggleMenu();
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
  +(ms.length?'<span class="rm-dot" aria-hidden="true"></span><span class="rm-sub">'+esc(tr('hereNow',{c:ms.length}))+'<span class="rm-sep"> · </span>'+esc(tr('roomN',{n:r.num()}))+'</span>':'<span class="rm-sub">'+esc(tr('roomN',{n:r.num()}))+'</span>');}
function paint(){const b=ensure();if(!b)return;const r=R(),chat=open();
 if(chat&&view)view='';/* the message room was opened by other code: Chat wins */
 if(chat)dropFrames('');
 D.documentElement.classList.toggle('rm-room-open',!!(chat&&pageActive()));/* item 33: the Home X steps aside in a chat room (see community-rooms.css) */
 const pane=b.parentNode,sel=view==='chans'?'chat':view||(chat?'chat':'room');
 const tabs=b.querySelectorAll('.rm-tab');tabs.forEach(t=>{t.textContent=tr(t.dataset.rm);});b.querySelector('.rm-tabs').setAttribute('aria-label',tr('tabs'));
 tabs.forEach(t=>{const on=t.dataset.rm===sel;t.setAttribute('aria-selected',on?'true':'false');t.tabIndex=on?0:-1;});
 /* Phase E: one glowing pill slides under the open section (CSS .rm-tabs::before reads --rm-i) */
 const ti=[...tabs].findIndex(t=>t.dataset.rm===sel),tl=b.querySelector('.rm-tabs');if(tl.__n!==tabs.length){tl.__n=tabs.length;tl.style.setProperty('--rm-n',String(tabs.length));}if(tl.__i!==ti){tl.__i=ti;tl.style.setProperty('--rm-i',String(Math.max(0,ti)));}
 if(view){pane.setAttribute('data-rm-view',view);D.documentElement.classList.toggle('rm-view',pageActive());/* Oct 23 2026: only while Community is open (watch() repaints every 1.5 s, also behind Home) */if(VIEWS[view])ensureView(pane);else{const bx=pane.querySelector(':scope>.rm-view');if(bx)ensureView(pane);}}
 else{pane.removeAttribute('data-rm-view');D.documentElement.classList.remove('rm-view');if(pane.querySelector(':scope>.rm-view'))ensureView(pane);}
 /* a new section starts at the top: a pane left scrolled by the last one slid the tabs under the floating profile picture (iPhone SE) */
 if(pane.__rmV!==(view||'')){pane.__rmV=view||'';if(pane.scrollTop)pane.scrollTop=0;}
 paintChans(pane);paintRank(pane);
 const cr=b.querySelector('.rm-crumb');cr.hidden=!(chat&&!view);if(!cr.hidden){const bk=cr.querySelector('.rm-back');if(bk.getAttribute('aria-label')!==tr('back')){bk.innerHTML='<i aria-hidden="true"></i>';bk.setAttribute('aria-label',tr('back'));}cr.querySelector('.rm-crumb-t').textContent=tr('chGalaxy');}
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
/* 23 Oct (E-man: "we need to highlight ranking way more ... like a Pokemon game"): the Ranking tab, a companion leaderboard drawn by
   ranking.js into its own box under the same shared top bar. Like the channel box it is a pane of this page, not a frame. */
function paintRank(pane){let box=pane.querySelector(':scope>.rm-view>.rm-rank');if(view!=='rank'){if(box)box.hidden=true;return;}
 /* 23 Oct, second pass (Eman: "ich moechte, dass das immer gleich aussieht"): the board sits in the shared .rm-view box as an .rm-frame
    panel, the same panel Creation and Affiliates use, and scrolls inside it (community-rooms.css) */
 const vw=ensureView(pane);
 if(!box){box=D.createElement('section');box.className='rm-frame rm-rank';box.setAttribute('data-noi18n','');box.hidden=true;vw.appendChild(box);}
 const fresh=box.hidden;if(box.hidden){box.hidden=false;box.scrollTop=0;}try{if(W.LowiRanking)W.LowiRanking.render(box,fresh);}catch(e){console.error(e);}}
/* Channel list (Eden's channels), only from data the app has: the galaxy chat's newest message and unread count, replies and
   mentions addressed to you (LowiCommunity.directed), the people in your room, and the two pages. Empty means an honest line. */
function ago(ts){const s=Math.max(0,(Date.now()-(+ts||0))/1000);if(!ts)return '';if(s<60)return tr('now');if(s<3600)return Math.floor(s/60)+tr('min');if(s<86400)return Math.floor(s/3600)+tr('hr');
 try{return new Date(+ts).toLocaleDateString(undefined,{weekday:'short'});}catch(e){return '';}}
function chanRows(){const c=W.LowiCommunity,r=R(),rows=[];let last=null,un=0,dm={list:[]};
 try{last=c&&c.latest?c.latest():null;}catch(e){}try{un=c&&c.unread?c.unread():0;}catch(e){}try{dm=(c&&c.directed&&c.directed())||dm;}catch(e){}
 rows.push({k:'galaxy',ic:'🌌',t:tr('chGalaxy'),p:last?((last.mine?tr('you'):(last.by||nameOf(last.uid)||'Member'))+': '+last.text):tr('chGalaxyEmpty'),ts:last&&last.ts,n:un});
 const dl=(dm.list||[]),dn=dl.filter(m=>!m.seen).length,dlast=dl[dl.length-1];
 rows.push({k:'replies',ic:'💬',t:tr('chReplies'),p:dlast?((dlast.by||nameOf(dlast.uid)||'Member')+': '+dlast.text):tr('chRepliesEmpty'),ts:dlast&&dlast.ts,n:dn,dis:!dlast});
 if(r&&C()&&r.status()==='in'){const ms=r.members(),id=me(),names=ms.filter(u=>u!==id).map(nameOf).filter(Boolean).slice(0,3);
  rows.push({k:'room',ic:'🪐',t:tr('roomN',{n:r.num()}),p:ms.length?tr('hereNow',{c:ms.length})+(names.length?' · '+names.join(', '):''):tr('chRoomOut')});}
 else rows.push({k:'room',ic:'🪐',t:tr('rooms'),p:tr('chRoomOut')});
 rows.push({k:'aff',ic:'🚀',t:tr('aff'),p:tr('chAff')});rows.push({k:'create',ic:'✨',t:tr('create'),p:tr('chCreate')});
 return rows;}
function paintChans(pane){let box=pane.querySelector(':scope>.rm-chans');if(view!=='chans'){if(box)box.hidden=true;return;}
 if(!box){box=D.createElement('section');box.className='rm-chans';box.setAttribute('data-noi18n','');pane.appendChild(box);
  box.addEventListener('click',e=>{const b=e.target.closest('[data-ch]');if(!b||b.disabled)return;const k=b.dataset.ch,c=W.LowiCommunity;
   if(k==='galaxy')openThread();else if(k==='replies'){let d=null;try{d=c.directed();}catch(x){}const m=d&&d.list&&d.list[d.list.length-1];if(m&&c.openMessage){view='';c.openMessage(m.uid,m.id);paint();}}
   else if(k==='room')openSheet();else showView(k);});}
 box.hidden=false;
 /* Phase E (21 Oct 2026, Eman: "rebuild the whole Community, I don't like how it looks at all"; Eden's Plan screen in LOWiSPIKE's
    dark galaxy): one clear thing on this view. A small live pill, one big headline, a muted line, ONE glass card with the three
    community channels (icon tile, name, last line, thin dividers), and one big button into the galaxy chat. Creation and
    Affiliates are their own sections in the pill control above, so they are not repeated here. */
 const r=R(),inRoom=!!(r&&C()&&r.status()==='in'),pill=inRoom?'<i class="rm-l-dot" aria-hidden="true"></i>'+esc(tr('hereNow',{c:r.members().length})+' · '+tr('roomN',{n:r.num()})):esc(tr('community'));
 const row=x=>'<li><button type="button" class="rm-ch" data-ch="'+x.k+'"'+(x.dis?' disabled':'')+'><span class="rm-ch-ic" data-ic="'+x.k+'" aria-hidden="true">'+x.ic+'</span><span class="rm-ch-txt"><span class="rm-ch-top"><b>'+esc(x.t)+'</b>'+(x.ts?'<time>'+esc(ago(x.ts))+'</time>':'')+'</span><span class="rm-ch-p">'+esc(String(x.p||'').replace(/\s+/g,' ').slice(0,140))+'</span></span>'+(x.n?'<span class="rm-ch-n" aria-label="'+esc(tr('unreadN',{c:x.n}))+'">'+(x.n>99?'99+':x.n)+'</span>':'<span class="rm-ch-go" aria-hidden="true"></span>')+'</button></li>';
 const h='<div class="rm-l-hero"><span class="rm-l-pill">'+pill+'</span><h2 class="rm-l-h">'+esc(tr('lHead'))+'</h2><p class="rm-l-sub">'+esc(tr('lSub'))+'</p></div>'
  +'<h3 class="rm-ch-h">'+esc(tr('channels'))+'</h3><ul class="rm-ch-list">'+chanRows().filter(x=>x.k==='galaxy'||x.k==='replies'||x.k==='room').map(row).join('')+'</ul>'
  +'<button type="button" class="rm-l-go" data-ch="galaxy">'+esc(tr('lGo'))+'</button>';
 if(box.__h!==h){box.innerHTML=h;box.__h=h;}}
/* Community menu (Eden's dropdown): only things that really work here. */
/* item 36: the newest reply or mention addressed to you, now that the channel list that showed it is gone */
function lastDirected(){try{const c=W.LowiCommunity,d=c&&c.directed&&c.directed(),l=(d&&d.list)||[];return l.length?{m:l[l.length-1],n:l.filter(x=>!x.seen).length}:null;}catch(e){return null;}}
function menuItems(){const it=[['people','👥',tr('mPeople')],['find','🔎',tr('find')]];/* People directory (Oct 24 2026): everyone in the app, offline too, people-directory.js */if(W.LowiPeopleDir)it.push(['dir','🧑‍🤝‍🧑',tr('mDir')]);if(W.LowiUserRooms)it.unshift(['urooms','🫧',tr('mRooms')]);/* Rooms people create (OWNER-REQUESTS 6), user-rooms.js */
 /* 23 Oct (Emmanuel: "Replies & mentions doesn't work and doesn't make sense, so you can mute it"): no Replies & mentions entry.
    lastDirected() and the 'replies' click branch stay as harmless dead paths (nothing renders that key any more). */
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
   if(k==='replies'){const dl=lastDirected(),c=W.LowiCommunity;if(dl&&c&&c.thread){const f=cur();view='';c.thread(true,dl.m.id);if(f!=='chat')from=f;paint();}}/* thread(), not openMessage(): its goTab('foryou') from inside Community rebuilds the page and drops the open chat */else if(k==='urooms'){try{W.LowiUserRooms.open();}catch(x){}}else if(k==='people')openSheet();else if(k==='dir'){try{W.LowiPeopleDir.open();}catch(x){}}
else if(k==='find'){openSheet();setTimeout(()=>{const f=sheet&&sheet.querySelector('.rm-find');if(f)f.focus({preventScroll:true});},60);}
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
  sheet.innerHTML='<div class="rm-card"><i class="rm-grab" aria-hidden="true"></i><header><h2 class="rm-h"></h2><button type="button" class="rm-x" data-rs="close">×</button></header><p class="rm-you"></p><div class="rm-crew"></div><input class="rm-find" type="search" autocomplete="off" enterkeyhint="search"><ul class="rm-list"></ul></div>';
  sheet.addEventListener('click',e=>{if(e.target===sheet){closeSheet();return;}const b=e.target.closest('[data-rs]');if(!b)return;const a=b.dataset.rs;
   if(a==='close')closeSheet();else if(a==='profile')openCard(b.dataset.uid,b.dataset.name);else if(a==='join'){b.disabled=true;R().joinRoom(+b.dataset.n).then(res=>{if(res.ok){closeSheet();note(tr('moved',{n:R().num()}));}else{note(tr('full'));refreshDir();}});}
   else if(a==='person'){b.disabled=true;const uid=b.dataset.uid,nm=b.dataset.name;if(b.dataset.mode==='knock')note(tr('knocking',{name:nm}));closeSheet();
    R().joinPerson(uid).then(res=>{if(res.ok){note(res.why==='here'?'':tr('moved',{n:R().num()}));}else note(res.why==='no-answer'?tr('noAnswer',{name:nm}):res.why==='full'?tr('full'):tr('nobody'));});}});
  sheet.querySelector('.rm-find').addEventListener('input',e=>{q=e.target.value.trim().toLowerCase();paintSheet();});
  sheet.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();closeSheet();}});}
 D.body.appendChild(sheet);sheet.querySelector('.rm-h').textContent=tr('mPeople');sheet.querySelector('.rm-x').setAttribute('aria-label',tr('close'));const f=sheet.querySelector('.rm-find');f.placeholder=tr('find');f.setAttribute('aria-label',tr('find'));
 paintSheet();refreshDir();setTimeout(()=>{const x=sheet.querySelector('.rm-x');if(x)x.focus({preventScroll:true});},30);}
/* 23 Oct 2026 (Emmanuel: "when I click on the names, it doesn't ... take us to the actual profile, so we see who they are"):
   every name in this sheet (the people in your room, the names under each room, the search results) opens that person's
   profile card, LowiCommunity.openProfile(uid), the same card a tap on a chat avatar opens. Always by user id, never by name.
   The card would sit under this sheet, so the sheet steps aside while it is open and comes back as soon as the card closes
   (LowiR2 marks it .off, then removes it; its X, the scrim, back); Chat or Send energy on the card go on to where they lead and this sheet stays closed. */
function pAttr(u,n){return 'data-rs="profile" data-uid="'+esc(u)+'" data-name="'+esc(n)+'" aria-label="'+esc(tr('seeProfile',{name:n}))+'"';}
function openCard(uid,name){const c=W.LowiCommunity,s=sheet;if(!uid||!c||typeof c.openProfile!=='function')return false;let ov=null;
 try{ov=c.openProfile(uid,name||'');}catch(x){ov=null;}
 if(!ov||!ov.isConnected||!s||!s.isConnected)return !!ov;s.style.display='none';let away=false;
 ov.addEventListener('click',e=>{const t=e.target&&e.target.closest&&e.target.closest('[data-chat]');if(t&&/^(select-close|energy|settings)$/.test(t.dataset.chat||''))away=true;},true);
 const back=()=>{if(ov.isConnected&&!ov.classList.contains('off'))return;if(pw)pw.disconnect();if(!s.isConnected)return;if(away){closeSheet();return;}s.style.display='';
  const b=[...s.querySelectorAll('[data-rs="profile"]')].find(x=>x.dataset.uid===uid);if(b)b.focus({preventScroll:true});};
 const pw=typeof MutationObserver==='function'?new MutationObserver(back):null;if(pw){pw.observe(ov.parentNode||D.body,{childList:true});pw.observe(ov,{attributes:true,attributeFilter:['class']});}
 return true;}
function closeSheet(){if(sheet&&sheet.parentNode)sheet.parentNode.removeChild(sheet);q='';const b=bar&&bar.querySelector('.rm-menu-btn');if(b)b.focus({preventScroll:true});}
let dirBusy=false;function refreshDir(){if(dirBusy||!R())return;dirBusy=true;R().readDirectory().catch(()=>{}).then(()=>{dirBusy=false;paintSheet();});}
function paintSheet(){if(!sheet||!sheet.isConnected)return;const r=R(),cap=r.cap(),mine=r.num(),id=me();
 sheet.querySelector('.rm-you').textContent=r.status()==='in'?tr('youIn',{n:mine,c:r.members().length,cap}):tr(r.status()==='joining'?'joining':'offline');
 const crew=r.members().filter(u=>u!==id).map(u=>({u,n:nameOf(u)})).filter(x=>x.n).slice(0,24);
 /* Phase E: the people in your room as avatar chips (initials in their chat colour), Eden's members row */
 sheet.querySelector('.rm-crew').innerHTML=crew.length?'<span class="rm-lab">'+esc(tr('people'))+'</span> '+crew.map(x=>'<button type="button" class="rm-p" '+pAttr(x.u,x.n)+'><i aria-hidden="true" style="'+(colorOf(x.u)?'--fc:'+esc(colorOf(x.u)):'')+'">'+esc(initials(x.n))+'</i>'+esc(x.n)+'</button>').join(''):'';
 let rows=[];const list=r.rooms();
 if(q){for(const room of list)for(const u of room.u){if(u===id)continue;const n=nameOf(u);if(!n||n.toLowerCase().indexOf(q)<0)continue;const mode=room.n===mine?'here':C().joinMode(room,cap,room.g);
   rows.push('<li><span class="rm-who"><button type="button" class="rm-nm" '+pAttr(u,n)+'>'+esc(n)+'</button><small>'+esc(tr('roomN',{n:room.n}))+'</small></span>'+(mode==='here'?'<em>'+esc(tr('yours'))+'</em>':mode==='full'?'<em>'+esc(tr('full'))+'</em>':'<button type="button" data-rs="person" data-mode="'+mode+'" data-uid="'+esc(u)+'" data-name="'+esc(n)+'">'+esc(tr(mode==='knock'?'knock':'join'))+'</button>')+'</li>');if(rows.length>=30)break;}}
 else for(const room of list){const ppl=room.u.map(u=>({u,n:nameOf(u)})).filter(x=>x.n),names=ppl.map(x=>x.n),more=Math.max(0,room.c-names.slice(0,3).length);
   rows.push('<li'+(room.n===mine?' class="rm-mine"':'')+'><span class="rm-who"><b>'+esc(tr('roomN',{n:room.n}))+' · '+room.c+'/'+cap+'</b><small>'+ppl.slice(0,3).map(x=>'<button type="button" class="rm-nm rm-nm-s" '+pAttr(x.u,x.n)+'>'+esc(x.n)+'</button>').join(', ')+(more?' +'+more:'')+'</small></span>'+(room.n===mine?'<em>'+esc(tr('yours'))+'</em>':room.c<cap?'<button type="button" data-rs="join" data-n="'+room.n+'">'+esc(tr('join'))+'</button>':'<em>'+esc(tr('full'))+'</em>')+'</li>');}
 const ul=sheet.querySelector('.rm-list'),h=rows.join('');if(ul.__h!==h){ul.innerHTML=h;ul.__h=h;}}
D.addEventListener('lowi:room',e=>{const t=e.detail&&e.detail.type;if(t==='knock'&&W.LowiSfx&&W.LowiSfx.play)try{W.LowiSfx.play('ping');}catch(x){}paint();try{W.LowiCommunity&&W.LowiCommunity.refresh();}catch(x){}});
D.addEventListener('lowi:chat',()=>paint());
/* keep the tab state honest when other code opens or closes the message room (history button, Escape, back) */
/* Oct 24 (button sweep): a tap on a speech bubble or a companion in the Room opens the chat through LowiCommunity.thread() itself,
   not through setTab(), so `from` stayed empty and back (edge swipe, phone back, Escape) closed Community for Home instead of
   going back to the Room. When the chat opens right after a tap inside the Community page and nobody set `from`, the tab under
   it is where back goes. setTab() keeps wasOpen in step, so the Chat tab and Community's first tab (`entry`) are unchanged. */
D.addEventListener('pointerdown',e=>{const t=e.target;roomTapAt=t&&t.closest&&t.closest('#tab-foryou')&&!t.closest('.rm-tab,.rm-menu,.rm-menu-btn')?Date.now():0;},true);
function threadMoved(){const o=open();if(o&&!wasOpen&&!from&&roomTapAt&&Date.now()-roomTapAt<2500)from=(view==='create'||view==='aff'||view==='rank')?view:'room';wasOpen=o;}
const mo=typeof MutationObserver==='function'?new MutationObserver(()=>{threadMoved();paint();}):null;
function watch(){const t=D.getElementById('cgThread');if(t&&mo&&!t.__rmWatch){t.__rmWatch=1;mo.observe(t,{attributes:true,attributeFilter:['data-open']});}paint();}
setInterval(watch,1500);if(D.readyState!=='loading')watch();else D.addEventListener('DOMContentLoaded',watch);
/* Oct 22 (item 33): when the Community page is rebuilt, the tab bar comes back in the same frame (it used to wait up to 1.5 s for
   watch(), showing the galaxy with no tabs), and leaving Community frees the Creation/Affiliates pages. */
let pageWatch=null,pageOn=false;
function watchPage(){const p=D.getElementById('tab-foryou');if(!p||typeof MutationObserver!=='function'||p.__rmPage)return;p.__rmPage=1;pageOn=p.classList.contains('active');
 pageWatch=new MutationObserver(recs=>{let kids=false,cls=false;for(const r of recs){if(r.type==='childList')kids=true;else cls=true;}
  const on=p.classList.contains('active');if(cls&&on&&!pageOn)paint();if(cls&&pageOn&&!on){dropFrames(null);D.documentElement.classList.remove('rm-room-open');from='';if(open()){try{W.LowiCommunity.thread(false);}catch(x){}}/* Oct 23 2026 (Emmanuel: back from Community froze the app): html.rm-view stopped every world frame (body-world-3d.js) and stayed on behind Home after Ranking, Creation or Affiliates, so Home froze on the last zoomed-out Community frame. The tab is kept in view and comes back with paint() on the way in. */D.documentElement.classList.remove('rm-view');/* item 36: leaving Community closes the chat, so html.cr-room never stays on behind Home */if(sheet)closeSheet();if(menu&&!menu.hidden)toggleMenu(false);}pageOn=on;
  if(kids&&on&&!(bar&&bar.isConnected))paint();});
 pageWatch.observe(p,{attributes:true,attributeFilter:['class'],childList:true});}
setInterval(watchPage,1500);if(D.readyState!=='loading')watchPage();else D.addEventListener('DOMContentLoaded',watchPage);
W.addEventListener('resize',()=>{if(bar&&bar.isConnected)fit(bar);});
/* the profile picture and the switch appear, move and hide on their own (top-bar.js): re-fit the moment they do */
let fitRaf=0;const refit=()=>{if(fitRaf||!bar||!bar.isConnected)return;fitRaf=(W.requestAnimationFrame||setTimeout)(()=>{fitRaf=0;fit(bar);});};
const fmo=typeof MutationObserver==='function'?new MutationObserver(refit):null;
setInterval(()=>{if(!fmo)return;for(const e of [D.documentElement,D.getElementById('main'),D.getElementById('pfBtn'),D.getElementById('tbTheme')])
 if(e&&!e.__rmFit){e.__rmFit=1;fmo.observe(e,{attributes:true,attributeFilter:['class','style','hidden']});}},1000);
/* 21 Oct evening, phase C (Eden's onboarding): a 5-step welcome sheet the first time someone opens Community, and again from the
   menu (Welcome & rules). 1 what this is, 2 numbered rules with "I agree", 3 quick questions as chips (what you're working on,
   affiliate yes/no, followers), 4 profile (name and photo come from the app profile; the rest is saved on this phone), 5 where to
   start. Answering "yes" to affiliate makes Affiliates the first card and Done opens it. Nothing is sent anywhere. Automated
   browsers (navigator.webdriver) never get it on their own, so other checks are not covered by it; they open it explicitly. */
const OBK='lowi.cm.welcome.v1',OPK='lowi.cm.profile.v1';
const OT={obStep:['{i} of 5','{i} von 5','{i} de 5'],obClose:['Close','Schließen','Cerrar'],obNext:['Continue','Weiter','Continuar'],obBack:['Back','Zurück','Atrás'],
 obW1:['Welcome to the LOWiSPIKE Community','Willkommen in der LOWiSPIKE Community','Bienvenido a la Comunidad LOWiSPIKE'],
 obW2:['People using LOWiSPIKE meet here to share their gaps, meals and wins, and to keep each other steady.','Hier treffen sich Leute, die LOWiSPIKE nutzen, teilen ihre Pausen, Mahlzeiten und Erfolge und halten sich gegenseitig auf Kurs.','Aquí se reúnen quienes usan LOWiSPIKE para compartir sus pausas, comidas y logros, y mantenerse firmes juntos.'],
 obKnow:['A few things to know','Gut zu wissen','Algunas cosas que saber'],
 obK1:['Room: your galaxy with the people around you.','Raum: deine Galaxie mit den Leuten um dich herum.','Sala: tu galaxia con la gente a tu alrededor.'],
 obK2:['Chat: the galaxy chat and your replies, as channels.','Chat: der Galaxie-Chat und deine Antworten, als Kanäle.','Chat: el chat de la galaxia y tus respuestas, como canales.'],
 obK3:['Creation: an AI studio for creators, being built.','Erstellen: ein KI-Studio für Creator, im Aufbau.','Crear: un estudio de IA para creadores, en construcción.'],
 obK4:['Affiliates: earn by sharing LOWiSPIKE, with the Master Blueprint.','Affiliates: verdiene, indem du LOWiSPIKE teilst, mit dem Master Blueprint.','Afiliados: gana compartiendo LOWiSPIKE, con el Master Blueprint.'],
 obR:['Community rules','Community-Regeln','Normas de la comunidad'],
 obR1:['Be kind. Everyone here is working on something hard.','Sei freundlich. Alle hier arbeiten an etwas Schwerem.','Sé amable. Todos aquí trabajan en algo difícil.'],
 obR2:['Share experience, not medical advice.','Teile Erfahrungen, keine medizinischen Ratschläge.','Comparte experiencias, no consejos médicos.'],
 obR3:['No spam or selling. Promotion belongs in Affiliates.','Kein Spam und kein Verkaufen. Werbung gehört zu Affiliates.','Nada de spam ni ventas. La promoción va en Afiliados.'],
 obR4:['Keep it real: no fake results or edited before-and-afters.','Bleib echt: keine falschen Ergebnisse oder bearbeiteten Vorher-nachher-Bilder.','Sé real: nada de resultados falsos ni antes y después editados.'],
 obR5:['If someone bothers you, block them from their message.','Wenn dich jemand stört, blockiere ihn über seine Nachricht.','Si alguien te molesta, bloquéalo desde su mensaje.'],
 obAgree:['I agree','Ich stimme zu','Estoy de acuerdo'],
 obQ:['A few quick questions','Ein paar kurze Fragen','Unas preguntas rápidas'],obQs:['Optional. It helps you find your people.','Freiwillig. Es hilft dir, deine Leute zu finden.','Opcional. Te ayuda a encontrar a tu gente.'],
 obQ1:['What are you working on?','Woran arbeitest du?','¿En qué estás trabajando?'],
 obQ1a:['🔥 Losing weight','🔥 Abnehmen','🔥 Perder peso'],obQ1b:['⏳ Fasting','⏳ Fasten','⏳ Ayuno'],obQ1c:['🩸 Steadier blood sugar','🩸 Stabiler Blutzucker','🩸 Azúcar más estable'],obQ1d:['💪 Energy & fitness','💪 Energie & Fitness','💪 Energía y forma'],obQ1e:['🎬 Creating content','🎬 Content erstellen','🎬 Crear contenido'],
 obQ2:['Do you want to be an affiliate?','Möchtest du Affiliate werden?','¿Quieres ser afiliado?'],obQ2y:['💸 Yes, show me','💸 Ja, zeig mir wie','💸 Sí, enséñame'],obQ2n:['✋ Not now','✋ Gerade nicht','✋ Ahora no'],
 obQ3:['How many followers do you have?','Wie viele Follower hast du?','¿Cuántos seguidores tienes?'],obQ3a:['Under 1K','Unter 1K','Menos de 1K'],
 obP:['Your profile','Dein Profil','Tu perfil'],obPs:['Your name and photo come from your LOWiSPIKE profile.','Name und Foto kommen aus deinem LOWiSPIKE-Profil.','Tu nombre y foto vienen de tu perfil de LOWiSPIKE.'],obPhoto:['Change name or photo','Name oder Foto ändern','Cambiar nombre o foto'],
 obPw:['What are you working on?','Woran arbeitest du?','¿En qué estás trabajando?'],obPb:['Bio','Bio','Bio'],obPh:['Handles','Profile','Perfiles'],obSaved:['Saved on this phone.','Auf diesem Handy gespeichert.','Guardado en este teléfono.'],
 obIn:['You\'re in. Where do you want to start?','Du bist drin. Wo willst du anfangen?','Ya estás dentro. ¿Por dónde quieres empezar?'],
 obC1:['Introduce yourself','Stell dich vor','Preséntate'],obC1s:['Say hi in the galaxy chat.','Sag Hallo im Galaxie-Chat.','Saluda en el chat de la galaxia.'],
 obC2:['Walkthrough','Rundgang','Recorrido'],obC2s:['A short tour of Community.','Eine kurze Tour durch die Community.','Un breve recorrido por Comunidad.'],
 obC3:['Get help','Hilfe holen','Pedir ayuda'],obC3s:['Ask the galaxy a question.','Stell der Galaxie eine Frage.','Haz una pregunta a la galaxia.'],
 obC4:['Open Affiliates','Affiliates öffnen','Abrir Afiliados'],obC4s:['Your Master Blueprint and numbers.','Dein Master Blueprint und deine Zahlen.','Tu Master Blueprint y tus números.'],
 obDone:['Done','Fertig','Listo'],obHi:['Hi, I\'m new here.','Hi, ich bin neu hier.','Hola, soy nuevo aquí.'],obHelp:['Can someone help me with ','Kann mir jemand helfen bei ','¿Alguien me ayuda con ']};
Object.assign(T,OT);
let ob=null,obI=0,obA={};
function lsGet(k){try{return JSON.parse(localStorage.getItem(k)||'null');}catch(e){return null;}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
function chip(group,val,label){const on=group==='work'?(obA.work||[]).includes(val):obA[group]===val;return '<button type="button" class="rm-chipq" data-q="'+group+'" data-v="'+val+'" aria-pressed="'+(on?'true':'false')+'">'+esc(label)+'</button>';}
function obBody(){const p=Object.assign({},lsGet(OPK)||{}),aff=obA.aff==='yes';
 if(obI===0)return '<div class="rm-ob-hero" aria-hidden="true"><span class="rm-logo"><i></i></span></div><h2 class="rm-ob-h">'+esc(tr('obW1'))+'</h2><p class="rm-ob-p">'+esc(tr('obW2'))+'</p><h3 class="rm-ob-h3">'+esc(tr('obKnow'))+'</h3><ul class="rm-ob-know">'+['obK1','obK2','obK3','obK4'].map(k=>'<li>'+esc(tr(k))+'</li>').join('')+'</ul>';
 if(obI===1)return '<h2 class="rm-ob-h">'+esc(tr('obR'))+'</h2><ol class="rm-ob-rules">'+['obR1','obR2','obR3','obR4','obR5'].map(k=>'<li>'+esc(tr(k))+'</li>').join('')+'</ol>';
 if(obI===2)return '<h2 class="rm-ob-h">'+esc(tr('obQ'))+'</h2><p class="rm-ob-p">'+esc(tr('obQs'))+'</p><h3 class="rm-ob-h3">'+esc(tr('obQ1'))+'</h3><div class="rm-chips">'+['a','b','c','d','e'].map(x=>chip('work',x,tr('obQ1'+x))).join('')+'</div>'
  +'<h3 class="rm-ob-h3">'+esc(tr('obQ2'))+'</h3><div class="rm-chips">'+chip('aff','yes',tr('obQ2y'))+chip('aff','no',tr('obQ2n'))+'</div>'
  +'<h3 class="rm-ob-h3">'+esc(tr('obQ3'))+'</h3><div class="rm-chips">'+chip('fol','0',tr('obQ3a'))+chip('fol','1k','1K–10K')+chip('fol','10k','10K–100K')+chip('fol','100k','100K+')+'</div>';
 if(obI===3){const f=(k,l,ph,big)=>'<label class="rm-fld"><span>'+esc(l)+'</span>'+(big?'<textarea data-p="'+k+'" rows="3" maxlength="280">'+esc(p[k]||'')+'</textarea>':'<input data-p="'+k+'" maxlength="80" value="'+esc(p[k]||'')+'" placeholder="'+esc(ph||'')+'" autocomplete="off" autocapitalize="off">')+'</label>';
  const nm=nameOf(me())||'';
  return '<h2 class="rm-ob-h">'+esc(tr('obP'))+'</h2><div class="rm-ob-me"><span class="rm-ob-av" aria-hidden="true">'+esc(initials(nm||'?'))+'</span><div><b>'+esc(nm||tr('obP'))+'</b><small>'+esc(tr('obPs'))+'</small></div></div>'
   +(D.getElementById('pfBtn')?'<button type="button" class="rm-ob-sec" data-ob="photo">'+esc(tr('obPhoto'))+'</button>':'')
   +f('working',tr('obPw'),'',false)+f('bio',tr('obPb'),'',true)+'<h3 class="rm-ob-h3">'+esc(tr('obPh'))+'</h3><div class="rm-ob-handles">'+f('x','X','@')+f('ig','Instagram','@')+f('yt','YouTube','@')+f('tt','TikTok','@')+'</div><p class="rm-ob-note">'+esc(tr('obSaved'))+'</p>';}
 const cards=[['intro','👋','obC1','obC1s'],['walk','🧭','obC2','obC2s'],['help','🆘','obC3','obC3s']];if(aff)cards.unshift(['aff','🚀','obC4','obC4s']);
 return '<h2 class="rm-ob-h">'+esc(tr('obIn'))+'</h2><div class="rm-ob-cards">'+cards.map(([k,ic,t,s2])=>'<button type="button" class="rm-ob-card'+(k==='aff'?' rm-ob-hot':'')+'" data-ob="'+k+'"><span class="rm-ch-ic" aria-hidden="true">'+ic+'</span><span><b>'+esc(tr(t))+'</b><small>'+esc(tr(s2))+'</small></span></button>').join('')+'</div>';}
function obPaint(){if(!ob)return;const last=obI===4,next=obI===1?tr('obAgree'):last?tr('obDone'):tr('obNext');
 ob.innerHTML='<div class="rm-ob-card-wrap" role="dialog" aria-modal="true" aria-labelledby="rmObH"><div class="rm-ob-top"><div class="rm-ob-bar" role="progressbar" aria-valuemin="1" aria-valuemax="5" aria-valuenow="'+(obI+1)+'"><i style="width:'+((obI+1)*20)+'%"></i></div><span class="rm-ob-step">'+esc(tr('obStep',{i:obI+1}))+'</span><button type="button" class="rm-x" data-ob="close" aria-label="'+esc(tr('obClose'))+'">×</button></div>'
  +'<div class="rm-ob-body">'+obBody()+'</div><div class="rm-ob-foot">'+(obI>0?'<button type="button" class="rm-ob-sec" data-ob="back">'+esc(tr('obBack'))+'</button>':'<span></span>')+'<button type="button" class="rm-ob-go" data-ob="next">'+esc(next)+'</button></div></div>';
 const h=ob.querySelector('.rm-ob-h');if(h)h.id='rmObH';setTimeout(()=>{const g=ob&&ob.querySelector('.rm-ob-go');if(g)g.focus({preventScroll:true});},40);}
function obSaveProfile(){if(!ob)return;const p=Object.assign({},lsGet(OPK)||{});ob.querySelectorAll('[data-p]').forEach(i=>{p[i.dataset.p]=String(i.value||'').trim().slice(0,i.tagName==='TEXTAREA'?280:80);});p.ts=Date.now();lsSet(OPK,p);}
function obClose(done){if(obI===3)obSaveProfile();const st=Object.assign({},lsGet(OBK)||{},{seen:Date.now(),answers:obA});if(done)st.done=Date.now();lsSet(OBK,st);if(ob&&ob.parentNode)ob.parentNode.removeChild(ob);ob=null;}
function prefill(text){const c=W.LowiCommunity;view='';if(c&&c.thread&&!open())c.thread(true);paint();setTimeout(()=>{const i=D.getElementById('cmInput');if(!i)return;if(!i.value)i.value=text;try{i.dispatchEvent(new Event('input',{bubbles:true}));}catch(e){}i.focus();},350);}
function openWelcome(){if(ob)return;obI=0;obA=Object.assign({},((lsGet(OBK)||{}).answers)||{});ob=D.createElement('div');ob.className='rm-sheet rm-ob';ob.setAttribute('data-noi18n','');D.body.appendChild(ob);
 ob.addEventListener('click',e=>{if(e.target===ob){obClose(false);return;}const q=e.target.closest('[data-q]');
  if(q){const g=q.dataset.q,v=q.dataset.v;if(g==='work'){const a=new Set(obA.work||[]);a.has(v)?a.delete(v):a.add(v);obA.work=[...a];}else obA[g]=obA[g]===v?'':v;
   q.parentNode.querySelectorAll('[data-q]').forEach(b=>b.setAttribute('aria-pressed',(g==='work'?(obA.work||[]).includes(b.dataset.v):obA[g]===b.dataset.v)?'true':'false'));return;}
  const b=e.target.closest('[data-ob]');if(!b)return;const k=b.dataset.ob;
  if(k==='close')obClose(false);else if(k==='back'){if(obI===3)obSaveProfile();obI=Math.max(0,obI-1);obPaint();}
  else if(k==='next'){if(obI===3)obSaveProfile();if(obI<4){obI++;obPaint();}else{const aff=obA.aff==='yes';obClose(true);if(aff)showView('aff');}}
  else if(k==='photo'){obSaveProfile();obClose(false);const p=D.getElementById('pfBtn');if(p)p.click();}
  else if(k==='aff'){obClose(true);showView('aff');}
  else if(k==='intro'){const p=lsGet(OPK)||{};obClose(true);prefill(tr('obHi')+(p.working?' '+p.working:''));}
  else if(k==='help'){obClose(true);prefill(tr('obHelp'));}
  else if(k==='walk'){obClose(true);try{W.LowiTutorial&&W.LowiTutorial.start({at:'community',from:'community-welcome'});}catch(x){}}});
 ob.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();obClose(false);}});
 obPaint();}
function maybeWelcome(){if(ob||lsGet(OBK)||(navigator&&navigator.webdriver))return;const b=bar;if(!b||!b.isConnected||!b.getBoundingClientRect().width)return;
 if(W.LowiTutorial&&W.LowiTutorial.isOn&&W.LowiTutorial.isOn())return;openWelcome();}
W.LowiCommunityWelcome={open:openWelcome,close:()=>obClose(false),seen:()=>!!lsGet(OBK)};
/* Invite links (menu > Copy invite link): …/lowispike/#community opens Community; #community/affiliates and #community/create open that tab. */
(function deep(){let h='';try{h=location.hash||'';}catch(e){}const m=h.match(/^#community(?:\/(affiliates|create|ranking))?$/);if(!m)return;let n=0;
 const tick=()=>{n++;if(typeof W.goTab!=='function'||!D.getElementById('whPad')){if(n<60)setTimeout(tick,500);return;}
  try{W.goTab('foryou');}catch(e){}const v=m[1]==='affiliates'?'aff':m[1]==='create'?'create':m[1]==='ranking'?'rank':'';
  let k=0;const t2=()=>{k++;if(!ensure()){if(k<30)setTimeout(t2,300);return;}if(v)showView(v);try{history.replaceState(null,'',location.pathname+location.search);}catch(e){}};setTimeout(t2,400);};
 setTimeout(tick,600);})();
W.LowiRoomsUI={paint,openSheet,closeSheet,setTab,back,from:()=>from,fit,showView,view:()=>view,frames:()=>Object.keys(frames),menu:toggleMenu,copyView,inviteUrl,_chanRows:chanRows};
})(window,document);
