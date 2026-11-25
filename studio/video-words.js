/* LOWiSPIKE Studio · video to words (23 Nov 2026, Emmanuel: "another function inside of every profile, which is that I send a link
   of a video that I'm about to copy, and it then gives me the transcript, if there is a transcript, or the text on the screen, if
   there's a text on the screen, and the bio. And then I can translate it in any language I want to. For example, German or Spanish.")
   A full page (like the idea page): paste the link, "Get the words". studio-ai action "words" (every signed-in person since 25 Nov 2026, 10 a day) returns the spoken words,
   the text on screen and the caption; each has Copy. Translate into English, German, Spanish or any language typed in the box
   (studio-ai "translate"); "Show original" goes back. "Save as idea" keeps it as a draft on the current account. TikTok videos give
   the spoken words; for Instagram (or when TikTok refuses the file) only the caption comes back, and the page says so. */
(function (W, D) {
  'use strict';
  var S = W.STUDIO; if (!S || W.StudioWords) return;
  var L = S.L === 'de' || S.L === 'es' ? S.L : 'en', I = {en: 0, de: 1, es: 2}[L];
  var T = {
    btn: ['Video link → words', 'Videolink → Text', 'Enlace de vídeo → texto'],
    title: ['Words from a video', 'Text aus einem Video', 'Texto de un vídeo'],
    sub: ['Paste the link of a TikTok you want to copy. You get what is said, the text on screen and the caption.', 'Füg den Link eines TikToks ein, das du nachmachen willst. Du bekommst, was gesagt wird, den Text im Bild und die Beschreibung.', 'Pega el enlace de un TikTok que quieras copiar. Recibes lo que se dice, el texto en pantalla y la descripción.'],
    ph: ['https://www.tiktok.com/@…/video/…', 'https://www.tiktok.com/@…/video/…', 'https://www.tiktok.com/@…/video/…'],
    go: ['Get the words', 'Text holen', 'Sacar el texto'], wait: ['Watching the video… (up to a minute)', 'Schaue das Video… (bis zu einer Minute)', 'Viendo el vídeo… (hasta un minuto)'],
    said: ['What is said', 'Was gesagt wird', 'Lo que se dice'], screen: ['Text on screen', 'Text im Bild', 'Texto en pantalla'], cap: ['Caption', 'Beschreibung', 'Descripción'],
    none: ['Nothing here', 'Nichts da', 'No hay nada'], copy: ['Copy', 'Kopieren', 'Copiar'], copied: ['Copied', 'Kopiert', 'Copiado'],
    noVideo: ['Could not open the video itself, so only the caption is here. Spoken words work for TikTok links.', 'Das Video selbst ging nicht auf, darum steht hier nur die Beschreibung. Gesprochenes klappt bei TikTok-Links.', 'No se pudo abrir el vídeo, así que solo está la descripción. Lo hablado funciona con enlaces de TikTok.'],
    tr: ['Translate into', 'Übersetzen in', 'Traducir a'], any: ['Any language, e.g. Italian', 'Jede Sprache, z. B. Italienisch', 'Cualquier idioma, p. ej. italiano'], trGo: ['Translate', 'Übersetzen', 'Traducir'],
    trWait: ['Translating…', 'Übersetze…', 'Traduciendo…'], orig: ['Show original', 'Original zeigen', 'Ver original'], save: ['Save as idea', 'Als Idee speichern', 'Guardar como idea'], saved: ['Saved in Drafts', 'In Entwürfen gespeichert', 'Guardado en borradores'],
    back: ['Back', 'Zurück', 'Atrás'], bad: ['Paste a TikTok or Instagram video link.', 'Füg einen TikTok- oder Instagram-Videolink ein.', 'Pega un enlace de vídeo de TikTok o Instagram.'],
    limit: ['That is enough for today. Try again tomorrow.', 'Für heute ist genug. Morgen wieder.', 'Por hoy es suficiente. Mañana otra vez.'], fail: ['That did not work. Try again in a moment.', 'Das hat nicht geklappt. Versuch es gleich nochmal.', 'No funcionó. Inténtalo de nuevo en un momento.'],
    owner: ['Sign in to LOWiSPIKE first, then try again.', 'Melde dich zuerst bei LOWiSPIKE an und versuch es dann nochmal.', 'Inicia sesión en LOWiSPIKE primero y vuelve a intentarlo.']
  };
  var t = function (k) { return T[k][I]; }, esc = S.esc;
  var R = null, SHOW = null, busy = false;   /* R: the original words; SHOW: what is on screen now (original or a translation) */
  var LANGS = [['en', 'English'], ['de', 'Deutsch'], ['es', 'Español']];
  function page() {
    var el = D.getElementById('vwords'); if (!el) { el = D.createElement('section'); el.id = 'vwords'; el.className = 'view'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); D.body.appendChild(el); el.addEventListener('click', onClick); }
    return el;
  }
  function block(k, txt) {
    return '<div class="vw-b"><div class="vw-bh"><b>' + esc(t(k)) + '</b>' + (txt ? '<button type="button" class="pill" data-vw="copy" data-k="' + k + '">' + esc(t('copy')) + '</button>' : '') + '</div>' +
      (txt ? '<p class="vw-tx" data-k="' + k + '">' + esc(txt) + '</p>' : '<p class="note">' + esc(t('none')) + '</p>') + '</div>';
  }
  function paint(status) {
    var el = page(), link = (D.getElementById('vwLink') || {}).value || (R && R.link) || '';
    var res = '';
    if (SHOW) {
      res = (R.thumb || R.author ? '<div class="vw-who">' + (R.thumb ? '<img alt="" src="' + esc(R.thumb) + '">' : '') + '<b>' + esc(R.author || '') + '</b></div>' : '') +
        (R.transcribed ? '' : '<p class="note vw-warn">' + esc(t('noVideo')) + '</p>') +
        (R.transcribed ? block('said', SHOW.transcript) + block('screen', SHOW.onscreen) : '') + block('cap', SHOW.caption) +
        '<div class="vw-tr"><b>' + esc(t('tr')) + '</b><div class="vw-chips">' + LANGS.map(function (x) { return '<button type="button" class="pill" data-vw="lang" data-l="' + x[0] + '">' + esc(x[1]) + '</button>'; }).join('') + '</div>' +
        '<div class="vw-any"><input id="vwAny" type="text" autocomplete="off" placeholder="' + esc(t('any')) + '"><button type="button" class="btn" data-vw="any">' + esc(t('trGo')) + '</button></div>' +
        (SHOW !== R ? '<button type="button" class="btn vw-orig" data-vw="orig">' + esc(t('orig')) + '</button>' : '') + '</div>';
    }
    el.innerHTML = '<div class="vtop"><button class="ib" data-vw="close" aria-label="' + esc(t('back')) + '">‹</button><span class="cnt">' + esc(t('title')) + '</span><span style="width:46px"></span></div>' +
      '<div class="vbody"><p class="note">' + esc(t('sub')) + '</p><div class="vw-in"><input id="vwLink" type="url" inputmode="url" autocomplete="off" placeholder="' + esc(t('ph')) + '" value="' + esc(link) + '">' +
      '<button type="button" class="btn pri" data-vw="go"' + (busy ? ' disabled' : '') + '>' + esc(t('go')) + '</button></div>' + (status ? '<p class="vw-st" role="status">' + esc(status) + '</p>' : '') + res + '</div>' +
      '<div class="vnav"><button class="btn" data-vw="close">' + esc(t('back')) + '</button>' + (SHOW && W.StudioAcc && StudioAcc.addDraft ? '<button class="btn pri" data-vw="save">' + esc(t('save')) + '</button>' : '') + '</div>';
  }
  function err(e) { var m = String(e && e.message || ''); return m === 'limit' ? t('limit') : m === 'bad_link' ? t('bad') : (m === 'owner_only' || m === 'sign_in') ? t('owner') : t('fail'); }
  function go() {
    var link = String((D.getElementById('vwLink') || {}).value || '').trim();
    if (!/^https:\/\/([a-z0-9-]+\.)*(tiktok\.com|instagram\.com)\//i.test(link)) return paint(t('bad'));
    busy = true; R = null; SHOW = null; paint(t('wait'));
    S.ai({action: 'words', link: link}).then(function (j) {
      busy = false; R = {link: link, transcript: j.transcript || '', onscreen: j.onscreen || '', caption: j.caption || '', author: j.author || '', thumb: j.thumb || '', transcribed: !!j.transcribed}; SHOW = R; paint('');
    }, function (e) { busy = false; paint(err(e)); });
  }
  function translate(to) {
    if (!R || busy || !String(to || '').trim()) return;
    var parts = [R.transcript, R.onscreen, R.caption], SEP = '\n§§§\n', all = parts.join(SEP);
    busy = true; paint(t('trWait'));
    var one = function (x) { return x ? S.ai({action: 'translate', text: x.slice(0, 6000), to: to}).then(function (j) { return j.text || ''; }) : Promise.resolve(''); };
    var p = all.length <= 5900 ? one(all).then(function (x) { var o = x.split(/\s*§§§\s*/); return o.length === 3 ? o : Promise.all(parts.map(one)); }) : Promise.all(parts.map(one));
    p.then(function (o) { busy = false; SHOW = {transcript: o[0], onscreen: o[1], caption: o[2]}; paint(''); }, function (e) { busy = false; paint(err(e)); });
  }
  function copy(k, b) {
    var x = SHOW && (k === 'said' ? SHOW.transcript : k === 'screen' ? SHOW.onscreen : SHOW.caption) || '';
    var done = function () { b.textContent = t('copied'); setTimeout(function () { b.textContent = t('copy'); }, 1400); };
    try { navigator.clipboard.writeText(x).then(done, done); } catch (e) { done(); }
  }
  function onClick(e) {
    var b = e.target.closest && e.target.closest('[data-vw]'); if (!b) return; var k = b.dataset.vw;
    if (k === 'close') return close(); if (k === 'go') return go(); if (k === 'lang') return translate(b.dataset.l);
    if (k === 'any') return translate((D.getElementById('vwAny') || {}).value); if (k === 'orig') { SHOW = R; return paint(''); }
    if (k === 'copy') return copy(b.dataset.k, b);
    if (k === 'save' && SHOW) { var txt = [SHOW.transcript ? t('said') + ':\n' + SHOW.transcript : '', SHOW.onscreen ? t('screen') + ':\n' + SHOW.onscreen : '', SHOW.caption ? t('cap') + ':\n' + SHOW.caption : '', R.link].filter(Boolean).join('\n\n');
      StudioAcc.addDraft(txt); S.toast(t('saved')); }
  }
  function open() { R = null; SHOW = null; busy = false; paint(''); page().classList.add('on'); D.body.style.overflow = 'hidden'; setTimeout(function () { var i = D.getElementById('vwLink'); try { if (i) i.focus(); } catch (e) { } }, 60); }
  function close() { var el = D.getElementById('vwords'); if (el) el.classList.remove('on'); D.body.style.overflow = ''; }
  W.StudioWords = {open: open, close: close, label: function () { return t('btn'); }, _T: T};
})(window, document);
