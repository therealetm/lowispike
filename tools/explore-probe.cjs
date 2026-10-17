#!/usr/bin/env node
/* Diagnosis probe (Oct 18, explore camera): serves the repo, starts today's sun trip ("Out exploring") and samples
   Misty's on-screen height, flight state and camera distance. Usage: node tools/explore-probe.cjs [--engine webkit] [--secs 40] [--adv] */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true) : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..')));
const REGION = arg('region', ''); /* no trip: open this place (LowiWorld3D.flyTo) and let her join by herself */
const RECALL = +arg('recall-in', 0); /* seconds inside a world, then tap the timer (LowiSun.recall) */
const PRE = !!arg('preload', false), XP = +arg('xp', 900);
const ENGINE = arg('engine', 'chromium'), SECS = +arg('secs', 40), ADV = !!arg('adv', false), SHOT = arg('shot', '');
const pw = require(process.env.PW || '/tmp/pw/node_modules/playwright');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/json' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
    const srv = await new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(b); }); }); s.listen(0, '127.0.0.1', () => r(s)); });
    const url = `http://127.0.0.1:${srv.address().port}/index.html`;
    const browser = await pw[ENGINE].launch({ args: ENGINE === 'chromium' ? ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] : [] });
    const opts = ENGINE === 'webkit' ? Object.assign({}, pw.devices['iPhone 13'], { serviceWorkers: 'block' }) : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, serviceWorkers: 'block' };
    const ctx = await browser.newContext(opts);
    await ctx.addInitScript(o => { try { localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999'); const now = Date.now(); const st = { v: 2, setupDone: true, onboarded: true, user: { name: 'Probe', bday: '1990-01-01' }, xp: o.xp, ledger: [], logs: [], saved: [] }; if (o.pre) st.garden = { trips: { probe: { start: now - 60000, back: now + 3500000, item: 'dew', got: false, vigor: 'ok' } }, items: [] }; if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify(st)); } catch (e) { } }, { pre: PRE, xp: XP });
    await ctx.route(/supabase\.co|googleapis|gstatic|open-meteo|openfoodfacts/, r => r.abort());
    const page = await ctx.newPage(), errs = [];
    page.on('pageerror', e => errs.push(e.message.slice(0, 200)));
    await page.goto(url, { waitUntil: 'load', timeout: 90000 });
    await page.waitForFunction(() => typeof window.goTab === 'function' && window.LowiMistyFlight && window.LowiWorldHome, null, { timeout: 60000 });
    if (PRE) {
        await sleep(3000);
        await page.evaluate(() => { const st = LowiVitalsBridge.state(); const now = Date.now(); st.garden = st.garden || { trips: {}, items: [] }; st.garden.trips = st.garden.trips || {}; st.garden.trips.probe = { start: now - 60000, back: now + 3500000, item: 'dew', got: false, vigor: 'ok' }; LowiVitalsBridge.save(); });
        await page.reload({ waitUntil: 'load' });
        await page.waitForFunction(() => typeof window.goTab === 'function' && window.LowiMistyFlight && window.LowiWorldHome, null, { timeout: 60000 });
    }
    await sleep(6000);
    const start = REGION ? await page.evaluate(id => { const ok = LowiWorldRegions.travel(id); return { region: id, travel: String(ok) }; }, REGION) : PRE ? { pre: true } : await page.evaluate(adv => {
        const out = { vp: [innerWidth, innerHeight] };
        try { const dm = document.querySelector('#spBubble .tmg-plant'); if (dm) { const q = dm.getBoundingClientRect(); out.domMisty = [Math.round(q.width), Math.round(q.height)]; } } catch (e) { }
        if (window.__pre) { out.pre = true; return out; }
        if (adv) { out.started = !!(window.LowiAdventure && LowiAdventure.start()); return out; }
        /* today's sun trip as sun-meter.js would see it: Misty is away for the hour */
        const S0 = window.LowiSun, live0 = S0.live; const now = Date.now();
        const trip = { start: now, back: now + S0.AWAY_MS, item: 'dew', got: false, vigor: 'ok' };
        S0.live = function () { const v = live0.apply(this, arguments) || {}; return Object.assign({}, v, { away: trip }); };
        if (window.LowiMistyHints) { const h0 = LowiMistyHints.now; LowiMistyHints.now = () => Object.assign({}, h0 && h0() || {}, { canTravel: true }); }
        out.started = true; return out;
    }, ADV);
    if (PRE) start.preAway = await page.evaluate(() => !!(window.LowiSun && LowiSun.live && LowiSun.live().away));
    console.log('start', JSON.stringify(start));
    const rows = []; let inN = 0, recalled = false;
    for (let i = 0; i < SECS * 2; i++) {
        await sleep(500);
        const s = await page.evaluate(() => {
            const F = window.LowiMistyFlight, st = F.state(), sp = F.touchSpot(), WH = window.LowiWorldHome, r = WH.rig && (typeof WH.rig === 'function' ? WH.rig() : WH.rig);
            const ex = window.LowiMistyExplore && LowiMistyExplore.state ? LowiMistyExplore.state() : null;
            const pd = WH.state.pad, A = WH.state.adv; let wpx = null;
            try { const a = window.LowiWorld3D, w = A.wand; if (a && w && a.camera) { const p = w.position.clone(), q = p.clone().project(a.camera); const p2 = p.clone().add(new a.THREE.Vector3().setFromMatrixColumn(a.camera.matrixWorld, 1).normalize().multiplyScalar(w.scale.y)); const q2 = p2.project(a.camera); wpx = Math.round(Math.abs(q2.y - q.y) / 2 * innerHeight); } } catch (e) { }
            return { st: st.st, px: st.px, ks: st.ks, h: sp ? Math.round(sp.h) : null, wandPx: wpx, vis: !!(A.wand && A.wand.visible), op: A.wand ? +A.wand.material.opacity.toFixed(2) : 0, mode: pd.mode, away: A.away, dist: r ? +(+r.dist).toFixed(1) : null, ex: ex ? ex.ph : null, autoX: st.autoX, orb: st.orb, gx: st.gx, near: st.near, nearD: st.nearD, ap: st.ap, rd: window.LowiWorld3D && LowiWorld3D.rig ? null : null };
        });
        rows.push(s);
        if (RECALL && !recalled) { inN = s.st === 'inside' ? inN + 1 : 0; if (inN >= RECALL * 2) { recalled = true; console.log('RECALL', JSON.stringify(await page.evaluate(region => { if (region) { LowiMistyFlight.recall(); return { flightRecall: true }; } const r = LowiSun.recall({ force: true }); return { ok: r && r.ok, why: r && r.why }; }, REGION))); } }
        if (i % 2 === 0 || i < 12) console.log(((i + 1) / 2).toFixed(1).padStart(5) + 's', JSON.stringify(s));
        if (SHOT && (i === 5 || i === 20)) await page.screenshot({ path: SHOT + '-' + i + '.png' });
    }
    const hs = rows.map(r => r.h).filter(x => x != null);
    console.log('height px: min', Math.min(...hs), 'median', hs.sort((a, b) => a - b)[hs.length >> 1], 'max', Math.max(...hs), 'base', rows[rows.length - 1].px);
    console.log('errors', JSON.stringify(errs.slice(0, 5)));
    await browser.close(); srv.close();
})().catch(e => { console.error('PROBE FAILED', e); process.exit(1); });
