'use strict';
/* Oct 23 check (Eman, plantain chips 7862112310162: "I would like it so that they don't have to scroll down ... it's not a
   Pokémon ... a metabolic bubble catch ... they can only do this with insulin-friendly products"):
   1) an unknown barcode opens the "Not in any database yet" sheet: the whole sheet, the catch button and "Don't save"
      included, must fit on screen without scrolling;
   2) with the keyboard open on the name field, the main button stays above the keyboard;
   3) no Pokémon / Pokéball wording or icon anywhere on it;
   4) a spike food (plantain chips + Flour, rice, corn or potato) has no catch: verdict + skip + a better pick, nothing saved;
   5) a friendly food (Erdbeeren + None of these) catches with the bubble animation, saved only on the phone (manual = draft).
   node tools/check-nf-sheet.cjs <device> [root|url] [outdir] [lang] [--vp=WxH]  (chromium by default; --vp sets the screen size) */
const H = require('./sim/harness.cjs'), fs = require('fs'), path = require('path');
(async () => {
  const device = process.argv[2] || 'iPhone 13', where = process.argv[3] || path.join(__dirname, '..');
  const out = process.argv[4] || '/tmp/check-nf', lang = process.argv[5] || 'en';
  fs.mkdirSync(out, { recursive: true });
  const o = { device, engine: process.env.ENG || 'chromium', members: 6, messages: 6, probe: false, lang, keyboard: true }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page, vpa = (process.argv.find(a => /^--vp=\d+x\d+$/.test(a)) || '').slice(5), tag = device.replace(/\W/g, '') + (vpa ? '-' + vpa : '') + '-' + lang;
  if (vpa) { const [w, h] = vpa.split('x').map(Number); await P.setViewportSize({ width: w, height: h }); }
  await R.ctx.route(u => /(^|\.)openfoodfacts\.org$/.test(new URL(u).host), r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 0, products: [] }) }));
  await R.ctx.addInitScript(l => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, lang);
  R.step = 'load'; await R.goto(); await H.sleep(5000);
  const res = { device, lang, vp: P.viewportSize(), build: await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || null), cases: [], finds: [] };
  const find = async (kind, info) => { const f = path.join(out, tag + '-find-' + res.finds.length + '.png'); await R.shot(f); res.finds.push(Object.assign({ kind, shot: f }, info)); console.log('FIND', kind, JSON.stringify(info).slice(0, 400)); };
  const reset = async () => { for (let i = 0; i < 3; i++) { await P.keyboard.press('Escape').catch(() => { }); await H.sleep(100); } await P.evaluate(() => { try { document.activeElement && document.activeElement.blur(); } catch (e) { } try { LowiR2.closeAll(); } catch (e) { } try { goTab('home'); } catch (e) { } }); await H.sleep(700); };
  const openNF = async code => {
    await reset(); await P.evaluate(() => { try { LowiDex.scan(); } catch (e) { } }); await H.sleep(1500);
    if (!await P.evaluate(() => !!document.querySelector('#b3Cam'))) return false;
    const inp = P.locator('#b3Bc').first();
    if (!await inp.isVisible().catch(() => false)) { await P.evaluate(() => { const b = document.querySelector('[data-b3="camtype"]'); if (b) b.click(); }); await H.sleep(500); }
    await P.evaluate(c => { const i = document.querySelector('#b3Bc'), f = document.querySelector('#b3BcF'); if (i && f) { i.value = c; f.requestSubmit ? f.requestSubmit() : f.dispatchEvent(new Event('submit', { cancelable: true })); } }, code);
    await H.sleep(4500); await P.evaluate(() => { try { document.activeElement && document.activeElement.blur(); } catch (e) { } }); await H.sleep(700);
    return P.evaluate(() => !!document.querySelector('#b3MName'));
  };
  const fit = () => P.evaluate(() => {
    const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
    const top = [...document.querySelectorAll('.r2-ov:not(.off)')].filter(vis).pop() || document.body;
    const vv = window.visualViewport, vh = vv ? vv.height + vv.offsetTop : innerHeight;
    const scrollers = [top, ...top.querySelectorAll('*')].filter(e => { const s = getComputedStyle(e); return /(auto|scroll)/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 2 && vis(e); }).map(e => (e.id || e.className || e.tagName).toString().slice(0, 40) + ':' + (e.scrollHeight - e.clientHeight));
    const box = s => { const e = top.querySelector(s); if (!e || !vis(e)) return null; const r = e.getBoundingClientRect(); return { t: Math.round(r.top), b: Math.round(r.bottom), h: Math.round(r.height) }; };
    const txt = (top.innerText || '').replace(/\s+/g, ' ').trim();
    const wide = [...top.querySelectorAll('*')].filter(e => vis(e) && e.getBoundingClientRect().right > innerWidth + 2 && getComputedStyle(e).position !== 'fixed').slice(0, 3).map(e => e.className + ':' + Math.round(e.getBoundingClientRect().right));
    return { vh: Math.round(vh), ih: innerHeight, scrollers, main: box('#b3MCatch'), skip: box('.b3-man .b3-skip'), name: box('#b3MName'), title: box('.b3-man .b3-name'), text: txt.slice(0, 900), poke: /pok[eé]|ball/i.test(txt) || !!top.querySelector('.b3-pb'), wide };
  });
  const check = async (what, kb) => {
    const s = await fit(); res.cases.push(Object.assign({ what }, s));
    console.log(`CASE ${what}: vh=${s.vh} main=${JSON.stringify(s.main)} skip=${JSON.stringify(s.skip)} scrollers=${s.scrollers.join(',')} :: ${s.text.slice(0, 200)}`);
    await R.shot(path.join(out, tag + '-' + what.replace(/\W+/g, '_') + '.png'));
    if (!s.main) await find('no main button', { what });
    else if (s.main.b > s.vh + 1 || s.main.t < 0) await find('main button off screen', { what, main: s.main, vh: s.vh });
    if (!kb) { if (s.scrollers.length) await find('sheet scrolls', { what, scrollers: s.scrollers }); if (!s.skip || s.skip.b > s.vh + 1) await find("Don't save off screen", { what, skip: s.skip, vh: s.vh }); if (!s.title || s.title.t < 0) await find('title off screen', { what, title: s.title }); }
    if (s.poke) await find('pokemon wording or icon', { what });
    if (s.wide.length) await find('overflow', { what, wide: s.wide });
    if (/undefined|NaN|\[object/.test(s.text)) await find('broken text', { what });
    return s;
  };
  const writes = () => (R.sim && R.sim.writes ? R.sim.writes.filter(w => /products|product_catches/.test(w.table || w.path || '')).length : 0);
  // 1) + 2) + 3): the plantain chips barcode from Eman's screenshot
  if (await openNF('7862112310162')) {
    await check('sheet closed keyboard', false);
    await P.locator('#b3MName').first().tap().catch(() => { }); await H.sleep(900);
    await check('keyboard open on name', true);
    // 4) spike: plantain chips + the flour/rice/corn/potato tick
    await P.keyboard.type('Plantain chips', { delay: 20 }); await H.sleep(300);
    await P.evaluate(() => { try { document.activeElement && document.activeElement.blur(); } catch (e) { } }); await H.sleep(600);
    await R.tap('.b3-tick[data-k="carb"]'); await H.sleep(300);
    const w0 = writes(), m0 = await P.evaluate(() => { try { return Object.keys(JSON.parse(localStorage.getItem('lowi.dex.v1') || '{}').mine || {}).length; } catch (e) { return -1; } });
    await R.tap('#b3MCatch'); await H.sleep(2500);
    const sp = await P.evaluate(() => { const top = [...document.querySelectorAll('.r2-ov:not(.off)')].pop() || document.body; return { text: (top.innerText || '').replace(/\s+/g, ' ').slice(0, 500), bubble: !!top.querySelector('.bc-bubble,.b3-caught'), skip: !!top.querySelector('.b3-nocatch'), mine: (() => { try { return Object.keys(JSON.parse(localStorage.getItem('lowi.dex.v1') || '{}').mine || {}).length; } catch (e) { return -1; } })() }; });
    console.log('CASE spike:', JSON.stringify(sp).slice(0, 400)); await R.shot(path.join(out, tag + '-spike.png')); res.cases.push(Object.assign({ what: 'spike' }, sp));
    if (sp.bubble) await find('spike food was caught', sp);
    if (!sp.skip) await find('spike food: no verdict + skip block', sp);
    if (sp.mine !== m0) await find('spike food saved to the phone dex', { m0, m1: sp.mine });
    if (writes() !== w0) await find('spike food written to the shared database', {});
  } else await find('no not-found sheet', {});
  // 5) friendly: Erdbeeren + None of these
  if (await openNF('7862112310162')) {
    await P.locator('#b3MName').first().tap().catch(() => { }); await P.keyboard.type('Erdbeeren', { delay: 20 });
    await P.evaluate(() => { try { document.activeElement && document.activeElement.blur(); } catch (e) { } }); await H.sleep(600);
    await R.tap('.b3-tick[data-k="none"]'); await H.sleep(300);
    await R.tap('#b3MCatch'); await H.sleep(700);
    await R.shot(path.join(out, tag + '-catch-anim.png'));
    await H.sleep(2200);
    const ok = await P.evaluate(() => { const top = [...document.querySelectorAll('.r2-ov:not(.off)')].pop() || document.body; return { text: (top.innerText || '').replace(/\s+/g, ' ').slice(0, 400), caught: !!top.querySelector('.b3-caught'), anim: !!document.querySelector('.bc-fly,.bc-done') || !!top.querySelector('.b3-caught.bc') }; });
    console.log('CASE friendly:', JSON.stringify(ok).slice(0, 300)); await R.shot(path.join(out, tag + '-friendly.png')); res.cases.push(Object.assign({ what: 'friendly' }, ok));
    if (!ok.caught) await find('friendly food not caught', ok);
    if (/pok[eé]|ball/i.test(ok.text)) await find('pokemon wording after catch', ok);
  } else await find('no not-found sheet (2nd)', {});
  if (R.errs.length) await find('page errors', { errs: R.errs.slice(0, 6) });
  fs.writeFileSync(path.join(out, tag + '.json'), JSON.stringify(res, null, 2));
  console.log(`DONE ${tag} build=${res.build} vp=${JSON.stringify(res.vp)} finds=${res.finds.length}`);
  await R.close(); process.exit(res.finds.length ? 2 : 0);
})().catch(e => { console.error(e); process.exit(1); });
