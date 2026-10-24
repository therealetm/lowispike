#!/usr/bin/env node
/* Flight crash hunt 12:01 Oct 24: WebKit iPhone SE renderer died right after autopilot + goTab('move') (seen 10:01 and 12:01).
   Splits it: (a) goTab('move') alone, (b) autopilot then goTab('move'), (c) autopilot then goTab('shelf'). Logs crash per variant,
   media/video elements on Move and the last page errors. Simulated browser only, not a real iPhone.
   Usage: node tools/flight-move-crash-probe.cjs [--engine webkit] [--device 'iPhone SE'] [--variant a|b|c] [--nomedia 1] */
'use strict';
const fs = require('fs'), path = require('path');
const H = require('./sim/harness.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ENGINE = arg('engine', 'webkit'), DEVICE = arg('device', 'iPhone SE'), VAR = arg('variant', 'b'), NOMEDIA = arg('nomedia', '1') === '1';
(async () => {
    const R = await H.open({ engine: ENGINE, device: DEVICE, url: arg('url', 'https://therealetm.github.io/lowispike/index.html') }), P = R.page;
    if (ENGINE === 'webkit' && NOMEDIA) await R.ctx.addInitScript({ content: fs.readFileSync(path.join(__dirname, 'sim', 'no-media-init.js'), 'utf8') });
    const ev = (f, a) => P.evaluate(f, a).catch(e => ({ err: String(e.message).slice(0, 100) }));
    let step = 'load';
    P.on('crash', () => console.log(R.el ? R.el() : '', 'CRASH at', step));
    try {
        await R.goto(); await H.sleep(8000);
        if (VAR !== 'a') { step = 'autopilot'; await ev(() => window.LowiPad && window.LowiPad.mode('auto')); await H.sleep(6000); console.log('auto on', JSON.stringify(await ev(() => ({ mode: document.documentElement.className.match(/mp-\S+/g) })))); }
        step = VAR === 'c' ? 'goTab shelf' : 'goTab move';
        await ev(t => window.goTab(t), VAR === 'c' ? 'shelf' : 'move'); await H.sleep(2500);
        console.log('on tab', JSON.stringify(await ev(() => ({ media: [...document.querySelectorAll('video,audio')].filter(m => m.offsetParent || m.autoplay).map(m => m.tagName + ':' + (m.currentSrc || m.getAttribute('src') || (m.querySelector('source') || {}).src || '').slice(-60)), canv: document.querySelectorAll('canvas').length }))));
        step = 'goTab home'; await ev(() => window.goTab('home')); await H.sleep(3000);
        console.log('home again', JSON.stringify(await ev(() => ({ cur: window.LowiWorldRegions.state.cur }))));
    } catch (e) { console.log('probe error', String(e.message).slice(0, 160)); }
    console.log('RESULT ' + JSON.stringify({ variant: VAR, nomedia: NOMEDIA, crashed: !!R.crashed, step, errs: R.errs.slice(-5).map(e => String(e.m).slice(0, 160)) }));
    await Promise.race([R.close(), H.sleep(10000)]).catch(() => { });
    process.exit(0);
})();
