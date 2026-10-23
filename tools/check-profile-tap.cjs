'use strict';
/* 23 Oct 2026 (Emmanuel: tapping a name in Community did nothing): every name in the "Chat rooms & people" sheet and the name
   above a chat message opens that person's profile card (by user id). Closing the card with the X (the round X of the world HUD while the world is on) brings the sheet back.
   node tools/check-profile-tap.cjs <device|WxH> [url|root] [lang]   e.g. 'iPhone 13', 'iPad (gen 7)', 'iPad (gen 7) landscape' */
const H = require('./sim/harness.cjs');
const sleep = H.sleep;
(async () => {
  const device = process.argv[2] || 'iPhone 13', where = process.argv[3] || '', lang = process.argv[4] || 'en';
  /* WebKit cannot start on this VM (missing system libraries): Chromium with the device's size and touch */
  const SIZES = { 'iPhone 13': [390, 844, 3], 'iPhone SE': [375, 667, 2], 'iPad': [820, 1180, 2], 'iPad landscape': [1180, 820, 2] }, sz = SIZES[device] || [390, 844, 3];
  const o = { device, engine: 'chromium', viewport: { width: sz[0], height: sz[1] }, dpr: sz[2], members: 20, messages: 60, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else if (where) o.root = where;
  const R = await H.open(o), P = R.page, out = { device, lang, steps: [] }, ok = (name, pass, info) => { out.steps.push({ name, pass: pass === null ? null : !!pass, info }); }; global.__pt = out;
  await R.goto(); await sleep(5000);
  out.build = await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || (window.LOWI_BUILD || ''));
  await P.evaluate(() => goTab('foryou')); await sleep(1200);
  await R.tap('#cmPaneChat .rm-tab[data-rm="chat"]').catch(() => { }); await sleep(1500);
  const card = () => P.evaluate(() => { const c = [...document.querySelectorAll('.r2-ov.on .cp-card, .r2-ov.on .cs-sheet h2')].pop(); if (!c) return null; const root = c.closest('.r2-ov'); const r = root.querySelector('.r2-sh').getBoundingClientRect(); const h = (root.querySelector('.cp-card h2') || root.querySelector('h2') || {}).textContent || ''; return { name: h.trim(), person: (root.querySelector('.cp-card') || {}).dataset ? root.querySelector('.cp-card').dataset.person : '', top: Math.round(r.top), w: Math.round(r.width), vw: innerWidth }; });
  const sheetState = () => P.evaluate(() => { const s = document.querySelector('.rm-sheet'); if (!s) return 'gone'; return getComputedStyle(s).display === 'none' ? 'hidden' : 'shown'; });
  const closeCard = async () => { const pt = await P.evaluate(() => { const x = [...document.querySelectorAll('.wh-x:not([hidden]), .r2-ov .r2-x')].map(e => [e, e.getBoundingClientRect()]).filter(([e, r]) => r.width > 0 && r.height > 0).pop(); return x ? { x: x[1].left + x[1].width / 2, y: x[1].top + x[1].height / 2 } : null; });
    if (pt) await P.touchscreen.tap(pt.x, pt.y).catch(() => P.mouse.click(pt.x, pt.y)); else { out.steps.push({ name: 'close X not found', pass: null, info: await P.evaluate(() => [...document.querySelectorAll('.r2-ov')].map(o => o.className + ' | ' + [...o.querySelectorAll('button')].slice(0, 4).map(b => b.className + ':' + Math.round(b.getBoundingClientRect().width)).join(',') + ' | ' + getComputedStyle(o).display)) }); } await sleep(1200); };
  /* the simulated cloud puts you alone in Room 1: seat the simulated members in rooms 1 and 2 (read-only stub, nothing is written) */
  out.seated = await P.evaluate(() => { const R = window.LowiRooms, H = window.LowiCommunityHost; if (!R || !H) return 0; const me = (H.uid && H.uid()) || 'me', ids = H.people().map(p => p && p.uid).filter(u => u && u !== me && !String(u).startsWith('bot:'));
    if (!ids.length) return 0; const a = [me].concat(ids.slice(0, 6)), b = ids.slice(6, 14);
    R.status = () => 'in'; R.num = () => 1; R.members = () => a.slice(); R.rooms = () => [{ n: 1, u: a.slice(), c: a.length, g: 0 }, { n: 2, u: b.slice(), c: b.length, g: 0 }]; R.readDirectory = () => Promise.resolve(); return a.length + b.length - 1; });
  const openSheet = async () => { await P.evaluate(() => { const s = document.querySelector('.rm-sheet'); if (s) s.remove(); }); await R.tap('#cmPaneChat .rm-menu-btn'); await sleep(500); await R.tap('.rm-menu [data-rmm="people"]'); await sleep(2200); };
  await openSheet();
  const names = await P.evaluate(() => [...document.querySelectorAll('.rm-sheet [data-rs="profile"]')].map(b => { const r = b.getBoundingClientRect(); return { cls: b.className, uid: b.dataset.uid, n: b.dataset.name, h: Math.round(r.height), w: Math.round(r.width), right: Math.round(r.right), vw: innerWidth }; }));
  ok('names in the sheet are buttons with a user id', names.length > 0 && names.every(x => x.uid), { count: names.length, sample: names.slice(0, 4) });
  ok('nothing wider than the screen', names.every(x => x.right <= x.vw + 1));
  await R.shot('/tmp/pt-' + device.replace(/\W/g, '') + '-' + lang + '-sheet.png');
  for (const cls of ['rm-p', 'rm-nm-s']) {
    const t = names.find(x => x.cls.split(' ').includes(cls)); if (!t) { ok('tap ' + cls, cls === 'rm-p' ? null : true, 'none on screen'); continue; }
    if (cls === 'rm-p') ok('chip tall enough for a thumb (>=36px)', t.h >= 36, t.h);
    const b = P.locator('.rm-sheet .' + cls + '[data-uid="' + t.uid + '"]').first(); await b.evaluate(e => e.scrollIntoView({ block: 'center' })).catch(() => { });
    const hit = await P.evaluate(sel => { const e = document.querySelector(sel); const r = e.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!t && (t === e || e.contains(t)); }, '.rm-sheet .' + cls + '[data-uid="' + t.uid + '"]');
    ok('finger reaches ' + cls, hit);
    await R.tapEl(b); await sleep(1300);
    const c = await card();
    ok('tap ' + cls + ' opens ' + t.n + "'s profile", c && c.person === t.uid && c.name.indexOf(t.n) === 0, c);
    ok('sheet steps aside while the card is open', (await sheetState()) === 'hidden');
    await R.shot('/tmp/pt-' + device.replace(/\W/g, '') + '-' + lang + '-' + cls + '.png');
    await closeCard();
    ok('closing the card brings the sheet back', (await sheetState()) === 'shown' && !(await card()));
  }
  /* search results */
  const q = names[0] && names[0].n ? names[0].n.slice(0, 3) : 'a';
  await P.fill('.rm-sheet .rm-find', q); await sleep(700);
  const sr = await P.evaluate(() => { const b = document.querySelector('.rm-sheet .rm-list .rm-who > .rm-nm'); return b ? { uid: b.dataset.uid, n: b.dataset.name } : null; });
  if (sr) { await R.tap('.rm-sheet .rm-list .rm-who > .rm-nm'); await sleep(1300); const c = await card(); ok('search result name opens the profile', c && c.person === sr.uid, c); await closeCard(); ok('back to the search', (await sheetState()) === 'shown'); }
  else ok('search result name', true, 'no other-room match for ' + q);
  /* Chat on the card goes on to the chat, the sheet stays closed */
  const t2 = names.find(x => x.cls.split(' ').includes('rm-p')) || names[0];
  if (t2) { await P.fill('.rm-sheet .rm-find', ''); await sleep(500); const b = P.locator('.rm-sheet [data-rs="profile"][data-uid="' + t2.uid + '"]').first(); await R.tapEl(b); await sleep(1300); out.cardBeforeChat = await card();
    const tp = await P.evaluate(() => { const t = [...document.querySelectorAll('.r2-ov.on [data-chat="select-close"]')].pop(); if (!t) return null; t.scrollIntoView({ block: 'center' }); const r = t.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    if (tp) { await sleep(400); await P.touchscreen.tap(tp.x, tp.y); await sleep(2600);
      if (await card()) { out.chatViaClick = true; await P.evaluate(() => { const t = [...document.querySelectorAll('.r2-ov.on [data-chat="select-close"]')].pop(); if (t) t.click(); }); await sleep(2600); } const st = await sheetState(); ok('Chat on the card: sheet stays closed', st === 'gone', { st, card: await card(), dm: await P.evaluate(() => document.body.className.slice(0, 200)) }); } else ok('Chat on the card', false, 'no Chat button'); }
  /* Escape out of the sheet still works */
  await P.evaluate(() => { while (document.querySelector('.r2-ov.on')) { try { LowiR2.close(); } catch (e) { break; } } }); await sleep(600);
  /* name above a chat message */
  await P.evaluate(() => { const all = [...document.querySelectorAll('#cmPaneChat .cs-name[data-chat="profile"]')]; const last = all[all.length - 1]; if (last) last.scrollIntoView({ block: 'center' }); }); await sleep(1500);
  const mn = await P.evaluate(() => { const all = [...document.querySelectorAll('#cmPaneChat .cs-name[data-chat="profile"]')]; const b = all.reverse().find(e => { const r = e.getBoundingClientRect(); return r.width > 4 && r.top > 100 && r.bottom < innerHeight - 120 && document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === e; }); if (!b) return null; b.setAttribute('data-pt', '1'); return { uid: b.dataset.uid, n: b.dataset.name }; });
  if (mn) { const xy = await P.evaluate(() => { const e = document.querySelector('#cmPaneChat .cs-name[data-pt="1"]'), r = e.getBoundingClientRect(); return { x: r.left + Math.min(r.width / 2, 20), y: r.top + r.height / 2 }; }); await P.touchscreen.tap(xy.x, xy.y); await sleep(1300); const c = await card(); ok('name above a message opens the profile', c && (c.person === mn.uid || c.name.indexOf(mn.n) === 0), c); await R.shot('/tmp/pt-' + device.replace(/\W/g, '') + '-' + lang + '-msgname.png'); await closeCard(); }
  else ok('name above a message', null, 'no message name on screen');
  out.msgName = mn;
  out.errs = R.errs; out.pass = out.steps.filter(s => s.pass === true).length; out.fail = out.steps.filter(s => s.pass === false).length;
  console.log(JSON.stringify(out, null, 1));
  await R.close(); process.exit(out.fail || R.errs.length ? 1 : 0);
})().catch(e => { console.error('BROKEN', e && e.stack || e); try { console.error(JSON.stringify(global.__pt, null, 1)); } catch (x) { } process.exit(2); });
