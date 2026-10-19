'use strict';
/* Layout checks for the open room: every visible control is on top (elementFromPoint), inside the room, header parts don't overlap,
   44px targets, colors. usage: node probe-check.cjs <view> <url|dir> [rm] */
const L = require('/home/sprite/BUGHUNT/playtest/lib.cjs');
(async () => {
  const view = process.argv[2] || 'iphone13', target = process.argv[3] || 'https://therealetm.github.io/lowispike/';
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
  });
  await L.sleep(600);
  await page.evaluate(() => document.querySelector('#cmPaneChat [data-chat="history"]').click());
  await L.sleep(1600);
  await page.screenshot({ path: '/home/sprite/CHATROOM/check-' + view + (process.env.RM ? '-rm' : '') + '.png' });
  const res = await page.evaluate(() => {
    const room = document.querySelector('#cgThread').getBoundingClientRect(), bad = [];
    const ctrls = [...document.querySelectorAll('#cgThread button, #cgThread .cr-link, #cgThread .cr-meta, #cgThread #cgThreadTitle, #cgThread .cr-day span, #cmInput, #cmPhoto, #cmMic, #cgTo button')].filter(e => { const b = e.getBoundingClientRect(); return b.width && b.height; });
    const list = document.querySelector('#cmList').getBoundingClientRect();
    for (const e of ctrls) {
      const b = e.getBoundingClientRect(); const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
      const inList = e.closest('#cmList');
      if (inList && (cy < list.top || cy > list.bottom)) continue; // scrolled out
      if (cx < 0 || cx > innerWidth || cy < 0 || cy > innerHeight) { bad.push('offscreen ' + (e.id || e.className)); continue; }
      const top = document.elementFromPoint(cx, cy);
      if (!(top === e || e.contains(top) || (top && top.closest && top.closest('button') === e))) bad.push('covered ' + (e.id || e.className.baseVal || e.className) + ' by ' + (top ? (top.id || top.className.baseVal || top.className || top.tagName) : 'null'));
      if (e.closest('#cgThread') && (b.right > room.right + 1 || b.left < room.left - 1)) bad.push('outside room ' + (e.id || e.className));
      if (e.tagName === 'BUTTON' && !e.closest('#cmList') && (b.width < 43 || b.height < 43)) bad.push('small ' + (e.id || e.className) + ' ' + Math.round(b.width) + 'x' + Math.round(b.height));
    }
    const hp = ['#cgClose', '.cr-id', '#crLink'].map(s => document.querySelector(s).getBoundingClientRect());
    for (let i = 0; i < hp.length - 1; i++) if (hp[i].right > hp[i + 1].left + .5) bad.push('header overlap ' + i);
    const bubs = [...document.querySelectorAll('#cmList .cm-bub')].filter(b => { const r = b.getBoundingClientRect(); return r.width && r.bottom > list.top && r.top < list.bottom; });
    for (const b of bubs) { const r = b.getBoundingClientRect(); if (r.right > list.right + 1 || r.left < list.left - 1) bad.push('bubble outside ' + b.closest('.cm-msg').id); }
    const cs = s => { const e = document.querySelector(s); return e ? getComputedStyle(e).color : null; };
    return { bad, room: [Math.round(room.y), Math.round(room.height)], list: Math.round(list.height), meta: document.querySelector('#crMeta').textContent, crew: document.querySelectorAll('#crCrew .cr-mate').length, days: [...document.querySelectorAll('.cr-day')].map(d => d.textContent), nameColor: cs('#cmList .cs-name'), tabbar: getComputedStyle(document.querySelector('#tabbar')).visibility, scrollH: document.querySelector('#cmList').scrollHeight, anim: getComputedStyle(document.querySelector('#cgThread')).animationName, vh: innerHeight };
  });
  console.log(JSON.stringify(res, null, 1));
  // profile tap from crew
  const prof = await page.evaluate(async () => { const b = document.querySelector('#crCrew .cr-mate'); if (!b) return 'no crew'; b.click(); await new Promise(r => setTimeout(r, 900)); const ov = [...document.querySelectorAll('.r2-ov.on, [role=dialog]')].filter(e => e.getBoundingClientRect().width).map(e => (e.className || e.id) + ':' + e.innerText.replace(/\s+/g, ' ').slice(0, 80)); return ov; });
  console.log('profile', JSON.stringify(prof));
  await page.keyboard.press('Escape'); await L.sleep(500); await page.keyboard.press('Escape'); await L.sleep(800);
  console.log('after esc', JSON.stringify(await page.evaluate(() => ({ open: document.querySelector('#cgThread').hasAttribute('data-open'), room: document.documentElement.classList.contains('cr-room'), tabbar: getComputedStyle(document.querySelector('#tabbar')).visibility, focus: document.activeElement && (document.activeElement.id || document.activeElement.className) }))));
  console.log('errors', JSON.stringify(h.log.pageerror));
  await h.browser.close(); if (srv) srv.close();
})();
