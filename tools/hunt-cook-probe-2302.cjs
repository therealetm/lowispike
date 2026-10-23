'use strict';
/* Bug hunt 23 Oct 23:02: hands-on Cook tab probe. Lists tappable buttons on Cook, shuffles by a real tap, then taps
   Cook it / Shop it on the pick and lists what is on screen after each, with back between.
   node tools/hunt-cook-probe-2302.cjs <device> [url|root] [lang] [theme] [outprefix] */
const H = require('./sim/harness.cjs');
(async () => {
  const device = process.argv[2] || 'iPhone 13', where = process.argv[3] || 'https://therealetm.github.io/lowispike/index.html';
  const lang = process.argv[4] || 'en', theme = process.argv[5] || 'dark', out = process.argv[6] || '/tmp/h2302/probe';
  const o = { device, engine: 'webkit', members: 10, messages: 20, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page, tag = out + '-' + device.replace(/\W/g, '') + '-' + lang;
  await R.ctx.addInitScript(([t, l]) => { try { localStorage.setItem('lowi.theme', t); localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, [theme, lang]);
  await R.goto(); await H.sleep(5000);
  for (let i = 0; i < 3; i++) { await P.keyboard.press('Escape').catch(() => { }); await H.sleep(150); }
  const build = await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || null);
  console.log('build', build);
  const sheets = () => P.evaluate(() => [...document.querySelectorAll('.r2-ov.on, [role=dialog], .cs-ov.on, .lc-ov.on, #sheetwrap.open')].filter(e => { const r = e.getBoundingClientRect(); return r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; }).map(e => (e.id || String(e.className).split(' ').slice(0, 3).join('.'))));
  const dump = async (lbl) => { const v = await R.vis(); console.log('--', lbl, 'sheets', JSON.stringify(await sheets()), 'errs', R.errs.length); v.forEach(x => console.log('   ', x)); await R.shot(tag + '-' + lbl.replace(/\W+/g, '_') + '.png'); };
  await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } goTab('shelf'); }); await H.sleep(1500);
  await dump('cook tab');
  const go = P.locator('#r5Go'); console.log('r5Go', JSON.stringify(await go.evaluate(e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, sy: (document.scrollingElement || {}).scrollTop }; }).catch(e => String(e.message))));
  await go.evaluate(e => e.scrollIntoView({ block: 'center' })).catch(() => { }); await H.sleep(600);
  await dump('cook scrolled to shuffle');
  await R.tap('#r5Go').catch(e => console.log('tap fail', e.message)); await H.sleep(4500);
  await dump('after shuffle');
  for (const sel of ['#r5Cook', '#r5Shop']) {
    const info = await P.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { r: [r.x, r.y, r.width, r.height].map(Math.round), top: t ? (t.id || t.className || t.tagName) + '' : null, disp: getComputedStyle(e).display, parentDisp: e.parentElement && getComputedStyle(e.parentElement).display, txt: e.textContent.trim() }; }, sel);
    console.log(sel, JSON.stringify(info));
    if (!info || !info.r[2]) continue;
    await P.locator(sel).evaluate(e => e.scrollIntoView({ block: 'center' })); await H.sleep(500);
    await R.tap(sel).catch(e => console.log('tap fail', e.message)); await H.sleep(2000);
    await dump('after ' + sel);
    /* scroll the topmost sheet to its bottom and dump again */
    const sc = await P.evaluate(() => { const sh = [...document.querySelectorAll('.r2-ov.on')].pop(); if (!sh) return null; const cands = [sh, ...sh.querySelectorAll('*')].filter(e => e.scrollHeight > e.clientHeight + 10 && /auto|scroll/.test(getComputedStyle(e).overflowY)); const s = cands[0]; if (!s) return { none: true, h: sh.scrollHeight, ch: sh.clientHeight }; s.scrollTop = s.scrollHeight; return { el: s.id || String(s.className).slice(0, 40), sh: s.scrollHeight, ch: s.clientHeight, top: s.scrollTop }; });
    console.log('scroll', JSON.stringify(sc)); await H.sleep(700);
    await dump('after ' + sel + ' scrolled');
    await P.evaluate(() => history.back()); await H.sleep(1500);
    await dump('back from ' + sel);
  }
  console.log('ERRS', JSON.stringify(R.errs), 'crashed', R.crashed);
  await R.close();
})().catch(e => { console.error('BROKEN', e && e.stack || e); process.exit(2); });
