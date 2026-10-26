'use strict';
/* BH-013 check: XP jumps while the companion card is open (evolution has to wait), then the app reloads before the card closes.
   The evolution must still play once after the reload, and not again after it is closed and the app reloads a second time.
   usage: node probe-evo-reload.cjs <url|dir> [view] */
const L = require('./lib.cjs');
(async () => {
    const target = process.argv[2]; const view = process.argv[3] || 'chromium390';
    let srv = null, url = target;
    if (!/^https?:/.test(target)) { srv = await L.serve(target); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
    const h = await L.open({ view, url, settle: 9000 }); const P = h.page;
    const evo = () => P.evaluate(() => { const e = document.getElementById('lhEvolution'); return !!(e && e.getBoundingClientRect().width); });
    const prefs = () => P.evaluate(() => { const k = Object.keys(localStorage).find(k => k.startsWith('lowi.herb.tamagotchi.v2:')); const p = k && JSON.parse(localStorage.getItem(k)); return p && { last: p.lastSeenStage, evoFrom: p.evoFrom }; });
    await P.evaluate(() => LowiMistyHub.open()); await L.sleep(1200);
    await P.evaluate(() => { const s = LowiR2.S(); s.xp = 5000; try { LowiR2.save && LowiR2.save(); } catch (e) { } LowiHerbTamagotchi.refresh(); });
    let t = 0; while (t < 20000) { const p = await prefs(); if (p && p.last >= 6) break; await L.sleep(500); t += 500; }
    const before = { prefs: await prefs(), evoShown: await evo() };
    console.log('card open, xp 5000:', JSON.stringify(before));
    await P.reload({ waitUntil: 'load' }); let seen = -1; t = 0; while (t < 20000) { if (await evo()) { seen = t; break; } await L.sleep(500); t += 500; }
    console.log('after reload: evolution shown after ms', seen, JSON.stringify(await prefs()));
    await P.evaluate(() => { const b = document.querySelector('#lhEvolution [data-tmg=evolution-close]') || document.querySelector('#lhEvolution button'); if (b) b.click(); }); await L.sleep(1500);
    console.log('closed:', JSON.stringify({ evo: await evo(), prefs: await prefs(), evolving: await P.evaluate(() => document.documentElement.classList.contains('herb-evolving')) }));
    await P.reload({ waitUntil: 'load' }); await L.sleep(12000);
    console.log('second reload, evolution again?', await evo(), JSON.stringify(await prefs()));
    console.log('SUMMARY', JSON.stringify({ view, pass: seen >= 0, pageerror: h.log.pageerror.slice(0, 4) }));
    await h.browser.close(); if (srv) srv.close();
})().catch(e => { console.log('PROBE ERROR', e.stack); process.exit(1); });
