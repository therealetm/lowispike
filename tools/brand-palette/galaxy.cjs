#!/usr/bin/env node
/* item 32: the galaxy pictures (Home zoomed all the way out), with proof that the zoom happened.
   node tools/brand-palette/galaxy.cjs <repo root> <out prefix> */
'use strict';
const fs = require('fs'), path = require('path');
const L = require('./lib.cjs');
const ROOT = path.resolve(process.argv[2]), OUT = process.argv[3];
(async () => {
    const srv = await L.serve(ROOT); const url = 'http://127.0.0.1:' + srv.address().port + '/index.html';
    const h = await L.open({ view: 'c390x1', url, settle: 9000 });
    const p = h.page, R = [];
    await p.evaluate(() => { try { goTab('today'); } catch (e) { } }); await L.sleep(4000);
    const st = () => p.evaluate(() => { const W = window.LowiWorldHome; let z = null, dist = null, maxD = null; try { const r = W && W.rig ? W.rig() : null; if (r) { dist = +r.dist.toFixed(2); maxD = +r.maxD.toFixed(2); z = r.dist >= r.maxD * 0.9; } } catch (e) { } const hud = document.querySelector('#whHud'); return { zoomedOut: z, dist, maxD, hudVisible: !!(hud && hud.offsetParent && getComputedStyle(hud).opacity > 0.1), brandGalaxy: window.LowiBrand ? LowiBrand.GALAXY : null }; });
    R.push(['home', await st()]);
    await p.screenshot({ path: OUT + '-galaxy-0home.png' });
    await p.evaluate(() => { try { LowiWorldHome.zoomOutWhole(); } catch (e) { window.__zErr = String(e); } });
    for (const t of [5, 10]) { await L.sleep(5000); await p.screenshot({ path: OUT + '-galaxy-' + t + 's.png' }); R.push([t + 's', await st()]); }
    R.push(['err', await p.evaluate(() => window.__zErr || '')]);
    fs.writeFileSync(OUT + '-galaxy.json', JSON.stringify({ R, log: h.log }, null, 1));
    console.log(JSON.stringify(R));
    const last = R.filter(x => /s$/.test(x[0])).pop();
    if (!last || last[1].zoomedOut !== true) { console.error('GALAXY FAIL: not zoomed out (dist ' + (last && last[1].dist) + ' of maxD ' + (last && last[1].maxD) + ')'); process.exitCode = 2; }
    await h.browser.close(); srv.close();
})().catch(e => { console.error('GALAXY FAIL', e); process.exit(1); });
