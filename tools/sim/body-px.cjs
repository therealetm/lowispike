/* Pixel-true body fit: hides everything on Home except Misty's drawn body (no aura, no world, black page) and screenshots the
   bubble area, so tools/sim/body-px.py can measure how far her painted pixels reach from the bubble centre in every direction.
   node tools/sim/body-px.cjs outdir [xps] [bday] */
'use strict';
const H = require('./harness.cjs'), fs = require('fs');
const out = process.argv[2] || '/tmp/bpx'; fs.mkdirSync(out, { recursive: true });
const xps = (process.argv[3] || '0,300,1500,3000,5657,7500,10500,30000').split(',').map(Number);
const bday = process.argv[4] || '1997-03-05';
(async () => {
    const R = await H.open({ engine: process.env.ENGINE || 'chromium', device: 'iPhone 13', probe: false });
    const P = R.page; const meta = [];
    for (const xp of xps) {
        await P.evaluate(([xp, bday]) => {
            localStorage.setItem('lowi.theme', 'dark'); localStorage.setItem('lowi.theme.dark', 'black'); localStorage.setItem('lowispike.aura.v1', 'dew');
            const s = JSON.parse(localStorage.getItem('lowispike.v2') || 'null') || { v: 2, setupDone: true, onboarded: true, ledger: [], logs: [], saved: [], settings: { lang: 'en' } };
            s.xp = xp; s.user = Object.assign({}, s.user || {}, { name: 'Akusi', bday }); localStorage.setItem('lowispike.v2', JSON.stringify(s));
        }, [xp, bday]).catch(() => { });
        if (xp === xps[0]) await R.goto(); else await P.reload();
        await H.sleep(4500);
        const b = await P.evaluate(() => {
            const st = document.createElement('style'); st.id = 'isoStyle';
            st.textContent = 'html,body{background:#000 !important} *{visibility:hidden !important;animation-play-state:paused !important} #spBubble svg.tmg-plant, #spBubble svg.tmg-plant *{visibility:visible !important} #spBubble svg.tmg-plant{filter:none !important} #spBubble{overflow:visible !important}';
            document.head.appendChild(st);
            const e = document.getElementById('spBubble'); const r = e.getBoundingClientRect();
            return { x: r.left, y: r.top, w: r.width, h: r.height, st: (e.querySelector('svg.tmg-plant') || {}).getAttribute && e.querySelector('svg.tmg-plant').getAttribute('data-cf-st') };
        });
        await H.sleep(300);
        const m = Math.round(b.w * 0.35);
        const clip = { x: Math.max(0, Math.round(b.x - m)), y: Math.max(0, Math.round(b.y - m)), width: Math.round(b.w + 2 * m), height: Math.round(b.h + 2 * m) };
        await P.screenshot({ path: `${out}/body-${xp}.png`, clip });
        meta.push({ xp, st: b.st, bubble: b, clip });
        await P.evaluate(() => { const s = document.getElementById('isoStyle'); s && s.remove(); });
    }
    fs.writeFileSync(out + '/meta.json', JSON.stringify(meta));
    await R.close(); process.exit(0);
})();
