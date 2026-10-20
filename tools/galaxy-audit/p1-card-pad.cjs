'use strict';
/* galaxy-audit probe 1: Misty card (hold to open, every door, close, reopen x8), taps on Misty, and the joystick gestures
   (one tap, drags in 8 directions, hold forward, tap+hold back, double tap, triple tap autopilot, touch cancel mid-drag).
   node p1-card-pad.cjs <view> [root|url] */
const L = require(process.env.GA_LIB || './lib.cjs'), G = require('./gest.cjs'), fs = require('fs');
(async () => {
    const view = process.argv[2] || 'chromium390'; let target = process.argv[3] || '/home/sprite/wt-galaxy-audit', srv = null, url = target;
    if (!/^https?:/.test(target)) { srv = await L.serve(target); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
    const h = await L.open({ view, url, settle: 9000 }); const p = h.page;
    const R = { view, url, steps: [] };
    const step = async (name, fn) => { const t = Date.now(); let res, err = null; try { res = await fn(); } catch (e) { err = String(e.message || e).slice(0, 300); }
        const s = await L.snap(h); const m = await G.metrics(h); const pe = h.log.pageerror.splice(0); const ce = h.log.console.splice(0).filter(x => !/ERR_FAILED|ERR_ABORTED|Failed to load resource/.test(x));
        const row = { name, ms: Date.now() - t, res, err, pageerror: pe, consoleErr: ce, winErr: s.err, rej: s.rej, stalls: s.stalls.length ? [s.stalls.length, Math.max(...s.stalls)] : 0, m };
        R.steps.push(row); console.log(JSON.stringify(row).slice(0, 1500)); return res; };
    const ov = () => p.evaluate(() => [...document.querySelectorAll('.r2-ov')].map(o => o.className.replace(/\s+/g, ' ').trim()));
    const misty = await G.center(h, '#spBubble'), pad = await G.center(h, '#whPad');
    R.misty = misty; R.pad = pad;
    await step('baseline', async () => ({ ov: await ov() }));
    /* ---- taps on Misty: 'Tap me to play' ---- */
    await step('tap-misty-x1', async () => { await G.taps(h, misty, 1); await L.sleep(1200); return { ov: await ov(), hub: await p.evaluate(() => !!document.getElementById('mistyHub')), face: await p.evaluate(() => (document.querySelector('#spBubble') || {}).className) }; });
    await step('tap-misty-x12-rapid', async () => { await G.taps(h, misty, 12, 80); await L.sleep(1500); return { ov: await ov(), hub: await p.evaluate(() => !!document.getElementById('mistyHub')) }; });
    /* ---- hold Misty: her card ---- */
    const openCard = async () => { await G.hold(h, misty, 900); await L.sleep(1800); return p.evaluate(() => ({ hub: !!document.getElementById('mistyHub'), doors: [...document.querySelectorAll('#mistyHub [data-mh]')].map(b => { const r = b.getBoundingClientRect(); return [b.dataset.mh, (b.textContent || '').trim().slice(0, 30), Math.round(r.top), Math.round(r.height), document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === b || b.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2))]; }), vh: innerHeight, text: (document.querySelector('#mistyHub') || {}).innerText ? document.querySelector('#mistyHub').innerText.replace(/\s+/g, ' ').slice(0, 600) : '' })); };
    const card = await step('hold-misty-card', openCard);
    await p.screenshot({ path: '/home/sprite/galaxy-audit/out/p1-' + view + '-card.png' });
    const closeTopX = async () => { const x = await p.evaluate(() => { const o = [...document.querySelectorAll('.r2-ov')].pop(); if (!o) return null; const b = o.querySelector('.r2-x, .wh-x, [aria-label="Close"], button[class*="-x"]'); if (!b) return { none: o.className }; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, cls: b.className, label: b.getAttribute('aria-label') }; }); if (x && x.x != null) { await G.taps(h, x, 1); await L.sleep(1100); } return x; };
    for (const door of ['forms', 'collection', 'glow', 'mood']) {
        await step('door-' + door, async () => {
            const hasHub = await p.evaluate(() => !!document.getElementById('mistyHub')); if (!hasHub) await openCard();
            const c = await p.evaluate(d => { const b = document.querySelector('#mistyHub [data-mh="' + d + '"]'); if (!b) return null; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, door);
            if (!c) return { missing: true };
            await L.sleep(400); const top = await G.topAt(h, c.x, c.y); await G.taps(h, c, 1); await L.sleep(1800);
            const after = await ov(); const title = await p.evaluate(() => { const o = [...document.querySelectorAll('.r2-ov')].pop(); return o ? (o.innerText || '').replace(/\s+/g, ' ').slice(0, 300) : ''; });
            await p.screenshot({ path: '/home/sprite/galaxy-audit/out/p1-' + view + '-door-' + door + '.png' });
            const x = door === 'mood' ? null : await closeTopX(); const back = await ov();
            return { top, after, title, closedWith: x, back };
        });
    }
    await step('close-card', async () => { const x = await closeTopX(); await L.sleep(800); return { x, ov: await ov() }; });
    await step('card-open-close-x8', async () => { const out = []; for (let i = 0; i < 8; i++) { await G.hold(h, misty, 800); await L.sleep(1300); const o1 = (await ov()).length; await closeTopX(); await L.sleep(600); out.push([o1, (await ov()).length]); } return out; });
    /* ---- joystick ---- */
    const padSt = () => p.evaluate(() => { const s = window.LowiPad && LowiPad.state(); const f = window.LowiMistyFlight && LowiMistyFlight.state(); return { pad: s && s.pad, held: s && s.held, gone: s && s.gone, faded: s && s.faded, st: f && f.st, chip: ((document.querySelector('.mp-chip') || {}).textContent || '').trim(), cls: (document.getElementById('whPad') || {}).className, adv: !!(window.LowiAdventure && LowiAdventure.on) }; });
    await step('pad-one-tap', async () => { await G.taps(h, pad, 1); await L.sleep(700); return padSt(); });
    const dirs = [[0, -60], [42, -42], [60, 0], [42, 42], [0, 60], [-42, 42], [-60, 0], [-42, -42]];
    await step('pad-drag-8dirs', async () => { const out = []; for (const [dx, dy] of dirs) { await G.drag(h, pad, { x: pad.x + dx, y: pad.y + dy }, 300, 6, { holdEnd: 900 }); await L.sleep(250); out.push((await padSt()).st); } return out; });
    await step('pad-drag-offscreen', async () => { await G.drag(h, pad, { x: 2, y: 2 }, 500, 10, { holdEnd: 800 }); await L.sleep(400); return padSt(); });
    await step('pad-hold-forward-2s', async () => { await G.touch(h, 'touchStart', [pad]); await L.sleep(600); const mid = await padSt(); await L.sleep(1400); await G.touch(h, 'touchEnd', []); await L.sleep(300); return { mid, after: await padSt() }; });
    await step('pad-tap-then-hold-back', async () => { await G.taps(h, pad, 1); await L.sleep(120); await G.touch(h, 'touchStart', [pad]); await L.sleep(700); const mid = await padSt(); await L.sleep(800); await G.touch(h, 'touchEnd', []); await L.sleep(300); return { mid, after: await padSt() }; });
    await step('pad-double-tap', async () => { await G.taps(h, pad, 2, 120); await L.sleep(600); return padSt(); });
    await step('pad-triple-tap-auto', async () => { await L.sleep(800); await G.taps(h, pad, 3, 110); await L.sleep(1500); return padSt(); });
    await step('auto-run-20s', async () => { const out = []; for (let i = 0; i < 4; i++) { await L.sleep(5000); out.push(await padSt()); } return out; });
    await step('pad-touch-ends-auto', async () => { await G.taps(h, pad, 1); await L.sleep(900); return padSt(); });
    await step('pad-cancel-mid-drag', async () => { await G.touch(h, 'touchStart', [pad]); for (let i = 1; i <= 6; i++) { await G.touch(h, 'touchMove', [{ x: pad.x + 8 * i, y: pad.y - 6 * i }]); await L.sleep(60); } const mid = await padSt(); await G.touch(h, 'touchCancel', []); await L.sleep(500); const after = await padSt(); const knob = await p.evaluate(() => { const k = document.querySelector('#whPad .mp-knob, #whPad [class*=knob]'); return k ? k.style.transform : 'no-knob'; }); return { mid, after, knob }; });
    await step('pad-hold-then-cancel', async () => { await G.touch(h, 'touchStart', [pad]); await L.sleep(900); const mid = await padSt(); await G.touch(h, 'touchCancel', []); await L.sleep(500); return { mid, after: await padSt() }; });
    await step('let-her-go-home-25s', async () => { await L.sleep(25000); return padSt(); });
    fs.writeFileSync('/home/sprite/galaxy-audit/out/p1-' + view + '.json', JSON.stringify(R, null, 1));
    await h.browser.close(); if (srv) srv.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
