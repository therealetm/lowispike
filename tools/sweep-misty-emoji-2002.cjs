'use strict';
/* Code error sweep 24 Oct 20:02: rename Misty to a name with an emoji (by typing in the real rename field), then read what
   Misty's card title (.mh-name h2) really holds: its text, whether the emoji was swapped for an icon (svg), and the
   companion's saved display name. node tools/sweep-misty-emoji-2002.cjs <device> [lang] [url|root] */
const H = require('./sim/harness.cjs');
(async () => {
  const device = process.argv[2] || 'iPhone 15', lang = process.argv[3] || 'en', url = process.argv[4] || 'https://therealetm.github.io/lowispike/index.html';
  const o = { device, engine: /Pixel/.test(device) ? 'chromium' : 'webkit', members: 10, messages: 20, probe: false, lang }; if (/^https?:/.test(url)) o.url = url; else o.root = url;
  const R = await H.open(o); const P = R.page;
  await R.ctx.addInitScript(l => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, lang);
  await R.goto(); await H.sleep(6000);
  const out = { device, lang, build: await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content), runs: [] };
  const openHub = async () => { await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } }); await H.sleep(800); await P.evaluate(() => LowiMistyHub.open()); await H.sleep(3200); };
  const top = sel => P.evaluate(s => { const h = [...document.querySelectorAll('#mistyHub')].find(e => !e.closest('.r2-ov.off')); return !!(h && h.querySelector(s)); }, sel);
  for (const nm of ['Lumi \u2728', 'Bobo \u{1F496}', '\u{1F33F} Kiwi']) {
    await openHub();
    await P.evaluate(() => { const h = [...document.querySelectorAll('#mistyHub')].find(e => !e.closest('.r2-ov.off')); const b = h && h.querySelector('[data-mh="rename"]'); b && b.click(); });
    await H.sleep(400);
    const hasForm = await top('.mh-rnf input');
    if (hasForm) {
      await P.evaluate(() => { const i = [...document.querySelectorAll('#mistyHub .mh-rnf input')].pop(); i.focus(); i.select(); });
      await P.keyboard.press('Backspace'); await P.keyboard.type(nm, { delay: 20 }); await P.keyboard.press('Enter');
    }
    await H.sleep(1500);
    const card = await P.evaluate(() => { const h = [...document.querySelectorAll('#mistyHub')].find(e => !e.closest('.r2-ov.off')); const n = h && h.querySelector('.mh-name h2'); let disp = null; try { disp = LowiBirthCompanion.displayName(); } catch (e) { } return { text: n ? n.textContent : null, svg: n ? n.querySelectorAll('svg').length : null, html: n ? n.innerHTML.slice(0, 300) : null, disp }; });
    out.runs.push({ typed: nm, hasForm, card, kept: !!(card.text && card.text.trim() === nm.trim()) });
  }
  out.errs = R.errs; out.crashed = R.crashed; console.log(JSON.stringify(out, null, 1)); await R.close().catch(() => { }); process.exit(0);
})().catch(e => { console.log('ERR', e && e.stack); process.exit(1); });
