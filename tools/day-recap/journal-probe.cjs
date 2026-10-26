'use strict';
/* Day recap journal line + care + after-catch-up proof (MAYA-HANDOFF 0.40, continue run Oct 27).
   node tools/day-recap/journal-probe.cjs [--url ...] [--view iphone13|ipad] [--lang de] [--rm]
   Seeds care sent today, opens the recap, checks the care card, types a journal line with real key presses, checks the
   speak-to-type mic button sits on the field, closes, reopens (line still there), then fakes the evening catch-up:
   while html.ec-open is set the recap stays shut; after it goes, the recap opens once. Prints JSON; exit 1 on problems. */
const L = require(process.env.BH_LIB || '/home/sprite/BUGHUNT/playtest/lib.cjs');
const path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const has = k => process.argv.includes('--' + k);
(async () => {
    let srv = null, url = arg('url', '');
    if (!url) { srv = await L.serve(path.join(__dirname, '..', '..')); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
    const view = arg('view', 'iphone13'), lang = arg('lang', 'en');
    const preInit = `try { localStorage.setItem('lowi.lang', '${lang}'); localStorage.setItem('lowispike.lang', '${lang}');
      const d = new Date(), p = n => String(n).padStart(2, '0'), k = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
      if (!sessionStorage.getItem('drcj.seeded')) { sessionStorage.setItem('drcj.seeded', '1');
        const s = JSON.parse(localStorage.getItem('lowispike.v2') || '{}');
        s.ledger = [{ day: k, amt: 5, src: 'care-sent', ts: Date.now() }, { day: k, amt: 5, src: 'care-sent', ts: Date.now() }];
        localStorage.setItem('lowispike.v2', JSON.stringify(s)); localStorage.removeItem('lowi.dayrecap.journal.v1'); } } catch (e) { }`;
    const h = await L.open({ url, view, lang, preInit, reducedMotion: has('rm') });
    const P = h.page, out = { view, lang, problems: [] }, bad = m => out.problems.push(m);
    const settled = async () => { for (let i = 0; i < 150; i++) { const ok = await P.evaluate(() => { const s = document.querySelector('.r2-ov.on:not(.off) #dayRecap'); if (!s) return false; const t = getComputedStyle(s.closest('.r2-sh')).transform; return t === 'none' || /, 0\)$/.test(t); }); if (ok) return true; await L.sleep(200); } return false; };
    const isOpen = () => P.evaluate(() => !!document.querySelector('.r2-ov:not(.off) #dayRecap'));
    try {
        await P.evaluate(() => window.LowiDayRecap.open()); await L.sleep(500); out.settled = await settled();
        out.care = await P.evaluate(() => { const e = document.querySelector('#dayRecap .drc-st[data-k="care"]'); return e ? e.innerText.replace(/\s+/g, ' ') : null; });
        if (!out.care || !/^2 /.test(out.care)) bad('no care card: ' + out.care);
        await P.evaluate(() => { const f = document.querySelector('#dayRecap [data-drc-journal]'); f && f.scrollIntoView({ block: 'center' }); }); await L.sleep(700);
        out.field = await P.evaluate(() => { const f = document.querySelector('#dayRecap [data-drc-journal]'); if (!f) return null; const r = f.getBoundingClientRect(), m = f.parentElement.querySelector('.mic-btn');
            return { fs: parseFloat(getComputedStyle(f).fontSize), h: Math.round(r.height), left: Math.round(r.left), right: Math.round(r.right), vw: innerWidth, top: Math.round(r.top), vh: innerHeight, ph: f.placeholder, label: f.parentElement.querySelector('span').innerText, mic: !!m }; });
        if (!out.field) bad('no journal field');
        else {
            if (out.field.fs < 16) bad('journal text too small');
            if (out.field.h < 44) bad('journal field too short to tap');
            if (out.field.right > out.field.vw || out.field.left < 0) bad('journal field off screen');
            if (!out.field.mic) bad('no speak-to-type mic on the journal field');
            const c = await L.center(h, '#dayRecap [data-drc-journal]');
            await L.tap(h, c.x, c.y); await L.sleep(300);
            await P.keyboard.type('Okay... today was good'); await P.keyboard.press('Enter'); await L.sleep(500);
            out.saved = await P.evaluate(() => { try { return JSON.parse(localStorage.getItem('lowi.dayrecap.journal.v1') || '{}'); } catch (e) { return null; } });
            if (!out.saved || !Object.values(out.saved).includes('Okay... today was good')) bad('journal line not saved');
            out.savedNote = await P.evaluate(() => { const e = document.querySelector('#dayRecap [data-drc-jr-ok]'); return e && !e.hidden ? e.innerText : ''; });
            if (!out.savedNote) bad('no saved note');
        }
        await P.evaluate(() => window.LowiDayRecap.close()); await L.sleep(900);
        if (await isOpen()) bad('did not close');
        await P.evaluate(() => window.LowiDayRecap.open()); await L.sleep(500); await settled();
        out.reopened = await P.evaluate(() => { const f = document.querySelector('#dayRecap [data-drc-journal]'); return f ? f.value : null; });
        if (out.reopened !== 'Okay... today was good') bad('line not kept: ' + out.reopened);
        await P.evaluate(() => window.LowiDayRecap.close()); await L.sleep(900);
        /* the evening catch-up's Save: the recap waits for its screen to close, then opens once */
        await P.evaluate(() => { document.documentElement.classList.add('ec-open'); window.dispatchEvent(new CustomEvent('lowi:catchup-saved', { detail: { n: 2 } })); });
        await L.sleep(1500);
        out.openWhileCatchUp = await isOpen();
        if (out.openWhileCatchUp) bad('recap opened over the catch-up');
        await P.evaluate(() => document.documentElement.classList.remove('ec-open'));
        for (let i = 0; i < 16 && !out.openAfterCatchUp; i++) { await L.sleep(250); out.openAfterCatchUp = await isOpen(); out.afterMs = (i + 1) * 250; }
        out.ovs = await P.evaluate(() => Array.from(document.querySelectorAll('.r2-ov')).map(e => e.className).join('|'));
        if (!out.openAfterCatchUp) bad('recap did not follow the catch-up Save');
        await P.evaluate(() => window.LowiDayRecap.close()); await L.sleep(1200);
        out.stayedShut = !(await isOpen());
        if (!out.stayedShut) bad('recap reopened by itself');
    } catch (e) { bad('probe error ' + e.message); }
    out.errors = { page: h.log.pageerror, mon: await P.evaluate(() => window.__bh && { err: window.__bh.err, rej: window.__bh.rej }).catch(() => null) };
    if (out.errors.page.length || (out.errors.mon && (out.errors.mon.err.length || out.errors.mon.rej.length))) bad('errors');
    console.log(JSON.stringify(out, null, 1));
    await h.browser.close(); if (srv) srv.close();
    process.exit(out.problems.length ? 1 : 0);
})();
