#!/usr/bin/env node
/* Oct 26 2026 (Emmanuel: "Once we're in the Community section, the back button disappears"). Reproduces how the round
   "Back to Home" button (#secX, section-nav.js) goes missing on Community: start your companion flying on Home (LowiPad mode
   'auto' = autopilot, 'drive' = steering), then open Community and walk its tabs. Prints the button's display and the html state
   classes after each step. Usage: node tools/community-home-btn/repro.cjs [URL] [auto|drive|none] */
'use strict';
const H = require('../regress/harness.cjs');
const st = R => R.page.evaluate(() => {
    const x = document.getElementById('secX'), Hc = document.documentElement.classList, cs = x && getComputedStyle(x);
    return { tab: (document.querySelector('#main > .tab.active') || {}).id, disp: cs ? cs.display : 'missing', pad: window.LowiPad && window.LowiPad.state ? window.LowiPad.state().pad : null, fl: window.LowiMistyFlight ? window.LowiMistyFlight.state().st : null, cls: [...Hc].filter(c => /^(sec|mf|b3|sp-open|g2e|wh-pad|lw-)/.test(c)).join(' ') };
});
(async () => {
    const url = process.argv[2] || '', mode = process.argv[3] || 'auto';
    const R = await H.open({ engine: 'webkit', url });
    await R.goto(); await H.sleep(3000);
    if (mode !== 'none') { await R.page.evaluate(m => window.LowiPad && window.LowiPad.mode(m), mode); await H.sleep(5000); }
    console.log('home', JSON.stringify(await st(R)));
    await R.page.evaluate(() => goTab('foryou')); await H.sleep(3000);
    console.log('community', JSON.stringify(await st(R)));
    for (const t of ['chat', 'fy', 'studio', 'rank', 'room']) { await R.page.evaluate(t => { const b = document.querySelector('.rm-tab[data-rm="' + t + '"]'); if (b) b.click(); }, t); await H.sleep(1500); console.log(t, JSON.stringify(await st(R))); }
    await H.sleep(15000); console.log('after 15s', JSON.stringify(await st(R)));
    console.log('errs', JSON.stringify(R.errs.slice(0, 3)));
    await R.close();
})();
