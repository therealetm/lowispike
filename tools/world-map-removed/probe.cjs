'use strict';
/* Oct 22 2026: the old World map button is gone. Inside a cell world: no World map button, the bottom-centre X shows, sits clear
   of the controller and the cell guide, and flies back to Misty (Home). The profile hub's More places has no World map.
   Oct 23 2026 (queue worldmap-btn): the More places row itself is gone from the hub (trim-places), so the hub check is now
   "no World map anywhere in the hub", and the run takes a language.
   Usage: node tools/world-map-removed/probe.cjs "iPhone SE" webkit [light|dark] [en|de|es] */
const L = require('../interface-audit/lib.cjs');
const dev = process.argv[2] || 'iPhone 13', eng = process.argv[3] || 'webkit', theme = process.argv[4] || 'dark', lang = process.argv[5] || 'en';
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
(async () => {
  const h = await L.launch({ device: dev, engine: eng, lang, kv: lang !== 'en' ? { 'lowispike.lang': lang } : undefined });
  const { page } = h;
  await L.openApp(h, { settle: 4500 });
  await page.evaluate(t => { try { if (window.LowiR2 && window.LowiR2.applyTheme) window.LowiR2.applyTheme(t === 'dark' ? 'dark' : 'light'); else document.documentElement.setAttribute('data-theme', t); } catch (e) { } }, theme);
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
    return { away: document.documentElement.classList.contains('wh-away'), zoom: !!document.querySelector('.wh-zoom'), x, clash, map: /World map|Weltkarte|Mapa del mundo/i.test(words), vw: innerWidth, vh: innerHeight };
  });
  ok(!inside.zoom, 'World map button inside the cell world');
  ok(!inside.map, 'the words World map show inside the cell world');
  ok(!!inside.x, 'no X inside the cell world');
  ok(!inside.clash.length, 'X covers: ' + inside.clash.join(', '));
  if (inside.x) ok(inside.x.b <= inside.vh && inside.x.l >= 0 && inside.x.r <= inside.vw, 'X off screen');
  await L.shot(page, 'wmr-' + dev.replace(/\s/g, '') + '-' + theme + '-' + lang + '-inside');
  await page.evaluate(() => document.getElementById('whX').click());
  await page.waitForFunction(() => !document.documentElement.classList.contains('wh-away'), null, { timeout: 30000 }).catch(() => fails.push('X did not bring you back home'));
  await L.sleep(4000);
  const home = await page.evaluate(() => ({ away: document.documentElement.classList.contains('wh-away'), home: document.documentElement.classList.contains('wh-home'), xHidden: document.getElementById('whX') ? document.getElementById('whX').hidden : true }));
  ok(home.home && !home.away, 'not back on Home');
  ok(home.xHidden, 'X still showing on Home');
  await L.shot(page, 'wmr-' + dev.replace(/\s/g, '') + '-' + theme + '-' + lang + '-home');
  const hub = await page.evaluate(async () => {
    const M = window.LowiCommunityMe; if (!M || !M.open) return { err: 'no hub' };
    M.open(); await new Promise(r => setTimeout(r, 900));
    const more = document.querySelector('[data-cme="more"]'); if (more) more.click(); await new Promise(r => setTimeout(r, 500));
    const hubEl = document.querySelector('#cmeMore') || document.querySelector('.cme-sheet') || document.querySelector('[class*="cme"]');
    const chips = [...document.querySelectorAll('#cmeMore .cme-chip, [data-cme]')].map(b => (b.dataset.cme || '') + ':' + b.textContent.trim());
    return { chips, words: hubEl ? /World map|Weltkarte|Mapa del mundo/i.test(document.body.innerText) : false };
  });
  ok(!hub.err, hub.err);
  ok(hub.chips && !hub.chips.some(c => /^map:|World map|Weltkarte|Mapa del mundo/i.test(c)) && !hub.words, 'World map in the hub: ' + JSON.stringify(hub.chips));
  ok(!h.errors.length, 'page errors: ' + h.errors.join(' | '));
  console.log(JSON.stringify({ dev, eng, theme, lang, inside, home, chips: hub.chips, errors: h.errors, fails }));
  console.log(fails.length ? 'FAIL ' + dev + ' ' + theme + ' ' + lang : 'PASS ' + dev + ' ' + theme + ' ' + lang);
  await h.browser.close();
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.log('FAIL crash ' + e.message); process.exit(2); });
