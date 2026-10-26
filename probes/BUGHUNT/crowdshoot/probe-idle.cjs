'use strict';
/* idle cost of the Community galaxy with the real crowd: where the main thread goes over 10 s, and what animates */
const fs = require('fs'), path = require('path'), pw = require('/tmp/pw/node_modules/playwright');
const URL0 = process.argv[2], sess = JSON.parse(fs.readFileSync(path.join(__dirname, 's29.json'), 'utf8')), sleep = ms => new Promise(r => setTimeout(r, ms));
const INIT = fs.readFileSync(path.join(__dirname, 'probe.cjs'), 'utf8').match(/const INIT = `([\s\S]*?)`;\n/)[1].replace('${JSON.stringify(JSON.stringify(sess))}', JSON.stringify(JSON.stringify(sess)));
(async () => {
  const b = await pw.chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
  await ctx.route('**/*', r => { const q = r.request(), u = new URL(q.url()); if (!['GET', 'HEAD', 'OPTIONS'].includes(q.method()) && u.host.endsWith('supabase.co') && !u.pathname.startsWith('/auth/v1/token')) return r.abort(); return r.continue(); });
  await ctx.addInitScript(INIT); const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page); await cdp.send('Performance.enable');
  await page.goto(URL0 + '?tb=' + Date.now(), { waitUntil: 'load' }); await page.waitForFunction(() => typeof window.goTab === 'function'); await sleep(6000);
  await page.evaluate(() => window.goTab('foryou')); await sleep(1000); await page.evaluate(() => window.cmSeg && window.cmSeg('chat')); if (process.env.CSS) await page.addStyleTag({ content: process.env.CSS }); await sleep(10000);
  const M = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x => [x.name, x.value]));
  const a = await M(); await sleep(10000); const z = await M();
  const d = k => +(z[k] - a[k]).toFixed(2);
  console.log(URL0, process.env.CSS ? 'CSS=' + process.env.CSS.slice(0, 80) : '', 'per 10 s idle:', JSON.stringify({ task: d('TaskDuration'), script: d('ScriptDuration'), layout: d('LayoutDuration'), style: d('RecalcStyleDuration'), layouts: d('LayoutCount'), styles: d('RecalcStyleCount') }));
  console.log('anim', JSON.stringify(await page.evaluate(() => { const A = document.getAnimations(), by = {}; for (const x of A) { const t = x.effect && x.effect.target; const k = (x.animationName || x.constructor.name) + '@' + (t ? (t.closest('#cmList') ? 'list' : t.closest('#cgField') ? 'field' : t.closest('#cgGalaxy') ? 'galaxy' : 'other') : '?'); by[k] = (by[k] || 0) + 1; } return { total: A.length, smil: document.querySelectorAll('animate,animateMotion,animateTransform').length, smilField: document.querySelectorAll('#cgField animate,#cgField animateMotion,#cgField animateTransform').length, smilList: document.querySelectorAll('#cmList animate,#cmList animateMotion,#cmList animateTransform').length, top: Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 12) }; })));
  await b.close();
})();
