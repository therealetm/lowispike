#!/usr/bin/env node
/* Photo check causes + live recompute (29 Oct 2026). Emmanuel: "says insulin spike but doesn't say why or which food, and
   when I tap X on what it guessed wrong, nothing updates". Fakes the photo model answer for his plate (mixed salad with
   avocado and egg, boiled egg, avocado, plus a starchy food) with a stricter whole-meal NEIN and no reason, like the live
   prompt. Checks: the cause line names the food and the reason, its card is marked, the egg card says "counted twice?",
   a real tap on X recomputes answer, net carbs and causes at once, and "Ändern" does the same. No credits: the reply is
   faked once per photo and edits never call the model again (counted).
   node tools/check-photo-causes.cjs [--engine chromium|webkit] [--lang de] [--w 390 --h 844] [--url <live index.html>]
   Simulated browser, not a physical iPhone. */
const H = require('./sim/harness.cjs');
const path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const engine = arg('engine', 'chromium'), lang = arg('lang', 'de'), url = arg('url', ''), out = arg('out', '/tmp/photo-causes-check');
const W = +arg('w', 390), Hh = +arg('h', 844);
require('fs').mkdirSync(out, { recursive: true });
const res = []; const ok = (name, pass, info) => { res.push({ name, pass: !!pass }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + (typeof info === 'string' ? info : JSON.stringify(info)) : '')); };
const PLATE = {
    is_food: true, confidence: 'medium', title: 'Salat mit Brot', desc: '',
    dishes: [
        { name: 'Gemischter Salat mit Avocado und Ei', portion: '1 Teller', grams: 300, kcal: 280, protein_g: 9, carbs_g: 6, sugar_g: 2, fiber_g: 5, fat_g: 24, count: 1 },
        { name: 'Gekochtes Ei', portion: '1 Ei', grams: 50, kcal: 80, protein_g: 7, carbs_g: 1, sugar_g: 0, fiber_g: 0, fat_g: 5, count: 1 },
        { name: 'Avocado', portion: '1/2 Avocado', grams: 100, kcal: 130, protein_g: 2, carbs_g: 9, sugar_g: 1, fiber_g: 7, fat_g: 13, count: 1 },
        { name: 'Vollkornbrot', portion: '2 Scheiben', grams: 100, kcal: 220, protein_g: 8, carbs_g: 47, sugar_g: 3, fiber_g: 4, fat_g: 2, count: 1 }],
    lowispike: { v: 1, verdict: 'NEIN', light: 'red', score: 60, spike: 'mid', counted: [], confidence: 'medium' }
};
(async () => {
    const R = await H.open({ engine, lang, url, probe: false, fresh: false, viewport: { width: W, height: Hh } });
    const P = R.page;
    let posts = 0;
    await R.ctx.route(u => /\/functions\/v1\/food-photo/.test(String(u)), r => { if (r.request().method() !== 'GET') posts++; r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(r.request().method() === 'GET' ? { ok: true, configured: true, name: true } : PLATE) }); });
    const errs = []; P.on('pageerror', e => errs.push(String(e.message || e).slice(0, 160)));
    const read = () => P.evaluate(() => {
        const v = document.querySelector('.r2-ov.on .mr-verdict'); if (!v) return null;
        const cards = [...document.querySelectorAll('.r2-ov.on .mr-list .mr-item')].map(li => ({ id: li.dataset.mr, name: (li.querySelector('.mr-nm b') || {}).textContent || '', bad: li.classList.contains('mr-bad'), flag: (li.querySelector('.mr-flag') || {}).textContent || '', dup: (li.querySelector('.mr-dup') || {}).textContent || '' }));
        const wide = [...document.querySelectorAll('.r2-ov.on .sp-ai.mr *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.right > innerWidth + 1 || r.left < -1); }).map(e => e.className).slice(0, 5);
        return { cls: v.className, ans: v.querySelector('.mr-ans').textContent.trim(), why: (v.querySelector('.mr-why') || {}).textContent || '', cause: (v.querySelector('.mr-cause') || {}).textContent || '', cards, tot: (document.querySelector('.r2-ov.on .mr-tot') || {}).textContent || '', wide, sx: document.documentElement.scrollWidth > innerWidth + 1 };
    });
    const openPhoto = async () => {
        await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } });
        await H.sleep(800);
        await P.evaluate(() => LowiSpirit.meal());
        await H.sleep(1200);
        await P.evaluate(() => { const s = document.querySelector('.r2-ov.on [data-sp="slot"][data-slot="meal"]'); if (s) s.click(); });
        await H.sleep(900);
        const hasPhotoBtn = !!(await P.waitForSelector('.r2-ov.on [data-sp="photo"], input.sp-file-in', { state: 'attached', timeout: 20000 }).catch(() => null)) && await P.evaluate(() => !!document.querySelector('.r2-ov.on [data-sp="photo"]'));
        if (hasPhotoBtn) { await P.evaluate(() => document.querySelector('.r2-ov.on [data-sp="photo"]').click()); await H.sleep(1500); }
        const input = await P.waitForSelector('input.sp-file-in', { state: 'attached', timeout: 15000 });
        await input.setInputFiles(path.join(__dirname, 'regress', 'fixtures', 'photo2.jpg'));
        await P.waitForSelector('.r2-ov.on .mr-verdict', { state: 'attached', timeout: 30000 }).catch(() => { });
        await H.sleep(2500);
    };
    const tap = async (sel) => { const el = P.locator(sel).first(); await el.scrollIntoViewIfNeeded(); await el.click(); await H.sleep(900); };
    try {
        await R.goto(); await H.sleep(engine === 'webkit' ? 12000 : 7000);
        await P.evaluate(l => { try { window.LowiLang && LowiLang.set && LowiLang.set(l); } catch (e) { } const g = document.getElementById('r2gate'); if (g) g.remove(); try { LowiTutorial && LowiTutorial.stop && LowiTutorial.stop(); } catch (e) { } }, lang);
        await H.sleep(1200);
        const build = await P.evaluate(() => { const s = [...document.scripts].map(x => x.src).find(x => /meal-result\.js\?v=/.test(x)); return s ? s.split('v=')[1] : 'missing'; });
        console.log('  build', build, engine, lang, W + 'x' + Hh);
        await openPhoto();
        const a = await read();
        console.log('  plate', JSON.stringify(a));
        await R.shot(out + '/plate-' + engine + '-' + W + '.png');
        ok('plate reads Nicht insulinfreundlich', a && a.ans === 'Nicht insulinfreundlich', a && a.ans);
        ok('cause line names Vollkornbrot with the starch reason and its net carbs', a && /Vollkornbrot/.test(a.cause) && /Stärke/.test(a.cause) && /43 g Netto-KH/.test(a.cause), a && a.cause);
        ok('Vollkornbrot card is marked, the others not', a && a.cards.length === 4 && a.cards[3].bad && /Ausschlag/.test(a.cards[3].flag) && a.cards.slice(0, 3).every(c => !c.bad), a && a.cards);
        ok('egg and avocado cards ask "doppelt gezählt?"', a && /Doppelt/.test(a.cards[1].dup) && /Doppelt/.test(a.cards[2].dup) && !a.cards[0].dup);
        ok('nothing wider than the screen', a && !a.wide.length && !a.sx, a && a.wide);
        // real tap on the X of Vollkornbrot
        await tap('.r2-ov.on .mr-item[data-mr="f3"] .mr-x');
        const b = await read();
        console.log('  after X', JSON.stringify(b));
        await R.shot(out + '/after-x-' + engine + '-' + W + '.png');
        ok('after X: Insulinfreundlich at once', b && b.ans === 'Insulinfreundlich', b && b.ans);
        ok('after X: net carbs and total recomputed (4 g net, 16 g carbs)', b && /4 g/.test(b.why) && /16 g KH/.test(b.why) && /16 g/.test(b.tot), b && (b.why + ' | ' + b.tot));
        ok('after X: no cause line, no marked card', b && !b.cause && b.cards.every(c => !c.bad));
        // second photo: fix Vollkornbrot with "Ändern" into cucumber
        await openPhoto();
        await tap('.r2-ov.on .mr-item[data-mr="f3"] [data-mr-edit]');
        const inp = P.locator('.r2-ov.on [data-mr-name]').first();
        await inp.fill('Gurke'); await H.sleep(700);
        await tap('.r2-ov.on [data-mr-save]');
        const c = await read();
        console.log('  after fix', JSON.stringify(c));
        await R.shot(out + '/after-fix-' + engine + '-' + W + '.png');
        ok('after "Ändern" Vollkornbrot -> Gurke: Insulinfreundlich at once', c && c.ans === 'Insulinfreundlich' && c.cards.some(x => /Gurke/.test(x.name)), c && c.ans + ' ' + JSON.stringify(c.cards.map(x => x.name)));
        ok('no new photo-model call for X or Ändern (2 photos = 2 calls)', posts === 2, posts);
    } catch (e) { ok('run finished', false, String(e && e.message || e).slice(0, 300)); }
    ok('no page errors', !errs.length, errs.slice(0, 3));
    await R.close();
    const bad = res.filter(r => !r.pass).length;
    console.log(bad ? bad + ' FAILED' : 'ALL PASS');
    process.exit(bad ? 1 : 0);
})();
