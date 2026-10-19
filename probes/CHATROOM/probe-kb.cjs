'use strict';
/* Recent-voices clipping + composer with the keyboard open, in the open room.
   Keyboard A (iOS): only visualViewport shrinks (layout viewport and tab bar stay), like Safari on iPhone.
   Keyboard B (resize): the whole viewport shrinks, like some Android browsers.
   usage: node probe-kb.cjs <view> <url|dir> */
const L = require('/home/sprite/BUGHUNT/playtest/lib.cjs');
const KB = 336; // iPhone 13 portrait keyboard with the suggestion bar, in CSS px
(async () => {
  const view = process.argv[2] || 'iphone13', target = process.argv[3] || 'https://therealetm.github.io/lowispike/';
  let srv = null, url = target;
  if (!/^https?:/.test(target)) { srv = await L.serve(target); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
  const h = await L.open({ view, url, settle: 6000 });
  const { page } = h;
  await page.evaluate(() => { try { goTab('foryou'); } catch (e) {} });
  await L.sleep(3000);
  for (let i = 0; i < 40; i++) { const st = await page.evaluate(() => { const e = document.querySelector('#csStatus'); return e && e.dataset.state; }); if (st && st !== 'loading') { console.log('transport', st); break; } await L.sleep(500); }
  await page.evaluate(() => {
    const me = LowiCommunityHost.state().uid, now = Date.now(), H = 3600e3, names = ['Ana', 'Ben', 'Cleo', 'Dario', 'Eli', 'Fatima', 'Gus', 'Hana', 'Ivo'], rows = [];
    for (let i = 0; i < 30; i++) { const n = names[i % names.length], mine = i % 5 === 4; rows.push({ id: 'k' + i, uid: mine ? me : 'u-' + n, by: n, t: 'Message ' + i + ' with a few words in it', ts: now - (30 - i) * 0.5 * H, rx: {} }); }
    LowiCommunityHost.replace(rows, []); LowiCommunity.refresh();
  });
  await L.sleep(500);
  await page.evaluate(() => document.querySelector('#cmPaneChat [data-chat="history"]').click());
  await L.sleep(1500);
  for (let i = 0; i < 20 && !(await page.evaluate(() => !!document.querySelector('#crCrew .cr-crews'))); i++) { await page.evaluate(() => { const rows = LowiCommunityHost.messages(); LowiCommunity.refresh(); }); await L.sleep(700); }
  const crew = await page.evaluate(() => {
    const sc = document.querySelector('#crCrew .cr-crews'), room = document.querySelector('#cgThread').getBoundingClientRect(), r = sc.getBoundingClientRect(), cs = getComputedStyle(sc);
    const mates = [...sc.querySelectorAll('.cr-mate')].map(b => { const m = b.getBoundingClientRect(); return { l: Math.round(m.left), r: Math.round(m.right), visible: m.right > r.left + 1 && m.left < r.right - 1, fully: m.left >= r.left - .5 && m.right <= r.right + .5 }; });
    return { scroller: { l: Math.round(r.left), r: Math.round(r.right), overflowX: cs.overflowX, scrollW: sc.scrollWidth, clientW: sc.clientWidth, mask: cs.webkitMaskImage || cs.maskImage }, room: { l: Math.round(room.left), r: Math.round(room.right) }, scrollerInsideRoom: r.left >= room.left - .5 && r.right <= room.right + .5, mates, fullyVisible: mates.filter(m => m.fully).length, partly: mates.filter(m => m.visible && !m.fully).length, hidden: mates.filter(m => !m.visible).length };
  });
  console.log('crew', JSON.stringify(crew));
  // scroll the strip to the end: last mate must become fully visible and tappable
  const end = await page.evaluate(async () => { const sc = document.querySelector('#crCrew .cr-crews'); sc.scrollLeft = sc.scrollWidth; await new Promise(r => setTimeout(r, 300)); const r = sc.getBoundingClientRect(), b = [...sc.querySelectorAll('.cr-mate')].pop(), m = b.getBoundingClientRect(), top = document.elementFromPoint(m.x + m.width / 2, m.y + m.height / 2); sc.scrollLeft = 0; return { lastFully: m.left >= r.left - .5 && m.right <= r.right + .5, lastOnTop: !!top && (top === b || b.contains(top)) }; });
  console.log('crewEnd', JSON.stringify(end));
  const state = async (label) => { await L.sleep(900); const s = await page.evaluate((kb) => {
      const vv = window.visualViewport, vh = vv ? vv.height : innerHeight, inp = document.querySelector('#cmInput').getBoundingClientRect(), list = document.querySelector('#cmList').getBoundingClientRect(), room = document.querySelector('#cgThread').getBoundingClientRect(), head = document.querySelector('.cr-head').getBoundingClientRect(), send = document.querySelector('#cmSend') && document.querySelector('#cmSend').getBoundingClientRect(), pane = document.querySelector('#cmPaneChat').getBoundingClientRect(), top = document.elementFromPoint(inp.x + inp.width / 2, inp.y + inp.height / 2);
      const lastMsg = [...document.querySelectorAll('#cmList .cm-msg')].pop().getBoundingClientRect();
      return { typing: document.documentElement.classList.contains('cs-chat-typing'), mapTyping: document.documentElement.classList.contains('cs-chat-map-typing'), focus: document.activeElement && document.activeElement.id, visibleH: Math.round(vh), innerH: innerHeight, kbH: document.querySelector('#cmPaneChat').style.getPropertyValue('--cs-keyboard-height'), pane: [Math.round(pane.top), Math.round(pane.bottom)], head: [Math.round(head.top), Math.round(head.bottom)], room: [Math.round(room.top), Math.round(room.bottom)], listH: Math.round(list.height), input: [Math.round(inp.top), Math.round(inp.bottom)], inputAboveKb: inp.bottom <= vh + .5 && inp.top >= 0, inputOnTop: !!top && (top.id === 'cmInput' || top.closest && !!top.closest('#cmInput')), gapUnderComposer: Math.round(vh - Math.max(inp.bottom, send ? send.bottom : 0)), lastMsgVisible: lastMsg.bottom <= list.bottom + 1 && lastMsg.top >= list.top - 1, crewShown: getComputedStyle(document.querySelector('#crCrew')).display !== 'none', tabbarVisible: getComputedStyle(document.querySelector('#tabbar')).visibility };
    }, KB); console.log(label, JSON.stringify(s)); return s; };
  await state('rest');
  await page.tap('#cmInput').catch(() => page.focus('#cmInput'));
  await page.keyboard.type('hello room', { delay: 15 });
  // A: iOS keyboard, visualViewport only
  await page.evaluate((kb) => {
    const real = window.visualViewport, H = innerHeight - kb;
    const fake = new Proxy(real, { get(t, k) { if (k === 'height') return H; if (k === 'offsetTop') return 0; const v = Reflect.get(t, k); return typeof v === 'function' ? v.bind(t) : v; } });
    window.__realVV = real; Object.defineProperty(window, 'visualViewport', { configurable: true, get: () => fake });
    real.dispatchEvent(new Event('resize'));
  }, KB);
  await state('kb-ios');
  await page.screenshot({ path: '/home/sprite/CHATROOM/kb-ios-' + view + '.png' });
  // keyboard closes
  await page.evaluate(() => { Object.defineProperty(window, 'visualViewport', { configurable: true, get: () => window.__realVV }); document.activeElement.blur(); window.__realVV.dispatchEvent(new Event('resize')); });
  await state('kb-closed');
  // B: layout viewport shrinks
  const vs = page.viewportSize();
  await page.tap('#cmInput').catch(() => page.focus('#cmInput'));
  await page.setViewportSize({ width: vs.width, height: vs.height - KB });
  await state('kb-resize');
  await page.evaluate(() => { window.dispatchEvent(new Event('resize')); });
  await state('kb-resize-after-manual-resize-event');
  await page.setViewportSize(vs); await page.evaluate(() => document.activeElement.blur());
  await state('kb-resize-closed');
  console.log('errors', JSON.stringify(h.log.pageerror));
  await h.browser.close(); if (srv) srv.close();
})();
