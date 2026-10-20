/* Item 31: how much memory the web content process holds at each step of Home -> Community -> Chat -> typing -> sending,
   with a full room (default 45 members, 300 messages) versus an empty one. node tools/sim/chat-memory.cjs [webkit|chromium] [members] [messages] [root|url] */
'use strict';
const H = require('./harness.cjs');
const [engine = 'webkit', members = '45', messages = '300', where = ''] = process.argv.slice(2);
(async () => {
  const o = { engine, members: +members, messages: +messages }; if (/^https?:/.test(where)) o.url = where; else if (where) o.root = where;
  const R = await H.open(o); const P = R.page; const out = [];
  const mark = async (step) => { await H.sleep(2500); const s = await R.snap(); const m = R.rss(); out.push({ step, ...m, nodes: s.nodes, svg: await P.evaluate(() => document.querySelectorAll('svg').length), grads: await P.evaluate(() => document.querySelectorAll('radialGradient,linearGradient').length), imgs: s.imgs, gl: s.ctxGL, heap: s.heap }); console.log(R.el(), step, JSON.stringify(out[out.length - 1])); };
  try {
    R.step = 'home'; await R.goto(); await H.sleep(6000); await mark('home');
    R.step = 'community';
    for (let k = 0; k < 4; k++) { await R.tap('.o8-settings'); await H.sleep(2500); const c = P.locator('.ss2-chip', { hasText: /^Community$/ }).first(); await c.evaluate(e => e.scrollIntoView({ block: 'center' })); await H.sleep(600); await R.tapEl(c); await H.sleep(4000); if (await P.locator('#cmInput').isVisible().catch(() => false)) break; console.log('retry community'); }
    await mark('community');
    R.step = 'type-map'; await R.tap('#cmInput'); await P.keyboard.type('Hello galaxy, simulated', { delay: 60 }); await mark('typed on map');
    await P.keyboard.press('Enter'); await mark('sent on map');
    R.step = 'chat'; await R.tap('.cg-hist'); await H.sleep(1500); await mark('chat room open');
    R.step = 'type-room'; await R.tap('#cmInput'); await P.keyboard.type('Second message from the room view', { delay: 60 }); await P.keyboard.press('Enter'); await mark('sent in room');
    R.step = 'live'; for (let i = 0; i < 30; i++) { if (i % 5 === 0) R.sim.photoSay(); else R.sim.say(); await H.sleep(300); } await mark('30 live msgs (6 photos)');
    R.step = 'reopen'; for (let i = 0; i < 6; i++) { await P.keyboard.press('Escape'); await H.sleep(800); await R.tap('.cg-hist').catch(e => console.log('hist', e.message.slice(0, 80))); await H.sleep(1200); } await mark('room closed/opened x6');
    await R.shot('/tmp/sim/mem-' + engine + '-' + members + '.png');
  } catch (e) { console.log('ERR', R.step, e.message.slice(0, 300)); }
  console.log('RESULT', JSON.stringify({ engine, members, messages, out, errs: R.errs, crashed: R.crashed, loads: R.loads, writes: R.sim && R.sim.writes.filter(w => w.t === 'messages').length }));
  await R.close();
})();
