'use strict';
/* Meal log: saved photo + estimate, Share to Community (Oct 22 2026). usage: node tools/probe-meal-save-share.cjs <device> [dirOrUrl] [engine] [theme] [lang]
   Seven: "When the meal is logged, it should save the picture, and also the estimate they received. It should also give them an option
   to share into the community." Logs a photo meal the way spirit.js finishMeal does (meal-journal.js prepare/keep + log.ai), then by
   taps: Fuel's today list shows the thumbnail -> the meal sheet (photo + estimate) -> Share to Community (caption, Post) -> the meal
   card in the Chat room -> Delete meal removes the log and the device photo. Checks nothing is cut off or off screen. */
const H = require('./sim/harness.cjs'), path = require('path'), fs = require('fs');
const res = {};
(async () => {
    const device = process.argv[2] || 'iPhone 13', where = process.argv[3] || path.join(__dirname, '..'), engine = process.argv[4] || 'webkit';
    const theme = process.argv[5] || 'light', lang = process.argv[6] || 'en', tag = (device + '-' + theme + '-' + lang).replace(/\s+/g, '');
    const OUT = '/home/sprite/ml/shots'; fs.mkdirSync(OUT, { recursive: true });
    const o = { device, engine, members: 10, messages: 20, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
    const R = await H.open(o), P = R.page, fails = []; res.device = device; res.theme = theme; res.lang = lang;
    const tapLast = async sel => { await P.locator(sel).last().scrollIntoViewIfNeeded().catch(() => {}); await P.locator(sel).last().click({ timeout: 8000 }); };
    const errors = []; P.on('pageerror', e => errors.push(String(e.message || e).slice(0, 160)));
    await R.goto(); await H.sleep(4000);
    for (let i = 0; i < 3; i++) { await P.keyboard.press('Escape'); await H.sleep(200); }
    await P.evaluate(([m, l]) => { localStorage.setItem('lowi.theme', m); if (window.LowiR2 && LowiR2.applyTheme) LowiR2.applyTheme(m); try { window.LowiLang && LowiLang.set(l); } catch (e) { } }, [theme, lang]); await H.sleep(800);
    res.build = await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || null);
    /* fits: every visible control of the open sheet is inside the screen and the sheet does not scroll sideways */
    const fits = (sel, name) => P.evaluate(([sel]) => {
        const ov = [...document.querySelectorAll(sel)].pop(); if (!ov) return { missing: true };
        const bad = []; ov.querySelectorAll('button,input,.mj-bs,.mj-name,.cs-meal-n').forEach(b => { const r = b.getBoundingClientRect(); if (!r.width) return; if (r.left < -1 || r.right > innerWidth + 1) bad.push((b.className || b.tagName) + ' x ' + Math.round(r.left) + '..' + Math.round(r.right)); });
        const sc = ov.querySelector('.r2-sheet,.r2-body') || ov; return { bad, sideScroll: sc.scrollWidth > sc.clientWidth + 2 };
    }, [sel]).then(v => { res[name] = v; if (v.missing) fails.push(name + ': missing'); else { if (v.bad.length) fails.push(name + ': off screen ' + v.bad.join('; ')); if (v.sideScroll) fails.push(name + ': scrolls sideways'); } });

    /* 1. log a photo meal the way finishMeal does */
    R.step = 'log';
    const logged = await P.evaluate(async () => {
        const c = document.createElement('canvas'); c.width = 1600; c.height = 1200; const g = c.getContext('2d');
        g.fillStyle = '#f3efe6'; g.fillRect(0, 0, 1600, 1200); g.fillStyle = '#e9e4da'; g.beginPath(); g.arc(800, 600, 500, 0, 7); g.fill();
        g.fillStyle = '#6aa84f'; g.beginPath(); g.arc(640, 520, 230, 0, 7); g.fill(); g.fillStyle = '#d9a35b'; g.beginPath(); g.arc(940, 700, 200, 0, 7); g.fill(); g.fillStyle = '#c0392b'; g.beginPath(); g.arc(900, 430, 90, 0, 7); g.fill();
        let at = 'blob'; try {
        const file = await new Promise(r => c.toBlob(b => r(b), 'image/jpeg', .9));
        const J = window.LowiMealJournal, V = window.LowiVitalsBridge;
        const ai = J.estimate({ name: 'Chicken salad bowl', items: [{ name: 'Grilled chicken', portion: '120 g' }, { name: 'Mixed greens', portion: '1 bowl' }, { name: 'Roasted sweet potato', portion: '80 g' }, { name: 'Cherry tomatoes' }], total: { kcal: 486, carbs: 31, protein: 41, fiber: 8, sugar: 7, fat: 19 } }, { lvl: 'low', note: 'Protein and fiber first: a calm curve.' });
        at = 'prepare'; const pic = await J.prepare(file); if (!pic) return { err: 'prepare null' };
        at = 'log';
        const r = V.logMeal({ id: 'probe-' + Date.now(), t: 'Chicken salad bowl', lvl: 'low', via: 'photo', photo: pic.thumb, ai, macros: ai.total, ts: Date.now() - 30 * 60000 });
        at = 'keep'; const kept = await J.keep(r.log.id, pic); at = 'get';
        const blob = await J.getPhoto(r.log.id);
        const s = V.state(), log = s.logs.find(l => l.id === r.log.id);
        at = 'bitmap'; const im = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok({ width: i.naturalWidth, height: i.naturalHeight }); i.onerror = no; i.src = URL.createObjectURL(blob); });
        return { id: r.log.id, xp: r.xp, kept, blobKB: Math.round(blob.size / 1024), w: im.width, h: im.height, thumbKB: Math.round(log.photo.length / 1024), ai: !!log.ai && log.ai.items.length, lsKB: Math.round((localStorage.getItem('lowispike.v2') || '').length / 1024) };
        } catch (e) { return { err: at + ': ' + String(e && e.message || e) }; }
    });
    if (logged.err) { console.log(JSON.stringify({ crash: logged.err })); await R.close(); process.exit(2); }
    res.logged = logged;
    if (!logged.kept || Math.max(logged.w, logged.h) !== 1024) fails.push('photo not kept at 1024 px: ' + JSON.stringify(logged));
    if (logged.thumbKB > 16) fails.push('thumbnail too big: ' + logged.thumbKB + ' KB');

    /* 2. Fuel's today list -> thumbnail -> the meal sheet */
    R.step = 'list';
    await P.evaluate(() => { try { window.goTab && goTab('home'); } catch (e) { } }); await H.sleep(800);
    await P.evaluate(() => LowiMealsBubble.details()); await H.sleep(900);
    res.thumbInList = await P.evaluate(id => { const b = document.querySelector('.mj-thumb[data-mj-open="' + id + '"] img'); return !!b && b.complete && b.naturalWidth > 0; }, logged.id);
    if (!res.thumbInList) fails.push('no thumbnail in the today list');
    await R.shot(OUT + '/' + tag + '-1-list.png');
    await R.tap('.mj-thumb[data-mj-open="' + logged.id + '"]'); await H.sleep(1200);
    res.sheet = await P.evaluate(() => { const s = [...document.querySelectorAll('.mj-sheet')].pop(); if (!s) return null; const img = s.querySelector('.mj-photo img'); return { photo: !!img && /^blob:/.test(img.src) && img.naturalWidth, name: (s.querySelector('.mj-name') || {}).textContent, bs: (s.querySelector('.mj-bs') || {}).textContent, foods: !!s.querySelector('.mj-ing'), nut: s.querySelectorAll('.mj-n').length, share: !!s.querySelector('[data-mj=share]'), del: !!s.querySelector('[data-mj=del]') }; });
    if (!res.sheet || !res.sheet.photo || !res.sheet.share || !res.sheet.foods || res.sheet.nut < 5) fails.push('meal sheet incomplete: ' + JSON.stringify(res.sheet));
    await fits('.r2-ov.mj-ov', 'sheetFits');
    await R.shot(OUT + '/' + tag + '-2-meal.png');

    /* 3. Share to Community: caption, Post */
    R.step = 'share';
    await tapLast('.mj-sheet [data-mj=share]'); await H.sleep(1400);
    res.shareSheet = await P.evaluate(() => { const s = [...document.querySelectorAll('.mj-share')].pop(); return s ? { name: (s.querySelector('.mj-card b') || {}).textContent, bs: (s.querySelector('.mj-bs') || {}).textContent, foot: (s.querySelector('.mj-foot') || {}).textContent, input: !!s.querySelector('.mj-cap input') } : null; });
    if (!res.shareSheet) {
        res.shareDiag = await P.evaluate(async id => { const o = { ovs: [...document.querySelectorAll('.r2-ov')].map(x => x.className), toast: (document.querySelector('.r2-toast,.toast,#toast') || {}).textContent || '' };
            try { const log = LowiVitalsBridge.state().logs.find(l => l.id === id); o.share = LowiMealJournal.shareOf(log); o.lvl = log && log.lvl; const r = await LowiMealJournal.share(id); o.ret = !!r; } catch (e) { o.err = String(e && e.message || e); }
            o.after = document.querySelectorAll('.mj-share').length; return o; }, logged.id);
        await H.sleep(800);
        if (!res.shareDiag.after) { fails.push('share sheet missing ' + JSON.stringify(res.shareDiag)); console.log(JSON.stringify(res)); await R.close(); process.exit(1); }
        fails.push('share sheet did not open from the meal sheet button ' + JSON.stringify(res.shareDiag));
    }
    const before = R.sim ? R.sim.writes.length : 0;
    await P.locator('.mj-share .mj-cap input').last().fill(lang === 'de' ? 'Mittag nach dem Training' : lang === 'es' ? 'Comida después del gym' : 'Lunch after the gym');
    await fits('.r2-ov.mj-ov', 'shareFits');
    await R.shot(OUT + '/' + tag + '-3-share.png');
    await tapLast('.mj-share [data-mj=post]'); await H.sleep(3500);
    const w = R.sim ? R.sim.writes.slice(before) : [];
    res.writes = w.map(x => x.m + ' ' + String(x.p).slice(0, 90));
    res.shareMsg = await P.evaluate(() => { const m = [...document.querySelectorAll('.mj-msg')].pop(); return m ? m.textContent : 'closed'; });
    const up = w.find(x => /\/storage\/v1\/object\/media\/[^/]+\/meal-p[0-9a-f]+\.jpg/.test(x.p));
    if (!up) fails.push('no meal photo upload: ' + JSON.stringify(res.writes) + ' msg=' + res.shareMsg);
    /* nothing else went out: no weight, no state backup with the full photo */
    const bodies = await P.evaluate(() => { const o = []; try { for (const k of Object.keys(localStorage)) if (/outbox|pending/i.test(k)) o.push(localStorage.getItem(k).slice(0, 2000)); } catch (e) { } return o; });
    res.outboxHasWeight = bodies.some(b => /weight|bmi|kg\b/i.test(b));

    /* 4. the card in the Chat room */
    R.step = 'chat';
    await P.evaluate(() => { try { goTab('community'); } catch (e) { } }); await H.sleep(2500);
    try { await R.tap('.rm-tab[data-rm=chat]'); } catch (e) { try { await R.tapText(/^Chat$/); } catch (x) { } } await H.sleep(2500);
    res.card = await P.evaluate(() => { const c = [...document.querySelectorAll('.cs-meal')].pop(); if (!c) return null; c.scrollIntoView({ block: 'center' }); const b = c.closest('.cm-bub,.cm-msg,li,article') || c.parentElement; const img = b && b.querySelector('img'); const cap = b && b.querySelector('.cm-t,.cs-cap'); return { name: (c.querySelector('.cs-meal-n') || {}).textContent, bs: (c.querySelector('.cs-meal-bs') || {}).textContent, img: !!img, cap: cap ? cap.textContent : '', color: getComputedStyle(c.querySelector('.cs-meal-n')).color, bg: getComputedStyle(b).backgroundColor }; });
    await H.sleep(1200);
    if (!res.card) fails.push('no meal card in the chat'); else if (!/Chicken salad bowl/.test(res.card.name)) fails.push('card name: ' + res.card.name);
    await R.shot(OUT + '/' + tag + '-4-chat.png');

    /* 5. delete the meal and its photo */
    R.step = 'delete';
    await P.evaluate(() => { try { goTab('home'); } catch (e) { } }); await H.sleep(900);
    await P.evaluate(id => LowiMealJournal.open(id), logged.id); await H.sleep(1100);
    await tapLast('.mj-sheet [data-mj=del]'); await H.sleep(500);
    await fits('.r2-ov.mj-ov', 'confirmFits');
    await R.shot(OUT + '/' + tag + '-5-delete.png');
    await tapLast('.mj-sheet [data-mj=delgo]'); await H.sleep(1500);
    res.afterDelete = await P.evaluate(async id => ({ log: !!LowiVitalsBridge.state().logs.find(l => l.id === id), photo: !!(await LowiMealJournal.getPhoto(id)) }), logged.id);
    if (res.afterDelete.log || res.afterDelete.photo) fails.push('delete left ' + JSON.stringify(res.afterDelete));
    res.errors = errors.filter(e => !/ResizeObserver/.test(e)); if (res.errors.length) fails.push('page errors: ' + res.errors.join(' | '));
    res.fails = fails; res.ok = !fails.length;
    console.log(JSON.stringify(res));
    await R.close(); process.exit(fails.length ? 1 : 0);
})().catch(e => { res.crash = String(e && e.stack || e).slice(0, 600); console.log(JSON.stringify(res)); process.exit(2); });
