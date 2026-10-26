/* Run 24: replay probe-pinch seed 24 bursts 0-4 and catch who calls goTab('move') (stack), plus the tab after each burst. */
'use strict';
const L = require('./lib.cjs');
(async () => {
  const url = process.argv[2] || 'https://therealetm.github.io/lowispike/';
  const h = await L.open({ view: 'chromium390', url, settle: 8000 }); const { page } = h; const cdp = await h.ctx.newCDPSession(page);
  const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p[0], y: p[1], id: i, radiusX: 4, radiusY: 4, force: 1 })) });
  const cx = 195, cy = 420;
  async function pinch(from, to, steps, opts = {}) { const pts = d => [[cx - d / 2, cy], [cx + d / 2, cy]]; await T('touchStart', pts(from));
    for (let i = 1; i <= steps; i++) { const d = from + (to - from) * i / steps; if (opts.third && i === Math.floor(steps / 2)) { await T('touchMove', pts(d).concat([[cx, cy + 120]])); await L.sleep(16); } await T('touchMove', pts(d)); await L.sleep(opts.ms || 16); if (opts.cut && i === Math.floor(steps * opts.cut)) { await T('touchCancel', []); return; } }
    await T('touchEnd', []); }
  await page.evaluate(() => { window.__gt = []; const g = window.goTab; window.goTab = function (t) { window.__gt.push(t + ' @ ' + (new Error().stack || '').split('\n').slice(2, 7).map(s => s.trim()).join(' | ')); return g.apply(this, arguments); };
    ['click', 'pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'touchend', 'touchcancel'].forEach(ev => document.addEventListener(ev, e => { const t = e.target; (window.__ev = window.__ev || []).push(ev + ':' + (t.id || String(t.className && t.className.baseVal != null ? t.className.baseVal : t.className).slice(0, 30)) + (e.pointerType ? '/' + e.pointerId + '@' + (e.clientX|0) : '')); }, true)); });
  const st = async tag => { const r = await page.evaluate(() => ({ tabs: [...document.querySelectorAll('.tab.active, [id^="tab-"].active')].map(e => e.id).join(','), gt: window.__gt.splice(0), ev: (window.__ev || []).splice(0).filter((x,i,a)=>i<8||!/pointermove/.test(x)||i%4==0).slice(0,60), cls: document.documentElement.className.split(' ').filter(c => /move|swipe|page|warp|zoom/i.test(c)).join(' ') })); console.log(tag, JSON.stringify(r).slice(0, 1800)); };
  if (!process.env.ALONE) { await pinch(72, 240, 8); await L.sleep(900); await st('b0');
  await pinch(107, 276, 16); await L.sleep(900); await st('b1');
  await pinch(78, 302, 22, { third: true }); await L.sleep(900); await st('b2'); }
  await pinch(251, 70, 22, { cut: 0.5 }); await L.sleep(900); await st('b3');
  await pinch(262, 135, 19, { cut: 0.5 }); await L.sleep(900); await st('b4');
  await h.browser.close();
})().catch(e => { console.error(String(e).slice(0, 300)); process.exit(2); });
