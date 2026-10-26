/* Run 23: spam the spring blooms. Sound panel (fresh element each open) and Fasting (#sheet, reused): open/close 24x with
   gaps 0/30/80/150 ms, end open, then end closed. Checks: the last state wins and is visible / gone, no ghost panels pile up,
   html.sp-moving clears, no errors. node probe-bloom-spam.cjs [url] [engine] (WAIT multiplies the settle waits). */
'use strict';
const WT = require('fs').readFileSync('/home/sprite/BUGHUNT/.wt', 'utf8').trim();
const H = require(WT + '/tools/regress/harness.cjs');
const K = +process.env.WAIT || 1;
const URL_ = process.argv[2] || '', ENG = process.argv[3] || 'chromium';
(async () => {
  const R = await H.open(Object.assign({ probe: false, lang: 'en', url: URL_, engine: ENG }, ENG === 'webkit' ? { device: 'iPhone 13' } : { viewport: { width: 390, height: 844 } }));
  const p = R.page, errs = [], out = { gaps: {} };
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  try {
    await R.goto(); await H.sleep(3000);
    out.build = await p.evaluate(() => (document.querySelector('script[src^="spring.js"]') || {}).src);
    for (const gap of [0, 30, 80, 150]) {
      const r = await p.evaluate(async ([gap, K]) => {
        const w = ms => new Promise(r => setTimeout(r, ms));
        const A = window.LowiWorldAudio, F = window.LowiFastStop;
        const look = () => {
          const wa = [...document.querySelectorAll('.wa-panel')], live = wa.filter(x => !x.classList.contains('mb-ghost'));
          const s = document.getElementById('sheet'), sw = document.getElementById('sheetwrap');
          return { wa: wa.length, waLive: live.length, waOp: live[0] ? +getComputedStyle(live[0]).opacity : null, sheetOpen: sw.classList.contains('open'), sheetOp: +getComputedStyle(s).opacity, spMoving: document.documentElement.classList.contains('sp-moving') };
        };
        for (let i = 0; i < 24; i++) { if (A) (i % 2 ? A.close() : A.open()); if (F) (i % 2 ? closeSheet() : F.open()); if (gap) await w(gap); }
        if (A) A.open(); if (F) F.open();
        await w(1500 * K); const opened = look();
        if (A) A.close(); if (F) closeSheet();
        await w(1500 * K); const closed = look();
        return { opened, closed };
      }, [gap, K]);
      out.gaps[gap] = r;
    }
  } catch (e) { out.err = String(e && e.stack || e); }
  out.errs = errs;
  console.log(JSON.stringify(out));
  const bad = [];
  for (const [g, r] of Object.entries(out.gaps)) {
    if (r.opened.waLive !== 1 || !(r.opened.waOp > 0.9)) bad.push(g + ' sound not open/visible');
    if (!r.opened.sheetOpen || !(r.opened.sheetOp > 0.9)) bad.push(g + ' fasting not open/visible');
    if (r.closed.wa !== 0) bad.push(g + ' sound panels left: ' + r.closed.wa);
    if (r.closed.sheetOpen) bad.push(g + ' fasting still open');
    if (r.closed.spMoving) bad.push(g + ' sp-moving stuck');
  }
  if (errs.length) bad.push('errors');
  console.log(bad.length ? 'FAIL ' + bad.join('; ') : 'PASS');
  await R.close(); process.exit(bad.length ? 1 : 0);
})();
