'use strict';
/* Bug hunt (companion / forms): rename Misty with realistic and edge-case names by tapping and typing, check the card, the
   toast, the Forms panel title, the rank pill label, Home's name, and after a reload. Then open Forms, open Style, pick a
   type, toggle traits and share, Remove style, close. Live site.
   node tools/hunt-rename-forms.cjs <device> [lang] [url|root] */
const H = require('./sim/harness.cjs');
(async () => {
  const device = process.argv[2] || 'iPhone SE', lang = process.argv[3] || 'es', url = process.argv[4] || 'https://therealetm.github.io/lowispike/index.html';
  const o = { device, engine: /Pixel/.test(device) ? 'chromium' : 'webkit', members: 10, messages: 20, probe: false, lang }; if (/^https?:/.test(url)) o.url = url; else o.root = url;
  const R = await H.open(o); const P = R.page; await R.ctx.addInitScript(l => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, lang); await R.goto(); await H.sleep(5000);
  const out = { device, lang, build: await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content), steps: [] };
  const tapEl = async (sel) => { const p = await P.evaluate(s => { const els = [...document.querySelectorAll(s)].filter(e => e.getClientRects().length && !e.closest('.r2-ov.off')); const b = els.pop(); if (!b) return null; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const t = document.elementFromPoint(x, y); return { x, y, hit: !!t && (t === b || b.contains(t)), cov: t ? (t.id || String(t.className).slice(0, 40)) : null }; }, sel); if (!p) return 'missing'; await H.sleep(250); await P.touchscreen.tap(p.x, p.y); await H.sleep(700); return p.hit ? 'ok' : 'covered by ' + p.cov; };
  const card = () => P.evaluate(() => { const h = [...document.querySelectorAll('#mistyHub')].find(e => !e.closest('.r2-ov.off')); const n = h && h.querySelector('.mh-name'); const pill = h && h.querySelector('[data-mhrk]'); const toast = [...document.querySelectorAll('.r2-toast,[class*=toast]')].filter(e => e.getClientRects().length).map(e => e.textContent.trim()).join(' | '); const err = h && h.querySelector('.mh-rne:not([hidden])'); let disp = null; try { disp = LowiBirthCompanion.displayName(); } catch (e) { } return { open: !!h, name: n ? n.textContent.trim() : null, pill: pill ? pill.getAttribute('aria-label') : null, toast, err: err ? err.textContent : null, disp, form: !!(h && h.querySelector('.mh-rnf')) }; });
  const openHub = async () => { await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } try { LowiCompanion.close && LowiCompanion.close(); } catch (e) { } }); await H.sleep(800); await P.evaluate(() => LowiMistyHub.open()); await H.sleep(3200); };
  const names = ['Lumi', '  Nova Sky  ', 'Señorita Blümchen ✨', '<b>x</b>', 'A'.repeat(30), ''];
  for (const nm of names) {
    await openHub();
    const t1 = await tapEl('#mistyHub [data-mh="rename"]');
    const inp = await P.evaluate(() => { const i = [...document.querySelectorAll('#mistyHub .mh-rnf input')].pop(); return i ? { v: i.value, focus: document.activeElement === i } : null; });
    if (inp) { await P.evaluate(() => { const i = [...document.querySelectorAll('#mistyHub .mh-rnf input')].pop(); i.focus(); i.select(); }); await P.keyboard.press('Backspace'); if (nm) await P.keyboard.type(nm, { delay: 15 }); }
    const t2 = await tapEl('#mistyHub .mh-rns');
    await H.sleep(300);
    out.steps.push({ typed: nm, tapPen: t1, input: inp, tapSave: t2, card: await card() });
  }
  // name used across the app
  await openHub(); await tapEl('#mistyHub [data-mh="rename"]'); await P.evaluate(() => { const i = [...document.querySelectorAll('#mistyHub .mh-rnf input')].pop(); i.focus(); i.select(); }); await P.keyboard.press('Backspace'); await P.keyboard.type('Pip', { delay: 15 }); await P.keyboard.press('Enter'); await H.sleep(800);
  out.afterEnter = await card();
  const tf = await tapEl('#mistyHub [data-mh="forms"]'); await H.sleep(1200);
  out.forms = await P.evaluate(() => { const p = [...document.querySelectorAll('.cf-panel')].filter(e => e.getClientRects().length).pop(); return p ? { title: (p.querySelector('h2') || {}).textContent, text: p.textContent.replace(/\s+/g, ' ').slice(0, 400) } : null; });
  out.formsTap = tf;
  const ts = await tapEl('.cf-panel .cf-pick summary'); await H.sleep(500);
  const axes = await P.evaluate(() => [...document.querySelectorAll('.cf-panel .cf-ax')].length);
  const picks = [];
  for (let i = 0; i < axes; i++) { picks.push(await tapEl('.cf-panel .cf-ax:nth-of-type(' + (i + 1) + ') button:nth-child(2)')); }
  await H.sleep(800);
  out.style = { summary: ts, axes, picks, after: await P.evaluate(() => { const p = [...document.querySelectorAll('.cf-panel')].filter(e => e.getClientRects().length).pop(); if (!p) return null; return { pressed: [...p.querySelectorAll('[data-cf=ax][aria-pressed=true]')].map(b => b.textContent), type: (p.querySelector('.cf-pick-t') || {}).textContent || null, note: (p.querySelector('.cf-note') || {}).textContent || null, pickOpen: !!(p.querySelector('.cf-pick') || {}).open, remove: !!p.querySelector('[data-cf=clear]') }; }) };
  out.traitsTap = await tapEl('.cf-panel [data-cf=traits]');
  out.shareTap = await tapEl('.cf-panel [data-cf=share]');
  out.removeTap = await tapEl('.cf-panel [data-cf=clear]'); await H.sleep(600);
  out.afterRemove = await P.evaluate(() => { const p = [...document.querySelectorAll('.cf-panel')].filter(e => e.getClientRects().length).pop(); return p ? { type: (p.querySelector('.cf-pick-t') || {}).textContent || null, note: (p.querySelector('.cf-note') || {}).textContent || null, traits: (p.querySelector('[data-cf=traits]') || {}).checked, share: (p.querySelector('[data-cf=share]') || {}).checked } : null; });
  await P.screenshot({ path: '/tmp/h17/forms-' + device.replace(/\W/g, '') + '-' + lang + '.png' });
  out.closeTap = await tapEl('.cf-panel [data-cf=close]'); await H.sleep(900);
  out.afterClose = await P.evaluate(() => ({ panels: [...document.querySelectorAll('.cf-panel')].filter(e => e.getClientRects().length).length, hub: !![...document.querySelectorAll('#mistyHub')].find(e => !e.closest('.r2-ov.off') && e.getClientRects().length) }));
  await P.reload(); await H.sleep(6000);
  await openHub(); out.afterReload = await card();
  out.errs = R.errs; out.crashed = R.crashed; console.log(JSON.stringify(out, null, 1)); await R.close().catch(() => { }); process.exit(0);
})().catch(e => { console.log('ERR', e && e.stack); process.exit(1); });
