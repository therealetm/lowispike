'use strict';
/* Community chat: tapping a message (a photo post above all) must not flicker (28 Oct 2026, Emmanuel: "wenn jemand ein Bild
   schickt und man drückt auf deren Chat Bubble, dann flackert alles ... Dann drückst du auf reagieren, dann flackert das wieder.
   Und dann haben wir da unten komische Emojis").
   Opens the room with the fake cloud, picks a photo message, tags its live nodes (row, bubble, image, avatar), then:
   tap the bubble -> menu, tap an emoji -> reaction chip. After each step: same nodes still in the page, the list did not
   lose or replace rows, the scroll position held, no JS errors; the reaction bar shows plain emoji text (no icon swap),
   five different ones. Also measures the menu against the screen edges.
   node tools/check-chat-actions.cjs [device|WxH] [root|url] [lang] [engine] [shotsDir] */
const H = require('./sim/harness.cjs');
const SLOW = process.argv[5] === 'webkit' ? 2 : 1;
(async () => {
  const devArg = process.argv[2] || 'iPhone 13', where = process.argv[3] || require('path').join(__dirname, '..'), lang = process.argv[4] || 'de', engine = process.argv[5] || 'webkit', shots = process.argv[6] || '';
  const wh = /^(\d+)x(\d+)$/.exec(devArg);
  const o = { device: wh ? 'iPhone 13' : devArg, engine, members: 20, messages: 60, probe: false, lang, photoShare: .5 };
  if (wh) o.viewport = { width: +wh[1], height: +wh[2] };
  if (/^https?:/.test(where)) o.url = where; else o.root = where;
  if (wh && engine === 'webkit') process.env.SIM_WK_VIEWPORT = '1';
  const R = await H.open(o), P = R.page;
  await R.ctx.addInitScript(([l]) => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, [lang]);
  await R.goto(); await H.sleep(4500);
  await P.evaluate(l => { try { window.LowiLang && LowiLang.set && LowiLang.set(l); } catch (e) { } const g = document.getElementById('r2gate'); if (g) g.remove(); try { LowiTutorial && LowiTutorial.stop && LowiTutorial.stop(); } catch (e) { } }, lang); await H.sleep(600);
  const out = { device: devArg, engine, lang, ok: true, fails: [] };
  const fail = (m) => { out.ok = false; out.fails.push(m); };
  out.build = await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content);
  await P.evaluate(() => goTab('foryou')); await H.sleep(900);
  await R.tap('#cmPaneChat .rm-tab[data-rm="chat"]').catch(() => {}); await H.sleep(2200);
  /* a photo message from someone else, fully on screen; scroll it into the middle first */
  const target = await P.evaluate(() => {
    const l = document.getElementById('cmList'); if (!l) return null;
    const all = [...l.querySelectorAll('.cm-msg:not(.mine)')].filter(e => e.querySelector('.cm-bub img'));
    const m = all[Math.max(0, all.length - 3)]; if (!m) return null;
    try { l.dispatchEvent(new WheelEvent('wheel', { deltaY: -40, bubbles: true })); } catch (e) { }
    m.scrollIntoView({ block: 'center' });
    return m.id;
  });
  if (target) {
    for (let k = 0; k < 4; k++) {
      await H.sleep(500 * SLOW);
      const d = await P.evaluate((id) => { const l = document.getElementById('cmList'), m = document.getElementById(id), r = m.getBoundingClientRect(), lr = l.getBoundingClientRect(); return { dy: Math.round((r.top + r.height / 2) - (lr.top + lr.height / 2)), x: lr.left + lr.width / 2, y: lr.top + lr.height / 2, ok: r.top > lr.top + 20 && r.bottom < lr.bottom - 20 }; }, target);
      out.scr = out.scr || []; out.scr.push(await P.evaluate(() => { const l = document.getElementById("cmList"); return [l.scrollTop, l.scrollHeight, l.clientHeight, getComputedStyle(l).overflowY, document.documentElement.className.includes("cx-open")]; }));
      if (d.ok) break;
      await P.evaluate((dy) => { const l = document.getElementById('cmList'); try { l.dispatchEvent(new WheelEvent('wheel', { deltaY: dy, bubbles: true })); } catch (e) { } l.scrollTop += dy; }, d.dy);
    }
    await H.sleep(700 * SLOW);
  }
  if (!target) { fail('no photo message in the room'); console.log(JSON.stringify(out)); await R.close(); process.exit(1); }
  await H.sleep(900);
  /* tag live nodes and start counting what the list loses */
  await P.evaluate((id) => {
    const a = document.getElementById(id), l = document.getElementById('cmList');
    window.__ca = { a, bub: a.querySelector('.cm-bub'), img: a.querySelector('.cm-bub img'), av: a.querySelector('.cp-av svg, .cs-avatar svg, .cp-av'), removed: 0, added: 0, rowsOut: 0, imgsOut: 0, top: l.scrollTop, tops: [] };
    new MutationObserver(ms => { for (const m of ms) { window.__ca.removed += m.removedNodes.length; window.__ca.added += m.addedNodes.length; for (const n of m.removedNodes) { if (n.nodeType === 1 && (n.matches('.cm-msg') || n.querySelector && n.querySelector('.cm-msg'))) window.__ca.rowsOut++; if (n.nodeType === 1 && (n.tagName === 'IMG' || n.querySelector && n.querySelector('img'))) window.__ca.imgsOut++; } } }).observe(l, { childList: true, subtree: true });
    const tick = () => { if (!window.__ca) return; window.__ca.tops.push(l.scrollTop); if (window.__ca.tops.length < 400) requestAnimationFrame(tick); }; requestAnimationFrame(tick);
  }, target);
  const check = async (step) => {
    const s = await P.evaluate(() => { const c = window.__ca, l = document.getElementById('cmList'); return { rowKept: c.a.isConnected, bubKept: c.bub.isConnected, imgKept: c.img.isConnected, avKept: !c.av || c.av.isConnected, rowsOut: c.rowsOut, imgsOut: c.imgsOut, top: l.scrollTop, startTop: c.top, maxJump: Math.max(0, ...c.tops.map(t => Math.abs(t - c.top))), sideScroll: document.documentElement.scrollWidth > innerWidth + 1 }; });
    out[step] = s;
    if (!s.rowKept || !s.bubKept) fail(step + ': message row was replaced');
    if (!s.imgKept || s.imgsOut) fail(step + ': photo was replaced/reloaded');
    if (!s.avKept) fail(step + ': avatar was redrawn');
    if (s.rowsOut) fail(step + ': ' + s.rowsOut + ' rows left the list');
    if (s.maxJump > 1) fail(step + ': scroll moved ' + s.maxJump + ' px');
    if (s.sideScroll) fail(step + ': sideways scroll');
  };
  /* 1. tap the bubble, away from the photo and buttons */
  /* a point on the bubble itself, at least 16 px from anything tappable inside it (phones snap a tap to a nearby button) */
  const findPt = () => P.evaluate((id) => { const b = document.querySelector('#' + id + ' .cm-bub'), r = b.getBoundingClientRect(); const hot = [...b.querySelectorAll('button,a,img,[data-chat],video')].map(e => e.getBoundingClientRect()).filter(q => q.width > 2 && q.height > 2); const far = (x, y) => hot.every(q => { const dx = Math.max(q.left - x, 0, x - q.right), dy = Math.max(q.top - y, 0, y - q.bottom); return Math.hypot(dx, dy) >= 16; }); for (let y = r.top + 6; y < r.bottom - 4; y += 4) for (let x = r.left + 8; x < r.right - 6; x += 6) { if (y < 70 || y > innerHeight - 90) continue; const e = document.elementFromPoint(x, y); if (e && e.closest('[data-chat-bub]') === b && !e.closest('[data-chat],img,a,button') && far(x, y)) return { x: Math.round(x), y: Math.round(y) }; } return { x: Math.round(r.left + 20), y: Math.round(r.bottom - 14) }; }, target);
  const pt = await findPt();
  out.pt = pt; out.hit = await P.evaluate(p => { const e = document.elementFromPoint(p.x, p.y); return e && (e.className && e.className.baseVal !== undefined ? e.tagName : e.className); }, pt);
  await P.touchscreen.tap(pt.x, pt.y); await H.sleep(900 * SLOW);
  await check('afterTap');
  const menu = await P.evaluate(() => {
    const m = document.querySelector('.cx-menu.on'); const vw = innerWidth, vh = innerHeight;
    if (!m) { const acts = [...document.querySelectorAll('#cmList .cp-acts button')].map(b => b.textContent.trim()); return { modern: false, acts }; }
    const box = e => { const r = e.getBoundingClientRect(); return { l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) }; };
    const bar = m.querySelector('.cx-bar'), list = m.querySelector('.cx-list');
    const emo = [...m.querySelectorAll('.cx-bar [data-emoji]')].map(b => ({ key: b.dataset.emoji, text: b.textContent.trim(), icon: !!b.querySelector('svg,.sp-symbol,.sp-ui-copy'), h: b.getBoundingClientRect().height }));
    const items = [...m.querySelectorAll('.cx-list button')].map(b => ({ t: b.textContent.trim(), lines: Math.round(b.getBoundingClientRect().height / parseFloat(getComputedStyle(b).lineHeight || 20)), w: Math.round(b.scrollWidth), cw: Math.round(b.clientWidth), h: Math.round(b.getBoundingClientRect().height) }));
    const inView = e => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.top >= 0 && r.right <= vw + .5 && r.bottom <= vh + .5; };
    return { modern: true, bar: bar && box(bar), list: list && box(list), barIn: bar && inView(bar), listIn: list && inView(list), emo, items, focus: document.activeElement && document.activeElement.className };
  });
  out.menu = menu;
  if (!menu.modern) fail('no floating menu (old inline buttons: ' + (menu.acts || []).join(' | ') + ')');
  else {
    if (!menu.barIn || !menu.listIn) fail('menu not fully on screen');
    const texts = menu.emo.map(e => e.text);
    if (menu.emo.length < 5) fail('fewer than 5 emojis');
    if (new Set(texts).size !== texts.length) fail('duplicate emojis ' + texts.join(' '));
    if (menu.emo.some(e => e.icon)) fail('emoji swapped for an icon');
    if (menu.items.some(i => i.w > i.cw + 1)) fail('menu text cut off');
    if (menu.items.some(i => i.h < 43)) fail('menu row under 44 px');
    if (menu.emo.some(e => e.h < 43)) fail('emoji button under 44 px');
    const ov = (a, b) => a && b && !(a.r <= b.l || b.r <= a.l || a.b <= b.t || b.b <= a.t);
    if (ov(menu.bar, menu.list)) fail('emoji bar overlaps the list');
  }
  if (shots) { await R.shot(require('path').join(shots, `menu-${devArg}-${lang}-${engine}.png`)).catch(() => {}); }
  /* 2. react: modern = tap an emoji in the bar; old = tap Reagieren, then an emoji */
  if (menu.modern) {
    const key = menu.emo[2] && menu.emo[2].key;
    const b = await P.evaluate((k) => { const e = [...document.querySelectorAll('.cx-menu.on .cx-bar [data-emoji]')].find(x => x.dataset.emoji === k); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, key);
    await P.touchscreen.tap(b.x, b.y); await H.sleep(1200 * SLOW);
    await check('afterReact');
    const chip = await P.evaluate((id) => { const c = [...document.querySelectorAll('#' + id + ' .cm-rx .cm-chip')]; return { n: c.length, texts: c.map(x => x.textContent.trim()), icon: c.some(x => x.querySelector('svg,.sp-symbol,.sp-ui-copy')), menuOpen: !!document.querySelector('.cx-menu.on') }; }, target);
    out.chip = chip;
    if (!chip.n) fail('no reaction chip after react');
    if (chip.icon) fail('reaction chip shows an icon, not the emoji');
    if (chip.menuOpen) fail('menu still open after react');
    /* 3. keyboard: the visually hidden ··· button opens the menu with Enter, focus goes in, Escape closes and hands focus back */
    await P.evaluate((id) => { const e = document.querySelector('#' + id + ' .cp-more'); if (e) e.focus(); }, target);
    await P.keyboard.press('Enter'); await H.sleep(700 * SLOW);
    out.kbd = await P.evaluate(() => ({ open: !!document.querySelector('.cx-menu.on'), focusIn: !!(document.activeElement && document.activeElement.closest && document.activeElement.closest('.cx-menu')), expanded: (document.querySelector('.cp-more[aria-expanded="true"]') || {}).tagName || '' }));
    if (!out.kbd.open || !out.kbd.focusIn) fail('keyboard: ··· did not open the menu with focus inside');
    await P.keyboard.press('Escape'); await H.sleep(600 * SLOW);
    out.kbdClose = await P.evaluate(() => ({ closed: !document.querySelector('.cx-menu.on'), focusBack: !!(document.activeElement && document.activeElement.classList.contains('cp-more')) }));
    if (!out.kbdClose.closed || !out.kbdClose.focusBack) fail('keyboard: Escape did not close / return focus');
    /* 4. tap the bubble again, then tap the dim area: closes, nothing moved */
    const pt2 = await findPt(); out.pt2 = pt2; await P.evaluate(() => { window.__clk2 = []; document.addEventListener('click', e => window.__clk2.push(String(e.target.className && e.target.className.baseVal !== undefined ? e.target.tagName : e.target.className)), true); }); await P.touchscreen.tap(pt2.x, pt2.y); await H.sleep(900 * SLOW); out.clk2 = await P.evaluate(() => [window.__clk2, document.querySelector('.cx-menu') && document.querySelector('.cx-menu').className, document.activeElement && document.activeElement.className]);
    const free = await P.evaluate(() => { const m = document.querySelector('.cx-menu.on'); if (!m) return null; const boxes = [...m.querySelectorAll('.cx-bar,.cx-list,.cx-spot')].map(e => e.getBoundingClientRect()); for (let y = 60; y < innerHeight - 20; y += 20) for (const x of [12, innerWidth - 12, innerWidth / 2]) if (!boxes.some(r => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom)) return { x, y }; return null; });
    if (!free) fail('bubble tap did not reopen the menu'); else { await P.touchscreen.tap(free.x, free.y); await H.sleep(700 * SLOW); out.closed = await P.evaluate(() => !document.querySelector('.cx-menu.on')); if (!out.closed) fail('tap outside did not close'); }
    await check('afterReopen');
  } else {
    const b = await P.evaluate((id) => { const e = document.querySelector('#' + id + ' [data-chat="pick"]'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, target);
    if (b) { await P.touchscreen.tap(b.x, b.y); await H.sleep(900); await check('afterPick'); out.picker = await P.evaluate(() => [...document.querySelectorAll('#cmList .cm-picker button')].map(x => ({ t: x.textContent.trim(), icon: !!x.querySelector('svg') }))); }
  }
  out.errs = R.errs; if (R.errs.length) fail('JS errors');
  console.log(JSON.stringify(out));
  await R.close();
  process.exit(out.ok ? 0 : 1);
})().catch(e => { console.error('BROKEN', e && e.stack || e); process.exit(2); });
