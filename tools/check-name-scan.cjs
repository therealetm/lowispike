'use strict';
/* Oct 23 check (Emmanuel: "if the app knows the name, it should still give an analysis"): in the real Scan sheet,
   1) type the grapes barcode 8033803727241 (Open Food Facts answers with the name only, no nutrition): the result must be a
      verdict from the name on top, with the same reaction as a normal scan (lowi:scan-verdict + Misty's bloom/wilt), the best
      swap, and a "No detailed data" note with label photos as the optional extra;
   2) type "Trauben" and "Erdbeere" in the name field and tap Show the analysis;
   3) an unknown store code (no name) -> the sheet with the name box: type "Erdbeeren", the live chip shows, Analyze by name.
   Records errors, overflow, cut-off text and English in de/es, with screenshots.
   node tools/check-name-scan.cjs <device> [url|root] [outdir] [lang en|de|es] */
const H = require('./sim/harness.cjs'), fs = require('fs'), path = require('path');
(async () => {
  const device = process.argv[2] || 'iPhone 13', where = process.argv[3] || 'https://therealetm.github.io/lowispike/index.html';
  const out = process.argv[4] || '/tmp/check-name', lang = process.argv[5] || 'en';
  fs.mkdirSync(out, { recursive: true });
  const o = { device, engine: process.env.ENG || 'webkit', members: 6, messages: 6, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page, tag = device.replace(/\W/g, '') + '-' + lang;
  const GRAPES = { status: 1, code: '8033803727241', product: { product_name: 'Tafeltrauben kernlos - Klasse 1', brands: 'Eurogroup Italia', nutriments: {} } };
  await R.ctx.route(u => /(^|\.)openfoodfacts\.org$/.test(new URL(u).host), r => {
    const u = r.request().url();
    if (/8033803727241/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(GRAPES) });
    if (/2[0-9]{12}\.json|2[0-9]{7}\.json/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 0 }) });
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 0, products: [] }) });
  });
  await R.ctx.addInitScript(l => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } window.__nv = []; addEventListener('lowi:scan-verdict', e => window.__nv.push(e.detail && e.detail.verdict)); }, lang);
  R.step = 'load'; await R.goto(); await H.sleep(5000);
  const res = { device, lang, build: await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || null), cases: [], finds: [] };
  const find = async (kind, info) => { const f = path.join(out, tag + '-find-' + res.finds.length + '.png'); await R.shot(f); res.finds.push(Object.assign({ kind, shot: f }, info)); console.log('FIND', kind, JSON.stringify(info).slice(0, 300)); };
  const reset = async () => { for (let i = 0; i < 3; i++) { await P.keyboard.press('Escape').catch(() => { }); await H.sleep(100); } await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } try { goTab('home'); } catch (e) { } }); await H.sleep(600); };
  const openScan = async () => { await reset(); await P.evaluate(() => { try { LowiDex.scan(); } catch (e) { } }); await H.sleep(1500); return P.evaluate(() => !!document.querySelector('#b3Cam')); };
  const state = () => P.evaluate(() => {
    const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
    const top = [...document.querySelectorAll('.r2-ov:not(.off)')].filter(vis).pop() || document.body;
    const wide = [...top.querySelectorAll('*')].filter(e => vis(e) && e.getBoundingClientRect().right > innerWidth + 2 && getComputedStyle(e).position !== 'fixed' && !e.closest('.hscroll')).slice(0, 3).map(e => e.className + ':' + Math.round(e.getBoundingClientRect().right));
    const cut = [...top.querySelectorAll('button,b,small,span,p,h3,h4')].filter(e => vis(e) && e.children.length === 0 && e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflow === 'hidden' && getComputedStyle(e).textOverflow !== 'ellipsis').slice(0, 3).map(e => e.textContent.slice(0, 40));
    const v = top.querySelector('.sc-verd');
    return { text: (top.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 700), verd: v ? v.className : '', est: !!top.querySelector('.ne-est'), swap: (top.querySelector('.ne-swap') || {}).innerText || '', nodata: !!top.querySelector('.ne-nodata'), lp: !!top.querySelector('.ne-nodata [data-b3="lphoto"]'), stage: !!top.querySelector('.sc-stage.show'), box: !!top.querySelector('#b3MName'), chip: (top.querySelector('.ne-chip') || {}).innerText || '', nv: (window.__nv || []).slice(), wide, cut, overflow: document.documentElement.scrollWidth - innerWidth };
  });
  const check = async (what, want) => {
    const s = await state();
    console.log(`CASE ${what}: verd=${s.verd} est=${s.est} nodata=${s.nodata} lp=${s.lp} swap="${s.swap.replace(/\s+/g, ' ').slice(0, 80)}" nv=${s.nv.join(',')} :: ${s.text.slice(0, 240)}`);
    await R.shot(path.join(out, tag + '-' + what.replace(/\W+/g, '_') + '.png'));
    res.cases.push(Object.assign({ what }, s));
    if (want.verd && !s.verd.includes('v-' + want.verd)) await find('wrong verdict', { what, got: s.verd });
    if (want.est && !s.est) await find('no name estimate block', { what });
    if (want.nodata && !(s.nodata && s.lp)) await find('no "no detailed data" note with label photos', { what });
    if (want.swap && !s.swap) await find('no best swap', { what });
    if (want.anim && !s.nv.includes(want.verd)) await find('no scan reaction (lowi:scan-verdict)', { what, nv: s.nv });
    if (want.chip && !s.chip) await find('no live chip', { what });
    if (s.overflow > 2 || s.wide.length) await find('overflow', { what, wide: s.wide, px: s.overflow });
    if (s.cut.length) await find('cut off', { what, cut: s.cut });
    if (/undefined|NaN|\[object/.test(s.text)) await find('broken text', { what, text: s.text.slice(0, 200) });
    if (lang !== 'en' && /\b(Estimate from the name|No detailed data|Best swap|How sure|Analyze by name|Make it exact)\b/.test(s.text)) await find('english in ' + lang, { what });
    return s;
  };
  const typeCode = async code => {
    const inp = P.locator('#b3Cam input[inputmode="numeric"], #b3Cam input').first();
    if (!await inp.isVisible().catch(() => false)) { const t = P.locator('#b3Cam').getByText(/Type the number|Nummer eingeben|Escribe el n|Nummer tippen|número/i).first(); if (await t.count()) { await R.tapEl(t).catch(() => { }); await H.sleep(500); } }
    await inp.tap().catch(() => { }); await inp.fill('').catch(() => { }); await P.keyboard.type(code, { delay: 25 });
    const btn = P.locator('#b3Cam button').filter({ hasText: /^(Check|Prüfen|Comprobar)/i }).first();
    if (await btn.count()) await R.tapEl(btn).catch(() => { }); else await P.keyboard.press('Enter');
    await H.sleep(7000);
  };
  // 1) the grapes barcode: name only from Open Food Facts
  const e0 = R.errs.length;
  if (await openScan()) { await P.evaluate(() => { window.__nv = []; }); await typeCode('8033803727241'); await check('grapes barcode', { verd: 'spike', est: true, nodata: true, swap: true, anim: true }); }
  else await find('cannot open scan', {});
  // 2) typed names in the Scan sheet's name field
  for (const [q, v] of [['Trauben', 'spike'], ['Erdbeere', 'ok']]) {
    await reset(); await P.evaluate(() => { try { goTab('scan'); } catch (e) { } }); await H.sleep(1500);
    await P.evaluate(() => { window.__nv = []; });
    const f = P.locator('#b3Name').first();
    if (!await f.count()) { await find('no name field', { q }); continue; }
    await f.tap().catch(() => { }); await f.fill(''); await P.keyboard.type(q, { delay: 30 }); await P.keyboard.press('Enter'); await H.sleep(2500);
    const go = P.locator('[data-b3="nesearch"]').first();
    if (!await go.count()) { await find('no Show the analysis button', { q }); continue; }
    await R.tapEl(go).catch(() => { }); await H.sleep(5500);
    await check('typed ' + q, { verd: v, est: true, nodata: true, swap: true, anim: true });
  }
  // 3) an unknown store code (no name): the name box, live chip, Analyze by name
  if (await openScan()) {
    await typeCode('2123456789012'); await H.sleep(1000);
    const n = P.locator('#b3MName').first();
    if (await n.count()) {
      await n.tap().catch(() => { }); await n.fill(''); await P.keyboard.type('Erdbeeren', { delay: 30 }); await H.sleep(900);
      await check('store code + typed Erdbeeren (live)', { chip: true });
      await P.evaluate(() => { window.__nv = []; });
      const b = P.locator('.ne-by[data-b3="nebyname"]').first(); await R.tapEl(b).catch(() => { }); await H.sleep(5500);
      await check('store code -> Analyze by name', { verd: 'ok', est: true, nodata: true, anim: true });
    } else await find('no name box for an unknown store code', { text: (await state()).text.slice(0, 300) });
  }
  if (R.errs.length > e0) await find('page errors', { errs: R.errs.slice(e0, e0 + 6) });
  fs.writeFileSync(path.join(out, tag + '.json'), JSON.stringify(res, null, 2));
  console.log(`DONE ${tag} build=${res.build} cases=${res.cases.length} finds=${res.finds.length}`);
  await R.close();
  process.exit(res.finds.length ? 2 : 0);
})().catch(e => { console.error(e); process.exit(1); });
