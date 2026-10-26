/* Run 27: P-FRESH-SCRIM sibling "the 2nd tap lands on a BUTTON of what the 1st tap opened". A Home bloom's orbs fly OUT of the bubble
   (--hb2-dx/dy start them on it), so a double tap on a bubble may press an orb that is still passing under the finger.
   For each ring bubble: (a) what sits under the bubble centre 40..300 ms after one tap (elementFromPoint), (b) a real double tap at
   GAP ms: which orb/action fired, water/xp/log counts before/after.  node probe-bloom-dbl.cjs <url> [view] [gaps]  */
'use strict';
const L = require('./lib.cjs');
(async () => {
  const url = process.argv[2] || 'https://therealetm.github.io/lowispike/'; const view = process.argv[3] || 'chromium390';
  const GAPS = (process.argv[4] || '60,100,150').split(',').map(Number);
  const h = await L.open({ url: url + (url.includes('?') ? '&' : '?') + 'bd=' + Date.now(), view });
  const page = h.page;
  await page.waitForFunction(() => document.getElementById('whPad') && document.querySelectorAll('[data-orbit]').length >= 8 && window.LowiHomeBloomsV2, null, { timeout: 120000 }).catch(() => {});
  await L.sleep(6000);
  await page.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot'); try { LowiR2.closeAll(); } catch (e) {} });
  const counts = () => page.evaluate(() => { let s = {}; try { s = JSON.parse(localStorage.getItem('lowispike.v2') || '{}'); } catch (e) {}
    const ks = Object.keys(localStorage).filter(k => /water|hydr|sleep|move/i.test(k)).sort(); const sig = ks.map(k => k + '=' + (localStorage.getItem(k) || '').length).join(',');
    return { last: JSON.stringify((s.ledger || []).slice(-1)[0] || null).slice(0, 200), xp: s.xp, ledger: (s.ledger || []).length, logs: (s.logs || []).length, sig, bloom: !!document.querySelector('#hb2Bloom.on'), kind: (document.querySelector('#hb2Bloom') || { dataset: {} }).dataset.kind || '',
      sheets: document.querySelectorAll('.r2-ov.on,#sheetwrap.open,[aria-modal=true]').length, home: !!(document.getElementById('whPad') || {}).getBoundingClientRect && document.getElementById('whPad').getBoundingClientRect().width > 0, hash: location.hash }; });
  const reset = async () => { await page.keyboard.press('Escape'); await L.sleep(300); await page.keyboard.press('Escape'); await L.sleep(300);
    await page.evaluate(() => { try { LowiR2.closeAll(); } catch (e) {} try { LowiHomeBloomsV2.close && LowiHomeBloomsV2.close(); } catch (e) {} try { if (!document.getElementById('whPad').getBoundingClientRect().width) goTab('home'); } catch (e) {} }); await L.sleep(1200); };
  const kinds = await page.evaluate(() => [...document.querySelectorAll('[data-orbit]')].map(e => e.getAttribute('data-orbit')));
  for (const k of kinds) {
    if (process.env.ONLY && !process.env.ONLY.split(',').includes(k)) continue;
    await reset();
    const c = await page.evaluate(k => { const b = document.querySelector('[data-orbit="' + k + '"]').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, k);
    /* (a) what passes under the finger */
    await page.evaluate(([x, y]) => { window.__under = []; const t0 = performance.now(); const f = () => { const e = document.elementFromPoint(x, y); const o = e && e.closest('[data-hb2],[data-wm],button'); window.__under.push(Math.round(performance.now() - t0) + ':' + (o ? ((o.dataset.hb2 || o.dataset.wm || '') + '/' + (o.dataset.id || o.className.split(' ').slice(0, 2).join('.'))) : (e ? e.tagName + '.' + (e.className + '').split(' ')[0] : '-'))); if (performance.now() - t0 < 400) requestAnimationFrame(f); }; requestAnimationFrame(f); }, [c.x, c.y]);
    await L.tap(h, c.x, c.y); await L.sleep(700);
    const under = await page.evaluate(() => { const u = window.__under || [], o = []; let last = ''; for (const s of u) { const v = s.split(':').slice(1).join(':'); if (v !== last) { o.push(s); last = v; } } return o; });
    const after1 = await counts();
    console.log('UNDER ' + k + ' ' + JSON.stringify({ under, bloom: after1.bloom, kind: after1.kind, sheets: after1.sheets, home: after1.home }));
    for (const g of GAPS) {
      await reset(); const b0 = await counts();
      await L.tap(h, c.x, c.y); await L.sleep(g); await L.tap(h, c.x, c.y); await L.sleep(1500);
      const b1 = await counts(); const e = await L.snap(h);
      const ch = {}; for (const key of ['xp', 'ledger', 'logs', 'sig', 'last']) if (b0[key] !== b1[key]) ch[key] = [b0[key], b1[key]];
      console.log('DBL ' + k + ' gap ' + g + ' ' + JSON.stringify({ changed: ch, bloom: b1.bloom, kind: b1.kind, sheets: b1.sheets, home: b1.home, hash: b1.hash, err: e.err.concat(e.rej, h.log.pageerror.splice(0)).slice(0, 3) }));
    }
  }
  await h.browser.close(); if (h.srv) h.srv.close();
})();
