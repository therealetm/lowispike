/* Run 22: background/foreground + pagehide/pageshow + Reduce Motion + language abuse, then count loops.
   node probe-bgfg-loops.cjs <wt> [url] [engine]
   Counts rAF callbacks/s, live setInterval timers, page errors before and after the abuse. Nothing is posted (harness fakes Supabase). */
'use strict';
const path = require('path');
const [wt, url = 'https://therealetm.github.io/lowispike/index.html', engine = 'chromium', device = 'iPhone 13'] = process.argv.slice(2);
const H = require(path.join(wt, 'tools/sim/harness.cjs'));
const COUNT = () => {
  const W = window; W.__pt = { raf: 0, iv: new Map(), ivMade: 0 };
  const r = W.requestAnimationFrame.bind(W); W.requestAnimationFrame = f => r(t => { W.__pt.raf++; f(t); });
  const si = W.setInterval.bind(W), ci = W.clearInterval.bind(W);
  W.setInterval = function (f, ms, ...a) { const id = si(f, ms, ...a); W.__pt.ivMade++; W.__pt.iv.set(id, (ms || 0) + ' ' + String(f).slice(0, 80).replace(/\s+/g, ' ')); return id; };
  W.clearInterval = function (id) { W.__pt.iv.delete(id); return ci(id); };
  let hid = false; Object.defineProperty(Document.prototype, 'hidden', { configurable: true, get: () => hid });
  Object.defineProperty(Document.prototype, 'visibilityState', { configurable: true, get: () => hid ? 'hidden' : 'visible' });
  W.__setHidden = h => { hid = h; document.dispatchEvent(new Event('visibilitychange')); };
};
(async () => {
  const R = await H.open({ engine, device, url, probe: true });
  const P = R.page; const errs = []; P.on('pageerror', e => errs.push('pageerror ' + e.message.slice(0, 200)));
  P.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text().slice(0, 200)); });
  await P.addInitScript(COUNT);
  await R.goto(); await H.sleep(8000);
  const snap = async (label, idle = 6000) => {
    await H.sleep(idle);
    const a = await P.evaluate(() => ({ raf: __pt.raf, t: performance.now() }));
    await H.sleep(3000);
    const b = await P.evaluate(() => ({ raf: __pt.raf, t: performance.now(), iv: [...__pt.iv.values()], made: __pt.ivMade, cls: document.documentElement.className.split(' ').filter(c => /lowi-|wh-|mf-|gx-/.test(c)).join(' '), state: window.LowiPower && LowiPower.state ? LowiPower.state() : '' }));
    const o = { label, rafPerS: Math.round((b.raf - a.raf) / ((b.t - a.t) / 1000)), intervals: b.iv.length, made: b.made, cls: b.cls, state: b.state };
    console.log(JSON.stringify(o)); return Object.assign(o, { ivList: b.iv });
  };
  const base = await snap('baseline idle');
  // 1) background/foreground storm
  for (let i = 0; i < 30; i++) { await P.evaluate(() => __setHidden(true)); await H.sleep(i % 3 ? 40 : 300); await P.evaluate(() => __setHidden(false)); await H.sleep(i % 4 ? 30 : 250); }
  const s1 = await snap('after 30x hidden/visible');
  // 2) pagehide/pageshow storm (bfcache-like)
  for (let i = 0; i < 15; i++) { await P.evaluate(() => { dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })); }); await H.sleep(60); await P.evaluate(() => { dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })); }); await H.sleep(60); }
  const s2 = await snap('after 15x pagehide/pageshow');
  // 3) Reduce Motion on/off mid-session, with taps in between
  for (let i = 0; i < 6; i++) { await P.emulateMedia({ reducedMotion: i % 2 ? 'no-preference' : 'reduce' }); await P.mouse.click(195, 300).catch(() => { }); await H.sleep(500); }
  await P.emulateMedia({ reducedMotion: 'no-preference' });
  const s3 = await snap('after Reduce Motion x6');
  // 4) tabs + hidden while on a page, come back on Home
  for (const t of ['scan', 'foryou', 'profile', 'home', 'shelf', 'move', 'home']) { await P.evaluate(t => { try { goTab(t); } catch (e) { } }, t).catch(() => { }); await H.sleep(700); await P.evaluate(() => __setHidden(true)); await H.sleep(150); await P.evaluate(() => __setHidden(false)); await H.sleep(300); }
  const s4 = await snap('after tabs with hide/show');
  // 5) idle long enough for rest/deep, then hide/show while deep, then one tap must wake
  const deep = await snap('idle 95s (deep)', 92000);
  for (let i = 0; i < 10; i++) { await P.evaluate(() => __setHidden(true)); await H.sleep(50); await P.evaluate(() => __setHidden(false)); await H.sleep(50); }
  const deep2 = await snap('deep + 10x hide/show, no touch', 3000);
  await P.mouse.move(100, 400); await P.mouse.down(); await H.sleep(80); await P.mouse.up();
  const t0 = await P.evaluate(() => __pt.raf); await H.sleep(1000); const t1 = await P.evaluate(() => __pt.raf);
  console.log(JSON.stringify({ label: 'first second after a tap', raf: t1 - t0 }));
  const extra = s4.ivList.filter(x => !base.ivList.includes(x));
  console.log(JSON.stringify({ newIntervals: extra.slice(0, 20), lostIntervals: base.ivList.filter(x => !s4.ivList.includes(x)).slice(0, 20) }));
  console.log(JSON.stringify({ errs: [...new Set(errs)].slice(0, 20), crashed: R.crashed || false, loads: R.loads }));
  await R.close(); process.exit(0);
})().catch(e => { console.log('BROKEN', e.stack); process.exit(1); });
