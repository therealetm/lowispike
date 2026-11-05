/* Aura fit probe (Nov 5 2026, owner: "the aura I bought looks nothing like the preview, it sits inside the bubble, the forms
   don't fit the bubble"). For each aura (level glows + shop auras) and several evolution stages it opens Home, Misty's card
   and the shop preview, screenshots them, and MEASURES where the effect layer, the bubble and Misty's body really are
   (bounding boxes of the live DOM, plus the drawn body's painted bounds in the SVG). Nothing is bought: the wallet is written
   into a throwaway browser profile.
   node tools/sim/aura-fit.cjs [outdir] [theme] [auras=prism,dew,...] [xps=300,5657,30000] */
'use strict';
const H = require('./harness.cjs'), fs = require('fs');
const [out = '/tmp/aura-fit', theme = 'dark', auraArg = '', xpArg = ''] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const AURAS = auraArg ? auraArg.split(',') : ['dew', 'nebula', 'ember', 'orbs', 'trail', 'electric', 'prism', 'galaxy'];
const XPS = xpArg ? xpArg.split(',').map(Number) : [300, 5657, 30000];
const engine = process.env.ENGINE || 'chromium';
(async () => {
    const res = [];
    for (const xp of XPS) {
        const R = await H.open({ engine, device: 'iPhone 13', probe: false, viewport: { width: 390, height: 844 }, dpr: +(process.env.SIM_DPR || 2) });
        const P = R.page;
        await R.ctx.addInitScript(([xp]) => {
            try {
                localStorage.setItem('lowi.theme', 'dark'); localStorage.setItem('lowi.theme.dark', 'black'); localStorage.setItem('lowi.theme.dark.picked', '1');
                localStorage.setItem('lowispike.sparks.v1', JSON.stringify({ own: ['ember', 'orbs', 'trail', 'electric', 'prism'] }));
                const s = JSON.parse(localStorage.getItem('lowispike.v2') || 'null') || { v: 2, setupDone: true, onboarded: true, ledger: [], logs: [], saved: [], settings: { lang: 'en' } };
                s.xp = xp; s.user = Object.assign({}, s.user || {}, { name: 'Akusi', bday: '1997-03-05' });
                localStorage.setItem('lowispike.v2', JSON.stringify(s));
            } catch (e) { }
        }, [xp]);
        await R.goto(); await H.sleep(4000);
        for (const id of AURAS) {
            R.step = xp + ':' + id;
            await P.evaluate(id => { localStorage.setItem('lowispike.aura.v1', id); try { window.dispatchEvent(new CustomEvent('lowi:aura', { detail: { id } })); } catch (e) { } }, id);
            await H.sleep(1500);
            const geo = await P.evaluate(() => {
                const box = e => { if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
                const b = document.getElementById('spBubble');
                const plant = b && b.querySelector('.tmg-plant');
                const svg = plant && (plant.tagName === 'svg' ? plant : plant.querySelector('svg'));
                let painted = null;
                try { if (svg) { const g = svg.getBBox(); const ctm = svg.getScreenCTM(); if (ctm) { painted = { x: Math.round(ctm.e + g.x * ctm.a), y: Math.round(ctm.f + g.y * ctm.d), w: Math.round(g.width * ctm.a), h: Math.round(g.height * ctm.d) }; } } } catch (e) { }
                return { aura: document.documentElement.dataset.whAura, fx: document.documentElement.dataset.whFx || '', set: !!document.documentElement.dataset.whAuraSet, bubble: box(b), plant: box(plant), painted, fxl: box(b && b.querySelector(':scope > .wh-fx')), bOverflow: b && getComputedStyle(b).overflow, live: document.documentElement.classList.contains('wh-world-live'), filter: plant ? getComputedStyle(plant).filter.slice(0, 160) : '' };
            });
            const bb = geo.bubble;
            if (bb && bb.w) { const m = Math.round(bb.w * 0.45); await P.screenshot({ path: `${out}/home-${xp}-${id}.png`, clip: { x: Math.max(0, bb.x - m), y: Math.max(0, bb.y - m), width: bb.w + 2 * m, height: bb.h + 2 * m } }).catch(() => { }); }
            /* Misty's card (companion panel) */
            await P.evaluate(() => { try { LowiMistyHub.open(); } catch (e) { } }); await H.sleep(1400);
            const card = await P.evaluate(() => { const a = document.querySelector('.mh-art'); if (!a) return null; const r = a.getBoundingClientRect(); const f = a.querySelector('.wh-fx'); const fr = f && f.getBoundingClientRect(); const p = a.querySelector('.tmg-plant'); const pr = p && p.getBoundingClientRect(); return { art: [r.x, r.y, r.width, r.height].map(Math.round), fx: fr ? [fr.x, fr.y, fr.width, fr.height].map(Math.round) : null, plant: pr ? [pr.x, pr.y, pr.width, pr.height].map(Math.round) : null }; });
            if (card) await P.screenshot({ path: `${out}/card-${xp}-${id}.png`, clip: { x: Math.max(0, card.art[0] - 40), y: Math.max(0, card.art[1] - 40), width: card.art[2] + 80, height: card.art[3] + 80 } }).catch(() => { });
            await P.evaluate(() => { try { LowiMistyHub.close(); } catch (e) { } }); await H.sleep(900);
            res.push(Object.assign({ xp, id, card }, geo));
        }
        /* the shop preview of a locked aura (galaxy is not in the wallet) */
        await P.evaluate(() => { try { LowiMistyHub.open(); LowiMistyHub.openSec('aura'); } catch (e) { } }); await H.sleep(1500);
        for (const e of await P.$$('.wh-aura[data-id="galaxy"]')) { const bb = await e.boundingBox(); if (bb && bb.width) { await e.scrollIntoViewIfNeeded(); await e.click(); break; } }
        await H.sleep(1500);
        await P.evaluate(() => { const s = [...document.querySelectorAll('#whPv .wh-pv-stage')].find(e => e.getBoundingClientRect().width); s && s.scrollIntoView({ block: 'center' }); }); await H.sleep(500);
        const pv = await P.evaluate(() => { const s = [...document.querySelectorAll('#whPv .wh-pv-stage')].find(e => e.getBoundingClientRect().width); if (!s) return null; const r = s.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(Math.round); });
        if (pv) await P.screenshot({ path: `${out}/preview-${xp}-galaxy.png`, clip: { x: Math.max(0, pv[0] - 20), y: Math.max(0, pv[1] - 20), width: pv[2] + 40, height: pv[3] + 40 } }).catch(() => { });
        const labels = await P.evaluate(() => [...document.querySelectorAll('.wh-aura')].map(b => b.dataset.id + ':' + (b.querySelector('small') || {}).textContent));
        res.push({ xp, previewStage: pv, labels });
        await P.screenshot({ path: `${out}/full-${xp}.png` }).catch(() => { });
        res.push({ xp, errs: R.errs.map(e => e.m).filter(m => !/supabase|fetch|WebGL/i.test(m)).slice(0, 6) });
        await R.close();
    }
    fs.writeFileSync(out + '/geo.json', JSON.stringify(res, null, 1));
    console.log(JSON.stringify(res));
    process.exit(0);
})();
