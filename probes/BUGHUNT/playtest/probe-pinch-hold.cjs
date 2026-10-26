/* Run 24: a pinch that starts with one finger on a Home bubble. A slow two-finger pinch must never fire that bubble's long press
   (Move page, meal log, water reset, Misty's card...). For each bubble: finger A on the bubble centre, finger B 160 px away, both move
   towards each other slowly (pinch in) or apart (pinch out), then lift. Records tab/hash change, sheets/pages opened, water count.
   node probe-pinch-hold.cjs [url] [stepMs] */
'use strict';
const L = require('./lib.cjs');
(async () => {
  const url = process.argv[2] || 'https://therealetm.github.io/lowispike/', MS = +(process.argv[3] || 40);
  const h = await L.open({ view: 'chromium390', url, settle: 8000 }); const { page } = h; const cdp = await h.ctx.newCDPSession(page);
  const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p[0], y: p[1], id: i, radiusX: 4, radiusY: 4, force: 1 })) });
  await page.evaluate(() => { window.__gt = []; const g = window.goTab; window.goTab = function (t) { window.__gt.push(String(t)); return g.apply(this, arguments); }; });
  const state = () => page.evaluate(() => {
    const vis = s => [...document.querySelectorAll(s)].filter(e => e.getBoundingClientRect().width > 0 && !e.closest('.off,[hidden]')).length;
    const w = document.querySelector('.wh-water b, [data-orbit="water"] b'); let fast = {}; try { fast = JSON.parse(localStorage.getItem('lowi_fast_v1') || '{}'); } catch (e) {}
    return { tab: [...document.querySelectorAll('[id^="tab-"].active')].map(e => e.id).join(','), gt: window.__gt.splice(0), sheets: vis('.r2-ov.on:not(.off)') + vis('#hb2Bloom.on') + vis('.ss2-page') + vis('.rw-page') + vis('#lhCard.on, .lh-card.on, [data-companion-card].on'),
      cls: document.documentElement.className.split(' ').filter(c => /page|card|open|warp|gx/i.test(c)).join(' '), water: w ? w.textContent : null, top: (() => { const t = [...document.querySelectorAll('.r2-ov.on:not(.off) .r2-sh, #hb2Bloom.on, .ss2-page, .rw-page')].filter(e => e.getBoundingClientRect().width > 0).pop(); return t ? (t.id + '.' + String(t.className).slice(0, 30) + '|' + t.textContent.trim().replace(/\s+/g, ' ').slice(0, 60)) : null; })(), wl: JSON.stringify(fast.water || fast.w || '').slice(0, 60) };
  });
  const home = async () => { for (let i = 0; i < 3; i++) { await page.keyboard.press('Escape'); await L.sleep(250); } await page.evaluate(() => { try { LowiR2.closeAll(); } catch (e) {} window.goTab('home'); }); await L.sleep(1800); };
  // log two cups of water first so a reset would show
  await page.evaluate(() => { try { const b = document.querySelector('[data-orbit="water"]'); } catch (e) {} });
  const targets = await page.evaluate(() => { const o = {}; document.querySelectorAll('[data-orbit], #spBubble').forEach(e => { const r = e.getBoundingClientRect(); if (r.width > 20) o[e.dataset.orbit || e.id] = [r.left + r.width / 2, r.top + r.height / 2]; }); const st = document.querySelector('#bw3Stage'); if (st && st.getBoundingClientRect().width > 0) { const T = window.LowiMistyTurn; let sp = null; try { sp = T && T.spot && T.spot(); } catch (e) {} if (sp && sp.x != null) o.misty = [sp.x, sp.y]; else { const r = st.getBoundingClientRect(); o.stageMid = [r.left + r.width / 2, r.top + r.height / 2]; } } return o; });
  console.log('targets', JSON.stringify(targets));
  const res = [];
  for (const [k, [x, y]] of Object.entries(targets).filter(([k]) => !process.env.ONLY || process.env.ONLY.split(',').includes(k))) for (const dir of ['in', 'out']) {
    await home();
    const before = await state();
    const bx = x < 195 ? x + 160 : x - 160, by = y; const sgn = Math.sign(bx - x);
    await T('touchStart', [[x, y], [bx, by]]);
    for (let i = 1; i <= 24; i++) { const d = (dir === 'in' ? 1 : -1) * i * 2.5; await T('touchMove', [[x + sgn * d, y], [bx - sgn * d, by]]); await L.sleep(MS); }
    await T('touchEnd', []); await L.sleep(1300);
    const after = await state();
    const bad = after.gt.length || after.sheets > before.sheets || after.tab !== before.tab || after.water !== before.water;
    res.push({ k, dir, bad: !!bad, before: { tab: before.tab, sheets: before.sheets, water: before.water }, after });
  }
  res.forEach(r => console.log(r.bad ? 'BAD ' : 'ok  ', r.k, r.dir, JSON.stringify(r.after).slice(0, 300), 'before', JSON.stringify(r.before)));
  await h.browser.close();
})().catch(e => { console.error(String(e).slice(0, 300)); process.exit(2); });
