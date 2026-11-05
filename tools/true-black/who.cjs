'use strict';
/* Which elements still paint navy in Dark? Walks every element on the visible tab and lists computed background / colour /
   border / fill values that true-black-core.js would still call blue-dark. node tools/true-black/who.cjs <repo> [tab...] */
const L = require(process.env.LIB || '/home/sprite/BUGHUNT/playtest/lib.cjs');
const path = require('path'), fs = require('fs');
(async () => {
    const ROOT = path.resolve(process.argv[2] || '.'), tabs = process.argv.slice(3);
    const srv = await L.serve(ROOT); const url = 'http://127.0.0.1:' + srv.address().port + '/';
    const pre = `try{localStorage.setItem('lowi.theme','dark');localStorage.setItem('lowi.atmos',JSON.stringify({mode:'manual',p:100}));
      localStorage.setItem('lowi.theme.dark','black');localStorage.setItem('lowi.tutorial.v1',JSON.stringify({done:true}));}catch(e){}`;
    const h = await L.open({ view: 'chromium390', url, settle: 7000, preInit: pre });
    const p = h.page;
    for (const t of (tabs.length ? tabs : ['home'])) {
        if (t !== 'home') { await p.evaluate(t => window.goTab(t), t); await L.sleep(2200); }
        const r = await p.evaluate(() => {
            const C = window.LowiTrueBlackCore, out = new Map();
            const props = ['backgroundColor', 'backgroundImage', 'borderTopColor', 'color', 'fill', 'stroke', 'boxShadow'];
            for (const el of document.querySelectorAll('body *')) {
                const b = el.getBoundingClientRect(); if (b.width < 2 || b.height < 2 || b.bottom < 0 || b.top > innerHeight) continue;
                for (const pse of [null, '::before', '::after']) {
                const cs = getComputedStyle(el, pse); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0 || (pse && cs.content === 'none')) continue;
                for (const k of props) {
                    const v = cs[k]; if (!v || v === 'none') continue;
                    if (C.rewrite(v)) { const key = (pse || '') + k + ' ' + v.slice(0, 90); const id = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && el.className.baseVal == null ? '.' + String(el.className).trim().split(/\s+/).slice(0, 2).join('.') : ''); const area = b.width * b.height | 0;
                        const o = out.get(key) || { n: 0, area: 0, ex: id, inline: !!(el.getAttribute('style') || '').match(/#|rgb|hsl/) }; o.n++; o.area += area; out.set(key, o); }
                }
                }
            }
            return [...out.entries()].sort((a, b) => b[1].area - a[1].area).slice(0, 30);
        });
        console.log('== ' + t); for (const [k, o] of r) console.log(o.area, o.n, o.inline ? 'INLINE' : '', k, '<-', o.ex);
    }
    await h.browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
