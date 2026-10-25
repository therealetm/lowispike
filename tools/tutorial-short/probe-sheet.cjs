/* tools/tutorial-short/probe-sheet.cjs: how the You sheet opens and closes under the tour's room class (timing + geometry) */
const H = require('./harness.cjs');
(async () => {
    const [eng = 'chromium'] = process.argv.slice(2);
    const srv = await H.serve(), br = await H.pw[eng].launch();
    const { ctx, page } = await H.newPage(br, 'iPhone 13', 'en');
    await page.setViewportSize({ width: 390, height: 844 });
    await H.boot(page, srv.url);
    const out = await page.evaluate(async () => {
        const wait = ms => new Promise(r => setTimeout(r, ms)), o = [];
        const R = el => { if (!el) return null; const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return [Math.round(r.top), Math.round(r.bottom), cs.maxHeight, cs.opacity, cs.display, el.className.slice(0, 40)]; };
        document.documentElement.style.setProperty('--lt-ch', '238px'); document.documentElement.classList.add('lt-room-top');
        for (const [k, open, close, sel] of [['you', () => LowiCommunityMe.open(), () => LowiCommunityMe.close(), '.cme-ov .r2-sh'], ['misty', () => LowiWorldHome.openMisty('aura'), () => LowiWorldHome.closeTop(), '.wh-ms-ov .r2-sh'], ['gap', () => LowiGapView.open(), () => LowiGapView.close(), '#gvSheet .gv-card']]) {
            open(); await wait(900); o.push(k + ' open ' + JSON.stringify(R(document.querySelector(sel))) + ' modal=' + [...document.querySelectorAll('[aria-modal="true"]')].map(e => e.className.slice(0, 30)).join('|'));
            close(); const t0 = performance.now(); let gone = -1;
            for (let j = 0; j < 40; j++) { await wait(100); const e = document.querySelector(sel); const r = e && e.getBoundingClientRect(); if (!e || r.height < 4 || getComputedStyle(e).visibility === 'hidden' || +getComputedStyle(e).opacity < .06) { gone = Math.round(performance.now() - t0); break; } }
            o.push(k + ' closed after ' + gone + 'ms; left: ' + JSON.stringify(R(document.querySelector(sel))));
        }
        return o;
    });
    console.log(out.join('\n')); console.log('errors', page.errs.slice(0, 3));
    await ctx.close(); await br.close(); srv.s.close();
})();
