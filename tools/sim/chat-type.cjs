/* Item 31: Home -> Community -> write and send, with the iOS-like keyboard from harness.cjs, measuring what the page does in
   each phase (DOM mutations, canvas reallocations, nodes) and any error. node tools/sim/chat-type.cjs [webkit|chromium] [members] [messages] [root|url] */
'use strict';
const H = require('./harness.cjs');
const [engine = 'webkit', members = '45', messages = '300', where = ''] = process.argv.slice(2);
(async () => {
  const o = { engine, members: +members, messages: +messages, keyboard: true }; if (/^https?:/.test(where)) o.url = where; else if (where) o.root = where;
  const R = await H.open(o); const P = R.page; const out = []; let last = null, lastM = null;
  const cdp = engine === 'chromium' ? await R.ctx.newCDPSession(P) : null; if (cdp) await cdp.send('Performance.enable');
  const metrics = async () => { if (!cdp) return null; const m = {}; (await cdp.send('Performance.getMetrics')).metrics.forEach(x => m[x.name] = x.value); return m; };
  const kb = () => P.evaluate(() => Object.assign({}, window.__kb, { nodes: document.getElementsByTagName('*').length, typing: document.documentElement.classList.contains('cs-chat-typing'), map: document.documentElement.classList.contains('cs-chat-map-typing'), hist: !!(document.querySelector('.cg-hist') && document.querySelector('.cg-hist').getBoundingClientRect().height), vv: Math.round(visualViewport.height) }));
  const mark = async (step) => { const k = await kb(); const d = last ? { mut: k.mut - last.mut, canv: k.canvasSets - last.canvasSets, rz: k.resizes - last.resizes } : {}; last = k; const M = await metrics(); if (M && lastM) Object.assign(d, { layouts: M.LayoutCount - lastM.LayoutCount, styles: M.RecalcStyleCount - lastM.RecalcStyleCount, layoutMs: Math.round((M.LayoutDuration - lastM.LayoutDuration) * 1000), styleMs: Math.round((M.RecalcStyleDuration - lastM.RecalcStyleDuration) * 1000), scriptMs: Math.round((M.ScriptDuration - lastM.ScriptDuration) * 1000), taskMs: Math.round((M.TaskDuration - lastM.TaskDuration) * 1000), heapMB: Math.round(M.JSHeapUsedSize / 1048576) }); if (M) lastM = M;
    const r = { step, ...d, nodes: k.nodes, typing: k.typing, map: k.map, hist: k.hist, vv: k.vv, errs: R.errs.length }; out.push(r); console.log(R.el(), JSON.stringify(r)); };
  try {
    R.step = 'home'; await R.goto(); await H.sleep(6000); await mark('home');
    R.step = 'community';
    for (let k = 0; k < 4; k++) { await R.tap('.o8-settings'); await H.sleep(2500); const c = P.locator('.ss2-chip', { hasText: /^Community$/ }).first(); await c.evaluate(e => e.scrollIntoView({ block: 'center' })); await H.sleep(600); await R.tapEl(c); await H.sleep(4000); if (await P.locator('#cmInput').isVisible().catch(() => false)) break; console.log('retry community'); }
    await H.sleep(2000); await mark('community idle 2s');
    await H.sleep(5000); await mark('community idle +5s');
    R.step = 'focus'; await R.tap('#cmInput'); await H.sleep(1500); await mark('tap field (keyboard up)');
    await R.shot('/tmp/sim/ct-' + engine + '-kb.png');
    R.step = 'type'; await P.keyboard.type('Hello galaxy, this is a test', { delay: 110 }); await mark('typed 28 chars');
    R.step = 'send'; await P.keyboard.press('Enter'); await H.sleep(2000); await mark('sent (Enter)');
    await R.shot('/tmp/sim/ct-' + engine + '-sent.png');
    R.step = 'live-while-typing'; await P.keyboard.type('typing while', { delay: 110 }); for (let i = 0; i < 6; i++) { R.sim.say(); await H.sleep(500); } await mark('6 incoming while typing');
    R.step = 'blur'; await P.evaluate(() => document.activeElement && document.activeElement.blur()); await H.sleep(1500); await mark('keyboard down');
    R.step = 'room'; const hb = P.locator('.cg-hist:visible').first(); if (await hb.isVisible().catch(() => false)) { await R.tapEl(hb); await H.sleep(2000); await mark('chat room open'); await R.tap('#cmInput'); await H.sleep(1200); await mark('room: keyboard up'); await P.keyboard.type('and from the room', { delay: 110 }); await P.keyboard.press('Enter'); await H.sleep(2000); await mark('room: sent'); await R.shot('/tmp/sim/ct-' + engine + '-room.png'); } else console.log('NO CHAT BUTTON');
  } catch (e) { console.log('ERR', R.step, e.message.slice(0, 300)); }
  console.log('RESULT', JSON.stringify({ engine, members, messages, out, errs: R.errs, crashed: R.crashed, loads: R.loads, sent: R.sim.writes.filter(w => w.t === 'messages').map(w => w.body && w.body.body) }));
  await R.close();
})();
