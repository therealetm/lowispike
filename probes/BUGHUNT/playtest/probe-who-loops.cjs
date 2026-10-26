/* Run 22: who owns the live setIntervals and the rAF callbacks on an idle Home? node probe-who-loops.cjs <wt> [url] [engine] */
'use strict';
const path = require('path');
const [wt, url = 'https://therealetm.github.io/lowispike/index.html', engine = 'chromium', device = 'iPhone 13'] = process.argv.slice(2);
const H = require(path.join(wt, 'tools/sim/harness.cjs'));
const COUNT = () => {
  const W = window; W.__pt = { raf: new Map(), iv: new Map() };
  const where = () => { const s = (new Error().stack || '').split('\n').slice(3, 6).map(l => l.trim().replace(/https?:\/\/[^/]+\/(lowispike\/)?/, '').replace(/\?v=[^:]+/, '')).join(' < '); return s; };
  const r = W.requestAnimationFrame.bind(W); W.requestAnimationFrame = f => { const k = where(); return r(t => { W.__pt.raf.set(k, (W.__pt.raf.get(k) || 0) + 1); f(t); }); };
  const si = W.setInterval.bind(W), ci = W.clearInterval.bind(W);
  W.setInterval = function (f, ms, ...a) { const id = si(f, ms, ...a); W.__pt.iv.set(id, ms + 'ms @ ' + where()); return id; };
  W.clearInterval = function (id) { W.__pt.iv.delete(id); return ci(id); };
};
(async () => {
  const R = await H.open({ engine, device, url, probe: false });
  const P = R.page; await P.addInitScript(COUNT);
  await R.goto(); await H.sleep(15000);
  await P.evaluate(() => __pt.raf.clear()); await H.sleep(10000);
  const o = await P.evaluate(() => {
    const g = {}; [...__pt.iv.values()].forEach(v => { g[v] = (g[v] || 0) + 1; });
    return { raf: [...__pt.raf.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15), iv: Object.entries(g).sort((a, b) => b[1] - a[1]).slice(0, 40), ivTotal: __pt.iv.size, power: window.LowiPower && LowiPower.state && LowiPower.state(), cls: document.documentElement.className };
  });
  console.log(JSON.stringify(o, null, 1));
  await R.close(); process.exit(0);
})().catch(e => { console.log('BROKEN', e.stack); process.exit(1); });
