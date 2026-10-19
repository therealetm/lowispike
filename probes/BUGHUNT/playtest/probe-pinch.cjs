'use strict';
/* Run 7 probe: pinch storm. Two-finger pinches in both directions on Home and on the galaxy, fast and slow, cut short with
   touchcancel, a third finger landing mid-pinch, a pinch during the Home<->Community warp. After every burst: no page left dimmed or
   scaled (#tab-home, #cgField inline transform/opacity), one tab active, Misty visible on Home, no errors.
   Chromium only (CDP touch). usage: node probe-pinch.cjs <url|dir> [seed] */
const L = require('./lib.cjs');
(async () => {
    const target = process.argv[2] || 'https://therealetm.github.io/lowispike/'; let seed = +(process.argv[3] || 7);
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    let srv = null, url = target;
    if (!/^https?:/.test(target)) { srv = await L.serve(target); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
    const h = await L.open({ view: 'chromium390', url, settle: 8000 });
    const { page } = h; const cdp = await h.ctx.newCDPSession(page); const fails = []; const log = [];
    page.on('crash', () => { console.log('PAGE CRASH at ' + (log.length ? log[log.length - 1].tag : 'start')); }); page.on('close', () => console.log('page closed after ' + (log.length ? log[log.length - 1].tag : 'start')));
    const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p[0], y: p[1], id: i, radiusX: 4, radiusY: 4, force: 1 })) });
    const cx = 195, cy = 420;
    async function pinch(from, to, steps, opts = {}) {
        const pts = d => [[cx - d / 2, cy], [cx + d / 2, cy]];
        await T('touchStart', pts(from));
        for (let i = 1; i <= steps; i++) {
            const d = from + (to - from) * i / steps;
            if (opts.third && i === Math.floor(steps / 2)) { await T('touchMove', pts(d).concat([[cx, cy + 120]])); await L.sleep(16); }
            await T('touchMove', pts(d)); await L.sleep(opts.ms || 16);
            if (opts.cut && i === Math.floor(steps * opts.cut)) { await T('touchCancel', []); return; }
        }
        await T('touchEnd', []);
    }
    const state = () => page.evaluate(() => {
        const st = id => { const e = document.getElementById(id); if (!e) return null; const c = getComputedStyle(e); return { tf: e.style.transform, op: e.style.opacity, cop: c.opacity, ctf: c.transform }; };
        const tabs = [...document.querySelectorAll('.tab.active, [id^="tab-"].active')].map(e => e.id);
        const m = document.getElementById('spBubble'); let mv = null; if (m) { const r = m.getBoundingClientRect(); mv = r.width > 5 && r.height > 5; }
        const B = window.__bh || { err: [], rej: [] };
        return { home: st('tab-home'), field: st('cgField'), tabs, mv, html: document.documentElement.className.split(' ').filter(c => /gx|lg-|tab|warp/.test(c)).join(' '), err: B.err.splice(0), rej: B.rej.splice(0) };
    });
    const check = async (tag, wait = 1600) => {
        await L.sleep(wait); const s = await state(); log.push({ tag, s }); console.log(tag, JSON.stringify({ tabs: s.tabs, home: s.home, f: s.field && s.field.tf, html: s.html, e: s.err.concat(s.rej) }).slice(0, 400));
        if (s.err.length || s.rej.length) fails.push(tag + ' errors ' + JSON.stringify(s.err.concat(s.rej)).slice(0, 300));
        if (s.home && (s.home.tf || (s.home.op && s.home.op !== '1') || +s.home.cop < 0.98) && s.tabs.includes('tab-home')) fails.push(tag + ' Home left dimmed/scaled ' + JSON.stringify(s.home));
        if (s.field && (s.field.tf || (s.field.op && s.field.op !== '1'))) fails.push(tag + ' galaxy field left scaled ' + JSON.stringify(s.field));
        if (s.tabs.length !== 1) fails.push(tag + ' tabs active ' + JSON.stringify(s.tabs));
        return s;
    };
    await check('start', 200);
    // zoom Home camera out to its widest first (wheel), then pinch storm
    for (let r = 0; r < 8; r++) {
        const kind = Math.floor(rnd() * 6), a = 60 + rnd() * 80, b = 220 + rnd() * 100, steps = 6 + Math.floor(rnd() * 20);
        if (kind === 0) await pinch(b, a, steps);                       // fingers together
        else if (kind === 1) await pinch(a, b, steps);                  // fingers apart
        else if (kind === 2) await pinch(b, a, steps, { cut: 0.5 });     // cancelled mid-way
        else if (kind === 3) await pinch(a, b, steps, { third: true });  // third finger
        else if (kind === 4) { for (let i = 0; i < 6; i++) await pinch(b, a, 4, { ms: 8 }); } // rapid pinches
        else { await pinch(b, a, 30, { ms: 30 }); await pinch(a, b, 30, { ms: 30 }); }
        await check('burst ' + r + ' kind ' + kind, 900);
    }
    // force to galaxy and storm there, also pinch during the warp
    await page.evaluate(() => window.goTab('foryou')); await L.sleep(250);
    await pinch(80, 300, 10); await pinch(300, 80, 10, { cut: 0.4 });
    await check('during warp out', 2500);
    for (let r = 0; r < 4; r++) { const a = 60 + rnd() * 80, b = 240 + rnd() * 100; if (rnd() < 0.5) await pinch(a, b, 8 + Math.floor(rnd() * 12), { cut: rnd() < 0.4 ? 0.6 : 0 }); else await pinch(b, a, 10); await check('galaxy burst ' + r, 900); }
    await page.evaluate(() => window.goTab('home')); await L.sleep(200); await pinch(300, 80, 12); await pinch(80, 300, 12);
    const fin = await check('end on home', 3000);
    if (fin.mv === false) fails.push('Misty not visible at end');
    await page.screenshot({ path: __dirname + '/out/pinch-final.png' });
    console.log(JSON.stringify(log.map(o => ({ t: o.tag, tabs: o.s.tabs, home: o.s.home, field: o.s.field && o.s.field.tf, html: o.s.html })), null, 0).slice(0, 5000));
    console.log(fails.length ? 'FAIL ' + fails.join(' ; ') : 'PASS');
    await h.browser.close(); if (srv) srv.close();
})().catch(e => { console.error(String(e).slice(0, 300)); process.exit(2); });
