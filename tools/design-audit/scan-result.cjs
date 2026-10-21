'use strict';
/* Photo scanner result check (Oct 21 2026): opens the photo result screen with a stand-in food-photo answer (the real
   endpoint is never called), fixes "Garlic cloves" to 3 Bel Paese, adds a cola, logs the meal, and screenshots each step at
   iPhone SE, iPhone 13 and iPad widths. Measures: the verdict is the first and biggest block, nothing spills sideways,
   tap targets >= 44 px, edits never send the photo again, and the XP the screen promised is the XP the log gave.
   Run: node tools/design-audit/scan-result.cjs  (Playwright from /tmp/pw, WebKit in a VM, not a real phone). */
const fs = require('fs'), path = require('path');
const { launch, openApp, sleep, shot } = require('../interface-audit/lib.cjs');
const FIX = process.env.SR_PHOTO || '/home/sprite/scan-result-fixture.jpg';
const OUT = process.env.SR_OUT || '/home/sprite/scan-result-shots';
const FAKE = 'https://therealetm.github.io/__food_photo_fixture';
const DISHES = [
    { name: 'Cooked meat pieces', portion: '~150 g', grams: 150, kcal: 350, protein: 38, carbs: 0, sugar: 0, fiber: 0, fat: 21 },
    { name: 'Red bell peppers', portion: '2 halves', grams: 160, kcal: 50, protein: 1.6, carbs: 9.6, sugar: 6.4, fiber: 3.4, fat: 0.5 },
    { name: 'Garlic cloves', portion: '3 cloves', grams: 15, kcal: 22, protein: 1, carbs: 5, sugar: 0.2, fiber: 0.3, fat: 0.1 }
];
const DEVICES = [['iphone-se', 'iPhone SE'], ['iphone-13', 'iPhone 13'], ['ipad', 'iPad (gen 7)']];

async function snapTo(page, name) { fs.mkdirSync(OUT, { recursive: true }); const f = path.join(OUT, name + '.png'); await page.screenshot({ path: f }); return f; }
async function scrollTo(page, sel) { await page.evaluate(s => { const e = document.querySelector(s); if (e) e.scrollIntoView({ block: 'center' }); }, sel); await sleep(400); }
async function measure(page) {
    return page.evaluate(() => {
        const q = s => document.querySelector(s), r = e => e ? e.getBoundingClientRect() : null;
        const v = q('.mr-verdict'), sheet = v && v.closest('.r2-ov');
        const vis = e => { const s = getComputedStyle(e), b = e.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && b.width > 1 && b.height > 1; };
        const blocks = sheet ? [...sheet.querySelectorAll('.mr-verdict, .mr-sec, .mr-xp, .sp-photo-form, .sp-photo-prev, .ms-host, .sp-photo-acts')].filter(vis).map(e => ({ c: e.className.split(' ')[0], top: Math.round(r(e).top) })) : [];
        const fonts = sheet ? [...sheet.querySelectorAll('*')].filter(e => vis(e) && e.childNodes.length && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())).map(e => ({ t: e.textContent.trim().slice(0, 30), px: parseFloat(getComputedStyle(e).fontSize) })).sort((a, b) => b.px - a.px).slice(0, 3) : [];
        const small = sheet ? [...sheet.querySelectorAll('.mr button, .mr input, .sp-photo-form button')].filter(vis).map(e => ({ t: (e.getAttribute('aria-label') || e.textContent || e.placeholder || '').trim().slice(0, 30), w: Math.round(r(e).width), h: Math.round(r(e).height) })).filter(b => b.w < 44 || b.h < 44) : [];
        const wide = sheet ? [...sheet.querySelectorAll('.mr *')].filter(e => vis(e) && r(e).right > innerWidth + 1).map(e => e.className || e.tagName).slice(0, 5) : [];
        const form = q('#spMeal') || q('.sp-photo-form');
        const val = n => { const i = form && form.querySelector('[name="' + n + '"]'); return i ? i.value : null; };
        return {
            vw: innerWidth, vh: innerHeight, above: sheet ? [...sheet.querySelectorAll('*')].filter(e => vis(e) && v && r(e).bottom <= r(v).top + 1 && r(e).top > -2000 && e.children.length === 0 && (e.textContent || '').trim()).map(e => Math.round(r(e).top) + ':' + e.tagName + ':' + e.textContent.trim().slice(0, 30)).slice(-6) : [], sheetTop: sheet ? Math.round(r(sheet).top) : null, verdict: v ? v.querySelector('.mr-ans').textContent.trim() : null, why: v ? v.querySelector('.mr-why').textContent.trim() : null,
            verdictTop: v ? Math.round(r(v).top) : null, verdictH: v ? Math.round(r(v).height) : null, blocks, fonts, small, wide,
            items: [...document.querySelectorAll('.mr-item')].map(li => li.textContent.replace(/\s+/g, ' ').trim().slice(0, 90)),
            xp: (q('.mr-xp') || {}).textContent || '', lvl: val('lvl'), kcal: val('kcal'), title: val('title'), titleShown: !!(form && form.querySelector('label') && vis(form.querySelector('label')))
        };
    });
}

(async () => {
    const report = { when: new Date().toISOString(), devices: {} };
    for (const [key, dev] of DEVICES) {
        const h = await launch({ device: dev });
        let posts = 0;
        await h.ctx.route(FAKE + '**', r => {
            const m = r.request().method();
            if (m === 'POST') posts++;
            const body = m === 'POST' ? { dishes: DISHES, confidence: 'high', left: 2, limit: 3, model: 'fixture' } : { ok: true, configured: true, left: 3, limit: 3 };
            return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
        });
        const R = { errors: h.errors };
        try {
            await openApp(h);
            await h.page.evaluate(u => { window.LOWI_FOOD_AI_URL = u; const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.className = 'sp-file-in'; i.id = '__srIn'; i.style.cssText = 'position:fixed;left:-99px;top:0;width:1px;height:1px'; document.body.append(i); }, FAKE);
            const xp0 = await h.page.evaluate(() => JSON.parse(localStorage.getItem('lowispike.v2') || '{}').xp || 0);
            await h.page.setInputFiles('#__srIn', FIX);
            await h.page.waitForSelector('.mr-verdict', { timeout: 30000 });
            await sleep(1500);
            R.result = await measure(h.page);
            R.shots = [await snapTo(h.page, key + '-1-result')];
            await scrollTo(h.page, '.sp-photo-form button[type="submit"], .sp-photo-form .sp-submit, #spMeal button');
            R.shots.push(await snapTo(h.page, key + '-2-below'));
            // fix the garlic: really 3 Bel Paese
            await scrollTo(h.page, '[data-mr-edit="f2"]');
            await h.page.click('[data-mr-edit="f2"]');
            await h.page.fill('[data-mr="f2"] [data-mr-name]', 'Bel Paese');
            await h.page.fill('[data-mr="f2"] [data-mr-count]', '3');
            await sleep(300);
            R.shots.push(await snapTo(h.page, key + '-3-editing'));
            await h.page.click('[data-mr-save="f2"]');
            await sleep(500);
            R.afterEdit = await measure(h.page);
            await scrollTo(h.page, '.mr-verdict');
            R.shots.push(await snapTo(h.page, key + '-4-after-edit'));
            // add a cola
            await scrollTo(h.page, '[data-mr-add]');
            await h.page.click('[data-mr-add]');
            await sleep(300);
            R.shots.push(await snapTo(h.page, key + '-5-add-drink'));
            await h.page.click('[data-mr-chip="Cola"]');
            await sleep(500);
            R.afterDrink = await measure(h.page);
            await scrollTo(h.page, '.mr-verdict');
            R.shots.push(await snapTo(h.page, key + '-6-with-cola'));
            await scrollTo(h.page, '.mr-xp');
            R.shots.push(await snapTo(h.page, key + '-7-xp'));
            // remove the cola again, then log it: the log must keep the verdict and give the XP the screen showed
            await h.page.click('[data-mr-rm="d0"]');
            await sleep(400);
            R.beforeLog = await measure(h.page);
            R.postsBeforeLog = posts;
            await h.page.evaluate(() => { const f = document.querySelector('.sp-photo-form'); const b = f && f.querySelector('button[type="submit"], button:not([type])'); if (b) b.click(); else if (f) f.requestSubmit(); });
            await sleep(2500);
            R.logged = await h.page.evaluate(x0 => { const s = JSON.parse(localStorage.getItem('lowispike.v2') || '{}'); const L = (s.logs || []).filter(l => l.type === 'meal' || l.t); const last = L[L.length - 1] || null; return { xpGained: (s.xp || 0) - x0, last: last && { t: last.t, lvl: last.lvl, kcal: last.kcal, xp: last.xp, r: last.r } }; }, xp0);
            R.posts = posts;
        } catch (e) { R.fail = String(e && e.message || e).slice(0, 400); try { R.shots = (R.shots || []).concat(await snapTo(h.page, key + '-fail')); } catch (x) { } }
        report.devices[key] = R;
        await h.browser.close();
    }
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
    console.log(JSON.stringify(report, null, 1));
})();
