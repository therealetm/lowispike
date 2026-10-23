#!/usr/bin/env node
/* Which Home bubbles count as veils at idle (body-world-3d.js veilCircles) and why not. Usage: node tools/veil-idle-check.cjs [--root DIR] [--w 390 --h 844] */
'use strict';
const path = require('path');
const H = require('./sim/harness.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
(async () => {
    const o = { engine: 'chromium', viewport: { width: +arg('w', 390), height: +arg('h', 844) }, dpr: 1, cloud: false, probe: false, root: path.resolve(arg('root', path.join(__dirname, '..'))) };
    const r = await H.open(o); const page = r.page; await r.goto();
    await page.waitForFunction(() => window.LowiWorld3D && window.LowiWorld3D.ready, null, { timeout: 90000 });
    /* the harness has no account, so the sign-in gate hides Home (gate-boot: visibility hidden); a signed-in user sees the bubbles */
    await page.evaluate(() => { const g = () => document.documentElement.classList.remove('gate-boot', 'gate-up'); g(); setInterval(g, 500); const r2 = document.getElementById('r2gate'); if (r2) r2.hidden = true; });
    for (const wait of [4000, 6000]) {
        await H.sleep(wait);
        const s = await page.evaluate(() => {
            const els = [...document.querySelectorAll('.lb-bub, .lb-ctl, .hb2-orb, .ss2-chip')].map(el => { const b = el.getBoundingClientRect(); let n = el, op = 1, why = ''; while (n && n.nodeType === 1) { const cs = getComputedStyle(n); op *= +cs.opacity; if (!why && (+cs.opacity < 0.05 || cs.visibility === 'hidden')) why = (n.id || n.className || n.tagName).toString().slice(0, 40) + ' op=' + cs.opacity + ' vis=' + cs.visibility; n = n.parentElement; } return (el.className + '').slice(0, 30) + ' ' + Math.round(b.width) + 'px cv=' + (el.checkVisibility ? el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) : 'na') + ' op=' + op.toFixed(2) + (why ? ' hiddenBy=' + why : ''); });
            return { cls: document.documentElement.className.slice(0, 200), circles: LowiWorld3D.veilCircles().length, look: LowiWorld3D.veilLook().map(b => b.id + ':' + b.veil + (b.under ? 'U' : '')).join(' '), els };
        });
        console.log(JSON.stringify(s, null, 1).slice(0, 3000));
    }
    await r.close(); process.exit(0);
})().catch(e => { console.error('FAIL', e.message); process.exit(2); });
