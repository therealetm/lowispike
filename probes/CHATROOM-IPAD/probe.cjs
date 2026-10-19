'use strict';
/* usage: node probe.cjs <view> <url|dir> <outprefix> ; opens Community > Chat room with 40 fixture messages, screenshots, measures */
const L = require('./lib.cjs');
(async () => {
  const view = process.argv[2], target = process.argv[3], out = process.argv[4] || '/home/sprite/CHATROOM-IPAD/shot';
  let srv = null, url = target;
  if (!/^https?:/.test(target)) { srv = await L.serve(target); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const h = await L.open({ view, url, settle: 6000, reducedMotion: !!process.env.RM });
  const { page } = h;
  await page.evaluate(() => { try { goTab('foryou'); } catch (e) {} });
  await L.sleep(3000);
  await page.evaluate(() => {
    const me = LowiCommunityHost.state().uid, now = Date.now(), H = 3600e3;
    const names = ['Ana', 'Ben', 'Cleo', 'Dario', 'Eli', 'Fatima Al-Hassan Rodriguez', 'Gus', 'Hana', 'Ivo'];
    const rows = [];
    for (let i = 0; i < 40; i++) { const n = names[i % names.length]; const mine = i % 5 === 4; rows.push({ id: 'k' + i, uid: mine ? me : 'u-' + n, by: n, t: mine ? 'ok!' : (i % 3 ? 'Short note ' + i : 'A longer message to check wrapping inside the glass panel and that nothing spills out of the room ' + i), ts: now - (40 - i) * 1.3 * H, rx: {} }); }
    LowiCommunityHost.replace(rows, []); LowiCommunity.refresh();
  }).catch(e => console.log('fixture err', e.message));
  await L.sleep(600);
  await page.evaluate(() => document.querySelector('#cmPaneChat [data-chat="history"]').click());
  await L.sleep(1800);
  await page.screenshot({ path: out + '-' + view + '.png' });
  const res = await page.evaluate(() => {
    const R = s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)]; };
    const mates = [...document.querySelectorAll('#crCrew .cr-mate')].slice(0, 3).map(e => { const b = e.getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height)]; });
    const forms = [...document.querySelectorAll('#crCrew .cp-form')].slice(0, 2).map(e => { const b = e.getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height)]; });
    const bub = [...document.querySelectorAll('#cmList .cm-bub')].slice(-3).map(e => { const b = e.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.width), getComputedStyle(e).fontSize]; });
    return { vw: innerWidth, vh: innerHeight, lay: document.documentElement.dataset.lay, cls: document.documentElement.className.slice(0, 200), thread: R('#cgThread'), pane: R('#cmPaneChat'), room: R('#cpRoom'), head: R('#cgThread .cr-head'), back: R('#cgClose'), title: R('#cgThreadTitle'), meta: R('#crMeta'), metaText: (document.querySelector('#crMeta') || {}).textContent, link: R('#crLink'), crew: R('#crCrew'), crewl: R('.cr-crewl'), mates, forms, list: R('#cmList'), compose: R('#cmPaneChat .cm-compose'), input: R('#cmInput'), to: R('#cgTo'), bub, day: R('.cr-day'), tabbar: R('#tabbar') };
  });
  console.log(JSON.stringify(res));
  console.log('errors', JSON.stringify(h.log.pageerror));
  await h.browser.close(); if (srv) srv.close();
})();
