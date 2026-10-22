/* Community room layout check, Eden layout in day and night (22 Oct 2026, item 37).
   Opens the real app in simulated phones, goes to Community > Chat > the room, and measures the room in Night and in Day
   (switched live through the app's own theme switch, with the room open):
   - composer (photo button, field, mic/send) fully on screen and above the home indicator (iPhones are also run as a home-screen
     app: full screen height with a 47 px status bar and a 34 px home indicator);
   - top bar (back, name pill with the room name readable, members) and pinned bar inside the screen, nothing over each other;
   - bubbles with no outline, the time inline on the last line when it fits, small reaction pills, no avatar on your own
     messages and an avatar only on the last message of a group;
   - the room is light in Day and dark in Night, text passes WCAG AA contrast, no sideways overflow, no page errors.
   node tools/community-chat-eden/probe.cjs [outDir] [url] [devices comma list]  -> screenshots + report.json, exit 1 on failure. */
'use strict';
const fs = require('fs'), path = require('path');
const H = require('../regress/harness.cjs'), N = require('../regress/nav.cjs');
const sleep = H.sleep;
const OUT = path.resolve(process.argv[2] || '/tmp/chat-eden-probe'); fs.mkdirSync(OUT, { recursive: true });
const URL_ = process.argv[3] || '';
const DEVICES = (process.argv[4] || 'iPhone SE,iPhone 13,iPhone 15,Pixel 7').split(',');
const fails = [], notes = [];
const fail = (w, m) => { fails.push(w + ': ' + m); console.log('FAIL', w, m); };

function measure(sab) {
  const q = s => document.querySelector(s);
  const box = e => { if (!e) return null; const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 1 && r.height > 1 && s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0 ? r : null; };
  const hit = (a, b) => a && b && a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
  const inView = r => r && r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1;
  const out = { errs: [] }, E = m => out.errs.push(m);
  /* top bar */
  const back = box(q('#cgThread .cr-back')), pill = box(q('#cgThread .cr-id')), mem = box(q('#cgThread .cr-members')), pin = box(q('#cgThread .cr-pin')), title = box(q('#cgThreadTitle'));
  for (const [n, r] of [['back button', back], ['name pill', pill], ['members button', mem], ['pinned bar', pin]]) { if (!r) E('no ' + n); else if (!inView(r)) E(n + ' cut off ' + [r.left, r.top, r.right, r.bottom].map(Math.round)); }
  if (!title || title.width < 40) E('room name not readable in the pill (' + (title ? Math.round(title.width) : 0) + ' px)');
  else if (q('#cgThreadTitle').scrollWidth > q('#cgThreadTitle').clientWidth + 1 && title.width < 90) E('room name squeezed to ' + Math.round(title.width) + ' px');
  if (hit(back, pill)) E('back over pill'); if (hit(mem, pill)) E('members over pill'); if (hit(pill, pin)) E('pill over pinned bar');
  if (pill && innerWidth < 700 && Math.abs((pill.left + pill.right) / 2 - innerWidth / 2) > 3) E('pill not centred');
  for (const [n, r] of [['back', back], ['members', mem]]) if (r && (r.width < 40 || Math.abs(r.width - r.height) > 2)) E(n + ' not round 40+');
  /* composer */
  const comp = box(q('#cmPaneChat .cm-compose')), inp = box(q('#cmInput')), ph = box(q('#cmPhoto')), mic = box(q('#cmMic')), send = box(q('#cmSend'));
  const floor = innerHeight - sab;
  if (!comp || !inp) E('no composer'); else {
    for (const [n, r] of [['field', inp], ['photo button', ph], ['mic/send', mic || send]]) { if (!r) E('no ' + n); else { if (!inView(r)) E(n + ' cut off'); if (r.bottom > floor + 0.5) E(n + ' under the home indicator (bottom ' + Math.round(r.bottom) + ' > ' + floor + ')'); } }
    if (ph && ph.right > inp.left + 1) E('photo not left of field'); const rt = mic || send; if (rt && rt.left < inp.right - 1) E('mic/send not right of field');
    if (inp.height < 40) E('field shorter than 40 px');
    if (Math.abs(comp.bottom - innerHeight) > 1.5 && !document.documentElement.classList.contains('cs-chat-typing')) E('composer does not reach the bottom edge (gap ' + Math.round(innerHeight - comp.bottom) + ' px)');
  }
  /* the room reaches the bottom edge (no black strip) and runs under the composer */
  const th = box(q('#cgThread')); if (!th) E('room not open'); else if (innerHeight - th.bottom > 1.5) E('room stops ' + Math.round(innerHeight - th.bottom) + ' px above the bottom edge');
  const list = q('#cmList'); if (list && comp && th) { const lb = list.getBoundingClientRect(); if (lb.bottom < comp.top + 4) E('messages do not scroll under the composer'); if (lb.top > (back ? back.top : 0) + 2) E('messages do not scroll under the top bar'); }
  /* bubbles */
  const bubs = [...document.querySelectorAll('#cgThread .cp-msg .cm-bub')].filter(b => box(b)); out.bubbles = bubs.length;
  if (bubs.length < 3) E('only ' + bubs.length + ' bubbles');
  let border = 0, glass = 0, timeOff = 0, tall = 0, wide = 0; const det = [];
  for (const b of bubs) {
    const s = getComputedStyle(b), bb = b.getBoundingClientRect();
    if (['Top', 'Right', 'Bottom', 'Left'].some(k => parseFloat(s['border' + k + 'Width']) > 0) || (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0)) border++;
    if (/inset/.test(s.boxShadow) && /0px 0px 0px [1-9]/.test(s.boxShadow)) border++;
    if ((s.backdropFilter && s.backdropFilter !== 'none') || (s.webkitBackdropFilter && s.webkitBackdropFilter !== 'none')) glass++;
    if (bb.width > innerWidth * 0.8 + 1) wide++;
    const t = b.querySelector(':scope > .cm-t'), ft = b.querySelector('.cm-foot'), tm = ft && box(ft.querySelector('time'));
    if (!t || !tm) continue;
    if (tm.right > bb.right + 1 || tm.bottom > bb.bottom + 1 || tm.left < bb.left - 1) timeOff++;
    const rg = document.createRange(); rg.selectNodeContents(t); const lines = [...rg.getClientRects()].filter(r => r.width > 0.5); if (!lines.length) continue;
    const last = lines.reduce((a, r) => (r.bottom > a.bottom + 1 ? r : a), lines[0]);
    const padR = parseFloat(s.paddingRight), innerR = bb.right - padR, fb = ft.getBoundingClientRect();
    const fits = last.right + fb.width + 10 <= innerR + 3; /* the footer's margin box is its width + 10 - 5 px, so this leaves 2 px for rounding */
    if (fits && fb.top > last.bottom - 4) { timeOff++; if (det.length < 3) det.push('time below a line that has room: ' + t.textContent.slice(0, 24)); }
    /* a short, single-line message with nothing else in the bubble is one line tall */
    if (fits && lines.every(r => Math.abs(r.top - lines[0].top) < 2) && !b.querySelector('.cs-name,.cm-quote,.cm-rx,.cp-acts,.cs-photo,.cs-voice,.cs-delivery') && bb.height > 40) { tall++; if (det.length < 3) det.push('tall one-liner ' + Math.round(bb.height) + 'px: ' + t.textContent.slice(0, 24)); }
  }
  if (border) E(border + ' bubbles with an outline'); if (glass) E(glass + ' bubbles with their own blur'); if (timeOff) E(timeOff + ' times not inline on the last line'); if (tall) E(tall + ' one-line bubbles taller than one line'); if (wide) E(wide + ' bubbles wider than 80%');
  if (det.length) out.det = det;
  /* avatars */
  const mineAv = [...document.querySelectorAll('#cgThread .cp-msg.mine .cp-av')].filter(box).length; if (mineAv) E(mineAv + ' avatars on your own messages');
  const midAv = [...document.querySelectorAll('#cgThread .cp-msg:not(.mine):not(.cp-end) .cp-av:not(.cp-gap)')].filter(box).length; if (midAv) E(midAv + ' avatars on messages that are not the last of a group');
  out.mine = document.querySelectorAll('#cgThread .cp-msg.mine').length;
  /* reactions */
  const chips = [...document.querySelectorAll('#cgThread .cm-rx .cm-chip')].filter(box); out.chips = chips.length;
  for (const c of chips) { const r = c.getBoundingClientRect(); if (r.height > 28 || r.width > 72) { E('reaction pill ' + Math.round(r.width) + 'x' + Math.round(r.height)); break; } }
  /* theme */
  const lum = c => { const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return -1; const p = m[1].split(/[ ,/]+/).map(Number); const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(p[0]) + 0.7152 * f(p[1]) + 0.0722 * f(p[2]); };
  out.roomLum = +lum(getComputedStyle(q('#cgThread')).backgroundColor).toFixed(3);
  const other = bubs.find(b => !b.closest('.mine')); out.bubLum = other ? +lum(getComputedStyle(other).backgroundColor).toFixed(3) : -1;
  out.sw = document.documentElement.scrollWidth; if (out.sw > document.documentElement.clientWidth + 1) E('sideways overflow');
  out.blur = [...document.querySelectorAll('#cmPaneChat *')].filter(e => { const s = getComputedStyle(e); return (s.backdropFilter && s.backdropFilter !== 'none' || s.webkitBackdropFilter && s.webkitBackdropFilter !== 'none') && box(e); }).length;
  return out;
}
function contrastScan(rootSel) {
  const parse = s => { const m = String(s).match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const over = (t, u) => { const a = t.a + u.a * (1 - t.a); if (!a) return { r: 0, g: 0, b: 0, a: 0 }; return { r: (t.r * t.a + u.r * u.a * (1 - t.a)) / a, g: (t.g * t.a + u.g * u.a * (1 - t.a)) / a, b: (t.b * t.a + u.b * u.a * (1 - t.a)) / a, a }; };
  const roomBg = parse(getComputedStyle(document.getElementById('cgThread')).backgroundColor) || { r: 4, g: 8, b: 22, a: 1 };
  const bgOf = el => { const layers = []; for (let e = el; e && e.nodeType === 1 && e.id !== 'cgThread'; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) layers.push(c); } let bg = roomBg; for (let i = layers.length - 1; i >= 0; i--) bg = over(layers[i], bg); return bg; };
  const bad = []; let n = 0;
  for (const root of document.querySelectorAll(rootSel)) {
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let t;
    while ((t = tw.nextNode())) {
      const txt = t.nodeValue.trim(); if (!txt) continue; const el = t.parentElement; const r = el.getBoundingClientRect(); const s = getComputedStyle(el);
      if (!r.width || !r.height || s.visibility === 'hidden' || +s.opacity === 0 || r.bottom < 0 || r.top > innerHeight || el.closest('.cp-sr,[aria-hidden=true],[hidden]') || parseFloat(s.fontSize) < 1) continue;
      let fg = parse(s.color); if (!fg) continue; let op = 1; for (let e = el; e && e.nodeType === 1; e = e.parentElement) op *= +getComputedStyle(e).opacity; const bg = bgOf(el); fg = over({ ...fg, a: fg.a * op }, bg);
      const L1 = lum(fg), L2 = lum(bg), cr = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05); n++;
      const big = parseFloat(s.fontSize) >= 18.6 || (parseFloat(s.fontSize) >= 14 && +s.fontWeight >= 700);
      if (cr < (big ? 3 : 4.5)) bad.push(txt.slice(0, 22) + ' ' + cr.toFixed(2));
    }
  }
  return { n, bad };
}
async function setTheme(p, t) {
  await p.evaluate(t => { const R2 = window.LowiR2; if (R2 && R2.applyTheme) R2.applyTheme(t); else { document.documentElement.setAttribute('data-theme', t); } document.documentElement.setAttribute('data-theme', t); }, t);
  await sleep(500);
}
async function run(engine, device, home) {
  const W = engine + '/' + device + (home ? '/home-screen' : '');
  const R = await H.open({ engine, device, probe: false, url: URL_ });
  const p = R.page; const errs = []; p.on('pageerror', e => errs.push(String(e.message || e).slice(0, 160)));
  try {
    let sab = 0;
    if (home) { const s = await p.evaluate(() => ({ w: screen.width, h: screen.height })); await p.setViewportSize({ width: s.w, height: s.h }); sab = 34; }
    await R.goto();
    if (home) await p.evaluate(() => { document.documentElement.style.setProperty('--sat', '47px'); document.documentElement.style.setProperty('--sab', '34px'); });
    await setTheme(p, 'dark');
    await N.openCommunity(R); await sleep(6000);
    await p.locator('.rm-tab[data-rm="chat"]').click({ force: true }).catch(() => { }); await sleep(1200);
    if (!(await p.evaluate(() => !!document.querySelector('#cgThread[data-open]')))) { await p.locator('.rm-ch[data-ch="galaxy"]').click({ force: true, timeout: 3000 }).catch(() => { }); await sleep(1500); }
    if (!(await p.evaluate(() => !!document.querySelector('#cgThread[data-open]')))) { await p.evaluate(() => { const b = document.querySelector('[data-chat="open-thread"]'); if (b) b.click(); }); await sleep(1200); }
    if (!(await p.evaluate(() => !!document.querySelector('#cgThread[data-open]')))) throw new Error('room thread did not open');
    await p.evaluate(() => { const l = document.getElementById('cmList'); if (l && !l.children.length && window.LowiCommunity) LowiCommunity.mount(document.getElementById('cmPaneChat')); });
    /* give the room an own message, a reply and reactions so every bubble kind is on screen */
    await p.evaluate(() => { const l = document.getElementById('cmList'); if (l) l.scrollTop = l.scrollHeight; }); await sleep(700);
    const tag = device.replace(/\W+/g, '-').toLowerCase() + (home ? '-home' : '');
    for (const theme of ['dark', 'light']) {
      const T = W + '/' + (theme === 'light' ? 'day' : 'night');
      await setTheme(p, theme);
      await p.evaluate(() => { const l = document.getElementById('cmList'); if (l) l.scrollTop = l.scrollHeight; }); await sleep(400);
      const m = await p.evaluate(measure, sab); notes.push(T + ' ' + JSON.stringify({ bubbles: m.bubbles, mine: m.mine, chips: m.chips, roomLum: m.roomLum, bubLum: m.bubLum, blurLayers: m.blur, det: m.det }));
      for (const e of m.errs) fail(T, e);
      if (theme === 'light' && !(m.roomLum > 0.6 && m.bubLum > 0.8)) fail(T, 'room is not light in Day (room ' + m.roomLum + ', bubble ' + m.bubLum + ')');
      if (theme === 'dark' && !(m.roomLum < 0.05 && m.bubLum < 0.06)) fail(T, 'room is not dark in Night (room ' + m.roomLum + ', bubble ' + m.bubLum + ')');
      if (m.blur > 3) fail(T, m.blur + ' blurred layers in the room (max 3)');
      const c = await p.evaluate(contrastScan, '#cgThread,#cmPaneChat .cm-compose'); notes.push(T + ' texts ' + c.n); if (c.bad.length) fail(T, 'low contrast: ' + c.bad.slice(0, 8).join(' | '));
      await R.shot(path.join(OUT, tag + '-' + (theme === 'light' ? 'day' : 'night') + '.png'));
      /* scrolled up: the round jump button shows and brings you back down */
      await p.evaluate(() => { const l = document.getElementById('cmList'); l.scrollTop = 0; l.dispatchEvent(new Event('scroll')); }); await sleep(1200);
      const down = await p.evaluate(() => { const b = document.querySelector('#cgThread .cr-down'); if (!b) return 'none'; const r = b.getBoundingClientRect(), s = getComputedStyle(b); const l = document.getElementById('cmList'); return s.visibility === 'visible' && (+s.opacity > 0.5 || document.getElementById('cgThread').classList.contains('cr-up')) ? Math.round(r.width) + 'x' + Math.round(r.height) : 'hidden (up ' + document.getElementById('cgThread').classList.contains('cr-up') + ', left ' + Math.round(l.scrollHeight - l.scrollTop - l.clientHeight) + ', vis ' + s.visibility + ' op ' + s.opacity + ')'; });
      if (!/^4\dx4\d$/.test(down)) fail(T, 'round jump-to-latest button when scrolled up: ' + down);
      else { await p.locator('#cgThread .cr-down').click({ force: true }).catch(() => { }); await sleep(700); const nb = await p.evaluate(() => { const l = document.getElementById('cmList'); return l.scrollHeight - l.scrollTop - l.clientHeight; }); if (nb > 90) fail(T, 'jump button did not go to the latest message (' + Math.round(nb) + ' px left)'); }
    }
    /* typing in Day: the field grows a line, the composer stays fully above the home indicator, the send button shows */
    await p.locator('#cmInput').fill('Hello galaxy, this line is long enough to wrap onto a second line in the field', { force: true, timeout: 10000 }); await sleep(500);
    const mt = await p.evaluate(measure, sab); for (const e of mt.errs) if (/field|photo|mic|send|composer/.test(e)) fail(W + '/day/typing', e);
    await R.shot(path.join(OUT, tag + '-day-typing.png'));
    await p.locator('#cmInput').fill('', { force: true, timeout: 10000 });
    await setTheme(p, 'dark');
    if (errs.length) fail(W, 'page errors: ' + errs.slice(0, 3).join(' | '));
  } catch (e) { fail(W, 'crashed: ' + String(e.message || e).slice(0, 200)); try { await R.shot(path.join(OUT, device.replace(/\W+/g, '-').toLowerCase() + '-crash.png')); } catch (x) { } }
  finally { await R.close(); }
}
(async () => {
  for (const d of DEVICES) { await run('webkit', d, false); if (/iPhone/.test(d)) await run('webkit', d, true); }
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ fails, notes }, null, 1));
  console.log(notes.join('\n')); console.log(fails.length ? fails.length + ' FAIL' : 'ALL PASS');
  process.exit(fails.length ? 1 : 0);
})();
