'use strict';
/* Design audit screenshots (21 Oct 2026). One primary question per work screen: does the screen answer it at a glance?
   Takes local WebKit screenshots (not a physical device) of the Gap (fasting) bubble and sheet, Scan and Community at
   phone and iPad sizes, in the states the audit cares about: running fast, no meal known, offline. Uses the interface-audit
   harness (local fixture user, every non-Pages request blocked, nothing written to production).
   Known gap: the Community scenes call goTab('community'); on world-first Home the measurements still read the Home
   layer (21 Oct run), so treat those two scenes as not yet working.
   Usage: node tools/design-audit/shots.cjs [--out DIR] [--device "iPhone 13"] [--only name,name] */
const fs = require('fs'), path = require('path');
const L = require('../interface-audit/lib.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const OUT = arg('out', '/home/sprite/design-audit-shots');
const DEVICES = (arg('device', 'iPhone 13,iPhone SE,iPad Pro 11')).split(',');
const ONLY = (arg('only', '') || '').split(',').filter(Boolean);
fs.mkdirSync(OUT, { recursive: true });

const H = 36e5;
function fastKv(o) {
  const now = Date.now();
  if (o === 'none') return { lowi_fast_v1: JSON.stringify({ noGuess: 1, water: {}, hist: [] }) };
  const hours = +o || 10.5;
  return { lowi_fast_v1: JSON.stringify({ noGuess: 1, last: now - hours * H, target: 16, water: {}, hist: [{ s: now - 50 * H, e: now - 34 * H, h: 16, g: 16, ok: true, xp: 72 }] }) };
}

const SCENES = [
  { name: 'home-fast', fast: 10.5, run: async () => {} },
  { name: 'home-nomeal', fast: 'none', run: async () => {} },
  { name: 'gap-sheet', fast: 10.5, run: async h => { await h.page.evaluate(() => window.LowiFastStop && LowiFastStop.open()); await L.sleep(1400); } },
  { name: 'gap-sheet-nomeal', fast: 'none', run: async h => { await h.page.evaluate(() => window.LowiFastStop && LowiFastStop.open()); await L.sleep(1400); } },
  { name: 'community', fast: 10.5, run: async h => { await h.page.evaluate(() => goTab('community')); await L.sleep(3500); } },
  { name: 'community-offline', fast: 10.5, offline: true, run: async h => { await h.page.evaluate(() => goTab('community')); await L.sleep(3500); } },
];

(async () => {
  const report = [];
  for (const device of DEVICES) {
    for (const sc of SCENES) {
      if (ONLY.length && !ONLY.includes(sc.name)) continue;
      const seed = L.existingSeed({});
      Object.assign(seed.kv, fastKv(sc.fast));
      const h = await L.launch({ device, seed });
      try {
        if (sc.offline) await h.setOffline(false);
        await L.openApp(h, { settle: 4500 });
        if (sc.offline) { await h.setOffline(true); await h.page.evaluate(() => window.dispatchEvent(new Event('offline'))); }
        await sc.run(h);
        const f = path.join(OUT, device.replace(/\s+/g, '') + '-' + sc.name + '.png');
        await h.page.screenshot({ path: f });
        const gap = await h.page.evaluate(() => { const g = document.querySelector('#spFast'); return g ? { text: g.innerText.replace(/\s+/g, ' ').trim(), aria: g.getAttribute('aria-label') || '' } : null; });
        const sheet = await h.page.evaluate(() => { const s = document.querySelector('.fst-sh'); return s ? s.innerText.replace(/\s+/g, ' ').trim().slice(0, 400) : null; });
        const measure = await h.page.evaluate(() => {
          const vis = e => { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.05) return false; const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1 && r.bottom > 0 && r.top < innerHeight; };
          const rgb = c => (c.match(/[\d.]+/g) || []).map(Number);
          const lum = a => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(a[0]) + .7152 * f(a[1]) + .0722 * f(a[2]); };
          const out = { vw: innerWidth, vh: innerHeight, primary: null, smallTargets: [], tinyText: [], overflowX: document.documentElement.scrollWidth > innerWidth + 1 };
          const go = document.querySelector('.fst-sh .fst-go');
          if (go) { const r = go.getBoundingClientRect(); out.primary = { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height), inView: r.bottom <= innerHeight && r.top >= 0 }; }
          const scope = document.querySelector('.fst-sh') || document.querySelector('#tab-community.on, section.on') || document.body;
          [...scope.querySelectorAll('button,a[href],[role=button],input,select')].filter(vis).forEach(e => { const r = e.getBoundingClientRect(); if (r.width < 40 || r.height < 40) out.smallTargets.push({ name: (e.getAttribute('aria-label') || e.innerText || e.id || e.className || '').toString().slice(0, 40).replace(/\s+/g, ' '), w: Math.round(r.width), h: Math.round(r.height) }); });
          [...scope.querySelectorAll('p,span,small,div,i,em,b,label')].filter(e => vis(e) && e.childElementCount === 0 && e.textContent.trim().length > 2).forEach(e => { const s = getComputedStyle(e), fs = parseFloat(s.fontSize); const c = rgb(s.color); const a = c.length > 3 ? c[3] : 1; if (fs < 12 || a < 0.6 || +s.opacity < 0.7) out.tinyText.push({ t: e.textContent.trim().slice(0, 50), fs, color: s.color, op: s.opacity }); });
          out.smallTargets = out.smallTargets.slice(0, 15); out.tinyText = out.tinyText.slice(0, 15);
          return out;
        });
        report.push({ device, scene: sc.name, file: f, gap, sheet, measure, errors: h.errors.slice(0, 5) });
      } catch (e) { report.push({ device, scene: sc.name, error: String(e && e.message || e).slice(0, 300) }); }
      await h.browser.close();
    }
  }
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
  console.log(JSON.stringify(report, null, 1));
})();
