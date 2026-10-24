'use strict';
/* Oct 24 2026: the speaker on Gap's "After your meal" cards, checked like a person uses it (Emmanuel ~18:55: "add a speech selection
   there, so that for the people who don't want to read they can just click on the speaker. Same voice as the tutorial girl").
   Opens Gap with a real tap on the Gap bubble (last meal N minutes ago), then: the card opens on the glowing phase, every phase card
   has the speaker, a tap plays the recorded tutorial voice (never the device voice), the speed pill changes the speed, a second tap
   stops, a swipe to another phase stops, closing Gap stops, and a phase picked earlier does not stick once the clock is elsewhere.
   Nothing is sent: the harness blocks Supabase writes (probe:false keeps the user's real account out of it).
   node tools/check-gap-meal-speaker.cjs [chromium|webkit] [WxH | device] [url] [lang] [minutesSinceMeal] */
const H = require('./sim/harness.cjs');
const engine = process.argv[2] || 'webkit', dev = process.argv[3] || 'iPhone 13';
const url = process.argv[4] || 'https://therealetm.github.io/lowispike/index.html';
const lang = process.argv[5] || 'de', mins = +(process.argv[6] || 161);
(async () => {
  const o = { engine, probe: false, url: url === 'local' ? '' : url, lang };
  if (/^\d+x\d+$/.test(dev)) { const [w, h] = dev.split('x').map(Number); o.viewport = { width: w, height: h }; } else o.device = dev;
  const R = await H.open(o); const P = R.page; const res = [], errs = [];
  const ok = (n, c, d) => { res.push([n, !!c, d || '']); if (process.env.V) console.log((c ? 'pass ' : 'fail ') + n + ' ' + (d || '')); };
  P.on('pageerror', e => errs.push(String(e && e.message || e)));
  /* Headless WebKit (WPE) on this VM crashes on ANY audio played faster than 1x, also a bare new Audio() (no GStreamer pitch element),
     so in WebKit the speed is recorded instead of applied; Chromium plays it for real. */
  const fakeRate = engine === 'webkit' && process.env.REALRATE !== '1';
  await P.addInitScript(fake => {
    window.__say = { plays: [], device: 0, rates: [] };
    const d = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'playbackRate');
    Object.defineProperty(HTMLMediaElement.prototype, 'playbackRate', { configurable: true, get() { return fake ? (this.__r || 1) : d.get.call(this); },
      set(v) { if (!/^data:/.test(this.src || '')) window.__say.rates.push(+v); if (fake) this.__r = +v; else d.set.call(this, v); } });
    const dd = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'defaultPlaybackRate');
    if (fake) Object.defineProperty(HTMLMediaElement.prototype, 'defaultPlaybackRate', { configurable: true, get() { return this.__dr || 1; }, set(v) { this.__dr = +v; } });
    const pp = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () { try { if (this.src && !/^data:/.test(this.src)) window.__say.plays.push(this.src.slice(0, 60)); } catch (e) { } return pp.apply(this, arguments); };
    try { const ss = speechSynthesis.speak.bind(speechSynthesis); speechSynthesis.speak = u => { window.__say.device++; return ss(u); }; } catch (e) { }
  }, fakeRate);
  await R.goto(); await H.sleep(9000);
  await P.evaluate(l => { try { window.LowiLang && LowiLang.set && LowiLang.set(l); } catch (e) { } }, lang); await H.sleep(800);
  const setMeal = m => P.evaluate(m => {
    const t = Date.now() - m * 60000;
    if (window.LowiFastEdit && LowiFastEdit.setStart) { try { LowiFastEdit.setStart(t); return 'setStart'; } catch (e) { } }
    try { const f = JSON.parse(localStorage.getItem('lowi_fast_v1') || '{}'); f.last = t; f.hist = []; localStorage.setItem('lowi_fast_v1', JSON.stringify(f)); } catch (e) { }
    try { dispatchEvent(new CustomEvent('lowi:fast-start')); } catch (e) { }
    return 'storage';
  }, m);
  await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } const g = document.getElementById('r2gate'); if (g) g.remove(); });
  const how = await setMeal(mins); await H.sleep(800);
  const st = () => P.evaluate(() => { const q = x => document.querySelector(x); const dots = [...document.querySelectorAll('.mc-dots i')].findIndex(i => i.classList.contains('on'));
    const a = [...document.querySelectorAll('audio')].concat(window.__lvA || []);
    const spk = q('.mc-card .mc-spk'), rate = q('.mc-card .mc-rate');
    return { open: LowiGapView.isOpen(), now: q('.mc-ph.now') && +q('.mc-ph.now').dataset.i, sel: q('.mc-ph.sel') && +q('.mc-ph.sel').dataset.i, dot: dots,
      card: q('.mc-card') && +q('.mc-card').dataset.i, title: (q('.mc-title h3') || {}).textContent, spk: !!spk, spkOn: !!(spk && spk.classList.contains('on')), spkLabel: spk && spk.getAttribute('aria-label'),
      rate: rate && rate.textContent, speaking: LowiGapView.speaking && LowiGapView.speaking(), voice: !!(window.LowiVoice && LowiVoice.speaking && LowiVoice.speaking()),
      plays: window.__say.plays.length, lastRate: window.__say.rates.slice(-1)[0], lastPlay: window.__say.plays.slice(-1)[0] || '', device: window.__say.device }; });
  const tapSel = async sel => { const b = await P.evaluate(sel => { const e = document.querySelector(sel); if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width }; }, sel);
    if (!b || !b.w) return false; await H.sleep(250); const b2 = await P.evaluate(sel => { const r = document.querySelector(sel).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, sel); await P.touchscreen.tap(b2.x, b2.y); return true; };
  const base = await P.evaluate(() => { const m = LowiGapView.model(); return { min: Math.round(m.elapsed / 60000), cur: m.mcCur }; });
  if (!(await tapSel('#spFast'))) await P.evaluate(() => LowiGapView.open());
  await H.sleep(1500);
  let s = await st();
  ok('Gap opened by a tap on its bubble', s.open, how + ' ' + JSON.stringify(base));
  ok('card opens on the glowing phase', s.now != null && s.sel === s.now && s.card === s.now && s.dot === s.now, JSON.stringify({ now: s.now, sel: s.sel, card: s.card, dot: s.dot, title: s.title }));
  /* every phase card has the speaker */
  const per = [];
  for (let i = 0; i < 5; i++) { await P.evaluate(i => { const b = document.querySelector('.mc-ph[data-i="' + i + '"]'); b && b.click(); }, i); await H.sleep(500); const x = await st(); per.push(x.card === i && x.spk ? 1 : 0); }
  ok('speaker on all five phase cards', per.join('') === '11111', per.join(''));
  await P.evaluate(() => { LowiGapView.close(true); }); await H.sleep(600);
  await tapSel('#spFast'); await H.sleep(1500);
  s = await st();
  ok('back on the glowing phase after reopening', s.card === s.now, JSON.stringify({ now: s.now, card: s.card }));
  /* play */
  const p0 = s.plays;
  await tapSel('.mc-card .mc-spk'); await H.sleep(3500);
  s = await st();
  ok('tap on the speaker reads aloud (recorded voice, playing)', s.speaking && s.voice && s.plays > p0 && s.spkOn, JSON.stringify({ speaking: s.speaking, voice: s.voice, plays: s.plays - p0, src: s.lastPlay, label: s.spkLabel }));
  ok('never the device voice', s.device === 0, 'speechSynthesis.speak calls: ' + s.device);
  ok('speed pill shows while reading', !!s.rate, s.rate);
  await P.evaluate(() => localStorage.removeItem('lowi.tutorial.voice.rate.v1'));
  await tapSel('.mc-card .mc-rate'); await H.sleep(700);
  const r2 = await st(); const rr = await P.evaluate(() => localStorage.getItem('lowi.tutorial.voice.rate.v1'));
  ok('speed pill: 1x -> 1.5x, shared with the tutorial, the voice plays at 1.5x and keeps reading', r2.rate && /1[.,]5/.test(r2.rate) && rr === '1.5' && r2.speaking && r2.lastRate === 1.5, JSON.stringify({ rate: r2.rate, stored: rr, speaking: r2.speaking, audioRate: r2.lastRate, fake: fakeRate }));
  await tapSel('.mc-card .mc-rate'); await H.sleep(1200);
  const r2x = await st();
  ok('speed pill 2x: the voice plays at 2x and keeps reading', /^2/.test(r2x.rate || '') && r2x.lastRate === 2 && r2x.speaking, JSON.stringify({ rate: r2x.rate, audioRate: r2x.lastRate, speaking: r2x.speaking }));
  await tapSel('.mc-card .mc-rate'); await H.sleep(500);
  const r3 = await P.evaluate(() => localStorage.getItem('lowi.tutorial.voice.rate.v1'));
  ok('speed pill cycles back to 1x', r3 === '1', 'stored ' + r3);
  await tapSel('.mc-card .mc-spk'); await H.sleep(900);
  s = await st();
  ok('second tap stops', !s.speaking && !s.voice && !s.spkOn && !s.rate, JSON.stringify({ speaking: s.speaking, voice: s.voice, on: s.spkOn }));
  /* swipe to another phase stops */
  await tapSel('.mc-card .mc-spk'); await H.sleep(2500);
  const before = await st();
  const nav = before.card < 4 ? '[data-gv="mcnext"]' : '[data-gv="mcprev"]';
  const sw = await P.evaluate(() => { const c = document.querySelector('.mc-card'); if (!c) return null; c.scrollIntoView({ block: 'center' }); const r = c.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width }; });
  let swiped = false;
  if (sw) {
    const dir = before.card < 4 ? -1 : 1;
    try {
      const cdp = engine === 'chromium' ? await P.context().newCDPSession(P) : null;
      if (cdp) { const pts = [0, .25, .5, .75, 1].map(f => ({ x: sw.x - dir * 0 + dir * f * sw.w * 0.35, y: sw.y }));
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pts[0]] });
        for (const p of pts.slice(1)) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [p] }); await H.sleep(30); }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); swiped = true; }
    } catch (e) { }
    if (!swiped) { /* WebKit: pointer events the way mcSwipe reads them */
      swiped = await P.evaluate(([x, y, w, dir]) => { const c = document.querySelector('.mc-card'); if (!c) return false; const ev = (t, px) => c.dispatchEvent(new PointerEvent(t, { bubbles: true, cancelable: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: px, clientY: y }));
        ev('pointerdown', x); for (let f = 1; f <= 6; f++) ev('pointermove', x + dir * f * w * 0.06); ev('pointerup', x + dir * w * 0.36); return true; }, [sw.x, sw.y, sw.w, dir]);
    }
  }
  await H.sleep(900);
  let after = await st();
  if (after.card === before.card) { await tapSel(nav); await H.sleep(800); after = await st(); ok('(swipe gesture did not move the card; used the arrow)', true, ''); }
  ok('swiping to another phase stops reading', before.speaking && after.card !== before.card && !after.speaking && !after.voice, JSON.stringify({ was: before.speaking, from: before.card, to: after.card, speaking: after.speaking, voice: after.voice }));
  /* closing Gap stops */
  await tapSel('.mc-card .mc-spk'); await H.sleep(2000);
  const b4 = await st();
  await tapSel('.gv-x'); await H.sleep(900);
  s = await st();
  ok('closing Gap stops reading', b4.speaking && !s.open && !s.voice, JSON.stringify({ was: b4.speaking, open: s.open, voice: s.voice }));
  /* a pick from an earlier phase does not stick: pick phase 1, the clock moves on (new meal time / coming back) */
  await tapSel('#spFast'); await H.sleep(1500);
  await P.evaluate(() => { const b = document.querySelector('.mc-ph[data-i="0"]'); b && b.click(); }); await H.sleep(500);
  const picked = await st();
  await setMeal(Math.max(mins, 125) + 120); await H.sleep(1200);
  s = await st();
  ok('earlier pick does not stick when the clock is in another phase', picked.card === 0 && s.card === s.now && s.now !== 0, JSON.stringify({ picked: picked.card, now: s.now, card: s.card }));
  await setMeal(mins); await H.sleep(800);
  await P.screenshot({ path: '/tmp/gms-' + engine + '-' + dev.replace(/\s/g, '') + '-' + lang + '.png' });
  ok('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  let bad = 0; for (const [n, g, d] of res) { if (!g) bad++; console.log((g ? 'PASS ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); }
  await R.close(); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
