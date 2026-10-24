'use strict';
/* Bug hunt probe (galaxy chat, live site): tap a person's avatar in Chat, then check the person card that opens:
   its box, whether it scrolls, and whether each button can be reached by a finger (after scrolling it into view),
   and what covers it if not. node tools/hunt-chat-profile-reach-1902.cjs <device> [url|root] [lang] [engine] */
const H = require('./sim/harness.cjs');
(async () => {
  const device = process.argv[2] || 'iPhone SE', where = process.argv[3] || 'https://therealetm.github.io/lowispike/index.html', lang = process.argv[4] || 'en', engine = process.argv[5] || 'webkit';
  const o = { device, engine, members: 20, messages: 60, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page, tag = '/home/sprite/hunt-1902/preach-' + device.replace(/\W/g, '') + '-' + lang;
  await R.ctx.addInitScript(([l]) => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, [lang]);
  await R.goto(); await H.sleep(5000);
  const log = (k, v) => console.log('STEP', k, typeof v === 'string' ? v : JSON.stringify(v));
  log('build', await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content));
  log('viewport', await P.evaluate(() => [innerWidth, innerHeight]));
  await P.evaluate(() => goTab('foryou')); await H.sleep(900);
  await R.tap('#cmPaneChat .rm-tab[data-rm="chat"]'); await H.sleep(1800);
  const av = await P.evaluate(() => { const a = [...document.querySelectorAll('#cmList .cm-msg:not(.mine) button[data-chat="profile"].cs-avatar')].filter(e => { const r = e.getBoundingClientRect(); return r.top > 120 && r.bottom < innerHeight - 140; }).pop(); if (!a) return null; const r = a.getBoundingClientRect(); return { name: a.dataset.name, x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  log('avatar', av);
  await P.touchscreen.tap(av.x, av.y); await H.sleep(1500);
  const info = async () => P.evaluate(() => {
    const card = [...document.querySelectorAll('.cp-card')].filter(e => e.getBoundingClientRect().height > 10).pop(); if (!card) return null;
    let sc = card, scr = null; while (sc && sc !== document.body) { const s = getComputedStyle(sc); if (/(auto|scroll)/.test(s.overflowY) && sc.scrollHeight > sc.clientHeight + 2) { scr = sc; break; } sc = sc.parentElement; }
    let ov = card; while (ov && !(ov.classList && (ov.classList.contains('r2-ov') || ov.getAttribute('role') === 'dialog'))) ov = ov.parentElement;
    const z = e => { let z = []; while (e && e !== document.documentElement) { const s = getComputedStyle(e); if (s.zIndex !== 'auto') z.push((e.id || e.className.toString().slice(0, 20)) + ':' + s.zIndex); e = e.parentElement; } return z.slice(0, 4).join(' < '); };
    const r = card.getBoundingClientRect();
    const btns = [...card.querySelectorAll('button')].map(b => { const q = b.getBoundingClientRect(), x = q.left + q.width / 2, y = q.top + q.height / 2; const h = (y >= 0 && y < innerHeight && x >= 0 && x < innerWidth) ? document.elementFromPoint(x, y) : null; return { t: (b.getAttribute('aria-label') || b.textContent).trim().slice(0, 30), y: Math.round(q.top), b: Math.round(q.bottom), ok: !!h && (h === b || b.contains(h)), by: h && !(h === b || b.contains(h)) ? (h.id || h.tagName + '.' + h.className.toString().slice(0, 30)) + ' z ' + z(h) : null }; });
    return { card: [Math.round(r.top), Math.round(r.bottom)], ov: ov ? (ov.id || ov.className.toString().slice(0, 40)) + ' z ' + z(ov) : null, scroller: scr ? (scr.id || scr.className.toString().slice(0, 30)) + ' ' + scr.scrollTop + '/' + (scr.scrollHeight - scr.clientHeight) : null, btns, composer: (() => { const c = document.getElementById('cmMic'); if (!c) return null; const q = c.getBoundingClientRect(); return { y: Math.round(q.top), vis: q.height > 0, z: z(c) }; })() };
  });
  log('card', await info()); await R.shot(tag + '-1.png');
  /* scroll the card to its end like a finger would */
  await P.evaluate(() => { const card = [...document.querySelectorAll('.cp-card')].filter(e => e.getBoundingClientRect().height > 10).pop(); if (!card) return; let sc = card; while (sc && sc !== document.body) { const s = getComputedStyle(sc); if (/(auto|scroll)/.test(s.overflowY) && sc.scrollHeight > sc.clientHeight + 2) { sc.scrollTop = 1e5; break; } sc = sc.parentElement; } });
  await H.sleep(800);
  log('card scrolled', await info()); await R.shot(tag + '-2.png');
  log('errs', R.errs); log('crashed', R.crashed); log('loads', R.loads);
  await R.close();
})().catch(e => { console.error('BROKEN', e && e.stack || e); process.exit(2); });
