#!/usr/bin/env node
/* item 32 diagnostics: what draws the Gap liquid, and with which colours (2D canvas pixels, 3D liquid colours) */
'use strict';
const path = require('path');
const L = require('./lib.cjs');
const ROOT = path.resolve(process.argv[2]), H = +(process.argv[3] || 2);
(async () => {
    const srv = await L.serve(ROOT); const url = 'http://127.0.0.1:' + srv.address().port + '/index.html';
    const seed = `try{if(!localStorage.getItem('lowi_fast_v1'))localStorage.setItem('lowi_fast_v1', JSON.stringify({last: Date.now() - ${H} * 3600000, target: 16}))}catch(e){}`;
    const h = await L.open({ view: 'c390x1', url, preInit: seed, settle: 9000 });
    const p = h.page;
    await p.evaluate(() => { try { goTab('today'); } catch (e) { } }); await L.sleep(4000);
    const r = await p.evaluate(() => {
        const g = document.querySelector('#spFast'); const gr = g.getBoundingClientRect();
        const at = (fx, fy) => document.elementsFromPoint(gr.left + gr.width * fx, gr.top + gr.height * fy).slice(0, 6).map(e => e.tagName + (e.id ? '#' + e.id : '') + (e.className && e.className.baseVal === undefined ? '.' + String(e.className).split(' ').slice(0, 2).join('.') : ''));
        const cv = g.querySelector('canvas'); let px = null;
        if (cv) { try { const c = cv.getContext('2d'); const d = c.getImageData(Math.round(cv.width / 2), Math.round(cv.height * 0.95), 1, 1).data; px = [...d]; } catch (e) { px = String(e); } }
        const lb = window.LowiLivingBubbles || window.LowiBubbles3D || null;
        return { brand: !!window.LowiBrand, fastFromBrand: window.LowiBrand ? LowiBrand.fast(false, false) : null, canvas: cv ? [cv.width, cv.height, cv.className] : null, px, at95: at(0.5, 0.95), at85: at(0.5, 0.85), lb: lb ? Object.keys(lb).slice(0, 20) : null, theme: document.documentElement.getAttribute('data-theme'), cls: document.documentElement.className.slice(0, 300), fastState: window.LowiFastBubble && LowiFastBubble.state && LowiFastBubble.state() };
    });
    console.log(JSON.stringify(r, null, 1));
    await h.browser.close(); srv.close();
})().catch(e => { console.error('DIAG FAIL', e); process.exit(1); });
