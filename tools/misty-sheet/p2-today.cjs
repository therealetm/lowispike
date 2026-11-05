'use strict';
/* Misty sheet plan, phase 2 (Nov 5 2026): Misty's card has Today / History / <name> tabs in the Settings sheet's design.
   Seeds a day (2 meals, one with a photo thumbnail, a weigh-in), opens the card in Dark, checks the tabs and rows, and
   compares the shell with the Settings sheet (same overlay class, background, rim, row height, row font, section heading).
   Screens: /tmp/misty-p2-<engine>-<lang>-{today,misty,settings}.png
   Usage: node tools/misty-sheet/p2-today.cjs [rootDir|url] [engine] [lang] */
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
  /* seed today: two meals (one with a tiny photo thumbnail) and a weigh-in */
  await P.evaluate(() => {
    const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); x.fillStyle = '#6a4'; x.fillRect(0, 0, 32, 32);
    const ph = c.toDataURL('image/jpeg', .6), now = Date.now();
    S.logs = (S.logs || []).concat([{ id: 'p2a', ts: now - 36e5 * 3, t: 'Oats with berries', spike: 'low', photo: ph }, { id: 'p2b', ts: now - 36e5, t: 'Lentil soup', spike: 'medium' }]);
    S.health = S.health || {}; S.health.body = S.health.body || {}; S.health.body.weights = (S.health.body.weights || []).concat([{ ts: now - 864e5, kg: 78.4 }]);
    try { save && save(); } catch (e) { }
  });
  await sleep(500);
  ok(await P.evaluate(() => document.documentElement.getAttribute('data-black') === '1'), 'Dark (true black) is on');
  /* Settings first, for the comparison */
  await P.evaluate(() => LowiCommunityMe.open()); await sleep(1600);
  const look = sel => P.evaluate(sel => {
    const ov = [...document.querySelectorAll('.r2-ov.one-sheet')].find(o => !o.classList.contains('off') && o.querySelector(sel)); if (!ov) return null;
    const sh = ov.querySelector('.r2-sh') || ov.firstElementChild, cs = getComputedStyle(sh);
    const row = ov.querySelector('.cme-list > .cme-row'), rs = row && getComputedStyle(row), h3 = ov.querySelector('.cme-sec h3'), hs = h3 && getComputedStyle(h3);
    const list = ov.querySelector('.cme-list'), ls = list && getComputedStyle(list);
    return { cls: ov.className, bg: cs.backgroundColor + ' ' + cs.backgroundImage.slice(0, 60), radius: cs.borderTopLeftRadius, rowH: row && Math.round(row.getBoundingClientRect().height), rowFont: rs && rs.fontSize + ' ' + rs.color,
      h3: hs && hs.fontSize + ' ' + hs.textTransform + ' ' + hs.color, list: ls && ls.borderRadius + ' ' + ls.backgroundColor + ' ' + ls.borderTopColor };
  }, sel);
  const set = await look('#cmeSheet');
  await P.screenshot({ path: `/tmp/misty-p2-${engine}-${lang}-settings.png` });
  await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } }); await sleep(900);
  await P.evaluate(() => LowiMistyHub.open()); await sleep(1800);
  const mis = await look('#mistyHub');
  console.log('     settings:', JSON.stringify(set)); console.log('     misty   :', JSON.stringify(mis));
  ok(mis && /one-sheet/.test(mis.cls), 'Misty card uses the one-sheet shell');
  ok(set && mis && set.bg === mis.bg && set.radius === mis.radius, 'same sheet background and corner as Settings');
  ok(set && mis && set.list === mis.list, 'same row group (corner, fill, rim) as Settings');
  ok(set && mis && set.h3 === mis.h3, 'same section heading as Settings');
  ok(set && mis && set.rowFont === mis.rowFont, 'same row text as Settings');
  const tabs = await P.evaluate(() => [...document.querySelectorAll('#mistyHub .mh-tab')].map(b => b.textContent.trim() + (b.classList.contains('on') ? '*' : '')));
  ok(tabs.length === 3 && /\*$/.test(tabs[0]), 'three tabs, Today first and selected: ' + tabs.join(' | '));
  const today = await P.evaluate(() => ({ h3: [...document.querySelectorAll('#mistyHub .mh-body .cme-sec > h3')].map(h => h.textContent.trim()), rows: [...document.querySelectorAll('#mistyHub .mh-body .ms-row .cme-tx')].map(t => t.innerText.replace(/\s+/g, ' ').trim()), thumbs: document.querySelectorAll('#mistyHub .ms-thumbs img').length, peak: !!document.querySelector('#mistyHub .mh-body .ms-world') }));
  console.log('     today:', JSON.stringify(today));
  ok(today.h3.length >= 3, 'three groups: world, you, companion: ' + today.h3.join(' / '));
  ok(today.rows.some(r => /2/.test(r) && /(meal|Mahlzeit|comida)/i.test(r)), 'Food row counts 2 meals');
  ok(today.thumbs >= 1, 'meal photo thumbnail shown');
  ok(today.rows.some(r => /78[.,]4 kg/.test(r)), 'last weigh-in shown');
  ok(today.rows.some(r => /(No entries|Keine Eintr|Sin registros)/.test(r)), 'an empty line says no entries, not 0');
  await P.screenshot({ path: `/tmp/misty-p2-${engine}-${lang}-today.png` });
  /* companion tab */
  await P.evaluate(() => document.querySelectorAll('#mistyHub .mh-tab')[2].click()); await sleep(800);
  const comp = await P.evaluate(() => ({ doors: document.querySelectorAll('#mistyHub [data-door]').length, rename: !!document.querySelector('#mistyHub [data-mh="rename"]'), on: document.querySelector('#mistyHub').dataset.tab }));
  ok(comp.on === 'misty' && comp.doors >= 3 && comp.rename, 'companion tab: Look / Growth / Aura doors and Rename: ' + JSON.stringify(comp));
  await P.screenshot({ path: `/tmp/misty-p2-${engine}-${lang}-misty.png` });
  await P.evaluate(() => document.querySelector('#mistyHub [data-door="aura"]').click()); await sleep(700);
  ok(await P.evaluate(() => !!document.querySelector('#mhSec') && document.querySelector('#mistyHub').dataset.tab === 'misty'), 'Aura shop opens inside the companion tab');
  await P.evaluate(() => document.querySelectorAll('#mistyHub .mh-tab')[1].click()); await sleep(700);
  ok(await P.evaluate(() => document.querySelector('#mistyHub').dataset.tab === 'history' && !document.querySelector('#mhSec')), 'History tab switches and folds the shop');
  /* no horizontal overflow at iPhone SE width */
  await P.setViewportSize({ width: 320, height: 568 }); await sleep(600);
  await P.evaluate(() => document.querySelectorAll('#mistyHub .mh-tab')[0].click()); await sleep(600);
  ok(await P.evaluate(() => { const m = document.querySelector('#mistyHub'); return m && m.scrollWidth <= m.clientWidth + 1; }), 'no sideways overflow at iPhone SE width');
  const errs = R.errors ? R.errors.filter(e => /misty-sheet|misty-hub/.test(String(e))) : [];
  ok(!errs.length, 'no script errors from the sheet ' + errs.slice(0, 2).join(' '));
  await R.close();
  console.log(`${engine} ${lang}: ${pass}/${pass + fail}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('BROKEN', e.stack); process.exit(2); });
