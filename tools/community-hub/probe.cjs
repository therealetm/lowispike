/* Community hub probe (21 Oct 2026, Eden-inspired rebuild): opens the real app in simulated phones, goes to Community and checks
   the header, the menu, the tabs and the Create/Affiliates frames for (1) text contrast below WCAG AA, (2) anything overlapping
   the Day/Night switch or the profile picture, (3) sideways overflow, (4) tabs that do not answer a real centre tap.
   node tools/community-hub/probe.cjs [outDir] [url]   -> screenshots + report.json, exits 1 on any failure. */
'use strict';
const fs = require('fs'), path = require('path');
const H = require('../regress/harness.cjs'), N = require('../regress/nav.cjs');
const sleep = H.sleep;
const OUT = path.resolve(process.argv[2] || '/tmp/community-hub-probe'); fs.mkdirSync(OUT, { recursive: true });
const URL_ = process.argv[3] || '';
const fails = [], notes = [];
const fail = (w, m) => { fails.push(w + ': ' + m); console.log('FAIL', w, m); };

/* runs in the page (or a frame): every visible text node's colour against the composited backgrounds behind it */
function contrastScan(rootSel) {
  const parse = s => { const m = String(s).match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const over = (top, under) => { const a = top.a + under.a * (1 - top.a); if (!a) return { r: 0, g: 0, b: 0, a: 0 }; return { r: (top.r * top.a + under.r * under.a * (1 - top.a)) / a, g: (top.g * top.a + under.g * under.a * (1 - top.a)) / a, b: (top.b * top.a + under.b * under.a * (1 - top.a)) / a, a }; };
  const pageBg = document.documentElement.classList.contains('light') ? { r: 240, g: 244, b: 255, a: 1 } : { r: 3, g: 5, b: 10, a: 1 };
  const bgOf = el => { const layers = []; for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const s = getComputedStyle(e); const c = parse(s.backgroundColor); if (c && c.a > 0) layers.push(c); const img = s.backgroundImage; if (img && img !== 'none') { const cs = (img.match(/rgba?\([^)]+\)/g) || []).map(parse).filter(Boolean); if (cs.length) { const avg = cs.reduce((t, x) => ({ r: t.r + x.r / cs.length, g: t.g + x.g / cs.length, b: t.b + x.b / cs.length, a: t.a + x.a / cs.length }), { r: 0, g: 0, b: 0, a: 0 }); layers.push(avg); } } if (c && c.a >= 1) break; } let bg = pageBg; for (let i = layers.length - 1; i >= 0; i--) bg = over(layers[i], bg); return bg; };
  const roots = [...document.querySelectorAll(rootSel)]; const bad = []; let n = 0;
  for (const root of roots) { const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let t; while ((t = tw.nextNode())) { const txt = t.nodeValue.trim(); if (!txt) continue; const el = t.parentElement; const r = el.getBoundingClientRect(); const s = getComputedStyle(el); if (!r.width || !r.height || s.visibility === 'hidden' || +s.opacity === 0 || el.closest('[hidden],[aria-hidden="true"],:disabled')) continue; /* disabled controls are exempt in WCAG 1.4.3 */ let op = 1; for (let e = el; e; e = e.parentElement) op *= +getComputedStyle(e).opacity; const fg0 = parse(s.color); if (!fg0) continue; const bg = bgOf(el); const fg = over(Object.assign({}, fg0, { a: fg0.a * op }), bg); const L1 = lum(fg), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05); const px = parseFloat(s.fontSize), big = px >= 24 || (px >= 18.66 && +s.fontWeight >= 700); n++; if (ratio < (big ? 3 : 4.5)) bad.push(txt.slice(0, 30) + ' ' + ratio.toFixed(2) + ' (' + s.color + ' on ~rgb(' + [bg.r, bg.g, bg.b].map(Math.round) + '))'); } }
  return { n, bad };
}
function overlaps() { /* header/menu items under the floating Day/Night switch or the profile picture */
  const fl = ['tbTheme', 'pfBtn'].map(id => document.getElementById(id)).filter(e => e && e.getBoundingClientRect().width > 1 && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden');
  const out = []; for (const e of document.querySelectorAll('.rm-bar button,.rm-bar [role=tab],.rm-bar .rm-id,.rm-bar .rm-live,.rm-crumb')) { const r = e.getBoundingClientRect(); if (!r.width || e.closest('[hidden]')) continue; for (const f of fl) { const q = f.getBoundingClientRect(); if (r.left < q.right && r.right > q.left && r.top < q.bottom && r.bottom > q.top) out.push((e.className || e.tagName) + ' x ' + f.id); } } return out;
}
async function tap(p, sel) { await sleep(350); /* scroll + measure in the page: Playwright's own scroll waits for a 'stable' element, which under heavy load (the galaxy runs ~150 animations) can time out */ const b = await p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r0 = e.getBoundingClientRect(); const tb = document.getElementById('tabbar'), low = tb && getComputedStyle(tb).display !== 'none' ? tb.getBoundingClientRect().top : innerHeight; /* the bottom tab bar covers the page below its top edge */ if (r0.top < 0 || r0.bottom > low) e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return r.width && r.height ? { x: r.left, y: r.top, width: r.width, height: r.height } : null; }, sel); await sleep(150); if (!b) throw new Error('no box for ' + sel); const hit = await p.evaluate(([x, y, s]) => { const e = document.elementFromPoint(x, y); return !!(e && e.closest(s)); }, [b.x + b.width / 2, b.y + b.height / 2, sel]); if (!hit) { const who = await p.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? (e.className || e.tagName) + ' @' + Math.round(x) + ',' + Math.round(y) + ' vh' + innerHeight : 'none'; }, [b.x + b.width / 2, b.y + b.height / 2]); throw new Error('centre of ' + sel + ' is covered by ' + who); } await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2); }
async function scan(p, W, label, sel) { const c = await p.evaluate(contrastScan, sel); notes.push(W + ' ' + label + ' texts ' + c.n); if (c.bad.length) fail(W, label + ' low contrast: ' + c.bad.slice(0, 6).join(' | ')); }
async function frameScan(p, W, view) { let f = null; for (let i = 0; i < 40 && !f; i++) { f = p.frames().find(x => x.url().includes(view === 'aff' ? '/affiliates/' : '/create/')); if (!f) await sleep(250); } if (!f) { fail(W, 'no frame ' + view); return; } await f.waitForSelector('h1,h2', { timeout: 15000 }); const c = await f.evaluate(contrastScan, 'body'); notes.push(W + ' frame ' + view + ' texts ' + c.n); if (c.bad.length) fail(W, 'frame ' + view + ' low contrast: ' + c.bad.slice(0, 6).join(' | ')); const cs = await f.evaluate(() => getComputedStyle(document.documentElement).colorScheme); if (!/dark/.test(cs)) fail(W, 'frame ' + view + ' colour scheme is ' + cs + ' (an iframe whose scheme differs from the app gets an opaque WHITE canvas)'); }

async function run(engine, device, light) {
  const W = engine + '/' + device + (light ? '/day' : '');
  const R = await H.open({ engine, device, probe: false, url: URL_ });
  const p = R.page;
  try {
    await R.goto(); if (light) await p.evaluate(() => { document.documentElement.classList.add('light'); });
    await N.openCommunity(R); await sleep(1200);
    if (!(await p.waitForSelector('.rm-bar', { timeout: 20000 }).catch(() => null))) throw new Error('no community bar');
    const tag = device.replace(/\W+/g, '-').toLowerCase() + (light ? '-day' : '');
    await R.shot(path.join(OUT, tag + '-1-galaxy.png'));
    const ov = await p.evaluate(overlaps); if (ov.length) fail(W, 'overlaps ' + ov.join(', '));
    const o = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: document.documentElement.clientWidth })); if (o.sw > o.w + 1) fail(W, 'sideways overflow ' + JSON.stringify(o));
    await scan(p, W, 'header', '.rm-bar');
    for (const t of ['chat', 'create', 'aff', 'room']) {
      await tap(p, '.rm-tab[data-rm="' + t + '"]'); await sleep(900);
      const sel = await p.evaluate(() => (document.querySelector('.rm-tab[aria-selected="true"]') || {}).dataset.rm); if (sel !== t) fail(W, 'tab ' + t + ' not selected (got ' + sel + ')');
      const ind = await p.evaluate(() => { const tl = document.querySelector('.rm-tabs'), on = document.querySelector('.rm-tab[aria-selected="true"]'); const a = tl.getBoundingClientRect(), b = on.getBoundingClientRect(), cs = getComputedStyle(tl, '::before'); const i = +(tl.style.getPropertyValue('--rm-i') || 0), w = parseFloat(cs.width); const left = a.left + parseFloat(cs.left) + i * (w + 4); /* where the glow comes to rest (the slide itself is a .32 s transition) */ return { d: Math.abs((left + w / 2) - (b.left + b.width / 2)), ww: Math.abs(w - b.width) }; });
      if (ind.d > 3 || ind.ww > 3) fail(W, 'segment glow not under ' + t + ' ' + JSON.stringify(ind));
      await scan(p, W, 'header on ' + t, '.rm-bar');
      if (t === 'create' || t === 'aff') { await frameScan(p, W, t); await sleep(500); await R.shot(path.join(OUT, tag + '-' + t + '.png')); }
      if (t === 'create') { const f = p.frames().find(x => x.url().includes('/create/')); const b = await f.$('#go'); if (!b || !(await b.isVisible())) fail(W, 'Creation button missing'); else { const bb = await b.boundingBox(); await p.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); /* a real tap at its centre, in page coordinates */ await sleep(900); const v = await p.evaluate(() => document.getElementById('cmPaneChat').getAttribute('data-rm-view')); if (v !== 'aff') fail(W, 'Creation button did not open Affiliates (' + v + ')'); } }
      if (t === 'chat') {
        const cv = await p.evaluate(() => document.getElementById('cmPaneChat').getAttribute('data-rm-view')); if (cv !== 'chans') fail(W, 'Chat tab did not open the channel list (' + cv + ')');
        await scan(p, W, 'channels', '.rm-chans'); await R.shot(path.join(OUT, tag + '-chat.png'));
        const land = await p.evaluate(() => { const q = s => document.querySelector(s); const vw = document.documentElement.clientWidth; const out = []; const els = { pill: q('.rm-l-pill'), h: q('.rm-l-h'), sub: q('.rm-l-sub'), card: q('.rm-chans .rm-ch-list'), go: q('.rm-l-go') };
          for (const [k, e] of Object.entries(els)) { if (!e) { out.push(k + ' missing'); continue; } const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) out.push(k + ' invisible'); if (r.left < -0.5 || r.right > vw + 0.5) out.push(k + ' off-screen ' + Math.round(r.left) + '..' + Math.round(r.right)); if (e.scrollWidth > e.clientWidth + 1 && k !== 'pill') out.push(k + ' clipped'); }
          const order = ['pill', 'h', 'sub', 'card', 'go'].map(k => els[k] && els[k].getBoundingClientRect()); for (let i = 1; i < order.length; i++) if (order[i] && order[i - 1] && order[i].top < order[i - 1].bottom - 0.5) out.push('overlap ' + i);
          const rows = document.querySelectorAll('.rm-chans .rm-ch').length; if (rows !== 3) out.push('rows ' + rows); const gr = els.go && els.go.getBoundingClientRect(); return { out, go: gr && Math.round(gr.height), h: els.h && getComputedStyle(els.h).fontSize }; });
        notes.push(W + ' landing headline ' + land.h + ' button ' + land.go + 'px'); if (land.out.length) fail(W, 'landing ' + land.out.join(', '));
        await tap(p, '.rm-ch[data-ch="room"]'); await sleep(700);
        const sh = await p.evaluate(() => { const s = document.querySelector('.rm-sheet'); return !!s && !s.hidden && getComputedStyle(s).display !== 'none'; }); if (!sh) fail(W, 'Room row did not open the members sheet');
        else { await scan(p, W, 'members sheet', '.rm-sheet'); await R.shot(path.join(OUT, tag + '-members.png')); await p.keyboard.press('Escape'); await sleep(500); if (await p.evaluate(() => { const s = document.querySelector('.rm-sheet'); return !!s && !s.hidden && getComputedStyle(s).display !== 'none'; })) { await tap(p, '.rm-x'); await sleep(500); } }
        await tap(p, '.rm-l-go'); await sleep(900);
        const th0 = await p.evaluate(() => !!document.querySelector('#cgThread[data-open]')); if (!th0) fail(W, 'Open galaxy chat button did not open the thread');
        await tap(p, '.rm-back'); await sleep(700);
        const rows = await p.$$eval('.rm-ch', e => e.map(x => x.dataset.ch + ':' + x.querySelector('.rm-ch-p').textContent.slice(0, 40))); notes.push(W + ' channels ' + rows.join(' | '));
        await tap(p, '.rm-ch[data-ch="galaxy"]'); await sleep(900);
        const th = await p.evaluate(() => ({ open: !!document.querySelector('#cgThread[data-open]'), crumb: !document.querySelector('.rm-crumb').hidden, sel: (document.querySelector('.rm-tab[aria-selected="true"]') || {}).dataset.rm }));
        if (!th.open || !th.crumb || th.sel !== 'chat') fail(W, 'Galaxy chat channel did not open its thread ' + JSON.stringify(th));
        await scan(p, W, 'thread crumb', '.rm-crumb'); await R.shot(path.join(OUT, tag + '-thread.png'));
        const ov2 = await p.evaluate(overlaps); if (ov2.length) fail(W, 'thread overlaps ' + ov2.join(', '));
        /* 21 Oct: inside a room the Telegram-style top bar's round back button replaces the crumb on phones */
        await tap(p, (await p.evaluate(() => { const b = document.querySelector('.rm-back'); return !!b && b.getBoundingClientRect().width > 0; })) ? '.rm-back' : '#cgThread .cr-back'); await sleep(700);
        const bk = await p.evaluate(() => ({ v: document.getElementById('cmPaneChat').getAttribute('data-rm-view'), open: !!document.querySelector('#cgThread[data-open]') })); if (bk.v !== 'chans' || bk.open) fail(W, 'back to channels ' + JSON.stringify(bk));
      }
    }
    if (await p.$('.rm-menu-btn')) { await tap(p, '.rm-menu-btn'); await sleep(500); await scan(p, W, 'menu', '.rm-menu'); await R.shot(path.join(OUT, tag + '-menu.png')); const items = await p.$$eval('.rm-menu [data-rmm]', e => e.map(x => x.dataset.rmm)); notes.push(W + ' menu ' + items.join(',')); await p.keyboard.press('Escape'); await sleep(300); if (await p.$('.rm-menu:not([hidden])')) fail(W, 'menu did not close on Escape'); }
    if (await p.evaluate(() => !!(window.LowiCommunityWelcome && window.LowiCommunityWelcome.open))) {
      await p.evaluate(() => window.LowiCommunityWelcome.open()); await sleep(500);
      for (let i = 1; i <= 5; i++) {
        const st = await p.evaluate(() => (document.querySelector('.rm-ob-step') || {}).textContent || ''); if (!st.includes(String(i))) fail(W, 'welcome step ' + i + ' shows ' + st);
        await scan(p, W, 'welcome ' + i, '.rm-ob'); if (i === 1 || i === 3 || i === 5) await R.shot(path.join(OUT, tag + '-welcome-' + i + '.png'));
        const fit = await p.evaluate(() => { const c = document.querySelector('.rm-ob-card-wrap').getBoundingClientRect(), g = document.querySelector('.rm-ob-go').getBoundingClientRect(); return { top: c.top, gb: g.bottom, vh: innerHeight }; }); if (fit.top < 0 || fit.gb > fit.vh + 1) fail(W, 'welcome ' + i + ' does not fit ' + JSON.stringify(fit));
        if (i === 3) { await tap(p, '.rm-chipq[data-q="work"][data-v="b"]'); await tap(p, '.rm-chipq[data-q="aff"][data-v="yes"]'); const pr = await p.$$eval('.rm-chipq[aria-pressed="true"]', e => e.length); if (pr !== 2) fail(W, 'chips pressed ' + pr); }
        if (i === 4) { await p.fill('.rm-ob [data-p="working"]', 'my 16 h gaps'); }
        if (i === 5) { const first = await p.evaluate(() => (document.querySelector('.rm-ob-card') || {}).dataset.ob); if (first !== 'aff') fail(W, 'affiliate yes did not put Affiliates first (' + first + ')'); }
        await tap(p, '.rm-ob-go'); await sleep(450);
      }
      const end = await p.evaluate(() => ({ gone: !document.querySelector('.rm-ob'), v: document.getElementById('cmPaneChat').getAttribute('data-rm-view'), prof: (JSON.parse(localStorage.getItem('lowi.cm.profile.v1') || '{}')).working, seen: !!localStorage.getItem('lowi.cm.welcome.v1') }));
      if (!end.gone || end.v !== 'aff' || end.prof !== 'my 16 h gaps' || !end.seen) fail(W, 'welcome end ' + JSON.stringify(end));
    } else fail(W, 'no welcome sheet');
  } catch (e) { fail(W, 'threw ' + String(e.message).split('\n')[0]); await R.shot(path.join(OUT, 'error-' + engine + '.png')); }
  const errs = R.errs.filter(e => !/supabase|realtime|websocket/i.test(e.m)); if (errs.length) fail(W, 'errors ' + errs.slice(0, 3).map(e => e.m).join(' | '));
  await R.close();
}
(async () => {
  const only = process.env.ONLY || '';
  const runs = [['webkit', 'iPhone SE'], ['webkit', 'iPhone 13'], ['webkit', 'iPad (gen 7)'], ['webkit', 'iPhone 13', true]];
  for (const r of runs) { if (only && !r.join(' ').includes(only)) continue; await run(...r); console.log('done', r.join(' ')); }
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ fails, notes }, null, 1));
  console.log(notes.join('\n')); console.log(fails.length ? fails.length + ' FAIL' : '0 FAIL'); process.exit(fails.length ? 1 : 0);
})();
