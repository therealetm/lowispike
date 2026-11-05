'use strict';
/* Phase B check (Nov 5 2026): Supermarkt / Seller Zone / Hilf mit are three distinct doors, Plan my week (old Zu Hause tab) opens inside
   Supermarkt and comes back, and Settings still reaches World sound / Body sound (Koerperklang) and VR. Local fixture user, Chromium or
   WebKit, never writes anywhere. node tools/check-phase-b-shop.cjs <dark|light> <WxH> [webkit] -> JSON + screenshots in /home/sprite/phaseb-shots.
   Not a real phone. */
const fs = require('fs');
const { launch, openApp, sleep, existingSeed } = require('./interface-audit/lib.cjs');
const theme = process.argv[2] || 'dark', vp = (process.argv[3] || '390x844').split('x').map(Number), engine = process.argv[4] || 'chromium';
const OUT = '/home/sprite/phaseb-shots'; fs.mkdirSync(OUT, { recursive: true });
(async () => {
    const lang = 'de';
    const seed = existingSeed({ lang, kv: { 'lowispike.lang': lang, 'lowi.lang': lang, 'lowispike.theme': theme, 'lowi.theme': theme } });
    const h = await launch({ engine, seed, lang, locale: 'de-DE', viewport: { width: vp[0], height: vp[1] } });
    await openApp(h, { query: '?dc=' + Date.now() });
    const P = h.page, tag = theme + '-' + vp.join('x') + '-' + engine, out = { theme, vp: vp.join('x'), engine };
    await P.evaluate(t => { try { window.LowiLang && LowiLang.set && LowiLang.set('de'); } catch (e) {} try { document.documentElement.setAttribute('data-ui', t); } catch (e) {} }, theme);
    await sleep(1200);
    for (let i = 0; i < 3; i++) { await P.keyboard.press('Escape'); await sleep(200); }
    out.doors = await P.evaluate(() => window.LowiStorePicks && LowiStorePicks.doors ? LowiStorePicks.doors().map(d => d.id + ':' + d.label + (d.sub ? ' (' + d.sub + ')' : '')) : null);
    out.opened = await P.evaluate(() => { try { return LowiStorePicks.openAt('shop'); } catch (e) { return String(e); } });
    await sleep(1500);
    out.shop = await P.evaluate(() => {
        const c = document.querySelector('.stp-card'); if (!c) return null;
        const tabs = [...c.querySelectorAll('[data-stp-tab]')].map(b => b.getAttribute('data-stp-tab') + (b.getAttribute('aria-selected') === 'true' || b.classList.contains('on') ? '*' : ''));
        const plan = c.querySelector('.stp-plan'); const r = plan && plan.getBoundingClientRect();
        return { tabs, plan: plan ? (plan.innerText || '').replace(/\s+/g, ' ').trim() : null, planBox: r ? [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] : null };
    });
    await P.screenshot({ path: OUT + '/shop-' + tag + '.jpg', type: 'jpeg', quality: 65 });
    out.planOpen = await P.evaluate(async () => {
        const plan = document.querySelector('.stp-card .stp-plan'); if (!plan) return 'no plan row';
        plan.click(); await new Promise(r => setTimeout(r, 1500));
        const c = document.querySelector('.stp-card'); const t = document.getElementById('wbTitle');
        const lit = [...c.querySelectorAll('[data-stp-tab]')].filter(b => b.getAttribute('aria-selected') === 'true' || b.classList.contains('on')).map(b => b.getAttribute('data-stp-tab'));
        return { title: t ? t.textContent : null, back: !!c.querySelector('[data-wb="tosm"]'), lit, cardStill: !!c.isConnected };
    });
    await P.screenshot({ path: OUT + '/plan-' + tag + '.jpg', type: 'jpeg', quality: 65 });
    out.planBack = await P.evaluate(async () => {
        const b = document.querySelector('.stp-card [data-wb="tosm"]'); if (!b) return 'no back';
        b.click(); await new Promise(r => setTimeout(r, 1200));
        return { planRow: !!document.querySelector('.stp-card .stp-plan'), title: !!document.getElementById('wbTitle') };
    });
    out.oldHomeLink = await P.evaluate(async () => {
        try { LowiStorePicks.close(); } catch (e) {} await new Promise(r => setTimeout(r, 800));
        LowiStorePicks.openAt('home'); await new Promise(r => setTimeout(r, 1500));
        const t = document.getElementById('wbTitle'); return t ? t.textContent : null;
    });
    await P.evaluate(() => { try { LowiStorePicks.close(); } catch (e) {} });
    for (let i = 0; i < 3; i++) { await P.keyboard.press('Escape'); await sleep(250); }
    /* Settings: the hub (community-me.js) and its Look & sound part; World sound row opens the Body sound panel; VR */
    out.settings = await P.evaluate(async () => {
        const res = {};
        try { LowiCommunityMe.open(); } catch (e) { return 'open failed ' + e; }
        await new Promise(r => setTimeout(r, 1400));
        const vis = e => { const s = getComputedStyle(e); const r = e.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0; };
        res.rows = [...document.querySelectorAll('[data-cme], [data-id], button')].filter(vis).map(e => (e.getAttribute('data-cme') || e.getAttribute('data-id') || '') + '=' + (e.innerText || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim()).filter(t => t.length > 1).slice(0, 50);
        return res;
    });
    await P.screenshot({ path: OUT + '/settings-' + tag + '.jpg', type: 'jpeg', quality: 65 });
    out.hud = await P.evaluate(() => ({ vrBtn: !!document.querySelector('#whHud .wh-vr'), soundBtn: !!document.querySelector('#whHud .wa-btn'), worldAudioOpen: !!(window.LowiWorldAudio && typeof LowiWorldAudio.open === 'function') }));
    /* tap the Koerperklang row, then the VR row: each must reach Home's own control */
    out.soundRow = await P.evaluate(async () => {
        const b = [...document.querySelectorAll('button,[role=button]')].find(e => /K\u00f6rperklang/.test(e.innerText || '')); if (!b) return 'no row';
        b.scrollIntoView({ block: 'center' }); b.click(); await new Promise(r => setTimeout(r, 2000));
        const p = [...document.querySelectorAll('[class*=wa-]')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 150 && r.height > 120 && getComputedStyle(e).display !== 'none'; }).map(e => e.className).slice(0, 4);
        return { panels: p, tab: document.body.getAttribute('data-tab') || (window.LowiSections && LowiSections.tab && LowiSections.tab()) };
    });
    await P.screenshot({ path: OUT + '/sound-' + tag + '.jpg', type: 'jpeg', quality: 65 });
    out.wide = await P.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    out.errors = h.errors; out.consoleErr = h.consoleErr.filter(t => !/Failed to load resource|net::ERR|supabase|ERR_FAILED/i.test(t)).slice(0, 5);
    console.log(JSON.stringify(out, null, 1));
    await h.browser.close();
})().catch(e => { console.error(e); process.exit(1); });
