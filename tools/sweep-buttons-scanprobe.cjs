/* Probe: does Scan's sheet (b3) stay on top after leaving Scan for another tab?  node tools/sweep-buttons-scanprobe.cjs [url|root] [engine] */
'use strict';
const H = require('./sim/harness.cjs');
const [where = 'https://therealetm.github.io/lowispike/index.html', engine = 'chromium'] = process.argv.slice(2);
(async () => {
    const o = { engine, device: 'iPhone 13' }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
    const R = await H.open(o); const P = R.page; const out = {};
    const look = () => P.evaluate(() => { const vis = e => { if (!e) return false; const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > .05; }; const sh = [...document.querySelectorAll('.b3-cx')].filter(vis); const top = sh[0] ? sh[0].closest('[class*=b3]') : null; let p = sh[0]; const chain = []; while (p && chain.length < 8) { chain.push((p.id ? '#' + p.id : '') + '.' + String(p.className).split(' ').slice(0, 3).join('.')); p = p.parentElement; } return { tab: (window.LowiHost && LowiHost.tab && LowiHost.tab()) || (typeof TAB !== 'undefined' ? TAB : '?'), active: [...document.querySelectorAll('.page.active,.tab.active,section.active')].map(e => e.id).slice(0, 5), sheetVisible: sh.length, chain, html: document.documentElement.className.slice(0, 200) }; });
    try {
        await R.goto(); await H.sleep(5000);
        out.home = await look();
        await P.evaluate(() => window.goTab('scan')); await H.sleep(2500); out.scan = await look(); await R.shot('/tmp/bs/p-scan.png');
        await P.evaluate(() => window.goTab('profile')); await H.sleep(2500); out.profileByGoTab = await look(); await R.shot('/tmp/bs/p-profile.png');
        await P.evaluate(() => window.goTab('home')); await H.sleep(2500); out.homeAfter = await look(); await R.shot('/tmp/bs/p-home.png');
        await P.evaluate(() => window.goTab('scan')); await H.sleep(2500); out.scan2 = await look();
        // leave with a real dock tap if there is a dock
        const dock = await P.evaluate(() => [...document.querySelectorAll('[data-tab],[data-go],nav button')].filter(b => { const r = b.getBoundingClientRect(); return r.width && r.bottom > innerHeight - 140; }).map(b => ({ t: (b.dataset.tab || b.dataset.go || b.textContent).trim().slice(0, 20), x: b.getBoundingClientRect().x + b.getBoundingClientRect().width / 2, y: b.getBoundingClientRect().y + b.getBoundingClientRect().height / 2 })));
        out.dock = dock;
        const cook = dock.find(d => /shelf|cook/i.test(d.t)); if (cook) { await P.touchscreen.tap(cook.x, cook.y); await H.sleep(2500); out.afterDockCook = await look(); await R.shot('/tmp/bs/p-cook.png'); }
    } catch (e) { out.broken = e.message; }
    out.errs = R.errs.map(e => e.m.slice(0, 150)); out.crashed = R.crashed;
    console.log(JSON.stringify(out, null, 1)); await R.close(); process.exit(0);
})();
