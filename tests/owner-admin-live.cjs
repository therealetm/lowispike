/* Browser check for the owner tools (Oct 18, 2026): the real app on a local server at 390x844, every Supabase and outside
   request aborted and the service worker blocked, so nothing reaches or writes to the live database. The cloud client is a
   fixture: is_app_owner() answers true only for the owner id, and every owner call is recorded instead of sent.
   Checks: a non-owner sees no owner controls and a forged owner button does nothing; the owner gets the Members card,
   the list, Kick + Undo, the member-sheet row and the typed DELETE confirm.
   Not part of the offline suite. Usage: ENG=webkit|chromium [SHOT=/tmp/oa] node tests/owner-admin-live.cjs */
const pw = require(process.env.PW || '/tmp/pw/node_modules/playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = process.env.ROOT || path.join(__dirname, '..'), ENG = process.env.ENG || 'webkit';
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/json', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.jpg': 'image/jpeg' };
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/index.html'; fs.readFile(path.join(ROOT, u), (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(u)] || 'application/octet-stream' }); r.end(b); }); });
const OWNER = '83077af7-8475-4628-9328-25bd335db240', JOE = '06f0a8ee-1ed1-4778-a9d4-0852594bd6ad';
const EMMA = ['0653ab46-7894-4b07-8601-86db5d2d2cc6', 'f78c98d9-f19c-42fb-bcfd-276f9020bf74'];

srv.listen(0, async () => {
  const port = srv.address().port; let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
  const browser = await pw[ENG].launch(ENG === 'chromium' ? { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
  const dev = ENG === 'webkit' ? pw.devices['iPhone 13'] : { deviceScaleFactor: 2, isMobile: true, hasTouch: true };
  const ctx = await browser.newContext(Object.assign({}, dev, { viewport: { width: 390, height: 844 }, serviceWorkers: 'block' }));
  let blocked = 0;
  await ctx.route(/supabase|googleapis|gstatic|openfoodfacts|salling|r2\.dev|workers\.dev/, r => { blocked++; r.abort(); });
  await ctx.route(u => !/^http:\/\/localhost:/.test(String(u)), r => { blocked++; r.abort(); });
  await ctx.addInitScript(() => { try { localStorage.setItem('lowi.gate', 'done'); localStorage.setItem('lowispike.v2', JSON.stringify({ setupDone: true, onboarded: true, xp: 2311, ledger: [], user: { name: 'eman', bday: '1990-01-01', tags: [] } })); } catch (e) {} });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message.slice(0, 160)));
  await page.goto('http://localhost:' + port + '/index.html', { waitUntil: 'load', timeout: 90000 });
  await page.waitForTimeout(8000);
  ok(await page.evaluate(() => !!(window.LowiOwnerAdmin && window.LowiOwnerAdminCore)), ENG + ' owner tools loaded');

  const setup = await page.evaluate(([OWNER, JOE, EMMA]) => {
    const rows = [['Emma', EMMA[0]], ['Emma', EMMA[1]], ['Joseph Castellar', JOE], ['Q', 'f4f8fbf8-3a18-4317-96d3-9dd778066136']]
      .map(([n, uid]) => ({ n, uid, lv: 1, xp: 10, s: '', t: '', avatar: '', bio: '' }));
    const members = [{ id: OWNER, name: 'eman', is_owner: true }, { id: EMMA[0], name: 'Emma', is_anonymous: true }, { id: EMMA[1], name: 'Emma', is_anonymous: true },
      { id: JOE, name: 'Joseph Castellar', has_email: true }, { id: 'f4f8fbf8-3a18-4317-96d3-9dd778066136', name: 'Q' }];
    const F = window.__oaFix = { me: JOE, calls: [], kicks: [] };
    const sb = {
      rpc: async (name, args) => { F.calls.push({ name, args, me: F.me });
        if (name === 'is_app_owner') return { data: F.me === OWNER, error: null };
        if (F.me !== OWNER) return { data: null, error: { code: '42501', message: 'only the app owner can ' + name } };
        if (name === 'admin_members') return { data: members.map(m => Object.assign({}, m, { kicked: F.kicks.includes(m.id) })), error: null };
        if (name === 'admin_kick') { const n = args.targets.filter(id => id !== OWNER && !F.kicks.includes(id)); F.kicks.push(...n); return { data: n.length, error: null }; }
        if (name === 'admin_unkick') { const b = F.kicks.length; F.kicks = F.kicks.filter(id => !args.targets.includes(id)); return { data: b - F.kicks.length, error: null }; }
        return { data: null, error: { code: 'PGRST202' } }; },
      from: t => ({ select: () => ({ limit: async () => t === 'community_kicks' ? { data: F.kicks.map(user_id => ({ user_id })), error: null } : { data: [], error: null } }) }),
      functions: { invoke: async (name, o) => { F.calls.push({ name, args: o.body, me: F.me }); return F.me === OWNER ? { data: { deleted: o.body.ids, failed: [] }, error: null } : { data: null, error: { message: 'not_owner', context: { status: 403 } } }; } }
    };
    if (!window.LOWI_CLOUD_X || !window.LOWI_CLOUD) return 'no cloud';
    /* signed in as far as the app is concerned: take down the sign-in gate the way a finished sign-in does */
    try { if (typeof lockApp === 'function') lockApp(false); } catch (e) {}
    document.querySelectorAll('#r2gate').forEach(g => g.remove()); document.documentElement.classList.remove('gate-boot', 'gate-up');
    document.querySelectorAll('[data-gate-inert]').forEach(el => { el.inert = false; el.removeAttribute('data-gate-inert'); });
    LOWI_CLOUD_X.state = () => ({ uid: F.me, live: true }); LOWI_CLOUD_X.client = async () => sb;
    LOWI_CLOUD.live = () => true; LOWI_CLOUD.people = () => rows.slice(); LOWI_CLOUD_X.people = () => rows.slice();
    return 'fixture ready';
  }, [OWNER, JOE, EMMA]);
  ok(setup === 'fixture ready', ENG + ' cloud ' + setup + ' (Supabase blocked)');
  const tap = sel => page.evaluate(sel => { const b = document.querySelector(sel); if (b) b.click(); return !!b; }, sel);
  const recheck = () => page.evaluate(() => { LowiOwnerAdmin._st.checkedFor = ''; document.dispatchEvent(new CustomEvent('lowi:chat', { detail: { type: 'auth' } })); });
  /* Profile → Account tile (the Members card sits under the account card) */
  const profile = async () => { await page.evaluate(() => { try { goTab('home'); goTab('profile'); } catch (e) {} }); await page.waitForTimeout(1500);
    /* the tile grid isn't drawn in this signed-out harness, so open the Account part the way openPanel('acct') does */
    await page.evaluate(() => { const H = document.documentElement; H.classList.remove('gate-up', 'gate-boot'); document.querySelectorAll('#r2gate').forEach(g => g.remove());
      try { if (typeof lockApp === 'function') lockApp(false); } catch (e) {} document.querySelectorAll('[inert]').forEach(el => { el.inert = false; });
      const b = document.querySelector('[data-g2e-open="acct"]'); if (b) b.click(); else { H.setAttribute('data-g2e-k', 'acct'); H.classList.add('g2e-open'); } });
    await page.waitForTimeout(1000); };
  const closeAll = async () => { await page.evaluate(() => { for (let i = 0; i < 6; i++) try { LowiR2.close(); } catch (e) {} }); await page.waitForTimeout(500); };
  const openMember = async n => { await page.evaluate(n => { try { LowiR3.open({ name: n }); } catch (e) {} }, n); await page.waitForTimeout(1200); };

  /* ---- non-owner (signed in as Joseph) ---- */
  await recheck(); await page.waitForTimeout(3000);
  ok(await page.evaluate(() => LowiOwnerAdmin.isOwner() === false), ENG + ' non-owner: server says not owner');
  await profile();
  ok(await page.locator('.oa-card').count() === 0, ENG + ' non-owner: no Members card in Profile');
  await openMember('Emma');
  const sheetOpen = await page.locator('.r3-mpacts').count();
  ok(sheetOpen > 0 && await page.locator('.oa-mem').count() === 0, ENG + ' non-owner: member sheet opens with no owner row');
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT + '-' + ENG + '-nonowner-sheet.png' });
  await closeAll();
  await page.evaluate(id => { const b = document.createElement('button'); b.setAttribute('data-oa', 'kick'); b.setAttribute('data-ids', id); b.id = 'forged'; document.body.appendChild(b); }, EMMA[0]);
  await page.click('#forged', { force: true }).catch(() => {}); await page.waitForTimeout(800);
  ok(await page.evaluate(() => !__oaFix.calls.some(c => c.name !== 'is_app_owner')), ENG + ' non-owner: a forged Kick button sends nothing');
  await page.evaluate(() => document.getElementById('forged').remove());

  /* ---- owner (signed in as eman) ---- */
  await page.evaluate(OWNER => { __oaFix.me = OWNER; }, OWNER);
  await recheck(); await page.waitForTimeout(3000);
  ok(await page.evaluate(() => LowiOwnerAdmin.isOwner() === true), ENG + ' owner: server says owner');
  await profile();
  const diag = await page.evaluate(() => ({ slot: document.querySelectorAll('.oa-slot').length, wrapped: !!(LOWI_CLOUD.cardHTML && LOWI_CLOUD.cardHTML.__oa), lc: !!document.getElementById('lcAcct'), tab: window.LowiHost && LowiHost.tab(), html: (document.getElementById('tab-profile')||{}).textContent.replace(/\s+/g,' ').slice(0,300), hs: document.body.innerHTML.indexOf('Put it on your Home Screen'), sto: typeof STORAGE_OK }));
  ok(await page.locator('.oa-card').count() === 1, ENG + ' owner: Members card in Profile ' + JSON.stringify(diag));
  await page.locator('.oa-card').scrollIntoViewIfNeeded().catch(() => {});
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT + '-' + ENG + '-owner-profile.png' });
  console.log('     card path: ' + await page.evaluate(() => { let e = document.querySelector('.oa-card'), o = []; while (e && e !== document.body) { const cs = getComputedStyle(e); o.push((e.id ? '#' + e.id : (e.tagName + '.' + String(e.className).split(' ').slice(0, 2).join('.'))) + (cs.display === 'none' ? '[NONE]' : '') + (e.hidden ? '[hidden]' : '')); e = e.parentElement; } return o.join(' < ') + ' g2e=' + document.querySelector('.oa-slot').getAttribute('data-g2e') + ' k=' + document.documentElement.getAttribute('data-g2e-k') + ' lc=' + (document.getElementById('lcAcct')||{getAttribute(){}}).getAttribute('data-g2e') + ' lcpar=' + (document.getElementById('lcAcct')||{}).parentElement?.id; }));
  console.log('     rules: ' + await page.evaluate(() => { const a = document.getElementById('lcAcct'), o = []; for (const sh of document.styleSheets) { let rs; try { rs = sh.cssRules; } catch (e) { continue; } for (const r of rs) { try { if (r.selectorText && /display\s*:\s*none/.test(r.cssText) && a.matches(r.selectorText)) o.push(r.selectorText.slice(0, 160)); } catch (e) {} } } return o.join(' || ') + ' | html=' + document.documentElement.className.slice(0, 300); }));
  console.log('     vis: ' + await page.evaluate(() => { let e = document.querySelector('.oa-card [data-oa="list"]'), o = []; while (e && e !== document.body) { const cs = getComputedStyle(e), r = e.getBoundingClientRect(); o.push((e.id || e.className || e.tagName) + ':' + Math.round(r.top) + '/' + Math.round(r.width) + 'x' + Math.round(r.height) + ' ' + cs.visibility + ' ' + cs.opacity + ' ' + cs.overflow); e = e.parentElement; } return o.join(' < '); }));
  await tap('.oa-card [data-oa="list"]'); await page.waitForTimeout(1500);
  const list = await page.evaluate(() => [...document.querySelectorAll('.oa-row')].map(r => r.textContent.replace(/\s+/g, ' ').trim()));
  console.log('     list: ' + list.join(' | '));
  ok(list.some(r => /^Emma.*2 accounts/.test(r)), ENG + ' owner: list groups Emma (2 accounts)');
  const emanRow = await page.evaluate(() => { const r = [...document.querySelectorAll('.oa-row')].find(x => /^eman/.test(x.textContent.trim())); return r ? r.querySelectorAll('[data-oa]').length : -1; });
  ok(emanRow === 0, ENG + ' owner: no Kick/Delete on his own row');
  const box = await page.evaluate(() => { const s = document.querySelector('.oa-ov .r2-sh'); const r = s && s.getBoundingClientRect(); return r ? [Math.round(r.left), Math.round(r.right), document.documentElement.scrollWidth] : null; });
  ok(box && box[0] >= 0 && box[1] <= 390 && box[2] <= 390, ENG + ' owner: list fits 390px ' + JSON.stringify(box));
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT + '-' + ENG + '-owner-list.png' });
  await page.evaluate(() => { const r = [...document.querySelectorAll('.oa-row')].find(x => /^Emma/.test(x.textContent.trim())); r.querySelector('[data-oa="kick"]').click(); });
  await page.waitForTimeout(1200);
  const afterKick = await page.evaluate(() => ({ kick: __oaFix.calls.filter(c => c.name === 'admin_kick').map(c => c.args.targets), people: LOWI_CLOUD.people().map(p => p.n), undo: !!document.querySelector('.oa-ov [data-oa="undo"]') }));
  ok(afterKick.kick.length === 1 && afterKick.kick[0].length === 2, ENG + ' owner: Kick sent both Emma accounts');
  ok(!afterKick.people.includes('Emma') && afterKick.people.includes('Joseph Castellar'), ENG + ' owner: Emma gone from Community people, Joseph stays');
  ok(afterKick.undo, ENG + ' owner: Undo button shows');
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT + '-' + ENG + '-owner-kicked.png' });
  await tap('.oa-ov [data-oa="undo"]'); await page.waitForTimeout(1200);
  const afterUndo = await page.evaluate(() => ({ un: __oaFix.calls.filter(c => c.name === 'admin_unkick').length, people: LOWI_CLOUD.people().map(p => p.n) }));
  ok(afterUndo.un === 1 && afterUndo.people.filter(n => n === 'Emma').length === 2, ENG + ' owner: Undo let Emma back in ' + JSON.stringify(afterUndo));
  await closeAll();

  await openMember('Joseph Castellar');
  ok(await page.locator('.oa-mem [data-oa="kick"]').count() === 1, ENG + ' owner: member sheet shows the owner row');
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT + '-' + ENG + '-owner-sheet.png' });
  await tap('.oa-mem [data-oa="del"]'); await page.waitForTimeout(1000);
  const btn = page.locator('[data-oa="delgo"]');
  ok(await btn.isDisabled(), ENG + ' owner: Delete stays disabled until DELETE is typed');
  const type = v => page.evaluate(v => { const i = document.querySelector('.oa-type'); i.focus(); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); }, v);
  await type('DELE'); ok(await btn.isDisabled(), ENG + ' owner: still disabled for a partial word');
  await type('DELETE');
  const dbg = await page.evaluate(() => [...document.querySelectorAll('.oa-type')].map(i => i.value + ':' + (i.parentNode.querySelector('[data-oa="delgo"]') || {}).disabled));
  ok(!(await btn.isDisabled()), ENG + ' owner: enabled after typing DELETE ' + JSON.stringify(dbg));
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT + '-' + ENG + '-owner-confirm.png' });
  await tap('[data-oa="delgo"]'); await page.waitForTimeout(1500);
  const del = await page.evaluate(() => __oaFix.calls.filter(c => c.name === 'owner-delete-account').map(c => c.args));
  ok(del.length === 1 && del[0].confirm === 'DELETE' && del[0].ids.length === 1 && del[0].ids[0] === '06f0a8ee-1ed1-4778-a9d4-0852594bd6ad', ENG + ' owner: delete called once for Joseph with confirm');
  ok(errs.length === 0, ENG + ' no page errors' + (errs.length ? ': ' + errs.join(' / ') : ''));
  console.log('     outside requests blocked: ' + blocked);
  await browser.close(); srv.close();
  console.log(fail ? 'FAILED ' + fail : 'ALL OK'); process.exit(fail ? 1 : 0);
});
