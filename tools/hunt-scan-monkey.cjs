'use strict';
/* Bug hunt (Scan / Deep analyze / spike rating): open Scan from the Home orbit on the live site and tap every control in the
   Scan sheet from a fresh Scan, then every control inside what it opened (one level). A photo input gets a food fixture and the
   food-photo endpoint is a stand-in (never the real one). Records page errors, crashes, dead taps, overflow, controls that
   cannot be tapped, with a screenshot each.
   node tools/hunt-scan-monkey.cjs <device> [url|root] [outdir] [theme dark|light] [lang en|de|es] */
const H = require('./sim/harness.cjs'), fs = require('fs'), path = require('path');
const FIX = process.env.SR_PHOTO || '/home/sprite/scan-result-fixture.jpg';
const FAKE = 'http://food-fixture.invalid/food-photo';
const DISHES = [
  { name: 'Cooked meat pieces', portion: '~150 g', grams: 150, kcal: 350, protein: 38, carbs: 0, sugar: 0, fiber: 0, fat: 21 },
  { name: 'White rice', portion: '1 cup', grams: 180, kcal: 230, protein: 4, carbs: 50, sugar: 0, fiber: 1, fat: 0.5 }
];
(async () => {
  const device = process.argv[2] || 'iPhone 13', where = process.argv[3] || 'https://therealetm.github.io/lowispike/index.html';
  const out = process.argv[4] || '/tmp/hunt-scan', theme = process.argv[5] || 'dark', lang = process.argv[6] || 'en';
  fs.mkdirSync(out, { recursive: true });
  const o = { device, engine: 'webkit', members: 10, messages: 20, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page, tag = device.replace(/\W/g, '') + '-' + theme + '-' + lang;
  let posts = 0;
  await R.ctx.route(FAKE + '**', r => { const m = r.request().method(); if (m === 'POST') posts++; return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }, body: JSON.stringify(m === 'POST' ? { dishes: DISHES, confidence: 'high', left: 2, limit: 3, model: 'fixture' } : { ok: true, configured: true, left: 3, limit: 3 }) }); });
  await R.ctx.addInitScript(([t, l, u]) => { try { localStorage.setItem('lowi.theme', t); localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } window.LOWI_FOOD_AI_URL = u; }, [theme, lang, FAKE]);
  R.step = 'load'; await R.goto(); await H.sleep(5000);
  const build = await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || null);
  const sheetSel = '#b3Cam';
  const reset = async () => {
    for (let i = 0; i < 3; i++) { await P.keyboard.press('Escape').catch(() => { }); await H.sleep(120); }
    await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } try { goTab('home'); } catch (e) { } window.scrollTo(0, 0); });
    await H.sleep(900);
  };
  const openScan = async () => {
    await reset();
    for (let i = 0; i < 3; i++) {
      const sc = await P.evaluate(() => { const e = document.querySelector('[data-orbit="scan"]'); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
      if (!sc) { await H.sleep(1500); continue; }
      await P.touchscreen.tap(sc[0], sc[1]);
      if (await P.waitForFunction(() => { const e = document.getElementById('b3Cam'); return e && e.getBoundingClientRect().height > 0; }, null, { timeout: 8000 }).then(() => true, () => false)) { await H.sleep(900); return true; }
    }
    return false;
  };
  const list = (scopeSel) => P.evaluate((scopeSel) => {
    const scope = scopeSel ? document.querySelector(scopeSel) : document;
    if (!scope) return [];
    const els = [...scope.querySelectorAll('button,[role=button],a[href],[data-act],[data-sp],[data-b3],input,select,textarea,label[for]')];
    const seen = new Set(), outL = [];
    els.forEach((b, i) => {
      const r = b.getBoundingClientRect(), s = getComputedStyle(b);
      if (b.type === 'file') { outL.push({ h: 'file', key: 'file|' + (b.accept || ''), label: 'file input ' + (b.accept || ''), tag: 'FILE' }); return; }
      if (r.width < 4 || r.height < 4 || s.visibility === 'hidden' || s.display === 'none' || b.closest('[hidden],[aria-hidden="true"]')) return;
      if (b.parentElement && b.parentElement.closest('button,[role=button]')) return;
      const id = b.id ? '#' + b.id : null;
      const attrs = ['data-act', 'data-sp', 'data-b3', 'data-slot', 'data-id', 'aria-label'].map(a => b.getAttribute(a) != null ? `[${a}="${String(b.getAttribute(a)).replace(/"/g, '\\"')}"]` : '').join('');
      const key = id || (b.tagName.toLowerCase() + attrs) + '|' + (b.textContent || '').trim().slice(0, 30);
      if (seen.has(key)) return; seen.add(key);
      b.setAttribute('data-hunt', 'h' + i);
      outL.push({ h: 'h' + i, key, label: ((b.getAttribute('aria-label') || b.textContent || b.value || b.placeholder || '').replace(/\s+/g, ' ').trim()).slice(0, 50), tag: b.tagName, w: Math.round(r.width), hgt: Math.round(r.height) });
    });
    return outL;
  }, scopeSel);
  const state = () => P.evaluate(() => ({
    html: document.body.innerHTML.length,
    sheets: [...document.querySelectorAll('.r2-ov:not(.off), [role=dialog]')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; }).length,
    url: location.hash, overflow: document.documentElement.scrollWidth - innerWidth, text: (document.body.innerText || '').length,
    top: (() => { const s = [...document.querySelectorAll('.r2-ov:not(.off), [role=dialog]')].filter(e => e.getBoundingClientRect().height > 0).pop(); return s ? (s.id || s.className).toString().slice(0, 60) : ''; })()
  }));
  const tapH = async (h) => {
    const loc = P.locator(`[data-hunt="${h}"]`).first();
    await loc.evaluate(e => e.scrollIntoView({ block: 'center' })).catch(() => { });
    await H.sleep(300);
    const cover = await loc.evaluate(e => { const r = e.getBoundingClientRect(); if (!r.width) return 'gone'; const x = r.left + r.width / 2, y = r.top + r.height / 2; if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return 'offscreen ' + Math.round(x) + ',' + Math.round(y); const t = document.elementFromPoint(x, y); return t && (t === e || e.contains(t) || t.contains(e) || (e.tagName === 'LABEL' && e.control && (t === e.control))) ? '' : 'covered by ' + (t ? (t.id || String(t.className).slice(0, 40) || t.tagName) : 'nothing'); }).catch(() => 'gone');
    if (cover) return cover;
    await R.tapEl(loc).catch(() => { });
    return '';
  };
  const findings = [];
  const note = async (kind, info) => { const f = path.join(out, tag + '-' + findings.length + '.png'); await R.shot(f); findings.push(Object.assign({ kind, shot: f }, info)); console.log('FIND', kind, JSON.stringify(info)); };
  const SKIP = /sign out|abmelden|delete|löschen|eliminar|share|teilen|compartir/i;
  const tryOne = async (label, h, tagName, s0, e0) => {
    if (h === 'file') {
      R.step = 'file ' + label;
      const ok = await P.setInputFiles(`${'[data-hunt-sheet="1"]'} input[type=file] >> nth=0`, FIX).then(() => true, e => (console.log('  file fail', e.message.split('\n')[0]), false));
      if (ok) await H.sleep(4000);
    } else {
      const why = await tapH(h);
      if (why && why !== 'gone') { await note('cannot tap', { label, why }); return null; }
      await H.sleep(1500);
    }
    const s1 = await state();
    if (R.crashed) { await note('crash', { label }); return null; }
    if (R.errs.length > e0) await note('error', { label, errs: R.errs.slice(e0) });
    if (s1.overflow > 2) await note('overflow', { label, px: s1.overflow });
    const changed = s1.html !== s0.html || s1.sheets !== s0.sheets || s1.url !== s0.url || s1.text !== s0.text;
    if (!changed && !/INPUT|SELECT|TEXTAREA|FILE/.test(tagName)) await note('dead tap', { label });
    return s1;
  };
  if (!await openScan()) { console.log('BROKEN: Scan sheet never opened'); await note('cannot open scan', {}); }
  await P.evaluate(s => { const e = document.querySelector(s); if (e) e.setAttribute('data-hunt-sheet', '1'); }, sheetSel);
  const top = await list(sheetSel);
  console.log('build', build, 'scan controls', top.length, JSON.stringify(top.map(t => t.label)));
  await R.shot(path.join(out, tag + '-scan.png'));
  for (const t of top) {
    if (SKIP.test(t.label)) { console.log('skip', t.label); continue; }
    if (!await openScan()) { await note('cannot reopen scan', { before: t.label }); continue; }
    await P.evaluate(s => { document.querySelectorAll('[data-hunt-sheet]').forEach(x => x.removeAttribute('data-hunt-sheet')); const e = document.querySelector(s); if (e) e.setAttribute('data-hunt-sheet', '1'); }, sheetSel);
    const again = await list(sheetSel); const m = again.find(x => x.key === t.key); if (!m) { console.log('gone', t.label); continue; }
    const e0 = R.errs.length, s0 = await state(); R.step = 'tap ' + t.label;
    const s1 = await tryOne(t.label, m.h, m.tag, s0, e0);
    if (R.crashed) break;
    console.log('tapped', t.label, '->', s1 && s1.top, 'sheets', s0.sheets, '->', s1 && s1.sheets);
    await R.shot(path.join(out, tag + '-t-' + t.label.replace(/\W+/g, '_').slice(0, 20) + '.png'));
    if (s1 && (s1.sheets > s0.sheets || s1.top !== s0.top)) {
      const sel = await P.evaluate(() => { document.querySelectorAll('[data-hunt-sheet]').forEach(x => x.removeAttribute('data-hunt-sheet')); const s = [...document.querySelectorAll('.r2-ov:not(.off), [role=dialog]')].filter(e => e.getBoundingClientRect().height > 0).pop(); if (!s) return null; s.setAttribute('data-hunt-sheet', '1'); return '[data-hunt-sheet="1"]'; });
      const inner = sel ? await list(sel) : [];
      console.log('  opened', s1.top, 'with', inner.length, 'controls:', JSON.stringify(inner.map(x => x.label)));
      for (const c of inner.slice(0, 16)) {
        if (SKIP.test(c.label) || c.key === t.key) continue;
        if (c.h !== 'file' && !await P.locator(`[data-hunt="${c.h}"]`).count()) continue;
        const e1 = R.errs.length, s2 = await state(); R.step = 'tap ' + t.label + ' > ' + c.label;
        const s3 = await tryOne(t.label + ' > ' + c.label, c.h, c.tag, s2, e1);
        if (R.crashed) break;
        if (s3) console.log('   tapped', c.label, '->', s3.top);
        const still = await P.evaluate(() => { const s = document.querySelector('[data-hunt-sheet="1"]'); return !!(s && s.getBoundingClientRect().height); });
        if (!still) {
          await R.shot(path.join(out, tag + '-t-' + (t.label + '_' + c.label).replace(/\W+/g, '_').slice(0, 30) + '.png'));
          if (!await openScan()) break;
          await P.evaluate(s => { document.querySelectorAll('[data-hunt-sheet]').forEach(x => x.removeAttribute('data-hunt-sheet')); const e = document.querySelector(s); if (e) e.setAttribute('data-hunt-sheet', '1'); }, sheetSel);
          const a = await list(sheetSel); const mm = a.find(x => x.key === t.key); if (!mm) break;
          await tapH(mm.h); await H.sleep(1500);
          await P.evaluate(() => { document.querySelectorAll('[data-hunt-sheet]').forEach(x => x.removeAttribute('data-hunt-sheet')); const s = [...document.querySelectorAll('.r2-ov:not(.off), [role=dialog]')].filter(e => e.getBoundingClientRect().height > 0).pop(); if (s) s.setAttribute('data-hunt-sheet', '1'); });
          await list('[data-hunt-sheet="1"]');
        }
      }
    }
    if (R.crashed) break;
  }
  R.step = 'reload mid-scan'; await openScan(); await P.reload({ waitUntil: 'load' }).catch(() => { }); await H.sleep(6000);
  if (R.crashed) await note('crash after reload', {});
  const after = await state(); if (after.overflow > 2) await note('overflow after reload', { px: after.overflow });
  console.log(JSON.stringify({ device, theme, lang, build, posts, crashed: R.crashed, errs: R.errs, findings }, null, 1));
  await R.close();
})().catch(e => { console.error('BROKEN', e && e.stack || e); process.exit(2); });
