'use strict';
/* Code method: every window.Lowi* module with an open/show/sheet/start-style function is called once with no arguments from
   Home (fixture user, network blocked), and whatever comes up is recorded and screenshotted. Compared with the tap crawl later,
   a surface that only shows up here is a candidate for "nicht erreichbar". */
const fs = require('fs'), path = require('path');
const L = require('../interface-audit/lib.cjs');
const OUT = process.env.OUT || '/home/sprite/inv-shots';
const apis = JSON.parse(fs.readFileSync(process.argv[2] || '/tmp/apis.json', 'utf8'));
const SKIPFN = /HTML$|^(goalLine|startOf|startedAt|opened|shown|shownLevel|shows|opening|goalsToday|goalById|goalText|toggleEquip|toggleTheme|toggleZoom|toggleAll|toggle|cardDate|goldFor|viewbox|gossipPick|gossip|showErr|pageGroups|showMs|showName|openCount|startHTML|view|card|go|openOut)$/;
const calls = [];
for (const [m, fns] of Object.entries(apis)) { if (/Core$/.test(m)) continue; for (const f of fns) if (!SKIPFN.test(f)) calls.push(m + '.' + f); }
const { existingSeed } = L;
const cr = fs.readFileSync(path.join(__dirname, 'crawl.cjs'), 'utf8');
(async () => {
  /* resume: KEEP=<n> keeps the first n entries of an existing api.json and skips those calls */
  const KEEP = +(process.env.KEEP || 0);
  const res = KEEP && fs.existsSync(path.join(OUT, 'api.json')) ? JSON.parse(fs.readFileSync(path.join(OUT, 'api.json'), 'utf8')).slice(0, KEEP) : [];
  let h = null, n = 0;
  const start = async () => {
    if (h) await h.browser.close().catch(() => { });
    const s = existingSeed({ lang: 'de', state: { settings: { lang: 'de' } } }); s.kv['lowi.news.build'] = s.build; s.kv['lowi.news.tourbuild'] = s.build; s.kv['lowi.tutorial.v1'] = JSON.stringify({ v: 999, done: true });
    h = await L.launch({ viewport: { width: 390, height: 844 }, locale: 'de-DE', seed: s });
    await h.page.emulateMedia({ colorScheme: 'dark' });
    await L.openApp(h, { settle: 4000 });
  };
  const sigFn = new Function('return ' + cr.slice(cr.indexOf('async function sig(page)'), cr.indexOf('/* tappable controls')).replace('async function sig(page)', 'async function (page)'))();
  await start();
  const home = await sigFn(h.page);
  for (const c of calls) {
    if (n < res.length) { n++; continue; }
    if (n++ % 12 === 11) await start();
    for (let k = 0; k < 3; k++) { await h.page.keyboard.press('Escape'); await L.sleep(250); }
    await h.page.evaluate(() => { try { goTab('home'); } catch (e) { } }); await L.sleep(900);
    /* a sticky surface (e.g. the sign-up gate) would leak into every later call: remove it, else restart the browser */
    if ((await sigFn(h.page)).s !== home.s) {
      await h.page.evaluate(() => { document.querySelectorAll('#r2gate,.r2-gate,.r2-ov').forEach(e => e.remove()); try { goTab('home'); } catch (e) { } }); await L.sleep(700);
      if ((await sigFn(h.page)).s !== home.s) await start();
    }
    const [m, f] = c.split('.');
    const err = await h.page.evaluate(([m, f]) => { try { const r = window[m][f](); if (r && r.then) r.catch(() => { }); return ''; } catch (e) { return String(e && e.message || e).slice(0, 120); } }, [m, f]);
    await L.sleep(1800);
    const sg = await sigFn(h.page);
    const id = 'api-' + String(n).padStart(3, '0');
    const changed = sg.s !== home.s;
    if (changed) await h.page.screenshot({ path: path.join(OUT, id + '.jpg'), type: 'jpeg', quality: 72 });
    res.push({ id, call: c, err, changed, sig: sg.s, head: sg.head, txt: sg.txt, tab: sg.tab, key: sg.key });
    console.log(id, c, changed ? 'CHANGED ' + sg.s.slice(0, 110) : 'same', err ? 'ERR ' + err : '');
    fs.writeFileSync(path.join(OUT, 'api.json'), JSON.stringify(res, null, 1));
  }
  await h.browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
