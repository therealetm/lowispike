#!/usr/bin/env node
/* Photo meal energy check (28 Oct 2026). Emmanuel's bowl from a photo: Magerjoghurt, Mischbeeren, 35 Mandeln, 3 Kiwi-
   Scheiben, Chiasamen. The photo model answer is faked (it still rates the almonds and the kiwi SELTEN, like the deployed
   prompt). Reads the "Dein Foto" sheet: the answer (must be Insulinfreundlich), the why line (net carbs with their sum),
   the separate energy line, no word broken inside the big answer, nothing wider than the screen, page errors. Then a
   sugary meal (Pfannkuchen mit Ahornsirup) must still read not insulin-friendly, and its long answer must keep whole words.
   node tools/check-meal-energy.cjs [--engine chromium|webkit] [--lang de|en|es] [--w 390 --h 844] [--url <live index.html>]
   Simulated browser, not a physical iPhone. */
const H = require('./sim/harness.cjs');
const path = require('path');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const engine = arg('engine', 'chromium'), lang = arg('lang', 'de'), url = arg('url', ''), out = arg('out', '/tmp/meal-energy-check');
const W = +arg('w', 390), Hh = +arg('h', 844);
require('fs').mkdirSync(out, { recursive: true });
const res = []; const ok = (name, pass, info) => { res.push({ name, pass: !!pass }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + (typeof info === 'string' ? info : JSON.stringify(info)) : '')); };
const BOWL = {
    is_food: true, confidence: 'medium', title: 'Joghurt-Bowl', desc: '',
    dishes: [
        { name: 'Magerjoghurt', portion: '1 Schüssel', grams: 150, kcal: 105, protein_g: 15, carbs_g: 6, sugar_g: 6, fiber_g: 0, fat_g: 1, count: 1, verdict: 'JA' },
        { name: 'Mischbeeren tiefgekühlt', portion: '1 Handvoll', grams: 80, kcal: 42, protein_g: 1, carbs_g: 8, sugar_g: 5, fiber_g: 4, fat_g: 1, count: 1, verdict: 'JA' },
        { name: 'Mandeln', portion: '35 Stück', grams: 42, kcal: 200, protein_g: 7, carbs_g: 2, sugar_g: 1, fiber_g: 4, fat_g: 18, count: 1, verdict: 'SELTEN' },
        { name: 'Kiwi', portion: '3 Scheiben', grams: 60, kcal: 30, protein_g: 1, carbs_g: 7, sugar_g: 5, fiber_g: 2, fat_g: 0, count: 3, verdict: 'SELTEN' },
        { name: 'Chiasamen', portion: '1 Esslöffel', grams: 12, kcal: 49, protein_g: 2, carbs_g: 4, sugar_g: 0, fiber_g: 3, fat_g: 3, count: 1, verdict: 'JA' }],
    lowispike: { v: 1, verdict: 'SELTEN', light: 'yellow', score: 15, spike: 'low', counted: ['Kiwi', 'Mischbeeren'], confidence: 'medium' }
};
const SWEET = {
    is_food: true, confidence: 'high', title: 'Pfannkuchen', desc: '',
    dishes: [
        { name: 'Pfannkuchen', portion: '3 Stück', grams: 240, kcal: 520, protein_g: 14, carbs_g: 75, sugar_g: 12, fiber_g: 2, fat_g: 16, count: 3, verdict: 'NEIN' },
        { name: 'Ahornsirup', portion: '3 Esslöffel', grams: 60, kcal: 156, protein_g: 0, carbs_g: 40, sugar_g: 36, fiber_g: 0, fat_g: 0, count: 1, verdict: 'NEIN' }],
    lowispike: { v: 1, verdict: 'NEIN', light: 'red', score: 85, spike: 'high', counted: ['Pfannkuchen', 'Ahornsirup'], confidence: 'high' }
};
(async () => {
    const R = await H.open({ engine, lang, url, probe: false, fresh: false, viewport: { width: W, height: Hh } });
    const P = R.page;
    let reply = BOWL;
    await R.ctx.route(u => /\/functions\/v1\/food-photo/.test(String(u)), r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(r.request().method() === 'GET' ? { ok: true, configured: true, name: true } : reply) }));
    const errs = []; P.on('pageerror', e => errs.push(String(e.message || e).slice(0, 160)));
    const read = () => P.evaluate(() => {
        const v = document.querySelector('.r2-ov.on .mr-verdict'); if (!v) return null;
        const ans = v.querySelector('.mr-ans');
        /* a word part whose range spans two line boxes is broken mid-word */
        const broken = [];
        for (const tn of [...ans.childNodes].filter(n => n.nodeType === 3)) {
            const s = tn.textContent; const re = /[^\s-]+/g;  /* a break at a real hyphen (insulin-friendly) is fine */ let m;
            while ((m = re.exec(s))) { const r = document.createRange(); r.setStart(tn, m.index); r.setEnd(tn, m.index + m[0].length); const tops = new Set([...r.getClientRects()].filter(x => x.width > 0).map(x => Math.round(x.top))); if (tops.size > 1) broken.push(m[0]); }
        }
        const wide = [...document.querySelectorAll('.r2-ov.on .mr-verdict *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.right > innerWidth + 1 || r.left < -1); }).map(e => e.className).slice(0, 5);
        const vt = v.querySelector('.mr-vt'), probe = document.createElement('span'); probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font-size:100px;font-weight:800;letter-spacing:-.02em;font-family:' + getComputedStyle(ans).fontFamily; probe.textContent = 'insulinfreundlich'; document.body.appendChild(probe); const ratio = probe.getBoundingClientRect().width / 100; probe.remove();
        const geo = { vt: Math.round(vt.getBoundingClientRect().width), verdict: Math.round(v.getBoundingClientRect().width), ansH: Math.round(ans.getBoundingClientRect().height), ratio: +ratio.toFixed(2) };
        return { geo, cls: v.className, ans: ans.textContent.trim(), font: getComputedStyle(ans).fontSize, why: (v.querySelector('.mr-why') || {}).textContent || '', energy: (v.querySelector('.mr-energy') || {}).textContent || '', broken, wide, sx: document.documentElement.scrollWidth > innerWidth + 1 };
    });
    const openPhoto = async () => {
        await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } });
        await H.sleep(800);
        await P.evaluate(() => LowiSpirit.meal());
        await H.sleep(1200);
        /* older sheets ask meal / snack first */
        await P.evaluate(() => { const s = document.querySelector('.r2-ov.on [data-sp="slot"][data-slot="meal"]'); if (s) s.click(); });
        await H.sleep(900);
        const hasPhotoBtn = !!(await P.waitForSelector('.r2-ov.on [data-sp="photo"], input.sp-file-in', { state: 'attached', timeout: 20000 }).catch(() => null)) && await P.evaluate(() => !!document.querySelector('.r2-ov.on [data-sp="photo"]'));
        if (hasPhotoBtn) { await P.evaluate(() => document.querySelector('.r2-ov.on [data-sp="photo"]').click()); await H.sleep(1500); }
        const input = await P.waitForSelector('input.sp-file-in', { state: 'attached', timeout: 15000 });
        await input.setInputFiles(path.join(__dirname, 'regress', 'fixtures', 'photo2.jpg'));
        await P.waitForSelector('.r2-ov.on .mr-verdict', { state: 'attached', timeout: 30000 }).catch(() => { });
        await H.sleep(2500);
    };
    try {
        await R.goto(); await H.sleep(engine === 'webkit' ? 12000 : 7000);
        await P.evaluate(l => { try { window.LowiLang && LowiLang.set && LowiLang.set(l); } catch (e) { } const g = document.getElementById('r2gate'); if (g) g.remove(); try { LowiTutorial && LowiTutorial.stop && LowiTutorial.stop(); } catch (e) { } }, lang);
        await H.sleep(1200);
        const build = await P.evaluate(() => { const s = [...document.scripts].map(x => x.src).find(x => /meal-result\.js\?v=/.test(x)); return s ? s.split('v=')[1] : 'missing'; });
        console.log('  build', build, engine, lang, W + 'x' + Hh);
        await openPhoto();
        const a = await read();
        if (!a) console.log('  screen:', (await P.evaluate(() => [...document.querySelectorAll('.r2-ov.on')].map(o => o.className + ' :: ' + o.innerText.replace(/\s+/g, ' ').slice(0, 400)).join(' ## '))));
        console.log('  bowl', JSON.stringify(a));
        await R.shot(out + '/bowl-' + engine + '-' + lang + '-' + W + '.png');
        const GOOD = { de: 'Insulinfreundlich', en: 'Insulin-friendly', es: 'Apto para la insulina' }[lang];
        ok('bowl answer is ' + GOOD, a && a.ans === GOOD && !/mr-high|mr-mid/.test(a.cls), a && a.ans);
        ok('why line gives net carbs with their sum (carbs minus fibre)', a && /14 g/.test(a.why) && /27 g/.test(a.why) && /13 g/.test(a.why), a && a.why);
        ok('separate energy line names the almonds and their calories', a && /35 /.test(a.energy) && /200 kcal/.test(a.energy) && /30 g/.test(a.energy), a && a.energy);
        ok('why line has no nut energy reason', a && !/Energie|energy|energía/i.test(a.why));
        ok('no word broken in the answer, nothing wider than the screen', a && !a.broken.length && !a.wide.length && !a.sx, a && { broken: a.broken, wide: a.wide, font: a.font });
        reply = SWEET;
        await openPhoto();
        const b = await read();
        console.log('  sweet', JSON.stringify(b));
        await R.shot(out + '/sweet-' + engine + '-' + lang + '-' + W + '.png');
        const BAD = { de: 'Nicht insulinfreundlich', en: 'Not insulin-friendly', es: 'No apto para la insulina' }[lang];
        ok('sugary meal still reads ' + BAD, b && b.ans === BAD, b && b.ans);
        ok('sugary meal: no energy line', b && !b.energy);
        ok('sugary meal: answer keeps whole words, nothing wider than the screen', b && !b.broken.length && !b.wide.length && !b.sx, b && { broken: b.broken, wide: b.wide, font: b.font });
    } catch (e) { ok('run finished', false, String(e && e.message || e).slice(0, 300)); }
    ok('no page errors', !errs.length, errs.slice(0, 3));
    await R.close();
    const bad = res.filter(r => !r.pass).length;
    console.log(bad ? bad + ' FAILED' : 'ALL PASS');
    process.exit(bad ? 1 : 0);
})();
