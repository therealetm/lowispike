/* Aura layer alone, measured: for every aura on Home, Misty's card and the shop preview it screenshots (1) only the aura
   layer (.wh-fx with the membrane light) and (2) only Misty's drawn body, each on black with everything else hidden, so
   tools/sim/fx-px.py can say where the effect is drawn relative to the membrane and how much of it covers her body.
   Throwaway profile, nothing bought (the wallet is written for the test).  node tools/sim/fx-px.cjs outdir [xp] [auras] */
'use strict';
const H = require('./harness.cjs'), fs = require('fs');
const out = process.argv[2] || '/tmp/fxpx'; fs.mkdirSync(out, { recursive: true });
const xp = +(process.argv[3] || 5657);
const AUR = (process.argv[4] || 'dew,nebula,ember,orbs,trail,electric,prism,galaxy').split(',');
const ISO = sel => 'html,body{background:#000 !important} *{visibility:hidden !important} ' + sel + '{visibility:visible !important} #spBubble{overflow:visible !important}';
(async () => {
    const R = await H.open({ engine: process.env.ENGINE || 'chromium', device: 'iPhone 13', probe: false });
    const P = R.page; const meta = [];
    await R.ctx.addInitScript(([xp]) => {
        localStorage.setItem('lowi.theme', 'dark'); localStorage.setItem('lowi.theme.dark', 'black');
        localStorage.setItem('lowispike.sparks.v1', JSON.stringify({ own: ['ember', 'orbs', 'trail', 'electric', 'prism', 'galaxy'], n: 50 }));
        if (!localStorage.getItem('lowispike.aura.v1')) localStorage.setItem('lowispike.aura.v1', 'prism');
        const s = JSON.parse(localStorage.getItem('lowispike.v2') || 'null') || { v: 2, setupDone: true, onboarded: true, ledger: [], logs: [], saved: [], settings: { lang: 'en' } };
        s.xp = xp; s.user = Object.assign({}, s.user || {}, { name: 'Akusi', bday: '1997-03-05' }); localStorage.setItem('lowispike.v2', JSON.stringify(s));
    }, [xp]);
    await R.goto(); await H.sleep(4500);
    const shot = async (name, rootSel, extra) => {
        const box = await P.evaluate(sel => { const e = [...document.querySelectorAll(sel)].find(x => x.getBoundingClientRect().width); if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }, rootSel);
        if (!box) return null;
        await H.sleep(250);
        const b2 = await P.evaluate(sel => { const e = [...document.querySelectorAll(sel)].find(x => x.getBoundingClientRect().width); const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; }, rootSel);
        const m = Math.round(b2.w * .6);
        const clip = { x: Math.max(0, Math.round(b2.x - m)), y: Math.max(0, Math.round(b2.y - m)), width: Math.round(b2.w + 2 * m), height: Math.round(b2.h + 2 * m) };
        for (const [k, sel] of [['fx', rootSel + ' .wh-fx, ' + rootSel + ' .wh-fx *'], ['body', rootSel + ' svg.tmg-plant, ' + rootSel + ' svg.tmg-plant *']]) {
            await P.evaluate(css => { const s = document.createElement('style'); s.id = 'isoS'; s.textContent = css; document.head.appendChild(s); }, ISO(sel) + (k === 'body' ? ' svg.tmg-plant{filter:none !important}' : ''));
            await H.sleep(120);
            await P.screenshot({ path: `${out}/${name}-${k}.png`, clip }).catch(() => { });
            await P.evaluate(() => { const s = document.getElementById('isoS'); s && s.remove(); });
        }
        return { box: b2, clip };
    };
    for (const id of AUR) {
        await P.evaluate(id => { localStorage.setItem('lowispike.aura.v1', id); }, id);
        await P.reload(); await H.sleep(4200);
        const home = await shot(`home-${id}`, '#spBubble');
        const live = await P.evaluate(() => document.documentElement.classList.contains('wh-world-live'));
        await P.evaluate(() => LowiMistyHub.open()); await H.sleep(2600);
        const card = await shot(`card-${id}`, '.mh-art');
        meta.push({ id, live, home, card }); fs.writeFileSync(out + '/meta.json', JSON.stringify(meta));
        await P.evaluate(() => LowiMistyHub.close()); await H.sleep(600);
    }
    /* the shop preview, for an aura that is not owned in this wallet: nebula and a level glow are owned; preview galaxy by taking it out */
    await P.evaluate(() => { localStorage.setItem('lowispike.sparks.v1', JSON.stringify({ own: ['prism'], n: 50 })); localStorage.setItem('lowispike.aura.v1', 'prism'); });
    await P.reload(); await H.sleep(4200);
    for (const id of ['ember', 'orbs', 'trail', 'electric', 'galaxy']) {
        await P.evaluate(() => LowiMistyHub.openSec('aura')); await H.sleep(1200);
        await P.evaluate(id => { const b = [...document.querySelectorAll('.wh-aura[data-id="' + id + '"]')].find(x => x.getBoundingClientRect().width); if (b) { b.scrollIntoView({ block: 'center' }); b.click(); } }, id);
        await H.sleep(1200);
        const pv = await shot(`pv-${id}`, '.wh-pv-stage');
        meta.push({ id, preview: pv }); fs.writeFileSync(out + '/meta.json', JSON.stringify(meta));
        await P.evaluate(() => LowiMistyHub.close()); await H.sleep(500);
    }
    console.log(JSON.stringify({ errs: R.errs.map(e => e.m).filter(m => !/supabase|fetch/i.test(m)).slice(0, 5) }));
    await R.close(); process.exit(0);
})();
