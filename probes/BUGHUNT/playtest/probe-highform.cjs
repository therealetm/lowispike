'use strict';
/* BH-012 check: a companion at forms 7-10 (index 6-9). Finds SVG with undefined/NaN geometry and faces drawn outside the body.
   usage: node probe-highform.cjs <url|dir> [view] [xp] */
const L = require('./lib.cjs');
(async () => {
    const target = process.argv[2]; const view = process.argv[3] || 'chromium390'; const xp = +(process.argv[4] || 14500);
    let srv = null, url = target;
    if (!/^https?:/.test(target)) { srv = await L.serve(target); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
    const h = await L.open({ view, url, settle: 4000 }); const P = h.page;
    await P.evaluate(x => { const s = LowiR2.S(); s.xp = x; try { LowiR2.save && LowiR2.save(); } catch (e) { } }, xp);
    await P.reload({ waitUntil: 'load' }); await L.sleep(12000);
    const scan = label => P.evaluate(label => {
        const bad = []; document.querySelectorAll('svg *').forEach(e => { for (const a of e.attributes) if (/undefined|NaN/.test(a.value)) bad.push(e.tagName + '.' + (e.getAttribute('class') || '') + '@' + a.name + '=' + a.value.slice(0, 50)); });
        const faces = [...document.querySelectorAll('svg .lh-face')].map(f => { const svg = f.ownerSVGElement, r = f.getBoundingClientRect(), s = svg.getBoundingClientRect(); return { svg: (svg.getAttribute('class') || '').slice(0, 40), inside: r.width ? (r.left >= s.left - 2 && r.right <= s.right + 2 && r.top >= s.top - 2 && r.bottom <= s.bottom + 2) : null, t: f.getAttribute('transform') }; });
        return { label, bad: [...new Set(bad)].slice(0, 12), nBad: bad.length, faces: faces.filter(f => f.inside === false || /undefined|NaN/.test(f.t || '')).slice(0, 8), nFaces: faces.length };
    }, label);
    console.log(JSON.stringify(await scan('home')));
    await P.evaluate(() => LowiMistyHub.open()); await L.sleep(1500);
    console.log(JSON.stringify(await scan('hub')));
    await P.evaluate(() => { const b = document.querySelector('#mistyHub [data-mh=forms]'); if (b) b.click(); }); await L.sleep(2500);
    console.log(JSON.stringify(await scan('forms')));
    await P.screenshot({ path: __dirname + '/out/highform-' + view + '.png' }).catch(() => { });
    console.log('SUMMARY', JSON.stringify({ view, xp, pageerror: h.log.pageerror.slice(0, 4), svgConsole: h.log.console.filter(c => /attribute|parsing/.test(c)).length }));
    await h.browser.close(); if (srv) srv.close();
})().catch(e => { console.log('PROBE ERROR', e.stack); process.exit(1); });
