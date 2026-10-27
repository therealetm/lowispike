/* Community photo -> food card walkthrough (Oct 27 2026). In a simulated browser with the regress fake Supabase and a stand-in
   food-photo endpoint (the real AI is never called, nothing is written anywhere):
   1. a food photo added in the chat composer shows "<companion> ... " while it is checked, then fills in: editable dish name, spike label,
      kcal / protein / net carbs and one menu line; the chip fits the screen; one tap on Send (no text) posts a meal card with the
      edited name and the photo check; everyone's card shows the numbers and its spike label opens the same Details sheet.
   2. Send tapped while the check still runs: the chip says it sends when ready, then posts the card.
   3. Not food: a plain photo post.
   node tools/community-food-card/check.cjs [outDir] [url] [cases]   Exit 1 on failure. */
'use strict';
const fs = require('fs'), path = require('path');
const H = require('../regress/harness.cjs'), N = require('../regress/nav.cjs');
const OUT = path.resolve(process.argv[2] || '/tmp/community-food-card'); fs.mkdirSync(OUT, { recursive: true });
const URL_ = process.argv[3] || '';
const FIX = path.join(__dirname, '..', 'regress', 'fixtures', 'photo1.jpg');
const FAKE = 'https://faitest.example/food-photo';
const ALL = {
    'chromium-se-de': { engine: 'chromium', viewport: { width: 375, height: 667 }, lang: 'de' },
    'chromium-13-en': { engine: 'chromium', viewport: { width: 390, height: 844 }, lang: 'en' },
    'chromium-15pm-es': { engine: 'chromium', viewport: { width: 430, height: 932 }, lang: 'es' },
    'chromium-ipad-de': { engine: 'chromium', viewport: { width: 820, height: 1180 }, lang: 'de' },
    'chromium-ipad-en': { engine: 'chromium', viewport: { width: 820, height: 1180 }, lang: 'en' },
    'chromium-se-es': { engine: 'chromium', viewport: { width: 375, height: 667 }, lang: 'es' }
};
const CASES = (process.argv[4] || Object.keys(ALL).join(',')).split(',').filter(k => ALL[k]);
const READ = {
    de: { title: 'Salat-Wraps mit Hähnchen', desc: 'Knackige Salatblätter mit Hähnchen, Tomaten und Joghurtsoße.', a: 'Hähnchen', b: 'Salatblätter', look: 'schaut sich dein Essen an…', wait: 'Wird gesendet, sobald', prot: 'Eiweiß', net: 'Netto-KH' },
    en: { title: 'Lettuce wraps with chicken', desc: 'Crisp lettuce leaves with chicken, tomatoes and a yogurt sauce.', a: 'Chicken', b: 'Lettuce leaves', look: 'is looking at your food…', wait: 'Sending as soon as', prot: 'protein', net: 'net carbs' },
    es: { title: 'Wraps de lechuga con pollo', desc: 'Hojas de lechuga crujientes con pollo, tomate y salsa de yogur.', a: 'Pollo', b: 'Hojas de lechuga', look: 'está mirando tu comida…', wait: 'Se envía en cuanto', prot: 'proteína', net: 'HC netos' }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function one(key) {
    const C = ALL[key], L = READ[C.lang], res = { key, ok: true, checks: [] };
    const ok = (name, pass, info) => { res.checks.push({ name, pass: !!pass, info }); if (!pass) res.ok = false; };
    const R = await H.open(Object.assign({ probe: false, url: URL_, messages: 30, members: 12 }, C));
    const p = R.page, sim = R.sim;
    let mode = 'food', delay = 1500, posts = 0;
    await R.ctx.route(FAKE + '**', async r => {
        if (r.request().method() !== 'POST') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, configured: true, left: 9, limit: 10 }) });
        posts++; let body = {}; try { body = JSON.parse(r.request().postData() || '{}'); } catch (e) { }
        res.lastLang = body.lang;
        await sleep(delay);
        const out = mode === 'food' ? { is_food: true, confidence: 'high', note: '', title: L.title, desc: L.desc, dishes: [
            { name: L.a, portion: '120 g', grams: 120, kcal: 200, protein_g: 30, carbs_g: 0, sugar_g: 0, fiber_g: 0, fat_g: 8 },
            { name: L.b, portion: '6', grams: 60, kcal: 10, protein_g: 1, carbs_g: 2, sugar_g: 1, fiber_g: 1, fat_g: 0 }] }
            : { is_food: false, confidence: 'high', note: '', title: '', desc: '', dishes: [] };
        return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(Object.assign(out, { left: 9 - posts, limit: 10, model: 'fixture' })) });
    });
    try {
        await R.ctx.addInitScript(([l, u]) => { try { localStorage.setItem('lowispike.lang', l); } catch (e) { } window.LOWI_FOOD_AI_URL = u; }, [C.lang, FAKE]);
        await R.goto();
        await N.openCommunity(R, (s) => res.checks.push({ name: 'nav', pass: true, info: s }));
        const slow = C.engine === 'webkit' ? 120000 : 30000;
        if (!(await p.evaluate(() => !!document.querySelector('#cgThread[data-open]')))) await p.locator('#cmPaneChat .rm-tab[data-rm="chat"]').first().click({ force: true, timeout: 8000 });
        await p.waitForFunction(() => !!document.querySelector('#cgThread[data-open]') && !!document.getElementById('cmPhotoFile'), null, { timeout: slow });
        const comp = await p.evaluate(() => { try { return LowiBirthCompanion.displayName(); } catch (e) { return ''; } });
        const before = sim.W.messages.length;
        // 1. food photo -> looking -> filled chip -> edit -> send (no text)
        await p.setInputFiles('#cmPhotoFile', FIX);
        const look = await p.waitForSelector('#csPhoto .cs-food-l', { timeout: 8000 }).then(e => e.textContent()).catch(() => '');
        ok('looking line with the companion\'s name', look.includes(L.look) && (!comp || look.includes(comp)), { look, comp });
        await p.screenshot({ path: path.join(OUT, key + '-1-looking.png') });
        await p.waitForSelector('#csPhoto .cs-food-t', { timeout: 15000 });
        ok('the check asked in the user\'s language', res.lastLang === C.lang, res.lastLang);
        const chip = await p.evaluate(() => { const c = document.querySelector('#csPhoto .cs-photo-ready'), t = c.querySelector('.cs-food-t'), r = c.getBoundingClientRect(), tr = t.getBoundingClientRect(), pill = c.querySelector('.cs-meal-bs');
            return { title: t.value, h: tr.height, fs: getComputedStyle(t).fontSize, pill: pill ? pill.textContent : '', pillCls: pill ? pill.className : '', nums: (c.querySelector('.cs-food-k') || {}).textContent || '', desc: (c.querySelector('.cs-food-d') || {}).textContent || '', note: (c.querySelector('small') || {}).textContent || '', l: r.left, r: r.right, vw: innerWidth, over: c.scrollWidth - c.clientWidth, send: !!document.getElementById('cmSend'), imgR: c.querySelector('img').getBoundingClientRect().right, tL: tr.left, tR: tr.right, xL: c.querySelector('.cs-photo-x').getBoundingClientRect().left, ch: r.height, vh: innerHeight }; });
        ok('chip: AI title, spike label, numbers, menu line, privacy line', chip.title === L.title && /cs-meal-low/.test(chip.pillCls) && chip.nums.startsWith('210 kcal') && chip.nums.includes(L.prot) && chip.nums.includes(L.net) && chip.desc === L.desc && chip.note.length > 20, chip);
        ok('chip fits (no sideways overflow), name field 44pt and 16px', chip.l >= 0 && chip.r <= chip.vw + .5 && chip.over <= 1 && chip.h >= 43.5 && chip.fs === '16px', chip);
        ok('chip layout: name between photo and X, chip under a third of the screen', chip.tL >= chip.imgR - .5 && chip.tR <= chip.xL + .5 && chip.ch <= chip.vh / 3, chip);
        ok('nothing invented (no undefined/NaN)', !/undefined|NaN|null/.test(chip.title + chip.nums + chip.desc + chip.pill));
        await p.screenshot({ path: path.join(OUT, key + '-2-filled.png') });
        const edited = L.title + ' 2';
        await p.locator('#csPhoto .cs-food-t').fill(edited);
        await p.locator('#cmSend').tap({ timeout: 5000 });
        let got = null; for (let i = 0; i < 60 && !got; i++) { got = sim.W.messages.slice(before).find(x => /\u{1F37D}/u.test(x.body || '')) || null; if (!got) await sleep(250); }
        ok('one tap posts a meal card (meal- photo, edited name, spike label, menu line as the caption)', !!got && /\/meal-p[0-9a-f]+\.jpg#l=low&n=/.test(got.body) && decodeURIComponent(got.body).includes(edited) && got.body.includes(L.desc), got && got.body);
        ok('the photo check travels with the post (whitelisted detail)', !!got && got.meal && got.meal.name === edited && got.meal.lvl === 'low' && Array.isArray(got.meal.items) && got.meal.items.length === 2 && got.meal.total && got.meal.total.kcal === 210, got && got.meal);
        const cardSel = got ? '#cm-' + got.id + ' .cs-meal' : '.cs-meal';
        const card = await p.waitForFunction((s) => { const c = [...document.querySelectorAll('#cmList .cs-meal')].pop(); return c && c.querySelector('.cs-meal-k') ? { name: (c.querySelector('.cs-meal-n') || {}).textContent, k: c.querySelector('.cs-meal-k').textContent, pill: !!c.querySelector('button.cs-meal-bs') } : null; }, cardSel, { timeout: 10000 }).then(h => h.jsonValue()).catch(() => null);
        ok('the posted card shows the name, the numbers and a Details label', !!card && card.name === edited && card.k.startsWith('210 kcal') && card.pill, card);
        ok('the composer is clear again', await p.evaluate(() => !document.querySelector('#csPhoto .cs-photo-ready')));
        await sleep(500);
        await p.screenshot({ path: path.join(OUT, key + '-3-posted.png') });
        const lab = p.locator('#cmList button.cs-meal-bs').last();
        await lab.scrollIntoViewIfNeeded(); await lab.tap({ timeout: 8000 });
        const sheet = await p.locator('.md-ov.on .md-sheet').waitFor({ state: 'visible', timeout: 8000 }).then(() => p.locator('.md-ov.on .md-sheet').innerText()).catch(() => '');
        ok('its label opens the same Details sheet', sheet.includes(edited) && sheet.includes(L.a) && sheet.includes('210'), sheet.slice(0, 200));
        await p.screenshot({ path: path.join(OUT, key + '-4-details.png') });
        await p.locator('.md-ov.on .r2-x').tap({ timeout: 3000 }).catch(() => p.touchscreen.tap(12, 12));
        await p.waitForFunction(() => !document.querySelector('.md-ov.on'), null, { timeout: 8000 }).catch(() => {});
        await sleep(600);
        // 2. send while the check still runs -> waits, then posts the card
        delay = 3500; const b2 = sim.W.messages.length;
        await p.setInputFiles('#cmPhotoFile', path.join(__dirname, '..', 'regress', 'fixtures', 'photo2.jpg'));
        await p.waitForSelector('#csPhoto .cs-food-l', { timeout: 8000 });
        await p.locator('#cmSend').tap({ timeout: 5000 });
        const wait = await p.waitForFunction((w) => { const e = document.querySelector('#csPhoto .cs-food-l'); return e && e.textContent.includes(w) ? e.textContent : ''; }, L.wait, { timeout: 3000 }).then(h => h.jsonValue()).catch(() => p.evaluate(() => (document.querySelector('#csPhoto') || {}).textContent || ''));
        ok('send during the check: "sends when ready" line', wait.includes(L.wait), wait);
        await p.screenshot({ path: path.join(OUT, key + '-5-waiting.png') });
        let m2 = null; for (let i = 0; i < 60 && !m2; i++) { m2 = sim.W.messages.slice(b2).find(x => /\u{1F37D}/u.test(x.body || '')); if (!m2) await sleep(250); }
        ok('then posts the card by itself', !!m2 && decodeURIComponent(m2.body).includes(L.title) && m2.meal && m2.meal.total, m2 && m2.body);
        await sleep(600);
        // 3. not food -> plain photo
        mode = 'none'; delay = 800; const b3 = sim.W.messages.length;
        await p.setInputFiles('#cmPhotoFile', path.join(__dirname, '..', 'regress', 'fixtures', 'photo3.jpg'));
        await p.waitForFunction(() => { const c = document.querySelector('#csPhoto .cs-photo-ready'); return c && c.classList.contains('cs-food-plain'); }, null, { timeout: 10000 }).catch(() => {});
        const plainChip = await p.evaluate(() => { const c = document.querySelector('#csPhoto .cs-photo-ready'); return c ? { cls: c.className, b: (c.querySelector('b') || {}).textContent || '', input: !!c.querySelector('.cs-food-t') } : null; });
        ok('not food: the plain "Photo ready" chip, no card fields', !!plainChip && /cs-food-plain/.test(plainChip.cls) && !plainChip.input && plainChip.b.length > 5, plainChip);
        await p.locator('#cmSend').tap({ timeout: 5000 });
        let m3 = null; for (let i = 0; i < 40 && !m3; i++) { m3 = sim.W.messages.slice(b3).find(x => /\u{1F4F7}/u.test(x.body || '')); if (!m3) await sleep(250); }
        ok('not food: posts a plain photo', !!m3 && /\/chat-p[0-9a-f]+\.jpg/.test(m3.body) && !m3.meal, m3 && m3.body);
        await sleep(500);
        await p.screenshot({ path: path.join(OUT, key + '-6-plain.png') });
        ok('three photo checks for three photos', posts === 3, posts);
        ok('no page errors', !(R.errs || []).length, (R.errs || []).slice(0, 3));
    } catch (e) { ok('run', false, String(e && e.stack || e).slice(0, 600)); try { await p.screenshot({ path: path.join(OUT, key + '-fail.png') }); } catch (x) { } }
    finally { try { await R.close(); } catch (e) { } }
    return res;
}
(async () => {
    const all = [];
    for (const k of CASES) { const r = await one(k); all.push(r); console.log((r.ok ? 'PASS ' : 'FAIL ') + k + '  ' + r.checks.filter(c => !c.pass).map(c => c.name + ': ' + JSON.stringify(c.info).slice(0, 300)).join(' | ')); }
    fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify(all, null, 1));
    process.exit(all.every(r => r.ok) ? 0 : 1);
})();
