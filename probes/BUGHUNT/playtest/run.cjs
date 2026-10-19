#!/usr/bin/env node
'use strict';
/* Usage: node run.cjs --scenario home-abuse|world-churn|storage-corrupt|lang-switch|panel-race [--root DIR | --url URL] [--views chromium390,iphone13] [--seed N] [--out DIR] */
const path = require('path'), fs = require('fs');
const L = require('./lib.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const SC = require('./scenarios.cjs');
(async () => {
    const OUT = arg('out', '/home/sprite/BUGHUNT/playtest/out'); fs.mkdirSync(OUT, { recursive: true });
    const srv = arg('url', '') ? null : await L.serve(path.resolve(arg('root', '.')));
    const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`;
    const seed = +arg('seed', 1);
    const results = [];
    for (const view of arg('views', 'chromium390').split(',')) for (const name of arg('scenario', 'home-abuse').split(',')) {
        const t0 = Date.now(); let r;
        try { r = await SC[name]({ L, url, view, seed, OUT, rnd: L.mulberry32(seed) }); } catch (e) { r = { harnessError: String(e.stack || e).slice(0, 600) }; }
        r.view = view; r.scenario = name; r.seed = seed; r.sec = Math.round((Date.now() - t0) / 1000);
        results.push(r); console.log(JSON.stringify(r, null, 1));
    }
    fs.writeFileSync(path.join(OUT, 'last.json'), JSON.stringify(results, null, 1));
    if (srv) srv.close();
    process.exit(0);
})();
