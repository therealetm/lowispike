'use strict';
/* Praise toast (#lpPraise, "I'm so proud of you!") vs the ring bubbles, the joystick and Misty. Shows the line the way a logged
   action does (LowiPraise.praise('water')), samples where it lands for its reading time, and reports overlap per control.
   --world liver: fly into a world first and show it there (Misty flying). */
const L = require('./lib.cjs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
(async () => {
  const srv = arg('url', '') ? null : await L.serve(path.resolve(arg('root', '.')));
  const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`;
  const view = arg('view', 'chromium390');
  const h = await L.open({ url, view, settle: +arg('settle', 9000), lang: arg('lang', 'en'), preInit: `try{localStorage.setItem('lowi.wh.hint.v1',JSON.stringify({travelled:1,opens:9}))}catch(e){}` }); const P = h.page;
  const world = arg('world', '');
  if (world) {
    await P.evaluate(w => window.LowiWorldRegions.travel(w), world);
    await L.sleep(+arg('wait', 15000));
  }
  const rounds = +arg('rounds', 3), out = [];
  for (let k = 0; k < rounds; k++) {
    await P.evaluate(() => LowiPraise.praise('water', false));
    await L.sleep(450);
    const s = await P.evaluate(() => {
      const n = document.getElementById('lpPraise'); if (!n || !n.classList.contains('on')) return { on: false };
      const q = n.getBoundingClientRect(); const o = { txt: n.textContent.slice(0, 40), rect: [q.left, q.top, q.right, q.bottom].map(Math.round), cls: n.className, hits: [] };
      document.querySelectorAll('[data-orbit], #whPad, #spBubble').forEach(e => {
        const r = e.getBoundingClientRect(); if (r.width < 4) return; const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return;
        if (e.checkVisibility && !e.checkVisibility({ opacityProperty: true }) && e.id !== 'whPad') return;
        const k = 0.15, a = { l: r.left + r.width * k, r: r.right - r.width * k, t: r.top + r.height * k, b: r.bottom - r.height * k };
        const ov = Math.max(0, Math.min(a.r, q.right) - Math.max(a.l, q.left)) * Math.max(0, Math.min(a.b, q.bottom) - Math.max(a.t, q.top));
        const area = (a.r - a.l) * (a.b - a.t); if (ov > 30) o.hits.push((e.getAttribute('data-orbit') || e.id) + ':' + Math.round(100 * ov / area) + '%');
      });
      o.world = document.documentElement.className.split(' ').filter(c => /bw3|world|flight|cosmos/.test(c)).join(' ');
      return o;
    });
    out.push(s); if (k === 0) await P.screenshot({ path: path.join(__dirname, 'out', `praise-${view}${world ? '-' + world : ''}.png`) }).catch(() => { });
    await L.sleep(5200);
  }
  const bad = out.filter(s => s.on !== false && s.hits.length);
  console.log('SUMMARY', JSON.stringify({ view, world, verdict: bad.length ? 'FAIL' : 'PASS', samples: out, errs: h.log.pageerror, bh: await L.snap(h) }));
  await h.browser.close(); if (srv) srv.close();
})();
