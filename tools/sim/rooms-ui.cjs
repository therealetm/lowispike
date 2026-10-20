/* Support rooms in a simulated phone: Community page with the Room | Chat tabs, N people seated in my room, live chat and energy
   shots, measuring frame rate, long tasks, DOM size and heap. node tools/sim/rooms-ui.cjs [webkit|chromium] [members] [seated] [root|url] [tag]
   With an app without rooms (origin/main) "seated" does nothing: the galaxy shows every member, which is the "before". */
'use strict';
const H = require('./harness.cjs');
const [engine = 'chromium', members = '100', seated = '30', where = '', tag = 'rooms'] = process.argv.slice(2);
(async () => {
  const o = { engine, members: +members, messages: 300, keyboard: false }; if (/^https?:/.test(where)) o.url = where; else if (where) o.root = where;
  const R = await H.open(o); const P = R.page; const res = { engine, members: +members, seated: +seated, tag, phases: [] };
  const cdp = engine === 'chromium' ? await R.ctx.newCDPSession(P) : null; if (cdp) await cdp.send('Performance.enable');
  await P.addInitScript(() => { window.__lt = 0; window.__ltN = 0; try { new PerformanceObserver(l => { for (const e of l.getEntries()) { window.__lt += e.duration; window.__ltN++; } }).observe({ entryTypes: ['longtask'] }); } catch (e) { } });
  const measure = async (name, ms, traffic) => {
    await P.evaluate(() => { window.__fr = 0; window.__lt = 0; window.__ltN = 0; window.__worst = 0; let last = performance.now(); const f = t => { window.__fr++; window.__worst = Math.max(window.__worst, t - last); last = t; window.__rafId = requestAnimationFrame(f); }; window.__rafId = requestAnimationFrame(f); });
    const t0 = Date.now(); let said = 0, shots = 0; const room = await P.evaluate(() => window.LowiRooms ? LowiRooms.room() : 'all');
    while (Date.now() - t0 < ms) { if (traffic) { R.sim.say(undefined, undefined, room); said++; const o = R.sim.W.others[Math.floor(Math.random() * Math.min(+seated || 1, R.sim.W.others.length))]; if (o) { R.sim.shoot(room, { v: 1, id: 's' + Math.random().toString(36).slice(2, 12), by: o.id, a: Math.random() * 6.28, p: .6, to: '', ht: 0, t: Date.now() }); R.sim.shoot('*', { v: 1, id: 'x' + Math.random().toString(36).slice(2, 12), by: o.id, a: 1, p: .6, to: '', ht: 0, t: Date.now() }); shots++; } } await H.sleep(250); }
    const m = await P.evaluate(() => { cancelAnimationFrame(window.__rafId); const d = window.LowiRooms ? LowiRooms._debug() : null; return { fr: window.__fr, worst: Math.round(window.__worst), lt: Math.round(window.__lt), ltN: window.__ltN, nodes: document.getElementsByTagName('*').length, bodies: document.querySelectorAll('#cgGalaxy .cg-bub').length, rows: document.querySelectorAll('#cmList > *').length, room: d && d.room, inRoom: d && d.members, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null, tab: document.getElementById('cgThread') && document.getElementById('cgThread').hasAttribute('data-open') ? 'chat' : 'room' }; });
    const r = Object.assign({ phase: name, fps: +(m.fr / (ms / 1000)).toFixed(1), said, shots }, m); delete r.fr; res.phases.push(r); console.log(R.el(), JSON.stringify(r)); return r;
  };
  try {
    await R.goto(); await H.sleep(5000);
    for (let k = 0; k < 4; k++) { await R.tap('.o8-settings'); await H.sleep(2500); const c = P.locator('.ss2-chip', { hasText: /^Community$/ }).first(); await c.evaluate(e => e.scrollIntoView({ block: 'center' })).catch(() => { }); await H.sleep(600); await R.tapEl(c).catch(() => { }); await H.sleep(2500); if (await P.locator('#cgGalaxy').isVisible().catch(() => false)) break; }
    await H.sleep(3000);
    const room = await P.evaluate(() => window.LowiRooms ? LowiRooms.room() : 'all');
    if (+seated > 0) R.sim.seat(room, +seated);
    await H.sleep(2500);
    await R.shot('/tmp/sim/rooms-' + tag + '-' + engine + '-room.png');
    await measure('room tab idle', 6000, false);
    await measure('room tab live (4 msgs/s + shots)', 10000, true);
    const chatTab = P.locator('.rm-tab[data-rm=chat]');
    if (await chatTab.isVisible().catch(() => false)) await R.tapEl(chatTab); else { const hb = P.locator('.cg-hist:visible').first(); if (await hb.isVisible().catch(() => false)) await R.tapEl(hb); }
    await H.sleep(2000); await R.shot('/tmp/sim/rooms-' + tag + '-' + engine + '-chat.png');
    await measure('chat tab live (4 msgs/s + shots)', 10000, true);
    R.step = 'type'; const t1 = Date.now(); await R.tap('#cmInput').catch(() => { }); await P.keyboard.type('typing in a busy room', { delay: 90 }); res.typeMs = Date.now() - t1;
    if (await P.locator('.rm-chip').isVisible().catch(() => false)) { await R.tap('.rm-tab[data-rm=room]'); await H.sleep(800); await R.tap('.rm-chip'); await H.sleep(1500); await R.shot('/tmp/sim/rooms-' + tag + '-' + engine + '-sheet.png'); }
  } catch (e) { console.log('ERR', R.step, e.message.slice(0, 300)); res.err = e.message.slice(0, 200); }
  res.errs = R.errs.slice(0, 10); res.crashed = R.crashed; res.frames = R.sim.counts.frames;
  console.log('RESULT', JSON.stringify(res)); await R.close();
})();
