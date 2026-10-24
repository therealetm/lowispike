'use strict';
/* Bug hunt 24 Oct 21:02: slow, careful checks of the Cook tiles the fast crawl flagged (My Recipe Book, By ingredient,
   LOWiSPIKE GPT, All recipes). Opens each tile by a real tap, waits for the sheet to settle, lists the controls a finger
   can reach, taps the first real control inside, then goes back (history.back = swipe back) twice with long waits.
   node tools/hunt-cook-book-2102.cjs <device> [url|root] [lang] [theme] */
const H = require('./sim/harness.cjs');
(async () => {
  const device = process.argv[2] || 'iPhone 15', where = process.argv[3] || 'https://therealetm.github.io/lowispike/index.html';
  const lang = process.argv[4] || 'en', theme = process.argv[5] || 'dark';
  const o = { device, engine: 'webkit', members: 6, messages: 6, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page;
  await R.ctx.addInitScript(([t, l]) => { try { localStorage.setItem('lowi.theme', t); localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, [theme, lang]);
  await R.goto(); await H.sleep(5000);
  const build = await P.evaluate(() => (document.querySelector('meta[name=lowi-build]') || {}).content || null);
  const sheets = () => P.evaluate(() => [...document.querySelectorAll('.r2-ov.on, [role=dialog]')].filter(e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && +s.opacity > .05; }).map(e => e.id || String(e.className).split(' ').slice(0, 3).join('.')));
  const reach = () => P.evaluate(() => { const top = [...document.querySelectorAll('.r2-ov.on')].pop(); if (!top) return []; return [...top.querySelectorAll('button,[role=button],a[href],[data-ck],[data-act]')].map((b, i) => { const r = b.getBoundingClientRect(); if (r.width < 4 || r.height < 4) return null; b.setAttribute('data-bk', 'b' + i); const x = r.left + r.width / 2, y = r.top + r.height / 2; const t = document.elementFromPoint(x, y); const ok = !!t && (t === b || b.contains(t) || t.contains(b)); return { k: 'b' + i, t: (b.getAttribute('aria-label') || b.textContent || '').replace(/[ \n\t]+/g, ' ').trim().slice(0, 40), ok, y: Math.round(y), cover: ok ? '' : (t ? (t.id || String(t.className).slice(0, 30)) : 'none') }; }).filter(Boolean); });
  const reset = async () => { await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } try { goTab('shelf'); } catch (e) { } const t = document.getElementById('tab-shelf'); if (t) t.scrollTop = 0; }); await H.sleep(1500); };
  const tile = async (re) => { const l = P.locator('#tab-shelf button, #tab-shelf [role=button], #tab-shelf [data-ck]').filter({ hasText: re }).first(); if (!(await l.count())) return false; await l.evaluate(e => e.scrollIntoView({ block: 'center' })); await H.sleep(500); await R.tapEl(l); return true; };
  const out = [], vh = (P.viewportSize() || { height: 800 }).height;
  const T = [['book', /My Recipe Book|Mein Rezeptbuch|Mi recetario/], ['ingr', /By ingredient|Nach Zutat|Por ingrediente/], ['gpt', /LOWiSPIKE GPT/], ['all', /All recipes|Alle Rezepte|Todas las recetas/]];
  for (const [name, re] of T) {
    await reset(); const e0 = R.errs.length;
    if (!(await tile(re))) { out.push({ name, missing: true }); continue; }
    await H.sleep(3000);
    const s1 = await sheets(), r1 = await reach();
    const blocked = r1.filter(x => !x.ok && x.y > 0 && x.y < vh);
    await R.shot('/tmp/hunt2102/book-' + name + '-' + device.replace(/[^a-z0-9]/gi, '') + '-' + lang + '.png');
    const first = r1.find(x => x.ok && !/close|schlie|cerrar/i.test(x.t) && x.t !== '×');
    let afterTap = null;
    if (first) { await R.tapEl(P.locator('[data-bk="' + first.k + '"]').first()).catch(() => { }); await H.sleep(2500); afterTap = await sheets(); await P.evaluate(() => history.back()); await H.sleep(3500); }
    const afterBack1 = await sheets();
    await P.evaluate(() => history.back()); await H.sleep(4000);
    const afterBack2 = await sheets(), inApp = await P.evaluate(() => !!document.getElementById('whPad')).catch(() => false);
    out.push({ name, opened: s1, controls: r1.length, blockedOnScreen: blocked.slice(0, 6), tapped: first && first.t, afterTap, afterBack1, afterBack2, inApp, errs: R.errs.slice(e0) });
  }
  console.log(JSON.stringify({ device, lang, theme, build, crashed: R.crashed, out }, null, 1));
  await R.close();
})().catch(e => { console.error('BROKEN', e && e.stack || e); process.exit(2); });
