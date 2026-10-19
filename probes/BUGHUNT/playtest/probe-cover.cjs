'use strict';
/* Sibling hunt for BH-001: every 250 ms, find every visible floating text box (fixed/absolute, has its own text, smaller than a panel)
   and check it against the controls: the 8 orbit bubbles, the joystick (#whPad) and Misty. Aggregates covered time per (box, control).
   Phases: home idle, each bubble opened, a world visit. Usage: node probe-cover.cjs [--root DIR | --url URL] [--view chromium390] [--world liver] */
const L = require('./lib.cjs'), path = require('path'), fs = require('fs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const SAMPLE = () => {
  const vis = e => { let n = e, op = 1; while (n && n.nodeType === 1) { const c = getComputedStyle(n); if (c.display === 'none' || c.visibility === 'hidden') return 0; op *= +c.opacity; n = n.parentElement; } return op; };
  const R = e => { const q = e.getBoundingClientRect(); return { l: q.left, t: q.top, r: q.right, b: q.bottom, w: q.width, h: q.height }; };
  const IN = r => { const k = 0.15; return { l: r.l + r.w * k, r: r.r - r.w * k, t: r.t + r.h * k, b: r.b - r.h * k, w: r.w * 0.7, h: r.h * 0.7 }; }; /* round controls: inscribed square */
  const ov = (a, b) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));
  const sig = e => (e.id ? '#' + e.id : e.tagName.toLowerCase()) + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  const ctrls = [];
  document.querySelectorAll('[data-orbit]').forEach(e => { const o = vis(e); const r = R(e); if (o > 0.3 && r.w > 8 && r.b > 0 && r.t < innerHeight) ctrls.push({ k: 'orbit:' + e.getAttribute('data-orbit'), e, r: IN(r) }); });
  const pad = document.getElementById('whPad'); if (pad && !ctrls.some(c => c.e === pad || c.e.contains(pad) || pad.contains(c.e))) { const r = R(pad); if (vis(pad) > 0.3 && r.w > 8) ctrls.push({ k: 'whPad', e: pad, r: IN(r) }); }
  const m = document.getElementById('spBubble'); if (m && vis(m) > 0.3) { const r = R(m); const cx = (r.l + r.r) / 2, cy = (r.t + r.b) / 2, s = Math.min(r.w, r.h) * 0.3; ctrls.push({ k: 'misty', e: m, r: { l: cx - s, r: cx + s, t: cy - s, b: cy + s } }); }
  const W = innerWidth, H = innerHeight, hits = [];
  const all = document.body.querySelectorAll('*');
  for (const e of all) {
    if (e.closest('svg') && e.tagName.toLowerCase() !== 'svg') continue; if (m && (e === m || m.contains(e))) continue;
    const cs = getComputedStyle(e); if (cs.position !== 'fixed' && cs.position !== 'absolute') continue;
    let own = ''; for (const n of e.childNodes) if (n.nodeType === 3) own += n.textContent; own = own.trim(); if (own.length < 2 && !(e.querySelector && e.children.length && e.textContent.trim().length > 6 && e.children.length < 6)) continue;
    const r = R(e); if (r.w < 20 || r.h < 10 || r.w * r.h > W * H * 0.35 || r.b < 0 || r.t > H || r.r < 0 || r.l > W) continue;
    const o = vis(e); if (o < 0.25) continue;
    for (const c of ctrls) { if (c.e === e || c.e.contains(e) || e.contains(c.e)) continue; if (e.closest('[data-orbit]') && c.k.startsWith('orbit')) continue; const a = ov(r, c.r); if (a < 40) continue; const frac = a / Math.min(c.r.w * c.r.h, r.w * r.h); if (frac < 0.08) continue; hits.push({ box: sig(e), txt: (own || e.textContent).trim().slice(0, 50), ctrl: c.k, frac: +frac.toFixed(2), op: +o.toFixed(2), rect: [r.l, r.t, r.r, r.b].map(Math.round) }); }
  }
  let cur = null; try { cur = LowiWorldRegions.current(); } catch (e) { }
  return { hits, cur, html: document.documentElement.className.split(' ').filter(c => /wh-|bw|lw-|rp-|hb2-open|sg-/.test(c)).join(' ') };
};
(async () => {
  const view = arg('view', 'chromium390');
  const srv = arg('url', '') ? null : await L.serve(path.resolve(arg('root', '.')));
  const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`;
  const h = await L.open({ url, view, settle: 6000, lang: arg('lang', 'en') }); const P = h.page;
  const agg = {}; let phase = 'home-idle';
  const sample = async (ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const s = await P.evaluate(SAMPLE).catch(e => ({ hits: [], err: e.message })); for (const x of s.hits) { const k = phase + ' | ' + x.box + ' -> ' + x.ctrl; const a = agg[k] || (agg[k] = { n: 0, maxFrac: 0, txt: x.txt, rect: x.rect, html: s.html, cur: s.cur }); a.n++; if (x.frac > a.maxFrac) { a.maxFrac = x.frac; a.rect = x.rect; a.txt = x.txt; } if (a.n === 1 && process.env.SHOT) { fs.mkdirSync('out/cover', { recursive: true }); await P.screenshot({ path: `out/cover/${view}-${Object.keys(agg).length}.png` }).catch(() => { }); a.shot = `out/cover/${view}-${Object.keys(agg).length}.png`; } } await L.sleep(250); } };
  await sample(+arg('idle', 15000));
  const KEYS = ['settings', 'water', 'move', 'scan', 'sleep', 'gap', 'fuel'];
  for (const k of KEYS) { phase = 'open-' + k; const c = await L.center(h, `[data-orbit="${k}"]`); if (!c) { agg[phase + ' | missing'] = { n: 1 }; continue; } await L.tap(h, c.x, c.y); await sample(3500); for (let i = 0; i < 3; i++) { await P.keyboard.press('Escape').catch(() => { }); await L.sleep(250); } await L.sleep(800); }
  if (arg('world', 'liver') !== 'none') { phase = 'world-' + arg('world', 'liver'); await P.evaluate(t => LowiWorldRegions.travel(t), arg('world', 'liver')); await sample(+arg('ms', 40000)); }
  const out = Object.entries(agg).sort((a, b) => b[1].n - a[1].n);
  for (const [k, v] of out) console.log(String(v.n * 0.25).padStart(5) + 's', k, JSON.stringify(v));
  console.log('SUMMARY', JSON.stringify({ view, pairs: out.length, errs: h.log.pageerror, bh: await L.snap(h).catch(() => null) }));
  await h.browser.close(); if (srv) srv.close();
})();
