/* Community planet: one shared room. Members appear as their companion on a planet; messages are speech bubbles from that companion. Consent-based identity. */
(function(W,D){
'use strict';
if(W.LowiCommunity)return;
const K=W.LowiChatCore, H=W.LowiCommunityHost;if(!K||!H||!W.LowiCommunityCloud)return;
const esc=K.esc;
const deviceStorage={getItem:k=>localStorage.getItem(k),setItem:(k,v)=>localStorage.setItem(k,v)};
const COPY={
 square:['Community planet','Community-Planet','Planeta de la comunidad'],
 welcome:['Everyone is here as their companion. Write, and yours speaks.','Alle sind hier als ihr Begleiter. Schreib, und deiner spricht.','Aquí todos son su compañero. Escribe y el tuyo habla.'],
 onPlanet:['On the planet','Auf dem Planeten','En el planeta'],
 you:['You','Du','Tú'],
 more:['Message options','Nachrichtenoptionen','Opciones del mensaje'],
 says:['says','sagt','dice'],
 mateShare:['Show my companion’s form on the planet','Meinen Begleiter auf dem Planeten zeigen','Mostrar la forma de mi compañero en el planeta'],
 mateNote:['Others see your companion only when this is on (it also shows in friends trees). Otherwise they see a plain spirit. Only the look is shared.','Andere sehen deinen Begleiter nur, wenn das an ist (auch im Freundesbaum). Sonst sehen sie einen schlichten Geist. Geteilt wird nur das Aussehen.','Los demás solo ven a tu compañero si esto está activado (también en el árbol de amigos). Si no, ven un espíritu sencillo. Solo se comparte el aspecto.'],
 mateSaved:['Saved.','Gespeichert.','Guardado.'],
 sharedDetails:['Sharing enabled','Freigaben aktiv','Compartir activado'],
 sharedType:['Shared on the planet','Auf dem Planeten geteilt','Compartido en el planeta'],
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
 emptyTitle:['The planet is quiet','Auf dem Planeten ist es ruhig','El planeta está tranquilo'],
 empty:['No messages yet. Say hello and your companion speaks first.','Noch keine Nachrichten. Sag hallo, dann spricht dein Begleiter zuerst.','Aún no hay mensajes. Saluda y tu compañero hablará primero.'],
 waiting:['The conversation appears here once it loads.','Das Gespräch erscheint hier, sobald es geladen ist.','La conversación aparecerá aquí al cargarse.'],
 filtered:['Messages from people you blocked are hidden.','Nachrichten blockierter Personen sind ausgeblendet.','Los mensajes de personas bloqueadas están ocultos.'],
 hi:['Say hello','Hallo sagen','Saludar'],
 hiText:['Hi everyone! Happy to be here.','Hallo zusammen! Schön, hier zu sein.','¡Hola a todos! Me alegra estar aquí.'],
 message:['Message the planet','Nachricht an den Planeten','Mensaje al planeta'],
 send:['Send message','Nachricht senden','Enviar mensaje'],
 hint:['Everyone on the planet can read what you send.','Alle auf dem Planeten können deine Nachricht lesen.','Todos en el planeta pueden leer lo que envías.'],
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
 profileNote:['Only details explicitly shared for this planet appear here.','Hier erscheinen nur ausdrücklich für diesen Planeten geteilte Angaben.','Aquí solo aparecen datos compartidos expresamente para este planeta.'],
 noDetails:['Personality and star sign are private.','Persönlichkeit und Sternzeichen sind privat.','La personalidad y el signo son privados.'],
 noRouting:['Your personality type stays private. If you share it below, it only appears on your profile card, never in the chat itself.','Dein Persönlichkeitstyp bleibt privat. Teilst du ihn unten, erscheint er nur auf deiner Profilkarte, nie im Chat selbst.','Tu tipo de personalidad es privado. Si lo compartes abajo, solo aparece en tu tarjeta de perfil, nunca en el chat.'],
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
 save:['Save','Speichern','Guardar'],
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
let looks=new Map(),openId='',speak='',speakTimer=0,lastNewest='',mateTries=0;
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
 scope=id;transport.reset();identities=new Map();looks=new Map();openId='';speak='';lastNewest='';cache=[];cacheJSON='';extrasAttempt='';extrasFlight=null;notice='';pick='';lastCount=0;newCount=0;
 prefs=scope?K.read(deviceStorage,prefsKey(),{}):{};prefs.blocks=prefs.blocks||{};
 store=scope?K.session({scope,storage:deviceStorage,id:()=> 'm'+crypto.randomUUID(),send:transport.send,changed:()=>refresh()}):null;
 if(scope){const c=K.read(deviceStorage,cacheKey(),{});cache=Array.isArray(c.messages)?c.messages.map(K.message).filter(m=>m&&!m.demo&&!m.bot):[];transport.reload();}
}
function messages(){const live=transport.state().phase==='ready'||H.messages().length?H.messages():cache;return K.visible(live,draftState().outbox,prefs.blocks||{},scope);}
function profile(id,name){const m=own(),base=id===scope?m:H.people().find(p=>p.uid===id)||{};const shared=K.identity(identities.get(id));return {uid:id,n:name||base.n||'Member',avatar:K.image(base.avatar),s:shared.s,t:shared.t,lv:base.lv||1,xp:base.xp||0};}
function bubble(p,size=34){return H.bubble({...p,bday:'',w:'',streak:0},size);}
/* Companions: a member's herb form, drawn from the visual-only look code they chose to share (profiles.look).
   No shared look -> a plain spirit. Your own form is drawn locally for you only. Never a profile photo. */
function hue(id){let h=7;for(const c of String(id||''))h=(h*31+c.charCodeAt(0))>>>0;return h%360;}
function sid(v){return String(v||'').replace(/[^a-z0-9]/gi,'').slice(-12)||'x';}
function genomeFor(id){const C=W.LowiCompanionCore;if(!C)return null;if(id&&id===scope){try{return W.LowiCompanion&&W.LowiCompanion.genome?W.LowiCompanion.genome():null;}catch(e){return null;}}const l=looks.get(id);try{return l&&C.decode?C.decode(l):null;}catch(e){return null;}}
function spirit(id,key){const h=hue(id);return '<svg class="cp-spirit" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><defs><radialGradient id="cps'+key+'" cx=".38" cy=".34" r=".72"><stop stop-color="#fff" stop-opacity=".7"/><stop offset=".55" stop-color="hsl('+h+' 52% 74%)" stop-opacity=".8"/><stop offset="1" stop-color="hsl('+h+' 42% 48%)" stop-opacity=".9"/></radialGradient></defs><path d="M50 18c19 0 33 15 33 34 0 18-14 32-33 32S17 70 17 52c0-19 14-34 33-34z" fill="url(#cps'+key+')" stroke="#fff" stroke-opacity=".75" stroke-width="2.4"/><circle cx="40" cy="54" r="4" fill="#1b1035"/><circle cx="60" cy="54" r="4" fill="#1b1035"/><circle cx="41.4" cy="52.6" r="1.4" fill="#fff"/><circle cx="61.4" cy="52.6" r="1.4" fill="#fff"/><path d="M45 63q5 4 10 0" stroke="#1b1035" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>';}
function mate(id,key){const g=genomeFor(id),C=W.LowiCompanionCore;let svg='';if(g&&C&&C.miniSVG){try{svg=C.miniSVG(g,key);}catch(e){svg='';}}return '<span class="cp-form'+(svg?'':' cp-plain')+'">'+(svg||spirit(id,key))+'</span>';}
function planetPeople(ms){const seen=new Map();for(let i=ms.length-1;i>=0;i--){const m=ms[i];if(!m||m.demo||m.bot||m.uid===scope||blocked(m.uid))continue;if(!seen.has(m.uid))seen.set(m.uid,{uid:m.uid,n:m.by});}return [...seen.values()];}
function planet(ms,width,mode,ctl){const tall=mode==='tall',compact=mode==='compact';
 width=Math.max(240,width||360);
 const others=planetPeople(ms),slots=compact?Math.max(2,Math.min(5,Math.floor((width-112)/50))):Math.max(3,Math.min(tall?11:9,Math.floor((width-20)/62))),show=others.slice(0,slots-1);
 const left=[],right=[];show.forEach((p,i)=>(i%2?left:right).push(p));
 const row=[...left.reverse(),{uid:scope,n:tr('you'),me:true},...right];
 const step=Math.min(tall?80:compact?52:66,(width-(compact?112:24))/row.length),mid=(row.length-1)/2,cx=width/2,d=Math.max(1,mid*step),drop=tall?30:compact?7:18,R=Math.max(width*.9,(d*d+drop*drop)/(2*drop)),y0=tall?64:compact?34:54;
 const globe='<div class="cp-globe" aria-hidden="true" style="width:'+Math.round(2*R)+'px;height:'+Math.round(2*R)+'px;left:'+Math.round(cx-R)+'px;top:'+y0+'px"><i class="cp-crater a"></i><i class="cp-crater b"></i><i class="cp-crater c"></i></div>';
 const mates=row.map((p,k)=>{const x=cx+(k-mid)*step,dx=x-cx,surf=y0+R-Math.sqrt(Math.max(0,R*R-dx*dx)),ang=Math.asin(Math.max(-1,Math.min(1,dx/R)))*180/Math.PI;
  const label=p.me?tr('you'):p.n,attrs='data-uid="'+esc(p.uid||'')+'" data-name="'+esc(p.me?own().n||'':p.n)+'" aria-label="'+esc(label)+' · '+tr('profile')+'" style="left:'+x.toFixed(1)+'px;top:'+surf.toFixed(1)+'px;--tilt:'+ang.toFixed(1)+'deg;--i:'+k+'"';
  const inner='<span class="cp-body">'+(speak&&speak===(p.uid||'')?'<span class="cp-puff" aria-hidden="true"><i></i><i></i><i></i></span>':'')+mate(p.uid||'me','p'+k)+'</span><span class="cp-name">'+esc(label)+'</span>';
  return p.me&&!scope?'<span class="cp-mate me" '+attrs+'>'+inner+'</span>':button('profile',inner,attrs,'cp-mate'+(p.me?' me':'')+(speak&&speak===(p.uid||'')?' speaking':''));}).join('');
 return '<div class="cp-sky" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>'+globe+mates+(compact&&ctl?'<div class="cp-corner">'+ctl+'</div>':'');
}
function text(t){return esc(t).replace(/@([\p{L}\p{N}_-]+)/gu,'<span class="cm-at">@$1</span>');}
function time(ts){try{return new Date(ts).toLocaleTimeString(['en','de','es'][Math.max(0,lang())],{hour:'2-digit',minute:'2-digit'});}catch(e){return '';}}
function renderMessage(m,all,prev,next){
 if(m.demo||m.bot||blocked(m.uid))return '';
 const mine=m.uid===scope,p=profile(m.uid,m.by),re=m.re&&all.find(x=>x.id===m.re),pending=!!m.status,open=openId===m.id||pick===m.id;
 const color=H.color?H.color(p.s):'#9fd8ff';
 const start=!prev||prev.uid!==m.uid||m.ts-prev.ts>300000,end=!next||next.uid!==m.uid||next.ts-m.ts>300000;
 const rx=H.reactions().filter(x=>x.message_id===m.id&&!blocked(x.user_id));
 const quote=m.re?'<div class="cm-quote">'+(re?'<b>'+esc(re.by)+'</b> '+esc(re.t.slice(0,90)):tr('gone'))+'</div>':'';
 const reacts=K.EMOJI.map(em=>{const rows=rx.filter(x=>x.emoji===em);return rows.length?button('react',esc(em)+' '+rows.length,'data-id="'+esc(m.id)+'" data-emoji="'+esc(em)+'" aria-pressed="'+rows.some(x=>x.user_id===scope)+'"'+(transport.reactionBusy(m.id,em)?' disabled':''),'cm-chip'+(rows.some(x=>x.user_id===scope)?' on':'')):'';}).join('');
 const who=end?button('profile',mate(m.uid,'m'+sid(m.id)),'data-uid="'+esc(m.uid)+'" data-name="'+esc(m.by)+'" aria-label="'+esc(mine?tr('you'):m.by)+' · '+tr('profile')+'"','cs-avatar cp-av'):'<span class="cp-av cp-gap" aria-hidden="true"></span>';
 const head='<div class="cs-by">'+(start&&!mine?'<b class="cs-name">'+esc(m.by)+'</b>':'<span class="cp-sr">'+esc(mine?tr('you'):m.by)+' '+tr('says')+'</span>')+'<time datetime="'+new Date(m.ts).toISOString()+'">'+esc(time(m.ts))+'</time>'+(pending?'':button('more','<span aria-hidden="true">···</span>','data-id="'+esc(m.id)+'" aria-label="'+tr('more')+'" aria-expanded="'+open+'"','cp-more'))+'</div>';
 const acts=!pending&&open?'<div class="cp-acts">'+button('pick','＋','data-id="'+esc(m.id)+'" aria-label="'+tr('react')+'" aria-expanded="'+(pick===m.id)+'"','cm-mini')+button('reply',tr('reply'),'data-id="'+esc(m.id)+'"','cm-mini')+(mine?button('delete',tr(armed===m.id?'confirmDelete':'delete'),'data-id="'+esc(m.id)+'"','cm-mini'):button('report',tr('report'),'data-id="'+esc(m.id)+'"','cm-mini'))+'</div>':'';
 return '<article class="cm-msg cp-msg'+(mine?' mine':'')+(start?' cp-start':'')+(end?' cp-end':'')+(open?' cp-open':'')+'" id="cm-'+esc(m.id)+'" data-who="'+esc(m.by)+'" data-chat-id="'+esc(m.id)+'" style="--chat-color:'+esc(color)+'">'+who+
 '<div class="cm-bub" data-chat-bub="'+esc(m.id)+'">'+head+quote+'<div class="cm-t">'+text(m.t)+'</div>'+
 (pending?'<div class="cs-delivery" role="status">'+tr(m.status==='sending'?'sending':'unconfirmed')+(m.status==='sending'?'':button('retry-send',tr('checkRetry'),'data-id="'+esc(m.id)+'"','')+button('discard',tr('discard'),'data-id="'+esc(m.id)+'"',''))+'</div>':(reacts?'<div class="cm-rx">'+reacts+'</div>':''))+acts+
 (!pending&&pick===m.id?'<div class="cm-picker" aria-label="'+tr('react')+'">'+K.EMOJI.map(em=>button('react',esc(em),'data-id="'+esc(m.id)+'" data-emoji="'+esc(em)+'" aria-label="'+tr('react')+' '+esc(em)+'"','')).join('')+'</div>':'')+'</div></article>';
}
function mount(el){if(!el)return;ensureScope();if(!el.hasAttribute('data-spirit-chat')){
 el.setAttribute('data-spirit-chat','');el.setAttribute('data-planet','normal');el.setAttribute('data-noi18n','');
 el.innerHTML='<header class="cp-bar"><div class="cp-head"><h2 id="cpTitle"></h2><p id="cpSub"></p></div><div id="csControls"></div></header><div class="cs-status" id="csStatus" role="status"></div><section class="cp-room" id="cpRoom"><div class="cm-list" id="cmList" role="log" aria-live="off" tabindex="0"></div><div id="csJump"></div><div class="cp-planet" id="cpPlanet" role="group"></div></section><div class="cm-compose"><div id="csReply"></div><div class="cm-mention" id="cmMention"></div><div class="cm-inrow"><textarea id="cmInput" rows="1" maxlength="600" enterkeyhint="send"></textarea><button type="button" id="cmSend" data-chat="send" data-sfx="none">↑</button></div><div class="cs-compose-meta"><span id="csDraft"></span><span id="csCount"></span></div><p class="cs-notice" id="csNotice" role="status"></p></div><span id="csAnnounce" class="sr-only" aria-live="polite"></span>';
 el.querySelector('#cmList').addEventListener('scroll',()=>{if(nearBottom()){newCount=0;const j=D.getElementById('csJump');if(j)j.innerHTML='';}},{passive:true});
 }
 paint(el);}
function nearBottom(){const l=D.getElementById('cmList');return !l||l.scrollHeight-l.scrollTop-l.clientHeight<90;}
function paint(el){
 if(!el||!el.hasAttribute('data-spirit-chat'))return;
 const q=s=>el.querySelector(s),ms=messages(),ds=draftState(),m=own(),st=transport.state(),list=q('#cmList'),near=nearBottom(),y=list.scrollTop,focus=D.activeElement;
 const focusKey=focus&&focus.closest&&focus.closest('[data-chat]'),fk=focusKey&&{a:focusKey.dataset.chat,id:focusKey.dataset.id,uid:focusKey.dataset.uid,em:focusKey.dataset.emoji};
 q('#cpTitle').textContent=tr('square');q('#cpSub').textContent=tr('welcome');
 const ctl=button('settings','<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3l7 3v5c0 4.6-3 8.4-7 10-4-1.6-7-5.4-7-10V6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>'+(isQuiet()?'<path d="M14.5 9.2a3.6 3.6 0 1 0 0 5.6 3 3 0 0 1 0-5.6z" fill="currentColor"/>':'<path d="M9 12l2 2 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>')+'</svg><span>'+tr(isQuiet()?'quiet':'controls')+'</span>','aria-label="'+tr(isQuiet()?'quiet':'controls')+'"','cs-tool cp-ctl');
 if(q('#csControls').innerHTML!==ctl)q('#csControls').innerHTML=ctl;
 let state='live',status=tr('live');if(navigator.onLine===false){state='offline';status=tr('offline');}else if(!scope){state='auth';status=tr('signIn');}else if(st.phase==='loading'||st.phase==='idle'){state='loading';status=tr('loading');}else if(st.phase==='error'){state='error';status=tr('error');}else if(st.realtime!=='SUBSCRIBED'){state='connecting';status=tr('connecting');}else if(isQuiet()){status=tr('calm');}
 if(active()&&near&&ms.length){const newest=ms[ms.length-1].ts;if(newest>(prefs.readAt||0)){prefs.readAt=newest;persist();}}
 const tab=D.querySelector('#cmSeg [data-v="chat"]');if(tab){const count=unread();let dot=tab.querySelector('.cm-dot');if(!count&&dot)dot.remove();else if(count){if(!dot){dot=D.createElement('span');dot.className='cm-dot';tab.appendChild(dot);}dot.textContent=count;}}
 q('#csStatus').setAttribute('aria-live',isQuiet()?'off':'polite');
 q('#csStatus').dataset.state=state;q('#csStatus').dataset.quiet=isQuiet()?'1':'';q('#csStatus').innerHTML='<i aria-hidden="true"></i><span>'+esc(status)+'</span>'+(['error','offline','connecting'].includes(state)?button('reload',tr('retry'),'',''):'');
 const newest=ms.length?ms[ms.length-1]:null,nid=newest?newest.id:'';let ownNew=false;
 if(nid&&nid!==lastNewest){ownNew=!!lastNewest&&newest.uid===scope;if(lastNewest&&newest.uid&&!newest.status){speak=newest.uid;clearTimeout(speakTimer);speakTimer=setTimeout(()=>{speak='';refresh();},3400);}lastNewest=nid;}
 const pl=q('#cpPlanet'),pw=(pl&&pl.clientWidth)||(el.clientWidth?el.clientWidth-36:0)||360,mode=W.innerWidth>=700&&W.innerHeight>=700?'tall':W.innerHeight<700?'compact':'normal';el.dataset.planet=mode;
 const crowd=planetPeople(ms),planetHTML=planet(ms,pw,mode,ctl);if(pl&&pl.__html!==planetHTML){pl.innerHTML=planetHTML;pl.__html=planetHTML;}
 if(pl)pl.setAttribute('aria-label',tr('onPlanet')+': '+[tr('you'),...crowd.map(x=>x.n)].join(', '));
 if(!W.LowiCompanionCore&&mateTries<20){mateTries++;setTimeout(refresh,1500);}
 const empty=st.phase==='ready'?(Object.values(prefs.blocks).some(x=>x.blocked)?tr('filtered'):tr('empty')):tr('waiting');
 const shown=ms.filter(x=>!x.demo&&!x.bot&&!blocked(x.uid));
 const html=shown.length?shown.map((m,i)=>renderMessage(m,ms,shown[i-1],shown[i+1])).join(''):'<div class="cs-empty"><span class="cs-lantern" aria-hidden="true">✧</span><b>'+tr('emptyTitle')+'</b><p>'+empty+'</p>'+(st.phase==='ready'?button('hello',tr('hi')):'')+'</div>';
 if(list.__html!==html){list.innerHTML=html;list.__html=html;if(near||ownNew)list.scrollTop=list.scrollHeight;else list.scrollTop=y;if(fk){const b=[...list.querySelectorAll('[data-chat]')].find(b=>b.dataset.chat===fk.a&&b.dataset.id===fk.id&&b.dataset.uid===fk.uid&&b.dataset.emoji===fk.em);if(b)b.focus({preventScroll:true});}}
 if(ownNew)newCount=0;if(ms.length>lastCount&&!near&&!ownNew){newCount+=ms.length-lastCount;if(!isQuiet())q('#csAnnounce').textContent=tr('newMessages');}lastCount=ms.length;
 q('#csJump').innerHTML=newCount&&!near&&!ownNew?button('latest',tr('newMessages'),'','cs-jump'):'';
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
function settings(){const m=own(),shared=K.identity(identities.get(scope)),row=identities.get(scope)||{};const cp=matePref();sheet('<h2>'+tr('presence')+'</h2><div class="cs-pub cp-pubme">'+mate(scope,'set')+'<div><b>'+esc(m.n||tr('you'))+'</b></div></div><form data-chat-form="mate"><label>'+tr('mateShare')+' <input type="checkbox" name="share" '+(cp.share?'checked':'')+'></label><p>'+tr('mateNote')+'</p><button class="cs-submit" data-sfx="none">'+tr('save')+'</button><div class="cs-result" role="status"></div></form><p>'+tr('noRouting')+'</p><p>'+tr('style')+': <b>'+esc(K.type(m.t)||tr('optional'))+'</b> · '+tr(shared.t&&shared.t===K.type(m.t)?'sharedType':'private')+'</p><p>'+tr('privacyNote')+'</p><form data-chat-form="sharing"><label>'+tr('shareType')+' <input type="checkbox" name="type" '+(row.share_personality?'checked':'')+(!K.type(m.t)?' disabled':'')+'></label><label>'+tr('shareSign')+' <input type="checkbox" name="sign" '+(row.share_sign?'checked':'')+(!K.SIGNS.includes(m.s)?' disabled':'')+'></label><button class="cs-submit" data-sfx="none">'+tr('publish')+'</button><div class="cs-result" role="status"></div></form><h2 style="margin-top:24px">'+tr('quiet')+'</h2><p>'+tr('quietDesc')+'</p><form data-chat-form="quiet"><label>'+tr('quiet')+'<input type="checkbox" name="enabled" '+(prefs.quietEnabled!==false?'checked':'')+'></label><div class="cs-hours"><label>'+tr('from')+' <input aria-label="'+tr('from')+'" type="number" name="start" min="0" max="23" value="'+(prefs.quietStart??22)+'" required></label><label>'+tr('until')+' <input aria-label="'+tr('until')+'" type="number" name="end" min="0" max="23" value="'+(prefs.quietEnd??8)+'" required></label></div><button class="cs-submit" data-sfx="none">'+tr('saveQuiet')+'</button><div class="cs-result" role="status"></div></form><h2 style="margin-top:24px">'+tr('blocked')+'</h2><div id="csBlockedList">'+blockList()+'</div><p class="cs-result" id="csBlockResult" role="status"></p>'+(extrasAttempt==='failed'?'<p>'+tr('extrasMissing')+'</p>':''));}
function blockList(){const ids=Object.keys(prefs.blocks).filter(id=>prefs.blocks[id].blocked);return ids.length?ids.map(id=>'<div class="cs-blockrow"><span>'+esc(prefs.blocks[id].name||'Member')+'</span>'+button('unblock',tr('unblock'),'data-uid="'+esc(id)+'"')+'</div>').join(''):'<p>'+tr('noBlocked')+'</p>';}
function matePref(){try{const v=JSON.parse(localStorage.getItem('lowispike.companion.v1')||'null')||{};return {share:v.share!==false,traits:v.traits!==false,born:+v.born||0};}catch(e){return {share:true,traits:true,born:0};}}
function openProfile(id,name){const p=profile(id,name);sheet('<h2>'+tr('profile')+'</h2><div class="cs-pub">'+mate(id,'sh'+sid(id))+'<div><b>'+esc(p.n)+'</b><br>'+esc([p.t,p.s].filter(Boolean).join(' · ')||tr('noDetails'))+'</div></div><p>'+tr('profileNote')+'</p>'+(id!==scope?'<p>'+tr('blockNote')+'</p>'+button('block',tr('block'),'data-uid="'+esc(id)+'" data-name="'+esc(p.n)+'"')+'<p class="cs-result" id="csBlockResult" role="status"></p>':button('settings',tr('controls'))));}
function openReport(mid){const m=messages().find(x=>x.id===mid);if(!m||m.uid===scope)return;sheet('<h2>'+tr('report')+'</h2><p>'+tr('reportDesc')+'</p><form data-chat-form="report" data-mid="'+esc(mid)+'"><select name="reason" aria-label="'+tr('report')+'">'+['harassment','spam','privacy','unsafe'].map(v=>'<option value="'+v+'">'+tr(v)+'</option>').join('')+'</select><button class="cs-submit" data-sfx="none">'+tr('sendReport')+'</button><p class="cs-result" role="status"></p></form>'+button('block',tr('block'),'data-uid="'+esc(m.uid)+'" data-name="'+esc(m.by)+'"')+'<p class="cs-result" id="csBlockResult" role="status"></p>');}
async function writeBlock(id){const actor=scope,entry=prefs.blocks[id];if(!entry||!entry.dirty)return true;try{if(entry.blocked){const ack=await transport.table('community_blocks',(t,u)=>t.upsert({user_id:u,blocked_user_id:id},{onConflict:'user_id,blocked_user_id'}).select('blocked_user_id'));if(!ack||!ack.some(r=>r.blocked_user_id===id))throw new Error('ack');}else await transport.table('community_blocks',(t,u)=>t.delete().eq('user_id',u).eq('blocked_user_id',id));if(actor!==scope)return false;if(prefs.blocks[id]===entry){entry.dirty=false;persist();}return true;}catch(e){return false;}}
function syncBlock(id){const key=scope+':'+id,prior=blockJobs.get(key);if(prior)return prior.then(()=>syncBlock(id));const job=writeBlock(id);blockJobs.set(key,job);return job.finally(()=>{if(blockJobs.get(key)===job)blockJobs.delete(key);});}

async function blockPerson(id,name,on){if(!scope||!id||id===scope)return;const actor=scope;prefs.blocks[id]={blocked:on,name:name||prefs.blocks[id]?.name||'Member',dirty:true};const saved=persist();pick='';if(draftState().draft.reply&& !messages().some(m=>m.id===draftState().draft.reply))draft(draftState().draft.text,null);refresh();resultText(D.getElementById('csBlockResult'),saved?tr('blockLocal'):tr('blockStorage'));const ok=await syncBlock(id);if(actor!==scope)return;resultText(D.getElementById('csBlockResult'),ok?tr('blockSynced'):tr('blockLocal'));const b=D.getElementById('csBlockedList');if(b)b.innerHTML=blockList();}
async function loadExtras(force){
 if(!scope||extrasFlight||navigator.onLine===false)return;const ids=[...new Set([scope,...H.messages().map(m=>m.uid)])].filter(Boolean).sort(),signature=ids.join(',');if(!force&&extrasAttempt===signature||!force&&extrasAttempt==='failed')return;extrasAttempt=signature;const actor=scope;
 const task=(async()=>{const results=await Promise.allSettled([transport.table('community_identities',t=>t.select('user_id,share_personality,personality,share_sign,sign').in('user_id',ids)),transport.table('community_blocks',(t,u)=>t.select('blocked_user_id').eq('user_id',u)),transport.table('profiles',t=>t.select('id,look').in('id',ids))]);if(scope!==actor)return;
 if(results[2].status==='fulfilled'){looks=new Map((results[2].value||[]).filter(r=>r&&r.id&&typeof r.look==='string'&&r.look).map(r=>[r.id,r.look]));}
 if(results[0].status==='fulfilled'){identities=new Map((results[0].value||[]).map(r=>[r.user_id,r]));}else{identities=new Map();extrasAttempt='failed';}
 if(results[1].status==='fulfilled'){const previous=prefs.blocks,next={};for(const r of results[1].value||[])next[r.blocked_user_id]={blocked:true,name:previous[r.blocked_user_id]?.name||'Member',dirty:false};for(const [id,p]of Object.entries(previous)){if(p.dirty)next[id]=p;}prefs.blocks=next;persist();for(const id of Object.keys(next))if(next[id].dirty)await syncBlock(id);}else extrasAttempt='failed';refresh();})();extrasFlight=task;try{await task;}finally{if(scope===actor)extrasFlight=null;}
}
async function submitForm(form){const result=form.querySelector('.cs-result'),btn=form.querySelector('button'),actor=scope;btn.disabled=true;
 try{if(form.dataset.chatForm==='mate'){const cur=matePref(),on=!!form.elements.share.checked;localStorage.setItem('lowispike.companion.v1',JSON.stringify({share:on,traits:cur.traits,born:cur.born}));try{W.LOWI_CLOUD_X&&W.LOWI_CLOUD_X.pushProfile&&W.LOWI_CLOUD_X.pushProfile();}catch(e){}resultText(result,tr('mateSaved'));refresh();}
 else if(form.dataset.chatForm==='quiet'){prefs.quietEnabled=form.elements.enabled.checked;prefs.quietStart=+form.elements.start.value;prefs.quietEnd=+form.elements.end.value;resultText(result,persist()?tr('saved'):tr('volatile'));refresh();}
 else if(form.dataset.chatForm==='sharing'){const m=own(),row={share_personality:form.elements.type.checked,personality:form.elements.type.checked?K.type(m.t):'',share_sign:form.elements.sign.checked,sign:form.elements.sign.checked?m.s:''};const data=await transport.table('community_identities',(t,u)=>t.upsert({...row,user_id:u}).select('user_id,share_personality,personality,share_sign,sign').single());if(actor!==scope)return;if(!data||data.user_id!==scope)throw new Error('ack');identities.set(scope,data);resultText(result,tr('published'));refresh();}
 else if(form.dataset.chatForm==='report'){const mid=form.dataset.mid;if(!messages().some(m=>m.id===mid&&m.uid!==scope))throw new Error('message');const rows=await transport.table('community_reports',(t,u)=>t.insert({reporter_id:u,message_id:mid,reason:form.elements.reason.value}).select('id'));if(!rows||!rows[0]?.id)throw new Error('ack');resultText(result,tr('reportSent'));form.dataset.sent='1';}
 }catch(e){resultText(result,tr(form.dataset.chatForm==='sharing'?'publishFailed':form.dataset.chatForm==='mate'?'volatile':'reportFailed'));}finally{if(form.dataset.sent!=='1')btn.disabled=false;}}
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
D.addEventListener('click',async e=>{const b=e.target.closest&&e.target.closest('[data-chat]');if(!b){const bub=e.target.closest&&e.target.closest('#cmPaneChat [data-chat-bub]');if(bub&&!(W.getSelection&&String(W.getSelection()).trim())){const mid=bub.getAttribute('data-chat-bub'),m=messages().find(x=>x.id===mid);if(m&&!m.status){openId=openId===mid?'':mid;if(pick&&pick!==openId)pick='';refresh();}}return;}e.preventDefault();e.stopPropagation();const a=b.dataset.chat,id=b.dataset.id;
 if(a==='send')send();else if(a==='reload'){transport.reload();loadExtras(true);}else if(a==='settings')settings();else if(a==='profile')openProfile(b.dataset.uid,b.dataset.name);else if(a==='hello'){draft(tr('hiText'),null);refresh();focusInput();}else if(a==='more'){openId=openId===id?'':id;if(pick&&pick!==openId)pick='';refresh();}else if(a==='pick'){pick=pick===id?'':id;if(pick)openId=id;refresh();}else if(a==='reply'){openId='';pick='';draft(draftState().draft.text,id);refresh();focusInput();}else if(a==='noreply'){draft(draftState().draft.text,null);refresh();focusInput();}else if(a==='mention'){draft((D.getElementById('cmInput').value||'').replace(/@[\p{L}\p{N}_-]*$/u,'@'+b.dataset.name+' '),draftState().draft.reply);refresh();focusInput();}else if(a==='latest'){const l=D.getElementById('cmList');l.scrollTop=l.scrollHeight;newCount=0;refresh();}else if(a==='retry-send')send(id);else if(a==='discard'){store.discard(id);refresh();}else if(a==='react'){pick='';openId='';try{await transport.react(id,b.dataset.emoji,own().n);}catch(x){notice=tr('reactFailed');}refresh();}else if(a==='report')openReport(id);else if(a==='block')blockPerson(b.dataset.uid,b.dataset.name,true);else if(a==='unblock')blockPerson(b.dataset.uid,'',false);else if(a==='delete'){
  if(armed!==id){armed=id;clearTimeout(armTimer);armTimer=setTimeout(()=>{armed='';refresh();},3500);refresh();return;}armed='';b.disabled=true;b.textContent=tr('deleting');try{await transport.remove(id);}catch(x){notice=tr('deleteFailed');}refresh();}
});
D.addEventListener('focusin',fit);D.addEventListener('focusout',()=>requestAnimationFrame(fit));W.addEventListener('resize',()=>{fit();clearTimeout(W.__cpResize);W.__cpResize=setTimeout(()=>{if(active())refresh();},120);});if(W.visualViewport){W.visualViewport.addEventListener('resize',fit);W.visualViewport.addEventListener('scroll',fit);}
D.addEventListener('lowi:chat',e=>{ensureScope();transport.notify(e.detail);if(e.detail&&['ready','reconnect'].includes(e.detail.type)){transport.reload();loadExtras(true);}refresh();});
W.addEventListener('online',()=>{ensureScope();transport.reload();loadExtras(true);});W.addEventListener('offline',refresh);W.addEventListener('storage',e=>{if(e.key===prefsKey()){prefs=K.read(deviceStorage,prefsKey(),{});prefs.blocks=prefs.blocks||{};refresh();}});
D.addEventListener('visibilitychange',()=>{if(!D.hidden){transport.reload();loadExtras(true);refresh();}});
W.LowiCommunity={mount,refresh,send,comment,isQuiet,unread,messageHTML:renderMessage,mentions,fit};H.install(W.LowiCommunity);ensureScope();refresh();setInterval(()=>{if(active()){refresh();loadExtras(true);}},60000);
})(window,document);
