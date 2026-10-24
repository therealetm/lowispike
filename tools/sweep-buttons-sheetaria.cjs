/* Button sweep 19:20 (Oct 24 2026): open the r2 sheet, the personality sheet and the sign-in sheet in a language and print
   the aria-labels of their X / back buttons, so English "Close"/"Back" left in a translated sheet shows up.
   node tools/sweep-buttons-sheetaria.cjs [url|root] --lang es [--engine chromium] [--viewport 320x568] */
'use strict';
const H = require('./sim/harness.cjs');
const args = process.argv.slice(2); const opt = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : args[i + 1]; };
const where = args[0] && !args[0].startsWith('--') ? args[0] : 'https://therealetm.github.io/lowispike/index.html';
const lang = opt('lang', 'es'), engine = opt('engine', 'chromium'), vp = opt('viewport', '390x844');
(async () => {
  const o = { engine, device: opt('device', 'iPhone 13'), lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  if (engine === 'chromium') { const [w, h] = vp.split('x').map(Number); o.viewport = { width: w, height: h }; o.dpr = 2; }
  const R = await H.open(o); const P = R.page;
  await P.addInitScript(l => { try { localStorage.setItem('lowispike.lang', l); } catch (e) { } }, lang);
  await R.goto(); await H.sleep(6000);
  const out = { build: await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || window.LOWI_BUILD || ''), lang: await P.evaluate(() => window.LowiLang && LowiLang.get()) };
  const labels = sel => P.evaluate(sel => [...document.querySelectorAll(sel)].filter(b => b.getBoundingClientRect().width > 2).map(b => (b.className || '').split(' ')[0] + ':' + b.getAttribute('aria-label')), sel);
  const reset = () => P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } try { closeSheet(); } catch (e) { } try { document.querySelector('#sheetwrap') && document.querySelector('#sheetwrap').classList.remove('open'); } catch (e) { } });
  /* generic r2 sheet */
  out.r2 = await P.evaluate(() => { try { const r = window.LowiR2; if (!r || !r.sheet) return 'no LowiR2.sheet'; r.sheet('<p>probe</p>'); return 'ok'; } catch (e) { return String(e); } });
  await H.sleep(900); out.r2x = await labels('.r2-ov .r2-x'); await reset(); await H.sleep(600);
  /* sheets with data-act=close-sheet opened by their own buttons */
  for (const act of ['personality', 'signin', 'audiobook']) {
    const opened = await P.evaluate(a => { const b = [...document.querySelectorAll('[data-act]')].find(e => new RegExp(a, 'i').test(e.dataset.act)); if (!b) return 'no [data-act~=' + a + ']'; b.click(); return b.dataset.act; }, act);
    await H.sleep(1100); out[act] = { opened, xs: await labels('#sheet .xbtn, #sheet .r5-sback, .r2-ov.on .r2-x') }; await reset(); await H.sleep(600);
  }
  out.errors = R.errs.map(e => e.m).slice(0, 10);
  console.log(JSON.stringify(out, null, 1));
  await R.close().catch(() => { }); process.exit(0);
})();
