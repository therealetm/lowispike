/* Community planet: one shared room. Members appear as their companion on a planet; messages are speech bubbles from that companion. Consent-based identity. */
(function(W,D){
'use strict';
if(W.LowiCommunity)return;
const K=W.LowiChatCore, H=W.LowiCommunityHost;if(!K||!H||!W.LowiCommunityCloud)return;
const esc=K.esc;
const deviceStorage={getItem:k=>localStorage.getItem(k),setItem:(k,v)=>localStorage.setItem(k,v)};
const COPY={
 square:['Spirit galaxy','Geister-Galaxie','Galaxia de espíritus'],
 welcome:['Everyone floats here as their companion. Tap someone to talk to them directly.','Alle schweben hier als ihr Begleiter. Tippe jemanden an, um direkt mit ihm zu sprechen.','Todos flotan aquí como su compañero. Toca a alguien para hablarle directamente.'],
 onPlanet:['In the galaxy','In der Galaxie','En la galaxia'],
 you:['You','Du','Tú'],
 more:['Message options','Nachrichtenoptionen','Opciones del mensaje'],
 says:['says','sagt','dice'],
 mateShare:['Show my companion’s form in the galaxy','Die Form meines Begleiters in der Galaxie zeigen','Mostrar la forma de mi compañero en la galaxia'],
 mateNote:['Others see your companion only when this is on (it also shows in friends trees). Otherwise they see a plain spirit. Only the look is shared.','Andere sehen deinen Begleiter nur, wenn das an ist (auch im Freundesbaum). Sonst sehen sie einen schlichten Geist. Geteilt wird nur das Aussehen.','Los demás solo ven a tu compañero si esto está activado (también en el árbol de amigos). Si no, ven un espíritu sencillo. Solo se comparte el aspecto.'],
 mateSaved:['Saved.','Gespeichert.','Guardado.'],
 sharedDetails:['Sharing enabled','Freigaben aktiv','Compartir activado'],
 sharedType:['Shared in the galaxy','In der Galaxie geteilt','Compartido en la galaxia'],
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
 emptyTitle:['The galaxy is quiet','Die Galaxie ist still','La galaxia está tranquila'],
 empty:['No messages yet. Say hello and your companion speaks first.','Noch keine Nachrichten. Sag hallo, dann spricht dein Begleiter zuerst.','Aún no hay mensajes. Saluda y tu compañero hablará primero.'],
 waiting:['The conversation appears here once it loads.','Das Gespräch erscheint hier, sobald es geladen ist.','La conversación aparecerá aquí al cargarse.'],
 filtered:['Messages from people you blocked are hidden.','Nachrichten blockierter Personen sind ausgeblendet.','Los mensajes de personas bloqueadas están ocultos.'],
 hi:['Say hello','Hallo sagen','Saludar'],
 hiText:['Hi everyone! Happy to be here.','Hallo zusammen! Schön, hier zu sein.','¡Hola a todos! Me alegra estar aquí.'],
 message:['Write to the galaxy','Schreib in die Galaxie','Escribe a la galaxia'],
 send:['Send message','Nachricht senden','Enviar mensaje'],
 hint:['Everyone in the galaxy can read what you send.','Alle in der Galaxie können lesen, was du sendest.','Todos en la galaxia pueden leer lo que envías.'],
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
 profileNote:['Only details explicitly shared for the galaxy appear here.','Hier erscheinen nur ausdrücklich für die Galaxie geteilte Angaben.','Aquí solo aparecen datos compartidos expresamente para la galaxia.'],
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
 toAll:['To the whole galaxy','An die ganze Galaxie','A toda la galaxia'],
 toName:['To {n}','An {n}','Para {n}'],
 writeTo:['Write to {n}','Schreib {n}','Escribe a {n}'],
 hintTo:['Everyone can read it; {n} gets a notification that you are talking to them.','Alle können es lesen; {n} bekommt eine Nachricht, dass du mit ihm sprichst.','Todos pueden leerlo; {n} recibe un aviso de que le estás hablando.'],
 talkTo:['Talk to {n} directly','Direkt mit {n} sprechen','Hablar directamente con {n}'],
 talking:['Talking to {n} · tap again for everyone','Du sprichst mit {n} · nochmal tippen für alle','Hablas con {n} · toca de nuevo para todos'],
 toEveryone:['Write to everyone instead','Stattdessen an alle schreiben','Escribir a todos'],
 youAll:['You · talking to everyone','Du · sprichst mit allen','Tú · hablas con todos'],
 history:['All messages','Alle Nachrichten','Todos los mensajes'],
 back:['Back to the galaxy','Zurück zur Galaxie','Volver a la galaxia'],
 toArrow:['to {n}','an {n}','para {n}'],
 toYou:['to you','an dich','para ti'],
 dmTitle:['{n} is talking to you','{n} spricht mit dir','{n} te está hablando'],
 openThread:['Open the conversation','Gespräch öffnen','Abrir la conversación'],
 close:['Close','Schließen','Cerrar'],
 optional:['Not set','Nicht festgelegt','Sin definir'],
 botTag:['Galaxy bot','Galaxie-Bot','Bot de la galaxia'],
 botNote:['A made-up companion so the galaxy feels alive. Chats with bots stay on this phone; nothing is posted to the room.','Ein ausgedachter Begleiter, damit die Galaxie lebt. Chats mit Bots bleiben auf diesem Handy; nichts geht in den Raum.','Un compañero inventado para que la galaxia tenga vida. Los chats con bots se quedan en este móvil; no se publica nada en la sala.'],
 companion:['Companion','Begleiter','Compañero'],
 levelN:['Level {n}','Level {n}','Nivel {n}'],
 born:['Born','Geboren','Nacimiento'],
 ageN:['{n} years','{n} Jahre','{n} años'],
 sign:['Star sign','Sternzeichen','Signo'],
 withUs:['In the galaxy since','In der Galaxie seit','En la galaxia desde'],
 talkBtn:['Talk to {n}','Mit {n} sprechen','Hablar con {n}'],
 sayHi:['say hi','sag hallo','di hola'],
 typing:['typing…','schreibt…','escribiendo…'],
 youWord:['You','Du','Tú']
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
 scope=id;sel='';threadOpen=false;dmLive=new Set();transport.reset();identities=new Map();looks=new Map();openId='';speak='';lastNewest='';cache=[];cacheJSON='';extrasAttempt='';extrasFlight=null;notice='';pick='';lastCount=0;newCount=0;
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
function genomeFor(id){const C=W.LowiCompanionCore;if(!C)return null;const bt=botOf(id);if(bt){if(!bt.__g){try{bt.__g=C.genome({sign:{element:bt.el},personality:bt.type,palette:bt.pal},bt.stage,bt.seed);}catch(e){bt.__g=null;}}return bt.__g;}if(id&&id===scope){try{return W.LowiCompanion&&W.LowiCompanion.genome?W.LowiCompanion.genome():null;}catch(e){return null;}}const l=looks.get(id);try{return l&&C.decode?C.decode(l):null;}catch(e){return null;}}
function spirit(id,key){const h=hue(id);return '<svg class="cp-spirit" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><defs><radialGradient id="cps'+key+'" cx=".38" cy=".34" r=".72"><stop stop-color="#fff" stop-opacity=".7"/><stop offset=".55" stop-color="hsl('+h+' 52% 74%)" stop-opacity=".8"/><stop offset="1" stop-color="hsl('+h+' 42% 48%)" stop-opacity=".9"/></radialGradient></defs><path d="M50 18c19 0 33 15 33 34 0 18-14 32-33 32S17 70 17 52c0-19 14-34 33-34z" fill="url(#cps'+key+')" stroke="#fff" stroke-opacity=".75" stroke-width="2.4"/><circle cx="40" cy="54" r="4" fill="#1b1035"/><circle cx="60" cy="54" r="4" fill="#1b1035"/><circle cx="41.4" cy="52.6" r="1.4" fill="#fff"/><circle cx="61.4" cy="52.6" r="1.4" fill="#fff"/><path d="M45 63q5 4 10 0" stroke="#1b1035" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>';}
function mate(id,key){const g=genomeFor(id),C=W.LowiCompanionCore;let svg='';if(g&&C&&C.miniSVG){try{svg=C.miniSVG(g,key);}catch(e){svg='';}}return '<span class="cp-form'+(svg?'':' cp-plain')+'">'+(svg||spirit(id,key))+'</span>';}
const G=W.LowiGalaxy;
let sel='',threadOpen=false,sk=null,wasOn=false,introT=0,gxIds=[],dmLive=new Set(),dmBoot=Date.now(),toastT=0,watching=false;
function hueColor(id,me){return me?'#9cdac7':'hsl('+hue(id)+' 78% 74%)';}
/* Bots: made-up galaxy companions (see LowiGalaxy.bots). Their chats live on this phone only. */
let BOTS=null,botChat=null,botTyping='',botTimer=0;
function botList(){if(!BOTS)BOTS=G&&G.bots?G.bots():[];return BOTS;}
function botOf(id){return typeof id==='string'&&id.startsWith('bot:')?botList().find(b=>b.uid===id)||null:null;}
function botStore(){if(!botChat){try{botChat=JSON.parse(localStorage.getItem('lowi.galaxy.botchat.v1')||'{}')||{};}catch(e){botChat={};}}return botChat;}
function botSave(){try{localStorage.setItem('lowi.galaxy.botchat.v1',JSON.stringify(botStore()));}catch(e){}}
function botSay(uid,from,t){const st=botStore(),arr=st[uid]=st[uid]||[];arr.push({id:'b'+Date.now().toString(36)+arr.length,from,t:String(t).slice(0,500),ts:Date.now()});if(arr.length>30)arr.splice(0,arr.length-30);botSave();}
function roster(){const real=[];for(const p of (H.people&&H.people())||[]){if(p&&p.uid&&p.uid!==scope&&p.n&&!blocked(p.uid))real.push({uid:p.uid,n:String(p.n).trim(),lv:p.lv||1});}
 const have=new Set(real.map(p=>p.uid));for(const m of messages()){if(m&&m.uid&&!m.demo&&!m.bot&&m.uid!==scope&&!blocked(m.uid)&&!have.has(m.uid)){have.add(m.uid);real.push({uid:m.uid,n:String(m.by||'Member').trim(),lv:1});}}
 const last=new Map();for(const m of messages())if(m&&m.uid)last.set(m.uid,+m.ts||0);
 const ownName=scope?String(own().n||'').trim():'',uniq=G&&G.uniqueNames?G.uniqueNames(real,ownName,last):real,map=new Map();
 for(const p of uniq)map.set(p.uid,p);
 for(const b of (G&&G.withBots?G.withBots(uniq,botList(),ownName):[]))if(!blocked(b.uid))map.set(b.uid,{uid:b.uid,n:b.n,lv:b.lv,bot:true});
 return map;}
function nameIdx(r){const list=[...(r||roster()).values()];if(scope&&own().n)list.push({uid:scope,n:own().n});return G?G.nameIndex(list):[];}
function latestBy(ms){const last=new Map();for(const m of ms){if(!m||m.demo||m.bot||!m.uid||blocked(m.uid))continue;last.set(m.uid,m);}return last;}
function crowd(ms,r,idx){const last=latestBy(ms),order=[],seen=new Set();const add=uid=>{if(!uid||uid===scope||seen.has(uid)||!r.has(uid))return;seen.add(uid);order.push(r.get(uid));};
 if(sel)add(sel);[...last.values()].sort((x,y)=>y.ts-x.ts).forEach(m=>{add(m.uid);const t=G&&G.targetOf(m,ms,idx);if(t)add(t.uid);});
 Object.keys(botStore()).forEach(add);[...r.values()].sort((x,y)=>(x.bot?1:0)-(y.bot?1:0)||(y.lv||0)-(x.lv||0)||String(x.n).localeCompare(String(y.n))).forEach(p=>add(p.uid));return order;}
function fill(k,n){return tr(k).replace('{n}',n);}
/* The active conversation (you and the person you picked): its newest message rides on the one line between you two. */
function convo(ms,idx){if(!sel||!G)return null;const b=botOf(sel);
 if(b){const arr=botStore()[sel]||[],m=arr[arr.length-1];return m?{t:m.t,fromMe:m.from==='me',ts:m.ts,id:''}:null;}
 for(let i=ms.length-1;i>=0;i--){const m=ms[i];if(!m||m.demo||m.bot||!m.uid)continue;
  if(m.uid===scope||m.uid===sel){const t=G.targetOf(m,ms,idx);if(t&&((m.uid===scope&&t.uid===sel)||(m.uid===sel&&t.uid===scope)))return {t:G.bubbleText(m,t),fromMe:m.uid===scope,ts:m.ts,id:m.id,status:m.status};}}
 return null;}
function galaxy(ms,w,h,quiet){
 if(!G)return {html:'',lines:[],names:[]};
 const r=roster(),idx=nameIdx(r),order=crowd(ms,r,idx),L=G.layout(order,w,h,scope||'me',{reserveTop:quiet}),last=latestBy(ms),now=Date.now(),spot=new Map(L.spots.map(x=>[x.uid,x])),meSpot=L.spots[0],lines=[],names=[];
 if(sel&&!spot.has(sel))sel='';
 const cv=convo(ms,idx);
 let html='';
 L.spots.forEach((x,i)=>{const me=x.me,p=me?{uid:scope,n:own().n||tr('you')}:r.get(x.uid);if(!p)return;const label=me?tr('you'):p.n;names.push(label);
  const picked=!me&&sel===x.uid,talking=speak&&speak===x.uid;
  const aria=me?(sel?tr('toEveryone'):tr('youAll')):(picked?fill('talking',p.n):fill('talkTo',p.n));
  const attrs='data-uid="'+esc(x.uid)+'" data-name="'+esc(me?own().n||'':p.n)+'" aria-label="'+esc(aria)+'"'+(me?'':' aria-pressed="'+picked+'"')+' style="left:'+x.x+'px;top:'+x.y+'px;--s:'+x.size+'px;--i:'+i+';--c:'+hueColor(x.uid,me)+'"';
  const inner='<span class="cg-orb">'+mate(me?(scope||'me'):x.uid,'g'+i)+'</span><span class="cg-name">'+esc(label)+'</span>';
  html+=button(me?'to-all':'select',inner,attrs,'cg-body'+(me?' me':'')+(picked?' sel':'')+(talking?' speaking':'')+(p.bot?' bot':'')+(me&&!scope?' cg-off':''));
  const m=last.get(me?scope:x.uid);const o=m?G.fade(m.ts,now):0;
  if(m&&(o>0||m.status)&&x.bub.lines>=1){const t=G.targetOf(m,ms,idx),body=G.bubbleText(m,t),toMe=t&&t.uid===scope;
   /* One line, one conversation: what you said to someone lives on the line while you talk to them and is gone when you stop.
      What they said to you rides the line too while they are the one you picked. */
   if(me&&t)return;if(!me&&toMe&&picked)return;
   /* Oct 16 (E-man: "keep it minimal"): no "→ to X" label. The bubble wears the sender's colour and sits next to the sender. */
   const tag='';
   const est=Math.round(body.length*6.2+24<=x.bub.width?Math.max(48,body.length*6.2+24):x.bub.width),side=x.bub.mode!=='top';
   const left=side?(x.bub.mode==='l'?x.bub.left:x.bub.right-est):Math.max(x.cell.x+6,Math.min(x.x-est/2,x.cell.x+x.cell.w-6-est)),tail=side?0:Math.max(14,Math.min(est-14,x.x-left));
   const st=m.status?'<span class="cg-st">'+tr(m.status==='sending'?'sending':'unconfirmed')+'</span>':'';
   html+=button('thread',tag+'<span class="cg-t" style="-webkit-line-clamp:'+Math.max(1,x.bub.lines-(st?1:0))+'">'+text(body)+'</span>'+st,'data-id="'+esc(m.id)+'" aria-label="'+esc(label+': '+m.t)+' · '+tr('openThread')+'" style="left:'+Math.round(left)+'px;width:'+Math.round(est)+'px;'+(side?'top:'+x.bub.cy+'px;':'bottom:'+Math.round(h-x.bub.bottom)+'px;')+'max-height:'+x.bub.max+'px;--o:'+(m.status?1:o)+';--tail:'+Math.round(tail)+'px;--c:'+hueColor(x.uid,me)+'"','cg-bub'+(side?' s'+x.bub.mode:'')+(me?' mine':'')+(toMe?' tome':'')+(talking?' pop':''));}
 });
 if(sel&&spot.has(sel)){const t=spot.get(sel),p=r.get(sel)||{n:''},theyTalk=!!(cv&&!cv.fromMe)||botTyping===sel,A=theyTalk?t:meSpot,B=theyTalk?meSpot:t;
  lines.push({a:{x:A.x,y:A.y},b:{x:B.x,y:B.y},rb:(B.size||46)/2,alpha:1,sel:true,arrow:true,from:hueColor(A.uid,A.me),to:hueColor(B.uid,B.me)});
  const mid=G.midOf({x:A.x,y:A.y},{x:B.x,y:B.y}),mw=Math.min(210,Math.max(120,w-40)),cx=Math.max(mw/2+8,Math.min(w-mw/2-8,mid.x)),cy=Math.max(34,Math.min(h-34,mid.y));
  /* no "You → Name" header: the bubble is the colour of whoever wrote it (yours when you wrote, theirs when they did) */
  const body=botTyping===sel?'<span class="cg-mt cg-typing">'+tr('typing')+'</span>':cv?'<span class="cg-mt">'+text(cv.t)+'</span>'+(cv.status?'<span class="cg-st">'+tr(cv.status==='sending'?'sending':'unconfirmed')+'</span>':''):'<span class="cg-mt cg-hint">'+tr('sayHi')+'</span>';
  const style='left:'+Math.round(cx)+'px;top:'+Math.round(cy)+'px;max-width:'+Math.round(mw)+'px;--a:'+hueColor(A.uid,A.me)+';--b:'+hueColor(B.uid,B.me)+';--c:'+hueColor(A.uid,A.me);
  const inner=body;
  html+=cv&&cv.id?button('thread',inner,'data-id="'+esc(cv.id)+'" aria-label="'+esc((theyTalk?p.n:tr('youWord'))+' → '+(theyTalk?tr('youWord'):p.n)+': '+cv.t)+'" style="'+style+'"','cg-mid'+(theyTalk?' in':' out')):'<div class="cg-mid'+(theyTalk?' in':' out')+'" role="status" style="'+style+'">'+inner+'</div>';}
 gxIds=L.spots.map(x=>x.uid).filter(u=>u&&u!=='me');
 return {html,lines,names,me:meSpot};
}
function skyStart(){const c=D.getElementById('cgSky');if(!G||!c||!c.getContext)return;if(!sk||sk.canvas!==c){if(sk)sk.stop();sk=G.sky(c);if(sk)sk.canvas=c;}if(sk&&active()&&!D.hidden)sk.start();}
/* Arriving in Community: coming from Home, galaxy-zoom.js pulls the one camera out of Misty's world into the galaxy (no boxed
   snapshot of Home any more). From anywhere else the galaxy just settles in from a little closer. */
function intro(){const g=D.getElementById('cgGalaxy');if(!g||!g.removeAttribute)return;g.__intro=1;if(D.documentElement.classList.contains('gx-out'))return;if(W.matchMedia&&W.matchMedia('(prefers-reduced-motion: reduce)').matches)return;g.removeAttribute('data-intro');void g.offsetWidth;g.setAttribute('data-intro','1');clearTimeout(introT);introT=setTimeout(()=>{g.removeAttribute('data-intro');},1100);}
let enterAt=0,ro=null;
function onShow(){const on=!!(active()&&!D.hidden);if(on&&!wasOn){wasOn=true;enterAt=Date.now();intro();skyStart();refresh();}else if(!on&&wasOn){wasOn=false;if(sk)sk.stop();}}
function watch(){if(watching||!W.MutationObserver)return;const t=D.getElementById('tab-foryou');if(!t)return;watching=true;new W.MutationObserver(onShow).observe(t,{attributes:true,attributeFilter:['class']});}
function thread(open,focusId){threadOpen=!!open;const t=D.getElementById('cgThread');if(!t||!t.setAttribute)return;if(threadOpen)t.setAttribute('data-open','1');else t.removeAttribute('data-open');
 const l=D.getElementById('cmList');if(threadOpen&&l){requestAnimationFrame(()=>{const m=focusId&&D.getElementById('cm-'+focusId);if(m&&m.scrollIntoView){m.scrollIntoView({block:'center'});m.classList.add('cg-focus');setTimeout(()=>m.classList.remove('cg-focus'),2200);}else l.scrollTop=l.scrollHeight;const c=t.querySelector('[data-chat="close-thread"]');if(c&&c.focus)c.focus({preventScroll:true});});}}
function dmCheck(ms){if(!scope||!G)return;const idx=nameIdx(),list=ms.filter(m=>m.uid&&m.uid!==scope&&!m.status&&!m.demo&&!m.bot&&!blocked(m.uid)&&((G.targetOf(m,ms,idx)||{}).uid===scope));
 if(prefs.dmSeen==null){prefs.dmSeen=list.length?list[list.length-1].ts:Date.now();persist();}
 if(active()&&!D.hidden&&list.length&&list[list.length-1].ts>prefs.dmSeen){prefs.dmSeen=list[list.length-1].ts;persist();}
 const fresh=list.filter(m=>m.ts>prefs.dmSeen);dmBadge(isQuiet()?0:fresh.length);
 for(const m of fresh){if(dmLive.has(m.id))continue;dmLive.add(m.id);if(m.ts<dmBoot-60000||isQuiet())continue;dmAlert(m);}}
function dmBadge(n){const tb=D.querySelector('#tabbar .tb[data-tab="foryou"]');if(!tb||!tb.querySelector)return;let d=tb.querySelector('.cg-dm');if(!n){if(d)d.remove();return;}if(!d){d=D.createElement('span');d.className='cg-dm';d.setAttribute('aria-hidden','true');tb.appendChild(d);}d.textContent=n>9?'9+':String(n);}
function dmAlert(m){const title=fill('dmTitle',m.by||'Member'),body=String(m.t||'').slice(0,140);
 if(D.hidden){try{if(W.Notification&&Notification.permission==='granted'&&navigator.serviceWorker)navigator.serviceWorker.ready.then(r=>r.showNotification(title,{body,icon:'icon-192.png',badge:'icon-192.png',tag:'lowi-dm-'+m.id,data:{q:'',tab:'foryou'}})).catch(()=>{});}catch(e){}return;}
 if(active())return;
 let t=D.getElementById('cgToast');if(!t){t=D.createElement('div');t.id='cgToast';t.className='cg-toast-wrap';t.setAttribute('role','status');D.body.appendChild(t);}
 t.innerHTML=button('open-galaxy','<span class="cg-torb">'+mate(m.uid,'t'+sid(m.id))+'</span><span class="cg-tt"><b>'+esc(title)+'</b><span>'+text(body)+'</span></span>','data-uid="'+esc(m.uid)+'"','cg-toast');t.setAttribute('data-on','1');
 clearTimeout(toastT);toastT=setTimeout(()=>{t.removeAttribute('data-on');},6500);}
function openGalaxy(uid){try{if(typeof W.goTab==='function')W.goTab('foryou');}catch(e){}try{if(typeof W.cmSeg==='function')W.cmSeg('chat');}catch(e){}const t=D.getElementById('cgToast');if(t)t.removeAttribute('data-on');if(uid&&roster().has(uid))sel=uid;refresh();}
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
 el.innerHTML='<header class="cp-bar"><div class="cp-head"><h2 id="cpTitle"></h2><p id="cpSub"></p></div><div id="csControls"></div></header><div class="cs-status" id="csStatus" role="status"></div><section class="cp-room cg-room" id="cpRoom"><div class="cg-galaxy" id="cgGalaxy" role="group"><canvas class="cg-sky" id="cgSky" aria-hidden="true"></canvas><div class="cg-field" id="cgField"></div></div><section class="cg-thread" id="cgThread"><header class="cg-thead"><b id="cgThreadTitle"></b><button type="button" class="cg-x" data-sfx="none" data-chat="close-thread" id="cgClose">×</button></header><div class="cm-list" id="cmList" role="log" aria-live="off" tabindex="0"></div><div id="csJump"></div></section></section><div class="cm-compose"><div class="cg-torow" id="cgTo"></div><div id="csReply"></div><div class="cm-mention" id="cmMention"></div><div class="cm-inrow"><textarea id="cmInput" rows="1" maxlength="600" enterkeyhint="send"></textarea><button type="button" id="cmSend" data-chat="send" data-sfx="none">↑</button></div><div class="cs-compose-meta"><span id="csDraft"></span><span id="csCount"></span></div><p class="cs-notice" id="csNotice" role="status"></p></div><span id="csAnnounce" class="sr-only" aria-live="polite"></span>';
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
 const selP=sel&&roster().get(sel),toRow=(selP?'<span class="cg-chip on"><span class="cg-dotc" style="--c:'+hueColor(sel,false)+'" aria-hidden="true"></span>'+button('profile',esc(fill('toName',selP.n)),'data-uid="'+esc(sel)+'" data-name="'+esc(selP.n)+'" aria-label="'+esc(fill('toName',selP.n))+' · '+tr('profile')+'"','cg-chipname')+button('to-all','×','aria-label="'+tr('toEveryone')+'"','cg-chipx')+'</span>':'<span class="cg-chip"><span class="cg-dotc all" aria-hidden="true"></span>'+esc(tr('toAll'))+'</span>')+button('history','<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 6.5h14M5 12h14M5 17.5h9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span>'+tr('history')+'</span>','aria-expanded="'+threadOpen+'"','cg-hist');
 const tw=q('#cgTo');if(tw&&tw.innerHTML!==toRow)tw.innerHTML=toRow;
 const room=q('#cpRoom'),gw=(room&&room.clientWidth)||(el.clientWidth||0)||360,gh=(room&&room.clientHeight)||420,quietRoom=!ms.some(x=>!x.demo&&!x.bot&&!blocked(x.uid));el.dataset.planet=W.innerWidth>=700&&W.innerHeight>=700?'tall':W.innerHeight<700?'compact':'normal';
 const gx=galaxy(ms,gw,gh,quietRoom),field=q('#cgField'),gal=q('#cgGalaxy');
 const fieldHTML=gx.html+(quietRoom?'<div class="cg-empty"><span class="cs-lantern" aria-hidden="true">✧</span><b>'+tr('emptyTitle')+'</b><p>'+(st.phase==='ready'?(Object.values(prefs.blocks).some(x=>x.blocked)?tr('filtered'):tr('empty')):tr('waiting'))+'</p>'+(st.phase==='ready'?button('hello',tr('hi'),'','cs-action cg-hello'):'')+'</div>':'');
 if(field&&field.__html!==fieldHTML){field.innerHTML=fieldHTML;field.__html=fieldHTML;}
 if(gal){gal.setAttribute('aria-label',tr('onPlanet')+': '+gx.names.join(', '));gal.setAttribute('data-streams',String(gx.lines.length));if(gx.me&&gal.style)gal.style.setProperty('--me-x',gx.me.x+'px'),gal.style.setProperty('--me-y',gx.me.y+'px');}
 if(sk)sk.set(gx.lines,D.documentElement.dataset&&D.documentElement.dataset.theme==='light');watch();if(active()&&!D.hidden){if(!wasOn)onShow();else{if(gal&&!gal.__intro&&Date.now()-enterAt<600)intro();skyStart();}}
 if(room&&W.ResizeObserver&&ro!==room.__ro){if(ro)ro.disconnect();let lastSz='';ro=new W.ResizeObserver(()=>{const sz=room.clientWidth+'x'+room.clientHeight;if(sz===lastSz)return;lastSz=sz;clearTimeout(W.__cgRo);W.__cgRo=setTimeout(()=>{if(active()){refresh();if(sk)sk.resize();}},90);});ro.observe(room);room.__ro=ro;}
 const tt=q('#cgThreadTitle');if(tt)tt.textContent=tr('history');const cx=q('#cgClose');if(cx&&cx.setAttribute)cx.setAttribute('aria-label',tr('back'));
 dmCheck(ms);
 if(!W.LowiCompanionCore&&mateTries<20){mateTries++;setTimeout(refresh,1500);}
 const empty=st.phase==='ready'?(Object.values(prefs.blocks).some(x=>x.blocked)?tr('filtered'):tr('empty')):tr('waiting');
 const shown=ms.filter(x=>!x.demo&&!x.bot&&!blocked(x.uid));
 const html=shown.length?shown.map((m,i)=>renderMessage(m,ms,shown[i-1],shown[i+1])).join(''):'<div class="cs-empty"><span class="cs-lantern" aria-hidden="true">✧</span><b>'+tr('emptyTitle')+'</b><p>'+empty+'</p>'+(st.phase==='ready'?button('hello',tr('hi')):'')+'</div>';
 if(list.__html!==html){list.innerHTML=html;list.__html=html;if(near||ownNew)list.scrollTop=list.scrollHeight;else list.scrollTop=y;if(fk){const b=[...list.querySelectorAll('[data-chat]')].find(b=>b.dataset.chat===fk.a&&b.dataset.id===fk.id&&b.dataset.uid===fk.uid&&b.dataset.emoji===fk.em);if(b)b.focus({preventScroll:true});}}
 if(ownNew)newCount=0;if(ms.length>lastCount&&!near&&!ownNew){newCount+=ms.length-lastCount;if(!isQuiet())q('#csAnnounce').textContent=tr('newMessages');}lastCount=ms.length;
 q('#csJump').innerHTML=newCount&&!near&&!ownNew?button('latest',tr('newMessages'),'','cs-jump'):'';
 const parent=ms.find(x=>x.id===ds.draft.reply);q('#csReply').innerHTML=ds.draft.reply?'<div class="cm-replybar"><span>'+tr('replying')+' <b>'+esc(parent?parent.by:tr('gone'))+'</b></span>'+button('noreply','×','aria-label="'+tr('cancel')+'"','')+'</div>':'';
 const inp=q('#cmInput');if(inp.value!==ds.draft.text)inp.value=ds.draft.text;const selN=sel&&(roster().get(sel)||{}).n;inp.placeholder=selN?fill('writeTo',selN):tr('message');inp.setAttribute('aria-label',inp.placeholder);inp.setAttribute('aria-describedby','csDraft csNotice');
 q('#cmSend').setAttribute('aria-label',tr('send'));const toBot=!!(sel&&botOf(sel));q('#cmSend').disabled=(!scope&&!toBot)||!inp.value.trim()||(!toBot&&(ds.busy||navigator.onLine===false));
 q('#csDraft').textContent=ds.storageOK?(ds.draft.text?tr('draft'):selN?fill('hintTo',selN):tr('hint')):tr('volatile');q('#csCount').textContent=inp.value.length+'/600';q('#csNotice').textContent=notice;
 q('#cmList').setAttribute('aria-label',tr('square'));q('#csAnnounce').setAttribute('aria-live',isQuiet()?'off':'polite');mentions();fit();
}
function refresh(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;ensureScope();if(store){store.confirm(H.messages());if(transport.state().phase==='ready'){cache=H.messages().map(({id,uid,by,t,ts,re})=>({id,uid,by,t,ts,re,rx:{}}));const json=JSON.stringify(cache);if(json!==cacheJSON){cacheJSON=json;K.write(deviceStorage,cacheKey(),{messages:cache});}}}const el=D.getElementById('cmPaneChat');if(el)mount(el);loadExtras();});}
function mentions(){const inp=D.getElementById('cmInput'),box=D.getElementById('cmMention');if(!inp||!box)return;const match=inp.value.match(/@([\p{L}\p{N}_-]*)$/u);const people=new Map();for(const msg of messages()){if(msg.uid!==scope&&!blocked(msg.uid))people.set(msg.uid,{uid:msg.uid,n:msg.by});}for(const p of roster().values())if(!people.has(p.uid))people.set(p.uid,p);box.innerHTML=match?[...people.values()].filter(p=>p.n.toLocaleLowerCase().startsWith(match[1].toLocaleLowerCase())).slice(0,4).map(p=>button('mention','@'+esc(p.n),'data-name="'+esc(p.n)+'"')).join(''):'';}
function draft(text,reply){if(store)store.setDraft(text,reply);}
function comment(who){draft(who?'@'+who+' ':'',null);refresh();focusInput();}
function focusInput(){const i=D.getElementById('cmInput');if(i)i.focus({preventScroll:true});}
function botSend(b){const ds=draftState(),inp=D.getElementById('cmInput'),t=String(ds.draft.text||(inp&&inp.value)||'').trim();if(!t)return;botSay(b.uid,'me',t);draft('',null);if(inp)inp.value='';notice='';
 clearTimeout(botTimer);botTyping='';refresh();const wait=900+Math.min(1600,t.length*25);
 botTimer=setTimeout(()=>{botTyping=b.uid;refresh();botTimer=setTimeout(()=>{botTyping='';botSay(b.uid,'bot',G.botReply(b,t,lang()));speak=b.uid;clearTimeout(speakTimer);speakTimer=setTimeout(()=>{speak='';refresh();},3400);refresh();},1100+Math.min(1400,t.length*18));},wait);}
async function send(retryId){if(!retryId&&sel&&botOf(sel)){botSend(botOf(sel));return;}if(!store||navigator.onLine===false){notice=tr('offline');refresh();return;}const m=own(),name=String(m.n||'').trim();if(!name){notice=tr('name');refresh();return;}notice='';if(!retryId&&sel&&G){const ds=draftState(),p=roster().get(sel);if(p&&ds.draft.text.trim()){const t=G.direct(ds.draft.text,p.n);if(t!==ds.draft.text)draft(t,ds.draft.reply);}}try{await store.submit(name,retryId);}catch(e){notice=tr('sendFailed');}refresh();}
function resultText(el,t){if(el)el.textContent=t;}
function sheet(html){return H.sheet('<div class="cs-sheet" data-noi18n data-sfx="none">'+html+'</div>');}
function settings(){const m=own(),shared=K.identity(identities.get(scope)),row=identities.get(scope)||{};const cp=matePref();sheet('<h2>'+tr('presence')+'</h2><div class="cs-pub cp-pubme">'+mate(scope,'set')+'<div><b>'+esc(m.n||tr('you'))+'</b></div></div><form data-chat-form="mate"><label>'+tr('mateShare')+' <input type="checkbox" name="share" '+(cp.share?'checked':'')+'></label><p>'+tr('mateNote')+'</p><button class="cs-submit" data-sfx="none">'+tr('save')+'</button><div class="cs-result" role="status"></div></form><p>'+tr('noRouting')+'</p><p>'+tr('style')+': <b>'+esc(K.type(m.t)||tr('optional'))+'</b> · '+tr(shared.t&&shared.t===K.type(m.t)?'sharedType':'private')+'</p><p>'+tr('privacyNote')+'</p><form data-chat-form="sharing"><label>'+tr('shareType')+' <input type="checkbox" name="type" '+(row.share_personality?'checked':'')+(!K.type(m.t)?' disabled':'')+'></label><label>'+tr('shareSign')+' <input type="checkbox" name="sign" '+(row.share_sign?'checked':'')+(!K.SIGNS.includes(m.s)?' disabled':'')+'></label><button class="cs-submit" data-sfx="none">'+tr('publish')+'</button><div class="cs-result" role="status"></div></form><h2 style="margin-top:24px">'+tr('quiet')+'</h2><p>'+tr('quietDesc')+'</p><form data-chat-form="quiet"><label>'+tr('quiet')+'<input type="checkbox" name="enabled" '+(prefs.quietEnabled!==false?'checked':'')+'></label><div class="cs-hours"><label>'+tr('from')+' <input aria-label="'+tr('from')+'" type="number" name="start" min="0" max="23" value="'+(prefs.quietStart??22)+'" required></label><label>'+tr('until')+' <input aria-label="'+tr('until')+'" type="number" name="end" min="0" max="23" value="'+(prefs.quietEnd??8)+'" required></label></div><button class="cs-submit" data-sfx="none">'+tr('saveQuiet')+'</button><div class="cs-result" role="status"></div></form><h2 style="margin-top:24px">'+tr('blocked')+'</h2><div id="csBlockedList">'+blockList()+'</div><p class="cs-result" id="csBlockResult" role="status"></p>'+(extrasAttempt==='failed'?'<p>'+tr('extrasMissing')+'</p>':''));}
function blockList(){const ids=Object.keys(prefs.blocks).filter(id=>prefs.blocks[id].blocked);return ids.length?ids.map(id=>'<div class="cs-blockrow"><span>'+esc(prefs.blocks[id].name||'Member')+'</span>'+button('unblock',tr('unblock'),'data-uid="'+esc(id)+'"')+'</div>').join(''):'<p>'+tr('noBlocked')+'</p>';}
function matePref(){try{const v=JSON.parse(localStorage.getItem('lowispike.companion.v1')||'null')||{};return {share:v.share!==false,traits:v.traits!==false,born:+v.born||0};}catch(e){return {share:true,traits:true,born:0};}}
function botProfile(b){const C=W.LowiCompanionCore,l=lang(),loc=['en-GB','de-DE','es-ES'][Math.max(0,l)];let form='';try{form=C&&C.formName?C.formName(b.stage,b.el,['en','de','es'][Math.max(0,l)]):'';}catch(e){}
 const d=s=>{try{return new Date(s).toLocaleDateString(loc,{day:'numeric',month:'long',year:'numeric'});}catch(e){return String(s);}};
 const row=(k,v)=>'<div class="cg-prow"><span>'+esc(k)+'</span><b>'+esc(v)+'</b></div>';
 sheet('<h2>'+esc(b.n)+' <span class="cg-bottag">'+tr('botTag')+'</span></h2><div class="cs-pub cg-pbot">'+mate(b.uid,'sh'+sid(b.uid))+'<div><b>'+esc(b.mate)+'</b><br>'+esc(form)+' · '+esc(fill('levelN',b.lv))+'</div></div>'+
  '<div class="cg-prows">'+row(tr('companion'),b.mate+(form?' · '+form:''))+row(tr('levelN').replace('{n}','').trim()||'Level',String(b.lv)+' · '+b.xp+' XP')+row(tr('born'),d(b.bday)+' · '+fill('ageN',b.age))+row(tr('sign'),b.sign)+row(tr('withUs'),d(b.since))+'</div>'+
  '<p class="cg-pline">“'+esc(b.line[Math.max(0,l)])+'”</p><p>'+tr('botNote')+'</p>'+button('select-close',esc(fill('talkBtn',b.n)),'data-uid="'+esc(b.uid)+'"','cs-action'));}
function openProfile(id,name){const bt=botOf(id);if(bt){botProfile(bt);return;}const p=profile(id,name);sheet('<h2>'+tr('profile')+'</h2><div class="cs-pub">'+mate(id,'sh'+sid(id))+'<div><b>'+esc(p.n)+'</b><br>'+esc([p.t,p.s].filter(Boolean).join(' · ')||tr('noDetails'))+'</div></div><p>'+tr('profileNote')+'</p>'+(id!==scope?'<p>'+tr('blockNote')+'</p>'+button('block',tr('block'),'data-uid="'+esc(id)+'" data-name="'+esc(p.n)+'"')+'<p class="cs-result" id="csBlockResult" role="status"></p>':button('settings',tr('controls'))));}
function openReport(mid){const m=messages().find(x=>x.id===mid);if(!m||m.uid===scope)return;sheet('<h2>'+tr('report')+'</h2><p>'+tr('reportDesc')+'</p><form data-chat-form="report" data-mid="'+esc(mid)+'"><select name="reason" aria-label="'+tr('report')+'">'+['harassment','spam','privacy','unsafe'].map(v=>'<option value="'+v+'">'+tr(v)+'</option>').join('')+'</select><button class="cs-submit" data-sfx="none">'+tr('sendReport')+'</button><p class="cs-result" role="status"></p></form>'+button('block',tr('block'),'data-uid="'+esc(m.uid)+'" data-name="'+esc(m.by)+'"')+'<p class="cs-result" id="csBlockResult" role="status"></p>');}
async function writeBlock(id){const actor=scope,entry=prefs.blocks[id];if(!entry||!entry.dirty)return true;try{if(entry.blocked){const ack=await transport.table('community_blocks',(t,u)=>t.upsert({user_id:u,blocked_user_id:id},{onConflict:'user_id,blocked_user_id'}).select('blocked_user_id'));if(!ack||!ack.some(r=>r.blocked_user_id===id))throw new Error('ack');}else await transport.table('community_blocks',(t,u)=>t.delete().eq('user_id',u).eq('blocked_user_id',id));if(actor!==scope)return false;if(prefs.blocks[id]===entry){entry.dirty=false;persist();}return true;}catch(e){return false;}}
function syncBlock(id){const key=scope+':'+id,prior=blockJobs.get(key);if(prior)return prior.then(()=>syncBlock(id));const job=writeBlock(id);blockJobs.set(key,job);return job.finally(()=>{if(blockJobs.get(key)===job)blockJobs.delete(key);});}

async function blockPerson(id,name,on){if(!scope||!id||id===scope)return;const actor=scope;prefs.blocks[id]={blocked:on,name:name||prefs.blocks[id]?.name||'Member',dirty:true};const saved=persist();pick='';if(draftState().draft.reply&& !messages().some(m=>m.id===draftState().draft.reply))draft(draftState().draft.text,null);refresh();resultText(D.getElementById('csBlockResult'),saved?tr('blockLocal'):tr('blockStorage'));const ok=await syncBlock(id);if(actor!==scope)return;resultText(D.getElementById('csBlockResult'),ok?tr('blockSynced'):tr('blockLocal'));const b=D.getElementById('csBlockedList');if(b)b.innerHTML=blockList();}
async function loadExtras(force){
 if(!scope||extrasFlight||navigator.onLine===false)return;const ids=[...new Set([scope,...H.messages().map(m=>m.uid),...gxIds])].filter(Boolean).sort(),signature=ids.join(',');if(!force&&extrasAttempt===signature||!force&&extrasAttempt==='failed')return;extrasAttempt=signature;const actor=scope;
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
D.addEventListener('input',e=>{if(e.target.id!=='cmInput')return;draft(e.target.value,draftState().draft.reply);if(!store){const sb=D.getElementById('cmSend');if(sb)sb.disabled=!(sel&&botOf(sel))||!e.target.value.trim();}mentions();});
D.addEventListener('keydown',e=>{if(e.key==='Escape'&&threadOpen&&active()&&!D.querySelector('.r2-ov.on')){thread(false);refresh();return;}if(e.target.id==='cmInput'&&e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();send();}});
D.addEventListener('submit',e=>{const f=e.target;if(!f.matches('form[data-chat-form]'))return;e.preventDefault();e.stopPropagation();if(f.dataset.sent!=='1')submitForm(f);});
D.addEventListener('click',async e=>{const b=e.target.closest&&e.target.closest('[data-chat]');if(!b){const bub=e.target.closest&&e.target.closest('#cmPaneChat [data-chat-bub]');if(bub&&!(W.getSelection&&String(W.getSelection()).trim())){const mid=bub.getAttribute('data-chat-bub'),m=messages().find(x=>x.id===mid);if(m&&!m.status){openId=openId===mid?'':mid;if(pick&&pick!==openId)pick='';refresh();}}return;}e.preventDefault();e.stopPropagation();const a=b.dataset.chat,id=b.dataset.id;
 if(a==='send')send();else if(a==='reload'){transport.reload();loadExtras(true);}else if(a==='settings')settings();else if(a==='profile')openProfile(b.dataset.uid,b.dataset.name);else if(a==='select'){sel=sel===b.dataset.uid?'':b.dataset.uid;refresh();}else if(a==='to-all'){sel='';refresh();}else if(a==='select-close'){sel=b.dataset.uid||'';try{if(W.LowiR2&&W.LowiR2.close)W.LowiR2.close();}catch(x){}refresh();}else if(a==='thread'){thread(true,id);refresh();}else if(a==='history'){thread(!threadOpen);refresh();}else if(a==='close-thread'){thread(false);refresh();const h=D.querySelector('#cgTo .cg-hist');if(h&&h.focus)h.focus({preventScroll:true});}else if(a==='open-galaxy')openGalaxy(b.dataset.uid);else if(a==='hello'){draft(tr('hiText'),null);refresh();focusInput();}else if(a==='more'){openId=openId===id?'':id;if(pick&&pick!==openId)pick='';refresh();}else if(a==='pick'){pick=pick===id?'':id;if(pick)openId=id;refresh();}else if(a==='reply'){openId='';pick='';draft(draftState().draft.text,id);refresh();focusInput();}else if(a==='noreply'){draft(draftState().draft.text,null);refresh();focusInput();}else if(a==='mention'){draft((D.getElementById('cmInput').value||'').replace(/@[\p{L}\p{N}_-]*$/u,'@'+b.dataset.name+' '),draftState().draft.reply);refresh();focusInput();}else if(a==='latest'){const l=D.getElementById('cmList');l.scrollTop=l.scrollHeight;newCount=0;refresh();}else if(a==='retry-send')send(id);else if(a==='discard'){store.discard(id);refresh();}else if(a==='react'){pick='';openId='';try{await transport.react(id,b.dataset.emoji,own().n);}catch(x){notice=tr('reactFailed');}refresh();}else if(a==='report')openReport(id);else if(a==='block')blockPerson(b.dataset.uid,b.dataset.name,true);else if(a==='unblock')blockPerson(b.dataset.uid,'',false);else if(a==='delete'){
  if(armed!==id){armed=id;clearTimeout(armTimer);armTimer=setTimeout(()=>{armed='';refresh();},3500);refresh();return;}armed='';b.disabled=true;b.textContent=tr('deleting');try{await transport.remove(id);}catch(x){notice=tr('deleteFailed');}refresh();}
});
D.addEventListener('focusin',fit);D.addEventListener('focusout',()=>requestAnimationFrame(fit));W.addEventListener('resize',()=>{fit();clearTimeout(W.__cpResize);W.__cpResize=setTimeout(()=>{if(active()){refresh();if(sk)sk.resize();}},120);});if(W.visualViewport){W.visualViewport.addEventListener('resize',fit);W.visualViewport.addEventListener('scroll',fit);}
D.addEventListener('lowi:chat',e=>{ensureScope();transport.notify(e.detail);if(e.detail&&['ready','reconnect'].includes(e.detail.type)){transport.reload();loadExtras(true);}refresh();});
W.addEventListener('online',()=>{ensureScope();transport.reload();loadExtras(true);});W.addEventListener('offline',refresh);W.addEventListener('storage',e=>{if(e.key===prefsKey()){prefs=K.read(deviceStorage,prefsKey(),{});prefs.blocks=prefs.blocks||{};refresh();}});
D.addEventListener('visibilitychange',()=>{onShow();if(!D.hidden){transport.reload();loadExtras(true);refresh();}});
try{if(navigator.serviceWorker&&navigator.serviceWorker.addEventListener)navigator.serviceWorker.addEventListener('message',e=>{if(e.data&&e.data.cgTab==='foryou')openGalaxy('');});}catch(e){}
W.LowiCommunity={mount,refresh,send,comment,isQuiet,unread,messageHTML:renderMessage,mentions,fit,settings,bots:()=>botList().slice(),select:uid=>{sel=uid||'';refresh();},thread:(o,id)=>{thread(o,id);refresh();}};H.install(W.LowiCommunity);ensureScope();refresh();setInterval(()=>{if(active()){refresh();loadExtras(true);}},60000);
})(window,document);
