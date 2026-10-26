/* Run 23 (25 Oct 2026): Reduce Motion switched on mid-session after a panel bloomed on its spring.
   Fasting panel (#sheet, reused element): open on the spring, close on the spring, then Reduce Motion on, open again.
   Also: Reduce Motion on -> open -> Reduce Motion off -> close -> open (other direction).
   node probe-rm-bloom.cjs [url] [engine]   (engine chromium|webkit). Prints JSON, exit 1 if the panel opens invisible. */
'use strict';
const WT = require('fs').readFileSync('/home/sprite/BUGHUNT/.wt', 'utf8').trim();
const H = require(WT + '/tools/regress/harness.cjs');
const K = +process.env.WAIT || 1, sleep = ms => H.sleep(ms * K);
const URL_ = process.argv[2] || '';
const ENG = process.argv[3] || 'chromium';
(async () => {
  const R = await H.open(Object.assign({ probe: false, lang: 'en', url: URL_, engine: ENG }, ENG === 'webkit' ? { device: 'iPhone 13' } : { viewport: { width: 390, height: 844 } }));
  const p = R.page, errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const look = () => p.evaluate(() => {
    const s = document.getElementById('sheet'), w = document.getElementById('sheetwrap');
    if (!s) return { err: 'no #sheet' };
    const cs = getComputedStyle(s), r = s.getBoundingClientRect();
    return { open: w.classList.contains('open'), cls: s.className, inline: s.getAttribute('style') || '', opacity: +cs.opacity, scale: cs.scale, h: Math.round(r.height), fst: !!s.querySelector('.fst-sh'), rm: matchMedia('(prefers-reduced-motion: reduce)').matches };
  });
  const out = {};
  try {
    await R.goto();
    await sleep(3000);
    out.build = await p.evaluate(() => (document.querySelector('script[src^="spring.js"]') || {}).src || 'no spring.js');
    await p.evaluate(() => LowiFastStop.open()); await sleep(900); out.a_open = await look();
    await p.evaluate(() => closeSheet()); await sleep(1000); out.a_closed = await look();
    await p.emulateMedia({ reducedMotion: 'reduce' }); await sleep(200);
    await p.evaluate(() => LowiFastStop.open()); await sleep(900); out.b_open_rm = await look();
    await p.evaluate(() => closeSheet()); await sleep(600); out.b_closed_rm = await look();
    /* other direction: open with RM, RM off, close, open */
    await p.evaluate(() => LowiFastStop.open()); await sleep(600);
    await p.emulateMedia({ reducedMotion: 'no-preference' }); await sleep(200);
    await p.evaluate(() => closeSheet()); await sleep(1000);
    await p.evaluate(() => LowiFastStop.open()); await sleep(900); out.c_open = await look();
    await p.evaluate(() => closeSheet()); await sleep(1000);
    /* d: opened on the spring and still growing, Reduce Motion on, close: nothing may stay on screen or keep moving */
    await p.evaluate(() => LowiFastStop.open()); await sleep(60);
    await p.emulateMedia({ reducedMotion: 'reduce' });
    await p.evaluate(() => closeSheet()); await sleep(1200); out.d_closed = await look();
    out.d_hit = await p.evaluate(() => { const e = document.elementFromPoint(innerWidth / 2, innerHeight / 2); return e ? (e.id || e.className || e.tagName) + ' in#sheet=' + !!(e.closest && e.closest('#sheet')) : null; });
    await p.evaluate(() => LowiFastStop.open()); await sleep(900); out.d_open_rm = await look();
    await p.evaluate(() => closeSheet()); await sleep(600);
  } catch (e) { out.err = String(e && e.stack || e); }
  out.errs = errs;
  console.log(JSON.stringify(out, null, 1));
  const bad = ['a_open', 'b_open_rm', 'c_open', 'd_open_rm'].filter(k => out[k] && !(out[k].opacity > 0.9));
  console.log(bad.length ? 'FAIL invisible: ' + bad.join(',') : 'PASS');
  await R.close();
  process.exit(bad.length ? 1 : 0);
})();
