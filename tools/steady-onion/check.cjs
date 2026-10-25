'use strict';
/* Oct 25 2026 browser check (Emmanuel, steady-onion task):
   1) a shared meal's details (Lower impact) show the scanner's words and no "blood sugar should stay steady" promise; the label fits
   2) typed "caramelized onions" (DE karamellisierte Zwiebeln, ES cebolla caramelizada): a good pick, no coated-nuts reason
   3) typed real coated nuts (candied pecans / gebrannte Mandeln / nueces caramelizadas) still give Skip it
   node tools/steady-onion/check.cjs <device> [url|root] [outdir] [lang]   ENG=webkit|chromium */
const H = require('../sim/harness.cjs'), fs = require('fs'), path = require('path');
(async () => {
  const device = process.argv[2] || 'iPhone 13', where = process.argv[3] || path.join(__dirname, '..', '..');
  const out = process.argv[4] || '/tmp/check-steady-onion', lang = process.argv[5] || 'en';
  fs.mkdirSync(out, { recursive: true });
  const o = { device, engine: process.env.ENG || 'webkit', members: 6, messages: 6, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page, tag = (process.env.ENG || 'webkit') + '-' + device.replace(/\W/g, '') + '-' + lang;
  await R.ctx.route(u => /(^|\.)openfoodfacts\.org$/.test(new URL(u).host), r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 0, products: [] }) }));
  await R.ctx.addInitScript(l => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, lang);
  await R.goto(); await H.sleep(5000);
  const res = { device, lang, engine: o.engine, build: await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || null), cases: [], finds: [] };
  const find = async (kind, info) => { const f = path.join(out, tag + '-find-' + res.finds.length + '.png'); await R.shot(f); res.finds.push(Object.assign({ kind, shot: f }, info)); console.log('FIND', kind, JSON.stringify(info).slice(0, 300)); };
  const reset = async () => { for (let i = 0; i < 3; i++) { await P.keyboard.press('Escape').catch(() => { }); await H.sleep(100); } await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } try { goTab('home'); } catch (e) { } }); await H.sleep(600); };
  const PROMISE = /stay steady|should stay|ruhig bleiben|sollte|mantenerse estable|deber[ií]a|not a spike|kein Spike|no un pico/i;
  const L = {
    en: { low: 'Lower impact', why: 'About 6 g net carbs.', onion: 'caramelized onions', nut: 'candied pecans', nutRe: /nut/i },
    de: { low: 'Niedrigere Wirkung', why: 'Etwa 6 g Netto-Kohlenhydrate.', onion: 'karamellisierte Zwiebeln', nut: 'gebrannte Mandeln', nutRe: /Nüss|Nuss|Mandel/i },
    es: { low: 'Impacto bajo', why: 'Unos 6 g de carbohidratos netos.', onion: 'cebolla caramelizada', nut: 'nueces caramelizadas', nutRe: /frutos secos|nuec/i }
  }[lang];
  const e0 = R.errs.length;

  // 1) shared meal details
  await reset();
  await P.evaluate(l => { LowiMealDetail.open({ name: 'Salmon bowl', lvl: 'low', bs: 'low', net: 6, total: { carbs: 9, fiber: 3, kcal: 420, protein: 32, fat: 18 }, items: [{ name: 'Salmon', g: 150, v: 'JA' }, { name: 'Spinach', g: 80, v: 'JA' }] }, { by: 'Antje', l }); }, lang);
  await H.sleep(1200);
  const md = await P.evaluate(() => {
    const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
    const s = [...document.querySelectorAll('.md-sheet')].filter(vis).pop();
    if (!s) return null;
    const lv = s.querySelector('.md-lv'), r = lv && lv.getBoundingClientRect();
    const cut = [...s.querySelectorAll('span,p,b,h3,h4,small')].filter(e => vis(e) && e.children.length === 0 && e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflow === 'hidden').map(e => e.textContent.slice(0, 40));
    return { text: s.innerText.replace(/\s+/g, ' ').trim(), label: lv ? lv.innerText.trim() : '', labelRight: r ? Math.round(r.right) : 0, w: innerWidth, cut, overflow: document.documentElement.scrollWidth - innerWidth };
  });
  await R.shot(path.join(out, tag + '-meal-details.png'));
  console.log('CASE meal details:', md && md.label, '::', md && md.text.slice(0, 220));
  res.cases.push(Object.assign({ what: 'meal details' }, md));
  if (!md) await find('meal details did not open', {});
  else {
    if (md.label !== L.low) await find('wrong low label', { got: md.label });
    if (!md.text.includes(L.why)) await find('why line is not the scanner line', { text: md.text.slice(0, 200) });
    if (PROMISE.test(md.text)) await find('blood sugar promise on meal details', { text: md.text.slice(0, 300) });
    if (md.labelRight > md.w - 4 || md.cut.length || md.overflow > 2) await find('meal details label does not fit', { right: md.labelRight, cut: md.cut, overflow: md.overflow });
  }

  // 2/3) typed names in the scanner
  const openScan = async () => { await reset(); await P.evaluate(() => { try { LowiDex.scan(); } catch (e) { } }); await H.sleep(1500); return P.evaluate(() => !!document.querySelector('#b3Cam')); };
  const typeName = async q => {
    const f = P.locator('#b3Cam #b3Nm').first();
    if (!await f.count() || !await f.isVisible().catch(() => false)) { await find('no name field in the camera', { q }); return false; }
    await f.tap().catch(() => { }); await f.fill(''); await P.keyboard.type(q, { delay: 30 }); await H.sleep(900);
    await P.keyboard.press('Enter'); await H.sleep(6500); return true;
  };
  const verdict = () => P.evaluate(() => {
    const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
    const top = [...document.querySelectorAll('.r2-ov:not(.off)')].filter(vis).pop() || document.body, v = top.querySelector('.sc-verd');
    return { verd: v ? v.className : '', verdTxt: v ? v.innerText.replace(/\s+/g, ' ') : '', text: (top.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 700), overflow: document.documentElement.scrollWidth - innerWidth };
  });
  if (await openScan() && await typeName(L.onion)) {
    const s = await verdict(); await R.shot(path.join(out, tag + '-onion.png'));
    console.log(`CASE ${L.onion}: verd=${s.verd} "${s.verdTxt.slice(0, 80)}"`); res.cases.push(Object.assign({ what: L.onion }, s));
    if (!s.verd.includes('v-ok')) await find('caramelized onions are not a good pick', { got: s.verd, txt: s.verdTxt });
    if (L.nutRe.test(s.verdTxt)) await find('caramelized onions still get a nut reason', { txt: s.verdTxt });
    if (PROMISE.test(s.text)) await find('blood sugar promise on the scan result', { text: s.text.slice(0, 200) });
  } else await find('cannot open scan', {});
  if (await openScan() && await typeName(L.nut)) {
    const s = await verdict(); await R.shot(path.join(out, tag + '-coated-nuts.png'));
    console.log(`CASE ${L.nut}: verd=${s.verd} "${s.verdTxt.slice(0, 80)}"`); res.cases.push(Object.assign({ what: L.nut }, s));
    if (!s.verd.includes('v-spike')) await find('real coated nuts lost their Skip it', { got: s.verd, txt: s.verdTxt });
  }
  if (R.errs.length > e0) await find('page errors', { errs: R.errs.slice(e0, e0 + 6) });
  fs.writeFileSync(path.join(out, tag + '.json'), JSON.stringify(res, null, 2));
  console.log(`DONE ${tag} build=${res.build} cases=${res.cases.length} finds=${res.finds.length}`);
  await R.close();
  process.exit(res.finds.length ? 2 : 0);
})().catch(e => { console.error(e); process.exit(1); });
