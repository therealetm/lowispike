'use strict';
/* Bug hunt 23 Oct 23:02: two-level tap crawl of the Cook tab (eBook / Recipes / Products, filters, Shuffle, For You, Swipe,
   Cook it / Shop it hubs, recipe tiles). For each top button: tap, list what opened, tap each button inside (one level),
   back (history.back = swipe back) after each, and report page errors, crashes, leaving the app, sheets left behind,
   sideways overflow, text cut off and English words in de/es.
   node tools/hunt-cook-crawl-2302.cjs <device> [url|root] [lang] [theme] [outprefix] */
const H = require('./sim/harness.cjs');
(async () => {
  const device = process.argv[2] || 'iPhone 13', where = process.argv[3] || 'https://therealetm.github.io/lowispike/index.html';
  const lang = process.argv[4] || 'en', theme = process.argv[5] || 'dark', out = process.argv[6] || '/tmp/h2302/crawl';
  const o = { device, engine: 'webkit', members: 10, messages: 20, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page, tag = out + '-' + device.replace(/\W/g, '') + '-' + lang;
  await R.ctx.addInitScript(([t, l]) => { try { localStorage.setItem('lowi.theme', t); localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, [theme, lang]);
  await R.goto(); await H.sleep(5000);
  const build = await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || null);
  console.log('build', build, device, lang, theme);
  const finds = []; let nshot = 0;
  const note = async (kind, info) => { const f = tag + '-f' + (nshot++) + '.png'; await R.shot(f); finds.push({ kind, f, ...info }); console.log('FIND', kind, JSON.stringify(info).slice(0, 500)); };
  let e0 = 0; const errs = async (w) => { if (R.errs.length > e0) { await note('error', { w, errs: R.errs.slice(e0) }); e0 = R.errs.length; } if (R.crashed) throw new Error('crashed at ' + w); };
  const EN = /\b(the|and|your|you|with|from|again|recipe|recipes|shared|meal|sweet|add|shopping|list|cook it|shop it|ingredients?|minutes?|steps?|swap|healthier|close|back|done|never|skip|open|this|save|saved|start|next|today|price|cheapest|best|all|for you|products?)\b/i;
  const st = () => P.evaluate(() => {
    const vis = e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && s.visibility !== 'hidden' && +s.opacity > .05; };
    const sheets = [...document.querySelectorAll('.r2-ov.on, [role=dialog], .cs-ov.on, .lc-ov.on, #sheetwrap.open')].filter(vis).map(e => (e.id || String(e.className).split(' ').slice(0, 3).join('.')));
    const texts = [], cut = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) { const t = n.nodeValue.replace(/\s+/g, ' ').trim(); if (t.length < 3) continue; const p = n.parentElement; if (!p || p.closest('script,style,[aria-hidden="true"]')) continue; if (!vis(p)) continue; const r = p.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + Math.min(r.height / 2, 10); if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue; const top = document.elementFromPoint(x, y); if (!top || !(top === p || p.contains(top) || top.contains(p))) continue; texts.push(t.slice(0, 90)); const s = getComputedStyle(p); if (p.scrollWidth > p.clientWidth + 2 && s.overflow !== 'visible' && s.textOverflow !== 'ellipsis' && !/auto|scroll/.test(s.overflowX)) cut.push(t.slice(0, 50)); if (r.right > innerWidth + 1 || r.left < -1) cut.push('offscreen: ' + t.slice(0, 50)); }
    return { inApp: !!document.getElementById('whPad'), tab: (document.querySelector('.tab.on, [data-tab].on') || {}).id || null, sheets, overflow: document.documentElement.scrollWidth - innerWidth, texts, cut };
  });
  const reset = async () => { for (let i = 0; i < 3; i++) { await P.keyboard.press('Escape').catch(() => { }); await H.sleep(120); } await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } try { goTab('shelf'); } catch (e) { } }); await H.sleep(900);
    for (const re of [/^(Recipes|Rezepte|Recetas)$/, /^(Shuffle|Mischen|Mezclar)$/]) { const l = P.locator('.ck-b').filter({ hasText: re }).filter({ visible: true }).first(); if (await l.count()) { await R.tapEl(l).catch(() => { }); await H.sleep(700); } } };
  const check = async (w, base) => {
    const s = await st().catch(e => ({ err: String(e.message) }));
    if (s.err || !s.inApp) { await note('left app', { w, s: s.err || '' }); return null; }
    if (s.overflow > 2) await note('overflow', { w, px: s.overflow });
    if (s.cut.length) await note('cut off', { w, cut: [...new Set(s.cut)].slice(0, 6) });
    if (lang !== 'en') { const bad = [...new Set(s.texts.filter(t => EN.test(t) && !/LOWiSPIKE|Misty|Lidl|Rewe|REWE|Aldi|Edeka|EDEKA|Netto|Penny|Kaufland|eBook|Snack|Shuffle|Swipe|Bowl|Smoothie|Wrap|Toast|Burger|Chips|Protein|Caesar|Pancakes|Muffins|Pizza|Salad|Cookie|Brownie|Chicken|Fizz/.test(t)))]; if (bad.length) await note('english', { w, bad: bad.slice(0, 10) }); }
    return s;
  };
  const btns = () => P.evaluate(() => { const top = [...document.querySelectorAll('.r2-ov.on, .cs-ov.on, .lc-ov.on, #sheetwrap.open')].filter(e => e.getBoundingClientRect().height > 0).pop(); const root = top || document.getElementById('tab-shelf') || document.body; const out = []; root.querySelectorAll('button,[role=button],a[href]').forEach((b, i) => { const r = b.getBoundingClientRect(); if (r.width < 8 || r.height < 8) return; const s = getComputedStyle(b); if (s.visibility === 'hidden' || +s.opacity < .05 || b.disabled) return; const t = (b.getAttribute('aria-label') || b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40); if (/close|schlie|cerrar|back to home|zurück|volver|delete|lösch|borrar|remove|entfern|share|teilen|compartir/i.test(t)) return; b.setAttribute('data-hk', 'k' + i); out.push({ k: 'k' + i, t, inSheet: !!top }); }); return out.slice(0, 24); });
  const tapK = async (k, w) => {
    const loc = P.locator(`[data-hk="${k}"]`).first(); if (!(await loc.count())) return 'gone';
    await loc.evaluate(e => e.scrollIntoView({ block: 'center' })).catch(() => { }); await H.sleep(350);
    const cover = await loc.evaluate(e => { const r = e.getBoundingClientRect(); if (!r.width) return 'zero size'; const x = r.left + r.width / 2, y = r.top + r.height / 2; if (y > innerHeight || y < 0) return 'off screen y=' + Math.round(y); const t = document.elementFromPoint(x, y); return t && (t === e || e.contains(t) || t.contains(e)) ? '' : 'covered by ' + (t ? (t.id || String(t.className.baseVal != null ? t.className.baseVal : t.className).slice(0, 40) || t.tagName) : 'nothing'); }).catch(() => 'gone');
    if (cover) return cover;
    await R.tapEl(loc).catch(e => 'tapfail ' + e.message); await H.sleep(1500); await errs(w); return '';
  };
  await reset(); await check('cook tab');
  const top = await btns(); console.log('TOP', JSON.stringify(top.map(b => b.t)));
  for (const b of top) {
    await reset(); const all = await btns(); const me = all.find(x => x.t === b.t); if (!me) { console.log('skip (not found again)', b.t); continue; }
    const base = await st();
    const c = await tapK(me.k, b.t); if (c) { await note('cannot tap', { w: b.t, c }); continue; }
    const a = await check(b.t); if (!a) { await reset(); continue; }
    const opened = a.sheets.length > base.sheets.length;
    console.log('>', b.t, 'sheets', JSON.stringify(a.sheets));
    if (opened) {
      const inner = (await btns()).filter(x => x.inSheet); console.log('   inner', JSON.stringify(inner.map(x => x.t)));
      for (const ib of inner.slice(0, 10)) {
        const before = await st(); const cur = (await btns()).find(x => x.t === ib.t); if (!cur) continue;
        const c2 = await tapK(cur.k, b.t + ' > ' + ib.t); if (c2) { if (!/zero size/.test(c2)) await note('cannot tap', { w: b.t + ' > ' + ib.t, c: c2 }); continue; }
        const a2 = await check(b.t + ' > ' + ib.t); if (!a2) break;
        if (a2.sheets.length > before.sheets.length || a2.sheets.join() !== before.sheets.join()) {
          console.log('     >>', ib.t, JSON.stringify(a2.sheets));
          await P.evaluate(() => history.back()); await H.sleep(1400); await errs('back ' + ib.t);
          const a3 = await check('back from ' + b.t + ' > ' + ib.t); if (!a3) break;
          if (a3.sheets.length > before.sheets.length) await note('back left extra sheet', { w: b.t + ' > ' + ib.t, before: before.sheets, after: a3.sheets });
          if (!a3.sheets.length && before.sheets.length) { console.log('     (back closed whole stack)'); break; }
        }
      }
      await P.evaluate(() => history.back()); await H.sleep(1400); await errs('back ' + b.t);
      const z = await check('back from ' + b.t); if (z && z.sheets.length > base.sheets.length) await note('back left sheet', { w: b.t, sheets: z.sheets });
    }
  }
  /* reload in the middle of a recipe */
  await reset(); const t2 = (await btns()).find(x => /All recipes|Alle Rezepte|Todas las recetas/i.test(x.t)); if (t2) { await tapK(t2.k, 'all recipes'); const r1 = (await btns()).filter(x => x.inSheet)[3]; if (r1) { await tapK(r1.k, 'recipe ' + r1.t); console.log('recipe opened', r1.t, JSON.stringify((await st()).sheets)); } await P.reload({ waitUntil: 'load' }).catch(() => { }); await H.sleep(6000); e0 = R.errs.length; const rl = await check('after reload in recipe'); console.log('after reload', rl && JSON.stringify(rl.sheets)); }
  console.log('SUMMARY', JSON.stringify({ device, lang, theme, build, crashed: R.crashed, errs: R.errs.length, finds: finds.map(f => f.kind + ': ' + f.w) }));
  await R.close();
})().catch(e => { console.error('BROKEN', e && e.stack || e); process.exit(2); });
