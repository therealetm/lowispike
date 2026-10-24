'use strict';
/* What's New mini tour, in a real browser (Oct 23 2026). node tools/check-whats-new-tour.cjs [root|url] [iphone|ipad] [shotPrefix]
   A: an unseen release plays ONE tour in the tutorial card: intro, then each step opens its place (Move, Seller Zone, Home)
      and points at the new thing; the last card goes back home with nothing left open. Reload: nothing shows again.
   B: Skip on the first card ends it at once; reload: nothing shows again.
   Locally a test news entry is injected into version.json; against the live site the real one is used. */
const H = require('./sim/harness.cjs');
const where = process.argv[2] || '.', size = process.argv[3] || 'iphone', shots = process.argv[4] || '';
const VP = size === 'ipad' ? { width: 820, height: 1180 } : { width: 390, height: 844 };
const live = /^https?:/.test(where);
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m); } else { fail++; console.log('  FAIL', m); } };
const KEEP = () => { try {
  const v = localStorage.getItem('wnt.keep') || '["older-20261001-000000"]'; localStorage.setItem('lowi.news.seen', v); localStorage.setItem('lowi.g1.auto', '1'); localStorage.setItem('lowi.lang', 'de'); localStorage.setItem('lowispike.lang', 'de');
  const ss = Storage.prototype.setItem; Storage.prototype.setItem = function (k, x) { ss.call(this, k, x); if (k === 'lowi.news.seen') ss.call(this, 'wnt.keep', x); };
} catch (e) { } };
async function run(name, fn) {
  const o = { engine: 'chromium', members: 4, messages: 4, probe: false, lang: 'de' }; if (live) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page; await P.setViewportSize(VP);
  await R.ctx.addInitScript(KEEP);
  if (!live) await P.route(u => /\/version\.json/.test(String(u)), async r => {
    const res = await r.fetch(); const v = await res.json();
    v.news = Object.assign({}, v.news, { id: 'wnt-' + v.build, tour: ['new-deadlift', 'new-seller', 'new-sleep', 'new-sync'], history: [{ id: 'wnt-' + v.build, tour: ['new-deadlift', 'new-seller'] }, { id: 'wnt-older', tour: ['new-sleep', 'new-sync'] }] });
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(v) });
  });
  console.log(name, size);
  try { await fn(R, P); } catch (e) { fail++; console.log('  FAIL threw', e.message); }
  ok(!R.errs.filter(e => !/supabase|realtime|websocket/i.test(e.m)).length, 'no page errors ' + JSON.stringify(R.errs.slice(0, 2)));
  await R.close();
}
const state = P => P.evaluate(() => { const t = document.getElementById('ltTour'), vis = s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 2 && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden'; };
  const hole = t && t.querySelector('.lt-hole'); return { on: !!(t && !t.classList.contains('lt-out') && window.LowiTutorial.isOn()), mode: window.LowiTutorial.mode(), held: window.LowiTutorial.held(), step: window.LowiTutorial.step(), count: ((t && t.querySelector('.lt-count')) || {}).textContent || '', title: ((t && t.querySelector('.lt-title')) || {}).textContent || '', skip: ((t && t.querySelector('[data-lt="skipall"]')) || {}).textContent || '', cta: ((t && t.querySelector('[data-lt="next"]')) || {}).textContent || '',
    hole: !!(hole && hole.style.width), clash: (() => { const c = t && t.querySelector('.lt-card'); if (!c || !hole || !hole.style.width) return false; const a = c.getBoundingClientRect(), b = hole.getBoundingClientRect(); const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left), iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); return ix > 24 && iy > 24 ? Math.round(ix) + 'x' + Math.round(iy) : false; })(), cardIn: (() => { const c = t && t.querySelector('.lt-card'); if (!c) return false; const a = c.getBoundingClientRect(); return a.top >= -1 && a.left >= -1 && a.bottom <= innerHeight + 1 && a.right <= innerWidth + 1; })(), tab: (document.querySelector('.tab.active') || {}).id, ur: vis('.ur'), shop: vis('.stp-card'), sz: window.LowiStorePicks && LowiStorePicks.isOpen() ? LowiStorePicks.tab() : '', dl: vis('.mm-hero-dl'), sleep: vis('#whHud .o8-sleep'), offer: vis('.g1-ob') }; });
const waitTour = async (P, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const s = await state(P); if (s.on && !s.held) return s; await H.sleep(500); } return state(P); };
const next = async (P, want) => { await P.click('#ltTour [data-lt="next"]'); const t0 = Date.now(); let s; while (Date.now() - t0 < 6000) { await H.sleep(500); s = await state(P); if (want ? (s.step === want && !s.held && s.hole !== undefined) : !s.on) break; } await H.sleep(900); return state(P); };
const shot = async (R, n) => { const s = await state(R.page); ok(!s.clash && s.cardIn !== false, n + ': card on screen and not over the spotlight (' + s.clash + ')'); if (shots) await R.shot(shots + '-' + size + '-' + n + '.png'); };
const noRepeat = async (R, P) => { await P.reload({ waitUntil: 'load' }); await P.waitForFunction(() => window.goTab && document.getElementById('whPad'), null, { timeout: 120000 }).catch(() => { }); let seen = false; for (let k = 0; k < 24; k++) { await H.sleep(500); const s = await state(P); if (s.on || s.offer) { seen = true; break; } } ok(!seen, 'after reload: no What\'s New again, no other popup'); };

(async () => {
  await run('A: go through', async (R, P) => {
    await R.goto(); let s = await waitTour(P, 30000);
    ok(s.on && s.mode === 'news' && s.step === 'new-intro', 'one mini tour opens on its own: ' + s.step + ' / ' + s.title);
    ok(/^Neu ·/.test(s.count) && s.skip === 'Überspringen' && /Los geht/.test(s.cta), 'tutorial card: "' + s.count + '", "' + s.skip + '", "' + s.cta + '"');
    await shot(R, '1-intro');
    s = await next(P, 'new-deadlift'); ok(s.step === 'new-deadlift' && !s.ur && s.tab === 'tab-move' && s.dl && s.hole, 'Kreuzheben: Move open, spotlight on Kreuzheben (' + s.tab + ')'); await shot(R, '3-deadlift');
    s = await next(P, 'new-seller'); ok(s.step === 'new-seller' && s.shop && s.sz === 'sz' && s.hole && !s.held, 'Seller Zone: shop open on the Seller Zone tab, card above it (' + s.sz + ')'); await shot(R, '4-seller');
    s = await next(P, 'new-sleep'); ok(s.step === 'new-sleep' && !s.shop && s.tab === 'tab-home' && s.hole, 'Sleep: shop closed, Home, spotlight on Sleep'); await shot(R, '5-sleep');
    s = await next(P, 'new-sync'); ok(s.step === 'new-sync' && s.cta === 'Alles klar' && !s.skip, 'last card: "' + s.cta + '", no skip'); await shot(R, '6-sync');
    s = await next(P, ''); ok(!s.on && s.tab === 'tab-home' && !s.ur && !s.shop, 'Alles klar: tour ends on Home, nothing left open');
    const st = await P.evaluate(() => ({ seen: localStorage.getItem('lowi.news.seen'), tut: localStorage.getItem('lowi.tutorial.v1') }));
    ok(/wnt-|release|whats/.test(st.seen || '') || live, 'seen ids saved: ' + st.seen);
    await noRepeat(R, P);
  });
  await run('B: skip', async (R, P) => {
    await R.goto(); let s = await waitTour(P, 30000);
    ok(s.on && s.step === 'new-intro', 'tour opens');
    await P.click('#ltTour [data-lt="skipall"]'); await H.sleep(1200); s = await state(P);
    ok(!s.on && s.tab === 'tab-home', 'Überspringen ends it at once');
    await noRepeat(R, P);
  });
  console.log((fail ? 'FAIL ' : 'PASS ') + pass + '/' + (pass + fail));
  process.exit(fail ? 1 : 0);
})();
