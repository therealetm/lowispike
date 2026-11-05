'use strict';
/* which scripts ask for animation frames on Home: Off vs Calm mode level 4. node tools/galaxy-still/loops.cjs still|live */
const { launch, openApp, sleep, existingSeed } = require('../interface-audit/lib.cjs');
(async () => {
    const still = process.argv[2] !== 'live';
    const kv = { 'lowispike.lang': 'de', 'lowi.lang': 'de' };
    if (still) kv['lowi.calm'] = '4';
    const seed = existingSeed({ lang: 'de', kv });
    const h = await launch({ engine: 'chromium', seed, lang: 'de', locale: 'de-DE', viewport: { width: 390, height: 844 } });
    await h.ctx.addInitScript(() => {
        window.__by = {}; const r = window.requestAnimationFrame.bind(window);
        window.requestAnimationFrame = f => { if (window.__count) { const s = (new Error().stack || '').split('\n').slice(2, 4).map(l => (l.match(/([\w-]+\.(?:js|html))[^:]*:(\d+)/) || [, '?', ''])[1] + ':' + (l.match(/([\w-]+\.(?:js|html))[^:]*:(\d+)/) || [, , '?'])[2]).join(' < '); window.__by[s] = (window.__by[s] || 0) + 1; } return r(f); };
        window.__iv = {}; const si = window.setInterval.bind(window);
        window.setInterval = (f, ms, ...a) => { const s = (new Error().stack || '').split('\n')[2] || ''; const k = ((s.match(/([\w-]+\.(?:js|html))[^:]*:(\d+)/) || [, '?', ''])[1]) + ':' + ((s.match(/([\w-]+\.(?:js|html))[^:]*:(\d+)/) || [, , ''])[2]) + ' @' + ms; window.__iv[k] = (window.__iv[k] || 0) + 1; return si(f, ms, ...a); };
    });
    await openApp(h, { query: '?dc=' + Date.now() });
    for (let i = 0; i < 3; i++) { await h.page.keyboard.press('Escape'); await sleep(200); }
    await sleep(8000);
    await h.page.evaluate(() => { window.__by = {}; window.__count = true; });
    await sleep(5000);
    const out = await h.page.evaluate(() => ({ state: window.LowiWorld3D && window.LowiWorld3D.state, by: Object.entries(window.__by).sort((a, b) => b[1] - a[1]).slice(0, 14), iv: Object.entries(window.__iv).filter(e => !/@(\d{4,}|[5-9]\d\d)$/.test(e[0])).slice(0, 12), saver: document.documentElement.className.match(/lowi-(saver|rest)\S*/g) }));
    console.log(JSON.stringify(out, null, 1));
    await h.browser.close();
})().catch(e => { console.error(e); process.exit(1); });
