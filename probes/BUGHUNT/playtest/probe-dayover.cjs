'use strict';
// Run 8: does the daily "Day N" card (#drDay) give way when a sheet opens AFTER it (setup, any R2 sheet, starter sheet)?
// node probe-dayover.cjs URL VIEW   -> JSON per case: dayStill (card still in DOM after 2.6 s), hit (what a tap on the newer sheet's button hits)
const L = require('/home/sprite/BUGHUNT/playtest/lib.cjs');
const URL = process.argv[2] || 'https://therealetm.github.io/lowispike/', VIEW = process.argv[3] || 'iphone13';
(async () => {
  const out = { URL, VIEW, cases: {} };
  const h = await L.open({ url: URL, view: VIEW, settle: 6000 });
  const p = h.page;
  const CASES = {
    setup: `LowiR2.onboard()`,
    r2sheet: `LowiR2.sheet('<div style="padding:20px"><button type="button" class="r2-btn pri" id="bhBtn">OK</button></div>', {})`,
  };
  for (const [name, open] of Object.entries(CASES)) {
    await p.evaluate(() => { try { LowiR2.close && LowiR2.close(); } catch (e) {} try { LowiRitual.closeDay(true); } catch (e) {} });
    await L.sleep(800);
    const r = await p.evaluate(async (open) => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const opened = LowiRitual.openDay();
      await sleep(400);
      eval(open);
      await sleep(2600);
      const day = document.getElementById('drDay');
      const btn = document.querySelector('#r2ob [data-r2o="next"]') || document.getElementById('bhBtn') || document.querySelector('.r2-ov.on:not(.off) button');
      let hit = null;
      if (btn) { const b = btn.getBoundingClientRect(); const e = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); hit = e ? (e.closest('#drDay') ? 'DAY CARD' : (e === btn || btn.contains(e)) ? 'own button' : (e.id || e.className || e.tagName)) : null; }
      return { opened, dayStill: !!day, btn: !!btn, hit };
    }, open);
    out.cases[name] = r;
  }
  out.errs = h.log.pageerror.slice(0, 5);
  out.fail = Object.values(out.cases).some(c => c.dayStill || c.hit === 'DAY CARD');
  console.log(JSON.stringify(out));
  await h.browser.close();
})().catch(e => { console.error(e); process.exit(1); });
