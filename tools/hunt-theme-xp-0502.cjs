'use strict';
/* Bug hunt 29 Oct 05:02 (Settings / day-night / language): flips Day/night from the hub by a real tap and reads data-theme, the hub
   sheet's own background and the row label; reloads and checks it stuck. Also reads the XP line in the hub next to Misty's card
   number format for the app language (de 2.400, es 2400, en 2,400) regardless of the phone's own locale.
   node tools/hunt-theme-xp-0502.cjs <device> [url] [lang] [xp] */
const H = require('./sim/harness.cjs');
(async () => {
  const A = process.argv.slice(2), device = A[0] || 'iPhone 15', url = A[1] || 'https://therealetm.github.io/lowispike/index.html', lang = A[2] || 'de', xp = +(A[3] || 2400);
  const R = await H.open({ device, engine: /Pixel/.test(device) ? 'chromium' : 'webkit', url, probe: false, lang, members: 5, messages: 5 });
  await R.ctx.addInitScript(l => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, lang);
  const P = R.page;
  await R.goto(); await H.sleep(6000);
  const open = async () => { await P.evaluate(() => { try { LowiCommunityMe.close(); } catch (e) { } }); await H.sleep(900); await P.evaluate(() => LowiCommunityMe.open()); await H.sleep(2600); };
  const read = () => P.evaluate(() => { const s = document.querySelector('.cme-ov.on #cmeSheet'); const row = s && s.querySelector('[data-cme="theme"]'); const xp = s && s.querySelector('.cme-who small'); return { theme: document.documentElement.getAttribute('data-theme'), ls: localStorage.getItem('lowi.theme'), sheetBg: s ? getComputedStyle(s).backgroundColor + ' ' + getComputedStyle(s).backgroundImage.slice(0, 60) : null, row: row ? row.innerText.replace(/\s+/g, ' ') : null, xp: xp ? xp.textContent : null }; });
  await open();
  const a = await read(); console.log('BEFORE', JSON.stringify(a));
  const tap = await P.evaluate(() => { const b = document.querySelector('.cme-ov.on #cmeSheet [data-cme="theme"]'); b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await P.touchscreen.tap(tap.x, tap.y); await H.sleep(1800);
  const b = await read(); console.log('AFTER', JSON.stringify(b));
  await P.reload({ waitUntil: 'load' }); await H.sleep(6000); await open();
  const c = await read(); console.log('RELOAD', JSON.stringify(c));
  const want = { de: 'de-DE', es: 'es-ES', en: 'en-US' }[lang];
  console.log('XPCHECK', JSON.stringify({ shown: c.xp, want: c.xp ? c.xp.replace(/[\d.,\s\u00a0]+/, m => m) : null, fmt: (2400).toLocaleString(want) }));
  console.log('RESULT', JSON.stringify({ flipped: a.theme !== b.theme && a.ls !== b.ls, stuck: c.theme === b.theme, rowChanged: a.row !== b.row }));
  console.log('ERRS', JSON.stringify(R.errs.filter(e => !/access control/.test(e.m)).map(e => e.m).slice(0, 5)));
  await R.close();
})().catch(e => { console.log('TOOL ERROR', e && e.stack); process.exit(1); });
