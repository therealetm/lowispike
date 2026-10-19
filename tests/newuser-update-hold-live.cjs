'use strict';
/* Browser check (new-user walkthrough, Oct 19, 2026): when a new build goes live while a brand-new user is in the starter plan
   (or the birthday step), the "I've got something new for you!" update bubble must wait until setup is closed, then show.
   Simulates the Q1 banner (#lcUpd on <html>) the version check adds when version.json has a newer build.
   Usage: node tests/newuser-update-hold-live.cjs [--root DIR | --url URL] [--view iphone13|chromium390]. Exit 1 on failure. */
const path = require('path');
const L = require(process.env.PLAYTEST_LIB || '/home/sprite/BUGHUNT/playtest/lib.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const TTS = `try{const f={speaking:false,pending:false,paused:false,speak(u){setTimeout(()=>{try{u.onend&&u.onend({})}catch(e){}},300)},cancel(){},pause(){},resume(){},getVoices(){return []},addEventListener(){},removeEventListener(){}};Object.defineProperty(window,'speechSynthesis',{value:f,configurable:true});}catch(e){}
try{localStorage.setItem('lowi.g1.auto','1');}catch(e){}`;
(async () => {
  const srv = arg('url', '') ? null : await L.serve(path.resolve(arg('root', path.join(__dirname, '..'))));
  const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`;
  const view = arg('view', 'iphone13');
  const h = await L.open({ url, view, preInit: TTS, settle: 3000 });
  const st = () => h.page.evaluate(() => { const g = document.getElementById('g1Ob'), p = document.querySelector('.hs-ivov.on');
    const on = e => { if (!e) return false; const r = e.getBoundingClientRect(), c = getComputedStyle(e); return r.width > 4 && r.height > 4 && c.display !== 'none' && c.visibility !== 'hidden' && +c.opacity > 0.05; };
    return { plan: on(p), upd: on(g) && /new|Update|Neu|nuevo/i.test(g.innerText), updText: g ? g.innerText.slice(0, 80) : '' }; });
  /* open the starter plan the way a new user meets it */
  const opened = await h.page.evaluate(() => { try { if (window.LowiHerbStart && LowiHerbStart.openInterview) { LowiHerbStart.openInterview(); return 'openInterview'; } } catch (e) { } return ''; });
  let s0 = await st();
  for (let i = 0; i < 20 && !s0.plan; i++) { await L.sleep(300); s0 = await st(); }
  if (!s0.plan) { console.log(JSON.stringify({ note: 'starter plan did not open via API', opened, s0 })); }
  /* a newer build goes live: the Q1 check adds the banner */
  await h.page.evaluate(() => { const d = document.createElement('div'); d.id = 'lcUpd'; d.dataset.build = '29991231-235959'; d.textContent = 'Update'; document.documentElement.appendChild(d); });
  await L.sleep(4000);
  const during = await st();
  /* user leaves the plan (Not now / close) */
  await h.page.evaluate(() => { const o = document.querySelector('.hs-ivov.on'); if (!o) return; const b = [...o.querySelectorAll('button')].find(x => /Not now|Later|Close|Skip/i.test(x.innerText || x.getAttribute('aria-label') || '')); if (b) b.click(); else o.classList.remove('on'); });
  await L.sleep(5000);
  const after = await st();
  const ok = s0.plan && during.plan && !during.upd && !after.plan && after.upd && !h.log.pageerror.length;
  console.log(JSON.stringify({ view, url, opened, before: s0, during, after, pageerror: h.log.pageerror }, null, 1));
  console.log(ok ? 'PASS' : 'FAIL');
  await h.browser.close(); if (srv) srv.close(); process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
