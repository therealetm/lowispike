/* Community room thread probe (21 Oct 2026, Telegram/Eden-style room): opens the real app in simulated phones, goes to
   Community > Chat > the room, and checks the Telegram-style layout: floating top bar (back, centred name pill, members),
   pinned pill, bubbles with time inside, composer (photo left, field, mic/send right) with nothing overlapping, text
   contrast (WCAG AA), no sideways overflow, no page errors.
   node tools/community-chat-tg/probe.cjs [outDir] [url] [devices comma list]  -> screenshots + report.json, exit 1 on failure. */
'use strict';
const fs = require('fs'), path = require('path');
const H = require('../regress/harness.cjs'), N = require('../regress/nav.cjs');
const sleep = H.sleep;
const OUT = path.resolve(process.argv[2] || '/tmp/chat-tg-probe'); fs.mkdirSync(OUT, { recursive: true });
const URL_ = process.argv[3] || '';
const DEVICES = (process.argv[4] || 'iPhone 13,iPhone SE,iPad (gen 7)').split(',');
const fails = [], notes = [];
const fail = (w, m) => { fails.push(w + ': ' + m); console.log('FAIL', w, m); };

function contrastScan(rootSel) {
  const parse = s => { const m = String(s).match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const over = (top, under) => { const a = top.a + under.a * (1 - top.a); if (!a) return { r: 0, g: 0, b: 0, a: 0 }; return { r: (top.r * top.a + under.r * under.a * (1 - top.a)) / a, g: (top.g * top.a + under.g * under.a * (1 - top.a)) / a, b: (top.b * top.a + under.b * under.a * (1 - top.a)) / a, a }; };
  const pageBg = document.documentElement.classList.contains('light') ? { r: 240, g: 244, b: 255, a: 1 } : { r: 4, g: 8, b: 22, a: 1 };
  const bgOf = el => { const layers = []; for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) layers.push(c); } let bg = pageBg; for (let i = layers.length - 1; i >= 0; i--) bg = over(layers[i], bg); return bg; };
  const bad = []; let n = 0;
  for (const root of document.querySelectorAll(rootSel)) { const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let t; while ((t = tw.nextNode())) { const txt = t.nodeValue.trim(); if (!txt) continue; const el = t.parentElement; const r = el.getBoundingClientRect(); const s = getComputedStyle(el); if (!r.width || !r.height || s.visibility === 'hidden' || +s.opacity === 0 || r.bottom < 0 || r.top > innerHeight || el.closest('.cp-sr,[aria-hidden=true]')) continue; if (r.width <= 2 && r.height <= 2) continue; n++; const fg = parse(s.color); if (!fg) continue; const bg = bgOf(el); const c = over(fg, bg); const L1 = lum(c), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05); const big = parseFloat(s.fontSize) >= 18.66 || (parseFloat(s.fontSize) >= 14 && +s.fontWeight >= 700); if (ratio < (big ? 3 : 4.5)) bad.push(txt.slice(0, 24) + ' ' + ratio.toFixed(2)); } }
  return { n, bad };
}
function layout() {
  const q = s => document.querySelector(s), box = e => { if (!e) return null; const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 1 && r.height > 1 && s.display !== 'none' && s.visibility !== 'hidden' ? r : null; };
  const hit = (a, b) => a && b && a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
  const out = { errs: [] };
  const back = box(q('#cgThread .cr-back')), pill = box(q('#cgThread .cr-id')), mem = box(q('#cgThread .cr-members')), pin = box(q('#cgThread .cr-pin'));
  if (!back) out.errs.push('no back button'); if (!pill) out.errs.push('no name pill'); if (!mem) out.errs.push('no members button'); if (!pin) out.errs.push('no pinned pill');
  if (back && pill && hit(back, pill)) out.errs.push('back over pill'); if (mem && pill && hit(mem, pill)) out.errs.push('members over pill');
  if (pill && Math.abs((pill.left + pill.right) / 2 - innerWidth / 2) > 3 && innerWidth < 700) out.errs.push('pill not centred ' + Math.round((pill.left + pill.right) / 2));
  if (back && (back.width < 40 || Math.abs(back.width - back.height) > 2)) out.errs.push('back not round 40+ ' + back.width + 'x' + back.height);
  for (const f of ['tbTheme', 'pfBtn']) { const b = box(document.getElementById(f)); if (b) for (const [n, r] of [['back', back], ['pill', pill], ['members', mem], ['pin', pin]]) if (hit(b, r)) out.errs.push(f + ' covers ' + n); }
  const inp = box(q('#cmInput')), ph = box(q('#cmPhoto')), mic = box(q('#cmMic')) || box(q('[data-chat="mic"]')), send = box(q('#cmSend'));
  if (!inp) out.errs.push('no field'); if (!ph) out.errs.push('no photo button');
  if (inp && ph && ph.right > inp.left + 1) out.errs.push('photo not left of field');
  const right = mic || send; if (inp && right && right.left < inp.right - 1) out.errs.push('mic/send not right of field');
  for (const [n, r] of [['photo', ph], ['mic', mic], ['send', send]]) if (r && inp && hit(r, inp)) out.errs.push(n + ' covers field');
  const bubs = [...document.querySelectorAll('#cgThread .cp-msg .cm-bub')].filter(b => box(b)); out.bubbles = bubs.length;
  let timeOut = 0; for (const b of bubs.slice(-12)) { const t = b.querySelector('time'); const tb = box(t), bb = box(b); if (tb && bb && (tb.right > bb.right + 1 || tb.bottom > bb.bottom + 1)) timeOut++; } if (timeOut) out.errs.push(timeOut + ' times outside their bubble');
  out.sys = document.querySelectorAll('#cgThread .cr-sys').length;
  out.sw = document.documentElement.scrollWidth; out.w = document.documentElement.clientWidth; if (out.sw > out.w + 1) out.errs.push('sideways overflow');
  const list = box(q('#cmList')); out.list = list ? Math.round(list.height) : 0;
  return out;
}
async function run(engine, device, light) {
  const W = engine + '/' + device + (light ? '/day' : '');
  const R = await H.open({ engine, device, probe: false, url: URL_ });
  const p = R.page;
  try {
    await R.goto(); if (light) await p.evaluate(() => document.documentElement.classList.add('light'));
    await N.openCommunity(R); await sleep(7000);
    await p.locator('.rm-tab[data-rm="chat"]').click({ force: true }).catch(() => { }); await sleep(1200);
    await p.locator('.rm-ch[data-ch="galaxy"]').click({ force: true }).catch(() => { }); await sleep(1500);
    const open = await p.evaluate(() => !!document.querySelector('#cgThread[data-open]'));
    if (!open) { await p.evaluate(() => { const b = document.querySelector('[data-chat="open-thread"]'); if (b) b.click(); }); await sleep(1200); }
    if (!(await p.evaluate(() => !!document.querySelector('#cgThread[data-open]')))) throw new Error('room thread did not open');
    /* headless WebKit sometimes holds the chat's animation-frame paint; paint once directly so the room is measured with its messages */
    await p.evaluate(() => { const l = document.getElementById('cmList'); if (l && !l.children.length && window.LowiCommunity) LowiCommunity.mount(document.getElementById('cmPaneChat')); });
    await p.evaluate(() => { const l = document.getElementById('cmList'); if (l) l.scrollTop = l.scrollHeight; }); await sleep(600);
    /* simulate people walking into the room (the real LowiRooms presence list grows) so the "X and N others joined" pill + Wave show */
    const joined = await p.evaluate(() => { const R = window.LowiRooms, Hh = window.LowiCommunityHost; if (!R || !Hh) return 'no rooms'; const base = R.members(); const extra = Hh.people().map(x => x.uid).filter(u => u && !base.includes(u)).slice(0, 4); R.active = () => true; R.members = () => base; LowiCommunity.mount(document.getElementById('cmPaneChat')); R.members = () => base.concat(extra); LowiCommunity.mount(document.getElementById('cmPaneChat')); const l = document.getElementById('cmList'); l.scrollTop = l.scrollHeight; return extra.length; });
    await sleep(300); notes.push(W + ' joined ' + joined);
    { const wv = await p.evaluate(() => { const s = document.querySelector('#cgThread .cr-sys'); const w = s && s.querySelector('[data-chat=wave]'); return s ? (w ? Math.round(w.getBoundingClientRect().height) + ' ' + w.className : 'no wave: ' + s.outerHTML.slice(0, 300)) : 'no pill'; }); if (!/^(3[6-9]|[4-9]\d)/.test(wv)) fail(W, 'join pill/Wave: ' + wv); }
    const tag = device.replace(/\W+/g, '-').toLowerCase() + (light ? '-day' : '');
    await R.shot(path.join(OUT, tag + '-room.png'));
    const L = await p.evaluate(layout); notes.push(W + ' ' + JSON.stringify({ bubbles: L.bubbles, sys: L.sys, list: L.list }));
    for (const e of L.errs) fail(W, e);
    const c = await p.evaluate(contrastScan, '#cgThread,.cm-compose'); notes.push(W + ' texts ' + c.n); if (c.bad.length) fail(W, 'low contrast: ' + c.bad.slice(0, 8).join(' | '));
    await p.locator('#cmInput').fill('Hello room', { force: true, timeout: 10000 }); await p.evaluate(() => { if (window.LowiCommunity) LowiCommunity.mount(document.getElementById('cmPaneChat')); }); await sleep(400);
    const L2 = await p.evaluate(layout); for (const e of L2.errs) if (/field|photo|mic|send/.test(e)) fail(W, 'typing: ' + e);
    await R.shot(path.join(OUT, tag + '-typing.png'));
    await p.locator('#cmInput').fill('', { force: true, timeout: 10000 }); await p.evaluate(() => { if (window.LowiCommunity) LowiCommunity.mount(document.getElementById('cmPaneChat')); });
    const mb = await p.$('#cgThread .cr-members'); if (mb) { await p.locator('#crMembers').click({ timeout: 5000, force: true }).catch(e => fail(W, 'members tap: ' + String(e.message).replace(/\s+/g, ' ').slice(-400))); await sleep(700); await R.shot(path.join(OUT, tag + '-members.png')); await p.evaluate(() => { if (window.LowiCommunity) LowiCommunity.mount(document.getElementById('cmPaneChat')); }); await sleep(200); const ok = await p.evaluate(() => { const c = document.querySelector('#cgThread .cr-crew[data-open]'); return !!c && c.getBoundingClientRect().height > 20; }); if (!ok) notes.push(W + ' members tap: no sheet seen'); }
    if (R.errs.length) fail(W, 'page errors ' + JSON.stringify(R.errs.slice(0, 3)));
  } catch (e) { fail(W, 'run: ' + String(e.message).split('\n')[0]); }
  finally { await R.close(); }
}
(async () => {
  if (!process.env.ONLY_DAY) for (const d of DEVICES) await run('webkit', d, false);
  if (!process.env.NO_DAY) await run('webkit', 'iPhone 13', true);
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ fails, notes }, null, 1));
  console.log(notes.join('\n')); console.log(fails.length ? fails.length + ' FAIL' : '0 FAIL');
  process.exit(fails.length ? 1 : 0);
})();
