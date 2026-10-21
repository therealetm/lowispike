'use strict';
/* Polish audit: visit the main surfaces and record what a visitor sees drifting from page to page: button corner radii,
   fonts, border colours, visible emoji used as icons, headings, images without alt, sideways scroll, raw error text
   (undefined, NaN, null, [object Object]). Screenshot per surface. Fixture user, nothing written. Not a physical device.
   Usage: node tools/polish-audit/consistency.cjs [--out DIR] [--device "iPhone 13"] */
const fs = require('fs'), path = require('path');
const L = require('../interface-audit/lib.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const OUT = arg('out', '/home/sprite/polish-audit-shots/before');
const DEVICE = arg('device', 'iPhone 13');
const VP = arg('vp', '');
fs.mkdirSync(OUT, { recursive: true });
const tag = DEVICE.replace(/\W+/g, '').toLowerCase() + (VP ? '-' + VP : '');

const ring = n => async p => { await L.tap(p, 'button.wh-cell[aria-label^="' + n + '"]'); await L.sleep(2000); };
const row = n => async p => { await p.evaluate(n => { const b = [...document.querySelectorAll('.ss2-row')].find(e => e.innerText.trim() === n); if (b) b.click(); }, n); await L.sleep(1800); };
const SURFACES = {
  home: [],
  settings: [ring('Settings')],
  me: [ring('Settings'), row('Me')],
  weight: [ring('Settings'), row('Weight & BMI')],
  look: [ring('Settings'), row('Look & sound')],
  account: [ring('Settings'), row('Account')],
  fuel: [ring('Fuel')],
  sleep: [ring('Sleep')],
  scan: [ring('Scan')],
  community: [async p => { await p.evaluate(() => goTab('foryou')); await L.sleep(3500); }],
};

async function measure(page) {
  return page.evaluate(() => {
    const vis = e => { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.05) return false; const r = e.getBoundingClientRect(); if (!(r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth)) return false; const hit = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), Math.min(innerHeight - 1, Math.max(0, r.top + Math.min(r.height / 2, 10)))); return !!hit && (hit === e || e.contains(hit) || hit.contains(e)); };
    const btns = [...document.querySelectorAll('button,[role=button],a[href]')].filter(vis);
    const tally = f => { const m = {}; btns.forEach(b => { const k = f(getComputedStyle(b), b); m[k] = (m[k] || 0) + 1; }); return m; };
    const emo = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}]/u;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const emojis = [], raw = [];
    let n; while ((n = walker.nextNode())) { const t = n.nodeValue; if (!t.trim()) continue; const el = n.parentElement; if (!el || !vis(el)) continue; if (emo.test(t)) emojis.push(t.trim().slice(0, 40)); if (/\b(undefined|NaN|null|\[object Object\])\b/.test(t)) raw.push(t.trim().slice(0, 60)); }
    const heads = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(vis).map(h => h.tagName + ':' + h.innerText.trim().slice(0, 30));
    const fonts = {}; [...document.querySelectorAll('body *')].filter(e => e.childNodes.length && [...e.childNodes].some(c => c.nodeType === 3 && c.nodeValue.trim())).filter(vis).forEach(e => { const f = getComputedStyle(e).fontFamily.split(',')[0].replace(/"/g, '').trim(); fonts[f] = (fonts[f] || 0) + 1; });
    return {
      radius: tally(s => s.borderTopLeftRadius), font: tally(s => s.fontFamily.split(',')[0].replace(/"/g, '').trim()),
      border: tally(s => s.borderTopWidth === '0px' ? 'none' : s.borderTopColor), fonts, emojis: [...new Set(emojis)].slice(0, 30), raw,
      heads, overflowX: document.documentElement.scrollWidth > innerWidth + 1,
      imgsNoAlt: [...document.querySelectorAll('img')].filter(vis).filter(i => !i.hasAttribute('alt')).length,
    };
  });
}

(async () => {
  const out = {};
  for (const [name, steps] of Object.entries(SURFACES)) {
    const h = await L.launch({ device: DEVICE, viewport: VP ? { width: +VP.split('x')[0], height: +VP.split('x')[1] } : undefined });
    try {
      await L.openApp(h, { settle: 4500 });
      for (const s of steps) await s(h.page);
      await h.page.screenshot({ path: path.join(OUT, 'surf-' + name + '-' + tag + '.png') });
      out[name] = Object.assign(await measure(h.page), { errors: h.errors, consoleErr: h.consoleErr });
      console.log(name, JSON.stringify({ emo: out[name].emojis.length, raw: out[name].raw, heads: out[name].heads, ov: out[name].overflowX, err: h.errors.length + h.consoleErr.length }));
    } catch (e) { out[name] = { fail: String(e).slice(0, 200) }; console.log(name, 'FAIL', String(e).slice(0, 160)); }
    await h.browser.close();
  }
  fs.writeFileSync(path.join(OUT, 'consistency-' + tag + '.json'), JSON.stringify(out, null, 1));
})();
