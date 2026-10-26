'use strict';
/* Oct 26: the What's New / tutorial card on screen gets its speaker even when tutorial-voice.js arrives late (DELAY=ms holds it back).
   node tools/check-tutorial-speaker-late.cjs <root|url> <chromium|webkit> <en|de|es> */
const H = require('./sim/harness.cjs');
const where = process.argv[2] || '.', eng = process.argv[3] || 'chromium', lang = process.argv[4] || 'en';
const live = /^https?:/.test(where);
(async () => {
  const o = { engine: eng, members: 4, messages: 4, probe: false, lang }; if (live) o.url = where; else o.root = where;
  const R = await H.open(o), P = R.page; await P.setViewportSize({ width: 390, height: 844 });
  await R.ctx.addInitScript(([l]) => { try { localStorage.setItem('lowi.news.seen', JSON.stringify(['gender-condnote-20261024-213102','meal-speaker-20261024-203549','after-meal-20261024-165036','scan-kitchen-20261024-143855','cycle-care-20261024-133800','kitchen-20261024-131628','tutorial-voice-speed-20261024-102918','people-directory-20261024-100757','scan-hold-20261024-094605','birthday-card-20261024-082625','chat-real-people-20261024-082117'])); localStorage.setItem('lowi.news.tourseen', localStorage.getItem('lowi.news.seen')); localStorage.setItem('lowi.g1.auto', '1'); localStorage.setItem('lowi.lang', l); localStorage.setItem('lowispike.lang', l); const ss = Storage.prototype.setItem; Storage.prototype.setItem = function (k, x) { if (k === 'lowi.news.seen' || k === 'lowi.news.tourseen') return; ss.call(this, k, x); }; } catch (e) { } }, [lang]);
  if (process.env.DELAY) await P.route(u => /tutorial-voice\.js/.test(String(u)), async r => { await H.sleep(+process.env.DELAY); r.continue(); });
  let aborted = 0; if (process.env.ABORT) await P.route(u => /tutorial-voice\.js/.test(String(u)), r => { if (!aborted++) return r.abort(); return r.continue(); });
  await R.goto();
  const st = () => P.evaluate(() => { const t = document.getElementById('ltTour'); const sp = t && t.querySelector('.lt-speak'); const r = sp && sp.getBoundingClientRect(); return { on: !!(window.LowiTutorial && LowiTutorial.isOn()), step: window.LowiTutorial && LowiTutorial.step(), count: ((t && t.querySelector('.lt-count')) || {}).textContent, speak: !!sp, rect: r ? [r.x, r.y, r.width, r.height].map(Math.round) : null, vis: sp ? getComputedStyle(sp).display + '/' + getComputedStyle(sp).visibility : '', voice: !!window.LowiTutorialVoice, top: sp ? (document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) || {}).className : '', has: window.LowiTutorialVoice && LowiTutorialVoice.has ? LowiTutorialVoice.has(LowiTutorial.step()) : 'n/a' }; });
  for (let k = 0; k < 60; k++) { await H.sleep(500); const s = await st(); if (s.on) break; }
  const early = await st(); console.log('0 (before the voice file)', JSON.stringify(early));
  for (let k = 0; k < 60; k++) { if (await P.evaluate(() => !!window.LowiTutorialVoice)) break; await H.sleep(500); } await H.sleep(800);
  console.log('1', JSON.stringify(await st())); await R.shot('/tmp/gh-1-' + eng + '-' + lang + '.png');
  await P.click('#ltTour [data-lt="next"]').catch(e => console.log('noclick', e.message)); await H.sleep(3500);
  console.log('2', JSON.stringify(await st())); await R.shot('/tmp/gh-2-' + eng + '-' + lang + '.png');
  if (process.env.ABORT) console.log('voice file requests', aborted);
  console.log('errs', JSON.stringify(R.errs.slice(0, 3)));
  await R.close();
})();
