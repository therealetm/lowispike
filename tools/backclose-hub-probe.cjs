'use strict';
/* Back/close sweep repro: hold Community on Home (opens the profile hub sheet), then press back (Safari edge swipe) twice.
   The first back must close the hub; a back must never leave the app while a sheet is still open.
   node tools/backclose-hub-probe.cjs [chromium|webkit] [url|root] [orbit] */
const H = require('./sim/harness.cjs');
const fs = require('fs'), path = require('path');
(async () => {
  const eng = process.argv[2] || 'chromium', target = process.argv[3] || 'https://therealetm.github.io/lowispike/index.html', orbit = process.argv[4] || 'settings';
  const o = { engine: eng, members: 10, messages: 20, probe: false };
  if (/^https?:/.test(target)) o.url = target; else o.root = target;
  if (eng === 'webkit') o.device = 'iPhone 13'; else o.viewport = { width: 390, height: 844 };
  const R = await H.open(o); const P = R.page;
  if (eng === 'webkit') await R.ctx.addInitScript({ content: fs.readFileSync(path.join(__dirname, 'sim', 'no-media-init.js'), 'utf8') });
  await R.goto(); await H.sleep(9000);
  await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } });
  await P.touchscreen.tap(8, 420); await H.sleep(800);
  const app = P.url().split('?')[0];
  const s = () => Promise.race([H.sleep(20000).then(() => 'HUNG'), P.evaluate(() => ({ h: history.length, st: JSON.stringify(history.state), tab: (document.querySelector('.tab.active') || {}).id,
    sheets: [...document.querySelectorAll('.r2-ov')].map(ov => (ov.classList.contains('on') ? 'ON ' : 'off ') + (ov.id || '') + ':' + ((ov.querySelector('h1,h2,h3,.r2-t,.r2-title') || {}).textContent || '').trim().slice(0, 30)),
    focus: document.activeElement ? (document.activeElement.id || document.activeElement.tagName + '.' + String(document.activeElement.className).slice(0, 30)) : '' })).catch(e => 'ERR ' + e.message.slice(0, 60))]);
  await P.evaluate(async (orbit) => { const e = document.querySelector('[data-orbit="' + orbit + '"]'); const r = e.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const t = document.elementFromPoint(x, y) || e;
    const pe = (type) => t.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, composed: true, pointerId: 1, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, buttons: type === 'pointerup' ? 0 : 1 }));
    pe('pointerdown'); await new Promise(r => setTimeout(r, 900)); pe('pointerup'); }, orbit);
  await H.sleep(+(process.env.OPENWAIT || 3000));
  console.log('opened', JSON.stringify(await s()));
  let left = false;
  for (let i = 0; i < 2 && !left; i++) {
    await P.evaluate(() => history.back()).catch(() => { });
    await H.sleep(eng === 'webkit' ? 20000 : 6000);
    if (P.url().split('?')[0] !== app) { left = true; console.log('back', i + 1, 'LEFT THE APP ->', P.url()); break; }
    const st = await s(); console.log('back', i + 1, JSON.stringify(st));
    if (st && st.sheets && !st.sheets.some(x => x.startsWith('ON'))) break;
  }
  console.log(left ? 'LEFT' : 'stayed', 'errs', JSON.stringify(R.errs).slice(0, 500));
  await R.close(); process.exit(left ? 1 : 0);
})().catch(e => { console.error('BROKEN', e.stack); process.exit(2); });
