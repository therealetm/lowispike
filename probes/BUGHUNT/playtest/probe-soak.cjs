/* Run 27: long session soak. Plays Home like a restless user for MIN minutes (default 20): taps a random ring bubble, picks a random
   button in whatever opened, Escape/close, sometimes hides the tab, switches language, pinches the stage (Chromium). Samples JS heap
   (after a forced GC when available), DOM node count, open overlays, rAF rate and live intervals each minute. Seeded.
   node probe-soak.cjs <url> [minutes] [seed]   -> out/soak-<seed>.jsonl */
'use strict';
const L = require('./lib.cjs'), fs = require('fs');
(async () => {
  const url = process.argv[2] || 'https://therealetm.github.io/lowispike/'; const MIN = +(process.argv[3] || 20); const seed = +(process.argv[4] || 27);
  const rnd = L.mulberry32(seed); const OUT = __dirname + '/out/soak-' + seed + '.jsonl'; fs.writeFileSync(OUT, '');
  const log = o => { const s = JSON.stringify(o); fs.appendFileSync(OUT, s + '\n'); console.log(s); };
  const h = await L.open({ url: url + (url.includes('?') ? '&' : '?') + 'soak=' + Date.now(), view: 'chromium390', args: ['--js-flags=--expose-gc', '--enable-precise-memory-info'] });
  const page = h.page;
  await page.addInitScript(() => { window.__iv = 0; const si = setInterval, ci = clearInterval, live = new Set(); window.setInterval = function () { const id = si.apply(this, arguments); live.add(id); return id; }; window.clearInterval = function (id) { live.delete(id); return ci.apply(this, arguments); }; window.__ivLive = () => live.size; });
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => document.getElementById('whPad') && document.querySelectorAll('[data-orbit]').length >= 8, null, { timeout: 120000 }).catch(() => {});
  await L.sleep(5000);
  await page.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot'); try { LowiR2.closeAll(); } catch (e) {} });
  const sample = async (tag) => {
    const s = await page.evaluate(async () => { try { window.gc && window.gc(); } catch (e) {} await new Promise(r => setTimeout(r, 300));
      let f = 0; const t0 = performance.now(); await new Promise(r => { const k = () => { f++; if (performance.now() - t0 < 1000) requestAnimationFrame(k); else r(); }; requestAnimationFrame(k); });
      const ovs = [...document.querySelectorAll('.r2-ov.on,.pd-ov,.cs-overlay,#sheetwrap.open,.mh-ov,[aria-modal=true]')].filter(e => e.getBoundingClientRect().width > 0).length;
      return { heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null, nodes: document.getElementsByTagName('*').length, bodyKids: document.body.children.length,
        canvases: document.querySelectorAll('canvas').length, ovs, raf: f, iv: window.__ivLive ? window.__ivLive() : null, tab: (document.querySelector('.tab.on,[data-tab].on') || {}).id || '', lang: document.documentElement.lang }; });
    const e = await L.snap(h); log(Object.assign({ t: tag }, s, { err: e.err.slice(0, 3), rej: e.rej.slice(0, 3), stalls: e.stalls.length, pageerror: h.log.pageerror.splice(0, 3) }));
  };
  const closeAll = async () => { await page.keyboard.press('Escape').catch(() => {}); await L.sleep(400); await page.keyboard.press('Escape').catch(() => {}); await L.sleep(300);
    await page.evaluate(() => { try { LowiR2.closeAll(); } catch (e) {} try { if (window.LowiHomeBloomsV2 && LowiHomeBloomsV2.isOpen && LowiHomeBloomsV2.isOpen()) LowiHomeBloomsV2.close(); } catch (e) {} try { if (typeof goTab === 'function' && !document.getElementById('whPad').getBoundingClientRect().width) goTab('home'); } catch (e) {} }).catch(() => {}); };
  await sample('start');
  const T0 = Date.now(); let minute = 0, acts = 0;
  while (Date.now() - T0 < MIN * 60000) {
    const r = rnd();
    try {
      if (r < 0.55) { /* bubble + a button inside */
        const pts = await page.evaluate(() => [...document.querySelectorAll('[data-orbit]')].map(e => { const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width }; }).filter(p => p.w > 0));
        if (pts.length) { const p = pts[Math.floor(rnd() * pts.length)]; await page.mouse.click(p.x, p.y); await L.sleep(500 + rnd() * 900);
          const bs = await page.evaluate(() => [...document.querySelectorAll('[aria-modal=true] button, .hb2-orb button, .r2-ov.on button, #sheetwrap.open button')].map(b => { const r = b.getBoundingClientRect(); const t = (b.textContent || b.getAttribute('aria-label') || '').trim(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, t }; }).filter(b => b.w > 0 && b.x > 0 && b.y > 0 && b.x < innerWidth && b.y < innerHeight && !/delete|remove|reset|sign out|log out|löschen|borrar|share|post|send/i.test(b.t)));
          if (bs.length && rnd() < 0.7) { const b = bs[Math.floor(rnd() * bs.length)]; await page.mouse.click(b.x, b.y); await L.sleep(600 + rnd() * 900); }
        }
        if (rnd() < 0.8) await closeAll();
      } else if (r < 0.65) { await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }); await L.sleep(1500 + rnd() * 3000);
        await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }); }
      else if (r < 0.72) { const lg = ['de', 'es', 'en'][Math.floor(rnd() * 3)]; await page.evaluate(l => { try { (window.setLang || (window.LowiLang && LowiLang.set) || (() => {}))(l); } catch (e) {} }, lg); await L.sleep(800); }
      else if (r < 0.82) { const c = await h.page.context().newCDPSession(page); const cx = 195, cy = 420; const tp = (k, pts) => c.send('Input.dispatchTouchEvent', { type: k, touchPoints: pts });
        await tp('touchStart', [{ x: cx - 40, y: cy, id: 1 }, { x: cx + 40, y: cy, id: 2 }]); for (let i = 1; i <= 8; i++) { const d = 40 + (rnd() < .5 ? i * 12 : -i * 3); await tp('touchMove', [{ x: cx - d, y: cy, id: 1 }, { x: cx + d, y: cy, id: 2 }]); await L.sleep(30); } await tp('touchEnd', []); await c.detach(); await L.sleep(1500); await closeAll(); }
      else { await L.sleep(3000 + rnd() * 5000); }
    } catch (e) { log({ t: 'act-error', e: String(e.message).slice(0, 200) }); }
    acts++;
    const m = Math.floor((Date.now() - T0) / 60000); if (m > minute) { minute = m; await closeAll(); await L.sleep(800); await sample('min' + m + ' acts' + acts); }
  }
  await closeAll(); await L.sleep(2000); await sample('end acts' + acts);
  await h.browser.close(); if (h.srv) h.srv.close();
})();
