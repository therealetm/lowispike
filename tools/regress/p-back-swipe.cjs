#!/usr/bin/env node
/* ship task probe: Safari back (history.back) inside Community goes to Today and stays in the app; on Today with a sheet, it closes the sheet */
'use strict';
const { open } = require('./harness.cjs');
const N = require('./nav.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const log = N.logger('pback');
const snap = R => R.page.evaluate(() => ({ url: location.href.slice(-40), tab: (document.querySelector('.tab.active') || {}).id, state: history.state, len: history.length, ss2: !!document.querySelector('html.ss2-open, .ss2-panel.on, .ss2.on'), loaded: !!window.LowiBackSwipe }));
(async () => {
    const R = await open({ engine: arg('engine', 'webkit'), url: arg('url', '') });
    const P = R.page;
    await R.goto(); await N.sleep(5000);
    await P.mouse.click(5, 300); await N.sleep(300);
    log('home touched', await snap(R));
    await P.evaluate(() => goTab('foryou')); await N.sleep(2500);
    await P.mouse.click(5, 300); await N.sleep(300);
    log('in community', await snap(R));
    await P.evaluate(() => history.back()); await N.sleep(2500);
    const a = await snap(R); log('after back in community', a);
    await P.evaluate(() => { const b = document.querySelector('.o8-settings'); if (b) b.click(); }); await N.sleep(1500);
    await P.mouse.click(5, 600).catch(() => {}); await N.sleep(300);
    log('settings opened?', await snap(R), await P.evaluate(() => document.documentElement.className.split(' ').filter(c => /ss2|open/.test(c))));
    await P.evaluate(() => history.back()); await N.sleep(1500);
    log('after back with settings', await snap(R), await P.evaluate(() => document.documentElement.className.split(' ').filter(c => /ss2|open/.test(c))));
    log('errs', R.errs.map(e => e.m.slice(0, 200)));
    log(a.tab === 'tab-home' && a.loaded ? 'PASS community back -> Today' : 'FAIL community back');
    await R.close(); process.exit(0);
})().catch(e => { log('FATAL ' + (e.stack || e)); process.exit(1); });
