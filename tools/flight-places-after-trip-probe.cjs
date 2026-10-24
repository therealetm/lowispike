#!/usr/bin/env node
/* Flight crash hunt 20:01 Oct 24: tap-into-world-probe found no place tappable for the rest of the run after one trip into the
   muscle world and back (travel('hub')). This logs where the world places sit on screen (placesLook) and what covers each spot,
   at rest, after a trip + travel('hub'), and after a pinch-out wheel, with a screenshot each time.
   Usage: node tools/flight-places-after-trip-probe.cjs [url|root] [--engine chromium|webkit] [--device 'iPhone 13'] [--world muscle] [--out dir] */
'use strict';
const fs = require('fs'), path = require('path');
const H = require('./sim/harness.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const where = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'https://therealetm.github.io/lowispike/index.html';
const OUT = arg('out', '/tmp/places-after-trip'); fs.mkdirSync(OUT, { recursive: true });
(async () => {
    const o = { engine: arg('engine', 'chromium'), device: arg('device', 'iPhone 13') }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
    const R = await H.open(o), P = R.page;
    const look = label => P.evaluate(() => {
        const W3 = window.LowiWorld3D, s = window.LowiWorldRegions.state, cv = document.querySelector('.bw3-canvas') || document.querySelector('canvas'), rc = cv.getBoundingClientRect();
        const places = W3.placesLook().map(b => { const x = rc.left + b.x, y = rc.top + b.y, t = (x > 0 && y > 0 && x < innerWidth && y < innerHeight) ? document.elementFromPoint(x, y) : null; return { id: b.id, x: Math.round(x), y: Math.round(y), z: +(+b.z).toFixed(2), r: b.r && Math.round(b.r), top: t ? (t.tagName === 'CANVAS' ? 'canvas' : (t.id || t.className || t.tagName).toString().slice(0, 40)) : 'off' }; });
        const cam = W3.camLook ? W3.camLook() : null;
        return { cur: s.cur, busy: !!s.busy, cls: document.documentElement.className.split(' ').filter(c => /^wh-|^o8|lw-/.test(c)).join(' '), cam, places };
    }).then(r => { console.log('== ' + label, JSON.stringify(r)); return r; });
    const wait = async () => { for (let i = 0; i < 120; i++) { await H.sleep(500); const s = await P.evaluate(() => ({ cur: window.LowiWorldRegions.state.cur, busy: !!window.LowiWorldRegions.state.busy })); if (!s.busy) return s; } return 'still busy'; };
    try {
        await R.goto(); await H.sleep(9000);
        await look('rest'); await P.screenshot({ path: path.join(OUT, '1-rest.png') });
        await P.evaluate(w => window.LowiWorldRegions.travel(w), arg('world', 'muscle')); console.log('arrive', JSON.stringify(await wait())); await H.sleep(3000);
        await P.evaluate(() => window.LowiWorldRegions.travel('hub')); console.log('back', JSON.stringify(await wait())); await H.sleep(4000);
        await look('after trip, travel(hub)'); await P.screenshot({ path: path.join(OUT, '2-after-hub.png') });
        await H.sleep(10000); await look('after trip +10s'); await P.screenshot({ path: path.join(OUT, '3-after-hub-10s.png') });
        await P.evaluate(() => { const st = document.querySelector('.bw3-stage'); for (let k = 0; k < 4; k++) st.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 120, clientX: innerWidth / 2, clientY: innerHeight / 2 })); });
        await H.sleep(3000); await look('after wheel out'); await P.screenshot({ path: path.join(OUT, '4-wheel.png') });
        await P.evaluate(() => window.LowiWorldRegions.travel('hub', false, 0, { wide: true })); await wait(); await H.sleep(4000);
        await look('after travel(hub, wide)'); await P.screenshot({ path: path.join(OUT, '5-wide.png') });
    } catch (e) { console.log('ERR', e.message); }
    await R.close();
})();
