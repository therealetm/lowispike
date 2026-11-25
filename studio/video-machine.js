/* LOWiSPIKE Studio · Video machine, phase 1: text tweeters (24 Nov 2026, Emmanuel: "I want my own editing app inside of this, but like
   almost automated ... upload that 60-second video and it will automatically be cut into different length ... 5 seconds ... 8 ... 13
   ... 21 ... I should be able to see all the chopped up versions, just like a TikTok profile ... the text on screen was already on
   there ... so the text doesn't cover the profile picture or the like button ... click on the video and move it with my finger ...
   these magnets ... clicks into the center ... a text on screen bio, I can just talk in there, just ramble ... the AI is able to take
   that text as their memory ... one is in I form, one is in U form ... one is teaching, one is relatable ... funny ... save all the
   clips into my gallery ... my daily task simply becomes clicking a button ... like GTA ... the CDs ... swipe through them").
   - Your style: the creator's own words (typed or spoken), kept per Studio account (StudioAcc.style), the AI's memory.
   - B-rolls: videos from the phone, kept ON THIS PHONE only (IndexedDB 'lowi-studio' / 'broll'), on a swipe shelf like CDs.
   - Cut & write: the picked B-roll is cut into 8 / 13 / 5 / 21 s pieces (plan()), each with its own style (I, you, general,
     teaching, relatable, funny); studio-ai "captions" writes one text per piece from the style + the picked playlist's videos.
   - Clips: a TikTok-profile grid. A clip opens the editor: the piece loops with its text; drag the text (it snaps to the centre
     lines and stays inside the safe zone that TikTok's buttons, name and caption never cover); edit the words, size and look.
   - Save: the piece is drawn with its text into a 1080x1920 video on the phone (canvas + MediaRecorder, sound kept where the
     browser allows), then "Save to phone" opens the share sheet (iPhone: Save Video). Nothing is uploaded.
   Phase 2 (spoken tweeters: camera, teleprompter) and phase 3 (3 for today per playlist) follow.
   24 Nov 2026, evening (Emmanuel: "switch from inspo to storage ... my B-rolls at the top ... swipe to see all the B-rolls, and then
   below that, I see the cut version. So it doesn't have to always cut my B-rolls again and again ... click on the button, they're all
   filled ... save ... going and posting"): every B-roll is cut ONCE, when it is added, and keeps its parts (st.cuts, per B-roll, texts
   and positions included). Studio > Profile has Inspo | B-rolls: the B-roll shelf on top, the chosen one's parts below, ✨ Fill texts
   (new texts every tap) and Save all. Made videos are not kept in the app (they go to the phone's gallery); only B-rolls use space. */
(function (W, D) {
  'use strict';
  var S = W.STUDIO; if (!S || W.StudioVM) return;
  var I = {en: 0, de: 1, es: 2}[S.L] || 0, esc = S.esc;
  var T = {
    btn: ['🎬 Video machine', '🎬 Videomaschine', '🎬 Máquina de vídeos'], title: ['Video machine', 'Videomaschine', 'Máquina de vídeos'],
    style: ['Your style', 'Dein Stil', 'Tu estilo'], styleEmpty: ['Tell the AI who you are, what you post about and for whom. Type or just talk.', 'Erzähl der KI, wer du bist, worüber du postest und für wen. Tippen oder einfach reden.', 'Cuéntale a la IA quién eres, de qué publicas y para quién. Escribe o habla.'],
    edit: ['Edit', 'Bearbeiten', 'Editar'], save: ['Save', 'Speichern', 'Guardar'], speak: ['Talk', 'Sprechen', 'Hablar'], stop: ['Stop', 'Stopp', 'Parar'],
    brolls: ['Your B-rolls', 'Deine B-Rolls', 'Tus B-rolls'], add: ['Add B-roll', 'B-Roll hinzufügen', 'Añadir B-roll'], onPhone: ['Kept on this phone only.', 'Nur auf diesem Handy gespeichert.', 'Solo se guarda en este móvil.'],
    learn: ['Learn the style from', 'Stil lernen von', 'Aprender el estilo de'], none: ['No playlist', 'Keine Playlist', 'Sin lista'], lang: ['Text language', 'Sprache der Texte', 'Idioma de los textos'],
    go: ['✂️ Cut & write', '✂️ Schneiden & texten', '✂️ Cortar y escribir'], pick: ['Pick a B-roll first.', 'Wähl zuerst eine B-Roll.', 'Elige primero un B-roll.'],
    writing: ['Cutting and writing…', 'Schneide und schreibe…', 'Cortando y escribiendo…'], aiFail: ['The AI could not write right now. You can type the texts yourself.', 'Die KI konnte gerade nicht schreiben. Du kannst die Texte selbst eintippen.', 'La IA no pudo escribir ahora. Puedes escribir los textos tú.'],
    clips: ['Your clips', 'Deine Clips', 'Tus clips'], again: ['↻ New texts', '↻ Neue Texte', '↻ Textos nuevos'], saveAll: ['📲 Save all', '📲 Alle speichern', '📲 Guardar todos'],
    make: ['🎞 Make video', '🎞 Video machen', '🎞 Hacer vídeo'], making: ['Making the video… {p}%', 'Video wird gemacht… {p} %', 'Haciendo el vídeo… {p}%'], toPhone: ['📲 Save to phone', '📲 Aufs Handy speichern', '📲 Guardar en el móvil'],
    ready: ['Ready', 'Fertig', 'Listo'], size: ['Size', 'Größe', 'Tamaño'], plain: ['Plain', 'Schlicht', 'Simple'], box: ['Box', 'Box', 'Caja'],
    safe: ['Safe zone: TikTok’s buttons, name and caption never cover what is inside.', 'Sicherer Bereich: TikToks Knöpfe, Name und Beschreibung verdecken nichts darin.', 'Zona segura: los botones, nombre y descripción de TikTok no tapan lo de dentro.'],
    noRec: ['This browser cannot make videos. Open Studio in Safari or Chrome.', 'Dieser Browser kann keine Videos machen. Öffne Studio in Safari oder Chrome.', 'Este navegador no puede hacer vídeos. Abre Studio en Safari o Chrome.'],
    del: ['Delete this B-roll from the phone?', 'Diese B-Roll vom Handy löschen?', '¿Borrar este B-roll del móvil?'], back: ['Back', 'Zurück', 'Atrás'], all: ['All clips', 'Alle Clips', 'Todos los clips'],
    fill: ['✨ Fill texts', '✨ Texte füllen', '✨ Rellenar textos'], storeN: ['B-rolls on this phone: {p}', 'B-Rolls auf diesem Handy: {p}', 'B-rolls en este móvil: {p}'], used: ['{p} MB used', '{p} MB belegt', '{p} MB usados'],
    noRolls: ['Add a B-roll: it is cut into parts once, then you only tap ✨ Fill texts and Save.', 'Füg eine B-Roll hinzu: Sie wird einmal in Teile geschnitten, danach tippst du nur noch auf ✨ Texte füllen und Speichern.', 'Añade un B-roll: se corta en partes una vez y luego solo tocas ✨ Rellenar textos y Guardar.'],
    textPh: ['Text on screen', 'Text im Bild', 'Texto en pantalla'],
    aiOne: ['↻ AI text', '↻ KI-Text', '↻ Texto IA'], lib: ['📚 Library', '📚 Bibliothek', '📚 Biblioteca'], libH: ['Pick a text from your Swipe file', 'Nimm einen Text aus deiner Swipe-Datei', 'Elige un texto de tu Swipe file'],
    openTT: ['Open on TikTok ↗', 'Auf TikTok öffnen ↗', 'Abrir en TikTok ↗'], use: ['Use', 'Nehmen', 'Usar'], tr: ['Translate', 'Übersetzen', 'Traducir'], undo: ['↩ Back', '↩ Zurück', '↩ Atrás'],
    prep: ['🎬 Making your videos: {p} done', '🎬 Videos werden gemacht: {p} fertig', '🎬 Haciendo tus vídeos: {p} listos'],
    tapMake: ['▶ Tap to make the videos', '▶ Tippen, um die Videos zu machen', '▶ Toca para hacer los vídeos'],
    blocked: ['Making the videos stopped (the phone needed its memory, Low Power Mode, or the app was in the background). Tap the button to go on.', 'Das Machen der Videos hat gestoppt (das Handy brauchte Speicher, Stromsparmodus oder die App war im Hintergrund). Tipp auf den Knopf, um weiterzumachen.', 'Los vídeos se detuvieron (el móvil necesitó memoria, modo ahorro o la app estaba en segundo plano). Toca el botón para seguir.'],
    newH: ['Not used yet', 'Noch nicht benutzt', 'Aún sin usar'], usedH: ['✓ Used', '✓ Benutzt', '✓ Usados'], usedOn: ['✓ Used {p}', '✓ Benutzt {p}', '✓ Usado {p}'],
    allUsed: ['✓ All used: tap ✨ Fill texts for new ones', '✓ Alle benutzt: tipp auf ✨ Texte füllen für neue', '✓ Todos usados: toca ✨ Rellenar textos'],
    stylePh: ['Who you are, your message, who you talk to, how you sound. E.g. “I lost 57 kg eating insulin-friendly food. I talk to people who are tired of diets. Short, honest, a bit funny.”', 'Wer du bist, deine Botschaft, mit wem du sprichst, wie du klingst. Z. B. „Ich habe 57 kg mit insulinfreundlichem Essen verloren. Ich spreche mit Leuten, die Diäten satt haben. Kurz, ehrlich, ein bisschen witzig.“', 'Quién eres, tu mensaje, a quién hablas, cómo suenas.'],
    myStyle: ['My style', 'Mein Stil', 'Mi estilo'], newStyle: ['＋ New style', '＋ Neuer Stil', '＋ Nuevo estilo'], styleName: ['Name (e.g. the account)', 'Name (z. B. der Account)', 'Nombre (p. ej. la cuenta)'],
    styleTip: ['Tap a style to use it; tap it again to change it.', 'Tipp einen Stil an, um ihn zu nehmen; nochmal tippen, um ihn zu ändern.', 'Toca un estilo para usarlo; tócalo otra vez para cambiarlo.'], delStyle: ['Delete style', 'Stil löschen', 'Eliminar estilo'], saveStyle: ['Save', 'Speichern', 'Guardar'],
    inspoDef: ['⭐ Inspo', '⭐ Inspo', '⭐ Inspo'],
    noPl: ['No playlists yet: put viral videos into a playlist in the Swipe file.', 'Noch keine Playlists: Leg virale Videos in der Swipe-Datei in eine Playlist.', 'Aún no hay playlists: pon vídeos virales en una playlist del Swipe file.'],
    pickPl: ['Pick a playlist first, so the AI learns from its texts.', 'Wähl zuerst eine Playlist, damit die KI von ihren Texten lernt.', 'Elige primero una playlist para que la IA aprenda de sus textos.'],
    plN: ['{p} videos', '{p} Videos', '{p} vídeos'], newT: ['✨ New texts', '✨ Neue Texte', '✨ Textos nuevos'], allT: ['All texts', 'Alle Texte', 'Todos los textos'], sizeAll: ['Size', 'Größe', 'Tamaño'],
    makeN: ['🎬 Make {p} videos', '🎬 {p} Videos machen', '🎬 Hacer {p} vídeos'], make1: ['🎬 Make 1 video', '🎬 1 Video machen', '🎬 Hacer 1 vídeo'], saveN: ['📲 Save {p}', '📲 {p} speichern', '📲 Guardar {p}'],
    makingN: ['🎬 Making video {p}', '🎬 Video {p} wird gemacht', '🎬 Haciendo vídeo {p}'], goOn: ['▶ Tap to go on', '▶ Tippen, um weiterzumachen', '▶ Toca para seguir'], pickParts: ['Tick the parts you want', 'Hak die Teile an, die du willst', 'Marca las partes que quieres'],
    howMake: ['🎬 Make puts the text on the video (about as long as the clip, keep the app open). 📲 Save sends it to your phone and ticks it ✓.', '🎬 Machen legt den Text aufs Video (etwa so lang wie der Clip, App offen lassen). 📲 Speichern schickt es aufs Handy und hakt es ✓ ab.', '🎬 Hacer pone el texto en el vídeo (dura lo que el clip, deja la app abierta). 📲 Guardar lo envía al móvil y lo marca ✓.'],
    leftN: ['🎬 {p} left to make', '🎬 Noch {p} zu machen', '🎬 Faltan {p}'], nowMaking: ['🎬 Making a video for the {p} B-roll', '🎬 Video für die {p}-B-Roll wird gemacht', '🎬 Haciendo un vídeo del B-roll de {p}'],
    saveAgain: ['📲 Save {p} again', '📲 {p} nochmal speichern', '📲 Guardar {p} otra vez'], sizeN: ['Size {p}', 'Größe {p}', 'Tamaño {p}'],
    saved: ['✓ Saved', '✓ Gespeichert', '✓ Guardado'], made: ['🎬 Made', '🎬 Gemacht', '🎬 Hecho'], noText: ['No text yet', 'Noch kein Text', 'Sin texto aún'], adding: ['Adding…', 'Wird hinzugefügt…', 'Añadiendo…'],
    reOne: ['New text for this part', 'Neuer Text für diesen Teil', 'Texto nuevo para esta parte'], tick: ['Use this part', 'Diesen Teil nehmen', 'Usar esta parte'],
    daysAgo: ['{p} d ago', 'vor {p} T.', 'hace {p} d'], firstTexts: ['Pick a playlist, then tap ✨ New texts.', 'Wähl eine Playlist und tipp dann auf ✨ Neue Texte.', 'Elige una playlist y toca ✨ Textos nuevos.'],
    ready: ['Ready', 'Fertig', 'Listo'], today: ['Today', 'Heute', 'Hoy'], yest: ['Yesterday', 'Gestern', 'Ayer'], textLang: ['Text language', 'Textsprache', 'Idioma del texto'],
    fillNote: ['✨ Fill texts writes new texts on every part. Videos you saved stay in ✓ Used below.', '✨ Texte füllen schreibt neue Texte auf alle Teile. Gespeicherte Videos bleiben unten in ✓ Benutzt.', '✨ Rellenar textos escribe textos nuevos en todas las partes. Los vídeos guardados siguen abajo en ✓ Usados.'],
    usedTap: ['Tap a video to make it again and save it for another platform.', 'Tipp ein Video an, um es nochmal zu machen und für eine andere Plattform zu speichern.', 'Toca un vídeo para hacerlo otra vez y guardarlo para otra plataforma.'],
    saveNew: ['📲 Save {p} new', '📲 {p} neue speichern', '📲 Guardar {p} nuevos'],
    usedNote: ['Saved videos move here, so you can post them again on another platform. Tap one to save it again.', 'Gespeicherte Videos landen hier, damit du sie auf einer anderen Plattform nochmal posten kannst. Tipp eins an, um es nochmal zu speichern.', 'Los vídeos guardados vienen aquí para publicarlos en otra plataforma. Toca uno para guardarlo otra vez.'], aiWhy: ['The AI did not answer: {p}. Tap ↻ to try again, or type your own.', 'Die KI hat nicht geantwortet: {p}. Tipp auf ↻ für einen neuen Versuch oder schreib selbst.', 'La IA no respondió: {p}. Toca ↻ para reintentar o escribe tú.'],
    busy: ['too many requests right now', 'gerade zu viele Anfragen', 'demasiadas solicitudes ahora'], limit: ['daily limit reached', 'Tageslimit erreicht', 'límite diario alcanzado'], owner: ['sign in as the owner', 'als Besitzer anmelden', 'inicia sesión como dueño'], net: ['no connection', 'keine Verbindung', 'sin conexión'],
    noSound: ['Clips are saved without the B-roll’s own sound: add your sound on TikTok.', 'Clips werden ohne den Ton der B-Roll gespeichert: Füg deinen Sound auf TikTok hinzu.', 'Los clips se guardan sin el sonido del B-roll: añade tu sonido en TikTok.'],
    ST: {I: ['I', 'Ich', 'Yo'], you: ['You', 'Du', 'Tú'], general: ['General', 'Allgemein', 'General'], teaching: ['Teaching', 'Lehrreich', 'Enseña'], relatable: ['Relatable', 'Nachfühlbar', 'Identificable'], funny: ['Funny', 'Lustig', 'Gracioso']}
  };
  var t = function (k, p) { var s = T[k][I]; return p != null ? s.replace('{p}', p) : s; };
  var STYLES = ['I', 'you', 'general', 'teaching', 'relatable', 'funny'];
  /* ---------- pure: cut plan (Fibonacci lengths the feed likes) ---------- */
  var LENS = [8, 13, 5, 21];
  function plan(dur) {
    var out = [], at = 0, k = 0, guard = 0; dur = Math.max(0, +dur || 0);
    while (dur - at >= 5 && guard++ < 40) {
      var left = dur - at, len = 0;
      for (var j = 0; j < LENS.length; j++) { var c = LENS[(k + j) % LENS.length]; if (c <= left) { len = c; k = (k + j + 1) % LENS.length; break; } }
      if (!len) break;
      out.push({start: Math.round(at * 100) / 100, end: Math.round((at + len) * 100) / 100, sec: len, style: STYLES[out.length % STYLES.length]});
      at += len;
    }
    if (!out.length && dur >= 2) out.push({start: 0, end: dur, sec: Math.round(dur), style: 'general'});
    return out;
  }
  /* the safe zone, as shares of the 9:16 frame (TikTok / Reels: top tabs, right buttons, bottom name + caption) */
  var SAFE = {l: 0.08, r: 0.84, t: 0.14, b: 0.68};
  function snap(v, to, d) { return Math.abs(v - to) < d ? to : v; }
  var core = {plan: plan, SAFE: SAFE, snap: snap, LENS: LENS, STYLES: STYLES};
  W.StudioVMCore = core;

  /* ---------- the phone's own store for B-rolls ---------- */
  function db() { return new Promise(function (res, rej) { var r = W.indexedDB.open('lowi-studio', 2); r.onupgradeneeded = function () { var d = r.result; if (!d.objectStoreNames.contains('broll')) d.createObjectStore('broll', {keyPath: 'id'}); if (!d.objectStoreNames.contains('made')) d.createObjectStore('made', {keyPath: 'id'}); }; r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; }); }
  function tx(mode, fn, store) { return db().then(function (d) { return new Promise(function (res, rej) { var x = d.transaction(store || 'broll', mode), st = x.objectStore(store || 'broll'), out = fn(st); x.oncomplete = function () { res(out && out.result !== undefined ? out.result : out); }; x.onerror = function () { rej(x.error); }; }); }); }
  var bAll = function () { return tx('readonly', function (s) { return s.getAll(); }); };
  var bPut = function (o) { return tx('readwrite', function (s) { s.put(o); }); };
  var bDel = function (id) { return tx('readwrite', function (s) { s.delete(id); }).then(function () { return mDelRoll(id); }); };
  /* 24 Nov 2026, night (Emmanuel: "why is it that a done video, I have to always click on make video? This is already done"): a finished
     video is kept on the phone (one per part, replaced when the part changes), so after closing the app it is still one tap to save */
  var mAll = function () { return tx('readonly', function (s) { return s.getAll(); }, 'made'); };
  var mPut = function (rollId, i, m) { return tx('readwrite', function (s) { s.put({id: rollId + ':' + i, roll: rollId, i: i, k: m.k, b: m.b, ts: Date.now()}); }, 'made').catch(function () { }); };
  var mDelRoll = function (rollId) { return tx('readwrite', function (s) { var rq = s.openCursor(); rq.onsuccess = function () { var cu = rq.result; if (!cu) return; if (cu.value.roll === rollId) cu.delete(); cu.continue(); }; }, 'made').catch(function () { }); };
  var madeLoaded = false;
  function loadMade() { if (madeLoaded) return Promise.resolve(); madeLoaded = true; return mAll().then(function (l) { (l || []).forEach(function (o) { var m = MADE[o.roll] = MADE[o.roll] || {}; if (!m[o.i]) m[o.i] = {b: o.b, k: o.k}; }); }, function () { }); }

  /* ---------- state ---------- */
  var SKEY = 'lowi.vm.v1', st = {sel: '', pl: '', lang: S.L, sess: null, cuts: {}}, rolls = [], view = 'home', cur = -1, el = null, urls = {}, made = {}, busy = false, styleOpen = false, recog = null;
  try { var o = JSON.parse(localStorage.getItem(SKEY) || 'null'); if (o && typeof o === 'object') st = Object.assign(st, o); } catch (e) { }
  if (!st.cuts || typeof st.cuts !== 'object') st.cuts = {};
  /* 24 Nov 2026, evening (Emmanuel: "once I've saved something, that should be in a different folder ... repurpose them on different
     platforms ... tell which one has already been used"): every saved video is remembered as a recipe (B-roll, part, text, place, size),
     never as a file, so the Used folder costs no space and any used video can be made and saved again */
  if (!Array.isArray(st.used)) st.used = [];
  /* 25 Nov 2026 (Emmanuel: "it also saves my size and my positioning preference, so I don't have to redo them all the time") */
  if (!st.pref || typeof st.pref !== 'object') st.pref = {size: 24, x: 0.5, y: 0.42, look: 'plain'};
  function ckey(c) { return JSON.stringify([c.start, c.end, c.text, c.x, c.y, c.size, c.look]); }
  /* the made video of part i, only while it still matches the part as it is now (24 Nov 2026 bug: a changed size saved the old video) */
  function got(i) { var c = st.sess && st.sess.clips[i], m = made[i]; return c && m && m.k === ckey(c) ? m.b : null; }
  function usedOf(id) { return st.used.filter(function (u) { return u.roll === id; }); }
  /* 25 Nov 2026 (Emmanuel: "if I save something, there can be a check mark that I've used it"): a part counts as saved while it shows
     a text you saved; moving or resizing it keeps the ✓ (only new words make it new) */
  function tkey(c) { return JSON.stringify([c.start, c.end, String(c.text || '').trim()]); }
  st.used.forEach(function (u) { if (u && u.c && !u.t) u.t = tkey(u.c); });
  function isUsed(c) { if (!c || !String(c.text || '').trim()) return false; var k = tkey(c), id = st.sess && st.sess.id; return st.used.some(function (u) { return u.roll === id && u.t === k; }); }
  function markUsed(idxs) { var now = Date.now(); idxs.forEach(function (i) { var c = st.sess.clips[i], k = ckey(c), tk = tkey(c); if (st.used.some(function (u) { return u.roll === st.sess.id && u.t === tk; })) { st.used.forEach(function (u) { if (u.roll === st.sess.id && u.t === tk) u.ts = now; }); return; } st.used.unshift({roll: st.sess.id, k: k, t: tk, ts: now, c: JSON.parse(JSON.stringify(c))}); }); st.used = st.used.slice(0, 300); SELSET = null; keep(); refresh(); }
  if (st.sess && st.sess.id && !st.cuts[st.sess.id]) st.cuts[st.sess.id] = st.sess.clips;   /* the one session of the first version becomes that B-roll's parts */
  if (st.sess && st.cuts[st.sess.id]) st.sess = {id: st.sess.id, clips: st.cuts[st.sess.id]};
  function keep() { try { localStorage.setItem(SKEY, JSON.stringify({sel: st.sel, pl: st.pl, lang: st.lang, sess: st.sess ? {id: st.sess.id} : null, cuts: st.cuts, used: st.used, pref: st.pref})); } catch (e) { } }
  var MADE = {};
  /* the parts of one B-roll: cut once, then kept */
  function useRoll(id) {
    var r = roll(id); if (!r) return false;
    if (!st.cuts[id] || !st.cuts[id].length) st.cuts[id] = plan(r.dur).map(function (c) { return Object.assign(c, {text: '', x: st.pref.x, y: st.pref.y, size: st.pref.size, look: st.pref.look}); });
    if (st.sel !== id) SELSET = null;
    st.sel = id; if (!st.sess || st.sess.id !== id || st.sess.clips !== st.cuts[id]) st.sess = {id: id, clips: st.cuts[id]}; made = MADE[id] = MADE[id] || {}; keep(); return true;
  }
  function refresh() { if (el && el.classList.contains('on')) paint(); if (HOST && HOST.isConnected) mountPaint(); }
  var url = function (r) { if (!r) return ''; if (!urls[r.id]) urls[r.id] = URL.createObjectURL(r.blob); return urls[r.id]; };
  var roll = function (id) { return rolls.filter(function (r) { return r.id === id; })[0] || null; };
  var styleText = function () { return W.StudioAcc && StudioAcc.style ? StudioAcc.style() : ''; };
  var fmt = function (s) { s = Math.round(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  function page() {
    if (el) return el;
    el = D.createElement('section'); el.id = 'vmach'; el.className = 'view vm'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.addEventListener('click', onClick); D.body.appendChild(el); return el;
  }
  function top(title, backTo) { return '<div class="vtop"><button class="ib" data-vm="' + (backTo || 'close') + '" aria-label="' + esc(t('back')) + '">‹</button><span class="cnt">' + esc(title) + '</span><span style="width:46px"></span></div>'; }
  function paint() {
    var p = page();
    if (view === 'home') {
      var s = styleText(), pls = S.lists ? S.lists() : [];
      p.innerHTML = top(t('title')) + '<div class="vbody">' +
        '<div class="vm-card"><div class="vm-ch"><b>' + esc(t('style')) + '</b>' + (styleOpen ? '' : '<button class="pill" data-vm="style">' + esc(t('edit')) + '</button>') + '</div>' +
        (styleOpen ? '<textarea id="vmStyle" class="vm-style" placeholder="' + esc(t('styleEmpty')) + '">' + esc(s) + '</textarea><div class="vm-row">' + (W.SpeechRecognition || W.webkitSpeechRecognition ? '<button class="btn" data-vm="mic">🎙 ' + esc(recog ? t('stop') : t('speak')) + '</button>' : '') + '<button class="btn pri" data-vm="styleSave">' + esc(t('save')) + '</button></div>'
          : '<p class="vm-styletx' + (s ? '' : ' empty') + '">' + esc(s ? s.slice(0, 220) + (s.length > 220 ? '…' : '') : t('styleEmpty')) + '</p>') + '</div>' +
        '<div class="vm-ch vm-h"><b>' + esc(t('brolls')) + '</b><small>' + esc(t('onPhone')) + '</small></div>' +
        '<div class="vm-shelf" id="vmShelf"><label class="vm-cd vm-add"><input type="file" accept="video/*" multiple hidden id="vmFile"><span>＋</span><b>' + esc(t('add')) + '</b></label>' +
        rolls.map(function (r) { return '<button class="vm-cd' + (r.id === st.sel ? ' on' : '') + '" data-vm="sel" data-id="' + esc(r.id) + '">' + (r.thumb ? '<img alt="" src="' + esc(r.thumb) + '">' : '') + '<i>' + fmt(r.dur) + '</i><em data-vm="rm" data-id="' + esc(r.id) + '" aria-label="✕">✕</em></button>'; }).join('') + '</div>' +
        '<div class="vm-ch vm-h"><b>' + esc(t('learn')) + '</b></div><div class="vm-chips">' + [{id: '', name: t('none')}].concat(pls).map(function (q) { return '<button class="pill' + (st.pl === q.id ? ' acc' : '') + '" data-vm="pl" data-id="' + esc(q.id) + '">' + esc(q.name) + '</button>'; }).join('') + '</div>' +
        '<div class="vm-ch vm-h"><b>' + esc(t('lang')) + '</b></div><div class="vm-chips">' + [['en', 'English'], ['de', 'Deutsch'], ['es', 'Español']].map(function (l) { return '<button class="pill' + (st.lang === l[0] ? ' acc' : '') + '" data-vm="lang" data-l="' + l[0] + '">' + l[1] + '</button>'; }).join('') + '</div>' +
        (st.sess && roll(st.sess.id) ? '<button class="btn vm-wide" data-vm="clips">▦ ' + esc(t('clips')) + ' (' + st.sess.clips.length + ')</button>' : '') + '</div>' +
        '<div class="vnav"><button class="btn pri vm-wide" data-vm="go"' + (busy ? ' disabled' : '') + '>' + esc(busy ? t('writing') : t('go')) + '</button></div>';
      var f = D.getElementById('vmFile'); if (f) f.onchange = function () { addFiles(f.files); };
      var sh = D.getElementById('vmShelf'); if (sh) { sh.onscroll = cdFocus; setTimeout(function () { var on = sh.querySelector('.on'); if (on) on.scrollIntoView({inline: 'center', block: 'nearest'}); cdFocus(); }, 30); }
    } else if (view === 'clips') {
      var ss = st.sess;
      p.innerHTML = top(t('clips'), 'home') + '<div class="vbody">' + (st.aiNote ? '<p class="vm-note">' + esc(st.aiNote) + '</p>' : '') + (qErr ? '<p class="vm-note">' + esc(t('blocked')) + '</p>' : '') + '<div class="vm-grid">' + ss.clips.map(function (c, i) { return tile(c, i, 'open'); }).join('') +
        '</div><p class="note vm-ns">' + esc(t('noSound')) + '</p></div><div class="vnav"><button class="btn" data-vm="again"' + (busy ? ' disabled' : '') + '>' + esc(busy ? t('writing') : t('again')) + '</button>' + saveBtn('pri') + '</div>';
      frames(); setTimeout(queue, 300);
    } else if (view === 'edit') {
      var c = st.sess.clips[cur];
      p.innerHTML = top((cur + 1) + ' / ' + st.sess.clips.length, fromProf ? 'close' : 'clips') + '<div class="vbody vm-eb"><div class="vm-stage" id="vmStage"><video id="vmV" playsinline muted loop autoplay src="' + esc(url(roll(st.sess.id))) + '"></video>' +
        '<canvas class="vm-pv" id="vmC" aria-hidden="true"></canvas><div class="vm-safe" aria-hidden="true"></div><i class="vm-gx" aria-hidden="true"></i><i class="vm-gy" aria-hidden="true"></i>' +
        '<div class="vm-text ghost" id="vmT" style="left:' + (c.x * 100) + '%;top:' + (c.y * 100) + '%;--fs:' + c.size + '">' + lines(c.text) + '</div></div>' +
        '<p class="note vm-safen">' + esc(t('safe')) + '</p>' +
        '<textarea id="vmTx" class="vm-tx" placeholder="' + esc(t('textPh')) + '">' + esc(c.text) + '</textarea>' +
        '<div class="vm-row"><span class="vm-l">' + esc(t('size')) + '</span><input type="range" id="vmSz" min="16" max="40" step="1" value="' + c.size + '"><button class="pill' + (c.look !== 'box' ? ' acc' : '') + '" data-vm="look" data-l="plain">' + esc(t('plain')) + '</button><button class="pill' + (c.look === 'box' ? ' acc' : '') + '" data-vm="look" data-l="box">' + esc(t('box')) + '</button></div>' +
        '<div class="vm-row"><button class="pill" data-vm="aione">' + esc(t('aiOne')) + '</button><button class="pill" data-vm="lib">' + esc(t('lib')) + '</button>' + ['en', 'de', 'es'].map(function (l) { return '<button class="pill" data-vm="trc" data-l="' + l + '">' + esc(t('tr')) + ' ' + l.toUpperCase() + '</button>'; }).join('') + (c.orig != null ? '<button class="pill" data-vm="trundo">' + esc(t('undo')) + '</button>' : '') + '</div>' +
        '<div id="vmOut"></div></div>' +
        '<div class="vnav"><button class="btn" data-vm="prev">‹</button><button class="btn pri vm-wide" data-vm="make" id="vmMk">' + esc(mkLabel()) + '</button><button class="btn" data-vm="next">›</button></div>';
      wireEditor();
    }
  }
  /* the editor's button says what is true now: ready to save, being made in the background (with %), or not made yet */
  function mkLabel() { return got(cur) ? t('toPhone') : (qRun && qNow === cur ? t('making', qPc) : t('make')); }
  function lines(s) { return esc(s || '').replace(/\n/g, '<br>'); }
  function cdFocus() { var sh = D.getElementById('vmShelf'); if (!sh) return; var mid = sh.getBoundingClientRect().left + sh.clientWidth / 2; sh.querySelectorAll('.vm-cd').forEach(function (c) { var r = c.getBoundingClientRect(), d = Math.abs(r.left + r.width / 2 - mid); c.style.setProperty('--k', Math.max(0, 1 - d / (sh.clientWidth * 0.6)).toFixed(3)); }); }

  /* ---------- B-rolls ---------- */
  function meta(file) {
    return new Promise(function (res) {
      var v = D.createElement('video'), u = URL.createObjectURL(file); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = u;
      var done = function (thumb) { res({dur: v.duration || 0, thumb: thumb || ''}); URL.revokeObjectURL(u); };
      v.onloadedmetadata = function () { v.currentTime = Math.min(1, (v.duration || 1) / 3); };
      v.onseeked = function () { try { var c = D.createElement('canvas'), k = 240 / Math.max(v.videoWidth, v.videoHeight); c.width = Math.round(v.videoWidth * k); c.height = Math.round(v.videoHeight * k); c.getContext('2d').drawImage(v, 0, 0, c.width, c.height); done(c.toDataURL('image/jpeg', 0.7)); } catch (e) { done(''); } };
      v.onerror = function () { done(''); }; setTimeout(function () { done(''); }, 8000);
    });
  }
  /* 25 Nov 2026 (Emmanuel: "when I upload a B-roll, I don't see any loading ... it shouldn't just start generating"): a placeholder
     with a spinner shows on the shelf while each B-roll is read, stored and cut; no text is written until you tap ✨ New texts */
  function addFiles(list) {
    var files = Array.prototype.slice.call(list || []); if (!files.length) return;
    ADDING += files.length; refresh();
    files.reduce(function (p, f) { return p.then(function () { return meta(f).then(function (m) { var o = {id: 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: f.name, blob: f, dur: m.dur, thumb: m.thumb, ts: Date.now()}; rolls.unshift(o); st.sel = o.id; return bPut(o).then(function () { useRoll(o.id); }); }).then(function () { ADDING = Math.max(0, ADDING - 1); refresh(); }, function (e) { ADDING = Math.max(0, ADDING - 1); throw e; }); }); }, Promise.resolve())
      .then(function () { keep(); refresh(); }, function () { ADDING = 0; S.toast('✕'); refresh(); });
  }

  /* ---------- AI ---------- */
  /* 25 Nov 2026 (Emmanuel: "wouldn't it make sense to have the default just be the AI learning from the inspo ... inspo as default
     knowledge and the playlist as selective ones"): with no playlist picked, the AI learns from the account's Inspo */
  function inspoIds() { var l = W.StudioAcc && StudioAcc.items ? StudioAcc.items(S.sw() || []) : []; return l.map(function (x) { return x.id; }); }
  function examples() {
    var ids = {};
    if (!st.pl) inspoIds().forEach(function (i) { ids[i] = 1; });
    else { var q = S.lists ? S.lists().filter(function (z) { return z.id === st.pl; })[0] : null; if (!q) return []; (q.items || []).forEach(function (i) { ids[i] = 1; }); }
    /* 25 Nov 2026 (Emmanuel: "how does it learn from the viral text in the playlists ... I don't want this to become a guessing game"):
       each playlist video gives the AI its text on screen first (for B-roll posts that IS the viral text), then its hook and what is
       said. Before, the text on screen was not sent at all. */
    return (S.sw() || []).filter(function (x) { return ids[x.id]; }).filter(function (x) { return x.onscreen || x.hook || x.transcript; }).slice(0, 20).map(function (x) {
      return {screen: String(x.onscreen || '').slice(0, 500), hook: x.hook || '', text: (x.transcript || (x.strategy || []).join(' ') || '').slice(0, 260), views: x.views || 0}; });
  }
  function write(clips) {
    busy = true; refresh();
    return S.ai({action: 'captions', bio: styleText(), examples: examples(), clips: clips.map(function (c) { return {sec: c.sec, style: c.style}; }), lang: st.lang})
      .then(function (j) { st.aiNote = ''; (j.texts || []).forEach(function (x, i) { if (clips[i] && x) { clips[i].text = x; delete clips[i].orig; clampClip(clips[i]); delete made[st.sess.clips.indexOf(clips[i])]; } }); }, function (e) { st.aiNote = t('aiWhy', whyOf(e)); S.toast(st.aiNote); })
      .then(function () { busy = false; keep(); refresh(); });
  }
  function whyOf(e) { var m = String(e && e.message || ''); return m === 'busy' ? t('busy') : m === 'limit' ? t('limit') : m === 'owner_only' ? t('owner') : /fetch|network|load/i.test(m) ? t('net') : (e && e.detail ? String(e.detail).slice(0, 120) : m || 'error'); }
  function go() {
    if (!useRoll(st.sel)) return S.toast(t('pick'));
    write(st.sess.clips).then(function () { view = 'clips'; paint(); });
  }

  /* ---------- grid frames ---------- */
  function frames(inHost) {
    var r = roll(st.sess.id); if (!r) return;
    if (FR.id === st.sess.id + ':' + st.sess.clips.length && st.sess.clips.every(function (_c, k) { return FR[k]; })) return;
    var v = D.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url(r);
    var cs = st.sess.clips, i = 0;
    if (FR.id !== st.sess.id + ':' + cs.length) { FR = []; FR.id = st.sess.id + ':' + cs.length; }
    var where = function () { return inHost ? HOST : el; };
    var next = function () { while (i < cs.length && FR[i]) i++; if (i >= cs.length || (!inHost && view !== 'clips')) return; v.currentTime = Math.min(cs[i].start + 0.2, (r.dur || 1) - 0.05); };
    v.onseeked = function () { var w0 = where(), box = w0 && w0.querySelector('[data-fr="' + i + '"]'); try { var c = D.createElement('canvas'); c.width = 270; c.height = 480; cover(c.getContext('2d'), v, 270, 480); FR[i] = c.toDataURL('image/jpeg', 0.75); FRK[r.id + ':' + cs[i].start] = FR[i];
        /* the cover taken right after the upload is often black on iPhones (a frame read before the phone has drawn it); the first
           part's picture replaces it once */
        if (inHost) drawTiles();
        if (i === 0 && !r.tf) { r.thumb = FR[0]; r.tf = 1; bPut(r).catch(function () { }); var cd = HOST && HOST.querySelector('.vm-cd[data-id="' + r.id + '"] img'); if (cd) cd.src = FR[0]; } if (box) box.innerHTML = '<img alt="" src="' + FR[i] + '">'; } catch (e) { } i++; next(); };
    v.onloadedmetadata = next;
  }
  function cover(ctx, v, w, h) { var vw = v.videoWidth || w, vh = v.videoHeight || h, k = Math.max(w / vw, h / vh), dw = vw * k, dh = vh * k; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h); ctx.drawImage(v, (w - dw) / 2, (h - dh) / 2, dw, dh); }

  /* ---------- editor: loop, drag with magnets, safe zone ---------- */
  function wireEditor() {
    var c = st.sess.clips[cur], v = D.getElementById('vmV'), tEl = D.getElementById('vmT'), stage = D.getElementById('vmStage'), cvp = D.getElementById('vmC');
    /* 24 Nov 2026, night (Emmanuel: "I changed the text size, and the one that it saved ... is not the one that I chose"): the text in
       the editor is drawn by the same drawText() that makes the video, on a canvas over the B-roll, so font, size and line breaks are
       exactly what gets saved. The element on top only catches the finger (same lines, invisible). */
    function pv() {
      var r = stage.getBoundingClientRect(); if (!r.width) return; var dpr = Math.min(3, W.devicePixelRatio || 1), cw = Math.round(r.width * dpr), ch = Math.round(r.height * dpr);
      if (cvp.width !== cw || cvp.height !== ch) { cvp.width = cw; cvp.height = ch; }
      var x = cvp.getContext('2d'); x.clearRect(0, 0, cw, ch); drawText(x, c, cw, ch);
      x.font = '700 ' + (c.size * cw / 390) + 'px ' + FONT; tEl.innerHTML = wrap(x, c.text, cw * MAXW).map(esc).join('<br>') || '&nbsp;';
    }
    v.addEventListener('loadedmetadata', function () { v.currentTime = c.start; v.play().catch(function () { }); });
    v.addEventListener('timeupdate', function () { if (v.currentTime >= c.end || v.currentTime < c.start - 0.3) v.currentTime = c.start; });
    D.getElementById('vmTx').addEventListener('input', function (e) { c.text = e.target.value; pv(); clampText(); keep(); mkSync(); });
    D.getElementById('vmSz').addEventListener('input', function (e) { c.size = +e.target.value; tEl.style.setProperty('--fs', c.size); pv(); clampText(); keep(); mkSync(); });
    var drag = null;
    tEl.addEventListener('pointerdown', function (e) { e.preventDefault(); tEl.setPointerCapture(e.pointerId); var r = stage.getBoundingClientRect(); drag = {ox: e.clientX - c.x * r.width, oy: e.clientY - c.y * r.height}; stage.classList.add('drag'); });
    tEl.addEventListener('pointermove', function (e) {
      if (!drag) return; var r = stage.getBoundingClientRect(), x = (e.clientX - drag.ox) / r.width, y = (e.clientY - drag.oy) / r.height;
      var sx = snap(x, 0.5, 0.035), sy = snap(y, 0.5, 0.03); stage.classList.toggle('gx', sx === 0.5); stage.classList.toggle('gy', sy === 0.5);
      if ((sx === 0.5 && x !== c.x && c.x !== 0.5) || (sy === 0.5 && y !== c.y && c.y !== 0.5)) { try { if (navigator.vibrate) navigator.vibrate(6); } catch (x2) { } }
      c.x = sx; c.y = sy; place(); clampText();
    });
    var end = function () { if (!drag) return; drag = null; stage.classList.remove('drag', 'gx', 'gy'); keep(); mkSync(); };
    tEl.addEventListener('pointerup', end); tEl.addEventListener('pointercancel', end);
    function place() { tEl.style.left = (c.x * 100) + '%'; tEl.style.top = (c.y * 100) + '%'; pv(); }
    function clampText() {
      var r = stage.getBoundingClientRect(), b = tEl.getBoundingClientRect(), hw = b.width / 2 / r.width, hh = b.height / 2 / r.height;
      var x = Math.min(SAFE.r - hw, Math.max(SAFE.l + hw, c.x)), y = Math.min(SAFE.b - hh, Math.max(SAFE.t + hh, c.y));
      if (hw * 2 > SAFE.r - SAFE.l) x = (SAFE.l + SAFE.r) / 2; x = Math.round(x * 1000) / 1000; y = Math.round(y * 1000) / 1000; if (Math.abs(x - c.x) > 0.002) c.x = x; if (Math.abs(y - c.y) > 0.002) c.y = y; place();
    }
    pv(); setTimeout(clampText, 50); try { if (D.fonts && D.fonts.ready) D.fonts.ready.then(pv); } catch (e) { }
  }

  /* ---------- making the video on the phone ---------- */
  function wrap(ctx, text, max) {
    var out = []; String(text || '').split('\n').forEach(function (para) {
      var words = para.split(/\s+/).filter(Boolean), line = ''; if (!words.length) { out.push(''); return; }
      words.forEach(function (w) { var test = line ? line + ' ' + w : w; if (ctx.measureText(test).width > max && line) { out.push(line); line = w; } else line = test; }); out.push(line);
    }); return out;
  }
  /* the same font for the editor and the saved video (iPhone canvases know system-ui; -apple-system alone could fall back to another font) */
  /* lines are at most this wide, so a centred text already sits inside the safe zone (8% left, 16% right) and opening a finished
     part never nudges it (a nudge counted as an edit and made the video again) */
  var MAXW = 2 * Math.min(0.5 - SAFE.l, SAFE.r - 0.5) * 0.97;
  var FONT = 'system-ui, -apple-system, "SF Pro Display", "Helvetica Neue", sans-serif';
  function drawText(ctx, c, w, h) {
    var fs = c.size * w / 390 * 1.0, lh = fs * 1.25; ctx.font = '700 ' + fs + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var ls = wrap(ctx, c.text, w * MAXW), cx = c.x * w, y0 = c.y * h - (ls.length - 1) * lh / 2;
    ls.forEach(function (l, i) {
      var y = y0 + i * lh;
      if (c.look === 'box') { var tw = ctx.measureText(l).width, px = fs * 0.35; if (l) { ctx.fillStyle = '#fff'; round(ctx, cx - tw / 2 - px, y - lh / 2, tw + px * 2, lh, fs * 0.25); ctx.fill(); } ctx.fillStyle = '#000'; ctx.fillText(l, cx, y); }
      else { ctx.lineJoin = 'round'; ctx.lineWidth = fs * 0.12; ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = fs * 0.3; ctx.strokeText(l, cx, y); ctx.shadowBlur = 0; ctx.fillStyle = '#fff'; ctx.fillText(l, cx, y); }
    });
  }
  function round(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function mime() { var M = W.MediaRecorder; if (!M) return ''; return ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm'].filter(function (m) { try { return M.isTypeSupported(m); } catch (e) { return false; } })[0] || ''; }
  /* one video element draws every clip. iPhones only let a video play by itself once a finger has started it (and never in Low Power
     Mode), so the first tap anywhere in Studio starts it once; from then on the clips are made in the background (24 Nov 2026 bug:
     "it keeps saying 0 out of 5") */
  /* 24 Nov 2026, night (Emmanuel: "You broke my app? Nothing is working after closing & opening", a black screen): making a video
     next to a 4K B-roll can use more memory than iOS allows; it then kills the app, and the app reopened straight into Studio and
     started again. Now nothing is made in the background until a finger touches Studio in this visit, and if the last visit died while
     making a video (the flag below is still there), it waits for the "Tap to make the videos" button. */
  var BUSY = 'lowi.vm.busy', CRASHED = false, TAPPED = false;
  try { CRASHED = !!localStorage.getItem(BUSY); localStorage.removeItem(BUSY); } catch (e) { }
  function busyOn() { try { localStorage.setItem(BUSY, String(Date.now())); } catch (e) { } }
  function busyOff() { try { localStorage.removeItem(BUSY); } catch (e) { } }
  var RV = null;
  function rv() { if (!RV) { RV = D.createElement('video'); RV.playsInline = true; RV.setAttribute('playsinline', ''); RV.preload = 'auto'; RV.muted = true; RV.setAttribute('muted', ''); } return RV; }
  function unlock() { if (!TAPPED) { TAPPED = true; if (!CRASHED) setTimeout(queue, 400); } var v = rv(); if (v.__ok) return; try { if (!v.getAttribute('src') && st.sess && roll(st.sess.id)) v.src = url(roll(st.sess.id)); var pr = v.play(); if (pr && pr.then) pr.then(function () { v.__ok = 1; if (!qRun) v.pause(); if (qErr) { qErr = 0; refresh(); setTimeout(queue, 50); } }, function () { }); } catch (e) { } }
  if (D.addEventListener) { D.addEventListener('touchend', unlock, true); D.addEventListener('click', unlock, true); }   /* the taps iPhones count as a real tap */
  /* 24 Nov 2026, night (Emmanuel: "the video ... stopping every like 2 seconds ... moving, stopping ... like a video with a bad
     connection"): recording the screen in real time (MediaRecorder) froze whenever the phone hiccuped. Where the phone can (WebCodecs:
     iPhone iOS 16.4+, Chrome), every frame is now built on its own exact 1/30 s timestamp and written into the MP4 (vendor mp4-muxer),
     so a slow moment only makes saving slower, never the video choppy. Older phones keep the old recorder. */
  var FPS = 30, CV = null;   /* one canvas for every video, not a new 8 MB one each time */
  function wcOK() { return !!(W.VideoEncoder && W.VideoFrame && W.HTMLVideoElement && 'requestVideoFrameCallback' in W.HTMLVideoElement.prototype); }
  function canMake() { return wcOK() || !!mime(); }
  var muxP = null;
  function loadMux() { if (W.Mp4Muxer) return Promise.resolve(); return muxP || (muxP = new Promise(function (res, rej) { var sc = D.createElement('script'); sc.src = '../vendor/mp4-muxer-5.1.3.js'; sc.onload = res; sc.onerror = function () { muxP = null; rej(new Error('mux')); }; D.head.appendChild(sc); })); }
  function render(c, onP, rid) {
    busyOn(); var done = function (x) { busyOff(); return x; }, bad = function (e) { busyOff(); throw e; };
    return render0(c, onP, rid).then(done, bad);
  }
  function render0(c, onP, rid) {
    if (!wcOK()) return renderRec(c, onP, rid);
    return renderWC(c, onP, rid).catch(function (e) { if (e && (e.name === 'NotAllowedError' || e.message === 'video')) throw e; return mime() ? renderRec(c, onP, rid) : Promise.reject(e); });
  }
  function renderWC(c, onP, rid) {
    var W0 = 1080, H0 = 1920, cfg = {codec: 'avc1.640028', width: W0, height: H0, bitrate: 10e6, framerate: FPS, avc: {format: 'avc'}};
    return loadMux().then(function () { return W.VideoEncoder.isConfigSupported(cfg); }).then(function (sup) {
      if (!sup || !sup.supported) { cfg.codec = 'avc1.42002a'; return W.VideoEncoder.isConfigSupported(cfg); } return sup; }).then(function (sup) {
      if (!sup || !sup.supported) throw new Error('nocodec');
      return new Promise(function (res, rej) {
        var r = roll(rid || st.sess.id); if (!r) return rej(new Error('norec'));
        var M = W.Mp4Muxer, tgt = new M.ArrayBufferTarget(), mux = new M.Muxer({target: tgt, video: {codec: 'avc', width: W0, height: H0, frameRate: FPS}, fastStart: 'in-memory'});
        var dead = false, fail = function (e) { if (dead) return; dead = true; try { v.pause(); } catch (x) { } try { enc.close(); } catch (x) { } rej(e); };
        var enc = new W.VideoEncoder({output: function (ch, meta) { mux.addVideoChunk(ch, meta); }, error: fail}); enc.configure(cfg);
        var cv = CV || (CV = D.createElement('canvas')); cv.width = W0; cv.height = H0; var ctx = cv.getContext('2d');
        var dur = Math.max(0.2, c.end - c.start), total = Math.round(dur * FPS), k = 0, v = rv(), cb = 0;
        /* one frame per 1/30 s step of the B-roll's own time; a step the phone skipped repeats the picture before it */
        var put = function (upTo) {
          while (k < total && k / FPS <= upTo + 1e-6) { cover(ctx, v, W0, H0); drawText(ctx, c, W0, H0); var f = new W.VideoFrame(cv, {timestamp: Math.round(k * 1e6 / FPS), duration: Math.round(1e6 / FPS)}); enc.encode(f, {keyFrame: k % (FPS * 2) === 0}); f.close(); k++; }
          if (onP) onP(Math.min(99, Math.round(k / total * 100)));
        };
        /* 25 Nov 2026: iPhones pause the video when the app goes to the background; when it is back it plays on, and if nothing moves
           for 12 s the video stops with a reason (the button then says "Tap to go on") instead of hanging */
        var lastK = -1, lastT = Date.now(), wd = setInterval(function () { if (dead) return clearInterval(wd); if (D.visibilityState !== 'visible') { lastT = Date.now(); return; }
          if (k !== lastK) { lastK = k; lastT = Date.now(); return; } if (Date.now() - lastT > 3000 && v.paused && enc.encodeQueueSize <= 2) v.play().catch(function () { }); if (Date.now() - lastT > 12000) { clearInterval(wd); fail(new Error('stall')); } }, 1000);
        var finish = function () { clearInterval(wd); if (dead) return; dead = true; try { v.pause(); if (cb && v.cancelVideoFrameCallback) v.cancelVideoFrameCallback(cb); } catch (x) { }
          enc.flush().then(function () { enc.close(); mux.finalize(); res(new Blob([tgt.buffer], {type: 'video/mp4'})); }, function (e) { rej(e); }); };
        var tick = function (_now, md) {
          if (dead) return; var t = (md && md.mediaTime != null ? md.mediaTime : v.currentTime) - c.start; put(Math.min(t, dur));
          if (k >= total || v.ended || t >= dur) { put(dur); return finish(); }
          if (enc.encodeQueueSize > 6) { v.pause(); var wait = function () { if (dead) return; if (enc.encodeQueueSize > 2) return setTimeout(wait, 30); v.play().then(function () { cb = v.requestVideoFrameCallback(tick); }, fail); }; return wait(); }
          cb = v.requestVideoFrameCallback(tick);
        };
        v.onloadedmetadata = v.onseeked = v.onerror = null; v.onerror = function () { fail(new Error('video')); };
        var go = function () { v.onseeked = null; put(0); v.playbackRate = 0.75; cb = v.requestVideoFrameCallback(tick); v.play().then(function () { v.__ok = 1; }, fail); };
        var seek = function () { v.onseeked = go; v.currentTime = c.start; };
        if (v.getAttribute('src') !== url(r)) { v.onloadedmetadata = seek; v.src = url(r); } else if (v.readyState >= 1) setTimeout(seek, 0); else v.onloadedmetadata = seek;
      });
    });
  }
  function renderRec(c, onP, rid) {
    return new Promise(function (res, rej) {
      var mt = mime(), r = roll(rid || st.sess.id); if (!mt || !r) return rej(new Error('norec'));
      var W0 = 1080, H0 = 1920, cv = D.createElement('canvas'); cv.width = W0; cv.height = H0; var ctx = cv.getContext('2d');
      /* 24 Nov 2026 (Emmanuel: "it's not saving the videos"): iPhones refuse to play a video with sound unless a finger just
         tapped, so clips are drawn muted (they are made in the background now) and posted with a sound added on TikTok */
      var v = rv(); v.onloadedmetadata = v.onseeked = v.onerror = null; if (v.getAttribute('src') !== url(r)) v.src = url(r); else if (v.readyState >= 1) setTimeout(function () { v.currentTime = c.start; }, 0);
      var stream = cv.captureStream(30), ac = null;
      var rec = new MediaRecorder(stream, {mimeType: mt, videoBitsPerSecond: 8e6}), parts = [];
      rec.ondataavailable = function (e) { if (e.data && e.data.size) parts.push(e.data); };
      rec.onstop = function () { try { if (ac) ac.close(); } catch (e) { } res(new Blob(parts, {type: mt.split(';')[0]})); };
      var draw = function () { cover(ctx, v, W0, H0); drawText(ctx, c, W0, H0); if (onP) onP(Math.min(99, Math.round((v.currentTime - c.start) / (c.end - c.start) * 100))); if (v.currentTime >= c.end || v.ended) { v.pause(); if (rec.state !== 'inactive') rec.stop(); return; } requestAnimationFrame(draw); };
      v.onloadedmetadata = function () { v.currentTime = c.start; };
      v.onseeked = function () { if (rec.state !== 'inactive') return; v.onseeked = null; cover(ctx, v, W0, H0); drawText(ctx, c, W0, H0); rec.start(250); v.play().then(function () { v.__ok = 1; requestAnimationFrame(draw); }, function (e) { try { rec.stop(); } catch (x) { } rej(e); }); };
      v.onerror = function () { rej(new Error('video')); };
    });
  }
  /* the clips are made one after the other in the background as soon as they exist (and again after an edit), so Save is one tap */
  var JOBS = [], qRoll = '', SELSET = null, ADDING = 0, fromProf = false, qHold = 0, qNow = -1, qPc = 0, qRun = false, qErr = CRASHED ? 1 : 0, FR = [], HOST = null, rqT = 0;
  function inEdit() { return view === 'edit' && el && el.classList.contains('on'); }
  /* never redraw the editor from the background: it would drop the Save button and the text being typed */
  function soft() { if (inEdit()) { refresh0(); mkSync(); } else refresh(); }
  function mkSync() { var b = inEdit() && D.getElementById('vmMk'); if (b && !b.disabled) b.textContent = mkLabel(); }
  function refresh0() { if (HOST && HOST.isConnected) mountPaint(); }
  /* 25 Nov 2026 (Emmanuel: "I went to a different B-roll to save those ... is it now still showing me that it's saving the older stuff on
     the other B-roll? ... I should be able to multi-work, on all B-rolls ... move around the app without being stuck on just one thing"):
     one queue for every B-roll (JOBS: B-roll + part). It keeps making while you pick another B-roll or work elsewhere in Studio; each
     B-roll's cover says how many are left, and a line on top says which one is being made. Before, the list held only part numbers,
     so after switching B-roll they pointed at the other B-roll's parts. */
  function madeOf(rid, i) { var c = st.cuts[rid] && st.cuts[rid][i], m = MADE[rid] && MADE[rid][i]; return c && m && m.k === ckey(c) ? m.b : null; }
  function jobsLeft(rid) { return JOBS.filter(function (j) { return (!rid || j.r === rid) && st.cuts[j.r] && st.cuts[j.r][j.i] && st.cuts[j.r][j.i].text && roll(j.r) && !madeOf(j.r, j.i); }); }
  function wantCur() { return st.sess ? JOBS.filter(function (j) { return j.r === st.sess.id; }).map(function (j) { return j.i; }) : []; }
  function queue() {
    if (!TAPPED || qRun || qErr || qHold || !canMake()) return;
    JOBS = jobsLeft();   /* finished ones leave the list */
    var j = JOBS[0]; if (!j) return;
    var rid = j.r, i = j.i, c = st.cuts[rid][i], snap0 = ckey(c), mm = MADE[rid] = MADE[rid] || {};
    qRun = true; qNow = i; qRoll = rid; qPc = 0; refresh();
    render(c, function (pc) { qPc = pc; [el, HOST].forEach(function (w0) { if (!w0) return; w0.querySelectorAll('[data-pc]').forEach(function (b) { b.textContent = pc + '%'; }); w0.querySelectorAll('[data-pc2]').forEach(function (b) { b.textContent = pc; }); }); mkSync(); }, rid)
      .then(function (blob) { mm[i] = {b: blob, k: snap0}; mPut(rid, i, mm[i]); }, function () { qErr = 1; })
      .then(function () { qRun = false; qNow = -1; qRoll = ''; soft(); setTimeout(queue, 50); });
  }
  function toSave() { var a = st.sess.clips.map(function (_c, i) { return i; }), n = a.filter(function (i) { return !isUsed(st.sess.clips[i]); }); return n.length ? n : a; }
  function saveBtn(cls) { if (st.sess.clips.every(isUsed)) return '<button class="btn ' + cls + '" disabled>' + esc(t('allUsed')) + '</button>'; var ix = toSave(), ready = ix.filter(function (i) { return got(i); }).length, all = ix.length === st.sess.clips.length && !st.sess.clips.some(isUsed);
    if (ready === ix.length) return '<button class="btn ' + cls + '" data-vm="saveAll">' + esc(all ? t('saveAll') + ' (' + ready + ')' : t('saveNew', ready)) + '</button>';
    if (qErr || !TAPPED || !canMake()) return '<button class="btn ' + cls + '" data-vm="kick">' + esc(t('tapMake')) + '</button>';
    return '<button class="btn ' + cls + '" disabled>' + esc(t('prep', ready + ' / ' + ix.length)) + '</button>'; }
  function tile(c, i, act) { var u = isUsed(c), m = got(i);
    return '<button class="vm-tile' + (u ? ' used' : '') + '" data-vm="' + act + '" data-i="' + i + '"><span class="vm-fr" data-fr="' + i + '">' + (FR[i] ? '<img alt="" src="' + FR[i] + '">' : '') + '</span><span class="vm-tt" style="top:' + (c.y * 100) + '%;left:' + (c.x * 100) + '%;--fs:' + c.size + '">' + esc(c.text).replace(/\n/g, '<br>') + '</span><i>' + fmt(c.sec) + '</i><em>' + esc(T.ST[c.style] ? T.ST[c.style][I] : c.style) + '</em>' +
      (u ? '<b class="vm-used">✓</b>' : m ? '<b class="vm-ok vm-okp">✓ ' + esc(t('ready')) + '</b>' : (qNow === i ? '<b class="vm-pc" data-pc>' + qPc + '%</b>' : '')) + '</button>'; }
  function fileOf(blob, i) { var ext = /mp4/.test(blob.type) ? 'mp4' : 'webm'; return new File([blob], 'lowispike-clip-' + (i + 1) + '.' + ext, {type: blob.type}); }
  function share(files) {
    if (!files.length) return Promise.resolve(false);
    if (navigator.canShare && navigator.canShare({files: files})) return navigator.share({files: files}).then(function () { return true; }, function () { return false; });
    files.forEach(function (f) { var a = D.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; D.body.appendChild(a); a.click(); a.remove(); });
    return Promise.resolve(true);
  }
  function make(idxs, out) {
    if (!canMake()) { S.toast(t('noRec')); return; }
    busy = true; var files = [], n = 0; qHold++;
    /* one video player draws every clip: wait for the background one to finish first */
    var idle = new Promise(function (res) { (function w() { if (!qRun) res(); else setTimeout(w, 120); })(); });
    return idxs.reduce(function (p, i) { return p.then(function () { return render(st.sess.clips[i], function (pc) { if (out) out.textContent = t('making', Math.round((n * 100 + pc) / idxs.length)); }).then(function (b) { made[i] = {b: b, k: ckey(st.sess.clips[i])}; mPut(st.sess.id, i, made[i]); files.push(fileOf(b, i)); n++; }); }); }, idle)
      .then(function () { busy = false; qHold--; setTimeout(queue, 50); return files; }, function (e) { busy = false; qHold--; S.toast(t('noRec')); throw e; });
  }
  function readyBtn(box, files, idxs) { box._idx = idxs; box.innerHTML = '<button class="btn pri vm-wide" data-vm="share">' + esc(t('toPhone')) + (files.length > 1 ? ' (' + files.length + ')' : '') + '</button>'; box._files = files; }

  function onClick(e) {
    var b = e.target.closest('[data-vm]'); if (!b) return; var k = b.dataset.vm;
    if (k === 'close') return close();
    if (k === 'home') { view = 'home'; return paint(); }
    if (k === 'clips') { view = 'clips'; return paint(); }
    if (k === 'style') { styleOpen = true; paint(); var ta = D.getElementById('vmStyle'); if (ta) ta.focus(); return; }
    if (k === 'styleSave') { micStop(); if (W.StudioAcc && StudioAcc.style) StudioAcc.style((D.getElementById('vmStyle') || {}).value || ''); styleOpen = false; S.toast('✓'); return paint(); }
    if (k === 'mic') return mic();
    if (k === 'rm') { e.stopPropagation(); if (!confirm(t('del'))) return; var id = b.dataset.id; rolls = rolls.filter(function (r) { return r.id !== id; }); if (st.sel === id) st.sel = ''; if (st.sess && st.sess.id === id) st.sess = null; keep(); bDel(id).then(paint, paint); return; }
    if (k === 'sel') { useRoll(b.dataset.id); FR = []; refresh(); return; }
    if (k === 'pl') { st.pl = b.dataset.id; keep(); return refresh(); }
    if (k === 'sty') { var A2 = StudioAcc.styles(), sid = b.dataset.id, sx = A2.list.filter(function (x) { return x.id === sid; })[0];
      if (!sid) return styleDlg(null); if (sid === A2.sel) return styleDlg(sx); StudioAcc.styleUse(sid); return refresh(); }
    if (k === 'tsel') { var ti = +b.dataset.i; if (!SELSET) { SELSET = {}; selIdx0().forEach(function (x) { SELSET[x] = 1; }); } if (SELSET[ti]) delete SELSET[ti]; else SELSET[ti] = 1; return refresh(); }
    /* ✨ New texts: the ticked parts; with nothing ticked by hand, every part you have not saved yet (all of them once all are saved) */
    if (k === 'newT') { if (busy) return;
      var all = st.sess.clips.map(function (_c, i) { return i; }), ix = SELSET ? selIdx() : all.filter(function (i) { return !isUsed(st.sess.clips[i]); }); if (!ix.length) ix = all;
      var sid0 = st.sess.id; JOBS = JOBS.filter(function (j) { return !(j.r === sid0 && ix.indexOf(j.i) >= 0); }); return write(ix.map(function (i) { return st.sess.clips[i]; })); }
    if (k === 'reone') { if (busy) return; var ri = +b.dataset.i, sid1 = st.sess.id; JOBS = JOBS.filter(function (j) { return !(j.r === sid1 && j.i === ri); }); return write([st.sess.clips[ri]]); }
    if (k === 'makeSel') { var mi = selIdx().filter(function (i) { return !got(i) && st.sess.clips[i].text; }); if (!mi.length) return; if (!canMake()) return S.toast(t('noRec')); mi.forEach(function (i) { if (!JOBS.some(function (j) { return j.r === st.sess.id && j.i === i; })) JOBS.push({r: st.sess.id, i: i}); }); qErr = 0; CRASHED = false; TAPPED = true; unlock(); setTimeout(queue, 60); return refresh(); }
    if (k === 'saveSel') { var si = selIdx().filter(function (i) { return got(i); }); return share(si.map(function (i) { return fileOf(got(i), i); })).then(function (ok) { if (ok) { var sid2 = st.sess.id; JOBS = JOBS.filter(function (j) { return j.r !== sid2 || si.indexOf(j.i) < 0; }); markUsed(si); } }); }
    if (k === 'amv') { var dx = +b.dataset.dx || 0, dy = +b.dataset.dy || 0, cen = b.dataset.c === '1'; allSet(function (c) { if (cen) { c.x = 0.5; c.y = (SAFE.t + SAFE.b) / 2; } else { c.x += dx * 0.03; c.y += dy * 0.025; } }); keep(); drawTiles(); return refresh(); }
    /* 25 Nov 2026: the size of all texts in steps of 2, with buttons (a slider got moved by accident while scrolling) */
    if (k === 'asz') { var nz = Math.max(14, Math.min(40, ((st.sess.clips[0] && st.sess.clips[0].size) || st.pref.size) + (+b.dataset.d || 0))); allSet(function (c) { c.size = nz; }); st.pref.size = nz; keep(); drawTiles(); return refresh(); }
    if (k === 'alook') { var lk = st.sess.clips[0] && st.sess.clips[0].look === 'box' ? 'plain' : 'box'; allSet(function (c) { c.look = lk; }); st.pref.look = lk; keep(); return refresh(); }
    if (k === 'lang') { st.lang = b.dataset.l; keep(); return refresh(); }
    if (k === 'go') return go();
    if (k === 'again') return write(st.sess.clips);
    if (k === 'open') { cur = +b.dataset.i; view = 'edit'; return paint(); }
    if (k === 'prev' || k === 'next') { var n = st.sess.clips.length; cur = (cur + (k === 'next' ? 1 : -1) + n) % n; return paint(); }
    if (k === 'aione') { var c1 = st.sess.clips[cur]; b.disabled = true; b.textContent = t('writing'); return S.ai({action: 'captions', bio: styleText(), examples: examples(), clips: [{sec: c1.sec, style: c1.style}], lang: st.lang}).then(function (j) { if (j.texts && j.texts[0]) { c1.text = j.texts[0]; delete c1.orig; delete made[cur]; keep(); } paint(); }, function (e) { S.toast(t('aiWhy', whyOf(e))); paint(); }); }
    if (k === 'trc') { var c2 = st.sess.clips[cur]; if (!c2.text) return; var src = c2.orig != null ? c2.orig : c2.text; b.disabled = true; return S.ai({action: 'translate', text: src, to: b.dataset.l}).then(function (j) { if (c2.orig == null) c2.orig = c2.text; c2.text = j.text || c2.text; delete made[cur]; keep(); paint(); }, function (e) { S.toast(t('aiWhy', whyOf(e))); paint(); }); }
    if (k === 'trundo') { var c3 = st.sess.clips[cur]; if (c3.orig != null) { c3.text = c3.orig; delete c3.orig; delete made[cur]; keep(); } return paint(); }
    if (k === 'lib') return libOpen();
    if (k === 'libuse') { var c4 = st.sess.clips[cur]; c4.text = b.dataset.t; delete c4.orig; delete made[cur]; keep(); libClose(); return paint(); }
    if (k === 'libx') return libClose();
    if (k === 'look') { st.sess.clips[cur].look = b.dataset.l; keep(); delete made[cur]; return paint(); }
    if (k === 'make') { var box = D.getElementById('vmOut'); var i0 = cur; if (got(i0)) return share([fileOf(got(i0), i0)]).then(function (ok) { if (ok) markUsed([i0]); });
      if (qRun && qNow === i0) return S.toast(t('making', qPc));   /* already being made: the button turns into Save by itself */ b.disabled = true; var lab = b.textContent; make([i0], b).then(function (f) { b.disabled = false; b.textContent = lab; readyBtn(box, f, [i0]); }, function () { b.disabled = false; b.textContent = lab; }); return; }
    if (k === 'saveAll') { var ix = toSave(); return share(ix.map(function (i) { return fileOf(got(i), i); })).then(function (ok) { if (ok) markUsed(ix); }); }
    if (k === 'kick') { qErr = 0; CRASHED = false; TAPPED = true; unlock(); setTimeout(queue, 60); return refresh(); }
    if (k === 'share') { var holder = b.parentNode; return share(holder._files || []).then(function (ok) { if (ok && holder._idx) markUsed(holder._idx); }); }
  }
  /* the Swipe file as a library of texts: the chosen playlist first, then everything; each with its creator's TikTok */
  function libOpen() {
    var all = S.sw ? S.sw() || [] : [], ids = {}, q = st.pl && S.lists ? S.lists().filter(function (z) { return z.id === st.pl; })[0] : null;
    ((q && q.items) || []).forEach(function (i) { ids[i] = 1; });
    var list = all.filter(function (x) { return ids[x.id]; }).concat(all.filter(function (x) { return !ids[x.id]; })).filter(function (x) { return x.hook || x.onscreen; }).slice(0, 80);
    var d = D.createElement('div'); d.className = 'vm-lib'; d.id = 'vmLib';
    d.innerHTML = '<div class="vm-libin"><div class="vm-ch"><b>' + esc(t('libH')) + '</b><button class="ib" data-vm="libx" aria-label="✕">✕</button></div>' + list.map(function (x) {
      var txt = String(x.onscreen || x.hook || '');
      return '<div class="vm-li"><p>' + esc(txt).replace(/\n/g, '<br>') + '</p><div class="vm-row"><small>' + esc(x.creator || '') + '</small>' + (x.link ? '<a class="pill" href="' + esc(x.link) + '" target="_blank" rel="noopener">' + esc(t('openTT')) + '</a>' : '') + '<button class="pill acc" data-vm="libuse" data-t="' + esc(txt) + '">' + esc(t('use')) + '</button></div></div>';
    }).join('') + '</div>';
    el.appendChild(d);
  }
  function libClose() { var d = D.getElementById('vmLib'); if (d) d.remove(); }
  function mic() {
    if (recog) return micStop(); var SR = W.SpeechRecognition || W.webkitSpeechRecognition, ta = D.getElementById('vmStyle'); if (!SR || !ta) return;
    var base = ta.value ? ta.value.replace(/\s*$/, ' ') : '', r = new SR(); r.lang = st.lang === 'de' ? 'de-DE' : st.lang === 'es' ? 'es-ES' : 'en-US'; r.continuous = true; r.interimResults = true;
    r.onresult = function (e) { var s = ''; for (var i = 0; i < e.results.length; i++) s += e.results[i][0].transcript; ta.value = base + s; };
    r.onend = function () { if (recog === r) { recog = null; var b = el && el.querySelector('[data-vm=mic]'); if (b) b.textContent = '🎙 ' + t('speak'); } };
    recog = r; try { r.start(); } catch (e) { recog = null; return; } var mb = el.querySelector('[data-vm=mic]'); if (mb) mb.textContent = '■ ' + t('stop');
  }
  function micStop() { if (recog) { try { recog.stop(); } catch (e) { } recog = null; } }
  function loadRolls() { return loadMade().then(bAll).then(function (l) { rolls = (l || []).sort(function (a, b) { return b.ts - a.ts; }); Object.keys(st.cuts).forEach(function (id) { if (!roll(id)) delete st.cuts[id]; }); if (!roll(st.sel) && rolls[0]) st.sel = rolls[0].id; if (st.sel) useRoll(st.sel); }); }
  /* Studio > Profile > B-rolls: the shelf, the chosen B-roll's parts, Fill texts, Save all */
  /* keep a part's text inside the safe zone, measured the way the video draws it */
  var MC = null;
  function clampClip(c) {
    if (!c) return; var cx = (MC || (MC = D.createElement('canvas'))).getContext('2d'), w = 1080, h = 1920, fs = c.size * w / 390, lh = fs * 1.25;
    cx.font = '700 ' + fs + 'px ' + FONT; var ls = wrap(cx, c.text, w * MAXW), mw = 0; ls.forEach(function (l) { mw = Math.max(mw, cx.measureText(l).width); });
    var hw = mw / 2 / w + 0.01, hh = ls.length * lh / 2 / h + 0.01;
    c.x = Math.round(Math.min(SAFE.r - hw, Math.max(SAFE.l + hw, c.x)) * 1000) / 1000; c.y = Math.round(Math.min(SAFE.b - hh, Math.max(SAFE.t + hh, c.y)) * 1000) / 1000;
    if (hw * 2 > SAFE.r - SAFE.l) c.x = (SAFE.l + SAFE.r) / 2;
  }
  /* each part's preview is the B-roll picture with the text drawn by the same drawText() as the video: what you see is what you save */
  var IMGS = {};
  function drawTiles() {
    if (!HOST || !st.sess) return;
    HOST.querySelectorAll('canvas[data-tc]').forEach(function (cv) {
      var i = +cv.getAttribute('data-tc'), c = st.sess.clips[i]; if (!c) return; var x = cv.getContext('2d'), w = cv.width, h = cv.height;
      x.fillStyle = '#111'; x.fillRect(0, 0, w, h);
      var src = FR[i]; if (src) { var im = IMGS[src]; if (!im) { im = IMGS[src] = new Image(); im.onload = drawTiles; im.src = src; } if (im.complete && im.naturalWidth) x.drawImage(im, 0, 0, w, h); }
      if (c.text) drawText(x, c, w, h);
    });
  }
  /* 25 Nov 2026 (Emmanuel: "it's saved ... But now ... there's no place where I could click save all videos"): ticked by default are the
     parts not saved yet; when every part is saved, all of them, so "📲 Save all again" is one tap */
  function selIdx0() { if (!st.sess) return []; var w = st.sess.clips.map(function (_c, i) { return i; }).filter(function (i) { return st.sess.clips[i].text; }), n = w.filter(function (i) { return !isUsed(st.sess.clips[i]); }); return n.length ? n : w; }
  function selIdx() { if (!st.sess) return []; var all = st.sess.clips.map(function (_c, i) { return i; }); if (SELSET) return all.filter(function (i) { return SELSET[i]; }); return selIdx0(); }
  function tile2(c, i, on) { var u = isUsed(c), m = got(i), mk = qRun && qNow === i && qRoll === (st.sess && st.sess.id);
    return '<div class="vm-t2' + (on ? ' on' : '') + (u ? ' used' : '') + '"><button class="vm-tile vm-tc" data-vm="popen" data-i="' + i + '" aria-label="' + esc(fmt(c.sec) + ' ' + (c.text || t('noText'))) + '"><canvas data-tc="' + i + '" width="270" height="480"></canvas>' +
      '<i>' + fmt(c.sec) + '</i><em>' + esc(T.ST[c.style] ? T.ST[c.style][I] : c.style) + '</em>' +
      (mk ? '<b class="vm-pc" data-pc>' + qPc + '%</b>' : u ? '<b class="vm-used">' + esc(t('saved')) + (m ? ' · 📲' : '') + '</b>' : m ? '<b class="vm-ok vm-okp">' + esc(t('made')) + '</b>' : !c.text ? '<b class="vm-nt">' + esc(t('noText')) + '</b>' : '') + '</button>' +
      '<div class="vm-tb"><button class="vm-sel" data-vm="tsel" data-i="' + i + '" aria-pressed="' + !!on + '" aria-label="' + esc(t('tick')) + '"><span>' + (on ? '✓' : '') + '</span></button>' +
      '<button class="vm-re" data-vm="reone" data-i="' + i + '" aria-label="' + esc(t('reOne')) + '"' + (busy ? ' disabled' : '') + '>↻</button></div></div>'; }
  function bar() {
    var sel = selIdx(), n = sel.length, ready = sel.filter(function (i) { return got(i); }).length, wantLeft = jobsLeft(st.sess.id).length, here = qRun && qRoll === st.sess.id;
    var a = '<button class="btn pri" data-vm="newT"' + (busy ? ' disabled' : '') + '>' + esc(busy ? t('writing') : t('newT')) + (n && n < st.sess.clips.length && !busy ? ' (' + n + ')' : '') + '</button>';
    var b;
    if (!n) b = '<button class="btn" disabled>' + esc(t('pickParts')) + '</button>';
    else if (ready === n) b = '<button class="btn pri" data-vm="saveSel">' + esc(sel.every(function (i) { return isUsed(st.sess.clips[i]); }) ? t('saveAgain', n) : t('saveN', n)) + '</button>';
    else if (qErr) b = '<button class="btn" data-vm="kick">' + esc(t('goOn')) + '</button>';
    else if (wantLeft) b = '<button class="btn" disabled>' + esc(t('leftN', wantLeft)) + (here ? ' · <span data-pc2>' + qPc + '</span>%' : '') + '</button>';
    else b = '<button class="btn" data-vm="makeSel">' + esc(n - ready === 1 ? t('make1') : t('makeN', n - ready)) + '</button>';
    return '<div class="vm-acts">' + a + b + '</div>';
  }
  function agoTxt(ts) { var d0 = new Date(); d0.setHours(0, 0, 0, 0); if (ts >= d0.getTime()) return t('today'); if (ts >= d0.getTime() - 864e5) return t('yest'); return t('daysAgo', Math.ceil((d0.getTime() - ts) / 864e5)); }
  var lastHTML = '', MB = '';
  /* Studio > Profile > B-rolls (25 Nov 2026, Emmanuel: "when I upload a B-roll, it shouldn't just start generating ... I can click on
     the playlist that I want the knowledge to go from ... and then click ... pick one by one which one I want to save ... resize them
     all ... a joystick ... it also saves my size and my positioning preference ... if I save something, there can be a check mark"):
     the B-roll shelf (a spinner while one is added; each cover says how many of its videos you saved and when you last did);
     Learn the style from (your playlists); Text language; ✨ New texts and 🎬 Make → 📲 Save for the ticked parts; one size and one
     joystick for all texts (remembered for every new part); and the parts, each with its tick, its ↻ and ✓ Saved once saved.
     It is drawn again only when something in it changed; the previews are canvases redrawn on their own. */
  function mountPaint() {
    var h = HOST; if (!h) return; var ss = st.sess && roll(st.sess.id) ? st.sess : null, pls = S.lists ? S.lists() : [];
    var sel = ss ? selIdx() : [], on = {}; sel.forEach(function (i) { on[i] = 1; });
    var anyText = ss && ss.clips.some(function (c) { return c.text; });
    var html = (qRun && roll(qRoll) ? '<p class="vm-now" role="status">' + esc(t('nowMaking', fmt(roll(qRoll).dur))) + ' · <span data-pc2>' + qPc + '</span>% · ' + esc(t('leftN', jobsLeft().length)) + '</p>' : '') + '<p class="vm-store" id="vmStore">' + esc(t('storeN', rolls.length) + (MB ? ' · ' + MB : '')) + '</p>' +
      '<div class="vm-shelf" id="vmShelfP"><label class="vm-cd vm-add"><input type="file" accept="video/*" multiple hidden id="vmFileP"><span>＋</span><b>' + esc(t('add')) + '</b></label>' +
      new Array(ADDING + 1).join('<div class="vm-cd vm-adding" role="status"><span class="vm-spin" aria-hidden="true"></span><b>' + esc(t('adding')) + '</b></div>') +
      rolls.map(function (r) { var us = usedOf(r.id), last = us.reduce(function (m, u) { return Math.max(m, u.ts || 0); }, 0);
        return '<button class="vm-cd' + (r.id === st.sel ? ' on' : '') + '" data-vm="sel" data-id="' + esc(r.id) + '">' + (r.thumb ? '<img alt="" src="' + esc(r.thumb) + '">' : '') + '<i>' + fmt(r.dur) + '</i>' + (us.length ? '<b class="vm-cdn">✓ ' + us.length + '</b><small class="vm-cdd">' + esc(agoTxt(last)) + '</small>' : '') + (jobsLeft(r.id).length ? '<b class="vm-cdq">🎬 ' + jobsLeft(r.id).length + (qRun && qRoll === r.id ? ' · <span data-pc2>' + qPc + '</span>%' : '') + '</b>' : '') + '<em data-vm="rm" data-id="' + esc(r.id) + '" aria-label="✕">✕</em></button>'; }).join('') + '</div>' +
      (ss ? (st.aiNote ? '<p class="vm-note">' + esc(st.aiNote) + '</p>' : '') + (qErr ? '<p class="vm-note">' + esc(t('blocked')) + '</p>' : '') +
        styleRow() +
        '<div class="vm-row2"><span class="vm-l2">' + esc(t('learn')) + '</span></div>' +
        ('<div class="vm-chips vm-plc"><button class="pill' + (!st.pl ? ' acc' : '') + '" data-vm="pl" data-id="" aria-pressed="' + !st.pl + '">' + esc(t('inspoDef')) + ' <small>' + esc(t('plN', inspoIds().length)) + '</small></button>' + pls.map(function (q) { var n = (q.items || []).length; return '<button class="pill' + (st.pl === q.id ? ' acc' : '') + '" data-vm="pl" data-id="' + esc(q.id) + '" aria-pressed="' + (st.pl === q.id) + '">' + esc(q.name) + ' <small>' + esc(t('plN', n)) + '</small></button>'; }).join('') + '</div>') +
        '<div class="vm-lang"><span>' + esc(t('textLang')) + '</span>' + ['en', 'de', 'es'].map(function (l) { return '<button class="pill' + (st.lang === l ? ' acc' : '') + '" data-vm="lang" data-l="' + l + '" aria-pressed="' + (st.lang === l) + '">' + l.toUpperCase() + '</button>'; }).join('') + '</div>' +
        bar() + '<p class="note vm-fn">' + esc(t('howMake')) + '</p>' +
        '<div class="vm-all"><span class="vm-l2">' + esc(t('allT')) + '</span><div class="vm-asz"><button class="pill" data-vm="asz" data-d="-2" aria-label="' + esc(t('sizeAll')) + ' −">A−</button><span>' + esc(t('sizeN', ss.clips[0] ? ss.clips[0].size : st.pref.size)) + '</span><button class="pill" data-vm="asz" data-d="2" aria-label="' + esc(t('sizeAll')) + ' +">A+</button></div>' +
          '<div class="vm-joy" role="group" aria-label="' + esc(t('allT')) + '"><button data-vm="amv" data-dx="0" data-dy="-1" aria-label="↑">↑</button><button data-vm="amv" data-dx="-1" data-dy="0" aria-label="←">←</button><button data-vm="amv" data-c="1" aria-label="●">●</button><button data-vm="amv" data-dx="1" data-dy="0" aria-label="→">→</button><button data-vm="amv" data-dx="0" data-dy="1" aria-label="↓">↓</button></div>' +
          '<button class="pill" data-vm="alook">' + esc(ss.clips[0] && ss.clips[0].look === 'box' ? t('box') : t('plain')) + '</button></div>' +
        (anyText ? '' : '<p class="note vm-first">' + esc(t('firstTexts')) + '</p>') +
        '<div class="vm-grid vm-g2">' + ss.clips.map(function (c, i) { return tile2(c, i, on[i]); }).join('') + '</div><p class="note vm-ns">' + esc(t('noSound')) + '</p>'
        : (ADDING ? '' : '<p class="note">' + esc(t('noRolls')) + '</p>'));
    if (html === lastHTML && h.firstChild) { drawTiles(); storeLine(); return; }   /* nothing changed: no redraw */
    var sh0 = D.getElementById('vmShelfP'), sl = sh0 ? sh0.scrollLeft : -1, same = h.__sel === st.sel;
    lastHTML = html; h.innerHTML = html; h.__sel = st.sel;
    var f = D.getElementById('vmFileP'); if (f) f.onchange = function () { addFiles(f.files); f.value = ''; };
    var sh = D.getElementById('vmShelfP');
    if (sh) { sh.onscroll = function () { cdFocusIn(sh); };
      /* keep the shelf where it was; centre the chosen B-roll only when the choice changed (sideways only: the page never jumps) */
      if (same && sl >= 0) sh.scrollLeft = sl; else { var onc = sh.querySelector('.on'); if (onc) sh.scrollLeft = Math.max(0, onc.offsetLeft - (sh.clientWidth - onc.offsetWidth) / 2); }
      cdFocusIn(sh); }
    drawTiles(); storeLine();
    if (ss) frames(true); if (JOBS.length) setTimeout(queue, 300);
  }
  /* one change for every part of this B-roll (size, place, look), kept inside the safe zone and remembered for new parts */
  /* 25 Nov 2026: your style (core message) as one row you swipe sideways: tap one to use it, tap it again to change it, ＋ to add one.
     Styles belong to the account you are on, so each account writes in its own voice. */
  function styleRow() {
    var A = W.StudioAcc && StudioAcc.styles ? StudioAcc.styles() : null; if (!A) return '';
    return '<div class="vm-row2"><span class="vm-l2">' + esc(t('myStyle')) + '</span></div><div class="vm-chips vm-plc">' +
      A.list.map(function (x) { return '<button class="pill' + (x.id === A.sel ? ' acc' : '') + '" data-vm="sty" data-id="' + esc(x.id) + '" aria-pressed="' + (x.id === A.sel) + '" title="' + esc(x.text.slice(0, 200)) + '">' + (x.id === A.sel ? '✓ ' : '') + esc(x.name) + '</button>'; }).join('') +
      '<button class="pill" data-vm="sty" data-id="">' + esc(t('newStyle')) + '</button></div>';
  }
  function styleDlg(x) {
    if (!S.dlg) return; x = x || {id: '', name: '', text: ''};
    S.dlg('<h2>' + esc(t('myStyle')) + '</h2><input id="vmStN" class="vm-tx" style="min-height:0" maxlength="40" placeholder="' + esc(t('styleName')) + '" value="' + esc(x.name) + '">' +
      '<textarea id="vmStT" class="vm-tx" rows="7" placeholder="' + esc(t('stylePh')) + '">' + esc(x.text) + '</textarea>' +
      '<div class="vm-acts"><button class="btn pri" id="vmStS">' + esc(t('saveStyle')) + '</button>' + (x.id ? '<button class="btn" id="vmStD">' + esc(t('delStyle')) + '</button>' : '') + '</div>');
    var g = function (id) { return D.getElementById(id); };
    if (g('vmStS')) g('vmStS').onclick = function () { StudioAcc.styleSave({id: x.id, name: g('vmStN').value, text: g('vmStT').value}); S.dlgClose(); S.toast('✓'); refresh(); };
    if (g('vmStD')) g('vmStD').onclick = function () { if (!confirm(t('delStyle') + '?')) return; StudioAcc.styleDel(x.id); S.dlgClose(); refresh(); };
    setTimeout(function () { var e = g(x.id ? 'vmStT' : 'vmStN'); if (e) e.focus(); }, 60);
  }
  function allSet(fn) { if (!st.sess) return; st.sess.clips.forEach(function (c) { fn(c); clampClip(c); }); var n = st.sess.clips.length || 1;
    st.pref.x = Math.round(st.sess.clips.reduce(function (m, c) { return m + c.x; }, 0) / n * 1000) / 1000; st.pref.y = Math.round(st.sess.clips.reduce(function (m, c) { return m + c.y; }, 0) / n * 1000) / 1000; }
  function storeLine() { try { if (navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then(function (e) { if (!e || e.usage == null) return; var m = t('used', Math.round(e.usage / 1048576)); if (m === MB) return; MB = m; var x = D.getElementById('vmStore'); if (x) x.textContent = t('storeN', rolls.length) + ' · ' + MB; lastHTML = ''; }); } catch (e) { } }
  var FRK = {};   /* thumbnails by start second, for the Used folder */
  function dShort(ts) { try { return new Date(ts).toLocaleDateString(['en-GB', 'de-DE', 'es-ES'][I] || 'en-GB', {day: 'numeric', month: 'short'}); } catch (e) { return ''; } }
  function cdFocusIn(sh) { var mid = sh.getBoundingClientRect().left + sh.clientWidth / 2; sh.querySelectorAll('.vm-cd').forEach(function (c) { var r = c.getBoundingClientRect(), d = Math.abs(r.left + r.width / 2 - mid); c.style.setProperty('--k', Math.max(0, 1 - d / (sh.clientWidth * 0.6)).toFixed(3)); }); }
  function mount(host) {
    HOST = host; if (!host.__vm) { host.__vm = 1; host.addEventListener('click', function (e) { var b = e.target.closest('[data-vm]'); if (!b) return;
      if (b.dataset.vm === 'popen') { fromProf = true; cur = +b.dataset.i; page(); el.classList.add('on'); D.body.style.overflow = 'hidden'; view = 'edit'; paint(); return; }
      onClick(e); }); }
    mountPaint(); loadRolls().then(mountPaint, mountPaint);
  }
  function open() { fromProf = false; page(); view = 'home'; loadRolls().then(paint, paint); paint(); el.classList.add('on'); D.body.style.overflow = 'hidden'; }
  function close() { micStop(); if (el) el.classList.remove('on'); D.body.style.overflow = ''; view = 'home'; if (HOST && HOST.isConnected) mountPaint(); }
  W.StudioVM = {open: open, close: close, mount: mount, label: function () { return t('btn'); }, core: core, _T: T};
})(window, document);
