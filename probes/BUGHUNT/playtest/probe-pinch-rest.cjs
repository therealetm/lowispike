/* Run 25: a pinch with one finger RESTING still on a Home bubble (thumb parked, the other finger does the pinch). The resting finger's
   bubble must not fire its long press (Scan -> all secondary bubbles, Move page, meal log, water reset, Community hub, Misty card).
   For each bubble: finger A stays on the bubble centre, finger B starts 170 px away and slides in (or out) for ~1.2 s, then both lift.
   node probe-pinch-rest.cjs [url] [stepMs]   ONLY=scan,move env to limit. */
'use strict';
const L = require('./lib.cjs');
(async () => {
  const url = process.argv[2] || 'https://therealetm.github.io/lowispike/', MS = +(process.argv[3] || 50);
  const h = await L.open({ view: 'chromium390', url, settle: 8000 }); const { page } = h; const cdp = await h.ctx.newCDPSession(page);
  const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p[0], y: p[1], id: i, radiusX: 4, radiusY: 4, force: 1 })) });
  await page.evaluate(() => { window.__gt = []; const g = window.goTab; window.goTab = function (t) { window.__gt.push(String(t)); return g.apply(this, arguments); };
    window.__mo = 0; addEventListener('lowi:misty-open', () => window.__mo++); });
  const state = () => page.evaluate(() => {
    const vis = s => [...document.querySelectorAll(s)].filter(e => e.getBoundingClientRect().width > 0 && !e.closest('.off,[hidden]')).length;
    const w = document.querySelector('[data-orbit="water"]'); const B = window.LowiHomeBloomsV2;
    return { tab: [...document.querySelectorAll('[id^="tab-"].active')].map(e => e.id).join(','), gt: window.__gt.splice(0), mo: window.__mo,
      sheets: vis('.r2-ov.on:not(.off)') + vis('#hb2Bloom.on') + vis('.ss2-page') + vis('.rw-page') + vis('#cmeSheet.on, #cmeSheet:not([hidden])') + vis('#lhCard.on, .lh-card.on'),
      all: !!(B && B.isAll && B.isAll()), top: (() => { const t = [...document.querySelectorAll('.r2-ov.on:not(.off), #hb2Bloom.on, .ss2-page, .rw-page, #cmeSheet, #lhCard.on')].filter(e => e.getBoundingClientRect().width > 0 && !e.closest('.off,[hidden]')).pop(); return t ? (t.id + '.' + String(t.className).slice(0, 40) + '|' + t.textContent.trim().replace(/\s+/g, ' ').slice(0, 70)) : null; })(), water: w ? w.textContent.replace(/\s+/g, ' ').trim().slice(0, 30) : null };
  });
  const home = async () => { for (let i = 0; i < 3; i++) { await page.keyboard.press('Escape'); await L.sleep(200); } await page.evaluate(() => { try { LowiHomeBloomsV2.close(); } catch (e) {} try { LowiR2.closeAll(); } catch (e) {} window.goTab('home'); }); await L.sleep(1600); };
  const targets = await page.evaluate(() => { const o = {}; document.querySelectorAll('[data-orbit], #spBubble').forEach(e => { const r = e.getBoundingClientRect(); if (r.width > 20) o[e.dataset.orbit || e.id] = [r.left + r.width / 2, r.top + r.height / 2]; }); return o; });
  console.log('targets', JSON.stringify(targets));
  const res = [];
  for (const [k, [x, y]] of Object.entries(targets).filter(([k]) => !process.env.ONLY || process.env.ONLY.split(',').includes(k))) for (const dir of ['in', 'out']) {
    await home();
    const before = await state();
    const sgn = x < 195 ? 1 : -1, bx = x + sgn * 170, by = y + 40;
    await T('touchStart', [[x, y], [bx, by]]);
    for (let i = 1; i <= 24; i++) { const d = (dir === 'in' ? 1 : -1) * i * 3; await T('touchMove', [[x, y], [bx - sgn * d, by]]); await L.sleep(MS); }
    await T('touchEnd', []); await L.sleep(1300);
    const after = await state();
    const bad = after.gt.length || after.sheets > before.sheets || after.tab !== before.tab || after.water !== before.water || after.all !== before.all || after.mo !== before.mo;
    res.push({ k, dir, bad: !!bad, before, after });
  }
  res.forEach(r => console.log(r.bad ? 'BAD ' : 'ok  ', r.k, r.dir, JSON.stringify(r.after).slice(0, 260), 'before', JSON.stringify(r.before).slice(0, 160)));
  const lg = await L.collect ? null : null;
  console.log('pageerrors', JSON.stringify(h.log ? h.log.pageerror.slice(0, 5) : []));
  await h.browser.close();
})().catch(e => { console.error(String(e).slice(0, 300)); process.exit(2); });
