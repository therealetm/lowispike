'use strict';
/* Oct 21 soft-ms live WebKit check (local fixture): 13 h into a fast, the fasting sheet and the stage sheets show the softened
   milestone wording (typical, not promised), none of the old 'ramps up' / 'Begins around' lines, and nothing spills off screen.
   Usage: node tools/design-audit/soft-wording-live.cjs [--out DIR] */
const fs = require('fs'), path = require('path');
const L = require('../interface-audit/lib.cjs');
const i = process.argv.indexOf('--out'); const OUT = i > 0 ? process.argv[i + 1] : '/home/sprite/design-audit-shots';
fs.mkdirSync(OUT, { recursive: true });
const H = 36e5, OLD = /ramps up|start to rise|Begins around|Ketosis|Beginnt etwa|Empieza unas/;
const fails = [], ok = m => console.log('ok  ', m), bad = m => { fails.push(m); console.log('FAIL', m); };

(async () => {
  for (const device of ['iPhone SE', 'iPhone 13', 'iPad Pro 11']) {
    const h = await L.launch({ device, seed: L.existingSeed({}) });
    try {
      const now = Date.now();
      await h.ctx.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch (e) {} }, ['lowi_fast_v1', JSON.stringify({ noGuess: 1, last: now - 13 * H, target: 16, water: {}, hist: [] })]);
      await L.openApp(h, { settle: 4500 });
      const st = await h.page.evaluate(() => window.LowiFast && LowiFast.stages());
      console.log('     stages:', JSON.stringify(st));
      (st && st.some(s => s.h === 12 && /often picks up/.test(s.n)) && st.some(s => s.h === 14 && /may start rising/.test(s.n)) ? ok : bad)(device + ' LowiFast.stages() carries the soft names');
      await h.page.evaluate(() => LowiFastStop.open()); await L.sleep(1500);
      const sheet = await h.page.evaluate(() => { const s = document.getElementById('sheet') || document.body; return s.innerText; });
      console.log('     end sheet:', JSON.stringify(sheet.slice(0, 500)));
      (!OLD.test(sheet) ? ok : bad)(device + ' end-fast sheet has no old wording');
      (/Fat burning often picks up/.test(sheet) ? ok : bad)(device + ' end-fast sheet shows the 12 h milestone softened');
      await h.page.screenshot({ path: path.join(OUT, device.replace(/\s+/g, '') + '-soft-end-sheet.png') });
      const st2 = await h.page.evaluate(() => { try { if (typeof closeSheet === 'function') closeSheet(); } catch (e) {}
        const b = document.querySelector('.bt-dot[data-i="3"]'); if (!b) return null; b.click(); return true; });
      await L.sleep(1200);
      if (st2) {
        const r = await h.page.evaluate(() => { const c = document.querySelector('.bt-sheet .bt-chip'), t = document.querySelector('.bt-sheet .bt-title'), x = document.querySelector('.bt-sheet .bt-x'), hd = document.querySelector('.bt-sheet .bt-hedge');
          const off = [c, t, x].filter(Boolean).some(e => { const q = e.getBoundingClientRect(); return q.right > innerWidth + 1 || q.left < -1; });
          return { chip: c && c.innerText, title: t && t.innerText, x: x && x.innerText, hedge: hd && hd.innerText, off }; });
        console.log('     stage sheet:', JSON.stringify(r));
        (r.title === 'Fat burning often picks up' && /For many people, around 12 h in/.test(r.chip) && !r.off ? ok : bad)(device + ' 12 h stage sheet: soft title + chip, on screen');
        await h.page.screenshot({ path: path.join(OUT, device.replace(/\s+/g, '') + '-soft-stage-sheet.png') });
      } else console.log('     (no stage row on Home in this fixture, stage sheet not opened)');
    } catch (e) { bad(device + ': ' + (e && e.message || e)); }
    await h.browser.close();
  }
  console.log(fails.length ? '\n' + fails.length + ' FAILED' : '\nall passed');
  process.exit(fails.length ? 1 : 0);
})();
