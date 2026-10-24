'use strict';
/* Bug hunt probe (Community For You + Studio, live site): open each pane by finger, list its reachable buttons, then tap each
   one from a clean pane and report what changed (sheet opened, text changed, toast) or 'dead', with errors.
   node tools/hunt-fy-studio-1902.cjs <device> [url|root] [lang] [theme] [engine] */
const H = require('./sim/harness.cjs');
(async () => {
  const device = process.argv[2] || 'Pixel 7', where = process.argv[3] || 'https://therealetm.github.io/lowispike/index.html', lang = process.argv[4] || 'en', theme = process.argv[5] || 'dark', engine = process.argv[6] || 'chromium';
  const o = { device, engine, members: 20, messages: 60, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page, tag = '/home/sprite/hunt-1902/fys-' + device.replace(/\W/g, '') + '-' + lang;
  await R.ctx.addInitScript(([t, l]) => { try { localStorage.setItem('lowi.theme', t); localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, [theme, lang]);
  await R.goto(); await H.sleep(5000);
  const log = (k, v) => console.log('STEP', k, typeof v === 'string' ? v : JSON.stringify(v));
  log('build', await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content));
  const sig = () => P.evaluate(() => { const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < innerHeight && s.visibility !== 'hidden' && +s.opacity > .05; }; const ov = [...document.querySelectorAll('.r2-ov.on, [role=dialog], .sheet.on, iframe, #sheet.r3f-sheet, #sheet.on, #sheet.open')].filter(vis).map(e => e.id || e.className.toString().slice(0, 30)); const txt = (document.querySelector('#tab-foryou') || document.body).innerText.length; return { ov, txt, url: location.hash, toast: [...document.querySelectorAll('.toast, [role=status], [role=alert]')].filter(vis).map(e => e.textContent.trim().slice(0, 60)).filter(Boolean) }; });
  const open = async (pane) => { for (let i = 0; i < 3; i++) { await P.keyboard.press('Escape').catch(() => { }); await H.sleep(150); } await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } try { goTab('foryou'); } catch (e) { } }); await H.sleep(800); await R.tap('#cmPaneChat .rm-tab[data-rm="' + pane + '"]'); await H.sleep(1600); };
  for (const pane of ['fy', 'studio']) {
    await open(pane);
    const btns = await P.evaluate(() => { const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 2 && r.height > 2 && r.bottom > 60 && r.top < innerHeight && s.visibility !== 'hidden' && +s.opacity > .05; }; return [...document.querySelectorAll('#tab-foryou button, #tab-foryou a[href], #tab-foryou [role=button]')].filter(vis).filter(b => !b.closest('.rm-bar')).map((b, i) => { b.setAttribute('data-hunt', 'b' + i); const r = b.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, h = document.elementFromPoint(x, y); return { k: 'b' + i, t: (b.getAttribute('aria-label') || b.textContent).trim().replace(/\s+/g, ' ').slice(0, 40), reach: !!h && (h === b || b.contains(h)), by: h && !(h === b || b.contains(h)) ? (h.id || h.className.toString().slice(0, 30)) : null }; }).slice(0, 18); });
    log(pane + ' buttons', btns); await R.shot(tag + '-' + pane + '.png');
    for (const b of btns) {
      if (!b.reach || /photo|Foto|voice|Sprach|grab|Aufnahme/i.test(b.t)) continue;
      await open(pane);
      const want = await P.evaluate((t) => { const vis = e => { const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2 && r.bottom > 60 && r.top < innerHeight; }; const c = [...document.querySelectorAll('#tab-foryou button, #tab-foryou a[href], #tab-foryou [role=button]')].filter(vis).filter(x => !x.closest('.rm-bar')).find(x => (x.getAttribute('aria-label') || x.textContent).trim().replace(/\s+/g, ' ').slice(0, 40) === t); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, b.t);
      if (!want) { log('gone', b.t); continue; }
      const s0 = await sig(), e0 = R.errs.length, l0 = R.loads;
      await P.touchscreen.tap(want.x, want.y); await H.sleep(1500);
      const s1 = await sig();
      const changed = JSON.stringify(s0) !== JSON.stringify(s1);
      log('tap ' + pane + ' > ' + b.t, { changed, ov: s1.ov, toast: s1.toast, txt: s0.txt + '->' + s1.txt, errs: R.errs.slice(e0), reload: R.loads > l0 });
      if (!changed) await R.shot(tag + '-dead-' + b.k + '.png');
    }
  }
  log('errs', R.errs); log('crashed', R.crashed); log('loads', R.loads);
  await R.close();
})().catch(e => { console.error('BROKEN', e && e.stack || e); process.exit(2); });
