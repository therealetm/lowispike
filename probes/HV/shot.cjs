const L = require('/home/sprite/BUGHUNT/playtest/lib.cjs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
(async () => {
  const srv = await L.serve(path.resolve(arg('root', '/home/sprite/wt-home-visit')));
  const url = `http://127.0.0.1:${srv.address().port}/index.html`;
  for (const view of arg('views', 'iphone13').split(',')) {
    const h = await L.open({ url, view, settle: 6000 });
    const info = await h.page.evaluate(() => { const o = {}; document.querySelectorAll('[data-orbit], #whPad, #spBubble, #f3Board, #tabbar').forEach(e => { const r = e.getBoundingClientRect(); o[e.id || e.dataset.orbit] = [r.left, r.top, r.width, r.height].map(Math.round); }); return { vw: innerWidth, vh: innerHeight, o }; });
    console.log(view, JSON.stringify(info));
    await h.page.screenshot({ path: `/home/sprite/HV/home-${view}.png` });
    console.log(JSON.stringify(h.log).slice(0, 500));
    await h.browser.close();
  }
  srv.close();
})();
