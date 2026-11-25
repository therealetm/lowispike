/* bar-order.js (25 Nov 2026, Emmanuel: "I want to be able ... that menu bar, that you can move it, that I can pick what comes first ...
   I already had this somewhere where I can long press and then just move that menu bar to my liking ... do that to every menu bar, or
   secondary menu bar. Long press and then swipe around to pick ... so people can pick their own").
   The same gesture as Community's tabs (community-tab-order.js), for the other tab bars: hold a tab for HOLD_MS, the bar wiggles and
   the tab lifts, slide it left or right, let go. A plain tap still switches tabs; moving the finger before the hold ends (scrolling)
   cancels. The order is kept per bar in localStorage under lowispike.bar.<name> (lowispike.* keys are backed up to the account, so it
   follows you to other devices) and put back every time the bar is drawn again.
   Only bars listed in BARS take part: each was checked to find its tabs by name (a data attribute), never by position, and to draw
   no highlight that depends on the tab's place. Community (community-tab-order.js) and Cook (cook-tab-order.js) keep their own.
   Studio also opens on the first tab of your order (studio/index.html reads LowiBarOrder.first('studio')). */
(function (W, D) {
  'use strict';
  if (!W || !D || W.LowiBarOrder) return;
  var HOLD_MS = 450, SLOP = 10, PRE = 'lowispike.bar.';
  var KEYS = ['data-tab', 'data-k', 'data-t', 'data-mode', 'data-kind', 'data-wj-p', 'data-v'];
  var BARS = [
    {sel: '.tabs[role="tablist"]', name: 'studio', only: /\/studio\//},   /* Studio: Swipe file, Agent file, Profile */
    {sel: '.ap-seg', name: 'studio-profile', only: /\/studio\//},          /* Studio profile: Inspo, B-rolls */
    {sel: '.wh-ms-tabs', name: 'misty-sheet'},                             /* Misty's sheet: Today, History, Misty */
    {sel: '.mh-seg', name: 'misty-hub'},
    {sel: '.wj-tabs', name: 'weight'},
    {sel: '.mb-tabs', name: 'micro-book'},
    {sel: '.wd-tabs', name: 'wardrobe'},
    {sel: '.dr-seg', name: 'ritual'},
    {sel: '.sc-tabs', name: 'spike-catch'},
    {sel: '.stp-tabs', name: 'store-picks'}
  ];
  function load(name) { try { var v = JSON.parse(localStorage.getItem(PRE + name) || 'null'); return Array.isArray(v) ? v.map(String) : []; } catch (e) { return []; } }
  function save(name, list) { try { localStorage.setItem(PRE + name, JSON.stringify(list)); } catch (e) { } }
  function keyOf(el) { for (var i = 0; i < KEYS.length; i++) { var v = el.getAttribute(KEYS[i]); if (v != null && v !== '') return v; } return null; }
  function items(bar) { return Array.prototype.filter.call(bar.children, function (c) { return c.tagName === 'BUTTON' || c.getAttribute('role') === 'tab'; }); }
  /* the tabs of a bar with their names; null when any tab has no name or two share one (such a bar is left alone) */
  function named(bar) { var l = items(bar), seen = {}; for (var i = 0; i < l.length; i++) { var k = keyOf(l[i]); if (k == null || seen[k]) return null; seen[k] = 1; } return l.length > 1 ? l : null; }
  /* pure: the order to show, from the bar's own order and the saved one (saved names first in their order, new ones after, in place) */
  function order(own, saved) {
    var rank = {}; saved.forEach(function (k, i) { if (!(k in rank)) rank[k] = i; });
    return own.map(function (k, i) { return {k: k, r: k in rank ? rank[k] : saved.length + i}; }).sort(function (a, b) { return a.r - b.r; }).map(function (x) { return x.k; });
  }
  function apply(bar, cfg) {
    var l = named(bar); if (!l) return; var saved = load(cfg.name); if (!saved.length) return;
    var own = l.map(keyOf), want = order(own, saved);
    if (want.join('\u0001') === own.join('\u0001')) return;
    var by = {}; l.forEach(function (c) { by[keyOf(c)] = c; });
    var after = l[l.length - 1].nextSibling;
    want.forEach(function (k) { bar.insertBefore(by[k], after); });
  }
  function wire(bar, cfg) {
    if (bar.__bo) return; bar.__bo = 1;
    var hold = 0, drag = null, sx = 0, sy = 0, eat = false;
    bar.addEventListener('pointerdown', function (e) {
      var it = e.target.closest && e.target.closest('button,[role="tab"]'); if (!it || it.parentNode !== bar || !named(bar)) return;
      sx = e.clientX; sy = e.clientY; clearTimeout(hold);
      hold = setTimeout(function () {
        drag = it; bar.classList.add('bo-live'); it.classList.add('bo-lift');
        try { if (navigator.vibrate) navigator.vibrate(12); } catch (x) { }
        try { if (W.LowiHaptics && LowiHaptics.tap) LowiHaptics.tap(); } catch (x) { }
      }, HOLD_MS);
    });
    bar.addEventListener('pointermove', function (e) {
      if (!drag) { if (Math.abs(e.clientX - sx) > SLOP || Math.abs(e.clientY - sy) > SLOP) clearTimeout(hold); return; }
      e.preventDefault();
      var l = items(bar), x = e.clientX, y = e.clientY;
      for (var i = 0; i < l.length; i++) {
        var o = l[i]; if (o === drag) continue; var r = o.getBoundingClientRect();
        if (x >= r.left && x <= r.right && y >= r.top - 20 && y <= r.bottom + 20) {
          var before = x < r.left + r.width / 2; bar.insertBefore(drag, before ? o : o.nextSibling); break;
        }
      }
    });
    var end = function () {
      clearTimeout(hold); if (!drag) return;
      drag.classList.remove('bo-lift'); bar.classList.remove('bo-live'); drag = null; eat = true;
      var l = named(bar); if (l) save(cfg.name, l.map(keyOf));
      setTimeout(function () { eat = false; }, 400);
    };
    bar.addEventListener('pointerup', end); bar.addEventListener('pointercancel', end);
    /* while a tab is lifted the page does not scroll, and the tap that ends the move does not also switch tabs */
    bar.addEventListener('touchmove', function (e) { if (drag) e.preventDefault(); }, {passive: false});
    bar.addEventListener('click', function (e) { if (eat) { e.preventDefault(); e.stopPropagation(); eat = false; } }, true);
    bar.addEventListener('contextmenu', function (e) { if (drag || hold) e.preventDefault(); });
  }
  function scan() {
    for (var i = 0; i < BARS.length; i++) {
      var cfg = BARS[i]; if (cfg.only && !cfg.only.test(location.pathname)) continue;
      var els = D.querySelectorAll(cfg.sel);
      for (var j = 0; j < els.length; j++) { if (!named(els[j])) continue; apply(els[j], cfg); wire(els[j], cfg); }
    }
  }
  var q = false;
  function soon() { if (q) return; q = true; (W.requestAnimationFrame || setTimeout)(function () { q = false; scan(); }); }
  function start() { scan(); try { new MutationObserver(soon).observe(D.body, {childList: true, subtree: true}); } catch (e) { } }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start); else start();
  var st = D.createElement('style');
  st.textContent = '.bo-live{animation:boWig .3s ease-in-out infinite alternate}.bo-live>*{-webkit-touch-callout:none;-webkit-user-select:none;user-select:none}' +
    '.bo-lift{transform:scale(1.08);box-shadow:0 8px 22px rgba(0,0,0,.45);z-index:2;position:relative;transition:transform .15s}' +
    '@keyframes boWig{from{transform:rotate(-.6deg)}to{transform:rotate(.6deg)}}@media (prefers-reduced-motion:reduce){.bo-live{animation:none}}';
  (D.head || D.documentElement).appendChild(st);
  W.LowiBarOrder = {first: function (name) { return load(name)[0] || ''; }, order: order, BARS: BARS, KEYS: KEYS, _scan: scan};
})(typeof window !== 'undefined' ? window : null, typeof document !== 'undefined' ? document : null);
