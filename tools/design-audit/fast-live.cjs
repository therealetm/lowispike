'use strict';
/* Oct 21 design audit, live WebKit check (local fixture, Berlin time, nothing leaves the machine):
   1) iPhone SE + iPhone 13 + iPad: the fasting sheet's end button is on screen when the sheet opens and after scrolling.
   2) Edit start card around the clock changes: 02:30 on 28 Mar 2027 is refused with the 'clocks jumped forward' line;
      02:30 on 25 Oct 2026 is accepted and says it happened twice; the offset shown is the picked time's.
   Usage: node tools/design-audit/fast-live.cjs [--out DIR] */
const fs = require('fs'), path = require('path');
const L = require('../interface-audit/lib.cjs');
const i = process.argv.indexOf('--out'); const OUT = i > 0 ? process.argv[i + 1] : '/home/sprite/design-audit-shots';
fs.mkdirSync(OUT, { recursive: true });
const H = 36e5;
const fails = [], ok = m => console.log('ok  ', m), bad = m => { fails.push(m); console.log('FAIL', m); };

async function withApp(device, nowIso, lastHours, fn) {
  const seed = L.existingSeed({});
  const h = await L.launch({ device, seed });
  try {
    if (nowIso) await h.ctx.clock.install({ time: new Date(nowIso) });
    const now = nowIso ? new Date(nowIso).getTime() : Date.now();
    await h.ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} }, ['lowi_fast_v1', JSON.stringify({ noGuess: 1, last: now - lastHours * H, target: 16, water: {}, hist: [{ s: now - 50 * H, e: now - 34 * H, h: 16, g: 16, ok: true, xp: 72 }] })]);
    await L.openApp(h, { settle: 4500 });
    await fn(h);
  } catch (e) { bad(device + ': ' + (e && e.message || e)); }
  await h.browser.close();
}

(async () => {
  for (const device of ['iPhone SE', 'iPhone 13', 'iPad Pro 11']) {
    await withApp(device, null, 10.5, async h => {
      await h.page.evaluate(() => LowiFastStop.open()); await L.sleep(1500);
      const pos = () => h.page.evaluate(() => { const r = document.querySelector('.fst-sh .fst-go').getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight }; });
      const coverAt = async where => { const cover = await h.page.evaluate(() => { const go = document.querySelector('.fst-sh .fst-go').getBoundingClientRect(); const hits = []; for (const fx of [.1, .3, .5, .7, .9]) { const e = document.elementFromPoint(go.left + go.width * fx, go.top + go.height / 2); if (!e || !e.closest('.fst-go')) hits.push(fx + ':' + (e ? e.tagName + '#' + e.id + '.' + String(e.className).slice(0, 30) : 'none')); } const x = document.getElementById('whX'); const xr = x && !x.hidden && getComputedStyle(x).display !== 'none' ? x.getBoundingClientRect() : null; const last = [...document.querySelectorAll('.fst-sh .fst-hr, .fst-sh .fst-next')].pop(); const lr = last && last.getBoundingClientRect(); return { hits, xTop: xr && Math.round(xr.top), lastBottom: lr && Math.round(lr.bottom) }; });
      (!cover.hits.length ? ok : bad)(device + ' nothing covers the end button (' + where + '): ' + JSON.stringify(cover.hits));
      if (where === 'end') (!cover.xTop || cover.lastBottom <= cover.xTop ? ok : bad)(device + ' last row clear of the close X (' + where + '): ' + JSON.stringify(cover)); };
      const a = await pos();
      (a.bottom <= a.vh && a.top >= 0 ? ok : bad)(device + ' end button on screen when the sheet opens: ' + JSON.stringify(a));
      await coverAt('open');
      await h.page.screenshot({ path: path.join(OUT, device.replace(/\s+/g, '') + '-gap-sheet-after.png') });
      await h.page.evaluate(() => { const s = document.getElementById('sheet'); if (s) s.scrollTop = s.scrollHeight; }); await L.sleep(400);
      const b = await pos();
      (b.bottom <= b.vh && b.top >= 0 ? ok : bad)(device + ' end button on screen after scrolling to the end: ' + JSON.stringify(b));
      const lastTxt = await h.page.evaluate(() => { const go = document.querySelector('.fst-sh .fst-go').getBoundingClientRect(); const n = document.querySelector('.fst-sh .fst-hist') || document.querySelector('.fst-sh .fst-next'); const r = n.getBoundingClientRect(); return { histTop: Math.round(r.top), histBottom: Math.round(r.bottom), goBottom: Math.round(go.bottom) }; });
      (lastTxt.histTop >= lastTxt.goBottom - 1 ? ok : bad)(device + ' at the end of the sheet the button sits back above the recent fasts, covering nothing: ' + JSON.stringify(lastTxt));
      await coverAt('end');
      await h.page.screenshot({ path: path.join(OUT, device.replace(/\s+/g, '') + '-gap-sheet-scrolled.png') });
      await h.page.evaluate(() => { const s = document.getElementById('sheet'); if (s) s.scrollTop = 0; }); await L.sleep(300);
      const tap = await h.page.evaluate(() => { const c = document.querySelector('.fe-chip'); if (!c) return null; const r = c.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top - 5; const e = document.elementFromPoint(x, y); return { h: Math.round(r.height), hitAbove: !!(e && e.closest('.fe-chip')) }; });
      (tap && tap.hitAbove ? ok : bad)(device + ' Edit start still answers a tap 5 px above the pill: ' + JSON.stringify(tap));
    });
  }
  async function card(nowIso, date, time, expect, shot) {
    await withApp('iPhone 13', nowIso, 3, async h => {
      await h.page.evaluate(() => LowiFastEdit.open()); await L.sleep(800);
      await h.page.evaluate(([d, t]) => { const a = document.getElementById('feDate'), b = document.getElementById('feTime'); a.value = d; b.value = t; b.dispatchEvent(new Event('input', { bubbles: true })); }, [date, time]);
      await L.sleep(300);
      const r = await h.page.evaluate(() => ({ msg: (document.querySelector('.fe-msg') || {}).textContent || '', tz: (document.querySelector('.fe-tz') || {}).textContent || '', pre: (document.querySelector('.fe-pre') || {}).textContent || '', saveDisabled: document.querySelector('[data-fse="save"]').disabled }));
      await h.page.screenshot({ path: path.join(OUT, shot) });
      expect(r);
    });
  }
  await card('2027-03-28T12:00:00+02:00', '2027-03-28', '02:30', r => {
    (/jumped forward/.test(r.msg) && r.saveDisabled ? ok : bad)('spring forward 02:30 refused with an explanation: ' + JSON.stringify(r));
  }, 'iPhone13-edit-start-gap.png');
  await card('2026-10-25T12:00:00+01:00', '2026-10-25', '02:30', r => {
    (/happened twice/.test(r.tz) && /UTC\+2/.test(r.tz) && !r.saveDisabled && /10 h 30 min/.test(r.pre) ? ok : bad)('fall back 02:30 accepted as the first one, 10 h 30 min to noon, labelled: ' + JSON.stringify(r));
  }, 'iPhone13-edit-start-twice.png');
  await card('2026-10-25T12:00:00+01:00', '2026-10-25', '08:00', r => {
    (/UTC\+1/.test(r.tz) && !/twice/.test(r.tz) ? ok : bad)('after the change the offset reads UTC+1, no note: ' + JSON.stringify(r));
  }, 'iPhone13-edit-start-winter.png');
  console.log(fails.length ? '\n' + fails.length + ' FAILED' : '\nall passed');
  process.exit(fails.length ? 1 : 0);
})();
