'use strict';
/* Bug hunt (Scan): type barcodes like a shopper in the Scan sheet on the live site, press Check, and look at what comes back:
   real products from Open Food Facts (live GET), unknown numbers, letters, too short, spaces, empty. Then tap every control in
   the result. Records page errors, crashes, overflow, cut-off text, dead controls and untranslated text, with screenshots.
   node tools/hunt-scan-barcode.cjs <device> [url] [outdir] [theme dark|light] [lang en|de|es] */
const H = require('./sim/harness.cjs'), fs = require('fs'), path = require('path');
(async () => {
  const device = process.argv[2] || 'iPhone 13', where = process.argv[3] || 'https://therealetm.github.io/lowispike/index.html';
  const out = process.argv[4] || '/tmp/hunt-bc', theme = process.argv[5] || 'dark', lang = process.argv[6] || 'en';
  fs.mkdirSync(out, { recursive: true });
  const o = { device, engine: 'webkit', members: 10, messages: 20, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page, tag = device.replace(/\W/g, '') + '-' + theme + '-' + lang;
  await R.ctx.route(u => /(^|\.)openfoodfacts\.org$/.test(new URL(u).host), r => r.request().method() === 'GET' ? r.continue() : r.abort());
  await R.ctx.addInitScript(([t, l]) => { try { localStorage.setItem('lowi.theme', t); localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, [theme, lang]);
  R.step = 'load'; await R.goto(); await H.sleep(5000);
  const build = await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || null);
  const findings = [];
  const note = async (kind, info) => { const f = path.join(out, tag + '-' + findings.length + '.png'); await R.shot(f); findings.push(Object.assign({ kind, shot: f }, info)); console.log('FIND', kind, JSON.stringify(info)); };
  const reset = async () => { for (let i = 0; i < 3; i++) { await P.keyboard.press('Escape').catch(() => { }); await H.sleep(100); } await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } try { goTab('home'); } catch (e) { } }); await H.sleep(900); };
  const openScan = async () => { await reset(); for (let i = 0; i < 3; i++) { const sc = await P.evaluate(() => { const e = document.querySelector('[data-orbit="scan"]'); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }); if (sc) { await P.touchscreen.tap(sc[0], sc[1]); if (await P.waitForFunction(() => { const e = document.getElementById('b3Cam'); return e && e.getBoundingClientRect().height > 0; }, null, { timeout: 8000 }).then(() => true, () => false)) { await H.sleep(800); return true; } } await H.sleep(1200); } return false; };
  const layout = () => P.evaluate(() => {
    const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05; };
    const sheets = [...document.querySelectorAll('.r2-ov:not(.off), [role=dialog]')].filter(vis); const top = sheets[sheets.length - 1] || document.body;
    const wide = [...top.querySelectorAll('*')].filter(e => vis(e) && e.getBoundingClientRect().right > innerWidth + 2 && getComputedStyle(e).position !== 'fixed' && !e.closest('[style*="overflow"],.hscroll')).slice(0, 4).map(e => (e.className || e.tagName).toString().slice(0, 40) + ':' + (e.innerText || '').trim().slice(0, 30));
    const cut = [...top.querySelectorAll('button,h1,h2,h3,.b3-t,p,span,div')].filter(e => vis(e) && e.children.length === 0 && e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflow === 'hidden' && getComputedStyle(e).textOverflow !== 'ellipsis').slice(0, 4).map(e => (e.innerText || '').trim().slice(0, 40));
    return { top: top.id || String(top.className).slice(0, 50), text: (top.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 600), wide, cut, overflow: document.documentElement.scrollWidth - innerWidth };
  });
  const ALL = [['3017620422003', 'Nutella (real)'], ['5449000000996', 'Coca-Cola (real)'], ['4006040000000', 'example from placeholder'], ['40084107', 'EAN-8'], ['3017 6204 22003', 'with spaces'], ['abc123', 'letters'], ['123', 'too short'], ['', 'empty'], ['99999999999999999999', 'too long']];
  const CASES = process.env.ONLY ? ALL.filter(c => c[1].startsWith(process.env.ONLY)) : ALL;
  for (const [code, what] of CASES) {
    if (!await openScan()) { await note('cannot open scan', { what }); continue; }
    const e0 = R.errs.length; R.step = 'barcode ' + what;
    const inp = P.locator('#b3Cam input').first();
    if (!await inp.count()) { await note('no barcode field', { what }); continue; }
    const visIn = await inp.isVisible().catch(() => false);
    if (!visIn) { const t = P.locator('#b3Cam').getByText(/Type the number|Nummer eingeben|Escribe el n|Nummer tippen|número/i).first(); if (await t.count()) { await R.tapEl(t).catch(() => { }); await H.sleep(500); } }
    await inp.tap().catch(() => { }); await inp.fill('').catch(() => { }); if (code) await P.keyboard.type(code, { delay: 30 });
    const btn = P.locator('#b3Cam button').filter({ hasText: /^(Check|Prüfen|Comprobar|Search|Suchen|Buscar)/i }).first();
    let how = 'button'; if (await btn.count()) await R.tapEl(btn).catch(() => { how = 'enter'; }); else { how = 'enter'; await P.keyboard.press('Enter'); }
    await H.sleep(code.length > 6 ? 9000 : 2500);
    if (R.crashed) { await note('crash', { what }); break; }
    const L = await layout();
    console.log(`CASE ${what} [${code}] via ${how} -> ${L.top}: ${L.text.slice(0, 260)}`);
    await R.shot(path.join(out, tag + '-case-' + what.replace(/\W+/g, '_') + '.png'));
    if (R.errs.length > e0) await note('error', { what, errs: R.errs.slice(e0) });
    if (L.overflow > 2 || L.wide.length) await note('overflow', { what, px: L.overflow, wide: L.wide });
    if (L.cut.length) await note('cut off', { what, cut: L.cut });
    if (lang !== 'en' && /\b(Check|Close|Type the number|Not found|Try again|Add|Catch|Log)\b/.test(L.text)) await note('english in ' + lang, { what, text: L.text.slice(0, 300) });
    if (/undefined|NaN|null|\[object/.test(L.text)) await note('broken text', { what, text: L.text.slice(0, 300) });
    /* for the first real product, tap every control in the result */
    if (code === '3017620422003') {
      const ctrls = await P.evaluate(() => { const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 4 && r.height > 4 && s.visibility !== 'hidden' && s.display !== 'none'; }; const sheets = [...document.querySelectorAll('.r2-ov:not(.off), [role=dialog]')].filter(vis); const top = sheets[sheets.length - 1]; if (!top) return []; return [...top.querySelectorAll('button,[role=button],a[href]')].filter(vis).map((b, i) => { b.setAttribute('data-hr', 'r' + i); return { h: 'r' + i, label: (b.getAttribute('aria-label') || b.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 50), w: Math.round(b.getBoundingClientRect().width), hh: Math.round(b.getBoundingClientRect().height) }; }); });
      console.log('  result controls', JSON.stringify(ctrls));
      ctrls.filter(c => c.w < 30 || c.hh < 30).forEach(c => console.log('  small control', JSON.stringify(c)));
      for (const c of ctrls) {
        if (/share|teilen|compartir|delete|löschen/i.test(c.label)) continue;
        const loc = P.locator(`[data-hr="${c.h}"]`).first(); if (!await loc.count() || !await loc.isVisible().catch(() => false)) { console.log('  gone', c.label); continue; }
        const before = await layout(); const e1 = R.errs.length; R.step = 'result ' + c.label;
        await loc.evaluate(e => e.scrollIntoView({ block: 'center' })).catch(() => { }); await H.sleep(250);
        const cover = await loc.evaluate(e => { const r = e.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return t && (t === e || e.contains(t)) ? '' : 'covered by ' + (t ? (t.id || String(t.className).slice(0, 40)) : 'nothing'); }).catch(() => 'gone');
        if (cover) { await note('cannot tap result control', { label: c.label, why: cover }); continue; }
        await R.tapEl(loc).catch(() => { }); await H.sleep(1800);
        if (R.crashed) { await note('crash', { label: c.label }); break; }
        const after = await layout();
        console.log(`  tap ${c.label} -> ${after.top}: ${after.text.slice(0, 160)}`);
        await R.shot(path.join(out, tag + '-res-' + c.label.replace(/\W+/g, '_').slice(0, 20) + '.png'));
        if (R.errs.length > e1) await note('error', { label: c.label, errs: R.errs.slice(e1) });
        if (after.overflow > 2 || after.wide.length) await note('overflow', { label: c.label, wide: after.wide });
        if (after.text === before.text && after.top === before.top) await note('dead tap (result)', { label: c.label });
        if (/undefined|NaN|\[object/.test(after.text)) await note('broken text', { label: c.label, text: after.text.slice(0, 300) });
        if (after.top !== before.top || after.text.slice(0, 40) !== before.text.slice(0, 40)) {
          /* something opened on top: go back with the X like a user, and get the result back if the X closed it too */
          const x = P.locator('#whX'); if (await x.count() && await x.isVisible().catch(() => false)) { await R.tapEl(x).catch(() => { }); await H.sleep(1200); }
          const back = await layout(); console.log('    X ->', back.top, back.text.slice(0, 60));
          if (!/Nutella/.test(back.text)) { if (!await openScan()) break; await P.locator('#b3Cam input').first().tap().catch(() => { }); await P.keyboard.type(code, { delay: 20 }); await P.keyboard.press('Enter'); await H.sleep(8000);
            await P.evaluate(() => { const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 4 && r.height > 4 && s.visibility !== 'hidden' && s.display !== 'none'; }; const sheets = [...document.querySelectorAll('.r2-ov:not(.off), [role=dialog]')].filter(vis); const top = sheets[sheets.length - 1]; if (!top) return; [...top.querySelectorAll('button,[role=button],a[href]')].filter(vis).forEach((b, i) => b.setAttribute('data-hr', 'r' + i)); }); }
        }
      }
    }
  }
  console.log(JSON.stringify({ device, theme, lang, build, crashed: R.crashed, errs: R.errs, findings }, null, 1));
  await R.close();
})().catch(e => { console.error('BROKEN', e && e.stack || e); process.exit(2); });
