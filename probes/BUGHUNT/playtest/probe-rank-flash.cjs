'use strict';
/* Run 34: one tap on Misty's ranking row ("Misty is number N worldwide"). Community opens; how long does the galaxy (Room / chat
   view, people you can tap) show before Ranking, and what sits under the finger in that time? Then a deliberate 2nd tap at
   given delays (beyond the 400 ms fresh window): does it pick a person in the galaxy?
   node probe-rank-flash.cjs <url|dir> [view] [delays]   env RM=1. Live DB blocked (mock-cloud). */
const L = require('./lib.cjs');
(async () => {
  let url = process.argv[2] || 'https://therealetm.github.io/lowispike/', srv = null; if (!/^https?:/.test(url)) { srv = await L.serve(url); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const view = process.argv[3] || 'iphone13';
  const delays = (process.argv[4] || '-1,450,700').split(',').map(Number);
  const WT = require('fs').readFileSync('/home/sprite/BUGHUNT/.wt', 'utf8').trim();
  const h = await L.open({ url, view, reducedMotion: !!process.env.RM, lang: 'en', preInit: "try{localStorage.setItem('lowi.tutorial.done','1')}catch(e){}",
    ctxHook: async ctx => require(WT + '/tools/sim/mock-cloud.cjs').install(ctx, { members: 30, messages: 20, me: 'Fixture' }) });
  const P = h.page; let bad = 0;
  await P.waitForFunction(() => document.getElementById('whPad') && document.querySelectorAll('[data-orbit]').length >= 8, null, { timeout: 120000 }).catch(() => {});
  await L.sleep(4000);
  await P.evaluate(t => { window.__TRACE = t; const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot'); }, !!process.env.TRACE);
  let first = true;
  for (const d of delays) {
    await P.evaluate(() => { try { LowiCommunity.select(''); } catch (e) {} try { LowiRanking.closeLadder(); LowiRanking.closeInfo(); LowiRanking.closeCompare(); } catch (e) {} try { goTab('home'); } catch (e) {} });
    await L.sleep(900);
    await P.evaluate(() => { try { LowiWorldHome.openMisty('aura'); } catch (e) {} });
    await P.waitForSelector('#mistyHub .mh-rk', { timeout: 15000 }).catch(() => {});
    await L.sleep(1500);
    const c = await L.center(h, '#mistyHub .mh-rk'); if (!c) { console.log('no rank row'); continue; }
    await P.evaluate(([x, y]) => { window.__fl = []; const t0 = performance.now(); let last = '';
      const tick = () => { const U = window.LowiRoomsUI; const v = U && U.view ? U.view() : '?'; const tf = document.getElementById('tab-foryou');
        const act = !!(tf && tf.classList.contains('active')); const el = document.elementFromPoint(x, y);
        const who = el ? ((el.closest('.cg-body,[data-uid],.cg-p') ? 'PERSON ' : '') + (el.id || el.className || el.tagName)).toString().slice(0, 50) : '-';
        const s = (act ? 'cm ' : 'home ') + v + ' | ' + who; if (s !== last) { window.__fl.push(Math.round(performance.now() - t0) + ' ' + s); last = s; }
        if (performance.now() - t0 < 4000) requestAnimationFrame(tick); };
      if (window.__TRACE) { const U = window.LowiRoomsUI; if (U && !U.__w) { U.__w = 1; ['showView', 'setTab'].forEach(k => { const o = U[k]; U[k] = function () { window.__fl.push(Math.round(performance.now() - t0) + ' >' + k + '(' + [...arguments].join(',') + ') pane=' + !!document.getElementById('cmPaneChat')); return o.apply(this, arguments); }; }); } }
      requestAnimationFrame(tick); }, [c.x, c.y]);
    await L.tap(h, c.x, c.y);
    if (d >= 0) { await L.sleep(d); await L.tap(h, c.x, c.y); }
    await L.sleep(4200);
    const st = await P.evaluate(() => { const U = window.LowiRoomsUI; return { view: U && U.view ? U.view() : '?', sel: [...document.querySelectorAll('.cg-body.sel')].map(e => e.getAttribute('aria-label') || ''),
      announce: (document.getElementById('csAnnounce') || {}).textContent || '', fl: window.__fl }; });
    const person = st.fl.filter(s => /PERSON/.test(s));
    const ok = !st.sel.length && !/stream|direct|talk/i.test(st.announce) && st.view === 'rank';
    if (!ok) bad++;
    console.log((ok ? 'PASS' : 'FAIL') + ' delay' + d + (first ? ' (first visit)' : '') + ' view=' + st.view + ' sel=' + JSON.stringify(st.sel) + ' announce=' + JSON.stringify(st.announce.slice(0, 60)));
    console.log('   timeline: ' + st.fl.join('  ||  '));
    first = false;
  }
  const s = await L.snap(h); console.log('errors', JSON.stringify({ err: s.err, rej: s.rej, pe: h.log.pageerror }), bad ? 'RESULT FAIL ' + bad : 'RESULT PASS');
  await h.browser.close(); if (srv) srv.close(); process.exit(0);
})();
