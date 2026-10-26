#!/usr/bin/env node
'use strict';
/* Oct 26, 2026 mic dictation field audit (WebKit iPhone 13, local copy, fake speech engine, no real profiles or posts).
   Visits Home, Scan, Cook › every Kitchen view, Shop › every tab and Give a hand, Community chat, and lists every visible text
   field: does it have the mic, is the mic inside the field and on top (nothing covers it), and its width. Prints MISSING for
   free-text fields without a mic so they can be opted in.
   Usage: SIM_REDUCED_MOTION=1 node tools/mic-dictate/audit.cjs [en|de|es] */
const H = require('../sim/harness.cjs');
const lang = process.argv[2] || 'en';
(async () => {
  const R = await H.open({ lang, url: process.env.LIVE ? 'https://therealetm.github.io/lowispike/index.html' : '' });
  const P = R.page, seen = {};
  await R.ctx.addInitScript(() => { function SR() { } SR.prototype.start = function () { }; SR.prototype.stop = SR.prototype.abort = function () { this.onend && this.onend(); }; window.webkitSpeechRecognition = SR; });
  await R.ctx.addInitScript(l => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, lang);
  await R.goto(); await H.sleep(5000);
  const audit = async (where) => {
    await H.sleep(700);
    const rows = await P.evaluate(() => {
      const vis = e => { const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < innerHeight && getComputedStyle(e).visibility !== 'hidden'; };
      return [...document.querySelectorAll('input, textarea')].filter(vis).filter(e => !/^(checkbox|radio|range|file|hidden|color|submit|button)$/.test(e.type)).map(e => {
        const b = e.nextElementSibling && e.nextElementSibling.classList.contains('mic-btn') ? e.nextElementSibling : null;
        const on = !!(b && !b.hidden);
        let top = null, inside = null;
        if (on) {
          const r = b.getBoundingClientRect(), er = e.getBoundingClientRect();
          const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          top = t && (t === b || b.contains(t)) ? 'ok' : (t ? (t.id || String(t.className).slice(0, 30) || t.tagName) : 'off-screen');
          inside = r.left >= er.left - 1 && r.right <= er.right + 1 && r.top >= er.top - 1 && r.bottom <= er.bottom + 1;
        }
        const free = (e.tagName === 'TEXTAREA' || /^(text|search)$/.test(e.type)) && !/numeric|decimal|tel|email|url/.test(e.getAttribute('inputmode') || '') && !/one-time-code|email|address|given-name|name$/.test(e.getAttribute('autocomplete') || '');
        return { f: e.id || e.name || String(e.className).slice(0, 24) || e.getAttribute('placeholder'), ph: (e.getAttribute('placeholder') || '').slice(0, 40), type: e.type, w: Math.round(e.getBoundingClientRect().width), mic: on, top, inside, free, ml: e.maxLength };
      });
    });
    for (const r of rows) {
      const k = r.f + '|' + r.ph;
      if (seen[k]) continue; seen[k] = 1;
      const flag = r.mic ? (r.top === 'ok' && r.inside ? 'OK' : 'BAD-PLACE') : (r.free ? 'MISSING' : 'no-mic');
      console.log('FIELD', where, flag, JSON.stringify(r));
    }
  };
  const safe = async (label, fn) => { try { await fn(); } catch (e) { console.log('NAV-FAIL', label, String(e).slice(0, 120)); } };
  await audit('home');
  await safe('scan', async () => { await P.evaluate(() => goTab('scan')); await H.sleep(1500); await audit('scan'); });
  await safe('kitchen', async () => {
    await P.evaluate(() => goTab('home')); await H.sleep(800);
    await P.evaluate(() => LowiKitchenGame.open()); await H.sleep(1500); await audit('cook');
    const views = await P.evaluate(() => [...document.querySelectorAll('#ckBar [data-ck="view"]')].map(b => b.getAttribute('data-v')));
    for (const v of views) { await R.tap('#ckBar [data-ck="view"][data-v="' + v + '"]').catch(() => {}); await H.sleep(1200); await audit('cook/' + v); }
    await P.evaluate(() => { try { LowiKitchenGame.close && LowiKitchenGame.close(); } catch (e) { } });
  });
  await safe('shop', async () => {
    await P.evaluate(() => goTab('home')); await H.sleep(800);
    await P.evaluate(() => LowiStorePicks.open('home-bloom')); await H.sleep(1500); await audit('shop');
    const tabs = await P.evaluate(() => [...document.querySelectorAll('.stp-tab')].map(b => b.dataset.stpTab));
    for (const t of tabs) { await R.tap('.stp-tab[data-stp-tab="' + t + '"]').catch(() => {}); await H.sleep(1500); await audit('shop/' + t); await P.evaluate(() => { const b = document.querySelector('.gb-ov .gb-x'); if (b) b.click(); }); await H.sleep(500); }
    await P.evaluate(() => { try { LowiStorePicks.close(); } catch (e) { } });
  });
  await safe('chat', async () => { await P.evaluate(() => goTab('foryou')); await H.sleep(900); await R.tap('#cmPaneChat .rm-tab[data-rm="chat"]').catch(() => {}); await H.sleep(1500); await audit('community'); });
  await safe('companion', async () => { await P.evaluate(() => goTab('home')); await H.sleep(800); await P.evaluate(() => LowiWorldHome.openDetails('aura')); await H.sleep(1500); await audit('companion'); });
  console.log('ERRORS', JSON.stringify(R.errs.filter(e => !/supabase|fetch|network/i.test(e.m)).slice(0, 8)));
  await R.close(); process.exit(0);
})().catch(e => { console.error('AUDIT FAILED', e); process.exit(1); });
