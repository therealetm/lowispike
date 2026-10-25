/* Meal details proof (task 31c545da, Oct 25 2026): in a real browser, a friend's meal post in Community Chat shows a tappable spike
   label with a "Details >" hint; tapping the label opens the glass sheet with the poster's own photo check (name, why, foods, numbers,
   tip), it fits the screen (SE -> 15 Pro Max -> iPad, safe areas), every word passes WCAG AA, and a swipe down closes it. An older
   meal post without details opens the calm "No details for this meal" line from its photo. For You: the chip on a shared meal post.
   node tools/meal-detail/check.cjs [outDir] [url] [cases]
   With a url it runs against that site, with the regress fake Supabase: nothing is written anywhere. Exit 1 on failure. */
'use strict';
const fs = require('fs'), path = require('path');
const H = require('../regress/harness.cjs'), N = require('../regress/nav.cjs');
const K = require('../../community-chat-core.js');
global.LowiMealSnap = require('../../meal-photo.js'); global.LowiFoodKnowledge = require('../../food-knowledge-core.js');
const M = require('../../meal-detail-core.js'), J = require('../../meal-journal.js');
const OUT = path.resolve(process.argv[2] || '/tmp/meal-detail'); fs.mkdirSync(OUT, { recursive: true });
const URL_ = process.argv[3] || '';
const ALL = {
    'chromium-se-en': { engine: 'chromium', viewport: { width: 375, height: 667 }, lang: 'en' },
    'chromium-13-de': { engine: 'chromium', viewport: { width: 390, height: 844 }, lang: 'de' },
    'chromium-15pm-es': { engine: 'chromium', viewport: { width: 430, height: 932 }, lang: 'es' },
    'chromium-ipad-en': { engine: 'chromium', viewport: { width: 820, height: 1180 }, lang: 'en' },
    'webkit-se-de': { engine: 'webkit', device: 'iPhone SE (3rd gen)', viewport: { width: 375, height: 667 }, lang: 'de' },
    'webkit-13-en': { engine: 'webkit', device: 'iPhone 13', viewport: { width: 390, height: 844 }, lang: 'en' },
    'webkit-15pm-es': { engine: 'webkit', device: 'iPhone 15 Pro Max', viewport: { width: 430, height: 932 }, lang: 'es' },
    'webkit-ipad-de': { engine: 'webkit', device: 'iPad (gen 7)', viewport: { width: 820, height: 1180 }, lang: 'de' }
};
const CASES = (process.argv[4] || Object.keys(ALL).join(',')).split(',').filter(k => ALL[k]);
const log0 = { t: 'Lachs-Bowl', lvl: 'low', ai: J.estimate({ name: 'Salmon bowl', items: [{ name: 'Salmon', portion: '150 g' }, { name: 'Avocado', portion: '1/2' }, { name: 'Cucumber' }, { name: 'Sesame seeds', portion: '1 tsp' }], total: { kcal: 520, carbs: 14, protein: 38, fiber: 8, sugar: 4, fat: 32 } }, { lvl: 'low', note: 'Lots of protein and healthy fat, very few carbs.' }) };
const DETAIL = M.fromLog(log0, 'low');

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

// the R2 sheet slides up with a CSS transition; WebKit on the shared VM can run it at a few frames a second, so measure only once it rests
async function settled(p, timeout) {
    await p.waitForFunction(() => { const sh = document.querySelector('.md-ov.on .r2-sh'); if (!sh) return false; const t = getComputedStyle(sh).transform; return (t === 'none' || t === 'matrix(1, 0, 0, 1, 0, 0)') && !(sh.getAnimations && sh.getAnimations().some(a => a.playState === 'running')); }, null, { timeout: timeout || 30000 }).catch(() => {});
    await p.waitForTimeout(250);
}
async function one(key) {
    const C = ALL[key], res = { key, ok: true, checks: [] };
    const ok = (name, pass, info) => { res.checks.push({ name, pass: !!pass, info }); if (!pass) res.ok = false; };
    const R = await H.open(Object.assign({ probe: false, url: URL_, messages: 80, members: 20 }, C));
    const p = R.page, sim = R.sim;
    try {
        // two friends' meal posts: an older one from before details were saved, and a new one with its photo check
        const a = sim.say('tmp-old'), b = sim.say('tmp-new');
        const host = (sim.HOST || 'vnfwmifmsfecascwaody.supabase.co');
        a.body = K.mealBody('https://' + host + '/storage/v1/object/public/media/' + a.user_id + '/meal-old001.jpg', 'Toast mit Marmelade', 'high', '');
        b.body = K.mealBody('https://' + host + '/storage/v1/object/public/media/' + b.user_id + '/meal-new001.jpg', 'Lachs-Bowl', 'low', 'Lunch!');
        b.meal = DETAIL; b.who = 'Antje';
        // a shared meal post in For You with the same detail
        if (sim.W.posts) sim.W.posts.unshift({ id: 'fy-md-1', user_id: b.user_id, who: 'Antje', created_at: new Date().toISOString(), cap: 'Lachs-Bowl', photo_url: 'https://' + host + '/storage/v1/object/public/media/' + b.user_id + '/post-md.jpg', url: '', plat: '', lv: 3, meta: { spike: 'low', dish: 'Lachs-Bowl', from: 'community', detail: DETAIL } });
        // the app reads its language from localStorage 'lowispike.lang' (LANG_KEY), not from settings.lang: set it before the first load
        await R.ctx.addInitScript((l) => { try { localStorage.setItem('lowispike.lang', l); } catch (e) { } }, C.lang);
        await R.goto();
        const appLang = await p.evaluate(() => (window.LowiLang && LowiLang.get && LowiLang.get()) || '');
        ok('app opened in the asked language', appLang === C.lang, { asked: C.lang, got: appLang });
        await N.openCommunity(R, (s) => res.checks.push({ name: 'nav', pass: true, info: s }));
        const slow = C.engine === 'webkit' ? 120000 : 30000;
        if (!(await p.evaluate(() => !!document.querySelector('#cgThread[data-open]')))) await p.locator('#cmPaneChat .rm-tab[data-rm="chat"]').first().click({ force: true, timeout: 8000 });
        await p.waitForFunction(() => !!document.querySelector('#cgThread[data-open]') && document.querySelectorAll('#cmList [id^="cm-"]').length > 0, null, { timeout: slow });
        const lab = p.locator('button.cs-meal-bs[data-chat="meal-detail"]');
        await lab.last().waitFor({ state: 'attached', timeout: slow });
        ok('both meal labels are buttons', (await lab.count()) >= 2, await lab.count());
        const newLab = p.locator('button.cs-meal-bs[data-id="' + b.id + '"]'), oldPhoto = p.locator('button.cs-photo[data-md="' + a.id + '"]');
        await newLab.scrollIntoViewIfNeeded();
        const hint = await newLab.evaluate(el => { const h = el.querySelector('.md-hint'), r = h && h.getBoundingClientRect(); return { text: h ? h.textContent : '', w: r ? r.width : 0, svg: !!(h && h.querySelector('svg')), label: el.getAttribute('aria-label') }; });
        ok('visible "Details >" hint on the label', hint.w > 10 && hint.svg && hint.text === M.t('hint', C.lang), hint);
        await p.screenshot({ path: path.join(OUT, key + '-1-chat.png') });
        await newLab.tap({ timeout: 8000 });
        await p.locator('.md-ov.on .md-sheet').waitFor({ state: 'visible', timeout: 8000 });
        await settled(p, slow);
        const s = await p.evaluate(() => { const sh = document.querySelector('.md-ov .r2-sh'), r = sh.getBoundingClientRect(), b = sh.querySelector('.r2-b'); return { text: sh.innerText, l: r.left, r: r.right, t: r.top, b: r.bottom, vw: innerWidth, vh: innerHeight, hOver: b ? b.scrollWidth - b.clientWidth : 0, role: sh.getAttribute('role'), label: sh.getAttribute('aria-label') }; });
        const l = C.lang;
        ok('sheet shows the meal, who, label, why, foods, numbers, tip', ['Salmon bowl', M.t('from', l, { n: 'Antje' }), M.t('low', l), M.t('whyLow', l, { net: 6 }), 'Salmon', '150 g', 'Avocado', '520', M.t('protein', l), M.t('tip', l)].every(x => s.text.includes(x)), s.text.slice(0, 400));
        ok('nothing invented (no undefined/NaN)', !/undefined|NaN|null/.test(s.text));
        ok('sheet fits the screen', s.l >= -0.5 && s.r <= s.vw + 0.5 && s.t >= -0.5 && s.b <= s.vh + 0.5 && s.hOver <= 1, s);
        ok('dialog semantics', s.role === 'dialog' && /Salmon bowl|Lachs/.test(s.label || ''), s.label);
        const cDark = await contrast(p, '.md-ov .r2-sh');
        ok('WCAG AA on every word (app theme)', cDark.min >= 4.5 && cDark.n > 10, cDark);
        await p.screenshot({ path: path.join(OUT, key + '-2-sheet.png') });
        const dayOn = await p.evaluate(() => { document.documentElement.setAttribute('data-ui', 'light'); if (window.LowiR2 && LowiR2.applyTheme) LowiR2.applyTheme('light'); return document.documentElement.getAttribute('data-theme'); });
        ok('day look switched on (data-theme=light)', dayOn === 'light', dayOn);
        await p.waitForTimeout(400);
        const cDay = await contrast(p, '.md-ov .r2-sh');
        ok('WCAG AA on every word (day look)', cDay.min >= 4.5, cDay);
        await p.screenshot({ path: path.join(OUT, key + '-3-sheet-day.png') });
        await p.evaluate(() => { document.documentElement.removeAttribute('data-ui'); if (window.LowiR2 && LowiR2.applyTheme) LowiR2.applyTheme('dark'); });
        // swipe down on the grab bar closes it (phones); on iPad every R2 sheet is a centred dialog with no grab bar and no X: a tap outside closes it
        const g = await p.locator('.md-ov .r2-grab').boundingBox();
        const isPhone = await p.evaluate(() => document.documentElement.dataset.lay === 'phone');
        if (!isPhone && !g) { await p.touchscreen.tap(12, 12); const c2 = await p.waitForFunction(() => !document.querySelector('.md-ov.on'), null, { timeout: 15000 }).then(() => true).catch(() => false); ok('tap outside closes the centred iPad sheet (no grab bar or X on iPad, app-wide)', c2); }
        else if (g) { const x = g.x + g.width / 2, y = g.y + g.height / 2; await p.mouse.move(x, y); await p.mouse.down(); for (let i = 1; i <= 12; i++) { await p.mouse.move(x, y + i * 30); await p.waitForTimeout(16); } await p.mouse.up(); }
        const closed = await p.waitForFunction(() => !document.querySelector('.md-ov.on'), null, { timeout: 15000 }).then(() => true).catch(() => false);
        if (isPhone || g) ok('swipe down closes the sheet', !!g && closed, g);
        await p.waitForFunction(() => !document.querySelector('.md-ov'), null, { timeout: 3000 }).catch(() => {});
        // the older post: tap its photo -> calm "No details"
        await oldPhoto.scrollIntoViewIfNeeded();
        await oldPhoto.tap({ timeout: 8000 });
        await p.locator('.md-ov.on .md-sheet').waitFor({ state: 'visible', timeout: 8000 });
        const s2 = await p.locator('.md-ov.on .md-sheet').innerText();
        ok('older post: photo opens "No details for this meal"', s2.includes(M.t('none', l)) && s2.includes('Toast mit Marmelade') && s2.includes(M.t('high', l)), s2);
        await p.screenshot({ path: path.join(OUT, key + '-4-none.png') });
        await p.locator('.md-ov.on .r2-x').tap({ timeout: 3000 }).catch(() => p.touchscreen.tap(12, 12));
        await p.waitForFunction(() => !document.querySelector('.md-ov.on'), null, { timeout: 4000 }).catch(() => {});
        // For You chip (on the dark slide shade), via the real fyChip + TRIBE.post lookup
        const fy = await p.evaluate(() => {
            const T = window.TRIBE, p = T && T.post ? T.post('fy-md-1') : null; if (!p || !window.LowiMealDetail) return { has: !!p };
            const box = document.createElement('div'); box.className = 'md-probe'; box.style.cssText = 'position:fixed;left:12px;bottom:120px;z-index:99999;padding:14px;background:linear-gradient(transparent,rgba(0,0,0,.55))';
            box.innerHTML = LowiMealDetail.fyChip(p); document.body.appendChild(box); const b = box.querySelector('.md-fy'); return { has: true, chip: !!b, label: b && b.getAttribute('aria-label') };
        });
        if (fy.chip) {
            const cChip = await contrast(p, '.md-probe .md-fy');
            ok('For You chip AA', cChip.min >= 4.5, cChip);
            await p.locator('.md-probe .md-fy').tap();
            await p.locator('.md-ov.on .md-sheet').waitFor({ state: 'visible', timeout: 8000 });
            const s3 = await p.locator('.md-ov.on .md-sheet').innerText();
            ok('For You chip opens the same details', s3.includes('Salmon') && s3.includes('520'), s3.slice(0, 200));
            await p.screenshot({ path: path.join(OUT, key + '-5-foryou.png') });
        } else ok('For You post reachable', false, fy);
        // the real For You screen: the shared meal post's own slide carries the chip, a finger tap on it opens the same details
        await p.locator('.md-ov.on .r2-x').tap({ timeout: 3000 }).catch(() => p.touchscreen.tap(12, 12));
        await p.waitForFunction(() => !document.querySelector('.md-ov.on'), null, { timeout: 8000 }).catch(() => {});
        await p.evaluate(() => { const b = document.querySelector('.md-probe'); if (b) b.remove(); });
        await p.evaluate(() => window.goTab && window.goTab('foryou'));
        await p.locator('.rm-tab[data-rm="fy"]').first().click({ timeout: 10000 }).catch(() => {});
        const inFeed = await p.waitForFunction(() => !!document.querySelector('#fyFeed .fy-slide[data-id="fy-md-1"]'), null, { timeout: slow }).then(() => true).catch(() => false);
        if (!inFeed) ok('real For You screen shows the shared meal post', false, await p.evaluate(() => { const f = document.getElementById('fyFeed'); return { feed: !!f, n: f ? f.querySelectorAll('.fy-slide').length : -1, ids: f ? [...f.querySelectorAll('.fy-slide')].slice(0, 6).map(x => x.dataset.id) : [] }; }));
        else {
            await p.evaluate(() => document.querySelector('#fyFeed .fy-slide[data-id="fy-md-1"]').scrollIntoView({ block: 'start' }));
            await p.waitForTimeout(1200);
            const chip = p.locator('#fyFeed .fy-slide[data-id="fy-md-1"] .md-fy').first();
            const cinfo = await chip.evaluate(el => { const r = el.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { text: el.innerText, l: r.left, r: r.right, t: r.top, b: r.bottom, vw: innerWidth, vh: innerHeight, onTop: !!hit && (hit === el || el.contains(hit)) }; }).catch(e => ({ err: String(e).slice(0, 200) }));
            ok('real For You slide: chip visible, on screen and not covered', cinfo && !cinfo.err && cinfo.onTop && cinfo.l >= 0 && cinfo.r <= cinfo.vw + .5 && cinfo.t >= 0 && cinfo.b <= cinfo.vh + .5 && cinfo.text.includes(M.t('hint', l)), cinfo);
            await p.screenshot({ path: path.join(OUT, key + '-6-foryou-real.png') });
            await chip.tap({ timeout: 8000 }).catch(() => {});
            const op = await p.locator('.md-ov.on .md-sheet').waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false);
            const s4 = op ? await p.locator('.md-ov.on .md-sheet').innerText() : '';
            ok('real For You chip opens the details', op && s4.includes('Salmon') && s4.includes('520') && s4.includes(M.t('low', l)), s4.slice(0, 200));
            if (op) { await settled(p, slow); await p.screenshot({ path: path.join(OUT, key + '-7-foryou-sheet.png') }); }
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
