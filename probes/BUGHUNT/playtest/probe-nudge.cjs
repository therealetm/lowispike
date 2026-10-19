'use strict';
/* Misty's Home nudge (#mhNudge) vs the ring bubbles: does it cover them, and does a tap on a bubble land on the nudge? */
const L = require('./lib.cjs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
(async () => {
  const srv = arg('url', '') ? null : await L.serve(path.resolve(arg('root', '.')));
  const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`;
  const view = arg('view', 'chromium390');
  const h = await L.open({ url, view, settle: 1000, lang: arg('lang', 'en'), preInit: `try{localStorage.setItem('lowi.wh.hint.v1',JSON.stringify({travelled:1,opens:9}))}catch(e){}` }); const P = h.page;
  if (arg('force', '1') === '1') await P.evaluate(() => { /* a full sun is a real nudge trigger; force it so the nudge shows now */ window.LowiSun = window.LowiSun || {}; window.LowiSun.live = () => ({ full: true, away: false }); });
  const t0 = Date.now(); let res = null, coveredMs = 0, last = null, firstOn = null, tapped = null;
  while (Date.now() - t0 < +arg('ms', 40000)) {
    const s = await P.evaluate(() => {
      const n = document.getElementById('mhNudge'); if (!n || !n.classList.contains('on')) return { on: false, q: window.LowiMistyHub && LowiMistyHub.quiet() };
      const q = n.getBoundingClientRect(); const out = { on: true, txt: n.textContent.slice(0, 60), rect: [q.left, q.top, q.right, q.bottom].map(Math.round), hits: [], steals: [] };
      document.querySelectorAll('[data-orbit], #whPad').forEach(e => { const r = e.getBoundingClientRect(); if (!r.width) return; const k = 0.15, a = { l: r.left + r.width * k, r: r.right - r.width * k, t: r.top + r.height * k, b: r.bottom - r.height * k };
        const ov = Math.max(0, Math.min(a.r, q.right) - Math.max(a.l, q.left)) * Math.max(0, Math.min(a.b, q.bottom) - Math.max(a.t, q.top)); const key = e.getAttribute('data-orbit') || e.id; if (ov > 30) out.hits.push(key + ':' + Math.round(ov));
        /* sample a 5x5 grid over the bubble's inner square: how many points does the nudge take? */
        let st = 0; for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) { const x = a.l + (a.r - a.l) * (i + 0.5) / 5, y = a.t + (a.b - a.t) * (j + 0.5) / 5; const at = document.elementFromPoint(x, y); if (at && (at === n || n.contains(at))) st++; } if (st) out.steals.push(key + ':' + st + '/25'); });
      return out;
    });
    const t = Date.now() - t0;
    if (s.on && firstOn == null) { firstOn = t; await P.screenshot({ path: `out/nudge-${view}.png` }).catch(() => { }); }
    if (s.on && s.hits.length) { if (last != null) coveredMs += t - last; last = t; if (!res || s.steals.length > (res.steals || []).length) res = Object.assign({ t }, s); } else last = null;
    if (arg('v', '') && (s.on || (t % 5000 < 300))) console.log((t / 1000).toFixed(1), JSON.stringify(s));
    if (s.on && arg('tap', '') && !tapped) { /* tap the Settings bubble centre while the nudge shows: what opens? */
      const key = arg('tapkey', 'settings'); const c = await P.evaluate(k => { const r = document.querySelector(`[data-orbit="${k}"]`).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * (+(new URLSearchParams(location.search).get('fy')) || 0.5) }; }, key);
      if (arg('fy', '')) { const r = await P.evaluate(k => { const q = document.querySelector(`[data-orbit="${k}"]`).getBoundingClientRect(); return [q.left, q.top, q.width, q.height]; }, key); c.x = r[0] + r[2] / 2; c.y = r[1] + r[3] * +arg('fy', '0.5'); }
      tapped = { at: [Math.round(c.x), Math.round(c.y)], key, hitEl: await P.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? (e.id || e.className.slice(0, 30)) : null; }, [c.x, c.y]) };
      await L.tap(h, c.x, c.y); await L.sleep(1500);
      tapped = Object.assign(tapped, await P.evaluate(() => ({ today: document.documentElement.classList.contains('wh-today-open') || !!(window.LowiWorldHome && LowiWorldHome.state && LowiWorldHome.state.today), html: document.documentElement.className.split(' ').filter(c => /open|today|hs2|sg-/.test(c)).join(' '), dlg: [...document.querySelectorAll('[role=dialog],.hs2-panel,.sg-open')].filter(e => e.getBoundingClientRect().width > 0).map(e => e.id || e.className.slice(0, 30)) })));
      break;
    }
    await L.sleep(200);
  }
  console.log('SUMMARY', JSON.stringify({ view, firstOn, coveredMs, worst: res, tapped, errs: h.log.pageerror }));
  await h.browser.close(); if (srv) srv.close();
})();
