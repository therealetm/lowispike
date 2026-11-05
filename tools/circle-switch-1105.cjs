'use strict';
/* 5 Nov 2026 (owner, voice): "When I'm in Circle and I click on shuffle and I say I go back to Billiard, then it just takes me to
   chat ... Or it just crashes and restarts." and "Friend's Tree, I click on swipe, I click on shuffle, I click on swipe, I click on
   Friend's Tree, and then it takes me to chat." Replays both by finger in a phone-sized browser and logs where you end up.
   node tools/circle-switch-1105.cjs [webkit|chromium] [root|url] [wait ms between taps] [chatfirst] */
const H = require('./sim/harness.cjs');
(async () => {
  const engine = process.argv[2] || 'webkit', where = process.argv[3] || require('path').join(__dirname, '..'), gap = +(process.argv[4] || 1200);
  const o = { engine, members: 20, messages: 40, probe: true, lang: 'en' }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page;
  /* 5th arg chatfirst: Chat moved to the front of the Community tabs (hold-and-drag), as on the owner's phone */
  if (process.argv[5] === 'chatfirst') await R.ctx.addInitScript(() => { try { localStorage.setItem('lowispike.community.tabs', JSON.stringify(['chat', 'room', 'fy', 'rank'])); } catch (e) { } });
  const log = (k, v) => console.log('STEP', k, typeof v === 'string' ? v : JSON.stringify(v));
  await R.goto(); await H.sleep(5000);
  const st = () => P.evaluate(() => {
    const a = document.querySelector('#main>.tab.active'); let rt = ''; try { rt = LowiRoomsUI.tab(); } catch (e) { }
    const th = document.getElementById('cgThread');
    const bar = document.getElementById('cspBar');
    return { tab: a ? a.id : null, rm: rt, thread: !!(th && th.hasAttribute('data-open')), cur: window.LowiCircleGames && LowiCircleGames.current(),
      sel: bar ? [...bar.querySelectorAll('[aria-selected="true"]')].map(b => b.dataset.csp) : null,
      ids: bar ? [...bar.querySelectorAll('[data-csp]')].map(b => b.dataset.csp) : null,
      cls: ['csp-circle', 'csp-game', 'csp-tree', 'cook-holo', 'rm-room-open'].filter(c => document.documentElement.classList.contains(c)) };
  });
  const open = async () => { await P.evaluate(() => goTab('foryou')); await H.sleep(1500); if (await P.locator('#cmPaneChat .rm-tab[data-rm="room"]').count()) await R.tap('#cmPaneChat .rm-tab[data-rm="room"]').catch(() => { }); await H.sleep(1500); };
  const tapG = async id => { R.step = id; await R.tap('#cspBar [data-csp="' + id + '"]').catch(e => log('tap ' + id + ' FAIL', String(e).slice(0, 90))); await H.sleep(gap); const s = await st(); log(id, s); return s; };
  let bad = 0;
  const check = (name, s) => { const ok = s && s.tab === 'tab-foryou' && s.rm === 'room' && !s.thread; if (!ok) bad++; log((ok ? 'OK ' : 'BAD ') + name, s); };
  await open(); log('circle', await st());
  /* sequence 1: Shuffle then Billiard (tap), several rounds */
  for (let i = 0; i < 3; i++) { await tapG('mischen'); check('seq1 billard tap #' + i, await tapG('billard')); }
  /* sequence 1b: Shuffle then the phone's back */
  for (let i = 0; i < 2; i++) { await tapG('mischen'); R.step = 'back'; await P.evaluate(() => history.back()); await H.sleep(gap + 400); check('seq1 back #' + i, await st()); if ((await st()).tab !== 'tab-foryou') await open(); }
  /* sequence 2 (the Friends tree tab is gone since 5 Nov; its taps are Billard now) */
  for (const id of ['billard', 'swipen', 'mischen', 'swipen']) await tapG(id);
  check('seq2 then billard', await tapG('billard'));
  /* tap-through: in Mischen / Swipen, nothing of Circle may be under the finger anywhere below the bar */
  for (const g of ['mischen', 'swipen']) {
    await tapG(g);
    const hits = await P.evaluate(() => { const bar = document.getElementById('cspBar').getBoundingClientRect(), out = []; for (let y = Math.round(bar.bottom + 8); y < innerHeight - 4; y += 24) for (const x of [6, 60, 195, 330, 384]) { const e = document.elementFromPoint(x, y); if (e && e.closest('#tab-foryou') && !e.closest('.cg-spirit')) out.push(x + ',' + y + ' ' + (e.id || e.className)); } return out; });
    log('tapthrough ' + g, hits.slice(0, 6)); if (hits.length) bad++;
    /* and a real tap where Circle's message bar was */
    await P.mouse.click(195, 820); await H.sleep(900); const s2 = await st(); log('tap at old message bar in ' + g, s2); if (s2.thread || s2.rm === 'chat') bad++;
  }
  check('back to billard after tap-through', await tapG('billard'));
  /* an old Friends tree link / button (LowiCellRoom.openTree) from inside Mischen lands in Circle, no crash */
  await tapG('mischen'); await P.evaluate(() => window.LowiCellRoom && LowiCellRoom.openTree()); await H.sleep(1600);
  check('old tree link opens Circle', await st());
  /* fast: the same two sequences at finger speed */
  for (let r = 0; r < 3; r++) for (const id of ['mischen', 'billard', 'swipen', 'mischen', 'swipen', 'billard']) { await R.tap('#cspBar [data-csp="' + id + '"]').catch(() => { }); await H.sleep(250); }
  await H.sleep(2500); check('fast end', await st());
  log('errs', R.errs); log('crashed', R.crashed); log('loads', R.loads); log('bad', bad);
  console.log(bad || R.crashed || R.loads > 1 ? 'RESULT FAIL' : 'RESULT PASS');
  await R.close();
})().catch(e => { console.log('BROKEN', e && e.stack || e); process.exit(1); });
