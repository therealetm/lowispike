#!/usr/bin/env node
/* Flight crash hunt 13:01 Oct 24: harness double taps (CDP, 120 ms apart) did not zoom Home on a loaded VM. This one dispatches the
   two taps inside the page with exact timing on the world stage, so load cannot stretch the gap, and reads the camera distance
   and Home's zoom glide after each. Simulated only. Usage: node tools/flight-dbltap-probe.cjs [url] */
'use strict';
const H = require('./sim/harness.cjs');
const where = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'https://therealetm.github.io/lowispike/index.html';
(async () => {
    const o = { engine: 'chromium', viewport: { width: 390, height: 844 }, dpr: 2 };
    if (/^https?:/.test(where)) o.url = where; else o.root = where;
    const R = await H.open(o), P = R.page, out = [];
    try {
        await R.goto(); await H.sleep(7000);
        for (let k = 0; k < 4; k++) {
            const r = await P.evaluate(() => new Promise(done => {
                const WH = window.LowiWorldHome, rig = WH.rig(), stage = document.getElementById('bw3Stage');
                const q = stage.getBoundingClientRect(); let x = q.left + q.width / 2, y = q.top + q.height * 0.72;
                const d0 = +rig.dist.toFixed(2), hit = document.elementFromPoint(x, y);
                const fire = (t) => stage.dispatchEvent(new PointerEvent(t, { bubbles: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y }));
                fire('pointerdown'); fire('pointerup');
                setTimeout(() => { fire('pointerdown'); fire('pointerup');
                    const anim = WH.state.zoomAnim ? +(+WH.state.zoomAnim.to).toFixed(2) : null;
                    setTimeout(() => done({ d0, animTo: anim, d1: +rig.dist.toFixed(2), maxD: +rig.maxD.toFixed(2), minD: +rig.minD.toFixed(2), hit: hit && (hit.tagName + '.' + String(hit.className).slice(0, 30)) }), 4000);
                }, 120);
            }));
            console.log(R.el(), 'double tap ' + k, JSON.stringify(r)); out.push(r);
        }
    } catch (e) { console.log('probe error', e.message.slice(0, 200)); }
    const errs = R.errs.filter(e => !/audio device|NotAllowedError|play\(\) failed/i.test(e.m));
    console.log('RESULT ' + JSON.stringify({ crashed: !!R.crashed, loads: R.loads, toggled: out.map(r => r.animTo != null || Math.abs(r.d1 - r.d0) > 0.5), errs: errs.slice(0, 8) }));
    await Promise.race([R.close(), H.sleep(15000)]).catch(() => { });
    process.exit(0);
})();
