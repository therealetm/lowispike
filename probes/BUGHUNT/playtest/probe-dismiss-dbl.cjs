/* Run 40 (P-CLOSE-UNDER-FINGER on dismiss controls): a double tap on a control that only CLOSES something (a bloom's backdrop, the
   bottom X of every sheet) uncovers what was under the finger, and the 2nd tap presses it.
   A: Move bloom open, double tap its backdrop right over the companion-world bubble (#spBubble) -> does the world open?
   B: Community chat open, a sheet on top, double tap the bottom X (#whX) -> does the chat box (#cmInput) get focus / keyboard?
   node probe-dismiss-dbl.cjs <url|dir> [view] [gaps]   env RM=1. Always mock cloud. */
'use strict';
const L = require('./lib.cjs');
(async () => {
  let url = process.argv[2] || 'https://therealetm.github.io/lowispike/', srv = null; if (!/^https?:/.test(url)) { srv = await L.serve(url); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const view = process.argv[3] || 'chromium390', GAPS = (process.argv[4] || '0,120,250').split(',').map(Number), ONLY = process.env.ONLY || 'AB';
  const h = await L.open({ url, view, reducedMotion: !!process.env.RM, lang: 'en', preInit: "try{localStorage.setItem('lowi.tutorial.done','1')}catch(e){};window.__ck=[];document.addEventListener('click',function(e){if(e.isTrusted)window.__ck.push(Math.round(e.timeStamp)+':'+((e.target.closest&&e.target.closest('button')||e.target).id||(e.target.className+'').slice(0,20)))},true);window.__fi=[];addEventListener('focusin',function(e){var t=e.target;window.__fi.push((t.id||t.tagName)+'@'+Math.round(performance.now()))},true);",
    ctxHook: async ctx => { const WT = require('fs').readFileSync('/home/sprite/BUGHUNT/.wt', 'utf8').trim(); return require(WT + '/tools/sim/mock-cloud.cjs').install(ctx, { members: 30, messages: 20, me: 'Fixture' }); } });
  const P = h.page; let bad = 0;
  await P.waitForFunction(() => document.getElementById('whPad') && document.querySelectorAll('[data-orbit]').length >= 8 && window.LowiHomeBloomsV2, null, { timeout: 120000 }).catch(() => {});
  await L.sleep(5000);
  await P.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot'); try { LowiR2.closeAll(); } catch (e) {} });
  const dbl = async (x, y, g) => { if (h.touch) { await P.touchscreen.tap(x, y); if (g) await L.sleep(g); await P.touchscreen.tap(x, y); } else { await P.mouse.click(x, y); if (g) await L.sleep(g); await P.mouse.click(x, y); } };
  const real = ck => ck.length >= 2 ? parseInt(ck[ck.length - 1]) - parseInt(ck[0]) : -1;
  if (ONLY.includes('A')) for (const g of GAPS) {
    await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) {} try { LowiHomeBloomsV2.close(); } catch (e) {} try { goTab('home'); } catch (e) {} const w = document.getElementById('spWorld'); if (w && !w.hidden) { const b = w.querySelector('[data-sp="close"]'); b && b.click(); } }); await L.sleep(1500);
    const bc = await L.center(h, '[data-orbit="move"]'); if (!bc) { console.log('A no move bubble'); break; }
    await L.tap(h, bc.x, bc.y); await L.sleep(1400);
    const spot = await P.evaluate(() => { const b = document.getElementById('spBubble'); if (!b) return null; const r = b.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const top = document.elementFromPoint(x, y); return { x, y, top: top ? (top.className || top.id || top.tagName) + '' : '-', bloom: document.documentElement.classList.contains('hb2-open') }; });
    if (!spot || !spot.bloom || !/hb2-scrim/.test(spot.top)) { console.log('A gap' + g + ' setup: ' + JSON.stringify(spot)); continue; }
    await P.evaluate(() => { window.__ck.length = 0; });
    await dbl(spot.x, spot.y, g); await L.sleep(1500);
    const s = await P.evaluate(() => { const w = document.getElementById('spWorld'); return { world: !!(w && !w.hidden && w.classList.contains('on')) || !!document.querySelector('.sp-world.on'), bloom: document.documentElement.classList.contains('hb2-open'), ck: window.__ck.slice() }; });
    const r = real(s.ck); const fail = s.world && r >= 0 && r < 400; if (fail) bad++;
    console.log((s.world ? 'WORLD OPENED' : 'ok') + ' A move-backdrop gap' + g + ' real ' + r + 'ms bloomOpen ' + s.bloom + ' clicks ' + JSON.stringify(s.ck) + (fail ? ' FAIL' : ''));
  }
  if (ONLY.includes('B')) {
    await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) {} try { LowiHomeBloomsV2.close(); } catch (e) {} const w = document.getElementById('spWorld'); if (w && !w.hidden) { const b = w.querySelector('[data-sp="close"]'); b && b.click(); } try { goTab('foryou'); } catch (e) {} });
    await L.sleep(1500); await P.evaluate(() => window.cmSeg && window.cmSeg('chat')); await L.sleep(5000);
    /* connect to someone: a companion in the galaxy */
    const ok = await P.evaluate(async () => { try { window.cmSeg && window.cmSeg('chat'); } catch (e) {} await new Promise(r => setTimeout(r, 1500)); for (let i = 0; i < 20; i++) { const b = [...document.querySelectorAll('.cg-body')].find(e => e.getBoundingClientRect().width > 0); if (b) { b.click(); await new Promise(r => setTimeout(r, 900)); const d = [...document.querySelectorAll('button,[role=button]')].find(e => /directly|Talk to/i.test(e.getAttribute('aria-label') || e.textContent || '') && e.getBoundingClientRect().width > 0); if (d) d.click(); break; } await new Promise(r => setTimeout(r, 300)); }
      for (let i = 0; i < 20; i++) { const t = document.getElementById('cmInput'); if (t && t.getBoundingClientRect().width > 0) return true; await new Promise(r => setTimeout(r, 300)); } return false; });
    if (!ok) console.log('B setup: no chat box'); else for (const g of GAPS) {
      await P.evaluate(() => { try { document.activeElement && document.activeElement.blur(); } catch (e) {} });
      /* a sheet on top, opened the way the app does (R2), so the one bottom X shows */
      await P.evaluate(() => { LowiR2.sheet('<div style="padding:20px"><b>Probe sheet</b><p>Close me with the X</p></div>'); }); await L.sleep(1400);
      const x = await P.evaluate(() => { const b = document.getElementById('whX'); if (!b || b.hidden) return null; const r = b.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const t = document.getElementById('cmInput'), tr = t.getBoundingClientRect(); return { ph: t.placeholder, x: cx, y: cy, over: cx >= tr.left && cx <= tr.right && cy >= tr.top - 8 && cy <= tr.bottom + 8, tr: [Math.round(tr.top), Math.round(tr.bottom)] }; });
      if (!x) { console.log('B gap' + g + ' setup: X hidden'); continue; }
      await P.evaluate(() => { window.__ck.length = 0; window.__fi.length = 0; });
      await dbl(x.x, x.y, g); await L.sleep(1200);
      const s = await P.evaluate(() => ({ fi: window.__fi.slice(), ck: window.__ck.slice(), act: document.activeElement ? (document.activeElement.id || document.activeElement.tagName) : '-', sheets: document.querySelectorAll('.r2-ov.on:not(.off)').length }));
      const r = real(s.ck); const focused = s.act === 'cmInput' || s.fi.some(f => /^cmInput@/.test(f)); const fail = focused && r >= 0 && r < 400; if (fail) bad++;
      console.log((focused ? 'CHAT BOX FOCUSED' : 'ok') + ' B whX gap' + g + ' real ' + r + 'ms X over chat box ' + x.over + ' ' + JSON.stringify(x.tr) + ' active ' + s.act + ' sheets ' + s.sheets + ' focusin ' + JSON.stringify(s.fi) + (fail ? ' FAIL' : ''));
    }
  }
  const s = await L.snap(h); console.log('errors', JSON.stringify({ err: s.err, rej: s.rej, pe: h.log.pageerror }), bad ? 'RESULT FAIL ' + bad : 'RESULT PASS');
  await h.browser.close(); if (srv) srv.close(); process.exit(0);
})();
