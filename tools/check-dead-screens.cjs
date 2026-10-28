'use strict';
/* Dead screens batch 1 check (Oct 28 2026, owner request 12). Live (or local) app: build stamp, the old fallback Settings and
   Sleep sheets (X-19, X-20) and the World map (X-39) are gone, Settings still opens from a Community hold, Sleep still opens
   from a Sleep hold, the body world still answers, nothing wider than the screen, no page errors.
   node tools/check-dead-screens.cjs <dark|light> <WxH> [live]   Chromium. Not a real phone. */
const { launch, openApp, sleep, BASE, existingSeed } = require('./interface-audit/lib.cjs');
const theme = process.argv[2] || 'dark', vp = (process.argv[3] || '390x844').split('x').map(Number), live = process.argv[4] === 'live';
(async () => {
    const lang = 'de';
    const seed = existingSeed({ lang, kv: { 'lowispike.lang': lang, 'lowi.lang': lang, 'lowispike.theme': theme, 'lowi.theme': theme } });
    const h = await launch({ engine: 'chromium', seed, lang, locale: 'de-DE', viewport: { width: vp[0], height: vp[1] } });
    if (live) await h.ctx.route(u => String(u).startsWith(BASE), r => r.request().method() === 'GET' ? r.continue() : r.abort());
    await openApp(h, { query: '?dc=' + Date.now() });
    const P = h.page, out = { theme, vp: vp.join('x'), live };
    await P.evaluate(t => { try { window.LowiLang && LowiLang.set && LowiLang.set('de'); } catch (e) {} try { if (window.setTheme) setTheme(t); document.documentElement.setAttribute('data-ui', t); } catch (e) {} }, theme);
    await sleep(1500);
    for (let i = 0; i < 3; i++) { await P.keyboard.press('Escape'); await sleep(250); }
    out.build = await P.evaluate(() => { const m = document.querySelector('meta[name="lowi-build"]'); return (m && m.content) || window.LOWI_BUILD || window.BUILD || ''; });
    out.ui = await P.evaluate(() => document.documentElement.getAttribute('data-ui'));
    out.gone = await P.evaluate(() => ({
        openSettings: !!(window.LowiHomeOrbitV2 && window.LowiHomeOrbitV2.openSettings),
        openSleep: !!(window.LowiHomeOrbitV2 && window.LowiHomeOrbitV2.openSleep),
        openMap: !!(window.LowiWorldRegions && window.LowiWorldRegions.openMap),
        mapBtn: !!document.getElementById('bwrMapBtn'), o8sheet: !!document.querySelector('.o8-sheet') }));
    out.regionsApi = await P.evaluate(() => !!(window.LowiWorldRegions && typeof window.LowiWorldRegions.travel === 'function'));
    /* Settings from the Community hold (the adapter's own sheet) */
    out.settings = await P.evaluate(async () => {
        const A = window.LowiHomeOrbitV2; const S = window.LowiHomeSettingsSleepV2 || window.LowiHomeSettingsV2 || null;
        const api = Object.keys(window).filter(k => /^LowiHome(Settings|SS)/.test(k));
        let opened = false;
        for (const k of api) { const o = window[k]; if (o && typeof o.openSettings === 'function') { o.openSettings(); opened = k; break; } }
        await new Promise(r => setTimeout(r, 900));
        const sh = [...document.querySelectorAll('[class*="sheet"],[role=dialog]')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 100 && r.height > 100 && getComputedStyle(e).display !== 'none'; });
        return { api, opened, visibleSheets: sh.length, text: sh.map(e => (e.innerText || '').slice(0, 60).replace(/\s+/g, ' ')).slice(0, 2) };
    });
    for (let i = 0; i < 3; i++) { await P.keyboard.press('Escape'); await sleep(250); }
    out.wide = await P.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    await P.screenshot({ path: '/home/sprite/dead/live-' + theme + '-' + vp.join('x') + '.jpg', type: 'jpeg', quality: 60 });
    out.errors = h.errors; out.consoleErr = h.consoleErr.filter(t => !/Failed to load resource|net::ERR|supabase|ERR_FAILED/i.test(t)).slice(0, 5);
    console.log(JSON.stringify(out, null, 1));
    await h.browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
