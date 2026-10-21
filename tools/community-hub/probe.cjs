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
async function tap(p, sel) { await sleep(350); const b = await p.locator(sel).first().boundingBox(); if (!b) throw new Error('no box for ' + sel); const hit = await p.evaluate(([x, y, s]) => { const e = document.elementFromPoint(x, y); return !!(e && e.closest(s)); }, [b.x + b.width / 2, b.y + b.height / 2, sel]); if (!hit) throw new Error('centre of ' + sel + ' is covered'); await p.mouse.click(b.x + b.width / 2, b.y + b.height / 2); }
async function scan(p, W, label, sel) { const c = await p.evaluate(contrastScan, sel); notes.push(W + ' ' + label + ' texts ' + c.n); if (c.bad.length) fail(W, label + ' low contrast: ' + c.bad.slice(0, 6).join(' | ')); }
async function frameScan(p, W, view) { let f = null; for (let i = 0; i < 40 && !f; i++) { f = p.frames().find(x => x.url().includes(view === 'aff' ? '/affiliates/' : '/create/')); if (!f) await sleep(250); } if (!f) { fail(W, 'no frame ' + view); return; } await f.waitForSelector(view === 'aff' ? '#checkCard h2' : 'h1', { timeout: 15000 }); const c = await f.evaluate(contrastScan, 'body'); notes.push(W + ' frame ' + view + ' texts ' + c.n); if (c.bad.length) fail(W, 'frame ' + view + ' low contrast: ' + c.bad.slice(0, 6).join(' | ')); const cs = await f.evaluate(() => getComputedStyle(document.documentElement).colorScheme); if (!/dark/.test(cs)) fail(W, 'frame ' + view + ' colour scheme is ' + cs + ' (an iframe whose scheme differs from the app gets an opaque WHITE canvas)'); }

async function run(engine, device, light) {
  const W = engine + '/' + device + (light ? '/day' : '');
  const R = await H.open({ engine, device, probe: false, url: URL_ });
  const p = R.page;
  try {
    await R.goto(); if (light) await p.evaluate(() => { document.documentElement.classList.add('light'); });
    await N.openCommunity(R); await sleep(1200);
    if (!(await p.$('.rm-bar'))) throw new Error('no community bar');
    const tag = device.replace(/\W+/g, '-').toLowerCase() + (light ? '-day' : '');
    await R.shot(path.join(OUT, tag + '-1-galaxy.png'));
    const ov = await p.evaluate(overlaps); if (ov.length) fail(W, 'overlaps ' + ov.join(', '));
    const o = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: document.documentElement.clientWidth })); if (o.sw > o.w + 1) fail(W, 'sideways overflow ' + JSON.stringify(o));
    await scan(p, W, 'header', '.rm-bar');
    for (const t of ['chat', 'create', 'aff', 'room']) {
      await tap(p, '.rm-tab[data-rm="' + t + '"]'); await sleep(900);
      const sel = await p.evaluate(() => (document.querySelector('.rm-tab[aria-selected="true"]') || {}).dataset.rm); if (sel !== t) fail(W, 'tab ' + t + ' not selected (got ' + sel + ')');
      await scan(p, W, 'header on ' + t, '.rm-bar');
      if (t === 'create' || t === 'aff') { await frameScan(p, W, t); await sleep(500); await R.shot(path.join(OUT, tag + '-' + t + '.png')); }
      if (t === 'chat') {
        const cv = await p.evaluate(() => document.getElementById('cmPaneChat').getAttribute('data-rm-view')); if (cv !== 'chans') fail(W, 'Chat tab did not open the channel list (' + cv + ')');
        await scan(p, W, 'channels', '.rm-chans'); await R.shot(path.join(OUT, tag + '-chat.png'));
        const rows = await p.$$eval('.rm-ch', e => e.map(x => x.dataset.ch + ':' + x.querySelector('.rm-ch-p').textContent.slice(0, 40))); notes.push(W + ' channels ' + rows.join(' | '));
        await tap(p, '.rm-ch[data-ch="galaxy"]'); await sleep(900);
        const th = await p.evaluate(() => ({ open: !!document.querySelector('#cgThread[data-open]'), crumb: !document.querySelector('.rm-crumb').hidden, sel: (document.querySelector('.rm-tab[aria-selected="true"]') || {}).dataset.rm }));
        if (!th.open || !th.crumb || th.sel !== 'chat') fail(W, 'Galaxy chat channel did not open its thread ' + JSON.stringify(th));
        await scan(p, W, 'thread crumb', '.rm-crumb'); await R.shot(path.join(OUT, tag + '-thread.png'));
        const ov2 = await p.evaluate(overlaps); if (ov2.length) fail(W, 'thread overlaps ' + ov2.join(', '));
        await tap(p, '.rm-back'); await sleep(700);
        const bk = await p.evaluate(() => ({ v: document.getElementById('cmPaneChat').getAttribute('data-rm-view'), open: !!document.querySelector('#cgThread[data-open]') })); if (bk.v !== 'chans' || bk.open) fail(W, 'back to channels ' + JSON.stringify(bk));
      }
    }
    if (await p.$('.rm-menu-btn')) { await tap(p, '.rm-menu-btn'); await sleep(500); await scan(p, W, 'menu', '.rm-menu'); await R.shot(path.join(OUT, tag + '-menu.png')); const items = await p.$$eval('.rm-menu [data-rmm]', e => e.map(x => x.dataset.rmm)); notes.push(W + ' menu ' + items.join(',')); await p.keyboard.press('Escape'); await sleep(300); if (await p.$('.rm-menu:not([hidden])')) fail(W, 'menu did not close on Escape'); }
    if (await p.$('.rm-ob')) { await scan(p, W, 'onboarding', '.rm-ob'); }
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
