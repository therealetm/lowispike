/* Body fit probe: for each form (by XP) measures on Home where Misty's membrane (cw-wall), her whole drawn body (traits
   included), her svg box, the bubble and the aura layer really are, in CSS px. No purchase, throwaway profile.
   node tools/sim/body-fit.cjs [xps] [aura] [sign-bday] */
'use strict';
const H = require('./harness.cjs');
const xps = (process.argv[2] || '0,300,1500,3000,5000,5657,7500,10500,30000,90000').split(',').map(Number);
const aura = process.argv[3] || 'prism', bday = process.argv[4] || '1997-03-05';
(async () => {
    const out = [];
    const R = await H.open({ engine: process.env.ENGINE || 'chromium', device: 'iPhone 13', probe: false });
    const P = R.page;
    for (const xp of xps) {
        await R.ctx.clearCookies();
        await P.evaluate(([xp, aura, bday]) => {
            localStorage.setItem('lowi.theme', 'dark'); localStorage.setItem('lowi.theme.dark', 'black');
            localStorage.setItem('lowispike.sparks.v1', JSON.stringify({ own: ['ember', 'orbs', 'trail', 'electric', 'prism', 'galaxy', 'nebula'] }));
            localStorage.setItem('lowispike.aura.v1', aura);
            const s = JSON.parse(localStorage.getItem('lowispike.v2') || 'null') || { v: 2, setupDone: true, onboarded: true, ledger: [], logs: [], saved: [], settings: { lang: 'en' } };
            s.xp = xp; s.user = Object.assign({}, s.user || {}, { name: 'Akusi', bday }); localStorage.setItem('lowispike.v2', JSON.stringify(s));
        }, [xp, aura, bday]).catch(() => { });
        if (xp === xps[0]) await R.goto(); else await P.reload();
        await H.sleep(4500);
        const g = await P.evaluate(() => {
            const bx = r => r && { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
            const b = document.getElementById('spBubble'); if (!b) return { none: 1 };
            const sv = b.querySelector('svg.tmg-plant'); if (!sv) return { noSvg: 1 };
            let L = 1e9, T = 1e9, Rr = -1e9, B = -1e9;
            sv.querySelectorAll(':scope > g, :scope > ellipse, :scope > circle, :scope > path').forEach(n => {
                const cs = getComputedStyle(n); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return;
                if (/cf-rx|lh-acc|lh-pot|cw-env|cw-pill|sp-bubble/.test(n.getAttribute('class') || '')) return;
                const r = n.getBoundingClientRect(); if (!r.width) return;
                L = Math.min(L, r.left); T = Math.min(T, r.top); Rr = Math.max(Rr, r.right); B = Math.max(B, r.bottom);
            });
            let painted = null; try { const g = sv.getBBox(), m = sv.getScreenCTM(); painted = { x: Math.round(m.e + g.x * m.a), y: Math.round(m.f + g.y * m.d), w: Math.round(g.width * m.a), h: Math.round(g.height * m.d) }; } catch (e) { }
            const wall = sv.querySelector('.cw-wall'), fx = b.querySelector(':scope > .wh-fx');
            const bs = getComputedStyle(b);
            return { st: sv.getAttribute('data-cf-st'), vb: sv.getAttribute('viewBox'), bubble: bx(b.getBoundingClientRect()), bOverflow: bs.overflow, bClip: bs.clipPath, svgBox: bx(sv.getBoundingClientRect()), painted, content: { x: Math.round(L), y: Math.round(T), w: Math.round(Rr - L), h: Math.round(B - T) }, wall: bx(wall && wall.getBoundingClientRect()), fx: bx(fx && fx.getBoundingClientRect()), aura: document.documentElement.dataset.whAura, whfx: document.documentElement.dataset.whFx || '', vw: innerWidth };
        });
        out.push(Object.assign({ xp }, g));
        console.log(JSON.stringify(Object.assign({ xp }, g)));
        if (process.env.SHOT) { const b = g.bubble; if (b) await P.screenshot({ path: `${process.env.SHOT}/home-${xp}.png`, clip: { x: Math.max(0, b.x - 80), y: Math.max(0, b.y - 80), width: Math.min(390, b.w + 160), height: b.h + 160 } }).catch(() => { }); }
    }
    await R.close(); process.exit(0);
})();
