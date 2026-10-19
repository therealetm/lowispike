'use strict';
/* Language switch mid-session (EN -> DE -> ES -> EN, repeated) on Home: JS errors, ring labels that overflow their bubble or stay
   in the old language, the Settings panel and every bloom opened in each language. */
const L = require('./lib.cjs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
(async () => {
  const srv = arg('url', '') ? null : await L.serve(path.resolve(arg('root', '.')));
  const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`;
  const view = arg('view', 'chromium390');
  const h = await L.open({ url, view, settle: 8000, lang: 'en' }); const P = h.page;
  const issues = [], log = [];
  const survey = (lang) => P.evaluate(lang => {
    const out = { lang, htmlLang: document.documentElement.lang, labels: [], over: [], stale: [] };
    document.querySelectorAll('[data-orbit]').forEach(e => {
      const r = e.getBoundingClientRect(); if (r.width < 4) return;
      const key = e.getAttribute('data-orbit');
      const lab = e.getAttribute('aria-label') || e.textContent.trim();
      out.labels.push(key + '=' + lab.slice(0, 30));
      /* any visible text child wider than the viewport edge or spilling far past the bubble */
      e.querySelectorAll('b, span, small, i, em, .hb-l, [class*=lab]').forEach(t => { const q = t.getBoundingClientRect(); if (!q.width || !t.textContent.trim()) return; if (q.left < -1 || q.right > innerWidth + 1) out.over.push(key + ':offscreen:' + t.textContent.trim().slice(0, 20)); else if (q.width > r.width * 1.9) out.over.push(key + ':wide ' + Math.round(q.width) + '/' + Math.round(r.width) + ':' + t.textContent.trim().slice(0, 20)); });
    });
    return out;
  }, lang);
  let base = null;
  for (let round = 0; round < +arg('rounds', 2); round++) for (const lang of ['de', 'es', 'en']) {
    await P.evaluate(l => window.LowiLang.set(l), lang); await L.sleep(1500);
    const s = await survey(lang); log.push(s);
    if (lang === 'en' && !base) base = s.labels.join('|');
    if (s.htmlLang.slice(0, 2) !== lang) issues.push('html lang ' + s.htmlLang + ' after set ' + lang);
    if (s.over.length) issues.push(lang + ' overflow ' + s.over.join(','));
    if (lang !== 'en' && base && s.labels.join('|') === base) issues.push(lang + ': ring labels identical to English');
    /* open each bloom in this language and close it */
    for (const k of ['fuel', 'water', 'move', 'gap', 'sleep', 'settings']) {
      const ok = await P.evaluate(k => { const e = document.querySelector(`[data-orbit="${k}"]`); if (!e) return 'none'; e.click(); return 'clicked'; }, k);
      await L.sleep(900);
      const st = await P.evaluate(() => { const o = []; document.querySelectorAll('#hb2Bloom .hb2-orb b, #hb2Bloom .hb2-note, .hs2-panel button, .hs2-panel h2, .hs2-panel h3').forEach(t => { const q = t.getBoundingClientRect(); if (q.width && (q.left < -1 || q.right > innerWidth + 1)) o.push('off:' + t.textContent.trim().slice(0, 24)); }); return o; });
      if (st.length) issues.push(lang + ' ' + k + ' text off screen: ' + st.join(','));
      await P.keyboard.press('Escape'); await L.sleep(500);
      await P.evaluate(() => { try { window.LowiHomeBloomsV2 && LowiHomeBloomsV2.isOpen && LowiHomeBloomsV2.isOpen() && LowiHomeBloomsV2.close && LowiHomeBloomsV2.close(); } catch (e) { } });
      const left = await P.evaluate(() => document.documentElement.className.split(' ').filter(c => /hb2-open|hs2-open|sg-open|settings-open/.test(c)).join(' '));
      if (left) { issues.push(lang + ' ' + k + ' still open after Escape: ' + left); await P.evaluate(() => document.querySelectorAll('[data-hb2=close], .hs2-x, [data-act=close]').forEach(b => b.click())); await L.sleep(400); }
    }
  }
  const bh = await L.snap(h);
  console.log('SUMMARY', JSON.stringify({ view, verdict: issues.length || bh.err.length || bh.rej.length || h.log.pageerror.length ? 'FAIL' : 'PASS', issues, bh, errs: h.log.pageerror, console: h.log.console.slice(0, 5), labels: log.slice(0, 3).map(s => s.lang + ': ' + s.labels.join(' | ')) }, null, 1));
  await h.browser.close(); if (srv) srv.close();
})();
