'use strict';
/* Oct 24 2026 back and close sweep 17:40: a real touch swipe down on the empty space round a bloom's orbs closes it (Move, Sleep,
   Hold Scan = all), a short wobble does not, back still closes it. Chromium only (CDP touch input = the browser's own gesture path,
   so touch-action and pointercancel behave as on a phone).
   node tools/check-bloom-swipe.cjs [WxH] [url|.] */
const H = require('./sim/harness.cjs');
const dev = process.argv[2] || '390x844';
const target = process.argv[3] || 'https://therealetm.github.io/lowispike/index.html';
(async () => {
  const [w, h] = dev.split('x').map(Number);
  const o = { engine: 'chromium', probe: false, lang: 'en', viewport: { width: w, height: h } };
  if (/^https?:/.test(target)) o.url = target; else o.root = target;
  const R = await H.open(o); const P = R.page; const res = []; const errs = [];
  P.on('pageerror', e => errs.push(String(e.message).slice(0, 160)));
  await R.goto(); await H.sleep(9000);
  await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } const g = document.getElementById('r2gate'); if (g) g.remove(); });
  const cdp = await P.context().newCDPSession(P);
  const touch = async (x, y, x2, y2, steps) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let i = 1; i <= steps; i++) { await H.sleep(16); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + (x2 - x) * i / steps, y: y + (y2 - y) * i / steps }] }); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  const isOpen = () => P.evaluate(() => !!(window.LowiHomeBloomsV2 && LowiHomeBloomsV2.isOpen()) && !!document.querySelector('#hb2Bloom.on'));
  /* an empty spot of the scrim: the top third, away from orbs and Misty */
  const spot = () => P.evaluate(() => { for (let y = 90; y < innerHeight * .5; y += 20) for (let x = 30; x < innerWidth - 30; x += 40) { const t = document.elementFromPoint(x, y); if (t && t.classList.contains('hb2-scrim')) return { x, y }; } return null; });
  const opens = {
    'Move bloom': () => P.evaluate(() => LowiHomeBloomsV2.open('move')),
    'Sleep bloom': () => P.evaluate(() => LowiHomeBloomsV2.open('sleep')),
    'Hold Scan (all)': () => P.evaluate(() => LowiHomeBloomsV2.openAll())
  };
  for (const [name, open] of Object.entries(opens)) {
    const ok = await open(); await H.sleep(700);
    if (!ok || !(await isOpen())) { res.push([name + ' opens', false]); continue; }
    let s = await spot(); if (!s) { res.push([name + ': empty space found', false]); continue; }
    await touch(s.x, s.y, s.x + 4, s.y + 14, 3); await H.sleep(500);
    /* a 14 px wobble is a tap on the scrim for the browser only if it stays under the slop; either way it must not crash */
    const afterWobble = await isOpen();
    if (!afterWobble) { await open(); await H.sleep(700); s = await spot(); }
    await touch(s.x, s.y, s.x + 10, s.y + 220, 10); await H.sleep(700);
    res.push([name + ': swipe down closes it', !(await isOpen())]);
    await open(); await H.sleep(700); s = await spot();
    await touch(s.x, s.y, s.x + 220, s.y + 40, 10); await H.sleep(700);
    res.push([name + ': sideways swipe leaves it open', await isOpen()]);
    await P.evaluate(() => history.back()); await H.sleep(900);
    res.push([name + ': back still closes it', !(await isOpen())]);
    res.push([name + ': Home, nothing left over', await P.evaluate(() => (document.querySelector('.tab.active') || {}).id === 'tab-home' && !document.querySelector('#hb2Bloom') && !document.documentElement.classList.contains('hb2-open'))]);
  }
  res.push(['still in the app', !R.crashed && /lowispike|localhost|127\.0\.0\.1/.test(P.url())]);
  res.push(['no page errors', errs.length === 0, errs]);
  let all = true; for (const r of res) { if (!r[1]) all = false; console.log((r[1] ? 'PASS ' : 'FAIL ') + r[0] + (r[2] ? ' ' + JSON.stringify(r[2]).slice(0, 300) : '')); }
  console.log(all ? 'ALL PASS' : 'SOME FAILED');
  await R.close().catch(() => { }); process.exit(all ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
