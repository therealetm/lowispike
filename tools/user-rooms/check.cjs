#!/usr/bin/env node
/* Browser check for Rooms (user-rooms.js) with two real accounts against the real Supabase backend:
   iPhone-size owner creates a room, iPad-size visitor reads along and asks, owner lets them in, both write, both see both messages.
   Then the owner deletes the test room. German by default.
   node tools/user-rooms/check.cjs                      -> serves this checkout on a local port
   node tools/user-rooms/check.cjs --url https://therealetm.github.io/lowispike/   -> the live site
   Screenshots go to $SHOT (default /tmp/user-rooms-shots). Prints JSON with the result and the two test account ids (for cleanup). */
const pw = require(process.env.PW || '/tmp/pw/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const TA = require('./test-account.cjs'); /* marks every account this script makes as a test account (hidden from real people) */
const ROOT = process.env.ROOT || path.join(__dirname, '..', '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const LANG = arg('lang', 'de'), KEEP = process.argv.includes('--keep');
const SHOT = process.env.SHOT || '/tmp/user-rooms-shots'; fs.mkdirSync(SHOT, { recursive: true });
const MT = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/json', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.jpg': 'image/jpeg' };
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
  const browser = await pw.chromium.launch();
  const out = { url, steps: [], fails: [], errs: {}, uids: {} };
  const ok = (c, s) => { (c ? out.steps : out.fails).push(s); };
  const open = async (name, w, h, who) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: w < 1000, hasTouch: true, serviceWorkers: 'block', locale: 'de-DE' });
    await ctx.addInitScript(seed, { lang: LANG, name: who, day: today() });
    const page = await ctx.newPage(), errs = []; out.errs[name] = errs;
    page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
    page.on('dialog', d => d.accept().catch(() => { }));
    await page.goto(url + (url.includes('?') ? '&' : '?') + 'rooms=' + Date.now(), { waitUntil: 'load', timeout: 90000 });
    await page.waitForFunction(() => typeof window.goTab === 'function' && window.LowiUserRooms, null, { timeout: 120000 });
    /* the test accounts are anonymous, so the email sign-in gate is up; take it down (real users have signed in) */
    await page.waitForTimeout(2500);
    await page.evaluate(() => { const off = () => { const H = document.documentElement; H.classList.remove('gate-boot', 'gate-up'); const g = document.getElementById('r2gate'); if (g) g.style.display = 'none';
      for (const el of document.body.children) { if (el.id !== 'r2gate' && el.inert) el.inert = false; } }; off(); setInterval(off, 150); });
    for (let i = 0; i < 80; i++) { const u = await page.evaluate(() => { try { return LOWI_CLOUD_X.state().uid || ''; } catch (e) { return ''; } }); if (u) { out.uids[name] = u; break; } await page.waitForTimeout(500); }
    out.marked = out.marked || {}; out.marked[name] = await TA.markTest(page);
    return { name, ctx, page };
  };
  const viaMenu = async d => { await d.page.evaluate(() => { try { goTab('foryou'); } catch (e) { } }); await d.page.waitForTimeout(2500);
    const b = d.page.locator('.rm-menu-btn').first(); if (await b.count()) { await b.click({ timeout: 8000 }).catch(() => { }); await d.page.waitForTimeout(500); }
    const m = d.page.locator('[data-rmm="urooms"]'); const first = await d.page.evaluate(() => { const x = document.querySelector('.rm-menu [data-rmm]'); return x ? x.dataset.rmm : ''; });
    ok(first === 'urooms', d.name + ': Rooms is the first menu item (' + first + ')');
    if (await m.count()) await m.click({ timeout: 8000 }).catch(() => d.page.evaluate(() => LowiUserRooms.open())); else await d.page.evaluate(() => LowiUserRooms.open());
    await d.page.waitForSelector('.ur .ur-card', { timeout: 10000 }); await d.page.waitForTimeout(1500); };
  const text = d => d.page.evaluate(() => (document.querySelector('.ur-card') || {}).innerText || '');
  const waitFor = async (d, fn, a, ms) => { try { await d.page.waitForFunction(fn, a, { timeout: ms || 20000 }); return true; } catch (e) { return false; } };
  const shot = (d, n) => d.page.screenshot({ path: path.join(SHOT, n + '.png') });
  const roomName = 'Typ 2 gemeinsam ' + String(Date.now()).slice(-4);
  const phone = await open('iphone', 390, 844, 'Lena'), ipad = await open('ipad', 820, 1180, 'Jonas');
  ok(out.uids.iphone && out.uids.ipad && out.uids.iphone !== out.uids.ipad, 'two separate signed-in accounts');
  await viaMenu(phone);
  let t = await text(phone); ok(/Circles/.test(t) && /Circle erstellen/.test(t), 'iPhone: Circles (formerly Rooms) opens in German with "Circle erstellen"');
  await phone.page.click('[data-ur="make"]'); await phone.page.waitForSelector('.ur-name');
  await phone.page.fill('.ur-name', roomName); await phone.page.fill('.ur-topic', 'Für alle mit Typ-2-Diabetes. Tipps, Fragen, Mut.');
  await phone.page.locator('[data-ur="icon"]').nth(5).click(); await phone.page.waitForTimeout(300); await shot(phone, 'iphone-create');
  await phone.page.click('[data-ur="create"]');
  const made = await waitFor(phone, n => { const c = document.querySelector('.ur-card'); return c && c.dataset.mode === 'room' && c.innerText.includes(n); }, roomName);
  ok(made, 'iPhone: room created and opened' + (made ? '' : ' (' + (await text(phone)).slice(0, 200).replace(/\n/g, ' ') + ')'));
  t = await text(phone); ok(/1\/30/.test(t), 'iPhone: creator is the first member (1/30)');
  await viaMenu(ipad);
  const seen = await waitFor(ipad, n => [...document.querySelectorAll('.ur-room b')].some(b => b.textContent === n), roomName, 25000);
  ok(seen, 'iPad: sees the new room in the list (public)');
  await shot(ipad, 'ipad-list');
  if (seen) {
    await ipad.page.locator('.ur-room', { hasText: roomName }).click(); await ipad.page.waitForTimeout(1200);
    t = await text(ipad); ok(/mitlesen/.test(t) && await ipad.page.locator('[data-ur="ask"]').count() === 1 && await ipad.page.locator('.ur-text').count() === 0, 'iPad: can read along, no composer, "Beitritt anfragen" button');
    await ipad.page.click('[data-ur="ask"]');
    ok(await waitFor(ipad, () => /Angefragt/.test((document.querySelector('.ur-card') || {}).innerText || '')), 'iPad: shows "Angefragt. Lena entscheidet."');
    const posted = await ipad.page.evaluate(async n => { try { const c = await LOWI_CLOUD_X.client(); const r = await c.from('user_rooms').select('id').eq('name', n).single(); const x = await c.from('messages').insert({ id: 'urtest' + Date.now(), user_id: LOWI_CLOUD_X.state().uid, room: 'u:' + r.data.id, who: 'Jonas', body: 'sneak' }); return x.error ? 'blocked' : 'posted'; } catch (e) { return 'err ' + e.message; } }, roomName);
    ok(posted === 'blocked', 'server: a pending visitor cannot post (' + posted + ')');
    const selfOk = await ipad.page.evaluate(async n => { const c = await LOWI_CLOUD_X.client(); const r = await c.from('user_rooms').select('id').eq('name', n).single(); const x = await c.from('user_room_members').update({ status: 'member' }).eq('room_id', r.data.id).eq('user_id', LOWI_CLOUD_X.state().uid).select(); return (x.data || []).length; }, roomName);
    ok(selfOk === 0, 'server: a visitor cannot let themselves in');
    ok(await waitFor(phone, () => !!document.querySelector('[data-ur="let"]'), null, 20000), 'iPhone: creator sees "Möchte rein: Jonas"');
    await shot(phone, 'iphone-ask');
    await phone.page.click('[data-ur="let"]').catch(() => { });
    ok(await waitFor(phone, () => /2\/30/.test((document.querySelector('.ur-card') || {}).innerText || '')), 'iPhone: 2/30 after letting Jonas in');
    await phone.page.fill('.ur-text', 'Willkommen, Jonas! Wie läuft dein Fasten?'); await phone.page.press('.ur-text', 'Enter'); await phone.page.waitForTimeout(800);
    ok(await waitFor(ipad, () => !!document.querySelector('.ur-text'), null, 20000), 'iPad: composer appears once let in');
    await ipad.page.fill('.ur-text', 'Danke! 16 Stunden heute, Misty ist glücklich.').catch(() => { }); await ipad.page.click('.ur-say .ur-go').catch(() => { });
    ok(await waitFor(phone, () => /16 Stunden heute/.test((document.querySelector('.ur-msgs') || {}).innerText || ''), null, 20000), 'iPhone: sees Jonas\'s message');
    ok(await waitFor(ipad, () => /Willkommen, Jonas/.test((document.querySelector('.ur-msgs') || {}).innerText || ''), null, 20000), 'iPad: sees Lena\'s message');
    await phone.page.waitForTimeout(800); await shot(phone, 'iphone-room'); await shot(ipad, 'ipad-room');
    const galaxy = await ipad.page.evaluate(async () => { const c = await LOWI_CLOUD_X.client(); const r = await c.from('messages').select('id').eq('room', 'all').ilike('body', '%16 Stunden heute%'); return (r.data || []).length; });
    ok(galaxy === 0, 'room messages never show in the galaxy chat');
  }
  await phone.page.click('[data-ur="list"]').catch(() => { }); await phone.page.waitForTimeout(900); await shot(phone, 'iphone-list');
  ok(/Deiner/.test(await text(phone)), 'iPhone: list marks the room "Deiner"');
  if (!KEEP) { await phone.page.locator('.ur-room', { hasText: roomName }).click().catch(() => { }); await phone.page.waitForTimeout(900); await phone.page.click('[data-ur="del"]').catch(() => { });
    ok(await waitFor(phone, n => ![...document.querySelectorAll('.ur-room b')].some(b => b.textContent === n), roomName, 15000), 'iPhone: creator deleted the test room'); }
  for (const d of [phone, ipad]) { const e = out.errs[d.name].filter(x => !/ResizeObserver/.test(x)); ok(!e.length, d.name + ': no page errors' + (e.length ? ' ' + e.join(' | ') : '')); }
  out.cleanup = {}; if (!KEEP) for (const d of [phone, ipad]) out.cleanup[d.name] = await TA.cleanup(d.page);
  ok(Object.values(out.marked || {}).every(v => v === 'ok'), 'test accounts marked lowi_test');
  out.room = roomName; out.pass = !out.fails.length;
  console.log(JSON.stringify(out, null, 1));
  await browser.close(); if (srv) srv.close(); process.exit(out.pass ? 0 : 1);
})().catch(e => { console.error('CHECK CRASH', e); process.exit(2); });
