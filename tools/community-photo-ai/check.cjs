/* Community food photo proof (task 14eeb544, Oct 25 2026): in a real browser, a photo picked in the Community Chat composer is read
   by the meal-photo AI with no typing; the composer shows "Misty is reading your meal…" then the meal name and spike label; Send
   posts a meal post (meal-<id>.jpg, 🍽 body) with messages.meal (foods + numbers), and its spike label opens the details sheet.
   A photo with no food goes as a plain 📷 photo. When the daily photo checks are used up, the photo still goes, plain, and the
   composer says why; the next photo spends no AI call at all.
   node tools/community-photo-ai/check.cjs [outDir] [url] [cases]
   The AI function and Supabase are faked (regress harness + a route on the page): nothing is written anywhere, no real quota. */
'use strict';
const fs = require('fs'), path = require('path');
const H = require('../regress/harness.cjs'), N = require('../regress/nav.cjs');
const CMS = require('../../community-photo-meal.js');
const OUT = path.resolve(process.argv[2] || '/tmp/community-photo-ai'); fs.mkdirSync(OUT, { recursive: true });
const URL_ = process.argv[3] || '';
const ALL = {
    'chromium-13-en': { engine: 'chromium', viewport: { width: 390, height: 844 }, lang: 'en' },
    'chromium-13-de': { engine: 'chromium', viewport: { width: 390, height: 844 }, lang: 'de' },
    'webkit-13-de': { engine: 'webkit', device: 'iPhone 13', viewport: { width: 390, height: 844 }, lang: 'de' },
    'webkit-13-es': { engine: 'webkit', device: 'iPhone 13', viewport: { width: 390, height: 844 }, lang: 'es' }
};
const CASES = (process.argv[4] || 'chromium-13-en,webkit-13-de,webkit-13-es').split(',').filter(k => ALL[k]);
const slow = 25000;
const FOOD = { is_food: true, confidence: 'high', note: 'Plenty of protein and fat.', model: 'fake', dishes: [
    { name: 'Salmon', portion: '150 g', grams: 150, kcal: 310, protein_g: 31, carbs_g: 0, sugar_g: 0, fiber_g: 0, fat_g: 20 },
    { name: 'Avocado', portion: '1/2', grams: 70, kcal: 112, protein_g: 1.4, carbs_g: 6, sugar_g: 0.5, fiber_g: 4.7, fat_g: 10 },
    { name: 'Cucumber', portion: '80 g', grams: 80, kcal: 12, protein_g: 0.5, carbs_g: 2.9, sugar_g: 1.3, fiber_g: 0.4, fat_g: 0.1 }] };
const photo = i => path.join(__dirname, '..', 'regress', 'fixtures', 'photo' + i + '.jpg');

function lum(c) { const m = String(c).match(/[\d.]+/g); if (!m) return null; const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return { L: .2126 * f(+m[0]) + .7152 * f(+m[1]) + .0722 * f(+m[2]), a: m[3] == null ? 1 : +m[3] }; }

async function one(key) {
    const C = ALL[key], l = C.lang, res = { key, ok: true, checks: [] };
    const ok = (name, pass, info) => { res.checks.push({ name, pass: !!pass, info }); if (!pass) res.ok = false; };
    const R = await H.open(Object.assign({ probe: false, url: URL_, messages: 40, members: 12 }, C));
    const p = R.page, sim = R.sim;
    const ai = { mode: 'food', posts: 0, gets: 0, langs: [], delay: 1800 };
    try {
        await p.route(/\/functions\/v1\/food-photo/, async route => {
            const req = route.request();
            if (req.method() === 'GET') { ai.gets++; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, configured: true, name: true, left: 3, limit: 3 }) }); }
            ai.posts++;
            try { ai.langs.push(JSON.parse(req.postData() || '{}').lang); } catch (e) {}
            await new Promise(r => setTimeout(r, ai.delay));
            if (ai.mode === 'limit') return route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: 'limit', left: 0, limit: 3 }) });
            const body = ai.mode === 'food' ? Object.assign({ left: 2, limit: 3 }, FOOD) : { is_food: false, dishes: [], left: 1, limit: 3 };
            return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
        });
        await R.ctx.addInitScript((lg) => { try { localStorage.setItem('lowispike.lang', lg); } catch (e) { } }, l);
        await R.goto();
        await N.openCommunity(R, (s) => res.checks.push({ name: 'nav', pass: true, info: s }));
        if (!(await p.evaluate(() => !!document.querySelector('#cgThread[data-open]')))) await p.locator('#cmPaneChat .rm-tab[data-rm="chat"]').first().click({ force: true, timeout: 8000 });
        await p.waitForFunction(() => !!document.querySelector('#cgThread[data-open]') && document.querySelectorAll('#cmList [id^="cm-"]').length > 0, null, { timeout: slow });
        ok('module loaded on the page', await p.evaluate(() => !!(window.LowiChatMeal && window.LowiChatMeal.start)));

        // 1) a food photo, no typing at all
        const n0 = sim.writes.filter(w => w.m === 'POST' && w.t === 'messages').length;
        await p.setInputFiles('#cmPhotoFile', photo(1));
        const look = await p.waitForFunction(() => { const e = document.querySelector('#csPhoto .cs-ai'); return e && !e.hidden && e.dataset.phase === 'look' ? e.innerText : ''; }, null, { timeout: slow }).then(h => h.jsonValue()).catch(() => '');
        ok('composer says Misty is reading the meal', look.includes(CMS.t('look', l)), look);
        await p.screenshot({ path: path.join(OUT, key + '-1-reading.png') });
        const ready = await p.waitForFunction(() => { const e = document.querySelector('#csPhoto .cs-ai'); return e && e.dataset.phase === 'meal' ? e.innerText : ''; }, null, { timeout: slow }).then(h => h.jsonValue()).catch(() => '');
        ok('composer shows the meal name, spike label and "estimate"', ready.includes('Salmon') && ready.includes(CMS.label('low', l)) && ready.includes(CMS.t('est', l)), ready);
        const fit = await p.evaluate(() => {
            const e = document.querySelector('#csPhoto .cs-ai'); const out = [];
            for (const el of e.querySelectorAll('b,small')) {
                const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
                let bg = null, n = el; while (n && n !== document.documentElement) { const b = getComputedStyle(n).backgroundColor; if (b && !/rgba\(0, 0, 0, 0\)|transparent/.test(b)) { bg = b; break; } n = n.parentElement; }
                out.push({ t: el.innerText, l: r.left, r: r.right, top: r.top, b: r.bottom, vw: innerWidth, vh: innerHeight, color: cs.color, bg, fs: parseFloat(cs.fontSize), sw: el.scrollWidth, cw: el.clientWidth });
            }
            return out;
        });
        ok('composer lines are on screen and not cut off', fit.length === 2 && fit.every(f => f.l >= 0 && f.r <= f.vw + .5 && f.top >= 0 && f.b <= f.vh + .5 && f.sw <= f.cw + 1 && f.fs >= 11), fit);
        const con = fit.map(f => { const a = lum(f.color), b = lum(f.bg || 'rgb(10,20,40)'); if (!a || !b) return 0; const La = a.L * a.a + b.L * (1 - a.a); return (Math.max(La, b.L) + .05) / (Math.min(La, b.L) + .05); });
        ok('composer lines pass WCAG AA against their panel (approx.)', con.every(c => c >= 4.5), { con, fit: fit.map(f => [f.color, f.bg]) });
        await p.screenshot({ path: path.join(OUT, key + '-2-ready.png') });
        await p.locator('#cmSend').click({ timeout: 8000 });
        await p.waitForFunction(n => window.__lowiTest !== undefined || true, n0);
        const t0 = Date.now(); let post = null;
        while (Date.now() - t0 < slow && !post) { post = sim.writes.filter(w => w.m === 'POST' && w.t === 'messages').slice(n0).map(w => Array.isArray(w.body) ? w.body[0] : w.body)[0] || null; if (!post) await p.waitForTimeout(250); }
        ok('Send posts a meal post (🍽, meal-<id>.jpg) with no caption typed', post && /^🍽 \S+\/meal-p[\w-]+\.jpg#l=low&n=Salmon/.test(post.body || ''), post && post.body);
        ok('the post carries messages.meal: foods, numbers, spike', post && post.meal && post.meal.v === 1 && post.meal.lvl === 'low' && (post.meal.items || []).map(x => x.name).join(',') === 'Salmon,Avocado,Cucumber' && post.meal.total && post.meal.total.kcal > 400, post && post.meal);
        ok('the meal photo went to storage under meal-<id>.jpg', sim.writes.some(w => w.p && /\/storage\/v1\/object\/media\/.+\/meal-p[\w-]+\.jpg/.test(w.p)), sim.writes.filter(w => w.p && w.p.includes('storage')).map(w => w.p));
        ok('one AI call for that photo, in the app language', ai.posts === 1 && ai.langs[0] === l, ai);
        const label = p.locator('#cmList .cs-meal-bs').last();
        const seen = await label.waitFor({ state: 'visible', timeout: slow }).then(() => true).catch(() => false);
        ok('own meal post shows its spike label in the chat', seen);
        if (seen) {
            await label.scrollIntoViewIfNeeded().catch(() => {});
            await p.screenshot({ path: path.join(OUT, key + '-3-posted.png') });
            await label.tap({ timeout: 8000 }).catch(() => label.click({ timeout: 8000 }));
            const op = await p.locator('.md-ov.on .md-sheet').waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false);
            const s = op ? await p.locator('.md-ov.on .md-sheet').innerText() : '';
            ok('the label opens the meal details with the foods', op && s.includes('Salmon') && s.includes('Avocado'), s.slice(0, 240));
            if (op) { await p.waitForTimeout(700); await p.screenshot({ path: path.join(OUT, key + '-4-details.png') }); }
            await p.keyboard.press('Escape').catch(() => {});
            await p.evaluate(() => { const x = document.querySelector('.md-ov.on [data-md="close"], .md-ov.on .md-x'); if (x) x.click(); });
            await p.waitForTimeout(600);
        }

        // 2) a photo with no food: plain photo, no extra line
        ai.mode = 'none';
        let n1 = sim.writes.filter(w => w.m === 'POST' && w.t === 'messages').length;
        await p.setInputFiles('#cmPhotoFile', photo(2));
        const nf = await p.waitForFunction(() => { const e = document.querySelector('#csPhoto .cs-ai'); return e && e.dataset.phase.startsWith('plain') ? e.innerText : ''; }, null, { timeout: slow }).then(h => h.jsonValue()).catch(() => '');
        ok('no food: composer says it goes as a normal photo', nf.includes(CMS.t('notFood', l)) && nf.includes(CMS.t('plainBar', l)), nf);
        await p.locator('#cmSend').click({ timeout: 8000 });
        let post2 = null; const t1 = Date.now();
        while (Date.now() - t1 < slow && !post2) { post2 = sim.writes.filter(w => w.m === 'POST' && w.t === 'messages').slice(n1).map(w => Array.isArray(w.body) ? w.body[0] : w.body)[0] || null; if (!post2) await p.waitForTimeout(250); }
        ok('no food: a plain 📷 photo post, no meal details', post2 && /^📷 \S+\/chat-p[\w-]+\.jpg/.test(post2.body || '') && !post2.meal, post2);

        // 3) daily checks used up: the photo still goes, plain, and says why
        ai.mode = 'limit';
        n1 = sim.writes.filter(w => w.m === 'POST' && w.t === 'messages').length;
        await p.setInputFiles('#cmPhotoFile', photo(3));
        const lim = await p.waitForFunction(() => { const e = document.querySelector('#csPhoto .cs-ai'); return e && e.dataset.phase.startsWith('plain') ? e.innerText : ''; }, null, { timeout: slow }).then(h => h.jsonValue()).catch(() => '');
        ok('no checks left: composer says so before sending', lim.includes(CMS.t('limit', l)), lim);
        await p.screenshot({ path: path.join(OUT, key + '-5-limit.png') });
        await p.locator('#cmSend').click({ timeout: 8000 });
        let post3 = null; const t2 = Date.now();
        while (Date.now() - t2 < slow && !post3) { post3 = sim.writes.filter(w => w.m === 'POST' && w.t === 'messages').slice(n1).map(w => Array.isArray(w.body) ? w.body[0] : w.body)[0] || null; if (!post3) await p.waitForTimeout(250); }
        ok('no checks left: the photo is still posted, plain', post3 && /^📷 /.test(post3.body || '') && !post3.meal, post3);
        await p.waitForTimeout(500);
        const note = await p.evaluate(() => (document.getElementById('csNotice') || {}).innerText || '');
        ok('after posting, one line says why it was not read', note.includes(CMS.t('posted', l, { why: CMS.t('limit', l) })), note);
        await p.screenshot({ path: path.join(OUT, key + '-6-limit-posted.png') });
        const before = ai.posts;
        await p.setInputFiles('#cmPhotoFile', photo(4));
        const lim2 = await p.waitForFunction(() => { const e = document.querySelector('#csPhoto .cs-ai'); return e && e.dataset.phase.startsWith('plain') ? e.innerText : ''; }, null, { timeout: slow }).then(h => h.jsonValue()).catch(() => '');
        ok('next photo: no AI call spent once the checks are used up', ai.posts === before && lim2.includes(CMS.t('limit', l)), { posts: ai.posts, before, lim2 });
        await p.evaluate(() => { const x = document.querySelector('#csPhoto [data-chat="photo-clear"]'); if (x) x.click(); });
        ok('no page errors', !(R.errs || []).length, (R.errs || []).slice(0, 3));
    } catch (e) { ok('run', false, String(e && e.stack || e).slice(0, 600)); try { await p.screenshot({ path: path.join(OUT, key + '-fail.png') }); } catch (x) {} }
    finally { try { await R.close(); } catch (e) {} }
    return res;
}
(async () => {
    const all = [];
    for (const k of CASES) { const r = await one(k); all.push(r); console.log((r.ok ? 'PASS ' : 'FAIL ') + k + '  ' + r.checks.filter(c => !c.pass).map(c => c.name + ': ' + JSON.stringify(c.info).slice(0, 400)).join(' | ')); }
    fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify(all, null, 1));
    process.exit(all.every(r => r.ok) ? 0 : 1);
})();
