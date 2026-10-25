/* tools/tutorial-short/probe.cjs: geometry probe for the short tour. Per card: viewport, card rect, room side, the opened page's
   content boxes and why the tour hid itself (busyBy). node tools/tutorial-short/probe.cjs [engine] [device] [lang] */
const H = require('./harness.cjs');
(async () => {
    const [eng = 'chromium', dev = 'iPhone 13', lang = 'en'] = process.argv.slice(2);
    const srv = await H.serve(), br = await H.pw[eng].launch();
    const { ctx, page } = await H.newPage(br, dev, lang);
    page.on('console', m => { if (/tab|community/i.test(m.text())) console.log('console:', m.text().slice(0, 200)); });
    await H.boot(page, srv.url);
    await page.evaluate(() => { document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); window.LowiTutorial.start({ from: 'probe' }); });
    const seen = {}, t0 = Date.now();
    while (Date.now() - t0 < 140000) {
        const st = await page.evaluate(() => {
            const T = window.LowiTutorial, card = document.querySelector('#ltTour .lt-card');
            const R = el => { const r = el.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; };
            const vis = el => { if (!el) return false; const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 4 && r.height > 4 && cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05; };
            const sel = { 'misty-card': '.wh-ms-ov .r2-sh', 'gap-view': '#gvSheet .gv-card', 'settings-sheet': '.cme-ov .r2-sh', 'scan-demo': '.lt-scan .lts-frame, .lt-scan .lts-verdict, .lt-scan .lts-shutter', 'community-tab': '#tab-foryou, .cm-open', 'fuel-bloom': '#hb2Bloom button', 'water-bloom': '#hb2Bloom button', 'move-bloom': '#hb2Bloom button', 'sleep-bloom': '#hb2Bloom button' }[T.opened()];
            return { on: T.isOn(), id: T.step(), held: T.held(), busy: T.busyBy(), vh: innerHeight, vw: innerWidth, route: T.opened(), tab: (document.querySelector('.tab.on, .tab.active') || {}).id, fy: (() => { const e = document.getElementById('tab-foryou'); if (!e) return 'none'; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return [Math.round(r.width), Math.round(r.height), cs.display, cs.visibility, cs.opacity, e.className, e.childElementCount].join(','); })(), card: card && vis(card) ? R(card) : null, room: card && card.getAttribute('data-room'),
                page: sel ? [...document.querySelectorAll(sel)].filter(vis).slice(0, 8).map(R) : [] };
        });
        if (!st.on) break;
        /* one line per card, 1.5 s after its page opened (settled), plus every held poll */
        if (st.route) { const f = seen[st.id] = seen[st.id] || { t: Date.now() }; if (!f.done && Date.now() - f.t > 1500) { f.done = 1; console.log(JSON.stringify(st)); } }
        if (st.held) console.log('HELD ' + JSON.stringify(st));
        if (st.id === 'done') break;
        await H.sleep(400);
    }
    console.log('errors', page.errs.slice(0, 3));
    await ctx.close(); await br.close(); srv.s.close();
})();
