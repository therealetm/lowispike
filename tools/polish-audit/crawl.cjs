'use strict';
/* Polish audit: find controls that look tappable but do nothing. Opens one surface, lists the visible, uncovered controls
   inside its top layer, taps each one and checks whether anything observable changed (layers, html classes, the top layer's
   text, focus, url, window.open, clipboard, a toast). After a tap that changed something the app is reloaded and the surface
   reopened, so every control is tested from the same state. Uses the interface-audit harness (fixture user, nothing written
   to production). Not a physical device.
   Usage: node tools/polish-audit/crawl.cjs <surface> [--device "iPhone 13"] [--out DIR] */
const fs = require('fs'), path = require('path');
const L = require('../interface-audit/lib.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const SURF = process.argv[2];
const DEVICE = arg('device', 'iPhone 13');
const OUT = arg('out', '/home/sprite/polish-audit-shots/crawl');
fs.mkdirSync(OUT, { recursive: true });

const ring = n => async h => { await L.tap(h.page, 'button.wh-cell[aria-label^="' + n + '"]'); await L.sleep(1800); };
const row = n => async h => { await h.page.evaluate(n => { const b = [...document.querySelectorAll('.ss2-page .ss2-row, .ss2-layer button')].find(e => e.innerText.trim() === n); if (b) b.click(); }, n); await L.sleep(1800); };
const ROUTES = {
  settings: [ring('Settings')],
  'settings-me': [ring('Settings'), row('Me')],
  'settings-weight': [ring('Settings'), row('Weight & BMI')],
  'settings-look': [ring('Settings'), row('Look & sound')],
  'settings-account': [ring('Settings'), row('Account')],
  'settings-menubar': [ring('Settings'), row('Menu bar')],
  scan: [ring('Scan')],
  fuel: [ring('Fuel')],
  sleep: [ring('Sleep')],
  water: [],
  companion: [async h => { await L.tap(h.page, '#spBubble'); await L.sleep(2200); }],
  community: [async h => { await h.page.evaluate(() => goTab('foryou')); await L.sleep(3500); }],
  home: [],
};
const SKIP = /delete|reset|sign out|log out|abmelden|remove|erase|wipe/i;

async function open(h) { await L.openApp(h, { settle: 4500 }); for (const s of ROUTES[SURF]) await s(h); }

async function setupHooks(h) {
  await h.ctx.addInitScript(() => {
    window.__opened = [];
    const o = window.open; window.open = function (u) { window.__opened.push(String(u)); return null; };
    document.addEventListener('click', e => { const a = e.target.closest && e.target.closest('a[href]'); if (a) { window.__opened.push('a:' + a.getAttribute('href')); if (!/^#/.test(a.getAttribute('href') || '')) e.preventDefault(); } }, true);
    try { navigator.clipboard.writeText = t => { window.__opened.push('clip:' + String(t).slice(0, 40)); return Promise.resolve(); }; } catch (e) { }
    try { navigator.share = d => { window.__opened.push('share'); return Promise.resolve(); }; } catch (e) { }
  });
}

async function sig(page) {
  return page.evaluate(() => {
    const vis = e => { if (!e || !e.isConnected) return false; const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.05) return false; const r = e.getBoundingClientRect(); return r.width > 20 && r.height > 20 && r.bottom > 0 && r.top < innerHeight; };
    const lay = [...document.querySelectorAll('[role=dialog],[aria-modal=true],.r2-ov,.ss2-page,.ss2-layer,dialog[open],[class*=sheet],[class*=toast],[class*=Toast],[role=status],[role=alert]')].filter(vis).map(e => e.id + '.' + String(e.className).slice(0, 30) + ':' + (e.innerText || '').replace(/\s+/g, ' ').slice(0, 300));
    const ae = document.activeElement;
    return JSON.stringify({ c: document.documentElement.className, u: location.href, lay, f: ae ? (ae.id || ae.className || ae.tagName) + (ae.getAttribute && ae.getAttribute('aria-pressed') || '') + (ae.getAttribute && ae.getAttribute('aria-checked') || '') + (ae.innerText || '').slice(0, 30) : '', o: (window.__opened || []).length, ac: [...document.querySelectorAll('[aria-pressed=true],[aria-checked=true],[aria-selected=true],.on,.active,.sel')].length });
  });
}

async function listControls(page) {
  return page.evaluate(() => {
    const vis = e => { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.05 || s.pointerEvents === 'none') return false; const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };
    const els = [...document.querySelectorAll('button,a[href],[role=button],[role=switch],[role=tab],[role=checkbox],[role=link],label[for],summary')].filter(vis);
    const out = [];
    els.forEach((e, i) => {
      const r = e.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const hit = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, cx)), Math.min(innerHeight - 1, Math.max(0, cy)));
      if (!hit || !(hit === e || e.contains(hit) || hit.contains(e))) return;
      e.setAttribute('data-pa-i', String(out.length));
      out.push({ i: out.length, name: (e.getAttribute('aria-label') || e.innerText || e.getAttribute('title') || e.id || e.className || '').toString().replace(/\s+/g, ' ').trim().slice(0, 70), tag: e.tagName.toLowerCase(), cls: String(e.className).slice(0, 40), href: e.getAttribute('href') || '', x: Math.round(cx), y: Math.round(cy), disabled: !!e.disabled || e.getAttribute('aria-disabled') === 'true' });
    });
    return out;
  });
}

(async () => {
  const results = [];
  let h = await L.launch({ device: DEVICE }); await setupHooks(h); await open(h);
  await h.page.screenshot({ path: path.join(OUT, SURF + '.png') });
  let ctrls = await listControls(h.page);
  const names = ctrls.map(c => c.name + '|' + c.x + ',' + c.y);
  console.log(SURF, ctrls.length, 'controls');
  for (let k = 0; k < names.length; k++) {
    const c0 = ctrls.find(c => c.name + '|' + c.x + ',' + c.y === names[k]) || ctrls.find(c => c.name === names[k].split('|')[0]);
    if (!c0) { results.push({ name: names[k], res: 'not-found-after-reload' }); continue; }
    if (SKIP.test(c0.name)) { results.push({ ...c0, res: 'skipped-destructive' }); continue; }
    if (c0.disabled) { results.push({ ...c0, res: 'disabled' }); continue; }
    const a = await sig(h.page); await L.sleep(500); const a2 = await sig(h.page);
    const noisy = a !== a2;
    await h.page.touchscreen.tap(c0.x, c0.y).catch(() => { });
    await L.sleep(900);
    const b = await sig(h.page);
    const opened = await h.page.evaluate(() => window.__opened.slice(-1)[0] || '');
    const changed = a2 !== b;
    results.push({ ...c0, res: changed ? 'changed' : 'NO-VISIBLE-CHANGE', noisy, opened });
    console.log(k, c0.name, changed ? 'changed' : 'NO-VISIBLE-CHANGE', opened);
    if (!changed) await h.page.screenshot({ path: path.join(OUT, SURF + '-nochange-' + k + '.png') });
    if (changed && k < names.length - 1) { await h.browser.close(); h = await L.launch({ device: DEVICE }); await setupHooks(h); await open(h); ctrls = await listControls(h.page); }
  }
  results.push({ errors: h.errors, consoleErr: h.consoleErr });
  fs.writeFileSync(path.join(OUT, SURF + '.json'), JSON.stringify(results, null, 1));
  await h.browser.close();
})();
