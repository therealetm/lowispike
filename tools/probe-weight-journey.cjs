'use strict';
/* Weight journey probe. usage: node tools/probe-weight-journey.cjs <device> [dirOrUrl] [out-prefix] [engine]
   Seeds a journey like Emmanuel's smart-scale screenshot (start 1 Sep 120.0 kg, weigh-ins every few days, 107.6 kg today, goal
   94 kg), opens the sheet from the Weight & BMI sheet's card by a real tap, types a new weigh-in for yesterday, edits and deletes
   it, switches tabs and units, and screenshots night + day mode. Reports overflow, small/covered controls and page errors. */
const H = require('./sim/harness.cjs'), path = require('path');
(async () => {
    const device = process.argv[2] || 'iPhone 13', where = process.argv[3] || path.join(__dirname, '..'), out = process.argv[4] || '/tmp/wj', engine = process.argv[5] || 'webkit';
    const o = { device, engine, members: 10, messages: 20, probe: false }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
    const R = await H.open(o), P = R.page, res = { device };
    await R.goto(); await H.sleep(5000);
    for (let i = 0; i < 3; i++) { await P.keyboard.press('Escape'); await H.sleep(200); }
    res.build = await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || null);
    res.loaded = await P.evaluate(() => !!(window.LowiWeightJourney && window.LowiWeightJourneyCore));
    await P.evaluate(() => {
        const S = LowiR2.S(), C = LowiWeightJourneyCore, DAY = 864e5, t = new Date(); t.setHours(12, 0, 0, 0);
        const start = new Date(t.getTime() - 51 * DAY); S.health.body = { weights: [] };
        const days = [0, 2, 3, 6, 9, 12, 14, 17, 20, 23, 26, 28, 31, 34, 37, 40, 42, 45, 48, 51];
        days.forEach((d, i) => { const kg = d === 51 ? 107.6 : 120 - d * 0.245 + [0, .5, .4, -.2, .3, -.3, .2, .1, -.4, .3, 0, .2, -.2, .4, -.1, .1, -.3, .2, .1, 0][i]; C.add(S, { date: C.dayKey(start.getTime() + d * DAY), value: kg.toFixed(1) }); });
        C.setJourney(S, { start: C.dayKey(start.getTime()), startValue: 120, goalValue: 94, unit: 'kg' });
        LowiR2.save();
    });
    /* entry: Weight & BMI sheet -> the Weight journey card, by a tap */
    await P.evaluate(() => window.LowiBodyStats && LowiBodyStats.open()); await H.sleep(700);
    res.cardInBodyStats = await P.evaluate(() => { const b = document.querySelector('#bsOv [data-wj-open]'); return b ? b.textContent.replace(/\s+/g, ' ').trim() : null; });
    if (res.cardInBodyStats) { await P.evaluate(() => document.querySelector('#bsOv [data-wj-open]').scrollIntoView({ block: 'center' })); await H.sleep(200); await R.tap('#bsOv [data-wj-open]'); await H.sleep(800); }
    res.openedByTap = await P.evaluate(() => !!document.getElementById('wjOv'));
    if (!res.openedByTap) await P.evaluate(() => LowiWeightJourney.open());
    await H.sleep(600);
    const info = () => P.evaluate(async () => {
        const ov = document.getElementById('wjOv'), sh = ov.querySelector('.wj-sheet'), r = sh.getBoundingClientRect(), txt = s => { const e = ov.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; };
        const over = [...sh.querySelectorAll('*')].filter(e => { const b = e.getBoundingClientRect(); return b.width && (b.right > r.right + 1 || b.left < r.left - 1) && !e.closest('.wj-tabs'); }).map(e => String(e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className)).slice(0, 6);
        const small = [...ov.querySelectorAll('button, input')].filter(e => { const b = e.getBoundingClientRect(); return b.width && b.height < 35.5 && !e.closest('.wj-stat'); }).map(e => e.className + ':' + Math.round(e.getBoundingClientRect().height));
        const boxes = [...ov.querySelectorAll('.wj-lab rect, .wj-goallb, .wj-startlb, .wj-ax')].map(e => [e.getAttribute('class') || e.parentNode.getAttribute('class'), e.getBoundingClientRect()]), overlap = [];
        for (let i = 0; i < boxes.length; i++) for (let k = i + 1; k < boxes.length; k++) { const a = boxes[i][1], b = boxes[k][1]; if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1 && !(boxes[i][0] === 'wj-ax' && boxes[k][0] === 'wj-ax')) overlap.push(boxes[i][0] + '/' + boxes[k][0]); }
        return { overlap, hero: txt('.wj-hero'), range: txt('.wj-range'), stats: txt('.wj-stats'), labels: [...ov.querySelectorAll('.wj-lab text, .wj-goallb, .wj-startlb')].map(e => e.textContent), path: !!ov.querySelector('.wj-line'), dots: ov.querySelectorAll('.wj-dot').length,
            svgW: (ov.querySelector('.wj-svg') || {}).clientWidth || 0, sheet: [Math.round(r.width), Math.round(r.height)], vp: [innerWidth, innerHeight], over, small };
    });
    res.night = await info();
    await R.shot(out + '-' + device.replace(/\s+/g, '') + '-night.png');
    /* add yesterday by typing, then edit and delete it */
    await R.tap('#wjOv [data-wj="add"]'); await H.sleep(500);
    const yday = await P.evaluate(() => LowiWeightJourneyCore.dayKey(Date.now() - 864e5));
    await P.fill('#wjDate', yday); await P.fill('#wjVal', '108,1'); await R.tap('#wjOv [data-wj-form="entry"] button[type="submit"]'); await H.sleep(500);
    res.added = await P.evaluate(d => LowiWeightJourneyCore.entries(LowiR2.S()).filter(e => e.day === d).map(e => e.kg), yday);
    await R.tap('#wjOv [data-wj-e]:not([data-wj-e="x"])'); await H.sleep(300);
    await P.evaluate(d => { const b = [...document.querySelectorAll('#wjOv [data-wj-e]')].find(x => LowiWeightJourneyCore.dayKey(+x.getAttribute('data-wj-e')) === d); b.click(); }, yday); await H.sleep(400);
    await P.fill('#wjVal', '108.3'); await R.tap('#wjOv [data-wj-form="entry"] button[type="submit"]'); await H.sleep(400);
    res.edited = await P.evaluate(d => LowiWeightJourneyCore.entries(LowiR2.S()).filter(e => e.day === d).map(e => e.kg), yday);
    await P.evaluate(d => { const b = [...document.querySelectorAll('#wjOv [data-wj-e]')].find(x => LowiWeightJourneyCore.dayKey(+x.getAttribute('data-wj-e')) === d); b.click(); }, yday); await H.sleep(400);
    await R.tap('#wjOv [data-wj="del"]'); await H.sleep(400);
    res.deleted = await P.evaluate(d => LowiWeightJourneyCore.entries(LowiR2.S()).filter(e => e.day === d).length === 0, yday);
    res.persisted = await P.evaluate(() => { try { return JSON.stringify(JSON.parse(localStorage.getItem('lowispike.v2')).health.body.journey); } catch (e) { return 'n/a'; } });
    /* tabs, arrows, lb */
    res.tabs = {};
    for (const p of ['W', 'M', '3M', 'Y', 'all', 'start']) { await R.tap('#wjOv [data-wj-p="' + p + '"]'); await H.sleep(250); res.tabs[p] = await P.evaluate(() => [document.querySelector('#wjOv .wj-range b').textContent, document.querySelectorAll('#wjOv .wj-dot').length]); }
    await R.tap('#wjOv [data-wj-p="M"]'); await H.sleep(200); await R.tap('#wjOv [data-wj="prev"]'); await H.sleep(250);
    res.prevMonth = await P.evaluate(() => document.querySelector('#wjOv .wj-range b').textContent);
    await R.tap('#wjOv [data-wj-p="start"]'); await H.sleep(200);
    await R.tap('#wjOv [data-wj-u="lb"]'); await H.sleep(300);
    res.lb = await P.evaluate(() => [document.querySelector('#wjOv .wj-hero').textContent.replace(/\s+/g, ' ').trim(), document.querySelector('#wjOv .wj-stats').textContent.replace(/\s+/g, ' ').trim()]);
    await R.shot(out + '-' + device.replace(/\s+/g, '') + '-lb.png');
    await R.tap('#wjOv [data-wj-u="kg"]'); await H.sleep(200);
    await P.evaluate(() => { document.documentElement.setAttribute('data-theme', 'light'); }); await H.sleep(400);
    res.day = await info();
    await R.shot(out + '-' + device.replace(/\s+/g, '') + '-day.png');
    await P.evaluate(() => { const sh = document.querySelector('#wjOv .wj-sheet'); sh.scrollTop = sh.scrollHeight; }); await H.sleep(300);
    await R.shot(out + '-' + device.replace(/\s+/g, '') + '-day-bottom.png');
    await P.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await P.keyboard.press('Escape'); await H.sleep(400);
    res.closed = await P.evaluate(() => !document.getElementById('wjOv'));
    res.errors = R.errs;
    console.log(JSON.stringify(res, null, 1));
    await R.close();
})().catch(e => { console.error(e); process.exit(1); });
