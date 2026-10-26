const WT = require('fs').readFileSync('/home/sprite/BUGHUNT/.wt', 'utf8').trim();
const H = require(WT + '/tools/regress/harness.cjs');
(async () => {
  const R = await H.open({ probe: false, lang: 'en', url: process.argv[2], engine: 'chromium', viewport: { width: 390, height: 844 } });
  const p = R.page; await R.goto(); await H.sleep(4000);
  for (const o of ['water', 'move', 'sleep', 'settings', 'joy', 'fuel']) {
    const r = await p.evaluate(async o => { const e = document.querySelector('[data-orbit="' + o + '"]'); const info = e ? e.tagName + '.' + String(e.className).slice(0, 40) + ' vis=' + e.getBoundingClientRect().width : 'none'; const b0 = new Set(document.body.querySelectorAll('*'));
      e && e.click(); await new Promise(r => setTimeout(r, 1500));
      const nw = [...document.body.children].filter(x => !b0.has(x)).map(x => x.tagName + '.' + String(x.className).slice(0, 50) + '#' + x.id);
      const dl = [...document.querySelectorAll('[role=dialog]')].filter(x => x.getBoundingClientRect().width > 0).map(x => String(x.className).slice(0, 40) + ' modal=' + x.getAttribute('aria-modal'));
      return { info, nw, dl, act: document.activeElement && (document.activeElement.className + '').slice(0, 40) }; }, o);
    console.log(o, JSON.stringify(r));
    await p.keyboard.press('Escape'); await p.waitForTimeout(600); await p.keyboard.press('Escape'); await p.waitForTimeout(800);
  }
  await R.close();
})();
