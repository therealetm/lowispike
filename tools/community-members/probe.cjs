/* Members page probe (22 Oct 2026): opens the real app in simulated phones, goes to Community > Chat > the room, scrolls the chat
   up a bit, taps the members button (people icon + count) and checks: the Members page covers the room (no card over the chat),
   title "Members · N" matches the badge, search field, rows (avatar, name, level), the composer is hidden, nothing sideways,
   readable text (WCAG AA), a row opens the profile, back arrow returns to the same chat scroll spot. Day and Night.
   node tools/community-members/probe.cjs [outDir] [url] [devices comma list] [day|night|both]  -> screenshots + report.json. */
'use strict';
const fs = require('fs'), path = require('path');
const H = require('../regress/harness.cjs'), N = require('../regress/nav.cjs');
const sleep = H.sleep;
const OUT = path.resolve(process.argv[2] || '/tmp/members-probe'); fs.mkdirSync(OUT, { recursive: true });
const URL_ = process.argv[3] || '';
const DEVICES = (process.argv[4] || 'iPhone SE,iPhone 13,iPhone 15,Pixel 7').split(',');
const MODES = process.argv[5] === 'day' ? [true] : process.argv[5] === 'night' ? [false] : [false, true];
const fails = [], notes = [];
const fail = (w, m) => { fails.push(w + ': ' + m); console.log('FAIL', w, m); };

function contrast() {
  const parse = s => { const m = String(s).match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const over = (t, u) => { const a = t.a + u.a * (1 - t.a); return a ? { r: (t.r * t.a + u.r * u.a * (1 - t.a)) / a, g: (t.g * t.a + u.g * u.a * (1 - t.a)) / a, b: (t.b * t.a + u.b * u.a * (1 - t.a)) / a, a } : { r: 0, g: 0, b: 0, a: 0 }; };
  const light = document.documentElement.dataset.theme === 'light';
  const base = light ? { r: 240, g: 245, b: 251, a: 1 } : { r: 6, g: 14, b: 38, a: 1 };
  const bgOf = el => { const L = []; for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) L.push(c); if (e.id === 'crMem') break; } let bg = base; for (let i = L.length - 1; i >= 0; i--) bg = over(L[i], bg); return bg; };
  const bad = []; let n = 0; const root = document.getElementById('crMem'); const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let t;
  while ((t = tw.nextNode())) { const txt = t.nodeValue.trim(); if (!txt) continue; const el = t.parentElement, r = el.getBoundingClientRect(); if (r.width < 1 || r.bottom < 0 || r.top > innerHeight) continue; const s = getComputedStyle(el); const fg = parse(s.color); if (!fg) continue; n++;
    const bg = bgOf(el), c = over(fg, bg), a = lum(c), b = lum(bg), ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05); const big = parseFloat(s.fontSize) >= 18.6 || (parseFloat(s.fontSize) >= 14 && +s.fontWeight >= 700); if (ratio < (big ? 3 : 4.5)) bad.push(txt.slice(0, 24) + ' ' + ratio.toFixed(2)); }
  return { n, bad };
}
function layout() {
  const q = s => document.querySelector(s), box = e => { if (!e) return null; const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 1 && r.height > 1 && s.display !== 'none' && s.visibility !== 'hidden' ? r : null; };
  const hit = (a, b) => a && b && a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
  const out = { errs: [] }, page = box(q('#crMem')), thread = box(q('#cgThread'));
  if (!page) { out.errs.push('members page not shown'); return out; }
  { const e = q('#crMem'), cs = getComputedStyle(e), pe = e.offsetParent; out.dbg = { pos: cs.position, top: cs.top, z: cs.zIndex, anim: cs.animationName, parent: e.parentElement.id, op: pe && (pe.id || pe.className), sheet: [...document.styleSheets].some(x => /community-members\.css/.test(x.href || '')) }; }
  if (thread && (Math.abs(page.top - thread.top) > 1 || Math.abs(page.height - thread.height) > 1 || Math.abs(page.width - thread.width) > 1)) out.errs.push('page does not cover the room ' + JSON.stringify([page.top, page.height, thread.top, thread.height]));
  if (q('#crCrew') && q('#crCrew').hasAttribute('data-open')) out.errs.push('old Recent voices card is open');
  for (const s of ['.cm-compose', '#crMembers', '.cr-pin']) { const b = box(q(s)); if (b) { const top = document.elementFromPoint((b.left + b.right) / 2, (b.top + b.bottom) / 2); if (top && !top.closest('#crMem')) out.errs.push(s + ' still on top of the page'); } }
  const back = box(q('#crMemBack')), title = box(q('#crMemTitle')), qf = box(q('#crMemQ'));
  if (!back) out.errs.push('no back arrow'); if (!title) out.errs.push('no title'); if (!qf) out.errs.push('no search field');
  if (back && (back.width < 44 || back.height < 44)) out.errs.push('back under 44pt'); if (back && title && hit(back, title)) out.errs.push('back over title');
  for (const f of ['tbTheme', 'pfBtn']) { const b = box(document.getElementById(f)); if (b && hit(b, back)) out.errs.push(f + ' covers back'); }
  out.title = (q('#crMemTitle') || {}).textContent; out.badge = (q('#crMcount') || {}).textContent;
  if (!/^Members · \d+$/.test(out.title || '')) out.errs.push('title ' + out.title); else if (out.badge && out.title !== 'Members · ' + out.badge) out.errs.push('badge ' + out.badge + ' vs ' + out.title);
  const rows = [...document.querySelectorAll('#crMem .cr-mrow')]; out.rows = rows.length; if (!rows.length) out.errs.push('no member rows');
  let cut = 0, small = 0, wide = 0; for (const r of rows.slice(0, 12)) { const b = box(r); if (!b) continue; if (b.height < 44) small++; if (b.right > innerWidth + 1 || b.left < -1) wide++; const n = r.querySelector('.cr-mn b'), av = box(r.querySelector('.cr-mav')); if (av && av.width > 48) out.errs.push('avatar too big ' + av.width); if (n && n.scrollWidth > n.clientWidth + 1 && n.textContent.length < 12) cut++; }
  if (small) out.errs.push(small + ' rows under 44pt'); if (wide) out.errs.push(wide + ' rows off screen'); if (cut) out.errs.push(cut + ' short names cut');
  if (/\bkg\b|BMI|lbs/i.test(q('#crMem').innerHTML)) out.errs.push('health data on the page');
  if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) out.errs.push('sideways overflow');
  return out;
}
async function run(device, light) {
  const W = device + (light ? '/day' : '/night');
  const R = await H.open({ engine: 'webkit', device, probe: false, url: URL_ });
  const p = R.page;
  const theme = () => p.evaluate(l => { const d = document.documentElement; if (l) { d.dataset.theme = 'light'; d.classList.add('light'); } else { d.dataset.theme = 'dark'; d.classList.remove('light'); } }, light);
  try {
    await R.goto(); await theme();
    await N.openCommunity(R); await sleep(7000);
    await p.locator('.rm-tab[data-rm="chat"]').click({ force: true }).catch(() => { }); await sleep(1200);
    await p.locator('.rm-ch[data-ch="galaxy"]').click({ force: true }).catch(() => { }); await sleep(1500);
    if (!(await p.evaluate(() => !!document.querySelector('#cgThread[data-open]')))) { await p.evaluate(() => { const b = document.querySelector('[data-chat="open-thread"]'); if (b) b.click(); }); await sleep(1200); }
    if (!(await p.evaluate(() => !!document.querySelector('#cgThread[data-open]')))) { await p.evaluate(() => { try { window.LowiCommunity.thread(true); } catch (e) { } }); await sleep(1500); }
    if (!(await p.evaluate(() => !!document.querySelector('#cgThread[data-open]')))) throw new Error('room thread did not open ' + await p.evaluate(() => JSON.stringify({ tab: (document.querySelector('.tab-btn.on,.tab.on') || {}).id, pane: !!document.getElementById('cmPaneChat'), lc: !!window.LowiCommunity, rm: [...document.querySelectorAll('.rm-tab')].map(b => b.dataset.rm) })));
    await p.evaluate(() => { const l = document.getElementById('cmList'); if (l && !l.children.length && window.LowiCommunity) LowiCommunity.mount(document.getElementById('cmPaneChat')); });
    /* people in the room right now, one admin (the hook the admin pinning work fills) */
    await p.evaluate(() => { const R = window.LowiRooms, Hh = window.LowiCommunityHost; if (!R || !Hh) return; const ids = Hh.people().map(x => x.uid).filter(Boolean).slice(0, 6); R.active = () => true; R.members = () => ids; R.has = id => ids.includes(id); window.LowiChatAdmins = ids.slice(0, 1); LowiCommunity.mount(document.getElementById('cmPaneChat')); });
    await sleep(600); await theme();
    const spot = await p.evaluate(() => { const l = document.getElementById('cmList'); l.scrollTop = Math.max(0, l.scrollHeight - l.clientHeight - 400); return Math.round(l.scrollTop); }); await sleep(400);
    const tag = device.replace(/\W+/g, '-').toLowerCase() + (light ? '-day' : '-night');
    await p.locator('#crMembers').click({ timeout: 5000, force: true }).catch(e => fail(W, 'members tap: ' + String(e.message).replace(/\s+/g, ' ').slice(-300)));
    await sleep(700); await theme(); await sleep(200);
    await R.shot(path.join(OUT, tag + '-members.png'));
    const L = await p.evaluate(layout); notes.push(W + ' ' + JSON.stringify({ title: L.title, badge: L.badge, rows: L.rows, dbg: L.dbg })); console.log(W, JSON.stringify(L.dbg));
    for (const e of L.errs) fail(W, e);
    const c = await p.evaluate(contrast); notes.push(W + ' texts ' + c.n); if (c.bad.length) fail(W, 'low contrast: ' + c.bad.slice(0, 6).join(' | '));
    const first = await p.evaluate(() => { const b = document.querySelector('#crMem .cr-mrow .cr-mn b'); return b ? b.textContent : ''; });
    if (first) { await p.locator('#crMemQ').fill(first.slice(0, 3)); await sleep(300); const n = await p.evaluate(() => document.querySelectorAll('#crMem .cr-mrow').length); if (!n) fail(W, 'search for ' + first.slice(0, 3) + ' found nobody'); await p.locator('#crMemQ').fill(''); await sleep(300); }
    await p.locator('#crMem .cr-mrow').first().click({ timeout: 4000, force: true }).catch(e => fail(W, 'row tap: ' + String(e.message).slice(0, 200))); await sleep(800);
    const sheet = await p.evaluate(() => !!document.querySelector('.r2-ov.on')); if (!sheet) fail(W, 'row did not open a profile'); else notes.push(W + ' row opens profile');
    if (sheet) { await R.shot(path.join(OUT, tag + '-profile.png')); await p.keyboard.press('Escape'); await sleep(600); }
    await p.evaluate(() => { const o = document.querySelector('.r2-ov.on'); if (o) o.classList.remove('on'); });
    await p.locator('#crMemBack').click({ timeout: 4000, force: true }).catch(e => fail(W, 'back tap: ' + String(e.message).slice(0, 200))); await sleep(600);
    const after = await p.evaluate(() => ({ page: !document.getElementById('crMem').hidden, open: !!document.querySelector('#cgThread[data-open]'), top: Math.round(document.getElementById('cmList').scrollTop), cls: document.documentElement.classList.contains('cr-mem-open') }));
    if (after.page || after.cls) fail(W, 'back did not close the page'); if (!after.open) fail(W, 'back left the room'); if (Math.abs(after.top - spot) > 2) fail(W, 'chat scroll moved ' + spot + ' -> ' + after.top);
    notes.push(W + ' back ' + JSON.stringify(after) + ' spot ' + spot);
    await R.shot(path.join(OUT, tag + '-back.png'));
    if (R.errs.length) fail(W, 'page errors ' + JSON.stringify(R.errs.slice(0, 3)));
  } catch (e) { fail(W, 'run: ' + String(e.message).split('\n')[0]); }
  finally { await R.close(); }
}
(async () => {
  for (const d of DEVICES) for (const m of MODES) await run(d, m);
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ fails, notes }, null, 1));
  console.log(notes.join('\n')); console.log(fails.length ? fails.length + ' FAIL' : '0 FAIL');
  process.exit(fails.length ? 1 : 0);
})();
