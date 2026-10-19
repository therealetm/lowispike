'use strict';
/* ring geometry at load vs after rotate-and-back, animation frozen */
const L = require('./lib.cjs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
(async () => {
    const srv = arg('url', '') ? null : await L.serve(path.resolve(arg('root', '.')));
    const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`;
    for (const view of arg('views', 'chromium390').split(',')) {
        const h = await L.open({ url, view, settle: 4000 });
        const ring = () => h.page.evaluate(() => {
            let st = document.getElementById('bhfreeze'); if (!st) { st = document.createElement('style'); st.id = 'bhfreeze'; st.textContent = '[data-orbit]{animation:none!important;transition:none!important}'; document.head.appendChild(st); }
            const m = document.getElementById('spBubble').getBoundingClientRect(); const mx = m.left + m.width / 2, my = m.top + m.height / 2;
            const o = { vw: innerWidth, vh: innerHeight, misty: [Math.round(mx), Math.round(my), Math.round(m.width)], r: {}, layout: window.LowiHomeOrbitV2 && JSON.stringify(window.LowiHomeOrbitV2.current()).slice(0, 300) };
            document.querySelectorAll('[data-orbit]').forEach(e => { const r = e.getBoundingClientRect(); o.r[e.dataset.orbit] = [Math.round(Math.hypot(r.left + r.width / 2 - mx, r.top + r.height / 2 - my)), Math.round(r.width), e.style.cssText.slice(0, 120)]; });
            st.remove(); return o;
        });
        const out = { view };
        for (const t of [0, 3000, 8000]) { await L.sleep(t ? t - (t === 8000 ? 3000 : 0) : 0); out['t' + t] = await ring(); }
        const vp = h.page.viewportSize();
        await h.page.setViewportSize({ width: vp.height, height: vp.width }); await L.sleep(1500); out.rot = await ring();
        await h.page.setViewportSize(vp); await L.sleep(2500); out.back = await ring();
        console.log(JSON.stringify(out, null, 1));
        await h.browser.close();
    }
    if (srv) srv.close();
})();
