/* Run 33: P-CLOSE-UNDER-FINGER. A tap on a bloom orb (or a choice that closes its sheet) folds the bloom away; the bubble that opened
   it sits under the finger. Does a quick 2nd tap (double tap) reopen the bloom / press what is underneath?
   For each Home ring bubble: open its bloom by a real tap, wait, then double tap every enabled orb at GAP ms.
   node probe-orb-close-dbl.cjs <url|dir> [view] [gaps]   env RM=1, ONLY=sleep,move */
'use strict';
const L = require('./lib.cjs');
(async () => {
  let url = process.argv[2] || 'https://therealetm.github.io/lowispike/', srv = null; if (!/^https?:/.test(url)) { srv = await L.serve(url); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const view = process.argv[3] || 'chromium390';
  const GAPS = (process.argv[4] || '90,180,300').split(',').map(Number);
  const h = await L.open({ url, view, reducedMotion: !!process.env.RM, lang: 'en', preInit: "try{localStorage.setItem('lowi.tutorial.done','1')}catch(e){}" });
  const P = h.page; let bad = 0;
  await P.waitForFunction(() => document.getElementById('whPad') && document.querySelectorAll('[data-orbit]').length >= 8, null, { timeout: 120000 }).catch(() => {});
  await L.sleep(5000);
  await P.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot'); try { LowiR2.closeAll(); } catch (e) {}
    window.__ev = []; document.addEventListener('lowi:bloom-v2', e => { const d = e.detail || {}; window.__ev.push(Math.round(performance.now()) + ' ' + (d.open ? 'OPEN ' : 'close ') + d.kind + '/' + (d.owner || '')); }); });
  const state = () => P.evaluate(() => ({ blooms: [...document.querySelectorAll('.hb2-bloom.on,#hb2Bloom.on,[class*="bloom"].on')].map(e => (e.id || e.className.split(' ')[0]) + ':' + (e.dataset.kind || '')).slice(0, 4),
    modal: [...document.querySelectorAll('[aria-modal=true]')].filter(e => e.getBoundingClientRect().width > 0 && getComputedStyle(e).visibility !== 'hidden').map(e => e.id || e.className.split(' ')[0]).slice(0, 4),
    open: document.documentElement.classList.contains('hb2-open'), ev: window.__ev.splice(0) }));
  const reset = async () => { for (let i = 0; i < 2; i++) { await P.keyboard.press('Escape'); await L.sleep(250); }
    await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) {} try { LowiHomeBloomsV2.close(true); } catch (e) {} try { if (!document.getElementById('whPad').getBoundingClientRect().width) goTab('home'); } catch (e) {} }); await L.sleep(900); await P.evaluate(() => { window.__ev.length = 0; }); };
  const kinds = (process.env.ONLY || 'water,move,sleep,fuel').split(',');
  for (const k of kinds) {
    await reset();
    const bc = await L.center(h, '[data-orbit="' + k + '"]'); if (!bc) { console.log('no bubble ' + k); continue; }
    await L.tap(h, bc.x, bc.y); await L.sleep(1200);
    const orbs = await P.evaluate(() => [...document.querySelectorAll('.on [data-hb2=act]:not([disabled]), .on [data-act]:not([disabled])')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 8 && r.top > 0 && r.bottom < innerHeight; }).map(e => ({ id: e.dataset.id || e.dataset.act, cls: e.className.split(' ').slice(0, 2).join('.') })));
    console.log('KIND ' + k + ' orbs ' + JSON.stringify(orbs.map(o => o.id)));
    for (const o of orbs) {
      if (process.env.ORB && !process.env.ORB.split(',').includes(o.id)) continue;
      for (const g of GAPS) {
        await reset();
        const bc2 = await L.center(h, '[data-orbit="' + k + '"]'); await L.tap(h, bc2.x, bc2.y); await L.sleep(1200);
        const sel = '.on [data-hb2=act][data-id="' + o.id + '"], .on [data-act="' + o.id + '"]';
        const c = await L.center(h, sel); if (!c) { console.log('  no orb ' + o.id); continue; }
        await P.evaluate(() => { window.__ev.length = 0; });
        const under = await P.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? (e.closest('[data-orbit]') ? 'bubble ' + e.closest('[data-orbit]').dataset.orbit : '') : ''; }, [c.x, c.y]);
        const t = Date.now(); await L.tap(h, c.x, c.y); const w = g - (Date.now() - t); if (w > 0) await L.sleep(w); await L.tap(h, c.x, c.y); const took = Date.now() - t;
        await L.sleep(1500);
        const s = await state();
        const reopened = s.ev.filter(x => / OPEN /.test(x)).length > 0 || s.open;
        const ok = !reopened;
        if (!ok) bad++;
        console.log('  ' + (ok ? 'PASS' : 'FAIL') + ' ' + k + '/' + o.id + ' gap' + g + ' (' + took + 'ms) ' + JSON.stringify(s));
      }
    }
  }
  const s = await L.snap(h); console.log('errors', JSON.stringify({ err: s.err, rej: s.rej, pe: h.log.pageerror }), bad ? 'RESULT FAIL ' + bad : 'RESULT PASS');
  await h.browser.close(); if (srv) srv.close(); process.exit(0);
})();
