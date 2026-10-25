#!/usr/bin/env node
'use strict';
/* LOWiSPIKE heat probe (Oct 25 2026, task 7aa56507). Measures what makes a phone run hot, per scenario:
   main-thread busy % (CDP Performance TaskDuration / wall time, Chromium only), script/layout/style time,
   requestAnimationFrame callbacks/s by script, timer callbacks/s, live intervals, 2D canvas draw calls/s, WebGL draws/s,
   canvas backing pixels vs CSS pixels, running CSS/Web animations, visible backdrop-filter layers, network requests/s,
   WebSocket opens, AudioContexts running, wake locks held, DOM mutations/s, JS heap.
   Usage: URL=http://127.0.0.1:PORT/index.html ENGINE=chromium|webkit THROTTLE=4 DPR=3 HOLD=8000 OUT=/tmp/x.json node tools/heat/heat-probe.cjs
   Signed in with a fake Supabase (real profiles snapshot /tmp/gb-all.json + /tmp/gb-sess.json); nothing reaches the live server.
   NOT an iPhone: SwiftShader/WebKit software rendering. Heat can only be confirmed on the phone. */
const pw = require(process.env.PW || '/tmp/pw/node_modules/playwright');
const fs = require('fs'), path = require('path');
const SB = 'https://vnfwmifmsfecascwaody.supabase.co';
const URL = process.env.URL || 'http://127.0.0.1:8740/index.html';
const ENGINE = process.env.ENGINE || 'chromium';
const THROTTLE = +process.env.THROTTLE || 4;
const DPR = +process.env.DPR || 3;
const HOLD = +process.env.HOLD || 8000;
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
const SESSION = fs.existsSync('/tmp/gb-sess.json') ? JSON.parse(fs.readFileSync('/tmp/gb-sess.json', 'utf8')) : null;
const ALL = fs.existsSync('/tmp/gb-all.json') ? JSON.parse(fs.readFileSync('/tmp/gb-all.json', 'utf8')) : [];
const PROBE = fs.readFileSync(path.join(__dirname, 'heat-inject.js'), 'utf8');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await pw[ENGINE].launch(ENGINE === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info'] } : {});
  const ctx = await browser.newContext({ viewport: { width: +process.env.W || 390, height: +process.env.H || 844 }, deviceScaleFactor: DPR, isMobile: ENGINE !== 'webkit' ? true : undefined, hasTouch: true, serviceWorkers: 'block' });
  let wsOpens = 0, req = 0; const reqBy = {};
  await ctx.routeWebSocket(/.*/, ws => { wsOpens++; ws.close(); });
  const json = (r, body, status) => r.fulfill({ status: status || 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'content-range': '0-0/*' }, body: JSON.stringify(body) });
  const me = SESSION ? SESSION.user.id : 'x';
  const profiles = ALL.map(p => Object.assign({ sign: '', mbti: '', streak: 0, bio: '', bday: '', xp: p.lv * 100, xp_week: 0, wk: '', xp_month: 0, mo: '', weight: '' }, p));
  profiles.push({ id: me, name: 'Probe Visitor', lv: 2, xp: 50, bot: false, test: false, avatar: '' });
  await ctx.route('**/*', async r => {
    const q = r.request(), u = q.url(), m = q.method();
    req++; const k = u.replace(/^https?:\/\/[^/]+/, '').split('?')[0].slice(0, 60); reqBy[k] = (reqBy[k] || 0) + 1;
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
  await ctx.addInitScript(([s, lang]) => { try {
    if (s) localStorage.setItem('lowi.auth', s); localStorage.setItem('lowi.gate', 'done');
    const dd = new Date(); localStorage.setItem('lowi.daily.seen', dd.getFullYear() + '-' + String(dd.getMonth() + 1).padStart(2, '0') + '-' + String(dd.getDate()).padStart(2, '0'));
    sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.news.seen', '99999'); localStorage.setItem('lowi.tutorial.done', '1');
    localStorage.setItem('lowispike.tutorial.v1', JSON.stringify({ done: true, v: 99 }));
    if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, xp: 40, ledger: [], logs: [], saved: [], lang, user: { name: 'Probe Visitor', bday: '1990-01-01' }, settings: { lang } }));
  } catch (e) {} }, [SESSION ? JSON.stringify(Object.assign({}, SESSION, { expires_at: Math.floor(Date.now() / 1000) + 3000 })) : '', process.env.LANG_APP || 'en']);
  await ctx.addInitScript({ content: PROBE });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message.slice(0, 200)));
  let cdp = null;
  if (ENGINE === 'chromium') { cdp = await ctx.newCDPSession(page); await cdp.send('Performance.enable'); }
  await page.goto(URL + (URL.includes('?') ? '&' : '?') + 'hp=' + Date.now(), { waitUntil: 'load', timeout: 120000 });
  await sleep(10000);
  await page.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot'); });
  if (cdp && THROTTLE > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });
  await sleep(3000);
  const metrics = async () => { if (!cdp) return {}; const r = await cdp.send('Performance.getMetrics'); const o = {}; r.metrics.forEach(m => o[m.name] = m.value); return o; };
  /* whole browser CPU (all processes: page, GPU/compositor, network), from /proc, in CPU-seconds. Works for WebKit too. */
  const rootPid = process.pid; /* the browser runs under this node process */
  const HZ = 100;
  function procCpu() {
    const kids = {}; const stat = {};
    for (const d of fs.readdirSync('/proc')) { if (!/^\d+$/.test(d)) continue; try { const s = fs.readFileSync('/proc/' + d + '/stat', 'utf8'); const r = s.slice(s.lastIndexOf(')') + 2).split(' '); stat[d] = { pp: +r[1], cpu: (+r[11] + +r[12]) / HZ }; } catch (e) { } }
    Object.entries(stat).forEach(([p, s]) => { (kids[s.pp] = kids[s.pp] || []).push(+p); });
    let tot = 0; const st = [].concat(kids[rootPid] || []); while (st.length) { const p = st.pop(); if (stat[p]) tot += stat[p].cpu; (kids[p] || []).forEach(k => st.push(k)); }
    return tot;
  }
  /* world draws: count renderer.render calls of the 3D world (one per drawn world frame) */
  /* STUBGL=1: the world's draw itself is skipped (counted only), so the VM's software GPU (~4-8 world frames/s at most here) is not
     the bottleneck and the count shows how often the app asks to draw the world, as on a phone with a real GPU */
  const wrapWorld = () => page.evaluate(stub => { try { const r = window.LowiWorld3D && LowiWorld3D.renderer; if (r && !r.__wrc) { const f = r.render; r.render = function () { window.__wr = (window.__wr || 0) + 1; if (!stub) return f.apply(this, arguments); }; r.__wrc = 1; } } catch (e) { } return window.__wr || 0; }, !!process.env.STUBGL).catch(() => 0);
  const snap = async () => Object.assign(await page.evaluate(() => window.__heat.snap()), { wr: await wrapWorld() }, { m: await metrics(), t: Date.now(), req, wsOpens, cpu: procCpu() });
  const ev = (fn, a) => page.evaluate(fn, a).catch(e => 'ERR ' + e.message.slice(0, 160));
  await wrapWorld();
  const out = { engine: ENGINE, throttle: THROTTLE, dpr: DPR, url: URL, when: new Date().toISOString(), scenarios: {} };
  const top = (o, n) => Object.entries(o || {}).sort((a, b) => b[1] - a[1]).slice(0, n || 8);
  async function measure(name, act, settle) {
    if (ONLY.length && !ONLY.includes(name)) return;
    const note = act ? await act() : undefined;
    await sleep(settle == null ? 2500 : settle);
    const reqBy0 = Object.assign({}, reqBy);
    const a = await snap(); await sleep(HOLD); const b = await snap();
    const sec = (b.t - a.t) / 1000, per = (x, y) => +(((y || 0) - (x || 0)) / sec).toFixed(1);
    const by = (A, B) => { const o = {}; Object.keys(B || {}).forEach(k => { const d = (B[k] || 0) - ((A || {})[k] || 0); if (d > 0) o[k] = +(d / sec).toFixed(1); }); return o; };
    const busy = cdp ? +((b.m.TaskDuration - a.m.TaskDuration) / sec * 100).toFixed(1) : null;
    const r = {
      note, seconds: +sec.toFixed(1), mainBusyPct: busy, procCpuPct: +((b.cpu - a.cpu) / sec * 100).toFixed(1),
      scriptPct: cdp ? +((b.m.ScriptDuration - a.m.ScriptDuration) / sec * 100).toFixed(1) : null,
      layoutPct: cdp ? +((b.m.LayoutDuration - a.m.LayoutDuration) / sec * 100).toFixed(1) : null,
      stylePct: cdp ? +((b.m.RecalcStyleDuration - a.m.RecalcStyleDuration) / sec * 100).toFixed(1) : null,
      layoutsPerSec: cdp ? per(a.m.LayoutCount, b.m.LayoutCount) : null, stylesPerSec: cdp ? per(a.m.RecalcStyleCount, b.m.RecalcStyleCount) : null,
      worldDrawsPerSec: per(a.wr, b.wr), rafPerSec: per(a.raf, b.raf), rafBy: top(by(a.rafBy, b.rafBy), 10), framesPerSec: per(a.frames, b.frames),
      timerCbPerSec: per(a.timerCb, b.timerCb), timerBy: top(by(a.timerBy, b.timerBy), 8), liveIntervals: b.liveIntervals,
      draw2dPerSec: per(a.draw2d, b.draw2d), draw2dBy: top(by(a.draw2dBy, b.draw2dBy), 6), glDrawsPerSec: per(a.glDraw, b.glDraw), glBy: top(by(a.glBy, b.glBy), 6),
      canvases: b.canvases, animations: b.animations, backdrop: b.backdrop,
      mutPerSec: per(a.mut, b.mut), reqPerSec: per(a.req, b.req), reqBy: top(by(reqBy0, reqBy), 5), wsOpens: b.wsOpens - a.wsOpens,
      audio: b.audio, wakeLocks: b.wakeLocks, heapMB: b.heapMB, nodes: b.nodes, power: b.power, htmlClass: b.htmlClass
    };
    out.scenarios[name] = r;
    console.log(`${name.padEnd(18)} cpu ${String(r.procCpuPct).padStart(5)}% busy ${String(r.mainBusyPct).padStart(5)}% world/s ${String(r.worldDrawsPerSec).padStart(5)}  raf/s ${String(r.rafPerSec).padStart(5)} fps ${String(r.framesPerSec).padStart(4)}  timers/s ${String(r.timerCbPerSec).padStart(5)} iv ${r.liveIntervals}  2d/s ${String(r.draw2dPerSec).padStart(6)} gl/s ${String(r.glDrawsPerSec).padStart(5)}  anim ${r.animations.running} bd ${r.backdrop}  mut/s ${r.mutPerSec}  req/s ${r.reqPerSec} ws+${r.wsOpens}  canvMP ${r.canvases.mp} heap ${r.heapMB} ${r.power || ''} audio ${r.audio}`);
  }
  if (process.env.MODE === 'anim') {
    /* pause one CSS animation name at a time on Home idle */
    await measure('home-idle', null, 500);
    const names = await ev(() => [...new Set(document.getAnimations().filter(a => a.playState === 'running').map(a => a.animationName || 'waapi'))]);
    for (const n of names) {
      await measure('pause ' + n, () => ev(n => { document.getAnimations().forEach(a => { if ((a.animationName || 'waapi') === n) a.pause(); }); return n; }, n), 1500);
      await ev(n => { document.getAnimations().forEach(a => { if ((a.animationName || 'waapi') === n && a.playState === 'paused') a.play(); }); }, n);
    }
    if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(out, null, 1));
    await browser.close(); return;
  }
  if (process.env.MODE === 'attr') {
    /* attribution on Home idle: switch one suspect off at a time (cumulative) and see how much busy time goes away */
    await measure('home-idle', null, 500);
    if (cdp) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await cdp.send('Profiler.start'); await sleep(5000); const { profile } = await cdp.send('Profiler.stop');
      const self = {}; const dt = profile.timeDeltas; const byId = new Map(profile.nodes.map(n => [n.id, n])); const cnt = {}; profile.samples.forEach((s, i) => { cnt[s] = (cnt[s] || 0) + (dt[i] || 0); });
      Object.entries(cnt).forEach(([id, us]) => { const n = byId.get(+id); const f = n.callFrame; const k = (f.functionName || '(anon)') + ' ' + (f.url || '').split('/').pop().split('?')[0] + ':' + (f.lineNumber + 1); self[k] = (self[k] || 0) + us / 1000; });
      out.profile = top(self, 25); console.log('self ms in 5 s:'); out.profile.forEach(([k, v]) => console.log('   ' + v.toFixed(0).padStart(6) + '  ' + k)); }
    if (process.env.EXTRA_CSS) await measure('extra-css', () => ev(c => { const s = document.createElement('style'); s.textContent = c; document.head.appendChild(s); return 'css'; }, process.env.EXTRA_CSS), 1500);
    await measure('no-world-render', () => ev(() => { const r = window.LowiWorld3D && LowiWorld3D.renderer; if (!r) return 'no renderer'; r.__render = r.render; r.render = function () { }; return 'render off'; }), 1500);
    await measure('no-backdrop', () => ev(() => { const s = document.createElement('style'); s.textContent = '*,*::before,*::after{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}'; document.head.appendChild(s); return 'ok'; }), 1500);
    await measure('no-css-anim', () => ev(() => { const s = document.createElement('style'); s.textContent = '*,*::before,*::after{animation-play-state:paused!important}'; document.head.appendChild(s); return 'ok'; }), 1500);
    await measure('no-intervals', () => ev(() => { for (let i = 1; i < 100000; i++) clearInterval(i); return 'ok'; }), 1500);
    out.errors = errs.slice(0, 20);
    if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(out, null, 1));
    await browser.close(); return;
  }
  await measure('home-idle', null, 500);
  /* real waiting, no clock tricks: nobody touches the phone */
  await measure('home-rest-35s', null, 22000);
  await measure('home-deep-95s', null, 52000);
  await measure('home-touch', async () => { const v = page.viewportSize(); for (let i = 0; i < 6; i++) { await page.mouse.click(v.width / 2 + (i % 2 ? 60 : -60), v.height * 0.75); await sleep(200); } }, 300);
  await measure('panel-fuel', () => ev(() => { const b = document.querySelector('[data-bloom="fuel"], #hb-fuel, [data-orbit="fuel"]'); if (b) { b.click(); return 'clicked ' + (b.id || b.className); } return 'no fuel bubble'; }));
  await measure('community-room', () => ev(() => { try { if (window.LowiBack) LowiBack(); } catch (e) {} goTab('foryou'); try { cmSeg('chat'); } catch (e) { } return document.getElementById('cgGalaxy') ? 'galaxy' : 'no galaxy'; }), 4000);
  await measure('community-rest-35s', null, 24000);
  await measure('chat-list', () => ev(() => { const b = document.querySelector('[data-cgv="list"], #cgChatBtn, .cg-chatbtn'); if (b) { b.click(); return 'clicked'; } return 'no chat button'; }));
  await measure('back-home-idle', () => ev(() => { goTab('home'); return 'home'; }), 3000);
  await measure('cell-world', () => ev(() => { const L = window.LowiCellWorld || window.LowiCellRoom || window.LowiBodyWorld; try { if (window.LowiBodyWorld3D && LowiBodyWorld3D.open) { LowiBodyWorld3D.open(); return 'bw3d'; } } catch (e) { return 'ERR ' + e.message; } return 'no cell world api: ' + Object.keys(window).filter(k => /cell|body/i.test(k)).join(','); }), 4000);
  await measure('spirit-world', () => ev(() => { try { if (window.LowiSpirit && LowiSpirit.open) { LowiSpirit.open(); return 'spirit'; } } catch (e) { return 'ERR ' + e.message; } return 'no spirit api: ' + Object.keys(window.LowiSpirit || {}).join(','); }), 4000);
  await measure('hidden', () => ev(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('pagehide'));
  }), 1500);
  out.errors = errs.slice(0, 20);
  console.log('errors: ' + (errs.slice(0, 6).join(' / ') || 'none'));
  if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(out, null, 1));
  await browser.close();
})().catch(e => { console.error('HEAT PROBE FAILED', e); process.exit(1); });
