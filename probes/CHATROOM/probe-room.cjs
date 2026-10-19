'use strict';
/* Open the Community chat room with fixture messages (test data injected into the page store, never sent anywhere).
   usage: node probe-room.cjs <view> <url|dir> <outprefix> */
const L = require('/home/sprite/BUGHUNT/playtest/lib.cjs');
(async () => {
  const view = process.argv[2] || 'iphone13', target = process.argv[3] || 'https://therealetm.github.io/lowispike/', out = process.argv[4] || '/home/sprite/CHATROOM/room';
  let srv = null, url = target;
  if (!/^https?:/.test(target)) { srv = await L.serve(target); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const h = await L.open({ view, url, settle: 6000, reducedMotion: !!process.env.RM, lang: process.env.LANG2 || undefined });
  const { page } = h;
  await page.evaluate(() => { try { goTab('foryou'); } catch (e) {} });
  await L.sleep(3000);
  const me = await page.evaluate(() => { try { return LowiCommunityHost.state().uid || ''; } catch (e) { return 'ERR ' + e.message; } });
  await page.evaluate((me) => {
    const now = Date.now(), H = 3600e3, D = 24 * H;
    const rows = [
      ['f1', 'u-ana', 'Ana', 'Morning everyone! Day 3 of no sugar in my coffee', now - D - 5 * H],
      ['f2', 'u-ben', 'Ben', 'Nice, how are you feeling?', now - D - 4.9 * H],
      ['f3', 'u-ana', 'Ana', 'Honestly better than I expected. Fewer crashes after lunch.', now - D - 4.85 * H],
      ['f4', me || 'u-me', 'Me', 'That is great to hear!', now - 3 * H],
      ['f5', 'u-cleo', 'Cleo', 'Anyone tried the walk after dinner thing? 10 minutes seems to help me a lot', now - 50 * 60e3],
      ['f6', 'u-ben', 'Ben', '@Cleo yes, every night this week', now - 40 * 60e3],
      ['f7', me || 'u-me', 'Me', 'Going to try it tonight', now - 5 * 60e3],
      ['f8', me || 'u-me', 'Me', 'Wish me luck', now - 4.5 * 60e3]
    ].map(([id, uid, by, t, ts]) => ({ id, uid, by, t, ts, rx: {} }));
    LowiCommunityHost.replace(rows, [{ message_id: 'f5', user_id: 'u-ana', who: 'Ana', emoji: '💚' }]);
    LowiCommunity.refresh();
  }, me);
  await L.sleep(800);
  await page.evaluate(() => { const b = document.querySelector('#cmPaneChat [data-chat="history"]'); if (b) b.click(); });
  await L.sleep(1500);
  await page.screenshot({ path: out + '-open.png' });
  const geo = await page.evaluate(() => {
    const r = s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), bg: cs.backgroundColor, bgi: cs.backgroundImage.slice(0, 80), disp: cs.display, op: cs.opacity }; };
    const out = {};
    for (const s of ['#cmPaneChat', '#cmPaneChat .cp-bar', '#csStatus', '#cpRoom', '#cgThread', '#cgThread .cg-thead', '#cmList', '.cm-compose', '#cgTo', '#cmInput', '#cmSend', '#tabbar', '.cr-head', '.cr-crew', '.cr-day', '#cm-f5 .cm-bub', '#cm-f7 .cm-bub', '#cm-f5 .cs-name']) out[s] = r(s);
    out.texts = [...document.querySelectorAll('#cgThread .cg-thead, #cgThread .cr-crew, #cmList > *')].map(e => e.className + ' | ' + e.innerText.replace(/\s+/g, ' ').slice(0, 90));
    out.at = [[195,90],[195,130],[195,150],[60,300],[195,250]].map(([x,y]) => { const e = document.elementFromPoint(x,y); return x+','+y+' '+(e ? (e.id||'')+'.'+(e.className.baseVal!==undefined?e.className.baseVal:e.className)+' <'+(e.parentElement&&(e.parentElement.id||e.parentElement.className))+'>' : null); });
    out.bgs = ['.cr-head','.cr-crew','.cr-crews','.cr-id','#cgThread','.cr-sky','#crLink'].map(s=>{const e=document.querySelector(s);const c=getComputedStyle(e);return s+' bg='+c.backgroundColor+' img='+c.backgroundImage.slice(0,60)+' bf='+c.backdropFilter+' sh='+c.boxShadow.slice(0,50)+' z='+c.zIndex+' pos='+c.position;});
    out.vh = innerHeight; out.vw = innerWidth; out.uid = LowiCommunityHost.state().uid;
    out.active = document.activeElement && (document.activeElement.id || document.activeElement.className);
    return out;
  });
  console.log('me', me); console.log(JSON.stringify(geo, null, 1));
  if (process.env.TYPE) {
    await page.tap('#cmInput').catch(() => {}); await page.keyboard.type('hello room', { delay: 20 }); await L.sleep(600);
    await page.screenshot({ path: out + '-typing.png' });
    console.log('typing', JSON.stringify(await page.evaluate(() => { const b = document.querySelector('#cmInput').getBoundingClientRect(); return { inputY: Math.round(b.y), list: document.querySelector('#cmList').getBoundingClientRect().height, typingClass: document.documentElement.classList.contains('cs-chat-typing') }; })));
  }
  if (process.env.BACK) {
    await page.keyboard.press('Escape'); await L.sleep(800);
    console.log('afterEsc', await page.evaluate(() => ({ open: document.querySelector('#cgThread').hasAttribute('data-open'), room: document.querySelector('#cmPaneChat').dataset.room || '', focus: document.activeElement && (document.activeElement.className || document.activeElement.id) })));
  }
  const s = await L.snap(h); console.log('errors', JSON.stringify(h.log.pageerror), JSON.stringify((h.log.console || []).filter(x => /error/i.test(x.type || '')).slice(0, 5)));
  await h.browser.close(); if (srv) srv.close();
})();
