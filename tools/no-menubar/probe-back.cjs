'use strict';
/* Fuel bloom open -> Cook -> X / system back -> Home must be exactly as it was (no reload, no re-render, bloom still open). */
const L = require('../interface-audit/lib.cjs');
const URL_ = process.argv[2] || '';
const DEV = process.argv[3] || 'iPhone 13';
const OUT = process.argv[4] || '/tmp/nm-shots';
(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  const h = await L.launch({ device: DEV });
  const p = h.page;
  await p.addInitScript(() => { window.__loadId = Math.random(); window.__loads = (window.__loads || 0) + 1; });
  if (URL_) { await p.goto(URL_, { waitUntil: 'load', timeout: 120000 }); await p.waitForFunction(() => typeof window.goTab === 'function' && document.documentElement.classList.contains('wh-home'), null, { timeout: 90000 }); await L.sleep(5000); } else await L.openApp(h);
  await L.sleep(2500);
  const snap = () => p.evaluate(() => {
    const th = document.getElementById('tab-home');
    if (!window.__mo) { window.__mut = 0; window.__mo = new MutationObserver(m => { /* the one shared world canvas moves to the page backdrop and back (same element, nothing rebuilt): not a re-render */ const shared = n => n.nodeType === 1 && n.classList.contains('bw3-canvas'); const keep = m.filter(r => !(r.type === 'childList' && [...r.addedNodes, ...r.removedNodes].length && [...r.addedNodes, ...r.removedNodes].every(shared))); window.__mut += keep.length; const d = n => n.nodeType === 1 ? n.tagName + '#' + n.id + '.' + String(n.getAttribute('class') || '').slice(0, 30) : '#text'; window.__mrec = (window.__mrec || []).concat(keep.map(r => d(r.target) + ' +' + [...r.addedNodes].map(d).join('|') + ' -' + [...r.removedNodes].map(d).join('|') + (r.target.id === 'f3Board' ? ' TXT-:' + [...r.removedNodes].map(n => n.textContent).join('/') + ' TXT+:' + [...r.addedNodes].map(n => n.textContent).join('/') : ''))); }); window.__mo.observe(th, { childList: true, subtree: true }); }
    const B = window.LowiHomeBloomsV2;
    const pos = [...document.querySelectorAll('[data-hb]')].map(b => { const r = b.getBoundingClientRect(); return b.dataset.hb + ':' + Math.round(r.left) + ',' + Math.round(r.top) + ',' + Math.round(r.width); }).join(' ');
    const x = document.getElementById('secX'), xr = x && x.getBoundingClientRect(), xs = x && getComputedStyle(x);
    return { min: Math.floor(Date.now() / 60000), load: window.__loadId, tab: (document.querySelector('.tab.active') || {}).id, bloom: B && B.isOpen(), mut: window.__mut, pos, x: x && xs.display !== 'none' ? [xr.left, xr.top, xr.width, xr.height].map(Math.round).join(',') : 'hidden', hist: history.length, st: JSON.stringify(history.state), tabbar: !!document.getElementById('tabbar'), open: !!document.querySelector('.hb2-open, [data-hb2="act"]'), scroll: th.scrollTop };
  });
  const log = (k, v) => console.log(k.padEnd(10), JSON.stringify(v));
  log('home0', await snap());
  /* open the Fuel bubble the way a finger does */
  const fb = await p.$('[data-hb="meals"]');
  if (fb) { const r = await fb.boundingBox(); await p.mouse.click(r.x + r.width / 2, r.y + r.height / 2); }
  await L.sleep(1500);
  const s1 = await snap(); log('bloom', s1);
  await p.screenshot({ path: OUT + '/1-home-before.png' });
  const cook = await p.$('[data-hb2="act"][data-id="cook"]');
  log('cookBtn', !!cook);
  if (cook) await cook.click(); else await p.evaluate(() => window.lowiOpen('shelf'));
  await L.sleep(1800);
  log('cook', await snap());
  await p.screenshot({ path: OUT + '/2-cook-open.png' });
  const t0 = Date.now();
  await p.click('#secX');
  await p.waitForFunction(() => document.getElementById('tab-home').classList.contains('active'), null, { timeout: 3000 });
  const ms = Date.now() - t0;
  await L.sleep(1200);
  const s2 = await snap(); log('afterX', Object.assign({ ms }, s2));
  await p.screenshot({ path: OUT + '/3-home-after.png' });
  /* Home's clock lines (the quest countdown, the log rows' times) legitimately change when the minute turns: a cycle that crossed a minute is flagged, not counted */
  console.log('X_CLOCK_TICKED', s2.min !== s1.min);
  console.log('X_SAME', s2.load === s1.load && s2.mut === s1.mut && s2.pos === s1.pos && s2.bloom === s1.bloom);
  /* system back */
  const cook2 = await p.$('[data-hb2="act"][data-id="cook"]');
  if (cook2) await cook2.click(); else await p.evaluate(() => window.lowiOpen('shelf'));
  await L.sleep(1500);
  log('cook2', await snap());
  await p.evaluate(() => history.back());
  await L.sleep(1500);
  const s3 = await snap(); log('afterBack', s3);
  console.log('BACK_CLOCK_TICKED', s3.min !== s1.min);
  console.log('BACK_SAME', s3.load === s1.load && s3.mut === s1.mut && s3.pos === s1.pos && s3.bloom === s1.bloom);
  if (process.env.NM_DIAG) console.log('MREC', JSON.stringify(await p.evaluate(() => window.__mrec || [])));
  console.log('errors', JSON.stringify(h.errors.slice(0, 5)));
  await h.browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
