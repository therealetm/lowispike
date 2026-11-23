/* LOWiSPIKE review ask (23 Nov 2026, Emmanuel: "send out a notification to everyone that already is using the app ... that they
   should rate the app ... these ratings will be automatically added to the website ... they can even make a voice note ... so it
   really is like a verified human ... they get a lot of XP ... a notification that pops up inside of the world, in front of [their
   companion] ... with their speak button ... the same voice from the tutorial ... if they only did a voice note, that voice note also
   gets transcribed ... their profile picture is also in there ... a review about the app itself, not about the results").
   - Who: signed-in people who use the app and have not reviewed yet. Once a session at most, on Home with nothing else open.
     "Later" asks again in 3 days, "No thanks" never again.
   - The card sits in the lower half of the world so the person's companion stays visible above it. 🔊 plays the recorded message
     (review-voice/<lang>.mp3, the tutorial's voices, tools/review-voice.py; never the device voice).
   - The review: 1 to 5 stars, words (dictation mic in the box), and/or a voice note (up to 90 s). Voice notes go to Storage
     media/<uid>/review-<ts>.*, are transcribed by lowi-ai (action transcribe), and saved with the review in public.app_reviews (one
     per person, editable). The website (store-page.js) lists app_reviews_public: first name, profile picture, stars, words, a play
     button and the transcript.
   - XP: REVIEW_XP once per person (eventId review-app-v1), paid when the review is saved. Changing it later pays nothing. */
(function (root) {
  'use strict';
  const REVIEW_XP = 1000, KEY = 'lowi.review.v1', MAX_S = 90;
  const SAY = {
    en: 'Hi! Eman, who makes LOWiSPIKE, needs your support. Please tell him what you like about the app, and what could be better. It would be really nice if you send a short voice note. Your review appears on the LOWiSPIKE website, and your companion gets 1000 XP.',
    de: 'Hallo! Eman, der LOWiSPIKE macht, braucht deine Unterstützung. Sag ihm bitte, was dir an der App gefällt und was besser sein könnte. Am schönsten wäre eine kurze Sprachnachricht. Deine Bewertung erscheint auf der LOWiSPIKE-Webseite, und dein Begleiter bekommt 1000 XP.',
    es: '¡Hola! Eman, quien hace LOWiSPIKE, necesita tu apoyo. Cuéntale qué te gusta de la app y qué podría mejorar. Sería genial si envías una nota de voz corta. Tu reseña aparece en la web de LOWiSPIKE y tu compañero recibe 1000 XP.'
  };
  if (typeof module === 'object' && module.exports && typeof window === 'undefined') { module.exports = { SAY, REVIEW_XP }; return; }
  const W = root, D = W.document; if (!D || W.LowiReviewAsk) return;
  const TX = {
    en: { title: 'Eman needs your support', write: 'Write a review', later: 'Later', no: 'No thanks', listen: 'Listen', stop: 'Stop',
      h: 'Rate LOWiSPIKE', starsQ: 'How do you like the app?', ph: 'What do you like? What could be better?', about: 'About the app itself, not about your results.',
      voice: 'Voice note (optional)', rec: 'Record a voice note', recing: 'Recording… tap to stop', del: 'Delete', send: 'Send review', busy: 'Sending…',
      need: 'Pick the stars and add a few words or a voice note.', thanks: 'Thank you!', thanksT: 'Your review is on the website. Your companion got the XP.', thanksAgain: 'Your review is updated.', done: 'Done',
      err: 'Could not send it. Check your connection and try again.', signin: 'Sign in to leave a review.', mic: 'The microphone is off. Allow it in your phone settings, or just type.', shows: 'Shows on the website with your first name and profile picture.' },
    de: { title: 'Eman braucht deine Unterstützung', write: 'Bewertung schreiben', later: 'Später', no: 'Nein danke', listen: 'Anhören', stop: 'Stopp',
      h: 'LOWiSPIKE bewerten', starsQ: 'Wie gefällt dir die App?', ph: 'Was gefällt dir? Was könnte besser sein?', about: 'Über die App selbst, nicht über deine Ergebnisse.',
      voice: 'Sprachnachricht (optional)', rec: 'Sprachnachricht aufnehmen', recing: 'Nimmt auf… tippen zum Stoppen', del: 'Löschen', send: 'Bewertung senden', busy: 'Wird gesendet…',
      need: 'Wähl die Sterne und schreib ein paar Worte oder nimm eine Sprachnachricht auf.', thanks: 'Danke!', thanksT: 'Deine Bewertung ist auf der Webseite. Dein Begleiter hat die XP bekommen.', thanksAgain: 'Deine Bewertung ist aktualisiert.', done: 'Fertig',
      err: 'Senden hat nicht geklappt. Prüf deine Verbindung und versuch es nochmal.', signin: 'Melde dich an, um eine Bewertung zu schreiben.', mic: 'Das Mikrofon ist aus. Erlaub es in den Handy-Einstellungen oder schreib einfach.', shows: 'Erscheint auf der Webseite mit deinem Vornamen und Profilbild.' },
    es: { title: 'Eman necesita tu apoyo', write: 'Escribir una reseña', later: 'Más tarde', no: 'No, gracias', listen: 'Escuchar', stop: 'Parar',
      h: 'Valora LOWiSPIKE', starsQ: '¿Qué te parece la app?', ph: '¿Qué te gusta? ¿Qué podría mejorar?', about: 'Sobre la app en sí, no sobre tus resultados.',
      voice: 'Nota de voz (opcional)', rec: 'Grabar nota de voz', recing: 'Grabando… toca para parar', del: 'Borrar', send: 'Enviar reseña', busy: 'Enviando…',
      need: 'Elige las estrellas y añade unas palabras o una nota de voz.', thanks: '¡Gracias!', thanksT: 'Tu reseña está en la web. Tu compañero recibió los XP.', thanksAgain: 'Tu reseña está actualizada.', done: 'Listo',
      err: 'No se pudo enviar. Revisa tu conexión e inténtalo otra vez.', signin: 'Inicia sesión para dejar una reseña.', mic: 'El micrófono está desactivado. Actívalo en los ajustes o escribe.', shows: 'Aparece en la web con tu nombre y foto de perfil.' }
  };
  const lang = () => { try { const l = (localStorage.getItem('lowispike.lang') || D.documentElement.lang || 'en').slice(0, 2); return TX[l] ? l : 'en'; } catch (e) { return 'en'; } };
  const t = k => TX[lang()][k];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const st = () => { try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; } catch (e) { return {}; } };
  const put = o => { try { localStorage.setItem(KEY, JSON.stringify(Object.assign(st(), o))); } catch (e) { } };
  const live = () => { try { return !!(W.LOWI_CLOUD && W.LOWI_CLOUD.live && W.LOWI_CLOUD.live()); } catch (e) { return false; } };
  async function client() { const x = W.LOWI_CLOUD_X; if (!x || !live()) return null; try { return await x.client(); } catch (e) { return null; } }
  function compName() { try { const B = W.LowiBirthCompanion, n = B && B.displayName ? String(B.displayName() || '').trim() : ''; if (n) return n; } catch (e) { } return ''; }
  let asked = false, card = null, page = null, audio = null;

  /* ---------- the card in the world ---------- */
  function quiet() { return !D.querySelector('.r2-ov:not(.off), #sheetwrap.open, #ltTour, .lt-tour, #lspStore, #lwAsk, .cs-overlay, #r2gate .a1, #mistyHub'); }
  function onHome() { const h = D.getElementById('tab-home'); return !!(h && h.classList.contains('active')) && D.visibilityState === 'visible'; }
  function want() { const s = st(); if (s.done || s.never || asked) return false; if (s.later && Date.now() - s.later < 3 * 864e5) return false; return live(); }
  function speak(b) {
    if (audio && !audio.paused) { audio.pause(); audio = null; b.classList.remove('on'); b.querySelector('span').textContent = t('listen'); return; }
    audio = new Audio('review-voice/' + lang() + '.mp3'); b.classList.add('on'); b.querySelector('span').textContent = t('stop');
    const end = () => { b.classList.remove('on'); const s = b.querySelector('span'); if (s) s.textContent = t('listen'); };
    audio.onended = end; audio.onerror = end; audio.play().catch(end);
  }
  function hush() { if (audio) { try { audio.pause(); } catch (e) { } audio = null; } }
  function showCard() {
    if (card) return; asked = true;
    const n = compName();
    card = D.createElement('div'); card.className = 'rva'; card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'true'); card.setAttribute('aria-labelledby', 'rvaT'); card.setAttribute('data-noi18n', '');
    card.innerHTML = '<div class="rva-card"><div class="rva-top"><b id="rvaT">' + esc(t('title')) + '</b><button type="button" class="rva-say" data-rva="say" aria-label="' + esc(t('listen')) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg><span>' + esc(t('listen')) + '</span></button></div>' +
      '<p>' + esc(SAY[lang()].replace(lang() === 'de' ? 'dein Begleiter' : lang() === 'es' ? 'tu compañero' : 'your companion', n || (lang() === 'de' ? 'dein Begleiter' : lang() === 'es' ? 'tu compañero' : 'your companion'))) + '</p>' +
      '<span class="rva-xp">+' + REVIEW_XP + ' XP' + (n ? ' · ' + esc(n) : '') + '</span>' +
      '<button type="button" class="rva-go" data-rva="go">' + esc(t('write')) + '</button><div class="rva-row"><button type="button" data-rva="later">' + esc(t('later')) + '</button><button type="button" data-rva="no">' + esc(t('no')) + '</button></div></div>';
    card.addEventListener('click', e => { const b = e.target.closest('[data-rva]'); if (!b) return; const k = b.dataset.rva;
      if (k === 'say') return speak(b);
      hush(); closeCard();
      if (k === 'go') open(); else if (k === 'later') put({ later: Date.now() }); else if (k === 'no') put({ never: Date.now() }); });
    D.body.appendChild(card);
    try { card.querySelector('.rva-go').focus({ preventScroll: true }); } catch (e) { }
  }
  function closeCard() { if (!card) return; const c = card; card = null; c.classList.add('out'); setTimeout(() => c.remove(), 250); }

  /* ---------- the review page ---------- */
  let stars = 0, rec = null, chunks = [], blob = null, blobUrl = '', recT = 0, recStart = 0, had = null;
  function pickMime() { const M = W.MediaRecorder; if (!M || !M.isTypeSupported) return ''; for (const m of ['audio/webm;codecs=opus', 'audio/mp4', 'audio/aac', 'audio/ogg;codecs=opus']) if (M.isTypeSupported(m)) return m; return ''; }
  function paintPage(msg) {
    if (!page) return;
    const box = page.querySelector('.rvp-in');
    box.innerHTML = '<h2>' + esc(t('h')) + '</h2><p class="rvp-q">' + esc(t('starsQ')) + '</p>' +
      '<div class="rvp-stars" role="radiogroup" aria-label="' + esc(t('starsQ')) + '">' + [1, 2, 3, 4, 5].map(i => '<button type="button" role="radio" aria-checked="' + (stars === i) + '" aria-label="' + i + '" data-rvp-s="' + i + '" class="' + (i <= stars ? 'on' : '') + '">★</button>').join('') + '</div>' +
      '<textarea data-mic class="rvp-ta" rows="4" maxlength="1000" placeholder="' + esc(t('ph')) + '">' + esc(page.__txt || '') + '</textarea><p class="rvp-note">' + esc(t('about')) + '</p>' +
      '<p class="rvp-q">' + esc(t('voice')) + '</p>' +
      (blobUrl ? '<div class="rvp-voice"><audio controls src="' + esc(blobUrl) + '"></audio><button type="button" data-rvp="del">' + esc(t('del')) + '</button></div>'
        : '<button type="button" class="rvp-rec' + (rec ? ' on' : '') + '" data-rvp="rec"><i aria-hidden="true"></i><span>' + esc(rec ? t('recing') + ' ' + Math.round((Date.now() - recStart) / 1000) + ' s' : t('rec')) + '</span></button>') +
      '<p class="rvp-note">' + esc(t('shows')) + '</p>' + (msg ? '<p class="rvp-msg" role="status">' + esc(msg) + '</p>' : '') +
      '<div class="rvp-foot"><button type="button" class="rvp-x" data-rvp="close">' + esc(t('later')) + '</button><button type="button" class="rvp-send" data-rvp="send">' + esc(t('send')) + (st().done ? '' : ' · +' + REVIEW_XP + ' XP') + '</button></div>';
    const ta = box.querySelector('.rvp-ta'); if (ta) ta.addEventListener('input', () => { page.__txt = ta.value; });
  }
  async function startRec() {
    const mime = pickMime(); if (!mime || !navigator.mediaDevices) return paintPage(t('mic'));
    let s; try { s = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { return paintPage(t('mic')); }
    chunks = []; rec = new MediaRecorder(s, { mimeType: mime, audioBitsPerSecond: 48000 }); rec.__mime = mime.split(';')[0];
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = () => { s.getTracks().forEach(x => x.stop()); blob = new Blob(chunks, { type: rec.__mime }); blob.__mime = rec.__mime; if (blobUrl) URL.revokeObjectURL(blobUrl); blobUrl = URL.createObjectURL(blob); rec = null; clearInterval(recT); paintPage(); };
    rec.start(); recStart = Date.now(); clearInterval(recT); recT = setInterval(() => { if (!rec) return clearInterval(recT); if (Date.now() - recStart > MAX_S * 1000) rec.stop(); else paintPage(); }, 1000); paintPage();
  }
  const b64 = b => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.onerror = no; r.readAsDataURL(b); });
  async function send(btn) {
    const body = String(page.__txt || '').trim();
    if (!stars || (!body && !blob && !(had && had.voice_url))) return paintPage(t('need'));
    btn.disabled = true; btn.textContent = t('busy');
    try {
      const c = await client(); if (!c) throw new Error('signin');
      const ses = await c.auth.getSession(), uid = ses && ses.data && ses.data.session && ses.data.session.user && ses.data.session.user.id; if (!uid) throw new Error('signin');
      let voice_url = had ? had.voice_url || null : null, transcript = had ? had.transcript || '' : '';
      if (blob) {
        const ext = /mp4|aac/.test(blob.__mime) ? 'm4a' : /ogg/.test(blob.__mime) ? 'ogg' : 'webm', path = uid + '/review-' + Date.now() + '.' + ext;
        const up = await c.storage.from('media').upload(path, blob, { contentType: blob.__mime, upsert: true, cacheControl: '31536000' }); if (up && up.error) throw up.error;
        voice_url = c.storage.from('media').getPublicUrl(path).data.publicUrl; transcript = '';
        try { if (W.LowiAsk && W.LowiAsk.call) { const j = await W.LowiAsk.call({ action: 'transcribe', mime: blob.__mime, audio: await b64(blob) }); transcript = String(j.text || '').trim(); } } catch (e) { }
      }
      const row = { user_id: uid, stars, body, voice_url, transcript, lang: lang() };
      const r = await c.from('app_reviews').upsert(row, { onConflict: 'user_id' }); if (r && r.error) throw r.error;
      const first = !st().done; put({ done: Date.now() });
      let got = 0; if (first) { try { got = W.award ? W.award(REVIEW_XP, 'Thank you for your review', null, 'review', 'review-app-v1') || 0 : 0; } catch (e) { got = 0; } }
      page.querySelector('.rvp-in').innerHTML = '<div class="rvp-done"><div class="rvp-big">' + (got ? '+' + got + ' XP' : '★') + '</div><h2>' + esc(t('thanks')) + '</h2><p>' + esc(got ? t('thanksT') : t('thanksAgain')) + '</p><button type="button" class="rvp-send" data-rvp="close">' + esc(t('done')) + '</button></div>';
    } catch (e) { btn.disabled = false; paintPage(String(e && e.message) === 'signin' ? t('signin') : t('err')); }
  }
  async function open() {
    if (page) return;
    stars = 0; blob = null; blobUrl = ''; had = null;
    page = D.createElement('div'); page.className = 'rvp'; page.setAttribute('role', 'dialog'); page.setAttribute('aria-modal', 'true'); page.setAttribute('data-noi18n', '');
    page.innerHTML = '<div class="rvp-in"></div>';
    page.addEventListener('click', e => { const s = e.target.closest('[data-rvp-s]'); if (s) { stars = +s.dataset.rvpS; return paintPage(); }
      const b = e.target.closest('[data-rvp]'); if (!b) return; const k = b.dataset.rvp;
      if (k === 'rec') { if (rec) rec.stop(); else startRec(); } else if (k === 'del') { blob = null; if (blobUrl) URL.revokeObjectURL(blobUrl); blobUrl = ''; if (had) had.voice_url = null; paintPage(); }
      else if (k === 'send') send(b); else if (k === 'close') close(); });
    D.body.appendChild(page); paintPage();
    try { const c = await client(), ses = c && await c.auth.getSession(), uid = ses && ses.data.session && ses.data.session.user.id;
      if (uid) { const r = await c.from('app_reviews').select('stars,body,voice_url,transcript').eq('user_id', uid).maybeSingle(); if (r && r.data && page) { had = r.data; stars = r.data.stars; page.__txt = r.data.body; if (r.data.voice_url) blobUrl = r.data.voice_url; paintPage(); } } } catch (e) { }
  }
  function close() { if (rec) { try { rec.stop(); } catch (e) { } } clearInterval(recT); if (!page) return; const p = page; page = null; p.classList.add('out'); setTimeout(() => p.remove(), 250); }

  function tick() { if (!card && !page && want() && onHome() && quiet()) showCard(); }
  setTimeout(() => { tick(); setInterval(tick, 5000); }, 12000);
  W.LowiReviewAsk = { open, show: showCard, SAY, REVIEW_XP };
})(typeof window !== 'undefined' ? window : globalThis);
