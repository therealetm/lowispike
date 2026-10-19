const L = require('/home/sprite/BUGHUNT/playtest/lib.cjs');
(async () => {
  const h = await L.open({ url: 'https://therealetm.github.io/lowispike/', view: 'chromium390', settle: 8000, lang: 'en' }); const P = h.page;
  const s = () => P.evaluate(() => [...document.querySelectorAll('[data-orbit]')].map(e => e.getAttribute('data-orbit') + '=' + JSON.stringify((e.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 40)) + ' aria=' + JSON.stringify((e.getAttribute('aria-label') || '').slice(0, 30))).join('\n'));
  console.log('EN start\n' + await s());
  for (const l of ['de', 'es']) { await P.evaluate(l => LowiLang.set(l), l); for (const w of [1500, 6000]) { await L.sleep(w); console.log(`--- ${l} after ${w}`); console.log(await s()); } }
  const persisted = await P.evaluate(() => { try { return JSON.parse(localStorage.getItem('lowispike.v2')).settings.lang; } catch (e) { return String(e); } });
  console.log('persisted', persisted);
  await P.reload(); await L.sleep(9000); console.log('--- after reload (es)'); console.log(await s());
  await h.browser.close();
})();
