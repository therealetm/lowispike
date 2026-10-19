'use strict';
/* BH-004 probe: after a mid-session language switch, every ring bubble (visible text + aria-label) must read exactly as it
   does after a reload in that language. Digits are normalised (timers, counts). Two switch paths: LowiLang.set (API, what
   Settings uses) and a tap on a [data-lang] picker button (the capture-phase click handler).
   Usage: node probe-lang-match.cjs [--root DIR | --url URL] [--view chromium390|iphone13|ipadP|ipadL] [--via api|click]
   Exit 1 on any mismatch. */
const L = require('./lib.cjs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
(async () => {
  const srv = arg('url', '') ? null : await L.serve(path.resolve(arg('root', '.')));
  const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`;
  const view = arg('view', 'chromium390'), via = arg('via', 'api');
  const read = P => P.evaluate(() => {
    const n = s => String(s || '').replace(/\s+/g, ' ').trim().replace(/\d+([.,:]\d+)*/g, '#');
    const o = {};
    document.querySelectorAll('[data-orbit]').forEach(e => { const k = e.getAttribute('data-orbit'); o[k] = { text: n(e.innerText), aria: n(e.getAttribute('aria-label')) }; });
    const m = document.getElementById('spBubble'); if (m) o.misty = { text: n(m.querySelector('.sp-bubble-name') && m.querySelector('.sp-bubble-name').innerText), aria: n(m.getAttribute('aria-label')) };
    return o;
  });
  const sw = async (P, l) => {
    if (via === 'click') await P.evaluate(l => { const b = document.createElement('button'); b.setAttribute('data-lang', l); b.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px'; document.body.appendChild(b); b.click(); b.remove(); }, l);
    else await P.evaluate(l => window.LowiLang.set(l), l);
  };
  let bad = 0; const errs = [];
  for (const l of ['de', 'es']) {
    const h = await L.open({ url, view, settle: 8000, lang: 'en' }); const P = h.page;
    await P.evaluate(() => { try { const s = JSON.parse(localStorage.getItem('lowispike.v2')); s.settings = Object.assign({}, s.settings, { lang: 'en' }); localStorage.setItem('lowispike.v2', JSON.stringify(s)); localStorage.setItem('lowispike.lang', 'en'); } catch (e) { } });
    await sw(P, l);
    await L.sleep(4000);
    const mid = await read(P);
    await P.reload({ waitUntil: 'load' }); await P.waitForFunction(() => typeof window.goTab === 'function', null, { timeout: 90000 }); await L.sleep(9000);
    const ref = await read(P);
    const lg = await P.evaluate(() => document.documentElement.lang);
    if (lg.slice(0, 2) !== l) { console.log(`[${l}] reload is in ${lg}, cannot compare`); bad++; }
    for (const k of Object.keys(ref)) {
      const a = mid[k] || {}, b = ref[k];
      ['text', 'aria'].forEach(f => { if ((a[f] || '') !== (b[f] || '')) { bad++; console.log(`[${l}] ${k}.${f}: mid-session "${a[f]}"  vs reload "${b[f]}"`); } });
    }
    errs.push(...h.log.pageerror, ...(await L.snap(h)).err);
    await h.browser.close();
  }
  console.log(`${view} via=${via}: ${bad ? 'FAIL ' + bad + ' mismatches' : 'PASS'}; js errors: ${errs.length ? errs.join(' || ') : 'none'}`);
  if (srv) srv.close();
  process.exit(bad || errs.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
