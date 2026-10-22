'use strict';
/* Photo check (Oct 22 2026): the user's normal iPhone plate photo got "The photo check took too long". This opens Log a meal >
   photo with a stand-in food-photo endpoint (the real one is never called) and checks, per device and theme:
   ok      - one answer after DELAY ms: "Misty is looking…" shows, the photo sent is a JPEG <= 1024 px, time from photo to result.
   retry   - the first try answers 504 ai_slow: the sheet retries once on its own and shows the result.
   button  - both tries fail: a Try again button shows; tapping it uses the same photo (no new photo) and shows the result.
   Also reads the Log as meal button colour (must be the brand blue, not green/teal).
   Run: node tools/design-audit/photo-check.cjs  (Playwright from /tmp/pw, WebKit/Chromium in a VM, not a real phone). */
const fs = require('fs'), path = require('path');
const { launch, openApp, sleep } = require('../interface-audit/lib.cjs');
const FIX = process.env.PC_PHOTO || '/home/sprite/photo-check-plate.jpg';
const OUT = process.env.PC_OUT || '/home/sprite/photo-check-shots';
const DELAY = +(process.env.PC_DELAY || 1500);
const FAKE = 'https://therealetm.github.io/__food_photo_fixture';
const DISHES = [
    { name: 'Roasted sweet potato', portion: '1 medium', grams: 180, kcal: 160, protein: 3, carbs: 37, sugar: 8, fiber: 6, fat: 0.3 },
    { name: 'Vegetable fried rice', portion: '1 cup', grams: 200, kcal: 330, protein: 7, carbs: 52, sugar: 3, fiber: 3, fat: 10 },
    { name: 'Creamy curry sauce', portion: '3 tbsp', grams: 50, kcal: 90, protein: 1, carbs: 5, sugar: 2, fiber: 1, fat: 7 }
];
const ALL = [['iphone-se', 'iPhone SE', 'webkit'], ['iphone-13', 'iPhone 13', 'webkit'], ['iphone-15', 'iPhone 15', 'webkit'], ['pixel-7', 'Pixel 7', 'chromium']];
const DEVICES = process.env.PC_DEVICES ? ALL.filter(d => process.env.PC_DEVICES.split(',').includes(d[0])) : ALL;
function jpegSize(buf) { // width/height from the JPEG SOF marker
    let i = 2;
    while (i < buf.length) {
        if (buf[i] !== 0xFF) return null;
        const m = buf[i + 1], len = buf.readUInt16BE(i + 2);
        if (m >= 0xC0 && m <= 0xC3) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
        i += 2 + len;
    }
    return null;
}
async function snapTo(page, name) { fs.mkdirSync(OUT, { recursive: true }); const f = path.join(OUT, name + '.png'); await page.screenshot({ path: f }); return f; }

async function scenario(dev, engine, key, mode, theme) {
    const h = await launch({ device: dev, engine });
    const posts = [];
    await h.ctx.route(FAKE + '**', async r => {
        const m = r.request().method();
        if (m !== 'POST') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, configured: true, left: 3, limit: 3 }) });
        let body = {}; try { body = JSON.parse(r.request().postData() || '{}'); } catch (e) { }
        const buf = Buffer.from(body.image || '', 'base64');
        posts.push({ at: Date.now(), mime: body.mime, kb: Math.round(buf.length / 1024), size: jpegSize(buf) });
        const n = posts.length;
        await sleep(DELAY);
        if ((mode === 'retry' && n === 1) || (mode === 'button' && n <= 2)) return r.fulfill({ status: n === 1 ? 504 : 502, contentType: 'application/json', body: JSON.stringify({ error: n === 1 ? 'ai_slow' : 'ai_failed', left: 3, limit: 3 }) });
        return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ dishes: DISHES, confidence: 'high', left: 2, limit: 3, model: 'fixture' }) });
    });
    const R = { mode, theme, errors: h.errors };
    try {
        await openApp(h);
        await h.page.evaluate(([u, t]) => {
            window.LOWI_FOOD_AI_URL = u;
            const R2 = window.LowiR2; if (R2 && R2.applyTheme) R2.applyTheme(t); document.documentElement.setAttribute('data-theme', t);
            const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.className = 'sp-file-in'; i.id = '__pcIn'; i.style.cssText = 'position:fixed;left:-99px;top:0;width:1px;height:1px'; document.body.append(i);
        }, [FAKE, theme]);
        await sleep(400);
        const t0 = Date.now();
        await h.page.setInputFiles('#__pcIn', FIX);
        R.waitText = await h.page.waitForSelector('.fai-wait .fai-wt', { timeout: 15000 }).then(e => e.textContent(), () => '');
        R.shots = [await snapTo(h.page, key + '-' + theme + '-' + mode + '-1-wait')];
        if (mode === 'retry') R.againText = await h.page.waitForFunction(() => { const w = document.querySelector('.fai-wait .fai-wt'); return w && /another|noch einmal|otra vez/.test(w.textContent) && w.textContent; }, null, { timeout: 15000 }).then(x => x.jsonValue(), () => '');
        if (mode === 'button') {
            await h.page.waitForSelector('[data-fai-retry]', { timeout: 20000 });
            R.errText = await h.page.$eval('.fai-can-retry .fai-msg', e => e.textContent);
            R.retryBtn = await h.page.$eval('[data-fai-retry]', e => { const b = e.getBoundingClientRect(); return { t: e.textContent, w: Math.round(b.width), h: Math.round(b.height) }; });
            R.shots.push(await snapTo(h.page, key + '-' + theme + '-' + mode + '-2-try-again'));
            R.postsBeforeTap = posts.length;
            await h.page.click('[data-fai-retry]');
        }
        await h.page.waitForSelector('.mr-verdict, .fai-done', { timeout: 30000 });
        R.ms = Date.now() - t0;
        await sleep(600);
        R.shots.push(await snapTo(h.page, key + '-' + theme + '-' + mode + '-3-result'));
        R.button = await h.page.evaluate(() => {
            const b = document.querySelector('#spMeal .sp-primary');
            if (!b) return null;
            b.scrollIntoView({ block: 'center' });
            const s = getComputedStyle(b);
            return { text: b.textContent.trim(), bg: s.backgroundImage !== 'none' ? s.backgroundImage : s.backgroundColor, color: s.color };
        });
        await sleep(300);
        R.shots.push(await snapTo(h.page, key + '-' + theme + '-' + mode + '-4-log-button'));
        R.posts = posts.map(p => ({ mime: p.mime, kb: p.kb, size: p.size }));
        R.overflow = await h.page.evaluate(() => [...document.querySelectorAll('.r2-ov *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1 && getComputedStyle(e).position !== 'fixed').map(e => e.className).slice(0, 4));
    } catch (e) { R.fail = String(e && e.message || e).slice(0, 300); R.posts = posts.length; try { R.shots = (R.shots || []).concat(await snapTo(h.page, key + '-' + theme + '-' + mode + '-fail')); } catch (x) { } }
    await h.browser.close();
    return R;
}

(async () => {
    const report = { when: new Date().toISOString(), delay: DELAY, devices: {} };
    const modes = (process.env.PC_MODES || 'ok,retry,button').split(',');
    for (const [key, dev, engine] of DEVICES) {
        report.devices[key] = [];
        for (const theme of ['dark', 'light']) for (const mode of modes) {
            if (theme === 'light' && mode !== 'ok') continue; // the error paths are the same markup in both themes
            report.devices[key].push(await scenario(dev, engine, key, mode, theme));
        }
    }
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
    console.log(JSON.stringify(report, null, 1));
})();
