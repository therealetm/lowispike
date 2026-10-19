'use strict';
/* Browser check (new-user walkthrough, Oct 19, 2026): on a first-timer's ring Home, Misty's "Drag to look around" hint must
   actually show (not stay hidden behind the bubbles), fully on screen, and never on a ring bubble, the joystick or Misty.
   Usage: node tests/newuser-hint-live.cjs [--root DIR | --url URL] [--view chromium390|iphone13|ipadP|ipadL]
   Uses the bug-hunt playtest library (PLAYTEST_LIB or /home/sprite/BUGHUNT/playtest/lib.cjs). Exit 1 on failure. */
const path = require('path');
const L = require(process.env.PLAYTEST_LIB || '/home/sprite/BUGHUNT/playtest/lib.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const TTS = `try{const f={speaking:false,pending:false,paused:false,speak(u){setTimeout(()=>{try{u.onend&&u.onend({})}catch(e){}},300)},cancel(){},pause(){},resume(){},getVoices(){return []},addEventListener(){},removeEventListener(){}};Object.defineProperty(window,'speechSynthesis',{value:f,configurable:true});}catch(e){}
try{localStorage.removeItem('lowi.wh.hint.v1');}catch(e){}`;
(async () => {
  const srv = arg('url', '') ? null : await L.serve(path.resolve(arg('root', path.join(__dirname, '..'))));
  const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`;
  const view = arg('view', 'iphone13');
  const h = await L.open({ url, view, preInit: TTS, settle: 3000 });
  let best = null;
  for (let i = 0; i < 40 && !best; i++) {
    await L.sleep(250);
    const r = await h.page.evaluate(() => {
      const e = document.getElementById('whHint'); if (!e || !e.classList.contains('on')) return null;
      const cs = getComputedStyle(e); if (cs.visibility === 'hidden') return { hidden: true, text: e.textContent };
      const b = e.getBoundingClientRect();
      const hit = [];
      document.querySelectorAll('[data-orbit], #whPad, #spBubble, #spFast, #whHud .wh-water, #tabbar').forEach(o => {
        const q = o.getBoundingClientRect(); if (!q.width || !q.height || getComputedStyle(o).visibility === 'hidden') return;
        if (q.left < b.right - 1 && q.right > b.left + 1 && q.top < b.bottom - 1 && q.bottom > b.top + 1) hit.push(o.id || o.getAttribute('data-orbit') || o.className.split(' ')[0]);
      });
      return { text: e.textContent, dock: e.classList.contains('wh-dock'), say: e.classList.contains('wh-say'), rect: [b.left, b.top, b.width, b.height].map(Math.round),
        onScreen: b.left >= 0 && b.top >= 0 && b.right <= innerWidth && b.bottom <= innerHeight, hit, vw: innerWidth, vh: innerHeight };
    });
    if (r && !r.hidden) best = r; else if (r) best = best || null, h.last = r;
  }
  const errs = await L.snap(h);
  const ok = !!best && best.onScreen && best.hit.length === 0 && !errs.err.length && !h.log.pageerror.length;
  await h.page.screenshot({ path: `/tmp/newuser-hint-${view}.png` }).catch(() => { });
  console.log(JSON.stringify({ view, url, result: best || h.last || 'hint never on', errs, pageerror: h.log.pageerror }, null, 1));
  console.log(ok ? 'PASS' : 'FAIL');
  await h.browser.close(); if (srv) srv.close(); process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
