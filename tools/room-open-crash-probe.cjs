'use strict';
/* Oct 28 (Emmanuel: the Room "is crashing ... the moment I open it"): open the Room again and again (from Home, and from the Chat
   and Leaderboard tabs), shoot once each time, and report renderer crashes, page reloads, page errors and the web process memory.
   Simulated WebKit / Chromium with the fake cloud; a real iPhone can still differ.
   node tools/room-open-crash-probe.cjs [webkit|chromium] [device] [url|root] [cycles] [members] */
const H = require('./sim/harness.cjs');
const [engine = 'webkit', device = 'iPhone 13', where = require('path').join(__dirname, '..'), cycles = '6', members = '40'] = process.argv.slice(2);
const sleep = H.sleep;
(async () => {
  const o = { engine, members: +members, messages: 120, probe: true, lang: 'de' };
  if (/^https?:/.test(where)) o.url = where; else o.root = where;
  if (engine === 'webkit') o.device = device; else o.viewport = { width: 390, height: 844 };
  const R = await H.open(o), P = R.page; await R.goto(); await sleep(9000);
  await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } const g = document.getElementById('r2gate'); if (g) g.remove(); });
  const mem = () => { try { const r = R.rss(); return r.WPEWebProcess || r.chrome || r['chrome-headless'] || JSON.stringify(r).slice(0, 80); } catch (e) { return null; } };
  for (let i = 0; i < +cycles && !R.crashed; i++) {
    const t0 = Date.now();
    await P.evaluate(() => goTab('foryou')); await sleep(1800);
    await P.evaluate(() => LowiRoomsUI.setTab(false)); await sleep(1500);
    const st = await P.evaluate(() => ({ bodies: document.querySelectorAll('#cgField .cg-body').length, fx: !!document.querySelector('#cgGalaxy canvas.ce-fx') }));
    await P.evaluate(() => { try { LowiEnergy.fire(-Math.PI / 2 + Math.random(), .8); } catch (e) { } }); await sleep(1200);
    await P.evaluate(() => { try { LowiRoomsUI.setTab(true); } catch (e) { } }); await sleep(900);
    await P.evaluate(() => { try { LowiRoomsUI.setTab(false); } catch (e) { } }); await sleep(900);
    await P.evaluate(() => goTab('home')); await sleep(1500);
    console.log('cycle', i + 1, 'bodies', st.bodies, 'fx', st.fx, 'ms', Date.now() - t0, 'loads', R.loads, 'crashed', R.crashed, 'errors', R.errs.length, 'web MB', mem());
  }
  console.log('RESULT loads', R.loads, 'crashed', R.crashed, 'errors', JSON.stringify(R.errs.map(e => e.m)).slice(0, 600));
  await R.close();
})().catch(e => { console.error('BROKEN', e.message); process.exit(2); });
