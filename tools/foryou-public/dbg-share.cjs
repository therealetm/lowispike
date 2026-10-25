'use strict';
/* Debug helper (25 Oct): why does the Share button in My posts not take a tap in the simulated iPhone? Prints the button's
   ancestor chain with pointer-events / visibility / inert, and what elementFromPoint hits at its centre.
   node tools/foryou-public/dbg-share.cjs [URL]   ENGINE=chromium|webkit  FY=1 opens For You first */
const pw = require('/tmp/pw/node_modules/playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const URL0 = process.argv[2] || 'http://127.0.0.1:8765/';
(async () => {
  const ENG = process.env.ENGINE || 'chromium';
  const b = await pw[ENG].launch(ENG === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
  const dev = Object.assign({}, pw.devices['iPhone 13']); if (ENG !== 'webkit') delete dev.defaultBrowserType;
  const ctx = await b.newContext(Object.assign(dev, { serviceWorkers: 'block' }));
  await ctx.addInitScript(() => { if (sessionStorage.getItem('s')) return; sessionStorage.setItem('s', '1');
    localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowispike.tutorial.v1', JSON.stringify({ done: true, v: 99 }));
    localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, xp: 0, ledger: [], logs: [], saved: [], lang: 'en', user: { name: 'T', bday: '1990-01-01', tags: [] } }));
    localStorage.setItem('lowispike.foryou.v1', JSON.stringify({ posts: [{ id: 'old-x', vis: 'tribe', url: 'https://youtu.be/aqz-KE-bpKQ', plat: 'youtube', cap: 'Old', ts: Date.now() - 3e8, likes: 0, saves: 0, cmts: [] }] })); });
  const page = await ctx.newPage(); page.on('pageerror', e => console.log('ERR', e.message.slice(0, 150)));
  console.log('loading'); await page.goto(URL0 + '?d=' + Date.now(), { waitUntil: 'load', timeout: 240000 });
  await page.waitForFunction(() => window.TRIBE && window.goTab, null, { timeout: 200000 }); console.log('loaded');
  await sleep(4000);
  await page.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } const g = document.getElementById('r2gate'); if (g) g.remove(); document.querySelectorAll('[inert]').forEach(e => e.removeAttribute('inert')); });
  if (process.env.FY) { await page.evaluate(() => goTab('foryou')); await sleep(2000); }
  await page.evaluate(() => TRIBE.openMine()); await sleep(1500);
  const r = await page.evaluate(() => { const bt = document.querySelector('[data-tr="share-held"]'); if (!bt) return 'nobtn';
    const out = []; for (let e = bt; e; e = e.parentElement) { const cs = getComputedStyle(e); out.push((e.tagName + '#' + e.id + '.' + e.className).slice(0, 60) + ' pe=' + cs.pointerEvents + ' vis=' + cs.visibility + ' op=' + cs.opacity + ' z=' + cs.zIndex + ' inert=' + e.inert + ' disp=' + cs.display + ' tf=' + cs.transform.slice(0, 40)); }
    const rc = bt.getBoundingClientRect(); const t = document.elementFromPoint(rc.x + rc.width / 2, rc.y + rc.height / 2);
    return { chain: out, top: t && (t.tagName + '#' + t.id + '.' + t.className).slice(0, 80), rc: [rc.x, rc.y, rc.width, rc.height], inertAny: [...document.querySelectorAll('[inert]')].map(e => e.tagName + '#' + e.id + '.' + e.className).slice(0, 10), bodyCls: document.body.className.slice(0, 200), tab: (window.H && H.tab && H.tab()) || '' }; });
  console.log(JSON.stringify(r, null, 1));
  await page.screenshot({ path: '/home/sprite/fyp-run/dbg.png' });
  await b.close();
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });
