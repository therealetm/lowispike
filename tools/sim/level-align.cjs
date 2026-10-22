'use strict';
// Oct 22, 2026: iPhone 13 (WebKit) check that the profile XP card, the growth map and the earn sheet all show the one level
// table (world-home-core.js STAGES). Usage: node tools/sim/level-align.cjs [url] [lang]
const path = require('path');
const H = require('./harness.cjs');
(async () => {
    const url = process.argv[2] || '', lang = process.argv[3] || 'en';
    const R = await H.open({ root: path.join(__dirname, '..', '..'), url, lang, device: 'iPhone 13', members: 8, messages: 20 });
    const P = R.page; let bad = 0;
    const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) bad++; };
    try {
        await R.ctx.addInitScript(() => { try { const s = JSON.parse(localStorage.getItem('lowispike.v2') || '{}'); if (s.xp !== 1327) { s.xp = 1327; localStorage.setItem('lowispike.v2', JSON.stringify(s)); } } catch (e) { } });
        await R.goto();
        const base = await P.evaluate(() => ({ max: typeof MAX_LEVEL !== 'undefined' ? MAX_LEVEL : -1, t4: titleOf(4), lv: JSON.stringify(levelOf(1327)), whc: !!window.LowiWorldHomeCore, herb: (window.LOWI_HERB_CONFIG || {}).stages ? LOWI_HERB_CONFIG.stages[3].name[0] : '' }));
        console.log(JSON.stringify(base));
        ok(base.whc && base.max === 25 && base.t4 === 'Bright cell' && base.herb === 'Bright cell', 'one table loaded: 25 levels, L4 = Bright cell in profile and herb config');
        await P.evaluate(() => goTab('profile')); await H.sleep(2500);
        const prof = await P.evaluate(() => document.body.innerText);
        const m = prof.match(/(Level|Nivel|Lv|Nv) 4[^\n]*/gi) || [];
        console.log('profile lines:', JSON.stringify(m.slice(0, 4)));
        ok(!/Flourishing|Herb\b|Bloom|Kraut|Hierba/i.test(prof), 'profile shows no old plant level name');
        ok(/Bright cell|Helle Zelle|C\u00e9lula brillante|Leuchtzelle/i.test(prof) || m.some(x => /cell|Zelle|c\u00e9lula/i.test(x)), 'profile XP card shows the cell name');
        await R.shot('/home/sprite/la-' + lang + '-profile.png');
        await P.evaluate(() => window.LowiLevels.open({ scrollToMe: true })); await H.sleep(1500);
        const map = await P.evaluate(() => { const o = document.querySelector('.r3m-mapov'); return o ? o.innerText : ''; });
        const mine = (map.match(/[\d.,]+ \/ [\d.,]+ XP[^\n]*/) || [''])[0], glow = (map.match(/(Unlocked|Unlocks|Freigeschaltet|Ab |Desbloqueado|Con )[^\n]*800 XP[^\n]*/) || [''])[0];
        console.log('map level line:', mine, '| aurora line:', glow);
        ok(/1[.,]327 \/ 1[.,]500 XP/.test(mine) && /173/.test(mine), 'growth map: 1,327 / 1,500 XP and 173 to Level 5');
        ok(/Unlocked at 800 XP|Freigeschaltet bei 800 XP|Desbloqueado con 800 XP/.test(map), 'Aurora reads as already unlocked at 1,327 XP');
        ok(!/into this level|Flourishing|Legendary Bloom/.test(map), 'no level-relative line, no old names in the map');
        await R.shot('/home/sprite/la-' + lang + '-map.png');
        const earnOpened = await P.evaluate(() => { const b = [...document.querySelectorAll('.r3m-mapov [data-r3m], .r3m-mapov button')].find(x => /earn|XP sammelst|ganar XP|How you earn/i.test(x.textContent)); if (b) { b.click(); return true; } return false; });
        await H.sleep(1200);
        const earn = await P.evaluate(() => document.body.innerText);
        if (earnOpened || /How you earn XP|So sammelst du XP/.test(earn)) {
            ok(/Meal gaps|Essenspausen|Pausas entre comidas/.test(earn) && /16/.test(earn), 'earn sheet lists meal gaps up to 16 hours');
            ok(!/fasting longer|l\u00e4ngeres Fasten/.test(earn), 'old wrong fasting line is gone');
            await R.shot('/home/sprite/la-' + lang + '-earn.png');
        } else console.log('note: earn sheet button not found in the map; copy covered by tests/level-table.test.cjs');
        const errs = R.errs.filter(e => !/supabase|realtime|websocket/i.test(e.m));
        ok(errs.length === 0, 'no page errors (' + errs.length + ')'); if (errs.length) console.log(JSON.stringify(errs.slice(0, 5)).slice(0, 1500));
    } catch (e) { console.log('FAIL', e.message.slice(0, 400)); bad++; } finally { await R.close(); }
    console.log(bad ? 'RESULT ' + bad + ' FAIL' : 'RESULT 0 FAIL'); process.exit(bad ? 1 : 0);
})();
