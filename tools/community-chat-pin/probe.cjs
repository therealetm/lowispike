/* Chat header + admin pinning probe (22 Oct 2026, Emmanuel's iPhone screenshot): opens Community > Chat > the room in simulated
   phones and checks: no centre sparkle pill or room header (the shared Community bar is the only top bar), no pinned bar until something is pinned, then as the
   admin pins a message from its menu: the bar sits under the header (never over it), the first message starts below the bar,
   tapping the bar brings the message into view, Unpin hides the bar again. Day and Night.
   node tools/community-chat-pin/probe.cjs [outDir] [url] [devices]  -> screenshots + report.json, exit 1 on failure.
   With a url (the live site before this change) it only takes the screenshots. */
'use strict';
const fs = require('fs'), path = require('path');
const H = require('../regress/harness.cjs'), N = require('../regress/nav.cjs');
const sleep = H.sleep;
const OUT = path.resolve(process.argv[2] || '/tmp/chat-pin-probe'); fs.mkdirSync(OUT, { recursive: true });
const URL_ = process.argv[3] || '';
const DEVICES = (process.argv[4] || 'iPhone SE,iPhone 13,iPhone 15,Pixel 7').split(',');
const fails = [], notes = [];
const until = async (p, fn, arg, ms = 8000) => { const t0 = Date.now(); let v; while (Date.now() - t0 < ms) { v = await p.evaluate(fn, arg); if (v) return v; await sleep(250); } return v; };
const fail = (w, m) => { fails.push(w + ': ' + m); console.log('FAIL', w, m); };

function head() {
  /* item 38 shell (21:19 build): the room has no header of its own; the shared Community bar (.rm-bar with #secX, the name and
     .rm-tabs) is the only top bar, so the pinned bar must start under the tab row and never cover the bar's buttons. */
  const q = s => document.querySelector(s), box = e => { if (!e) return null; const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 1 && r.height > 1 && s.display !== 'none' && s.visibility !== 'hidden' ? { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height } : null; };
  const hit = (a, b) => a && b && a.l < b.r - 1 && b.l < a.r - 1 && a.t < b.b - 1 && b.t < a.b - 1;
  const pane = q('#cmPaneChat'), bar = box(pane && pane.querySelector('.rm-bar')), tabs = box(pane && pane.querySelector('.rm-tabs')) || box(q('.rm-tabs'));
  const pill = box(q('#cgThread .cr-id')), rhead = box(q('#cgThread .cg-thead')), sparkle = [...document.querySelectorAll('#cgThread *')].some(e => /\u2728/.test(e.textContent || '') && e.children.length === 0 && box(e)), pin = box(q('#crPin'));
  const errs = [];
  if (pill) errs.push('centre pill still shows'); if (rhead) errs.push('room header still shows'); if (sparkle) errs.push('sparkle still shows');
  if (!tabs) errs.push('no shared tab row');
  const headB = Math.max(tabs ? tabs.b : 0, bar ? bar.b : 0);
  if (pin) { if (pin.t < headB - 1) errs.push('pinned bar starts above the shared bar bottom (' + Math.round(pin.t) + ' < ' + Math.round(headB) + ')'); }
  for (const f of ['secX', 'pfBtn', 'tbTheme']) { const b = box(document.getElementById(f)); if (b && hit(b, pin)) errs.push('pinned bar covers ' + f); }
  const list = q('#cmList'); let first = null;
  if (list) { const lt = list.getBoundingClientRect().top; const top = parseFloat(getComputedStyle(list).paddingTop) || 0; first = lt + top; }
  const below = pin ? pin.b : headB; if (first != null && first < below - 1) errs.push('first message starts under the ' + (pin ? 'pinned bar' : 'shared bar') + ' (' + Math.round(first) + ' < ' + Math.round(below) + ')');
  return { errs, pin: !!pin, headB: Math.round(headB), pinB: pin ? Math.round(pin.b) : 0, pinT: pin ? Math.round(pin.t) : 0, first: first == null ? null : Math.round(first), sw: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 };
}
async function run(device, light, lang) {
  const W = device + (light ? '/day' : '/night') + '/' + lang;
  const R = await H.open({ engine: 'webkit', device, probe: false, url: URL_, lang });
  const p = R.page, tag = device.replace(/\W+/g, '-').toLowerCase() + (light ? '-day' : '-night');
  try {
    await R.goto(); await p.evaluate(l => { document.documentElement.classList.toggle('light', l); }, light);
    await N.openCommunity(R); await sleep(6000);
    await p.locator('.rm-tab[data-rm="chat"]').click({ force: true }).catch(() => { }); await sleep(1000);
    await p.locator('.rm-ch[data-ch="galaxy"]').click({ force: true }).catch(() => { }); await sleep(1400);
    if (!(await p.evaluate(() => !!document.querySelector('#cgThread[data-open]')))) { await p.evaluate(() => { const b = document.querySelector('[data-chat="open-thread"],[data-chat="history"]'); if (b) b.click(); }); await sleep(1200); }
    if (!(await p.evaluate(() => !!document.querySelector('#cgThread[data-open]')))) throw new Error('room did not open');
    await p.evaluate(() => { const l = document.getElementById('cmList'); if (l && !l.children.length && window.LowiCommunity) LowiCommunity.mount(document.getElementById('cmPaneChat')); });
    await p.evaluate(() => { const l = document.getElementById('cmList'); if (l) l.scrollTop = 0; }); await sleep(500);
    await R.shot(path.join(OUT, tag + '-1-nothing-pinned.png'));
    if (URL_) return;
    const A = await p.evaluate(head); notes.push(W + ' unpinned ' + JSON.stringify(A)); for (const e of A.errs) fail(W, e); if (A.pin) fail(W, 'pinned bar shows with nothing pinned'); if (A.sw) fail(W, 'sideways overflow');
    /* become the admin (server is_app_owner) and pin a message from its menu */
    const target = await p.evaluate(() => { window.LowiOwnerAdmin = Object.assign(window.LowiOwnerAdmin || {}, { isOwner: () => true }); const ms = [...document.querySelectorAll('#cmList .cp-msg[id^="cm-"]')].filter(e => !e.querySelector('.cr-bot')); const m = ms[Math.max(0, ms.length - 6)]; return m ? m.id.slice(3) : ''; });
    if (!target) throw new Error('no message to pin');
    await p.evaluate(id => { const b = document.querySelector('#cm-' + CSS.escape(id) + ' [data-chat="more"]'); if (b) b.click(); }, target); await sleep(500);
    const menu = await until(p, id => { const b = document.querySelector('#cm-' + CSS.escape(id) + ' [data-chat="pin-msg"]'); if (b) b.scrollIntoView({ block: 'center' }); return b ? b.textContent : ''; }, target);
    if (!menu) fail(W, 'admin menu has no Pin'); await sleep(300); await R.shot(path.join(OUT, tag + '-2-menu-pin.png'));
    /* the sim has no Supabase: the marker goes into the shared message list the way the server returns it */
    await p.evaluate(id => { const H = window.LowiCommunityHost, K = window.LowiChatCore, m = H.messages().find(x => x.id === id), me = H.state().uid; H.upsert({ id: 'mpin' + Date.now(), uid: me, by: 'Admin', t: K.pinBody(id, m ? (m.t || '') : ''), ts: Date.now(), rx: {}, re: null }); window.LowiCommunity.refresh(); }, target); await until(p, () => { const b = document.getElementById('crPin'); return b && !b.hidden && !!b.querySelector('[data-chat="pin-go"]'); });
    await p.evaluate(() => { const l = document.getElementById('cmList'); if (l) l.scrollTop = 0; }); await sleep(400);
    const B = await p.evaluate(head); notes.push(W + ' pinned ' + JSON.stringify(B)); for (const e of B.errs) fail(W, 'pinned: ' + e); if (!B.pin) fail(W, 'pinned bar missing after pin');
    const bar = await p.evaluate(() => { const b = document.getElementById('crPin'); return b ? { go: !!b.querySelector('[data-chat="pin-go"]'), unpin: !!b.querySelector('[data-chat="unpin"]'), text: (b.querySelector('.cr-pint') || {}).textContent || '', cut: [...b.querySelectorAll('.cr-pinl,.cr-unpin')].some(e => e.scrollWidth > e.clientWidth + 1) } : null; });
    if (!bar || !bar.go) fail(W, 'bar has no go-to button'); if (!bar || !bar.unpin) fail(W, 'admin has no Unpin on the bar'); if (bar && bar.cut) fail(W, 'pin label or Unpin cut off'); if (bar && /pin:/.test(bar.text)) fail(W, 'marker text leaks');
    const leaks = await p.evaluate(() => [...document.querySelectorAll('#cmList .cm-bub')].filter(b => /\u2060pin:|\u2060unpin/.test(b.textContent)).length); if (leaks) fail(W, leaks + ' marker shown as a chat line');
    await R.shot(path.join(OUT, tag + '-3-pinned.png'));
    await p.evaluate(() => { const l = document.getElementById('cmList'); if (l) l.scrollTop = l.scrollHeight; }); await sleep(300);
    await p.locator('#crPin [data-chat="pin-go"]').click({ force: true, timeout: 5000 }).catch(e => fail(W, 'bar tap: ' + e.message.split('\n')[0])); await sleep(400);
    const seen = await until(p, id => { const e = document.getElementById('cm-' + id), pin = document.getElementById('crPin').getBoundingClientRect(), c = document.querySelector('.cm-compose'); if (!e) return 'gone'; const r = e.getBoundingClientRect(), bot = c ? c.getBoundingClientRect().top : innerHeight; return r.bottom > pin.bottom && r.top < bot ? 'ok' : ''; }, target, 4000) || 'not in view';
    if (seen !== 'ok') fail(W, 'tapping the bar did not bring the message into view: ' + seen);
    await R.shot(path.join(OUT, tag + '-4-went-to-pin.png'));
    /* admin taps Unpin: the unpin marker is the newest, the bar goes away */
    await p.evaluate(() => { const H = window.LowiCommunityHost, K = window.LowiChatCore; H.upsert({ id: 'munpin' + Date.now(), uid: H.state().uid, by: 'Admin', t: K.unpinBody(), ts: Date.now() + 5, rx: {}, re: null }); window.LowiCommunity.refresh(); }); await until(p, () => { const b = document.getElementById('crPin'); return !b || b.hidden; });
    const C = await p.evaluate(head); if (C.pin) fail(W, 'bar still shows after unpin'); for (const e of C.errs) fail(W, 'unpinned again: ' + e);
    /* not the admin: no Pin in the menu, no Unpin on a bar */
    await p.evaluate(() => { window.LowiOwnerAdmin.isOwner = () => false; document.querySelectorAll('#cmList .cp-acts').forEach(a => { const m = a.closest('[id^="cm-"]'), b = m && m.querySelector('[data-chat="more"]'); if (b) b.click(); }); window.LowiCommunity.refresh(); }); await sleep(1500);
    const other = await p.evaluate(() => { const b = [...document.querySelectorAll('#cmList [data-chat="more"]')].pop(); if (b) b.click(); return new Promise(r => setTimeout(() => r(!!document.querySelector('#cmList [data-chat="pin-msg"],#cmList [data-chat="unpin"]')), 2000)); });
    if (other) { const d = await p.evaluate(() => ({ owner: window.LowiOwnerAdmin.isOwner(), frozen: Object.isFrozen(window.LowiOwnerAdmin), open: [...document.querySelectorAll('#cmList [data-chat="pin-msg"],#cmList [data-chat="unpin"]')].map(b => (b.closest('[id^="cm-"]') || {}).id + ':' + b.dataset.chat) })); fail(W, 'a non-admin sees Pin/Unpin ' + JSON.stringify(d)); }
    if (R.errs.length) fail(W, 'page errors ' + JSON.stringify(R.errs.slice(0, 3)));
  } catch (e) { fail(W, 'run: ' + String(e.message).split('\n')[0]); }
  finally { await R.close(); }
}
(async () => {
  for (const d of DEVICES) { await run(d, false, d === 'iPhone SE' ? 'de' : 'en'); await run(d, true, d === 'Pixel 7' ? 'es' : 'en'); }
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ fails, notes }, null, 1));
  console.log(notes.join('\n')); console.log(fails.length ? fails.length + ' FAIL' : '0 FAIL');
  process.exit(fails.length ? 1 : 0);
})();
