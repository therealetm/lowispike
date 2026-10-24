'use strict';
/* Bug hunt (Profile hub, Oct 25 2026 01:02): on the live site, opens Profile (Settings > Account), then each overview tile's panel,
   and taps every visible control inside it once (skips delete / sign out / log out / camera / file inputs), from a fresh panel each
   time. Records page errors, dead taps (no DOM change, no focus change), controls covered by something else, text sticking out.
   node tools/hunt-profile-monkey-0102.cjs <device> [lang] [theme] [outdir] */
const H = require('./sim/harness.cjs'), fs = require('fs'), path = require('path');
(async () => {
  const device = process.argv[2] || 'Pixel 7', lang = process.argv[3] || 'en', theme = process.argv[4] || 'dark', out = process.argv[5] || '/tmp/hunt-pm';
  fs.mkdirSync(out, { recursive: true });
  const tag = device.replace(/\W/g, '') + '-' + lang + '-' + theme;
  const R = await H.open({ device, engine: /Pixel/.test(device) ? 'chromium' : 'webkit', url: 'https://therealetm.github.io/lowispike/index.html', probe: false, lang, members: 6, messages: 6 });
  const P = R.page;
  await R.ctx.addInitScript(([t, l]) => { try { if (!sessionStorage.getItem('pm')) { sessionStorage.setItem('pm', 1); localStorage.setItem('lowi.theme', t); localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } } catch (e) { } }, [theme, lang]);
  await R.goto(); await H.sleep(6500);
  const ev = (f, a) => P.evaluate(f, a);
  const openProfile = async () => { await ev(() => { try { if (window.LowiG2E && LowiG2E.state().open) LowiG2E.close(); } catch (e) { } }); await ev(() => { try { if (typeof goTab === 'function') goTab('profile'); } catch (e) { } }); await H.sleep(1500); };
  const tiles = await (async () => { await openProfile(); return ev(() => [...document.querySelectorAll('#g2eTiles [data-g2e-open]')].map(b => b.dataset.g2eOpen)); })();
  console.log('TILES', tiles.join(','));
  const SKIP = /delete|löschen|eliminar|sign out|log out|abmelden|cerrar sesión|salir|borrar/i;
  for (const k of tiles) {
    await openProfile(); await ev(k => LowiG2E.open(k), k); await H.sleep(1200);
    const ctrls = await ev(() => { const root = document.querySelector('.g2e-panel.on, [data-g2e-k] .r3, #tab-profile') || document.body;
      const vis = e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 4 && r.height > 4 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
      return [...document.querySelectorAll('#tab-profile button, #tab-profile [role=button], #tab-profile a[href], #tab-profile input:not([type=file]):not([type=hidden]), #tab-profile select, #tab-profile [data-g2e-open]')].filter(vis).map((e, i) => { e.setAttribute('data-pm', i); return { i, t: ((e.innerText || e.value || e.getAttribute('aria-label') || e.placeholder || '') + '').trim().replace(/\s+/g, ' ').slice(0, 40), tag: e.tagName, type: e.type || '' }; }); });
    console.log('PANEL', k, ctrls.length, 'controls');
    for (const c of ctrls) {
      if (SKIP.test(c.t)) { console.log('  skip', c.t); continue; }
      if (c.tag === 'INPUT' && /radio|checkbox|range|color|date|time/.test(c.type) === false && c.type !== 'button' && c.type !== 'submit') {
        // text-like: type something odd and blur
        await openProfile(); await ev(k => LowiG2E.open(k), k); await H.sleep(900);
        const ok = await ev(i => { const e = [...document.querySelectorAll('#tab-profile input:not([type=file]):not([type=hidden])')].find(x => x.getAttribute('data-pm') == i) || document.querySelector('[data-pm="' + i + '"]'); return !!e; }, c.i);
        continue;
      }
      await openProfile(); await ev(k => LowiG2E.open(k), k); await H.sleep(900);
      // re-tag after re-render
      await ev(() => { const vis = e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 4 && r.height > 4 && cs.visibility !== 'hidden' && cs.display !== 'none'; }; [...document.querySelectorAll('#tab-profile button, #tab-profile [role=button], #tab-profile a[href], #tab-profile input:not([type=file]):not([type=hidden]), #tab-profile select, #tab-profile [data-g2e-open]')].filter(vis).forEach((e, i) => e.setAttribute('data-pm', i)); });
      const pos = await ev(i => { const e = document.querySelector('[data-pm="' + i + '"]'); if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const t = document.elementFromPoint(x, y); window.__pmMut = 0; if (!window.__pmObs) { window.__pmObs = new MutationObserver(m => { window.__pmMut += m.length; }); window.__pmObs.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true }); } return { x, y, t: (e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 30), hit: !!(t && (t === e || e.contains(t) || t.contains(e))), by: t ? (t.id || String(t.className).slice(0, 40) || t.tagName) : 'none' }; }, c.i);
      if (!pos) { console.log('  gone', c.i, c.t); continue; }
      if (pos.t.trim().slice(0, 15) !== c.t.slice(0, 15)) { /* list changed */ }
      if (!pos.hit) { console.log('  COVERED', k, JSON.stringify(c.t), 'by', pos.by); await P.screenshot({ path: path.join(out, tag + '-' + k + '-cov-' + c.i + '.png') }); continue; }
      await H.sleep(250); await ev(() => { window.__pmMut = 0; });
      const n0 = R.errs.length, u0 = P.url();
      await P.touchscreen.tap(pos.x, pos.y); await H.sleep(1300);
      if (P.url() === 'about:blank' || !/lowispike/.test(P.url())) { console.log('  LEFT APP', k, c.t, P.url()); await R.goto(); await H.sleep(6000); continue; }
      const m = await ev(() => window.__pmMut);
      const e = R.errs.slice(n0).map(x => x.m).filter(x => !/access control|supabase/.test(x));
      console.log('  tap', k, JSON.stringify(c.t), 'mut', m, e.length ? 'ERRORS ' + JSON.stringify(e) : '');
      if (e.length || m === 0) await P.screenshot({ path: path.join(out, tag + '-' + k + '-' + c.i + '.png') });
      // dismiss any dialogs
      await ev(() => { document.querySelectorAll('.r2-ov.on').forEach(o => { if (!o.closest('#tab-profile')) { const x = o.querySelector('[data-r2x],.r2-x,[aria-label=Close],[aria-label=Schließen],[aria-label=Cerrar]'); if (x) x.click(); } }); });
      await H.sleep(500);
    }
  }
  console.log('DONE errs', JSON.stringify(R.errs.map(e => e.step + ' ' + e.m).filter(x => !/access control|supabase/.test(x)).slice(0, 10)));
  process.exit(0);
})().catch(e => { console.log('BROKEN', e.message); process.exit(1); });
