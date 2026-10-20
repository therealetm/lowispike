/* Item 31: long-session lifecycle soak. N cycles of Home -> Community -> open Chat -> type and send -> live messages (some
   photos) and reactions -> close Chat -> back Home, checking after each cycle that nothing piles up (nodes, listeners,
   intervals, canvases, WebGL contexts) and that no error was thrown. node tools/sim/chat-soak.cjs [webkit|chromium] [cycles] [root|url] */
'use strict';
const H = require('./harness.cjs');
const [engine = 'webkit', cycles = '6', where = ''] = process.argv.slice(2);
(async () => {
  const o = { engine, keyboard: true }; if (/^https?:/.test(where)) o.url = where; else if (where) o.root = where;
  const R = await H.open(o); const P = R.page; const rows = [];
  const row = async (tag) => { const s = await R.snap(); const r = { tag, nodes: s.nodes, lis: s.lis, iv: s.iv, to: s.to, raf: s.raf, canv: s.canv, ctx: s.ctxAll, gl: s.ctxGL, lost: s.lost, imgs: s.imgs, heap: s.heap, errs: R.errs.length, loads: R.loads, rss: R.rss() }; rows.push(r); console.log(R.el(), JSON.stringify(r)); };
  const toCommunity = async () => { for (let k = 0; k < 4; k++) { await R.tap('.o8-settings'); await H.sleep(2500); const c = P.locator('.ss2-chip', { hasText: /^Community$/ }).first(); await c.evaluate(e => e.scrollIntoView({ block: 'center' })); await H.sleep(600); await R.tapEl(c); await H.sleep(3500); if (await P.locator('#cmInput').isVisible().catch(() => false)) return true; console.log('retry community'); } return false; };
  try {
    R.step = 'home'; await R.goto(); await H.sleep(6000); await row('start');
    for (let c = 1; c <= +cycles; c++) {
      R.step = 'c' + c + ' community'; if (!await toCommunity()) { console.log('could not open community'); break; }
      if (c === 1) console.log('VIS', JSON.stringify(await R.vis()));
      R.step = 'c' + c + ' room'; const hb = P.locator('.cg-hist:visible').first(); if (await hb.count()) { await R.tapEl(hb); await H.sleep(1500); }
      R.step = 'c' + c + ' type'; await R.tap('#cmInput'); await P.keyboard.type('cycle ' + c + ' hello', { delay: 40 }); await P.keyboard.press('Enter'); await H.sleep(800);
      R.step = 'c' + c + ' live'; for (let i = 0; i < 8; i++) { const m = i === 3 ? R.sim.photoSay() : R.sim.say(); if (i % 3 === 0) R.sim.react(m.id); await H.sleep(250); }
      R.step = 'c' + c + ' scroll'; await P.evaluate(() => { const l = document.getElementById('cmList'); if (l) { l.scrollTop = 0; } }); await H.sleep(500); const more = P.locator('[data-chat=earlier]:visible').first(); if (await more.count()) { await R.tapEl(more); await H.sleep(800); }
      await P.evaluate(() => { const l = document.getElementById('cmList'); if (l) l.scrollTop = l.scrollHeight; }); await H.sleep(400);
      R.step = 'c' + c + ' close'; await P.evaluate(() => document.activeElement && document.activeElement.blur()); await H.sleep(500);
      const close = P.locator('[data-chat=close-thread]:visible').first(); if (await close.count()) { await R.tapEl(close); await H.sleep(800); }
      R.step = 'c' + c + ' home'; await P.evaluate(() => window.goTab('home')); await H.sleep(2500);
      await row('cycle ' + c);
    }
    await R.shot('/tmp/sim/soak-' + engine + '.png');
  } catch (e) { console.log('ERR', R.step, e.message.slice(0, 300)); }
  console.log('RESULT', JSON.stringify({ engine, cycles, errs: R.errs, crashed: R.crashed, loads: R.loads, sent: R.sim.writes.filter(w => w.t === 'messages').length }));
  await R.close();
})();
