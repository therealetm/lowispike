'use strict';
/* Misty sheet plan, phase 4 (Nov 5 2026): small meal photos leave the saved app data (lowispike.v2, which the account backup
   copies) and live in the photo database on this phone. Seeds 200 photo meals with a real 160 px thumbnail the old way
   (log.photo), lets the journal tidy them, then checks: no picture left in lowispike.v2, every log marked ph: 1, every
   thumbnail in IndexedDB, Misty's card and My Day still show the photo after a reload, and deleting a meal deletes both.
   Usage: node tools/misty-sheet/p4-thumbs.cjs [rootDir|url] [engine] */
const H = require('../sim/harness.cjs');
const fs = require('fs'), path = require('path');
const target = process.argv[2] || '.';
const engine = process.argv[3] || 'chromium';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('ok   ' + m); } else { fail++; console.log('FAIL ' + m); } };
(async () => {
  const o = { engine, members: 4, messages: 4, probe: false, lang: 'en', viewport: { width: 390, height: 844 } };
  if (/^https?:/.test(target)) o.url = target; else o.root = target;
  const R = await H.open(o); const P = R.page; const sleep = H.sleep;
  await P.addInitScript(() => { try { localStorage.setItem('lowi.theme', 'dark'); localStorage.setItem('lowi.theme.dark', 'black'); } catch (e) { } });
  await R.goto(); await sleep(7000);
  await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } const g = document.getElementById('r2gate'); if (g) g.remove(); });
  const jpg = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(__dirname, '..', 'regress', 'fixtures', 'photo0.jpg')).toString('base64');
  const seeded = await P.evaluate(async src => {
    const img = new Image(); img.src = src; await img.decode();
    const c = document.createElement('canvas'); const k = 160 / Math.max(img.naturalWidth, img.naturalHeight); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); const th = c.toDataURL('image/jpeg', .62);
    const now = Date.now(), add = [];
    for (let i = 0; i < 200; i++) add.push({ id: 'p4-' + i, ts: now - i * 8 * 36e5, t: 'Photo meal ' + i, spike: 'low', photo: th });
    S.logs = (S.logs || []).concat(add); save();
    return { thumb: th.length, before: (localStorage.getItem('lowispike.v2') || '').length };
  }, jpg);
  console.log('     seeded:', JSON.stringify(seeded));
  ok(seeded.before > 200 * seeded.thumb, 'old way: 200 thumbnails sit inside the saved app data (' + seeded.before + ' characters)');
  await P.evaluate(() => LowiMealJournal.boot()); await sleep(800);
  const after = await P.evaluate(() => new Promise(res => {
    const raw = localStorage.getItem('lowispike.v2') || '', st = JSON.parse(raw), mine = (st.logs || []).filter(l => /^p4-/.test(l.id));
    const rq = indexedDB.open('lowi-meal-photos', 1); rq.onsuccess = () => { const d = rq.result, x = d.transaction('photos', 'readonly'), r = x.objectStore('photos').getAllKeys(); r.onsuccess = () => {
      res({ len: raw.length, pics: (raw.match(/data:image\//g) || []).length, marked: mine.filter(l => l.ph === 1 && !l.photo).length, n: mine.length, keys: r.result.filter(k => /^t:p4-/.test(k)).length }); }; };
  }));
  console.log('     after:', JSON.stringify(after));
  ok(after.pics === 0, 'no picture left in the saved app data');
  ok(after.marked === 200 && after.n === 200, 'all 200 logs kept, each marked ph: 1');
  ok(after.keys === 200, 'all 200 thumbnails stored in the photo database on this phone');
  ok(after.len < seeded.before / 20, 'saved app data shrank from ' + seeded.before + ' to ' + after.len + ' characters');
  /* reload: the card and My Day read the thumbnails back */
  await P.reload();
  const t0 = Date.now(); let seen = -1; for (let i = 0; i < 60; i++) { await sleep(250); const v = await P.evaluate(() => [!!window.LowiMealJournal, document.readyState, !!(window.LowiMealJournal && LowiMealJournal.thumb({ id: 'p4-0', ph: 1 }))].join(','), null).catch(e => 'x'); if (/true$/.test(v)) { seen = Date.now() - t0; break; } }
  console.log('     thumbnails readable ' + seen + ' ms after reopening'); await sleep(Math.max(0, 7500 - (Date.now() - t0)));
  await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } const g = document.getElementById('r2gate'); if (g) g.remove(); });
  ok(await P.evaluate(() => /^data:image\/jpeg/.test(LowiMealJournal.thumb({ id: 'p4-0', ph: 1 }))), 'after reopening, the journal reads the thumbnail back');
  await P.evaluate(() => LowiMistyHub.open()); await sleep(1800);
  const card = await P.evaluate(() => [...document.querySelectorAll('#mistyHub img')].filter(i => /^data:image\/jpeg/.test(i.getAttribute('src') || '')).length);
  ok(card >= 1, 'Misty\'s card Today shows the meal photo (' + card + ')');
  await P.screenshot({ path: `/tmp/misty-p4-${engine}-today.png` });
  const html = await P.evaluate(() => LowiMealJournal.thumbHTML({ id: 'p4-1', ph: 1, t: 'x' }));
  ok(/<img alt="" src="data:image\/jpeg/.test(html), 'My Day / journal thumbnail button shows the photo');
  /* a new photo meal goes the same way */
  const fresh = await P.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = c.height = 300; const x = c.getContext('2d'); x.fillStyle = '#a63'; x.fillRect(0, 0, 300, 300);
    const pic = await LowiMealJournal.prepare(c.toDataURL('image/jpeg', .8)); S.logs.push({ id: 'p4-new', ts: Date.now(), t: 'New', photo: pic.thumb }); save();
    await LowiMealJournal.keep('p4-new', pic);
    const l = JSON.parse(localStorage.getItem('lowispike.v2')).logs.find(l => l.id === 'p4-new');
    return { ph: l.ph, photo: !!l.photo, full: !!(await LowiMealJournal.getPhoto('p4-new')), thumb: !!LowiMealJournal.thumb(l) };
  });
  ok(fresh.ph === 1 && !fresh.photo && fresh.full && fresh.thumb, 'a new photo meal: full photo and thumbnail on the phone, none in the saved data ' + JSON.stringify(fresh));
  const del = await P.evaluate(async () => { await LowiMealJournal.delPhoto('p4-new'); return new Promise(res => { const rq = indexedDB.open('lowi-meal-photos', 1); rq.onsuccess = () => { const r = rq.result.transaction('photos').objectStore('photos').getAllKeys(); r.onsuccess = () => res(r.result.filter(k => /p4-new/.test(k)).length + (LowiMealJournal.thumb({ id: 'p4-new', ph: 1 }) ? 1 : 0)); }; }); });
  ok(del === 0, 'deleting a meal deletes its full photo and its thumbnail');
  const errs = R.errors ? R.errors.filter(e => /meal-journal|misty-sheet|misty-hub/.test(String(e))) : [];
  ok(!errs.length, 'no script errors ' + errs.slice(0, 2).join(' '));
  await R.close();
  console.log(`${engine}: ${pass}/${pass + fail}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('BROKEN', e.stack); process.exit(2); });
