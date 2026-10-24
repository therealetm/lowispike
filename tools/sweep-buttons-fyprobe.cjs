/* Button sweep helper (24 Oct 16:20): open Community > For You in a language and dump the For You pane's visible text and
   aria-labels (the pane is data-noi18n, so the page translator skips it and every app word in it must come translated).
   node tools/sweep-buttons-fyprobe.cjs [url|root] --lang de --engine chromium --viewport 390x844 [--device "iPhone 13"] */
'use strict';
const H = require('./sim/harness.cjs');
const args = process.argv.slice(2); const opt = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : args[i + 1]; };
const where = args[0] && !args[0].startsWith('--') ? args[0] : 'https://therealetm.github.io/lowispike/index.html';
const lang = opt('lang', 'de'), engine = opt('engine', 'chromium'), device = opt('device', 'iPhone 13'), vp = opt('viewport', '390x844');
(async () => {
  const o = { engine, device, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
  if (engine === 'chromium' && vp) { const [w, h] = vp.split('x').map(Number); o.viewport = { width: w, height: h }; o.dpr = 2; }
  const R = await H.open(o); const P = R.page;
  await P.addInitScript(l => { try { localStorage.setItem('lowispike.lang', l); } catch (e) { } }, lang);
  await R.goto(); await H.sleep(5000);
  await P.evaluate(() => { try { goTab('foryou'); } catch (e) { } }); await H.sleep(2500);
  const tab = await P.$('.rm-tab[data-rm="fy"]'); if (tab) { await tab.click().catch(() => { }); } await H.sleep(2500);
  /* scroll the feed to its end so the last card renders in view */
  await P.evaluate(() => { const f = document.getElementById('fyFeed'); if (f) f.scrollTop = f.scrollHeight; }); await H.sleep(1500);
  /* tap the first Save twice: it should read Saved, then Save again, in the chosen language */
  const tapSave = [];
  for (let i = 0; i < 2; i++) {
    await P.evaluate(() => { const b = document.querySelector('.rm-fy [data-tr="save"], #fyFeed [data-tr="save"]'); if (b) b.scrollIntoView({ block: 'center' }); }); await H.sleep(400);
    const b = await P.$('#fyFeed [data-tr="save"]'); if (!b) break; await b.click({ timeout: 4000 }).catch(e => tapSave.push('tap failed: ' + e.message.slice(0, 80))); await H.sleep(700);
    tapSave.push(await P.evaluate(() => { const b = document.querySelector('#fyFeed [data-tr="save"]'); return b ? b.getAttribute('aria-label') + ' | ' + b.textContent.trim() + (b.classList.contains('on') ? ' (on)' : '') : 'gone'; }));
  }
  const out = await P.evaluate(() => {
    const box = document.querySelector('.rm-fy') || document.getElementById('fyFeed'); if (!box) return { missing: true };
    const text = new Set(); const w = document.createTreeWalker(box, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) { const t = n.nodeValue.trim().replace(/\s+/g, ' '); if (t.length >= 2) text.add(t); }
    const end = document.querySelector('.fy-end'); const rail = [...box.querySelectorAll('.fy-rail .fy-act')].slice(0, 6).map(b => b.getAttribute('aria-label') + ' | ' + b.textContent.trim());
    return { lang: window.LowiLang && LowiLang.get(), build: window.LOWI_BUILD || '', end: end ? end.innerText.replace(/\s+/g, ' ').trim() : null, rail, aria: [...new Set([...box.querySelectorAll('[aria-label]')].map(e => e.getAttribute('aria-label')))], text: [...text].slice(0, 60) };
  });
  out.tapSave = tapSave; out.errs = R.errs.map(e => e.m);
  console.log(JSON.stringify(out, null, 1)); await R.close().catch(() => { }); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
