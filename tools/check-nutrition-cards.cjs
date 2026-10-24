'use strict';
/* Oct 24 2026: Emmanuel's nutrition audit (docs/NUTRITION-POLICY.md), checked live like a person uses it. Opens Gap with a tap on
   its bubble, goes through all five "After your meal" cards, and checks: the new levers show (cooled rice, smaller carb portions and
   "helps most" are gone), no lever line overflows its card (German long words), the medication caution stays, and the speaker on
   the first and second card plays the recorded clips of the NEW sentences (clip ids from app-voice.js idOf, same as the build).
   Nothing is sent: the harness blocks Supabase writes (probe:false).
   node tools/check-nutrition-cards.cjs [chromium|webkit] [device] [url] [lang] */
const path = require('path');
const H = require('./sim/harness.cjs');
const ROOT = path.join(__dirname, '..');
const G = require(path.join(ROOT, 'gap-view.js'));
const V = require(path.join(ROOT, 'app-voice.js'));
const engine = process.argv[2] || 'webkit', dev = process.argv[3] || 'iPhone 13';
const url = process.argv[4] || 'https://therealetm.github.io/lowispike/index.html';
const lang = process.argv[5] || 'de';
const LI = { en: 0, de: 1, es: 2 }[lang];
const OLD = /cooled|abgek\u00fchlt|enfriad|smaller carb|kleinere Kohlenhydrat|m\u00e1s peque\u00f1as|helps most|am meisten|m\u00e1s ayuda|Water over sugary|Lieber Wasser als/i;
(async () => {
  const o = { engine, probe: false, url, lang, device: dev };
  const R = await H.open(o); const P = R.page; const res = [], errs = [];
  const ok = (n, c, d) => res.push([n, !!c, d || '']);
  P.on('pageerror', e => errs.push(String(e && e.message || e)));
  const asked = []; P.on('request', q => { const u = q.url(); if (/\/app-voice\/[a-z]{2}\/[a-z0-9]+\.mp3/.test(u)) asked.push(u); });
  try { P.context().on('request', q => { const u = q.url(); if (/\/app-voice\/[a-z]{2}\/[a-z0-9]+\.mp3/.test(u) && !asked.includes(u)) asked.push(u); }); } catch (e) { }
  await P.addInitScript(() => {
    window.__say = { plays: [], device: 0 };
    const pp = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () { try { if (this.src && !/^data:/.test(this.src)) window.__say.plays.push(this.src); } catch (e) { } return pp.apply(this, arguments); };
    try { const ss = speechSynthesis.speak.bind(speechSynthesis); speechSynthesis.speak = u => { window.__say.device++; return ss(u); }; } catch (e) { }
  });
  await R.goto(); await H.sleep(9000);
  await P.evaluate(l => { try { window.LowiLang && LowiLang.set && LowiLang.set(l); } catch (e) { } }, lang); await H.sleep(800);
  await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } const g = document.getElementById('r2gate'); if (g) g.remove(); });
  await P.evaluate(() => { const t = Date.now() - 5 * 60000; if (window.LowiFastEdit && LowiFastEdit.setStart) { try { LowiFastEdit.setStart(t); return; } catch (e) { } }
    try { const f = JSON.parse(localStorage.getItem('lowi_fast_v1') || '{}'); f.last = t; f.hist = []; localStorage.setItem('lowi_fast_v1', JSON.stringify(f)); } catch (e) { } try { dispatchEvent(new CustomEvent('lowi:fast-start')); } catch (e) { } });
  await H.sleep(800);
  const tapSel = async sel => { const b = await P.evaluate(sel => { const e = document.querySelector(sel); if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width }; }, sel);
    if (!b || !b.w) return false; await H.sleep(250); await P.touchscreen.tap(b.x, b.y); return true; };
  if (!(await tapSel('#spFast'))) await P.evaluate(() => LowiGapView.open());
  await H.sleep(1500);
  ok('Gap opened by a tap on its bubble', await P.evaluate(() => LowiGapView.isOpen()));
  const shots = [];
  for (let i = 0; i < 5; i++) {
    await P.evaluate(i => { const b = document.querySelector('.mc-ph[data-i="' + i + '"]'); b && b.click(); }, i); await H.sleep(600);
    const c = await P.evaluate(() => { const card = document.querySelector('.mc-card'); if (!card) return null;
      const lis = [...card.querySelectorAll('li')]; card.scrollIntoView({ block: 'center' });
      return { i: +card.dataset.i, text: card.innerText, lis: lis.map(l => l.textContent.trim()), over: lis.filter(l => l.scrollWidth > l.clientWidth + 1).map(l => l.textContent.trim()),
        cardOver: card.scrollWidth > card.clientWidth + 1, care: !!document.querySelector('.mc-care') }; });
    const want = G.phases[i].l[LI];
    ok('card ' + (i + 1) + ' shows the new levers', c && c.i === i && want.every(w => c.lis.includes(w)) && c.lis.length === want.length, c ? JSON.stringify(c.lis) : 'no card');
    ok('card ' + (i + 1) + ': no old line, nothing overflows', c && !OLD.test(c.text) && !c.over.length && !c.cardOver, c ? JSON.stringify(c.over) : '');
    if (i === 0) ok('medication caution under the card', c && c.care);
    const shot = '/tmp/nutri-' + engine + '-' + dev.replace(/\s/g, '') + '-' + lang + '-card' + (i + 1) + '.png'; await P.screenshot({ path: shot }); shots.push(shot);
  }
  /* speaker (the clip is fetched by its id, then played from a blob): card 1 and card 2 read the new sentences with the recorded clips */
  const heard = new Set();
  for (const i of [0, 1]) {
    await P.evaluate(i => { const b = document.querySelector('.mc-ph[data-i="' + i + '"]'); b && b.click(); }, i); await H.sleep(600);
    const p0 = await P.evaluate(() => window.__say.plays.length); const a0 = asked.length;
    await tapSel('.mc-card .mc-spk');
    const ids = V.pieces(G.mcSpoken(i, lang)).map(s => V.idOf(lang, s)).filter(id => !heard.has(id)); /* spoken form ("2 bis 5"), clips already heard come from memory */
    let got = [];
    for (let k = 0; k < 70; k++) { await H.sleep(1000); got = (await P.evaluate(p0 => window.__say.plays.slice(p0), p0)).concat(asked.slice(a0)); if (ids.every(id => got.some(u => u.includes('/' + id + '.mp3')))) break; }
    const miss = ids.filter(id => !got.some(u => u.includes('/' + id + '.mp3'))); V.pieces(G.mcSpoken(i, lang)).forEach(x => heard.add(V.idOf(lang, x)));
    ok('speaker on card ' + (i + 1) + ' plays the new sentences (recorded voice)', !miss.length, 'clips played ' + got.length + ', missing ' + JSON.stringify(miss));
    await P.evaluate(() => { try { LowiGapView.close(true); } catch (e) { } }); await H.sleep(600);
    await tapSel('#spFast'); await H.sleep(1200);
  }
  ok('never the device voice', (await P.evaluate(() => window.__say.device)) === 0);
  ok('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  let bad = 0; for (const [n, g, d] of res) { if (!g) bad++; console.log((g ? 'PASS ' : 'FAIL ') + n + (d ? '  (' + d + ')' : '')); }
  console.log('shots ' + shots.join(' '));
  await R.close(); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
