const L = require('/home/sprite/BUGHUNT/playtest/lib.cjs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const views = process.argv.slice(2).length ? process.argv.slice(2) : ['iphone', 'android'];
  for (const view of views) {
    const { browser, page, log } = await L.open({ url: 'https://therealetm.github.io/lowispike/', view, lang: 'en' });
    const out = { view };
    out.build = await page.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || window.LOWI_BUILD || '');
    await page.evaluate(() => window.LowiMistyHub.open()); await sleep(4000);
    out.card = await page.evaluate(() => {
      const root = document.querySelector('.mh-doors') && document.querySelector('.mh-doors').closest('[class*="mh"]').parentElement;
      const all = [...document.querySelectorAll('.mh-doors, .mh-scale, .mh-xp, .mh-adv, .mh-mood')].map(e => e.className.split(' ').find(c => /^mh-(doors|scale|xp|adv|mood)$/.test(c)) || e.className);
      const adv = [...document.querySelectorAll('.mh-adv li')].map(li => li.querySelector('b').textContent + ' | ' + li.querySelector('em').textContent + ' | ' + li.dataset.been);
      const doors = [...document.querySelectorAll('.mh-doors b')].map(b => b.textContent);
      const mood = (document.querySelector('.mh-mood-sub') || {}).textContent;
      const d = document.querySelector('.mh-doors'); const r = d && d.getBoundingClientRect();
      const sheet = d && d.closest('[role=dialog], .mh-sheet, .mh-panel, .mh'); const sr = sheet && sheet.getBoundingClientRect(); const head = [...(sheet ? sheet.children : [])].map(c => c.className + ':' + Math.round(c.getBoundingClientRect().top) + '-' + Math.round(c.getBoundingClientRect().bottom)).slice(0, 8);
      return { sheetCls: sheet && sheet.className, sheetTop: sr && Math.round(sr.top), scrollTop: sheet && sheet.scrollTop, head, order: all, adv, doors, mood, doorsTop: r && Math.round(r.top), vh: innerHeight, spirit: /spirit/i.test(document.body.innerText) };
    });
    await page.screenshot({ path: `card-${view}.png` });
    // simulate your own breakout into the galaxy, then a stream while on autopilot (must not count)
    out.visits = await page.evaluate(async () => {
      const A = window.LowiAdventureTiers; const before = JSON.stringify(A.seen());
      dispatchEvent(new CustomEvent('lowi:galaxy', { detail: { on: true } }));
      let started = false; try { window.LowiAdventure.start(); started = window.LowiAdventure.on; } catch (e) { started = 'err ' + e.message; }
      const k = A.kind(); dispatchEvent(new CustomEvent('lowi:galaxy-stream', { detail: { i: 0 } })); dispatchEvent(new CustomEvent('lowi:galaxy-bubble', { detail: { in: true } }));
      try { window.LowiAdventure.stop(); } catch (e) { }
      return { before, started, kindDuringAuto: k, after: JSON.stringify(A.seen()) };
      return { before, after: JSON.stringify(A.seen()), kindNow: A.kind() };
    });
    await page.evaluate(() => { const b = document.querySelector('[data-sp="collection"]'); b && b.click(); }); await sleep(1500);
    out.journal = await page.evaluate(() => { const s = document.querySelector('.hq-journal'); return s ? s.innerText.slice(0, 400) : 'NO JOURNAL'; });
    out.journalHead = await page.evaluate(() => [...document.querySelectorAll('h2, .hq-prodh')].map(h => h.textContent).filter(Boolean).slice(0, 6));
    await page.screenshot({ path: `journal-${view}.png` });
    out.errors = log.pageerror.concat(log.console).slice(0, 6);
    console.log(JSON.stringify(out, null, 1));
    await browser.close();
  }
})().catch(e => { console.error('FAIL', e); process.exit(1); });
