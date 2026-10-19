'use strict';
/* enter a world, sample every 250 ms: the guide's speech bubble vs the joystick and Misty */
const L = require('./lib.cjs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
(async () => {
  const srv = arg('url', '') ? null : await L.serve(path.resolve(arg('root', '.')));
  const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`;
  const h = await L.open({ url, view: arg('view', 'chromium390'), settle: 5000 }); const P = h.page;
  const S = () => P.evaluate(() => {
    const R = e => { if (!e) return null; const q = e.getBoundingClientRect(); const c = getComputedStyle(e); return q.width > 2 ? [Math.round(q.left), Math.round(q.top), Math.round(q.right), Math.round(q.bottom), +(+c.opacity).toFixed(2), c.visibility[0]] : null; };
    const ov = (a, b) => a && b ? Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1])) : 0;
    const says = Array.from(document.querySelectorAll('.rp-talk .rp-say')).map(R).filter(Boolean);
    const joys = Array.from(document.querySelectorAll('#whPad, [data-orbit="joy"], .wh-pad, #hb2Joy')).map(e => { let op = 1, n = e; while (n && n.nodeType === 1) { op *= +getComputedStyle(n).opacity; n = n.parentElement; } return { k: e.id || e.getAttribute('data-orbit') || e.className.slice(0, 20), r: R(e), cv: e.checkVisibility ? e.checkVisibility({ opacityProperty: true, visibilityProperty: true }) : null, op: +op.toFixed(2), clean: document.documentElement.classList.contains('lw-clean') }; }).filter(x => x.r);
    const m = window.LowiMistyFlight && LowiMistyFlight.screen ? LowiMistyFlight.screen() : null;
    let hit = 0; for (const s of says) for (const j of joys) hit = Math.max(hit, ov(s, j.r));
    let diag = null;
    if (hit > 0 && window.LowiRegionPalsCore) { const C = LowiRegionPalsCore; const orb = document.querySelector('.rp-talk .rp-orb'); const say = document.querySelector('.rp-talk .rp-say');
      if (orb && say) { const o = orb.getBoundingClientRect(); const pal = { x: o.left + o.width / 2, y: o.top + o.height / 2 }; const b = { w: say.offsetWidth, h: say.offsetHeight };
        const AV = '#f3Board, #hcLine.on, #hqSlot.arr-on, #tab-home .sp-top, #whHud button, #whHud .wh-water, #spFast, #whPad, #tabbar, .wh-hint.wh-say, #lpPraise.on, .bw3-full button, [data-guide-avoid]';
        const obs = []; document.querySelectorAll(AV).forEach(e => { if (say.contains(e)) return; const q = e.getBoundingClientRect(); if (q.width < 4 || q.height < 4 || q.bottom < 0 || q.top > innerHeight) return; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity <= 0.05) return; obs.push({ l: q.left - 6, t: q.top - 6, r: q.right + 6, b: q.bottom + 6, w: C.QUEST_IDS.indexOf(e.id) >= 0 ? C.QUEST_W : 2, k: e.id || e.className.slice(0, 14) }); });
        if (m) obs.push({ l: m.x - 46, t: m.y - 46, r: m.x + 46, b: m.y + 46, w: 4, k: 'misty' });
        const view = { w: innerWidth, h: innerHeight, top: 6, bottom: 6 }; const gap = C.gapFor(o.width / 2);
        diag = { pal: [Math.round(pal.x), Math.round(pal.y)], b, obs: obs.map(x => x.k + ':' + [x.l, x.t, x.r, x.b].map(Math.round).join(',')), spots: C.SPOTS.map(sp => { const q = C.spotRect(sp, pal, b, view, gap); const per = obs.map(x => x.k + '=' + Math.round(C.overlap(q, x) * (x.w || 1))).filter(t => !/=0$/.test(t)); const out = Math.max(0, 6 - q.t) + Math.max(0, q.b - view.h + 6); return sp + ' ' + per.join(' ') + (out ? ' out=' + Math.round(out) : ''); }) }; } }
    return { diag, cur: (() => { try { return LowiWorldRegions.current(); } catch (e) { return null; } })(), says, joys, m: m && [Math.round(m.x), Math.round(m.y)], hit, html: document.documentElement.className.split(' ').filter(c => /lw-clean|rp-|wh-away|bwr/.test(c)).join(' ') };
  });
  await P.evaluate(() => { const C = window.LowiRegionPalsCore, o = C.place; window.__pl = []; C.place = function (pal, b, obs, view, prev, gap) { const r = o.apply(this, arguments); const pad = document.getElementById('whPad'); if (pad && r) { const q = pad.getBoundingClientRect(); const ov = C.overlap({ l: r.l, t: r.t, r: r.l + b.w, b: r.t + b.h }, { l: q.left, t: q.top, r: q.right, b: q.bottom }); if (ov > 0 && window.__pl.length < 6) window.__pl.push({ ov, r: [r.l, r.t, r.spot, r.score].map(x => typeof x === 'number' ? Math.round(x) : x), prev, pal: [pal.x, pal.y].map(Math.round), b, obs: obs.map(x => (x.k || 'w' + x.w) + ':' + [x.l, x.t, x.r, x.b].map(Math.round).join(',')) }); } return r; }; });
  const target = arg('world', 'liver');
  await P.evaluate(t => LowiWorldRegions.travel(t), target);
  const t0 = Date.now(); let worst = 0, overlapMs = 0, last = null, firstTalk = null;
  while (Date.now() - t0 < +arg('ms', 40000)) {
    const s = await S(); const t = Date.now() - t0;
    if (s.says.length && firstTalk == null) firstTalk = t;
    if (s.hit > 0) { overlapMs += last == null ? 0 : t - last; worst = Math.max(worst, s.hit); console.log((t / 1000).toFixed(1), 'OVERLAP', s.hit, JSON.stringify(s)); if (!process.env.NOSHOT && worst === s.hit) await P.screenshot({ path: `out/guide-joy-${arg('view', 'chromium390')}.png` }); }
    else if (s.says.length && arg('v', '')) console.log((t / 1000).toFixed(1), 'ok', JSON.stringify(s));
    last = s.hit > 0 ? t : null;
    await L.sleep(250);
  }
  console.log('PLACE', JSON.stringify(await P.evaluate(() => window.__pl), null, 0));
  console.log('SUMMARY', JSON.stringify({ view: arg('view', 'chromium390'), firstTalk, worst, overlapMs, errs: h.log.pageerror }));
  await h.browser.close(); if (srv) srv.close();
})();
