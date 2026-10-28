/* Community planet: one shared room. Members appear as their companion on a planet; messages are speech bubbles from that companion. Consent-based identity. */
(function(W,D){
'use strict';
if(W.LowiCommunity)return;
const K=W.LowiChatCore, H=W.LowiCommunityHost;if(!K||!H||!W.LowiCommunityCloud)return;
const esc=K.esc;
const deviceStorage={getItem:k=>localStorage.getItem(k),setItem:(k,v)=>localStorage.setItem(k,v)};
const COPY={
 square:['Community galaxy','Community-Galaxie','Galaxia de la comunidad'],
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
 reactShort:['React','Reagieren','Reaccionar'],
 delete:['Delete','Löschen','Eliminar'],
 deleting:['Deleting…','Wird gelöscht…','Eliminando…'],
 confirmDelete:['Delete your message?','Deine Nachricht löschen?','¿Eliminar tu mensaje?'],
 deleteFailed:['Deletion was not confirmed. Try again.','Löschen wurde nicht bestätigt. Versuch es erneut.','No se confirmó la eliminación. Reintenta.'],
 sending:['Sending…','Wird gesendet…','Enviando…'],
 unconfirmed:['Delivery not confirmed · draft recoverable','Zustellung nicht bestätigt · Entwurf wiederherstellbar','Entrega sin confirmar · borrador recuperable'],
 checkRetry:['Check & retry','Prüfen & erneut senden','Comprobar y reintentar'],
 discard:['Dismiss draft','Entwurf verwerfen','Descartar borrador'],
 /* Oct 20 (ship sweep): plain words; a retry still reuses the same message id, so it can never post twice */
 sendFailed:['Not sent yet. Your message is still here: tap send to try again.','Noch nicht gesendet. Deine Nachricht ist noch da: Tippe auf Senden, um es erneut zu versuchen.','Aún no enviado. Tu mensaje sigue aquí: toca enviar para intentarlo de nuevo.'],
 sendOffline:['You are offline. Your message stays here: send it when you are back online.','Du bist offline. Deine Nachricht bleibt hier: Sende sie, wenn du wieder online bist.','Estás sin conexión. Tu mensaje se queda aquí: envíalo cuando vuelvas a tener conexión.'],
 reactFailed:['Reaction not confirmed. Please try again.','Reaktion nicht bestätigt. Bitte erneut versuchen.','Reacción sin confirmar. Vuelve a intentarlo.'],
 name:['Add your profile name before sending.','Ergänze vor dem Senden deinen Profilnamen.','Añade tu nombre de perfil antes de enviar.'],
 newMessages:['New messages','Neue Nachrichten','Mensajes nuevos'],earlier:['Show earlier messages','Ältere Nachrichten zeigen','Ver mensajes anteriores'],
 profile:['Community profile','Community-Profil','Perfil de comunidad'],
 profileNote:['Only details explicitly shared for the galaxy appear here.','Hier erscheinen nur ausdrücklich für die Galaxie geteilte Angaben.','Aquí solo aparecen datos compartidos expresamente para la galaxia.'],
 noDetails:['Personality and star sign are private.','Persönlichkeit und Sternzeichen sind privat.','La personalidad y el signo son privados.'],
 noRouting:['Your personality type only appears on your profile card, never in the chat itself.','Dein Persönlichkeitstyp erscheint nur auf deiner Profilkarte, nie im Chat selbst.','Tu tipo de personalidad solo aparece en tu tarjeta de perfil, nunca en el chat.'],
 privacyNote:['Your birth year, age, food logs, body details and macros are never included in this chat profile. No contacts are synced.','Geburtsjahr, Alter, Essensprotokoll, Körperdaten und Makros gehören nie zu diesem Chatprofil. Keine Kontakte werden synchronisiert.','El año de nacimiento, la edad, las comidas, los datos corporales y los macros nunca se incluyen en este perfil de chat. No se sincronizan contactos.'],
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
 history:['Chat','Chat','Chat'],
 newPic:['New picture','Neues Bild','Foto nueva'],photoBtn:['Send a photo','Foto senden','Enviar foto'],foodLook:['{c} is looking at your food…','{c} schaut sich dein Essen an…','{c} está mirando tu comida…'],foodWait:['Sending as soon as {c} is done…','Wird gesendet, sobald {c} fertig ist…','Se envía en cuanto {c} termine…'],foodName:['Name of the dish','Name des Gerichts','Nombre del plato'],foodProt:['protein','Eiweiß','proteína'],foodNet:['net carbs','Netto-KH','HC netos'],foodComp:['your companion','dein Begleiter','tu compañero'],
 photoReady:['Photo ready. Add a caption or just send.','Foto bereit. Schreib etwas dazu oder sende direkt.','Foto lista. Añade un texto o envíala.'],photoRemove:['Remove photo','Foto entfernen','Quitar foto'],photoSending:['Sending photo…','Foto wird gesendet …','Enviando foto…'],photoFailed:['Photo not sent. Check your connection and try again.','Foto nicht gesendet. Prüfe die Verbindung und versuch es erneut.','La foto no se envió. Revisa la conexión e inténtalo de nuevo.'],photoBad:['That file could not be read as a photo.','Diese Datei konnte nicht als Foto gelesen werden.','Ese archivo no se pudo leer como foto.'],photoBig:['That photo is too large (25 MB max).','Das Foto ist zu groß (max. 25 MB).','La foto es demasiado grande (máx. 25 MB).'],photoBots:['Photos go to real people, not galaxy bots.','Fotos gehen an echte Menschen, nicht an Galaxie-Bots.','Las fotos van a personas reales, no a bots.'],photoNote:['Location and camera details are removed before it is sent.','Standort- und Kameradaten werden vor dem Senden entfernt.','Los datos de ubicación y cámara se quitan antes de enviar.'],pcChat:['Chat','Chat','Chat'],pcEnergy:['Send energy','Energie senden','Enviar energía'],energyPing:['⚡ {n} sent you energy','⚡ {n} hat dir Energie geschickt','⚡ {n} te envió energía'],pcEnergyNo:['Energy can only go to real members.','Energie geht nur an echte Mitglieder.','La energía solo va a miembros reales.'],pcSign:['Star sign','Sternzeichen','Signo'],pcBday:['Birthday','Geburtstag','Cumpleaños'],pcType:['Personality','Persönlichkeit','Personalidad'],pcLevel:['Level','Level','Nivel'],pcNotShared:['Not shared','Nicht geteilt','No compartido'],pcOnlyYou:['only you see this','nur für dich sichtbar','solo tú lo ves'],pcYou:['This is you','Das bist du','Eres tú'],pcLast:['Last message {n}','Letzte Nachricht {n}','Último mensaje {n}'],pcQuiet:['No recent messages here','Hier keine neuen Nachrichten','Sin mensajes recientes aquí'],pcLiveNote:['Status comes only from their last message in this chat. LOWiSPIKE never tracks location.','Der Status stammt nur aus der letzten Nachricht in diesem Chat. LOWiSPIKE verfolgt nie den Standort.','El estado viene solo de su último mensaje en este chat. LOWiSPIKE nunca rastrea la ubicación.'],pcSharedNote:['Everyone in Community sees each card\'s birthday (day and month, never the year) with a countdown, and the star sign. Personality shows when the person added one.','In der Community sieht jede Person auf jeder Karte den Geburtstag (Tag und Monat, nie das Jahr) mit Countdown und das Sternzeichen. Die Persönlichkeit erscheint, wenn die Person sie eingetragen hat.','En la comunidad todos ven en cada tarjeta el cumpleaños (día y mes, nunca el año) con cuenta atrás y el signo. La personalidad aparece si la persona la añadió.'],pcNotYet:['Not added yet','Noch nicht eingetragen','Aún no añadido'],pcSoon:['Birthday and star sign show here once this member opens the updated app with a birthday saved.','Geburtstag und Sternzeichen erscheinen hier, sobald diese Person die neue App mit gespeichertem Geburtstag öffnet.','El cumpleaños y el signo aparecerán aquí cuando esta persona abra la app actualizada con su cumpleaños guardado.'],psAddBday:['Add my birthday','Geburtstag eintragen','Añadir mi cumpleaños'],psSaved:['Saved. Your card shows it now.','Gespeichert. Deine Karte zeigt ihn jetzt.','Guardado. Tu tarjeta ya lo muestra.'],psTitle:['Your Community card','Deine Community-Karte','Tu tarjeta de la comunidad'],psWhy:['In Community everyone shows their birthday with a countdown and their star sign, so you can celebrate each other. Only the day and month are shown, never the year or your age. Your personality type shows too if you have one.','In der Community zeigt jede Person ihren Geburtstag mit Countdown und ihr Sternzeichen, damit ihr euch gegenseitig feiern könnt. Nur Tag und Monat, nie das Jahr oder dein Alter. Deine Persönlichkeit erscheint auch, falls du sie eingetragen hast.','En la comunidad cada persona muestra su cumpleaños con cuenta atrás y su signo, para que os podáis felicitar. Solo el día y el mes, nunca el año ni tu edad. Tu tipo de personalidad también aparece si lo tienes.'],psShows:['Your card will show','Deine Karte zeigt','Tu tarjeta mostrará'],psYes:['Share on my card','Auf meiner Karte teilen','Compartir en mi tarjeta'],psLater:['Not now','Jetzt nicht','Ahora no'],psNeedBday:['Add your birthday first','Trag zuerst deinen Geburtstag ein','Primero añade tu cumpleaños'],psBdayLabel:['Your birthday','Dein Geburtstag','Tu cumpleaños'],psDone:['Shared on your card.','Auf deiner Karte geteilt.','Compartido en tu tarjeta.'],psOff:['Not shared. Your card shows nothing.','Nicht geteilt. Deine Karte zeigt nichts.','No compartido. Tu tarjeta no muestra nada.'],psNotYet:['not shared yet','noch nicht geteilt','aún no compartido'],psShareNow:['Share birthday & star sign','Geburtstag & Sternzeichen teilen','Compartir cumpleaños y signo'],psTest:['Take the free personality test','Kostenlosen Persönlichkeitstest machen','Hacer el test de personalidad gratis'],psSetType:['I know my type','Ich kenne meinen Typ','Ya sé mi tipo'],psNoType:['None yet','Noch keiner','Aún no'],psShareAll:['Share my birthday (day and month), star sign and personality on my card','Meinen Geburtstag (Tag und Monat), mein Sternzeichen und meine Persönlichkeit auf meiner Karte teilen','Compartir mi cumpleaños (día y mes), mi signo y mi personalidad en mi tarjeta'],pcPrivate:['private','privat','privado'],pcSharedTag:['shared','geteilt','compartido'],
 photoOf:['Photo from {n}','Foto von {n}','Foto de {n}'],mealOf:['Meal from {n}','Mahlzeit von {n}','Comida de {n}'],mealLow:['Insulin-friendly','Insulinfreundlich','Apto para la insulina'],mealMid:['Not insulin-friendly','Nicht insulinfreundlich','No apto para la insulina'],mealHigh:['Not insulin-friendly','Nicht insulinfreundlich','No apto para la insulina'],
 photoTap:['Tap to open picture','Tippen, um das Bild zu öffnen','Toca para abrir la foto'],
 voiceBtn:['Record a voice note','Sprachnachricht aufnehmen','Grabar una nota de voz'],
 voiceNote:['Voice note','Sprachnachricht','Nota de voz'],
 voicePlay:['Play voice note from {n}','Sprachnachricht von {n} abspielen','Reproducir nota de voz de {n}'],
 recording:['Recording a voice note','Sprachnachricht wird aufgenommen','Grabando una nota de voz'],
 recHold:['Release to send · slide left to cancel','Loslassen zum Senden · nach links schieben zum Abbrechen','Suelta para enviar · desliza a la izquierda para cancelar'],
 recTap:['Recording · tap the arrow to send','Aufnahme · tippe auf den Pfeil zum Senden','Grabando · toca la flecha para enviar'],
 recCancel:['Delete recording','Aufnahme löschen','Borrar grabación'],
 recSend:['Send voice note','Sprachnachricht senden','Enviar nota de voz'],
 micAsk:['Allow the microphone to record…','Erlaube das Mikrofon für die Aufnahme …','Permite el micrófono para grabar…'],
 micOffT:['Microphone is off','Mikrofon ist aus','El micrófono está desactivado'],
 micDenied:['Allow it in Settings › Apps › Safari › Microphone, then tap Try again.','Erlaube es in Einstellungen › Apps › Safari › Mikrofon, dann tippe auf Erneut versuchen.','Permítelo en Ajustes › Apps › Safari › Micrófono y toca Reintentar.'],
 micAskT:['Allow the microphone','Mikrofon erlauben','Permite el micrófono'],
 micAskTap:['Tap Try again and choose Allow when asked.','Tippe auf Erneut versuchen und wähle Erlauben, wenn iOS fragt.','Toca Reintentar y elige Permitir cuando te lo pida.'],
 micBusyT:['Microphone is busy','Mikrofon ist belegt','El micrófono está ocupado'],
 micBusy:['Another app is using it. Close it and try again.','Eine andere App nutzt es gerade. Schließ sie und versuch es nochmal.','Otra app lo está usando. Ciérrala y vuelve a intentarlo.'],
 micBtn:['Tap to dictate · hold for a voice note','Tippen: diktieren · Halten: Sprachnachricht','Toca: dictar · Mantén: nota de voz'],
 micNoneT:['No microphone found','Kein Mikrofon gefunden','No se encontró micrófono'],
 micNone:['This device has no microphone LOWiSPIKE can use.','Dieses Gerät hat kein Mikrofon, das LOWiSPIKE nutzen kann.','Este dispositivo no tiene un micrófono que LOWiSPIKE pueda usar.'],
 micOldT:['Voice notes need an update','Sprachnachrichten brauchen ein Update','Las notas de voz necesitan una actualización'],
 micOld:['Recording needs iOS 14.3 or newer, or a current browser.','Aufnehmen braucht iOS 14.3 oder neuer oder einen aktuellen Browser.','Grabar necesita iOS 14.3 o posterior, o un navegador actual.'],
 micRetry:['Try again','Erneut versuchen','Reintentar'],
 voiceShort:['Too short. Hold the mic a little longer.','Zu kurz. Halte das Mikrofon etwas länger.','Demasiado corta. Mantén el micrófono un poco más.'],
 voiceSending:['Sending voice note…','Sprachnachricht wird gesendet …','Enviando nota de voz…'],
 voiceFailed:['Voice note not sent. Check your connection and try again.','Sprachnachricht nicht gesendet. Prüfe die Verbindung und versuch es erneut.','La nota de voz no se envió. Revisa la conexión e inténtalo de nuevo.'],
 voiceBad:['This voice note cannot play on this device.','Diese Sprachnachricht kann auf diesem Gerät nicht abgespielt werden.','Esta nota de voz no se puede reproducir en este dispositivo.'],
 mediaSignIn:['Sign in to send photos and voice notes.','Melde dich an, um Fotos und Sprachnachrichten zu senden.','Inicia sesión para enviar fotos y notas de voz.'],
 streamOn:['Connected to {n}. Your words, photos and voice notes go to them.','Verbunden mit {n}. Deine Worte, Fotos und Sprachnachrichten gehen an sie.','Conectado con {n}. Tus palabras, fotos y notas de voz van para esa persona.'],
 botPicR:['Oh, I love this picture! Thank you for showing me ✨','Oh, ich liebe dieses Bild! Danke, dass du es mir zeigst ✨','¡Me encanta esta foto! Gracias por enseñármela ✨'],
 botVoiceR:['I listened to your voice note. It is so nice to hear you! 💙','Ich habe deine Sprachnachricht gehört. Schön, dich zu hören! 💙','Escuché tu nota de voz. ¡Qué bonito escucharte! 💙'],
 back:['Back to the galaxy','Zurück zur Galaxie','Volver a la galaxia'],
 toArrow:['to {n}','an {n}','para {n}'],
 toYou:['to you','an dich','para ti'],
 dmTitle:['{n} is talking to you','{n} spricht mit dir','{n} te está hablando'],
 openThread:['Open the conversation','Gespräch öffnen','Abrir la conversación'],
 close:['Close','Schließen','Cerrar'],
 optional:['Not set','Nicht festgelegt','Sin definir'],
 botTag:['Galaxy bot','Galaxie-Bot','Bot de la galaxia'],
 room:['Community room','Community-Raum','Sala de la comunidad'],
 roomVoice:['1 voice · last 24 h','1 Stimme · letzte 24 Std.','1 voz · últimas 24 h'],
 roomVoices:['{n} voices · last 24 h','{n} Stimmen · letzte 24 Std.','{n} voces · últimas 24 h'],
 roomOpen:['Open to everyone in the galaxy','Offen für alle in der Galaxie','Abierta a todos en la galaxia'],
 roomCrew:['Recent voices','Letzte Stimmen','Voces recientes'],
 /* Oct 21, Telegram/Eden-style room (Eman: "for my community copy this exact style"): floating name pill, pinned message, members, join pills */
 roomCommunity:['LOWiSPIKE Community','LOWiSPIKE Community','Comunidad LOWiSPIKE'],roomMembers:['Members','Mitglieder','Miembros'],
 roomPinned:['Pinned Message','Angeheftete Nachricht','Mensaje fijado'],
 /* 22 Oct: no default pin any more (Emmanuel never pinned it); the bar shows only what the admin pinned */
 pinMsg:['Pin','Anheften','Fijar'],unpinMsg:['Unpin','Loslösen','Desfijar'],pinGo:['Go to the pinned message','Zur angehefteten Nachricht','Ir al mensaje fijado'],pinFailed:['Could not pin. Try again.','Anheften hat nicht geklappt. Versuch es nochmal.','No se pudo fijar. Inténtalo de nuevo.'],pinGone:['The pinned message is no longer here.','Die angeheftete Nachricht ist nicht mehr da.','El mensaje fijado ya no está.'],
 roomMsg:['Message','Nachricht','Mensaje'],
 roomNoCrew:['No one has spoken here in the last 24 hours yet.','In den letzten 24 Stunden hat hier noch niemand geschrieben.','Nadie ha escrito aquí en las últimas 24 horas.'],
 linkLive:['Live','Live','En vivo'],
 linkSync:['Syncing','Verbindet','Conectando'],
 linkOff:['Offline','Offline','Sin conexión'],
 linkErr:['Not loaded','Nicht geladen','Sin cargar'],
 linkAuth:['Signed out','Abgemeldet','Sin sesión'],
 today:['Today','Heute','Hoy'],
 yesterday:['Yesterday','Gestern','Ayer'],
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
let cacheJSON='',restHeight=0,restWidth=0,roomKbH=0;
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
 store=scope?K.session({scope,storage:deviceStorage,id:()=> 'm'+crypto.randomUUID(),send:transport.send,changed:()=>{if(typingNow){typed();return;}refresh();}}):null;
 if(scope){const c=K.read(deviceStorage,cacheKey(),{});cache=Array.isArray(c.messages)?c.messages.map(K.message).filter(m=>m&&!m.demo&&!m.bot):[];transport.reload();}
}
/* Oct 19: "@Name ⚡ X sent you energy" lines (old app pings, crowd members) are hidden everywhere: chat, bubbles, unread counts */
const ENERGY_LINE=/^(@\S[^\n]*?\s)?\u26a1\s[^\n]+\s(sent you energy|hat dir Energie geschickt|te envi\u00f3 energ\u00eda)[\s!.]*$/u;
function energyLine(m){return !!(m&&typeof m.t==='string'&&ENERGY_LINE.test(m.t.trim()));}
/* Oct 25: messages from people the admin removed (hidden-accounts.js isRemoved) are hidden for everyone; the server hides them too */
function removedBy(m){try{const Hd=W.LowiHiddenAccounts;return !!(Hd&&Hd.isRemoved&&m&&m.uid&&m.uid!==scope&&Hd.isRemoved(m.uid));}catch(e){return false;}}
function messages(){const live=transport.state().phase==='ready'||H.messages().length?H.messages():cache;return K.visible(live,draftState().outbox,prefs.blocks||{},scope).filter(m=>!energyLine(m)).filter(m=>!removedBy(m));}
/* 22 Oct, admin pinning (K.pinned): the raw room rows include the pin markers that messages() hides */
function rawLive(){return transport.state().phase==='ready'||H.messages().length?H.messages():cache;}
function isAdmin(){try{return !!(scope&&W.LowiOwnerAdmin&&W.LowiOwnerAdmin.isOwner&&W.LowiOwnerAdmin.isOwner());}catch(e){return false;}}
function roomPinned(){return scope?K.pinned(rawLive()):null;}
async function dropOldMarks(keepBody){const mine=rawLive().filter(x=>x&&x.uid===scope&&!x.status&&K.pinOf(x.t)),keep=mine.filter(x=>x.t===keepBody).sort((a,b)=>(+b.ts||0)-(+a.ts||0))[0];
 for(const x of mine){if(keep&&x.id===keep.id)continue;try{await transport.remove(x.id);}catch(e){}}}
async function pinSend(body){if(!isAdmin()||!store||!body)return false;const name=String(own().n||'').trim()||'Admin';
 try{await store.submitLine(name,body);notice='';}catch(e){notice=tr('pinFailed');refresh();return false;}await dropOldMarks(body);refresh();return true;}
function pinMessage(id){const m=messages().find(x=>x.id===id);if(!m||m.status||m.local)return Promise.resolve(false);return pinSend(K.pinBody(id,plain(m)));}
function unpinRoom(){return roomPinned()?pinSend(K.unpinBody()):Promise.resolve(false);}
let pinHoldAt=0;/* the jump to the pinned message must not be undone by fit()'s stick-to-bottom (the tap focuses the bar button) */
function goPinned(id){if(!id)return;pinHoldAt=Date.now();if(stickCtl)stickCtl.release();if(!D.getElementById('cm-'+id))thread(true,id);const t=D.getElementById('cm-'+id);
 if(!t){notice=tr('pinGone');refresh();return;}const l=D.getElementById('cmList');if(l&&t.getBoundingClientRect&&l.getBoundingClientRect){const r=t.getBoundingClientRect(),lr=l.getBoundingClientRect();l.scrollTop+=Math.round(r.top-lr.top-(lr.height-r.height)/2);}else{try{t.scrollIntoView({block:'center'});}catch(e){}}
 if(t.classList){t.classList.remove('cr-flash');void t.offsetWidth;t.classList.add('cr-flash');setTimeout(()=>t.classList.remove('cr-flash'),1600);}}
/* 24 Oct 2026: someone's birthday, sign and type come from their profile row, and count only in the shared form (day + month, after consent). */
function profile(id,name){const m=own(),base=id===scope?m:H.people().find(p=>p.uid===id)||{};const P=W.LowiProfileShare,pub=id!==scope&&P?P.readPublic({bday:base.bday,mbti:base.t}):{s:'',t:'',md:null};return {uid:id,n:name||base.n||'Member',avatar:K.image(base.avatar),s:pub.s,t:pub.t,md:pub.md,lv:base.lv||1,xp:base.xp||0};}
function bubble(p,size=34){return H.bubble({...p,bday:'',w:'',streak:0},size);}
/* Companions: a member's herb form, drawn from the visual-only look code they chose to share (profiles.look).
   No shared look -> a plain spirit. Your own form is drawn locally for you only. Never a profile photo. */
function hue(id){let h=7;for(const c of String(id||''))h=(h*31+c.charCodeAt(0))>>>0;return h%360;}
function sid(v){return String(v||'').replace(/[^a-z0-9]/gi,'').slice(-12)||'x';}
function genomeFor(id){const C=W.LowiCompanionCore;if(!C)return null;const bt=botOf(id);if(bt){if(!bt.__g){try{bt.__g=C.genome({sign:{element:bt.el},personality:bt.type,palette:bt.pal},bt.stage,bt.seed);}catch(e){bt.__g=null;}}return bt.__g;}if(id&&id===scope){try{return W.LowiCompanion&&W.LowiCompanion.genome?W.LowiCompanion.genome():null;}catch(e){return null;}}const l=looks.get(id);try{return l&&C.decode?C.decode(l):null;}catch(e){return null;}}
function spirit(id,key){const h=hue(id);return '<svg class="cp-spirit" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><defs><radialGradient id="cps'+key+'" cx=".38" cy=".34" r=".72"><stop stop-color="#fff" stop-opacity=".7"/><stop offset=".55" stop-color="hsl('+h+' 52% 74%)" stop-opacity=".8"/><stop offset="1" stop-color="hsl('+h+' 42% 48%)" stop-opacity=".9"/></radialGradient></defs><path d="M50 18c19 0 33 15 33 34 0 18-14 32-33 32S17 70 17 52c0-19 14-34 33-34z" fill="url(#cps'+key+')" stroke="#fff" stroke-opacity=".75" stroke-width="2.4"/><circle cx="40" cy="54" r="4" fill="#1b1035"/><circle cx="60" cy="54" r="4" fill="#1b1035"/><circle cx="41.4" cy="52.6" r="1.4" fill="#fff"/><circle cx="61.4" cy="52.6" r="1.4" fill="#fff"/><path d="M45 63q5 4 10 0" stroke="#1b1035" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>';}
/* Oct 19 old-design purge: your own orb is the real Misty (the same cell as Home), not the old mini-blob with a smile. Round 3: friends and bots are the same glass cell with their own form (LowiCompanion.friendSVG); the mini-blob is only the fallback before it loads. */
let ownArt={at:0,svg:''};
function ownMisty(){const now=Date.now();if(ownArt.svg&&now-ownArt.at<4000)return ownArt.svg;let svg='';const T=W.LowiHerbTamagotchi;try{const c=T&&T.current&&T.current();if(c&&T.plantHTML)svg=T.plantHTML(c.m,'node',c.p,{label:String(own().n||'Misty')})||'';}catch(e){svg='';}if(!svg){const el=D.querySelector('#spBubble .tmg-plant');svg=el?el.outerHTML:'';}ownArt={at:now,svg};return svg;}
/* Oct 19, crash round 2 (E-man: kicked out while scrolling the chat / sending energy with ~58 people in the galaxy): plantHTML numbers
   every drawing with a global counter ('lh'+(++seq)), so the same companion came out as different HTML on every paint, the
   `__html` guards in paint() never held, and every paint rebuilt the WHOLE galaxy and the WHOLE chat list (~22k SVG nodes) several
   times a minute. Each drawing gets ids from who it is instead; the key suffix still keeps two drawings on one page apart. */
function stableIds(svg,id){return String(svg||'').replace(/\blh\d+/g,'lhc'+String(id||'me').replace(/[^a-z0-9]/gi,'').slice(-12));}
function mate(id,key){if(id&&(id===scope||id==='me')){const ms=ownMisty();if(ms)return stableIds('<span class="cp-form cp-own">'+ms+'</span>',id);}const g=genomeFor(id),C=W.LowiCompanionCore,F=W.LowiCompanion&&W.LowiCompanion.friendSVG;let svg='';if(g&&F){try{svg=F(g,key)||'';}catch(e){svg='';}}if(!svg&&g&&C&&C.miniSVG){try{svg=C.miniSVG(g,key);}catch(e){svg='';}}return stableIds('<span class="cp-form'+(svg?'':' cp-plain')+'">'+(svg||spirit(id,key))+'</span>',id);}
const G=W.LowiGalaxy;
let sel='',threadOpen=false,sk=null,wasOn=false,introT=0,gxIds=[],dmLive=new Set(),dmBoot=Date.now(),toastT=0,watching=false;
function hueColor(id,me){return me?'#9cdac7':'hsl('+hue(id)+' 78% 74%)';}
/* Bots: made-up galaxy companions (see LowiGalaxy.bots). Their chats live on this phone only. */
let BOTS=null,botChat=null,botTyping='',botTimer=0;
function botList(){if(!BOTS)BOTS=G&&G.bots?G.bots():[];return BOTS;}
function botOf(id){return typeof id==='string'&&id.startsWith('bot:')?botList().find(b=>b.uid===id)||null:null;}
/* Oct 23, 11:40 PM (Emmanuel, call: bots in the chat rooms clearly marked, "a dash and then bot" next to the name).
   Only accounts the app KNOWS are bots get the mark, never a guess from a name: the made-up galaxy companions (uid 'bot:...' that
   LowiGalaxy.bots() lists) and accounts the server flags (profiles.bot, read by bot-accounts.js as LowiBotAccounts). You are never
   marked; a name that already ends in "- bot" is not marked twice. Shared with the Rooms sheet as LowiBotLabel. */
const BOT_DASH=[' - bot',' - Bot',' - bot'],BOT_DASHED=/\s?[-\u2013\u2014]\s?bot\s*$/i;
/* Oct 23, 11:55 PM: the anonymous test accounts our own Circles check scripts make ("Lena", "Jonas", "Mia Test ####") are NOT bots:
   they are hidden everywhere through their own test flag (leaderboard task). If the app knows an id is a test account, it never gets "- bot". */
function isTestId(u){for(const A of [W.LowiBotAccounts,W.LowiTestAccounts]){if(!A)continue;for(const f of ['isTest','isTestAccount']){try{if(typeof A[f]==='function'&&A[f](u))return true;}catch(e){}}}return false;}
function isBotId(id,self){const u=String(id==null?'':id);if(!u||u==='me'||u===String(self===undefined?scope:self||''))return false;if(botOf(u))return true;if(isTestId(u))return false;const B=W.LowiBotAccounts;try{return !!(B&&typeof B.isBot==='function'&&B.isBot(u));}catch(e){return false;}}
function botName(n,id,l,self){const s=String(n==null?'':n);return isBotId(id,self)&&!BOT_DASHED.test(s)?s+(BOT_DASH[l==null?Math.max(0,lang()):l]||BOT_DASH[0]):s;}
function botDash(id,n){return isBotId(id)&&!BOT_DASHED.test(String(n||''))?'<span class="cs-botd" data-bot="1">'+esc(BOT_DASH[Math.max(0,lang())]||BOT_DASH[0])+'</span>':'';}
W.LowiBotLabel={isBot:isBotId,name:botName,DASH:BOT_DASH.slice()};
function botStore(){if(!botChat){try{botChat=(o => o && typeof o === "object" ? o : {})(JSON.parse(localStorage.getItem('lowi.galaxy.botchat.v1')||'{}'));}catch(e){botChat={};}}return botChat;}
function botSave(){try{localStorage.setItem('lowi.galaxy.botchat.v1',JSON.stringify(botStore()));}catch(e){}}
function botSay(uid,from,t){const st=botStore(),arr=st[uid]=st[uid]||[];arr.push({id:'b'+Date.now().toString(36)+arr.length,from,t:String(t).slice(0,500),ts:Date.now()});if(arr.length>30)arr.splice(0,arr.length-30);botSave();}
/* Oct 18, 2026: leftover test accounts (hidden-accounts.js, by account id) get no body in the galaxy; nothing is deleted */
function hiddenAcct(uid){const A=W.LowiHiddenAccounts;return !!(A&&A.isHidden(uid));}
/* support rooms (20 Oct): the galaxy shows the people in this room (here now, or who wrote in this room), not everybody who ever joined */
function inRoom(id){const R=W.LowiRooms;return !(R&&R.active&&R.active())||R.has(id);}
/* in a room, people who wrote count as "in the room" for 30 minutes (the crowd and older apps do not hold presence); at most the room cap of them */
function recentWriter(m){const R=W.LowiRooms;return !(R&&R.active&&R.active())||Date.now()-(+m.ts||0)<30*60e3;}
/* Oct 25, 2026 (Emmanuel: "remove the bots from the galaxy; every real companion stays parked there, even offline"): the Room
   galaxy is built from the shared profiles list only (G.roomMembers): no made-up bots, no account the server flags as a bot or
   test, no hidden id, one body per name. Offline people stay parked at their seat; being online only makes them glow (p.on).
   Seats come from the whole room (blocked people and your own other accounts too), so blocking someone only changes your screen.
   Chat writers with no profile row (an empty profile name, an offline start) stand in with the name they wrote under. */
function online(uid){const R=W.LowiRooms;try{if(R&&R.active&&R.active()&&R.has(uid))return true;}catch(e){}const t=recentTs.get(uid);return !!t&&Date.now()-t<10*60e3;}
let recentTs=new Map();
function roomOf(){const ms=messages();recentTs=new Map();for(const m of ms)if(m&&m.uid&&!m.demo&&!m.bot)recentTs.set(m.uid,+m.ts||0);
 const B=W.LowiBotAccounts,selfTest=(()=>{try{return !!(B&&B.isTest&&scope&&B.isTest(scope));}catch(e){return false;}})();
 let people=((H.people&&H.people())||[]).map(p=>p&&p.uid?{uid:p.uid,n:String(p.n||'').trim(),lv:p.lv||1,xp:+p.xp||0,j:+p.j||0,bot:!!p.bot,test:!!p.test&&!selfTest}:null).filter(Boolean);
 {const seen=new Set(people.map(p=>p.uid));for(let i=ms.length-1;i>=0;i--){const m=ms[i];if(m&&m.uid&&!m.demo&&!m.bot&&!seen.has(m.uid)){seen.add(m.uid);people.push({uid:m.uid,n:String(m.by||'').trim(),lv:1});}}}
 /* Oct 25: your own join date (profiles.joined_at) gives your seat in the join-ordered rows, like everyone else's */
 const me=scope?{uid:scope,n:String(own().n||'').trim(),j:(()=>{try{return +(H.joined&&H.joined())||0;}catch(e){return 0;}})()}:null;
 return G&&G.roomMembers?G.roomMembers(people,{isBot:u=>{if(botOf(u))return true;try{return !!(B&&B.isBot&&B.isBot(u));}catch(e){return false;}},isHidden:hiddenAcct,online,blocked,me}):{layout:people,shown:people};}
function roster(){const map=new Map();for(const p of roomOf().shown)if(p&&!p.me&&p.uid!==scope)map.set(p.uid,p);return map;}
function nameIdx(r){const list=[...(r||roster()).values()];if(scope&&own().n)list.push({uid:scope,n:own().n});return G?G.nameIndex(list):[];}
function latestBy(ms){const last=new Map();for(const m of ms){if(!m||m.demo||m.bot||!m.uid||blocked(m.uid))continue;last.set(m.uid,m);}return last;}
function crowd(ms,r,idx){const last=latestBy(ms),order=[],seen=new Set();const add=uid=>{if(!uid||uid===scope||seen.has(uid)||!r.has(uid))return;seen.add(uid);order.push(r.get(uid));};
 if(sel)add(sel);[...last.values()].sort((x,y)=>y.ts-x.ts).forEach(m=>{add(m.uid);const t=G&&G.targetOf(m,ms,idx);if(t)add(t.uid);});
 Object.keys(botStore()).forEach(add);[...r.values()].sort((x,y)=>(x.bot?1:0)-(y.bot?1:0)||(y.lv||0)-(x.lv||0)||String(x.n).localeCompare(String(y.n))).forEach(p=>add(p.uid));return order;}
function fill(k,n){return tr(k).replace('{n}',n);}
/* The active conversation (you and the person you picked): its newest message rides on the one line between you two. */
function convo(ms,idx){if(!sel||!G)return null;const b=botOf(sel);
 if(b){const arr=botStore()[sel]||[],m=arr[arr.length-1];return m?{t:mediaWords({t:m.t,uid:scope})||m.t,fromMe:m.from==='me',ts:m.ts,id:''}:null;}
 for(let i=ms.length-1;i>=0;i--){const m=ms[i];if(!m||m.demo||m.bot||!m.uid)continue;
  if(m.uid===scope||m.uid===sel){const t=G.targetOf(m,ms,idx);if(t&&((m.uid===scope&&t.uid===sel)||(m.uid===sel&&t.uid===scope)))return {t:mediaWords(m)||G.bubbleText(m,t),fromMe:m.uid===scope,ts:m.ts,id:m.id,status:m.status};}}
 return null;}
function mediaWords(m){const vo=voiceOf(m);if(vo)return '\u{1F3A4} '+tr('voiceNote')+' '+mmss(vo.dur);const ph=photoOf(m);return ph?(ph.meal?'\u{1F37D} '+ph.meal.name:'\u{1F4F7} '+tr('newPic')):'';}
function photoView(src,name){if(!K.image(src))return;const o=D.createElement('div');o.className='cg-photo';o.setAttribute('role','dialog');o.setAttribute('aria-label',fill('photoOf',name||''));
 o.innerHTML='<img alt="" src="'+esc(src)+'"><button type="button" class="cg-photo-x" aria-label="×">×</button>';const back=D.activeElement,close=()=>{o.remove();D.removeEventListener('keydown',key,true);try{if(back&&back.focus)back.focus({preventScroll:true});}catch(e){}},key=e=>{if(e.key==='Escape'){e.preventDefault();close();}};o.setAttribute('aria-modal','true');o.querySelector('img').alt=fill('photoOf',name||'');o.addEventListener('click',close);D.addEventListener('keydown',key,true);D.body.appendChild(o);const x=o.querySelector('.cg-photo-x');if(x)x.focus({preventScroll:true});}
function galaxy(ms,w,h,quiet){
  if(!G)return {html:'',lines:[],names:[]};
  /* Oct 16, round 5 (E-man: "tapping Joseph selected Bastian", "everyone changes places"): a map, not a seating plan. Each person
     has one fixed spot (G.mapLayout); selecting, typing, new messages and the keyboard never move anyone. place() draws the spots
     through the camera (drag to pan, pinch / double-tap to zoom), so the HTML here carries no positions at all. */
  const RM=roomOf(),r=new Map(RM.shown.filter(p=>!p.me&&p.uid!==scope).map(p=>[p.uid,p])),idx=nameIdx(r),LA=G.mapLayout(RM.layout.filter(p=>!p.me&&p.uid!==scope),scope||'me',{meJ:(RM.layout.find(p=>p.me)||{}).j||0,view:{w,h}}),L=Object.assign({},LA,{spots:LA.spots.filter(x=>x.me||r.has(x.uid))}),last=latestBy(ms),now=Date.now(),spot=new Map(L.spots.map(x=>[x.uid,x])),meSpot=L.spots[0],names=[],labels=[],lineDefs=[];
  const big=w>=640,bodyS=big?56:46,meS=big?64:54;
  /* Oct 16: chats with the galaxy bots live on this phone; their newest words go in the same avatar bubbles */
  try{const bs=botStore();for(const u in bs){const arr=bs[u];const m=arr&&arr[arr.length-1];if(!m||!m.t)continue;const k=m.from==='me'?scope:u,cur=last.get(k);if(!cur||(+cur.ts||0)<=(+m.ts||0))last.set(k,{id:'',uid:k,t:m.t,ts:m.ts||now});}}catch(e){}
  if(sel&&!spot.has(sel))sel='';
  const cv=convo(ms,idx);
  const parts=[];
  /* drawing order only (real people before bots); the spots themselves never depend on it */
  const drawOrder=L.spots.slice().sort((a,b)=>(b.me?1:0)-(a.me?1:0)||((r.get(a.uid)||{}).bot?1:0)-((r.get(b.uid)||{}).bot?1:0));
  drawOrder.forEach((x,i)=>{const me=x.me,p=me?{uid:scope,n:own().n||tr('you')}:r.get(x.uid);if(!p)return;const label=me?tr('you'):p.n;names.push(label);
   const picked=!me&&sel===x.uid,talking=speak&&speak===x.uid,size=me?meS:bodyS;
   const aria=me?(sel?tr('toEveryone'):tr('youAll')):(picked?fill('talking',label):fill('talkTo',label));
   const attrs='data-uid="'+esc(x.uid)+'" data-name="'+esc(me?own().n||'':p.n)+'" aria-label="'+esc(aria)+'"'+(me?'':' aria-pressed="'+picked+'"')+' style="--s:'+size+'px;--i:'+(i%24)+';--c:'+hueColor(x.uid,me)+'"';
   const inner='<span class="cg-orb">'+mate(me?(scope||'me'):x.uid,'g'+i)+'</span><span class="cg-name">'+esc(label)+'</span>'+(me?'':'<span class="cg-ini" aria-hidden="true">'+esc(Array.from(String(label||'?').trim())[0]||'?')+'</span>');
   parts.push(button(me?'to-all':'person',inner,attrs,'cg-body'+(me?' me':'')+(picked?' sel':'')+(talking?' speaking':'')+(me?(!scope?' cg-off':''):(p.on?' cg-live':' cg-away'))));
   /* Oct 16 (E-man: "like Snapchat's map"): every companion's newest message sits in one small bubble next to their round avatar:
      their name, then the words (or "New picture" for a photo, which opens it). Your own words always sit next to YOUR avatar.
      place() picks the side so a bubble never covers another person or name; when there is no room it shrinks to a dot. */
   const m=last.get(me?scope:x.uid),typing=!me&&botTyping===x.uid;const o=m?G.fade(m.ts,now):0;let bw=0;
   if(typing||(m&&(o>0||m.status))){const t=m&&G.targetOf(m,ms,idx),toMe=!!(t&&t.uid===scope),pic=m?(K.image(m.img||m.photo||m.image||'')||((photoOf(m)||{}).src||'')):'';
    const vo=!typing&&!pic&&m?voiceOf(m):null;
    const words=typing?tr('typing'):pic?tr('newPic'):vo?mmss(vo.dur)+' '+tr('voiceNote'):G.bubbleText(m,t);
    bw=Math.round(Math.min(Math.max(64,Math.max(words.length+(pic?5:vo?3:0),label.length)*6.4+26),Math.min(176,w-12)));
    const st=m&&m.status?'<span class="cg-st">'+tr(m.status==='sending'?'sending':'unconfirmed')+'</span>':'';
    /* Oct 16: a photo shows a small thumbnail and "Tap to open picture"; a voice note shows a glass play button with its length and progress. */
    const inner='<b class="cg-bn">'+esc(label)+'</b><span class="cg-t'+(typing?' cg-typing':'')+(pic?' cg-pict':'')+(vo?' cg-vo':'')+'">'+(typing?esc(words):pic?'<img class="cg-thumb" alt="" loading="lazy" decoding="async" src="'+esc(pic)+'">'+esc(words):vo?'<span class="cg-vplay" aria-hidden="true"></span><span class="cs-vt">'+esc(mmss(vo.dur))+'</span> '+esc(tr('voiceNote'))+'<span class="cg-vbar" aria-hidden="true"></span>':text(words))+'</span>'+st;
    const style='width:'+bw+'px;--o:'+(m&&m.status||typing?1:o)+';--c:'+hueColor(x.uid,me);
    const cls='cg-bub cg-snap'+(me?' mine':'')+(toMe?' tome':'')+(talking||typing?' pop':'')+(pic?' pic':'')+(vo?' voice':''),fr=' data-for="'+esc(x.uid)+'"';
    parts.push(vo?button('voice',inner,'data-id="'+esc(m.id)+'" data-src="'+esc(vo.src)+'" data-dur="'+vo.dur+'" aria-pressed="false" aria-label="'+esc(fill('voicePlay',label)+', '+mmss(vo.dur))+'" style="'+style+'"'+fr,cls)
     :pic?button('photo',inner,'data-id="'+esc(m.id)+'" data-src="'+esc(pic)+'" data-name="'+esc(label)+'" aria-label="'+esc(fill('photoOf',label))+'" style="'+style+'"'+fr,cls)
     :m&&m.id?button('thread',inner,'data-id="'+esc(m.id)+'" aria-label="'+esc(label+': '+(m.t||''))+' · '+tr('openThread')+'" style="'+style+'"'+fr,cls)
     :'<div class="'+cls+'" role="status" style="'+style+'"'+fr+'>'+inner+'</div>');}
   labels.push({id:x.uid,pri:picked?0:me?1:(typing||talking)?2:3,ts:m?(+m.ts||0):0,bw,size});
  });
  if(sel&&spot.has(sel)){const cvTheirs=!!(cv&&!cv.fromMe)||botTyping===sel,A=cvTheirs?sel:meSpot.uid,B=cvTheirs?meSpot.uid:sel;
   lineDefs.push({a:A,b:B,sel:true,arrow:true,from:hueColor(A,A===meSpot.uid),to:hueColor(B,B===meSpot.uid)});
   /* Oct 16: the words stay in the bubbles next to the avatars; the line between you two only carries the energy */
  }
  labels.sort((a,b)=>a.pri-b.pri||b.ts-a.ts);
  gxIds=L.spots.map(x=>x.uid).filter(u=>u&&u!=='me');
  return {html:parts.join(''),parts,map:L,spot,labels,lineDefs,lines:[],names,me:meSpot};
}
/* ---- the map camera: pins stay put, the camera moves ---- */
/* Oct 25 (Emmanuel: "when I open the circle it's zoomed in to me ... I don't want to have to zoom out all the time"): the Room opens
   fitted to everyone drawn (G.mapFit). Once you pinch, pan, scroll or double-tap yourself (camUser), your view is kept for the rest
   of the session, also when you leave Community and come back; double-tap at the closest zoom goes back to everyone. */
let cam=null,camFrozen=null,placeRaf=0,camAnim=0,camUser=false,fitMemo=null,camAnimOn=false;
function mapView(gal){const typing=D.documentElement.classList.contains('cs-chat-map-typing');const w=gal.clientWidth||360,h=gal.clientHeight||480;
  /* the centre of the map is fixed: the composer growing a chip row, or the keyboard coming up, never slides the pins.
     Only a real change of screen (rotation, iPad split view) re-centres it. */
  /* Oct 25 (readability + fit): the rule lives in G.mapViewSize. It keeps the size only while typing or for a small chip row; the
     old rule kept the first, taller size from while the Room was laying out, so the bottom row sat below the Room on small phones. */
  camFrozen=G.mapViewSize(camFrozen,w,h,typing,Date.now());
  return camFrozen;}
/* Oct 25 (Emmy shrank to "E" next to You): the energy pad's corner is kept free too (mapFit avoid), so no name lands on it */
let koRetry=0;
function fitCam(gx,v){const spots=(gx.map.spots||[]).filter(s=>gx.spot.has(s.uid)),gal=D.getElementById('cgGalaxy');
  let ko=null;try{ko=gal&&W.LowiEnergy&&W.LowiEnergy.keepOut?W.LowiEnergy.keepOut(gal):null;}catch(e){ko=null;}
  const avoid=ko&&ko.s>0?{x:Math.round(ko.x-ko.s/2),y:Math.round(ko.y-ko.s/2),w:Math.round(ko.s),h:Math.round(ko.s)}:null;
  if(avoid)koRetry=0;else if(gal&&W.LowiEnergy&&koRetry<10){koRetry++;setTimeout(schedulePlace,400);}/* pad hidden or not laid out yet (zoom-out from Home): look again shortly */
  /* Oct 25 (readability + fit, Emmanuel's iPhone: a companion hidden behind the Friends tree button): that button sits over the
     Room's bottom-left corner, so it is kept free as well, in Room pixels with a 4 px margin. */
  const av=avoid?[avoid]:[];try{const tb=gal&&gal.parentNode&&gal.parentNode.querySelector('.nm-ctree');if(tb&&tb.offsetParent){const a=tb.getBoundingClientRect(),g=gal.getBoundingClientRect();
    const r={x:Math.round(a.left-g.left-4),y:Math.round(a.top-g.top-4),w:Math.round(a.width+8),h:Math.round(a.height+8)};if(r.w>8&&r.x<v.w&&r.y<v.h&&r.x+r.w>0&&r.y+r.h>0)av.push(r);}}catch(e){}
  /* each name's real width (the same number place() keeps in el.__nw), so a short name is not fitted as if it were the longest */
  const nw={};try{const fld=D.getElementById('cgField');if(fld)for(const L of gx.labels||[]){const el=fld.querySelector('.cg-body[data-uid="'+String(L.id).replace(/["\\]/g,'')+'"]');if(!el)continue;
    if(el.__nw==null){const n=el.querySelector('.cg-name');el.__nw=n?Math.min(L.size+30,n.offsetWidth||60):60;}nw[L.id]=Math.round(el.__nw);}}catch(e){}
  const key=v.w+'x'+v.h+':'+av.map(a=>a.x+','+a.y+','+a.w+','+a.h).join(';')+':'+spots.map(s=>s.uid+'@'+s.x+','+s.y+'~'+(nw[s.uid]||'')).join('|');
  if(!fitMemo||fitMemo.key!==key)fitMemo={key,cam:G.mapFit(spots,v.w,v.h,{side:v.w>=640?54:46,top:v.w>=640?44:36,bot:v.w>=640?64:56,big:v.w>=640,avoid:av,nw})};
  fitMemo.keep=av.slice(avoid?1:0);return {...fitMemo.cam};}
function mapZ(gx,v){return G.mapZooms(gx.map.radius,v.w,v.h,fitCam(gx,v).z);}
function schedulePlace(){if(placeRaf)return;placeRaf=requestAnimationFrame(()=>{placeRaf=0;place();});}
/* Oct 16 (energy hits, community-energy.js): a knocked companion rolls away from its spot for a moment; epos() adds that offset */
function epos(s,id){const e=W.LowiEnergy,o=s&&e&&e.offset?e.offset(id):null;return o?{uid:s.uid,me:s.me,x:s.x+o.x,y:s.y+o.y}:s;}
function place(){
  const gx=W.__lgGx,field=D.getElementById('cgField'),gal=D.getElementById('cgGalaxy');if(!G||!gx||!gx.map||!field||!gal)return;
  mapGestures(gal);if(W.LowiEnergy&&W.LowiEnergy.mount)W.LowiEnergy.mount(gal);
  const v=mapView(gal),Z=mapZ(gx,v),fz=fitCam(gx,v);if(!cam||(!camUser&&!camAnimOn))cam=fz;/* until you zoom yourself, the view follows everyone (people still loading in, someone joining) */cam=camFree?cam:G.mapClamp(cam,gx.map.radius,v.w,v.h,{x:gx.map.cx,y:gx.map.cy},fz.z);/* Oct 25: camFree = a finger or the camera spring owns it (rubber band past the edge) */
  const f=Math.max(.68,Math.min(1.2,Math.sqrt(cam.z/Z.z0))),fn=Math.max(.8,f),cx=v.w/2,cy=v.h*.5,scr=s=>({x:cx+(s.x-cam.x)*cam.z,y:cy+(s.y-cam.y)*cam.z});
  const bodies=new Map(),bubs=new Map();
  for(const el of field.querySelectorAll('.cg-body'))bodies.set(el.getAttribute('data-uid'),el);
  for(const el of field.querySelectorAll('.cg-bub[data-for]'))bubs.set(el.getAttribute('data-for'),el);
  const items=[];
  for(const L of gx.labels){const el=bodies.get(L.id),s=epos(gx.spot.get(L.id),L.id);if(!el||!s)continue;const p=scr(s);
   if(el.__nw==null){const n=el.querySelector('.cg-name');el.__nw=n?Math.min(L.size+30,n.offsetWidth||60):60;}
   const b=bubs.get(L.id);if(b&&b.__bh==null)b.__bh=b.offsetHeight||34;
   items.push({id:L.id,x:p.x,y:p.y,s:L.size*f,nw:el.__nw*fn,bw:b?L.bw:0,bh:b?b.__bh:0,bub:!!b});
   el.style.left='0';el.style.top='0';el.style.transform='translate3d('+p.x.toFixed(1)+'px,'+p.y.toFixed(1)+'px,0) translate(-50%,calc(var(--s) / -2)) scale('+f.toFixed(3)+')';
   el.style.setProperty('--nk',(fn/f).toFixed(3));el.classList.toggle('cg-out',p.x<-80||p.x>v.w+80||p.y<-80||p.y>v.h+80);}
  const ko=W.LowiEnergy&&W.LowiEnergy.keepOut?W.LowiEnergy.keepOut(gal):null;if(ko)items.push({id:'__ce',x:ko.x,y:ko.y,s:ko.s,nw:0,bw:0,bh:0,bub:false});
  if(fitMemo&&fitMemo.keep&&G.mapPads)items.push(...G.mapPads(fitMemo.keep,'__keep'));/* Oct 25 (readability + fit): the Friends tree button too, as the fit saw it */
  const lab=G.mapLabels(items,{w:v.w,h:v.hb||v.h});
  for(const it of items){const r=lab.get(it.id),el=bodies.get(it.id),b=bubs.get(it.id);if(!r||!el)continue;el.classList.toggle('cg-nn',!r.name&&r.at!=='i');el.classList.toggle('cg-nt',r.at==='t');el.classList.toggle('cg-ni',r.at==='i');el.classList.toggle('cg-dot',!!r.dot);
   if(!b)continue;if(r.bub){b.style.display='';b.style.left=r.bub.x+'px';b.style.setProperty('top',r.bub.y+'px','important');b.style.setProperty('bottom','auto','important');b.style.setProperty('--tail',r.bub.tail+'px');b.setAttribute('data-side',r.bub.side);}else b.style.display='none';}
  /* Oct 19: knocked by an energy burst, YOU stay where you landed too, so your glow and rings follow your companion */
  const me=gx.me&&epos(gx.spot.get(gx.me.uid),gx.me.uid),mp=me?scr(me):{x:cx,y:cy};
  gal.style.setProperty('--me-x',Math.round(mp.x)+'px');gal.style.setProperty('--me-y',Math.round(mp.y)+'px');
  gx.lines=gx.lineDefs.map(d=>{const A=epos(gx.spot.get(d.a),d.a),B=epos(gx.spot.get(d.b),d.b);if(!A||!B)return null;const a=scr(A),b=scr(B),bs=(B.me?(v.w>=640?64:54):(v.w>=640?56:46))*f,as=(A.me?(v.w>=640?64:54):(v.w>=640?56:46))*f;return {a,b,rb:bs/2,ra:as/2,ame:!!A.me,alpha:1,sel:d.sel,arrow:d.arrow,from:d.from,to:d.to};}).filter(Boolean);
  gx.orbits={cx:mp.x,cy:mp.y,r:[]};
  /* Oct 16: the picked person's thread is drawn as the connection stream (SVG), so the sky leaves that one out. */
  const streamed=streamDraw(gx.lines,v)&&!!sel;if(sk){if(streamed)sk.set(gx.lines.filter(l=>!l.sel),false,gx.orbits);else sk.set(gx.lines,false,gx.orbits);}
  gal.setAttribute('data-zoom',cam.z>=Z.zmax*.995?'max':cam.z<=Z.zmin*1.005?'min':'mid');
}
/* Oct 25 2026 (Emmanuel's TikTok "Why does iOS feel so nice to use"; spring.js + rubberband.js): the Room camera moves like
   an iOS scroll view. Dragging or pinching past the edge (or past the zoom limits) stretches on Apple's rubber band
   (c = 0.55, d = the Room's width/height; zoom in log space) instead of stopping dead. Letting go flings with iOS's
   deceleration and springs back from the edge with the speed it had. Double-tap zoom is a spring too, and every one of these
   can be caught mid-way by a finger: the camera stays exactly where it is and the drag carries on from there.
   One requestAnimationFrame loop, one place() per frame, and nothing runs once the camera is at rest. */
let camFree=false,camMo=null;
const RB=()=>W.LowiRubber,SPR=()=>W.LowiSpring,LZ_D=.5;
function camBox(gx,v,c){const k={x:gx.map.cx,y:gx.map.cy},fz=fitCam(gx,v).z,lo=G.mapClamp({x:-1e9,y:-1e9,z:c.z},gx.map.radius,v.w,v.h,k,fz),hi=G.mapClamp({x:1e9,y:1e9,z:c.z},gx.map.radius,v.w,v.h,k,fz),Z=mapZ(gx,v);return {x0:lo.x,x1:hi.x,y0:lo.y,y1:hi.y,z0:Z.zmin,z1:Z.zmax};}
/* raw camera (where the finger would put it) -> what you see (stretched past the edges) */
function camRubber(raw,gx,v){const rb=RB();if(!rb)return raw;const b=camBox(gx,v,raw),z=raw.z;return {x:rb.clamp(raw.x*z,b.x0*z,b.x1*z,v.w)/z,y:rb.clamp(raw.y*z,b.y0*z,b.y1*z,v.h)/z,z};}
function camUnrubber(c,gx,v){const rb=RB();if(!rb)return {...c};const b=camBox(gx,v,c),z=c.z;return {x:rb.unclamp(c.x*z,b.x0*z,b.x1*z,v.w)/z,y:rb.unclamp(c.y*z,b.y0*z,b.y1*z,v.h)/z,z};}
function zRubber(z,gx,v){const rb=RB();if(!rb)return z;const Z=mapZ(gx,v);return Math.exp(rb.clamp(Math.log(z),Math.log(Z.zmin),Math.log(Z.zmax),LZ_D));}
function zUnrubber(z,gx,v){const rb=RB();if(!rb)return z;const Z=mapZ(gx,v);return Math.exp(rb.unclamp(Math.log(z),Math.log(Z.zmin),Math.log(Z.zmax),LZ_D));}
/* grab: stop wherever the camera is; the finger owns it now */
function camHold(){cancelAnimationFrame(camAnim);camAnim=0;camMo=null;camAnimOn=false;}
function camRest(){camHold();camFree=false;place();}
/* axes: {x,y,z(log)} each {p,v,t (spring target) or coast:true}; w/zeta from the spring response and damping */
function camRun(ax,o){cancelAnimationFrame(camAnim);const S=SPR(),gx=W.__lgGx,gal=D.getElementById('cgGalaxy');if(!S||!gx||!gal){camRest();return;}
  const P=S.params(o||{response:.45,damping:1});camMo={ax,P};camAnimOn=true;camFree=true;let last=performance.now();
  const step=t=>{camAnim=0;if(!camMo||camMo.ax!==ax)return;const dt=Math.min(.064,Math.max(0,(t-last)/1000));last=t;const v=mapView(gal),b=camBox(gx,v,cam);let moving=false;
   for(const k of ['x','y','z']){const a=ax[k];if(!a||a.done)continue;
    if(a.coast){const c=S.coast(a.p,a.v,dt);a.p=c.x;a.v=c.v;const lo=k==='x'?b.x0:b.y0,hi=k==='x'?b.x1:b.y1;
     if(a.p<lo||a.p>hi){a.coast=false;a.t=a.p<lo?lo:hi;}else if(Math.abs(a.v*cam.z)<8){a.v=0;a.done=true;continue;}}
    else{const r=S.solve(a.p-a.t,a.v,P.w,P.damping,dt);a.p=a.t+r.x;a.v=r.v;const eps=k==='z'?.0015:.4/Math.max(.05,cam.z);if(Math.abs(a.p-a.t)<eps&&Math.abs(a.v)<eps*4){a.p=a.t;a.v=0;a.done=true;}}
    moving=moving||!a.done;}
   cam={x:ax.x?ax.x.p:cam.x,y:ax.y?ax.y.p:cam.y,z:ax.z?Math.exp(ax.z.p):cam.z};
   if(moving){place();camAnim=requestAnimationFrame(step);}else camRest();};
  camAnim=requestAnimationFrame(step);}
function camVel(){return camMo?{x:camMo.ax.x?camMo.ax.x.v:0,y:camMo.ax.y?camMo.ax.y.v:0,z:camMo.ax.z?camMo.ax.z.v:0}:{x:0,y:0,z:0};}
function camTo(target,ms){const gx=W.__lgGx,gal=D.getElementById('cgGalaxy');if(!gx||!gal||!cam)return;cancelAnimationFrame(camAnim);const v=mapView(gal),to=G.mapClamp(target,gx.map.radius,v.w,v.h,{x:gx.map.cx,y:gx.map.cy},fitCam(gx,v).z),from={...cam},t0=performance.now(),dur=ms||280;
  /* the spring: from where the camera is, with the speed it has (a second double-tap mid-zoom turns it, no restart) */
  if(SPR()&&!SPR().reduced()){const vv=camVel();camRun({x:{p:cam.x,v:vv.x,t:to.x},y:{p:cam.y,v:vv.y,t:to.y},z:{p:Math.log(cam.z),v:vv.z,t:Math.log(to.z)}},{response:.45,damping:1});return;}
  camAnimOn=true;const step=t=>{const k=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-k,3);cam={x:from.x+(to.x-from.x)*e,y:from.y+(to.y-from.y)*e,z:from.z*Math.pow(to.z/from.z,e)};if(k>=1)camAnimOn=false;place();if(k<1)camAnim=requestAnimationFrame(step);};camAnim=requestAnimationFrame(step);}
/* the finger let go: past the zoom limits -> spring back around the pinch centre; else fling (world units/s) and spring off the edges */
function camRelease(vel,anchor){const gx=W.__lgGx,gal=D.getElementById('cgGalaxy');if(!gx||!gx.map||!gal||!cam){camFree=false;return;}const v=mapView(gal),Z=mapZ(gx,v),S=SPR();
  if(!S||S.reduced()){camFree=false;place();return;}
  if(cam.z<Z.zmin*.999||cam.z>Z.zmax*1.001){const zc=Math.max(Z.zmin,Math.min(Z.zmax,cam.z)),a=anchor||{x:v.w/2,y:v.h*.5};camTo(zoomAt(cam,zc/cam.z,a.x,a.y,v));return;}
  const b=camBox(gx,v,cam),out=k=>k==='x'?(cam.x<b.x0||cam.x>b.x1):(cam.y<b.y0||cam.y>b.y1),edge=k=>k==='x'?(cam.x<b.x0?b.x0:b.x1):(cam.y<b.y0?b.y0:b.y1);
  const ax={};for(const k of ['x','y']){const vv=vel&&isFinite(vel[k])?vel[k]:0;ax[k]=out(k)?{p:cam[k],v:vv,t:edge(k)}:{p:cam[k],v:vv,coast:true};}
  if(!out('x')&&!out('y')&&Math.hypot(ax.x.v,ax.y.v)*cam.z<40){camFree=false;place();return;}
  camRun(ax,{response:.45,damping:1});}
/* zoom by k keeping the world point under (px,py) (galaxy px) under the finger */
function zoomAt(c0,k,px,py,v,loose){const gx=W.__lgGx,Z=gx&&gx.map?mapZ(gx,v):{zmin:.18,zmax:3},z=loose&&gx&&gx.map?zRubber(c0.z*k,gx,v):Math.max(Z.zmin,Math.min(Z.zmax,c0.z*k)),wx=c0.x+(px-v.w/2)/c0.z,wy=c0.y+(py-v.h*.5)/c0.z;return {x:wx-(px-v.w/2)/z,y:wy-(py-v.h*.5)/z,z};}
function mapGestures(gal){if(gal.__map)return;gal.__map=1;
  const pts=new Map();let g=null,suppress=0,lastTap=0,lastXY=null,lpT=0,lpHeld=false,lpAt=0;
  /* Oct 16 (E-man: "that [card] only appears if you long-press on the companion, or any companion's name"): holding a companion still
     for 450 ms opens their person card (with a little buzz where the device supports it); a plain tap connects instead (see connect()).
     Moving more than 9 px (a pan) or a second finger (a pinch) cancels the hold, so dragging, pinching and double-tap stay as they were. */
  /* the camera's own recent path (what you see, stretch included), for the speed it is let go with */
  const trail=[];const track=e=>{if(!cam)return;const t=e.timeStamp||performance.now();trail.push({t,x:cam.x,y:cam.y});while(trail.length>2&&t-trail[0].t>100)trail.shift();};
  const trailVel=e=>{const t=e.timeStamp||performance.now();if(trail.length<2||t-trail[trail.length-1].t>80)return {x:0,y:0};const a=trail[0],b=trail[trail.length-1],dt=Math.max(16,b.t-a.t)/1000;return {x:(b.x-a.x)/dt,y:(b.y-a.y)/dt};};
  const lpStop=()=>{clearTimeout(lpT);lpT=0;};
  const lpOpen=body=>{lpHeld=true;lpAt=Date.now();try{if(navigator.vibrate)navigator.vibrate(12);}catch(x){}body.classList.add('cg-held');setTimeout(()=>body.classList.remove('cg-held'),420);const u=body.getAttribute('data-uid');if(u&&u!=='me')openProfile(u,body.getAttribute('data-name')||'');};
  const local=e=>{const r=gal.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
  const inUi=t=>!!(t&&t.closest&&t.closest('.cm-compose,input,textarea,#cgThread,.cg-empty,.ce-joy'));
  gal.addEventListener('pointerdown',e=>{if(inUi(e.target)||(e.pointerType==='mouse'&&e.button!==0))return;const caught=!!camMo;camHold();if(caught)try{gal.setPointerCapture(e.pointerId);}catch(x){}pts.set(e.pointerId,local(e));
   lpStop();lpHeld=false;
   const gx0=W.__lgGx,raw0=()=>cam&&gx0&&gx0.map?camUnrubber(cam,gx0,mapView(gal)):(cam&&{...cam});trail.length=0;
   if(pts.size===1){const body=e.target.closest&&e.target.closest('.cg-body');g={kind:caught?'pan':'tap',caught,p0:local(e),cam0:raw0(),t0:Date.now(),onBody:!!(e.target.closest&&e.target.closest('.cg-body,.cg-bub')),body:body||null};if(body)lpT=setTimeout(()=>{lpT=0;if(g&&g.kind==='tap'&&pts.size===1)lpOpen(body);},450);}
   else if(pts.size===2){const [a,b]=[...pts.values()],gxp=W.__lgGx;g={kind:'pinch',d0:Math.hypot(a.x-b.x,a.y-b.y)||1,m0:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},cam0:cam&&gxp&&gxp.map?camUnrubber({...cam,z:zUnrubber(cam.z,gxp,mapView(gal))},gxp,mapView(gal)):{...cam}};}
   if(cam)camFree=true;});
  gal.addEventListener('pointermove',e=>{if(!pts.has(e.pointerId)||!g||!cam)return;pts.set(e.pointerId,local(e));const v=mapView(gal);
   if(g.kind==='pinch'&&pts.size>=2){const [a,b]=[...pts.values()],d=Math.hypot(a.x-b.x,a.y-b.y)||1,m={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
    const c=zoomAt(g.cam0,d/g.d0,g.m0.x,g.m0.y,v,true);c.x-=(m.x-g.m0.x)/c.z;c.y-=(m.y-g.m0.y)/c.z;const gxm=W.__lgGx;cam=gxm&&gxm.map?camRubber(c,gxm,v):c;g.mid=m;track(e);camUser=true;schedulePlace();return;}
   if(pts.size!==1)return;const p=pts.get(e.pointerId),dx=p.x-g.p0.x,dy=p.y-g.p0.y;
   if(g.kind==='tap'&&Math.hypot(dx,dy)>9){lpStop();g.kind='pan';try{gal.setPointerCapture(e.pointerId);}catch(x){}}
   if(g.kind==='pan'){const raw={x:g.cam0.x-dx/g.cam0.z,y:g.cam0.y-dy/g.cam0.z,z:g.cam0.z},gxm=W.__lgGx;cam=gxm&&gxm.map?camRubber(raw,gxm,v):raw;track(e);camUser=true;schedulePlace();}});
  const end=e=>{if(!pts.has(e.pointerId))return;const p=pts.get(e.pointerId);pts.delete(e.pointerId);
   // a busy frame can deliver the finger lift before the 450 ms hold timer: a held press still opens the card
   if(lpT&&!lpHeld&&e.type==='pointerup'&&g&&g.kind==='tap'&&g.body&&!pts.size&&Date.now()-g.t0>=450){lpStop();lpOpen(g.body);}
   lpStop();if(!pts.size&&camFree&&!camMo&&(lpHeld||!g))camRelease(null,p);if(lpHeld){lpHeld=false;suppress=Date.now();if(!pts.size)g=null;return;}if(!g)return;
   if(g.kind==='pan'||g.kind==='pinch'){suppress=Date.now();if(!pts.size){const mid=g.mid||p;g=null;camRelease(e.type==='pointerup'?trailVel(e):null,mid);}else if(g.kind==='pinch'){const q=[...pts.values()][0],gxq=W.__lgGx;trail.length=0;g={kind:'pan',p0:q,cam0:cam&&gxq&&gxq.map?camUnrubber(cam,gxq,mapView(gal)):{...cam}};}return;}
   if(g.kind==='tap'&&e.type==='pointerup'&&!g.onBody){const now=Date.now();
    if(now-lastTap<420&&lastXY&&Math.hypot(p.x-lastXY.x,p.y-lastXY.y)<40){lastTap=0;const gx=W.__lgGx,v=mapView(gal),Z=gx&&gx.map?mapZ(gx,v):null;
     if(Z){const back=cam.z>=Z.zmax*.98;camUser=!back;camTo(back?fitCam(gx,v):zoomAt(cam,1.8,p.x,p.y,v));}suppress=now;}
    else{lastTap=now;lastXY=p;}}
   if(!pts.size){g=null;if(camFree&&!camMo)camRelease(null,p);}};
  gal.addEventListener('pointerup',end);gal.addEventListener('pointercancel',end);
  gal.addEventListener('click',e=>{if(Date.now()-suppress<380){e.preventDefault();e.stopPropagation();}},true);
  gal.addEventListener('dblclick',e=>e.preventDefault());
  /* Right-click, the keyboard's context-menu key or Android's long-press menu: the same person card; never the browser menu on a companion. */
  gal.addEventListener('contextmenu',e=>{const body=e.target.closest&&e.target.closest('.cg-body');if(!body)return;e.preventDefault();if(Date.now()-lpAt<1500)return;lpAt=Date.now();const u=body.getAttribute('data-uid');if(u&&u!=='me')openProfile(u,body.getAttribute('data-name')||'');});
  gal.addEventListener('wheel',e=>{const gx=W.__lgGx;if(!gx||!gx.map||!cam||inUi(e.target))return;const v=mapView(gal),Z=mapZ(gx,v);
   if(e.deltaY<0&&cam.z>=Z.zmax*.995)return;/* fully zoomed in: galaxy-zoom.js may dive you back into Home */
   e.preventDefault();const p=local(e);cam=zoomAt(cam,Math.exp(-e.deltaY*.0022),p.x,p.y,v);camUser=true;schedulePlace();},{passive:false});
  gal.addEventListener('gesturestart',e=>e.preventDefault());
}
W.LowiCgMap={atMax(){const gx=W.__lgGx,gal=D.getElementById('cgGalaxy');if(!gx||!gx.map||!gal||!cam)return true;return cam.z>=mapZ(gx,mapView(gal)).zmax*.995;},
  cam(){return cam&&{...cam};},reset(){camHold();camFree=false;cam=null;camUser=false;schedulePlace();},place,
  /* Oct 25: the fitted view (everyone on screen) and whether you zoomed yourself, for tests and the energy layer */
  fit(){const gx=W.__lgGx,gal=D.getElementById('cgGalaxy');if(!G||!gx||!gx.map||!gal)return null;return fitCam(gx,mapView(gal));},user:()=>camUser,
  /* Oct 16 (energy hits): the camera and every companion's home spot and radius in map units, for community-energy.js */
  geom(){const gx=W.__lgGx,gal=D.getElementById('cgGalaxy');if(!G||!gx||!gx.map||!gal||!cam)return null;const v=mapView(gal),Z=mapZ(gx,v),f=Math.max(.68,Math.min(1.2,Math.sqrt(cam.z/Z.z0))),big=v.w>=640,sz=new Map((gx.labels||[]).map(L=>[L.id,L.size]));
   return {cam:{...cam},w:v.w,h:v.h,cx:v.w/2,cy:v.h*.5,f,radius:gx.map.radius,rcx:gx.map.cx||0,rcy:gx.map.cy||0,spots:gx.map.spots.filter(s=>gx.spot.has(s.uid)).map(s=>({uid:s.uid,me:!!s.me,x:s.x,y:s.y,r:((sz.get(s.uid)||(s.me?(big?64:54):(big?56:46)))*f/2)/cam.z}))};},
  /* an energy hit on a real member: checks only (Oct 19: the "@Name ⚡ Eman sent you energy" chat line is gone) */
  energy(uid){if(!uid||uid===scope||uid==='me')return 'self';if(botOf(uid))return 'bot';const p=roster().get(uid);if(!p||!G)return 'gone';if(blocked(uid))return 'blocked';
   if(!store||!store.submitLine||!scope||navigator.onLine===false)return 'offline';const name=String(own().n||'').trim();if(!name)return 'name';
   /* Oct 19 (E-man: "it says [Damon] sent you energy ... That's a useless text message ... Remove that specific line"): the hit
      itself is the message; no chat line is posted any more. */
   return 'sent';}};
function skyStart(){const c=D.getElementById('cgSky');if(!G||!c||!c.getContext)return;if(!sk||sk.canvas!==c){if(sk)sk.stop();sk=G.sky(c);if(sk){sk.canvas=c;const g0=W.__lgGx;if(g0)sk.set(g0.lines,false,g0.orbits);}}/* Oct 24 bug hunt (item 29): the open chat room covers the galaxy, so its sky stays stopped (thread(true) stops it; every repaint used to start it again at the full screen rate) */if(sk&&threadOpen){sk.stop();return;}if(sk&&active()&&!D.hidden)sk.start();}
/* Arriving in Community: coming from Home, galaxy-zoom.js pulls the one camera out of Misty's world into the galaxy (no boxed
   snapshot of Home any more). From anywhere else the galaxy just settles in from a little closer. */
function intro(){const g=D.getElementById('cgGalaxy');if(!g||!g.removeAttribute)return;g.__intro=1;if(D.documentElement.classList.contains('gx-out'))return;if(W.matchMedia&&W.matchMedia('(prefers-reduced-motion: reduce)').matches)return;g.removeAttribute('data-intro');void g.offsetWidth;g.setAttribute('data-intro','1');clearTimeout(introT);introT=setTimeout(()=>{g.removeAttribute('data-intro');},1100);}
let enterAt=0,ro=null;
function onShow(){const on=!!(active()&&!D.hidden);if(on&&!wasOn){wasOn=true;enterAt=Date.now();koRetry=0;if(!camUser)cam=null;intro();skyStart();refresh();}else if(!on&&wasOn){wasOn=false;if(sk)sk.stop();if(rec)recStop(false);voiceStop();}}
function watch(){if(watching||!W.MutationObserver)return;const t=D.getElementById('tab-foryou');if(!t)return;watching=true;new W.MutationObserver(onShow).observe(t,{attributes:true,attributeFilter:['class']});}
function roomFlag(){const p=D.getElementById('cmPaneChat'),on=threadOpen&&!!(p&&p.hasAttribute&&p.hasAttribute('data-spirit-chat'));if(p&&p.dataset){if(on)p.dataset.room='1';else delete p.dataset.room;}try{D.documentElement.classList.toggle('cr-room',on);}catch(e){}roomDress(p,on);}
/* Oct 22 (item 37): the room's composer floats over the messages (community-tg.css). The list keeps its last message clear of it, and of a reply bar or photo
   preview, through --cr-comp-h; a round button jumps back to the latest message once you have scrolled up. */
COPY.toLatest=['Jump to the latest message','Zur neuesten Nachricht','Ir al último mensaje'];
let compRO=null;
function roomDress(p,on){try{if(!on||!p){if(compRO){compRO.disconnect();compRO=null;}if(p)p.style.removeProperty('--cr-comp-h');return;}const c=p.querySelector('.cm-compose'),th=D.getElementById('cgThread');
 if(c&&W.ResizeObserver&&!(compRO&&compRO.__el===c)){if(compRO)compRO.disconnect();compRO=new ResizeObserver(()=>{const h=Math.round(c.getBoundingClientRect().height),l=D.getElementById('cmList'),d=h-(compRO.__h||h);compRO.__h=h;if(h)p.style.setProperty('--cr-comp-h',h+'px');
  /* item 38: the composer is the bottom of the room box, so when it grows (a second line, the note under it) the list keeps its newest message in view */
  if(l&&d>0&&l.scrollHeight-l.scrollTop-l.clientHeight-d<90)l.scrollTop=l.scrollHeight;});compRO.__el=c;compRO.observe(c);}
 if(th&&!th.querySelector('.cr-down')){const b=D.createElement('button');b.type='button';b.className='cr-down';b.setAttribute('data-chat','latest');b.setAttribute('aria-label',tr('toLatest'));b.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6"/></svg>';th.appendChild(b);}
 if(th)th.classList.toggle('cr-up',!nearBottom());}catch(e){}}
function thread(open,focusId){const was=threadOpen;threadOpen=!!open;if(stickCtl){if(threadOpen&&focusId)stickCtl.release();else if(!was||!threadOpen){stickCtl.pin();newCount=0;}}if(was!==threadOpen){if(threadOpen){if(sk)sk.stop();}else skyStart();refresh();}if(!threadOpen){roomRows=ROOM_ROWS;roomFocus='';}else if(focusId&&!D.getElementById('cm-'+focusId)){roomFocus=focusId;paint(D.getElementById('cmPaneChat'));}roomFlag();const t=D.getElementById('cgThread');if(!t||!t.setAttribute)return;if(threadOpen)t.setAttribute('data-open','1');else t.removeAttribute('data-open');
 const l=D.getElementById('cmList');if(threadOpen&&l){requestAnimationFrame(()=>{const m=focusId&&D.getElementById('cm-'+focusId);if(m&&m.scrollIntoView){m.scrollIntoView({block:'center'});m.classList.add('cg-focus');setTimeout(()=>m.classList.remove('cg-focus'),2200);if(stickCtl)stickCtl.saveAnchor();}else if(stickCtl&&!focusId)stickCtl.pin();else l.scrollTop=l.scrollHeight;const c=t.querySelector('[data-chat="close-thread"]');if(c&&c.focus)c.focus({preventScroll:true});});}}
function dmCheck(ms){if(!scope||!G)return;const idx=nameIdx(),list=ms.filter(m=>m.uid&&m.uid!==scope&&!m.status&&!m.demo&&!m.bot&&!blocked(m.uid)&&((G.targetOf(m,ms,idx)||{}).uid===scope));
 if(prefs.dmSeen==null){prefs.dmSeen=list.length?list[list.length-1].ts:Date.now();persist();}
 if(active()&&!D.hidden&&list.length&&list[list.length-1].ts>prefs.dmSeen){prefs.dmSeen=list[list.length-1].ts;persist();}
 const fresh=list.filter(m=>m.ts>prefs.dmSeen);dmBadge(isQuiet()?0:fresh.length);
 for(const m of fresh){if(dmLive.has(m.id))continue;dmLive.add(m.id);if(m.ts<dmBoot-60000||isQuiet())continue;dmAlert(m);}}
/* Oct 19 (Emmanuel, item 23): home-visit.js reads the messages addressed to you (same test as dmCheck) so the sender's companion can fly into Home.
   Read-only: it never moves dmSeen, so nothing is marked seen behind your back; the room and the badge stay the truth. */
function directed(){ensureScope();if(!scope||!G)return {scope:'',list:[]};const ms=messages(),idx=nameIdx(),list=[];
 for(const m of ms){if(!m.uid||m.uid===scope||m.status||m.demo||m.bot||blocked(m.uid)||hiddenAcct(m.uid))continue;const t=G.targetOf(m,ms,idx);if(!t||t.uid!==scope)continue;
  list.push({id:m.id,uid:m.uid,by:m.by||'',ts:m.ts,text:(voiceOf(m)||photoOf(m))?plain(m):G.bubbleText(m,t)});}
 if(prefs.dmSeen==null){prefs.dmSeen=list.length?list[list.length-1].ts:Date.now();persist();} /* the room's own first-run rule (dmCheck): history before this device first looked is not new */
 for(const m of list)m.seen=m.ts<=prefs.dmSeen;
 return {scope,quiet:isQuiet(),quietSet:prefs.quietEnabled===true,list};}
function dmBadge(n){if(DM_MUTED)n=0;const tb=D.querySelector('#tabbar .tb[data-tab="foryou"]');if(!tb||!tb.querySelector)return;let d=tb.querySelector('.cg-dm');if(!n){if(d)d.remove();return;}if(!d){d=D.createElement('span');d.className='cg-dm';d.setAttribute('aria-hidden','true');tb.appendChild(d);}d.textContent=n>9?'9+':String(n);}
/* 23 Oct (Emmanuel): Replies & mentions is muted. The "is talking to you" card stuck half off screen at the top of every page
   (it parked at -160% of its own height, which is less than the safe-area offset on notched phones and iPads), so no toast,
   no tab badge and no system notification for replies/mentions any more. dmCheck still keeps dmSeen current; home-visit.js is untouched. */
const DM_MUTED=true;
/* Oct 28 2026 (audit): a tapped chat notification opened Home (q:''). It now carries the chat: chat:<uid>:<message id>, see lis-push.js route() */
function dmAlert(m){if(DM_MUTED){const t=D.getElementById('cgToast');if(t&&t.removeAttribute)t.removeAttribute('data-on');return;}const title=fill('dmTitle',m.by||'Member'),body=plain(m).slice(0,140);
 if(D.hidden){try{if(W.Notification&&Notification.permission==='granted'&&navigator.serviceWorker)navigator.serviceWorker.ready.then(r=>r.showNotification(title,{body,icon:'icon-192.png',badge:'icon-192.png',tag:'lowi-dm-'+m.id,data:{q:'chat:'+(m.uid||'')+':'+(m.id||''),tab:'foryou'}})).catch(()=>{});}catch(e){}return;}
 if(active()||(W.LowiHomeVisit&&W.LowiHomeVisit.has(m.id)))return; /* on Home the sender's companion visits instead (home-visit.js) */
 let t=D.getElementById('cgToast');if(!t){t=D.createElement('div');t.id='cgToast';t.className='cg-toast-wrap';t.setAttribute('role','status');D.body.appendChild(t);}
 t.innerHTML=button('open-galaxy','<span class="cg-torb">'+mate(m.uid,'t'+sid(m.id))+'</span><span class="cg-tt"><b>'+esc(title)+'</b><span>'+text(body)+'</span></span>','data-uid="'+esc(m.uid)+'"','cg-toast');t.setAttribute('data-on','1');
 clearTimeout(toastT);toastT=setTimeout(()=>{t.removeAttribute('data-on');},6500);}
function openGalaxy(uid){try{if(typeof W.goTab==='function')W.goTab('foryou');}catch(e){}try{if(typeof W.cmSeg==='function')W.cmSeg('chat');}catch(e){}const t=D.getElementById('cgToast');if(t)t.removeAttribute('data-on');if(uid&&roster().has(uid))sel=uid;refresh();}
function text(t){return esc(t).replace(/@([\p{L}\p{N}_-]+)/gu,'<span class="cm-at">@$1</span>');}
/* Oct 16 (Task 11): a photo message shows its picture (tap to open) and caption, never the raw link */
function photoOf(m){if(!m||!K.photo)return null;const u=String(m.uid||'').indexOf('bot:')===0?'x':m.uid,ph=K.photo(m.t,u);if(ph)return ph;if(W.LowiNibblo){const nb=W.LowiNibblo.chatPhoto(K,m,u);if(nb)return nb;}const ml=K.meal?K.meal(m.t,u):null;return ml?{src:ml.src,caption:ml.caption,meal:ml}:null;}
/* Oct 22: a meal shared from Log a meal: the photo, the dish name and its spike rating (theme tokens, see community-chat.css .cs-meal) */
/* Oct 25 (E-man: "click on that and then read about the ingredients"): the spike label is a button with a small "Details >" hint;
   it opens the poster's own photo check for this meal (meal-detail.js, whitelisted), or a calm "No details" line for older posts. */
/* Oct 27: a meal card with the poster's own photo check (m.md, whitelisted) shows its key numbers under the name, like the bot's cards */
function mealNums(md){if(!md||typeof md!=='object')return '';const n=foodNums(md.total,md.net);return n?'<span class="cs-meal-k">'+esc(n)+'</span>':'';}
function mealHtml(ml,md){const k={low:'mealLow',mid:'mealMid',high:'mealHigh'}[ml.lvl]||'mealMid',MD=W.LowiMealDetailCore,id=ml&&ml.mid?String(ml.mid):'',nums=mealNums(md);
 if(!MD||!id)return '<div class="cs-meal"><b class="cs-meal-n">'+esc(ml.name)+'</b><span class="cs-meal-bs cs-meal-'+esc(ml.lvl)+'"><i aria-hidden="true"></i>'+esc(tr(k))+'</span>'+nums+'</div>';
 return '<div class="cs-meal"><button type="button" class="cs-meal-n" data-chat="meal-detail" data-id="'+esc(id)+'" aria-haspopup="dialog">'+esc(ml.name)+'</button><button type="button" class="cs-meal-bs cs-meal-'+esc(ml.lvl)+'" data-chat="meal-detail" data-id="'+esc(id)+'" aria-haspopup="dialog" aria-label="'+esc(MD.t('open',null,{l:tr(k)}))+'"><i aria-hidden="true"></i>'+esc(tr(k))+MD.hintHTML()+'</button>'+nums+'</div>';}
/* a bot's recipe post (the food bot) never opens the details panel: it goes to LowiMealDetail.routeBot()'s handler (the full recipe), see meal-detail.js */
try{W.addEventListener('lowi:meal-bot-route',()=>{try{refresh();}catch(e){}});}catch(e){} /* the recipe route can register after the first draw */
function botMeal(m){return !!(m&&W.LowiMealDetail&&W.LowiMealDetail.isBot&&W.LowiMealDetail.isBot(m));}
function mealDetail(id){const m=messages().find(x=>String(x.id)===String(id));if(!m||!W.LowiMealDetail)return null;const ph=photoOf(m);if(!ph||!ph.meal)return null;
 if(botMeal(m)){const MD=W.LowiMealDetail;return MD.openBot&&MD.openBot(MD.botInfo('chat',m,{name:ph.meal.name,lvl:ph.meal.lvl,photo:ph.src}))?true:null;}
 return W.LowiMealDetail.open(m.md||null,{by:m.by||'',name:ph.meal.name,lvl:ph.meal.lvl,photo:ph.src});}
function voiceOf(m){return m&&K.voice?K.voice(m.t,String(m.uid||'').indexOf('bot:')===0?'x':m.uid):null;}
function mmss(s){s=Math.max(0,Math.round(+s||0));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
/* A voice note in the chat: a glass play button, a little waveform that fills as it plays, and its length. */
function voiceHtml(vo,by,cls){let h=0;for(const ch of vo.src)h=(h*31+ch.charCodeAt(0))>>>0;let bars='';for(let i=0;i<24;i++){h=(h*1103515245+12345)>>>0;bars+='<i style="height:'+(28+(h>>>8)%64)+'%"></i>';}
 return '<button type="button" class="'+cls+'" data-chat="voice" data-sfx="none" data-src="'+esc(vo.src)+'" data-dur="'+vo.dur+'" aria-pressed="false" aria-label="'+esc(fill('voicePlay',by||'')+', '+mmss(vo.dur))+'"><span class="cs-vi" aria-hidden="true"></span><span class="cs-vw" aria-hidden="true">'+bars+'<span class="cs-vp">'+bars+'</span></span><span class="cs-vt">'+esc(mmss(vo.dur))+'</span></button>';}
function plain(m){const vo=voiceOf(m);if(vo)return '\u{1F3A4} '+tr('voiceNote')+' \u00b7 '+mmss(vo.dur);const ph=photoOf(m);return ph?(ph.meal?'\u{1F37D} '+ph.meal.name:'\u{1F4F7} '+tr('newPic'))+(ph.caption?' \u00b7 '+ph.caption:''):String(m&&m.t||'');}
function msgBody(m){const vo=voiceOf(m);if(vo)return voiceHtml(vo,m.by,'cs-voice')+(vo.rest?'<div class="cm-t">'+text(vo.rest)+'</div>':'');const ph=photoOf(m);if(!ph)return '<div class="cm-t">'+text(m.t)+'</div>';const md=!!(ph.meal&&W.LowiMealDetail&&m.id&&(!botMeal(m)||(W.LowiMealDetail.hasBotRoute&&W.LowiMealDetail.hasBotRoute())));if(md)ph.meal.mid=String(m.id);return '<button type="button" class="cs-photo" data-chat="photo" data-sfx="none"'+(md?' data-md="'+esc(m.id)+'" aria-haspopup="dialog"':'')+' data-src="'+esc(ph.src)+'" data-name="'+esc(m.by||'')+'" aria-label="'+esc(fill(ph.meal?'mealOf':'photoOf',m.by||''))+'"><img loading="lazy" decoding="async" alt="" src="'+esc(ph.src)+'"></button>'+(ph.meal?mealHtml(ph.meal,m.md)+(W.LowiBotRecipe&&W.LowiBotRecipe.chatRow?W.LowiBotRecipe.chatRow(m):''):'')+(ph.caption?'<div class="cm-t">'+text(ph.caption)+'</div>':'');}
function time(ts){try{return new Date(ts).toLocaleTimeString(['en','de','es'][Math.max(0,lang())],{hour:'2-digit',minute:'2-digit'});}catch(e){return '';}}
/* Oct 16, round 5 (E-man: "the Chat room only shows my own messages"): the chats with the galaxy companions live on this
   phone (botStore), so the Chat room now reads them in too, in time order with everyone else: their words on the left with
   their name and avatar, yours on the right. They stay on this phone; nothing new is sent anywhere. */
function botLines(){const out=[];let bs={};try{bs=botStore();}catch(e){}const me=own().n||tr('you');
 for(const u in bs){const b=botOf(u);if(!b||blocked(u))continue;for(const m of bs[u]||[]){if(!m||!m.t)continue;const mine=m.from==='me',t=String(m.t);
  out.push({id:'bot-'+sid(u)+'-'+String(m.id||m.ts),uid:mine?scope:u,by:mine?me:b.n,t:mine&&t[0]!=='@'?'@'+b.n+' '+t:t,ts:+m.ts||0,local:true});}}
 return out;}
/* Oct 19 community room (E-man: "the chat looks so boring ... it actually takes them to a community chat room"): the Chat view is a
   room with a header (title, real voices in the last 24 h, connection state), recent real speakers and day markers. Counts only real,
   unblocked members from the loaded history; bots and demos never count, and nothing claims who is online. */
function dayKey(ts){const d=new Date(+ts||0);return d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate();}
function dayName(ts){const d=new Date(+ts||0),n=new Date(),y=new Date(n.getFullYear(),n.getMonth(),n.getDate()-1);if(dayKey(d)===dayKey(n))return tr('today');if(dayKey(d)===dayKey(y))return tr('yesterday');
 try{return d.toLocaleDateString(['en','de','es'][Math.max(0,lang())],Object.assign({weekday:'short',day:'numeric',month:'short'},d.getFullYear()!==n.getFullYear()?{year:'numeric'}:{}));}catch(e){return d.toDateString();}}
function dayLine(m,prev){if(!(+m.ts)||(prev&&dayKey(prev.ts)===dayKey(m.ts)))return '';return '<div class="cr-day" role="separator"><span>'+esc(dayName(m.ts))+'</span></div>';}
function roomPeople(ms){const real=ms.filter(x=>x&&x.uid&&!x.demo&&!x.bot&&!x.local&&!x.status&&!blocked(x.uid)),since=Date.now()-864e5,voices=new Set(),crew=[],seen=new Set();
 for(const x of real)if(+x.ts>=since)voices.add(x.uid);
 for(let i=real.length-1;i>=0&&crew.length<8;i--){const x=real[i];if(x.uid===scope||seen.has(x.uid))continue;seen.add(x.uid);crew.push({uid:x.uid,n:x.by||''});}
 return {voices:voices.size,crew};}
/* 24 Oct 2026 (Emmanuel): no "X joined" lines in any chat. Opening a chat never adds anything; a newcomer is welcomed only by people writing to them. */
let crewOpen=false;
function roomHead(q,ms,state,el){const rp=roomPeople(ms),meta=q('#crMeta'),link=q('#crLink'),crew=q('#crCrew');
 const cn=q('#crCname'),mb=q('#crMembers'),mc=q('#crMcount'),pin=q('#crPin');
 if(cn&&cn.textContent!==tr('roomCommunity'))cn.textContent=tr('roomCommunity');
 if(mc){const c=rp.voices?String(rp.voices):'';if(mc.textContent!==c)mc.textContent=c;}
 if(mb){const l=tr('roomMembers')+(rp.voices?' · '+rp.voices:''),x=String(crewOpen);if(mb.__al!==l){mb.setAttribute('aria-label',l);mb.__al=l;}if(mb.__ax!==x){mb.setAttribute('aria-expanded',x);mb.__ax=x;}}
 if(crew&&crew.dataset){if(crewOpen)crew.dataset.open='';else delete crew.dataset.open;}
 if(pin){const p=roomPinned(),adm=isAdmin(),tm=p&&ms.find(x=>x.id===p.id),txt=p?(p.text||(tm?plain(tm):'')):'';
  const h=p?button('pin-go','<span class="cr-pinl">'+esc(tr('roomPinned'))+'</span><span class="cr-pint">'+esc(txt)+'</span>','data-id="'+esc(p.id)+'" aria-label="'+esc(tr('pinGo')+(txt?': '+txt:''))+'"','cr-pingo')+(adm?button('unpin',esc(tr('unpinMsg')),'','cr-unpin'):''):'';
  if(pin.__html!==h){pin.innerHTML=h;pin.__html=h;}
  if(pin.hidden!==!p)pin.hidden=!p;
  if(el&&el.dataset&&(el.dataset.pinned==='1')!==!!p){if(p)el.dataset.pinned='1';else delete el.dataset.pinned;}}
 if(meta){const t=rp.voices===1?tr('roomVoice'):rp.voices>1?fill('roomVoices',rp.voices):tr('roomOpen');if(meta.textContent!==t)meta.textContent=t;}
 if(link){const k={live:'linkLive',connecting:'linkSync',loading:'linkSync',offline:'linkOff',error:'linkErr',auth:'linkAuth'}[state]||'linkLive',h='<i aria-hidden="true"></i>'+esc(tr(k));if(link.dataset)link.dataset.state=state;if(link.innerHTML!==h)link.innerHTML=h;}
 if(crew){const h=rp.crew.length?'<span class="cr-crewl">'+esc(tr('roomCrew'))+'</span><div class="cr-crews">'+rp.crew.map(p=>button('profile',mate(p.uid,'cr'+sid(p.uid)),'data-uid="'+esc(p.uid)+'" data-name="'+esc(p.n)+'" aria-label="'+esc(botName(p.n,p.uid))+' · '+tr('profile')+'" style="--chat-color:'+hueColor(p.uid,false)+'"','cr-mate')).join('')+'</div>':'<span class="cr-crewl">'+esc(tr('roomCrew'))+'</span><p class="cr-crewnone">'+esc(tr('roomNoCrew'))+'</p>';if(crew.__html!==h){crew.innerHTML=h;crew.__html=h;}}}
function renderLocal(m,prev,next){const mine=m.uid===scope,start=!prev||prev.uid!==m.uid||m.ts-prev.ts>300000,end=!next||next.uid!==m.uid||next.ts-m.ts>300000;
 const who=end?'<span class="cs-avatar cp-av" aria-hidden="true">'+mate(mine?(scope||'me'):m.uid,'l'+sid(m.id))+'</span>':'<span class="cp-av cp-gap" aria-hidden="true"></span>';
 const head='<div class="cs-by">'+(start&&!mine?'<b class="cs-name">'+esc(m.by)+'</b>'+botDash(m.uid,m.by):'<span class="cp-sr">'+esc(mine?tr('you'):botName(m.by,m.uid))+' '+tr('says')+'</span>')+'</div>';
 const foot='<div class="cm-foot"><time datetime="'+new Date(m.ts).toISOString()+'">'+esc(time(m.ts))+'</time></div>';
 return '<article class="cm-msg cp-msg cp-local'+(mine?' mine':'')+(start?' cp-start':'')+(end?' cp-end':'')+'" id="cm-'+esc(m.id)+'" data-who="'+esc(m.by)+'" style="--chat-color:'+(mine?'#9cdac7':hueColor(m.uid,false))+'">'+who+'<div class="cm-bub">'+head+msgBody(m)+foot+'</div></article>';}
function renderMessage(m,all,prev,next){
 if(m.local)return renderLocal(m,prev,next);
 if(m.demo||m.bot||blocked(m.uid))return '';
 const mine=m.uid===scope,p=profile(m.uid,m.by),re=m.re&&all.find(x=>x.id===m.re),pending=!!m.status,open=openId===m.id||pick===m.id;
 const color=H.color?H.color(p.s):'#9fd8ff';
 const start=!prev||prev.uid!==m.uid||m.ts-prev.ts>300000,end=!next||next.uid!==m.uid||next.ts-m.ts>300000;
 const rx=H.reactions().filter(x=>x.message_id===m.id&&!blocked(x.user_id));
 const quote=m.re?'<div class="cm-quote">'+(re?'<b>'+esc(botName(re.by,re.uid))+'</b> '+esc(plain(re).slice(0,90)):tr('gone'))+'</div>':'';
 const reacts=K.EMOJI.map(em=>{const rows=rx.filter(x=>x.emoji===em);return rows.length?button('react',esc(em)+' '+rows.length,'data-id="'+esc(m.id)+'" data-emoji="'+esc(em)+'" aria-pressed="'+rows.some(x=>x.user_id===scope)+'"'+(transport.reactionBusy(m.id,em)?' disabled':''),'cm-chip'+(rows.some(x=>x.user_id===scope)?' on':'')):'';}).join('');
 const who=end?button('profile',mate(m.uid,'m'+sid(m.id)),'data-uid="'+esc(m.uid)+'" data-name="'+esc(m.by)+'" aria-label="'+esc(mine?tr('you'):botName(m.by,m.uid))+' · '+tr('profile')+'"','cs-avatar cp-av'):'<span class="cp-av cp-gap" aria-hidden="true"></span>';
 const head='<div class="cs-by">'+(start&&!mine?'<b class="cs-name" data-chat="profile" data-uid="'+esc(m.uid)+'" data-name="'+esc(m.by)+'">'+esc(m.by)+'</b>'+botDash(m.uid,m.by):'<span class="cp-sr">'+esc(mine?tr('you'):botName(m.by,m.uid))+' '+tr('says')+'</span>')+'</div>';
 /* time sits bottom-right inside the bubble, Telegram-style; the ··· actions button rides next to it */
 const foot='<div class="cm-foot">'+(pending?'':button('more','<span aria-hidden="true">···</span>','data-id="'+esc(m.id)+'" aria-label="'+tr('more')+'" aria-expanded="'+open+'"','cp-more'))+'<time datetime="'+new Date(m.ts).toISOString()+'">'+esc(time(m.ts))+'</time></div>';
 const pinNow=open&&!pending&&isAdmin()?roomPinned():null,pinB=open&&!pending&&isAdmin()?(pinNow&&pinNow.id===m.id?button('unpin',tr('unpinMsg'),'data-id="'+esc(m.id)+'"','cm-mini cm-pinb'):button('pin-msg',tr('pinMsg'),'data-id="'+esc(m.id)+'"','cm-mini cm-pinb')):'';
 const acts=!pending&&open?'<div class="cp-acts">'+button('pick','<span aria-hidden="true">🙂</span> '+esc(tr('reactShort')),'data-id="'+esc(m.id)+'" aria-label="'+tr('react')+'" aria-expanded="'+(pick===m.id)+'"','cm-mini')+button('reply',tr('reply'),'data-id="'+esc(m.id)+'"','cm-mini')+(mine?button('delete',tr(armed===m.id?'confirmDelete':'delete'),'data-id="'+esc(m.id)+'"','cm-mini'):button('report',tr('report'),'data-id="'+esc(m.id)+'"','cm-mini'))+pinB+'</div>':'';
 return '<article class="cm-msg cp-msg'+(mine?' mine':'')+(start?' cp-start':'')+(end?' cp-end':'')+(open?' cp-open':'')+'" id="cm-'+esc(m.id)+'" data-who="'+esc(m.by)+'" data-chat-id="'+esc(m.id)+'" style="--chat-color:'+esc(color)+'">'+who+
 '<div class="cm-bub" data-chat-bub="'+esc(m.id)+'">'+head+quote+msgBody(m)+foot+
 (pending?'<div class="cs-delivery" role="status">'+tr(m.status==='sending'?'sending':'unconfirmed')+(m.status==='sending'?'':button('retry-send',tr('checkRetry'),'data-id="'+esc(m.id)+'"','')+button('discard',tr('discard'),'data-id="'+esc(m.id)+'"',''))+'</div>':(reacts?'<div class="cm-rx">'+reacts+'</div>':''))+acts+
 (!pending&&pick===m.id?'<div class="cm-picker" aria-label="'+tr('react')+'">'+K.EMOJI.map(em=>button('react',esc(em),'data-id="'+esc(m.id)+'" data-emoji="'+esc(em)+'" aria-label="'+tr('react')+' '+esc(em)+'"','')).join('')+'</div>':'')+'</div></article>';
}
/* Oct 19, crash round 2: update a long list (the chat, the galaxy) piece by piece. parts are HTML strings (one or two elements
   each); a piece whose HTML is unchanged keeps its live elements (no new SVG, no image reload, no relayout of 100 rows); only
   new or changed pieces are parsed, the rest are only moved into order. Replacing innerHTML on every paint is what closed the
   app on iPhones with a big crowd in the room. */
function patchKids(el,parts){
 if(!el.childNodes||!D.createElement('template').content){el.innerHTML=parts.join('');el.__parts=null;return;}
 const pool=new Map(),old=el.__parts||[];
 for(const o of old){if(!o.nodes.length||!o.nodes.every(n=>n.parentNode===el))continue;const a=pool.get(o.h);if(a)a.push(o);else pool.set(o.h,[o]);}
 const next=[];let tpl=null;
 for(const h of parts){if(!h)continue;const a=pool.get(h);let o=a&&a.shift();if(!o){if(!tpl)tpl=D.createElement('template');tpl.innerHTML=h;o={h,nodes:[...tpl.content.childNodes]};}next.push(o);}
 const keep=new Set();for(const o of next)for(const n of o.nodes)keep.add(n);
 for(const n of [...el.childNodes])if(!keep.has(n))el.removeChild(n);
 let cur=el.firstChild;for(const o of next)for(const n of o.nodes){if(n===cur)cur=cur.nextSibling;else el.insertBefore(n,cur);}
 el.__parts=next;}
function mount(el){if(!el)return;ensureScope();if(!el.hasAttribute('data-spirit-chat')){
 el.setAttribute('data-spirit-chat','');el.setAttribute('data-planet','normal');el.setAttribute('data-noi18n','');
 el.innerHTML='<header class="cp-bar"><div class="cp-head"><h2 id="cpTitle"></h2><p id="cpSub"></p></div><div id="csControls"></div></header><div class="cs-status" id="csStatus" role="status"></div><section class="cp-room cg-room" id="cpRoom"><div class="cg-galaxy" id="cgGalaxy" role="group"><canvas class="cg-sky" id="cgSky" aria-hidden="true"></canvas><svg class="cg-stream" id="cgStream" aria-hidden="true" focusable="false" data-on="0"></svg><div class="cg-field" id="cgField"></div></div><section class="cg-thread cr-room" id="cgThread" role="region" aria-labelledby="cgThreadTitle"><div class="cr-sky" aria-hidden="true"></div><header class="cg-thead cr-head"><button type="button" class="cg-x cr-back" data-sfx="none" data-chat="close-thread" id="cgClose"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M14.5 5.5L8 12l6.5 6.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button><div class="cr-srt"><b id="cgThreadTitle"></b><span class="cr-sub"><span class="cr-link" id="crLink" data-state="loading"></span><span class="cr-cname" id="crCname"></span><span class="cr-meta" id="crMeta"></span></span></div><button type="button" class="cr-members" id="crMembers" data-chat="members" data-sfx="none" aria-expanded="false"><svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true" focusable="false"><circle cx="9" cy="8.5" r="3.2" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M3.5 19c.6-3.1 2.8-4.8 5.5-4.8s4.9 1.7 5.5 4.8" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M15.5 5.6a3 3 0 0 1 0 5.8M17.2 14.4c1.8.5 3 1.9 3.4 4.6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg><span class="cr-mcount" id="crMcount"></span></button></header><div class="cr-pin" id="crPin" hidden></div><div class="cr-crew" id="crCrew"></div><div class="cm-list" id="cmList" role="log" aria-live="off" tabindex="0"></div><div id="csJump"></div></section></section><div class="cm-compose"><div class="cg-torow" id="cgTo"></div><div id="csReply"></div><div class="cm-mention" id="cmMention"></div><div id="csPhoto"></div><div id="csMic"></div><div class="cm-inrow"><textarea id="cmInput" rows="1" maxlength="600" enterkeyhint="send"></textarea><button type="button" id="cmPhoto" class="cs-photo-btn" data-chat="photo-pick" data-sfx="none"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.6l1.2-1.6A1.5 1.5 0 0 1 10.5 4h3a1.5 1.5 0 0 1 1.2.6L15.9 6h1.6A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="12" cy="12.4" r="3.4" fill="none" stroke="currentColor" stroke-width="1.7"/></svg></button><input type="file" id="cmPhotoFile" accept="image/*" class="cs-file" tabindex="-1" aria-hidden="true"><button type="button" id="cmMic" class="cs-mic-btn" data-chat="mic" data-sfx="none"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><rect x="9" y="3.5" width="6" height="11" rx="3" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M5.8 11.5a6.2 6.2 0 0 0 12.4 0M12 17.7V20.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></button><div class="cs-rec-host" id="csRec"></div><button type="button" id="cmSend" data-chat="send" data-sfx="none">↑</button></div><div class="cs-compose-meta"><span id="csDraft"></span><span id="csCount"></span></div><p class="cs-notice" id="csNotice" role="status"></p></div><span id="csAnnounce" class="sr-only" aria-live="polite"></span>';
 stickOn(el.querySelector('#cmList'));
 el.querySelector('#cmList').addEventListener('scroll',()=>{const nb=nearBottom();if(nb){newCount=0;const j=D.getElementById('csJump');if(j)j.innerHTML='';}if(threadOpen){const th=D.getElementById('cgThread');if(th&&th.classList.contains('cr-up')===nb)th.classList.toggle('cr-up',!nb);}},{passive:true});
 }
 paint(el);}
/* item 31: the room list used to hold every message (300 rows, each with a full companion drawing: ~13k nodes and 500
   SVG gradients) even with the room closed. It now holds the newest ROOM_ROWS; 'Show earlier messages' adds more, and a
   message the room is asked to show (focusId) is always included. */
const ROOM_ROWS=60;let roomRows=ROOM_ROWS,roomFocus='';
function nearBottom(){const l=D.getElementById('cmList');return !l||l.scrollHeight-l.scrollTop-l.clientHeight<90;}
/* 25 Oct 2026 (Emmanuel: "it doesn't start from the most recent message ... then you have to scroll down"): the list stays on its
   newest message (chat-stick-core.js) through late photos, videos and previews; it lets go only when you scroll up yourself. */
let stickCtl=null;const stuck=()=>stickCtl?stickCtl.stuck:nearBottom();
function stickOn(l){if(!l||!W.LowiChatStick||(stickCtl&&stickCtl.el===l))return;if(stickCtl)stickCtl.stop();stickCtl=W.LowiChatStick.create(l);stickCtl.watch();}
function paint(el){
 if(!el||!el.hasAttribute('data-spirit-chat'))return;
 const q=s=>el.querySelector(s),ms=messages(),ds=draftState(),m=own(),st=transport.state(),list=q('#cmList'),near=nearBottom(),y=list.scrollTop,focus=D.activeElement;stickOn(list);const pinned=stuck();if(stickCtl&&!pinned)stickCtl.saveAnchor();
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
 const emptyHTML=(quietRoom?'<div class="cg-empty"><span class="cs-lantern" aria-hidden="true">✧</span><b>'+tr('emptyTitle')+'</b><p>'+(st.phase==='ready'?(Object.values(prefs.blocks).some(x=>x.blocked)?tr('filtered'):tr('empty')):tr('waiting'))+'</p>'+(st.phase==='ready'?button('hello',tr('hi'),'','cs-action cg-hello'):'')+'</div>':''),fieldHTML=gx.html+emptyHTML;
 if(field&&field.__html!==fieldHTML){patchKids(field,(gx.parts||[gx.html]).concat(emptyHTML?[emptyHTML]:[]));field.__html=fieldHTML;}
 if(gal){gal.setAttribute('aria-label',tr('onPlanet')+': '+gx.names.join(', '));gal.setAttribute('data-streams',String(gx.lineDefs.length));}
 W.__lgGx=gx;place();watch();if(active()&&!D.hidden){if(!wasOn)onShow();else{if(gal&&!gal.__intro&&Date.now()-enterAt<600)intro();skyStart();}}
 if(room&&W.ResizeObserver&&ro!==room.__ro){if(ro)ro.disconnect();let lastSz='';ro=new W.ResizeObserver(()=>{const sz=room.clientWidth+'x'+room.clientHeight;if(sz===lastSz)return;lastSz=sz;clearTimeout(W.__cgRo);W.__cgRo=setTimeout(()=>{if(active()){refresh();if(sk)sk.resize();}},90);});ro.observe(room);room.__ro=ro;}
 const tt=q('#cgThreadTitle');if(tt)tt.textContent=tr('room');roomHead(q,ms,state,el);roomFlag();const cx=q('#cgClose');if(cx&&cx.setAttribute)cx.setAttribute('aria-label',tr('back'));
 dmCheck(ms);
 if(!W.LowiCompanionCore&&mateTries<20){mateTries++;setTimeout(refresh,1500);}
 const empty=st.phase==='ready'?(Object.values(prefs.blocks).some(x=>x.blocked)?tr('filtered'):tr('empty')):tr('waiting');
 const shown=ms.filter(x=>!x.demo&&!x.bot&&!blocked(x.uid)).concat(botLines()).sort((a,b)=>(+a.ts||0)-(+b.ts||0));
 if(!pinned&&threadOpen&&lastCount&&ms.length>lastCount)roomRows+=ms.length-lastCount;/* reading older messages: a new one must not push the top row out */
 let from=Math.max(0,shown.length-roomRows);if(roomFocus){const fi=shown.findIndex(x=>x.id===roomFocus);if(fi>=0&&fi<from)from=fi;}
 const rows=shown.slice(from).map((m,j)=>{const i=from+j;return dayLine(m,shown[i-1])+renderMessage(m,ms,shown[i-1],shown[i+1]);});if(from>0)rows.unshift('<div class="cm-more">'+button('earlier',tr('earlier'),'','cs-action cm-morebtn')+'</div>');const html=shown.length?rows.join(''):'<div class="cs-empty"><span class="cs-lantern" aria-hidden="true">✧</span><b>'+tr('emptyTitle')+'</b><p>'+empty+'</p>'+(st.phase==='ready'?button('hello',tr('hi')):'')+'</div>';
 if(!threadOpen&&W.LowiRooms){if(list.__html!==''){list.textContent='';list.__html='';if(stickCtl){stickCtl.pin();stickCtl.rendered();}}}else if(list.__html!==html){patchKids(list,shown.length?rows:[html]);list.__html=html;if(stickCtl){if(ownNew)stickCtl.pin();stickCtl.rendered();}else if(near||ownNew)list.scrollTop=list.scrollHeight;else if(list.scrollTop!==y)list.scrollTop=y;if(fk&&!list.contains(D.activeElement)){const b=[...list.querySelectorAll('[data-chat]')].find(b=>b.dataset.chat===fk.a&&b.dataset.id===fk.id&&b.dataset.uid===fk.uid&&b.dataset.emoji===fk.em);if(b)b.focus({preventScroll:true});}}
 if(ownNew)newCount=0;if(ms.length>lastCount&&!pinned&&!ownNew){newCount+=ms.length-lastCount;if(!isQuiet())q('#csAnnounce').textContent=tr('newMessages');}lastCount=ms.length;
 q('#csJump').innerHTML=newCount&&!pinned&&!ownNew?button('latest','<span aria-hidden="true">↓</span> '+tr('newMessages'),'','cs-jump'):'';
 const parent=ms.find(x=>x.id===ds.draft.reply);q('#csReply').innerHTML=ds.draft.reply?'<div class="cm-replybar"><span>'+tr('replying')+' <b>'+esc(parent?parent.by:tr('gone'))+'</b></span>'+button('noreply','×','aria-label="'+tr('cancel')+'"','')+'</div>':'';
 const inp=q('#cmInput');if(inp.value!==ds.draft.text)inp.value=ds.draft.text;const selN=sel&&(roster().get(sel)||{}).n;inp.placeholder=selN?fill('writeTo',selN):threadOpen?tr('roomMsg'):tr('message');{const ph=q('#cmPhoto');if(ph&&inp.parentNode&&inp.parentNode===ph.parentNode){/* room: photo button left of the field, Telegram-style; galaxy: right of it. DOM order moves too, so focus follows what you see */const left=!!threadOpen&&!selN;if(left&&ph.nextElementSibling!==inp)inp.parentNode.insertBefore(ph,inp);else if(!left&&inp.nextElementSibling!==ph)inp.parentNode.insertBefore(ph,inp.nextSibling);}}inp.setAttribute('aria-label',inp.placeholder);inp.setAttribute('aria-describedby','csDraft csNotice');
 q('#cmSend').setAttribute('aria-label',tr('send'));const toBot=!!(sel&&botOf(sel));q('#cmSend').disabled=(!scope&&!toBot)||(!inp.value.trim()&&!pendingPhoto)||photoBusy||voiceBusy||(!toBot&&(ds.busy||navigator.onLine===false));photoBar(toBot);
 q('#csDraft').textContent=ds.storageOK?(ds.draft.text?tr('draft'):selN?fill('hintTo',selN):tr('hint')):tr('volatile');q('#csCount').textContent=inp.value.length+'/600';q('#csNotice').textContent=notice;
 q('#cmList').setAttribute('aria-label',tr('square'));q('#csAnnounce').setAttribute('aria-live',isQuiet()?'off':'polite');mentions();fit();
}
function refresh(){if(raf)return;raf=requestAnimationFrame(()=>{raf=0;ensureScope();if(store){store.confirm(H.messages());if(transport.state().phase==='ready'){cache=H.messages().map(({id,uid,by,t,ts,re})=>({id,uid,by,t,ts,re,rx:{}}));const json=JSON.stringify(cache);if(json!==cacheJSON){cacheJSON=json;K.write(deviceStorage,cacheKey(),{messages:cache});}}}const el=D.getElementById('cmPaneChat');if(el)mount(el);loadExtras();});}
function mentions(){const inp=D.getElementById('cmInput'),box=D.getElementById('cmMention');if(!inp||!box)return;const match=inp.value.match(/@([\p{L}\p{N}_-]*)$/u);const people=new Map();for(const msg of messages()){if(msg.uid!==scope&&!blocked(msg.uid))people.set(msg.uid,{uid:msg.uid,n:msg.by});}for(const p of roster().values())if(!people.has(p.uid))people.set(p.uid,p);const h=match?[...people.values()].filter(p=>p.n.toLocaleLowerCase().startsWith(match[1].toLocaleLowerCase())).slice(0,4).map(p=>button('mention','@'+esc(p.n),'data-name="'+esc(p.n)+'"')).join(''):'';if(box.innerHTML!==h)box.innerHTML=h;}
function draft(text,reply){if(store)store.setDraft(text,reply);}
/* item 31 (20 Oct): a keystroke used to repaint the whole room (300 rows, the galaxy, the status line) on every letter, so
   typing on the phone ran a full paint per key while the keyboard was up. Typing now only updates the composer. */
let typingNow=false;
function typeDraft(text){if(!store)return;typingNow=true;try{store.setDraft(text,draftState().draft.reply);}finally{typingNow=false;}}
function typed(){const inp=D.getElementById('cmInput'),sb=D.getElementById('cmSend');if(!inp||!sb)return;const ds=draftState(),toBot=!!(sel&&botOf(sel)),selN=sel&&(roster().get(sel)||{}).n;
 sb.disabled=(!scope&&!toBot)||(!inp.value.trim()&&!pendingPhoto)||photoBusy||voiceBusy||(!toBot&&(ds.busy||navigator.onLine===false));
 const d=D.getElementById('csDraft');if(d)d.textContent=ds.storageOK?(ds.draft.text?tr('draft'):selN?fill('hintTo',selN):tr('hint')):tr('volatile');const c=D.getElementById('csCount');if(c)c.textContent=inp.value.length+'/600';}
function comment(who){draft(who?'@'+who+' ':'',null);refresh();focusInput();}
function focusInput(){const i=D.getElementById('cmInput');if(i)i.focus({preventScroll:true});}
function botSend(b){const ds=draftState(),inp=D.getElementById('cmInput'),t=String(ds.draft.text||(inp&&inp.value)||'').trim();if(!t)return;botSay(b.uid,'me',t);draft('',null);if(inp)inp.value='';notice='';
 clearTimeout(botTimer);botTyping='';refresh();const wait=900+Math.min(1600,t.length*25);
 botTimer=setTimeout(()=>{botTyping=b.uid;refresh();botTimer=setTimeout(()=>{botTyping='';botSay(b.uid,'bot',G.botReply(b,t,lang()));speak=b.uid;clearTimeout(speakTimer);speakTimer=setTimeout(()=>{speak='';refresh();},3400);refresh();},1100+Math.min(1400,t.length*18));},wait);}
async function send(retryId){if(!retryId&&pendingPhoto){await sendPhoto();return;}if(!retryId&&sel&&botOf(sel)){botSend(botOf(sel));return;}if(!store||navigator.onLine===false){notice=tr(navigator.onLine===false?'sendOffline':'offline');refresh();return;}const m=own(),name=String(m.n||'').trim();if(!name){notice=tr('name');refresh();return;}notice='';if(!retryId&&sel&&G){const ds=draftState(),p=roster().get(sel);if(p&&ds.draft.text.trim()){const t=G.direct(ds.draft.text,p.n);if(t!==ds.draft.text)draft(t,ds.draft.reply);}}try{await store.submit(name,retryId);}catch(e){notice=tr(navigator.onLine===false?'sendOffline':'sendFailed');}refresh();}
/* ---- Oct 16 (E-man, handoff Task 11): photos in Community chat ----
   A photo is shrunk on the device (longest edge 1600 px, JPEG): re-encoding drops EXIF location and camera data.
   It is uploaded to the app's own media bucket at <uid>/chat-<message id>.jpg, and the message carries its public link.
   Nothing is sent before the user taps send; bots get no photos (their chats are local text only). */
let pendingPhoto=null,photoBusy=false;
/* Oct 16 (E-man on iPad: "it has the button, but clicking on it doesn't even work"): the button used to be DISABLED whenever a galaxy
   bot was picked or you were signed out, so a tap did nothing at all. It now always answers: it opens the picker, or says why it can't. */
function photoBar(toBot){const el=D.getElementById('csPhoto'),btn=D.getElementById('cmPhoto');if(btn){btn.setAttribute('aria-label',tr('photoBtn'));btn.title=tr('photoBtn');btn.disabled=photoBusy||voiceBusy||!!rec;btn.setAttribute('aria-disabled',String(!scope));}
 micSwap();
 const mic=D.getElementById('cmMic');if(mic){const ml=micCanDictate()?tr('micBtn'):tr('voiceBtn');mic.setAttribute('aria-label',ml);mic.title=ml;mic.disabled=photoBusy||voiceBusy||!!pendingPhoto;mic.setAttribute('aria-disabled',String(!scope));}
 if(!el)return;
 if(!pendingPhoto){if(el.innerHTML)el.innerHTML='';return;}
 const pin=pendingPhoto,ai=pin.ai||{},key=pin.id+':'+(ai.st||'')+':'+(pin.wait?1:0);
 if(el.dataset.pid===key&&el.innerHTML)return;el.dataset.pid=key;
 el.innerHTML='<div class="cs-photo-ready'+(ai.st?' cs-food-'+esc(ai.st):'')+'"><img alt="" src="'+esc(pin.preview)+'"><div>'+foodChip(pin)+'<small>'+tr('photoNote')+'</small></div>'+button('photo-clear','×','aria-label="'+tr('photoRemove')+'"','cs-photo-x')+'</div>';
 const ti=el.querySelector('.cs-food-t');if(ti){ti.addEventListener('input',()=>{if(pin.ai)pin.ai.title=ti.value;});ti.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();send();}});}}
/* Oct 27 (E-man, in German: "Wo bleibt eigentlich meine Analyse, wenn ich während oder bevor ich ein Bild in der Community reinposte?
   Der sollte doch das Essen erkennen, genauso wie wenn man bei Mahlzeit sein Essen analysiert ... bevor man das da reinschickt, wenn man
   halt ein paar Sekunden wartet, alles ausgefüllt sein: Titel, was das ist und die ganzen Daten ... damit es dann praktisch genauso aussieht
   wie von dem Bot ... ohne dass man noch was dazu schreiben muss."): a photo added in the composer goes to the same photo check as
   Log meal (LowiFoodAI.analyse -> food-photo). While it runs the chip says "<companion> schaut sich dein Essen an…"; a food read fills in
   the dish name (editable), the spike label, kcal / protein / net carbs and one menu line, and Send posts it as a meal card (the same
   🍽 body + whitelisted detail as Share from Log meal, so everyone sees the same card and its Details). Text stays optional: typed text
   replaces the menu line. Not food, no checks left, offline, an error or more than FOOD_MS: a plain photo post, quietly. Bots: plain photo.
   A good read is remembered by picture (food-photo-ai.js), so the same photo just checked in Log meal uses no second photo check. */
const FOOD_MS=25000;
function compName(){try{const B=W.LowiBirthCompanion,n=B&&B.displayName?String(B.displayName()||'').trim():'';if(n)return n;}catch(e){}return tr('foodComp');}
const LC=()=>['en','de','es'][Math.max(0,lang())]||'en';
function foodNums(tot,net){if(!tot||typeof tot!=='object')return '';const p=[];if(+tot.kcal>0)p.push(Math.round(+tot.kcal)+' kcal');if(+tot.protein>0)p.push(Math.round(+tot.protein)+' g '+tr('foodProt'));
 const n=net!=null&&isFinite(+net)?Math.max(0,Math.round(+net)):(tot.carbs!=null?Math.max(0,Math.round((+tot.carbs||0)-(+tot.fiber||0))):null);if(n!=null&&(p.length||n>0))p.push(n+' g '+tr('foodNet'));return p.join(' · ');}
function spikePill(lvl){const k={low:'mealLow',mid:'mealMid',high:'mealHigh'}[lvl]||'mealMid';return '<span class="cs-meal-bs cs-meal-'+esc(lvl)+'"><i aria-hidden="true"></i>'+esc(tr(k))+'</span>';}
function foodChip(pin){const ai=pin.ai||{};
 if(ai.st==='look')return '<b class="cs-food-l" role="status"><i aria-hidden="true"></i>'+esc((pin.wait?tr('foodWait'):tr('foodLook')).replace('{c}',compName()))+'</b>';
 if(ai.st==='ok'){const nums=foodNums(ai.total,ai.net);return '<input class="cs-food-t" type="text" maxlength="80" enterkeyhint="send" autocomplete="off" spellcheck="false" aria-label="'+esc(tr('foodName'))+'" value="'+esc(ai.title)+'">'+
  '<span class="cs-food-row">'+spikePill(ai.lvl)+(nums?'<span class="cs-food-k">'+esc(nums)+'</span>':'')+'</span>'+(ai.desc?'<span class="cs-food-d">'+esc(ai.desc)+'</span>':'');}
 return '<b>'+tr('photoReady')+'</b>';}
function foodWanted(){if(sel&&botOf(sel))return false;const A=W.LowiFoodAI;if(!A||!A.analyse||!A.prep||!A.endpoint)return false;try{if(!A.endpoint())return false;}catch(e){return false;}return navigator.onLine!==false;}
/* a food read -> what the card shows ({st:'ok', title, lvl, total, net, desc, detail}), or null for a plain photo. The spike label is the
   result screen's own headline (LowiMealResult.verdict + headline: the stricter of the estimate and the food verdict), else bloodSugar(). */
function foodCard(res){if(!res||!res.isFood||!Array.isArray(res.dishes)||!res.dishes.length)return null;const A=W.LowiFoodAI,S=W.LowiMealSnap,MR=W.LowiMealResult,MD=W.LowiMealDetailCore,l=LC();
 let total=res.total;try{if(!total&&A&&A.totals)total=A.totals(res.dishes);}catch(e){}if(!total)return null;
 let title=String(res.title||'').replace(/\s+/g,' ').trim().slice(0,80);try{if(!title&&A&&A.title)title=String(A.title(res.dishes,l)||'').slice(0,80);}catch(e){}if(!title)return null;
 let lvl='',net=null;try{if(MR&&MR.verdict&&MR.headline){const v=MR.verdict(res.dishes,[],res.verdictBlock||null,l),h=MR.headline(v,l);if(h&&/^(low|mid|high)$/.test(h.cls))lvl=h.cls;if(v&&v.net!=null)net=v.net;}}catch(e){lvl='';}
 if(!lvl){try{const b=S&&S.bloodSugar?S.bloodSugar(total,res.dishes):null;if(b){lvl=b.level;net=b.net;}}catch(e){}}if(!/^(low|mid|high)$/.test(lvl))return null;
 return {st:'ok',title,base:title,lvl,total,net,desc:String(res.desc||'').trim().slice(0,160),res};}
function foodDetail(ai,title){const MD=W.LowiMealDetailCore;if(!MD||!MD.fromLog)return null;try{const r=ai.res||{};return MD.fromLog({t:title,ai:{name:title,items:r.dishes||[],total:ai.total,bs:ai.lvl,note:r.note||'',low:r.confidence==='low'}},ai.lvl);}catch(e){return null;}}
async function lookFood(pin,file){if(!pin||!file||!foodWanted())return;const A=W.LowiFoodAI;pin.ai={st:'look'};refresh();let res=null;
 try{const img=await A.prep(null,file);if(!img||pendingPhoto!==pin)throw new Error('prep');res=await A.analyse(img,{lang:LC(),timeout:FOOD_MS,reuse:true});}catch(e){res=null;}
 if(pendingPhoto!==pin)return;let card=null;try{card=foodCard(res);}catch(e){card=null;}pin.ai=card||{st:'plain'};
 if(pin.wait){pin.wait=false;notice='';refresh();sendPhoto();return;}refresh();}
/* Oct 16: while the field is empty (no text, no photo) the mic stands where Send is, like Messages; as soon as you type, Send comes back. */
function micSwap(){const row=D.querySelector('#cmPaneChat .cm-inrow'),inp=D.getElementById('cmInput');if(!row||!row.classList)return;row.classList.toggle('cs-empty',!pendingPhoto&&!String(inp&&inp.value||'').trim());}
function newPhotoId(){try{if(W.crypto&&W.crypto.randomUUID)return 'p'+W.crypto.randomUUID().replace(/-/g,'');}catch(e){}return 'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,10);}
function shrinkPhoto(file){return new Promise((res,rej)=>{if(!file)return rej(new Error('bad'));if(file.type&&!/^image\//.test(file.type))return rej(new Error('bad'));if(file.size>25e6)return rej(new Error('big'));
 let url='';try{url=URL.createObjectURL(file);}catch(e){return rej(new Error('bad'));}const img=new Image();
 img.onload=()=>{try{const w0=img.naturalWidth,h0=img.naturalHeight;if(!w0||!h0)throw new Error('bad');const k=Math.min(1,1600/Math.max(w0,h0)),c=D.createElement('canvas');c.width=Math.max(1,Math.round(w0*k));c.height=Math.max(1,Math.round(h0*k));const g=c.getContext('2d');g.fillStyle='#000';g.fillRect(0,0,c.width,c.height);g.drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);
  const pk=Math.min(1,240/Math.max(c.width,c.height)),pc=D.createElement('canvas');pc.width=Math.max(1,Math.round(c.width*pk));pc.height=Math.max(1,Math.round(c.height*pk));pc.getContext('2d').drawImage(c,0,0,pc.width,pc.height);const preview=pc.toDataURL('image/jpeg',.7);pc.width=pc.height=0;/* BH-014: hand canvas bitmaps back at once (iOS frees them only on GC) */
  c.toBlob(b=>{const w=c.width,h=c.height;c.width=c.height=0;b?res({blob:b,preview,w,h}):rej(new Error('bad'));},'image/jpeg',.82);}catch(e){try{URL.revokeObjectURL(url);}catch(x){}rej(new Error('bad'));}};
 img.onerror=()=>{try{URL.revokeObjectURL(url);}catch(x){}rej(new Error('bad'));};img.src=url;});}
/* Runs synchronously inside the tap's click handler (iOS only opens the picker from a real user gesture), on an input that stays in the
   layout (never display:none or [hidden]). No capture attribute, so iOS offers both Take Photo and Photo Library. Bots get photos too. */
function pickPhoto(){if(photoBusy)return;if(!scope){notice=tr('mediaSignIn');refresh();return;}const f=D.getElementById('cmPhotoFile');if(f){try{f.value='';}catch(e){}f.click();}}
async function takePhoto(file){if(!file)return;try{const p=await shrinkPhoto(file);pendingPhoto={id:newPhotoId(),blob:p.blob,preview:p.preview,w:p.w,h:p.h,src:''};notice='';lookFood(pendingPhoto,file);}catch(e){pendingPhoto=null;notice=tr(e&&e.message==='big'?'photoBig':'photoBad');}refresh();focusInput();}
function clearPhoto(){pendingPhoto=null;const el=D.getElementById('csPhoto');if(el){el.innerHTML='';el.dataset.pid='';}}
async function sendPhoto(){if(photoBusy||!pendingPhoto)return;const bot=sel&&botOf(sel);if(!scope){notice=tr('mediaSignIn');refresh();return;}if((!bot&&!store)||navigator.onLine===false){notice=tr('offline');refresh();return;}const m=own(),name=String(m.n||'').trim();if(!name&&!bot){notice=tr('name');refresh();return;}
 const ds=draftState(),pin=pendingPhoto,p=sel&&roster().get(sel);let cap=String(ds.draft.text||'').trim(),tag='';
 if(!bot&&pin.ai&&pin.ai.st==='look'){pin.wait=true;refresh();return;}const food=!bot&&pin.ai&&pin.ai.st==='ok'?pin.ai:null;
 if(p&&G){const t=G.direct(cap,p.n),at='@'+String(p.n).trim();if(t.toLocaleLowerCase().startsWith(at.toLocaleLowerCase())){tag=t.slice(0,at.length);cap=t.slice(at.length).trim();}}
 photoBusy=true;notice=tr('photoSending');refresh();
 try{let body='',md=null;
  if(food&&K.mealBody){const title=String(food.title||'').replace(/\s+/g,' ').trim()||food.base;const src=pin.msrc||(pin.msrc=await mediaUpload(scope+'/meal-'+pin.id+'.jpg',pin.blob,['image/jpeg']));
   const mb=K.mealBody(src,title,food.lvl,cap||food.desc);if(mb&&K.meal(mb,scope)){body=(tag?tag+' ':'')+mb;const MD=W.LowiMealDetailCore,d=foodDetail(food,title);md=MD&&d?MD.clean(d):null;}}
  if(!body){const path=scope+'/chat-'+pin.id+'.jpg';if(!pin.src)pin.src=await mediaUpload(path,pin.blob,['image/jpeg']);
  body=(tag?tag+' ':'')+K.photoBody(pin.src,cap);if(!K.photo(body,scope))throw new Error('url');}
  if(pendingPhoto===pin)clearPhoto();const left=K.afterCaption(ds.draft,draftState().draft);draft(left.text,left.reply);const inp=D.getElementById('cmInput');if(inp)inp.value=left.text;notice='';photoBusy=false;
  if(bot){botSay(bot.uid,'me',body);botAnswer(bot,tr('botPicR'));}else await store.submitPhoto(name,body,pin.id,ds.draft.reply||null,md);}
 catch(e){photoBusy=false;notice=tr('photoFailed');}
 photoBusy=false;refresh();}
/* ---- Oct 16 (E-man on iPad): shared media upload, voice notes, the connection stream ---- */
/* Oct 22 (Log a meal → Share to Community): opt-in, one tap at a time, never automatic. Uploads the meal photo to <uid>/meal-<id>.jpg and posts
   it to the current Community room through the same outbox as a chat photo, so report/block/delete work on it like any message. */
async function shareMeal(o){o=o||{};ensureScope();if(!scope)throw new Error('signin');if(!store||navigator.onLine===false)throw new Error('offline');const name=String(own().n||'').trim();if(!name)throw new Error('name');
 if(!o.blob)throw new Error('photo');const id=newPhotoId(),src=await mediaUpload(scope+'/meal-'+id+'.jpg',o.blob,['image/jpeg']);
 const body=K.mealBody(src,o.name,o.lvl,o.caption);if(!body||!K.meal(body,scope))throw new Error('bad');const MD=W.LowiMealDetailCore,md=MD&&o.detail?MD.clean(o.detail):null;const row=await store.submitPhoto(name,body,id,null,md);refresh();return row;}
async function mediaUpload(path,blob,types){const sb=H.client?await H.client():null;if(!sb||!sb.storage||!sb.storage.from)throw new Error('client');let err=null;
 for(const ct of types){const up=await sb.storage.from('media').upload(path,blob,{contentType:ct,upsert:true,cacheControl:'31536000'});
  if(up&&!up.error){const pub=sb.storage.from('media').getPublicUrl(path);const u=pub&&pub.data&&pub.data.publicUrl||'';if(!u)throw new Error('url');return u;}err=(up&&up.error)||new Error('upload');}
 throw err||new Error('upload');}
function botAnswer(b,reply){clearTimeout(botTimer);botTyping='';refresh();
 botTimer=setTimeout(()=>{botTyping=b.uid;refresh();botTimer=setTimeout(()=>{botTyping='';botSay(b.uid,'bot',reply);speak=b.uid;clearTimeout(speakTimer);speakTimer=setTimeout(()=>{speak='';refresh();},3400);refresh();},1300);},900);}

/* Voice notes: tap the mic to record and tap the arrow to send, or hold the mic, release to send and slide left to cancel.
   MediaRecorder picks audio/mp4 on iOS Safari and webm/ogg elsewhere. The file goes to <uid>/voice-<id>.<ext> in the media bucket
   (if the bucket refuses the audio type it is stored under the matching video type; an <audio> element plays both), and the
   message body is '🎤 <public URL>#d=<seconds>'. Up to two minutes; at the limit it sends by itself. */
const VOICE_MAX=120;let rec=null,voiceBusy=false,micPress=null,micDownAt=0,micErr='';
function voiceMime(){const MR=W.MediaRecorder;if(!MR)return null;if(typeof MR.isTypeSupported!=='function')return '';
 for(const t of ['audio/mp4;codecs=mp4a.40.2','audio/mp4','audio/aac','audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus'])try{if(MR.isTypeSupported(t))return t;}catch(e){}return '';}
function voiceExt(type){const t=String(type||'');return /webm/.test(t)?'webm':/ogg/.test(t)?'ogg':/aac/.test(t)?'aac':'m4a';}
function micCard(kind){micErr=kind||'';micRetryDictate=false;const el=D.getElementById('csMic');if(!el)return;if(!micErr){el.innerHTML='';return;}
 const T={denied:['micOffT','micDenied'],ask:['micAskT','micAskTap'],busy:['micBusyT','micBusy'],none:['micNoneT','micNone'],old:['micOldT','micOld']}[micErr]||['micOffT','micDenied'];
 el.innerHTML='<div class="cs-mic-card" role="alert"><span class="cs-mic-ic" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" focusable="false"><rect x="9" y="3.5" width="6" height="11" rx="3" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M5.8 11.5a6.2 6.2 0 0 0 12.4 0M12 17.7V20.5M4 4l16 16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></span><div><b>'+esc(tr(T[0]))+'</b><small>'+esc(tr(T[1]))+'</small>'+(micErr==='old'?'':button('mic-retry',esc(tr('micRetry')),'','cs-mic-retry'))+'</div>'+button('mic-close','×','aria-label="'+esc(tr('close'))+'"','cs-photo-x')+'</div>';}
function recUI(){const box=D.getElementById('csRec'),row=D.querySelector('#cmPaneChat .cm-inrow');if(!box)return;const on=!!rec;if(row)row.classList.toggle('cs-recording',on);
 if(!on){if(box.innerHTML)box.innerHTML='';return;}
 if(!box.firstChild)box.innerHTML='<div class="cs-rec" role="group" aria-label="'+esc(tr('recording'))+'"><p class="cs-rec-hint" id="csRecHint" aria-live="polite"></p>'+button('rec-cancel','<svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" focusable="false"><path d="M5 7h14M10 4h4M8 7l.8 12.2A1.8 1.8 0 0 0 10.6 21h2.8a1.8 1.8 0 0 0 1.8-1.8L16 7" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>','aria-label="'+esc(tr('recCancel'))+'"','cs-rec-x')+'<span class="cs-rec-dot" aria-hidden="true"></span><span class="cs-rec-time" id="csRecTime">0:00</span><canvas class="cs-rec-wave" id="csRecWave" aria-hidden="true"></canvas>'+button('rec-send','\u2191','aria-label="'+esc(tr('recSend'))+'"','cs-rec-send')+'</div>';
 const h=D.getElementById('csRecHint');if(h)h.textContent=rec.starting?tr('micAsk'):rec.mode==='hold'?tr('recHold'):tr('recTap');
 box.firstChild.classList.toggle('hold',rec.mode==='hold');box.firstChild.classList.toggle('starting',!!rec.starting);}
function recStart(mode,x,gesture){if(rec||voiceBusy||photoBusy)return;if(!scope){notice=tr('mediaSignIn');refresh();return;}if(navigator.onLine===false){notice=tr('offline');refresh();return;}
 const md=navigator.mediaDevices;if(!md||!md.getUserMedia||!W.MediaRecorder){micCard('old');return;}
 micCard('');notice='';const r={mode,x0:x||0,t0:0,chunks:[],levels:[],starting:true,send:false,cancel:false,gesture:!!gesture};rec=r;
 /* mic fix Oct 28: leave the 'ambient' audio session first, or iPhone / iPad WebKit has no microphone input (mic-session.js) */
 if(W.LowiMicSession){W.LowiMicSession.begin();r.held=true;}if(W.LowiMic&&W.LowiMic.listening&&W.LowiMic.listening())W.LowiMic.stop();
 /* The AudioContext for the live waveform is made here, inside the tap, so iOS lets it run. */
 try{const AC=W.AudioContext||W.webkitAudioContext;if(AC){r.ac=new AC();if(r.ac.resume)r.ac.resume().catch(()=>{});}}catch(e){r.ac=null;}
 refresh();recUI();
 md.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}}).then(stream=>{
  if(rec!==r||r.cancel){stream.getTracks().forEach(t=>t.stop());recClose(r);if(rec===r)rec=null;recUI();refresh();return;}
  const mime=voiceMime();let mr=null;try{mr=mime?new W.MediaRecorder(stream,{mimeType:mime,audioBitsPerSecond:64000}):new W.MediaRecorder(stream);}catch(e){try{mr=new W.MediaRecorder(stream);}catch(x){mr=null;}}
  if(!mr){stream.getTracks().forEach(t=>t.stop());recClose(r);rec=null;recUI();refresh();micCard('old');return;}
  r.stream=stream;r.mr=mr;r.mime=String(mr.mimeType||mime||'audio/mp4');r.starting=false;
  mr.ondataavailable=e=>{if(e.data&&e.data.size)r.chunks.push(e.data);};mr.onstop=()=>recDone(r);
  try{mr.start(250);}catch(e){try{mr.start();}catch(x){stream.getTracks().forEach(t=>t.stop());recClose(r);rec=null;recUI();refresh();micCard('old');return;}}
  r.t0=Date.now();
  try{if(r.ac){const src=r.ac.createMediaStreamSource(stream),an=r.ac.createAnalyser();an.fftSize=512;src.connect(an);r.an=an;r.buf=new Uint8Array(an.fftSize);}}catch(e){r.an=null;}
  r.tick=setInterval(()=>recTick(r),80);recUI();
 }).catch(e=>{recClose(r);if(rec===r)rec=null;recUI();refresh();micFail(r,e&&e.name||'');});}
/* Only a real "no" shows "Mikrofon ist aus": the browser says denied, or the request came straight from a tap and was refused.
   A refusal of a request made without a tap (the hold timer) is retried once from the tap itself (finger up = a user gesture). */
function micFail(r,n){if(r.cancel)return;if(/NotFound|DevicesNotFound|Overconstrained/.test(n)){micCard('none');return;}if(/NotSupported|TypeError/.test(n)){micCard('old');return;}
 if(/NotReadable|TrackStart|Abort/.test(n)){micCard('busy');return;}
 const P=W.LowiMicSession?W.LowiMicSession.permission():Promise.resolve(null);
 P.then(st=>{if(st==='denied'||r.gesture){micCard('denied');return;}if(micPress){micRetryUp=true;return;}micCard('ask');});}
/* BH-046 P-SESSION-OUTLIVES-SCREEN: leaving the chat while a voice message records (room back, Community closes, Home,
   a sheet that hides it) used to keep the microphone open invisibly, and at the 2 minute cap it sent itself. The recording
   now lives only while its bar is on screen: hidden for ~a quarter second = thrown away, never sent. */
function recShown(e){if(!e||!e.isConnected)return false;const b=e.getBoundingClientRect();if(!b.width||!b.height||b.bottom<=0||b.right<=0||b.top>=(W.innerHeight||D.documentElement.clientHeight)||b.left>=(W.innerWidth||D.documentElement.clientWidth))return false;
 if(e.checkVisibility)return e.checkVisibility({visibilityProperty:true,opacityProperty:true});for(let x=e;x&&x.nodeType===1;x=x.parentElement){const cs=getComputedStyle(x);if(cs.display==='none'||cs.visibility==='hidden'||cs.opacity==='0')return false;}return true;}
function recTick(r){if(rec!==r||!r.t0)return;if(!recShown(D.querySelector('#csRec .cs-rec'))){if((r.gone=(r.gone||0)+1)>=3)recStop(false);return;}r.gone=0;const sec=(Date.now()-r.t0)/1000,t=D.getElementById('csRecTime');if(t)t.textContent=mmss(Math.floor(sec));
 let lv=0;if(r.an){try{r.an.getByteTimeDomainData(r.buf);let sum=0;for(let i=0;i<r.buf.length;i++){const d=(r.buf[i]-128)/128;sum+=d*d;}lv=Math.min(1,Math.sqrt(sum/r.buf.length)*4.2);}catch(e){lv=0;}}
 if(!r.an||(!lv&&r.ac&&r.ac.state!=='running'))lv=.18+.14*Math.abs(Math.sin(sec*5.3))*Math.abs(Math.sin(sec*1.7+1));
 r.levels.push(lv);if(r.levels.length>64)r.levels.shift();
 const c=D.getElementById('csRecWave');if(c){const w=c.clientWidth|0,h=c.clientHeight|0,dpr=Math.min(2,W.devicePixelRatio||1);if(w&&h){if(c.width!==Math.round(w*dpr)){c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);}const g=c.getContext('2d');if(g){g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,h);const n=Math.max(8,Math.floor(w/5)),L=r.levels;g.fillStyle='rgba(234,247,255,.92)';
  for(let i=0;i<n;i++){const v=L[L.length-n+i];const bh=v==null?2:Math.max(2,v*(h-4));const x=i*5;g.globalAlpha=v==null?.3:.55+.45*(i/n);g.beginPath();if(g.roundRect)g.roundRect(x,(h-bh)/2,3,bh,1.5);else g.rect(x,(h-bh)/2,3,bh);g.fill();}g.globalAlpha=1;}}}
 if(sec>=VOICE_MAX)recStop(true);}
function recClose(r){clearInterval(r.tick);if(r.held){r.held=false;try{W.LowiMicSession.end();}catch(e){}}try{if(r.stream)r.stream.getTracks().forEach(t=>t.stop());}catch(e){}try{if(r.ac&&r.ac.close)r.ac.close().catch(()=>{});}catch(e){}r.an=null;}
function recStop(send){const r=rec;if(!r)return;r.send=!!send;if(r.starting){if(send){r.mode='tap';recUI();return;}r.cancel=true;rec=null;recClose(r);recUI();refresh();return;}
 if(r.mr&&r.mr.state!=='inactive'){try{r.mr.stop();}catch(e){recDone(r);}}else recDone(r);}
function recDone(r){if(r.done)return;r.done=true;recClose(r);const dur=r.t0?(Date.now()-r.t0)/1000:0;if(rec===r)rec=null;recUI();
 if(!r.send){refresh();return;}if(dur<0.8){notice=tr('voiceShort');refresh();return;}
 const type=String(r.mime||'audio/mp4').split(';')[0],blob=new Blob(r.chunks,{type});if(!blob.size){notice=tr('voiceFailed');refresh();return;}
 sendVoice(blob,Math.min(VOICE_MAX,dur));}
async function sendVoice(blob,dur){const bot=sel&&botOf(sel),p=!bot&&sel&&roster().get(sel);if(!scope){notice=tr('mediaSignIn');refresh();return;}
 if((!bot&&!store)||navigator.onLine===false){notice=tr('offline');refresh();return;}const name=String(own().n||'').trim();if(!name&&!bot){notice=tr('name');refresh();return;}
 voiceBusy=true;notice=tr('voiceSending');refresh();
 try{const id='v'+newPhotoId().slice(1),type=String(blob.type||'audio/mp4').split(';')[0],ext=voiceExt(type),path=scope+'/voice-'+id+'.'+ext;
  const src=await mediaUpload(path,blob,[type,ext==='webm'?'video/webm':ext==='ogg'?'video/ogg':'video/mp4']);
  const body=K.voiceBody(src,dur);if(!body||!K.voice(body,scope))throw new Error('url');
  voiceBusy=false;notice='';
  if(bot){botSay(bot.uid,'me',body);botAnswer(bot,tr('botVoiceR'));}
  else{const tag=p?'@'+String(p.n).trim()+' ':'';await store.submitPhoto(name,tag+body,id,draftState().draft.reply||null);}}
 catch(e){notice=tr('voiceFailed');}
 voiceBusy=false;refresh();}
/* Playing: one shared <audio>; every play button for that note shows play/pause and fills as it plays. */
let vAudio=null,vSrc='';
function voicePlay(btn){const src=btn&&btn.getAttribute('data-src')||'';if(!K.voice||!K.voice('\u{1F3A4} '+src))return;
 if(!vAudio){vAudio=new Audio();vAudio.preload='auto';vAudio.setAttribute('playsinline','');for(const ev of ['timeupdate','play','pause','loadedmetadata'])vAudio.addEventListener(ev,()=>voiceSync());
  vAudio.addEventListener('ended',()=>{vSrc='';voiceSync();});vAudio.addEventListener('error',()=>{if(!vSrc)return;vSrc='';notice=tr('voiceBad');voiceSync();refresh();});}
 if(vSrc===src){if(vAudio.paused)vAudio.play().catch(()=>{});else vAudio.pause();return;}
 vSrc=src;try{vAudio.pause();}catch(e){}vAudio.src=src;const pr=vAudio.play();if(pr&&pr.catch)pr.catch(e=>{if(e&&e.name==='NotSupportedError'){vSrc='';notice=tr('voiceBad');refresh();}voiceSync();});voiceSync();}
/* BH-047 (P-SESSION-OUTLIVES-SCREEN, sibling of BH-046): a voice message kept playing after you left the chat or its room, with no
   button left on screen to stop it (seen on the live site, build 20261026-190121). Leaving the chat pauses it; a playing message whose
   bubble is gone or hidden for three time updates in a row (about 3/4 s: the room closed, the tab changed) pauses too. Scrolling the
   bubble out of view does not count: it is still there. Its place is kept, so a tap on it plays on. */
let vGone=0;function voiceStop(){vGone=0;if(vAudio&&!vAudio.paused){try{vAudio.pause();}catch(e){}}}
function voiceGone(){if(!vAudio||vAudio.paused||!vSrc){vGone=0;return;}let b=null;for(const x of D.querySelectorAll('#cmPaneChat [data-chat="voice"]'))if(x.getAttribute('data-src')===vSrc){b=x;break;}
 const r=b&&b.isConnected&&b.getBoundingClientRect();if(r&&r.width&&r.height){vGone=0;return;}if(++vGone>=3)voiceStop();}
function voiceSync(){voiceGone();const btns=D.querySelectorAll('#cmPaneChat [data-chat="voice"]');if(!btns.length)return;const a=vAudio,d=a&&isFinite(a.duration)&&a.duration>0?a.duration:0;
 for(const b of btns){const on=!!vSrc&&b.getAttribute('data-src')===vSrc,playing=on&&a&&!a.paused,dur=+b.getAttribute('data-dur')||d||0,len=d||dur;
  b.classList.toggle('playing',!!playing);b.setAttribute('aria-pressed',String(!!playing));b.style.setProperty('--vp',on&&len?Math.min(1,a.currentTime/len).toFixed(3):'0');
  const t=b.querySelector('.cs-vt');if(t){const s=on&&a.currentTime>0?mmss(a.currentTime):mmss(dur);if(t.textContent!==s)t.textContent=s;}}}
D.addEventListener('visibilitychange',()=>{if(D.hidden){if(vAudio&&!vAudio.paused)vAudio.pause();if(rec)recStop(false);}});
/* The mic: press starts recording; a quick tap leaves it running (tap the arrow to send), a hold sends on release. */
/* Oct 23 bug hunt: tapping Send moved focus off the message field (the tap's mousedown blurs it), so the keyboard closed after every
   message and the next one needed another tap on the field first. A press on Send while you type keeps the field focused, and the
   send itself puts focus back on it, so the keyboard stays up like in any messenger. */
let sendKeep=false;
function keepTyping(e){const s=e.target&&e.target.closest&&e.target.closest('#cmSend');if(!s||s.disabled)return;const inp=D.getElementById('cmInput');if(!inp||D.activeElement!==inp)return;sendKeep=true;e.preventDefault();}
D.addEventListener('pointerdown',keepTyping,true);D.addEventListener('mousedown',keepTyping,true);
/* ONE mic in the composer (Oct 28, owner: two mic buttons were a duplicate). Tap = speak to type into the text box (the phone's
   own speech recognition through LowiMic.dictate, started inside the tap); hold = voice message (release to send, slide left to
   cancel). Without speech recognition in the browser a tap records a voice message like before (tap the arrow to send). */
let micHoldT=0,micRetryUp=false,micUpAt=0;const MIC_HOLD=320;
function micCanDictate(){const L=W.LowiMic;try{return !!(L&&L.dictate&&L.engine&&L.engine()!=='none');}catch(e){return false;}}
/* Oct 28: a refused dictation shows the same "Mikrofon ist aus" card in the composer as a refused voice message (not a toast over the field); its retry dictates again */
let micRetryDictate=false;
function micDictateUI(st){if(st==='denied'){micCard('denied');micRetryDictate=true;return true;}if(st==='listen'&&micErr){micCard('');}const m=D.getElementById('cmMic');if(!m)return;const on=st==='listen';m.classList.toggle('cs-dictating',on);m.setAttribute('aria-pressed',String(on));}
function micTap(){if(rec){recStop(true);return;}micCard('');
 if(micCanDictate()){const inp=D.getElementById('cmInput');if(inp){notice='';W.LowiMic.dictate(inp,micDictateUI);return;}}
 recStart('tap',0,true);}
D.addEventListener('pointerdown',e=>{const m=e.target&&e.target.closest&&e.target.closest('#cmMic');if(!m||m.disabled)return;if(e.pointerType==='mouse'&&e.button!==0)return;
 e.preventDefault();micDownAt=Date.now();micRetryUp=false;if(rec)return;micPress={id:e.pointerId,x:e.clientX,t:Date.now()};try{m.setPointerCapture(e.pointerId);}catch(x){}
 clearTimeout(micHoldT);if(!micCanDictate()){recStart('hold',e.clientX);return;}
 micHoldT=setTimeout(()=>{if(micPress&&!rec)recStart('hold',micPress.x);},MIC_HOLD);},true);
D.addEventListener('pointermove',e=>{if(!micPress||e.pointerId!==micPress.id||!rec||rec.mode!=='hold')return;const dx=e.clientX-micPress.x,bar=D.querySelector('#csRec .cs-rec');if(bar){bar.classList.toggle('cancelling',dx<-40);bar.style.setProperty('--dx',Math.min(0,Math.max(-120,dx))+'px');}
 if(dx<-110){micPress=null;recStop(false);}},true);
function micUp(e,cancelled){if(!micPress||e.pointerId!==micPress.id)return;const held=Date.now()-micPress.t;micPress=null;clearTimeout(micHoldT);micUpAt=Date.now();
 if(!rec){if(micRetryUp&&!cancelled){micRetryUp=false;recStart('tap',0,true);return;}micRetryUp=false;if(!cancelled&&held<MIC_HOLD&&micCanDictate())micTap();return;}const bar=D.querySelector('#csRec .cs-rec');if(bar){bar.classList.remove('cancelling');bar.style.removeProperty('--dx');}
 if(cancelled||held<MIC_HOLD||rec.starting){rec.mode='tap';recUI();}else recStop(true);}
D.addEventListener('pointerup',e=>micUp(e,false),true);D.addEventListener('pointercancel',e=>micUp(e,true),true);

/* The connection stream (E-man: "when you just click on the companion, that connection is supposed to happen, a connection stream").
   One tap on a companion picks them and sends a glowing, beaded thread of light from your companion to theirs along the same bend
   as the galaxy's threads, with a bright pulse riding it and a ripple where it lands; it then keeps flowing softly while you talk.
   Drawn in an SVG under the companions (cgStream), so it never takes a tap; with Reduce Motion it just fades in, without the flow. */
const SVGNS='http://www.w3.org/2000/svg';
function streamSvg(){const s=D.getElementById('cgStream');if(!s||typeof s.getAttribute!=='function'||typeof s.querySelector!=='function')return null;if(!s.__ok){s.__ok=1;
  s.innerHTML='<defs><linearGradient id="cgStreamG" gradientUnits="userSpaceOnUse"><stop offset="0" class="cs-st-a"/><stop offset="1" class="cs-st-b"/></linearGradient></defs><path class="cs-st-halo"/><path class="cs-st-glow"/><path class="cs-st-core"/><path class="cs-st-beads"/><path class="cs-st-surge"/><circle class="cs-st-comet" r="6"/><circle class="cs-st-ring a" r="10"/><circle class="cs-st-ring b" r="10"/>';}return s;}
function streamDraw(lines,v){const s=streamSvg();if(!s)return false;const L=sel&&lines.find(l=>l.sel);if(!L){if(s.getAttribute('data-on')!=='0')s.setAttribute('data-on','0');return true;}
 const toMe=!L.ame,a=toMe?L.b:L.a,b=toMe?L.a:L.b,ra=toMe?L.rb:L.ra,rb=toMe?L.ra:L.rb;
 const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len,bend=Math.min(90,len*.18);
 const c={x:(a.x+b.x)/2-uy*bend,y:(a.y+b.y)/2+ux*bend};
 const trim=(p,r)=>{const tx=c.x-p.x,ty=c.y-p.y,tl=Math.hypot(tx,ty)||1;return {x:p.x+tx/tl*r,y:p.y+ty/tl*r};};
 const p0=trim(a,(ra||24)+2),p1=trim(b,(rb||24)+2),d='M'+p0.x.toFixed(1)+' '+p0.y.toFixed(1)+'Q'+c.x.toFixed(1)+' '+c.y.toFixed(1)+' '+p1.x.toFixed(1)+' '+p1.y.toFixed(1);
 for(const p of s.querySelectorAll('path'))p.setAttribute('d',d);
 const g=s.querySelector('#cgStreamG');if(g){g.setAttribute('x1',p0.x.toFixed(1));g.setAttribute('y1',p0.y.toFixed(1));g.setAttribute('x2',p1.x.toFixed(1));g.setAttribute('y2',p1.y.toFixed(1));const st=g.querySelectorAll('stop');st[0].setAttribute('stop-color',(toMe?L.to:L.from)||'#9fd6ff');st[1].setAttribute('stop-color',(toMe?L.from:L.to)||'#9fd6ff');}
 const ra1=s.querySelector('.cs-st-ring.a'),rb1=s.querySelector('.cs-st-ring.b');ra1.setAttribute('cx',a.x.toFixed(1));ra1.setAttribute('cy',a.y.toFixed(1));ra1.setAttribute('r',Math.max(12,ra||24).toFixed(1));rb1.setAttribute('cx',b.x.toFixed(1));rb1.setAttribute('cy',b.y.toFixed(1));rb1.setAttribute('r',Math.max(12,rb||24).toFixed(1));
 s.setAttribute('data-dir',toMe?'in':'out');s.setAttribute('data-on','1');s.setAttribute('data-uid',sel);return true;}
function streamSurge(){const s=streamSvg();if(!s)return;s.classList.remove('surge','arrive');void s.getBoundingClientRect();s.classList.add('surge');cancelAnimationFrame(s.__raf);clearTimeout(s.__t);
 const reduce=!!(W.matchMedia&&W.matchMedia('(prefers-reduced-motion: reduce)').matches);
 if(reduce){s.classList.add('arrive');s.__t=setTimeout(()=>s.classList.remove('surge','arrive'),900);return;}
 const t0=performance.now(),dur=900;let arrived=false;
 const step=t=>{const path=s.querySelector('.cs-st-surge'),comet=s.querySelector('.cs-st-comet');if(!path||!comet)return;const k=Math.min(1,(t-t0)/dur),e=1-Math.pow(1-k,3);let len=0;try{len=path.getTotalLength();}catch(x){len=0;}
  if(len){path.style.strokeDasharray=len.toFixed(1)+' '+len.toFixed(1);path.style.strokeDashoffset=(len*(1-e)).toFixed(1);const p=path.getPointAtLength(len*e);comet.setAttribute('cx',p.x.toFixed(1));comet.setAttribute('cy',p.y.toFixed(1));}
  if(k>=1&&!arrived){arrived=true;s.classList.add('arrive');}
  if(t-t0<dur+700)s.__raf=requestAnimationFrame(step);else{s.classList.remove('surge','arrive');path.style.strokeDasharray='';path.style.strokeDashoffset='';}};
 s.__raf=requestAnimationFrame(step);}
/* One tap on a companion (or their name, which sits on the same button): connect, stream, and talk to them right away. */
function connect(uid,name){if(!uid||uid==='me')return;if(uid===scope){sel='';micCard('');refresh();return;}const was=sel;sel=uid;notice='';
 refresh();schedulePlace();requestAnimationFrame(()=>{place();streamSurge();});
 try{const a=D.getElementById('csAnnounce');if(a&&!isQuiet())a.textContent=fill('streamOn',name||(botOf(uid)||{}).n||(roster().get(uid)||{}).n||'');}catch(e){}
 try{if(navigator.vibrate&&was!==uid)navigator.vibrate(8);}catch(e){}}
/* ---- Oct 16 (Task 11): Find My-style person card on a companion tap ----
   Shows only what really exists: their profile photo (if they set one), star sign and personality only when they chose to share them,
   and a status taken from their last message in this chat. Birthdays are never shared, so another member's birthday reads "Not shared".
   Bots are labelled as bots. Actions: Chat (direct line in the galaxy) and Send energy (Adventure log care, real members only). */
function lastSeen(id){let ts=0;for(const m of messages())if(m&&m.uid===id&&!m.status&&+m.ts>ts)ts=+m.ts;return ts;}
function ago(ts){const sec=Math.max(0,(Date.now()-ts)/1000),loc=['en','de','es'][Math.max(0,lang())];try{const f=new Intl.RelativeTimeFormat(loc,{numeric:'auto'});return sec<60?f.format(0,'second'):sec<3600?f.format(-Math.round(sec/60),'minute'):sec<86400?f.format(-Math.round(sec/3600),'hour'):f.format(-Math.round(sec/86400),'day');}catch(e){return new Date(ts).toLocaleString();}}
/* Person-card dates: a YYYY-MM-DD day, a ms timestamp (number or digit string) or an ISO string. Unreadable -> '' so the row hides; never a raw number. */
function pcParse(v){if(v==null||v===''||typeof v==='boolean')return null;let d;const s=String(v).trim();if(typeof v==='number'||/^\d{9,}$/.test(s)){const n=+s;if(!(n>=1e8))return null;d=new Date(n<1e11?n*1000:n);}else if(/^\d{4}-\d{2}-\d{2}$/.test(s))d=new Date(s+'T12:00:00');else if(/^\d{4}-\d{2}-\d{2}T/.test(s))d=new Date(s);else return null;return isNaN(d)?null:d;}
function pcDate(v,year){const d=pcParse(v);if(!d)return '';const o={day:'numeric',month:'long'};if(year)o.year='numeric';try{return d.toLocaleDateString(['en-GB','de-DE','es-ES'][Math.max(0,lang())],o);}catch(e){return '';}}
function pcRow(label,value,muted){return '<div class="cp-row"><span>'+esc(label)+'</span><b'+(muted?' class="cp-muted"':'')+'>'+esc(value)+'</b></div>';}
function openPerson(id,name){if(!id)return;const bt=botOf(id),mine=id===scope;const p=bt?null:profile(id,name),n=bt?bt.n:p.n,key='pc'+sid(id);
 const art=!bt&&p.avatar?'<img class="cp-pic" alt="" src="'+esc(p.avatar)+'">':mate(id,key);
 let st,cls;if(bt){st=tr('botTag');cls='bot';}else if(mine){st=tr('pcYou');cls='me';}else{const ts=lastSeen(id);if(ts&&Date.now()-ts<6048e5){st=fill('pcLast',ago(ts));cls=Date.now()-ts<6e5?'recent':'seen';}else{st=tr('pcQuiet');cls='quiet';}}
 const PS=W.LowiProfileShare,L=['en','de','es'][Math.max(0,lang())],me=mine?own():null,myMd=mine&&PS?PS.monthDay(me.bday):null,md=bt?null:mine?myMd:p.md;
 const sign=bt?bt.sign:mine?(PS?PS.signOf(myMd):(K.SIGNS.includes(me.s)?me.s:'')):p.s,type=bt?'':mine?K.type(me.t):p.t;
 /* 24 Oct 08:30 (Emmanuel): always visible, no consent and no hide toggle, so no shared / not-shared tags. */
 const signTxt=v=>v?(PS?(PS.glyph(v)+'\uFE0E '+PS.signName(v,L)):v):'';
 let rows='',form='';
 if(bt){try{const C=W.LowiCompanionCore;form=C&&C.formName?C.formName(bt.stage,bt.el,['en','de','es'][Math.max(0,lang())]):'';}catch(e){}rows+=pcRow(tr('companion'),bt.mate);}/* 24 Oct (Eman: "What does Tide Radiant even mean?"): the companion's name only, no evolution form word next to it */
 rows+=pcRow(tr('pcSign'),sign?(bt?sign:signTxt(sign)):tr('pcNotYet'),!sign);
 if(bt)rows+=pcRow(tr('born'),[pcDate(bt.bday),fill('ageN',bt.age)].filter(Boolean).join(' · '));
 else if(md&&PS){const nx=PS.next(md);rows+=pcRow(tr('pcBday'),PS.dayMonth(md,L)+' · '+PS.countdown(nx.days,L));}
 else rows+=pcRow(tr('pcBday'),tr('pcNotYet'),true)+(mine&&H.setBday?'<div class="cp-share">'+button('bday-add',esc(tr('psAddBday')),'','cp-act cp-act-pri cp-share-btn')+'</div>':'');
 if(!bt&&!mine)rows+=pcRow(tr('pcType'),type||tr('psNoType'),!type);
 /* own card without a type: the free test in the user's language, and the picker to save the result. Never on someone else's card. */
 if(mine)rows+=type?pcRow(tr('pcType'),type):'<div class="cp-row cp-row-type"><span>'+esc(tr('pcType'))+'</span><b class="cp-muted">'+esc(tr('psNoType'))+'</b></div><div class="cp-typeacts">'+(PS?'<a class="cp-test" href="'+esc(PS.testLink(L))+'" target="_blank" rel="noopener" data-ps-test>'+esc(tr('psTest'))+' ↗</a>':'')+button('type-pick',esc(tr('psSetType')),'','cp-test cp-test-set')+(PS&&PS.testNoteHTML?PS.testNoteHTML(L):'')+'</div>';
 rows+=pcRow(tr('pcLevel'),String(bt?bt.lv+' · '+bt.xp+' XP':p.lv));
 if(bt&&pcDate(bt.since,1))rows+=pcRow(tr('withUs'),pcDate(bt.since,1));
 const care=!bt&&!mine&&W.LowiMicroBook&&typeof W.LowiMicroBook.openCare==='function';
 const acts=mine?button('settings','<i aria-hidden="true">⚙︎</i><span>'+tr('controls')+'</span>','','cp-act'):
  button('select-close','<i aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" focusable="false"><path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v6a2.5 2.5 0 0 1-2.5 2.5H11l-4 4v-4h0A2 2 0 0 1 5 13z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></i><span>'+tr('pcChat')+'</span>','data-uid="'+esc(id)+'" aria-label="'+esc(fill('talkBtn',n))+'"','cp-act cp-act-pri')+
  button('energy','<i aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" focusable="false"><path d="M13 3 6 13.5h5L10 21l7-10.5h-5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg></i><span>'+tr('pcEnergy')+'</span>','data-uid="'+esc(id)+'" data-name="'+esc(n)+'"'+(care?'':' disabled aria-disabled="true" title="'+esc(tr('pcEnergyNo'))+'"'),'cp-act');
 const foot=bt?(bt.line&&bt.line[Math.max(0,lang())]?'<p class="cg-pline">“'+esc(bt.line[Math.max(0,lang())])+'”</p>':'')+'<p class="cp-note">'+tr('botNote')+'</p>':(!mine&&!md?'<p class="cp-note">'+tr('pcSoon')+'</p>':'')+'<p class="cp-note">'+tr('pcSharedNote')+(mine?'':' '+tr('pcLiveNote'))+'</p>'+(!mine?'<p>'+tr('blockNote')+'</p>'+button('block',tr('block'),'data-uid="'+esc(id)+'" data-name="'+esc(n)+'"')+'<p class="cs-result" id="csBlockResult" role="status"></p>':'');
 return sheet('<div class="cp-card" data-person="'+esc(id)+'"><div class="cp-hero"><div class="cp-photo'+(!bt&&p.avatar?' has-pic':'')+'">'+art+'</div><h2>'+esc(n)+(bt?' <span class="cg-bottag">'+tr('botTag')+'</span>':botDash(id,n))+'</h2><p class="cp-live cp-'+cls+'"><i aria-hidden="true"></i><span>'+esc(st)+'</span></p></div><div class="cp-acts">'+acts+'</div><div class="cp-rows">'+rows+'</div>'+foot+'</div>');}
/* 24 Oct 2026 08:30 (Emmanuel: birthday and star sign always on the Community card, no consent ask, no hide toggle). Only an account
   with no birthday saved gets this sheet, from "Add my birthday" on its own card; it says what shows and saves the date (setBday). */
function askBday(){if(!H.setBday)return;sheet('<div class="cp-ask" data-ps-bday><h2>'+tr('psTitle')+'</h2><p>'+esc(tr('psWhy'))+'</p><form data-chat-form="bday"><label>'+esc(tr('psBdayLabel'))+' <input type="date" name="bday" required min="1920-01-01" max="'+new Date().toISOString().slice(0,10)+'"></label><button class="cs-submit cp-act-pri" data-sfx="none">'+tr('save')+'</button><div class="cs-result" role="status"></div></form></div>');}
function resultText(el,t){if(el)el.textContent=t;}
function sheet(html){return H.sheet('<div class="cs-sheet" data-noi18n data-sfx="none">'+html+'</div>');}
function settings(){const m=own();const cp=matePref();sheet('<h2>'+tr('presence')+'</h2><div class="cs-pub cp-pubme">'+mate(scope,'set')+'<div><b>'+esc(m.n||tr('you'))+'</b></div></div><form data-chat-form="mate"><label>'+tr('mateShare')+' <input type="checkbox" name="share" '+(cp.share?'checked':'')+'></label><p>'+tr('mateNote')+'</p><button class="cs-submit" data-sfx="none">'+tr('save')+'</button><div class="cs-result" role="status"></div></form><p>'+tr('noRouting')+'</p><p>'+tr('style')+': <b>'+esc(K.type(m.t)||tr('optional'))+'</b> · '+tr(K.type(m.t)&&m.bday?'sharedType':'private')+'</p><p>'+tr('privacyNote')+'</p><p class="cp-note" data-ps-rule>'+esc(tr('psWhy'))+'</p><h2 style="margin-top:24px">'+tr('quiet')+'</h2><p>'+tr('quietDesc')+'</p><form data-chat-form="quiet"><label>'+tr('quiet')+'<input type="checkbox" name="enabled" '+(prefs.quietEnabled!==false?'checked':'')+'></label><div class="cs-hours"><label>'+tr('from')+' <input aria-label="'+tr('from')+'" type="number" name="start" min="0" max="23" value="'+(prefs.quietStart??22)+'" required></label><label>'+tr('until')+' <input aria-label="'+tr('until')+'" type="number" name="end" min="0" max="23" value="'+(prefs.quietEnd??8)+'" required></label></div><button class="cs-submit" data-sfx="none">'+tr('saveQuiet')+'</button><div class="cs-result" role="status"></div></form><h2 style="margin-top:24px">'+tr('blocked')+'</h2><div id="csBlockedList">'+blockList()+'</div><p class="cs-result" id="csBlockResult" role="status"></p>'+(extrasAttempt==='failed'?'<p>'+tr('extrasMissing')+'</p>':''));}
function blockList(){const ids=Object.keys(prefs.blocks).filter(id=>prefs.blocks[id].blocked);return ids.length?ids.map(id=>'<div class="cs-blockrow"><span>'+esc(prefs.blocks[id].name||'Member')+'</span>'+button('unblock',tr('unblock'),'data-uid="'+esc(id)+'"')+'</div>').join(''):'<p>'+tr('noBlocked')+'</p>';}
/* BH-007: Community prefs live in lowispike.companionprefs.v1; lowispike.companion.v1 is the user's own companion (companion-birth.js), read only to carry over old prefs */
function matePref(){try{let v=JSON.parse(localStorage.getItem('lowispike.companionprefs.v1')||'null');if(!v||typeof v!=='object'){const o=(o => o && typeof o === "object" ? o : {})(JSON.parse(localStorage.getItem('lowispike.companion.v1')||'null'));v=o.bday?{}:o;}return {share:v.share!==false,traits:v.traits!==false,born:+v.born||0};}catch(e){return {share:true,traits:true,born:0};}}
function botProfile(b){const C=W.LowiCompanionCore,l=lang(),loc=['en-GB','de-DE','es-ES'][Math.max(0,l)];let form='';try{form=C&&C.formName?C.formName(b.stage,b.el,['en','de','es'][Math.max(0,l)]):'';}catch(e){}
 const d=s=>pcDate(s,1);
 const row=(k,v)=>'<div class="cg-prow"><span>'+esc(k)+'</span><b>'+esc(v)+'</b></div>';
 return sheet('<h2>'+esc(b.n)+' <span class="cg-bottag">'+tr('botTag')+'</span></h2><div class="cs-pub cg-pbot">'+mate(b.uid,'sh'+sid(b.uid))+'<div><b>'+esc(b.mate)+'</b><br>'+esc(fill('levelN',b.lv))+'</div></div>'+
  '<div class="cg-prows">'+row(tr('companion'),b.mate)+row(tr('levelN').replace('{n}','').trim()||'Level',String(b.lv)+' · '+b.xp+' XP')+row(tr('born'),[d(b.bday),fill('ageN',b.age)].filter(Boolean).join(' · '))+row(tr('sign'),b.sign)+(d(b.since)?row(tr('withUs'),d(b.since)):'')+'</div>'+
  '<p class="cg-pline">“'+esc(b.line[Math.max(0,l)])+'”</p><p>'+tr('botNote')+'</p>'+button('select-close',esc(fill('talkBtn',b.n)),'data-uid="'+esc(b.uid)+'"','cs-action'));}
function openProfile(id,name){if(!blocked(id))return openPerson(id,name);const bt=botOf(id);if(bt)return botProfile(bt);const p=profile(id,name);return sheet('<h2>'+tr('profile')+'</h2><div class="cs-pub">'+mate(id,'sh'+sid(id))+'<div><b>'+esc(p.n)+'</b><br>'+esc([p.t,p.s].filter(Boolean).join(' · ')||tr('noDetails'))+'</div></div><p>'+tr('profileNote')+'</p>'+(id!==scope?'<p>'+tr('blockNote')+'</p>'+button('block',tr('block'),'data-uid="'+esc(id)+'" data-name="'+esc(p.n)+'"')+'<p class="cs-result" id="csBlockResult" role="status"></p>':button('settings',tr('controls'))));}
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
 try{if(form.dataset.chatForm==='mate'){const cur=matePref(),on=!!form.elements.share.checked;localStorage.setItem('lowispike.companionprefs.v1',JSON.stringify({share:on,traits:cur.traits,born:cur.born}));try{W.LOWI_CLOUD_X&&W.LOWI_CLOUD_X.pushProfile&&W.LOWI_CLOUD_X.pushProfile();}catch(e){}resultText(result,tr('mateSaved'));refresh();}
 else if(form.dataset.chatForm==='quiet'){prefs.quietEnabled=form.elements.enabled.checked;prefs.quietStart=+form.elements.start.value;prefs.quietEnd=+form.elements.end.value;resultText(result,persist()?tr('saved'):tr('volatile'));refresh();}
 else if(form.dataset.chatForm==='bday'){const v=form.elements.bday?form.elements.bday.value:'';if(!H.setBday||!(W.LowiProfileShare&&W.LowiProfileShare.monthDay(v)))throw new Error('bday');if(!H.setBday(v))throw new Error('bday');form.dataset.sent='1';resultText(result,tr('psSaved'));refresh();setTimeout(()=>{try{if(W.LowiR2&&W.LowiR2.close)W.LowiR2.close();}catch(x){}setTimeout(()=>openPerson(scope,own().n),260);},700);}
 else if(form.dataset.chatForm==='report'){const mid=form.dataset.mid;if(!messages().some(m=>m.id===mid&&m.uid!==scope))throw new Error('message');const rows=await transport.table('community_reports',(t,u)=>t.insert({reporter_id:u,message_id:mid,reason:form.elements.reason.value}).select('id'));if(!rows||!rows[0]?.id)throw new Error('ack');resultText(result,tr('reportSent'));form.dataset.sent='1';}
 }catch(e){resultText(result,tr(form.dataset.chatForm==='bday'?'psNeedBday':form.dataset.chatForm==='mate'?'volatile':'reportFailed'));}finally{if(form.dataset.sent!=='1')btn.disabled=false;}}
let kbTop=0,kbLift=0;
/* 22 Oct (item 41, Eman on his iPhone: "the text bar is way too low, and when you try to type it doesn't work"). The chat room
   is sized to what the eye sees, not to the page: #app follows the visual viewport (--cr-vv-top / --cr-vv-h, community-tg.css),
   so at rest the composer sits above Safari's toolbar and the home indicator, and with the keyboard up it sits right on the
   keyboard while the top bar, pinned bar and tabs stay put and only the message list gets shorter. iOS also scrolls hidden
   ancestors to show the focused field (the whole page slid up under the status bar); in a room that scroll is put back. */
function roomVV(){
 const v=W.visualViewport,R=D.documentElement;if(!v||!R||!R.style||!R.style.setProperty)return;
 try{
 const list=D.getElementById('cmList'),atEnd=!!(list&&list.scrollHeight-list.scrollTop-list.clientHeight<90);
 const top=Math.max(0,Math.round(v.offsetTop)),h=Math.round(Math.min(v.height,W.innerHeight-top));
 if((R.style.getPropertyValue&&R.style.getPropertyValue('--cr-vv-top'))!==top+'px')R.style.setProperty('--cr-vv-top',top+'px');
 if((R.style.getPropertyValue&&R.style.getPropertyValue('--cr-vv-h'))!==h+'px')R.style.setProperty('--cr-vv-h',h+'px');
 const pane=D.getElementById('cmPaneChat');if(!(pane&&pane.hasAttribute('data-room')&&active()))return;
 const cmp=pane.querySelector('.cm-compose'),ch=cmp&&Math.round(cmp.getBoundingClientRect().height);if(ch&&pane.style.getPropertyValue('--cr-comp-h')!==ch+'px')pane.style.setProperty('--cr-comp-h',ch+'px');
 for(const el of [D.scrollingElement,D.getElementById('app'),D.getElementById('main'),D.getElementById('tab-foryou'),pane.closest('.ls-pager'),D.getElementById('cmTrack'),pane,D.getElementById('cgThread')])if(el&&(el.scrollTop||el.scrollLeft)){el.scrollTop=0;el.scrollLeft=0;}
 if(list&&atEnd&&Date.now()-pinHoldAt>900){list.scrollTop=list.scrollHeight;(W.requestAnimationFrame||setTimeout)(()=>{if(Date.now()-pinHoldAt>900)list.scrollTop=list.scrollHeight;});}
 }catch(e){}
}
function fit(){
 roomVV();
 const pane=D.getElementById('cmPaneChat'),inp=D.getElementById('cmInput'),v=W.visualViewport;
 const focus=!!(pane&&inp&&D.activeElement===inp&&active()),height=v?v.height:W.innerHeight,width=W.innerWidth;
 if(!restHeight||Math.abs(width-restWidth)>100){restHeight=Math.max(W.innerHeight,height);restWidth=width;}
 if(!focus&&!D.documentElement.classList.contains('cs-chat-typing'))restHeight=Math.max(restHeight,height);
 const typing=!!(pane&&active()&&restHeight-height>100);
 D.documentElement.classList.toggle('cs-chat-typing',typing);
 /* Oct 16, round 5: on the map the pane keeps its size and place while you type (see community-chat.css); only the full
    Chat room shrinks above the keyboard. */
 const mapMode=typing&&!threadOpen;D.documentElement.classList.toggle('cs-chat-map-typing',mapMode);
 if(pane&&!mapMode){kbTop=0;kbLift=0;pane.style.setProperty('--cs-vv-top','0px');pane.style.setProperty('--cs-kb-lift','0px');}
 if(!typing){roomKbH=0;return;}
 if(mapMode){const top=v?Math.max(0,Math.round(v.offsetTop)):0,comp=pane.querySelector('.cm-compose');
  for(const el of [D.scrollingElement,D.getElementById('main'),D.getElementById('tab-foryou')])if(el&&el.scrollTop)el.scrollTop=0;
  if(comp){const B=comp.getBoundingClientRect().bottom-kbTop+kbLift;kbTop=top;kbLift=Math.max(0,Math.round(B-(height-8)));}
  pane.style.setProperty('--cs-vv-top',kbTop+'px');pane.style.setProperty('--cs-kb-lift',kbLift+'px');}
 const rect=pane.getBoundingClientRect(),nav=D.getElementById('tabbar');let bottom=v?v.offsetTop+v.height:W.innerHeight;
 if(nav){const n=nav.getBoundingClientRect();if(n.height>20&&n.top>rect.top+100&&n.top<bottom)bottom=n.top-32;}
 /* item 38 (22 Oct evening): in the Chat room the box ends just above the keyboard; the field you type in is measured once the
    layout settles and the box gives up any rest it still hides, and the newest message stays in view when the keyboard opens */
 const l=threadOpen&&D.getElementById('cmList'),stick=!!l&&(!roomKbH||l.scrollHeight-l.scrollTop-l.clientHeight<140),h=Math.max(0,bottom-rect.top-8);
 pane.style.setProperty('--cs-keyboard-height',h+'px');
 if(threadOpen){roomKbH=h;W.requestAnimationFrame(()=>{const r=inp.getBoundingClientRect(),over=Math.ceil(r.bottom+10-bottom);
  if(over>0&&D.activeElement===inp)pane.style.setProperty('--cs-keyboard-height',Math.max(0,h-over)+'px');if(stick&&l&&Date.now()-pinHoldAt>900)l.scrollTop=l.scrollHeight;});}
}
D.addEventListener('change',e=>{if(e.target&&e.target.id==='cmPhotoFile'){const f=e.target.files&&e.target.files[0];takePhoto(f);}});
D.addEventListener('input',e=>{if(e.target.id!=='cmInput')return;typeDraft(e.target.value);micSwap();if(!store){const sb=D.getElementById('cmSend');if(sb)sb.disabled=!(sel&&botOf(sel))||!e.target.value.trim();}mentions();/* item 41: typing can make iOS scroll a hidden ancestor to the caret; in a room put it back (after layout) */if(threadOpen)(W.requestAnimationFrame||setTimeout)(roomVV);});
D.addEventListener('keydown',e=>{if(e.key==='Escape'&&threadOpen&&active()&&!D.querySelector('.r2-ov.on')){/* Oct 22 (item 33): Escape in a room goes to the channel list, like its back arrow *//* item 36: no channel list any more: the tab you came from, else Community closes (section-nav.js back) */const U=W.LowiRoomsUI,S=W.LowiSections;if(U&&U.back&&S&&S.back&&D.documentElement.classList.contains('rm-room-open'))S.back();else thread(false);refresh();const h=D.querySelector('#cgTo .cg-hist');if(h&&h.focus)h.focus({preventScroll:true});return;}if(e.target.id==='cmInput'&&e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();send();}});
D.addEventListener('submit',e=>{const f=e.target;if(!f.matches('form[data-chat-form]'))return;e.preventDefault();e.stopPropagation();if(f.dataset.sent!=='1')submitForm(f);});
D.addEventListener('click',async e=>{const b=e.target.closest&&e.target.closest('[data-chat]');if(!b){const bub=e.target.closest&&e.target.closest('#cmPaneChat [data-chat-bub]');if(bub&&!(W.getSelection&&String(W.getSelection()).trim())){const mid=bub.getAttribute('data-chat-bub'),m=messages().find(x=>x.id===mid);if(m&&!m.status){openId=openId===mid?'':mid;if(pick&&pick!==openId)pick='';refresh();}}return;}e.preventDefault();e.stopPropagation();const a=b.dataset.chat,id=b.dataset.id;
 if(a==='send'){if(sendKeep||D.activeElement===D.getElementById('cmInput'))focusInput();sendKeep=false;send();}else if(a==='reload'){transport.reload();loadExtras(true);}else if(a==='settings')settings();else if(a==='bday-add'){try{if(W.LowiR2&&W.LowiR2.close)W.LowiR2.close();}catch(x){}setTimeout(askBday,260);}else if(a==='type-pick'){try{if(W.LowiR2&&W.LowiR2.close)W.LowiR2.close();}catch(x){}setTimeout(()=>{const t=D.createElement('button');t.setAttribute('data-r5','mbti-pick');t.style.display='none';D.body.appendChild(t);t.click();t.remove();},260);}else if(a==='profile')openProfile(b.dataset.uid,b.dataset.name);else if(a==='person'){connect(b.dataset.uid,b.dataset.name);}else if(a==='voice'){voicePlay(b);}else if(a==='mic'){/* keyboard / switch control only: a pointer tap or hold was already handled on pointerup */if(Date.now()-micDownAt>700&&Date.now()-micUpAt>700)micTap();}else if(a==='rec-send'){recStop(true);}else if(a==='rec-cancel'){recStop(false);}else if(a==='mic-retry'){micCard('');const inp=D.getElementById('cmInput');if(micRetryDictate&&inp&&W.LowiMic&&W.LowiMic.dictate&&micCanDictate()){micRetryDictate=false;W.LowiMic.dictate(inp,micDictateUI);}else{micRetryDictate=false;recStart('tap',0,true);}}else if(a==='mic-close'){micCard('');}else if(a==='photo-pick'){pickPhoto();}else if(a==='photo-clear'){clearPhoto();notice='';refresh();focusInput();}else if(a==='energy'){const u=b.dataset.uid,nm=b.dataset.name;if(!u||botOf(u)||!(W.LowiMicroBook&&W.LowiMicroBook.openCare))return;try{if(W.LowiR2&&W.LowiR2.close)W.LowiR2.close();}catch(x){}setTimeout(()=>{try{W.LowiMicroBook.openCare({uid:u,n:nm},{top:true});}catch(x){}},260);}else if(a==='select'){sel=sel===b.dataset.uid?'':b.dataset.uid;refresh();}else if(a==='to-all'){sel='';refresh();}else if(a==='select-close'){const u=b.dataset.uid||'',nm=b.dataset.name||'';try{if(W.LowiR2&&W.LowiR2.close)W.LowiR2.close();}catch(x){}setTimeout(()=>connect(u,nm),260);}else if(a==='thread'){thread(true,id);refresh();}else if(a==='photo'&&b.dataset.md&&mealDetail(b.dataset.md)){/* a meal photo opens its details (Oct 25) */}else if(a==='photo'){photoView(b.dataset.src,b.dataset.name);}else if(a==='meal-detail'){if(!mealDetail(b.dataset.id))photoView(b.dataset.src||'',b.dataset.name||'');}else if(a==='history'){thread(!threadOpen);refresh();}else if(a==='members'){crewOpen=!crewOpen;refresh();}else if(a==='pin-go'){goPinned(id);}else if(a==='pin-msg'){openId='';pick='';pinMessage(id);}else if(a==='unpin'){openId='';pick='';unpinRoom();}else if(a==='close-thread'){crewOpen=false;/* the room's back button goes back to the channel list, like Telegram *//* item 36: no channel list any more: the tab you came from, else Community closes (section-nav.js back) */const U=W.LowiRoomsUI,S=W.LowiSections;if(U&&U.back&&S&&S.back&&D.documentElement.classList.contains('rm-room-open'))S.back();else thread(false);refresh();const h=D.querySelector('#cgTo .cg-hist');if(h&&h.focus)h.focus({preventScroll:true});}else if(a==='open-galaxy')openGalaxy(b.dataset.uid);else if(a==='hello'){draft(tr('hiText'),null);refresh();focusInput();}else if(a==='more'){openId=openId===id?'':id;if(pick&&pick!==openId)pick='';refresh();}else if(a==='pick'){pick=pick===id?'':id;if(pick)openId=id;refresh();}else if(a==='reply'){openId='';pick='';draft(draftState().draft.text,id);refresh();focusInput();}else if(a==='noreply'){draft(draftState().draft.text,null);refresh();focusInput();}else if(a==='mention'){draft((D.getElementById('cmInput').value||'').replace(/@[\p{L}\p{N}_-]*$/u,'@'+b.dataset.name+' '),draftState().draft.reply);refresh();focusInput();}else if(a==='earlier'){if(stickCtl)stickCtl.release();const l=D.getElementById('cmList'),fromBottom=l?l.scrollHeight-l.scrollTop:0;roomRows+=ROOM_ROWS;paint(D.getElementById('cmPaneChat'));if(l)l.scrollTop=l.scrollHeight-fromBottom;}else if(a==='latest'){const l=D.getElementById('cmList');l.scrollTop=l.scrollHeight;if(stickCtl)stickCtl.pin();newCount=0;refresh();}else if(a==='retry-send')send(id);else if(a==='discard'){store.discard(id);refresh();}else if(a==='react'){pick='';openId='';try{await transport.react(id,b.dataset.emoji,own().n);}catch(x){notice=tr('reactFailed');}refresh();}else if(a==='report')openReport(id);else if(a==='block')blockPerson(b.dataset.uid,b.dataset.name,true);else if(a==='unblock')blockPerson(b.dataset.uid,'',false);else if(a==='delete'){
  if(armed!==id){armed=id;clearTimeout(armTimer);armTimer=setTimeout(()=>{armed='';refresh();},3500);refresh();return;}armed='';b.disabled=true;b.textContent=tr('deleting');try{await transport.remove(id);}catch(x){notice=tr('deleteFailed');}refresh();}
});
D.addEventListener('focusin',fit);D.addEventListener('focusout',()=>requestAnimationFrame(fit));W.addEventListener('resize',()=>{fit();clearTimeout(W.__cpResize);W.__cpResize=setTimeout(()=>{if(active()){refresh();if(sk)sk.resize();}},120);});if(W.visualViewport){W.visualViewport.addEventListener('resize',fit);W.visualViewport.addEventListener('scroll',fit);}roomVV();
D.addEventListener('lowi:chat',e=>{ensureScope();transport.notify(e.detail);if(e.detail&&['ready','reconnect','room'].includes(e.detail.type)){transport.reload();loadExtras(true);}refresh();});
W.addEventListener('online',()=>{if(notice===tr('sendOffline')||notice===tr('offline'))notice='';ensureScope();transport.reload();loadExtras(true);});W.addEventListener('offline',refresh);W.addEventListener('storage',e=>{if(e.key===prefsKey()){prefs=K.read(deviceStorage,prefsKey(),{});prefs.blocks=prefs.blocks||{};refresh();}});
D.addEventListener('visibilitychange',()=>{onShow();if(!D.hidden){transport.reload();loadExtras(true);refresh();}});
try{if(navigator.serviceWorker&&navigator.serviceWorker.addEventListener)navigator.serviceWorker.addEventListener('message',e=>{if(e.data&&e.data.cgTab==='foryou')openGalaxy('');});}catch(e){}
/* Oct 16 (task 1 rework): who lives out in the spirit world, for the 3D world (body-world-3d-scene.js dresses each outer bubble with
   one person's companion and cells, and gathers everyone's companions in the far Community realm). Same companions as the map here. */
function people(){try{ensureScope();const r=[...roster().values()];const me={uid:scope||'me',n:'You',lv:(W.LowiCompanion&&W.LowiCompanion.level&&+W.LowiCompanion.level())||1,me:true};return [me].concat(r).map((p,i)=>({uid:p.uid,name:p.n,lv:+p.lv||1,me:!!p.me,color:hueColor(p.uid,p.me),form:mate(p.me?scope:p.uid,'cw'+i)}));}catch(e){return [];}}
/* 23 Oct 2026 (Emmanuel: tapping a name in Community did nothing): openProfile(uid,name) opens that person's profile card by user id, the same card as a tap on a chat avatar; it returns the card's sheet so the caller can come back when it closes. The name above a message opens it too. */
try{W.addEventListener('lowi-bots',()=>refresh());}catch(e){}
W.LowiCommunity={mount,refresh,send,comment,isQuiet,unread,messageHTML:renderMessage,mentions,fit,settings,openProfile:(uid,name)=>uid?openProfile(String(uid),name||''):null,blocked:id=>!!id&&blocked(String(id)),bots:()=>botList().slice(),people,select:uid=>{sel=uid||'';refresh();},thread:(o,id)=>{thread(o,id);refresh();},directed,latest:()=>{const ms=messages().filter(m=>m&&m.uid&&!m.demo&&!m.status&&!blocked(m.uid));const m=ms[ms.length-1];return m?{id:m.id,uid:m.uid,by:m.by||'',ts:+m.ts||0,text:plain(m),mine:m.uid===scope}:null;},face:(uid,key)=>mate(uid,key),colorOf:uid=>hueColor(uid,false),openMessage:(uid,id)=>{openGalaxy(uid);thread(true,id);refresh();},mealDetail,shareMeal};H.install(W.LowiCommunity);ensureScope();refresh();setInterval(()=>{if(active()){refresh();loadExtras(true);}},60000);
})(window,document);
