/* Run 40 (P-CLOSE-UNDER-FINGER / P-CLOSING-STILL-LIVE hunter): a seeded monkey DOUBLE taps visible controls inside open sheets,
   panels and blooms (anything above the page). An in-page recorder logs every trusted click that reaches the page (fresh-scrim
   swallows the guarded ones before us) with its target control and the overlay it sits in. A finding is a double tap where:
   - CLOSEUNDER: the 1st click closed its overlay and the 2nd click pressed a different control outside that overlay, or
   - TWICE: the 1st click closed its overlay and the 2nd click pressed the same control again in the closing overlay.
   node probe-close-under.cjs <url|dir> [view] [steps] [seed] [gap]   env RM=1, MOCK=1 (mock cloud), TABS=home,fuel,... */
'use strict';
const L = require('./lib.cjs');
(async () => {
  let url = process.argv[2] || 'https://therealetm.github.io/lowispike/', srv = null; if (!/^https?:/.test(url)) { srv = await L.serve(url); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const view = process.argv[3] || 'chromium390', STEPS = +(process.argv[4] || 60), SEED = +(process.argv[5] || 40), GAP = +(process.argv[6] || 150);
  const rnd = L.mulberry32(SEED);
  const h = await L.open({ url, view, reducedMotion: !!process.env.RM, lang: process.env.LANG2 || 'en', preInit: "try{localStorage.setItem('lowi.tutorial.done','1')}catch(e){}",
    ctxHook: process.env.MOCK ? async ctx => { const WT = require('fs').readFileSync('/home/sprite/BUGHUNT/.wt', 'utf8').trim(); return require(WT + '/tools/sim/mock-cloud.cjs').install(ctx, { members: 30, messages: 20, me: 'Fixture' }); } : null });
  const page = h.page;
  await page.waitForFunction(() => document.getElementById('whPad') && document.querySelectorAll('[data-orbit]').length >= 8, null, { timeout: 120000 }).catch(() => {});
  await L.sleep(5000);
  await page.evaluate(() => { const g = document.getElementById('r2gate'); if (g) g.remove(); document.documentElement.classList.remove('gate-boot'); try { LowiR2.closeAll(); } catch (e) {}
    const IA = 'button,a[href],[role=button],[role=tab],[role=option],[role=menuitem],[role=switch],[role=checkbox],input,select,textarea,label,[onclick],[data-orbit],[data-act],[tabindex="0"]';
    const ctl = e => e && e.closest ? e.closest(IA) : null;
    const nm = e => { if (!e) return '-'; const t = (e.getAttribute('aria-label') || e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 26); return e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '') + (t ? ' "' + t + '"' : ''); };
    /* the overlay a node sits in: the nearest body child that is position fixed (a sheet, panel, bloom, world) */
    const ovOf = e => { for (let n = e; n && n !== document.body; n = n.parentNode) { if (n.parentNode === document.body) { const cs = getComputedStyle(n); return cs.position === 'fixed' || cs.position === 'absolute' ? n : null; } } return null; };
    const gone = ov => { if (!ov || !ov.isConnected) return true; const cs = getComputedStyle(ov); if (cs.display === 'none' || cs.visibility === 'hidden' || ov.hidden) return true; return /(^|\s)(off|out|closing)(\s|$)/.test(ov.className) || !/(^|\s)(on|open|show)(\s|$)/.test(ov.className) && ov.getAttribute('aria-hidden') === 'true'; };
    window.__nmc = nm; window.__ovOf = ovOf; window.__ck = [];
    document.addEventListener('click', e => { if (!e.isTrusted) return; const c = ctl(e.target), ov = ovOf(e.target); window.__ck.push({ t: Math.round(e.timeStamp), c, n: nm(c), ov, ovn: nm(ov) }); }, true);
    window.__gone = gone; });
  const BAD = /delete|remove|sign ?out|log ?out|reset|erase|wipe|löschen|entfernen|abmelden|borrar|eliminar|cerrar sesión|report|block|melden|unfriend|install|share|teilen|compartir|download|camera|kamera|cámara|photo|foto|snap|upload|copy link|mailto|tel:|deep analy|chatgpt|ko-fi|kofi/i;
  const reset = async () => { for (let i = 0; i < 2; i++) { await page.keyboard.press('Escape'); await L.sleep(250); } await page.evaluate(() => { try { LowiR2.closeAll(); } catch (e) {} try { LowiHomeBloomsV2.close && LowiHomeBloomsV2.close(true); } catch (e) {} try { closeSheet(); } catch (e) {} }); await L.sleep(600);
    const tabs = (process.env.TABS || 'home,home,foryou,scan,fuel,misty').split(','); const t = tabs[Math.floor(rnd() * tabs.length)]; await page.evaluate(t => { try { if (t === 'misty') { goTab('home'); LowiWorldHome.openMisty('aura'); } else goTab(t); } catch (e) {} }, t); await L.sleep(1200); return t; };
  let tab = await reset(); const seen = new Map(); let bad = 0, dbl = 0;
  for (let s = 0; s < STEPS; s++) {
    if (s % 8 === 7) tab = await reset();
    /* candidates: visible, top-hit controls; prefer ones inside an overlay (a chooser) */
    const cands = await page.evaluate(BADs => { const BAD = new RegExp(BADs, 'i'); const IA = 'button,[role=button],[role=tab],[role=option],[role=menuitem],[data-orbit],[data-act],a[href^="#"],[onclick]';
      return [...document.querySelectorAll(IA)].map(e => { const r = e.getBoundingClientRect(); if (r.width < 8 || r.height < 8 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) return null;
        const x = Math.min(innerWidth - 2, Math.max(2, r.left + r.width / 2)), y = Math.min(innerHeight - 2, Math.max(2, r.top + r.height / 2)); const top = document.elementFromPoint(x, y); if (!top || !(top === e || e.contains(top))) return null;
        const label = (e.getAttribute('aria-label') || e.textContent || '') + ' ' + (e.getAttribute('href') || '') + ' ' + (e.id || ''); if (BAD.test(label)) return null; return { x, y, n: window.__nmc(e), inOv: !!window.__ovOf(e) }; }).filter(Boolean); }, BAD.source);
    if (!cands.length) { tab = await reset(); continue; }
    const inOv = cands.filter(c => c.inOv); const pool = inOv.length && rnd() < 0.8 ? inOv : cands;
    const c = pool[Math.floor(rnd() * pool.length)];
    await page.evaluate(() => { window.__ck.length = 0; });
    if (h.touch) { await page.touchscreen.tap(c.x, c.y); await L.sleep(GAP); await page.touchscreen.tap(c.x, c.y); } else { await page.mouse.click(c.x, c.y); await L.sleep(GAP); await page.mouse.click(c.x, c.y); }
    await L.sleep(900 + Math.floor(rnd() * 400));
    const r = await page.evaluate(() => { const k = window.__ck.splice(0); if (k.length < 2) return { n: k.length, a: k[0] && k[0].n };
      const [a, b] = k; const closed = window.__gone(a.ov) || (a.c && !a.c.isConnected);
      return { n: k.length, a: a.n, aov: a.ovn, b: b.n, bov: b.ovn, gap: b.t - a.t, closed, same: a.c === b.c || a.n === b.n, sameOv: a.ov && a.ov === b.ov }; });
    if (r.n >= 2) dbl++;
    let kind = null;
    if (r.n >= 2 && r.closed && r.aov !== '-') { if (!r.sameOv && !r.same) kind = 'CLOSEUNDER'; else if (r.same) kind = 'TWICE'; }
    if (kind) { const key = kind + ' ' + r.a + ' -> ' + r.b; if (!seen.has(key)) { seen.set(key, r); if (r.gap < 400) bad++; console.log(kind + ' ' + JSON.stringify(Object.assign({ step: s, tab, gapReal: r.gap }, r))); } }
    if (s % 20 === 19) { const e = await L.snap(h); if (e.err.length || e.rej.length) console.log('ERR step ' + s + ' ' + JSON.stringify(e)); }
  }
  const e = await L.snap(h); console.log('DONE double taps that both reached the page ' + dbl + ', findings ' + seen.size + ' errors ' + JSON.stringify(e.err.concat(e.rej, h.log.pageerror).slice(0, 10)), bad ? 'RESULT FAIL ' + bad : 'RESULT PASS');
  await h.browser.close(); if (srv) srv.close(); process.exit(0);
})();
