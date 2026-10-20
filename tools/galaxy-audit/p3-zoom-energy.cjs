'use strict';
/* galaxy-audit probe 3: Home -> pinch out (as many pinches as it takes) -> Community galaxy -> spread back to Home, x3,
   plus the zoom button route, plus energy joystick shots in the galaxy (drag+release, tiny drag, drag+cancel, 8 rapid shots).
   Chromium only (real two-finger touch via CDP). */
const L = require(process.env.GA_LIB || './lib.cjs'), G = require('./gest.cjs'), fs = require('fs');
(async () => {
    const view = process.argv[2] || 'chromium390'; const target = process.argv[3] || '/home/sprite/wt-galaxy-audit'; let srv = null, url = target;
    if (!/^https?:/.test(target)) { srv = await L.serve(target); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
    const h = await L.open({ view, url, settle: 9000 }); const p = h.page; const R = { steps: [] };
    const step = async (name, fn) => { const t = Date.now(); let res, err = null; try { res = await fn(); } catch (e) { err = String(e.message || e).slice(0, 300); }
        const s = await L.snap(h); const m = await G.metrics(h); const pe = h.log.pageerror.splice(0); const ce = h.log.console.splice(0).filter(x => !/ERR_FAILED|ERR_ABORTED|Failed to load resource|ERR_INTERNET|ERR_NAME|net::/.test(x));
        const row = { name, ms: Date.now() - t, res, err, pageerror: pe, consoleErr: ce.slice(0, 5), winErr: s.err, rej: s.rej, stalls: s.stalls.length ? [s.stalls.length, Math.max(...s.stalls)] : 0, m };
        R.steps.push(row); console.log(JSON.stringify(row).slice(0, 1600)); return res; };
    const where = () => p.evaluate(() => { const r = window.LowiWorldHome && LowiWorldHome.rig ? LowiWorldHome.rig() : null; return { tab: (document.querySelector('.tab.active') || {}).id, rig: r ? { mode: r.mode, dist: Math.round(r.dist), maxD: Math.round(r.maxD), outer: r.outer } : null, me: !!document.querySelector('#cgField .cg-body.me'), bodies: document.querySelectorAll('#cgField .cg-body').length, joy: !!document.getElementById('ceJoy') }; });
    /* pinch where the world canvas itself is under both fingers (not Misty or a bubble) */
    const pickC = async () => p.evaluate(() => { const ok = (x, y) => { const e = document.elementFromPoint(x, y); return e && e.tagName === 'CANVAS'; }; for (const y of [560, 600, 640, 520, 480, 680, 300, 260]) for (const x of [195, 160, 230]) if (ok(x - 100, y) && ok(x + 100, y) && ok(x - 25, y) && ok(x + 25, y) && ok(x, y)) return { x, y }; return null; });
    let C = await pickC(); R.C = C; R.centerTop = await G.topAt(h, 195, 420); console.log('pinch spot', JSON.stringify(C), 'center top', R.centerTop);
    if (!C) C = { x: 195, y: 600 };
    for (let cyc = 0; cyc < 3; cyc++) {
        await step('pinch-out-to-community-' + cyc, async () => { const trail = []; for (let i = 0; i < 14; i++) { await G.pinch(h, C, 260, 60, 500, 8); await L.sleep(900); const w = await where(); const ovs = await p.evaluate(() => [...document.querySelectorAll('.r2-ov')].map(o => o.className.split(' ').slice(0, 3).join('.'))); if (ovs.length) trail.push('OV:' + ovs.join('|')); trail.push(w.tab === 'tab-foryou' ? 'FY' : (w.rig ? w.rig.mode + ':' + w.rig.dist + '/' + w.rig.maxD + (w.rig.outer ? 'o' : '') : '?')); if (w.tab === 'tab-foryou') break; } return { pinches: trail.length, trail, at: await where() }; });
        await L.sleep(2500);
        await step('spread-back-home-' + cyc, async () => { const trail = []; for (let i = 0; i < 8; i++) { await G.pinch(h, { x: 195, y: 380 }, 60, 300, 500, 8); await L.sleep(1200); const w = await where(); trail.push(w.tab); if (w.tab === 'tab-home') break; } return { spreads: trail.length, trail, at: await where() }; });
        await L.sleep(2500);
    }
    await step('zoom-button-out-in-x3', async () => { const out = []; for (let i = 0; i < 3; i++) { await p.evaluate(() => LowiWorldHome.toggleZoom()); await L.sleep(2500); out.push((await where()).rig); await p.evaluate(() => LowiWorldHome.toggleZoom()); await L.sleep(2500); out.push((await where()).rig); } return out; });
    /* into the galaxy by the app's own route, then the energy joystick */
    await step('goto-community', async () => { await p.evaluate(() => (window.goTab || function () { })('foryou')); await L.sleep(5000); return where(); });
    const joy = await p.evaluate(() => { const j = document.getElementById('ceJoy'); if (!j) return null; const r = j.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, vis: r.width > 0 && getComputedStyle(j).display !== 'none' }; });
    R.joy = joy;
    const est = () => p.evaluate(() => ({ st: window.LowiEnergy && LowiEnergy.state(), stats: window.LowiEnergy && (() => { const s = LowiEnergy.stats(); delete s.lat; return s; })(), shots: document.querySelectorAll('.ce-shot').length }));
    if (joy && joy.vis) {
        await step('energy-drag-release', async () => { await G.drag(h, joy, { x: joy.x - 30, y: joy.y - 40 }, 400, 8, { holdEnd: 300 }); await L.sleep(2500); return est(); });
        await step('energy-tiny-drag', async () => { await G.drag(h, joy, { x: joy.x + 3, y: joy.y - 2 }, 200, 3); await L.sleep(1500); return est(); });
        await step('energy-drag-cancel', async () => { await G.drag(h, joy, { x: joy.x + 30, y: joy.y - 40 }, 400, 8, { holdEnd: 300, cancel: true }); await L.sleep(1500); return { e: await est(), knob: await p.evaluate(() => { const k = document.querySelector('.ce-knob'); return k ? k.style.transform : null; }) }; });
        await step('energy-8-rapid', async () => { for (let i = 0; i < 8; i++) await G.drag(h, joy, { x: joy.x + 40 * Math.cos(i), y: joy.y - 40 * Math.abs(Math.sin(i)) - 5 }, 120, 3); await L.sleep(4000); return est(); });
        await step('energy-settle-15s', async () => { await L.sleep(15000); return est(); });
    } else await step('energy-joystick-missing', async () => ({ joy, at: await where() }));
    await step('back-home-tab', async () => { await p.evaluate(() => (window.goTab || function () { })('home')); await L.sleep(4000); return where(); });
    fs.writeFileSync('/home/sprite/galaxy-audit/out/p3-' + view + '.json', JSON.stringify(R, null, 1));
    await h.browser.close(); if (srv) srv.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
