/* Spirit square: a single, usable Community room with consent-based identity. */
(function(W,D){
'use strict';
if(W.LowiCommunity)return;
const K=W.LowiChatCore, H=W.LowiCommunityHost;if(!K||!H||!W.LowiCommunityCloud)return;
const esc=K.esc;
const deviceStorage={getItem:k=>localStorage.getItem(k),setItem:(k,v)=>localStorage.setItem(k,v)};
const COPY={
 square:['Spirit square','Geisterplatz','Plaza de espíritus'],
 kicker:['LOWiSPIKE · Community','LOWiSPIKE · Community','LOWiSPIKE · Comunidad'],
 welcome:['Small habits. Shared kindness.','Kleine Gewohnheiten. Gemeinsam freundlich.','Pequeños hábitos. Amabilidad compartida.'],
 shared:['One shared gathering place','Ein gemeinsamer Treffpunkt','Un punto de encuentro común'],
 sharedDetails:['Sharing enabled','Freigaben aktiv','Compartir activado'],
 sharedType:['Shared with the square','Mit dem Platz geteilt','Compartido con la plaza'],
 presence:['Your presence','Dein Auftritt','Tu presencia'],
 private:['Only you · private','Nur für dich · privat','Solo tú · privado'],
 style:['Your personality','Deine Persönlichkeit','Tu personalidad'],
 setstyle:['Personality is optional','Persönlichkeit ist freiwillig','La personalidad es opcional'],
 controls:['Privacy & quiet','Privat & ruhig','Privacidad y calma'],
 loading:['Loading the conversation…','Gespräch wird geladen…','Cargando la conversación…'],
 offline:['Offline · history may be out of date','Offline · Verlauf eventuell nicht aktuell','Sin conexión · el historial puede estar desactualizado'],
 signIn:['Sign in to join the conversation','Melde dich an, um mitzuschreiben','Inicia sesión para conversar'],
 error:['Could not load messages. Your draft is kept.','Nachrichten nicht geladen. Dein Entwurf bleibt.','No se pudieron cargar los mensajes. Tu borrador se conserva.'],
 connecting:['History loaded · connecting updates…','Verlauf geladen · Updates verbinden…','Historial cargado · conectando novedades…'],
 live:['Connected · shared conversation','Verbunden · gemeinsames Gespräch','Conectado · conversación compartida'],
 retry:['Try again','Erneut versuchen','Reintentar'],
 calm:['Quiet hours · updates stay silent','Ruhezeit · Updates bleiben still','Horas de silencio · sin avisos'],
 emptyTitle:['The square is quiet','Auf dem Platz ist es ruhig','La plaza está tranquila'],
 empty:['No messages here yet. Say hello, ask about a food swap, or share a small everyday win.','Hier gibt es noch keine Nachrichten. Sag hallo, frag nach einem Lebensmitteltausch oder teile einen kleinen Alltagserfolg.','Aún no hay mensajes. Saluda, pregunta por una alternativa de comida o comparte un pequeño logro cotidiano.'],
 waiting:['Your conversation will appear here once it loads.','Dein Gespräch erscheint hier, sobald es geladen ist.','La conversación aparecerá aquí al cargarse.'],
 filtered:['Messages from people you blocked are hidden.','Nachrichten blockierter Personen sind ausgeblendet.','Los mensajes de personas bloqueadas están ocultos.'],
 hi:['Say hello','Hallo sagen','Saludar'],
 hiText:['Hi everyone! Happy to be here.','Hallo zusammen! Schön, hier zu sein.','¡Hola a todos! Me alegra estar aquí.'],
 message:['Message the square','Nachricht an den Platz','Mensaje a la plaza'],
 send:['Send message','Nachricht senden','Enviar mensaje'],
 hint:['Everyone in this room can read what you send.','Alle in diesem Raum können deine Nachricht lesen.','Todos en esta sala pueden leer lo que envías.'],
 draft:['Draft kept on this device','Entwurf auf diesem Gerät gespeichert','Borrador guardado en este dispositivo'],
 volatile:['Device storage is unavailable. Keep this page open to retain your draft.','Gerätespeicher nicht verfügbar. Lass diese Seite offen, um deinen Entwurf zu behalten.','Almacenamiento no disponible. Mantén esta página abierta para conservar el borrador.'],
 reply:['Reply','Antworten','Responder'],
 replying:['Replying to','Antwort an','Respondiendo a'],
 cancel:['Cancel','Abbrechen','Cancelar'],
 gone:['Message unavailable','Nachricht nicht verfügbar','Mensaje no disponible'],
 react:['React with kindness','Freundlich reagieren','Reaccionar con amabilidad'],
 delete:['Delete','Löschen','Eliminar'],
 deleting:['Deleting…','Wird gelöscht…','Eliminando…'],
 confirmDelete:['Delete your message?','Deine Nachricht löschen?','¿Eliminar tu mensaje?'],
 deleteFailed:['Deletion was not confirmed. Try again.','Löschen wurde nicht bestätigt. Versuch es erneut.','No se confirmó la eliminación. Reintenta.'],
 sending:['Sending…','Wird gesendet…','Enviando…'],
 unconfirmed:['Delivery not confirmed · draft recoverable','Zustellung nicht bestätigt · Entwurf wiederherstellbar','Entrega sin confirmar · borrador recuperable'],
 checkRetry:['Check & retry','Prüfen & erneut senden','Comprobar y reintentar'],
 discard:['Dismiss draft','Entwurf verwerfen','Descartar borrador'],
 sendFailed:['Delivery not confirmed. Check & retry uses the same message ID.','Zustellung nicht bestätigt. Prüfen & erneut senden nutzt dieselbe Nachrichten-ID.','Entrega sin confirmar. Comprobar y reintentar usa el mismo ID de mensaje.'],
 reactFailed:['Reaction not confirmed. Please try again.','Reaktion nicht bestätigt. Bitte erneut versuchen.','Reacción sin confirmar. Vuelve a intentarlo.'],
 name:['Add your profile name before sending.','Ergänze vor dem Senden deinen Profilnamen.','Añade tu nombre de perfil antes de enviar.'],
 newMessages:['New messages','Neue Nachrichten','Mensajes nuevos'],
 profile:['Community profile','Community-Profil','Perfil de comunidad'],
 profileNote:['Only details explicitly shared for this square appear here.','Hier erscheinen nur ausdrücklich für diesen Platz geteilte Angaben.','Aquí solo aparecen datos compartidos expresamente para esta plaza.'],
 noDetails:['Personality and star sign are private.','Persönlichkeit und Sternzeichen sind privat.','La personalidad y el signo son privados.'],
 noRouting:['Personality adds a personal touch. Everyone stays in the same room.','Persönlichkeit macht es persönlicher. Alle bleiben im selben Raum.','La personalidad aporta un toque personal. Todos siguen en la misma sala.'],
 privacyNote:['Birthday, age, food logs, body details and macros are never included in this chat profile. No contacts are synced.','Geburtstag, Alter, Essensprotokoll, Körperdaten und Makros gehören nie zu diesem Chatprofil. Keine Kontakte werden synchronisiert.','Cumpleaños, edad, comidas, datos corporales y macros nunca se incluyen en este perfil de chat. No se sincronizan contactos.'],
 shareType:['Share my personality','Meine Persönlichkeit teilen','Compartir mi personalidad'],
 shareSign:['Share my star sign','Mein Sternzeichen teilen','Compartir mi signo'],
 publish:['Save sharing choices','Freigaben speichern','Guardar opciones de privacidad'],
 published:['Sharing choices saved.','Freigaben gespeichert.','Opciones guardadas.'],
 publishFailed:['Sharing update not confirmed. Reconnect and check your settings.','Freigabeänderung nicht bestätigt. Verbinde dich neu und prüfe die Einstellungen.','Cambio de privacidad sin confirmar. Reconecta y revisa los ajustes.'],
 extrasMissing:['Sharing and moderation sync are unavailable. Your profile details stay private here.','Freigaben und Moderationsabgleich sind nicht verfügbar. Deine Profildetails bleiben hier privat.','Compartir y sincronizar moderación no están disponibles. Tus datos de perfil siguen privados aquí.'],
 quiet:['Quiet hours','Ruhezeiten','Horas de silencio'],
 quietDesc:['Silence chat announcements and badges on this device. Messages still arrive. Times use this device’s clock.','Chat-Hinweise und Abzeichen auf diesem Gerät stummschalten. Nachrichten kommen weiterhin an. Zeiten gelten nach der Geräteuhr.','Silencia avisos e indicadores del chat en este dispositivo. Los mensajes siguen llegando. Horas según este dispositivo.'],
 from:['From (hour)','Ab (Stunde)','Desde (hora)'],
 until:['Until (hour)','Bis (Stunde)','Hasta (hora)'],
 saveQuiet:['Save quiet hours','Ruhezeiten speichern','Guardar horas de silencio'],
 saved:['Saved on this device.','Auf diesem Gerät gespeichert.','Guardado en este dispositivo.'],
 blocked:['Blocked people','Blockierte Personen','Personas bloqueadas'],
 noBlocked:['Nobody blocked.','Niemand blockiert.','Nadie bloqueado.'],
 unblock:['Unblock','Entsperren','Desbloquear'],
 block:['Block person','Person blockieren','Bloquear persona'],
 blockNote:['Hide this person’s messages, replies and mentions for your account on this device.','Nachrichten, Antworten und Erwähnungen dieser Person für dein Konto auf diesem Gerät ausblenden.','Oculta los mensajes, respuestas y menciones de esta persona para tu cuenta en este dispositivo.'],
 blockLocal:['Block settings saved on this device · account sync unavailable','Blockiereinstellungen auf diesem Gerät gespeichert · Kontoabgleich nicht verfügbar','Ajustes de bloqueo guardados en este dispositivo · sin sincronización de cuenta'],
 blockSynced:['Block settings saved to your account.','Blockiereinstellungen im Konto gespeichert.','Ajustes de bloqueo guardados en tu cuenta.'],
 blockStorage:['Block could not be saved on this device. Account sync will be attempted.','Blockierung konnte nicht auf diesem Gerät gespeichert werden. Kontoabgleich wird versucht.','No se pudo guardar el bloqueo en este dispositivo. Se intentará sincronizar con la cuenta.'],
 report:['Report message','Nachricht melden','Denunciar mensaje'],
 reportDesc:['Choose a reason. This sends the message ID and reason for review.','Wähle einen Grund. Nachrichten-ID und Grund werden zur Prüfung gesendet.','Elige un motivo. Se envían el ID del mensaje y el motivo para revisión.'],
 harassment:['Unkind or harassing','Unfreundlich oder belästigend','Acoso o trato ofensivo'],
 spam:['Spam','Spam','Spam'],
 privacy:['Personal information','Persönliche Informationen','Información personal'],
 unsafe:['Unsafe health advice','Unsicherer Gesundheitsrat','Consejos de salud peligrosos'],
 sendReport:['Send report','Meldung senden','Enviar denuncia'],
 reportSent:['Report received by the server for review.','Meldung vom Server zur Prüfung empfangen.','Denuncia recibida por el servidor para revisión.'],
 reportFailed:['Report delivery not confirmed. Try again or block this person.','Zustellung der Meldung nicht bestätigt. Versuch es erneut oder blockiere die Person.','Entrega de denuncia sin confirmar. Reintenta o bloquea a esta persona.'],
 close:['Close','Schließen','Cerrar'],
 optional:['Not set','Nicht festgelegt','Sin definir']
};
function lang(){try{return ['en','de','es'].indexOf((W.LowiLang&&W.LowiLang.get())||localStorage.getItem('lowispike.lang')||'en');}catch(e){return 0;}}
const tr=k=>(COPY[k]||[k])[Math.max(0,lang())]||COPY[k][0];
const button=(action,label,attrs='',cls='cs-action')=>'<button type="button" class="'+cls+'" data-sfx="none" data-chat="'+action+'" '+attrs+'>'+label+'</button>';
let cacheJSON='',restHeight=0,restWidth=0;
let scope=null,store=null,prefs={},identities=new Map(),cache=[],extrasAttempt='',extrasFlight=null,pick='',notice='',raf=0,lastCount=0,newCount=0,armed='',armTimer=0;
const transport=W.LowiCommunityCloud.create(H,()=>refresh());
const blockJobs=new Map();
const prefsKey=()=> 'lowi.community.prefs.v1:'+scope;
const cacheKey=()=> 'lowi.community.cache.v1:'+scope;
const draftState=()=>store?store.state():{draft:{text:'',reply:null},outbox:[],storageOK:true,busy:false};
const own=()=>H.identity();
function persist(){return K.write(deviceStorage,prefsKey(),prefs);}
function blocked(id){return !!(prefs.blocks&&prefs.blocks[id]&&prefs.blocks[id].blocked);}
function isQuiet(){return K.quiet(prefs);}
function unread(){return isQuiet()?0:messages().filter(m=>m.uid!==scope&&!m.status&&m.ts>(prefs.readAt||0)).length;}
function active(){return H.active();}
function ensureScope(){const id=H.state().uid||'';if(id===scope&&(store||!id))return;
 scope=id;transport.reset();identities=new Map();cache=[];cacheJSON='';extrasAttempt='';extrasFlight=null;notice='';pick='';lastCount=0;newCount=0;
 prefs=scope?K.read(deviceStorage,prefsKey(),{}):{};prefs.blocks=prefs.blocks||{};
 store=scope?K.session({scope,storage:deviceStorage,id:()=> 'm'+crypto.randomUUID(),send:transport.send,changed:()=>refresh()}):null;
 if(scope){const c=K.read(deviceStorage,cacheKey(),{});cache=Array.isArray(c.messages)?c.messages.map(K.message).filter(m=>m&&!m.demo&&!m.bot):[];transport.reload();}
}
function messages(){const live=transport.state().phase==='ready'||H.messages().length?H.messages():cache;return K.visible(live,draftState().outbox,prefs.blocks||{},scope);}
function profile(id,name){const m=own(),base=id===scope?m:H.people().find(p=>p.uid===id)||{};const shared=K.identity(identities.get(id));return {uid:id,n:name||base.n||'Member',avatar:K.image(base.avatar),s:shared.s,t:shared.t,lv:base.lv||1,xp:base.xp||0};}
function bubble(p,size=34){return H.bubble({...p,bday:'',w:'',streak:0},size);}
function text(t){return esc(t).replace(/@([\p{L}\p{N}_-]+)/gu,'<span class="cm-at">@$1</span>');}
function time(ts){try{return new Date(ts).toLocaleTimeString(['en','de','es'][Math.max(0,lang())],{hour:'2-digit',minute:'2-digit'});}catch(e){return '';}}
function renderMessage(m,all){
 if(m.demo||m.bot||blocked(m.uid))return '';
 const mine=m.uid===scope,p=profile(m.uid,m.by),re=m.re&&all.find(x=>x.id===m.re),pending=!!m.status;
 const color=H.color?H.color(p.s):'#9fd8ff';
 const rx=H.reactions().filter(x=>x.message_id===m.id&&!blocked(x.user_id));
 const quote=m.re?'<div class="cm-quote">'+(re?'<b>'+esc(re.by)+'</b> '+esc(re.t.slice(0,90)):tr('gone'))+'</div>':'';
 const reacts=K.EMOJI.map(em=>{const rows=rx.filter(x=>x.emoji===em);return rows.length?button('react',esc(em)+' '+rows.length,'data-id="'+esc(m.id)+'" data-emoji="'+esc(em)+'" aria-pressed="'+rows.some(x=>x.user_id===scope)+'"'+(transport.reactionBusy(m.id,em)?' disabled':''),'cm-chip'+(rows.some(x=>x.user_id===scope)?' on':'')):'';}).join('');
 return '<article class="cm-msg'+(mine?' mine':'')+'" id="cm-'+esc(m.id)+'" data-who="'+esc(m.by)+'" data-chat-id="'+esc(m.id)+'" style="--chat-color:'+esc(color)+'">'+button('profile',bubble(p),'data-uid="'+esc(m.uid)+'" data-name="'+esc(m.by)+'" aria-label="'+esc(m.by)+' · '+tr('profile')+'"','cs-avatar r3m-av')+
 '<div class="cm-bub"><div class="cs-by">'+button('profile',esc(m.by),'data-uid="'+esc(m.uid)+'" data-name="'+esc(m.by)+'"','cs-name')+(p.t?'<span class="cs-type">'+esc(p.t)+'</span>':'')+'<time datetime="'+new Date(m.ts).toISOString()+'">'+esc(time(m.ts))+'</time></div>'+quote+'<div class="cm-t">'+text(m.t)+'</div>'+
 (pending?'<div class="cs-delivery" role="status">'+tr(m.status==='sending'?'sending':'unconfirmed')+(m.status==='sending'?'':button('retry-send',tr('checkRetry'),'data-id="'+esc(m.id)+'"','')+button('discard',tr('discard'),'data-id="'+esc(m.id)+'"',''))+'</div>':'<div class="cm-rx">'+reacts+button('pick','＋','data-id="'+esc(m.id)+'" aria-label="'+tr('react')+'" aria-expanded="'+(pick===m.id)+'"','cm-mini')+button('reply',tr('reply'),'data-id="'+esc(m.id)+'"','cm-mini')+(mine?button('delete',tr(armed===m.id?'confirmDelete':'delete'),'data-id="'+esc(m.id)+'"','cm-mini'):button('report',tr('report'),'data-id="'+esc(m.id)+'"','cm-mini'))+'</div>')+
 (!pending&&pick===m.id?'<div class="cm-picker" aria-label="'+tr('react')+'">'+K.EMOJI.map(em=>button('react',esc(em),'data-id="'+esc(m.id)+'" data-emoji="'+esc(em)+'" aria-label="'+tr('react')+' '+esc(em)+'"','')).join('')+'</div>':'')+'</div></article>';
}
const town='<svg class="cs-town" viewBox="0 0 240 140" fill="none" aria-hidden="true"><ellipse cx="135" cy="129" rx="105" ry="28" fill="currentColor" opacity=".07"/><path d="M34 134Q115 100 225 134M90 138Q108 117 137 111" stroke="currentColor" opacity=".4"/><ellipse cx="137" cy="110" rx="26" ry="8" stroke="currentColor"/><path d="M137 106V78M125 84h24l-4 17h-16z" stroke="currentColor"/><circle cx="137" cy="91" r="4" fill="currentColor" opacity=".65"/><path d="M52 124V73l21-16 21 16v42M47 74l26-22 26 22M64 120V98h15v20M178 116V66l18-13 19 13v59M173 67l23-20 24 20M187 83h15v19h-15z" stroke="currentColor" opacity=".5"/><path d="M24 121V65m0 17Q0 55 24 47q27 8 0 35M222 126V83m0 10q-20-17 0-27 23 12 0 27M65 21l35 13 40-18 39 16" stroke="currentColor" opacity=".25"/><g fill="currentColor"><circle cx="65" cy="21" r="2"/><circle cx="100" cy="34" r="2"/><circle cx="140" cy="16" r="2"/><circle cx="179" cy="32" r="2"/></g></svg>';
function mount(el){if(!el)return;ensureScope();if(!el.hasAttribute('data-spirit-chat')){
 el.setAttribute('data-spirit-chat','');el.setAttribute('data-noi18n','');
 el.innerHTML='<header class="cs-world">'+town+'<div class="cs-kicker"></div><h2></h2><p></p><span class="cs-place"><i></i><span></span></span></header><div class="cs-tools"><div id="csSelf"></div><div id="csControls"></div></div><div class="cs-status" id="csStatus" role="status"></div><div class="cm-list" id="cmList" role="log" aria-live="off" tabindex="0"></div><div id="csJump"></div><div class="cm-compose"><div id="csReply"></div><div class="cm-mention" id="cmMention"></div><div class="cm-inrow"><textarea id="cmInput" rows="1" maxlength="600" enterkeyhint="send"></textarea><button type="button" id="cmSend" data-chat="send" data-sfx="none">↑</button></div><div class="cs-compose-meta"><span id="csDraft"></span><span id="csCount"></span></div><p class="cs-notice" id="csNotice" role="status"></p></div><span id="csAnnounce" class="sr-only" aria-live="polite"></span>';
 el.querySelector('#cmList').addEventListener('scroll',()=>{if(nearBottom()){newCount=0;const j=D.getElementById('csJump');if(j)j.innerHTML='';}},{passive:true});
 }
 paint(el);}
function nearBottom(){const l=D.getElementById('cmList');return !l||l.scrollHeight-l.scrollTop-l.clientHeight<90;}
function paint(el){
 if(!el||!el.hasAttribute('data-spirit-chat'))return;
 const q=s=>el.querySelector(s),ms=messages(),ds=draftState(),m=own(),st=transport.state(),list=q('#cmList'),near=nearBottom(),y=list.scrollTop,focus=D.activeElement;
 const focusKey=focus&&focus.closest&&focus.closest('[data-chat]'),fk=focusKey&&{a:focusKey.dataset.chat,id:focusKey.dataset.id,uid:focusKey.dataset.uid,em:focusKey.dataset.emoji};
 q('.cs-kicker').textContent=tr('kicker');q('.cs-world h2').textContent=tr('square');q('.cs-world p').textContent=tr('welcome');q('.cs-place span').textContent=tr('shared');
 const typ=K.type(m.t),typeName=H.typeLabel?H.typeLabel(typ,['en','de','es'][Math.max(0,lang())]):'',pub=K.identity(identities.get(scope));
 q('#csSelf').innerHTML=button('settings',bubble({...profile(scope,m.n),s:m.s},30)+'<span><b>'+esc(typ?(typ+(typeName?' · '+typeName:'')):tr('presence'))+'</b><small>'+tr(pub.t||pub.s?'sharedDetails':'private')+'</small></span>','','cs-self');
 el.dataset.personality=typ;
 q('#csControls').innerHTML=button('settings',tr(isQuiet()?'quiet':'controls'),'','cs-tool');
 let state='live',status=tr('live');if(navigator.onLine===false){state='offline';status=tr('offline');}else if(!scope){state='auth';status=tr('signIn');}else if(st.phase==='loading'||st.phase==='idle'){state='loading';status=tr('loading');}else if(st.phase==='error'){state='error';status=tr('error');}else if(st.realtime!=='SUBSCRIBED'){state='connecting';status=tr('connecting');}else if(isQuiet()){status=tr('calm');}
 if(active()&&near&&ms.length){const newest=ms[ms.length-1].ts;if(newest>(prefs.readAt||0)){prefs.readAt=newest;persist();}}
 const tab=D.querySelector('#cmSeg [data-v="chat"]');if(tab){const count=unread();let dot=tab.querySelector('.cm-dot');if(!count&&dot)dot.remove();else if(count){if(!dot){dot=D.createElement('span');dot.className='cm-dot';tab.appendChild(dot);}dot.textContent=count;}}
 q('#csStatus').setAttribute('aria-live',isQuiet()?'off':'polite');
 q('#csStatus').dataset.state=state;q('#csStatus').innerHTML='<i aria-hidden="true"></i><span>'+esc(status)+'</span>'+(['error','offline','connecting'].includes(state)?button('reload',tr('retry'),'',''):'');
 const empty=st.phase==='ready'?(Object.values(prefs.blocks).some(x=>x.blocked)?tr('filtered'):tr('empty')):tr('waiting');
 const html=ms.length?ms.map(m=>renderMessage(m,ms)).join(''):'<div class="cs-empty"><span class="cs-lantern" aria-hidden="true">✧</span><b>'+tr('emptyTitle')+'</b><p>'+empty+'</p>'+(st.phase==='ready'?button('hello',tr('hi')):'')+'</div>';
 if(list.__html!==html){list.innerHTML=html;list.__html=html;if(near)list.scrollTop=list.scrollHeight;else list.scrollTop=y;if(fk){const b=[...list.querySelectorAll('[data-chat]')].find(b=>b.dataset.chat===fk.a&&b.dataset.id===fk.id&&b.dataset.uid===fk.uid&&b.dataset.emoji===fk.em);if(b)b.focus({preventScroll:true});}}
 if(ms.length>lastCount&&!near){newCount+=ms.length-lastCount;if(!isQuiet())q('#csAnnounce').textContent=tr('newMessages');}lastCount=ms.length;
 q('#csJump').innerHTML=newCount&&!near?button('latest',tr('newMessages'),'','cs-jump'):'';
 const parent=ms.find(x=>x.id===ds.draft.reply);q('#csReply').innerHTML=ds.draft.reply?'<div class="cm-replybar"><span>'+tr('replying')+' <b>'+esc(parent?parent.by:tr('gone'))+'</b></span>'+button('noreply','×','aria-label="'+tr('cancel')+'"','')+'</div>':'';
 const inp=q('#cmInput');if(inp.value!==ds.draft.text)inp.value=ds.draft.text;inp.placeholder=tr('message');inp.setAttribute('aria-label',tr('message'));inp.setAttribute('aria-describedby','csDraft csNotice');
 q('#cmSend').setAttribute('aria-label',tr('send'));q('#cmSend').disabled=!scope||!inp.value.trim()||ds.busy||navigator.onLine===false;
 q('#csDraft').textContent=ds.storageOK?(ds.draft.text?tr('draft'):tr('hint')):tr('volatile');q('#csCount').textContent=inp.value.length+'/600';q('#csNotice').textContent=notice;
 q('#cmList').setAttribute('aria-label',tr('square'));q('#csAnnounce').setAttribute('aria-live',isQuiet()?'off':'polite');mentions();fit();
}
function refresh(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;ensureScope();if(store){store.confirm(H.messages());if(transport.state().phase==='ready'){cache=H.messages().map(({id,uid,by,t,ts,re})=>({id,uid,by,t,ts,re,rx:{}}));const json=JSON.stringify(cache);if(json!==cacheJSON){cacheJSON=json;K.write(deviceStorage,cacheKey(),{messages:cache});}}}const el=D.getElementById('cmPaneChat');if(el)mount(el);loadExtras();});}
function mentions(){const inp=D.getElementById('cmInput'),box=D.getElementById('cmMention');if(!inp||!box)return;const match=inp.value.match(/@([\p{L}\p{N}_-]*)$/u);const people=new Map();for(const msg of messages()){if(msg.uid!==scope&&!blocked(msg.uid))people.set(msg.uid,{uid:msg.uid,n:msg.by});}box.innerHTML=match?[...people.values()].filter(p=>p.n.toLocaleLowerCase().startsWith(match[1].toLocaleLowerCase())).slice(0,4).map(p=>button('mention','@'+esc(p.n),'data-name="'+esc(p.n)+'"')).join(''):'';}
function draft(text,reply){if(store)store.setDraft(text,reply);}
function comment(who){draft(who?'@'+who+' ':'',null);refresh();focusInput();}
function focusInput(){const i=D.getElementById('cmInput');if(i)i.focus({preventScroll:true});}
async function send(retryId){if(!store||navigator.onLine===false){notice=tr('offline');refresh();return;}const m=own(),name=String(m.n||'').trim();if(!name){notice=tr('name');refresh();return;}notice='';try{await store.submit(name,retryId);}catch(e){notice=tr('sendFailed');}refresh();}
function resultText(el,t){if(el)el.textContent=t;}
function sheet(html){return H.sheet('<div class="cs-sheet" data-noi18n data-sfx="none">'+html+'</div>');}
function settings(){const m=own(),shared=K.identity(identities.get(scope)),row=identities.get(scope)||{};sheet('<h2>'+tr('presence')+'</h2><p>'+tr('noRouting')+'</p><p>'+tr('style')+': <b>'+esc(K.type(m.t)||tr('optional'))+'</b> · '+tr(shared.t&&shared.t===K.type(m.t)?'sharedType':'private')+'</p><p>'+tr('privacyNote')+'</p><form data-chat-form="sharing"><label>'+tr('shareType')+' <input type="checkbox" name="type" '+(row.share_personality?'checked':'')+(!K.type(m.t)?' disabled':'')+'></label><label>'+tr('shareSign')+' <input type="checkbox" name="sign" '+(row.share_sign?'checked':'')+(!K.SIGNS.includes(m.s)?' disabled':'')+'></label><button class="cs-submit" data-sfx="none">'+tr('publish')+'</button><div class="cs-result" role="status"></div></form><h2 style="margin-top:24px">'+tr('quiet')+'</h2><p>'+tr('quietDesc')+'</p><form data-chat-form="quiet"><label>'+tr('quiet')+'<input type="checkbox" name="enabled" '+(prefs.quietEnabled!==false?'checked':'')+'></label><div class="cs-hours"><label>'+tr('from')+' <input aria-label="'+tr('from')+'" type="number" name="start" min="0" max="23" value="'+(prefs.quietStart??22)+'" required></label><label>'+tr('until')+' <input aria-label="'+tr('until')+'" type="number" name="end" min="0" max="23" value="'+(prefs.quietEnd??8)+'" required></label></div><button class="cs-submit" data-sfx="none">'+tr('saveQuiet')+'</button><div class="cs-result" role="status"></div></form><h2 style="margin-top:24px">'+tr('blocked')+'</h2><div id="csBlockedList">'+blockList()+'</div><p class="cs-result" id="csBlockResult" role="status"></p>'+(extrasAttempt==='failed'?'<p>'+tr('extrasMissing')+'</p>':''));}
function blockList(){const ids=Object.keys(prefs.blocks).filter(id=>prefs.blocks[id].blocked);return ids.length?ids.map(id=>'<div class="cs-blockrow"><span>'+esc(prefs.blocks[id].name||'Member')+'</span>'+button('unblock',tr('unblock'),'data-uid="'+esc(id)+'"')+'</div>').join(''):'<p>'+tr('noBlocked')+'</p>';}
function openProfile(id,name){const p=profile(id,name);sheet('<h2>'+tr('profile')+'</h2><div class="cs-pub">'+bubble(p,64)+'<div><b>'+esc(p.n)+'</b><br>'+esc([p.t,p.s].filter(Boolean).join(' · ')||tr('noDetails'))+'</div></div><p>'+tr('profileNote')+'</p>'+(id!==scope?'<p>'+tr('blockNote')+'</p>'+button('block',tr('block'),'data-uid="'+esc(id)+'" data-name="'+esc(p.n)+'"')+'<p class="cs-result" id="csBlockResult" role="status"></p>':button('settings',tr('controls'))));}
function openReport(mid){const m=messages().find(x=>x.id===mid);if(!m||m.uid===scope)return;sheet('<h2>'+tr('report')+'</h2><p>'+tr('reportDesc')+'</p><form data-chat-form="report" data-mid="'+esc(mid)+'"><select name="reason" aria-label="'+tr('report')+'">'+['harassment','spam','privacy','unsafe'].map(v=>'<option value="'+v+'">'+tr(v)+'</option>').join('')+'</select><button class="cs-submit" data-sfx="none">'+tr('sendReport')+'</button><p class="cs-result" role="status"></p></form>'+button('block',tr('block'),'data-uid="'+esc(m.uid)+'" data-name="'+esc(m.by)+'"')+'<p class="cs-result" id="csBlockResult" role="status"></p>');}
async function writeBlock(id){const actor=scope,entry=prefs.blocks[id];if(!entry||!entry.dirty)return true;try{if(entry.blocked){const ack=await transport.table('community_blocks',(t,u)=>t.upsert({user_id:u,blocked_user_id:id},{onConflict:'user_id,blocked_user_id'}).select('blocked_user_id'));if(!ack||!ack.some(r=>r.blocked_user_id===id))throw new Error('ack');}else await transport.table('community_blocks',(t,u)=>t.delete().eq('user_id',u).eq('blocked_user_id',id));if(actor!==scope)return false;if(prefs.blocks[id]===entry){entry.dirty=false;persist();}return true;}catch(e){return false;}}
function syncBlock(id){const key=scope+':'+id,prior=blockJobs.get(key);if(prior)return prior.then(()=>syncBlock(id));const job=writeBlock(id);blockJobs.set(key,job);return job.finally(()=>{if(blockJobs.get(key)===job)blockJobs.delete(key);});}

async function blockPerson(id,name,on){if(!scope||!id||id===scope)return;const actor=scope;prefs.blocks[id]={blocked:on,name:name||prefs.blocks[id]?.name||'Member',dirty:true};const saved=persist();pick='';if(draftState().draft.reply&& !messages().some(m=>m.id===draftState().draft.reply))draft(draftState().draft.text,null);refresh();resultText(D.getElementById('csBlockResult'),saved?tr('blockLocal'):tr('blockStorage'));const ok=await syncBlock(id);if(actor!==scope)return;resultText(D.getElementById('csBlockResult'),ok?tr('blockSynced'):tr('blockLocal'));const b=D.getElementById('csBlockedList');if(b)b.innerHTML=blockList();}
async function loadExtras(force){
 if(!scope||extrasFlight||navigator.onLine===false)return;const ids=[...new Set([scope,...H.messages().map(m=>m.uid)])].filter(Boolean).sort(),signature=ids.join(',');if(!force&&extrasAttempt===signature||!force&&extrasAttempt==='failed')return;extrasAttempt=signature;const actor=scope;
 const task=(async()=>{const results=await Promise.allSettled([transport.table('community_identities',t=>t.select('user_id,share_personality,personality,share_sign,sign').in('user_id',ids)),transport.table('community_blocks',(t,u)=>t.select('blocked_user_id').eq('user_id',u))]);if(scope!==actor)return;
 if(results[0].status==='fulfilled'){identities=new Map((results[0].value||[]).map(r=>[r.user_id,r]));}else{identities=new Map();extrasAttempt='failed';}
 if(results[1].status==='fulfilled'){const previous=prefs.blocks,next={};for(const r of results[1].value||[])next[r.blocked_user_id]={blocked:true,name:previous[r.blocked_user_id]?.name||'Member',dirty:false};for(const [id,p]of Object.entries(previous)){if(p.dirty)next[id]=p;}prefs.blocks=next;persist();for(const id of Object.keys(next))if(next[id].dirty)await syncBlock(id);}else extrasAttempt='failed';refresh();})();extrasFlight=task;try{await task;}finally{if(scope===actor)extrasFlight=null;}
}
async function submitForm(form){const result=form.querySelector('.cs-result'),btn=form.querySelector('button'),actor=scope;btn.disabled=true;
 try{if(form.dataset.chatForm==='quiet'){prefs.quietEnabled=form.elements.enabled.checked;prefs.quietStart=+form.elements.start.value;prefs.quietEnd=+form.elements.end.value;resultText(result,persist()?tr('saved'):tr('volatile'));refresh();}
 else if(form.dataset.chatForm==='sharing'){const m=own(),row={share_personality:form.elements.type.checked,personality:form.elements.type.checked?K.type(m.t):'',share_sign:form.elements.sign.checked,sign:form.elements.sign.checked?m.s:''};const data=await transport.table('community_identities',(t,u)=>t.upsert({...row,user_id:u}).select('user_id,share_personality,personality,share_sign,sign').single());if(actor!==scope)return;if(!data||data.user_id!==scope)throw new Error('ack');identities.set(scope,data);resultText(result,tr('published'));refresh();}
 else if(form.dataset.chatForm==='report'){const mid=form.dataset.mid;if(!messages().some(m=>m.id===mid&&m.uid!==scope))throw new Error('message');const rows=await transport.table('community_reports',(t,u)=>t.insert({reporter_id:u,message_id:mid,reason:form.elements.reason.value}).select('id'));if(!rows||!rows[0]?.id)throw new Error('ack');resultText(result,tr('reportSent'));form.dataset.sent='1';}
 }catch(e){resultText(result,tr(form.dataset.chatForm==='sharing'?'publishFailed':'reportFailed'));}finally{if(form.dataset.sent!=='1')btn.disabled=false;}}
function fit(){
 const pane=D.getElementById('cmPaneChat'),inp=D.getElementById('cmInput'),v=W.visualViewport;
 const focus=!!(pane&&inp&&D.activeElement===inp&&active()),height=v?v.height:W.innerHeight,width=W.innerWidth;
 if(!restHeight||Math.abs(width-restWidth)>100){restHeight=Math.max(W.innerHeight,height);restWidth=width;}
 if(!focus&&!D.documentElement.classList.contains('cs-chat-typing'))restHeight=Math.max(restHeight,height);
 const typing=!!(pane&&active()&&restHeight-height>100);
 D.documentElement.classList.toggle('cs-chat-typing',typing);
 if(!typing)return;
 const rect=pane.getBoundingClientRect(),nav=D.getElementById('tabbar');let bottom=v?v.offsetTop+v.height:W.innerHeight;
 if(nav){const n=nav.getBoundingClientRect();if(n.height>20&&n.top>rect.top+100&&n.top<bottom)bottom=n.top-32;}
 pane.style.setProperty('--cs-keyboard-height',Math.max(0,bottom-rect.top-8)+'px');
}
D.addEventListener('input',e=>{if(e.target.id!=='cmInput')return;draft(e.target.value,draftState().draft.reply);mentions();});
D.addEventListener('keydown',e=>{if(e.target.id==='cmInput'&&e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();send();}});
D.addEventListener('submit',e=>{const f=e.target;if(!f.matches('form[data-chat-form]'))return;e.preventDefault();e.stopPropagation();if(f.dataset.sent!=='1')submitForm(f);});
D.addEventListener('click',async e=>{const b=e.target.closest&&e.target.closest('[data-chat]');if(!b)return;e.preventDefault();e.stopPropagation();const a=b.dataset.chat,id=b.dataset.id;
 if(a==='send')send();else if(a==='reload'){transport.reload();loadExtras(true);}else if(a==='settings')settings();else if(a==='profile')openProfile(b.dataset.uid,b.dataset.name);else if(a==='hello'){draft(tr('hiText'),null);refresh();focusInput();}else if(a==='pick'){pick=pick===id?'':id;refresh();}else if(a==='reply'){draft(draftState().draft.text,id);refresh();focusInput();}else if(a==='noreply'){draft(draftState().draft.text,null);refresh();focusInput();}else if(a==='mention'){draft((D.getElementById('cmInput').value||'').replace(/@[\p{L}\p{N}_-]*$/u,'@'+b.dataset.name+' '),draftState().draft.reply);refresh();focusInput();}else if(a==='latest'){const l=D.getElementById('cmList');l.scrollTop=l.scrollHeight;newCount=0;refresh();}else if(a==='retry-send')send(id);else if(a==='discard'){store.discard(id);refresh();}else if(a==='react'){pick='';try{await transport.react(id,b.dataset.emoji,own().n);}catch(x){notice=tr('reactFailed');}refresh();}else if(a==='report')openReport(id);else if(a==='block')blockPerson(b.dataset.uid,b.dataset.name,true);else if(a==='unblock')blockPerson(b.dataset.uid,'',false);else if(a==='delete'){
  if(armed!==id){armed=id;clearTimeout(armTimer);armTimer=setTimeout(()=>{armed='';refresh();},3500);refresh();return;}armed='';b.disabled=true;b.textContent=tr('deleting');try{await transport.remove(id);}catch(x){notice=tr('deleteFailed');}refresh();}
});
D.addEventListener('focusin',fit);D.addEventListener('focusout',()=>requestAnimationFrame(fit));W.addEventListener('resize',fit);if(W.visualViewport){W.visualViewport.addEventListener('resize',fit);W.visualViewport.addEventListener('scroll',fit);}
D.addEventListener('lowi:chat',e=>{ensureScope();transport.notify(e.detail);if(e.detail&&['ready','reconnect'].includes(e.detail.type)){transport.reload();loadExtras(true);}refresh();});
W.addEventListener('online',()=>{ensureScope();transport.reload();loadExtras(true);});W.addEventListener('offline',refresh);W.addEventListener('storage',e=>{if(e.key===prefsKey()){prefs=K.read(deviceStorage,prefsKey(),{});prefs.blocks=prefs.blocks||{};refresh();}});
D.addEventListener('visibilitychange',()=>{if(!D.hidden){transport.reload();loadExtras(true);refresh();}});
W.LowiCommunity={mount,refresh,send,comment,isQuiet,unread,messageHTML:renderMessage,mentions,fit};H.install(W.LowiCommunity);ensureScope();refresh();setInterval(()=>{if(active()){refresh();loadExtras(true);}},60000);
})(window,document);
