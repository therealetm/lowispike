/* Item 31: click-everything crawl for errors. For each tab (and the Settings pages) it taps every visible control once, the
   way a curious person would, then goes back to the tab and carries on. Records page errors and console errors with the
   control that caused them, plus renderer crashes. Skips controls that sign out or erase things.
   node tools/sim/crash-crawl.cjs [webkit|chromium] [maxPerTab] [root|url] */
'use strict';
const H = require('./harness.cjs');
const [engine = 'webkit', maxPer = '30', where = ''] = process.argv.slice(2);
const SKIP = /sign ?out|log ?out|abmelden|delete|löschen|erase|reset|clear all|remove account|cerrar sesi|borrar|share|teilen|install|download/i;
(async () => {
  const o = { engine }; if (/^https?:/.test(where)) o.url = where; else if (where) o.root = where;
  const R = await H.open(o); const P = R.page; const found = []; let taps = 0;
  const list = () => P.evaluate(() => { const out = []; document.querySelectorAll('button,[role=button],[data-tab],[data-ss2],[data-act],[data-chat],a[href^="#"]').forEach((b, i) => { const r = b.getBoundingClientRect(); if (r.width < 6 || r.height < 6 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return; const x = r.left + r.width / 2, y = r.top + r.height / 2, t = document.elementFromPoint(x, y); if (!t || !(t === b || b.contains(t))) return; out.push({ x, y, label: ((b.getAttribute('aria-label') || b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40)) || (b.id ? '#' + b.id : '.' + String(b.className).split(' ')[0]), key: (b.id || '') + '|' + String(b.className).split(' ')[0] + '|' + (b.dataset.ss2 || b.dataset.act || b.dataset.chat || b.dataset.tab || '') + '|' + ((b.getAttribute('aria-label') || b.textContent || '').trim().slice(0, 20)) }); }); return out; });
  const reset = async (tab) => { await P.keyboard.press('Escape').catch(() => { }); await H.sleep(300); await P.evaluate(t => { document.querySelectorAll('.r2-ov.on,.sheet.on,[aria-modal=true]').forEach(e => { const c = e.querySelector('[data-close],.close,[aria-label*=lose]'); if (c) c.click(); }); try { window.goTab(t); } catch (e) { } }, tab).catch(() => { }); await H.sleep(900); };
  const tabs = ['home', 'scan', 'shelf', 'move', 'profile', 'foryou'];
  try {
    await R.goto(); await H.sleep(6000);
    for (const tab of tabs) {
      R.step = 'tab ' + tab; await reset(tab); await H.sleep(1500);
      const seen = new Set(); let n = 0;
      for (let round = 0; round < 3 && n < +maxPer; round++) {
        const items = (await list()).filter(i => !seen.has(i.key) && !SKIP.test(i.label));
        if (!items.length) break;
        for (const it of items) {
          if (n >= +maxPer) break; seen.add(it.key); n++; taps++;
          const before = R.errs.length; R.step = tab + ' > ' + it.label;
          await P.touchscreen.tap(it.x, it.y).catch(() => { }); await H.sleep(900);
          if (R.crashed) { found.push({ tab, control: it.label, crash: true }); throw new Error('renderer crashed'); }
          if (R.errs.length > before) found.push({ tab, control: it.label, errs: R.errs.slice(before) });
          if (R.loads > 1) { found.push({ tab, control: it.label, reload: true }); console.log('page reloaded after', it.label); await R.goto(); await H.sleep(5000); R.loads = 1; }
          await reset(tab);
        }
      }
      console.log(R.el(), 'tab', tab, 'tapped', n, 'errors so far', R.errs.length, JSON.stringify(await R.snap()));
    }
  } catch (e) { console.log('ERR', R.step, e.message.slice(0, 300)); }
  console.log('RESULT', JSON.stringify({ engine, taps, found, errs: R.errs, crashed: R.crashed }));
  await R.close();
})();
