'use strict';
/* Oct 24 2026: swipe down on the People sheet header (Community menu > People) closes it on a phone; a short drag springs back; X and back still close it; on iPad (centred card) no drag.
   node tools/check-people-swipe.cjs [chromium|webkit] [WxH | device] [url] */
const H = require('./sim/harness.cjs');
const engine = process.argv[2] || 'chromium', dev = process.argv[3] || '390x844';
const url = process.argv[4] || 'https://therealetm.github.io/lowispike/index.html';
(async () => {
  const o = { engine, probe: false, lang: 'de' }; if (/^https?:/.test(url)) o.url = url; else o.root = url;
  if (engine === 'webkit') o.device = dev; else { const [w, h] = dev.split('x').map(Number); o.viewport = { width: w, height: h }; }
  const R = await H.open(o); const P = R.page; const res = [];
  await R.goto(); await H.sleep(9000);
  await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } const g = document.getElementById('r2gate'); if (g) g.remove(); });
  const open = async () => { await P.evaluate(() => LowiPeopleDir.open()); await H.sleep(900); };
  const isOpen = () => P.evaluate(() => !!document.querySelector('.pd-ov') && LowiPeopleDir.isOpen());
  const drag = (dy, steps, ms) => P.evaluate(async ([dy, steps, ms]) => {
    const t = document.querySelector('.pd-head h2, .pd-head'); const r = t.getBoundingClientRect(); const x = r.left + Math.min(40, r.width / 2), y = r.top + r.height / 2;
    const pe = (type, yy) => t.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: yy, buttons: type === 'pointerup' ? 0 : 1 }));
    pe('pointerdown', y); for (let i = 1; i <= steps; i++) { if (ms) await new Promise(r => setTimeout(r, ms)); pe('pointermove', y + dy * i / steps); }
    const mid = getComputedStyle(document.querySelector('.pd-card')).transform; pe('pointerup', y + dy); return mid;
  }, [dy, steps, ms]);
  await open(); let mid = await drag(40, 8, 30); await H.sleep(600);
  res.push(['short slow drag springs back', await isOpen() && /matrix|none/.test(mid), mid]);
  res.push(['card back in place', await P.evaluate(() => { const c = document.querySelector('.pd-card'); return c && (c.style.transform === '' ); })]);
  mid = await drag(260, 12, 16); await H.sleep(700);
  const wide = await P.evaluate(() => innerWidth >= 700);
  if (wide) { res.push(['iPad: a drag does not close the centred card', await isOpen(), mid]); await P.evaluate(() => LowiPeopleDir.close()); await H.sleep(500); }
  else {
  res.push(['long drag closes it', !(await isOpen()), mid]);
  await open(); await drag(60, 4, 0); await H.sleep(900); /* a flick: moves back to back, so a busy test machine cannot slow it */
  res.push(['quick flick closes it', !(await isOpen())]);
  }
  await open();
  const x = await P.evaluate(() => { const b = document.querySelector('.pd-x'); const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  if (engine === 'webkit') await P.mouse.click(x.x, x.y); else await P.touchscreen.tap(x.x, x.y); await H.sleep(700);
  res.push(['X still closes it', !(await isOpen())]);
  await open(); await P.evaluate(() => history.back()); await H.sleep(1800);
  res.push(['back still closes it', !(await isOpen())]);
  const hs = await P.evaluate(() => ({ tab: (document.querySelector('#main > .tab.active') || document.querySelector('.tab.active') || {}).id, gv: document.querySelectorAll('.pd-ov').length, url: location.href }));
  const home = hs.tab === 'tab-home' && !hs.gv && /lowispike|127\.0\.0\.1/.test(hs.url);
  res.push(['Home, no leftover overlay', home, hs]);
  res.push(['no page errors', !R.errs.length, R.errs.map(e => e.m).slice(0, 3)]);
  for (const r of res) console.log(r[1] ? 'PASS' : 'FAIL', r[0], r[2] !== undefined ? JSON.stringify(r[2]) : '');
  console.log(res.every(r => r[1]) ? 'ALL PASS' : 'SOME FAIL');
  await R.close(); process.exit(0);
})().catch(e => { console.log('FATAL', e.stack); process.exit(1); });
