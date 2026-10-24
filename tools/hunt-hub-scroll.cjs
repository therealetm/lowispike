'use strict';
/* Bug hunt (companion): open Misty's card on the live site, scroll each control into view like a finger would, tap it,
   record what opened, then close it (X or Escape) and check the card is back and nothing is left behind.
   node tools/hunt-hub-scroll.cjs <device> [lang] [theme] [outdir] */
const H = require('./sim/harness.cjs'), fs = require('fs');
(async () => {
  const device = process.argv[2] || 'iPhone 13', lang = process.argv[3] || 'en', theme = process.argv[4] || 'dark', out = process.argv[5] || '/tmp/hunt-hub';
  fs.mkdirSync(out, { recursive: true });
  const R = await H.open({ device, engine: /Pixel/.test(device) ? 'chromium' : 'webkit', members: 10, messages: 20, probe: false, lang, url: 'https://therealetm.github.io/lowispike/index.html' });
  const P = R.page; const tag = device.replace(/\W/g, '') + '-' + lang + '-' + theme;
  await R.ctx.addInitScript(([t, l]) => { try { localStorage.setItem('lowi.theme', t); localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, [theme, lang]);
  await R.goto(); await H.sleep(5000);
  const build = await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content);
  const vis = () => P.evaluate(() => [...document.querySelectorAll('.r2-ov, [role=dialog], [id$="Ov"], .r2-sh, .cf-panel')].filter(e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05 && r.bottom > 0 && r.top < innerHeight; }).map(e => (e.id || String(e.className).slice(0, 30))));
  const res = { device, lang, theme, build, items: [] };
  const openHub = async () => { await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } try { goTab('home'); } catch (e) { } }); await H.sleep(900); await P.evaluate(() => LowiMistyHub.open()); await H.sleep(3200); };
  await openHub();
  const labels = await P.evaluate(() => { const sh = [...document.querySelectorAll('.r2-sh')].pop(); if (!sh) return []; return [...sh.querySelectorAll('button,[role=button],a[href]')].filter(b => b.getBoundingClientRect().width > 4).map((b, i) => { b.setAttribute('data-hh', i); return { i, l: (b.getAttribute('aria-label') || b.textContent || '').trim().slice(0, 60) }; }); });
  const shEl = await P.evaluate(() => { const sh = [...document.querySelectorAll('.r2-sh')].pop(); if (!sh) return null; let s = sh, sc = null; sh.querySelectorAll('*').forEach(e => { const c = getComputedStyle(e); if (!sc && /(auto|scroll)/.test(c.overflowY) && e.scrollHeight > e.clientHeight + 4) sc = e; }); const c = getComputedStyle(sh); return { h: sh.getBoundingClientRect().height, vh: innerHeight, scroller: sc ? (sc.className || sc.tagName) + ' ' + sc.scrollHeight + '/' + sc.clientHeight : (/(auto|scroll)/.test(c.overflowY) ? 'sheet ' + sh.scrollHeight + '/' + sh.clientHeight : 'none') }; });
  res.sheet = shEl; await P.screenshot({ path: out + '/' + tag + '-root.png' });
  for (const it of labels) {
    await openHub();
    await P.evaluate(() => { const sh = [...document.querySelectorAll('.r2-sh')].pop(); if (sh) [...sh.querySelectorAll('button,[role=button],a[href]')].filter(b => b.getBoundingClientRect().width > 4).forEach((b, i) => b.setAttribute('data-hh', i)); });
    const before = await vis();
    const pos = await P.evaluate(i => { const b = document.querySelector('[data-hh="' + i + '"]'); if (!b) return null; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const t = document.elementFromPoint(x, y); return { x, y, ok: !!t && (t === b || b.contains(t)), cov: t ? (t.id || String(t.className).slice(0, 30) || t.tagName) : 'nothing' }; }, it.i);
    await H.sleep(500);
    const row = { label: it.l, pos };
    if (pos && pos.y > 0 && pos.y < P.viewportSize().height) { await P.touchscreen.tap(pos.x, pos.y); await H.sleep(1700); row.after = await vis(); row.newly = row.after.filter(x => before.indexOf(x) < 0); row.hash = await P.evaluate(() => location.hash); }
    else row.unreachable = true;
    const sh = out + '/' + tag + '-' + it.i + '.png'; await P.screenshot({ path: sh }); row.shot = sh;
    for (let k = 0; k < 3; k++) { await P.keyboard.press('Escape').catch(() => { }); await H.sleep(300); }
    await H.sleep(900); row.left = await vis();
    res.items.push(row);
  }
  res.errs = R.errs; res.crashed = R.crashed;
  console.log(JSON.stringify(res, null, 1));
  await R.close().catch(() => { }); process.exit(0);
})().catch(e => { console.log('ERR', e && e.stack); process.exit(1); });
