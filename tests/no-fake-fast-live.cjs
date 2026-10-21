'use strict';
/* Browser check (Oct 19, 2026, "I've been fasting for nineteen hours" on a brand new account): a just-onboarded person with no
   meal logged must see no fast anywhere, an old 8 PM guess left by earlier builds is set aside, the first real meal (Gap sheet
   or Log meal) starts the clock, and a reload keeps it. Runs on the ring Home with the local fixture session (no network writes).
   Usage: node tests/no-fake-fast-live.cjs [--root DIR | --url URL] [--view chromium390|iphone13|ipadP|ipadL] [--lang en|de|es]
   Uses the bug-hunt playtest library (PLAYTEST_LIB or /home/sprite/BUGHUNT/playtest/lib.cjs). Exit 1 on failure. */
const path = require('path');
const L = require(process.env.PLAYTEST_LIB || '/home/sprite/BUGHUNT/playtest/lib.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const TTS = `try{const f={speaking:false,pending:false,paused:false,speak(u){setTimeout(()=>{try{u.onend&&u.onend({})}catch(e){}},300)},cancel(){},pause(){},resume(){},getVoices(){return []},addEventListener(){},removeEventListener(){}};Object.defineProperty(window,'speechSynthesis',{value:f,configurable:true});}catch(e){}`;
/* one-time seed of the exact value old builds wrote (8 PM yesterday, or today after 8 PM) */
const LEGACY = `try{ if(!sessionStorage.getItem('nf.seeded')){ sessionStorage.setItem('nf.seeded','1'); const d=new Date(); if(d.getHours()<20) d.setDate(d.getDate()-1); d.setHours(20,0,0,0); localStorage.setItem('lowi_fast_v1', JSON.stringify({last:d.getTime(), water:{}})); } }catch(e){}`;
/* the harness aborts every Supabase request on purpose, so WebKit's "Fetch API cannot load ... supabase.co" is expected noise */
const real = a => a.filter(x => !/Fetch API cannot load https:\/\/[a-z0-9]+\.supabase\.co\//.test(x));
const read = h => h.page.evaluate(() => {
  let f = {}; try { f = JSON.parse(localStorage.getItem('lowi_fast_v1') || '{}'); } catch (e) { }
  const g = document.querySelector('#spFast .sp-fast-copy');
  return { last: +f.last || 0, guess: +f.guess || 0, noGuess: f.noGuess || 0, gap: g && g.querySelector('b') ? g.querySelector('b').textContent.replace(/\s+/g, ' ').trim() : null,
    start: window.LowiFastStop ? LowiFastStop.startOf() : -1, cardHrs: window.LOWI_FAST ? LOWI_FAST.hours() : -1 };
});
(async () => {
  const srv = arg('url', '') ? null : await L.serve(path.resolve(arg('root', path.join(__dirname, '..'))));
  const url = arg('url', '') || `http://127.0.0.1:${srv.address().port}/index.html`;
  const view = arg('view', 'iphone13'), lang = arg('lang', 'en');
  const out = { view, lang, url }, fails = [];
  const LANG = `try{localStorage.setItem('lowispike.lang','${lang}');}catch(e){}`;
  const check = (ok, what) => { if (!ok) fails.push(what); };

  /* 1. brand new account on Home */
  let h = await L.open({ url, view, lang, preInit: TTS + LANG, settle: 4000 });
  await L.sleep(1500);
  out.fresh = await read(h);
  check(out.fresh.last === 0 && out.fresh.start === 0 && out.fresh.cardHrs === 0, 'fresh: a fast start was invented ' + JSON.stringify(out.fresh));
  check(out.fresh.gap === '—', 'fresh: Gap does not show the empty dash: ' + out.fresh.gap);
  /* the Ate-earlier sheet asks, it does not end a fake fast */
  out.sheet = await h.page.evaluate(() => { LowiFastStop.open(); const s = document.querySelector('.fst-sh'); return s ? s.textContent.replace(/\s+/g, ' ').trim().slice(0, 240) : null; });
  check(out.sheet && !/XP|You fasted|Du hast gefastet|Ayunaste|since \d|seit \d|desde las \d/.test(out.sheet), 'sheet: shows a fast, a goal or points: ' + out.sheet);
  await h.page.evaluate(() => { try { closeSheet(); } catch (e) { } });
  await L.sleep(500);
  /* first meal via Log meal */
  const t0 = Date.now();
  out.logged = await h.page.evaluate(() => { const r = LowiVitalsBridge.logMeal({ id: 'nf:test:' + Date.now(), t: 'Omelette', via: 'test' }); return !!r; });
  for (let i = 0; i < 16; i++) { await L.sleep(300); out.afterMeal = await read(h); if (out.afterMeal.gap && /0\s*h/.test(out.afterMeal.gap)) break; }
  out.afterMealMs = Date.now() - t0;
  check(out.afterMeal.last >= t0 - 2000 && out.afterMeal.last <= Date.now(), 'Log meal did not start the clock ' + JSON.stringify(out.afterMeal));
  check(out.afterMeal.gap && /0\s*h/.test(out.afterMeal.gap), 'Gap after first meal is not at 0 h: ' + out.afterMeal.gap);
  /* reload keeps it, nothing re-guessed */
  await h.page.reload({ waitUntil: 'load' });
  await h.page.waitForFunction(() => typeof window.goTab === 'function', null, { timeout: 90000 }).catch(() => { });
  await L.sleep(4000);
  out.reload = await read(h);
  check(out.reload.last === out.afterMeal.last, 'reload changed the clock ' + JSON.stringify(out.reload));
  const e1 = await L.snap(h);
  out.errs1 = e1; out.pageerror1 = h.log.pageerror.slice();
  check(!e1.err.length && !real(h.log.pageerror).length, 'page errors (fresh run)');
  await h.page.screenshot({ path: `/tmp/no-fake-fast-${view}-${lang}.png` }).catch(() => { });
  await h.browser.close();

  /* 2. a device that still holds the old 8 PM guess */
  h = await L.open({ url, view, lang, preInit: TTS + LANG + LEGACY, settle: 4000 });
  await L.sleep(1000);
  out.legacy = await read(h);
  check(out.legacy.last === 0 && out.legacy.guess > 0 && out.legacy.noGuess === 1, 'old guess not set aside ' + JSON.stringify(out.legacy));
  check(out.legacy.gap === '—', 'legacy: Gap still shows hours: ' + out.legacy.gap);
  /* first meal via the Gap sheet: I just ate */
  await h.page.evaluate(() => { LowiFastStop.open(); });
  /* wait until the sheet has finished sliding in (a tap mid-animation can miss the button) */
  await h.page.waitForFunction(() => { const b = document.querySelector('.fst-sh .fst-go'); if (!b) return false; const q = b.getBoundingClientRect(); return q.height > 30 && q.bottom <= innerHeight; }, null, { timeout: 8000 }).catch(() => { });
  await L.sleep(400);
  out.legacyTap = await h.page.evaluate(() => { const b = document.querySelector('.fst-sh .fst-go'); if (!b) return null; const q = b.getBoundingClientRect(); const el = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return { rect: [q.left, q.top, q.width, q.height].map(Math.round), hit: el ? (el.id || String(el.className)).slice(0, 60) : null, sheets: document.querySelectorAll('.fst-sh').length }; });
  /* tap like a finger; the sheet can still be settling in a fresh session on iPad, so re-measure and retry up to 3 times */
  out.legacyTries = 0;
  for (let i = 0; i < 3; i++) {
    out.legacyTries++;
    const go = await L.center(h, '.fst-sh .fst-go');
    if (go) await L.tap(h, go.x, go.y); else { fails.push('no I-just-ate button'); break; }
    await L.sleep(1200);
    if ((await read(h)).last > 0) break;
    await L.sleep(1500);
  }
  out.legacyAte = await read(h);
  check(out.legacyAte.last > Date.now() - 60000, 'I just ate did not start the clock ' + JSON.stringify(out.legacyAte));
  const e2 = await L.snap(h);
  out.errs2 = e2; out.pageerror2 = h.log.pageerror.slice();
  check(!e2.err.length && !real(h.log.pageerror).length, 'page errors (legacy run)');
  await h.browser.close();
  if (srv) srv.close();
  out.fails = fails;
  console.log(JSON.stringify(out, null, 1));
  console.log(fails.length ? 'FAIL' : 'PASS');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
