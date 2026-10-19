'use strict';
/* Home first-timer hint (#whHint) vs the ring bubbles: sample from load, every 150 ms */
const L = require('./lib.cjs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
(async () => {
  const srv = arg('url', '') ? null : await L.serve(path.resolve(arg('root', '.')));
  const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`;
  const view = arg('view', 'chromium390');
  const h = await L.open({ url, view, settle: 300, lang: arg('lang', 'en') }); const P = h.page;
  const t0 = Date.now(); let covered = 0, last = null, worst = null, shown = 0;
  while (Date.now() - t0 < +arg('ms', 20000)) {
    const s = await P.evaluate(() => {
      const h = document.getElementById('whHint'); if (!h) return null; const cs = getComputedStyle(h); const q = h.getBoundingClientRect();
      const on = h.classList.contains('on') && cs.visibility !== 'hidden' && +cs.opacity > 0.25 && q.width > 4;
      const hits = []; if (on) document.querySelectorAll('[data-orbit], #whPad').forEach(e => { const r = e.getBoundingClientRect(); if (!r.width) return; const k = 0.15, a = { l: r.left + r.width * k, r: r.right - r.width * k, t: r.top + r.height * k, b: r.bottom - r.height * k }; const ov = Math.max(0, Math.min(a.r, q.right) - Math.max(a.l, q.left)) * Math.max(0, Math.min(a.b, q.bottom) - Math.max(a.t, q.top)); if (ov > 30) hits.push(e.getAttribute('data-orbit') || e.id); });
      return { on, cls: h.className, op: cs.opacity, vis: cs.visibility, rect: [q.left, q.top, q.right, q.bottom].map(Math.round), txt: h.textContent.slice(0, 40), hits: [...new Set(hits)] };
    });
    const t = Date.now() - t0;
    if (s && s.on) { shown++; if (arg("v","")) console.log("ON", (t/1000).toFixed(1), JSON.stringify(s)); }
    if (s && s.hits.length) { if (last != null) covered += t - last; last = t; if (!worst || s.hits.length > worst.hits.length) worst = Object.assign({ t }, s); if (arg('v', '')) console.log((t / 1000).toFixed(1), JSON.stringify(s)); } else last = null;
    await L.sleep(150);
  }
  console.log('SUMMARY', JSON.stringify({ view, shownSamples: shown, coveredMs: covered, worst, errs: h.log.pageerror }));
  await h.browser.close(); if (srv) srv.close();
})();
