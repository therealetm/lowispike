'use strict';
/* Oct 25, 2026 (Emmanuel: "remove the bots from the galaxy, every real companion parked there even offline, check the nameless bubble").
   Read-only probe of the Room galaxy with the REAL Community data: Supabase GET reads go through, every write and the realtime
   socket are blocked (so the probe never shows up online and leaves nothing behind). Signs in with an existing anonymous session.
   Lists every body drawn in the galaxy with its id, its label, whether the name is hidden (cg-nn) and the server flags.
   Usage: SESSION=/tmp/gb-sess.json [URL=https://therealetm.github.io/lowispike/index.html] [W=390 H=844] [SHOT=/tmp/gb] [ENGINE=chromium|webkit]
          node tools/galaxy-bots/probe-live.cjs */
const pw = require(process.env.PW || '/tmp/pw/node_modules/playwright');
const fs = require('fs');
const SB = 'https://vnfwmifmsfecascwaody.supabase.co', KEY = 'sb_publishable_iVA3wCYxzfWu2q8SSgieWw_adXbx4Qd';
const SESSION = JSON.parse(fs.readFileSync(process.env.SESSION || '/tmp/gb-sess.json', 'utf8'));
const URL = process.env.URL || 'https://therealetm.github.io/lowispike/index.html';
(async () => {
  const all = await (await fetch(SB + '/rest/v1/profiles?select=id,name,bot,test&limit=5000', { headers: { apikey: KEY, Authorization: 'Bearer ' + SESSION.access_token } })).json();
  if (!Array.isArray(all)) throw new Error('profiles read failed ' + JSON.stringify(all).slice(0, 200));
  const flag = new Map(all.map(p => [p.id, p]));
  const eng = pw[process.env.ENGINE || 'chromium'];
  const browser = await eng.launch(process.env.ENGINE === 'webkit' ? {} : { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: +process.env.W || 390, height: +process.env.H || 844 }, deviceScaleFactor: 2, isMobile: process.env.ENGINE !== 'webkit' ? true : undefined, hasTouch: true, serviceWorkers: 'block' });
  const blocked = [];
  await ctx.routeWebSocket(/.*/, ws => { blocked.push('WS ' + ws.url().split('?')[0]); ws.close(); });
  await ctx.route('**/*', r => {
    const q = r.request(), u = q.url(), m = q.method();
    if (u.startsWith(URL.replace(/\/[^/]*$/, '/'))) return r.continue();
    if (u.startsWith(SB)) {
      if (m === 'OPTIONS') return r.continue();
      if (m === 'GET' && /\/(rest|auth)\/v1\//.test(u)) return r.continue();
      blocked.push(m + ' ' + u.replace(SB, '').split('?')[0]); return r.abort();
    }
    if (/fonts\.(googleapis|gstatic)|cdn\.jsdelivr|unpkg|esm\.sh/.test(u)) return r.continue();
    return r.abort();
  });
  await ctx.addInitScript(s => { try {
    localStorage.setItem('lowi.auth', s); localStorage.setItem('lowi.gate', 'done');
    const dd = new Date(); localStorage.setItem('lowi.daily.seen', dd.getFullYear() + '-' + String(dd.getMonth() + 1).padStart(2, '0') + '-' + String(dd.getDate()).padStart(2, '0'));
    sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.news.seen', '99999'); localStorage.setItem('lowi.tutorial.done', '1');
    localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, xp: 40, ledger: [], logs: [], saved: [], user: { name: 'Probe Visitor', bday: '1990-01-01' }, settings: { lang: 'en' } }));
  } catch (e) {} }, JSON.stringify(Object.assign({}, SESSION, { expires_at: Math.floor(Date.now() / 1000) + 3000 })));
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await page.goto(URL + (URL.includes('?') ? '&' : '?') + 'gb=' + Date.now(), { waitUntil: 'load', timeout: 90000 });
  await page.waitForTimeout(12000);
  await page.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot'); });
  const build = await page.evaluate(() => fetch('version.json?x=' + Date.now()).then(r => r.json()).then(j => j.build).catch(() => 'n/a'));
  await page.evaluate(() => { try { goTab('foryou'); } catch (e) { } });
  await page.waitForTimeout(4000);
  await page.evaluate(() => { try { if (window.LowiCommunity && LowiCommunity.openMessage) { goTab("foryou"); cmSeg("chat"); } } catch (e) { } });
  await page.waitForTimeout(2500);
  const bodies = await page.evaluate(() => [...document.querySelectorAll('#cgGalaxy .cg-body')].map(e => ({ uid: e.getAttribute('data-uid'), name: e.getAttribute('data-name'), label: (e.querySelector('.cg-name') || {}).textContent || '', cls: e.className })));
  const out = bodies.map(b => { const f = flag.get(b.uid); return Object.assign(b, { server: f ? (f.bot ? 'BOT' : f.test ? 'TEST' : 'real') : (/^bot:/.test(b.uid) ? 'made-up bot' : b.uid === 'me' || /\bme\b/.test(b.cls) ? 'you' : 'not in profiles') }); });
  console.log(JSON.stringify({ build, count: out.length, people: await page.evaluate(() => window.LOWI_CLOUD && LOWI_CLOUD.people ? LOWI_CLOUD.people().length : -1) }));
  for (const b of out) console.log([b.server.padEnd(15), (b.uid || '').slice(0, 14).padEnd(15), JSON.stringify(b.label).padEnd(22), /cg-nn/.test(b.cls) ? 'NAME HIDDEN' : '', /cg-dot/.test(b.cls) ? 'dot' : '', /cg-out/.test(b.cls) ? 'offscreen' : ''].join(' '));
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT + '-galaxy.png' });
  console.log('page errors: ' + (errs.join(' / ') || 'none'));
  console.log('blocked: ' + ([...new Set(blocked)].join(', ') || 'none'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(2); });
