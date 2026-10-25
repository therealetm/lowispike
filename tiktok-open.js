/* tiktok-open.js: TikTok posts in For You, Oct 25, 2026.
 * Emmanuel (voice): "every TikTok video inside my app, we see a thumbnail, the thumbnail or preview at least. And there is a play
 * button which opens TikTok ... It should open TikTok direct."
 * 1. Picture: TikTok's own picture links expire after a few days, so the server function tiktok-meta copies the cover into our
 *    storage and writes that stable link on the post (posts.meta.thumb, .vid). Posts that still lack it are filled in quietly,
 *    once per post per session, and the slide gets its picture in place. The picture is asked for at the size it is shown.
 * 2. Open: in the iOS Home Screen app a link opens in the in-app sheet, where universal links never reach the TikTok app (same
 *    problem as Deep Analyze, gpt-open.js). There the tap goes to TikTok's own scheme with the video id; when no app takes it
 *    within 2.5 s, the button says so and the next tap opens the TikTok page. Everywhere else the plain https link opens
 *    (Safari and Android hand it to the app themselves). Never an embed, never TikTok's player with its like/share sidebar.
 */
(function (root) {
  'use strict';
  var STORE = /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/media\/tiktok\/\d{8,25}\.(?:jpg|webp|png)$/;
  var HINT = {
    de: 'Keine TikTok-App? Nochmal tippen f\u00fcr den Browser',
    en: 'No TikTok app? Tap again to open it in the browser',
    es: '\u00bfSin la app de TikTok? Toca otra vez para el navegador'
  };
  function isTikTok(url) {
    try { var x = new URL(String(url || '')); return /^https?:$/.test(x.protocol) && /(^|\.)tiktok\.com$/i.test(x.hostname); } catch (e) { return false; }
  }
  /* the video id: what the server found (works for vm.tiktok.com short links too), else the one in the link itself */
  function vidOf(p) {
    var m = p && p.meta, v = m && m.vid != null ? String(m.vid) : '';
    if (/^\d{8,25}$/.test(v)) return v;
    var r = /\/(?:video|v|photo)\/(\d{8,25})/.exec(String((p && p.url) || ''));
    return r ? r[1] : '';
  }
  function stable(t) { return typeof t === 'string' && STORE.test(t); }
  /* our stored picture, cut to the size it is drawn at (cover, no stretching); anything else as it is */
  function sized(t, w, h) {
    if (!stable(t)) return t || '';
    return t.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/') + '?width=' + (w | 0) + '&height=' + (h | 0) + '&resize=cover&quality=72';
  }
  function appURL(vid) { return /^\d{8,25}$/.test(String(vid || '')) ? 'snssdk1233://aweme/detail/' + vid : ''; }
  function needsHeal(p) { return !!(p && p.cloud && isTikTok(p.url) && !stable(p.meta && p.meta.thumb)); }

  if (typeof module === 'object' && module.exports) {
    module.exports = { isTikTok: isTikTok, vidOf: vidOf, stable: stable, sized: sized, appURL: appURL, needsHeal: needsHeal, HINT: HINT };
    return;
  }
  var W = root, D = W.document;
  if (W.LowiTikTok) return;

  function ios() {
    var n = W.navigator || {}, u = n.userAgent || '';
    return /iPhone|iPad|iPod/.test(u) || (n.platform === 'MacIntel' && n.maxTouchPoints > 1);
  }
  function standalone() {
    try { return W.navigator.standalone === true || !!(W.matchMedia && W.matchMedia('(display-mode: standalone)').matches); } catch (e) { return false; }
  }
  function lang() {
    var l = '';
    try { l = (W.LowiLang && W.LowiLang.get && W.LowiLang.get()) || (D.documentElement && D.documentElement.lang) || 'en'; } catch (e) { l = 'en'; }
    l = String(l).slice(0, 2);
    return HINT[l] ? l : 'en';
  }
  function fnURL() {
    var c = W.LOWI_CFG || {};
    return c.url ? String(c.url).replace(/\/$/, '') + '/functions/v1/tiktok-meta' : '';
  }

  /* ---------- open in the TikTok app ---------- */
  var pending = null, left = false, webUntil = 0, hinted = null, oldText = '', restoreT = 0;
  function restore() {
    if (hinted) { try { if (oldText === null) hinted.remove(); else hinted.textContent = oldText; } catch (e) {} }
    hinted = null; webUntil = 0;
  }
  function gone() { if (pending) left = true; }
  function stayed() {
    var b = pending; pending = null;
    if (!b || left || D.visibilityState === 'hidden') return;
    webUntil = Date.now() + 30000;
    var slide = b.closest && b.closest('.fy-slide'), s = slide && slide.querySelector('.fy-out small'), made = false;
    if (!s && slide && slide.querySelector('.fy-out-t')) { s = D.createElement('small'); s.className = 'fy-tt-hint'; slide.querySelector('.fy-out-t').appendChild(s); made = true; }
    if (s) { restore(); webUntil = Date.now() + 30000; hinted = s; oldText = made ? null : s.textContent; s.textContent = HINT[lang()]; }
    else if (typeof W.toast === 'function') { try { W.toast(HINT[lang()], 3200); } catch (e) {} }
    try { W.clearTimeout(restoreT); restoreT = W.setTimeout(restore, 30000); } catch (e) {}
  }
  /* true when the tap went to the TikTok app; false: open the https link as usual */
  function open(p, btn) {
    var app = appURL(vidOf(p));
    if (!app || !ios() || !standalone()) return false;
    if (webUntil && Date.now() < webUntil) { restore(); return false; }
    pending = btn || null; left = false;
    api._go(app);
    try { W.setTimeout(stayed, 2500); } catch (e) {}
    return true;
  }
  D.addEventListener('visibilitychange', function () { if (D.visibilityState === 'hidden') gone(); });
  D.addEventListener('pagehide', gone);

  /* ---------- pictures ---------- */
  async function call(body) {
    var u = fnURL(); if (!u || W.navigator.onLine === false) return null;
    var c = W.AbortController ? new AbortController() : null, t = c ? W.setTimeout(function () { c.abort(); }, 12000) : 0;
    try {
      var r = await fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'omit', signal: c ? c.signal : undefined });
      var j = await r.json().catch(function () { return null; });
      return j && j.meta ? j : null;
    } catch (e) { return null; } finally { if (t) W.clearTimeout(t); }
  }
  /* composer: the link's title, creator and stable picture before the post exists */
  async function meta(url) {
    if (!isTikTok(url)) return null;
    var j = await call({ url: String(url) });
    return j && j.meta ? j.meta : null;
  }
  function merge(p, m) {
    if (!p || !m) return;
    var o = p.meta && typeof p.meta === 'object' ? p.meta : (p.meta = {});
    ['thumb', 'vid'].forEach(function (k) { if (m[k]) o[k] = m[k]; });
    ['title', 'author', 'handle'].forEach(function (k) { if (!o[k] && m[k]) o[k] = m[k]; });
  }
  /* the slide (and My posts row) of that post gets its picture without a re-render */
  function paint(id, thumb) {
    var sel = '.fy-slide[data-id="' + String(id).replace(/["\\]/g, '') + '"] .fy-art-ext';
    Array.prototype.forEach.call(D.querySelectorAll(sel), function (box) {
      if (box.querySelector('img')) return;
      var img = D.createElement('img');
      img.alt = ''; img.decoding = 'async'; img.setAttribute('loading', 'lazy'); img.referrerPolicy = 'no-referrer';
      img.onerror = function () { if (img.src !== thumb) img.src = thumb; else img.remove(); };
      img.src = sized(thumb, 720, 1280);
      box.appendChild(img);
    });
  }
  var tried = {}, busy = 0, queue = [];
  try { tried = JSON.parse(W.sessionStorage.getItem('lowi.tt.tried') || '{}') || {}; } catch (e) { tried = {}; }
  function mark(id) { tried[id] = 1; try { W.sessionStorage.setItem('lowi.tt.tried', JSON.stringify(tried)); } catch (e) {} }
  function pump(onMeta) {
    while (busy < 2 && queue.length) {
      var id = queue.shift(); busy++;
      call({ id: id }).then(function (id) { return function (j) {
        busy--;
        if (j && j.meta && stable(j.meta.thumb)) { try { onMeta && onMeta(id, j.meta); } catch (e) {} paint(id, j.meta.thumb); }
        pump(onMeta);
      }; }(id));
    }
  }
  /* posts in the shared table without their stable picture: ask the server once per post per session (at most 12 a run) */
  function heal(posts, onMeta) {
    var n = 0;
    (posts || []).forEach(function (p) {
      if (n >= 12 || !needsHeal(p) || tried[p.id]) return;
      mark(p.id); queue.push(p.id); n++;
    });
    pump(onMeta);
  }
  var api = W.LowiTikTok = { _go: function (u) { W.location.href = u; }, isTikTok: isTikTok, vidOf: vidOf, stable: stable, sized: sized, appURL: appURL, needsHeal: needsHeal,
    open: open, meta: meta, merge: merge, heal: heal, paint: paint, _stayed: stayed, HINT: HINT };
})(typeof window !== 'undefined' ? window : this);
