'use strict';
/* Snap food photo AI probe (task snap-food-ai, Oct 19 2026). Scan > Snap food > pick a photo > the sheet must show what the AI sees
   (mocked food-photo function) and Log as meal must save its macros. Scenario off: no function -> plain form + note, still logs.
   usage: node probe-foodai.cjs <view> <url|dir> <on|off> */
const L = require('./lib.cjs'), zlib = require('zlib');
function png(w, h) {
    const crc = (b) => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } c = 0xffffffff; for (const x of b) c = t[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
    const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
    const raw = Buffer.alloc((w * 3 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = 200; raw[o + 1] = 120 + (x % 60); raw[o + 2] = 40; } }
    const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
(async () => {
    const view = process.argv[2] || 'iphone13', target = process.argv[3] || 'https://therealetm.github.io/lowispike/', sc = process.argv[4] || 'on';
    let srv = null, url = target;
    if (!/^https?:/.test(target)) { srv = await L.serve(target); url = 'http://127.0.0.1:' + srv.address().port + '/'; }
    const h = await L.open({ view, url, settle: 7000 });
    const { page, ctx } = h; const calls = [];
    if (sc === 'on') await ctx.route('**/functions/v1/food-photo', r => {
        const q = r.request(); calls.push({ m: q.method(), auth: q.headers()['authorization'] || '', len: (q.postData() || '').length });
        if (q.method() === 'OPTIONS') return r.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' }, body: 'ok' });
        const H = { 'access-control-allow-origin': '*', 'content-type': 'application/json' };
        if (q.method() === 'GET') return r.fulfill({ status: 200, headers: H, body: JSON.stringify({ ok: true, configured: true }) });
        return r.fulfill({ status: 200, headers: H, body: JSON.stringify({ is_food: true, confidence: 'medium', note: '', model: 'mock', dishes: [
            { name: 'Grilled chicken', portion: '1 breast', grams: 150, kcal: 248, protein_g: 46, carbs_g: 0, sugar_g: 0, fiber_g: 0, fat_g: 5.4 },
            { name: 'Brown rice', portion: '1 cup', grams: 195, kcal: 216, protein_g: 5, carbs_g: 45, sugar_g: 0.7, fiber_g: 3.5, fat_g: 1.8 },
            { name: 'Broccoli', portion: '1 cup', grams: 90, kcal: 31, protein_g: 2.5, carbs_g: 6, sugar_g: 1.5, fiber_g: 2.4, fat_g: 0.3 }] }) });
    });
    if (sc === 'real') { await ctx.route(/\.supabase\.co\//, r => { const q = r.request(); calls.push({ m: q.method(), auth: q.headers()['authorization'] || '', len: (q.postData() || '').length, u: new URL(q.url()).pathname }); return r.continue(); }); page.on('response', async r => { if (/food-photo|auth\/v1/.test(r.url())) { let t = ''; try { t = (await r.text()).slice(0, 400); } catch (e) { } calls.push({ m: 'RES ' + r.request().method() + ' ' + r.status() + ' ' + t, u: new URL(r.url()).pathname }); } }); if (process.env.REAL_SESSION) { const sess = require('fs').readFileSync(process.env.REAL_SESSION, 'utf8'); await ctx.addInitScript((j) => { try { localStorage.setItem('lowi.auth', j); } catch (e) { } }, sess); } await page.reload(); await L.sleep(8000); }
    const out = { view, sc };
    await page.evaluate(() => window.LowiSpirit && window.LowiSpirit.photo && window.LowiSpirit.photo()).catch(e => { out.photoErr = e.message; });
    await L.sleep(2500);
    const input = await page.$('.sp-file-in');
    out.hasFileInput = !!input;
    if (input) await input.setInputFiles(sc === 'real' ? { name: 'plate.jpg', mimeType: 'image/jpeg', buffer: require('fs').readFileSync('/tmp/food.jpg') } : { name: 'plate.png', mimeType: 'image/png', buffer: png(320, 240) });
    await page.waitForSelector('.sp-ai.fai-done, .sp-ai.fai-off, .sp-ai.fai-err, .sp-ai.fai-none', { timeout: 30000 }).catch(() => { out.waitTimeout = true; });
    await L.sleep(500);
    Object.assign(out, await page.evaluate(() => {
        const box = document.querySelector('.sp-ai'), f = document.querySelector('form#spMeal.sp-photo-form');
        const r = f && f.getBoundingClientRect(), b = box && box.getBoundingClientRect();
        return { state: box && box.className, msg: box && (box.querySelector('.fai-msg') || {}).textContent, dishes: box ? box.querySelectorAll('.fai-dish:not(.fai-total)').length : -1, total: box && (box.querySelector('.fai-total') || {}).textContent,
            title: f && f.querySelector('[name="title"]').value, hidden: f ? Object.fromEntries([...f.querySelectorAll('input[type="hidden"]')].map(i => [i.name, i.value])) : null,
            boxW: b && Math.round(b.width), vw: innerWidth, formVisible: !!(r && r.width) };
    }));
    if (process.env.SHOT) { await L.sleep(1500); out.boxW2 = await page.evaluate(() => Math.round(document.querySelector('.sp-ai').getBoundingClientRect().width)); await page.screenshot({ path: process.env.SHOT }); }
    if (sc === 'on' && out.dishes === 3) {
        const x = await L.center(h, '.fai-dish[data-i="2"] .fai-x');
        if (x) await L.tap(h, x.x, x.y);
        await L.sleep(400);
        Object.assign(out, await page.evaluate(() => { const f = document.querySelector('form#spMeal.sp-photo-form'); return { afterRemove: { dishes: document.querySelectorAll('.sp-ai .fai-dish:not(.fai-total)').length, title: f.querySelector('[name="title"]').value, kcal: f.querySelector('input[type="hidden"][name="kcal"]').value } }; }));
    }
    if (sc === 'off') await page.fill('form#spMeal.sp-photo-form [name="title"]', 'Porridge with berries');
    const sub = await L.center(h, 'form#spMeal.sp-photo-form button[type="submit"]');
    if (sub) { await page.evaluate(() => { const b = document.querySelector('form#spMeal.sp-photo-form button[type="submit"]'); b.scrollIntoView({ block: 'center' }); }); await L.sleep(300); const s2 = await L.center(h, 'form#spMeal.sp-photo-form button[type="submit"]'); out.atSubmit = await page.evaluate((p) => { const e = document.elementFromPoint(p.x, p.y); return e ? e.tagName + '.' + e.className + ' #' + e.id + ' ' + (e.textContent || '').trim().slice(0, 40) : null; }, s2); out.gate = await page.evaluate(() => document.documentElement.className); await L.tap(h, s2.x, s2.y); }
    await L.sleep(1500);
    out.saved = await page.evaluate((want) => { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i), v = localStorage.getItem(k) || ''; if (v.includes(want)) { try { const find = (o) => { if (!o || typeof o !== 'object') return null; if (o.t === want && o.macros) return o; for (const x of Object.values(o)) { const r = find(x); if (r) return r; } return null; }; const m = find(JSON.parse(v)); if (m) return { key: k, t: m.t, macros: m.macros, via: m.via }; } catch (e) { } } } return null; }, sc === 'on' ? 'Grilled chicken and Brown rice' : sc === 'real' ? out.title : 'Porridge with berries');
    if (sc === 'real') out.lsHits = await page.evaluate((w) => { const r = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i), v = localStorage.getItem(k) || ''; const j = v.indexOf(w); if (j >= 0) r.push(k + ': ' + v.slice(Math.max(0, j - 200), j + 300)); } return r; }, 'Spaghetti'); if (sc === 'real') { out.sheetOpen = await page.evaluate(() => !!document.querySelector('form#spMeal.sp-photo-form')); await page.screenshot({ path: '/tmp/foodai-after.png' }); }
    out.calls = calls.map(c => (c.u || '') + ' ' + c.m + (c.auth ? ' auth' : '') + (c.len ? ' ' + c.len + 'B' : ''));
    const s = await L.snap(h);
    out.err = s.err; out.rej = s.rej; out.pageerror = h.log.pageerror;
    const bad = [];
    if (!out.hasFileInput) bad.push('no file input');
    if (sc === 'on') {
        if (!/fai-done/.test(out.state || '')) bad.push('state=' + out.state);
        if (out.dishes !== 3) bad.push('dishes=' + out.dishes);
        if (out.title !== 'Grilled chicken, Brown rice and Broccoli') bad.push('title=' + out.title);
        if (!out.afterRemove || out.afterRemove.dishes !== 2 || out.afterRemove.title !== 'Grilled chicken and Brown rice' || out.afterRemove.kcal !== '464') bad.push('afterRemove=' + JSON.stringify(out.afterRemove));
        if (!out.saved || out.saved.macros.kcal !== 464 || out.saved.macros.protein !== 51 || out.saved.macros.fiber !== 3.5) bad.push('saved=' + JSON.stringify(out.saved));
        if (out.boxW > out.vw) bad.push('box wider than screen');
    } else if (sc === 'real') {
        if (!/fai-done/.test(out.state || '')) bad.push('state=' + out.state);
        if (!(out.dishes >= 1)) bad.push('dishes=' + out.dishes);
        if (!out.saved || !(out.saved.macros && out.saved.macros.kcal > 0)) bad.push('saved=' + JSON.stringify(out.saved));
        if (out.boxW > out.vw) bad.push('box wider than screen');
    } else {
        if (!/fai-off/.test(out.state || '')) bad.push('state=' + out.state);
        if (!out.saved) bad.push('typed meal not saved');
    }
    if ((out.err || []).length || (out.rej || []).length || out.pageerror.length) bad.push('errors');
    console.log(JSON.stringify(out));
    console.log(bad.length ? 'FAIL ' + bad.join(' ; ') : 'PASS');
    await h.browser.close(); if (srv) srv.close();
    process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
