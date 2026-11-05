'use strict';
/* Nov 5 2026: while the tour's Mirror card shows the real Move page, does the tour card cover the Mirror button it talks about?
   node tools/tutorial-short/mirror-overlap.cjs [chromium|webkit] [lang] */
const { launch, openApp, sleep, existingSeed } = require('../interface-audit/lib.cjs');
(async () => {
    const engine = process.argv[2] || 'webkit', lang = process.argv[3] || 'de';
    const h = await launch({ engine, seed: existingSeed({ lang, kv: { 'lowispike.lang': lang } }), lang, viewport: { width: 390, height: 844 } });
    const P = h.page; await openApp(h, { settle: 6000 });
    await P.evaluate(() => window.LowiTutorial && LowiTutorial.start({ from: 'settings' })); await sleep(1500);
    let r = null;
    for (let i = 0; i < 8 && !r; i++) {
        const id = await P.evaluate(() => window.LowiTutorial && LowiTutorial.step && LowiTutorial.step());
        if (id === 'mirror') {
            for (let k = 0; k < 16; k++) {
                await sleep(500);
                const m = await P.evaluate(() => {
                    const vis = e => { if (!e) return null; const q = e.getBoundingClientRect(); return q.width > 0 && q.height > 0 ? q : null; };
                    const tab = document.querySelector('#tab-move.active'); if (!tab) return null; window.__tabTxt = tab.innerText.slice(0, 200);
                    const cand = [...document.querySelectorAll('#tab-move button, #tab-move [data-mp], #tab-move [class*=mirror], #tab-move [class*=hero]')].filter(e => /mirror|spiegel|espejo/i.test(e.textContent || '') && vis(e)).sort((a, b) => a.getBoundingClientRect().height * a.getBoundingClientRect().width - b.getBoundingClientRect().height * b.getBoundingClientRect().width); const orbEl = cand[cand.length ? cand.length - 1 : 0]; const orb = vis(orbEl); if (orb) window.__orb = orbEl.className + ' ' + (orbEl.textContent || '').trim().slice(0, 40);
                    const nx = document.querySelector('[data-lt="next"]'); let card = nx; while (card && card.parentElement && card.parentElement.getBoundingClientRect().height < innerHeight * 0.7) card = card.parentElement;
                    const c = vis(card); if (!orb || !c) return { orb: !!orb, card: !!c };
                    const ix = Math.max(0, Math.min(orb.right, c.right) - Math.max(orb.left, c.left)), iy = Math.max(0, Math.min(orb.bottom, c.bottom) - Math.max(orb.top, c.top));
                    return { orb: [Math.round(orb.top), Math.round(orb.bottom)], card: [Math.round(c.top), Math.round(c.bottom)], orbCoveredPct: Math.round(100 * ix * iy / (orb.width * orb.height)), what: window.__orb };
                });
                if (m && m.orbCoveredPct !== undefined) { r = m; break; }
            }
            if (!r) r = { error: 'Move page or Mirror button not found while on the mirror card', active: await P.evaluate(() => (document.querySelector('#main > .tab.active') || {}).id), txt: await P.evaluate(() => window.__tabTxt || '') };
            break;
        }
        await P.evaluate(() => { const b = document.querySelector('[data-lt="next"]'); if (b) b.click(); }); await sleep(1800);
    }
    console.log(engine, lang, JSON.stringify(r), 'errors', JSON.stringify(h.errors.slice(0, 3)));
    await h.browser.close();
})().catch(e => { console.error(e); process.exit(2); });
