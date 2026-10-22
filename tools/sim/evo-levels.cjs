'use strict';
// Oct 22, 2026, evolution step 1: 25 levels. Simulated phone check of the floor (4,600 XP keeps Level 7), a high-level user
// (20,000 XP = Level 11 Pulsar cell), the growth map's 25 rows with Evolution marks at 5/10/15/20/25, Misty's sheet, and Forms.
// Usage: node tools/sim/evo-levels.cjs [device] [lang] [url]   e.g. node tools/sim/evo-levels.cjs "iPhone SE" de
const path = require('path');
const H = require('./harness.cjs');
const device = process.argv[2] || 'iPhone 13', lang = process.argv[3] || 'en', url = process.argv[4] || '';
const tag = device.replace(/\s+/g, '') + '-' + lang;
let bad = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + '[' + tag + '] ' + m); if (!c) bad++; };

async function run(xp, fn) {
    const R = await H.open({ root: path.join(__dirname, '..', '..'), url, lang, device, members: 8, messages: 20 });
    try {
        await R.ctx.addInitScript(([x, l]) => {
            try { const s = JSON.parse(localStorage.getItem('lowispike.v2') || '{}'); s.xp = x; localStorage.setItem('lowispike.v2', JSON.stringify(s)); localStorage.removeItem('lowi.lvCurve'); localStorage.removeItem('lowi.lvFloor'); if (l !== 'en') localStorage.setItem('lowispike.lang', l); } catch (e) { }
        }, [xp, lang]);
        await R.goto(); await H.sleep(2500);
        await fn(R, R.page);
        const errs = R.errs.filter(e => !/supabase|realtime|websocket/i.test(e.m));
        ok(errs.length === 0, xp + ' XP: no page errors (' + errs.length + ')'); if (errs.length) console.log(JSON.stringify(errs.slice(0, 4)).slice(0, 1200));
    } catch (e) { ok(false, xp + ' XP: ' + e.message.slice(0, 300)); } finally { await R.close(); }
}

async function mapCheck(R, P, xp, want) {
    await P.evaluate(() => window.LowiLevels.open({ scrollToMe: true })); await H.sleep(1600);
    /* the app translates the map a moment after it opens; on a busy machine wait for it (up to 6 s) */
    if (lang !== 'en') for (let k = 0; k < 12; k++) { const t = await P.evaluate(() => { const r = document.querySelector('.r3m-mapov .r3m-row[data-n="15"]'); return r ? r.innerText : ''; }); if (!/Evolution \d/.test(t)) break; await H.sleep(500); }
    const m = await P.evaluate(() => {
        const rows = [...document.querySelectorAll('.r3m-mapov .r3m-row')];
        const evo = rows.filter(r => r.querySelector('.r3m-evo')).map(r => +r.dataset.n);
        const cur = (rows.find(r => r.classList.contains('cur')) || {}).dataset;
        const cut = rows.filter(r => { const b = r.querySelector('.r3m-rt b'), sm = r.querySelector('.r3m-rt small'); return (b && b.scrollWidth > b.clientWidth + 1) || (sm && sm.scrollWidth > sm.clientWidth + 1); }).map(r => +r.dataset.n);
        const r15 = rows.find(r => r.dataset.n === '15'), r25 = rows.find(r => r.dataset.n === '25');
        const vw = innerWidth, wide = rows.filter(r => r.getBoundingClientRect().right > vw + 1).length;
        return { n: rows.length, evo, cur: cur ? +cur.n : 0, cut, wide, t15: r15 ? r15.innerText.replace(/\s+/g, ' ').slice(0, 90) : '', t25: r25 ? r25.innerText.replace(/\s+/g, ' ').slice(0, 90) : '' };
    });
    console.log(JSON.stringify(m));
    ok(m.n === 25, xp + ' XP: growth map has 25 levels');
    ok(JSON.stringify(m.evo) === '[5,10,15,20,25]', xp + ' XP: Evolution marked on levels 5, 10, 15, 20, 25');
    ok(m.cur === want, xp + ' XP: map marks Level ' + want + ' as yours');
    ok(m.wide === 0, xp + ' XP: no row wider than the screen');
    const evoWord = { en: 'Evolution 3', de: 'Entwicklung 3', es: 'Evolución 3' }[lang];
    ok(m.t15.includes(evoWord) && /Supernova/.test(m.t15), xp + ' XP: level 15 reads "' + evoWord + '" and Supernova');
    await P.evaluate(() => { const r = document.querySelector('.r3m-mapov .r3m-row[data-n="15"]'); if (r) r.scrollIntoView({ block: 'center' }); }); await H.sleep(500);
    await R.shot('/home/sprite/evo-' + tag + '-' + xp + '-map.png');
    await P.evaluate(() => { const x = document.querySelector('.r3m-mapov [data-r3m="close"], .r3m-mapov .r3m-x'); if (x) x.click(); else history.back(); }); await H.sleep(800);
}

(async () => {
    /* 1) 4,600 XP: old curve Level 7, new curve Level 6 -> keeps Level 7 as a floor */
    await run(4600, async (R, P) => {
        const s = await P.evaluate(() => ({ curve: localStorage.getItem('lowi.lvCurve'), floor: localStorage.getItem('lowi.lvFloor'), me: levelOf(S.xp, true), plain: levelOf(S.xp).L, max: MAX_LEVEL }));
        console.log(JSON.stringify(s));
        ok(s.max === 25 && s.curve === '2', '25 levels and the curve change ran once');
        ok(s.floor === '7' && s.me.L === 7 && s.plain === 6, '4,600 XP keeps Level 7 (floor), not 6');
        ok(s.me.left === 2900, 'XP to Level 8 on the new curve: 2,900');
        await P.evaluate(() => { try { window.LowiMistyHub && window.LowiMistyHub.open && window.LowiMistyHub.open(); } catch (e) { } }); await H.sleep(1500);
        const hub = await P.evaluate(() => { const el = document.querySelector('.mh, #mistyHub, [class*="mh-"]'); return el ? el.innerText.replace(/\s+/g, ' ').slice(0, 300) : ''; });
        console.log('misty sheet:', hub.slice(0, 200));
        ok(!hub || /Nova/.test(hub), 'Misty\'s sheet shows Nova (Level 7)');
        await R.shot('/home/sprite/evo-' + tag + '-4600-misty.png');
        await P.evaluate(() => { document.querySelectorAll('[data-mh="close"], .mh-x').forEach(b => b.click()); }); await H.sleep(600);
        await mapCheck(R, P, 4600, 7);
    });
    /* 2) 20,000 XP: above the old cap -> Level 11 Pulsar cell, next evolution at 15 */
    await run(20000, async (R, P) => {
        const s = await P.evaluate(() => ({ floor: localStorage.getItem('lowi.lvFloor'), me: levelOf(S.xp, true), t: titleOf(11) }));
        console.log(JSON.stringify(s));
        ok(s.floor === null && s.me.L === 11 && s.t === 'Pulsar cell', '20,000 XP is Level 11 Pulsar cell (went up, no floor)');
        ok(s.me.left === 1200, 'XP to Level 12: 1,200');
        const f = await P.evaluate(() => { try { if (window.LowiCompanion && window.LowiCompanion.open) window.LowiCompanion.open(); } catch (e) { } return new Promise(r => setTimeout(() => { const el = document.querySelector('.cf-misty'); r(el ? el.innerText.replace(/\s+/g, ' ') : ''); }, 1500)); });
        const more = { en: 'More evolutions at level 15, 20, 25', de: 'Weitere Entwicklungen bei Level 15, 20, 25', es: 'Más evoluciones en el nivel 15, 20, 25' }[lang];
        const nxt = { en: 'next evolution at level 15', de: 'nächste Entwicklung bei Level 15', es: 'próxima evolución en el nivel 15' }[lang];
        ok(f.includes(more), 'Forms lists the evolutions still to come');
        ok(f.includes(nxt) && !/Final form reached|Letzte Form erreicht|Forma final alcanzada/.test(f), 'Forms: next evolution at level 15, not "final form"');
        const fit = await P.evaluate(() => { const el = document.querySelector('.cf-next'); return el ? el.scrollWidth <= el.clientWidth + 1 : true; });
        ok(fit, 'Forms next-evolution line fits');
        await P.evaluate(() => { const el = document.querySelector('.cf-next'); if (el) el.scrollIntoView({ block: 'center' }); }); await H.sleep(400);
        await R.shot('/home/sprite/evo-' + tag + '-20000-forms.png');
        await P.evaluate(() => { const x = document.querySelector('.cf-misty [data-cf="close"]'); if (x) x.click(); }); await H.sleep(700);
        await mapCheck(R, P, 20000, 11);
    });
    console.log(bad ? 'RESULT ' + bad + ' FAIL' : 'RESULT 0 FAIL'); process.exit(bad ? 1 : 0);
})();
