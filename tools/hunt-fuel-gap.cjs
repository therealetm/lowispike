'use strict';
/* Bug hunt (Fuel and Gap + weight tracker): open one entry (fuel-shop, fuel-log, gap, body, weight) on the live site the way a
   user does (Home bubble -> bloom orb, or the Weight sheet), tap every control in it from a fresh open, then every control inside
   what it opened (one level). A photo input gets a food fixture and the
   food-photo endpoint is a stand-in (never the real one). Records page errors, crashes, dead taps, overflow, controls that
   cannot be tapped, with a screenshot each.
   node tools/hunt-fuel-gap.cjs <entry> <device> [url|root] [outdir] [theme dark|light] [lang en|de|es] */
const H = require('./sim/harness.cjs'), fs = require('fs'), path = require('path');
const FIX = process.env.SR_PHOTO || '/home/sprite/scan-result-fixture.jpg';
const FAKE = 'http://food-fixture.invalid/food-photo';
const DISHES = [
  { name: 'Cooked meat pieces', portion: '~150 g', grams: 150, kcal: 350, protein: 38, carbs: 0, sugar: 0, fiber: 0, fat: 21 },
  { name: 'White rice', portion: '1 cup', grams: 180, kcal: 230, protein: 4, carbs: 50, sugar: 0, fiber: 1, fat: 0.5 }
];
(async () => {
  const A = process.argv.slice(1); const ENTRY = A[1] || 'gap';
  const device = A[2] || 'iPhone 13', where = A[3] || 'https://therealetm.github.io/lowispike/index.html';
  const out = A[4] || '/tmp/hunt-fg', theme = A[5] || 'dark', lang = A[6] || 'en';
  fs.mkdirSync(out, { recursive: true });
  const o = { device, engine: 'webkit', members: 10, messages: 20, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page, tag = ENTRY + '-' + device.replace(/\W/g, '') + '-' + theme + '-' + lang;
  let posts = 0;
  await R.ctx.route(FAKE + '**', r => { const m = r.request().method(); if (m === 'POST') posts++; return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }, body: JSON.stringify(m === 'POST' ? { dishes: DISHES, confidence: 'high', left: 2, limit: 3, model: 'fixture' } : { ok: true, configured: true, left: 3, limit: 3 }) }); });
  await R.ctx.addInitScript(([t, l, u]) => { try { localStorage.setItem('lowi.theme', t); localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } window.LOWI_FOOD_AI_URL = u; }, [theme, lang, FAKE]);
  R.step = 'load'; await R.goto(); await H.sleep(5000);
  const build = await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || null);
  const sheetSel = '[data-hunt-root="1"]';
  const reset = async () => {
    for (let i = 0; i < 3; i++) { await P.keyboard.press('Escape').catch(() => { }); await H.sleep(120); }
    await P.evaluate(() => { try { LowiHomeBloomsV2.close(); } catch (e) { } try { LowiR2.closeAll(); } catch (e) { } document.querySelectorAll('.r2-ov.on,[id$="Ov"]').forEach(x => { try { const c = x.querySelector('[data-close],[aria-label="Close"],.r2-x'); } catch (e) { } }); try { goTab('home'); } catch (e) { } window.scrollTo(0, 0); });
    for (let i = 0; i < 4; i++) { const sc = await P.evaluate(() => { const x = [...document.querySelectorAll('.td-x, .r2-x, [data-close], [id$="Ov"] button[aria-label="Close"], [id$="Ov"] button[aria-label="Schließen"], [id$="Ov"] button[aria-label="Cerrar"], .r2-ov.on button[aria-label="Close"], .r2-ov.on button[aria-label="Schließen"], .r2-ov.on button[aria-label="Cerrar"]')].find(e => { const r = e.getBoundingClientRect(); if (!r.width || r.bottom < 0 || r.top > innerHeight) return false; const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return t && (t === e || e.contains(t)); }); if (!x) return null; const r = x.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }); if (!sc) break; await P.touchscreen.tap(sc[0], sc[1]); await H.sleep(700); }
    await H.sleep(900);
  };
  const tops = () => P.evaluate(() => [...document.querySelectorAll('.r2-ov:not(.off), [role=dialog], [id$="Ov"]')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden' && e.id !== 'hb2Bloom'; }).map(e => e.id || String(e.className).slice(0, 40)));
  const markNew = async (before) => P.evaluate((before) => { document.querySelectorAll('[data-hunt-root]').forEach(x => x.removeAttribute('data-hunt-root')); const c = [...document.querySelectorAll('.r2-ov:not(.off), [role=dialog], [id$="Ov"]')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden' && e.id !== 'hb2Bloom'; }); const n = c.filter(e => before.indexOf(e.id || String(e.className).slice(0, 40)) < 0).pop() || null; if (!n) return null; n.setAttribute('data-hunt-root', '1'); return n.id || String(n.className).slice(0, 40); }, before);
  const tapSel = async (sel) => { const sc = await P.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); if (!r.width) return null; return [r.left + r.width / 2, r.top + r.height / 2]; }, sel); if (!sc) return false; await P.touchscreen.tap(sc[0], sc[1]); return true; };
  const openScan = async () => {
    await reset();
    for (let i = 0; i < 3; i++) {
      const before = await tops();
      if (ENTRY === 'gap') { if (!await tapSel('[data-orbit="gap"]')) { await H.sleep(1500); continue; } }
      else if (ENTRY.startsWith('fuel-')) {
        if (!await tapSel('[data-orbit="fuel"]')) { await H.sleep(1500); continue; }
        await H.sleep(900);
        if (!await tapSel('#hb2Bloom [data-id="' + ENTRY.slice(5) + '"]')) { await H.sleep(800); continue; }
      } else if (ENTRY === 'body') await P.evaluate(() => LowiBodyStats.open());
      else if (ENTRY === 'weight') await P.evaluate(() => LowiWeightJourney.open());
      await H.sleep(1600);
      const m = await markNew(before);
      if (m) { await H.sleep(500); return true; }
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
  if (!await openScan()) { console.log('BROKEN: entry never opened', ENTRY); await note('cannot open entry', { ENTRY }); }
  await P.evaluate(s => { const e = document.querySelector(s); if (e) e.setAttribute('data-hunt-sheet', '1'); }, sheetSel);
  const rootName = await P.evaluate(() => { const e = document.querySelector('[data-hunt-root]'); return e ? e.id || e.className : null; });
  console.log('entry', ENTRY, 'opened', rootName);
  const top = await list(sheetSel);
  console.log('build', build, 'controls', top.length, JSON.stringify(top.map(t => t.label)));
  await R.shot(path.join(out, tag + '-root.png'));
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
        const still = await P.evaluate(() => { const s = document.querySelector('[data-hunt-sheet="1"]'); if (!s) return false; const r = s.getBoundingClientRect(); if (!r.height) return false; const t = document.elementFromPoint(r.left + r.width / 2, Math.min(innerHeight - 2, r.top + r.height / 2)); return !!(t && s.contains(t)); });
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
  R.step = 'reload mid-entry'; await openScan(); await P.reload({ waitUntil: 'load' }).catch(() => { }); await H.sleep(6000);
  if (R.crashed) await note('crash after reload', {});
  const after = await state(); if (after.overflow > 2) await note('overflow after reload', { px: after.overflow });
  console.log(JSON.stringify({ device, theme, lang, build, posts, crashed: R.crashed, errs: R.errs, findings }, null, 1));
  await R.close();
})().catch(e => { console.error('BROKEN', e && e.stack || e); process.exit(2); });
