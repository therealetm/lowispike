#!/usr/bin/env node
/* item 32 probe: before/after pictures of the brand palette and the real Scan fill flow.
   node tools/brand-palette/shots.cjs <repo root> <out prefix> [view=chromium390] [--scan]
   Home ring: the Water, Move, Fuel and Sleep fill heights are pinned by a test stylesheet (same levels before and after) so the
   colours can be compared; the Gap runs from a seeded fast (2 h of 16 h, then 17 h = goal reached). With --scan the Scan fill comes
   from the real scanner: typed barcodes through the app's own found(), Open Food Facts answered by a local stub. */
'use strict';
const fs = require('fs'), path = require('path');
const L = require('./lib.cjs');
const ROOT = path.resolve(process.argv[2]), OUT = process.argv[3], VIEW = process.argv[4] && !process.argv[4].startsWith('--') ? process.argv[4] : 'chromium390', SCAN = process.argv.includes('--scan');
const ean = s12 => { let t = 0; for (let i = 0; i < 12; i++) t += (+s12[i]) * (i % 2 ? 3 : 1); return s12 + ((10 - t % 10) % 10); };
const CODES = { a: ean('400604000123'), b: ean('400000000001'), nf: ean('400000000002'), err: ean('400000000003') };
const PIN = `#whHud .wh-water .wh-cell-fill{height:34% !important}#whHud .wh-move .wh-cell-fill{height:30% !important}#whHud .wh-meals .wh-cell-fill{height:38% !important}#whHud .o8-sleep .wh-cell-fill{height:28% !important}`;
const R = { root: ROOT, view: VIEW, codes: CODES, steps: [] };
const sleep = L.sleep;
(async () => {
    const srv = await L.serve(ROOT); const url = 'http://127.0.0.1:' + srv.address().port + '/index.html';
    const seedFast = h => `try{if(!localStorage.getItem('lowi_fast_v1'))localStorage.setItem('lowi_fast_v1', JSON.stringify({last: Date.now() - ${h} * 3600000, target: 16}))}catch(e){}`;
    const h = await L.open({ view: VIEW, url, preInit: seedFast(2), settle: 9000 });
    const p = h.page;
    await p.route(/openfoodfacts\.org/, r => {
        const u = r.request().url();
        if (u.includes(CODES.a)) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 1, product: { product_name: 'Haferflocken zart', brands: 'Probe', nutriments: { carbohydrates_100g: 58, sugars_100g: 1.2, fiber_100g: 10, proteins_100g: 13.5, fat_100g: 7 }, categories_tags: ['en:cereals'] } }) });
        if (u.includes(CODES.b)) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 1, product: { product_name: 'Naturjoghurt', brands: 'Probe', nutriments: { carbohydrates_100g: 4.6, sugars_100g: 4.6, proteins_100g: 4.1, fat_100g: 3.8 }, categories_tags: ['en:yogurts'] } }) });
        if (u.includes(CODES.nf)) return r.fulfill({ status: 404, body: '' });
        return r.abort();
    });
    const pin = () => p.addStyleTag({ content: PIN });
    const home = async () => { await p.evaluate(() => { try { goTab('today'); } catch (e) { } try { window.LowiWorldHome && LowiWorldHome.zoomIn && LowiWorldHome.zoomIn(); } catch (e) { } }); await sleep(3500); };
    const info = () => p.evaluate(() => {
        const q = s => document.querySelector(s), cs = e => e ? getComputedStyle(e).backgroundImage : null;
        const sc = q('#whHud .o8-scan'), sf = sc && sc.querySelector('.wh-cell-fill');
        return { brand: !!window.LowiBrand, scanFill: window.LowiScanFill ? { today: LowiScanFill.today(), level: LowiScanFill.level() } : null,
            scanCell: sc ? { fillH: sf ? Math.round(sf.offsetHeight / sc.offsetHeight * 100) : null, val: (sc.querySelector('.o8-val') || {}).textContent || '', bg: cs(sf) } : null,
            settingsFill: !!q('#whHud .o8-settings .wh-cell-fill'), joyFill: !!q('#whHud .o8-joy .wh-cell-fill'),
            fills: ['.wh-water', '.wh-move', '.wh-meals', '.o8-sleep'].map(s => [s, cs(q('#whHud ' + s + ' .wh-cell-fill'))]),
            rects: Object.fromEntries([['water', '#whHud .wh-water'], ['move', '#whHud .wh-move'], ['fuel', '#whHud .wh-meals'], ['sleep', '#whHud .o8-sleep'], ['scan', '#whHud .o8-scan'], ['settings', '#whHud .o8-settings'], ['joy', '#whHud .o8-joy'], ['gap', '#spFast']].map(([k, s]) => { const e = q(s); if (!e) return [k, null]; const r = e.getBoundingClientRect(); return [k, [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]]; })),
            fast: window.LowiFastBubble && LowiFastBubble.state ? LowiFastBubble.state() : null, err: (window.__bh || {}).err };
    });
    await home(); await pin(); await sleep(2500);
    await p.screenshot({ path: OUT + '-home-gap-running.png' });
    R.steps.push({ step: 'home-gap-running', info: await info() });
    if (SCAN) {
        /* the scanner's functions are private (an IIFE in index.html): drive it through its own buttons, as a tap would */
        const press = what => p.evaluate(w => { const b = document.createElement('button'); b.dataset.b3 = w; b.style.display = 'none'; document.body.appendChild(b); b.click(); b.remove(); }, what);
        const closeAll = () => p.evaluate(() => { const x = document.querySelector('[data-b3="camclose"]'); if (x) x.click(); for (let i = 0; i < 4; i++) { try { window.LowiR2 && LowiR2.close && LowiR2.close(); } catch (e) { } } document.querySelectorAll('.r2-ov').forEach(o => o.remove()); });
        const scan = async code => {
            await press('typebc'); await sleep(1200);
            const open = await p.evaluate(() => !!document.querySelector('#b3Bc'));
            if (!open) return { open };
            await p.fill('#b3Bc', code); await p.press('#b3Bc', 'Enter');
            await sleep(5000);
            const msg = await p.evaluate(() => ({ text: (document.querySelector('.b3-cam') || document.body).innerText.replace(/\s+/g, ' ').slice(0, 160), overlays: [...document.querySelectorAll('.r2-ov')].map(o => o.innerText.replace(/\s+/g, ' ').slice(0, 120)) }));
            await closeAll(); await sleep(1200);
            return Object.assign({ open }, msg);
        };
        const count = () => p.evaluate(() => LowiScanFill.today());
        const step = async (name, fn) => { const before = await count(); let extra = null; try { extra = await fn(); } catch (e) { extra = { error: String(e).slice(0, 200) }; } const after = await count(); R.steps.push({ step: name, before, after, extra, raw: await p.evaluate(() => localStorage.getItem('lowi.scan.fill.v1')) }); console.log(JSON.stringify(R.steps[R.steps.length - 1])); fs.writeFileSync(OUT + '.json', JSON.stringify(R, null, 1)); };
        await step('cancel: open the scanner and close it', async () => { await press('scan'); await sleep(2000); const o = await p.evaluate(() => !!document.querySelector('[data-b3="camclose"]')); await closeAll(); await sleep(800); return { scannerOpened: o }; });
        await step('not found (Open Food Facts 404)', () => scan(CODES.nf));
        await step('lookup failed (network error)', () => scan(CODES.err));
        await step('invalid code typed', async () => { await press('typebc'); await sleep(1000); await p.fill('#b3Bc', '1234'); await p.press('#b3Bc', 'Enter'); await sleep(1500); const t = await p.evaluate(() => (document.querySelector('.b3-cam') || document.body).innerText.replace(/\s+/g, ' ').slice(0, 120)); await closeAll(); await sleep(600); return { text: t }; });
        await step('found: oats', () => scan(CODES.a));
        await step('found: oats again (same product)', () => scan(CODES.a));
        await step('found: yoghurt', () => scan(CODES.b));
        await home(); await pin(); await sleep(2500);
        await p.screenshot({ path: OUT + '-home-scan-2.png' });
        R.steps.push({ step: 'home-after-scans', info: await info() });
        await p.reload({ waitUntil: 'load' }); await p.waitForFunction(() => typeof window.goTab === 'function', null, { timeout: 90000 }); await sleep(9000);
        R.steps.push({ step: 'after reload (kept for today)', info: await info() });
        await p.evaluate(() => { const k = 'lowi.scan.fill.v1', s = JSON.parse(localStorage.getItem(k) || '{"days":{}}'); if (!Object.keys(s.days).length) return; const d = Object.keys(s.days)[0]; s.days['2000-01-01'] = s.days[d]; delete s.days[d]; localStorage.setItem(k, JSON.stringify(s)); });
        await sleep(2500);
        R.steps.push({ step: 'next day (the count moved to another day)', info: await info() });
    }
    /* goal reached: 17 h of 16 */
    await p.evaluate(() => { localStorage.setItem('lowi_fast_v1', JSON.stringify({ last: Date.now() - 17 * 3600000, target: 16 })); });
    await p.reload({ waitUntil: 'load' }); await p.waitForFunction(() => typeof window.goTab === 'function', null, { timeout: 90000 }); await sleep(9000);
    await home(); await pin(); await sleep(2500);
    await p.screenshot({ path: OUT + '-home-gap-done.png' });
    R.steps.push({ step: 'home-gap-done', info: await info() });
    /* the galaxy: Home zoomed all the way out */
    await p.evaluate(() => { try { LowiWorldHome.toggleZoom(); } catch (e) { window.__zErr = String(e); } });
    await sleep(6000);
    await p.screenshot({ path: OUT + '-galaxy.png' });
    R.steps.push({ step: 'galaxy', zoomErr: await p.evaluate(() => window.__zErr || ''), where: await p.evaluate(() => ({ cls: document.documentElement.className.split(/\s+/).filter(c => /gal|zoom|cosmos|comm/.test(c)) })) });
    R.log = h.log;
    fs.writeFileSync(OUT + '.json', JSON.stringify(R, null, 1));
    await h.browser.close(); srv.close();
    console.log(JSON.stringify(R.steps.map(s => [s.step, s.before, s.after, s.info && s.info.scanFill, s.info && s.info.scanCell && s.info.scanCell.fillH, s.info && s.info.scanCell && s.info.scanCell.val])));
    console.log('errors', JSON.stringify(h.log).slice(0, 800));
})().catch(e => { console.error('PROBE FAIL', e); process.exit(1); });
