/* Run 28 (P-ORB-UNDER-FINGER / P-FRESH-SCRIM hunter): a seeded monkey taps visible controls all over the app. An in-page detector
   records every trusted tap point; when that tap adds or reveals UI, it samples elementFromPoint at the same point 0/60/150/300 ms
   later. If a DIFFERENT interactive control (button, link, role=button, input, [data-*] chip) that was not under the finger before the
   tap now sits there, it logs UNDER: opener -> control @ms. That is what a quick 2nd tap / double tap would press.
   node probe-under-finger.cjs <url> [view] [steps] [seed]    env RM=1 (Reduce Motion: everything at rest from frame 0) */
'use strict';
const L = require('./lib.cjs');
(async () => {
  const url = process.argv[2] || 'https://therealetm.github.io/lowispike/'; const view = process.argv[3] || 'chromium390';
  const STEPS = +(process.argv[4] || 120), SEED = +(process.argv[5] || 28);
  const rnd = L.mulberry32(SEED);
  const h = await L.open({ url, view, reducedMotion: !!process.env.RM, lang: process.env.LANG2 || 'en', preInit: "try{localStorage.setItem('lowi.tutorial.done','1')}catch(e){}",
    ctxHook: process.env.MOCK ? async ctx => { const WT = require('fs').readFileSync('/home/sprite/BUGHUNT/.wt', 'utf8').trim(); return require(WT + '/tools/sim/mock-cloud.cjs').install(ctx, { members: 30, messages: 20, me: 'Fixture' }); } : null });
  const page = h.page;
  await page.waitForFunction(() => document.getElementById('whPad') && document.querySelectorAll('[data-orbit]').length >= 8, null, { timeout: 120000 }).catch(() => {});
  await L.sleep(5000);
  await page.evaluate(a => { window.__ALL = a; }, !!process.env.ALL);
  await page.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot'); try { LowiR2.closeAll(); } catch (e) {}
    const IA = 'button,a[href],[role=button],[role=tab],[role=option],[role=menuitem],[role=switch],[role=checkbox],input,select,textarea,label,[onclick],[data-orbit],[data-act],[data-id][tabindex],[tabindex="0"]';
    const ctl = e => e && e.closest ? e.closest(IA) : null;
    const nm = e => { if (!e) return '-'; const t = (e.getAttribute('aria-label') || e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 28); return e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '') + (t ? ' "' + t + '"' : ''); };
    window.__nmc = nm; window.__ctl = ctl; window.__under = []; let seq = 0;
    addEventListener('pointerdown', e => { if (!e.isTrusted || e.isPrimary === false) return; const x = e.clientX, y = e.clientY; const my = ++seq;
      const before = new Set(document.elementsFromPoint(x, y).map(ctl).filter(Boolean)); const opener = ctl(e.target);
      let changed = false; const mo = new MutationObserver(() => { changed = true; }); mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'style', 'aria-hidden'] });
      setTimeout(() => mo.disconnect(), 450);
      for (const d of [0, 60, 150, 300]) setTimeout(() => { if (my !== seq && d > 0) return; const top = document.elementFromPoint(x, y); const c = ctl(top);
        if (!c || c === opener || before.has(c) || !changed) return; if (opener && (opener.contains(c) || c.contains(opener))) return;
        const base = e2 => e2 ? (e2.tagName + '.' + (typeof e2.className === 'string' ? e2.className.trim().split(/\s+/)[0] : '')) : ''; if (opener && base(opener) === base(c) && !window.__ALL) return;
        const cs = getComputedStyle(c); if (cs.pointerEvents === 'none' || c.disabled) return;
        window.__under.push({ opener: nm(opener), under: nm(c), ms: d, op: +(parseFloat(getComputedStyle(top).opacity) || 0).toFixed(2), x: Math.round(x), y: Math.round(y) }); }, 120 + d);
    }, true); });
  const BAD = /delete|remove|sign ?out|log ?out|reset|erase|wipe|löschen|entfernen|abmelden|borrar|eliminar|cerrar sesión|report|block|melden|unfriend|install|share|teilen|compartir|download|camera|kamera|cámara|photo|foto|upload|copy link|mailto|tel:/i;
  const reset = async () => { for (let i = 0; i < 2; i++) { await page.keyboard.press('Escape'); await L.sleep(250); } await page.evaluate(() => { try { LowiR2.closeAll(); } catch (e) {} try { LowiHomeBloomsV2.close && LowiHomeBloomsV2.close(); } catch (e) {} }); await L.sleep(600);
    const tabs = (process.env.TABS || 'home,home,foryou,scan,fuel,misty').split(','); const t = tabs[Math.floor(rnd() * tabs.length)]; await page.evaluate(t => { try { if (t === 'misty') { goTab('home'); LowiWorldHome.openMisty('aura'); } else goTab(t); } catch (e) {} }, t); await L.sleep(1200); return t; };
  let tab = await reset(); const seen = new Map();
  for (let s = 0; s < STEPS; s++) {
    if (s % 7 === 6) tab = await reset();
    const cands = await page.evaluate(BADs => { const BAD = new RegExp(BADs, 'i'); const IA = 'button,[role=button],[role=tab],[data-orbit],[data-act],a[href^="#"],[onclick]';
      return [...document.querySelectorAll(IA)].map(e => { const r = e.getBoundingClientRect(); if (r.width < 8 || r.height < 8 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return null;
        const x = Math.min(innerWidth - 2, Math.max(2, r.left + r.width / 2)), y = Math.min(innerHeight - 2, Math.max(2, r.top + r.height / 2)); const top = document.elementFromPoint(x, y); if (!top || !(top === e || e.contains(top))) return null;
        const label = (e.getAttribute('aria-label') || e.textContent || '') + ' ' + (e.getAttribute('href') || '') + ' ' + (e.id || ''); if (BAD.test(label)) return null; return { x, y, n: window.__nmc(e) }; }).filter(Boolean); }, BAD.source);
    if (!cands.length) { tab = await reset(); continue; }
    const c = cands[Math.floor(rnd() * cands.length)];
    await L.tap(h, c.x, c.y); await L.sleep(700 + Math.floor(rnd() * 500));
    const u = await page.evaluate(() => window.__under.splice(0));
    for (const r of u) { const k = r.opener + ' -> ' + r.under; if (!seen.has(k)) { seen.set(k, r); console.log('UNDER ' + JSON.stringify(Object.assign({ step: s, tab }, r))); } }
    if (s % 20 === 19) { const e = await L.snap(h); if (e.err.length || e.rej.length) console.log('ERR step ' + s + ' ' + JSON.stringify(e)); }
  }
  const e = await L.snap(h); console.log('DONE pairs ' + seen.size + ' errors ' + JSON.stringify(e.err.concat(e.rej, h.log.pageerror).slice(0, 10)));
  await h.browser.close();
})();
