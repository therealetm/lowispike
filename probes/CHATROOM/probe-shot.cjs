'use strict';
/* Screenshot Community > Chat. usage: node probe-shot.cjs <view> <url|dir> <outprefix> [mock] */
const L = require('/home/sprite/BUGHUNT/playtest/lib.cjs');
(async () => {
  const view = process.argv[2] || 'iphone13', target = process.argv[3] || 'https://therealetm.github.io/lowispike/', out = process.argv[4] || '/home/sprite/CHATROOM/shot';
  let srv = null, url = target;
  if (!/^https?:/.test(target)) { srv = await L.serve(target); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const h = await L.open({ view, url, settle: 6000, reducedMotion: !!process.env.RM });
  const { page } = h;
  await page.evaluate(() => { try { goTab('foryou'); } catch (e) {} });
  await L.sleep(3500);
  await page.evaluate(() => { try { window.cmSetView && cmSetView('chat'); } catch (e) {} });
  await L.sleep(2500);
  await page.screenshot({ path: out + '-1.png' });
  const info = await page.evaluate(() => {
    const q = s => [...document.querySelectorAll(s)].filter(e => e.getBoundingClientRect().width).map(e => (e.id || e.className || e.tagName) + ': ' + (e.innerText || '').replace(/\s+/g, ' ').slice(0, 120));
    return { tab: typeof TAB !== 'undefined' ? TAB : null, panes: q('#tab-foryou [id^=cmPane]'), buttons: q('#tab-foryou button').slice(0, 40) };
  });
  console.log(JSON.stringify(info, null, 1));
  const s = await L.snap(h); console.log('errors', JSON.stringify(s), JSON.stringify(h.log.pageerror));
  await h.browser.close(); if (srv) srv.close();
})();
