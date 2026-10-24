'use strict';
/* Probe: Android back / Safari swipe back in the companion area (live). For each surface (Misty's card, Forms from the card,
   Aura from the card, Rename field open), open it like a user, press back once, and record what is open and whether we are
   still in the app. node tools/hunt-companion-back.cjs <device> [lang] [url|root] */
const H = require('./sim/harness.cjs');
(async () => {
  const device = process.argv[2] || 'Pixel 7', lang = process.argv[3] || 'en', url = process.argv[4] || 'https://therealetm.github.io/lowispike/index.html';
  const o = { device, engine: /Pixel/.test(device) ? 'chromium' : 'webkit', members: 10, messages: 20, probe: false, lang }; if (/^https?:/.test(url)) o.url = url; else o.root = url;
  const R = await H.open(o); const P = R.page; await R.goto(); await H.sleep(5500);
  const host = new URL(P.url()).host;
  const vis = () => P.evaluate(() => [...document.querySelectorAll('.r2-ov.on, .cf-panel, [id$="Ov"].on, #hb2Bloom.on')].filter(e => e.getClientRects().length).map(e => (e.id || String(e.className).slice(0, 30))));
  const tap = async sel => { const p = await P.evaluate(s => { const b = [...document.querySelectorAll(s)].filter(e => e.getClientRects().length && !e.closest('.r2-ov.off')).pop(); if (!b) return null; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, sel); if (!p) return false; await H.sleep(300); await P.touchscreen.tap(p[0], p[1]); await H.sleep(1500); return true; };
  const fresh = async () => { if (new URL(P.url()).host !== host) { await R.goto(); await H.sleep(5500); } await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } try { LowiCompanion.close(); } catch (e) { } try { goTab('home'); } catch (e) { } }); await H.sleep(1200); await P.touchscreen.tap(20, 300); await H.sleep(400); await P.evaluate(() => LowiMistyHub.open()); await H.sleep(3200); };
  const cases = [['card', null], ['forms', '#mistyHub [data-mh="forms"]'], ['aura', '#mistyHub [data-mh="glow"]'], ['rename', '#mistyHub [data-mh="rename"]']];
  const out = { device, lang, build: await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content), cases: [] };
  for (const [name, sel] of cases) {
    await fresh(); if (sel) await tap(sel);
    const before = await vis(); const len0 = await P.evaluate(() => JSON.stringify(history.state) + ' len ' + history.length);
    await P.goBack({ timeout: 4000 }).catch(() => { }); await H.sleep(1800);
    const inApp = new URL(P.url()).host === host && await P.evaluate(() => !!window.LowiMistyHub).catch(() => false);
    const after = inApp ? await vis() : ['LEFT THE APP: ' + P.url()];
    const rn = inApp ? await P.evaluate(() => !!document.querySelector('#mistyHub .mh-rnf')).catch(() => null) : null;
    out.cases.push({ name, before, after, renameField: rn, len0 });
  }
  out.errs = R.errs; out.crashed = R.crashed; console.log(JSON.stringify(out, null, 1)); await R.close().catch(() => { }); process.exit(0);
})().catch(e => { console.log('ERR', e && e.stack); process.exit(1); });
