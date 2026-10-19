'use strict';
/* Move bloom note (p.hb2-note "Estimate, not steps") vs the ring bubbles (incl. Move itself), the bloom's own orbs, the joystick,
   Misty and the screen edge. Opens the Move bloom the way a tap does (LowiHomeBloomsV2.open('move')) and measures where the note lands.
   --tap 1: tap the Move bubble instead of calling open(). */
const L = require('./lib.cjs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
(async () => {
  const srv = arg('url', '') ? null : await L.serve(path.resolve(arg('root', '.')));
  const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`;
  const view = arg('view', 'chromium390');
  const h = await L.open({ url, view, settle: +arg('settle', 9000), lang: arg('lang', 'en'), preInit: `try{localStorage.setItem('lowi.wh.hint.v1',JSON.stringify({travelled:1,opens:9}))}catch(e){}` }); const P = h.page;
  const rounds = +arg('rounds', 2), out = [];
  for (let k = 0; k < rounds; k++) {
    if (arg('tap', '0') === '1') { const c = await L.center(h, '[data-orbit="move"]'); if (c) await L.tap(h, c.x, c.y); }
    else await P.evaluate(() => window.LowiHomeBloomsV2 && LowiHomeBloomsV2.open('move'));
    await L.sleep(900);
    const s = await P.evaluate(() => {
      const n = document.querySelector('#hb2Bloom .hb2-note'); if (!n) return { note: false, open: !!document.getElementById('hb2Bloom') };
      const q = n.getBoundingClientRect(); const vw = innerWidth, vh = innerHeight;
      const o = { txt: n.textContent.slice(0, 50), rect: [q.left, q.top, q.right, q.bottom].map(Math.round), cls: n.className, hits: [], off: [] };
      if (q.left < 0) o.off.push('left'); if (q.right > vw) o.off.push('right'); if (q.top < 0) o.off.push('top'); if (q.bottom > vh) o.off.push('bottom');
      const hit = (e, name, inset) => {
        const r = e.getBoundingClientRect(); if (r.width < 4) return; const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return;
        const k = inset, a = { l: r.left + r.width * k, r: r.right - r.width * k, t: r.top + r.height * k, b: r.bottom - r.height * k };
        const ov = Math.max(0, Math.min(a.r, q.right) - Math.max(a.l, q.left)) * Math.max(0, Math.min(a.b, q.bottom) - Math.max(a.t, q.top));
        const area = (a.r - a.l) * (a.b - a.t); if (ov > 30) o.hits.push(name + ':' + Math.round(100 * ov / area) + '%');
      };
      document.querySelectorAll('[data-orbit], #whPad').forEach(e => hit(e, e.getAttribute('data-orbit') || e.id, 0.15));
      document.querySelectorAll('#hb2Bloom .hb2-orb').forEach(e => hit(e, 'orb-' + e.dataset.id, 0.1));
      return o;
    });
    out.push(s); if (k === 0) await P.screenshot({ path: path.join(__dirname, 'out', `movenote-${view}.png`) }).catch(() => { });
    await P.evaluate(() => window.LowiHomeBloomsV2 && LowiHomeBloomsV2.close && LowiHomeBloomsV2.close(true));
    await L.sleep(800);
  }
  const bad = out.filter(s => s.note === false || s.hits.length || (s.off && s.off.length));
  console.log('SUMMARY', JSON.stringify({ view, verdict: bad.length ? 'FAIL' : 'PASS', samples: out, errs: h.log.pageerror, bh: await L.snap(h) }));
  await h.browser.close(); if (srv) srv.close();
})();
