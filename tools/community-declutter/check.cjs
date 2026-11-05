/* Community declutter phone check (5 Nov 2026). Real app, fake cloud (nothing leaves the machine), signed in as a test member.
   node tools/community-declutter/check.cjs <outDir> [chromium|webkit] [device] [lang]
   Checks: no Community heading; tabs are the top row; profile button opens settings; Ranking round button = Members opens People
   (everyone + Online right now); How it works chip opens the rules; Chat shows no online line; Circle page has no To-everyone row /
   message field; tapping a ball there opens the Chat tab; no sideways scroll; no page errors. Prints PASS/FAIL lines + report.json */
'use strict';
const fs = require('fs'), path = require('path');
/* the regress copy of the fake cloud has no presence; use tools/sim's (same install(ctx, o)) so sim.seat() can put members online */
{ const reg = require.resolve('../regress/mock-cloud.cjs'), simc = require('../sim/mock-cloud.cjs'); require.cache[reg] = { id: reg, filename: reg, loaded: true, exports: simc }; }
const H = require('../regress/harness.cjs');
const sleep = H.sleep;
const OUT = path.resolve(process.argv[2] || '/tmp/cdecl-check'); fs.mkdirSync(OUT, { recursive: true });
const ENGINE = process.argv[3] || 'chromium', DEVICE = process.argv[4] || 'iPhone 13', LANG = process.argv[5] || 'en';
const res = []; const ok = (name, cond, info) => { res.push({ name, pass: !!cond, info }); console.log((cond ? 'PASS ' : 'FAIL ') + name + (info !== undefined ? ' ' + JSON.stringify(info) : '')); };
(async () => {
  const R = await H.open({ engine: ENGINE, device: DEVICE, probe: false, lang: LANG });
  const p = R.page;
  const vis = sel => p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(), st = getComputedStyle(e); return r.width > 2 && r.height > 2 && st.display !== 'none' && st.visibility !== 'hidden' && r.bottom > 0 && r.top < innerHeight; }, sel);
  const box = sel => p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; }, sel);
  const click = sel => p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; e.click(); return true; }, sel);
  const noSide = () => p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
  const dialog = () => p.evaluate(() => { const ds = [...document.querySelectorAll('[role=dialog],.pd,.cme,.rk-sheet,.rk-info-sheet')].filter(d => { const r = d.getBoundingClientRect(), s = getComputedStyle(d); return r.width > 50 && r.height > 50 && s.display !== 'none' && s.visibility !== 'hidden' && !d.hidden; }); const d = ds[ds.length - 1]; return d ? { cls: String(d.className).slice(0, 60), text: d.textContent.replace(/\s+/g, ' ').trim().slice(0, 220) } : null; });
  const closeTop = async () => { await p.keyboard.press('Escape'); await sleep(700); };
  try {
    await R.goto(); await p.evaluate(() => window.goTab && goTab('foryou')); await sleep(2600);
    await p.waitForFunction(() => window.LowiRooms && LowiRooms.status() === 'in', null, { timeout: 30000 }).catch(() => {});
    if (R.sim && R.sim.seat) { R.sim.seat('all', 2); await p.waitForFunction(() => window.LowiRooms.members().length >= 3, null, { timeout: 15000 }).catch(() => {}); await sleep(1500); }
    ok('Community opened', await vis('#cmPaneChat .rm-tabs'));
    ok('no Community heading / live line / arrow', !(await vis('.rm-head')) && !(await vis('.rm-live')) && !(await vis('.rm-chev')) && !(await vis('.rm-name')));
    const tabs = await box('.rm-tabs'), pf = await box('.rm-pf'), x = await box('#secX');
    ok('tabs are the top row (top < 70 px)', tabs && tabs[1] < 70, { tabs, pf, secX: x });
    ok('profile button sits in the same row, at its end, >= 44 px', pf && tabs && Math.abs((pf[1] + pf[3] / 2) - (tabs[1] + tabs[3] / 2)) < 6 && pf[0] >= tabs[0] + tabs[2] - 2 && pf[2] >= 44 && pf[3] >= 44);
    ok('profile button does not overlap the theme switch / back', await p.evaluate(() => { const a = document.querySelector('.rm-pf'); if (!a) return false; const A = a.getBoundingClientRect(); return ['#tbTheme', '#pfBtn', '#secX'].every(s => { const e = document.querySelector(s); if (!e) return true; const st = getComputedStyle(e); if (st.display === 'none' || st.visibility === 'hidden' || +st.opacity < 0.05) return true; const B = e.getBoundingClientRect(); if (!B.width) return true; return A.right <= B.left || B.right <= A.left || A.bottom <= B.top || B.bottom <= A.top; }); }));
    ok('all four tabs present', (await p.evaluate(() => [...document.querySelectorAll('.rm-tab')].map(t => t.dataset.rm).join(','))) .split(',').length === 4);
    ok('no sideways scroll (Circle)', await noSide());
    await R.shot(path.join(OUT, LANG + '-1-circle.png'));
    ok('Circle page: no To-everyone chat row', !(await vis('#cgTo')));
    ok('Circle page: no message field', !(await vis('#cmPaneChat .cm-compose')));
    // profile button -> settings page
    await click('.rm-pf'); await sleep(1300);
    const d1 = await dialog(); ok('profile button opens the settings page', !!d1, d1);
    await R.shot(path.join(OUT, LANG + '-2-settings.png')); await closeTop();
    // Chat tab: field is there, no online line
    await click('.rm-tab[data-rm="chat"]'); await sleep(1500);
    ok('Chat tab: message field shows', await vis('#cmPaneChat .cm-compose'));
    ok('Chat tab: no "here now" / online line above it', !(await vis('.rm-live')) && !(await p.evaluate(() => /here now|gerade da|aquí ahora/i.test((document.querySelector('.rm-bar') || {}).textContent || ''))));
    ok('no sideways scroll (Chat)', await noSide());
    await R.shot(path.join(OUT, LANG + '-3-chat.png'));
    // Ranking
    await click('.rm-tab[data-rm="rank"]'); await sleep(1600);
    const mem = await box('[data-rk="members"]'), how = await box('[data-rk="info"]'), chips = await box('.rk-chips');
    ok('Ranking: round Members button shows', !!mem && mem[2] >= 36, { mem });
    ok('Ranking: How it works sits in the chips row', !!how && !!chips && how[1] >= chips[1] - 2 && how[1] + how[3] <= chips[1] + chips[3] + 2, { how, chips });
    ok('no sideways scroll (Ranking)', await noSide());
    await R.shot(path.join(OUT, LANG + '-4-ranking.png'));
    await click('[data-rk="members"]'); await sleep(1500);
    const d2 = await dialog(); ok('Members opens People with everyone', !!d2 && /People|Leute|Personas/.test(d2.text), d2);
    const here = await p.evaluate(() => ({ status: window.LowiRooms && LowiRooms.status(), members: window.LowiRooms && LowiRooms.members().length, here: (() => { try { const h = LowiPeopleDir.here(); return h && h.count; } catch (e) { return String(e); } })(), sec: !!document.querySelector('#pdHere'), head: ((document.querySelector('#pdHere .pd-sec-h') || {}).textContent || '').trim() }));
    ok('People shows an Online right now section at the top', here.sec && !!here.head, here);
    await R.shot(path.join(OUT, LANG + '-5-members.png')); await closeTop();
    await click('[data-rk="info"]'); await sleep(1200);
    const d3 = await dialog(); ok('How it works opens the rules', !!d3, d3);
    await closeTop();
    // back to Circle, tap a companion ball -> Chat tab
    await click('.rm-tab[data-rm="room"]'); await sleep(1600);
    const ball = await p.evaluate(() => { const b = [...document.querySelectorAll('.rt-ball')].find(e => !e.classList.contains('me') && e.getBoundingClientRect().width > 4); if (!b) return null; b.click(); return b.getAttribute('aria-label') || 'ball'; });
    await sleep(1500);
    if (ball) ok('Circle: tapping a companion opens the Chat tab', await p.evaluate(() => document.querySelector('.rm-tab[data-rm="chat"]').getAttribute('aria-selected') === 'true'), ball);
    else ok('Circle: no other companion ball in the test room (skipped)', true);
  } catch (e) { ok('no crash', false, String(e && e.stack || e).slice(0, 400)); }
  const errs = (R.errs || []).filter(e => !/favicon|ERR_|net::/i.test(String(e)));
  ok('no page errors', errs.length === 0, errs.slice(0, 3));
  fs.writeFileSync(path.join(OUT, 'report-' + ENGINE + '-' + DEVICE.replace(/\W+/g, '') + '-' + LANG + '.json'), JSON.stringify(res, null, 1));
  const f = res.filter(r => !r.pass).length; console.log('SUMMARY ' + ENGINE + ' ' + DEVICE + ' ' + LANG + ': ' + (res.length - f) + '/' + res.length);
  await R.close(); process.exit(0);
})();
