/* Leave the Community chat for Home, every way, 20 times (22 Oct 2026, Emmanuel's screen recording: Home stayed covered by the
   chat's spirit-world background after leaving the chat).
   Each cycle: Community > Chat room open > leave by one route (Home X after the room's back arrow, edge swipe / phone back,
   LowiSections.close, a plain goTab('home') like the profile hub's Home items) > measure Home.
   Home may show the camera still out for at most MAXMS (1.2 s) of painted frames: Home tab active, Community hidden, no chat room / room classes / galaxy-zoom classes left,
   the camera back at Misty (no wh-mapview / wh-cosmos), the spirit veil off, the chat's canvases not on screen. Coming back opens
   the room again. Over 20 cycles canvases, nodes, timers and (Chromium) heap must not keep growing.
   node tools/chat-leave/probe.cjs [outDir] [url] [devices] [cycles]   (THROTTLE=4 slows Pixel 7's CPU 4x) -> exit 1 on failure */
'use strict';
const fs = require('fs'), path = require('path');
const H = require('../regress/harness.cjs'), N = require('../regress/nav.cjs');
const sleep = H.sleep;
const OUT = path.resolve(process.argv[2] || '/tmp/chat-leave-probe'); fs.mkdirSync(OUT, { recursive: true });
const URL_ = process.argv[3] || '';
const DEVICES = (process.argv[4] || 'iPhone SE,iPhone 13,iPhone 15,Pixel 7').split(',');
const CYCLES = +(process.argv[5] || 20);
const MAXMS = +(process.env.MAXMS || 1200);   /* ms Home may be painted with the camera still out (the dive is capped at 900 ms); the old bug: 3-15 s */
const ROUTES = ['tab', 'x', 'sec'];   /* history.back() has no entry to go back to in a fresh headless page */
const fails = [], notes = [];
const fail = (w, m) => { fails.push(w + ': ' + m); console.log('FAIL', w, m); };

async function openRoom(p) {
  for (let i = 0; i < 3; i++) {
    if (await p.evaluate(() => !!document.querySelector('#cgThread[data-open]'))) return true;
    await p.evaluate(i => { if (i === 0) { const b = document.querySelector('.rm-tab[data-rm="chat"]'); if (b) b.click(); } else { try { LowiCommunity.thread(true); } catch (e) { } } }, i);
    await sleep(1200);
  }
  return p.evaluate(() => !!document.querySelector('#cgThread[data-open]'));
}
async function leave(p, route) {
  return p.evaluate(route => {
    window.__t0 = performance.now();
    /* frame log: what each painted frame looked like after leaving (wall time on a busy headless machine is mostly the page
       being blocked, so the check is from the first frame that paints Home to the first clean one) */
    const L = window.__fl = []; const t00 = performance.now();
    (function tick() { const C = document.documentElement.classList, WH = window.LowiWorldHome, z = WH && WH.state && WH.state.zoomAnim;
      L.push({ t: Math.round(performance.now() - t00), home: !!document.querySelector('#tab-home.active') && !C.contains('gx-in') && !C.contains('gx-keep'), far: C.contains('wh-mapview') || C.contains('wh-cosmos') || !!z });
      if (L.length < 600 && performance.now() - t00 < 9000) requestAnimationFrame(tick); })();
    if (route === 'tab') { goTab('home'); return 'tab'; }
    if (route === 'sec') { LowiSections.close(); return 'sec'; }
    if (route === 'back') { history.back(); return 'back'; }
    const b = document.querySelector('#cgThread .cr-back'); if (b) b.click();
    return new Promise(res => setTimeout(() => { const x = [...document.querySelectorAll('.sec-x')].find(e => e.getBoundingClientRect().width > 0); if (x) { window.__t0 = performance.now(); x.click(); res('x'); } else { LowiSections.close(); res('x-fallback'); } }, 600));
  }, route);
}
function homeState() {
  const C = document.documentElement.classList, bad = ['cr-room', 'rm-room-open', 'wb-comm', 'gx-in', 'gx-out', 'gx-keep', 'gx-hold', 'wh-mapview', 'wh-cosmos', 'cm-open'].filter(c => C.contains(c));
  const vis = e => { if (!e) return false; const r = e.getBoundingClientRect(); if (!(r.width > 20 && r.height > 20 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth)) return false; if (getComputedStyle(e).visibility === 'hidden') return false; for (let a = e; a && a.nodeType === 1; a = a.parentElement) { const s = getComputedStyle(a); if (s.display === 'none' || +s.opacity < 0.02) return false; } return true; };
  const fy = document.getElementById('tab-foryou');
  const leaks = [...document.querySelectorAll('#tab-foryou canvas, #tab-foryou video, #cgThread, #cgGalaxy')].filter(e => vis(e)).map(e => e.id || e.tagName);
  const sp = document.querySelector('.sp-world-veil,.cs-spirit-veil,#csVeil');
  return { home: !!document.querySelector('#tab-home.active'), fyVisible: vis(fy) && !(fy && fy.contains(document.getElementById('tab-home'))), thread: !!document.querySelector('#cgThread[data-open]'), bad, leaks, veil: sp ? getComputedStyle(sp).opacity : null, fy: fy ? fy.className + ' op=' + getComputedStyle(fy).opacity + ' tf=' + getComputedStyle(fy).transform + ' st=' + (fy.getAttribute('style') || '').slice(0, 80) : null, act: [...document.querySelectorAll('.tab.active')].map(e => e.id).join(','), ms: Math.round(performance.now() - window.__t0) };
}
async function waitHome(p) {
  const t0 = Date.now(); let s;
  while (Date.now() - t0 < 9000) { s = await p.evaluate(homeState); if (s.home && !s.fyVisible && !s.thread && !s.bad.length && !s.leaks.length) break; await sleep(60); s.timeout = true; }
  if (s && !s.home || s.fyVisible || s.thread || s.bad.length || s.leaks.length) return Object.assign(s, { timeout: true });
  s.timeout = false;
  const fl = await p.evaluate(() => window.__fl || []);
  const first = fl.find(f => f.home), lastFar = [...fl].reverse().find(f => f.home && f.far);
  s.frames = fl.length; s.firstHome = first ? first.t : null;
  s.farMs = first && lastFar ? lastFar.t - first.t : 0;          /* how long Home was painted with the camera still out */
  s.farFrames = fl.filter(f => f.home && f.far).length;
  return s;
}
async function run(device, theme, lang, cycles) {
  const W = device + ' ' + theme + ' ' + lang, engine = device === 'Pixel 7' ? 'chromium' : 'webkit';
  const R = await H.open({ engine, device, probe: false, url: URL_, lang });
  const p = R.page;
  try {
    await R.goto(); await sleep(2500);
    await p.evaluate(t => { const R2 = window.LowiR2; if (R2 && R2.applyTheme) R2.applyTheme(t); document.documentElement.setAttribute('data-theme', t); }, theme);
    if (process.env.THROTTLE && engine === 'chromium') { const c = await R.ctx.newCDPSession(p); await c.send('Emulation.setCPUThrottlingRate', { rate: +process.env.THROTTLE }); }
    const snaps = [], times = [];
    for (let i = 0; i < cycles; i++) {
      const route = ROUTES[i % ROUTES.length];
      await N.openCommunity(R);
      if (!(await openRoom(p))) { fail(W, 'cycle ' + (i + 1) + ': the chat room did not open'); break; }
      await sleep(700);
      const how = await leave(p, route);
      const s = await waitHome(p);
      times.push(how + ' ' + s.ms + 'ms far ' + s.farMs + 'ms/' + s.farFrames + 'f');
      if (s.timeout) fail(W, 'cycle ' + (i + 1) + ' (' + how + '): Home not clean after 9 s ' + JSON.stringify(s));
      else if (s.farMs > MAXMS) fail(W, 'cycle ' + (i + 1) + ' (' + how + '): Home painted with the spirit world for ' + s.farMs + ' ms (' + s.farFrames + ' frames)');
      if (i === 0 || i === cycles - 1) await R.shot(path.join(OUT, W.replace(/\W+/g, '_') + '-home-' + (i + 1) + '.png'));
      await sleep(400);
      if (i === 1 || i === cycles - 1) { await p.evaluate(() => { try { window.gc && gc(); } catch (e) { } }); snaps.push(await R.snap()); }
    }
    if (snaps.length === 2) {
      const [a, b] = snaps; notes.push(W + ' after cycle 2 ' + JSON.stringify(a) + ' after cycle ' + cycles + ' ' + JSON.stringify(b));
      if (b.canv > a.canv) fail(W, 'canvases grew ' + a.canv + ' -> ' + b.canv);
      if (b.nodes > a.nodes * 1.15 + 300) fail(W, 'DOM nodes grew ' + a.nodes + ' -> ' + b.nodes);
      if (a.heap && b.heap > a.heap * 1.25 + 8) fail(W, 'heap grew ' + a.heap + ' -> ' + b.heap + ' MB');
      if (a.iv != null && b.iv > a.iv + 3) fail(W, 'intervals grew ' + a.iv + ' -> ' + b.iv);
    }
    notes.push(W + ' leave->clean ms: ' + times.join(', '));
    if (R.errs.length) fail(W, 'page errors ' + JSON.stringify(R.errs.slice(0, 3)));
    if (R.crashed) fail(W, 'renderer crashed');
    console.log('done', W, times.join(', '));
  } catch (e) { fail(W, 'run error ' + String(e.message).split('\n')[0]); }
  await R.close();
}
(async () => {
  const combos = [];
  for (const d of DEVICES) for (const [t, l] of (process.env.COMBOS || 'dark:de,light:en').split(',').map(x => x.split(':'))) combos.push([d, t, l]);
  for (const [d, t, l] of combos) await run(d, t, l, CYCLES);
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ fails, notes }, null, 1));
  console.log(fails.length ? 'FAILS ' + fails.length : 'ALL PASS');
  process.exit(fails.length ? 1 : 0);
})();
