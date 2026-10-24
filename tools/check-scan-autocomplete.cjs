'use strict';
/* Kitchen autocomplete check (Oct 24 2026). Opens the food photo result with a stand-in answer (pasta + "Tomato sauce", the
   real endpoint is never called), with a Kitchen ("At home": Pesto, Kaese, Babybel), a scanned Barilla pesto and a shopping
   cart item (Sriracha Sauce), then, offline:
   A) Fix the sauce, type "pes": Kitchen pesto first with the scan's nutrition, tap it, Update -> the totals change;
   B) + Add food: the empty field offers the Kitchen at once; type "kase" -> Kaese (umlaut-blind), tap, Update -> counted;
   C) Fix, type "srir": the cart item is offered;
   D) + Add food, free text nothing knows -> added with the 0 kcal note; E) + Add food, Cancel -> nothing added.
   Measures keystroke cost, list size (max 5), overflow, cut-off text, tap sizes, English in de/es, page errors.
   node tools/check-scan-autocomplete.cjs <device> <lang en|de|es> [live]   (WebKit by default; ENG=chromium). Not a real phone. */
const fs = require('fs'), path = require('path');
const { launch, openApp, sleep, BASE, existingSeed } = require('./interface-audit/lib.cjs');
const device = process.argv[2] || 'iPhone 13', lang = process.argv[3] || 'en', live = process.argv[4] === 'live';
const OUT = process.env.SA_OUT || '/home/sprite/scan-ac-shots';
const FIX = path.join(__dirname, 'regress', 'fixtures', 'photo0.jpg');
const FAKE = 'https://therealetm.github.io/__food_photo_fixture';
const DISHES = [
    { name: 'Pasta', portion: '~250 g', grams: 250, kcal: 390, protein: 14, carbs: 78, sugar: 3, fiber: 4, fat: 2 },
    { name: 'Tomato sauce', portion: '~80 g', grams: 80, kcal: 40, protein: 1, carbs: 7, sugar: 5, fiber: 1, fat: 1 }
];
const T = {
    en: { home: 'In your kitchen', cart: 'In your shopping cart', add: 'Add food', zero: '0 kcal' },
    de: { home: 'In deiner Küche', cart: 'Im Einkaufswagen', add: 'Lebensmittel hinzufügen', zero: '0 kcal' },
    es: { home: 'En tu cocina', cart: 'En tu carrito', add: 'Añadir alimento', zero: '0 kcal' }
}[lang];
(async () => {
    const now = Date.now();
    const seed = existingSeed({ lang, kv: {
        'lowispike.lang': lang, 'lowi.lang': lang,
        'lowispike.kitchen.v1': JSON.stringify({ v: 1, items: [
            { id: 'k1', n: 'Pesto', at: now - 1000, from: 'me' }, { id: 'k2', n: 'Käse', at: now - 2000, from: 'me' }, { id: 'k3', n: 'Babybel', at: now - 3000, from: 'cart' }] }),
        'lowi.dex.v1': JSON.stringify({ mine: { b8076809513753: { barcode: '8076809513753', name: 'Pesto alla Genovese', brand: 'Barilla', facts: { kcal: 520, c: 6, s: 4, p: 5, fat: 51, q: '190 g', sv: 30 }, ts: now - 86400000 } }, comm: [], commTs: 0 })
    } });
    const h = await launch({ device, engine: process.env.ENG || 'webkit', seed, lang });
    if (live) await h.ctx.route(u => String(u).startsWith(BASE), r => r.request().method() === 'GET' ? r.continue() : r.abort());
    await h.ctx.route(FAKE + '**', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(r.request().method() === 'POST' ? { dishes: DISHES, confidence: 'high', left: 2, limit: 3, model: 'fixture' } : { ok: true, configured: true, left: 3, limit: 3 }) }));
    const P = h.page, tag = device.replace(/\W/g, '') + '-' + lang + (live ? '-live' : ''), res = { device, lang, live, cases: {}, finds: [] };
    fs.mkdirSync(OUT, { recursive: true });
    const shot = async n => { const f = path.join(OUT, tag + '-' + n + '.png'); await P.screenshot({ path: f }); return f; };
    const find = (kind, info) => { res.finds.push(Object.assign({ kind }, info || {})); console.log('FIND', kind, JSON.stringify(info || {}).slice(0, 300)); };
    const into = async sel => { await P.evaluate(s => { const e = document.querySelector(s); if (e) e.scrollIntoView({ block: 'center' }); }, sel); await sleep(250); };
    const click = async sel => { await into(sel); await P.evaluate(s => { const e = document.querySelector(s); if (e) e.click(); }, sel); await sleep(350); };
    const typeIn = async (sel, text) => { await P.focus(sel); await P.fill(sel, ''); await P.keyboard.type(text, { delay: 40 }); await sleep(450); };
    const sug = () => P.evaluate(() => {
        const el = [...document.querySelectorAll('.mr-sug')].find(e => !e.hidden);
        if (!el) return { open: false, opts: [] };
        const vis = e => { const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; };
        return { open: true, opts: [...el.querySelectorAll('.mr-opt')].filter(vis).map(o => ({ n: (o.querySelector('.mr-opt-n b') || {}).textContent || '', sub: (o.querySelector('.mr-opt-n small') || {}).textContent || '', k: (o.querySelector('.mr-opt-k') || {}).textContent || '', kit: o.classList.contains('mr-opt-kit'), h: Math.round(o.getBoundingClientRect().height), right: Math.round(o.getBoundingClientRect().right) })) };
    });
    const state = () => P.evaluate(() => {
        const form = document.querySelector('#spMeal') || document.querySelector('.sp-photo-form');
        const val = n => { const i = form && form.querySelector('[name="' + n + '"]'); return i ? i.value : null; };
        const sheet = (document.querySelector('.mr-verdict') || document.body).closest('.r2-ov') || document.body;
        const vis = e => { const s = getComputedStyle(e), r = e.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 1 && r.height > 1; };
        const wide = [...sheet.querySelectorAll('.mr *')].filter(e => vis(e) && e.getBoundingClientRect().right > innerWidth + 1).map(e => String(e.className || e.tagName)).slice(0, 4);
        const cut = [...sheet.querySelectorAll('.mr button, .mr b, .mr small, .mr span, .mr label')].filter(e => vis(e) && e.children.length === 0 && e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).textOverflow !== 'ellipsis' && getComputedStyle(e).overflow === 'hidden').map(e => e.textContent.slice(0, 30)).slice(0, 4);
        const small = [...sheet.querySelectorAll('.mr-opt, .mr-add-food, [data-mr-save], [data-mr-cancel]')].filter(vis).map(e => ({ t: e.textContent.trim().slice(0, 24), h: Math.round(e.getBoundingClientRect().height) })).filter(b => b.h < 40);
        return { items: [...document.querySelectorAll('.mr-item')].map(li => li.textContent.replace(/\s+/g, ' ').trim().slice(0, 110)), kcal: +val('kcal') || 0, text: (sheet.innerText || '').replace(/\s+/g, ' '), wide, cut, small, addBtn: !!document.querySelector('[data-mr-add-food]') };
    });
    // the cost of one keystroke in the field (the list paints inside the input handler)
    const keyCost = sel => P.evaluate(sel => {
        const i = document.querySelector(sel), out = [];
        for (const v of ['p', 'pe', 'pes', 'pest', 'pesto', 'pest', 'k', 'ka', 'kas', 'kase', 'tomat', 'sauce']) { i.value = v; const t0 = performance.now(); i.dispatchEvent(new Event('input', { bubbles: true })); out.push(performance.now() - t0); }
        return { max: Math.round(Math.max.apply(null, out) * 10) / 10, avg: Math.round(out.reduce((a, b) => a + b, 0) / out.length * 10) / 10 };
    }, sel);
    try {
        await openApp(h);
        res.build = await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || null);
        await P.evaluate(() => { try { window.LOWI_SHELF.addIngredients([{ n: 'Sriracha Sauce', q: '1 Flasche' }], 'Check'); } catch (e) { } });
        await P.evaluate(u => { window.LOWI_FOOD_AI_URL = u; const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.className = 'sp-file-in'; i.id = '__saIn'; i.style.cssText = 'position:fixed;left:-99px;top:0;width:1px;height:1px'; document.body.append(i); }, FAKE);
        await P.setInputFiles('#__saIn', FIX);
        await P.waitForSelector('.mr-verdict', { timeout: 40000 });
        await sleep(1500);
        await h.setOffline(true);           // from here on the phone is offline: everything comes from local data
        const s0 = await state(); res.start = { items: s0.items, kcal: s0.kcal, addBtn: s0.addBtn };
        if (!s0.addBtn) find('no Add food row');
        await shot('0-result');

        // A) fix the sauce from the Kitchen
        await click('[data-mr-edit="f1"]');
        await typeIn('[data-mr="f1"] [data-mr-name]', 'pes');
        const a = await sug(); await shot('A1-typing-pes');
        res.cases.A = { opts: a.opts };
        if (!a.open || !a.opts.length) find('A: no suggestions for "pes"');
        else {
            if (!a.opts[0].kit || !a.opts[0].sub.endsWith(T.home)) find('A: Kitchen not first', { first: a.opts[0] });
            if (!/Genovese/.test(a.opts[0].n) || !/kcal/.test(a.opts[0].k)) find('A: Kitchen pesto without the scan nutrition', { first: a.opts[0] });
            if (a.opts.length > 5) find('A: more than 5', { n: a.opts.length });
        }
        res.keystroke = await keyCost('[data-mr="f1"] [data-mr-name]');
        if (res.keystroke.max > 50) find('slow keystroke', res.keystroke);
        await typeIn('[data-mr="f1"] [data-mr-name]', 'pes');
        await click('[data-mr="f1"] .mr-opt');
        await shot('A2-picked');
        await click('[data-mr-save="f1"]');
        const sa = await state(); res.cases.A.after = { items: sa.items, kcal: sa.kcal };
        if (!sa.items.some(t => /Pesto alla Genovese/.test(t)) || sa.kcal === s0.kcal) find('A: pick did not recalc', res.cases.A.after);
        await shot('A3-updated');

        // B) add a food the scan missed, straight from the Kitchen (umlaut-blind)
        await click('[data-mr-add-food]');
        const b0 = await sug(); await shot('B1-add-food-empty');
        res.cases.B = { empty: b0.opts };
        if (!b0.opts.length || !b0.opts.every(o => o.kit)) find('B: empty Add food field does not offer the Kitchen', { opts: b0.opts });
        await typeIn('.mr-fresh [data-mr-name]', 'kase');
        await sleep(500);
        const b1 = await sug(); await shot('B2-typing-kase');
        res.cases.B.kase = b1.opts;
        if (!b1.opts.length || b1.opts[0].n !== 'Käse' || !b1.opts[0].sub.endsWith(T.home)) find('B: "kase" did not find Käse first', { opts: b1.opts });
        if (b1.opts[0] && !/kcal/.test(b1.opts[0].k)) find('B: Käse has no portion', { opt: b1.opts[0] });
        const kb = (await state()).kcal;
        await click('.mr-fresh .mr-opt');
        await click('.mr-fresh [data-mr-save]');
        const sb = await state(); res.cases.B.after = { items: sb.items, kcal: sb.kcal };
        if (!sb.items.some(t => /Käse/.test(t)) || sb.kcal <= kb) find('B: Käse not counted', res.cases.B.after);
        await shot('B3-added');

        // C) the shopping cart counts too
        await click('[data-mr-edit="f0"]');
        await typeIn('[data-mr="f0"] [data-mr-name]', 'srir');
        const c = await sug(); await shot('C1-cart');
        res.cases.C = c.opts;
        if (!c.opts.length || !c.opts[0].sub.endsWith(T.cart) || !/Sriracha/.test(c.opts[0].n)) find('C: cart item not offered', { opts: c.opts });
        await click('[data-mr-cancel]');

        // D) free text nothing knows still works
        await click('[data-mr-add-food]');
        await typeIn('.mr-fresh [data-mr-name]', 'Zqxw blorp');
        const d0 = await sug();
        const kd = (await state()).kcal;
        await click('.mr-fresh [data-mr-save]');
        const sd = await state(); res.cases.D = { sugOpen: d0.open && d0.opts.length, items: sd.items, kcal: sd.kcal };
        if (!sd.items.some(t => /Zqxw blorp/.test(t) && t.includes(T.zero)) || sd.kcal !== kd) find('D: free text not added with the 0 kcal note', res.cases.D);
        await shot('D1-free-text');

        // E) Add food, then Cancel: nothing added
        const ne = (await state()).items.length;
        await click('[data-mr-add-food]');
        await click('[data-mr-cancel]');
        const se = await state(); res.cases.E = { before: ne, after: se.items.length, addBtn: se.addBtn };
        if (se.items.length !== ne || !se.addBtn) find('E: cancel left a card', res.cases.E);

        const fin = await state();
        res.layout = { wide: fin.wide, cut: fin.cut, small: fin.small };
        if (fin.wide.length) find('overflow', { wide: fin.wide });
        if (fin.cut.length) find('cut off', { cut: fin.cut });
        if (/undefined|NaN|\[object/.test(fin.text)) find('broken text');
        if (lang !== 'en' && /\b(In your kitchen|In your shopping cart|Add food|What else is on the plate)\b/.test(fin.text)) find('english in ' + lang);
        for (const o of [].concat(a.opts, b0.opts, c.opts)) if (o.right > (await P.evaluate(() => innerWidth)) + 1) { find('option off screen', o); break; }
    } catch (e) { res.fail = String(e && e.message || e).slice(0, 300); find('script failed', { e: res.fail }); try { await shot('fail'); } catch (x) { } }
    res.errors = h.errors.filter(e => !/Failed to fetch|NetworkError|Load failed|network/i.test(e));
    if (res.errors.length) find('page errors', { errors: res.errors.slice(0, 4) });
    fs.writeFileSync(path.join(OUT, tag + '.json'), JSON.stringify(res, null, 1));
    console.log(JSON.stringify({ tag, build: res.build, keystroke: res.keystroke, finds: res.finds.map(f => f.kind), A: res.cases.A && res.cases.A.opts && res.cases.A.opts.slice(0, 3), Aafter: res.cases.A && res.cases.A.after, Bafter: res.cases.B && res.cases.B.after, D: res.cases.D }, null, 1));
    await h.browser.close();
    process.exit(res.finds.length ? 1 : 0);
})();
