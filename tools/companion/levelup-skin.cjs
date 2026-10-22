'use strict';
/* levelup-skin.cjs (Oct 22 2026): the level-up card must paint the same cell skin as Home, never the old flowery herb.
   Three cases per device:
     fresh  - a fresh user levels up during the session
     boot   - "another phone": the level-up is found while the app is still opening (prefs say an older form was last seen)
     legacy - the same, with prefs saved by the old herb (stage as text, a herb-era evoFrom, old skin keys)
   node tools/companion/levelup-skin.cjs [--devices "iPhone SE,iPhone 13,iPhone 15,Pixel 7"] [--out DIR] [--root DIR]
   Exit 1 when a card shows no cell, any old herb part, the placeholder orb, or a page error. Not a physical phone. */
const path = require('path'), fs = require('fs');
const A = process.argv.slice(2), arg = (k, d) => { const i = A.indexOf('--' + k); return i >= 0 ? A[i + 1] : d; };
if (arg('root')) process.env.IA_ROOT = path.resolve(arg('root'));
const L = require('../interface-audit/lib.cjs');
const OUT = path.resolve(arg('out', '/home/sprite/levelup-shots')); fs.mkdirSync(OUT, { recursive: true });
const DEVICES = arg('devices', 'iPhone SE,iPhone 13,iPhone 15,Pixel 7').split(',');

const inspect = () => {
    const e = document.getElementById('lhEvolution'); if (!e) return { open: false };
    const part = sel => { const s = e.querySelector(sel + ' svg'); if (!s) return null; return { cell: !!s.querySelector('[class^="cw-"]'), orb: s.classList.contains('lh-orb'), herb: s.querySelectorAll('.lh-leaf,.lh-blossom,.lh-pot path[d^="M88 247"]').length + (s.querySelector('[class^="cw-"]') ? 0 : s.querySelectorAll('.lh-body').length), form: s.getAttribute('data-stage') || s.getAttribute('data-cf-st') || '' }; };
    const home = document.querySelector('#tab-home svg.tmg-plant, .wh-stage svg.tmg-plant, svg.tmg-plant');
    return { open: true, title: (e.querySelector('h2') || {}).textContent || '', before: part('.lh-evo-before'), after: part('.lh-evo-after'), homeCell: !!(home && home.querySelector('[class^="cw-"]')), herbAnywhere: document.querySelectorAll('.lh-leaf,.lh-blossom').length };
};

async function run(device, mode) {
    const engine = /Pixel/.test(device) ? 'chromium' : 'webkit';
    const h = await L.launch({ device, engine });
    const { page } = h;
    try {
        await L.openApp(h, { settle: 4000 });
        if (mode === 'fresh') {
            await page.evaluate(() => { const T = window.LowiHerbTamagotchi, m = T.current().m; T.evolve(Object.assign({}, m, { index: Math.max(1, m.index) }), Math.max(0, m.index - 1)); });
        } else {
            await page.evaluate(legacy => {
                const k = Object.keys(localStorage).find(x => x.startsWith('lowi.herb.tamagotchi.v2:')); const T = window.LowiHerbTamagotchi, m = T.current().m;
                const p = JSON.parse(localStorage.getItem(k) || '{}'); delete p.skinV; delete p.evoFrom;
                p.lastSeenStage = legacy ? String(Math.max(0, m.index - 1)) : Math.max(0, m.index - 1);
                if (legacy) Object.assign(p, { herbSkin: 'flowery', potStyle: 'terracotta', design: 'herb-v1', equipment: { pot: 'terracotta-old', hat: 'flower-crown', petals: 'pink' } });
                localStorage.setItem(k, JSON.stringify(p));
            }, mode === 'legacy');
            await page.reload({ waitUntil: 'commit' }); /* not 'load': on a slow Pixel run the card can open and finish (7 s) before load fires */
        }
        let r = { open: false };
        for (let t = 0; t < 120 && !r.open; t++) { await L.sleep(250); r = await page.evaluate(inspect).catch(() => ({ open: false })); }
        if (r.open) { await L.sleep(1500); const r2 = await page.evaluate(inspect); if (r2.open) r = r2; }
        const shot = path.join(OUT, device.replace(/\s+/g, '') + '-' + mode + '.png'); await page.screenshot({ path: shot });
        if (mode === 'legacy') r.prefs = await page.evaluate(() => { const k = Object.keys(localStorage).find(x => x.startsWith('lowi.herb.tamagotchi.v2:')); const p = JSON.parse(localStorage.getItem(k) || '{}'); return { skinV: p.skinV, lastSeenStage: p.lastSeenStage, herbSkin: p.herbSkin, pot: p.equipment && p.equipment.pot }; });
        const ok = r.open && r.after && r.after.cell && !r.after.orb && !r.after.herb && (!r.before || (r.before.cell && !r.before.herb && !r.before.orb)) && !r.herbAnywhere && !h.errors.length;
        return { device, mode, ok, r, shot, errors: h.errors };
    } finally { await h.browser.close(); }
}

(async () => {
    const out = []; let bad = 0;
    for (const d of DEVICES) for (const m of ['fresh', 'boot', 'legacy']) {
        let res; try { res = await run(d, m); } catch (e) { res = { device: d, mode: m, ok: false, error: String(e).slice(0, 200) }; }
        if (!res.ok) bad++;
        console.log((res.ok ? 'PASS ' : 'FAIL ') + d + ' ' + m + ' ' + JSON.stringify(res.r || res.error) + (res.errors && res.errors.length ? ' errors=' + JSON.stringify(res.errors) : ''));
        out.push(res);
    }
    console.log(bad + ' FAIL of ' + out.length);
    process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
