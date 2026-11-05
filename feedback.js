/* LOWiSPIKE feedback (Nov 5 2026): Settings > Send feedback for everyone, Settings > Feedback inbox for the owner only.

   Emmanuel: "Highlight the voice note ... most people would want to choose it because it's very simple", "let's say they took seven
   screenshots or even more ... they should be able to flip through the pictures as they're talking", "a Transcribe all button and
   then Copy all transcribed, so if a hundred people send me stuff I don't have to do it one by one", "saves and bundles all the
   images ... so you will know exactly what user said what", "They can choose to be anonymous."

   Send sheet: screenshots first (any order, move left / right, remove), then one big Record button. While recording, the big
   screenshot viewer stays swipeable: only the timer changes, nothing re-renders, so swiping never touches the recorder.
   Adding screenshots is paused while recording (the photo picker can take the microphone away on iPhone).
   Inbox: newest first, select some or all, Transcribe selected (server function, one note after another), Copy selected (one
   text with references), Download package (zip: feedback.txt, feedback.json, one folder per submission with its screenshots and
   voice note, named by its stable FB- reference), Mark done.
   Security lives on the server (supabase/proposals/feedback_20261105.sql): only the owner can read rows and files, whatever this
   file shows. Rules shared with tests: feedback-core.js. */
(function () {
    'use strict';
    const C = window.LowiFeedbackCore;
    if (!C || window.LowiFeedback) return;
    const D = document;

    const TXT = {
        en: {
            title: 'Send feedback', lead: 'Tell us what you like, what is broken or what you wish for. A voice note is the easiest way.',
            addShots: 'Add screenshots', addMore: 'Add more', shotsHint: 'Add screenshots first, then record and swipe through them while you talk.',
            shotsWhileRec: 'You can swipe through your screenshots while recording.',
            record: 'Record a voice note', recordSub: 'Tap, talk, tap Stop', stop: 'Stop', recording: 'Recording',
            again: 'Record again', delVoice: 'Delete voice note', voiceReady: 'Voice note', typeLabel: 'Or type your idea or bug',
            typePh: 'What happened? What would you change?', anon: 'Send without my name',
            anonInfo: 'Your name, account and device are not attached to this feedback in the inbox. Your voice or what your screenshots show can still reveal who you are, and our server keeps a technical record of which account uploaded the files to stop abuse. So this is private, not fully anonymous.',
            limits: 'Up to 30 screenshots and 5 minutes of voice. Screenshots are made smaller before sending. Only the LOWiSPIKE team can see what you send.',
            send: 'Send feedback', sending: 'Sending\u2026', uploading: (a, b) => 'Uploading ' + a + ' of ' + b + '\u2026', close: 'Close',
            thanks: 'Thank you! Your feedback is in.', thanksSub: 'It helps us make LOWiSPIKE better.', done: 'Done',
            left: 'Move left', right: 'Move right', remove: 'Remove', shotN: (i, n) => 'Screenshot ' + i + ' of ' + n,
            tooMany: 'You can add up to 30 screenshots.', badPic: 'This picture could not be read. Try a screenshot (PNG or JPEG).',
            micAsk: 'iPhone did not ask for the microphone yet. Tap Record a voice note again and choose Allow.',
            micStarting: 'Starting the microphone\u2026',
            micDeniedIosWeb: 'The microphone is off for LOWiSPIKE. On your iPhone open Settings \u203a Apps \u203a Safari \u203a Microphone (older iOS: Settings \u203a Safari \u203a Microphone), choose Ask or Allow, then close and reopen LOWiSPIKE.',
            micDeniedIosApp: 'The microphone is off for LOWiSPIKE. Open iPhone Settings \u203a Apps \u203a LOWiSPIKE and turn on Microphone, then tap Record again.',
            micDeniedWeb: 'The microphone is blocked for this site. Allow it in your browser\u2019s site settings, then tap Record again.',
            micBusy: 'Another app is using the microphone. Close it and tap Record again.',
            micNone: 'No microphone was found on this device. You can type your feedback instead.',
            noRec: 'This browser cannot record voice notes. Type your feedback instead.',
            maxVoice: 'Five minutes reached, recording stopped.', keepRec: 'Stop the recording first.',
            leave: 'Leave without sending? Your draft will be lost.',
            signIn: 'Please sign in and go online to send feedback.', offline: 'You seem to be offline. Your draft is still here, try again.',
            missing: 'Feedback is not switched on on the server yet. Your draft is still here.', denied: 'Sending was not allowed. Please sign in again.',
            limit: 'You have sent a lot of feedback this hour. Please try again later.', size: 'A file is too large. Try a shorter voice note or fewer screenshots.',
            files: 'An upload did not finish. Please try again.', error: 'Something went wrong. Your draft is still here, try again.',
            /* inbox */
            inbox: 'Feedback inbox', fNew: 'New', fAll: 'All', selAll: 'Select all', trSel: n => 'Transcribe (' + n + ')', copySel: n => 'Copy (' + n + ')',
            pkg: n => 'Download package (' + n + ')', markDone: 'Mark done', reopen: 'Mark new', transcribe: 'Transcribe', transcript: 'Transcript',
            del: n => 'Delete (' + n + ')', del1: 'Delete', delSure: 'Tap again to delete', delBusy: 'Deleting\u2026',
            deleted: n => (n === 1 ? 'Deleted for good, with its voice note and screenshots.' : 'Deleted ' + n + ' for good, with their voice notes and screenshots.'),
            delDenied: 'Could not delete: run supabase/proposals/feedback_20261105.sql again in the Supabase SQL editor (it gives the owner the right to delete).',
            delFail: 'Could not delete everything. Try again.',
            noTr: 'not transcribed yet', empty: 'No feedback yet.', emptyNew: 'No new feedback.', loading: 'Loading\u2026',
            trBusy: (a, b) => 'Transcribing ' + a + ' of ' + b + '\u2026', trDone: (a, b) => a + ' of ' + b + ' transcribed.',
            trNone: 'Nothing to transcribe in the selection.', copied: n => 'Copied ' + n + ' feedback entries.', copyFail: 'Copy failed. Long-press the text below to copy it.',
            pkgBusy: (a, b) => 'Packing file ' + a + ' of ' + b + '\u2026', pkgDone: 'Package ready.', pkgBig: 'That is too much for one package. Select fewer entries.',
            needSql: 'The feedback table is not set up yet: run supabase/proposals/feedback_20261105.sql in the Supabase SQL editor.',
            needFn: 'Transcribing needs the feedback-transcribe function: deploy supabase/functions/feedback-transcribe.',
            needKey: 'The transcribe function has no GEMINI_API_KEY secret.', busy: 'The transcriber is busy. Try again in a minute.',
            notOwner: 'Only the app owner can open the feedback inbox.', anonymous: 'Without name', text: 'Text', voice: 'Voice note', shots: 'Screenshots',
            secs: s => s + ' s', selected: n => n + ' selected', more: 'Load more', refresh: 'Refresh'
        },
        de: {
            title: 'Feedback senden', lead: 'Sag uns, was dir gef\u00e4llt, was kaputt ist oder was du dir w\u00fcnschst. Eine Sprachnachricht ist am einfachsten.',
            addShots: 'Screenshots hinzuf\u00fcgen', addMore: 'Mehr hinzuf\u00fcgen', shotsHint: 'F\u00fcge erst Screenshots hinzu, dann nimm auf und wische beim Reden durch sie.',
            shotsWhileRec: 'Du kannst w\u00e4hrend der Aufnahme durch deine Screenshots wischen.',
            record: 'Sprachnachricht aufnehmen', recordSub: 'Tippen, reden, Stopp tippen', stop: 'Stopp', recording: 'Aufnahme',
            again: 'Neu aufnehmen', delVoice: 'Sprachnachricht l\u00f6schen', voiceReady: 'Sprachnachricht', typeLabel: 'Oder schreib deine Idee oder den Fehler',
            typePh: 'Was ist passiert? Was w\u00fcrdest du \u00e4ndern?', anon: 'Ohne meinen Namen senden',
            anonInfo: 'Dein Name, Konto und Ger\u00e4t werden im Postfach nicht mit diesem Feedback angezeigt. Deine Stimme oder was deine Screenshots zeigen, kann trotzdem verraten, wer du bist, und unser Server speichert technisch, welches Konto die Dateien hochgeladen hat, um Missbrauch zu stoppen. Es ist also privat, aber nicht v\u00f6llig anonym.',
            limits: 'Bis zu 30 Screenshots und 5 Minuten Sprache. Screenshots werden vor dem Senden verkleinert. Nur das LOWiSPIKE-Team sieht, was du sendest.',
            send: 'Feedback senden', sending: 'Wird gesendet\u2026', uploading: (a, b) => 'Lade ' + a + ' von ' + b + ' hoch\u2026', close: 'Schlie\u00dfen',
            thanks: 'Danke! Dein Feedback ist angekommen.', thanksSub: 'Es hilft uns, LOWiSPIKE besser zu machen.', done: 'Fertig',
            left: 'Nach links', right: 'Nach rechts', remove: 'Entfernen', shotN: (i, n) => 'Screenshot ' + i + ' von ' + n,
            tooMany: 'Du kannst bis zu 30 Screenshots hinzuf\u00fcgen.', badPic: 'Dieses Bild lie\u00df sich nicht lesen. Versuch einen Screenshot (PNG oder JPEG).',
            micAsk: 'Das iPhone hat noch nicht nach dem Mikrofon gefragt. Tippe nochmal auf Sprachnachricht aufnehmen und w\u00e4hle Erlauben.',
            micStarting: 'Mikrofon startet\u2026',
            micDeniedIosWeb: 'Das Mikrofon ist f\u00fcr LOWiSPIKE aus. \u00d6ffne am iPhone Einstellungen \u203a Apps \u203a Safari \u203a Mikrofon (\u00e4lteres iOS: Einstellungen \u203a Safari \u203a Mikrofon), w\u00e4hle Fragen oder Erlauben, dann schlie\u00df LOWiSPIKE und \u00f6ffne es neu.',
            micDeniedIosApp: 'Das Mikrofon ist f\u00fcr LOWiSPIKE aus. \u00d6ffne Einstellungen \u203a Apps \u203a LOWiSPIKE und schalte Mikrofon ein, dann tippe nochmal auf Aufnehmen.',
            micDeniedWeb: 'Das Mikrofon ist f\u00fcr diese Seite blockiert. Erlaube es in den Website-Einstellungen deines Browsers, dann tippe nochmal auf Aufnehmen.',
            micBusy: 'Eine andere App nutzt gerade das Mikrofon. Schlie\u00df sie und tippe nochmal auf Aufnehmen.',
            micNone: 'Auf diesem Ger\u00e4t wurde kein Mikrofon gefunden. Du kannst dein Feedback auch schreiben.',
            noRec: 'Dieser Browser kann keine Sprachnachrichten aufnehmen. Schreib dein Feedback stattdessen.',
            maxVoice: 'F\u00fcnf Minuten erreicht, Aufnahme gestoppt.', keepRec: 'Stoppe zuerst die Aufnahme.',
            leave: 'Ohne Senden schlie\u00dfen? Dein Entwurf geht verloren.',
            signIn: 'Bitte melde dich an und geh online, um Feedback zu senden.', offline: 'Du scheinst offline zu sein. Dein Entwurf ist noch da, versuch es nochmal.',
            missing: 'Feedback ist auf dem Server noch nicht eingeschaltet. Dein Entwurf ist noch da.', denied: 'Senden wurde nicht erlaubt. Bitte melde dich neu an.',
            limit: 'Du hast diese Stunde schon viel Feedback gesendet. Bitte versuch es sp\u00e4ter.', size: 'Eine Datei ist zu gro\u00df. Versuch eine k\u00fcrzere Sprachnachricht oder weniger Screenshots.',
            files: 'Ein Upload wurde nicht fertig. Bitte versuch es nochmal.', error: 'Etwas ist schiefgelaufen. Dein Entwurf ist noch da, versuch es nochmal.',
            inbox: 'Feedback-Postfach', fNew: 'Neu', fAll: 'Alle', selAll: 'Alle ausw\u00e4hlen', trSel: n => 'Transkribieren (' + n + ')', copySel: n => 'Kopieren (' + n + ')',
            pkg: n => 'Paket laden (' + n + ')', markDone: 'Erledigt', reopen: 'Wieder neu', transcribe: 'Transkribieren', transcript: 'Transkript',
            del: n => 'L\u00f6schen (' + n + ')', del1: 'L\u00f6schen', delSure: 'Nochmal tippen zum L\u00f6schen', delBusy: 'L\u00f6sche\u2026',
            deleted: n => (n === 1 ? 'Endg\u00fcltig gel\u00f6scht, mit Sprachnachricht und Screenshots.' : n + ' endg\u00fcltig gel\u00f6scht, mit Sprachnachrichten und Screenshots.'),
            delDenied: 'L\u00f6schen ging nicht: f\u00fchre supabase/proposals/feedback_20261105.sql nochmal im Supabase SQL Editor aus (das gibt dem Owner das L\u00f6schrecht).',
            delFail: 'Nicht alles konnte gel\u00f6scht werden. Versuch es nochmal.',
            noTr: 'noch nicht transkribiert', empty: 'Noch kein Feedback.', emptyNew: 'Kein neues Feedback.', loading: 'L\u00e4dt\u2026',
            trBusy: (a, b) => 'Transkribiere ' + a + ' von ' + b + '\u2026', trDone: (a, b) => a + ' von ' + b + ' transkribiert.',
            trNone: 'In der Auswahl gibt es nichts zu transkribieren.', copied: n => n + ' Feedback-Eintr\u00e4ge kopiert.', copyFail: 'Kopieren fehlgeschlagen. Halte den Text unten gedr\u00fcckt, um ihn zu kopieren.',
            pkgBusy: (a, b) => 'Packe Datei ' + a + ' von ' + b + '\u2026', pkgDone: 'Paket fertig.', pkgBig: 'Das ist zu viel f\u00fcr ein Paket. W\u00e4hle weniger Eintr\u00e4ge.',
            needSql: 'Die Feedback-Tabelle fehlt noch: f\u00fchre supabase/proposals/feedback_20261105.sql im Supabase SQL Editor aus.',
            needFn: 'Zum Transkribieren fehlt die Funktion feedback-transcribe: supabase/functions/feedback-transcribe bereitstellen.',
            needKey: 'Der Transkriptions-Funktion fehlt das Secret GEMINI_API_KEY.', busy: 'Der Transkriptions-Dienst ist besch\u00e4ftigt. Versuch es in einer Minute.',
            notOwner: 'Nur der App-Inhaber kann das Feedback-Postfach \u00f6ffnen.', anonymous: 'Ohne Namen', text: 'Text', voice: 'Sprachnachricht', shots: 'Screenshots',
            secs: s => s + ' s', selected: n => n + ' ausgew\u00e4hlt', more: 'Mehr laden', refresh: 'Aktualisieren'
        },
        es: {
            title: 'Enviar comentarios', lead: 'Cu\u00e9ntanos qu\u00e9 te gusta, qu\u00e9 falla o qu\u00e9 deseas. Una nota de voz es lo m\u00e1s f\u00e1cil.',
            addShots: 'A\u00f1adir capturas', addMore: 'A\u00f1adir m\u00e1s', shotsHint: 'A\u00f1ade primero las capturas, luego graba y desl\u00edzalas mientras hablas.',
            shotsWhileRec: 'Puedes deslizar tus capturas mientras grabas.',
            record: 'Grabar nota de voz', recordSub: 'Toca, habla, toca Parar', stop: 'Parar', recording: 'Grabando',
            again: 'Grabar de nuevo', delVoice: 'Borrar nota de voz', voiceReady: 'Nota de voz', typeLabel: 'O escribe tu idea o el error',
            typePh: '\u00bfQu\u00e9 pas\u00f3? \u00bfQu\u00e9 cambiar\u00edas?', anon: 'Enviar sin mi nombre',
            anonInfo: 'Tu nombre, cuenta y dispositivo no se muestran con este comentario en el buz\u00f3n. Tu voz o lo que muestran tus capturas pueden revelar qui\u00e9n eres, y nuestro servidor guarda un registro t\u00e9cnico de qu\u00e9 cuenta subi\u00f3 los archivos para frenar abusos. Es privado, no totalmente an\u00f3nimo.',
            limits: 'Hasta 30 capturas y 5 minutos de voz. Las capturas se reducen antes de enviarlas. Solo el equipo de LOWiSPIKE ve lo que env\u00edas.',
            send: 'Enviar comentarios', sending: 'Enviando\u2026', uploading: (a, b) => 'Subiendo ' + a + ' de ' + b + '\u2026', close: 'Cerrar',
            thanks: '\u00a1Gracias! Recibimos tus comentarios.', thanksSub: 'Nos ayudan a mejorar LOWiSPIKE.', done: 'Listo',
            left: 'Mover a la izquierda', right: 'Mover a la derecha', remove: 'Quitar', shotN: (i, n) => 'Captura ' + i + ' de ' + n,
            tooMany: 'Puedes a\u00f1adir hasta 30 capturas.', badPic: 'No se pudo leer esta imagen. Prueba con una captura (PNG o JPEG).',
            micAsk: 'El iPhone a\u00fan no ha pedido el micr\u00f3fono. Toca de nuevo Grabar nota de voz y elige Permitir.',
            micStarting: 'Iniciando el micr\u00f3fono\u2026',
            micDeniedIosWeb: 'El micr\u00f3fono est\u00e1 desactivado para LOWiSPIKE. En el iPhone abre Ajustes \u203a Apps \u203a Safari \u203a Micr\u00f3fono (iOS antiguo: Ajustes \u203a Safari \u203a Micr\u00f3fono), elige Preguntar o Permitir y luego cierra y vuelve a abrir LOWiSPIKE.',
            micDeniedIosApp: 'El micr\u00f3fono est\u00e1 desactivado para LOWiSPIKE. Abre Ajustes \u203a Apps \u203a LOWiSPIKE y activa Micr\u00f3fono, luego toca Grabar de nuevo.',
            micDeniedWeb: 'El micr\u00f3fono est\u00e1 bloqueado para este sitio. Perm\u00edtelo en los ajustes del sitio de tu navegador y toca Grabar de nuevo.',
            micBusy: 'Otra app est\u00e1 usando el micr\u00f3fono. Ci\u00e9rrala y toca Grabar de nuevo.',
            micNone: 'No se encontr\u00f3 ning\u00fan micr\u00f3fono en este dispositivo. Puedes escribir tus comentarios.',
            noRec: 'Este navegador no puede grabar notas de voz. Escribe tus comentarios.',
            maxVoice: 'Cinco minutos alcanzados, grabaci\u00f3n detenida.', keepRec: 'Para la grabaci\u00f3n primero.',
            leave: '\u00bfSalir sin enviar? Se perder\u00e1 tu borrador.',
            signIn: 'Inicia sesi\u00f3n y con\u00e9ctate para enviar comentarios.', offline: 'Parece que no tienes conexi\u00f3n. Tu borrador sigue aqu\u00ed, int\u00e9ntalo de nuevo.',
            missing: 'Los comentarios a\u00fan no est\u00e1n activados en el servidor. Tu borrador sigue aqu\u00ed.', denied: 'No se permiti\u00f3 el env\u00edo. Inicia sesi\u00f3n de nuevo.',
            limit: 'Has enviado muchos comentarios esta hora. Int\u00e9ntalo m\u00e1s tarde.', size: 'Un archivo es demasiado grande. Prueba una nota m\u00e1s corta o menos capturas.',
            files: 'Una subida no termin\u00f3. Int\u00e9ntalo de nuevo.', error: 'Algo sali\u00f3 mal. Tu borrador sigue aqu\u00ed, int\u00e9ntalo de nuevo.',
            inbox: 'Buz\u00f3n de comentarios', fNew: 'Nuevos', fAll: 'Todos', selAll: 'Seleccionar todo', trSel: n => 'Transcribir (' + n + ')', copySel: n => 'Copiar (' + n + ')',
            pkg: n => 'Descargar paquete (' + n + ')', markDone: 'Hecho', reopen: 'Marcar nuevo', transcribe: 'Transcribir', transcript: 'Transcripci\u00f3n',
            del: n => 'Borrar (' + n + ')', del1: 'Borrar', delSure: 'Toca otra vez para borrar', delBusy: 'Borrando\u2026',
            deleted: n => (n === 1 ? 'Borrado para siempre, con su nota de voz y capturas.' : n + ' borrados para siempre, con sus notas de voz y capturas.'),
            delDenied: 'No se pudo borrar: vuelve a ejecutar supabase/proposals/feedback_20261105.sql en el editor SQL de Supabase (da al propietario el derecho a borrar).',
            delFail: 'No se pudo borrar todo. Int\u00e9ntalo de nuevo.',
            noTr: 'a\u00fan sin transcribir', empty: 'A\u00fan no hay comentarios.', emptyNew: 'No hay comentarios nuevos.', loading: 'Cargando\u2026',
            trBusy: (a, b) => 'Transcribiendo ' + a + ' de ' + b + '\u2026', trDone: (a, b) => a + ' de ' + b + ' transcritos.',
            trNone: 'No hay nada que transcribir en la selecci\u00f3n.', copied: n => n + ' comentarios copiados.', copyFail: 'No se pudo copiar. Mant\u00e9n pulsado el texto de abajo para copiarlo.',
            pkgBusy: (a, b) => 'Empaquetando archivo ' + a + ' de ' + b + '\u2026', pkgDone: 'Paquete listo.', pkgBig: 'Es demasiado para un paquete. Selecciona menos.',
            needSql: 'Falta la tabla de comentarios: ejecuta supabase/proposals/feedback_20261105.sql en el editor SQL de Supabase.',
            needFn: 'Para transcribir falta la funci\u00f3n feedback-transcribe: despliega supabase/functions/feedback-transcribe.',
            needKey: 'La funci\u00f3n de transcripci\u00f3n no tiene el secreto GEMINI_API_KEY.', busy: 'El transcriptor est\u00e1 ocupado. Int\u00e9ntalo en un minuto.',
            notOwner: 'Solo el due\u00f1o de la app puede abrir el buz\u00f3n.', anonymous: 'Sin nombre', text: 'Texto', voice: 'Nota de voz', shots: 'Capturas',
            secs: s => s + ' s', selected: n => n + ' seleccionados', more: 'Cargar m\u00e1s', refresh: 'Actualizar'
        }
    };
    const lang = () => { try { const g = window.LowiLang && LowiLang.get && LowiLang.get(); return TXT[g] ? g : 'en'; } catch (e) { return 'en'; } };
    const T = () => TXT[lang()];
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const build = () => ((D.querySelector('meta[name="lowi-build"]') || {}).content) || '';
    const PACK_MAX = 300 * 1024 * 1024; /* one package in the phone's memory; more than that: select fewer */

    /* the signed-in cloud client, the same way the owner tools get it; null when signed out or offline */
    async function client() {
        const x = window.LOWI_CLOUD_X;
        if (!x || navigator.onLine === false) return null;
        let s = null; try { s = x.state && x.state(); } catch (e) { }
        if (!s || !s.uid || !s.live) return null;
        try { return await x.client(); } catch (e) { return null; }
    }
    const isOwner = () => { try { return !!(window.LowiOwnerAdmin && LowiOwnerAdmin.isOwner()); } catch (e) { return false; } };

    const IC = {
        x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>',
        mic: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/></svg>',
        stop: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor"/></svg>',
        img: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="2.5" stroke="currentColor" stroke-width="1.7" fill="none"/><circle cx="9" cy="10" r="1.6" fill="currentColor"/><path d="M5 17l4.5-4.5 3 3L15 13l4 4" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linejoin="round"/></svg>',
        l: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 6l-6 6 6 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
        r: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 6l6 6-6 6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>'
    };

    /* ---------- overlay shell (one at a time, above Settings) ---------- */
    let OV = null, onClose = null;
    function shell(cls, title, body) {
        closeShell(true);
        const o = D.createElement('div');
        o.className = 'fbk-ov ' + cls;
        o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-labelledby', 'fbkTitle');
        o.innerHTML = '<div class="fbk-panel"><div class="fbk-head"><h2 id="fbkTitle">' + esc(title) + '</h2><button type="button" class="fbk-x" data-fbk="close" aria-label="' + esc(T().close) + '">' + IC.x + '</button></div><div class="fbk-body">' + body + '</div></div>';
        D.body.appendChild(o);
        OV = o;
        try { o.querySelector('.fbk-x').focus({ preventScroll: true }); } catch (e) { }
        return o;
    }
    function closeShell(force) {
        if (!OV) return true;
        if (!force && onClose && onClose() === false) return false;
        OV.remove(); OV = null; onClose = null;
        return true;
    }
    D.addEventListener('keydown', e => { if (e.key === 'Escape' && OV) { e.stopPropagation(); closeShell(false); } }, true);

    /* ======================= SEND ======================= */
    const S = { shots: [], voice: null, rec: null, busy: false, cur: 0, micWait: false, micErr: null };
    function resetDraft() {
        S.shots.forEach(s => { try { URL.revokeObjectURL(s.url); } catch (e) { } });
        if (S.voice) try { URL.revokeObjectURL(S.voice.url); } catch (e) { }
        S.shots = []; S.voice = null; S.busy = false; S.cur = 0;
    }
    const $ = sel => OV && OV.querySelector(sel);
    function say(msg, kind) { const el = $('.fbk-status'); if (el) { el.textContent = msg || ''; el.className = 'fbk-status' + (kind ? ' ' + kind : ''); } }

    function openSend() {
        const t = T();
        resetDraft();
        const o = shell('fbk-send', t.title,
            '<p class="fbk-lead">' + esc(t.lead) + '</p>' +
            '<div class="fbk-shots"></div>' +
            '<div class="fbk-voice"></div>' +
            '<label class="fbk-lbl" for="fbkText">' + esc(t.typeLabel) + '</label>' +
            '<textarea id="fbkText" class="fbk-text" maxlength="' + C.MAX_TEXT + '" rows="3" placeholder="' + esc(t.typePh) + '"></textarea>' +
            '<label class="fbk-anon"><input type="checkbox" id="fbkAnon"><span>' + esc(t.anon) + '</span></label>' +
            '<p class="fbk-anon-info" id="fbkAnonInfo">' + esc(t.anonInfo) + '</p>' +
            '<p class="fbk-limits">' + esc(t.limits) + '</p>' +
            '<p class="fbk-status" role="status" aria-live="polite"></p>' +
            '<button type="button" class="fbk-send-btn" data-fbk="send" disabled>' + esc(t.send) + '</button>' +
            '<input type="file" id="fbkFile" accept="image/*" multiple hidden>');
        o.querySelector('#fbkAnon').setAttribute('aria-describedby', 'fbkAnonInfo');
        onClose = () => {
            if (S.rec) { say(T().keepRec, 'warn'); return false; }
            if (S.busy) return false;
            if ((S.shots.length || S.voice || (($('#fbkText') || {}).value || '').trim()) && !window.confirm(T().leave)) return false;
            resetDraft();
            return true;
        };
        o.addEventListener('click', onSendClick);
        o.querySelector('#fbkText').addEventListener('input', paintSendBtn);
        o.querySelector('#fbkFile').addEventListener('change', e => { addFiles(e.target.files); e.target.value = ''; });
        paintShots(); paintVoice(); paintSendBtn();
    }

    function onSendClick(e) {
        const b = e.target.closest('[data-fbk]');
        if (!b || b.disabled) return;
        const a = b.getAttribute('data-fbk'), i = b.hasAttribute('data-i') ? +b.getAttribute('data-i') : S.cur;
        if (a === 'close') closeShell(false);
        else if (a === 'add') { if (!S.rec) $('#fbkFile').click(); }
        else if (a === 'left' || a === 'right') { S.shots = C.move(S.shots, i, a === 'left' ? -1 : 1); S.cur = Math.max(0, i + (a === 'left' ? -1 : 1)); paintShots(); }
        else if (a === 'remove') { const s = S.shots.splice(i, 1)[0]; if (s) try { URL.revokeObjectURL(s.url); } catch (er) { } S.cur = Math.min(S.cur, S.shots.length - 1); paintShots(); paintSendBtn(); }
        else if (a === 'thumb') { scrollTo(i); }
        else if (a === 'rec') startRec();
        else if (a === 'stop') stopRec();
        else if (a === 'delvoice') { if (S.voice) try { URL.revokeObjectURL(S.voice.url); } catch (er) { } S.voice = null; paintVoice(); paintSendBtn(); }
        else if (a === 'send') send();
        else if (a === 'done') closeShell(true);
    }

    /* --- screenshots: big swipeable viewer + small strip with order controls --- */
    function paintShots() {
        const el = $('.fbk-shots'), t = T();
        if (!el) return;
        const n = S.shots.length;
        OV.classList.toggle('has-shots', n > 0);
        if (!n) {
            el.innerHTML = '<button type="button" class="fbk-add" data-fbk="add"' + (S.rec ? ' disabled' : '') + '>' + IC.img + '<span>' + esc(t.addShots) + '</span></button><p class="fbk-hint">' + esc(t.shotsHint) + '</p>';
            return;
        }
        el.innerHTML =
            '<div class="fbk-view" tabindex="0" aria-roledescription="carousel" aria-label="' + esc(t.shots) + '">' +
            S.shots.map((s, i) => '<figure class="fbk-slide" aria-label="' + esc(t.shotN(i + 1, n)) + '"><img src="' + s.url + '" alt="' + esc(t.shotN(i + 1, n)) + '" draggable="false"><figcaption>' + (i + 1) + ' / ' + n + '</figcaption></figure>').join('') +
            '</div>' +
            '<div class="fbk-ctl" role="group" aria-label="' + esc(t.shots) + '"><button type="button" data-fbk="left" aria-label="' + esc(t.left) + '">' + IC.l + '</button>' +
            '<span class="fbk-ctl-n" aria-live="polite">' + esc(t.shotN(S.cur + 1, n)) + '</span>' +
            '<button type="button" data-fbk="remove" aria-label="' + esc(t.remove) + '">' + IC.x + '</button>' +
            '<button type="button" data-fbk="right" aria-label="' + esc(t.right) + '">' + IC.r + '</button></div>' +
            '<div class="fbk-strip">' +
            S.shots.map((s, i) => '<button type="button" class="fbk-th' + (i === S.cur ? ' on' : '') + '" data-fbk="thumb" data-i="' + i + '" aria-label="' + esc(t.shotN(i + 1, n)) + '"><img src="' + s.url + '" alt=""><b>' + (i + 1) + '</b></button>').join('') +
            (n < C.MAX_SHOTS ? '<button type="button" class="fbk-th-add" data-fbk="add"' + (S.rec ? ' disabled' : '') + ' aria-label="' + esc(t.addMore) + '">+</button>' : '') +
            '</div>' +
            '<p class="fbk-hint">' + esc(S.rec ? t.shotsWhileRec : t.shotsHint) + '</p>';
        const v = el.querySelector('.fbk-view');
        v.addEventListener('scroll', () => {
            const i = Math.round(v.scrollLeft / Math.max(1, v.clientWidth));
            if (S.jump != null) { if (i !== S.jump) return; S.jump = null; } /* a tap on a thumbnail glides there: the pages passed on the way do not count */
            if (i !== S.cur) { S.cur = i; markCur(); }
        }, { passive: true });
        if (S.cur > 0) scrollTo(S.cur, true); else markCur();
    }
    function scrollTo(i, instant) {
        const v = $('.fbk-view');
        if (!v) return;
        const still = instant || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
        S.jump = still ? null : i;
        clearTimeout(S.jumpT); S.jumpT = setTimeout(() => { S.jump = null; }, 1200);
        try { v.scrollTo({ left: i * v.clientWidth, behavior: still ? 'auto' : 'smooth' }); } catch (e) { v.scrollLeft = i * v.clientWidth; }
        S.cur = i;
        markCur();
    }
    /* only the strip highlight, the counter and the move buttons follow the current screenshot; nothing is rebuilt */
    function markCur() {
        if (!OV) return;
        const n = S.shots.length, i = S.cur;
        OV.querySelectorAll('.fbk-th').forEach((th, k) => { th.classList.toggle('on', k === i); if (k === i) { try { th.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { } } });
        const c = OV.querySelector('.fbk-ctl-n'); if (c) c.textContent = T().shotN(i + 1, n);
        const l = OV.querySelector('.fbk-ctl [data-fbk="left"]'), r = OV.querySelector('.fbk-ctl [data-fbk="right"]');
        if (l) l.disabled = i <= 0; if (r) r.disabled = i >= n - 1;
    }
    /* shrink one picture to a JPEG inside SHOT_EDGE; screenshots stay sharp enough to read */
    function shrink(file) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file), im = new Image();
            im.onload = () => {
                try {
                    const f = C.fit(im.naturalWidth, im.naturalHeight), c = D.createElement('canvas');
                    c.width = f.w; c.height = f.h;
                    const g = c.getContext('2d');
                    g.fillStyle = '#fff'; g.fillRect(0, 0, f.w, f.h);
                    g.drawImage(im, 0, 0, f.w, f.h);
                    URL.revokeObjectURL(url);
                    c.toBlob(b => b ? resolve(b) : reject(new Error('encode')), 'image/jpeg', C.SHOT_Q);
                } catch (e) { URL.revokeObjectURL(url); reject(e); }
            };
            im.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode')); };
            im.src = url;
        });
    }
    async function addFiles(list) {
        const t = T(), files = Array.from(list || []).filter(f => /^image\//.test(f.type) || /\.(png|jpe?g|heic|heif|webp|gif)$/i.test(f.name || ''));
        let bad = 0, over = false;
        for (const f of files) {
            if (S.shots.length >= C.MAX_SHOTS) { over = true; break; }
            try { const b = await shrink(f); S.shots.push({ blob: b, url: URL.createObjectURL(b) }); S.cur = S.shots.length - 1; } catch (e) { bad++; }
            if (OV && !S.rec) { paintShots(); paintSendBtn(); } /* each picture shows up as soon as it is ready */
        }
        if (!OV) return;
        paintShots(); paintSendBtn();
        say(over ? t.tooMany : bad ? t.badPic : '', over || bad ? 'warn' : '');
    }

    /* --- voice --- */
    function paintVoice() {
        const el = $('.fbk-voice'), t = T();
        if (!el) return;
        if (S.rec) {
            el.innerHTML = '<div class="fbk-recbox"><span class="fbk-dot" aria-hidden="true"></span><span class="fbk-rec-l">' + esc(t.recording) + '</span><span class="fbk-time" aria-live="off">0:00</span><span class="fbk-max">/ ' + C.mmss(C.MAX_VOICE) + '</span>' +
                '<button type="button" class="fbk-stop" data-fbk="stop">' + IC.stop + '<span>' + esc(t.stop) + '</span></button></div>';
        } else if (S.voice) {
            el.innerHTML = '<div class="fbk-voicebox"><span class="fbk-lbl">' + esc(t.voiceReady) + ' \u00b7 ' + C.mmss(S.voice.secs) + '</span><audio controls preload="metadata" src="' + S.voice.url + '"></audio>' +
                '<div class="fbk-row"><button type="button" class="fbk-chip" data-fbk="rec">' + IC.mic + '<span>' + esc(t.again) + '</span></button><button type="button" class="fbk-chip" data-fbk="delvoice">' + esc(t.delVoice) + '</button></div></div>';
        } else {
            el.innerHTML = '<button type="button" class="fbk-rec" data-fbk="rec">' + IC.mic + '<span><b>' + esc(t.record) + '</b><small>' + esc(t.recordSub) + '</small></span></button>';
        }
    }
    /* --- Nov 5 mic fix (owner: "Why isn't there an allow microphone button with the iOS thing that appears where you can click
       on allow"). Cause: the app's sounds set iPhone's audio session to 'ambient' (mix with the user's music). Ambient has no
       microphone input, so WebKit refused getUserMedia straight away, iOS never showed its "Allow microphone" question, and this
       sheet showed one catch-all line that blamed phone settings. The Community voice messages and the dictation mic already
       switch the session back with LowiMicSession.begin() (mic-session.js); this recorder did not. Now it does, synchronously in
       the tap, before getUserMedia; errors are told apart (C.micError) and only a real "no" points to settings. --- */
    let micFails = 0;
    function micHold() { const M = window.LowiMicSession; if (!M || !M.begin) return false; try { M.begin(); return true; } catch (e) { return false; } }
    function micRelease(h) { if (!h) return; try { window.LowiMicSession.end(); } catch (e) { } }
    function micPerm() {
        const M = window.LowiMicSession;
        if (M && M.permission) return M.permission();
        try { return navigator.permissions.query({ name: 'microphone' }).then(r => (r && r.state) || null, () => null); } catch (e) { return Promise.resolve(null); }
    }
    function micMsg(kind) {
        const t = T();
        if (kind === 'denied') {
            let native = false;
            try { const cap = window.Capacitor; native = !!(cap && cap.isNativePlatform && cap.isNativePlatform()); } catch (e) { }
            const s = C.micSetup(navigator.userAgent, native, navigator.maxTouchPoints);
            return s === 'iosApp' ? t.micDeniedIosApp : s === 'iosWeb' ? t.micDeniedIosWeb : t.micDeniedWeb;
        }
        return kind === 'busy' ? t.micBusy : kind === 'none' ? t.micNone : kind === 'old' ? t.noRec : t.micAsk;
    }
    /* the first getUserMedia call runs inside the tap; a browser that does not take the voice options gets plain audio */
    async function getMic() {
        const md = navigator.mediaDevices;
        try { return await md.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
        catch (e) {
            if (/Overconstrained|Constraint|TypeError|NotSupported/.test((e && e.name) || '')) return md.getUserMedia({ audio: true });
            throw e;
        }
    }
    /* audio/mp4 first (all iPhone Safari records), then the other formats this browser says it can, then its own default:
       a format problem never reaches the person as a microphone problem */
    function makeRecorder(stream) {
        const MR = window.MediaRecorder;
        const opts = C.recOptions(MR && MR.isTypeSupported ? m => MR.isTypeSupported(m) : null);
        for (const o of opts) { try { return o ? new MR(stream, o) : new MR(stream); } catch (e) { } }
        return null;
    }
    async function startRec() {
        const t = T();
        if (S.rec || S.busy || S.micWait) return;
        if (!window.MediaRecorder || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { say(t.noRec, 'warn'); return; }
        const held = micHold();   /* synchronously in the tap, before getUserMedia */
        try { if (window.LowiMic && window.LowiMic.listening && window.LowiMic.listening()) window.LowiMic.stop(); } catch (e) { }
        S.micWait = true;
        say(t.micStarting);
        let stream;
        try { stream = await getMic(); }
        catch (e) {
            S.micWait = false;
            micRelease(held);
            const n = (e && e.name) || '';
            if (/NotAllowed|PermissionDenied/.test(n)) micFails++;
            const perm = await micPerm();
            S.micErr = { name: n, perm, fails: micFails, kind: C.micError(n, perm, micFails) };
            if (OV) say(micMsg(S.micErr.kind), 'warn');
            return;
        }
        S.micWait = false;
        micFails = 0; S.micErr = null;
        if (!OV) { stream.getTracks().forEach(k => k.stop()); micRelease(held); return; }
        const mr = makeRecorder(stream);
        if (!mr) { stream.getTracks().forEach(k => k.stop()); micRelease(held); say(t.noRec, 'warn'); return; }
        if (S.voice) { try { URL.revokeObjectURL(S.voice.url); } catch (e) { } S.voice = null; }
        const R = S.rec = { mr, stream, held, chunks: [], t0: Date.now(), timer: 0, auto: false };
        mr.ondataavailable = ev => { if (ev.data && ev.data.size) R.chunks.push(ev.data); };
        mr.onstop = () => finishRec(R);
        mr.onerror = () => { if (S.rec === R) stopRec(); };
        try { mr.start(1000); }
        catch (e) {
            try { mr.start(); }
            catch (e2) { stream.getTracks().forEach(k => k.stop()); S.rec = null; micRelease(held); say(t.noRec, 'warn'); return; }
        }
        R.timer = setInterval(() => {
            const s = (Date.now() - R.t0) / 1000, el = $('.fbk-time');
            if (el) el.textContent = C.mmss(s);
            if (s >= C.MAX_VOICE) { R.auto = true; stopRec(); }
        }, 250);
        say('');
        OV.classList.add('is-rec');
        paintVoice();
        /* only the hint and the add buttons change in the screenshot area; the viewer itself is not rebuilt */
        OV.querySelectorAll('[data-fbk="add"]').forEach(b => { b.disabled = true; });
        const h = OV.querySelector('.fbk-shots .fbk-hint'); if (h && S.shots.length) h.textContent = t.shotsWhileRec;
        paintSendBtn();
    }
    function stopRec() {
        const R = S.rec;
        if (!R) return;
        clearInterval(R.timer);
        try { if (R.mr.state !== 'inactive') R.mr.stop(); else finishRec(R); } catch (e) { finishRec(R); }
    }
    function finishRec(R) {
        if (R.done) return;
        R.done = true;
        clearInterval(R.timer);
        try { R.stream.getTracks().forEach(k => k.stop()); } catch (e) { }
        micRelease(R.held); R.held = false;
        if (S.rec === R) S.rec = null;
        const type = C.voiceType(R.mr.mimeType || (R.chunks[0] && R.chunks[0].type) || 'audio/mp4');
        const secs = Math.min(C.MAX_VOICE, Math.round((Date.now() - R.t0) / 1000));
        if (R.chunks.length && secs >= 1) {
            const blob = new Blob(R.chunks, { type });
            S.voice = { blob, type, secs, url: URL.createObjectURL(blob) };
        }
        if (!OV) { resetDraft(); return; }
        OV.classList.remove('is-rec');
        OV.querySelectorAll('[data-fbk="add"]').forEach(b => { b.disabled = false; });
        const h = OV.querySelector('.fbk-shots .fbk-hint'); if (h) h.textContent = T().shotsHint;
        paintVoice(); paintSendBtn();
        if (R.auto) say(T().maxVoice, 'warn');
    }
    /* the phone locks or the app goes away: keep what was recorded so far */
    D.addEventListener('visibilitychange', () => { if (D.hidden && S.rec) stopRec(); });

    function draft() {
        const tx = $('#fbkText'), an = $('#fbkAnon');
        return { message: tx ? tx.value : '', anonymous: !!(an && an.checked), voice: S.voice, shots: S.shots };
    }
    function paintSendBtn() {
        const b = $('[data-fbk="send"]');
        if (b) b.disabled = S.busy || !!S.rec || !C.ready(draft());
    }

    async function send() {
        const t = T(), d = draft();
        if (S.busy || S.rec || !C.ready(d)) return;
        const sb = await client();
        if (!sb) { say(navigator.onLine === false ? t.offline : t.signIn, 'warn'); return; }
        S.busy = true; paintSendBtn(); OV.classList.add('is-busy');
        const b = $('[data-fbk="send"]'); if (b) b.textContent = t.sending;
        const key = C.newKey(), total = d.shots.length + (d.voice ? 1 : 0);
        let n = 0, fail = null;
        const up = async (path, blob, type) => {
            n++; say(t.uploading(n, total));
            const r = await sb.storage.from('feedback').upload(path, blob, { contentType: type, upsert: false, cacheControl: '3600' });
            if (r && r.error) throw r.error;
        };
        const shots = [];
        let voicePath = null;
        try {
            for (let i = 0; i < d.shots.length; i++) { const p = C.shotPath(key, i); await up(p, d.shots[i].blob, 'image/jpeg'); shots.push(p); }
            if (d.voice) { voicePath = C.voicePath(key, d.voice.type); await up(voicePath, d.voice.blob, d.voice.type); }
            const row = C.row({ message: d.message, anonymous: d.anonymous, shots, voicePath, voiceSecs: d.voice ? d.voice.secs : 0, lang: lang(), version: build(), device: d.anonymous ? '' : String(navigator.userAgent || '').slice(0, 200) });
            const r = await sb.from('app_feedback').insert(row);
            if (r && r.error) throw r.error;
        } catch (e) { fail = e || new Error('error'); }
        S.busy = false;
        if (!OV) return;
        OV.classList.remove('is-busy');
        if (fail) {
            if (b) b.textContent = t.send;
            const k = C.classify(fail);
            say(t[k] || t.error, 'warn');
            paintSendBtn();
            return;
        }
        resetDraft();
        onClose = null;
        OV.querySelector('.fbk-body').innerHTML = '<div class="fbk-thanks" role="status"><div class="fbk-check" aria-hidden="true">\u2713</div><h3>' + esc(t.thanks) + '</h3><p>' + esc(t.thanksSub) + '</p><button type="button" class="fbk-send-btn" data-fbk="done">' + esc(t.done) + '</button></div>';
    }

    /* ======================= OWNER INBOX ======================= */
    const I = { rows: [], sel: new Set(), filter: 'new', urls: new Map(), busy: false, err: '' };
    const PAGE = 500;
    function visible() { return I.rows.filter(r => I.filter === 'all' || r.status !== 'done'); }
    function selRows() { return visible().filter(r => I.sel.has(r.id)); }

    async function openInbox() {
        const t = T();
        if (!isOwner()) return;
        I.sel.clear(); I.err = '';
        const o = shell('fbk-inbox', t.inbox, '<div class="fbk-ibar"></div><p class="fbk-status" role="status" aria-live="polite"></p><div class="fbk-list"><p class="fbk-hint">' + esc(t.loading) + '</p></div>');
        o.addEventListener('click', onInboxClick);
        o.addEventListener('change', e => {
            const c = e.target.closest('[data-fbk-sel]');
            if (c) { const id = c.getAttribute('data-fbk-sel'); if (c.checked) I.sel.add(id); else I.sel.delete(id); paintBar(); return; }
            if (e.target.id === 'fbkAll') { const v = visible(); if (e.target.checked) v.forEach(r => I.sel.add(r.id)); else I.sel.clear(); paintList(); paintBar(); }
        });
        onClose = () => !I.busy;
        await load();
    }
    async function load() {
        const t = T(), sb = await client();
        if (!OV) return;
        if (!sb) { I.err = t.offline; paintAll(); return; }
        let r;
        try { r = await sb.from('app_feedback').select('*').order('created_at', { ascending: false }).limit(PAGE); } catch (e) { r = { error: e }; }
        if (r.error) { const k = C.classify(r.error); I.err = k === 'missing' ? t.needSql : k === 'denied' ? t.notOwner : k === 'offline' ? t.offline : t.error; I.rows = []; }
        else { I.err = ''; I.rows = r.data || []; }
        await sign(sb, I.rows);
        paintAll();
    }
    /* short-lived links to the private files (owner only on the server) */
    async function sign(sb, rows) {
        const paths = [];
        rows.forEach(r => { (Array.isArray(r.shots) ? r.shots : []).forEach(p => paths.push(p)); if (r.voice_path) paths.push(r.voice_path); });
        const want = paths.filter(p => !I.urls.has(p));
        for (let i = 0; i < want.length; i += 200) {
            try {
                const r = await sb.storage.from('feedback').createSignedUrls(want.slice(i, i + 200), 3600);
                (r.data || []).forEach(x => { if (x && x.path && x.signedUrl) I.urls.set(x.path, x.signedUrl); });
            } catch (e) { }
        }
    }
    function paintAll() { paintBar(); paintList(); }
    function paintBar() {
        const el = OV && OV.querySelector('.fbk-ibar'), t = T();
        if (!el) return;
        const v = visible(), s = selRows(), n = s.length;
        const all = v.length && n === v.length;
        el.innerHTML =
            '<div class="fbk-row"><div class="fbk-seg" role="group"><button type="button" data-fbk="fnew" aria-pressed="' + (I.filter === 'new') + '">' + esc(t.fNew) + ' (' + I.rows.filter(r => r.status !== 'done').length + ')</button>' +
            '<button type="button" data-fbk="fall" aria-pressed="' + (I.filter === 'all') + '">' + esc(t.fAll) + ' (' + I.rows.length + ')</button></div>' +
            '<button type="button" class="fbk-chip" data-fbk="refresh"' + (I.busy ? ' disabled' : '') + '>' + esc(t.refresh) + '</button></div>' +
            '<div class="fbk-row"><label class="fbk-selall"><input type="checkbox" id="fbkAll"' + (all ? ' checked' : '') + (v.length ? '' : ' disabled') + '><span>' + esc(t.selAll) + '</span></label><span class="fbk-count">' + esc(t.selected(n)) + '</span></div>' +
            '<div class="fbk-row fbk-acts">' +
            '<button type="button" class="fbk-chip" data-fbk="trsel"' + (n && !I.busy ? '' : ' disabled') + '>' + esc(t.trSel(n)) + '</button>' +
            '<button type="button" class="fbk-chip" data-fbk="copysel"' + (n && !I.busy ? '' : ' disabled') + '>' + esc(t.copySel(n)) + '</button>' +
            '<button type="button" class="fbk-chip" data-fbk="pkg"' + (n && !I.busy ? '' : ' disabled') + '>' + esc(t.pkg(n)) + '</button>' +
            '<button type="button" class="fbk-chip" data-fbk="done"' + (n && !I.busy ? '' : ' disabled') + '>' + esc(t.markDone) + '</button>' +
            '<button type="button" class="fbk-chip fbk-del" data-fbk="delsel"' + (n && !I.busy ? '' : ' disabled') + '>' + esc(t.del(n)) + '</button></div>';
    }
    function card(r) {
        const t = T(), shots = Array.isArray(r.shots) ? r.shots : [], u = p => I.urls.get(p) || '';
        const who = C.who(r, t.anonymous);
        return '<article class="fbk-card' + (r.status === 'done' ? ' is-done' : '') + '" data-id="' + esc(r.id) + '">' +
            '<header><label class="fbk-pick"><input type="checkbox" data-fbk-sel="' + esc(r.id) + '"' + (I.sel.has(r.id) ? ' checked' : '') + ' aria-label="' + esc(C.ref(r)) + '"></label>' +
            '<div class="fbk-meta"><b>' + esc(who) + '</b><small>' + esc(C.ref(r)) + ' \u00b7 ' + esc(C.stamp(r.created_at)) + (r.app_version ? ' \u00b7 ' + esc(r.app_version) : '') + (r.lang ? ' \u00b7 ' + esc(r.lang) : '') + '</small></div>' +
            '<button type="button" class="fbk-chip sm" data-fbk="toggle" data-id="' + esc(r.id) + '">' + esc(r.status === 'done' ? t.reopen : t.markDone) + '</button>' +
            '<button type="button" class="fbk-chip sm fbk-del" data-fbk="del1" data-id="' + esc(r.id) + '"' + (I.busy ? ' disabled' : '') + '>' + esc(t.del1) + '</button></header>' +
            (r.message ? '<p class="fbk-msg">' + esc(r.message) + '</p>' : '') +
            (r.voice_path ? '<div class="fbk-aud"><span class="fbk-lbl">' + esc(t.voice) + ' \u00b7 ' + esc(t.secs(r.voice_secs || 0)) + '</span>' + (u(r.voice_path) ? '<audio controls preload="none" src="' + esc(u(r.voice_path)) + '"></audio>' : '') +
                (String(r.transcript || '').trim() ? '<p class="fbk-tr"><span class="fbk-lbl">' + esc(t.transcript) + '</span>' + esc(r.transcript) + '</p>' :
                    '<button type="button" class="fbk-chip sm" data-fbk="tr1" data-id="' + esc(r.id) + '"' + (I.busy ? ' disabled' : '') + '>' + esc(t.transcribe) + '</button>') + '</div>' : '') +
            (shots.length ? '<div class="fbk-thumbs">' + shots.map((p, k) => '<a href="' + esc(u(p)) + '" target="_blank" rel="noopener" class="fbk-tn" aria-label="' + esc(t.shotN(k + 1, shots.length)) + '"><img loading="lazy" src="' + esc(u(p)) + '" alt="' + esc(t.shotN(k + 1, shots.length)) + '"><b>' + (k + 1) + '</b></a>').join('') + '</div>' : '') +
            '</article>';
    }
    function paintList() {
        const el = OV && OV.querySelector('.fbk-list'), t = T();
        if (!el) return;
        if (I.err) { el.innerHTML = '<p class="fbk-status warn">' + esc(I.err) + '</p>'; return; }
        const v = visible();
        el.innerHTML = v.length ? v.map(card).join('') : '<p class="fbk-hint">' + esc(I.filter === 'new' ? t.emptyNew : t.empty) + '</p>';
    }
    function sayI(m, kind) { const el = OV && OV.querySelector('.fbk-status'); if (el) { el.textContent = m || ''; el.className = 'fbk-status' + (kind ? ' ' + kind : ''); } }

    async function onInboxClick(e) {
        const b = e.target.closest('[data-fbk]');
        if (!b || b.disabled) return;
        const a = b.getAttribute('data-fbk'), id = b.getAttribute('data-id');
        if (a === 'close') closeShell(false);
        else if (a === 'fnew' || a === 'fall') { I.filter = a === 'fnew' ? 'new' : 'all'; I.sel.clear(); paintAll(); }
        else if (a === 'refresh') { sayI(T().loading); await load(); sayI(''); }
        else if (a === 'tr1') transcribe([I.rows.find(r => r.id === id)].filter(Boolean));
        else if (a === 'trsel') transcribe(selRows());
        else if (a === 'copysel') copy(selRows());
        else if (a === 'pkg') pack(selRows());
        else if (a === 'done') setStatus(selRows(), 'done');
        else if (a === 'toggle') { const r = I.rows.find(x => x.id === id); if (r) setStatus([r], r.status === 'done' ? 'new' : 'done'); }
        else if (a === 'delsel' || a === 'del1') {
            /* two taps: the first arms the button ("Tap again to delete", 6 s), the second deletes for good */
            if (!b.classList.contains('armed')) { armDel(b); return; }
            remove(a === 'del1' ? [I.rows.find(r => r.id === id)].filter(Boolean) : selRows());
        }
    }
    function armDel(b) {
        const t = T(), label = b.textContent;
        b.classList.add('armed'); b.textContent = t.delSure;
        clearTimeout(b._fbkT); b._fbkT = setTimeout(() => { if (b.isConnected && b.classList.contains('armed')) { b.classList.remove('armed'); b.textContent = label; } }, 6000);
    }
    /* Nov 5 2026 (Emmanuel: "a simple delete or delete all", gone completely so it takes no space): the files (voice notes,
       screenshots) and then the rows, for good (feedback-core.js removeAll). Only what the server really deleted leaves the list. */
    async function remove(rows) {
        const t = T();
        if (!rows.length || I.busy) return;
        const sb = await client();
        if (!sb) { sayI(t.offline, 'warn'); return; }
        I.busy = true; paintBar(); sayI(t.delBusy);
        let res;
        try { res = await C.removeAll(sb, rows, I.urls); } catch (e) { res = { ok: false, why: 'error', ids: [] }; }
        I.busy = false;
        const gone = new Set(res.ids || []);
        if (gone.size) {
            C.filesOf(I.rows.filter(r => gone.has(r.id))).forEach(p => I.urls.delete(p));
            I.rows = I.rows.filter(r => !gone.has(r.id)); gone.forEach(x => I.sel.delete(x));
        }
        paintAll();
        if (res.ok) sayI(t.deleted(res.rows)); else sayI(res.why === 'denied' ? t.delDenied : res.why === 'offline' ? t.offline : t.delFail, 'warn');
    }

    /* one server call per voice note, two at a time; stops early when the server is not set up */
    async function trOne(sb, r) {
        let res;
        try { res = await sb.functions.invoke('feedback-transcribe', { body: { id: r.id } }); } catch (e) { res = { error: e }; }
        if (!res.error && res.data && typeof res.data.transcript === 'string') { r.transcript = res.data.transcript; r.transcript_by = 'gemini'; return 'ok'; }
        const err = res.error || {}, ctx = err.context;
        let status = 0, code = '';
        if (ctx && typeof ctx.status === 'number') { status = ctx.status; try { const j = await ctx.clone().json(); code = String(j && j.error || ''); } catch (x) { } }
        if (code === 'not_configured') return 'key';
        if (status === 404 && !code) return 'fn';
        if (status === 429 || code === 'busy') return 'busy';
        if (status === 403 || status === 401) return 'denied';
        if (/Failed to send a request|Failed to fetch|NetworkError|Load failed/i.test(String(err.message || ''))) return 'fn';
        return 'error';
    }
    async function transcribe(rows) {
        const t = T(), todo = rows.filter(C.needsTranscript);
        if (I.busy) return;
        if (!todo.length) { sayI(t.trNone); return; }
        const sb = await client();
        if (!sb) { sayI(t.offline, 'warn'); return; }
        I.busy = true; paintAll();
        let done = 0, fin = 0, stop = '', next = 0;
        sayI(t.trBusy(1, todo.length));
        const worker = async () => {
            while (!stop && next < todo.length) {
                const r = todo[next++];
                let k = await trOne(sb, r);
                for (let tries = 0; k === 'busy' && tries < 2 && !stop; tries++) { await new Promise(z => setTimeout(z, 8000)); k = await trOne(sb, r); }
                fin++;
                if (k === 'ok') done++;
                else if (k === 'fn' || k === 'key' || k === 'denied') stop = k;
                if (OV) sayI(t.trBusy(Math.min(fin + 1, todo.length), todo.length));
            }
        };
        await Promise.all([worker(), worker()]);
        I.busy = false;
        if (!OV) return;
        paintAll();
        sayI(stop === 'fn' ? t.needFn : stop === 'key' ? t.needKey : stop === 'denied' ? t.notOwner : done < todo.length && !stop ? t.trDone(done, todo.length) + ' ' + t.busy : t.trDone(done, todo.length), stop || done < todo.length ? 'warn' : '');
    }

    async function copy(rows) {
        const t = T();
        if (!rows.length) return;
        const text = C.exportText(rows, { anon: t.anonymous, labels: { text: t.text, voice: t.voice, shots: t.shots, noTr: t.noTr } });
        let ok = false;
        try { await navigator.clipboard.writeText(text); ok = true; } catch (e) { }
        if (!ok) {
            try {
                const ta = D.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
                OV.appendChild(ta); ta.select(); ok = D.execCommand('copy'); ta.remove();
            } catch (e) { }
        }
        if (ok) { sayI(t.copied(rows.length)); return; }
        sayI(t.copyFail, 'warn');
        const el = OV.querySelector('.fbk-list');
        el.insertAdjacentHTML('afterbegin', '<textarea class="fbk-text fbk-copybox" readonly rows="8">' + esc(text) + '</textarea>');
    }

    async function pack(rows) {
        const t = T();
        if (!rows.length || I.busy) return;
        const sb = await client();
        if (!sb) { sayI(t.offline, 'warn'); return; }
        I.busy = true; paintBar();
        await sign(sb, rows);
        const A = t.anonymous, jobs = [];
        rows.forEach((r, i) => {
            (Array.isArray(r.shots) ? r.shots : []).forEach((p, k) => jobs.push({ name: C.shotName(r, i, k, A), path: p }));
            if (r.voice_path) jobs.push({ name: C.voiceName(r, i, A), path: r.voice_path });
        });
        const enc = new TextEncoder();
        const files = [
            { name: 'feedback.txt', data: enc.encode(C.exportText(rows, { anon: A, labels: { text: t.text, voice: t.voice, shots: t.shots, noTr: t.noTr } })) },
            { name: 'feedback.json', data: enc.encode(JSON.stringify(C.manifest(rows, { anon: A }), null, 2)) }
        ];
        let size = 0, big = false, missing = 0;
        for (let j = 0; j < jobs.length; j++) {
            sayI(t.pkgBusy(j + 1, jobs.length));
            const url = I.urls.get(jobs[j].path);
            try {
                if (!url) throw new Error('nourl');
                const r = await fetch(url);
                if (!r.ok) throw new Error('http ' + r.status);
                const data = new Uint8Array(await r.arrayBuffer());
                size += data.length;
                if (size > PACK_MAX) { big = true; break; }
                files.push({ name: jobs[j].name, data });
            } catch (e) { missing++; }
        }
        I.busy = false; paintBar();
        if (big) { sayI(t.pkgBig, 'warn'); return; }
        const bytes = C.zip(files), d = new Date();
        const name = 'lowispike-feedback-' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '-' + String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0') + '.zip';
        const blob = new Blob([bytes], { type: 'application/zip' });
        let shared = false;
        try {
            const f = new File([blob], name, { type: 'application/zip' });
            const touch = window.matchMedia && matchMedia('(pointer: coarse)').matches;
            if (touch && navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: name }); shared = true; }
        } catch (e) { if (e && e.name === 'AbortError') shared = true; }
        if (!shared) {
            const a = D.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; D.body.appendChild(a); a.click();
            setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 60000);
        }
        sayI(t.pkgDone + (missing ? ' (' + missing + ' \u2717)' : ''), missing ? 'warn' : '');
    }

    async function setStatus(rows, status) {
        const t = T();
        if (!rows.length || I.busy) return;
        const sb = await client();
        if (!sb) { sayI(t.offline, 'warn'); return; }
        let r;
        try { r = await sb.from('app_feedback').update({ status }).in('id', rows.map(x => x.id)); } catch (e) { r = { error: e }; }
        if (r.error) { sayI(C.classify(r.error) === 'denied' ? t.notOwner : t.error, 'warn'); return; }
        rows.forEach(x => { x.status = status; });
        I.sel.clear();
        paintAll();
    }

    window.LowiFeedback = { open: openSend, openInbox, close: () => closeShell(false), isOwner, _S: S, _I: I };
})();
