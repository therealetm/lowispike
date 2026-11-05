'use strict';
/* Nov 5 2026: the owner's path after build 20261105-030004. Settings > App theme row, tap after tap, and the state after each tap;
   a phone that already has the blue Night saved by the old switch; Settings > Time of day & weather (slider, live weather);
   reload keeps the choice. Screenshots of each step.
   node tools/theme-fix/probe.cjs <repo dir | live> <outdir> */
const L = require(process.env.LIB || '/home/sprite/BUGHUNT/playtest/lib.cjs');
const path = require('path'), fs = require('fs');
(async () => {
    const arg = process.argv[2] || '.', out = process.argv[3] || '/tmp/theme-fix';
    fs.mkdirSync(out, { recursive: true });
    let srv = null, url;
    if (arg === 'live') url = 'https://therealetm.github.io/lowispike/';
    else { srv = await L.serve(path.resolve(arg)); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
    const scen = process.env.SCEN || 'fresh';
    /* 'bug': what the owner's phone holds after the old switch ran: Day, with the blue Night saved as the dark look */
    const pre = scen === 'bug' ? `try{if(!sessionStorage.getItem('tfInit')){sessionStorage.setItem('tfInit','1');localStorage.setItem('lowi.theme','light');localStorage.setItem('lowi.atmos',JSON.stringify({mode:'manual',p:25}));localStorage.setItem('lowi.theme.dark','night');localStorage.setItem('lowi.tutorial.v1',JSON.stringify({done:true}));}}catch(e){}`
        : `try{if(!sessionStorage.getItem('tfInit')){sessionStorage.setItem('tfInit','1');localStorage.setItem('lowi.tutorial.v1',JSON.stringify({done:true}));}}catch(e){}`;
    const h = await L.open({ view: process.env.VIEW || 'chromium390', url, settle: 8000, lang: process.env.LANG2 || 'de', preInit: pre });
    const p = h.page, res = [];
    const state = () => p.evaluate(() => { const H = document.documentElement; return { theme: H.getAttribute('data-theme'), black: H.hasAttribute('data-black'), kind: window.LowiTrueBlack && LowiTrueBlack.kind(), stored: localStorage.getItem('lowi.theme.dark'), atmos: localStorage.getItem('lowi.atmos'), bodyBg: getComputedStyle(document.body).backgroundColor, row: [...document.querySelectorAll('[data-cme-theme]')].map(b => b.dataset.cmeTheme + (b.classList.contains('on') ? '*' : '')).join(' ') }; });
    const log = async (step, extra) => { const r = Object.assign({ step }, await state(), extra || {}); res.push(r); console.log(JSON.stringify(r)); await p.screenshot({ path: path.join(out, String(res.length).padStart(2, '0') + '-' + step + '.png') }); };
    const openSettings = async () => { await p.evaluate(() => { try { goTab('foryou'); } catch (e) { } }); await L.sleep(1200); await p.evaluate(() => window.LowiCommunityMe && LowiCommunityMe.open()); await L.sleep(1200); await p.evaluate(() => { const r = document.querySelector('.cme-themerow'); if (r) r.scrollIntoView({ block: 'center' }); }); await L.sleep(400); };
    await log('start');
    await openSettings();
    const rows = await p.evaluate(() => [...document.querySelectorAll('.cme-row')].map(b => b.getAttribute('data-cme') || (b.classList.contains('cme-themerow') ? 'theme' : b.classList.contains('cme-langrow') ? 'language' : '?')));
    const sizes = await p.evaluate(() => [...document.querySelectorAll('[data-cme-theme]')].map(b => { const r = b.getBoundingClientRect(); return b.dataset.cmeTheme + ' ' + Math.round(r.width) + 'x' + Math.round(r.height) + (b.scrollWidth > b.clientWidth + 1 ? ' CLIPPED' : ''); }));
    await log('settings', { rows, sizes });
    for (const x of ['black', 'day', 'black', 'night', 'black', 'auto', 'black']) {
        await p.evaluate(x => { const b = document.querySelector('[data-cme-theme="' + x + '"]'); if (b) b.click(); }, x); await L.sleep(1300);
        await log('pick-' + x);
    }
    /* the old Day/night switch path (top bar / any older caller) must not save Night over Dark any more */
    await p.evaluate(() => window.LowiTopBar && LowiTopBar.toggleTheme(true)); await L.sleep(1000); await log('toggle-1');
    await p.evaluate(() => window.LowiTopBar && LowiTopBar.toggleTheme(true)); await L.sleep(1000); await log('toggle-2');
    await p.evaluate(() => { const b = document.querySelector('[data-cme="sky"]'); if (b) b.click(); }); await L.sleep(1800);
    const sky = await p.evaluate(() => { const c = document.querySelector('.atm-ov [data-atm-card]'); if (!c) return null; const r = c.getBoundingClientRect(); return { rect: [r.left, r.top, r.width, r.height].map(Math.round), quick: [...c.querySelectorAll('[data-atm-quick]')].map(b => b.dataset.atmQuick + (b.classList.contains('on') ? '*' : '')), slider: !!c.querySelector('.atm-range'), wx: (c.querySelector('[data-atm-wx]') || {}).outerHTML ? c.querySelector('[data-atm-wx]').getAttribute('aria-checked') : null }; });
    await log('sky-sheet', { sky });
    await p.evaluate(() => { const b = document.querySelector('[data-atm-wx]'); if (b) b.click(); }); await L.sleep(600);
    const wx = await p.evaluate(() => ({ off: localStorage.getItem('lowi.sky.off'), aria: (document.querySelector('[data-atm-wx]') || { getAttribute: () => null }).getAttribute('aria-checked') }));
    await log('wx-off', { wx });
    await p.evaluate(() => { const b = document.querySelector('[data-atm-wx]'); if (b) b.click(); }); await L.sleep(400);
    await p.mouse.click(195, 30); await L.sleep(1500);
    await log('sky-closed', { settingsBack: await p.evaluate(() => !!document.querySelector('.cme-themerow')) });
    await p.reload(); await L.sleep(8000);
    await log('reload');
    console.log('ERRORS', JSON.stringify(h.log.pageerror || []));
    fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify(res, null, 1));
    await h.browser.close(); if (srv) srv.close();
})().catch(e => { console.error(e); process.exit(1); });
