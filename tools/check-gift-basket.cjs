'use strict';
/* Oct 25, 2026: Give a hand (gift-basket.js) inside Fuel > Shop, against a local root or the live site, with an in-page fake
   server (no real accounts, no real money).
   node tools/check-gift-basket.cjs <w> <h> [url|root] [outdir] [lang en|de|es] [day]      ENG=webkit|chromium
   Real finger taps: Shop > Kitchen > Give a hand entry; baskets list with badges and the money note; Pay opens the person's
   link outside the app; I helped takes the basket (+1 care event); receipt + Verified; build a basket (spike food refused,
   dashboard link refused, own Ko-fi link accepted), share; add a receipt photo (bottom blurred, JPEG); X brings Shop back.
   Also: the entry is hidden while the server has no basket table. */
const H = require('./sim/harness.cjs');
const fs = require('fs');
(async () => {
  const w = +process.argv[2] || 390, h = +process.argv[3] || 844, where = process.argv[4] || '.', out = process.argv[5] || '/tmp/check-gift-basket', lang = process.argv[6] || 'en', day = process.argv[7] === 'day';
  fs.mkdirSync(out, { recursive: true });
  const o = { engine: process.env.ENG || 'chromium', members: 6, messages: 6, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page, tag = w + 'x' + h + '-' + lang + (day ? '-day' : '') + '-' + o.engine;
  await P.setViewportSize({ width: w, height: h });
  await R.ctx.addInitScript(a => { try { localStorage.setItem('lowispike.lang', a.l); localStorage.setItem('lowi.lang', a.l); localStorage.setItem('lowi.storePicks.tab', 'kitchen'); localStorage.removeItem('lowi.giftBasket.draft.v1'); localStorage.removeItem('lowi.giftBasket.seen.v1'); localStorage.removeItem('lowi.giftBasket.server.v1'); if (a.day) localStorage.setItem('lowi.theme', 'light'); } catch (e) { } }, { l: lang, day }).catch(() => {});
  const errs = []; P.on('pageerror', e => errs.push(String(e && e.message || e)));
  const popups = []; R.ctx.on('page', p => { popups.push(p.url()); setTimeout(() => p.close().catch(() => {}), 300); });
  await R.ctx.route(/ko-fi\.com|paypal\.me|stripe\.com/, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>payment page</p>' })).catch(() => {});
  const res = []; const ok = (name, pass, info) => { res.push({ name, pass: !!pass, info }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' ' + JSON.stringify(info) : '')); };
  await R.goto(); await H.sleep(6000);
  const build = await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || (window.LOWI_BUILD || ''));
  console.log('build', build);
  const L = { en: 0, de: 1, es: 2 }[lang] || 0;
  const W3 = (en, de, es) => [en, de, es][L];

  /* the fake server: two baskets from others, one basket I helped that now has a receipt, one of mine waiting for a receipt */
  const install = (ready) => P.evaluate((ready) => {
    const now = Date.now(), D = 864e5, iso = t => new Date(t).toISOString();
    const png = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="500"><rect width="300" height="500" fill="#fff"/><text x="20" y="60" font-size="22">EIER 2,49</text><text x="20" y="100" font-size="22">BROKKOLI 1,29</text><text x="20" y="460" font-size="22">VISA ****1234</text></svg>');
    const S = window.__gbFake = { me: 'u-me', calls: [], blobs: [], rows: [
      { id: 'b-lena', user_id: 'u-lena', first_name: 'Lena', anon: false, city: 'Flensburg', items: [{ n: 'Eier' }, { n: 'Brokkoli' }, { n: 'Naturjoghurt' }], total_eur: 24.5, pay_url: 'https://ko-fi.com/lena_k', created_at: iso(now - 3600e3) },
      { id: 'b-anon', user_id: 'u-anon', first_name: null, anon: true, city: null, items: [{ n: 'Lachs' }, { n: 'Spinat' }], total_eur: 18, pay_url: 'https://paypal.me/someone', created_at: iso(now - 7200e3) },
      { id: 'b-bad', user_id: 'u-bad', first_name: 'Bad', anon: false, city: null, items: [{ n: 'Eier' }], total_eur: 10, pay_url: 'https://evil.example/pay', created_at: iso(now - 9000e3) },
      { id: 'b-tom', user_id: 'u-tom', first_name: 'Tom', anon: false, city: 'Kiel', items: [{ n: 'Tofu' }, { n: 'Gurke' }], total_eur: 15, pay_url: 'https://buy.stripe.com/test_aEU5kE8x0bC2', created_at: iso(now - 5 * D), helper_id: 'u-me', helped_at: iso(now - 4 * D), receipt_path: 'u-tom/b-tom.jpg', receipt_at: iso(now - 2 * D) },
      { id: 'b-mine-old', user_id: 'u-me', first_name: null, anon: true, city: null, items: [{ n: 'Eier' }], total_eur: 12, pay_url: 'https://ko-fi.com/me_me', created_at: iso(now - 3 * D), helper_id: 'u-x', helped_at: iso(now - 2 * D) }
    ] };
    const trust = { 'u-lena': { counted: 2, verified: 2, pending: 0 }, 'u-anon': { counted: 0, verified: 0, pending: 0 } };
    window.award = function (a, label, x, kind, ev) { S.calls.push(['award', a, label, kind, ev]); };
    window.LowiGiftBasket._api = {
      uid: () => S.me,
      ready: async () => ready,
      open: async () => S.rows.filter(r => !r.helped_at),
      mine: async () => S.rows.filter(r => r.user_id === S.me),
      given: async () => S.rows.filter(r => r.helper_id === S.me),
      trust: async (u) => u.filter(x => trust[x]).map(x => Object.assign({ user_id: x }, trust[x])),
      share: async (row, id) => { S.calls.push(['share', row, id]); const r = Object.assign({ id: 'b-new', user_id: S.me, created_at: new Date().toISOString() }, row); S.rows.push(r); return r; },
      takeDown: async (id) => { S.calls.push(['down', id]); S.rows = S.rows.filter(r => r.id !== id); return true; },
      help: async (id) => { S.calls.push(['help', id]); const r = S.rows.find(x => x.id === id); r.helper_id = S.me; r.helped_at = new Date().toISOString(); return id; },
      receipt: async (id, blob) => { S.calls.push(['receipt', id]); S.blobs.push({ size: blob.size, type: blob.type }); return new Date().toISOString(); },
      receiptUrl: async () => png,
      verdict: async (id, v) => { S.calls.push(['verdict', id, v]); return v; }
    };
  }, ready);

  const box = sel => P.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), vis: r.width > 0 && r.top >= 0 && r.bottom <= innerHeight + 1 && r.left >= -1 && r.right <= innerWidth + 1 }; }, sel);
  const overflow = () => P.evaluate(() => { const c = document.querySelector('.gb-card'); if (!c) return 'no card'; const bad = [...c.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1); }).map(e => e.className || e.tagName); const cut = [...c.querySelectorAll('button b, .stp-tab b, .gb-badge')].filter(b => b.scrollWidth > b.clientWidth + 2).map(b => b.textContent); return { bad: bad.slice(0, 5), cut }; });
  const text = () => P.evaluate(() => (document.querySelector('.gb-card') || {}).innerText || '');
  const tapIn = async (sel) => { await P.evaluate(s => { const e = document.querySelector(s); if (e) e.scrollIntoView({ block: 'center' }); }, sel); await H.sleep(200); await R.tap(sel); };

  /* 0. no table on the server yet: no entry */
  await install(false);
  await P.evaluate(() => window.LowiGiftBasket.probe()); await H.sleep(300);
  await P.evaluate(() => LowiStorePicks.open('home-bloom')); await H.sleep(1500);
  if (await P.evaluate(() => LowiStorePicks.tab()) !== 'kitchen') { await R.tap('[data-stp-tab="kitchen"]'); await H.sleep(800); }
  ok('entry hidden while the server has no basket table', !(await P.$('.gb-entry')));
  await P.evaluate(() => LowiStorePicks.close && LowiStorePicks.close()); await H.sleep(800);

  /* 1. table there: Shop > Kitchen shows the entry; a finger tap opens Give a hand on top */
  await install(true);
  await P.evaluate(() => window.LowiGiftBasket.probe()); await H.sleep(300);
  await P.evaluate(() => LowiStorePicks.open('home-bloom')); await H.sleep(1500);
  if (await P.evaluate(() => LowiStorePicks.tab()) !== 'kitchen') { await R.tap('[data-stp-tab="kitchen"]'); await H.sleep(800); }
  ok('Give a hand entry in Kitchen', !!(await P.$('.stp-kit .gb-entry')), await P.evaluate(() => (document.querySelector('.gb-entry b') || {}).textContent));
  await tapIn('.stp-kit .gb-entry'); await H.sleep(1500);
  ok('panel opens', await P.evaluate(() => LowiGiftBasket.isOpen() && !!document.querySelector('.gb-ov .gb-card')));
  await P.screenshot({ path: out + '/1-give-' + tag + '.png' });
  let t = await text();
  ok('baskets listed (Lena, anonymous), bad link not shown, own not shown', t.includes('Lena') && t.includes(W3('Someone', 'Jemand', 'Alguien')) && !t.includes('Bad') && (await P.$$('.gb-basket:not(.gb-given)')).length === 2);
  ok('badges: 100% verified and New', t.includes('100') && t.includes(W3('New', 'Neu', 'Nuevo')));
  ok('money note in this language', t.includes(W3('LOWiSPIKE doesn’t handle', 'LOWiSPIKE wickelt keine Zahlungen ab', 'LOWiSPIKE no gestiona')));
  ok('no sideways overflow or cut words (give)', JSON.stringify(await overflow()) === JSON.stringify({ bad: [], cut: [] }), await overflow());
  ok('receipt shown to the giver with Verified / Doesn’t match', !!(await P.$('.gb-given .gb-receipt img')) && !!(await P.$('[data-gb-verdict="verified"]')));
  ok('your basket arrived moment', !!(await P.$('.gb-moment')));

  /* 2. Pay opens the person's own link outside the app, then I helped */
  const href = await P.evaluate(() => document.querySelector('[data-gb-id="b-lena"] a.gb-pay').getAttribute('href') + '|' + document.querySelector('[data-gb-id="b-lena"] a.gb-pay').getAttribute('rel') + '|' + document.querySelector('[data-gb-id="b-lena"] a.gb-pay').getAttribute('target'));
  ok('pay link is the person’s own link, new tab, noopener', href === 'https://ko-fi.com/lena_k|noopener noreferrer external|_blank', href);
  await tapIn('[data-gb-id="b-lena"] a.gb-pay'); await H.sleep(1500);
  ok('link opened outside the app, app still here', popups.some(u => /ko-fi\.com\/lena_k/.test(u)) && await P.evaluate(() => LowiGiftBasket.isOpen()), popups);
  ok('I helped appears after paying', !!(await P.$('[data-gb-help="b-lena"]')));
  await tapIn('[data-gb-help="b-lena"]'); await H.sleep(900);
  const calls = await P.evaluate(() => window.__gbFake.calls);
  ok('I helped takes the basket and gives one care event for it', calls.some(c => c[0] === 'help' && c[1] === 'b-lena') && calls.filter(c => c[0] === 'award' && c[4] === 'gift:b-lena').length === 1, calls.filter(c => c[0] !== 'share'));
  t = await text();
  ok('helped basket moves to Baskets you helped, waiting for receipt', !(await P.$('[data-gb-help="b-lena"]')) && !!(await P.$('.gb-given[data-gb-id="b-lena"]')) && t.includes(W3('Waiting for their receipt', 'Warte auf den Kassenbon', 'Esperando el ticket')));

  /* 3. Verified on Tom's receipt */
  await tapIn('[data-gb-verdict="verified"][data-gb-for="b-tom"]'); await H.sleep(800);
  ok('Verified sent', (await P.evaluate(() => window.__gbFake.calls)).some(c => c[0] === 'verdict' && c[1] === 'b-tom' && c[2] === 'verified') && (await text()).includes(W3('You verified it', 'Du hast ihn verifiziert', 'Lo verificaste')));
  await P.screenshot({ path: out + '/2-helped-' + tag + '.png' });

  /* 4. I could use a hand: receipt due first, then the builder */
  await R.tap('[data-gb-tab="mine"]'); await H.sleep(900);
  ok('receipt ask for my helped basket, with the privacy line', !!(await P.$('.gb-due')) && (await text()).includes(W3('Cover your card number', 'Deck vorher Kartennummer', 'Tapa el número de tarjeta')));
  ok('my badge is New (nothing counted yet)', !!(await P.$('.gb-score .gb-new')));
  const pngB64 = await P.evaluate(async () => { const c = document.createElement('canvas'); c.width = 600; c.height = 1000; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 600, 1000); g.fillStyle = '#000'; g.font = '40px sans-serif'; g.fillText('EIER 2,49', 30, 100); g.fillText('VISA ****1234', 30, 940); return c.toDataURL('image/png').split(',')[1]; });
  await P.setInputFiles('.gb-due input[type=file]', { name: 'receipt.png', mimeType: 'image/png', buffer: Buffer.from(pngB64, 'base64') }); await H.sleep(1500);
  ok('receipt preview with blur switch on', !!(await P.$('.gb-due .gb-receipt img')) && await P.evaluate(() => document.getElementById('gb-blur').checked));
  const blurred = await P.evaluate(async () => { const img = document.querySelector('.gb-due .gb-receipt img'); await img.decode().catch(() => {}); const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; const g = c.getContext('2d'); g.drawImage(img, 0, 0); const row = y => { const d = g.getImageData(0, Math.round(c.height * y), c.width, 1).data; let dark = 0; for (let i = 0; i < d.length; i += 4) if (d[i] < 60) dark++; return dark; }; return { top: row(.085), bottom: row(.935), w: c.width, h: c.height }; });
  ok('bottom of the receipt is blurred, the items stay sharp', blurred.top > 3 && blurred.bottom === 0, blurred);
  await tapIn('[data-gb="send-receipt"]'); await H.sleep(900);
  const blobs = await P.evaluate(() => window.__gbFake.blobs);
  ok('receipt sent as a JPEG under 1.5 MB', blobs.length === 1 && blobs[0].type === 'image/jpeg' && blobs[0].size > 1000 && blobs[0].size < 1572864, blobs);

  /* 5. build a basket: staple chip, spike food refused, dashboard link refused, own link accepted, share */
  ok('share disabled while empty', await P.evaluate(() => document.querySelector('.gb-share').disabled));
  await tapIn('.gb-add-chip'); await H.sleep(500);
  await tapIn('#gb-item'); await P.keyboard.type('Cola'); await P.keyboard.press('Enter'); await H.sleep(600);
  ok('spike food refused with a reason', (await text()).includes(W3('isn’t low-spike', 'kein Low-Spike', 'no es bajo en picos')) && (await P.evaluate(() => LowiGiftBasket._state().draft.items.length)) === 1);
  await P.fill('#gb-item', ''); await tapIn('#gb-item'); await P.keyboard.type(W3('Broccoli', 'Brokkoli', 'Brócoli')); await P.keyboard.press('Enter'); await H.sleep(600);
  ok('low-spike food added', (await P.evaluate(() => LowiGiftBasket._state().draft.items.length)) === 2);
  await tapIn('#gb-total'); await P.keyboard.type('25'); await H.sleep(200);
  await tapIn('#gb-link'); await P.keyboard.type('https://ko-fi.com/Manage/'); await H.sleep(400);
  ok('Ko-fi dashboard link refused', (await P.evaluate(() => document.getElementById('gb-linkmsg').classList.contains('gb-low'))) && await P.evaluate(() => document.querySelector('.gb-share').disabled));
  await P.fill('#gb-link', ''); await P.keyboard.type('ko-fi.com/lena_k'); await H.sleep(400);
  ok('own Ko-fi link accepted, Share enabled', (await P.evaluate(() => document.getElementById('gb-linkmsg').textContent)).includes('Ko-fi') && !(await P.evaluate(() => document.querySelector('.gb-share').disabled)));
  ok('no sideways overflow or cut words (mine)', JSON.stringify(await overflow()) === JSON.stringify({ bad: [], cut: [] }), await overflow());
  await P.screenshot({ path: out + '/3-build-' + tag + '.png' });
  await tapIn('.gb-share'); await H.sleep(900);
  const sh = (await P.evaluate(() => window.__gbFake.calls)).find(c => c[0] === 'share');
  ok('basket shared with only low-spike food and the clean link', !!sh && sh[1].pay_url === 'https://ko-fi.com/lena_k' && sh[1].items.length === 2 && sh[1].total_eur === 25, sh && sh[1]);
  ok('shared basket shown with Take down', !!(await P.$('.gb-mine')) && !!(await P.$('[data-gb="down"]')));
  await P.screenshot({ path: out + '/4-shared-' + tag + '.png' });

  /* 6. X goes back to Shop */
  await R.tap('.gb-x'); await H.sleep(1200);
  ok('X closes Give a hand and Shop is back', !(await P.evaluate(() => LowiGiftBasket.isOpen())) && await P.evaluate(() => { const c = document.querySelector('.stp-ov:not(.gb-ov) .stp-card'); if (!c) return false; const r = c.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(c.closest('.stp-ov')).display !== 'none'; }));
  ok('no page errors', errs.length === 0, errs.slice(0, 3));
  const failed = res.filter(r => !r.pass);
  console.log(failed.length ? 'FAILED ' + failed.length + '/' + res.length : 'ALL ' + res.length + ' PASS', tag);
  fs.writeFileSync(out + '/result-' + tag + '.json', JSON.stringify({ build, tag, res, errs }, null, 1));
  await R.close(); process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
