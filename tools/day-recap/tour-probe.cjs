'use strict';
/* Mini tour proof for the Day recap step: node tools/day-recap/tour-probe.cjs [--url ..] [--lang de] [--view iphone13] */
const L = require(process.env.BH_LIB || '/home/sprite/BUGHUNT/playtest/lib.cjs');
const path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
(async () => {
    let srv = null, url = arg('url', '');
    if (!url) { srv = await L.serve(path.join(__dirname, '..', '..')); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
    const lang = arg('lang', 'en'), view = arg('view', 'iphone13');
    const h = await L.open({ url, view, lang, preInit: `try{localStorage.setItem('lowi.lang','${lang}');localStorage.setItem('lowispike.lang','${lang}');}catch(e){}` });
    const P = h.page, out = { lang, view, problems: [] };
    try {
        await P.evaluate(() => window.LowiTutorial.news({ slug: 'day-recap', tutorial: 'new-day-recap', tour: ['new-day-recap'], text: { en: 'Day recap', de: 'Tagesr\u00fcckblick', es: 'Resumen del d\u00eda' } }));
        for (let i = 0; i < 30; i++) { await L.sleep(300); const id = await P.evaluate(() => window.LowiTutorial.step()); out.firstStep = out.firstStep || id; if (id === 'new-day-recap') break; if (id === 'new-intro') { await P.evaluate(() => { const b = Array.from(document.querySelectorAll('.lt-card button')).find(b => /next|weiter|siguiente|los|start|go\b|vamos|empez|comenz|\u2192/i.test(b.innerText + ' ' + (b.getAttribute('aria-label') || ''))); b && b.click(); }); await L.sleep(600); } }
        out.ids = await P.evaluate(() => window.LowiTutorial.ids());
        let st = null;
        for (let i = 0; i < 40; i++) {
            await L.sleep(300);
            st = await P.evaluate(() => {
                const card = document.querySelector('.lt-card'), t = document.querySelector('[data-mh="t-recap"]');
                const hand = document.querySelector('.lt-hand');
                const r = t && t.getBoundingClientRect(), hr = hand && hand.getBoundingClientRect();
                const step = window.LowiTutorial.step(); const audio = Array.from(document.querySelectorAll('audio')).map(a => a.currentSrc || a.src).filter(Boolean).slice(-1)[0] || '';
                return { step, card: card ? card.innerText.replace(/\s+/g, ' ').slice(0, 200) : '', hub: !!document.querySelector('.mh-ov:not(.off)'), target: r ? { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), vh: innerHeight } : null, hand: hr ? { x: Math.round(hr.left + hr.width / 2), y: Math.round(hr.top + hr.height / 2) } : null, audio, held: (document.querySelector('.lt-held') || {}).className || '' };
            });
            if (st.card && /Dein Tag|Your day|Tu d/.test(st.card) && st.target && st.hub && st.target.top >= 0 && st.target.bottom <= st.target.vh) break;
        }
        out.state = st;
        if (!st || !st.card) out.problems.push('no tour card');
        if (!st || !st.hub) out.problems.push('companion card not open');
        if (!st || !st.target) out.problems.push('no Your day bubble');
        else if (st.target.top < 0 || st.target.bottom > st.target.vh) out.problems.push('bubble not on screen during the step');
        out.voice = await P.evaluate(() => { const D = window.LowiTutorialVoiceData || window.LOWI_TUTORIAL_VOICE || null; return D ? Object.keys(D).filter(k => /day-recap/.test(k)).slice(0, 6) : 'n/a'; });
    } catch (e) { out.problems.push('probe error ' + e.message); }
    out.errors = h.log.pageerror;
    console.log(JSON.stringify(out, null, 1));
    await h.browser.close(); if (srv) srv.close();
    process.exit(out.problems.length ? 1 : 0);
})();
