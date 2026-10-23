#!/usr/bin/env node
/* Oct 23 2026 (Emmanuel: "every time I leave the community to go back to the home page with the back button, the whole thing
   freezes"; his screenshot: Home lands zoomed out, Misty in the middle with the ring of bubbles, no Home chrome, nothing reacts).
   For each Community tab: open Community from Home, open the tab, leave by the X (back button) or by system back (the edge
   swipe ends there too), then check Home: tab, classes that hold the zoomed-out / leaving state, the camera rig, and a real
   finger tap on the Settings bubble that must open its panel.
   Usage: node tools/regress/p-community-back-home.cjs [--device "iPhone 13"] [--route x|back] [--tabs room,chat,create,aff,rank] [--url URL] */
'use strict';
const H = require('./harness.cjs'), N = require('./nav.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const DEVICE = arg('device', 'iPhone 13'), ROUTES = arg('route', 'x,back').split(','), URL_ = arg('url', '');
const TABS = arg('tabs', 'room,chat,create,aff,rank').split(','), ENGINE = arg('engine', 'chromium'), LAND = arg('land', '');
const sleep = N.sleep;
const state = R => R.page.evaluate(() => {
    const Hc = document.documentElement.classList, WH = window.LowiWorldHome;
    let rig = null; try { const r = WH && WH.rig && WH.rig(); rig = r ? { mode: r.mode, dist: +(+r.dist).toFixed(2), maxD: r.maxD, homeRest: r.homeRest, homeDist: r.homeDist } : null; } catch (e) { rig = 'err'; }
    const cls = [...Hc].filter(c => /^(wh-|gx-|sec-|lw-|mf-|rm-|cr-|cg)/.test(c));
    const tabEl = document.querySelector('#main > .tab.active');
    return { tab: tabEl ? tabEl.id : null, cls, rig, pull: WH && WH.state ? WH.state.pull : null, zoomAnim: !!(WH && WH.state && WH.state.zoomAnim), far: getComputedStyle(document.documentElement).getPropertyValue('--wh-far'), hist: JSON.stringify(history.state) };
}).catch(e => ({ err: e.message }));
/* world frames in one second: 0 on Home means the world (and everything that rides its frames) is frozen */
const frames = R => R.page.evaluate(() => new Promise(res => { let n = 0; const W3 = window.LowiWorld3D; if (!W3 || !W3.onFrame) return res(-1); const off = W3.onFrame(() => { n++; }); setTimeout(() => { try { off(); } catch (e) { } res(n); }, 1000); })).catch(() => -2);
async function tapSettings(R) {
    const h = await N.hitTest(R, '.o8-settings');
    if (!h || !h.x) return { h, opened: null };
    await R.page.mouse.click(h.x, h.y); await sleep(1200);
    const opened = await R.page.evaluate(() => { const p = document.querySelector('[data-ss2="community"]'); return !!p && p.getBoundingClientRect().width > 0; }).catch(() => null);
    await R.page.keyboard.press('Escape').catch(() => { }); await sleep(400);
    await R.page.evaluate(() => { const x = document.querySelector('.ss2-x,[data-ss2="close"],.ss2-close'); if (x) x.click(); }).catch(() => { });
    await sleep(400);
    return { h, opened };
}
(async () => {
    const VP = arg('vp', ''); const R = await H.open({ engine: ENGINE, device: DEVICE, probe: false, url: URL_, lang: 'en', viewport: VP ? { width: +VP.split('x')[0], height: +VP.split('x')[1] } : null });
    const p = R.page; let fails = 0;
    try {
        await R.goto(); await sleep(3000);
        console.log(JSON.stringify({ fresh: await state(R), frames: await frames(R), tap: await tapSettings(R) }));
        for (const route of ROUTES) for (const t of TABS) {
            if (LAND === 'far') {
                /* come into Community the way the zoom-out shortcut does: Home's camera far out past the World Map */
                await p.evaluate(() => { try { const WH = window.LowiWorldHome, r = WH.rig(); if (r) r.dist = (r.maxD || 13) * 3; } catch (e) { } });
                await sleep(1500);
                if ((await N.tab(R)) !== 'foryou') await N.openCommunity(R);
            } else await N.openCommunity(R);
            await p.evaluate(t => { const b = document.querySelector('.rm-tab[data-rm="' + t + '"]'); if (b) b.click(); }, t); await sleep(1500);
            const before = await state(R);
            if (route === 'x') await p.evaluate(() => { const b = document.getElementById('secX'); if (b) b.click(); });
            else await p.evaluate(() => history.back());
            await sleep(400); const s1 = await state(R);
            await sleep(2600); const s2 = await state(R);
            s2.frames = await frames(R);
            const tap = await tapSettings(R);
            const ok = s2.tab === 'tab-home' && s2.frames > 0 && !s2.cls.includes('rm-view') && !s2.cls.includes('cr-room') && !s2.cls.some(c => /^(wh-mapview|wh-cosmos|gx-out|gx-in|wh-leave)$/.test(c));
            if (!ok) fails++;
            console.log(JSON.stringify({ device: DEVICE, route, t, ok, before: { tab: before.tab, cls: before.cls, rig: before.rig }, s400: s1, s3000: s2, tap }));
            if (!ok) { await R.shot('/tmp/cbh-' + DEVICE.replace(/\W+/g, '') + '-' + route + '-' + t + '.png').catch(() => { }); await p.evaluate(() => { try { window.LowiSections.close(); } catch (e) { } try { goTab('home'); } catch (e) { } }); await sleep(1500); }
        }
        console.log('errs', JSON.stringify(R.errs.slice(0, 8)));
    } catch (e) { console.log('ERR', e.stack); fails++; }
    await R.close();
    console.log('RESULT', DEVICE, fails ? 'FAIL ' + fails : 'PASS');
    process.exit(fails ? 1 : 0);
})();
