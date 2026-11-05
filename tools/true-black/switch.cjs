'use strict';
/* Dark (true black) switching in the real app: default on a fresh dark install, the Look & Ton buttons Dark / Night / Day,
   persistence over a reload, tap-target sizes, text contrast in Settings, screenshots of each step.
   node tools/true-black/switch.cjs <repo> <outdir> */
const L = require(process.env.LIB || '/home/sprite/BUGHUNT/playtest/lib.cjs');
const path = require('path'), fs = require('fs');
(async () => {
    const ROOT = path.resolve(process.argv[2] || '.'), out = process.argv[3] || '/tmp/tb-switch';
    fs.mkdirSync(out, { recursive: true });
    const srv = await L.serve(ROOT); const url = 'http://127.0.0.1:' + srv.address().port + '/';
    /* a dark install that never chose Dark or Night */
    const pre = `try{if(!sessionStorage.getItem('tbInit')){sessionStorage.setItem('tbInit','1');localStorage.setItem('lowi.theme','dark');localStorage.setItem('lowi.atmos',JSON.stringify({mode:'manual',p:100}));
      localStorage.removeItem('lowi.theme.dark');localStorage.setItem('lowi.tutorial.v1',JSON.stringify({done:true}));}}catch(e){}`;
    const h = await L.open({ view: 'chromium390', url, settle: 7000, preInit: pre });
    const p = h.page, res = [];
    const state = () => p.evaluate(() => ({ theme: document.documentElement.dataset.theme, black: document.documentElement.hasAttribute('data-black'), kind: window.LowiTrueBlack && LowiTrueBlack.kind(), edits: window.LowiTrueBlack && LowiTrueBlack._edits(),
        stored: localStorage.getItem('lowi.theme.dark'), meta: (document.querySelector('meta[name="theme-color"]') || {}).content,
        bodyBg: getComputedStyle(document.body).backgroundColor, on: [...document.querySelectorAll('.r2-look [data-atm-quick].on')].map(b => b.dataset.atmQuick) }));
    const log = (step, extra) => state().then(s => { const r = Object.assign({ step }, s, extra || {}); res.push(r); console.log(JSON.stringify(r)); });
    await log('fresh-dark-install');
    await p.evaluate(() => window.goTab('profile')); await L.sleep(2000);
    /* Settings > Look & sound opens the Look part of the profile (LowiG2E) */
    await p.evaluate(() => { try { const G = window.LowiG2E; if (G && G.direct) G.direct('look'); else if (G && G.open) G.open('look'); } catch (e) { } }); await L.sleep(1500);
    await p.evaluate(() => { const c = document.querySelector('.r2-look'); if (c) c.scrollIntoView({ block: 'center' }); }); await L.sleep(800);
    const sizes = await p.evaluate(() => [...document.querySelectorAll('.r2-look [data-atm-quick]')].map(b => { const r = b.getBoundingClientRect(); return b.dataset.atmQuick + ' ' + Math.round(r.width) + 'x' + Math.round(r.height); }));
    const contrast = await p.evaluate(() => {
        /* text vs its nearest opaque-ish background, WCAG ratio, for the Look card and the next two cards */
        const lum = c => { const m = c.match(/[\d.]+/g).map(Number); return m.slice(0, 3).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0); };
        const bgOf = el => { let o = [0, 0, 0], stack = []; for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor, m = c.match(/[\d.]+/g); if (m && (m[3] == null || +m[3] > 0)) stack.push(m.map(Number)); }
            for (let i = stack.length - 1; i >= 0; i--) { const m = stack[i], a = m[3] == null ? 1 : m[3]; o = o.map((v, k) => v * (1 - a) + m[k] * a); } return 'rgb(' + o.map(Math.round).join(',') + ')'; };
        const out = []; const card = document.querySelector('.r2-look'); const cards = [card, card && card.nextElementSibling, card && card.nextElementSibling && card.nextElementSibling.nextElementSibling].filter(Boolean);
        for (const c of cards) for (const el of c.querySelectorAll('b, small, span, button, output, p, label')) { if (!el.textContent.trim() || el.children.length > 2) continue; const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
            const a = lum(cs.color), b = lum(bgOf(el)), r = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); out.push({ t: el.textContent.trim().slice(0, 24), r: +r.toFixed(2), fg: cs.color, bg: bgOf(el) }); }
        return out.sort((a, b) => a.r - b.r).slice(0, 6);
    });
    console.log('SIZES', JSON.stringify(sizes)); console.log('LOWEST-CONTRAST', JSON.stringify(contrast));
    await p.screenshot({ path: path.join(out, '1-settings-dark.png') });
    for (const [q, n] of [['night', '2-settings-night'], ['black', '3-settings-dark-again'], ['day', '4-settings-day']]) {
        const c = await L.center(h, '.r2-look [data-atm-quick="' + q + '"]');
        if (c) await L.tap(h, c.x, c.y); else console.log('NO BUTTON', q);
        await L.sleep(2600); await p.screenshot({ path: path.join(out, n + '.png') }); await log('tap-' + q);
    }
    /* back to Dark, reload, still Dark */
    const c = await L.center(h, '.r2-look [data-atm-quick="black"]'); if (c) await L.tap(h, c.x, c.y); await L.sleep(2600);
    await p.reload({ waitUntil: 'domcontentloaded' }); await L.sleep(7000); await log('after-reload');
    await p.screenshot({ path: path.join(out, '5-reloaded-home.png') });
    console.log('ERRORS', JSON.stringify(h.log.pageerror.slice(0, 8)));
    fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify({ res, sizes, contrast, errors: h.log.pageerror }, null, 1));
    await h.browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
