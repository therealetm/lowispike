'use strict';
/* Oct 25 browser check (Emmanuel): the scan result is minimal.
   1) typed "honey almonds" (DE Honigmandeln, ES almendras con miel): one answer "Skip it" + plain almonds as the alternative
   2) typed "nuts" (DE Nüsse, ES nueces): good pick, no swap box, no empty scan box
   3) an unknown store code: online the next step is "Photo of the pack", no sugar / syrup ticks
   STAGE=2 adds: 4) the result's primary "Add to kitchen" puts the food into Kitchen > At home; 5) the alternative card has its own
   "Add to kitchen" and "+ Shopping cart" (existing shopping list), estimated prices only, marked as estimates.
   node tools/scan-kitchen/check.cjs <device> [url|root] [outdir] [lang]   ENG=webkit|chromium */
const H = require('../sim/harness.cjs'), fs = require('fs'), path = require('path');
(async () => {
  const device = process.argv[2] || 'iPhone 13', where = process.argv[3] || path.join(__dirname, '..', '..');
  const out = process.argv[4] || '/tmp/check-scan-kitchen', lang = process.argv[5] || 'en', stage = +(process.env.STAGE || 1);
  fs.mkdirSync(out, { recursive: true });
  const o = { device, engine: process.env.ENG || 'webkit', members: 6, messages: 6, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page, tag = (process.env.ENG || 'webkit') + '-' + device.replace(/\W/g, '') + '-' + lang;
  await R.ctx.route(u => /(^|\.)openfoodfacts\.org$/.test(new URL(u).host), r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 0, products: [] }) }));
  await R.ctx.addInitScript(l => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, lang);
  await R.goto(); await H.sleep(5000);
  const res = { device, lang, engine: o.engine, build: await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || null), cases: [], finds: [] };
  const find = async (kind, info) => { const f = path.join(out, tag + '-find-' + res.finds.length + '.png'); await R.shot(f); res.finds.push(Object.assign({ kind, shot: f }, info)); console.log('FIND', kind, JSON.stringify(info).slice(0, 300)); };
  const reset = async () => { for (let i = 0; i < 3; i++) { await P.keyboard.press('Escape').catch(() => { }); await H.sleep(100); } await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } try { goTab('home'); } catch (e) { } }); await H.sleep(600); };
  const openScan = async () => { await reset(); await P.evaluate(() => { try { LowiDex.scan(); } catch (e) { } }); await H.sleep(1500); return P.evaluate(() => !!document.querySelector('#b3Cam')); };
  const state = () => P.evaluate(() => {
    const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
    const top = [...document.querySelectorAll('.r2-ov:not(.off)')].filter(vis).pop() || document.body;
    const wide = [...top.querySelectorAll('*')].filter(e => vis(e) && e.getBoundingClientRect().right > innerWidth + 2 && getComputedStyle(e).position !== 'fixed' && !e.closest('.hscroll')).slice(0, 3).map(e => e.tagName + '#' + e.id + '.' + e.className + '<' + (e.parentElement && e.parentElement.className) + ':' + Math.round(e.getBoundingClientRect().right));
    const cut = [...top.querySelectorAll('button,b,small,span,p,h3,h4,strong')].filter(e => vis(e) && e.children.length === 0 && e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflow === 'hidden' && getComputedStyle(e).textOverflow !== 'ellipsis').slice(0, 3).map(e => e.textContent.slice(0, 40));
    const v = top.querySelector('.sc-verd'), q = s => top.querySelector(s);
    return { text: (top.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 900), verd: v ? v.className : '', verdTxt: v ? v.innerText.replace(/\s+/g, ' ') : '',
      swap: (q('.ne-swap') || {}).innerText || '', nodata: !!q('.ne-nodata'), snap: !!q('#b3NfSnap'), ticks: !!q('.b3-ticks'), how: /How sure|Wie sicher|Seguridad/.test(top.innerText || ''),
      kit: !!q('[data-sk="kit"]'), alt: !!q('.sk-alt'), altKit: !!q('.sk-alt [data-sk="altkit"]'), altCart: !!q('.sk-alt [data-sk="altcart"]'), altImg: !!q('.sk-alt img, .sk-alt .sk-pic'), est: (q('.sk-alt .sk-est') || {}).innerText || '',
      wide, cut, overflow: document.documentElement.scrollWidth - innerWidth };
  });
  const check = async (what, want) => {
    const s = await state();
    console.log(`CASE ${what}: verd=${s.verd} "${s.verdTxt.slice(0, 60)}" swap="${s.swap.replace(/\s+/g, ' ').slice(0, 60)}" snap=${s.snap} ticks=${s.ticks} kit=${s.kit} alt=${s.alt} :: ${s.text.slice(0, 200)}`);
    await R.shot(path.join(out, tag + '-' + what.replace(/\W+/g, '_') + '.png'));
    res.cases.push(Object.assign({ what }, s));
    if (want.verd && !s.verd.includes('v-' + want.verd)) await find('wrong verdict', { what, got: s.verd });
    if (want.swapRe && !want.swapRe.test(s.swap + ' ' + s.text)) await find('alternative is not the plain food', { what, swap: s.swap });
    if (want.noSwap && s.swap) await find('a good pick shows a swap box', { what, swap: s.swap });
    if (want.noSwap && s.nodata) await find('empty scan box on a typed name', { what });
    if (s.how) await find('"How sure" row is back', { what });
    if (want.snap && !s.snap) await find('no Photo of the pack', { what });
    if (want.snap && s.ticks) await find('sugar/syrup ticks shown online', { what });
    if (want.kit && !s.kit) await find('no Add to kitchen', { what });
    if (want.alt && !(s.alt && s.altKit && s.altCart)) await find('alternative card incomplete', { what, alt: s.alt, altKit: s.altKit, altCart: s.altCart });
    if (s.overflow > 2 || s.wide.length) await find('overflow', { what, wide: s.wide, px: s.overflow });
    if (s.cut.length) await find('cut off', { what, cut: s.cut });
    if (/undefined|NaN|\[object/.test(s.text)) await find('broken text', { what, text: s.text.slice(0, 200) });
    if (lang !== 'en' && /\b(Skip it|Add to kitchen|Shopping cart|Photo of the pack|Estimated prices|Best swap)\b/.test(s.text)) await find('english in ' + lang, { what });
    return s;
  };
  const typeName = async q => {
    const f = P.locator('#b3Cam #b3Nm').first();
    if (!await f.count() || !await f.isVisible().catch(() => false)) { await find('no name field in the camera', { q }); return false; }
    await f.tap().catch(() => { }); await f.fill(''); await P.keyboard.type(q, { delay: 30 }); await H.sleep(900);
    await P.keyboard.press('Enter'); await H.sleep(6500); return true;
  };
  const typeCode = async code => {
    const inp = P.locator('#b3Cam input[inputmode="numeric"], #b3Cam input').first();
    if (!await inp.isVisible().catch(() => false)) { const t = P.locator('#b3Cam').getByText(/Type the number|Nummer eingeben|Escribe el n|Nummer tippen|número/i).first(); if (await t.count()) { await R.tapEl(t).catch(() => { }); await H.sleep(500); } }
    await inp.tap().catch(() => { }); await inp.fill('').catch(() => { }); await P.keyboard.type(code, { delay: 25 });
    const btn = P.locator('#b3Cam button').filter({ hasText: /^(Check|Prüfen|Comprobar)/i }).first();
    if (await btn.count()) await R.tapEl(btn).catch(() => { }); else await P.keyboard.press('Enter');
    await H.sleep(8000);
  };
  const L = { en: ['honey almonds', 'nuts', /plain almonds/i], de: ['Honigmandeln', 'Nüsse', /Mandeln, natur/i], es: ['almendras con miel', 'nueces', /almendras al natural/i] }[lang];
  const e0 = R.errs.length;
  if (await openScan() && await typeName(L[0])) {
    const s = await check('typed ' + L[0], { verd: 'spike', swapRe: L[2], kit: stage >= 2, alt: stage >= 2 });
    if (stage >= 2) {
      const kitBefore = await P.evaluate(() => JSON.parse(localStorage.getItem('lowispike.kitchen.v1') || '{}'));
      const ab = P.locator('.sk-alt [data-sk="altkit"]').first();
      if (await ab.count()) { await R.tapEl(ab).catch(() => { }); await H.sleep(800); }
      const cb = P.locator('.sk-alt [data-sk="altcart"]').first();
      if (await cb.count()) { await R.tapEl(cb).catch(() => { }); await H.sleep(800); }
      const after = await P.evaluate(() => ({ k: localStorage.getItem('lowispike.kitchen.v1') || '', alt: (document.querySelector('.sk-alt') || {}).innerText || '' }));
      if (!L[2].test(after.k)) await find('alternative not in Kitchen At home after Add to kitchen', { k: after.k.slice(0, 200), before: JSON.stringify(kitBefore).slice(0, 80) });
      if (!/✓/.test(after.alt)) await find('no done tick on the alternative buttons', { alt: after.alt.slice(0, 120) });
      await R.shot(path.join(out, tag + '-alt-added.png'));
      res.cases.push({ what: 'alt added', kitchen: after.k.slice(0, 300), alt: after.alt.slice(0, 200) });
    }
  } else await find('cannot open scan', {});
  if (await openScan() && await typeName(L[1])) {
    await check('typed ' + L[1], { verd: 'ok', noSwap: true, kit: stage >= 2 });
    if (stage >= 2) {
      const kb = P.locator('[data-sk="kit"]').first();
      if (await kb.count()) { await R.tapEl(kb).catch(() => { }); await H.sleep(800); }
      const k = await P.evaluate(() => localStorage.getItem('lowispike.kitchen.v1') || '');
      if (!new RegExp(L[1], 'i').test(k)) await find('scanned food not in Kitchen At home after Add to kitchen', { k: k.slice(0, 200) });
      res.cases.push({ what: 'kit added', kitchen: k.slice(0, 300) });
    }
  }
  if (await openScan()) { await typeCode('2123456789010'); await check('unknown store code', { snap: true }); }
  if (R.errs.length > e0) await find('page errors', { errs: R.errs.slice(e0, e0 + 6) });
  fs.writeFileSync(path.join(out, tag + '.json'), JSON.stringify(res, null, 2));
  console.log(`DONE ${tag} build=${res.build} cases=${res.cases.length} finds=${res.finds.length}`);
  await R.close();
  process.exit(res.finds.length ? 2 : 0);
})().catch(e => { console.error(e); process.exit(1); });
