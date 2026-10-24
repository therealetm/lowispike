'use strict';
/* Browser check for hold Scan (Oct 24 2026, bloom-ring.js): like a user on Home
   - a quick tap on Scan opens Scan (lowiOpen('scan')) and opens no bubbles
   - holding Scan (~0.9 s, finger still) opens every bubble (LowiHomeBloomsV2.isAll()) and does NOT open Scan, also after the finger lifts
   - a tap on the empty space closes the circle again; holding again closes it too
   - with engine chromium the hold is a real CDP touch (touchstart ... touchend, so the browser's own click after touchend is tested)
   SIMULATED browser, not a physical device.
   node tools/check-scan-hold.cjs [root|url] [webkit|chromium] [WxH] [outdir] */
const H = require('./sim/harness.cjs'), fs = require('fs'), path = require('path');
(async () => {
  const where = process.argv[2] || path.join(__dirname, '..'), engine = process.argv[3] || 'webkit';
  const size = (process.argv[4] || '390x844').split('x').map(Number), out = process.argv[5] || '/tmp/check-scan-hold';
  fs.mkdirSync(out, { recursive: true });
  const o = { engine, device: 'iPhone 13', members: 5, messages: 5, probe: false }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page, tag = engine + '-' + size.join('x');
  await P.setViewportSize({ width: size[0], height: size[1] });
  if (engine === 'webkit') await R.ctx.addInitScript({ path: path.join(__dirname, 'sim', 'no-media-init.js') });  /* sim workaround, see the file */
  R.step = 'load'; await R.goto(); await H.sleep(7000);
  const res = { engine, size: size.join('x'), build: await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || null), cases: [] };
  const home = async () => { await P.evaluate(() => { try { LowiHomeBloomsV2.close(); } catch (e) { } try { goTab('home'); } catch (e) { } }); await H.sleep(1800); };
  /* count lowiOpen calls; 'pass' lets the real Scan open (only for the tap case) */
  const spy = (pass) => P.evaluate(p => { window.__so = []; if (!window.__lo0) window.__lo0 = window.lowiOpen; window.lowiOpen = function (t) { window.__so.push(t); if (p && window.__lo0) return window.__lo0.apply(this, arguments); }; }, pass);
  const st = () => P.evaluate(() => ({ opened: window.__so || [], all: !!(window.LowiHomeBloomsV2 && LowiHomeBloomsV2.isAll && LowiHomeBloomsV2.isAll()), open: (window.LowiHomeBloomsV2 && LowiHomeBloomsV2.isOpen()) || null,
    orbs: document.querySelectorAll('#hb2Bloom .hb2-orb').length, home: document.documentElement.classList.contains('wh-home') && !document.documentElement.classList.contains('wh-away'), zoom: document.documentElement.classList.contains('br-zoom') }));
  const box = async () => P.evaluate(() => { const e = document.querySelector('#whHud [data-orbit="scan"]'); if (!e) return null; const r = e.getBoundingClientRect(); return r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width } : null; });
  let cdp = null; if (engine === 'chromium') cdp = await R.ctx.newCDPSession(P);
  const hold = async (ms) => {
    const b = await box(); if (!b) throw new Error('no Scan button');
    if (cdp) {
      const pt = [{ x: b.x, y: b.y, id: 1, radiusX: 8, radiusY: 8, force: 1 }];
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt }); await H.sleep(ms);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } else { await P.mouse.move(b.x, b.y); await P.mouse.down(); await H.sleep(ms); await P.mouse.up(); }
  };
  const tap = async () => { const b = await box(); if (!b) throw new Error('no Scan button'); await P.touchscreen.tap(b.x, b.y); };
  const judge = async (name, ok, s, extra) => { res.cases.push(Object.assign({ name, ok, s }, extra || {})); await R.shot(path.join(out, tag + '-' + name.replace(/\W+/g, '_') + '.png')); console.log('CASE', name, ok ? 'OK' : 'BAD', JSON.stringify(s)); };

  await home();
  /* 1. hold opens every bubble and not Scan */
  await spy(false); await hold(900); await H.sleep(1400);
  let s = await st();
  await judge('hold opens every bubble, not Scan', s.all && s.orbs > 4 && !s.opened.length && s.home, s);
  /* 2. tap the empty space closes it */
  await P.touchscreen.tap(Math.round(size[0] / 2), 70); await H.sleep(1300);
  s = await st();
  await judge('tap the empty space closes it', !s.all && !s.open, s);
  await home();
  /* 3. hold, then hold again: open, then closed; Scan never opens */
  await spy(false); await hold(900); await H.sleep(1200); const s1 = await st(); await hold(900); await H.sleep(1300); s = await st();
  await judge('hold again closes it', s1.all && !s.all && !s.opened.length, s, { first: s1 });
  await home();
  /* 4. a quick tap opens Scan (the real one) and no bubbles */
  await spy(engine !== 'webkit'); await tap(); await H.sleep(1500);  /* WebKit sim: the camera page crashes headless WebKit here, so it only records the open('scan') call */
  s = await st();
  await judge('quick tap opens Scan, no bubbles', s.opened.length === 1 && s.opened[0] === 'scan' && !s.all, s);
  res.ok = res.cases.every(c => c.ok);
  res.errs = R.errs.slice(0, 8);
  fs.writeFileSync(path.join(out, tag + '.json'), JSON.stringify(res, null, 1));
  console.log('RESULT', res.ok ? 'PASS' : 'FAIL', tag, 'build', res.build, 'errors', R.errs.length);
  await R.close(); process.exit(res.ok ? 0 : 1);
})().catch(e => { console.error('CHECK CRASHED', e); process.exit(2); });
