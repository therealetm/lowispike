/* Run 27 (BH-026 probe): right after a bloom opens, every orb sits on the bubble it came from (scale .2, opacity 0, pointer-events
   auto) until its fly-out transition moves it. So a 2nd tap on the bubble presses an invisible orb. For each bloom bubble:
   (a) in-page: elementsFromPoint at the bubble centre at 0/30/60/100/150/250/400 ms after #hb2Bloom is added;
   (b) real input: tap the bubble, the moment #hb2Bloom exists tap the same spot again, report what got the click + ledger/water.
   node probe-orb-stack.cjs <url> [view] */
'use strict';
const L = require('./lib.cjs');
(async () => {
  const url = process.argv[2] || 'https://therealetm.github.io/lowispike/'; const view = process.argv[3] || 'chromium390';
  const h = await L.open({ url: url + (url.includes('?') ? '&' : '?') + 'os=' + Date.now(), view, reducedMotion: !!process.env.RM });
  const page = h.page;
  await page.waitForFunction(() => document.getElementById('whPad') && document.querySelectorAll('[data-orbit]').length >= 8 && window.LowiHomeBloomsV2, null, { timeout: 120000 }).catch(() => {});
  await L.sleep(6000);
  await page.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot'); try { LowiR2.closeAll(); } catch (e) {}
    window.__nm = e => { const o = e && e.closest && e.closest('[data-hb2],[data-wm],[data-ss2],[data-orbit]'); return o ? ((o.dataset.hb2 || o.dataset.wm || (o.dataset.ss2 ? 'ss2' : '') || o.dataset.orbit) + '/' + (o.dataset.id || (o.className + '').split(' ')[0])) : (e ? e.tagName : '-'); };
    window.__born = 0; new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.id === 'hb2Bloom') window.__born = performance.now(); }).observe(document.body, { childList: true });
    window.__clk = []; addEventListener('click', e => { if (e.isTrusted) window.__clk.push(window.__nm(e.target) + (window.__born ? ' @' + Math.round(e.timeStamp - window.__born) + 'ms' : '')); }, true); });
  const reset = async () => { await page.keyboard.press('Escape'); await L.sleep(300); await page.evaluate(() => { try { LowiHomeBloomsV2.close && LowiHomeBloomsV2.close(); } catch (e) {} try { LowiR2.closeAll(); } catch (e) {} }); await L.sleep(1300); };
  const state = () => page.evaluate(() => { const s = JSON.parse(localStorage.getItem('lowispike.v2') || '{}'); const wk = Object.keys(localStorage).filter(k => /water|hydra|sleep/i.test(k)).map(k => k + ':' + localStorage.getItem(k).slice(0, 80)); const hv = document.getElementById('whPad'); return { led: (s.ledger || []).map(x => x.label), w: wk.join(' | ').slice(0, 300), bloom: !!document.querySelector('#hb2Bloom.on'), home: !!(hv && hv.getBoundingClientRect().width && document.elementFromPoint(innerWidth / 2, innerHeight / 2) && !document.querySelector('.sec-page.on,.r2-ov.on,[aria-modal=true]:not(#hb2Bloom)')), sleep: (() => { try { return JSON.stringify((window.LowiVitalsBridge && LowiVitalsBridge.read && LowiVitalsBridge.read().sleepDays) || null).slice(-60); } catch (e) { return 'x'; } })() }; });
  let bad = 0;
  const KS = process.env.KINDS ? process.env.KINDS.split(',') : await page.evaluate(() => [...document.querySelectorAll('[data-orbit]')].map(e => e.getAttribute('data-orbit')));
  for (const k of KS) {
    await reset();
    const c = await page.evaluate(k => { const b = document.querySelector('[data-orbit="' + k + '"]').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, k);
    await page.evaluate(([x, y]) => { window.__stack = []; const mo = new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.id === 'hb2Bloom') { mo.disconnect(); const t0 = performance.now();
      for (const d of [0, 30, 60, 100, 150, 250, 400]) setTimeout(() => window.__stack.push(Math.round(performance.now() - t0) + 'ms ' + window.__nm(document.elementFromPoint(x, y))), d); } }); mo.observe(document.body, { childList: true }); }, [c.x, c.y]);
    await L.tap(h, c.x, c.y); await L.sleep(1500);
    const stack = await page.evaluate(() => window.__stack);
    await reset(); const s0 = await state(); await page.evaluate(() => { window.__clk = []; window.__born = 0; });
    await L.tap(h, c.x, c.y); await page.waitForFunction(() => document.querySelector('#hb2Bloom') || (document.querySelector('#ss2Bloom') && document.querySelector('#ss2Bloom').children.length), null, { timeout: 5000 }).catch(() => {}); await L.tap(h, c.x, c.y); await L.sleep(1500);
    const s1 = await state(); const clk = await page.evaluate(() => window.__clk);
    const fired = clk.filter(x => /^(act|ss2)\//.test(x)); const acted = fired.length && (!s1.bloom || s1.led.length !== s0.led.length || s1.sleep !== s0.sleep);
    if (acted) bad++;
    console.log(JSON.stringify({ bubble: k, underFinger: stack, clicks: clk, orbFired: fired, acted: !!acted, bloomOpenAfter: s1.bloom, sleepChanged: s1.sleep !== s0.sleep, ledger: s1.led.length !== s0.led.length ? s1.led : undefined, storage: s1.w !== s0.w ? [s0.w, s1.w] : undefined }));
  }
  const e = await L.snap(h); console.log('RESULT ' + (bad ? 'BAD ' + bad : 'OK') + ' errors ' + JSON.stringify(e.err.concat(e.rej, h.log.pageerror)));
  await h.browser.close(); if (h.srv) h.srv.close();
})();
