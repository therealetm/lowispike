'use strict';
/* Oct 25 (Maya 10) browser check for "Scanner: one verdict" on the PHOTO result screen (Log a meal > photo).
   A stand-in food-photo endpoint answers (the real one is never called; every other host and every write is blocked).
   Cases: bowl (chocolate quark mix, cottage cheese, almonds, goji) -> one red answer "Skip it" + reason + ~g carbs, no "steady",
          plate (chicken breast, broccoli) -> "Lower impact" (never "No spike"), smoothie -> its own reason, not "sweet drink".
   Run: node tools/scan-kitchen/photo-verdict.cjs [lang] [engine] [device] [outdir]   (IA_ROOT=<worktree> to serve a worktree) */
const fs = require('fs'), path = require('path');
const { launch, openApp, sleep } = require('../interface-audit/lib.cjs');
const lang = process.argv[2] || 'en', engine = process.argv[3] || 'webkit', device = process.argv[4] || 'iPhone 13', OUT = process.argv[5] || '/tmp/photo-verdict';
const FAKE = 'https://therealetm.github.io/__food_photo_fixture';
const JPG = process.env.PV_PHOTO || '/tmp/photo-verdict-plate.jpg';
const d = (name, grams, kcal, protein, carbs, sugar, fiber, fat) => ({ name, portion: grams + ' g', grams, kcal, protein, carbs, sugar, fiber, fat });
const CASES = {
    bowl: [d('chocolate quark mixture', 150, 200, 15, 22, 18, 1, 6), d('cottage cheese', 100, 98, 11, 3, 3, 0, 4), d('almonds', 20, 116, 4, 2, 1, 2, 10), d('goji berries', 15, 52, 2, 11, 7, 2, 0)],
    plate: [d('chicken breast', 150, 248, 46, 0, 0, 0, 5), d('broccoli', 120, 41, 3, 8, 2, 3, 0)],
    smoothie: [d('fruit smoothie', 300, 160, 2, 38, 30, 3, 1)]
};
const STEADY = /no spike|kein spike|sin pico|steady|ruhig bleiben|bleibt stabil|estable|How sure|Wie sicher|Seguridad/i;
(async () => {
    fs.mkdirSync(OUT, { recursive: true });
    const report = { lang, engine, device, cases: {}, finds: [] };
    for (const [key, dishes] of Object.entries(CASES)) {
        const h = await launch({ device, engine, lang, locale: { en: 'en-US', de: 'de-DE', es: 'es-ES' }[lang], kv: { 'lowispike.lang': lang, 'lowi.lang': lang } });
        await h.ctx.route(FAKE + '**', async r => {
            if (r.request().method() !== 'POST') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, configured: true, left: 3, limit: 3 }) });
            await sleep(400);
            return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ dishes, confidence: 'high', left: 2, limit: 3, model: 'fixture' }) });
        });
        const R = { errors: h.errors };
        try {
            await openApp(h);
            await h.page.evaluate(u => {
                window.LOWI_FOOD_AI_URL = u;
                const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.className = 'sp-file-in'; i.id = '__pvIn'; i.style.cssText = 'position:fixed;left:-99px;top:0;width:1px;height:1px'; document.body.append(i);
            }, FAKE);
            await sleep(400);
            await h.page.setInputFiles('#__pvIn', JPG);
            await h.page.waitForSelector('.mr-verdict', { timeout: 30000 });
            await sleep(800);
            Object.assign(R, await h.page.evaluate(() => {
                const v = document.querySelector('.mr-verdict'), q = s => (v.querySelector(s) || {}).textContent || '';
                const sheet = v.closest('.r2-ov, .sheet') || document.body;
                return { cls: v.className, ans: q('.mr-ans').trim(), why: q('.mr-why').trim(), sheet: (sheet.innerText || '').replace(/\s+/g, ' ').slice(0, 700),
                    over: [...sheet.querySelectorAll('*')].filter(e => e.getBoundingClientRect().right > innerWidth + 1 && getComputedStyle(e).position !== 'fixed').map(e => String(e.className)).slice(0, 4) };
            }));
            R.shot = path.join(OUT, [engine, device.replace(/\W/g, ''), lang, key].join('-') + '.png');
            await h.page.screenshot({ path: R.shot });
        } catch (e) { R.fail = String(e && e.message || e).slice(0, 300); }
        await h.browser.close();
        const want = { bowl: 'high', plate: 'low', smoothie: null }[key];
        if (R.fail) report.finds.push(key + ': ' + R.fail);
        else {
            if (want && !R.cls.includes('mr-' + want)) report.finds.push(key + ': verdict ' + R.cls + ' wanted mr-' + want);
            if (STEADY.test(R.ans + ' ' + R.why + ' ' + R.sheet)) report.finds.push(key + ': steady / no-spike / how-sure wording on screen');
            if (key === 'bowl' && !/\d+ g/.test(R.why)) report.finds.push('bowl: no ~g carbs in the reason');
            if (key === 'smoothie' && /soda|refresco|Limo|sweet drink|süßes Getränk|bebida dulce/i.test(R.why)) report.finds.push('smoothie: called a sweet drink like soda');
            if (R.over.length) report.finds.push(key + ': wider than the screen ' + R.over.join(','));
            if (R.errors.length) report.finds.push(key + ': page errors ' + R.errors.join(' | '));
        }
        report.cases[key] = R;
        console.log('CASE', lang, engine, key, R.fail ? 'FAIL ' + R.fail : `${R.cls} | ${R.ans} | ${R.why}`);
    }
    fs.writeFileSync(path.join(OUT, [engine, device.replace(/\W/g, ''), lang].join('-') + '.json'), JSON.stringify(report, null, 1));
    console.log('FINDS', report.finds.length ? report.finds.join(' || ') : 'none');
})();
