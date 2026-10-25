'use strict';
/* Oct 25 2026: Give a hand against the LIVE site and the REAL Supabase project, with three fresh anonymous test accounts
   (A asks, B helps, C is a stranger). No real money: Ko-fi / Stripe / PayPal pages are answered locally, nothing is paid.
   ENG=webkit|chromium node tools/gift-basket/live-e2e.cjs [url] [outdir]
   Prints the three test uids on the last line (UIDS ...) so they can be deleted afterwards. */
const fs = require('fs');
const pw = require('/tmp/pw/node_modules/playwright');
const URL0 = process.argv[2] || 'https://therealetm.github.io/lowispike/';
const OUT = process.argv[3] || '/tmp/gift-live';
const ENG = process.env.ENG || 'chromium';
const KOFI = process.env.KOFI || 'ko-fi.com/kofi';
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const res = []; const ok = (name, pass, info) => { res.push({ name, pass: !!pass, info }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' ' + JSON.stringify(info).slice(0, 300) : '')); };
const INIT = ([name]) => {
  try {
    const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    localStorage.setItem('lowi.daily.seen', k); sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowi.news.seen', '99999');
    if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, user: { name }, xp: 0, ledger: [], logs: [], saved: [], settings: { lang: 'en' } }));
    localStorage.setItem('lowi.tutorial.done', '1'); localStorage.setItem('lowispike.lang', 'en'); localStorage.setItem('lowi.lang', 'en');
    localStorage.setItem('lowi.storePicks.tab', 'kitchen'); localStorage.removeItem('lowi.giftBasket.server.v1');
  } catch (e) { }
};
(async () => {
  const browser = await pw[ENG].launch({ args: ENG === 'chromium' ? ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] : [] });
  const dev = pw.devices['iPhone 13'];
  const errs = {};
  async function person(name, email) {
    const base = ENG === 'webkit' ? Object.assign({}, dev) : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, userAgent: dev.userAgent };
    const ctx = await browser.newContext(Object.assign(base, { serviceWorkers: 'block' }));
    await ctx.addInitScript(INIT, [name]);
    await ctx.route(/ko-fi\.com|paypal\.me|stripe\.com/, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>payment page (test, nothing paid)</p>' }));
    const P = await ctx.newPage();
    const popups = []; ctx.on('page', p => { if (p === P) return; popups.push(p.url()); p.on('framenavigated', f => { if (f === p.mainFrame()) popups.push(f.url()); }); p.waitForLoadState('domcontentloaded', { timeout: 20000 }).catch(() => {}).then(() => { popups.push(p.url()); setTimeout(() => p.close().catch(() => {}), 300); }); }); errs[name] = []; P.on('pageerror', e => errs[name].push(String(e && e.message || e)));
    await P.goto(URL0, { waitUntil: 'commit', timeout: 180000 });
    const wait = async () => { let st = null; for (let i = 0; i < 150; i++) { await sleep(1000); st = await P.evaluate(() => { const x = window.LOWI_CLOUD_X; return x && x.state ? x.state() : null; }).catch(() => null); if (st && st.live && st.uid) break; } return st; };
    let st = await wait();
    /* the live app asks every anonymous visitor to sign in first, so the test accounts are email accounts made for this test */
    if (email) {
      const si = await P.evaluate(async ([em, pw]) => { const sb = await window.LOWI_CLOUD_X.client(); const r = await sb.auth.signInWithPassword({ email: em, password: pw }); return { err: r.error && r.error.message, uid: r.data && r.data.user && r.data.user.id }; }, [email, process.env.GIFT_PW]);
      if (si.err) console.log('sign-in', name, si.err);
      await P.reload({ waitUntil: 'commit', timeout: 180000 }); st = await wait();
      for (let i = 0; i < 30 && await P.evaluate(() => document.documentElement.classList.contains('gate-up') || document.documentElement.classList.contains('gate-boot')); i++) await sleep(1000);
      const gate = await P.evaluate(() => document.documentElement.classList.contains('gate-up'));
      if (gate) { console.log('gate still up for', name, await P.evaluate(() => (document.getElementById('r2gate') || {}).innerText || '').then(t => t.slice(0, 200))); await P.screenshot({ path: OUT + '/gate-' + name + '-' + ENG + '.png', timeout: 60000 }).catch(() => {}); }
    }
    return { name, ctx, P, popups, uid: st && st.uid, live: !!(st && st.live) };
  }
  const tap = async (P, sel) => { await P.evaluate(s => { const e = document.querySelector(s); if (e) e.scrollIntoView({ block: 'center' }); }, sel); await sleep(250); await P.tap(sel, { timeout: 8000 }); };
  const text = P => P.evaluate(() => (document.querySelector('.gb-card') || {}).innerText || '');
  async function openGive(X) {
    const P = X.P;
    await P.evaluate(() => { try { localStorage.removeItem('lowi.giftBasket.server.v1'); } catch (e) { } return window.LowiGiftBasket && window.LowiGiftBasket.probe && window.LowiGiftBasket.probe(); }); await sleep(1500);
    await P.evaluate(() => { try { window.LowiGiftBasket.isOpen() && document.querySelector('.gb-x') && document.querySelector('.gb-x').click(); } catch (e) { } }); await sleep(600);
    await P.evaluate(() => LowiStorePicks.open('home-bloom')); await sleep(1800);
    if (await P.evaluate(() => LowiStorePicks.tab()) !== 'kitchen') { await tap(P, '[data-stp-tab="kitchen"]'); await sleep(900); }
    const loc = P.locator('.gb-entry:visible').first();
    let entry = false; try { await loc.waitFor({ state: 'visible', timeout: 25000 }); entry = true; } catch (e) {
      const why = await P.evaluate(() => [...document.querySelectorAll('.gb-entry')].map(e => { const r = e.getBoundingClientRect(); let p = e, h = []; while (p && p !== document.body) { const cs = getComputedStyle(p); if (cs.display === 'none' || cs.visibility === 'hidden' || p.hidden) h.push((p.className || p.id || p.tagName) + ':' + cs.display + '/' + cs.visibility); p = p.parentElement; } return { r: [r.x, r.y, r.width, r.height], h }; }));
      console.log('entry not visible', JSON.stringify(why), await P.evaluate(() => LowiStorePicks.tab())); await P.screenshot({ path: OUT + '/fail-entry-' + ENG + '.png' }); }
    if (entry) { await loc.scrollIntoViewIfNeeded().catch(() => {}); await sleep(300); await loc.tap({ timeout: 10000 }); await sleep(2500); }
    return entry;
  }
  const sbq = (P, fn, arg) => P.evaluate(async ([src, arg]) => { const sb = await window.LOWI_CLOUD_X.client(); const f = new Function('sb', 'arg', 'return (async () => {' + src + '})()'); try { return await f(sb, arg); } catch (e) { return { thrown: String(e && e.message || e) }; } }, [fn, arg]);

  const A = await person('GiftTestA', 'gift-test-a@lowispike-test.invalid'), B = await person('GiftTestB', 'gift-test-b@lowispike-test.invalid'), C = await person('GiftTestC', 'gift-test-c@lowispike-test.invalid');
  ok('three throwaway test accounts signed in live', A.live && B.live && C.live && new Set([A.uid, B.uid, C.uid]).size === 3 && ![A, B, C].some(X => X.anon), [A.uid, B.uid, C.uid]);
  const build = await A.P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || window.LOWI_BUILD || '');
  console.log('build', build, ENG);

  /* tampered app: the server itself refuses spike food, a Ko-fi dashboard link and a basket for someone else */
  const row = { first_name: null, anon: true, city: null, total_eur: 20 };
  const t1 = await sbq(A.P, "const r = await sb.from('gift_baskets').insert(Object.assign({ user_id: arg.uid, items: [{ n: 'Eier' }, { n: 'Cola' }], pay_url: 'https://ko-fi.com/kofi' }, arg.row)).select('id'); return { err: r.error && r.error.message, data: r.data };", { uid: A.uid, row });
  ok('server refuses a spike food from a tampered app', !!(t1 && t1.err) && /low_spike|check/i.test(t1.err), t1);
  const t2 = await sbq(A.P, "const r = await sb.from('gift_baskets').insert(Object.assign({ user_id: arg.uid, items: [{ n: 'Eier' }], pay_url: 'https://ko-fi.com/Manage' }, arg.row)).select('id'); return { err: r.error && r.error.message, data: r.data };", { uid: A.uid, row });
  ok('server refuses the Ko-fi dashboard link', !!(t2 && t2.err) && /kofi|check/i.test(t2.err), t2);
  const t3 = await sbq(A.P, "const r = await sb.from('gift_baskets').insert(Object.assign({ user_id: arg.uid, items: [{ n: 'Eier' }], pay_url: 'https://ko-fi.com/kofi' }, arg.row)).select('id'); return { err: r.error && r.error.message, data: r.data };", { uid: B.uid, row });
  ok('server refuses a basket posted for someone else', !!(t3 && t3.err), t3);

  /* A: Shop > Kitchen shows Give a hand on the real server; build and share a basket through the real UI */
  ok('A: Give a hand entry in Shop > Kitchen (real server table)', await openGive(A));
  ok('A: panel open', await A.P.evaluate(() => LowiGiftBasket.isOpen()));
  await A.P.screenshot({ path: OUT + '/1-give-A-' + ENG + '.png' });
  await tap(A.P, '[data-gb-tab="mine"]'); await sleep(1200);
  await tap(A.P, '.gb-add-chip'); await sleep(500);
  await tap(A.P, '#gb-item'); await A.P.keyboard.type('Cola'); await A.P.keyboard.press('Enter'); await sleep(700);
  ok('A: Cola refused in the app with a reason', (await text(A.P)).includes('isn’t low-spike') && (await A.P.evaluate(() => LowiGiftBasket._state().draft.items.length)) === 1);
  await A.P.fill('#gb-item', ''); await tap(A.P, '#gb-item'); await A.P.keyboard.type('Broccoli'); await A.P.keyboard.press('Enter'); await sleep(700);
  ok('A: Broccoli added', (await A.P.evaluate(() => LowiGiftBasket._state().draft.items.length)) === 2);
  await tap(A.P, '#gb-total'); await A.P.keyboard.type('25'); await sleep(200);
  await tap(A.P, '#gb-link'); await A.P.keyboard.type('ko-fi.com/Manage'); await sleep(500);
  const refusedMsg = await A.P.evaluate(() => document.getElementById('gb-linkmsg').textContent);
  ok('A: ko-fi.com/Manage refused, Share off', (await A.P.evaluate(() => document.getElementById('gb-linkmsg').classList.contains('gb-low'))) && await A.P.evaluate(() => document.querySelector('.gb-share').disabled), refusedMsg);
  await A.P.screenshot({ path: OUT + '/2-refused-A-' + ENG + '.png' });
  await A.P.fill('#gb-link', ''); await tap(A.P, '#gb-link'); await A.P.keyboard.type(KOFI); await sleep(500);
  const okMsg = await A.P.evaluate(() => document.getElementById('gb-linkmsg').textContent);
  ok('A: real Ko-fi page accepted (✓ Ko-fi), Share on', okMsg.includes('✓') && okMsg.includes('Ko-fi') && !(await A.P.evaluate(() => document.querySelector('.gb-share').disabled)), okMsg);
  await A.P.screenshot({ path: OUT + '/3-accepted-A-' + ENG + '.png' });
  await tap(A.P, '.gb-share'); await sleep(2500);
  const mineRow = await sbq(A.P, "const r = await sb.from('gift_baskets').select('*').eq('user_id', arg); return { err: r.error && r.error.message, data: r.data };", A.uid);
  const basket = mineRow && mineRow.data && mineRow.data[0];
  ok('A: basket stored on the real server with only low-spike food and the clean link', !!basket && basket.pay_url === 'https://' + KOFI && basket.items.length === 2 && Number(basket.total_eur) === 25, basket || mineRow);
  ok('A: shared basket shown with Take down', !!(await A.P.$('.gb-mine')) && !!(await A.P.$('[data-gb="down"]')));
  const id = basket && basket.id;

  /* B: sees it, Pay opens the link outside the app, I helped claims it */
  ok('B: Give a hand entry', await openGive(B));
  const bSees = !!(await B.P.$('[data-gb-id="' + id + '"]'));
  ok('B: sees A’s basket in the list', bSees, (await text(B.P)).slice(0, 200));
  if (bSees) {
    const href = await B.P.evaluate(id => { const a = document.querySelector('[data-gb-id="' + id + '"] a.gb-pay'); return a && [a.href, a.target, a.rel].join(' '); }, id); console.log('pay link', href);
    await tap(B.P, '[data-gb-id="' + id + '"] a.gb-pay'); for (let i = 0; i < 16 && !B.popups.some(u => u.includes(KOFI)); i++) await sleep(500);
    ok('B: Pay opened A’s own Ko-fi page outside the app', B.popups.some(u => u.includes(KOFI)), B.popups);
    await tap(B.P, '[data-gb-help="' + id + '"]'); await sleep(2500);
  }
  const afterHelp = await sbq(B.P, "const r = await sb.from('gift_baskets').select('helper_id,helped_at').eq('id', arg).single(); return { err: r.error && r.error.message, data: r.data };", id);
  ok('B: I helped claimed the basket on the server', afterHelp && afterHelp.data && afterHelp.data.helper_id === B.uid && !!afterHelp.data.helped_at, afterHelp);
  ok('B: basket moved to Baskets you helped, waiting for receipt', !!(await B.P.$('.gb-given[data-gb-id="' + id + '"]')) && (await text(B.P)).includes('Waiting for their receipt'));
  await B.P.screenshot({ path: OUT + '/4-helped-B-' + ENG + '.png' });
  const again = await sbq(C.P, "const r = await sb.rpc('gift_help', { basket: arg }); return { err: r.error && r.error.message, data: r.data };", id);
  ok('C: cannot claim a basket that is already taken', !!(again && again.err), again);
  const cList = await sbq(C.P, "const r = await sb.from('gift_baskets').select('id').eq('id', arg); return { err: r.error && r.error.message, n: (r.data || []).length };", id);
  ok('C: a helped basket is no longer visible to strangers', cList && cList.n === 0, cList);

  /* A: receipt photo through the real UI (bottom blurred), stored in the private bucket */
  ok('A: reopen Give a hand', await openGive(A));
  await tap(A.P, '[data-gb-tab="mine"]'); await sleep(1500);
  ok('A: receipt ask with the privacy line', !!(await A.P.$('.gb-due')) && (await text(A.P)).includes('Cover your card number'));
  const pngB64 = await A.P.evaluate(() => { const c = document.createElement('canvas'); c.width = 600; c.height = 1000; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 600, 1000); g.fillStyle = '#000'; g.font = '40px sans-serif'; g.fillText('TEST RECEIPT', 30, 60); g.fillText('EIER 2,49', 30, 120); g.fillText('BROKKOLI 1,29', 30, 180); g.fillText('VISA ****0000', 30, 940); return c.toDataURL('image/png').split(',')[1]; });
  if (await A.P.$('.gb-due input[type=file]')) {
    await A.P.setInputFiles('.gb-due input[type=file]', { name: 'receipt.png', mimeType: 'image/png', buffer: Buffer.from(pngB64, 'base64') }); await sleep(1800);
    ok('A: preview with blur on', !!(await A.P.$('.gb-due .gb-receipt img')) && await A.P.evaluate(() => document.getElementById('gb-blur').checked));
    await tap(A.P, '[data-gb="send-receipt"]'); await sleep(3500);
  }
  const afterRc = await sbq(A.P, "const r = await sb.from('gift_baskets').select('receipt_path,receipt_at').eq('id', arg).single(); return { err: r.error && r.error.message, data: r.data };", id);
  ok('A: receipt stored and recorded on the server', afterRc && afterRc.data && afterRc.data.receipt_path === A.uid + '/' + id + '.jpg' && !!afterRc.data.receipt_at, afterRc);
  await A.P.screenshot({ path: OUT + '/5-receipt-A-' + ENG + '.png' });
  const path = A.uid + '/' + id + '.jpg';
  const cRead = await sbq(C.P, "const r = await sb.storage.from('gift-receipts').createSignedUrl(arg, 60); const d = await sb.storage.from('gift-receipts').download(arg); return { signErr: r.error && r.error.message, dlErr: d.error && (d.error.message || String(d.error)), got: !!(d.data && d.data.size) };", path);
  ok('C: a stranger cannot read the receipt photo', cRead && !cRead.got && !!cRead.dlErr, cRead);

  /* B: sees the receipt and verifies */
  ok('B: reopen Give a hand', await openGive(B));
  await sleep(1500);
  const img = await B.P.evaluate(async (id) => { const i = document.querySelector('.gb-given[data-gb-id="' + id + '"] .gb-receipt img'); if (!i) return null; await i.decode().catch(() => {}); return { w: i.naturalWidth, h: i.naturalHeight }; }, id);
  ok('B: the giver sees the receipt photo', img && img.w > 100, img);
  if (await B.P.$('[data-gb-verdict="verified"][data-gb-for="' + id + '"]')) { await tap(B.P, '[data-gb-verdict="verified"][data-gb-for="' + id + '"]'); await sleep(2500); }
  const afterV = await sbq(B.P, "const r = await sb.from('gift_baskets').select('verdict').eq('id', arg).single(); return { err: r.error && r.error.message, data: r.data };", id);
  ok('B: Verified stored on the server', afterV && afterV.data && afterV.data.verdict === 'verified', afterV);
  ok('B: You verified it shown', (await text(B.P)).includes('You verified it'));
  await B.P.screenshot({ path: OUT + '/6-verified-B-' + ENG + '.png' });
  const tr = await sbq(C.P, "const r = await sb.rpc('gift_trust', { uids: [arg] }); return { err: r.error && r.error.message, data: r.data };", A.uid);
  ok('anyone: A’s verified score is 1 of 1', tr && tr.data && tr.data[0] && tr.data[0].counted === 1 && tr.data[0].verified === 1, tr);
  const twice = await sbq(B.P, "const r = await sb.rpc('gift_verdict', { basket: arg, v: 'mismatch' }); return { err: r.error && r.error.message };", id);
  ok('B: the verdict cannot be changed afterwards', twice && !!twice.err, twice);

  /* clean up: A removes its test receipt photos (the rows go when the test accounts are deleted) */
  const clean = await sbq(A.P, "const l = await sb.storage.from('gift-receipts').list(arg); const names = (l.data || []).map(f => arg + '/' + f.name); const r = names.length ? await sb.storage.from('gift-receipts').remove(names) : { data: [] }; return { listed: names.length, removed: (r.data || []).length, err: r.error && r.error.message };", A.uid);
  console.log('cleanup receipts', JSON.stringify(clean));
  for (const X of [A, B, C]) ok(X.name + ': no page errors', errs[X.name].length === 0, errs[X.name].slice(0, 3));
  const failed = res.filter(r => !r.pass);
  console.log(failed.length ? 'FAILED ' + failed.length + '/' + res.length : 'ALL ' + res.length + ' PASS', ENG, build);
  fs.writeFileSync(OUT + '/result-' + ENG + '.json', JSON.stringify({ build, ENG, res, errs }, null, 1));
  console.log('UIDS ' + [A.uid, B.uid, C.uid].join(' '));
  await browser.close(); process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
