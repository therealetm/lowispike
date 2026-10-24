'use strict';
/* Code error sweep probe (galaxy chat, live site): tap a name in the chat, wait for the profile card, then check whether the
   Block button can be reached: is it on screen, and if not, does its sheet scroll (overflow + scrollHeight) so a finger
   swipe brings it into reach. Scrolls with the wheel and re-checks the hit test.
   node tools/sweep-profile-block-probe.cjs <device> [url|root] [lang] [theme] */
const H = require('./sim/harness.cjs');
(async () => {
  const device = process.argv[2] || 'Pixel 7', where = process.argv[3] || 'https://therealetm.github.io/lowispike/index.html', lang = process.argv[4] || 'de', theme = process.argv[5] || 'dark';
  const o = { device, engine: 'webkit', members: 20, messages: 60, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page;
  await R.ctx.addInitScript(([t, l]) => { try { localStorage.setItem('lowi.theme', t); localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, [theme, lang]);
  await R.goto(); await H.sleep(5000);
  await P.evaluate(() => goTab('foryou')); await H.sleep(900);
  await R.tap('#cmPaneChat .rm-tab[data-rm="chat"]'); await H.sleep(1800);
  const log = (k, v) => console.log('STEP', k, typeof v === 'string' ? v : JSON.stringify(v));
  const names = await P.evaluate(() => [...document.querySelectorAll('#cmList [data-chat="profile"]')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 2 && r.top > 120 && r.bottom < innerHeight - 140; }).map(e => e.dataset.name || e.textContent.trim()).filter((v, i, a) => a.indexOf(v) === i).slice(-3));
  log('names', names);
  const state = () => P.evaluate(() => {
    const b = [...document.querySelectorAll('button[data-chat="block"],[data-chat="block"]')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2; }).pop();
    if (!b) return { found: false };
    const r = b.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const t = y < innerHeight && y > 0 ? document.elementFromPoint(x, y) : null;
    let sc = null; for (let e = b.parentElement; e; e = e.parentElement) { const s = getComputedStyle(e); if (/(auto|scroll)/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 1) { sc = e; break; } }
    return { found: true, vh: innerHeight, y: Math.round(r.top) + '..' + Math.round(r.bottom), hit: !!(t && (t === b || b.contains(t))), scroller: sc ? (sc.id || String(sc.className).slice(0, 40)) : '', room: sc ? sc.scrollHeight - sc.clientHeight - Math.round(sc.scrollTop) : 0 };
  });
  for (const n of names) {
    const loc = P.locator('#cmList [data-chat="profile"][data-name="' + n + '"]').last();
    if (!await loc.count()) { log(n, 'no element'); continue; }
    await R.tapEl(loc); await H.sleep(2500);
    const before = await state(); log('before ' + n, before);
    if (before.found && !before.hit) {
      /* mobile WebKit has no wheel: scroll the sheet the way a swipe would, after checking nothing blocks touch scrolling */
      log('touch ' + n, await P.evaluate(() => { const b = [...document.querySelectorAll('[data-chat="block"]')].pop(); let sc = null; for (let e = b.parentElement; e; e = e.parentElement) { const s = getComputedStyle(e); if (/(auto|scroll)/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 1) { sc = e; break; } } const out = []; for (let e = sc; e; e = e.parentElement) { const ta = getComputedStyle(e).touchAction; if (ta && ta !== 'auto') out.push((e.id || e.tagName) + ':' + ta); } if (sc) sc.scrollTop = sc.scrollHeight; return out; }));
      await H.sleep(800); log('after scroll ' + n, await state());
    }
    for (let i = 0; i < 2; i++) { await P.keyboard.press('Escape').catch(() => { }); await H.sleep(500); }
    await H.sleep(1200);
  }
  log('errs', R.errs); log('crashed', R.crashed);
  await R.close();
})().catch(e => { console.error('BROKEN', e && e.stack || e); process.exit(2); });
