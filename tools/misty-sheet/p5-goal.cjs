'use strict';
/* Misty sheet plan, phase 5 (Nov 5 2026): one daily goal. On Misty's card: World glow speaks of "Full glow", never "Supernova"
   (that is level 16 only); no Sun orb ([data-mh="t-sun"]) and no energy scale card (LowiMistyScale) on any tab; the Sun meter
   itself still works (LowiCycleWorld present).
   Usage: node tools/misty-sheet/p5-goal.cjs [rootDir|url] [engine] [lang] */
const H = require('../sim/harness.cjs');
const target = process.argv[2] || '.';
const engine = process.argv[3] || 'chromium';
const lang = process.argv[4] || 'en';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('ok   ' + m); } else { fail++; console.log('FAIL ' + m); } };
(async () => {
  const o = { engine, members: 4, messages: 4, probe: false, lang, viewport: { width: 390, height: 844 } };
  if (/^https?:/.test(target)) o.url = target; else o.root = target;
  const R = await H.open(o); const P = R.page; const sleep = H.sleep;
  await P.addInitScript(() => { try { localStorage.setItem('lowi.theme', 'dark'); localStorage.setItem('lowi.theme.dark', 'black'); } catch (e) { } });
  await R.goto(); await sleep(7000);
  await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } const g = document.getElementById('r2gate'); if (g) g.remove(); });
  const build = await P.evaluate(() => (document.querySelector('script[src*="meal-journal.js"]') || {}).src || '');
  console.log('     build: ' + (build.split('v=')[1] || '?'));
  await P.evaluate(() => LowiMistyHub.open()); await sleep(1800);
  const texts = [];
  for (let i = 0; i < 3; i++) {
    await P.evaluate(i => { const t = document.querySelectorAll('#mistyHub .mh-tab')[i]; if (t) t.click(); }, i); await sleep(800);
    texts.push(await P.evaluate(() => { const m = document.querySelector('#mistyHub'); return { tab: m && m.dataset.tab, text: m ? m.innerText : '', sun: m ? m.querySelectorAll('[data-mh="t-sun"]').length : -1, mh: m ? m.innerHTML : '' }; }));
  }
  const all = texts.map(t => t.text).join('\n');
  console.log('     tabs: ' + texts.map(t => t.tab).join(' | '));
  ok(texts.length === 3 && texts.every(t => t.text.length > 20), 'three tabs open with content');
  ok(!/Supernova/.test(all), 'no "Supernova" anywhere on the card (it is only level 16)');
  ok(/Full glow|Volles Leuchten|brillo total/i.test(all), 'World glow speaks of Full glow');
  ok(texts.every(t => t.sun === 0), 'no separate Sun orb on the card');
  const scaleHtml = await P.evaluate(() => { try { return window.LowiMistyScale && LowiMistyScale.html ? LowiMistyScale.html() : ''; } catch (e) { return ''; } });
  const firstTag = (scaleHtml.match(/class="([^"]+)"/) || [])[1] || '';
  const inCard = firstTag ? texts.some(t => t.mh.includes('class="' + firstTag + '"')) : false;
  ok(!inCard, 'no energy scale card on any tab' + (firstTag ? ' (.' + firstTag.split(' ')[0] + ')' : ''));
  ok(await P.evaluate(() => !!window.LowiCycleWorld), 'the Sun meter itself still runs');
  await P.screenshot({ path: `/tmp/misty-p5-${engine}-${lang}.png` });
  await R.close();
  console.log(`${engine} ${lang}: ${pass}/${pass + fail}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('BROKEN', e.stack); process.exit(2); });
