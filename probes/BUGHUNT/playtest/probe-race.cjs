'use strict';
const L = require('./lib.cjs'), path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const STATE = () => {
  const m = document.getElementById('spBubble'); let why = null;
  if (m) { let n = m; while (n && n.nodeType === 1) { const c = getComputedStyle(n); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity < 0.05) { why = (n.id || n.tagName) + '.' + String(n.className).slice(0, 60) + ' d=' + c.display + ' v=' + c.visibility + ' o=' + c.opacity; break; } n = n.parentElement; } }
  const r = m && m.getBoundingClientRect();
  let wr = null; try { wr = { cur: LowiWorldRegions.current(), busy: !!LowiWorldRegions.state.busy, fl: (LowiMistyFlight.state() || {}).st }; } catch (e) { wr = e.message; }
  const act = document.querySelector('.tab-pane.active, section.active, [id^=tab-].active, [id^=tab-].on');
  return { why, mr: r && [Math.round(r.left), Math.round(r.top), Math.round(r.width)], wr, html: document.documentElement.className.split(' ').filter(c => !/^(apple-ui|lg|hi-signed|spirit-app|g1|rw-on|nm-on|cg-spirit-on|herb-living|g2h-on|tb-scanok|wh-on|cw-on|lv-on|o8|hb2-on|bw3-ready|lb3d)$/.test(c)).join(' '), tab: act && act.id, cam: !!document.querySelector('#b3Cam') && getComputedStyle(document.querySelector('#b3Cam')).display };
};
(async () => {
  const srv = await L.serve(path.resolve(arg('root', '.')));
  const url = `http://127.0.0.1:${srv.address().port}/index.html`;
  const h = await L.open({ url, view: arg('view', 'iphone13'), settle: 6000 }); const P = h.page;
  const seq = arg('seq', 'fuel>move,move>scan,settings>water,gap>gap,scan>sleep,sleep>gap,fuel>gap,fuel>scan').split(',');
  console.log('start', JSON.stringify(await P.evaluate(STATE)));
  for (const s of seq) {
    const [a, b] = s.split('>');
    const ca = await L.center(h, `[data-orbit="${a}"]`), cb = await L.center(h, `[data-orbit="${b}"]`);
    if (!ca || !cb) { console.log(s, 'missing ctrl', !!ca, !!cb); continue; }
    await L.tap(h, ca.x, ca.y); await L.sleep(+arg('gap', 150)); await L.tap(h, cb.x, cb.y); await L.sleep(1000);
    const o = await P.evaluate(STATE);
    for (let i = 0; i < 3; i++) { await P.keyboard.press('Escape'); await L.sleep(250); }
    await L.sleep(400);
    const c = await P.evaluate(STATE);
    console.log(s, '\n  open:', JSON.stringify(o), '\n  closed:', JSON.stringify(c));
    await P.screenshot({ path: `out/race-${s.replace('>', '-')}.png` });
  }
  await h.browser.close(); srv.close();
})();
