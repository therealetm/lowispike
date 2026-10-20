/* Item 31: main-thread cost of just looking at Home and at Community for 5 s (Chromium CDP metrics), and what is animating. */
'use strict';
const H = require('./harness.cjs');
const [members = '45', messages = '300', where = ''] = process.argv.slice(2);
(async () => {
  const o = { engine: 'chromium', members: +members, messages: +messages }; if (/^https?:/.test(where)) o.url = where; else if (where) o.root = where;
  const R = await H.open(o); const P = R.page; const cdp = await R.ctx.newCDPSession(P); await cdp.send('Performance.enable');
  const M = async () => { const m = {}; (await cdp.send('Performance.getMetrics')).metrics.forEach(x => m[x.name] = x.value); return m; };
  const idle = async (tag) => { await H.sleep(3000); const a = await M(); const t0 = Date.now(); await H.sleep(5000); const b = await M(); const wall = Date.now() - t0;
    const anim = await P.evaluate(() => { const a = document.getAnimations ? document.getAnimations() : []; const by = {}; a.forEach(x => { if (x.playState !== 'running') return; const t = x.effect && x.effect.target; const k = t ? (t.tagName + '.' + String(t.className && t.className.baseVal != null ? t.className.baseVal : t.className).split(' ')[0]) : '?'; by[k] = (by[k] || 0) + 1; }); return { running: a.filter(x => x.playState === 'running').length, top: Object.entries(by).sort((x, y) => y[1] - x[1]).slice(0, 8) }; });
    console.log(tag, JSON.stringify({ wall, taskMs: Math.round((b.TaskDuration - a.TaskDuration) * 1000), scriptMs: Math.round((b.ScriptDuration - a.ScriptDuration) * 1000), styleMs: Math.round((b.RecalcStyleDuration - a.RecalcStyleDuration) * 1000), styles: b.RecalcStyleCount - a.RecalcStyleCount, layouts: b.LayoutCount - a.LayoutCount, nodes: b.Nodes, heapMB: Math.round(b.JSHeapUsedSize / 1048576), anim })); };
  await R.goto(); await H.sleep(4000); await idle('HOME');
  for (let k = 0; k < 4; k++) { await R.tap('.o8-settings'); await H.sleep(2500); const c = P.locator('.ss2-chip', { hasText: /^Community$/ }).first(); await c.evaluate(e => e.scrollIntoView({ block: 'center' })); await H.sleep(600); await R.tapEl(c); await H.sleep(4000); if (await P.locator('#cmInput').isVisible().catch(() => false)) break; }
  await idle('COMMUNITY m' + members);
  console.log('errs', JSON.stringify(R.errs));
  await R.close();
})();
