/* Add to kitchen proof (task a33a6ac1, Oct 25 2026): in a real browser, a friend's meal post in Community Chat with its stored foods
   shows a small "Add to kitchen" row (button + first foods); one finger tap puts those foods into the viewer's Kitchen
   (lowispike.kitchen.v1) once, the row says how many, Undo takes them out again, a second add does not double anything.
   An older meal post without foods has no row. For You: the shared meal slide has the same row, visible, not covered, AA.
   node tools/meal-kitchen/check.cjs [outDir] [url] [cases]
   With a url it runs against that site, with the regress fake Supabase: nothing is written anywhere. Exit 1 on failure. */
'use strict';
const fs = require('fs'), path = require('path');
const H = require('../regress/harness.cjs'), N = require('../regress/nav.cjs');
const K = require('../../community-chat-core.js');
global.LowiMealSnap = require('../../meal-photo.js'); global.LowiFoodKnowledge = require('../../food-knowledge-core.js');
const M = require('../../meal-detail-core.js'), J = require('../../meal-journal.js'), MK = require('../../meal-kitchen-core.js');
const OUT = path.resolve(process.argv[2] || '/tmp/meal-kitchen'); fs.mkdirSync(OUT, { recursive: true });
const URL_ = process.argv[3] || '';
const ALL = {
    'chromium-13-de': { engine: 'chromium', viewport: { width: 390, height: 844 }, lang: 'de' },
    'chromium-13-en': { engine: 'chromium', viewport: { width: 390, height: 844 }, lang: 'en' },
    'chromium-13-es': { engine: 'chromium', viewport: { width: 390, height: 844 }, lang: 'es' },
    'webkit-13-de': { engine: 'webkit', device: 'iPhone 13', viewport: { width: 390, height: 844 }, lang: 'de' },
    'webkit-13-en': { engine: 'webkit', device: 'iPhone 13', viewport: { width: 390, height: 844 }, lang: 'en' },
    'webkit-13-es': { engine: 'webkit', device: 'iPhone 13', viewport: { width: 390, height: 844 }, lang: 'es' },
    'chromium-se-en': { engine: 'chromium', viewport: { width: 375, height: 667 }, lang: 'en' }
};
const CASES = (process.argv[4] || 'chromium-13-de,chromium-13-en,chromium-13-es,webkit-13-de,webkit-13-en,webkit-13-es').split(',').filter(k => ALL[k]);
const log0 = { t: 'Lachs-Bowl', lvl: 'low', ai: J.estimate({ name: 'Salmon bowl', items: [{ name: 'Salmon', portion: '150 g' }, { name: 'Avocado', portion: '1/2' }, { name: 'Cucumber' }, { name: 'Sesame seeds', portion: '1 tsp' }], total: { kcal: 520, carbs: 14, protein: 38, fiber: 8, sugar: 4, fat: 32 } }, { lvl: 'low', note: 'Lots of protein and healthy fat, very few carbs.' }) };
const DETAIL = M.fromLog(log0, 'low');
const FOODS = MK.foodsOfDetail(DETAIL);
const KEY = 'lowispike.kitchen.v1';

async function contrast(p, sel) {
    return p.evaluate((sel) => {
        const parse = (c) => { const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return null; const a = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: a[0], g: a[1], b: a[2], a: a[3] == null ? 1 : a[3] }; };
        const over = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
        const lum = (c) => { const f = (v) => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c.r) + .7152 * f(c.g) + .0722 * f(c.b); };
        const bgOf = (el) => { const stack = []; for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { stack.push(c); if (c.a >= .98) break; } } let b = { r: 0, g: 0, b: 0, a: 1 }; for (let i = stack.length - 1; i >= 0; i--) b = over(stack[i], b); return b; };
        const root = document.querySelector(sel); if (!root) return { min: 0, n: 0, worst: 'no ' + sel };
        let min = 99, worst = '', n = 0;
        const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        while (w.nextNode()) {
            const t = w.currentNode, el = t.parentElement; if (!t.textContent.trim() || !el) continue;
            const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
            const cs = getComputedStyle(el); let fg = parse(cs.color); if (!fg) continue; const bg = bgOf(el); fg = over(Object.assign({}, fg, { a: fg.a * Number(cs.opacity || 1) }), bg);
            const L1 = lum(fg), L2 = lum(bg), ratio = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05); n++;
            if (ratio < min) { min = ratio; worst = t.textContent.trim().slice(0, 40) + ' ' + cs.color + ' on ' + JSON.stringify(bg); }
        }
        return { min: Math.round(min * 100) / 100, n, worst };
    }, sel);
}


async function rowInfo(p, sel) {
    return p.locator(sel).first().evaluate(el => {
        const r = el.getBoundingClientRect(), b = el.querySelector('button') || el, br = b.getBoundingClientRect();
        const hit = document.elementFromPoint(br.left + br.width / 2, br.top + br.height / 2);
        let over = 0; for (const c of el.querySelectorAll('*')) { const q = c.getBoundingClientRect(); if (q.width && (q.right > innerWidth + .5 || q.left < -.5)) over++; }
        return { text: el.innerText.replace(/\s+/g, ' ').trim(), l: r.left, r: r.right, t: r.top, b: r.bottom, h: br.height, vw: innerWidth, vh: innerHeight, onTop: !!hit && (hit === b || b.contains(hit)), over };
    }).catch(e => ({ err: String(e).slice(0, 200) }));
}
const kit = p => p.evaluate(k => { try { return (JSON.parse(localStorage.getItem(k) || '{}').items || []).map(i => i.n); } catch (e) { return ['ERR']; } }, KEY);
async function one(key) {
    const C = ALL[key], res = { key, ok: true, checks: [] }, l = C.lang;
    const ok = (name, pass, info) => { res.checks.push({ name, pass: !!pass, info }); if (!pass) res.ok = false; };
    const R = await H.open(Object.assign({ probe: false, url: URL_, messages: 80, members: 20 }, C));
    const p = R.page, sim = R.sim;
    try {
        const a = sim.say('tmp-old'), b = sim.say('tmp-new');
        const host = (sim.HOST || 'vnfwmifmsfecascwaody.supabase.co');
        a.body = K.mealBody('https://' + host + '/storage/v1/object/public/media/' + a.user_id + '/meal-old001.jpg', 'Toast mit Marmelade', 'high', '');
        b.body = K.mealBody('https://' + host + '/storage/v1/object/public/media/' + b.user_id + '/meal-new001.jpg', 'Lachs-Bowl', 'low', 'Lunch!');
        b.meal = DETAIL; b.who = 'Antje';
        if (sim.W.posts) sim.W.posts.unshift({ id: 'fy-mk-1', user_id: b.user_id, who: 'Antje', created_at: new Date().toISOString(), cap: 'Lachs-Bowl', photo_url: 'https://' + host + '/storage/v1/object/public/media/' + b.user_id + '/post-mk.jpg', url: '', plat: '', lv: 3, meta: { spike: 'low', dish: 'Lachs-Bowl', from: 'community', detail: DETAIL } });
        // the viewer already has Avocado at home (typed in German case-insensitively): it must not be doubled
        await R.ctx.addInitScript((o) => { try { localStorage.setItem('lowispike.lang', o.l); if (!sessionStorage.getItem('mk-seeded')) { sessionStorage.setItem('mk-seeded', '1'); localStorage.setItem(o.k, JSON.stringify({ v: 1, items: [{ id: 'k1', n: 'avocado', at: 1, from: 'me' }] })); } } catch (e) { } }, { l, k: KEY });
        await R.goto();
        await N.openCommunity(R, (s) => res.checks.push({ name: 'nav', pass: true, info: s }));
        const slow = C.engine === 'webkit' ? 120000 : 30000;
        if (!(await p.evaluate(() => !!document.querySelector('#cgThread[data-open]')))) await p.locator('#cmPaneChat .rm-tab[data-rm="chat"]').first().click({ force: true, timeout: 8000 });
        await p.waitForFunction(() => !!document.querySelector('#cgThread[data-open]') && document.querySelectorAll('#cmList [id^="cm-"]').length > 0, null, { timeout: slow });
        const rowSel = '.mk-row[data-mk-key="c:' + b.id + '"]';
        await p.locator(rowSel).first().waitFor({ state: 'attached', timeout: slow });
        ok('older meal post without foods: no row', (await p.locator('.mk-row[data-mk-key="c:' + a.id + '"]').count()) === 0);
        await p.locator(rowSel).first().scrollIntoViewIfNeeded();
        const r0 = await rowInfo(p, rowSel);
        ok('chat row: button + first three foods + more', !r0.err && r0.text.includes(MK.t('add', l)) && r0.text.includes(FOODS.slice(0, 3).join(' · ')) && r0.text.includes('+' + (FOODS.length - 3)), Object.assign({ foods: FOODS }, r0));
        ok('chat row on screen, not covered, tap target', !r0.err && r0.onTop && r0.over === 0 && r0.h >= 30, r0);
        const c1 = await contrast(p, rowSel);
        ok('chat row AA (app theme)', c1.min >= 4.5 && c1.n >= 2, c1);
        await p.screenshot({ path: path.join(OUT, key + '-1-chat.png') });
        await p.locator(rowSel + ' .mk-btn').first().tap({ timeout: 8000 });
        await p.locator(rowSel + ' .mk-undo').first().waitFor({ state: 'visible', timeout: 8000 });
        const k1 = await kit(p);
        ok('one tap: the foods are in the Kitchen, Avocado not doubled', FOODS.every(f => k1.some(n => n.toLowerCase() === f.toLowerCase())) && k1.filter(n => n.toLowerCase() === 'avocado').length === 1 && k1.length === FOODS.length, k1);
        const r1 = await rowInfo(p, rowSel);
        ok('confirmation: count, already there, Undo', r1.text.includes(MK.t('done', l, { n: FOODS.length - 1 })) && r1.text.includes(MK.t('had', l, { n: 1 })) && r1.text.includes(MK.t('undo', l)), r1);
        ok('no detail sheet or menu opened by the tap', await p.evaluate(() => !document.querySelector('.md-ov.on') && !document.querySelector('.cs-menu.on,.cm-menu.on,[data-chat-menu].on')));
        const c2 = await contrast(p, rowSel);
        ok('confirmation AA', c2.min >= 4.5, c2);
        await p.screenshot({ path: path.join(OUT, key + '-2-added.png') });
        await p.locator(rowSel + ' .mk-undo').first().tap({ timeout: 8000 });
        await p.locator(rowSel + ' .mk-btn').first().waitFor({ state: 'visible', timeout: 8000 });
        const k2 = await kit(p);
        ok('Undo: back to only what was at home', k2.length === 1 && k2[0] === 'avocado', k2);
        await p.locator(rowSel + ' .mk-btn').first().tap({ timeout: 8000 });
        await p.locator(rowSel + ' .mk-undo').first().waitFor({ state: 'visible', timeout: 8000 });
        // day look
        await p.evaluate(() => { document.documentElement.setAttribute('data-ui', 'light'); if (window.LowiR2 && LowiR2.applyTheme) LowiR2.applyTheme('light'); });
        await p.waitForTimeout(400);
        const c3 = await contrast(p, rowSel);
        ok('chat row AA (day look)', c3.min >= 4.5, c3);
        await p.screenshot({ path: path.join(OUT, key + '-3-day.png') });
        await p.evaluate(() => { document.documentElement.removeAttribute('data-ui'); if (window.LowiR2 && LowiR2.applyTheme) LowiR2.applyTheme('dark'); });
        // the Kitchen tab sees them (Fuel > Shop > Kitchen reads the same key on each paint)
        const k3 = await kit(p);
        ok('Kitchen holds the meal foods after the second add', k3.length === FOODS.length, k3);
        // For You: the shared meal slide carries the same row
        await p.evaluate(() => window.goTab && window.goTab('foryou'));
        await p.locator('.rm-tab[data-rm="fy"]').first().click({ timeout: 10000 }).catch(() => {});
        const inFeed = await p.waitForFunction(() => !!document.querySelector('#fyFeed .fy-slide[data-id="fy-mk-1"]'), null, { timeout: slow }).then(() => true).catch(() => false);
        if (!inFeed) ok('For You shows the shared meal post', false, await p.evaluate(() => { const f = document.getElementById('fyFeed'); return { feed: !!f, n: f ? f.querySelectorAll('.fy-slide').length : -1 }; }));
        else {
            await p.evaluate(() => document.querySelector('#fyFeed .fy-slide[data-id="fy-mk-1"]').scrollIntoView({ block: 'start' }));
            await p.waitForTimeout(1200);
            const fySel = '#fyFeed .fy-slide[data-id="fy-mk-1"] .mk-row';
            const f0 = await rowInfo(p, fySel);
            ok('For You row: says everything is already in the kitchen (added from Chat)', !f0.err && f0.text.includes(MK.t('have', l)) && f0.l >= 0 && f0.r <= f0.vw + .5 && f0.t >= 0 && f0.b <= f0.vh + .5, f0);
            // the Kitchen is emptied elsewhere (the Kitchen tab fires lowi:kitchen): the row goes back to "Add to kitchen" by itself
            await p.evaluate(k => { localStorage.setItem(k, JSON.stringify({ v: 1, items: [] })); window.dispatchEvent(new CustomEvent('lowi:kitchen', { detail: { count: 0 } })); }, KEY);
            await p.waitForTimeout(500);
            const f1 = await rowInfo(p, fySel);
            ok('For You row: visible, on screen, not covered, AA', !f1.err && f1.onTop && f1.over === 0 && f1.text.includes(MK.t('add', l)), f1);
            const c4 = await contrast(p, fySel);
            ok('For You row AA over the photo', c4.min >= 4.5, c4);
            await p.screenshot({ path: path.join(OUT, key + '-4-foryou.png') });
            if (f1.text.includes(MK.t('add', l))) {
                await p.locator(fySel + ' .mk-btn').first().tap({ timeout: 8000 });
                await p.locator(fySel + ' .mk-ok').first().waitFor({ state: 'visible', timeout: 8000 });
                const k4 = await kit(p);
                ok('For You tap: foods in the Kitchen', k4.length === FOODS.length, k4);
                ok('For You tap did not like/open anything', await p.evaluate(() => !document.querySelector('.md-ov.on')));
                await p.screenshot({ path: path.join(OUT, key + '-5-foryou-added.png') });
            }
        }
        ok('no page errors', !(R.errs || []).length, (R.errs || []).slice(0, 3));
    } catch (e) { ok('run', false, String(e && e.stack || e).slice(0, 600)); try { await p.screenshot({ path: path.join(OUT, key + '-fail.png') }); } catch (x) {} }
    finally { try { await R.close(); } catch (e) {} }
    return res;
}
(async () => {
    const all = [];
    for (const k of CASES) { const r = await one(k); all.push(r); console.log((r.ok ? 'PASS ' : 'FAIL ') + k + '  ' + r.checks.filter(c => !c.pass).map(c => c.name + ': ' + JSON.stringify(c.info).slice(0, 300)).join(' | ')); }
    fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify(all, null, 1));
    process.exit(all.every(r => r.ok) ? 0 : 1);
})();
