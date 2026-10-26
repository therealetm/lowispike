/* Run 27: who takes the 2nd tap of a double tap on the Move bubble? Samples elementsFromPoint at the bubble centre every ~4 ms for
   200 ms after one real tap, and logs every click (target, data-hb2/id, time since 1st tap) during a real double tap.
   node probe-bloom-dbl-who.cjs <url> [view] [kind] [gap] [tries] */
'use strict';
const L = require('./lib.cjs');
(async () => {
  const url = process.argv[2] || 'https://therealetm.github.io/lowispike/'; const view = process.argv[3] || 'chromium390'; const K = process.argv[4] || 'move'; const G = +(process.argv[5] || 40); const N = +(process.argv[6] || 6);
  const h = await L.open({ url: url + (url.includes('?') ? '&' : '?') + 'bw=' + Date.now(), view });
  const page = h.page;
  await page.waitForFunction(() => document.getElementById('whPad') && document.querySelectorAll('[data-orbit]').length >= 8 && window.LowiHomeBloomsV2, null, { timeout: 120000 }).catch(() => {});
  await L.sleep(6000);
  await page.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot'); try { LowiR2.closeAll(); } catch (e) {}
    window.__clk = []; window.__t0 = 0; const nm = e => { const o = e && e.closest && e.closest('[data-hb2],[data-orbit],button'); return o ? ((o.dataset.hb2 || o.dataset.orbit || o.tagName) + '/' + (o.dataset.id || (o.className + '').split(' ')[0])) : (e ? e.tagName + '.' + (e.className + '').split(' ')[0] : '-'); };
    for (const ty of ['pointerdown', 'click']) addEventListener(ty, e => { if (ty === 'pointerdown' && !window.__t0) window.__t0 = performance.now(); window.__clk.push(ty + '@' + Math.round(performance.now() - window.__t0) + ' ' + nm(e.target) + (e.isTrusted ? '' : ' (script)')); }, true);
    window.__nm = nm; });
  const c = await page.evaluate(k => { const b = document.querySelector('[data-orbit="' + k + '"]').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, K);
  const reset = async () => { await page.keyboard.press('Escape'); await L.sleep(300); await page.evaluate(() => { try { LowiHomeBloomsV2.close && LowiHomeBloomsV2.close(); } catch (e) {} try { LowiR2.closeAll(); } catch (e) {} const s = JSON.parse(localStorage.getItem('lowispike.v2')); s.ledger = []; localStorage.setItem('lowispike.v2', JSON.stringify(s)); }); await L.sleep(1200); };
  await reset();
  await page.evaluate(([x, y]) => { window.__under = []; const t0 = performance.now(); const id = setInterval(() => { const st = document.elementsFromPoint(x, y).slice(0, 3).map(window.__nm).join(' > '); const t = Math.round(performance.now() - t0); const l = window.__under[window.__under.length - 1]; if (!l || l.split('ms ')[1] !== st) window.__under.push(t + 'ms ' + st); if (t > 220) clearInterval(id); }, 4); }, [c.x, c.y]);
  await L.tap(h, c.x, c.y); await L.sleep(800);
  console.log('UNDER', JSON.stringify(await page.evaluate(() => window.__under), null, 0));
  for (let i = 0; i < N; i++) {
    await reset(); await page.evaluate(() => { window.__clk = []; window.__t0 = 0; });
    await L.tap(h, c.x, c.y); await L.sleep(G); await L.tap(h, c.x, c.y); await L.sleep(1200);
    const r = await page.evaluate(() => ({ clk: window.__clk, led: (JSON.parse(localStorage.getItem('lowispike.v2')).ledger || []).map(x => x.label) }));
    console.log('TRY ' + i + ' ' + JSON.stringify(r));
  }
  await h.browser.close(); if (h.srv) h.srv.close();
})();
