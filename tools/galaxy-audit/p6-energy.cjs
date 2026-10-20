'use strict';
/* galaxy-audit probe 6: energy shots in the Community galaxy, sampled right after release (a ball lives ~1-2 s).
   drag+release toward the nearest companion, keyboard Enter twin, 8 rapid shots (rate limit), cancel mid-aim, and whether
   knocked companions stay where they stopped after a reload ("they stay where they stop"). */
const L = require(process.env.GA_LIB || './lib.cjs'), G = require('./gest.cjs'), fs = require('fs');
(async () => {
    const view = process.argv[2] || 'chromium390'; const target = process.argv[3] || '/home/sprite/wt-galaxy-audit'; let srv = null, url = target;
    if (!/^https?:/.test(target)) { srv = await L.serve(target); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
    const h = await L.open({ view, url, settle: 9000 }); const p = h.page; const R = {};
    const go = async () => { await p.evaluate(() => (window.goTab || function () { })('foryou')); await L.sleep(6000); };
    await go();
    const info = () => p.evaluate(() => { const me = document.querySelector('#cgField .cg-body.me'); const others = [...document.querySelectorAll('#cgField .cg-body:not(.me)')].map(b => { const r = b.getBoundingClientRect(); return { uid: b.dataset.uid, x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; }); const mr = me && me.getBoundingClientRect(); const j = document.getElementById('ceJoy'); const jr = j && j.getBoundingClientRect(); return { me: mr ? { x: Math.round(mr.left + mr.width / 2), y: Math.round(mr.top + mr.height / 2) } : null, others, joy: jr ? { x: jr.left + jr.width / 2, y: jr.top + jr.height / 2, w: jr.width } : null, st: LowiEnergy.state() }; });
    const watch = async (ms) => { const out = []; const end = Date.now() + ms; while (Date.now() < end) { const s = await p.evaluate(() => { const s = LowiEnergy.state(); return s ? [s.mode, s.balls, s.bodies.length] : null; }); out.push(s ? s.join(':') : 'null'); await L.sleep(120); } return [...new Set(out)]; };
    await p.evaluate(() => { const j = document.getElementById('ceJoy'); window.__jl = []; if (j) ['pointerdown', 'pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => j.addEventListener(n, e => window.__jl.push(n + ':' + e.pointerType), true)); });
    const I = await info(); R.info0 = I; console.log('INFO', JSON.stringify(I));
    if (!I.joy || !I.me || !I.others.length) { console.log('no joystick/companions'); }
    else {
        const tgt = I.others.sort((a, b) => Math.hypot(a.x - I.me.x, a.y - I.me.y) - Math.hypot(b.x - I.me.x, b.y - I.me.y))[0];
        const ang = Math.atan2(tgt.y - I.me.y, tgt.x - I.me.x); const J = I.joy;
        /* slingshot or pointer? try pointing TOWARD the target first, then the opposite (pull back) */
        for (const [lbl, sgn] of [['toward', 1], ['pullback', -1]]) {
            await G.touch(h, 'touchStart', [J]); for (let i = 1; i <= 6; i++) { await G.touch(h, 'touchMove', [{ x: J.x + sgn * Math.cos(ang) * 40 * i / 6, y: J.y + sgn * Math.sin(ang) * 40 * i / 6 }]); await L.sleep(40); }
            const mid = await p.evaluate(() => ({ cls: document.getElementById('ceJoy').className, aim: !!document.querySelector('#cgField .cg-body.me.ce-aim') }));
            await G.touch(h, 'touchEnd', []);
            const w = await watch(2500); const after = await info();
            R[lbl] = { mid, watch: w, moved: after.st && after.st.bodies, ev: await p.evaluate(() => window.__jl.splice(0)) }; console.log(lbl.toUpperCase(), JSON.stringify(R[lbl]));
            await L.sleep(1500);
        }
        await p.focus('#ceJoy'); await p.keyboard.press('Enter'); R.enter = { watch: await watch(2500), st: (await info()).st }; console.log('ENTER', JSON.stringify(R.enter));
        /* cancel mid-aim: no shot */
        await G.touch(h, 'touchStart', [J]); for (let i = 1; i <= 6; i++) { await G.touch(h, 'touchMove', [{ x: J.x + 6 * i, y: J.y - 6 * i }]); await L.sleep(40); } await G.touch(h, 'touchCancel', []);
        R.cancel = { watch: await watch(1500), knob: await p.evaluate(() => document.querySelector('.ce-knob').style.transform), cls: await p.evaluate(() => document.getElementById('ceJoy').className), ev: await p.evaluate(() => window.__jl.splice(0)) }; console.log('CANCEL', JSON.stringify(R.cancel));
        /* 8 rapid shots */
        for (let i = 0; i < 8; i++) { await G.touch(h, 'touchStart', [J]); await G.touch(h, 'touchMove', [{ x: J.x + Math.cos(i) * 40, y: J.y + Math.sin(i) * 40 }]); await L.sleep(30); await G.touch(h, 'touchEnd', []); }
        R.rapid = { watch: await watch(3000) }; await L.sleep(4000); R.rapid.st = (await info()).st; console.log('RAPID', JSON.stringify(R.rapid));
        const before = (await info()).others;
        await p.reload(); await L.sleep(9000); await go(); const afterR = (await info()).others;
        R.reload = { before, after: afterR }; console.log('RELOAD', JSON.stringify(R.reload));
    }
    R.errs = { pe: h.log.pageerror, snap: await L.snap(h) }; console.log('ERR', JSON.stringify(R.errs).slice(0, 1200));
    fs.writeFileSync('/home/sprite/galaxy-audit/out/p6-' + view + '.json', JSON.stringify(R, null, 1));
    await h.browser.close(); if (srv) srv.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
