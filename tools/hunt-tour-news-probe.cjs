'use strict';
/* Bug hunt 2026-10-24 09:02: the end of the tutorial ("New in this update" + its places). Start the tour on Home, press Next up to the
   new-intro step, then walk the news part and record at each step: the card, the sheet behind it, whether the card is on top and inside the screen.
   node tools/hunt-tour-news-probe.cjs <device> <lang> [url] */
const H = require('./sim/harness.cjs');
(async () => {
  const device = process.argv[2] || 'iPhone 15', lang = process.argv[3] || 'es', url = process.argv[4] || 'https://therealetm.github.io/lowispike/index.html';
  const R = await H.open({ device, engine: /Pixel/.test(device) ? 'chromium' : 'webkit', url, probe: false, lang, members: 5, messages: 5 });
  await R.ctx.addInitScript(l => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, lang);
  const P = R.page; await R.goto(); await H.sleep(7000); await P.touchscreen.tap(5, 830).catch(() => { }); await H.sleep(500);
  await P.evaluate(() => { try { LowiTutorial.stop && LowiTutorial.stop('x'); } catch (e) { } LowiTutorial.start({ from: 'hunt' }); }); await H.sleep(1500);
  const ids = await P.evaluate(() => LowiTutorial.ids()); const at = ids.indexOf('new-intro'); console.log('IDS', ids.length, 'new-intro at', at, JSON.stringify(ids.slice(at)));
  const st = () => P.evaluate(() => {
    const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > .05; };
    const c = [...document.querySelectorAll('.lt-card')].filter(vis).pop(); const r = c && c.getBoundingClientRect();
    let onTop = null; if (c) { const x = r.left + r.width / 2, y = r.top + Math.min(30, r.height / 2); const t = document.elementFromPoint(x, y); onTop = !!(t && c.contains(t)); if (!onTop) onTop = 'covered by ' + (t ? (t.id || String(t.className).slice(0, 40) || t.tagName) : 'none'); }
    const sheets = [...document.querySelectorAll('.ur-card, .r2-ov.on, #sheetwrap.open, .hs-sheet, [role=dialog]')].filter(vis).map(e => (e.id || String(e.className).slice(0, 30)) + ':' + (e.innerText || '').replace(/\s+/g, ' ').slice(0, 50));
    const btns = c ? [...c.querySelectorAll('button')].map(b => (b.dataset.lt || b.getAttribute('data-lt-act') || b.className.slice(0, 20)) + '=' + JSON.stringify(b.innerText.trim()) + (vis(b) ? '' : '(hidden)') + (b.disabled ? '(disabled)' : '')) : []; return { btns, step: LowiTutorial.step(), card: c && c.innerText.replace(/\s+/g, ' ').slice(0, 140), box: r && [Math.round(r.top), Math.round(r.bottom), innerHeight], onTop, sheets };
  });
  const nextBtn = () => P.evaluate(() => { const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }; const c = [...document.querySelectorAll('.lt-card')].filter(vis).pop(); if (!c) return ''; const b = c.querySelector('[data-lt=next]') || [...c.querySelectorAll('button')].filter(vis).pop(); if (!b) return ''; b.click(); return b.innerText.trim(); });
  for (let k = 0; k < at; k++) { await nextBtn(); await H.sleep(250); }
  await H.sleep(1500);
  for (let k = 0; k < 14; k++) {
    const s = await st(); console.log('NEWS', k, JSON.stringify(s));
    await R.shot('/tmp/hunt0902/news-' + device.replace(/\W/g, '') + '-' + lang + '-' + k + '.png');
    if (!s.step) break;
    const b = await nextBtn(); console.log('  pressed', b); await H.sleep(2200);
  }
  console.log('END', JSON.stringify(await st()), 'ERRS', JSON.stringify(R.errs.slice(0, 4).map(e => e.m.slice(0, 140))));
  await R.close().catch(() => { }); process.exit(0);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
