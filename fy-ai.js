/* fy-ai.js (25 Nov 2026, Emmanuel: "the TikTok videos and YouTube videos we post into our For You page is linked to our AI ... we don't
   transcribe the videos that are posted on the For You page. So you can add a button ... autofill or AI fill").
   A video post on For You (a TikTok or YouTube link) gets a ✨ Words button. The first tap anywhere has the app's AI (lowi-ai, action
   fyfill) write down the video's spoken words and its text on screen once, with a short summary of what you can learn or cook from it;
   it is kept on the post (posts.meta.ai), so every later tap, by anyone, shows it at once and costs nothing. The same summaries are
   what the companion reads when someone talks to it (lowi-ai "ask"). A failed try is tried again by itself twice; if it still fails,
   the sheet says why and offers Try again. */
(function (W, D) {
  'use strict';
  if (!W || !D || W.LowiFyAI) return;
  var L = function () { var l = 'en'; try { l = (W.LowiLang && W.LowiLang.get && W.LowiLang.get()) || localStorage.getItem('lowispike.lang') || D.documentElement.lang || 'en'; } catch (e) { } l = String(l).slice(0, 2); return l === 'de' || l === 'es' ? l : 'en'; };
  var T = {
    btn: ['Words', 'Worte', 'Palabras'], title: ['What this video says', 'Was dieses Video sagt', 'Lo que dice este vídeo'],
    work: ['Listening to the video…', 'Das Video wird angehört…', 'Escuchando el vídeo…'], sum: ['What you can take from it', 'Was du daraus mitnehmen kannst', 'Lo que puedes sacar'],
    scr: ['Text on screen', 'Text im Video', 'Texto en pantalla'], said: ['What is said', 'Was gesagt wird', 'Lo que se dice'],
    novid: ['The video itself could not be opened, so this is from its caption.', 'Das Video selbst ließ sich nicht öffnen, das hier stammt aus der Beschreibung.', 'No se pudo abrir el vídeo; esto viene de su descripción.'],
    misty: ['Your companion knows this video now too.', 'Dein Begleiter kennt dieses Video jetzt auch.', 'Tu compañero ya conoce este vídeo.'],
    again: ['Try again', 'Nochmal versuchen', 'Reintentar'], close: ['Close', 'Schließen', 'Cerrar'],
    limit: ['You used today\'s AI words. Back tomorrow!', 'Du hast die KI-Worte für heute aufgebraucht. Morgen wieder!', 'Ya usaste las palabras de IA de hoy. ¡Mañana más!'],
    signin: ['Sign in to use this.', 'Melde dich an, um das zu nutzen.', 'Inicia sesión para usarlo.'],
    fail: ['It did not work this time (the AI or the connection). Please try again.', 'Das hat diesmal nicht geklappt (KI oder Verbindung). Bitte versuch es nochmal.', 'No funcionó esta vez (la IA o la conexión). Inténtalo otra vez.'],
    notyet: ['This post is still on its way to the For You page. Try again in a moment.', 'Dieser Beitrag ist noch unterwegs. Versuch es gleich nochmal.', 'Esta publicación aún está en camino. Inténtalo en un momento.']
  };
  var t = function (k) { return T[k][['en', 'de', 'es'].indexOf(L())]; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]; }); };
  var SPARK = '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>';
  function btn(p) { if (!p || !p.url || !/(tiktok\.com|youtube\.com|youtu\.be)/i.test(p.url)) return ''; return '<button class="fy-act fy-ai" data-tr="aifill" data-id="' + esc(p.id) + '" aria-label="' + esc(t('title')) + '">' + SPARK + '<span>' + esc(t('btn')) + '</span></button>'; }
  function call(id, n) {
    n = n || 0;
    if (!W.LowiAsk || !W.LowiAsk.call) return Promise.reject({code: 'fail'});
    return W.LowiAsk.call({action: 'fyfill', id: id}).catch(function (e) {
      var c = e && e.code || 'fail'; if (n >= 2 || /^(limit|sign_in|not_found|bad_request)$/.test(c)) throw e;
      return new Promise(function (r) { setTimeout(r, n ? 4000 : 1500); }).then(function () { return call(id, n + 1); });
    });
  }
  var ov = null;
  function sheet(html) {
    if (!ov) { ov = D.createElement('div'); ov.id = 'fyAi'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); D.body.appendChild(ov);
      ov.addEventListener('click', function (e) { var b = e.target.closest('[data-fa]'); if (e.target === ov || (b && b.dataset.fa === 'x')) return shut(); if (b && b.dataset.fa === 'again') return run(ov.__id); }); }
    ov.innerHTML = '<div class="fa-card"><h3>' + esc(t('title')) + '</h3>' + html + '<button type="button" class="fa-x" data-fa="x">' + esc(t('close')) + '</button></div>'; ov.classList.add('on');
  }
  function shut() { if (ov) ov.classList.remove('on'); }
  function run(id) {
    ov && (ov.__id = id); sheet('<p class="fa-work"><i class="fa-spin" aria-hidden="true"></i>' + esc(t('work')) + '</p>'); ov.__id = id;
    call(id).then(function (j) {
      var a = j.ai || {};
      sheet((a.sum ? '<h4>' + esc(t('sum')) + '</h4><p>' + esc(a.sum) + '</p>' : '') + (a.onscreen ? '<h4>' + esc(t('scr')) + '</h4><p class="fa-pre">' + esc(a.onscreen) + '</p>' : '') +
        (a.transcript ? '<details><summary>' + esc(t('said')) + '</summary><p class="fa-pre">' + esc(a.transcript) + '</p></details>' : '') + (a.video === false ? '<p class="fa-note">' + esc(t('novid')) + '</p>' : '') +
        '<p class="fa-note">' + esc(t('misty')) + '</p>');
    }, function (e) {
      var c = e && e.code; sheet('<p>' + esc(t(c === 'limit' ? 'limit' : c === 'sign_in' ? 'signin' : c === 'not_found' ? 'notyet' : 'fail')) + '</p>' + (c === 'limit' || c === 'sign_in' ? '' : '<button type="button" class="fa-again" data-fa="again">' + esc(t('again')) + '</button>'));
    });
  }
  D.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-tr="aifill"]'); if (!b) return; e.preventDefault(); e.stopPropagation(); run(b.dataset.id); }, true);
  var st = D.createElement('style');
  st.textContent = '#fyAi{position:fixed;inset:0;z-index:2147482000;display:none;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.55)}#fyAi.on{display:flex}' +
    '#fyAi .fa-card{width:100%;max-width:560px;max-height:82vh;overflow:auto;margin:0;padding:20px 18px calc(env(safe-area-inset-bottom,0px) + 18px);border-radius:24px 24px 0 0;background:#10131a;color:#f2f5fb;font:16px/1.45 -apple-system,system-ui,sans-serif}' +
    '#fyAi h3{margin:0 0 10px;font-size:19px}#fyAi h4{margin:14px 0 4px;font-size:14px;opacity:.75}#fyAi p{margin:0 0 8px}#fyAi .fa-pre{white-space:pre-wrap}#fyAi .fa-note{font-size:13px;opacity:.65}' +
    '#fyAi details summary{margin:12px 0 4px;font-weight:700;cursor:pointer}#fyAi .fa-x,#fyAi .fa-again{display:block;width:100%;min-height:48px;margin-top:12px;border:0;border-radius:14px;font:inherit;font-weight:800;cursor:pointer}' +
    '#fyAi .fa-x{background:rgba(255,255,255,.1);color:inherit}#fyAi .fa-again{background:#bfe6ff;color:#06223a}#fyAi .fa-work{display:flex;align-items:center;gap:10px}' +
    '#fyAi .fa-spin{width:20px;height:20px;border-radius:50%;border:3px solid rgba(255,255,255,.2);border-top-color:#8fd3ff;animation:faSpin .8s linear infinite}@keyframes faSpin{to{transform:rotate(360deg)}}';
  (D.head || D.documentElement).appendChild(st);
  W.LowiFyAI = {btn: btn, run: run, _T: T};
})(typeof window !== 'undefined' ? window : null, typeof document !== 'undefined' ? document : null);
