'use strict';
/* Three photo checks a day probe (task photo-cap round 2, Oct 19 2026). Mocks the food-photo function with a real counter
   (GET -> left, POST 1..3 -> left 2,1,0, POST 4 -> 429 limit) and snaps four photos in a row from Scan > Snap food.
   Checks: after each read the sheet says how many checks are left today; after the third it says none are left and that new
   ones come at midnight; the fourth photo shows the limit message (no 4th POST needed), the typed-meal form is still there,
   nothing is wider than the screen, no errors.  usage: node probe-photocap.cjs <view> <url|dir> [lang] */
const L = require('./lib.cjs'), fs = require('fs');
const PHOTO = fs.readFileSync(process.env.PHOTO || '/tmp/photocap2/plate.jpg');
(async () => {
    const view = process.argv[2] || 'iphone13', target = process.argv[3] || 'https://therealetm.github.io/lowispike/', lang = process.argv[4] || 'en';
    let srv = null, url = target;
    if (!/^https?:/.test(target)) { srv = await L.serve(target); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
    const h = await L.open({ view, url, settle: 7000, lang });
    const { page, ctx } = h; const calls = []; let used = 0;
    await ctx.route('**/functions/v1/food-photo**', r => {
        const q = r.request(); calls.push(q.method() + (q.headers()['authorization'] ? ' auth' : ''));
        const H = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'content-type': 'application/json' };
        if (q.method() === 'OPTIONS') return r.fulfill({ status: 200, headers: H, body: 'ok' });
        if (q.method() === 'GET') return r.fulfill({ status: 200, headers: H, body: JSON.stringify({ ok: true, configured: true, limit: 3, used, left: 3 - used }) });
        if (used >= 3) return r.fulfill({ status: 429, headers: H, body: JSON.stringify({ error: 'limit', limit: 3, left: 0 }) });
        used++;
        return r.fulfill({ status: 200, headers: H, body: JSON.stringify({ is_food: true, confidence: 'high', note: '', model: 'mock', limit: 3, left: 3 - used, dishes: [
            { name: 'Spaghetti Bolognese', portion: '1 bowl', grams: 350, kcal: 520, protein_g: 22, carbs_g: 65, sugar_g: 5, fiber_g: 4, fat_g: 18 }] }) });
    });
    await page.evaluate(l => window.LowiLang && window.LowiLang.set && window.LowiLang.set(l), lang).catch(() => {});
    await L.sleep(1200);
    const rounds = [];
    for (let i = 1; i <= 4; i++) {
        // OTHER_DEVICE=1: forget the cached count before photo 4, as on a second phone, so the server's 429 must drive the message
        if (i === 4 && process.env.OTHER_DEVICE) await page.evaluate(() => localStorage.removeItem('lowi.mealsnap.left'));
        await page.evaluate(() => { document.querySelectorAll('.sp-sheet, .sp-photo-sheet').forEach(() => {}); window.LowiSpirit && window.LowiSpirit.photo && window.LowiSpirit.photo(); }).catch(e => rounds.push({ i, photoErr: e.message }));
        await L.sleep(2500);
        const inputs = await page.$$('.sp-file-in'); const input = inputs[inputs.length - 1];
        if (!input) { rounds.push({ i, noInput: true }); break; }
        await input.setInputFiles({ name: 'plate.jpg', mimeType: 'image/jpeg', buffer: PHOTO });
        await page.waitForSelector('.sp-ai.fai-done, .sp-ai.fai-off, .sp-ai.fai-err, .sp-ai.fai-none', { timeout: 30000 }).catch(() => {});
        await L.sleep(1500);
        const r = await page.evaluate(() => {
            const boxes = [...document.querySelectorAll('.sp-ai')], box = boxes[boxes.length - 1];
            const forms = [...document.querySelectorAll('form#spMeal.sp-photo-form')], f = forms[forms.length - 1];
            const left = [...document.querySelectorAll('.ms-left')].map(e => e.textContent.trim()).pop() || '';
            const wide = [...document.querySelectorAll('.sp-ai, .ms-host, form#spMeal')].some(e => e.getBoundingClientRect().right > innerWidth + 1);
            const title = f && f.querySelector('[name="title"]');
            return { state: box && box.className, msg: box && (box.querySelector('.fai-msg') || box).textContent.trim().slice(0, 200), left,
                typedForm: !!(title && title.getBoundingClientRect().width), wide, vw: innerWidth };
        });
        r.i = i; r.posts = calls.filter(c => c.startsWith('POST')).length; rounds.push(r);
        if (process.env.SHOTDIR) await page.screenshot({ path: process.env.SHOTDIR + '/photocap-' + view + '-' + lang + '-' + i + '.png' });
        // close the sheet the way a user would: Escape / close button, then a fresh Snap food
        await page.evaluate(() => { const x = [...document.querySelectorAll('.sp-sheet-x, [data-sp-close], .sp-x, button[aria-label="Close"]')].pop(); if (x) x.click(); }).catch(() => {});
        await page.keyboard.press('Escape').catch(() => {});
        await L.sleep(1200);
    }
    const s = await L.snap(h);
    const out = { view, lang, rounds, calls, err: s.err, rej: s.rej, pageerror: h.log.pageerror };
    const bad = [];
    const W = { en: [/2 of 3/, /1 of 3/, /No photo checks left today.*midnight/i, /used today.s 3 photo checks.*midnight/i],
        de: [/2 von 3/, /1 von 3/, /keine Foto-Checks mehr.*Mitternacht/i, /3 Foto-Checks genutzt.*Mitternacht/i],
        es: [/2 de 3/, /1 de 3/, /no te quedan.*medianoche/i, /3 análisis de foto de hoy.*medianoche/i] }[lang];
    for (let i = 0; i < 3; i++) { const r = rounds[i] || {}; if (!/fai-done/.test(r.state || '')) bad.push('round' + (i + 1) + ' state=' + r.state); if (!W[i].test(r.left || '')) bad.push('round' + (i + 1) + ' left="' + r.left + '"'); }
    const r4 = rounds[3] || {};
    if (!/fai-err/.test(r4.state || '') || !W[3].test(r4.msg || '')) bad.push('round4 state=' + r4.state + ' msg="' + r4.msg + '"');
    if (!r4.typedForm) bad.push('round4 typed form gone');
    const posts = calls.filter(c => c.startsWith('POST')).length;
    if (posts !== (process.env.OTHER_DEVICE ? 4 : 3)) bad.push('POSTs=' + posts);
    if (rounds.some(r => r.wide)) bad.push('wider than screen');
    if ((out.err || []).length || (out.rej || []).length || out.pageerror.length) bad.push('errors');
    console.log(JSON.stringify(out));
    console.log(bad.length ? 'FAIL ' + bad.join(' ; ') : 'PASS');
    await h.browser.close(); if (srv) srv.close();
    process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
