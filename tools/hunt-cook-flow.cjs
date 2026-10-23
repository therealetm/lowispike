'use strict';
/* Bug hunt (Shuffle / Shop it / Cook it), deeper than hunt-cook-monkey: walks real flows by taps on the live site.
   Shuffle -> reveal -> every reveal button; Cook it / Shop it hub; recipe list -> recipe -> steps; By ingredient; Swap;
   back (history.back = swipe back) at each level; reload with a pick on screen. Reports page errors, crashes, leaving the app,
   sheets left open, overflow, and visible English words when lang is de/es.
   node tools/hunt-cook-flow.cjs <device> [url|root] [outdir] [theme] [lang] */
const H = require('./sim/harness.cjs'), fs = require('fs'), path = require('path');
(async () => {
  const device = process.argv[2] || 'iPhone 13', where = process.argv[3] || 'https://therealetm.github.io/lowispike/index.html';
  const out = process.argv[4] || '/tmp/huntcf', theme = process.argv[5] || 'dark', lang = process.argv[6] || 'en';
  fs.mkdirSync(out, { recursive: true });
  const o = { device, engine: 'webkit', members: 10, messages: 20, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page, tag = device.replace(/\W/g, '') + '-' + theme + '-' + lang;
  await R.ctx.addInitScript(([t, l]) => { try { localStorage.setItem('lowi.theme', t); localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, [theme, lang]);
  R.step = 'load'; await R.goto(); await H.sleep(5000);
  for (let i = 0; i < 3; i++) { await P.keyboard.press('Escape').catch(() => { }); await H.sleep(150); }
  const build = await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || null);
  const findings = [];
  const note = async (kind, info) => { const f = path.join(out, tag + '-' + findings.length + '.png'); await R.shot(f); findings.push(Object.assign({ kind, shot: f, step: R.step }, info)); console.log('FIND', kind, R.step, JSON.stringify(info).slice(0, 600)); };
  const EN = /\b(the|and|your|you|with|from|again|recipe|recipes|shared|community|meal|snack|drink|sweet|add|shopping|list|cook|shop|ingredients?|minutes?|steps?|swap|healthier|close|back|done|never|skip|open|this|save|saved|start|next)\b/i;
  const state = () => P.evaluate(() => {
    const vis = e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && s.visibility !== 'hidden' && +s.opacity > .05; };
    const sheets = [...document.querySelectorAll('.r2-ov.on, [role=dialog], .sheet.open, #sheetwrap.open, .cs-ov.on, .lc-ov.on')].filter(vis).map(e => (e.id || String(e.className).split(' ').slice(0, 2).join('.')));
    const texts = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) { const t = n.nodeValue.replace(/\s+/g, ' ').trim(); if (t.length < 3) continue; const p = n.parentElement; if (!p || p.closest('script,style,[aria-hidden="true"]')) continue; const r = p.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight)) continue; const s = getComputedStyle(p); if (s.visibility === 'hidden' || +s.opacity < .05) continue; texts.push(t.slice(0, 80)); }
    return { url: location.href, inApp: !!document.getElementById('whPad'), sheets, overflow: document.documentElement.scrollWidth - innerWidth, texts };
  });
  const engCheck = async (where) => { if (lang === 'en') return; const s = await state(); const bad = [...new Set(s.texts.filter(t => EN.test(t) && !/LOWiSPIKE|GPT|Misty|E-man|Lidl|Rewe|Aldi|Edeka|^[A-Z][a-z]+ [A-Z]/.test(t)))]; if (bad.length) await note('english text', { where, bad: bad.slice(0, 12) }); };
  const check = async (where) => {
    if (R.crashed) { await note('crash', { where }); return false; }
    const s = await state().catch(e => ({ err: String(e.message) }));
    if (s.err || !s.inApp) { await note('left app', { where, s: s.err || s.url }); return false; }
    if (s.overflow > 2) await note('overflow', { where, px: s.overflow });
    return s;
  };
  let e0 = 0; const errs = async (where) => { if (R.errs.length > e0) { await note('error', { where, errs: R.errs.slice(e0) }); e0 = R.errs.length; } };
  const tapSel = async (sel, where) => {
    R.step = where;
    const loc = P.locator(sel).filter({ visible: true }).first(); if (!(await loc.count())) { await note('missing', { where, sel }); return false; }
    await loc.evaluate(e => e.scrollIntoView({ block: 'center' })).catch(() => { }); await H.sleep(300);
    const cover = await loc.evaluate(e => { const r = e.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const t = document.elementFromPoint(x, y); return t && (t === e || e.contains(t) || t.contains(e)) ? '' : 'covered by ' + (t ? (t.id || String(t.className).slice(0, 40) || t.tagName) : 'nothing') + ' at ' + Math.round(x) + ',' + Math.round(y); }).catch(e => 'gone');
    if (cover) { await note('cannot tap', { where, sel, cover }); return false; }
    await R.tapEl(loc).catch(e => note('tap failed', { where, sel, e: String(e.message).slice(0, 100) }));
    await H.sleep(1300); await errs(where); return true;
  };
  const back = async (where) => { R.step = 'back ' + where; await P.evaluate(() => history.back()).catch(() => { }); await H.sleep(1200); await errs('back ' + where); return check('back ' + where); };
  const cook = async () => { for (let i = 0; i < 3; i++) { await P.keyboard.press('Escape').catch(() => { }); await H.sleep(120); } await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } try { goTab('shelf'); } catch (e) { } }); await H.sleep(1200); };
  const log = (...a) => console.log(...a);

  /* 1. Shuffle -> reveal */
  await cook(); await check('cook'); await engCheck('cook top');
  await tapSel('#r5Go', 'shuffle'); await H.sleep(1500);
  let s = await check('after shuffle');
  const reveal = await P.evaluate(() => { const p = document.getElementById('r5Pick'); return p ? { name: (p.querySelector('.r5-cn') || {}).textContent, btns: [...p.querySelectorAll('button,[role=button],a[href]')].filter(b => b.getBoundingClientRect().width > 4).map(b => ({ t: (b.getAttribute('aria-label') || b.textContent).replace(/\s+/g, ' ').trim().slice(0, 40), sel: b.id ? '#' + b.id : (b.dataset.r5 ? `#r5Pick [data-r5="${b.dataset.r5}"]` : b.dataset.lc ? `#r5Pick [data-lc="${b.dataset.lc}"]` : null) })) } : null; });
  log('reveal', JSON.stringify(reveal)); log('sheets after shuffle', JSON.stringify(s && s.sheets));
  await engCheck('reveal');
  await R.shot(path.join(out, tag + '-reveal.png'));
  /* 2. each reveal button, from a fresh reveal, then back */
  const uniq = [...new Map((reveal && reveal.btns || []).filter(b => b.sel).map(b => [b.sel, b])).values()];
  for (const b of uniq) {
    if (/share|teilen|compartir/i.test(b.t)) continue;
    await cook(); s = await check('cook'); if (!s) break;
    const has = await P.locator(b.sel).filter({ visible: true }).count(); if (!has) { await tapSel('#r5Go', 'reshuffle'); await H.sleep(1500); }
    const before = await state();
    if (!(await tapSel(b.sel, 'reveal > ' + b.t))) continue;
    const after = await check('reveal > ' + b.t); if (!after) break;
    log('  tap', b.t, 'sheets', JSON.stringify(before.sheets), '->', JSON.stringify(after.sheets));
    await engCheck('reveal > ' + b.t);
    if (after.sheets.length > before.sheets.length) {
      const bk = await back('reveal > ' + b.t); if (!bk) break;
      if (bk.sheets.length > before.sheets.length) await note('back left sheet open', { where: 'reveal > ' + b.t, sheets: bk.sheets });
    }
  }
  /* 3. Cook it / Shop it hub, recipe flows */
  const hub = [['[data-lc="hubcook"]', 'Cook it'], ['[data-lc="hubshop"]', 'Shop it']];
  for (const [sel, nm] of hub) {
    await cook(); const b0 = await state();
    if (!(await tapSel('#csHub ' + sel, 'hub ' + nm))) continue;
    const a = await check('hub ' + nm); if (!a) break;
    log('hub', nm, 'sheets', JSON.stringify(a.sheets)); await engCheck('hub ' + nm); await R.shot(path.join(out, tag + '-hub-' + nm.replace(/\W/g, '') + '.png'));
    /* buttons inside what opened */
    const inner = await P.evaluate(() => { const sh = [...document.querySelectorAll('.r2-ov.on, [role=dialog], .cs-ov.on, .lc-ov.on')].filter(e => e.getBoundingClientRect().height > 0).pop(); if (!sh) return []; return [...sh.querySelectorAll('button,[role=button],input,select')].filter(b => { const r = b.getBoundingClientRect(); return r.width > 4 && r.height > 4; }).map((b, i) => { b.setAttribute('data-hcf', 'x' + i); return { h: 'x' + i, t: (b.getAttribute('aria-label') || b.textContent || b.placeholder || '').replace(/\s+/g, ' ').trim().slice(0, 40), tag: b.tagName, w: Math.round(b.getBoundingClientRect().width), hh: Math.round(b.getBoundingClientRect().height) }; }); });
    log('  inner', JSON.stringify(inner));
    const small = inner.filter(x => x.tag === 'BUTTON' && (x.hh < 28 || x.w < 28)); if (small.length) log('  small targets', JSON.stringify(small));
    for (const c of inner.slice(0, 16)) {
      if (c.tag !== 'BUTTON' || /share|teilen|compartir|camera|kamera/i.test(c.t)) continue;
      const ok = await P.locator(`[data-hcf="${c.h}"]`).filter({ visible: true }).count(); if (!ok) continue;
      const st0 = await state();
      await tapSel(`[data-hcf="${c.h}"]`, 'hub ' + nm + ' > ' + c.t);
      const st1 = await check('hub ' + nm + ' > ' + c.t); if (!st1) break;
      if (st1.sheets.length > st0.sheets.length) { await engCheck('hub ' + nm + ' > ' + c.t); const bk = await back('hub ' + nm + ' > ' + c.t); if (!bk) break; if (bk.sheets.length > st0.sheets.length) await note('back left sheet open', { where: 'hub ' + nm + ' > ' + c.t, sheets: bk.sheets }); }
      const still = await P.evaluate(() => !!document.querySelector('[data-hcf]') && [...document.querySelectorAll('[data-hcf]')].some(e => e.getBoundingClientRect().height > 0));
      if (!still) { await cook(); if (!(await tapSel('#csHub ' + sel, 'hub ' + nm + ' again'))) break; await P.evaluate(() => { const sh = [...document.querySelectorAll('.r2-ov.on, [role=dialog], .cs-ov.on, .lc-ov.on')].filter(e => e.getBoundingClientRect().height > 0).pop(); if (!sh) return; [...sh.querySelectorAll('button,[role=button],input,select')].filter(b => { const r = b.getBoundingClientRect(); return r.width > 4 && r.height > 4; }).forEach((b, i) => b.setAttribute('data-hcf', 'x' + i)); }); }
    }
    const bk = await back('hub ' + nm); if (!bk) break;
    if (bk.sheets.length > b0.sheets.length) await note('back left sheet open', { where: 'hub ' + nm, sheets: bk.sheets });
    await P.evaluate(() => document.querySelectorAll('[data-hcf]').forEach(e => e.removeAttribute('data-hcf')));
  }
  /* 4. tiles below: All recipes, By ingredient, Swap ingredients, My Recipe Book */
  const tiles = await P.evaluate(() => { const t = document.getElementById('tab-shelf'); if (!t) return []; return [...t.querySelectorAll('button,[role=button]')].filter(b => /recipes|rezept|receta|ingredient|zutat|swap|tausch|book|buch|libro/i.test(b.textContent) && b.getBoundingClientRect().width > 60).map((b, i) => { b.setAttribute('data-hct', 't' + i); return { h: 't' + i, t: b.textContent.replace(/\s+/g, ' ').trim().slice(0, 40) }; }); });
  log('tiles', JSON.stringify(tiles));
  for (const tl of tiles) {
    await cook(); await P.evaluate(() => { const t = document.getElementById('tab-shelf'); [...t.querySelectorAll('button,[role=button]')].filter(b => /recipes|rezept|receta|ingredient|zutat|swap|tausch|book|buch|libro/i.test(b.textContent) && b.getBoundingClientRect().width > 60).forEach((b, i) => b.setAttribute('data-hct', 't' + i)); });
    const b0 = await state();
    if (!(await tapSel(`[data-hct="${tl.h}"]`, 'tile ' + tl.t))) continue;
    const a = await check('tile ' + tl.t); if (!a) break; log('tile', tl.t, JSON.stringify(a.sheets)); await engCheck('tile ' + tl.t);
    await R.shot(path.join(out, tag + '-tile-' + tl.h + '.png'));
    /* open the first recipe/card inside, if any */
    const opened = await P.evaluate(() => { const sh = [...document.querySelectorAll('.r2-ov.on, [role=dialog], .cs-ov.on, .lc-ov.on, #sheetwrap.open')].filter(e => e.getBoundingClientRect().height > 0).pop(); if (!sh) return null; const c = [...sh.querySelectorAll('[data-rid],[data-id],.rb-card,.rc-card,button')].filter(b => b.getBoundingClientRect().height > 40 && !/close|schlie|cerrar|back|zurück/i.test(b.getAttribute('aria-label') || '')).slice(1, 2)[0]; if (!c) return null; c.setAttribute('data-hcr', '1'); return (c.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40); });
    if (opened) { await tapSel('[data-hcr="1"]', 'tile ' + tl.t + ' > ' + opened); const a2 = await check('tile inner'); if (!a2) break; log('  inner', opened, JSON.stringify(a2.sheets)); await engCheck('tile ' + tl.t + ' > ' + opened); const bk2 = await back('tile inner'); if (!bk2) break; }
    const bk = await back('tile ' + tl.t); if (!bk) break;
    if (bk.sheets.length > b0.sheets.length) await note('back left sheet open', { where: 'tile ' + tl.t, sheets: bk.sheets });
  }
  /* 5. reload with a pick on screen, then shuffle quickly 5x */
  await cook(); await tapSel('#r5Go', 'shuffle before reload'); await H.sleep(1200);
  R.step = 'reload'; await P.reload({ waitUntil: 'load' }).catch(() => { }); await H.sleep(5500); e0 = R.errs.length;
  await cook(); s = await check('after reload');
  if (s) { const pk = await P.evaluate(() => { const p = document.querySelector('#r5Pick .r5-cn'); return p ? p.textContent.trim() : null; }); log('pick after reload', pk); }
  for (let i = 0; i < 5; i++) { R.step = 'fast shuffle ' + i; await P.evaluate(() => { const b = document.getElementById('r5Go'); if (b) b.scrollIntoView({ block: 'center' }); }); await R.tap('#r5Go').catch(() => { }); await H.sleep(250); }
  await H.sleep(2000); await errs('fast shuffle'); s = await check('fast shuffle');
  if (s) { const st = await P.evaluate(() => ({ strip: document.querySelectorAll('#r5Strip .r5-cell').length, pick: (document.querySelector('#r5Pick .r5-cn') || {}).textContent || null, go: (document.getElementById('r5Go') || {}).disabled })); log('after fast shuffle', JSON.stringify(st)); }
  console.log(JSON.stringify({ device, theme, lang, build, crashed: R.crashed, errs: R.errs, findings }, null, 1));
  await R.close();
})().catch(e => { console.error('BROKEN', e && e.stack || e); process.exit(2); });
