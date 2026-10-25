'use strict';
/* debug helper: logs the stick state and every scrollTop write on the chat list while opening the chat once */
const H = require('../regress/harness.cjs'), N = require('../regress/nav.cjs'); const sleep = H.sleep;
(async () => {
  const R = await H.open({ probe: false, engine: process.argv[2] || 'chromium', viewport: { width: 390, height: 844 }, device: process.argv[2] === 'webkit' ? 'iPhone 13' : undefined, lang: 'en', messages: 260 });
  const p = R.page;
  for (let i = 0; i < 25; i++) { R.sim.say(); R.sim.photoSay(); }
  let k = 0; await R.ctx.route(/\/storage\/v1\/object\/public\/media\/.*\.jpe?g/, async r => { await sleep(800 + ((k++ * 467) % 1800)); await r.fallback(); });
  await R.goto();
  await p.evaluate(() => {
    window.__log = []; const C = window.LowiChatStick.create;
    window.LowiChatStick.create = (l, e) => { const c = C(l, e); window.__ctl = c;
      const d = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTop');
      Object.defineProperty(l, 'scrollTop', { get() { return d.get.call(this); }, set(v) { window.__log.push(['set', Math.round(v), Math.round(d.get.call(this)), this.scrollHeight, c.stuck, (new Error().stack.split('\n')[2] || '').trim().slice(0, 140)]); d.set.call(this, v); } });
      l.addEventListener('scroll', () => window.__log.push(['scroll', Math.round(l.scrollTop), l.scrollHeight, l.clientHeight, c.stuck]));
      return c; };
  });
  await N.openCommunity(R); await sleep(4000);
  const open = await p.evaluate(() => !!document.querySelector('#cgThread[data-open]'));
  console.log('open at start', open, 'ctl', await p.evaluate(() => !!window.__ctl));
  if (open) { await p.locator('#cmPaneChat .rm-tab[data-rm="room"]').first().click({ force: true }); await sleep(800); }
  await p.evaluate(() => { window.__log.length = 0; window.__log.push(['---open']); });
  await p.locator('#cmPaneChat .rm-tab[data-rm="chat"]').first().click({ force: true }); await sleep(3500);
  const log = await p.evaluate(() => window.__log);
  for (const x of log.slice(0, 80)) console.log(JSON.stringify(x));
  console.log(await p.evaluate(() => { const l = document.getElementById('cmList'); return { d: l.scrollHeight - l.scrollTop - l.clientHeight, st: window.__ctl && window.__ctl.stuck, css: getComputedStyle(l).overflowAnchor }; }));
  await R.close();
})();
