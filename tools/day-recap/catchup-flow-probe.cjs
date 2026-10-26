'use strict';
/* The real evening catch-up into the Day recap (MAYA-HANDOFF 0.39 + 0.40), real taps in WebKit.
   node tools/day-recap/catchup-flow-probe.cjs [--url ...] [--view iphone13|ipadP] [--lang de] [--rm]
   Opens Catch up on today, answers each bubble with its first choice, taps Save, taps the finish button, and checks that
   the recap is not on top of the catch-up, then opens by itself once with the new meal counted. Exit 1 on problems. */
const L = require(process.env.BH_LIB || '/home/sprite/BUGHUNT/playtest/lib.cjs');
const path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const has = k => process.argv.includes('--' + k);
(async () => {
    let srv = null, url = arg('url', '');
    if (!url) { srv = await L.serve(path.join(__dirname, '..', '..')); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
    const view = arg('view', 'iphone13'), lang = arg('lang', 'en');
    const preInit = `try { localStorage.setItem('lowi.lang', '${lang}'); localStorage.setItem('lowispike.lang', '${lang}'); } catch (e) { }`;
    const h = await L.open({ url, view, lang, preInit, reducedMotion: has('rm') });
    const P = h.page, out = { view, lang, rm: has('rm'), steps: [], problems: [] }, bad = m => out.problems.push(m);
    const recapOpen = () => P.evaluate(() => !!document.querySelector('.r2-ov:not(.off) #dayRecap'));
    const stable = async sel => { let last = ''; for (let i = 0; i < 60; i++) { const r = await P.evaluate(q => { const e = document.querySelector(q); if (!e) return ''; const b = e.getBoundingClientRect(); return b.width ? Math.round(b.left) + ',' + Math.round(b.top) : ''; }, sel); if (r && r === last) return true; last = r; await L.sleep(250); } return false; };
    const tapSel = async sel => { await stable(sel); const c = await L.center(h, sel); if (!c) return false; await L.tap(h, c.x, c.y); await L.sleep(450); return true; };
    try {
        await L.sleep(800);
        await P.evaluate(() => window.LowiEveningCatchup.open());
        await L.sleep(900);
        let saved = false;
        for (let i = 0; i < 40 && !saved; i++) {
            const k = await P.evaluate(() => { const q = s => document.querySelector('.ec-ov ' + s); return q('[data-ec="save"]') ? 'save' : q('[data-ec="pick"][data-k="0"]') ? 'pick' : q('[data-ec="open"]') ? 'open' : q('.ec-big[data-ec="close"]') ? 'close' : ''; });
            out.steps.push(k);
            if (!k) { await L.sleep(400); continue; }
            if (k === 'save') { await tapSel('.ec-ov [data-ec="save"]'); saved = true; break; }
            if (k === 'close') { bad('catch-up ended without a Save step'); break; }
            await tapSel(k === 'pick' ? '.ec-ov [data-ec="pick"][data-k="0"]' : '.ec-ov [data-ec="open"]');
        }
        if (!saved) bad('never reached Save');
        await L.sleep(1500);
        out.recapOverCatchUp = await recapOpen();
        if (out.recapOverCatchUp) bad('recap opened on top of the catch-up finish screen');
        out.finish = await P.evaluate(() => { const b = document.querySelector('.ec-ov .ec-big[data-ec="close"]'); return b ? b.innerText : ''; });
        if (!out.finish) bad('no finish button'); else await tapSel('.ec-ov .ec-big[data-ec="close"]');
        for (let i = 0; i < 24 && !out.recapAfter; i++) { await L.sleep(250); out.recapAfter = await recapOpen(); out.afterMs = (i + 1) * 250; }
        if (!out.recapAfter) bad('recap did not follow the catch-up Save');
        else {
            await L.sleep(1500);
            out.recap = await P.evaluate(() => { const s = document.querySelector('#dayRecap'); return { say: s.querySelector('[data-drc-say]').innerText, stats: Array.from(s.querySelectorAll('.drc-st')).map(e => e.innerText.replace(/\s+/g, ' ')), meals: s.querySelectorAll('.drc-meals li').length, journal: !!s.querySelector('[data-drc-journal]'), insulin: /insulin/i.test(s.innerText), misty: /Misty/.test(s.innerText) }; });
            if (out.recap.insulin) bad('says insulin');
            if (!out.recap.journal) bad('no journal line');
            await P.evaluate(() => window.LowiDayRecap.close()); await L.sleep(1500);
            out.stayedShut = !(await recapOpen()); if (!out.stayedShut) bad('reopened by itself');
        }
    } catch (e) { bad('probe error ' + e.message); }
    out.errors = { page: h.log.pageerror, mon: await P.evaluate(() => window.__bh && { err: window.__bh.err, rej: window.__bh.rej }).catch(() => null) };
    if (out.errors.page.length || (out.errors.mon && (out.errors.mon.err.length || out.errors.mon.rej.length))) bad('errors');
    console.log(JSON.stringify(out, null, 1));
    await h.browser.close(); if (srv) srv.close();
    process.exit(out.problems.length ? 1 : 0);
})();
