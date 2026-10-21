'use strict';
/* Polish audit sweep (21 Oct 2026). Local WebKit/Chromium screenshots of the first-visit welcome and the signed-in Home at
   unusual sizes, plus the DOM facts a visitor notices: headings, images without alt, unnamed buttons, dead links, sideways
   scrolling, console errors and warnings. Uses the interface-audit harness (fixture user, every non-Pages request blocked).
   Not a physical device. Usage: node tools/polish-audit/sweep.cjs [--out DIR] [--only name] [--engine webkit|chromium] */
const fs = require('fs'), path = require('path');
const L = require('../interface-audit/lib.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const OUT = arg('out', '/home/sprite/polish-audit-shots/before');
const ONLY = (arg('only', '') || '').split(',').filter(Boolean);
const ENGINE = arg('engine', 'webkit');
fs.mkdirSync(OUT, { recursive: true });

const SIZES = [
  { name: 'w320', device: 'iPhone SE', viewport: { width: 320, height: 568 } },
  { name: 'iphone13', device: 'iPhone 13' },
  { name: 'phone-land', device: 'iPhone 13', viewport: { width: 844, height: 390 } },
  { name: 'ipad-port', device: 'iPad Pro 11' },
  { name: 'ipad-land', device: 'iPad Pro 11', viewport: { width: 1194, height: 834 } },
  { name: 'wide', device: 'Desktop Chrome', viewport: { width: 1920, height: 1080 } },
];
const SCENES = [
  { name: 'firstvisit', seed: 'new' },
  { name: 'home', seed: 'existing' },
];

async function facts(page) {
  return page.evaluate(() => {
    const vis = e => { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.05) return false; const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };
    const name = e => (e.getAttribute('aria-label') || e.getAttribute('title') || e.innerText || (e.querySelector('img[alt]') || {}).alt || '').trim();
    const heads = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6,[role=heading]')].filter(vis).map(h => h.tagName + ':' + h.innerText.trim().slice(0, 40));
    const imgs = [...document.querySelectorAll('img')].filter(vis).filter(i => !i.hasAttribute('alt')).map(i => (i.id || i.className || i.src.slice(0, 60)).toString().slice(0, 60));
    const unnamed = [...document.querySelectorAll('button,a[href],[role=button]')].filter(vis).filter(b => !name(b)).map(b => b.outerHTML.slice(0, 120));
    const dead = [...document.querySelectorAll('a')].filter(vis).filter(a => { const h = a.getAttribute('href'); return h === null || h === '#' || h === '' || /^javascript:/i.test(h); }).map(a => (a.innerText || a.outerHTML).slice(0, 60));
    return { title: document.title, vw: innerWidth, vh: innerHeight, overflowX: document.documentElement.scrollWidth > innerWidth + 1, heads, imgs, unnamed, dead };
  });
}

(async () => {
  const report = [];
  for (const sc of SCENES) for (const sz of SIZES) {
    const id = sc.name + '-' + sz.name;
    if (ONLY.length && !ONLY.some(o => id.includes(o))) continue;
    const opts = { device: sz.device, viewport: sz.viewport, engine: ENGINE };
    if (sc.seed === 'new') opts.seed = { kv: {}, session: {} };
    const h = await L.launch(opts);
    const warns = [];
    h.page.on('console', m => { if (m.type() === 'warning') warns.push(m.text().slice(0, 200)); });
    try {
      if (sc.seed === 'new') { await h.page.goto(L.BASE, { waitUntil: 'load', timeout: 120000 }); await L.sleep(7000); }
      else await L.openApp(h, { settle: 6000 });
      const f = path.join(OUT, id + '.png');
      await h.page.screenshot({ path: f });
      const fx = await facts(h.page);
      report.push({ id, f, ...fx, errors: h.errors, consoleErr: h.consoleErr, warns, blocked: h.blocked });
      console.log(id, JSON.stringify({ ov: fx.overflowX, heads: fx.heads.length, imgs: fx.imgs.length, unnamed: fx.unnamed.length, dead: fx.dead.length, err: h.errors.length, cerr: h.consoleErr.length, warn: warns.length }));
    } catch (e) { report.push({ id, fail: String(e).slice(0, 300) }); console.log(id, 'FAIL', String(e).slice(0, 200)); }
    await h.browser.close();
  }
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
})();
