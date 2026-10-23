'use strict';
/* Oct 23, 2026 (Eman: "Pls add images. Nobody likes just reading it."): the Seller Zone with real product photos, on a phone and
   an iPad size, against a local root or the live site.
   node tools/check-seller-images.cjs <w> <h> [url|root] [outdir] [lang en|de|es]
   Every photo must really load (served from the app itself, never from a shop), the cards are image first in a shelf grid
   (2 across on a phone, 3+ on an iPad), nothing overflows, buttons stay thumb-sized, the details open with one tap. */
const H = require('./sim/harness.cjs');
const fs = require('fs');
(async () => {
  const w = +process.argv[2] || 390, h = +process.argv[3] || 844, where = process.argv[4] || '.', out = process.argv[5] || '/tmp/check-szimg', lang = process.argv[6] || 'de';
  fs.mkdirSync(out, { recursive: true });
  const o = { engine: process.env.ENG || 'chromium', members: 6, messages: 6, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page, tag = w + 'x' + h + '-' + lang;
  await P.setViewportSize({ width: w, height: h });
  await R.ctx.addInitScript(a => { try { localStorage.setItem('lowispike.lang', a.l); localStorage.setItem('lowi.lang', a.l); localStorage.setItem('lowi.sellerZone.region', 'eu'); localStorage.removeItem('lowi.storePicks.tab'); } catch (e) { } }, { l: lang }).catch(() => {});
  const foreign = []; P.on('request', r => { const u = r.url(); if (/\.(webp|jpe?g|png)(\?|$)/i.test(u) && /cdn\/shop|imgix|img\.mix\.it|kulau\.de\/media|paccari|lindtusa/.test(u)) foreign.push(u); });
  const res = []; const ok = (name, pass, info) => { res.push({ name, pass: !!pass, info }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' ' + JSON.stringify(info) : '')); };
  await R.goto(); await H.sleep(6000);
  const build = await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || (window.LOWI_BUILD || ''));
  console.log('build', build);
  const loaded = sel => P.evaluate(s => [...document.querySelectorAll(s)].map(i => ({ src: i.getAttribute('src'), done: i.complete, nw: i.naturalWidth, w: Math.round(i.getBoundingClientRect().width), h: Math.round(i.getBoundingClientRect().height) })), sel);
  /* 1. Shop > Supermarket: the swipe shelf shows photo bubbles */
  await P.evaluate(() => LowiStorePicks.open('home-bloom')); await H.sleep(1500);
  await P.evaluate(() => { const r = document.querySelector('.sz-strip-row'); r.scrollLeft = r.scrollWidth; }); await H.sleep(1200);
  await P.evaluate(() => { document.querySelector('.sz-strip-row').scrollLeft = 0; }); await H.sleep(800);
  const strip = await loaded('.stp-card .sz-strip .sz-img');
  ok('1 the Supermarket shelf shows a photo on all 17 snacks, each loaded (400 px), about 72 px big', strip.length === 17 && strip.every(i => i.done && i.nw === 400 && i.w >= 60), { n: strip.length, bad: strip.filter(i => !(i.done && i.nw === 400)).map(i => i.src), size: strip[0] && [strip[0].w, strip[0].h] });
  await R.shot(out + '/1-shelf-' + tag + '.png');
  /* 2. the Seller Zone tab: image-first cards in a shelf grid */
  await R.tap('[data-stp-tab="sz"].stp-tab'); await H.sleep(1200);
  const g = await P.evaluate(() => {
    const sc = document.querySelector('.stp-card .stp-scroll'), grid = sc.querySelector('.sz-grid'), cards = [...sc.querySelectorAll('.sz-card')];
    const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
    const c = cards[0], pic = c.querySelector('.sz-pic').getBoundingClientRect(), name = c.querySelector('.sz-tt').getBoundingClientRect();
    const btns = [...sc.querySelectorAll('.sz-card .sz-buy')].map(b => Math.round(b.getBoundingClientRect().height));
    const over = cards.filter(k => k.scrollWidth > k.clientWidth + 1).map(k => k.getAttribute('data-sz-id'));
    return { cards: cards.length, cols, picW: Math.round(pic.width), picH: Math.round(pic.height), imageFirst: pic.top < name.top, minBtn: Math.min(...btns), over, panelOver: sc.scrollWidth > sc.clientWidth + 1, closed: [...sc.querySelectorAll('.sz-more')].every(d => !d.open) };
  });
  const wantCols = w >= 700 ? 3 : 2;
  ok('2 Seller Zone tab: 17 image-first cards, ' + wantCols + '+ across, square photos, buttons 44px+, nothing overflows', g.cards === 17 && g.cols >= wantCols && g.imageFirst && Math.abs(g.picW - g.picH) <= 2 && g.picW >= 130 && g.minBtn >= 44 && !g.over.length && !g.panelOver && g.closed, g);
  await R.shot(out + '/2-zone-cards-' + tag + '.png');
  /* 3. scroll through: every card photo loads lazily as it comes in, none is an empty box */
  for (let i = 0; i < 40; i++) { await P.mouse.move(w / 2, h * .6); await P.mouse.wheel(0, 500); await H.sleep(90); }
  await H.sleep(1500);
  const cardsImg = await loaded('.stp-card .stp-scroll .sz-card .sz-img');
  const empty = await P.evaluate(() => [...document.querySelectorAll('.stp-card .sz-card .sz-ph')].filter(p => !p.querySelector('img') && !p.classList.contains('sz-noimg')).length);
  ok('3 scrolling through, all 17 card photos load, square, no empty boxes', cardsImg.length === 17 && cardsImg.every(i => i.done && i.nw === 400 && Math.abs(i.w - i.h) <= 2) && !empty, { n: cardsImg.length, bad: cardsImg.filter(i => !(i.done && i.nw === 400)).map(i => i.src), empty });
  await R.shot(out + '/3-zone-scrolled-' + tag + '.png');
  await P.evaluate(() => { document.querySelector('.stp-card .stp-scroll').scrollTop = 0; }); await H.sleep(400);
  /* 4. one tap opens why and ingredients */
  await P.evaluate(() => document.querySelector('.stp-card .sz-card .sz-more summary').scrollIntoView({ block: 'center' })); await H.sleep(400);
  await R.tap('.stp-card .sz-card .sz-more summary'); await H.sleep(500);
  const d = await P.evaluate(() => { const m = document.querySelector('.stp-card .sz-card .sz-more'); const s = m.querySelector('summary').getBoundingClientRect(); return { open: m.open, why: m.querySelector('.sz-why').getBoundingClientRect().height > 10, ing: m.querySelector('.sz-ing').getBoundingClientRect().height > 10, tapH: Math.round(s.height) }; });
  ok('4 one tap on "Warum okay · Zutaten" opens why it passes and the ingredients', d.open && d.why && d.ing && d.tapH >= 32, d);
  await R.shot(out + '/4-details-' + tag + '.png');
  /* 5. verdict and price sit on the photo and stay readable inside it */
  const ov = await P.evaluate(() => { const c = document.querySelector('.stp-card .sz-card'), p = c.querySelector('.sz-pic').getBoundingClientRect(), v = c.querySelector('.sz-pic .sz-v').getBoundingClientRect(), pr = c.querySelector('.sz-price'); const prr = pr && pr.getBoundingClientRect(); const inside = r => r.left >= p.left - 1 && r.right <= p.right + 1 && r.top >= p.top - 1 && r.bottom <= p.bottom + 1; return { v: inside(v), price: !pr || inside(prr), priceText: pr && pr.textContent }; });
  ok('5 the verdict and the price sit on the photo', ov.v && ov.price, ov);
  /* 6. a broken photo falls back to the emoji bubble */
  const fb = await P.evaluate(() => new Promise(res => { const img = document.querySelector('.stp-card .sz-card .sz-img'), ph = img.parentNode; img.addEventListener('error', () => setTimeout(() => res({ noimg: ph.classList.contains('sz-noimg'), gone: !ph.querySelector('img'), emoji: getComputedStyle(ph.querySelector('.sz-ph-e')).display !== 'none' && ph.querySelector('.sz-ph-e').getBoundingClientRect().height > 20 }), 50)); img.src = 'seller-zone-img/missing-photo.webp'; }));
  ok('6 a photo that fails to load shows the emoji bubble instead of an empty box', fb.noimg && fb.gone && fb.emoji, fb);
  /* 7. the scanner card's swaps: photo bubbles too */
  const sw = await P.evaluate(() => new Promise(res => { const box = document.createElement('div'); box.id = 'szImgProbe'; box.className = 'sc-card'; box.style.cssText = 'position:fixed;left:0;top:0;width:360px;z-index:99999;background:#061828;padding:8px'; box.innerHTML = LowiSellerZone.swapHTML({ verdict: 'spike', name: 'Haribo Goldb\u00e4ren' }); document.body.appendChild(box); setTimeout(() => { const imgs = [...box.querySelectorAll('.sz-img')]; const r = imgs.map(i => ({ done: i.complete, nw: i.naturalWidth, w: Math.round(i.getBoundingClientRect().width) })); box.remove(); res(r); }, 1500); }));
  ok('7 the buyable swaps under a scan (Haribo) show product photos', sw.length >= 2 && sw.every(i => i.done && i.nw === 400 && i.w >= 56), sw);
  ok('8 every photo comes from the app itself, none from a shop', foreign.length === 0, foreign.slice(0, 3));
  ok('9 no page errors', R.errs.length === 0, R.errs.slice(0, 5));
  const pass = res.filter(r => r.pass).length;
  console.log('RESULT ' + pass + '/' + res.length + ' ' + tag + ' build ' + build);
  fs.writeFileSync(out + '/result-' + tag + '.json', JSON.stringify({ build, res }, null, 1));
  await R.close();
  process.exit(pass === res.length ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
