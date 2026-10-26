/* Run 27 (BH-026): a human-speed double tap on each bloom bubble, made with explicit input time stamps (CDP Input.dispatchMouseEvent
   timestamp) so the gap is the finger's gap even when swiftshader holds the main thread for a second after the bloom opens.
   Also a deliberate second tap GAP_SLOW ms later must still press the orb. Reports clicks (with ms since #hb2Bloom was added, by
   event time stamp) and ledger changes.  node probe-orb-dbl-ts.cjs <url> [view] [gaps] */
'use strict';
const L = require('./lib.cjs');
(async () => {
  const url = process.argv[2] || 'https://therealetm.github.io/lowispike/'; const view = process.argv[3] || 'chromium390';
  const GAPS = (process.argv[4] || '90,150,250,700').split(',').map(Number);
  const h = await L.open({ url: url + (url.includes('?') ? '&' : '?') + 'ts=' + Date.now(), view });
  const page = h.page;
  await page.waitForFunction(() => document.getElementById('whPad') && document.querySelectorAll('[data-orbit]').length >= 8 && window.LowiHomeBloomsV2, null, { timeout: 120000 }).catch(() => {});
  await L.sleep(6000);
  await page.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot'); try { LowiR2.closeAll(); } catch (e) {}
    const nm = e => { const o = e && e.closest && e.closest('[data-hb2],[data-orbit]'); return o ? ((o.dataset.hb2 || o.dataset.orbit) + '/' + (o.dataset.id || (o.className + '').split(' ')[0])) : (e ? e.tagName : '-'); };
    window.__born = 0; new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.id === 'hb2Bloom') window.__born = performance.now(); }).observe(document.body, { childList: true });
    window.__clk = []; addEventListener('click', e => { if (e.isTrusted) window.__clk.push(nm(e.target) + (window.__born ? ' @' + Math.round(e.timeStamp - window.__born) + 'ms' : '')); }, true); });
  const cdp = await page.context().newCDPSession(page);
  const reset = async () => { await page.keyboard.press('Escape'); await L.sleep(300); await page.evaluate(() => { try { LowiHomeBloomsV2.close && LowiHomeBloomsV2.close(); } catch (e) {} try { LowiR2.closeAll(); } catch (e) {} const s = JSON.parse(localStorage.getItem('lowispike.v2')); s.ledger = []; localStorage.setItem('lowispike.v2', JSON.stringify(s)); window.__clk = []; window.__born = 0; }); await L.sleep(1300); };
  let bad = 0, slowOk = 0, slowN = 0;
  for (const k of (process.env.KINDS || 'move,water,fuel,sleep').split(',')) {
    const c = await page.evaluate(k => { const b = document.querySelector('[data-orbit="' + k + '"]').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, k);
    for (const g of GAPS) {
      await reset();
      const T = Date.now() / 1000; const ev = (type, t) => cdp.send('Input.dispatchMouseEvent', { type, x: c.x, y: c.y, button: 'left', clickCount: 1, timestamp: t });
      if (g >= 500) { await ev('mousePressed', T); await ev('mouseReleased', T + 0.06); await L.sleep(g); const T2 = Date.now() / 1000; await ev('mousePressed', T2); await ev('mouseReleased', T2 + 0.06); }
      else await Promise.all([ev('mousePressed', T), ev('mouseReleased', T + 0.06), ev('mousePressed', T + g / 1000), ev('mouseReleased', T + g / 1000 + 0.06)]);
      await L.sleep(1800);
      const r = await page.evaluate(() => ({ clk: window.__clk, led: (JSON.parse(localStorage.getItem('lowispike.v2')).ledger || []).map(x => x.label), open: !!document.querySelector('#hb2Bloom.on') }));
      const fired = r.clk.filter(x => /^act\//.test(x));
      if (g < 500 && fired.length) bad++;
      if (g >= 500 && k === 'move') { slowN++; if (fired.length) slowOk++; }
      console.log(JSON.stringify({ bubble: k, gap: g, clicks: r.clk, orbFired: fired, ledger: r.led, bloomOpen: r.open }));
    }
  }
  const e = await L.snap(h);
  console.log('RESULT ' + (bad ? 'BAD ' + bad : 'OK') + ' quick-double-tap orb presses; deliberate Move taps that pressed the orb ' + slowOk + '/' + slowN + ' errors ' + JSON.stringify(e.err.concat(e.rej, h.log.pageerror)));
  await h.browser.close(); if (h.srv) h.srv.close();
})();
