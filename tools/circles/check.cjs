#!/usr/bin/env node
/* Browser check for Circles (formerly Rooms, user-rooms.js) with two real test accounts against the real Supabase backend.
   Creator: Playwright WebKit with the iPhone 13 profile at 390x844. Member: Chromium at 390x844.
   - the Community menu's first item and the Circles screen say "Circles" (no old name)
   - the creator makes a circle, opens Add people: no server-flagged bot, no demo bot is in the list
   - the creator finds the member by name and taps Add: the member is in at once (2/30), no ask needed
   - the member sees the circle as a member (composer), has NO Add people button, and the server refuses when they try to add
     someone themselves
   - the creator deletes the test circle; both test profiles are cleaned up (accounts are marked lowi_test either way)
   node tools/circles/check.cjs                      -> serves this checkout on a local port
   node tools/circles/check.cjs --url https://therealetm.github.io/lowispike/   -> the live site
   --lang de|en|es (default de). Screenshots go to $SHOT (default /tmp/circles-shots). */
const pw = require(process.env.PW || '/tmp/pw/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const TA = require('../user-rooms/test-account.cjs');
const ROOT = process.env.ROOT || path.join(__dirname, '..', '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const LANG = arg('lang', 'de');
const SHOT = process.env.SHOT || '/tmp/circles-shots'; fs.mkdirSync(SHOT, { recursive: true });
const MT = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/json', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.jpg': 'image/jpeg' };
const WORD = { de: { circles: 'Circles', make: 'Circle erstellen', add: 'Leute hinzufügen' }, en: { circles: 'Circles', make: 'Create a circle', add: 'Add people' }, es: { circles: 'Círculos', make: 'Crear círculo', add: 'Añadir gente' } }[LANG];
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const seed = ({ lang, name, day }) => { try {
  localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowispike.lang', lang); localStorage.setItem('lowi.lang', lang);
  localStorage.setItem('lowi.daily.seen', day); sessionStorage.setItem('lowi.a2hs.x', '1'); localStorage.setItem('lowi.news.seen', '99999');
  localStorage.setItem('lowispike.tutorial.v1', JSON.stringify({ done: true }));
  if (!localStorage.getItem('lowispike.v2')) localStorage.setItem('lowispike.v2', JSON.stringify({ v: 2, setupDone: true, onboarded: true, xp: 0, ledger: [], logs: [], saved: [], lang, user: { name, bday: '1990-01-01', tags: [] } }));
} catch (e) { } };
(async () => {
  let url = arg('url', ''), srv = null;
  if (!url) { srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; fs.readFile(path.join(ROOT, u), (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': MT[path.extname(u)] || 'application/octet-stream' }); r.end(b); }); });
    await new Promise(r => srv.listen(0, r)); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const wk = await pw.webkit.launch(), cr = await pw.chromium.launch();
  const out = { url, steps: [], fails: [], errs: {}, uids: {}, view: {} };
  const T0 = Date.now(); const ok = (c, s) => { (c ? out.steps : out.fails).push(s); console.error(((Date.now() - T0) / 1000).toFixed(0) + 's ' + (c ? 'ok   ' : 'FAIL ') + s); };
  const tag = String(Date.now()).slice(-4), memberName = 'Jonas Test ' + tag;
  const open = async (name, browser, ctxOpts, who) => {
    const ctx = await browser.newContext(Object.assign({ serviceWorkers: 'block', reducedMotion: 'reduce', locale: LANG === 'de' ? 'de-DE' : LANG === 'es' ? 'es-ES' : 'en-US' }, ctxOpts));
    await ctx.addInitScript(seed, { lang: LANG, name: who, day: today() });
    const page = await ctx.newPage(), errs = []; out.errs[name] = errs;
    page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
    page.on('dialog', d => d.accept().catch(() => { }));
    await page.goto(url + (url.includes('?') ? '&' : '?') + 'circles=' + Date.now(), { waitUntil: 'load', timeout: 90000 });
    await page.waitForFunction(() => typeof window.goTab === 'function' && window.LowiUserRooms, null, { timeout: 120000 });
    await page.waitForTimeout(2500);
    /* the test accounts are anonymous, so the email sign-in gate is up; take it down (real users have signed in) */
    await page.evaluate(() => { const off = () => { const H = document.documentElement; H.classList.remove('gate-boot', 'gate-up'); const g = document.getElementById('r2gate'); if (g) g.style.display = 'none';
      for (const el of document.body.children) { if (el.id !== 'r2gate' && el.inert) el.inert = false; } }; off(); setInterval(off, 150); });
    for (let i = 0; i < 80; i++) { const u = await page.evaluate(() => { try { return LOWI_CLOUD_X.state().uid || ''; } catch (e) { return ''; } }); if (u) { out.uids[name] = u; break; } await page.waitForTimeout(500); }
    out.marked = out.marked || {}; out.marked[name] = await TA.markTest(page);
    out.view[name] = await page.evaluate(() => innerWidth + 'x' + innerHeight);
    /* keep the test session so a stopped run can still delete its test circle afterwards */
    try { const tk = await page.evaluate(async () => { const c = await LOWI_CLOUD_X.client(); const s = (await c.auth.getSession()).data.session; return s ? { uid: s.user.id, refresh: s.refresh_token } : null; });
      if (tk) fs.appendFileSync('/tmp/circles-test-sessions.jsonl', JSON.stringify(Object.assign({ at: new Date().toISOString(), who: name }, tk)) + '\n'); } catch (e) { }
    return { name, ctx, page };
  };
  /* press a button the way a tap does, without waiting on WebKit's busy render loop */
  const tap = (d, sel) => d.page.evaluate(s => { const b = document.querySelector(s); if (!b) return false; b.click(); return true; }, sel);
  const text = d => d.page.evaluate(() => (document.querySelector('.ur-card') || {}).innerText || '');
  const waitFor = async (d, fn, a, ms) => { try { await d.page.waitForFunction(fn, a, { timeout: ms || 30000, polling: 500 }); return true; } catch (e) { return false; } };
  const shot = (d, n) => d.page.screenshot({ path: path.join(SHOT, n + '.png'), timeout: 15000 }).catch(e => { out.shotFails = (out.shotFails || []).concat(n); });
  const viaMenu = async d => { await d.page.evaluate(() => { try { goTab('foryou'); } catch (e) { } }); await d.page.waitForTimeout(2500);
    await tap(d, '.rm-menu-btn'); await d.page.waitForTimeout(1200);
    const first = await d.page.evaluate(() => { const x = document.querySelector('[data-rmm]'); return x ? x.dataset.rmm + '|' + x.textContent.trim() : ''; });
    ok(first.startsWith('urooms|') && first.includes(WORD.circles), d.name + ': first Community menu item is "' + WORD.circles + '" (' + first + ')');
    if (d.name === 'creator') await shot(d, 'creator-menu');
    if (!(await tap(d, '[data-rmm="urooms"]'))) await d.page.evaluate(() => LowiUserRooms.open());
    await d.page.waitForSelector('.ur .ur-card', { timeout: 10000 }); await d.page.waitForTimeout(1500); };
  const iphone13 = Object.assign({}, pw.devices['iPhone 13'], { viewport: { width: 390, height: 844 } });
  const A = await open('creator', wk, iphone13, 'Lena Test');
  const B = await open('member', cr, { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, memberName);
  ok(out.uids.creator && out.uids.member && out.uids.creator !== out.uids.member, 'two separate signed-in test accounts');
  ok(out.view.creator === '390x844', 'creator viewport is 390x844 in WebKit (' + out.view.creator + ')');
  /* the member's profile row (with its name) must exist before it can be found in Add people */
  const hasProfile = await waitFor(A, async ([u]) => { try { const c = await LOWI_CLOUD_X.client(); const r = await c.from('profiles').select('id,name').eq('id', u); return !!(r.data && r.data[0] && r.data[0].name); } catch (e) { return false; } }, [out.uids.member], 60000);
  if (!hasProfile) await B.page.evaluate(async n => { try { const c = await LOWI_CLOUD_X.client(); await c.from('profiles').upsert({ id: LOWI_CLOUD_X.state().uid, name: n }); } catch (e) { } }, memberName);
  await viaMenu(A);
  let t = await text(A);
  ok(t.includes(WORD.circles) && t.includes(WORD.make) && !/\b(Rooms?|Räume|Raum|Salas?)\b/.test(t), 'creator: the screen says "' + WORD.circles + '" and "' + WORD.make + '", no old name');
  await shot(A, 'creator-list');
  const circleName = 'Typ 2 gemeinsam ' + tag;
  out.circle = circleName;
  const dropCircle = () => A.page.evaluate(async n => { try { const c = await LOWI_CLOUD_X.client(); const r = await c.from('user_rooms').delete().eq('name', n).eq('owner_id', LOWI_CLOUD_X.state().uid).select('id'); return (r.data || []).length; } catch (e) { return 'err ' + e.message; } }, circleName).catch(e => 'err ' + e.message);
  try {
  await tap(A, '[data-ur="make"]'); await A.page.waitForSelector('.ur-name');
  await A.page.fill('.ur-name', circleName); await A.page.fill('.ur-topic', 'Check von Maya, wird gleich gelöscht.');
  await tap(A, '[data-ur="create"]');
  const made = await waitFor(A, n => { const c = document.querySelector('.ur-card'); return c && c.dataset.mode === 'room' && c.innerText.includes(n); }, circleName);
  ok(made, 'creator: circle created and opened' + (made ? '' : ' (' + (await text(A)).slice(0, 200).replace(/\n/g, ' ') + ')'));
  ok(await A.page.locator('[data-ur="add"]').count() === 1, 'creator: sees the "' + WORD.add + '" button in their circle');
  await shot(A, 'creator-circle');
  await tap(A, '[data-ur="add"]');
  const listed = await waitFor(A, () => { const c = document.querySelector('.ur-card'); return c && c.dataset.mode === 'add' && !document.querySelector('.ur-cands .ur-quiet') || (c && c.dataset.mode === 'add' && LowiUserRooms._state().cands >= 0 && document.querySelector('.ur-cands')); }, null, 25000);
  ok(listed, 'creator: Add people opens with a list');
  await A.page.waitForTimeout(800);
  /* no bots: nothing in the list is a server-flagged bot or a demo bot */
  const bots = await A.page.evaluate(async () => {
    const ids = [...document.querySelectorAll('[data-ur="addp"]')].map(b => b.dataset.u), names = [...document.querySelectorAll('[data-ur="addp"]')].map(b => b.dataset.n);
    const c = await LOWI_CLOUD_X.client(); const r = await c.from('profiles').select('id').eq('bot', true).limit(5000); const botIds = new Set((r.data || []).map(x => x.id));
    const demo = new Set((window.LOWI_BOTS || []).map(b => String((b && (b.name || b.n)) || b || '').toLowerCase()));
    return { shown: ids.length, serverBots: botIds.size, botsShown: ids.filter(i => botIds.has(i)).length, demoShown: names.filter(n => demo.has(String(n).toLowerCase())).length, err: r.error ? r.error.message : '' };
  });
  out.addList = bots;
  ok(!bots.err && bots.botsShown === 0 && bots.demoShown === 0, 'creator: no bots in the Add people list (' + bots.shown + ' people shown, ' + bots.serverBots + ' server bots, ' + bots.botsShown + ' bots shown, ' + bots.demoShown + ' demo bots shown)');
  const fit = await A.page.evaluate(() => { const bs = [...document.querySelectorAll('[data-ur="addp"]')].slice(0, 8).map(b => b.getBoundingClientRect()), f = document.querySelector('.ur-find').getBoundingClientRect(), card = document.querySelector('.ur-card').getBoundingClientRect();
    return { n: bs.length, right: Math.max(0, ...bs.map(r => r.right)), minH: Math.min(99, ...bs.map(r => r.height)), find: [Math.round(f.left), Math.round(f.right)], card: [Math.round(card.left), Math.round(card.right), Math.round(card.bottom)], vw: innerWidth, vh: innerHeight }; });
  out.addLayout = fit;
  ok(fit.right <= fit.vw && fit.find[1] <= fit.vw && fit.card[1] <= fit.vw && fit.card[2] <= fit.vh && (fit.n === 0 || fit.minH >= 40), 'creator: Add people fits 390 wide, Add buttons at least 40px tall (' + JSON.stringify(fit) + ')');
  await shot(A, 'creator-add-list');
  await A.page.fill('.ur-find', 'Jonas Test ' + tag); await A.page.waitForTimeout(500);
  const row = A.page.locator('[data-ur="addp"][data-u="' + out.uids.member + '"]');
  ok(await row.count() === 1, 'creator: finds "' + memberName + '" by searching the name');
  await shot(A, 'creator-add-search');
  console.error('tapping Add');
  if (await row.count()) await tap(A, '[data-ur="addp"][data-u="' + out.uids.member + '"]');
  ok(await waitFor(A, u => { const s = window.LowiUserRooms && LowiUserRooms._state(); return !!document.querySelector('.ur-ok') && !document.querySelector('[data-ur="addp"][data-u="' + u + '"]'); }, out.uids.member), 'creator: tapped Add, sees "' + memberName + '" is in');
  await shot(A, 'creator-added');
  await tap(A, '[data-ur="room"]');
  ok(await waitFor(A, () => /2\/30/.test((document.querySelector('.ur-card') || {}).innerText || '')), 'creator: circle shows 2/30, no ask needed');
  const status = await A.page.evaluate(async ([n, u]) => { const c = await LOWI_CLOUD_X.client(); const r = await c.from('user_rooms').select('id').eq('name', n).single(); const m = await c.from('user_room_members').select('status').eq('room_id', r.data.id).eq('user_id', u); return (m.data && m.data[0] && m.data[0].status) || 'none'; }, [circleName, out.uids.member]);
  ok(status === 'member', 'server: the added person is a member (' + status + ')');
  /* the member's side */
  await viaMenu(B);
  const seen = await waitFor(B, n => [...document.querySelectorAll('.ur-room b')].some(b => b.textContent === n), circleName, 25000);
  ok(seen, 'member: sees the circle in the list');
  if (seen) {
    await B.page.locator('.ur-room', { hasText: circleName }).click({ force: true }); await B.page.waitForTimeout(1500);
    ok(await B.page.locator('.ur-text').count() === 1, 'member: is inside (can write) without asking');
    ok(await B.page.locator('[data-ur="add"]').count() === 0, 'member: has no "' + WORD.add + '" button');
    await shot(B, 'member-circle');
    const refused = await B.page.evaluate(async n => { const c = await LOWI_CLOUD_X.client(); const r = await c.from('user_rooms').select('id').eq('name', n).single();
      const x = await c.from('user_room_members').insert({ room_id: r.data.id, user_id: '00000000-0000-4000-8000-00000000c1c1', who: 'Someone', status: 'member' });
      return x.error ? 'refused: ' + x.error.message : 'allowed'; }, circleName);
    ok(/^refused/.test(refused), 'server: a member cannot add someone (' + refused.slice(0, 90) + ')');
  }
  /* clean up: the creator deletes the test circle */
  await tap(A, '[data-ur="del"]');
  const gone = await waitFor(A, n => { const c = document.querySelector('.ur-card'); return c && document.querySelector('[data-ur="make"]') && !document.querySelector('.ur-text') && ![...document.querySelectorAll('.ur-room b')].some(b => b.textContent === n); }, circleName, 15000);
  const gonePage = await A.page.evaluate(() => { const c = document.querySelector('.ur-card'), e = document.querySelector('.ur-err'); return c ? c.dataset.mode + (e ? ' err: ' + e.textContent : '') + (c.dataset.mode === 'list' ? '' : ': ' + c.innerText.slice(0, 160).replace(/\n/g, ' ')) : 'no card'; }).catch(e => e.message);
  out.afterDelete = gonePage;
  ok(gone, 'creator: deleted the test circle' + (gone ? '' : ' (' + gonePage + ')'));
  } catch (e) { ok(false, 'check stopped: ' + String(e && e.message || e).split('\n')[0]); }
  finally { out.leftover = await dropCircle(); }
  for (const d of [A, B]) { const e = out.errs[d.name].filter(x => !/ResizeObserver/.test(x)); ok(!e.length, d.name + ': no page errors' + (e.length ? ' ' + e.join(' | ') : '')); }
  out.cleanup = {}; for (const d of [A, B]) out.cleanup[d.name] = await TA.cleanup(d.page);
  ok(Object.values(out.marked || {}).every(v => v === 'ok'), 'test accounts marked lowi_test');
  out.pass = !out.fails.length;
  console.log(JSON.stringify(out, null, 1));
  await wk.close(); await cr.close(); if (srv) srv.close(); process.exit(out.pass ? 0 : 1);
})().catch(e => { console.error('CHECK CRASH', e); process.exit(2); });
