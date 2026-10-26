'use strict';
/* Day recap browser proof (MAYA-HANDOFF 0.40). node tools/day-recap/probe.cjs [--url https://...] [--view iphone13] [--lang de] [--rm] [--empty]
   Seeds today's meals/ledger/water/Move, opens the companion card, taps the "Your day" bubble with a real tap, reads the panel,
   checks it fits the screen, taps the button to close, then opens it again from My day. Prints JSON; exit 1 on any problem. */
const L = require(process.env.BH_LIB || '/home/sprite/BUGHUNT/playtest/lib.cjs');
const path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const has = k => process.argv.includes('--' + k);
(async () => {
    let srv = null, url = arg('url', '');
    if (!url) { srv = await L.serve(path.join(__dirname, '..', '..')); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
    const view = arg('view', 'iphone13'), lang = arg('lang', 'en'), empty = has('empty');
    const preInit = `try { localStorage.setItem('lowi.lang', '${lang}'); localStorage.setItem('lowispike.lang', '${lang}');
      const d = new Date(), p = n => String(n).padStart(2, '0'), k = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
      const at = h => { const x = new Date(); x.setHours(h, 0, 0, 0); return Math.min(x.getTime(), Date.now() - 60000); };
      const s = JSON.parse(localStorage.getItem('lowispike.v2') || '{}');
      if (!${empty} && !sessionStorage.getItem('drc.seeded')) {
        sessionStorage.setItem('drc.seeded', '1');
        s.logs = [{ ts: at(1) - 11 * 3600000, day: 'x-yesterday', t: 'Pasta', lvl: 'high' }, { ts: at(1), day: k, t: 'Eggs and spinach', lvl: 'low' }, { ts: at(2), day: k, t: 'Nutella toast', lvl: 'high' }, { ts: at(3), day: k, t: 'Salmon, rice and broccoli with a very long name that should cut off nicely', r: 'ja' }];
        s.ledger = [{ day: k, amt: 15, src: 'meal:spirit', ts: Date.now() }, { day: k, amt: 30, src: 'move:session', ts: Date.now() }, { day: k, amt: 5, src: 'water', ts: Date.now() }];
        localStorage.setItem('lowispike.v2', JSON.stringify(s));
        const f = JSON.parse(localStorage.getItem('lowi_fast_v1') || '{}'); f.water = Object.assign({}, f.water, { [k]: 4 }); localStorage.setItem('lowi_fast_v1', JSON.stringify(f));
        const m = JSON.parse(localStorage.getItem('lowispike.move.v1') || '{}'); m.sessions = [{ day: k, moved: 1260 }]; localStorage.setItem('lowispike.move.v1', JSON.stringify(m));
      } } catch (e) { }`;
    const h = await L.open({ url, view, lang, preInit, reducedMotion: has('rm') });
    const P = h.page, out = { view, lang, url, problems: [] };
    await P.evaluate(() => { window.__drc = []; new MutationObserver(ms => ms.forEach(m => { const t = m.target; if (t.classList && t.classList.contains('drc-ov')) window.__drc.push(Math.round(performance.now()) + ' ' + t.className); })).observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class'] });
        const R = window.LowiR2, oc = R && R.close; if (oc) R.close = function (ov, how) { if (ov && ov.classList && ov.classList.contains('drc-ov')) window.__drc.push(Math.round(performance.now()) + ' close ' + (how || '') + ' ' + (new Error().stack || '').split('\n').slice(1, 4).join(' < ').replace(/https?:[^ )]*\//g, '')); return oc.apply(this, arguments); };
        document.addEventListener('click', e => { if (document.querySelector('.drc-ov')) window.__drc.push(Math.round(performance.now()) + ' click ' + (e.target.className && e.target.className.baseVal == null ? e.target.className : e.target.tagName)); }, true); });
    const bad = m => out.problems.push(m);
    /* the sheet slides in on a spring; wait until it has landed (emulated phones are slow) */
    /* a loaded machine slows the sheets' spring: tap only once the target has stopped moving */
    const stable = async sel => { let last = ''; for (let i = 0; i < 100; i++) { const r = await P.evaluate(q => { const e = document.querySelector(q); if (!e) return ''; const b = e.getBoundingClientRect(); return Math.round(b.left) + ',' + Math.round(b.top); }, sel); if (r && r === last) return true; last = r; await L.sleep(300); } return false; };
    const settled = async () => { for (let i = 0; i < 150; i++) { const ok = await P.evaluate(() => { const s = document.querySelector('.r2-ov.on:not(.off) #dayRecap'); if (!s) return false; const t = getComputedStyle(s.closest('.r2-sh')).transform; return t === 'none' || /, 0\)$/.test(t); }); if (ok) return true; await L.sleep(200); } return false; };
    try {
        out.loaded = await P.evaluate(() => !!(window.LowiDayRecap && window.LowiDayRecap.open && window.LowiDayRecapCore));
        if (!out.loaded) bad('Day recap not loaded');
        await P.evaluate(() => (window.LowiWorldHome && window.LowiWorldHome.openMisty) ? window.LowiWorldHome.openMisty() : window.LowiMistyHub.open());
        await L.sleep(900);
        await P.evaluate(() => { const e = document.querySelector('[data-mh="t-recap"]'); e && e.scrollIntoView({ block: 'center' }); }); await L.sleep(400);
        await stable('[data-mh="t-recap"]');
        const orb = await L.center(h, '[data-mh="t-recap"]');
        out.cardBubble = await P.evaluate(() => { const e = document.querySelector('[data-mh="t-recap"]'); if (!e) return null; const r = e.getBoundingClientRect(); return { text: e.innerText.replace(/\s+/g, ' '), w: Math.round(r.width), right: Math.round(r.right), vw: innerWidth, n: document.querySelectorAll('.mh-today .mh-orb').length }; });
        if (!orb) bad('no Your day bubble on the companion card');
        else {
            if (out.cardBubble.right > out.cardBubble.vw) bad('bubble off screen');
            await L.tap(h, orb.x, orb.y); await L.sleep(500); out.settled1 = await settled();
        }
        const read = () => P.evaluate(() => {
            const s = document.querySelector('.r2-ov:not(.off) #dayRecap'); if (!s) return null;
            const sh = s.closest('.r2-sh'), r = sh.getBoundingClientRect();
            const over = Array.from(s.querySelectorAll('*')).filter(e => { const b = e.getBoundingClientRect(); return b.width && (b.right > innerWidth + 1 || b.left < -1); }).map(e => e.className || e.tagName).slice(0, 5);
            return { title: s.querySelector('h2').innerText, say: s.querySelector('[data-drc-say]').innerText, take: s.querySelector('[data-drc-take]').innerText, nudge: s.querySelector('[data-drc-nudge]').innerText,
                stats: Array.from(s.querySelectorAll('.drc-st')).map(e => e.innerText.replace(/\s+/g, ' ')), meals: s.querySelectorAll('.drc-meals li').length, level: (s.querySelector('.drc-level') || {}).innerText || '',
                btn: Array.from(s.querySelectorAll('.drc-btn')).map(b => b.innerText), sheet: { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), sh: sh.scrollHeight }, vh: innerHeight, vw: innerWidth, over,
                hub: !!document.querySelector('.mh-ov:not(.off)'), panels: document.querySelectorAll('#dayRecap').length, anim: getComputedStyle(s.querySelector('.drc-orb') || s).animationName, insulin: /insulin/i.test(s.innerText) };
        });
        out.panel = await read();
        if (!out.panel) bad('panel did not open from the bubble');
        else {
            if (out.panel.over.length) bad('overflow ' + out.panel.over.join(','));
            if (out.panel.insulin) bad('says insulin');
            if (out.panel.panels !== 1) bad('panels ' + out.panel.panels);
            await P.evaluate(() => { const b = document.querySelector('.r2-ov:not(.off) [data-drc="done"]'); b && b.scrollIntoView({ block: 'center' }); });
            await L.sleep(500);
            const b2 = await L.center(h, '.r2-ov:not(.off) [data-drc="done"]');
            if (!b2) bad('no close button'); else { await L.tap(h, b2.x, b2.y); await L.sleep(900); }
            out.closed = await P.evaluate(() => !document.querySelector('.r2-ov:not(.off) #dayRecap'));
            if (!out.closed) bad('did not close');
        }
        /* second open: My day sheet item, real tap; the hello must differ from the first one */
        await P.evaluate(() => window.LowiMyDay && window.LowiMyDay.open && window.LowiMyDay.open());
        await L.sleep(900);
        await P.evaluate(() => { const e = document.querySelector('[data-myday="recap"]'); e && e.scrollIntoView({ block: 'center' }); }); await L.sleep(400);
        await stable('[data-myday="recap"]');
        const md = await L.center(h, '[data-myday="recap"]');
        out.myDayItem = !!md;
        if (md) { await L.tap(h, md.x, md.y); await L.sleep(500); out.settled2 = await settled(); out.panel2 = await read(); if (!out.panel2) bad('panel did not open from My day'); else if (out.panel && out.panel2.say === out.panel.say) bad('same hello twice in a row'); }
        else bad('no Day recap in My day');
        /* double open stays one panel; back (history) closes it */
        await P.evaluate(() => { window.LowiDayRecap.open(); window.LowiDayRecap.open(); });
        out.afterDouble = await P.evaluate(() => document.querySelectorAll('.r2-ov:not(.off) #dayRecap').length);
        if (out.afterDouble > 1) bad('double open made two panels');
        await P.goBack().catch(() => { }); await L.sleep(900);
        out.afterBack = await P.evaluate(() => ({ open: !!document.querySelector('.r2-ov:not(.off) #dayRecap'), url: location.href.slice(0, 60) }));
        if (out.afterBack.open) bad('back did not close the panel');
        if (!/127\.0\.0\.1|lowispike/.test(out.afterBack.url)) bad('back left the app');
        if (has('shot')) { await P.evaluate(() => window.LowiDayRecap.open()); await L.sleep(2400); await P.screenshot({ path: arg('shot', '/tmp/drc.png') }); }
    } catch (e) { bad('probe error ' + e.message); }
    out.drcLog = await P.evaluate(() => window.__drc).catch(() => null);
    out.errors = { page: h.log.pageerror, console: h.log.console.filter(x => !/Failed to load resource|net::|ERR_/.test(x)), mon: await P.evaluate(() => window.__bh && { err: window.__bh.err, rej: window.__bh.rej }).catch(() => null) };
    if (out.errors.page.length || (out.errors.mon && (out.errors.mon.err.length || out.errors.mon.rej.length))) bad('errors');
    console.log(JSON.stringify(out, null, 1));
    await h.browser.close(); if (srv) srv.close();
    process.exit(out.problems.length ? 1 : 0);
})();
