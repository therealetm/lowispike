/* PROMO6: frame-stepped 30 fps screen recording of the REAL live app (WebKit, iPhone 13 at a 9:16 viewport), fake local profile 'Connie',
   Supabase answered by the harness's fake cloud (production never reached). Real taps: Fuel bubble -> Cook -> Shuffle my food. */
process.env.SIM_WK_VIEWPORT = '1';
const H = require('/home/sprite/lowispike/tools/sim/harness.cjs');
const fs = require('fs');
const OUT = '/home/sprite/PROMO6/rec/'; fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const SEED = fs.readFileSync('/home/sprite/PROMO6/seed.js', 'utf8').replace("localStorage.setItem('lowi.g1.auto', '1');", "localStorage.setItem('lowi.g1.auto', '1'); localStorage.setItem('lowi.cook.view', 'shuffle');");
const STEP = fs.readFileSync('/home/sprite/PROMO6/step.js', 'utf8');
const DT = 1000 / 30;
(async () => {
  const R = await H.open({ engine: 'webkit', device: 'iPhone 13', viewport: { width: 390, height: 693 }, url: 'https://therealetm.github.io/lowispike/index.html', lang: 'en', name: 'Connie', members: 4, messages: 4, probe: false });
  const P = R.page;
  await P.clock.install({ time: new Date('2026-10-27T18:10:00+01:00') }); await P.clock.resume();
  await R.ctx.addInitScript({ content: SEED });
  await R.ctx.addInitScript({ content: '(()=>{let a=' + (process.env.SEED||7) + ';Math.random=function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};})();' });
  const realRoutes = []; R.ctx.on('request', q => { const u = q.url(); if (/supabase\.co/.test(u)) realRoutes.push(u); });
  await R.goto(); await H.sleep(10000);
  const meta = await P.evaluate(() => ({ vw: innerWidth, vh: innerHeight, dpr: devicePixelRatio, build: (document.querySelector('meta[name=lowi-build]') || {}).content || '', href: location.href, cls: (document.querySelector('svg.tmg-plant') || { getAttribute: () => '' }).getAttribute('class') }));
  console.log('meta', JSON.stringify(meta));
  const now = await P.evaluate(() => Date.now()); await P.clock.pauseAt(now + 300);
  await P.evaluate(STEP);
  const taps = []; let f = 0; const t0 = Date.now();
  const center = async (sel) => P.evaluate((s) => { const e = [...document.querySelectorAll(s)].find(x => { const r = x.getBoundingClientRect(); return r.width > 4 && r.height > 4 && getComputedStyle(x).visibility !== 'hidden'; }); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, sel);
  const tap = async (sel) => { const c = await center(sel); if (!c) { console.log('NO TARGET', sel, 'at frame', f); return false; } await P.touchscreen.tap(c.x, c.y); taps.push({ f, sel, x: c.x, y: c.y }); console.log('tap', sel, 'frame', f, JSON.stringify(c)); return true; };
  const frame = async () => { await P.clock.runFor(DT); await P.evaluate((d) => window.__p6step(d), DT); await P.screenshot({ path: OUT + 'f' + String(f).padStart(4, '0') + '.png', timeout: 90000 }); f++; if (f % 10 === 0) console.log('frame', f, ((Date.now() - t0) / 1000).toFixed(0) + 's'); };
  for (let i = 0; i < 12; i++) await frame();
  await tap('.wh-meals');
  for (let i = 0; i < 22; i++) await frame();
  if (!await tap('.hb2-orb[aria-label^="Cook"]')) { for (let i = 0; i < 10; i++) await frame(); await tap('.hb2-orb[aria-label^="Cook"]'); }
  for (let i = 0; i < 20; i++) await frame();
  if (!await tap('.ck-b[data-ck="view"][data-v="shuffle"]')) { for (let i = 0; i < 10; i++) await frame(); await tap('.ck-b[data-ck="view"][data-v="shuffle"]'); }
  for (let i = 0; i < 12; i++) await frame();
  if (!await tap('[data-ck="cat"][data-v="meal"]')) { for (let i = 0; i < 8; i++) await frame(); await tap('[data-ck="cat"][data-v="meal"]'); }
  for (let i = 0; i < 10; i++) await frame();
  if (!await tap('#r5Go')) { for (let i = 0; i < 12; i++) await frame(); await tap('#r5Go'); }
  const revealAt = f;
  for (let i = 0; i < 100; i++) await frame();
  const txt = await P.evaluate(() => document.body.innerText.slice(0, 900));
  fs.writeFileSync(OUT + 'meta.json', JSON.stringify({ meta, taps, frames: f, revealAt, supabaseRequestsSeen: realRoutes.length, fakeCloudWrites: R.sim ? R.sim.writes.length : null, text: txt }, null, 1));
  console.log('done frames', f, 'reveal', revealAt);
  await R.close(); process.exit(0);
})().catch(e => { console.log('FAIL', e && e.stack); process.exit(1); });
