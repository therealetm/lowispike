'use strict';
/* Code error sweep 24 Oct 22:02: after the 20:02 fix kept the emoji in Misty's card title, check every OTHER place the
   companion's name shows. Rename Misty to 'Lumi ✨' in the real rename field, then on Home, and on Community (Room, Ranking,
   Chat) find every element whose text says 'Lumi' and report whether the ✨ is still there or was swapped for an icon.
   node tools/sweep-name-emoji-2202.cjs <device> [lang] [url|root] */
const H = require('./sim/harness.cjs');
(async () => {
  const device = process.argv[2] || 'iPhone 15', lang = process.argv[3] || 'en', url = process.argv[4] || 'https://therealetm.github.io/lowispike/index.html';
  const o = { device, engine: /Pixel/.test(device) ? 'chromium' : 'webkit', members: 10, messages: 20, probe: false, lang }; if (/^https?:/.test(url)) o.url = url; else o.root = url;
  const R = await H.open(o); const P = R.page;
  await R.goto(); await H.sleep(6000);
  const NM = 'Lumi \u2728';
  const out = { device, lang, build: await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content), where: {} };
  await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } LowiMistyHub.open(); }); await H.sleep(3200);
  await P.evaluate(() => { const h = [...document.querySelectorAll('#mistyHub')].find(e => !e.closest('.r2-ov.off')); const b = h && h.querySelector('[data-mh="rename"]'); b && b.click(); });
  await H.sleep(400);
  await P.evaluate(() => { const i = [...document.querySelectorAll('#mistyHub .mh-rnf input')].pop(); i.focus(); i.select(); });
  await P.keyboard.press('Backspace'); await P.keyboard.type(NM, { delay: 20 }); await P.keyboard.press('Enter'); await H.sleep(1500);
  out.disp = await P.evaluate(() => { try { return LowiBirthCompanion.displayName(); } catch (e) { return null; } });
  const scan = () => P.evaluate(() => {
    const res = [], seen = new Set();
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) { const n = w.currentNode; if (!/Lumi/.test(n.data)) continue; let el = n.parentElement; while (el && el.classList && el.classList.contains('sp-ui-copy')) el = el.parentElement; if (!el || seen.has(el)) continue; seen.add(el);
      const vis = !!el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden';
      res.push({ el: el.tagName + (el.id ? '#' + el.id : '') + '.' + String(el.className).slice(0, 40), path: (el.closest('[id]') || {}).id || '', text: el.textContent.trim().slice(0, 60), kept: el.textContent.includes('\u2728'), svg: el.querySelectorAll('svg').length, vis }); }
    for (const a of document.querySelectorAll('[aria-label*="Lumi"],[title*="Lumi"]')) res.push({ attr: a.tagName + '.' + String(a.className).slice(0, 30), label: (a.getAttribute('aria-label') || a.getAttribute('title')).slice(0, 60), kept: (a.getAttribute('aria-label') || a.getAttribute('title')).includes('\u2728') });
    return res; });
  await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } }); await H.sleep(1500);
  out.where.home = await scan();
  await P.touchscreen.tap(20, 300); await H.sleep(400);
  const tap = async sel => { const p = await P.evaluate(s => { const b = [...document.querySelectorAll(s)].filter(e => e.getClientRects().length).pop(); if (!b) return null; const r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, sel); if (p) { await P.touchscreen.tap(p[0], p[1]); await H.sleep(2500); } return !!p; };
  out.tapCommunity = await tap('#whHud .o8-settings');
  out.where.room = await scan();
  out.tapRank = await tap('.rm-tab[data-rm="rank"]'); await H.sleep(1500);
  out.where.rank = await scan();
  out.tapChat = await tap('.rm-tab[data-rm="chat"]'); await H.sleep(1500);
  out.where.chat = await scan();
  out.errs = R.errs; out.crashed = R.crashed; console.log(JSON.stringify(out, null, 1)); await R.close().catch(() => { }); process.exit(0);
})().catch(e => { console.log('ERR', e && e.stack); process.exit(1); });
