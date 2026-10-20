#!/usr/bin/env node
/* W3 mobile layout and back navigation (task 29188430).
   1. At four phone sizes (390x664 is an iPhone 13 in Safari with its toolbars showing), is every control of Home's ring and
      of the Community chat reachable: on screen, not covered by something else, at least 44 pt?
   2. Every sheet a player opens (Settings, Chat history, a member's card, the Today sheet), then the browser back gesture
      (iOS edge swipe in Safari): does back close the sheet, or does it leave the app / do nothing? And Escape.
   Usage: node tools/regress/w3-layout-back.cjs [--engine chromium|webkit] */
'use strict';
const { open } = require('./harness.cjs');
const N = require('./nav.cjs');
const fs = require('fs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ENGINE = arg('engine', 'chromium');
const log = N.logger('w3-' + ENGINE);
const SIZES = [[390, 664], [375, 667], [390, 844], [375, 812]];
const HOME = ['.o8-settings', '.wh-water', '.wh-move', '.o8-scan', '#whPad', '.o8-sleep', '#spFast', '.wh-meals', '#spBubble'];
const CHAT = ['#cmInput', '#cmSend', '#cmPhoto', '#cmMic', '.cg-hist', '#ceJoy', '#tabbar .tb[data-tab="home"]'];
(async () => {
    const R = await open({ engine: ENGINE });
    const res = { engine: ENGINE, layout: [], back: [], esc: [] };
    await R.goto(); await N.sleep(2500);
    for (const [w, h] of SIZES) {
        await R.page.setViewportSize({ width: w, height: h }); await N.goHome(R, log); await N.sleep(1500);
        const home = []; for (const s of HOME) home.push(await N.hitTest(R, s));
        await N.openCommunity(R, log); await N.sleep(800);
        const chat = []; for (const s of CHAT) chat.push(await N.hitTest(R, s));
        const bad = [...home, ...chat].filter(x => !x.missing && (x.hidden || !x.ok || !x.inView || x.w < 44 || x.h < 44));
        res.layout.push({ size: w + 'x' + h, home, chat, bad });
        await R.shot(path.join(__dirname, 'out', 'w3-' + ENGINE + '-' + w + 'x' + h + '-community.png'));
        log('layout ' + w + 'x' + h + ' problems', bad);
    }
    await R.page.setViewportSize({ width: 390, height: 664 });
    /* back gesture on each sheet */
    const sheets = [
        { name: 'Settings panel (Home)', prep: async () => { await N.goHome(R, log); await R.page.locator('.o8-settings').first().click({ timeout: 5000, force: true }); } },
        { name: 'Chat history (Community)', prep: async () => { await N.openCommunity(R, log); await R.page.locator('.cg-hist').first().click({ timeout: 5000, force: true }); } },
        { name: 'Member card (Community)', prep: async () => { await N.openCommunity(R, log); await R.page.locator('.cg-body:not(.me)').first().click({ timeout: 5000, force: true }); } },
        { name: 'Today sheet (Home, Fuel long view)', prep: async () => { await N.goHome(R, log); await R.page.locator('.wh-meals').first().click({ timeout: 5000, force: true }); } }
    ];
    for (const how of ['back', 'escape']) for (const sh of sheets) {
        const row = { how, sheet: sh.name };
        try {
            await R.goto(); await N.sleep(2000);
            await R.page.evaluate(() => history.pushState({ regressGuard: 1 }, '')).catch(() => { }); /* a page to go back to inside the app, like a real visit */
            await sh.prep(); await N.sleep(900);
            row.before = await N.overlays(R); row.tabBefore = await N.tab(R);
            const u0 = R.page.url(), l0 = R.loads;
            if (how === 'back') await R.page.goBack({ timeout: 5000 }).catch(e => { row.err = String(e.message).split('\n')[0]; });
            else await R.page.keyboard.press('Escape');
            await N.sleep(1000);
            row.after = await N.overlays(R); row.tabAfter = await N.tab(R); row.urlChanged = R.page.url() !== u0; row.reloaded = R.loads !== l0;
            row.closed = row.before.length > row.after.length;
        } catch (e) { row.err = String(e.message).split('\n')[0]; }
        res[how === 'back' ? 'back' : 'esc'].push(row); log(how, row);
    }
    res.crashed = R.crashed; res.errs = R.errs;
    fs.writeFileSync(path.join(__dirname, 'out', 'w3-' + ENGINE + '.json'), JSON.stringify(res, null, 1));
    log('DONE crashed=' + R.crashed + ' errs=' + R.errs.length);
    await R.close(); process.exit(0);
})().catch(e => { log('FATAL ' + (e.stack || e)); process.exit(1); });
