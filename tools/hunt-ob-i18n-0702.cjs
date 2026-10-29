'use strict';
/* Bug hunt 29 Oct 07:02: are setup error lines / step 1 texts translated in DE/ES after they settle? node tools/hunt-ob-i18n-0702.cjs <device> <lang> */
const H = require('./sim/harness.cjs');
const device = process.argv[2] || 'iPhone 15', lang = process.argv[3] || 'de';
const engine = /Pixel/.test(device) ? 'chromium' : 'webkit';
const URL0 = process.env.URL || 'https://therealetm.github.io/lowispike/index.html';
(async () => { let R; try {
  R = await H.open({ engine, device, lang, fresh: true, url: URL0 }); const P = R.page;
  await P.addInitScript(lg => { try { localStorage.setItem('lowispike.lang', lg); } catch (e) { } }, lang);
  await R.goto(); await H.sleep(7000);
  const er = () => P.evaluate(() => { const e = document.querySelector('#r2obErr'); return e ? e.textContent : null; });
  console.log('build', await P.evaluate(() => (window.LOWI_BUILD || document.documentElement.dataset.build || '')));
  await P.click('[data-r2o=next]').catch(e => console.log('ERR', e.message)); for (const t of [100, 1000, 3000]) { await H.sleep(t); console.log('empty name after', t, JSON.stringify(await er())); }
  await P.fill('#r2obName', 'Zoe'); await H.sleep(300); await P.click('[data-r2o=next]'); await H.sleep(1500); console.log('no bday', JSON.stringify(await er()));
  const d = new Date(); d.setMonth(d.getMonth() - 3); await P.fill('#r2obB', d.toISOString().slice(0, 10)); await P.click('[data-r2o=next]'); await H.sleep(1500); console.log('baby', JSON.stringify(await er()));
  await P.fill('#r2obB', '1992-02-29'); await H.sleep(2500); console.log('sign', JSON.stringify(await P.evaluate(() => { const e = document.querySelector('#r2ob'); return e.innerText.match(/♓[^\n]*\n?[^\n]*/) + ''; })));
  await P.screenshot({ path: '/tmp/hunt0702/i18n-' + device.replace(/\s/g, '') + '-' + lang + '.png' });
} catch (e) { console.log('FAIL', e.message); } finally { if (R) await R.close().catch(() => { }); } })();
