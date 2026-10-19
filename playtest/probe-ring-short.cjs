'use strict';
/* Oct 19 old-design purge round 4: on a short screen (a phone on its side) Home keeps the 8-bubble ring instead of the old Home.
   node playtest/probe-ring-short.cjs [--url URL] [--shots DIR]
   For each size: the ring is on, all 8 controls are on screen, none overlaps another or Misty, and the old Home chrome
   (greeting, tab bar, Daily Quest card, VR, world map button) is not visible. Exit 1 on any failure. */
const path = require('path'), fs = require('fs');
const L = require(process.env.BH_LIB || '/home/sprite/BUGHUNT/playtest/lib.cjs');
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const SHOTS = arg('--shots');
const SIZES = [['chromium', 568, 320], ['chromium', 480, 320], ['chromium', 640, 360], ['chromium', 390, 844], ['webkit', 568, 320]];
(async () => {
  let url = arg('--url'), server = null;
  if (!url) { server = await L.serve(path.resolve(__dirname, '..')); url = 'http://127.0.0.1:' + server.address().port + '/'; }
  const fails = [], rows = [];
  for (const [eng, w, h] of SIZES) {
    const name = eng + '-' + w + 'x' + h;
    L.VIEWS[name] = [eng, { viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: eng === 'chromium' }];
    const x = await L.open({ url, view: name, settle: 7000 });
    const r = await x.page.evaluate(() => {
      const H = document.documentElement, $ = s => document.querySelector(s);
      const vis = e => { if (!e) return false; const s = getComputedStyle(e), b = e.getBoundingClientRect(); return b.width > 4 && b.height > 4 && s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0.05 && b.bottom > 0 && b.top < innerHeight && b.right > 0 && b.left < innerWidth; };
      const sel = { fuel: '#whHud .wh-meals', water: '#whHud .wh-water', move: '#whHud .wh-move', gap: '#spFast', joy: '#whPad', scan: '#whHud .o8-scan', sleep: '#whHud .o8-sleep', settings: '#whHud .o8-settings' };
      const rect = e => { const b = e.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom, w: b.width }; };
      const ctl = {}; for (const k in sel) { const e = $(sel[k]); ctl[k] = e && vis(e) ? rect(e) : null; }
      const m = $('#spBubble'), mr = m ? m.getBoundingClientRect() : null;
      const old = { greeting: '.sp-greeting', tabbar: '#tabbar', quest: '.f3-hd', vr: '.wh-vr', worldmap: '.wh-zoom', weather: '.sp-weather', today: '.wh-todaybtn' };
      const oldVis = Object.keys(old).filter(k => vis($(old[k])));
      return { o8: H.classList.contains('o8'), ctl, misty: mr && { cx: mr.left + mr.width / 2, cy: mr.top + mr.height / 2, r: mr.width / 2 }, oldVis, d: getComputedStyle(H).getPropertyValue('--o8-d').trim(), vw: innerWidth, vh: innerHeight };
    });
    if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await x.page.screenshot({ path: path.join(SHOTS, 'ring-' + name + '.png') }); }
    const f = [];
    if (!r.o8) f.push('ring is off (old Home)');
    if (r.oldVis.length) f.push('old Home visible: ' + r.oldVis.join(','));
    const ks = Object.keys(r.ctl);
    for (const k of ks) {
      const c = r.ctl[k]; if (!c) { f.push(k + ' not visible'); continue; }
      if (c.l < -1 || c.t < -1 || c.r > r.vw + 1 || c.b > r.vh + 1) f.push(k + ' off screen');
      if (k !== 'joy' && c.w < 43) f.push(k + ' smaller than a 44px tap (' + Math.round(c.w) + ')');
      if (r.misty) { const cx = (c.l + c.r) / 2, cy = (c.t + c.b) / 2, rr = c.w / 2; if (Math.hypot(cx - r.misty.cx, cy - r.misty.cy) < r.misty.r + rr - 2) f.push(k + ' overlaps Misty'); }
    }
    for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) {
      const a = r.ctl[ks[i]], b = r.ctl[ks[j]]; if (!a || !b) continue;
      const ox = Math.min(a.r, b.r) - Math.max(a.l, b.l), oy = Math.min(a.b, b.b) - Math.max(a.t, b.t);
      if (ox > 3 && oy > 3) f.push(ks[i] + ' overlaps ' + ks[j]);
    }
    x.log.pageerror.slice(0, 3).forEach(e => f.push('page error: ' + e));
    rows.push({ view: name, o8: r.o8, d: r.d, fails: f });
    f.forEach(s => fails.push(name + ': ' + s));
    await x.browser.close();
  }
  console.log(JSON.stringify({ url, rows, fails }, null, 1));
  if (server) server.close();
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
