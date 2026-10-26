const L = require('/home/sprite/BUGHUNT/playtest/lib.cjs'), path = require('path');
(async () => {
  const srv = await L.serve('/home/sprite/wt-home-visit'); const url = `http://127.0.0.1:${srv.address().port}/index.html`;
  for (const view of (process.argv[2]||'iphone13').split(',')) {
  const h = await L.open({ url, view, settle: 6000 });
  const r = await h.page.evaluate(() => { const out = new Set(); for (let y = 0; y < innerHeight; y += 20) for (let x = 0; x < innerWidth; x += 30) { const e = document.elementFromPoint(x, y); if (!e) continue; const c = e.closest('button,a,[role=button],[data-orbit],input') ; const t = c || e; const r = t.getBoundingClientRect(); if (r.width * r.height > innerWidth * innerHeight * 0.5) continue; out.add((t.id ? '#' + t.id : t.tagName + '.' + String(t.className).slice(0, 30)) + ' ' + [r.left, r.top, r.width, r.height].map(Math.round).join(',')); } return [...out]; });
  console.log(view, r.join('\n')); await h.browser.close(); }
  srv.close();
})();
