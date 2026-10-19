#!/usr/bin/env node
/* Diagnosis probe (Oct 19, Emmanuel: "on autopilot out in the spirit world a bubble pulled her in twice, then the app crashed and
   started from the beginning"). Serves the repo (or --url), starts autopilot with three taps' keyboard twin (Enter on the
   controller), shortens the wait before her first excursion and samples, every half second: the excursion step, the galaxy
   bubble/current state, page errors, reloads, and (with tools/soak/probe.js injected) live WebGL objects and shader compiles.
   Usage: node tools/autopilot-probe.cjs [--engine webkit] [--secs 240] [--laps 3] [--url URL] [--xp 3200]
   Desktop engines only: this is NOT an iPhone; a memory kill on the phone cannot be reproduced here, only its growth. */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true) : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..')));
const URL0 = arg('url', '');
const ENGINE = arg('engine', 'chromium'), SECS = +arg('secs', 240), XP = +arg('xp', 3200), QUIET = !!arg('quiet', false);
const pw = require(process.env.PW || '/tmp/pw/node_modules/playwright');
const PROBE = fs.readFileSync(path.join(__dirname, 'soak', 'probe.js'), 'utf8');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/json' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
    let srv = null, url = URL0;
    if (!url) {
        srv = await new Promise(r => { const s = http.createServer((q, res) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; const f = path.join(ROOT, u); fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(b); }); }); s.listen(0, '127.0.0.1', () => r(s)); });
        url = `http://127.0.0.1:${srv.address().port}/index.html`;
    }
    const browser = await pw[ENGINE].launch({ args: ENGINE === 'chromium' ? ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info'] : [] });
    const opts = ENGINE === 'webkit' ? Object.assign({}, pw.devices['iPhone 13'], { serviceWorkers: 'block' }) : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, serviceWorkers: 'block' };
    const ctx = await browser.newContext(opts);
    await ctx.addInitScript(PROBE);
    await ctx.addInitScript(o => { try { localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999'); const st = { v: 2, setupDone: true, onboarded: true, user: { name: 'Probe', bday: '1990-01-01' }, xp: o.xp, ledger: [], logs: [], saved: [] }; if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify(st)); } catch (e) { } }, { xp: XP });
    await ctx.route(/supabase\.co|googleapis|gstatic|open-meteo|openfoodfacts/, r => r.abort());
    const page = await ctx.newPage(), errs = []; let loads = 0, crashed = false;
    page.on('pageerror', e => errs.push(e.message.slice(0, 300) + ' @ ' + String(e.stack || '').split('\n').slice(1, 3).join(' | ').slice(0, 300)));
    page.on('load', () => { loads++; });
    const warns = new Map();
    page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 400));
        /* the world loop swallows a frame hook's throw as a console.warn ('world3d onFrame ...'): count them, keep the first of each */
        else if (m.type() === 'warning') { const k = m.text().slice(0, 300); const w = warns.get(k); if (w) w.n++; else { warns.set(k, { n: 1, at: Date.now() }); if (warns.size < 20) console.log('WARN', k); } } });
    page.on('crash', () => { crashed = true; });
    await page.goto(url, { waitUntil: 'load', timeout: 90000 });
    await page.waitForFunction(() => typeof window.goTab === 'function' && window.LowiMistyFlight && window.LowiWorldHome && window.LowiMistyExplore, null, { timeout: 60000 });
    await sleep(5000);
    const start = await page.evaluate(() => {
        LowiMistyExplore.X.FIRST = 4; LowiMistyExplore.X.EVERY = 8;
        /* count what the Home loop asks of the flight: wants() true/false, frame() calls, and the first error frame() throws */
        const MF = LowiMistyFlight, w0 = MF.wants, f0 = MF.frame; window.__mf = { yes: 0, no: 0, frames: 0, err: '' };
        MF.wants = function (c) { const r = w0.apply(this, arguments); r ? __mf.yes++ : __mf.no++; return r; };
        MF.frame = function (c) { __mf.frames++; try { return f0.apply(this, arguments); } catch (e) { if (!__mf.err) __mf.err = String(e && e.stack || e).slice(0, 900); throw e; } };
        /* scene frames (any frame hook runs) and tab switches, to tell a dead world loop from a frame hook that throws or a hidden Home */
        window.__sf = 0; try { LowiWorld3D.onFrame(() => { __sf++; }); } catch (e) { }
        window.__tabs = []; const gt = window.goTab; if (gt) window.goTab = function (t) { __tabs.push(Math.round(performance.now()) + ' ' + t + ' ' + String(new Error().stack).split('\n').slice(2, 4).join(' < ').slice(0, 220)); return gt.apply(this, arguments); };
        const b = document.getElementById('whPad'); if (!b) return { pad: false };
        b.focus(); b.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        return { pad: true, mode: LowiWorldHome.state.pad && LowiWorldHome.state.pad.mode };
    });
    console.log('start', JSON.stringify(start));
    const rows = []; let lastLog = '';
    for (let i = 0; i < SECS * 2; i++) {
        await sleep(500);
        if (crashed) { console.log('PAGE CRASHED (renderer process died)'); break; }
        let s;
        try {
            s = await page.evaluate(() => {
                const F = window.LowiMistyFlight, st = F ? F.state() : {}, ex = window.LowiMistyExplore ? LowiMistyExplore.state() : null, gb = window.LowiGalaxyBubbles ? LowiGalaxyBubbles.state() : null;
                const a = window.LowiWorld3D, ri = a && a.renderer && a.renderer.info, so = window.__soak;
                const pd = window.LowiWorldHome && LowiWorldHome.state.pad;
                const exs = window.LowiMistyExplore ? LowiMistyExplore.state() : {}; const pl = F && F.S ? null : null;
                return { t: Math.round(performance.now() / 1000), st: st.st, left: exs.left, d: exs.d, p: st.p && st.p.map(Math.round).join(','), hs: st.hs, seen: exs.seen && exs.seen.join('.'), hops: exs.hops, si: exs.si, j: exs.j, n: exs.n && exs.n.join('/'), up: exs.up, tt: exs.tt, gx: st.gx, mode: pd && pd.mode, ex: ex && ex.ph, exLog: ex && ex.log.join(','), gbIn: gb && gb.inside, riding: gb && gb.riding, gbLog: gb && gb.log.join(' | '),
                    geo: ri && ri.memory.geometries, tex: ri && ri.memory.textures, progs: ri && ri.programs ? ri.programs.length : null, calls: ri && ri.render.calls,
                    glLive: so ? Object.assign({}, so.live) : null, compiles: so && so.gl.compileShader || 0, links: so && so.gl.linkProgram || 0, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) : null,
                    nodes: document.getElementsByTagName('*').length, sf: window.__sf, tabs: (window.__tabs || []).slice(-4).join(' || '), run: !!(a && a.renderer) && (() => { try { return LowiWorld3D.fps(); } catch (e) { return -1; } })(), cls: document.documentElement.className.split(' ').filter(c => /^(mf-|gx-|wh-cosmos|wh-away|bwr-|wb-on|stp|mm-)/.test(c)).join(' '), mf: window.__mf && Object.assign({}, __mf, { err: __mf.err ? 1 : 0 }), hid: document.hidden, why: (() => { const H = document.documentElement, o = []; ['mm-open', 'stp-open', 'wh-on'].forEach(c => H.classList.contains(c) && o.push(c)); document.querySelectorAll('.r2-ov, .sp-world.on, .ht-world.on').forEach(e => o.push('ov:' + (e.id || e.className).slice(0, 60))); const sh = document.getElementById('spHome'); if (sh && !sh.offsetParent) o.push('spHome-hidden'); const sg = document.querySelector('#spHome .bw3-stage'); if (!sg) o.push('no-stage'); else { const r = sg.getBoundingClientRect(); o.push('stage ' + [r.x, r.y, r.width, r.height].map(Math.round).join(',')); } return o.join(' '); })(), full: !!document.querySelector('.bw3-full'), live: document.documentElement.classList.contains('wh-world-live'), lost: !!(a && a.lost) };
            });
        } catch (e) { s = { evalError: String(e.message).slice(0, 200) }; }
        s.loads = loads; rows.push(s);
        const pv = rows[rows.length - 3]; if (pv && s.mf && pv.mf && s.mf.frames === pv.mf.frames && !rows.stuck) { rows.stuck = true; console.log('FRAMES STOPPED at', ((i + 1) / 2).toFixed(1), 's why:', s.why, 'live', s.live, 'hid', s.hid); try { const raf = await page.evaluate(() => new Promise(res => { const f0 = window.__sf; let ok = false; requestAnimationFrame(() => { ok = true; }); setTimeout(() => res({ rafFires: ok, sceneFramesMoved: window.__sf !== f0, sf: window.__sf, run: (() => { try { return LowiWorld3D.fps(); } catch (e) { return 'x'; } })() }), 2500); })); console.log('LOOP CHECK', JSON.stringify(raf), 'tabs', s.tabs, 'cls', s.cls); } catch (e) { console.log('LOOP CHECK failed', e.message); } try { await page.screenshot({ path: (arg('json', '/tmp/ap') + '.stuck.png') }); const dom = await page.evaluate(() => { const H = document.documentElement; return { cls: H.className.slice(0, 600), body: document.body.className.slice(0, 300), top: [...document.querySelectorAll('body > *')].filter(e => getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 50).map(e => (e.id || e.tagName) + '.' + String(e.className).slice(0, 60)).slice(0, 30) }; }); console.log('DOM', JSON.stringify(dom)); } catch (e) { console.log('snap failed', e.message); } }
        const key = [s.ex, s.gbIn, s.riding, s.st, s.gx, s.loads, s.seen, s.si].join('/');
        if (!QUIET && (key !== lastLog || i % 20 === 0)) { const { gbLog, exLog, ...short } = s; console.log(((i + 1) / 2).toFixed(1).padStart(6) + 's', JSON.stringify(short)); lastLog = key; }
        if (loads > 1) { console.log('RELOAD seen at', ((i + 1) / 2).toFixed(1), 's'); }
    }
    const last = rows[rows.length - 1] || {};
    console.log('final', JSON.stringify(await page.evaluate(() => ({ mfErr: window.__mf && __mf.err, f: LowiMistyFlight.state(), ex: LowiMistyExplore.state() })).catch(e => String(e))).slice(0, 2500));
    console.log('explore log:', last.exLog);
    /* round 2: the freeze right after a string caught her was Misty held at one point of a string (camera with her) for up to a
       minute. Report every hook / ride where her point on the string (or the hook) did not change for more than 8 s */
    { let st = null; const pins = []; rows.forEach((r, i) => { const k = (r.ex === 'ride' || r.ex === 'hook') ? r.ex + ' string ' + r.si + ' point ' + r.j : null;
        if (k && st && st.k === k) return; if (st && st.k && (i - st.i) / 2 > 8) pins.push(st.k + ' for ' + ((i - st.i) / 2).toFixed(1) + ' s from ' + (st.i / 2) + ' s'); st = { k, i }; });
      console.log('PINNED >8 s:', pins.length ? pins.join(' | ') : 'none'); }
    console.log('galaxy log:', last.gbLog);
    console.log('loads', loads, 'crashed', crashed);
    console.log('errors', JSON.stringify(errs.slice(0, 10), null, 1));
    console.log('warnings', JSON.stringify([...warns].map(([k, v]) => v.n + 'x ' + k).slice(0, 12), null, 1));
    const first = rows.find(r => r.geo != null) || {};
    console.log('growth geo', first.geo, '->', last.geo, 'tex', first.tex, '->', last.tex, 'progs', first.progs, '->', last.progs, 'glLive', JSON.stringify(first.glLive), '->', JSON.stringify(last.glLive), 'compiles', first.compiles, '->', last.compiles, 'heap', first.heap, '->', last.heap, 'nodes', first.nodes, '->', last.nodes);
    if (arg('json', '')) fs.writeFileSync(arg('json'), JSON.stringify({ rows, errs, loads, crashed }, null, 1));
    await browser.close(); if (srv) srv.close();
})().catch(e => { console.error('PROBE FAILED', e); process.exit(1); });
