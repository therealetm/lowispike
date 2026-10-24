'use strict';
/* Bug hunt (companion): Misty's card like a user: rename (typed, blank, spaces only, markup, 24+ chars), check that the name
   shows the same on the card, the rank pill's label and after a reload, say goodnight, open/close fast.
   node tools/hunt-misty-rename.cjs <device> [lang] [url] */
const H = require('./sim/harness.cjs');
(async () => {
  const A = process.argv.slice(2), device = A[0] || 'iPhone 13', lang = A[1] || 'en', url = A[2] || 'https://therealetm.github.io/lowispike/index.html';
  const R = await H.open({ device, engine: /Pixel/.test(device) ? 'chromium' : 'webkit', url, probe: false, lang, members: 5, messages: 5 });
  await R.ctx.addInitScript(l => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, lang);
  const P = R.page; R.step = 'load'; await R.goto(); await H.sleep(5000);
  const snap = async (tag) => console.log(tag, JSON.stringify(await P.evaluate(() => {
    const c = document.getElementById('mistyHub'); if (!c) return { card: null };
    const nm = c.querySelector('.mh-name'), rk = c.querySelector('.mh-rk'), err = c.querySelector('.mh-rne');
    return { name: nm && nm.textContent.trim().slice(0, 60), rank: rk && rk.getAttribute('aria-label'), err: err && !err.hidden ? err.textContent : '', disp: window.LowiBirthCompanion && LowiBirthCompanion.displayName && LowiBirthCompanion.displayName(), form: !!c.querySelector('.mh-rnf') };
  })));
  const open = async () => { await P.evaluate(() => LowiMistyHub.open()); await H.sleep(2500); };
  const rename = async (v) => {
    R.step = 'rename ' + JSON.stringify(v);
    await P.evaluate(() => { const b = document.querySelector('#mistyHub .mh-rn'); if (b) b.click(); }); await H.sleep(400);
    const has = await P.$('#mistyHub .mh-rnf input'); if (!has) { console.log('NO RENAME FIELD'); return; }
    await has.fill(''); if (v) await has.type(v); await P.keyboard.press('Enter'); await H.sleep(900);
    await snap('after ' + JSON.stringify(v));
    await P.evaluate(() => { const x = document.querySelector('#mistyHub [data-mhrnx]'); if (x) x.click(); }); await H.sleep(300);
  };
  await open(); await snap('fresh');
  for (const v of ['Blub', '   ', '<b>Zoe</b>', 'A very long companion name that goes on', '']) await rename(v);
  await rename('Nova');
  R.step = 'reload'; await P.reload(); await H.sleep(5000); await open(); await snap('after reload');
  R.step = 'goodnight'; await P.evaluate(() => { const b = [...document.querySelectorAll('#mistyHub button')].find(b => /goodnight|Gute Nacht|buenas noches/i.test(b.textContent)); if (b) b.click(); }); await H.sleep(1500);
  console.log('goodnight', await P.evaluate(() => LowiMistyHub.saidGoodnight && LowiMistyHub.saidGoodnight()));
  R.step = 'fast'; for (let i = 0; i < 8; i++) { await P.evaluate(() => LowiMistyHub.open()); await H.sleep(120 + i * 30); await P.evaluate(() => LowiMistyHub.close()); await H.sleep(90); }
  await H.sleep(1500);
  console.log('left open', JSON.stringify(await P.evaluate(() => [...document.querySelectorAll('.r2-ov.on')].map(e => e.className.slice(0, 40)))), 'cards', await P.evaluate(() => document.querySelectorAll('#mistyHub').length));
  console.log('crashed', R.crashed, 'errs', JSON.stringify(R.errs.slice(0, 6)));
  await R.close();
})().catch(e => { console.error('BROKEN', e && e.stack || e); process.exit(2); });
