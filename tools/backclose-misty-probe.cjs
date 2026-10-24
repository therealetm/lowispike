'use strict';
/* Back and close sweep 12:40: hold Misty, back once, watch what is left on screen for a few seconds. */
const H = require('./sim/harness.cjs');
const target = process.argv[2] || 'https://therealetm.github.io/lowispike/index.html';
(async () => {
  const o = { engine: 'chromium', members: 12, messages: 30, probe: false, lang: 'en', viewport: { width: 390, height: 844 } };
  if (/^https?:/.test(target)) o.url = target; else o.root = target;
  const R = await H.open(o); const P = R.page; const sleep = H.sleep;
  await R.goto(); await sleep(9000);
  await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } const g = document.getElementById('r2gate'); if (g) g.remove(); });
  await P.touchscreen.tap(8, 420); await sleep(800);
  const S = () => P.evaluate(() => {
    const o = [...document.querySelectorAll('.r2-ov')].map(o => { const s = o.querySelector('.r2-sh'); const cs = getComputedStyle(o); return { on: o.classList.contains('on'), cls: String(o.className).slice(0, 50), op: cs.opacity, pe: cs.pointerEvents, tr: s ? getComputedStyle(s).transform.slice(0, 40) : '' }; });
    const b = document.querySelector('#spBubble').getBoundingClientRect(); const t = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    return { st: JSON.stringify(history.state), o, hit: t && (t.id || String(t.className).slice(0, 30)) };
  });
  for (let round = 0; round < 2; round++) {
    const b = await P.evaluate(() => { const e = document.querySelector('#spBubble'); const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    await P.touchscreen.tap(8, 420); await sleep(300);
    await P.evaluate(async ([x, y]) => { const t = document.elementFromPoint(x, y); const pe = ty => t.dispatchEvent(new PointerEvent(ty, { bubbles: true, cancelable: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, buttons: ty === 'pointerup' ? 0 : 1 })); pe('pointerdown'); await new Promise(r => setTimeout(r, 900)); pe('pointerup'); }, b);
    await sleep(1800); console.log(round, 'open', JSON.stringify(await S()));
    await P.evaluate(() => history.back());
    for (let i = 0; i < 4; i++) { await sleep(1500); console.log(round, 'after back', i, JSON.stringify(await S().catch(() => 'dead'))); }
  }
  await R.close();
})().catch(e => { console.error('BROKEN', e.stack); process.exit(2); });
