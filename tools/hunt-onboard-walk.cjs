'use strict';
/* Bug hunt (onboarding + tutorial): a brand-new user on the LIVE site goes through sign-up, every setup step with edge-case
   input, the sign reveal, the starter plan and into the tutorial. At each step: visible texts of the top layer, buttons
   smaller than 40 px or off screen, horizontal overflow, cut-off text, English words left in DE/ES, console errors.
   node tools/hunt-onboard-walk.cjs <device> <lang> <light|dark> [outdir] */
const path = require('path');
const H = require('./sim/harness.cjs');
const device = process.argv[2] || 'iPhone 13', lang = process.argv[3] || 'en', theme = process.argv[4] || 'light';
const OUT = process.argv[5] || '/tmp/hunt1903';
const URL0 = process.env.URL || 'https://therealetm.github.io/lowispike/index.html';
const engine = /Pixel/.test(device) ? 'chromium' : 'webkit';
const tag = (device + '-' + lang + '-' + theme).replace(/\s+/g, '');
const log = (...a) => console.log('[' + tag + ']', ...a);
const EN = /\b(the|your|you|Next|Add|Pick|Later|Choose|Use my|Skip|Birthday|Name|What do you|Let's go|Got it|Continue|Try it|Tap|Start|Saved|optional|Check)\b/;
(async () => {
  let R;
  try {
    require('fs').mkdirSync(OUT, { recursive: true });
    R = await H.open({ engine, device, lang, fresh: true, url: URL0 });
    const P = R.page;
    await P.addInitScript(([lg, th]) => { try { localStorage.setItem('lowispike.lang', lg); localStorage.setItem('lowi.theme', th); } catch (e) { } }, [lang, theme]).catch(() => { });
    await R.goto(); await H.sleep(7000);
    let shot = 0;
    const snap = async (name) => { try { await P.screenshot({ path: path.join(OUT, tag + '-' + (shot++) + '-' + name + '.png') }); } catch (e) { } };
    const dump = async (name) => {
      const d = await P.evaluate(([lg, enSrc]) => {
        const EN = new RegExp(enSrc);
        const vw = innerWidth, vh = innerHeight;
        const vis = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; };
        const tops = [...document.querySelectorAll('.r2-ov.on, #r2ob, .lt-card, #ltTour, [role=dialog]')].filter(vis);
        const root = tops.length ? tops[tops.length - 1] : document.body;
        const out = { build: window.LOWI_BUILD || '', top: root.id || root.className.toString().slice(0, 60), text: '', small: [], off: [], cut: [], en: [], over: document.documentElement.scrollWidth > vw + 1 };
        out.text = (root.innerText || '').replace(/\s+/g, ' ').slice(0, 500);
        for (const b of root.querySelectorAll('button, a, [role=button], input, select')) {
          if (!vis(b)) continue; const r = b.getBoundingClientRect(); const lab = (b.innerText || b.getAttribute('aria-label') || b.id || b.className || '').toString().trim().slice(0, 40);
          if ((r.width < 40 || r.height < 32) && b.type !== 'checkbox' && b.type !== 'radio') out.small.push(lab + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
          if (r.right > vw + 2 || r.left < -2 || r.bottom > vh + 2) out.off.push(lab + ' @' + Math.round(r.left) + ',' + Math.round(r.top) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
        }
        for (const e of root.querySelectorAll('*')) {
          if (!vis(e) || e.children.length) continue; const t = (e.innerText || '').trim(); if (!t) continue;
          if (e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflow !== 'visible') out.cut.push(t.slice(0, 50));
          if (lg !== 'en' && EN.test(t) && !e.closest('[data-noi18n]')) out.en.push(t.slice(0, 70));
        }
        if (lg !== 'en') for (const i of root.querySelectorAll('input[placeholder]')) if (vis(i) && EN.test(i.placeholder)) out.en.push('placeholder: ' + i.placeholder);
        return out;
      }, [lang, EN.source]);
      log('STEP', name, JSON.stringify(d));
      await snap(name);
      return d;
    };
    const click = async (sel, name) => { const el = await P.$(sel); if (!el) { log('MISSING', sel, name || ''); return false; } try { await el.click({ timeout: 4000 }); } catch (e) { log('DEADTAP', sel, e.message.split('\n')[0]); return false; } await H.sleep(900); return true; };
    await dump('gate');
    const f = await P.$('[data-r2form=signup]');
    if (f) {
      /* edge: submit empty */
      await f.evaluate(x => x.requestSubmit ? x.requestSubmit() : x.submit()); await H.sleep(1200); await dump('signup-empty');
      const ins = await f.$$('input');
      for (const i of ins) { const t = await i.getAttribute('type'); const n = (await i.getAttribute('name')) || (await i.getAttribute('id')) || '';
        if (t === 'email' || /mail/i.test(n)) await i.fill('hunt' + Date.now() + '@example.com'); else if (t === 'password') await i.fill('short'); else if (t === 'checkbox') await i.check().catch(() => { }); else if (t !== 'hidden' && t !== 'submit') await i.fill('Zoë'); }
      await f.evaluate(x => x.requestSubmit ? x.requestSubmit() : x.submit()); await H.sleep(1500); await dump('signup-shortpw');
      for (const i of ins) { const t = await i.getAttribute('type'); if (t === 'password') await i.fill('Hunt-test-12345'); }
      await f.evaluate(x => x.requestSubmit ? x.requestSubmit() : x.submit()); await H.sleep(5000);
    } else log('NO SIGNUP FORM');
    let d = await dump('step0');
    if (!(await P.$('#r2obB'))) throw new Error('setup step 0 not reached');
    /* edge cases on step 0 */
    await click('[data-r2o=next]', 'next-empty'); await dump('step0-empty');
    const nm = await P.$('#r2obName'); if (nm) { await nm.fill('   '); await click('[data-r2o=next]'); await dump('step0-blankname'); await nm.fill('Zoë-Marie 🌙 Großmann-Fernández de la Peña Long'); }
    const now = new Date(); const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 5).toISOString().slice(0, 10);
    await P.fill('#r2obB', lastMonth); await click('[data-r2o=next]'); await dump('step0-baby');
    await P.fill('#r2obB', '1900-02-01'); await click('[data-r2o=next]'); await dump('step0-1900');
    await P.fill('#r2obB', '1992-02-29'); await P.fill('#r2obT', '23:59'); await dump('step0-filled');
    await click('[data-r2o=next]'); await H.sleep(1200); await dump('reveal-early');
    /* wait for the reveal to hand over to step 1 */
    for (let k = 0; k < 30; k++) { if (await P.$('[data-r2o=initial], [data-r2o=photo]')) break;
      if (k === 4) { const sh = await P.$('#r2obRev button'); if (sh) { await sh.click().catch(() => log('DEADTAP shuffle')); await H.sleep(800); await dump('reveal-shuffled'); } }
      if (k >= 6) { const bs = await P.$$('#r2obRev button'); const go = bs[bs.length - 1]; if (go) { log('reveal go', await go.innerText()); await go.click().catch(e => log('DEADTAP reveal go', e.message.split('\n')[0])); } }
      await H.sleep(1000); }
    await dump('step1');
    await click('[data-r2o=initial]', 'use initial'); await H.sleep(800);
    d = await dump('step2');
    /* chips: toggle everything twice, gender switch */
    for (const g of ['f', 'm', 'x', 'f']) await click('[data-r2g=' + g + ']');
    const tags = await P.$$('[data-r2tag]'); for (const t of tags.slice(0, 4)) { await t.click().catch(() => log('DEADTAP chip')); await H.sleep(150); }
    await click('[data-r2none]'); await dump('step2-chips');
    const nxt = await P.$('#r2ob [data-r2o=next], #r2ob [data-r2o=finish]'); const nv = nxt && await nxt.getAttribute('data-r2o');
    await click('#r2ob [data-r2o=' + nv + ']'); await H.sleep(1200);
    if (nv === 'next') {
      d = await dump('step3');
      await click('[data-r2o=shopdone]'); await dump('step3-empty');
      const num = await P.$('#r2ob input[type=number], #r2ob input[inputmode=numeric]'); if (num) { await num.fill('0'); await click('[data-r2o=shopdone]'); await dump('step3-zero'); await num.fill('999'); await click('[data-r2o=shopdone]'); await dump('step3-999'); await num.fill('2'); }
      await click('[data-r2o=shopdone]'); await H.sleep(2500);
    }
    /* 29 Oct: the grocery-rhythm step (shop-plan.js) needs a frequency before Let's go; try empty first, then pick one + two days */
    for (let w = 0; w < 8 && !(await P.$('#r2ob [data-spl-freq]')); w++) await H.sleep(1000);
    if (await P.$('#r2ob [data-spl-freq]')) {
      await click('#r2ob [data-r2o=shopdone]'); await dump('shop-empty');
      await click('#r2ob [data-spl-freq]:nth-child(2)'); await click('#r2ob [data-spl-day="1"]'); await click('#r2ob [data-spl-day="5"]'); await dump('shop-picked');
      await click('#r2ob [data-r2o=shopdone]'); await H.sleep(2500);
    }
    d = await dump('after-setup');
    /* whatever comes next (starter plan / tutorial cards): read and press the primary button up to 40 times */
    let idle = 0;
    for (let k = 0; k < (+process.env.HUNT_K || 80); k++) {
      await H.sleep(1500);
      const st = await P.evaluate(() => {
        const vis = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; };
        const c = [...document.querySelectorAll('#ltTour .lt-card, .lt-card, .r2-ov.on, .hs-sheet, [role=dialog]')].filter(vis).pop();
        if (!c) return null; const bs = [...c.querySelectorAll('button')].filter(vis).map(b => (b.innerText || b.getAttribute('aria-label') || '').trim());
        return { id: c.id || c.className.toString().slice(0, 50), t: (c.innerText || '').replace(/\s+/g, ' ').slice(0, 160), bs };
      });
      if (!st) { if ((idle = (idle || 0) + 1) < 12) continue; log('FLOW idle (no card for 18s) at', k); break; } idle = 0;
      log('FLOW', k, JSON.stringify(st));
      if (k % 5 === 0) await snap('flow' + k);
      const pref = /^(Next|Weiter|Siguiente|Got it|Verstanden|Entendido|Let's go|Los geht's|Vamos|Continue|Start|OK|Done|Fertig|Listo|Skip for now|Später|Más tarde|Later)/i;
      const ok = await P.evaluate((src) => { const re = new RegExp(src, 'i'); const vis = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
        const c = [...document.querySelectorAll('#ltTour .lt-card, .lt-card, .r2-ov.on, .hs-sheet, [role=dialog]')].filter(vis).pop(); if (!c) return '';
        const b = [...c.querySelectorAll('button')].filter(vis).find(b => re.test((b.innerText || '').trim())); if (!b) return ''; b.click(); return b.innerText.trim(); }, pref.source);
      if (!ok) {
        /* question cards: pick the 2nd answer (not skip, not back) */
        const ans = await P.evaluate(() => { const vis = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
          const c = [...document.querySelectorAll('#ltTour .lt-card, .lt-card, .r2-ov.on, .hs-sheet, [role=dialog]')].filter(vis).pop(); if (!c) return '';
          const bs = [...c.querySelectorAll('button')].filter(vis).filter(b => !/^(‹|<|×|✕|Skip|Überspringen|Saltar|Back|Zurück|Atrás)$/i.test((b.innerText || '').trim()) && (b.innerText || '').trim().length > 1);
          const b = bs[1] || bs[0]; if (!b) return ''; b.click(); return b.innerText.trim(); });
        if (!ans) { log('FLOW stuck: no button to press', JSON.stringify(st.bs)); break; }
        log('FLOW answered', ans);
      }
    }
    await dump('end');
    log('RESULT', JSON.stringify({ errs: R.errs, crashed: R.crashed }));
  } catch (e) { log('BROKEN', e.message.split('\n')[0]); if (R) log('errs', JSON.stringify(R.errs)); }
  if (R) await R.close().catch(() => { });
  process.exit(0);
})();
