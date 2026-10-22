'use strict';
/* Cook -> Shuffle -> Products probe (scan-sort, Oct 22 2026). usage: node tools/probe-shuffle-throwout.cjs <device> [dirOrUrl] [out-prefix] [engine]
   Seeds a scanned mix of low-spike and spiking products, shuffles Products 12 times by real taps and checks no pick spikes,
   checks the Throw out list (names, rating, line, remove), screenshots night + day, then an all-spiking pantry for the empty state. */
const H = require('./sim/harness.cjs'), path = require('path');
(async () => {
    const device = process.argv[2] || 'iPhone 13', where = process.argv[3] || path.join(__dirname, '..'), out = process.argv[4] || '/tmp/sst', engine = process.argv[5] || 'webkit';
    const o = { device, engine, members: 10, messages: 20, probe: false }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
    const R = await H.open(o), P = R.page, res = { device };
    await R.goto(); await H.sleep(5000);
    for (let i = 0; i < 3; i++) { await P.keyboard.press('Escape'); await H.sleep(200); }
    res.build = await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || null);
    const seed = all => P.evaluate(all => {
        const D = LowiDex.state(), now = Date.now();
        const good = [
            { barcode: '4001', name: 'Skyr natur', brand: 'Arla', cat: 'dairy', facts: { c: 4, s: 4, f: 0, p: 11, fat: 0.2 }, ingredients: 'Magermilch, Milchsäurebakterien' },
            { barcode: '4002', name: 'Greek yogurt 10%', brand: 'Fage', cat: 'dairy', facts: { c: 3.5, s: 3.5, f: 0, p: 6, fat: 10 }, ingredients: 'Milch, Sahne, Kulturen' },
            { barcode: '4003', name: 'Mixed nuts', brand: 'Seeberger', cat: 'snack', facts: { c: 9, s: 4, f: 8, p: 20, fat: 55 }, ingredients: 'Mandeln, Cashewkerne, Walnüsse, Haselnüsse' },
            { barcode: '4004', name: 'Dark chocolate 85%', brand: 'Lindt', cat: 'sweets', facts: { c: 19, s: 11, f: 12, p: 11, fat: 46 }, ingredients: 'Kakaomasse, Kakaobutter, fettarmes Kakaopulver, Zucker' }
        ];
        const bad = [
            { barcode: '5001', name: 'Coca-Cola', brand: 'Coca-Cola', cat: 'drink', facts: { c: 10.6, s: 10.6, f: 0, p: 0, fat: 0, drink: true }, ingredients: 'Wasser, Zucker, Kohlensäure, Farbstoff E150d', verdict: 'ok' },
            { barcode: '5002', name: 'Paprika Chips', brand: 'funny-frisch', cat: 'snack', facts: { c: 50, s: 3, f: 4, p: 6, fat: 33 }, ingredients: 'Kartoffeln, Sonnenblumenöl, Gewürzmischung' },
            { barcode: '5003', name: 'Goldbären', brand: 'Haribo', cat: 'sweets', facts: { c: 77, s: 46, f: 0, p: 6.9, fat: 0.5 }, ingredients: 'Glukosesirup, Zucker, Gelatine, Dextrose' },
            { barcode: '5004', name: 'Toastbrot', brand: 'Golden Toast', cat: 'other', facts: { c: 47, s: 4, f: 3, p: 8, fat: 4 }, ingredients: 'Weizenmehl, Wasser, Hefe, Zucker' }
        ];
        const list = (all ? [] : good).concat(bad);
        D.mine = {}; D.comm = [];
        list.forEach((p, i) => { D.mine['m' + p.barcode] = Object.assign({ id: 'm' + p.barcode, img: '', ts: now - i * 6e4 }, p); });
        try { localStorage.removeItem('lowi.cook.tossHidden'); localStorage.removeItem('lowi.cook.last.products'); } catch (e) {}
    }, all);
    const openCook = () => P.evaluate(() => { try { LowiHost.go('shelf'); } catch (e) {} try { LowiFood.setSource('products'); } catch (e) {} });
    await seed(false); await openCook(); await H.sleep(1200);
    /* the comm load may run late: seed again and re-render */
    await seed(false); await P.evaluate(() => LowiFood.setSource('book')); await H.sleep(200); await openCook(); await H.sleep(900);
    res.pool = await P.evaluate(() => LowiFood.srcPool('products').map(f => f.n + ':' + f.spikeVerdict));
    const bad = /Cola|Chips|Goldb|Toast/;
    res.picks = [];
    for (let i = 0; i < 12; i++) {
        await P.evaluate(() => { const b = document.getElementById('r5Go'); if (b) b.scrollIntoView({ block: 'center' }); });
        await R.tap('#r5Go'); await H.sleep(1700);
        res.picks.push(await P.evaluate(() => { const c = document.querySelector('#r5Pick .r5-cn'); return c ? c.textContent.trim() : null; }));
    }
    res.badPicked = res.picks.filter(n => n && bad.test(n));
    const toss = () => P.evaluate(() => { const s = document.getElementById('ckToss'); if (!s) return null; const r = s.getBoundingClientRect();
        return { title: s.querySelector('h3').textContent.replace(/\s+/g, ' ').trim(), items: [...s.querySelectorAll('.ck-toss-i')].map(li => [li.querySelector('b').textContent, li.querySelector('.ck-toss-v').textContent, li.querySelector('.ck-toss-why').textContent]),
            over: [...s.querySelectorAll('*')].filter(e => { const b = e.getBoundingClientRect(); return b.width && (b.right > r.right + 1 || b.left < r.left - 1); }).map(e => String(e.className)).slice(0, 5),
            xSize: [...s.querySelectorAll('.ck-toss-x')].map(b => Math.round(b.getBoundingClientRect().height)).slice(0, 1) }; });
    const contrast = () => P.evaluate(() => { const L = c => { const m = c.match(/[\d.]+/g).map(Number); const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return { l: .2126 * f(m[0]) + .7152 * f(m[1]) + .0722 * f(m[2]), a: m[3] == null ? 1 : m[3] }; };
        const bgOf = e => { while (e) { const c = getComputedStyle(e).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c) && L(c).a > .5) return c; e = e.parentElement; } return getComputedStyle(document.body).backgroundColor || 'rgb(0,0,0)'; };
        return [...document.querySelectorAll('#ckToss b, #ckToss .ck-toss-why, #ckToss h3, #ckToss .ck-toss-v')].slice(0, 6).map(e => { const a = L(getComputedStyle(e).color).l, b = L(bgOf(e)).l; return +(((Math.max(a, b) + .05) / (Math.min(a, b) + .05)).toFixed(2)); }); });
    res.tossNight = await toss();
    res.nightContrast = await contrast();
    await P.evaluate(() => { const s = document.getElementById('ckToss'); if (s) s.scrollIntoView({ block: 'end' }); }); await H.sleep(400);
    await R.shot(out + '-' + device.replace(/\s+/g, '') + '-night.png');
    await P.evaluate(() => localStorage.setItem('lowi.theme', 'light')); await P.reload(); await H.sleep(4500);
    for (let i = 0; i < 3; i++) { await P.keyboard.press('Escape'); await H.sleep(200); }
    await seed(false); await openCook(); await H.sleep(900); await P.evaluate(() => { const s = document.getElementById('ckToss'); if (s) s.scrollIntoView({ block: 'end' }); }); await H.sleep(400);
    res.theme = await P.evaluate(() => document.documentElement.getAttribute('data-theme'));
    res.tossDay = await toss();
    res.dayContrast = await contrast();
    await R.shot(out + '-' + device.replace(/\s+/g, '') + '-day.png');
    /* remove one by a tap */
    await P.evaluate(() => { const b = document.querySelector('#ckToss .ck-toss-x'); if (b) b.scrollIntoView({ block: 'center' }); }); await H.sleep(200);
    await R.tap('#ckToss .ck-toss-x'); await H.sleep(400);
    res.afterRemove = await P.evaluate(() => [...document.querySelectorAll('#ckToss .ck-toss-i b')].map(b => b.textContent));
    /* all spiking: empty state, no fallback */
    await seed(true); await P.evaluate(() => LowiFood.setSource('book')); await H.sleep(200); await openCook(); await H.sleep(900);
    await P.evaluate(() => { const b = document.getElementById('r5Go'); if (b) b.scrollIntoView({ block: 'center' }); });
    await R.tap('#r5Go'); await H.sleep(1200);
    res.empty = await P.evaluate(() => { const e = document.querySelector('#r5Pick .ck-pempty'); return { shown: !!e, text: e ? e.textContent.replace(/\s+/g, ' ').trim() : document.getElementById('r5Pick').textContent.trim().slice(0, 120), pick: (document.querySelector('#r5Pick .r5-cn') || {}).textContent || null, toss: document.querySelectorAll('#ckToss .ck-toss-i').length }; });
    await P.evaluate(() => { const e = document.querySelector('#r5Pick'); if (e) e.scrollIntoView({ block: 'start' }); }); await H.sleep(300);
    await R.shot(out + '-' + device.replace(/\s+/g, '') + '-empty.png');
    res.errors = R.errs;
    console.log(JSON.stringify(res, null, 1));
    await R.close();
})().catch(e => { console.error(e); process.exit(1); });
