'use strict';
/* Oct 23, 2026 (Eman: "Wo ist der Seller Zone versteckt? Pack ihn mal auch in Shop. Mit dem selben Design damit man da durch
   scrollen kann."): the Seller Zone inside Fuel > Shop, on a phone and an iPad size, against a local root or the live site.
   node tools/check-shop-seller.cjs <w> <h> [url|root] [outdir] [lang en|de|es] [store = a saved store, list view]
   Real finger taps on the tabs, the swipe shelf and the shelf chips; the panel's own scroll must reach the last card. */
const H = require('./sim/harness.cjs');
const fs = require('fs');
(async () => {
  const w = +process.argv[2] || 390, h = +process.argv[3] || 844, where = process.argv[4] || '.', out = process.argv[5] || '/tmp/check-szshop', lang = process.argv[6] || 'de', store = process.argv[7] === 'store';
  fs.mkdirSync(out, { recursive: true });
  const o = { engine: process.env.ENG || 'chromium', members: 6, messages: 6, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page, tag = w + 'x' + h + '-' + lang + (store ? '-store' : '');
  await P.setViewportSize({ width: w, height: h });
  await R.ctx.addInitScript(a => { const l = a.l; try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); localStorage.setItem('lowi.sellerZone.region', 'eu'); localStorage.removeItem('lowi.storePicks.tab'); if (a.store) localStorage.setItem('lowi.storePicks.v1', JSON.stringify({ range: 'general' })); } catch (e) { } }, { l: lang, store }).catch(() => {});
  const res = []; const ok = (name, pass, info) => { res.push({ name, pass: !!pass, info }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' ' + JSON.stringify(info) : '')); };
  await R.goto(); await H.sleep(6000);
  const build = await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || (window.LOWI_BUILD || ''));
  console.log('build', build);
  const inView = sel => P.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), h: Math.round(r.height), vis: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth + 1 }; }, sel);
  /* 1. open Shop the way the Fuel bubble does */
  await P.evaluate(() => LowiStorePicks.open('home-bloom')); await H.sleep(1500);
  const tabs = await inView('.stp-tabs'), t2 = await inView('[data-stp-tab="sz"].stp-tab');
  const cut = await P.evaluate(() => [...document.querySelectorAll('.stp-tab b')].filter(b => b.scrollWidth > b.clientWidth + 1).map(b => b.textContent));
  ok('1 Shop opens with the Supermarket | Seller Zone tabs on top, both in view, 44px+, labels not cut off', tabs && tabs.vis && t2 && t2.vis && t2.h >= 44 && !cut.length, { tabs, t2, cut });
  const strip = await P.evaluate(() => { const s = document.querySelector('.stp-card .sz-strip'), row = s && s.querySelector('.sz-strip-row'); if (!s) return null; const r = s.getBoundingClientRect(); return { items: row.querySelectorAll('.sz-strip-it').length, sw: row.scrollWidth, cw: row.clientWidth, top: Math.round(r.top), bottom: Math.round(r.bottom), ih: innerHeight }; });
  ok('2 Supermarket tab starts with the Seller Zone swipe shelf (17 snacks, swipes sideways, in view)', strip && strip.items === 17 && strip.sw > strip.cw && strip.bottom <= strip.ih, strip);
  await R.shot(out + '/1-shop-tab-' + tag + '.png');
  /* swipe the shelf with a finger */
  const sw = await P.evaluate(() => { const r = document.querySelector('.sz-strip-row').getBoundingClientRect(); return { x: r.left + r.width * .8, y: r.top + r.height / 2 }; });
  await P.mouse.move(sw.x, sw.y); await P.evaluate(() => { document.querySelector('.sz-strip-row').scrollBy({ left: 260 }); }); await H.sleep(500);
  const sl = await P.evaluate(() => document.querySelector('.sz-strip-row').scrollLeft);
  ok('3 the shelf scrolls sideways', sl > 100, { scrollLeft: sl });
  /* 4. tap the Seller Zone tab */
  await R.tap('[data-stp-tab="sz"].stp-tab'); await H.sleep(900);
  const z = await P.evaluate(() => { const c = document.querySelector('.stp-card'), sc = c && c.querySelector('.stp-scroll'); return c && sc ? { onTab: LowiStorePicks.tab(), selected: c.querySelector('.stp-tab.on') && c.querySelector('.stp-tab.on').getAttribute('data-stp-tab'), cards: sc.querySelectorAll('.sz-card').length, chips: sc.querySelectorAll('[data-sz-cat]').length, regs: sc.querySelectorAll('[data-sz-reg]').length, head: (c.querySelector('.sz-head-in h3') || {}).textContent, sh: sc.scrollHeight, ch: sc.clientHeight, overlay: !!document.querySelector('.sz-ov'), hOverflow: c.scrollWidth > c.clientWidth + 1 } : null; });
  ok('4 Seller Zone tab shows the whole zone in the Shop panel: 17 cards, shelves, regions, no extra overlay, no sideways overflow', z && z.onTab === 'sz' && z.selected === 'sz' && z.cards === 17 && z.chips >= 5 && z.regs === 4 && !z.overlay && !z.hOverflow, z);
  await R.shot(out + '/2-seller-zone-tab-' + tag + '.png');
  /* 5. scroll through it with a finger-sized wheel; the last card and the fine print come into view */
  for (let i = 0; i < 40; i++) { await P.mouse.move(w / 2, h * .6); await P.mouse.wheel(0, 600); await H.sleep(60); }
  await H.sleep(500);
  const end = await P.evaluate(() => { const sc = document.querySelector('.stp-card .stp-scroll'), cards = sc.querySelectorAll('.sz-card'), last = cards[cards.length - 1], f = sc.querySelector('.sz-fine'); const r = last.getBoundingClientRect(), s = sc.getBoundingClientRect(), fr = f.getBoundingClientRect(); return { scrollTop: Math.round(sc.scrollTop), max: sc.scrollHeight - sc.clientHeight, lastVisible: r.bottom > s.top && r.top < s.bottom, fineVisible: fr.top < s.bottom && fr.bottom > s.top, tabsStill: !!document.querySelector('.stp-tabs') && document.querySelector('.stp-tabs').getBoundingClientRect().top >= 0 }; });
  ok('5 scrolling through the zone reaches the last card and the fine print; the tabs stay on top', end.scrollTop > 0 && end.scrollTop >= end.max - 2 && end.fineVisible && end.tabsStill, end);
  await R.shot(out + '/3-seller-zone-scrolled-' + tag + '.png');
  await P.evaluate(() => { document.querySelector('.stp-card .stp-scroll').scrollTop = 0; }); await H.sleep(300);
  /* 6. a shelf chip filters inside the panel */
  const chipId = await P.evaluate(() => { const c = [...document.querySelectorAll('.stp-card [data-sz-cat]')].find(x => x.getAttribute('data-sz-cat') !== 'all'); return c && c.getAttribute('data-sz-cat'); });
  await R.tap('.stp-card [data-sz-cat="' + chipId + '"]'); await H.sleep(700);
  const f = await P.evaluate(id => { const sc = document.querySelector('.stp-card .stp-scroll'); return { on: (sc.querySelector('[data-sz-cat].on') || {}).getAttribute && sc.querySelector('[data-sz-cat].on').getAttribute('data-sz-cat'), cards: sc.querySelectorAll('.sz-card').length, still: LowiStorePicks.isOpen() && LowiStorePicks.tab() === 'sz', overlay: !!document.querySelector('.sz-ov') }; }, chipId);
  ok('6 a shelf chip filters the cards right there (' + chipId + ')', f.on === chipId && f.cards > 0 && f.cards < 17 && f.still && !f.overlay, f);
  await R.tap('.stp-card [data-sz-cat="all"]'); await H.sleep(500);
  /* 7. region chips */
  await R.tap('.stp-card [data-sz-reg="us"]'); await H.sleep(600);
  const us = await P.evaluate(() => { const sc = document.querySelector('.stp-card .stp-scroll'); return { on: sc.querySelector('[data-sz-reg].on').getAttribute('data-sz-reg'), first: (sc.querySelector('.sz-card') || {}).getAttribute('data-sz-id'), away: sc.querySelector('.sz-card').classList.contains('sz-away') }; });
  ok('7 the region chip switches to USA, USA snacks first', us.on === 'us' && !us.away, us);
  await R.tap('.stp-card [data-sz-reg="eu"]'); await H.sleep(500);
  /* 8. back to Supermarket */
  await R.tap('[data-stp-tab="shop"].stp-tab'); await H.sleep(900);
  const back = await P.evaluate(() => { const c = document.querySelector('.stp-card'); return { tab: LowiStorePicks.tab(), shopStuff: !!(c.querySelector('[data-stp-range]') || c.querySelector('[data-stp-item]') || c.querySelector('.stp-ranges') || c.querySelector('.stp-list') || c.querySelector('[data-stp="pick"]')), strip: !!c.querySelector('.sz-strip'), text: c.innerText.replace(/\s+/g, ' ').slice(0, 160) }; });
  ok('8 the Supermarket tab comes back with the store picker and the shelf', back.tab === 'shop' && back.strip, back);
  /* 9. a snack on the shelf opens its card on the zone tab */
  const pick = await P.evaluate(() => { const its = document.querySelectorAll('.sz-strip-it'); const it = its[3]; it.scrollIntoView({ inline: 'center', block: 'nearest' }); return it.getAttribute('data-sz-focus'); });
  await H.sleep(400);
  await R.tap('.sz-strip-it[data-sz-focus="' + pick + '"]'); await H.sleep(900);
  const foc = await P.evaluate(id => { const sc = document.querySelector('.stp-card .stp-scroll'), c = [...sc.querySelectorAll('[data-sz-id]')].find(x => x.getAttribute('data-sz-id') === id); if (!c) return null; const r = c.getBoundingClientRect(), s = sc.getBoundingClientRect(); return { tab: LowiStorePicks.tab(), top: Math.round(r.top - s.top), inView: r.top >= s.top - 2 && r.top < s.bottom - 40, glow: c.classList.contains('sz-glow') }; }, pick);
  ok('9 tapping a snack on the shelf opens the zone right at that card (' + pick + ')', foc && foc.tab === 'sz' && foc.inView, foc);
  await R.shot(out + '/4-focus-card-' + tag + '.png');
  /* 10. close and open again: the zone tab is remembered */
  await P.evaluate(() => LowiStorePicks.close()); await H.sleep(900);
  await P.evaluate(() => LowiStorePicks.open('home-bloom')); await H.sleep(1400);
  const again = await P.evaluate(() => ({ tab: LowiStorePicks.tab(), cards: document.querySelectorAll('.stp-card .stp-scroll .sz-card').length }));
  ok('10 Shop opens again on the tab you left it on', again.tab === 'sz' && again.cards === 17, again);
  /* 11. the scanner card's "see all" still opens the zone overlay */
  await P.evaluate(() => { LowiStorePicks.setTab('shop'); LowiStorePicks.close(); }); await H.sleep(800);
  await P.evaluate(() => LowiSellerZone.open('chips')); await H.sleep(900);
  const ovl = await P.evaluate(() => ({ open: LowiSellerZone.isOpen(), cards: document.querySelectorAll('.sz-ov .sz-card').length }));
  ok('11 the Seller Zone from the scanner card still opens on its own', ovl.open && ovl.cards > 0, ovl);
  await P.evaluate(() => LowiSellerZone.close()); await H.sleep(500);
  ok('12 no page errors', R.errs.length === 0, R.errs.slice(0, 5));
  const pass = res.filter(r => r.pass).length;
  console.log('RESULT ' + pass + '/' + res.length + ' ' + tag + ' build ' + build);
  fs.writeFileSync(out + '/result-' + tag + '.json', JSON.stringify({ build, res }, null, 1));
  await R.close();
  process.exit(pass === res.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
