'use strict';
/* Oct 22 2026: the old World map button is gone. Inside a cell world: no World map button, the bottom-centre X shows, sits clear
   of the controller and the cell guide, and flies back to Misty (Home). The profile hub's More places has no World map.
   Usage: node tools/world-map-removed/probe.cjs "iPhone SE" webkit [light|dark] */
const L = require('../interface-audit/lib.cjs');
const dev = process.argv[2] || 'iPhone 13', eng = process.argv[3] || 'webkit', theme = process.argv[4] || 'dark';
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
(async () => {
  const h = await L.launch({ device: dev, engine: eng });
  const { page } = h;
  await L.openApp(h, { settle: 4500 });
  await page.evaluate(t => { try { document.documentElement.setAttribute('data-theme', t); } catch (e) { } }, theme);
  ok(await page.evaluate(() => !document.querySelector('#whHud .wh-zoom')), 'Home has a World map button');
  await page.evaluate(() => window.LowiWorldRegions.travel('gut'));
  await page.waitForFunction(() => document.documentElement.classList.contains('wh-away'), null, { timeout: 30000 }).catch(() => fails.push('never got inside the cell world'));
  await L.sleep(9000);
  const inside = await page.evaluate(() => {
    const vis = el => { if (!el) return null; const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width && cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05 ? { l: r.left, t: r.top, r: r.right, b: r.bottom } : null; };
    const x = vis(document.getElementById('whX'));
    const words = document.body.innerText;
    const clash = [];
    if (x) document.querySelectorAll('#whPad, #whPadChip, #rpPal .rp-body, #rpPal .rp-say, #mhNudge, #whHud button').forEach(el => { const q = vis(el); if (q && q.l < x.r && q.r > x.l && q.t < x.b && q.b > x.t) clash.push(el.id || el.className); });
    return { away: document.documentElement.classList.contains('wh-away'), zoom: !!document.querySelector('.wh-zoom'), x, clash, map: /World map|Weltkarte/.test(words), vw: innerWidth, vh: innerHeight };
  });
  ok(!inside.zoom, 'World map button inside the cell world');
  ok(!inside.map, 'the words World map show inside the cell world');
  ok(!!inside.x, 'no X inside the cell world');
  ok(!inside.clash.length, 'X covers: ' + inside.clash.join(', '));
  if (inside.x) ok(inside.x.b <= inside.vh && inside.x.l >= 0 && inside.x.r <= inside.vw, 'X off screen');
  await L.shot(page, 'wmr-' + dev.replace(/\s/g, '') + '-' + theme + '-inside');
  await page.evaluate(() => document.getElementById('whX').click());
  await page.waitForFunction(() => !document.documentElement.classList.contains('wh-away'), null, { timeout: 30000 }).catch(() => fails.push('X did not bring you back home'));
  await L.sleep(4000);
  const home = await page.evaluate(() => ({ away: document.documentElement.classList.contains('wh-away'), home: document.documentElement.classList.contains('wh-home'), xHidden: document.getElementById('whX') ? document.getElementById('whX').hidden : true }));
  ok(home.home && !home.away, 'not back on Home');
  ok(home.xHidden, 'X still showing on Home');
  await L.shot(page, 'wmr-' + dev.replace(/\s/g, '') + '-' + theme + '-home');
  const hub = await page.evaluate(async () => {
    const M = window.LowiCommunityMe; if (!M || !M.open) return { err: 'no hub' };
    M.open(); await new Promise(r => setTimeout(r, 900));
    const more = document.querySelector('[data-cme="more"]'); if (more) more.click(); await new Promise(r => setTimeout(r, 500));
    const chips = [...document.querySelectorAll('#cmeMore .cme-chip')].map(b => b.dataset.cme + ':' + b.textContent.trim());
    return { chips };
  });
  ok(!hub.err, hub.err);
  ok(hub.chips && hub.chips.length > 0 && !hub.chips.some(c => /^map|World map|Weltkarte/.test(c)), 'More places: ' + JSON.stringify(hub.chips));
  ok(!h.errors.length, 'page errors: ' + h.errors.join(' | '));
  console.log(JSON.stringify({ dev, eng, theme, inside, home, chips: hub.chips, errors: h.errors, fails }));
  console.log(fails.length ? 'FAIL ' + dev : 'PASS ' + dev);
  await h.browser.close();
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.log('FAIL crash ' + e.message); process.exit(2); });
