/* Run 33: P-CLOSE-UNDER-FINGER repro. Open a Home bloom, then double tap one orb (two mouse clicks GAP ms apart, timed in-page).
   The 1st click picks the choice and folds the bloom (.off = pointer-events none); does the 2nd land on the bubble under it and
   reopen the bloom?   node probe-choice-dbl.cjs <url|dir> [view] [kind:orb,...] [gaps]   env RM=1 */
'use strict';
const L = require('./lib.cjs');
(async () => {
  let url = process.argv[2] || 'https://therealetm.github.io/lowispike/', srv = null; if (!/^https?:/.test(url)) { srv = await L.serve(url); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const view = process.argv[3] || 'chromium390';
  const CASES = (process.argv[4] || 'move:steady,sleep:mid').split(',').map(s => s.split(':'));
  const GAPS = (process.argv[5] || '0,150,300').split(',').map(Number);
  const h = await L.open({ url, view, reducedMotion: !!process.env.RM, lang: 'en', preInit: "try{localStorage.setItem('lowi.tutorial.done','1')}catch(e){};window.__ck=[];addEventListener('click',function(e){if(e.isTrusted)window.__ck.push(Math.round(e.timeStamp)+'@'+Math.round(performance.now()))},true);" });
  const P = h.page; let bad = 0;
  await P.waitForFunction(() => document.getElementById('whPad') && document.querySelectorAll('[data-orbit]').length >= 8 && window.LowiHomeBloomsV2, null, { timeout: 120000 }).catch(() => {});
  await L.sleep(5000);
  await P.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot'); try { LowiR2.closeAll(); } catch (e) {}
    window.__ev = []; document.addEventListener('lowi:bloom-v2', e => { const d = e.detail || {}; window.__ev.push(Math.round(performance.now()) + ' ' + (d.open ? 'OPEN ' : 'close ') + d.kind); });
    /* fire two trusted-looking clicks from the page is impossible; instead we time them from node but log their timeStamps */ });
  for (const [kind, orbHint] of CASES) for (const g of GAPS) {
    for (let i = 0; i < 2; i++) { await P.keyboard.press('Escape'); await L.sleep(200); }
    await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) {} try { LowiHomeBloomsV2.close(true); } catch (e) {} }); await L.sleep(700);
    const bc = await L.center(h, '[data-orbit="' + kind + '"]'); if (!bc) { console.log('no bubble ' + kind); continue; }
    await L.tap(h, bc.x, bc.y); await L.sleep(1300);
    const orbs = await P.evaluate(() => [...document.querySelectorAll('#hb2Bloom.on [data-hb2=act]:not([disabled]), .hb2-bloom.on [data-hb2=act]:not([disabled])')].map(e => { const r = e.getBoundingClientRect(); return { id: e.dataset.id, x: r.left + r.width / 2, y: r.top + r.height / 2 }; }));
    const o = orbs.find(z => z.id === orbHint) || orbs.find(z => z.id.includes(orbHint)) || orbs[Math.floor(orbs.length / 2)];
    if (!o) { console.log('no orbs for ' + kind + ' ' + JSON.stringify(orbs)); continue; }
    const under = await P.evaluate(([x, y]) => { const els = document.elementsFromPoint(x, y).map(e => e.closest('[data-orbit],[data-home-misty],button')).filter(Boolean); return els.slice(0, 4).map(e => e.dataset.orbit ? 'bubble:' + e.dataset.orbit : (e.dataset.id || e.className.split(' ')[0])); }, [o.x, o.y]);
    await P.evaluate(() => { window.__ev.length = 0; window.__ck.length = 0; });
    if (h.touch) { await P.touchscreen.tap(o.x, o.y); if (g) await L.sleep(g); await P.touchscreen.tap(o.x, o.y); }
    else { await P.mouse.click(o.x, o.y); if (g) await L.sleep(g); await P.mouse.click(o.x, o.y); }
    await L.sleep(1600);
    const s = await P.evaluate(() => ({ ev: window.__ev.slice(), ck: window.__ck.slice(), open: document.documentElement.classList.contains('hb2-open'), kind: (document.querySelector('.hb2-bloom.on') || { dataset: {} }).dataset.kind || '' }));
    const realGap = s.ck.length >= 2 ? parseInt(s.ck[s.ck.length - 1]) - parseInt(s.ck[0]) : -1;
    const reopened = s.open || s.ev.some(x => / OPEN /.test(x));
    if (reopened && realGap >= 0 && realGap < 400) bad++;
    console.log((reopened ? 'REOPENED' : 'ok') + ' ' + kind + '/' + o.id + ' gap' + g + ' real ' + realGap + 'ms under ' + JSON.stringify(under) + ' ' + JSON.stringify(s.ev) + ' clicks ' + JSON.stringify(s.ck) + ' openNow ' + s.open + ' ' + s.kind);
  }
  const s = await L.snap(h); console.log('errors', JSON.stringify({ err: s.err, rej: s.rej, pe: h.log.pageerror }), bad ? 'RESULT FAIL ' + bad : 'RESULT PASS');
  await h.browser.close(); if (srv) srv.close(); process.exit(0);
})();
