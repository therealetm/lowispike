#!/usr/bin/env node
/* Fly-in sync probe (Oct 24 2026, fly-in crash hunt). Emmanuel: "I tried to fly into a world and it crashed" (he uses an iPhone and
   an iPad on one account). This plays the second device: a fake cloud copy (user_state) that another device writes to while this
   page flies the companion into a world. On builds before the fix, arriving in a world writes the guide's memory
   (lowi.guides.v1), the backup a few seconds later sees the other device's write, merges it and reloads the whole page, which looks
   exactly like a crash. With the fix the page must not reload mid-use; the merge waits for the next time the app comes back to the
   front (and then reloads once, as before, with the "Up to date with your other device" note).
   Usage: node tools/fly-in-sync-probe.cjs [url|root] [--engine chromium|webkit] [--device 'iPhone 13'] [--size 820x1180]
   Simulated browsers only; nothing reaches the real cloud. Exit code 1 when the page reloaded during or after the fly-in. */
'use strict';
const fs = require('fs'), path = require('path');
const H = require('./sim/harness.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true) : d; };
const where = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'https://therealetm.github.io/lowispike/index.html';
const SIZE = String(arg('size', '')).match(/^(\d+)x(\d+)$/);
const WORLD = arg('world', 'gut');
(async () => {
    const o = { engine: arg('engine', 'chromium'), device: arg('device', 'iPhone 13') };
    if (/^https?:/.test(where)) o.url = where; else o.root = where;
    if (SIZE) o.viewport = { width: +SIZE[1], height: +SIZE[2] }, o.dpr = 2;
    const R = await H.open(o), P = R.page, errs = [], log = [];
    if (o.engine === 'webkit') await R.ctx.addInitScript({ content: fs.readFileSync(path.join(__dirname, 'sim', 'no-media-init.js'), 'utf8') });
    /* the fake cloud copy: one row, like Supabase's user_state */
    const CLOUD = { row: null, gets: 0, puts: 0 };
    await R.ctx.route(u => /\/rest\/v1\/user_state/.test(u), async route => {
        const q = route.request(), u = new URL(q.url()), m = q.method();
        const hdr = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': '*' };
        if (m === 'OPTIONS') return route.fulfill({ status: 204, headers: Object.assign({ 'access-control-allow-methods': '*' }, hdr) });
        if (m === 'GET' || m === 'HEAD') {
            CLOUD.gets++;
            const sel = u.searchParams.get('select') || '*', obj = /vnd\.pgrst\.object/.test(q.headers()['accept'] || '');
            const row = CLOUD.row && (sel === 'updated_at' ? { updated_at: CLOUD.row.updated_at } : { data: CLOUD.row.data, updated_at: CLOUD.row.updated_at });
            if (obj) return row ? route.fulfill({ status: 200, contentType: 'application/json', headers: hdr, body: JSON.stringify(row) }) : route.fulfill({ status: 406, contentType: 'application/json', headers: hdr, body: JSON.stringify({ code: 'PGRST116', message: 'no rows' }) });
            return route.fulfill({ status: 200, contentType: 'application/json', headers: hdr, body: JSON.stringify(row ? [row] : []) });
        }
        let b = null; try { b = q.postDataJSON(); } catch (e) { }
        b = Array.isArray(b) ? b[0] : b;
        if (b && b.data) { CLOUD.row = { data: b.data, updated_at: b.updated_at || new Date().toISOString() }; CLOUD.puts++; }
        return route.fulfill({ status: 201, contentType: 'application/json', headers: hdr, body: '[]' });
    });
    let loads = 0; P.on('load', () => { loads++; log.push('page load #' + loads + ' at ' + new Date().toISOString().slice(11, 19)); });
    P.on('pageerror', e => errs.push(String(e && e.message || e).slice(0, 200)));
    P.on('crash', () => errs.push('PAGE CRASHED'));
    const ev = (fn, a) => P.evaluate(fn, a).catch(e => ({ evalErr: String(e.message).slice(0, 160) }));
    const ready = async () => { for (let i = 0; i < 120; i++) { const r = await ev(() => !!(window.LowiWorld3D && window.LowiWorld3D.renderer && window.LowiWorldRegions && window.LOWI_CLOUD_X && window.LOWI_CLOUD_X.state().live)); if (r === true) return true; await H.sleep(500); } return false; };
    let verdict = 'unknown', code = 0;
    try {
        await R.goto();
        log.push('ready: ' + await ready());
        for (let i = 0; i < 40 && !CLOUD.row; i++) await H.sleep(500);   /* the open sync puts this device's first copy up */
        await H.sleep(2500);
        log.push('first copy in the cloud: ' + !!CLOUD.row + ', sync log ' + JSON.stringify(await ev(() => window.__lowiSyncLog || [])));
        if (!CLOUD.row) throw new Error('the open sync never reached the fake cloud');
        const before = loads;
        /* the other device writes something (its own new key, so the merge must bring it here) */
        CLOUD.row = { data: Object.assign({}, CLOUD.row.data, { 'lowispike.zzprobe.other.v1': JSON.stringify({ from: 'ipad', at: Date.now() }) }), updated_at: new Date(Date.now() + 1000).toISOString() };
        log.push('other device wrote at ' + new Date().toISOString().slice(11, 19));
        await ev(() => { const S = window.LowiSun; if (S && S.energyNow && !S.__full) { const was = S.energyNow; S.__full = 1; S.energyNow = () => Object.assign({}, was(), { value: 1, tier: 'thriving', canTravel: true }); } });
        const t0 = Date.now();
        log.push('fly into ' + WORLD + ': ' + JSON.stringify(await ev(w => window.LowiWorldRegions.travel(w), WORLD)));
        let arrived = 0;
        for (let i = 0; i < 160 && loads === before; i++) {
            await H.sleep(250);
            const s = await ev(() => ({ c: window.LowiWorldRegions.state.cur, b: !!window.LowiWorldRegions.state.busy }));
            if (!arrived && s.c === WORLD && !s.b) { arrived = Date.now(); log.push('arrived in ' + WORLD + ' after ' + (arrived - t0) + 'ms'); }
            if (arrived && Date.now() - arrived > 15000) break;
        }
        const midUse = loads > before;
        log.push('during the fly-in and 15 s after: ' + (midUse ? 'PAGE RELOADED ' + Math.round((Date.now() - (arrived || t0)) / 1000) + ' s after ' + (arrived ? 'arriving' : 'starting') : 'no reload') + ', cloud gets ' + CLOUD.gets + ' puts ' + CLOUD.puts);
        if (!midUse) log.push('still in ' + JSON.stringify(await ev(() => window.LowiWorldRegions.state.cur)) + ', sync log ' + JSON.stringify(await ev(() => window.__lowiSyncLog || [])));
        /* coming back to the front: the merge now happens (one reload by design) */
        let resumed = null;
        if (!midUse) {
            await ev(() => document.dispatchEvent(new Event('visibilitychange')));
            for (let i = 0; i < 40 && loads === before; i++) await H.sleep(250);
            await H.sleep(4000); await ready(); await H.sleep(1500);
            resumed = await ev(() => ({ merged: localStorage.getItem('lowispike.zzprobe.other.v1') !== null, note: window.__lowiSyncNote || '' }));
            log.push('after coming back to the front: reloads ' + (loads - before) + ', other device data here: ' + resumed.merged + ', note: "' + resumed.note + '"');
        }
        verdict = midUse ? 'RELOAD MID-USE (the fly-in "crash")' : (resumed && resumed.merged ? 'no reload mid-use; merged on coming back' : 'no reload mid-use, but the other device data never arrived');
        code = midUse || !(resumed && resumed.merged) ? 1 : 0;
    } catch (e) { errs.push('stopped: ' + e.message); code = 2; }
    log.forEach(l => console.log(l));
    console.log('errors', JSON.stringify(errs.slice(0, 8)));
    console.log('VERDICT ' + o.engine + ' ' + (SIZE ? SIZE[0] : o.device) + ': ' + verdict);
    try { await R.close(); } catch (e) { }
    process.exit(code);
})();
