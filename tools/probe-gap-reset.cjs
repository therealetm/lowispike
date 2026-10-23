'use strict';
/* Gap resets on a meal + Log meal Today list (Oct 23 2026). usage: node tools/probe-gap-reset.cjs <device> [dirOrUrl] [engine] [lang]
   E-man: "after I ate something ... the gap didn't reset automatically" and "I would like to see exactly what I logged and what
   time I logged it. Maybe I want to edit it ... But minimalistic." By taps: a 15 h gap -> Log meal (Meal / Snack, the gap note) ->
   a meal logged -> the Gap bubble restarts at 0 (one label, one value) -> Log meal > Today shows it with its time -> tap it, add
   "one more chicken piece" and move the time 20 min back -> same meal, no XP, the Gap follows -> reload keeps it -> Remove (twice)
   -> the Gap is back on the 15 h start. Every control of each sheet must be on screen. */
const H = require('./sim/harness.cjs'), path = require('path'), fs = require('fs');
(async () => {
    const device = process.argv[2] || 'iPhone 13', where = process.argv[3] || path.join(__dirname, '..'), engine = process.argv[4] || 'webkit', lang = process.argv[5] || 'en';
    const OUT = '/home/sprite/gapout/shots'; fs.mkdirSync(OUT, { recursive: true }); const tag = (device + '-' + lang).replace(/\s+/g, '');
    const o = { device, engine, members: 10, messages: 20, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
    const R = await H.open(o), P = R.page, fails = [], res = { device, lang };
    /* the chromium sim is always 390 x 844: set the size for the device asked for */
    const SIZES = { 'iPhone 13': [390, 844], 'iPhone 13 landscape': [844, 390], 'iPad': [820, 1180], 'iPad landscape': [1180, 820], 'small': [360, 740] };
    if (engine !== 'webkit' && SIZES[device]) { await P.setViewportSize({ width: SIZES[device][0], height: SIZES[device][1] }); res.size = SIZES[device].join('x'); }
    const ok = (c, m) => { if (!c) fails.push(m); };
    const settle = () => H.sleep(1300);
    /* a person scrolls the sheet to what they want to tap (sideways phones show only the top) */
    const tapIn = async sel => { await P.evaluate(s => { const e = document.querySelector(s); if (e) e.scrollIntoView({ block: 'center' }); }, sel); await H.sleep(350); await R.tap(sel); };
    const fits = name => P.evaluate(() => { const ov = [...document.querySelectorAll('.r2-ov.on:not(.r2-parked)')].pop(); if (!ov) return { missing: true }; const bad = [];
        ov.querySelectorAll('button,input').forEach(b => { const r = b.getBoundingClientRect(); if (!r.width) return; if (r.left < -1 || r.right > innerWidth + 1) bad.push((b.className || b.name || b.tagName) + ' ' + Math.round(r.left) + '..' + Math.round(r.right)); });
        const sc = ov.querySelector('.r2-sh,.r2-sheet,.r2-body') || ov; return { bad, side: sc.scrollWidth > sc.clientWidth + 2 }; })
        .then(v => { res[name] = v; if (v.missing) fails.push(name + ': no sheet'); else { if (v.bad.length) fails.push(name + ': off screen ' + v.bad.join('; ')); if (v.side) fails.push(name + ': scrolls sideways'); } });
    const start = () => P.evaluate(() => LowiFastStop.startOf(JSON.parse(localStorage.getItem('lowi_fast_v1') || '{"hist":[]}')));
    const xp = () => P.evaluate(() => (LowiVitalsBridge.state().ledger || []).reduce((a, e) => a + (+e.xp || +e.x || +e.amount || 0), 0));
    const top = sel => P.evaluate(s => { const ov = [...document.querySelectorAll('.r2-ov.on:not(.r2-parked)')].pop(); return !!(ov && ov.querySelector(s)); }, sel);
    try {
        await R.goto(); await H.sleep(4000);
        for (let i = 0; i < 3; i++) { await P.keyboard.press('Escape'); await H.sleep(200); }
        res.build = await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || null);
        const now = Date.now(), s0 = now - (15 * 3600e3 + 9 * 60e3);
        await P.evaluate(s0 => { localStorage.setItem('lowi_fast_v1', JSON.stringify({ hist: [], last: s0 })); const S = LowiVitalsBridge.state(); S.logs.splice(0, S.logs.length); try { goTab('home'); } catch (e) {} window.dispatchEvent(new CustomEvent('lowi:fast')); }, s0);
        await H.sleep(1200);
        ok(Math.abs(await start() - s0) < 2000, 'setup: gap not on the 15 h start');

        /* 1. Log meal: Meal / Snack only, the gap note */
        R.step = 'picker';
        await P.evaluate(() => LowiSpirit.meal()); await P.waitForSelector('.r2-ov.on .sp-slot', { timeout: 8000 }).catch(() => {}); await settle();
        res.tiles = await P.evaluate(() => [...document.querySelectorAll('.r2-ov.on .sp-slot b')].map(b => b.textContent));
        ok(res.tiles.length === 2, 'Log meal should have 2 tiles, has ' + JSON.stringify(res.tiles));
        res.noteBefore = await P.evaluate(() => (document.querySelector('.r2-ov.on .sp-fast-note') || {}).textContent || '');
        ok(/15/.test(res.noteBefore), 'Log meal should offer to close the 15 h gap: ' + res.noteBefore);
        await fits('pickerSheet'); await R.shot(path.join(OUT, tag + '-1-picker.png'));

        /* 2. a meal is logged the way the Meal tile does it (Meal, eaten now) */
        R.step = 'log';
        const x0 = await xp();
        const id = await P.evaluate(() => { const r = LowiVitalsBridge.logMeal({ id: 'probe-' + Date.now(), t: 'Chicken and rice', lvl: 'low', via: 'spirit', slot: 'meal', macros: { p: 30, c: 40, f: 10 } }); return r && r.log && r.log.id; });
        await H.sleep(1500);
        const st1 = await start(); res.afterLog = Math.round((Date.now() - st1) / 1000);
        ok(res.afterLog < 30, 'the Gap did not restart at 0 after the meal (' + res.afterLog + ' s)');
        res.bubble = await P.evaluate(() => { const c = document.querySelector('#spFast .sp-fast-copy'); return c ? { text: c.textContent, smalls: c.querySelectorAll('small').length } : null; });
        ok(res.bubble && /^\D*0\s*h\s*0[0-9]\s*min/.test(res.bubble.text.replace(/^[^0-9]*/, '')), 'Gap bubble should read 0 h 0x min: ' + JSON.stringify(res.bubble));
        ok(res.bubble && res.bubble.smalls === 1 && !/meal \d|Mahlzeit \d|comida \d/i.test(res.bubble.text), 'Gap bubble: one small label, no "last meal" line: ' + JSON.stringify(res.bubble));
        const x1 = await xp(); res.xpLog = x1 - x0;

        /* 3. Log meal > Today: the entry with its time; the gap note no longer offers the 15 h gap */
        R.step = 'today';
        for (let i = 0; i < 2; i++) { await P.keyboard.press('Escape'); await H.sleep(300); }
        await P.evaluate(() => LowiSpirit.meal()); await P.waitForSelector('.r2-ov.on .sp-slot', { timeout: 8000 }).catch(() => {}); await settle();
        res.today = await P.evaluate(() => [...document.querySelectorAll('.r2-ov.on .sp-td')].map(b => b.textContent));
        ok(res.today.length === 1 && /Chicken and rice/.test(res.today[0]) && /\d{2}:\d{2}/.test(res.today[0]), 'Today list: ' + JSON.stringify(res.today));
        res.noteAfter = await P.evaluate(() => (document.querySelector('.r2-ov.on .sp-fast-note') || {}).textContent || '');
        ok(!/15/.test(res.noteAfter), 'Log meal still offers the 15 h gap: ' + res.noteAfter);
        await fits('todaySheet'); await R.shot(path.join(OUT, tag + '-2-today.png'));

        /* 4. tap it: add one more chicken piece, 20 min earlier */
        R.step = 'edit';
        await P.waitForSelector('.r2-ov.on .sp-td', { timeout: 8000 }).catch(() => {}); await tapIn('.r2-ov.on .sp-td'); await P.waitForSelector('#spEdit', { timeout: 8000 }).catch(() => {}); await settle();
        ok(await top('#spEdit'), 'tapping the entry did not open the edit sheet');
        await fits('editSheet'); await R.shot(path.join(OUT, tag + '-3-edit.png'));
        const t20 = await P.evaluate(() => { const d = new Date(Date.now() - 20 * 60e3); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); });
        const sameDay = await P.evaluate(() => new Date(Date.now() - 20 * 60e3).getDate() === new Date().getDate());
        await P.fill('#spEdit input[name=add]', 'one more chicken piece');
        if (sameDay) await P.fill('#spEdit input[name=time]', t20);
        await tapIn('#spEdit button[type=submit]'); await H.sleep(1500);
        res.edited = await P.evaluate(id => { const l = LowiVitalsBridge.state().logs.find(l => l.id === id); return l && { t: l.t, ts: l.ts, n: LowiVitalsBridge.state().logs.length, p: l.macros && l.macros.p }; }, id);
        ok(res.edited && /\+ one more chicken piece$/.test(res.edited.t), 'the meal was not added to: ' + JSON.stringify(res.edited));
        ok(res.edited && res.edited.n === 1, 'an edit made a second meal');
        const x2 = await xp(); res.xpEdit = x2 - x1; ok(x2 === x1, 'editing paid XP: ' + (x2 - x1));
        if (sameDay) { const st2 = await start(); res.gapAfterEdit = Math.round((Date.now() - st2) / 60e3); ok(res.gapAfterEdit >= 19 && res.gapAfterEdit <= 21, 'the Gap did not follow the edited time: ' + res.gapAfterEdit + ' min'); }
        ok(await top('.sp-td'), 'after saving, Log meal > Today should be back');

        /* 5. restart keeps it */
        R.step = 'reload';
        const before = await start(); await R.goto(); await H.sleep(4000);
        res.reload = Math.abs(await start() - before) < 2000; ok(res.reload, 'the Gap changed after a restart');

        /* 6. Remove (tap twice): the Gap goes back to the 15 h start */
        R.step = 'remove';
        for (let i = 0; i < 3; i++) { await P.keyboard.press('Escape'); await H.sleep(200); }
        await P.evaluate(() => LowiSpirit.meal()); await P.waitForSelector('.r2-ov.on .sp-slot', { timeout: 8000 }).catch(() => {}); await settle();
        await P.waitForSelector('.r2-ov.on .sp-td', { timeout: 8000 }).catch(() => {}); await tapIn('.r2-ov.on .sp-td'); await P.waitForSelector('#spEdit', { timeout: 8000 }).catch(() => {}); await settle();
        await tapIn('#spEdit .sp-edit-del'); await H.sleep(400);
        res.sure = await P.evaluate(() => (document.querySelector('#spEdit .sp-edit-del') || {}).textContent);
        await tapIn('#spEdit .sp-edit-del'); await H.sleep(1800);
        res.left = await P.evaluate(() => LowiVitalsBridge.state().logs.length); ok(res.left === 0, 'the meal was not removed');
        const st3 = await start(); res.backTo = Math.round((st3 - s0) / 1000); ok(Math.abs(st3 - s0) < 2000, 'the Gap did not go back to the 15 h start (' + res.backTo + ' s off)');
        const x3 = await xp(); res.xpAfterRemove = x3 - x0; ok(x3 <= x0 + 0.5, 'XP left after removing: ' + (x3 - x0));
        await R.shot(path.join(OUT, tag + '-4-removed.png'));
    } catch (e) { fails.push('crash at ' + R.step + ': ' + String(e && e.message || e).slice(0, 200)); }
    const errs = R.errs.filter(e => !/supabase|ResizeObserver|WebGL|AudioContext/i.test(e.m)); if (errs.length) fails.push('page errors: ' + errs.slice(0, 3).map(e => e.m).join(' | '));
    res.fails = fails; console.log(JSON.stringify(res, null, 1)); await R.close(); process.exit(fails.length ? 1 : 0);
})();
