'use strict';
// Run 8: the Day card still shows on a quiet Home and stays put (no open/close loop), then "Let's go" closes it for the day.
const L = require('/home/sprite/BUGHUNT/playtest/lib.cjs');
const URL = process.argv[2], VIEW = process.argv[3] || 'iphone13';
(async () => {
  const h = await L.open({ url: URL, view: VIEW, settle: 1000, preInit: `try{localStorage.removeItem('lowi.daily.seen')}catch(e){}` });
  const p = h.page, seen = [];
  for (let i = 0; i < 24; i++) { seen.push(await p.evaluate(() => !!document.getElementById('drDay'))); await L.sleep(1000); }
  const firstOn = seen.indexOf(true), afterOn = firstOn < 0 ? [] : seen.slice(firstOn);
  const flicker = afterOn.includes(false);
  const hit = await p.evaluate(() => { const b = document.querySelector('#drDay .dr-btn.pri'); if (!b) return null; const r = b.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); const ok = e === b || b.contains(e); b.click(); return ok; });
  await L.sleep(5000);
  const back = await p.evaluate(() => !!document.getElementById('drDay'));
  const out = { URL, VIEW, firstOnSec: firstOn, flicker, buttonHit: hit, backAfterLetsGo: back, errs: h.log.pageerror.slice(0, 5) };
  out.fail = firstOn < 0 || flicker || hit !== true || back;
  console.log(JSON.stringify(out));
  await h.browser.close();
})().catch(e => { console.error(e); process.exit(1); });
