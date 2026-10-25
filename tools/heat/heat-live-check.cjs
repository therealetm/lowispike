#!/usr/bin/env node
'use strict';
/* LOWiSPIKE heat live check (Oct 25 2026, release task a5ab4bf9). Against any build (default: the live site), Chromium or WebKit,
   iPhone 13 screen, stand-in Supabase (nothing reaches the live database):
   1. power saver loaded, build as expected
   2. after real quiet time the world draws far fewer frames and the main thread drops
   3. one touch brings full speed back at once
   Usage: URL=https://therealetm.github.io/lowispike/index.html ENGINE=chromium|webkit BUILD=2026... node tools/heat/heat-live-check.cjs
   NOT an iPhone: software rendering on a shared VM. Heat itself can only be confirmed on the phone. */
const pw = require(process.env.PW || '/tmp/pw/node_modules/playwright');
const fs = require('fs');
const SB = 'https://vnfwmifmsfecascwaody.supabase.co';
const URL = process.env.URL || 'https://therealetm.github.io/lowispike/index.html';
const ENGINE = process.env.ENGINE || 'chromium';
const BUILD = process.env.BUILD || '';
const QUIET = +process.env.QUIET || 35000;
const SESSION = JSON.parse(fs.readFileSync('/tmp/gb-sess.json', 'utf8'));
const ALL = JSON.parse(fs.readFileSync('/tmp/gb-all.json', 'utf8'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const browser = await pw[ENGINE].launch(ENGINE === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
  const dev = Object.assign({}, pw.devices['iPhone 13']); if (ENGINE !== 'webkit') delete dev.defaultBrowserType;
  const ctx = await browser.newContext(Object.assign(dev, { deviceScaleFactor: +process.env.DPR || dev.deviceScaleFactor, serviceWorkers: 'block' }));
  const json = (r, body, status) => r.fulfill({ status: status || 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'content-range': '0-0/*' }, body: JSON.stringify(body) });
  const profiles = ALL.map(p => Object.assign({ sign: '', mbti: '', streak: 0, bio: '', bday: '', xp: p.lv * 100, xp_week: 0, wk: '', xp_month: 0, mo: '', weight: '' }, p));
  profiles.push({ id: SESSION.user.id, name: 'Probe Visitor', lv: 2, xp: 50, bot: false, test: false, avatar: '' });
  await ctx.routeWebSocket(/.*/, ws => ws.close());
  await ctx.route('**/*', async r => {
    const q = r.request(), u = q.url(), m = q.method();
    if (u.startsWith(URL.replace(/\/[^/]*$/, '/'))) return r.continue();
    if (u.startsWith(SB)) {
      if (m === 'OPTIONS') return json(r, {});
      const p = u.replace(SB, '').split('?')[0];
      if (/\/auth\/v1\/user/.test(p)) return json(r, SESSION.user);
      if (/\/auth\/v1\/token/.test(p)) return json(r, Object.assign({}, SESSION, { expires_at: Math.floor(Date.now() / 1000) + 3000, expires_in: 3000 }));
      if (m !== 'GET' && m !== 'HEAD') return json(r, m === 'POST' ? [] : {}, m === 'POST' ? 201 : 200);
      if (/\/rest\/v1\/profiles/.test(p)) return json(r, profiles);
      return json(r, []);
    }
    if (/fonts\.(googleapis|gstatic)|cdn\.jsdelivr|unpkg|esm\.sh/.test(u)) return r.continue();
    return r.abort();
  });
  await ctx.addInitScript(([s]) => { try {
    localStorage.setItem('lowi.auth', s); localStorage.setItem('lowi.gate', 'done');
    const dd = new Date(); localStorage.setItem('lowi.daily.seen', dd.getFullYear() + '-' + String(dd.getMonth() + 1).padStart(2, '0') + '-' + String(dd.getDate()).padStart(2, '0'));
    sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.news.seen', '99999'); localStorage.setItem('lowi.tutorial.done', '1');
    localStorage.setItem('lowispike.tutorial.v1', JSON.stringify({ done: true, v: 99 }));
    localStorage.setItem('lowi.power', 'normal');
    if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, xp: 40, ledger: [], logs: [], saved: [], lang: 'en', user: { name: 'Probe Visitor', bday: '1990-01-01' }, settings: { lang: 'en' } }));
  } catch (e) {} }, [JSON.stringify(Object.assign({}, SESSION, { expires_at: Math.floor(Date.now() / 1000) + 3000 }))]);
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message.slice(0, 200)));
  let cdp = null;
  if (ENGINE === 'chromium') { cdp = await ctx.newCDPSession(page); await cdp.send('Performance.enable'); }
  await page.goto(URL + (URL.includes('?') ? '&' : '?') + 'hl=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
  await sleep(10000);
  await page.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot'); });
  if (BUILD) { const b = await page.evaluate(() => fetch('version.json?x=' + Date.now(), { cache: 'no-store' }).then(r => r.json()).then(j => j.build).catch(() => '')); ok(b === BUILD, 'version.json build ' + b + ' (expected ' + BUILD + ')'); }
  ok(await page.evaluate(() => !!(window.LowiPower && LowiPower.state)), 'power saver loaded');
  ok(await page.evaluate(() => !!(window.LowiWorld3D && LowiWorld3D.renderer)), '3D world running');
  /* STUBGL=1: skip the draw itself (count only) so the VM's software GPU is not the bottleneck */
  if (process.env.STUBGL) await page.evaluate(() => { window.__stub = 1; });
  await page.evaluate(() => { const r = LowiWorld3D.renderer; const f = r.render; window.__wr = 0; window.__wrFirst = 0; r.render = function () { window.__wr++; if (window.__wrFirst === null) window.__wrFirst = performance.now(); if (!window.__stub) return f.apply(this, arguments); }; });
  const busyNow = async () => { if (!cdp) return null; const r = await cdp.send('Performance.getMetrics'); const o = {}; r.metrics.forEach(m => o[m.name] = m.value); return o.TaskDuration; };
  const span = async ms => { const a = await page.evaluate(() => window.__wr), ba = await busyNow(), t0 = Date.now(); await sleep(ms); const b = await page.evaluate(() => window.__wr), bb = await busyNow(); const s = (Date.now() - t0) / 1000; return { draws: +((b - a) / s).toFixed(1), busy: ba == null ? null : +((bb - ba) / s * 100).toFixed(1) }; };
  const v = page.viewportSize();
  const touching = (async () => { const end = Date.now() + 4500; while (Date.now() < end) { await page.evaluate(([x, y]) => window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'touch', clientX: x, clientY: y })), [v.width / 2 + Math.random() * 40, v.height * 0.7]); await sleep(120); } })();
  await sleep(500); const active = await span(3500); await touching;
  console.log('touching:   world draws/s ' + active.draws + '  main busy ' + active.busy + '%');
  await sleep(QUIET);
  const st = await page.evaluate(() => LowiPower.state());
  const quiet = await span(8000);
  console.log('quiet ' + Math.round(QUIET / 1000 + 8) + ' s: world draws/s ' + quiet.draws + '  main busy ' + quiet.busy + '%  state ' + st);
  ok(st === 'rest' || st === 'deep', 'quiet ladder reached rest/deep (' + st + ')');
  ok(quiet.draws <= 16, 'quiet world draws at most ~15 a second (' + quiet.draws + '/s)');
  ok(quiet.draws < active.draws || active.draws <= 16, 'quiet draws fewer frames than touching (' + quiet.draws + ' vs ' + active.draws + ')');
  if (cdp) ok(quiet.busy < active.busy, 'main thread less busy when quiet (' + quiet.busy + '% vs ' + active.busy + '%)');
  const t = await page.evaluate(() => new Promise(res => {
    const n0 = window.__wr, t0 = performance.now(); window.__wrFirst = null;
    window.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', clientX: 200, clientY: 600 }));
    const st = LowiPower.state();
    setTimeout(() => res({ st, first: window.__wrFirst === null ? null : +(window.__wrFirst - t0).toFixed(1), n: window.__wr - n0 }), 1000);
  }));
  console.log('one touch:  state ' + t.st + ', first world frame after ' + t.first + ' ms, ' + t.n + ' frames in the next second');
  ok(t.st === 'active', 'a touch switches to active at once');
  ok(t.first != null && t.first < 150, 'next world frame comes right away (' + t.first + ' ms)');
  ok(t.n > quiet.draws, 'more frames in the second after the touch than when quiet (' + t.n + ' vs ' + quiet.draws + ')');
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' / ') : ''));
  console.log(fails ? 'FAILED ' + fails : 'ALL PASS');
  await browser.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('HEAT LIVE CHECK FAILED', e); process.exit(2); });
