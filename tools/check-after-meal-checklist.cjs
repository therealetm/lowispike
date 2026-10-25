#!/usr/bin/env node
/* After-meal checklist, end to end in a simulated iPhone 13 (390x844).
   node tools/check-after-meal-checklist.cjs [--engine chromium|webkit] [--lang en|de|es] [--url https://therealetm.github.io/lowispike/index.html]
   1. Log a meal eaten "Now" through Fuel's Log meal: after the "Meal logged" sheet closes, the card shows in the language, docked
      under the bubble ring, with four tiles and no overlap with a Home bubble.
   2. (Oct 25 evening, honest rewards) Tap walk: its timer starts, NO XP; tapping all four tiles again and again pays nothing,
      no achievement; a reload keeps the timers.
   3. The page clock is moved on (sessionStorage __pmcSkew, read by an init script): at +6.5 min squats and stairs wait for
      a confirm (+3 XP each), walk still runs; at +11 min walk confirms; at +31 min upright confirms, the hidden achievement
      appears (+20 XP) and is in the ledger once. No water tile.
   4. A meal logged "1 h ago" opens no card.
   5. Another meal "Now", then the x: the card goes and stays gone after a reload.
   WebKit on this VM: run with SIM_WK_VIEWPORT=1 SIM_REDUCED_MOTION=1 SIM_WK_NOSHOT=1 and one WebKit run at a time. */
const H = require('./sim/harness.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const engine = arg('engine', 'chromium'), lang = arg('lang', 'en'), url = arg('url', ''), out = arg('out', '/tmp/pmc-check');
require('fs').mkdirSync(out, { recursive: true });
const res = []; const ok = (name, pass, info) => { res.push({ name, pass: !!pass, info }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + (typeof info === 'string' ? info : JSON.stringify(info)) : '')); };

(async () => {
    const R = await H.open({ engine, lang, url, probe: false, fresh: false, viewport: { width: 390, height: 844 }, cloud: url ? undefined : undefined });
    const P = R.page;
    await P.addInitScript(() => { const n = Date.now.bind(Date); Date.now = () => n() + (+sessionStorage.getItem('__pmcSkew') || 0); });
    /* diagnostic: when the card folds itself, note what it overlapped (window.__pmcFoldHits, printed with a fold failure) */
    await P.addInitScript(() => {
        const si = Storage.prototype.setItem;
        Storage.prototype.setItem = function (k, v) {
            if (k === 'lowi.pmc.v1' && /"fold":true/.test(v) && !window.__pmcFoldHits) {
                const c = document.getElementById('pmcCard');
                if (c) { const top = c.offsetTop, bottom = top + c.offsetHeight, g = c.getBoundingClientRect();
                    window.__pmcFoldHits = { top, bottom, hits: [...document.querySelectorAll('.wh-cell, #whPad, #spBubble')].filter(b => { const q = b.getBoundingClientRect(); return q.width >= 10 && !(q.right <= g.left || q.left >= g.right || q.bottom <= top - 4 || q.top >= bottom); }).map(b => (b.id || b.className.slice(0, 30)) + ' ' + [q => q.top, q => q.bottom].map(f => Math.round(f(b.getBoundingClientRect()))).join('-') + ' op' + getComputedStyle(b).opacity + ' ' + (b.textContent || '').slice(0, 40)) }; }
            }
            return si.call(this, k, v);
        };
    });
    const skew = async min => { await P.evaluate(m => sessionStorage.setItem('__pmcSkew', String(m * 60000)), min); await H.sleep(1600); };
    try {
        R.step = 'boot'; await R.goto(); await H.sleep(engine === 'webkit' ? 12000 : 7000);
        const tidy = () => P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } const g = document.getElementById('r2gate'); if (g) g.remove(); try { if (window.LowiTutorial && LowiTutorial.stop) LowiTutorial.stop(); } catch (e) { } });
        await P.evaluate(l => { try { window.LowiLang && LowiLang.set && LowiLang.set(l); } catch (e) { } }, lang); await H.sleep(1200);
        await tidy(); await H.sleep(800);
        ok('app language is ' + lang, (await P.evaluate(() => LowiLang.get())).slice(0, 2) === lang);
        const build = await P.evaluate(() => { const s = [...document.scripts].map(x => x.src).find(x => /after-meal-checklist\.js\?v=/.test(x)); return s ? s.split('v=')[1] : 'missing'; });
        ok('page carries the checklist', build !== 'missing', 'build ' + build);
        const S = (k, v) => P.evaluate(([k, v, l]) => LowiAfterMealCore.t(l, k, v), [k, v || null, lang]);
        const xp = () => P.evaluate(() => +LowiVitalsBridge.state().xp || 0);
        const ledgerIds = () => P.evaluate(() => LowiVitalsBridge.state().ledger.map(e => e.eventId || '').filter(i => i.indexOf('pmc:') === 0));
        async function logMeal(title, whenMin) {
            await P.evaluate(() => LowiSpirit.meal());
            await P.waitForSelector('.r2-ov.on [data-sp="slot"][data-slot="meal"]', { state: 'attached', timeout: 30000 }); await H.sleep(600);
            await P.evaluate(() => document.querySelector('.r2-ov.on [data-sp="slot"][data-slot="meal"]').click());
            await P.waitForSelector('.r2-ov.on input[name="title"]', { state: 'attached', timeout: 30000 }); await H.sleep(600);
            if (whenMin) await P.evaluate(m => document.querySelector('.r2-ov.on [data-sp="when"][data-m="' + m + '"]').click(), whenMin);
            await P.evaluate(() => { window.__pmcEv = null; addEventListener('lowi:meal-logged', e => { window.__pmcEv = e.detail; }, { once: true }); });
            await P.evaluate(t => { const f = document.querySelector('.r2-ov.on input[name="title"]'); f.value = t; f.dispatchEvent(new Event('input', { bubbles: true })); f.form.requestSubmit(); }, title);
            await P.waitForFunction(() => window.__pmcEv, null, { timeout: 30000 }).catch(() => { });
            const ev = await P.evaluate(() => window.__pmcEv);
            await H.sleep(1500);
            const sheetUp = await P.evaluate(() => !!document.querySelector('.r2-ov.on'));
            const shownUnder = await P.evaluate(() => !!(document.getElementById('pmcCard') && !document.getElementById('pmcCard').hidden));
            await tidy(); await H.sleep(2500);
            for (let i = 0; i < 3; i++) {   /* a second sheet can follow the first (level up, day bonus): the card waits for it too */
                const w = await P.evaluate(() => window.LowiAfterMeal && LowiAfterMeal.waitingFor());
                if (!w) break;
                console.log('  card waits for a sheet:', w, await P.evaluate(() => { const o = document.querySelector('.r2-ov.on'); return o ? o.innerText.replace(/\s+/g, ' ').slice(0, 90) : ''; }));
                await tidy(); await H.sleep(2500);
            }
            return { ev, sheetUp, shownUnder };
        }
        const card = () => P.evaluate(async () => { const c = document.getElementById('pmcCard'); if (!c || c.hidden) return null;
            await Promise.race([Promise.all(c.getAnimations().map(a => a.finished.catch(() => { }))), new Promise(r => setTimeout(r, 3000))]);   /* measure after the slide-in: a busy VM can catch it mid-way */
            const r = c.getBoundingClientRect();
            const hits = [...document.querySelectorAll('.wh-cell, #whPad, #spBubble, #spFast')].filter(b => { const q = b.getBoundingClientRect(), cs = getComputedStyle(b); if (q.width < 10 || cs.visibility === 'hidden' || +cs.opacity < .1) return false; return !(q.right <= r.left || q.left >= r.right || q.bottom <= r.top || q.top >= r.bottom); }).map(b => b.id || b.className.split(' ').slice(0, 3).join('.'));
            return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), title: (c.querySelector('.pmc-ht b') || {}).textContent, tiles: c.querySelectorAll('[data-pmc][role="checkbox"]').length, labels: [...c.querySelectorAll('.pmc-tx b')].map(b => b.textContent), cut: [...c.querySelectorAll('.pmc-tx b, .pmc-tx small, .pmc-ht b')].filter(b => b.scrollWidth > b.clientWidth + 1).map(b => b.textContent), h: Math.round(r.height), hits, ach: !!c.querySelector('.pmc-ach'), achName: (c.querySelector('.pmc-ach b') || {}).textContent || '', text: c.innerText.replace(/\s+/g, ' ').slice(0, 300) }; });

        /* 1 */
        R.step = 'log now'; const xp0 = await xp();
        const a = await logMeal(lang === 'de' ? 'Hähnchensalat' : lang === 'es' ? 'Ensalada de pollo' : 'Chicken salad', 0);
        ok('meal logged as eaten now', a.ev && a.ev.id && Math.abs(Date.now() - a.ev.ts) < 5 * 60000, a.ev && { id: a.ev.id, ateSet: a.ev.ateSet, via: a.ev.via });
        ok('card waits while the "Meal logged" sheet is open', !a.sheetUp || !a.shownUnder, a);
        let c = await card();
        await R.shot(out + '/1-card-' + engine + '-' + lang + '.png');
        ok('card shows after the sheet closes', !!c, c);
        if (c) {
            ok('title and tiles in ' + lang, c.title === await S('title') && c.tiles === 4, { title: c.title, labels: c.labels });
            ok('inside the screen, docked low', c.top >= 0 && c.bottom <= 844 && c.left >= 0 && c.right <= 390 && c.top > 422, c);
            ok('no tile text cut off', c.cut.length === 0, c.cut);
            ok('covers no Home bubble', c.hits.length === 0, { hits: c.hits, card: [c.top, c.bottom], pad: await P.evaluate(() => { const p = document.getElementById('whPad'); if (!p) return null; const r = p.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom), Math.round(r.left), Math.round(r.right), innerHeight, getComputedStyle(p).opacity]; }) });
        }
        const pend = await P.evaluate(() => LowiAfterMeal.state());
        ok('pending checklist kept for this meal', pend && a.ev && pend.id === a.ev.id, pend);
        /* 2 */
        R.step = 'start walk'; const xp1 = await xp();
        ok('meal itself still pays (its own 15 XP plus any day bonus)', xp1 - xp0 >= (a.ev.xp || 0), xp1 - xp0);
        ok('four tiles: walk, squats, stairs, upright (no water)', JSON.stringify(await P.evaluate(() => [...document.querySelectorAll('#pmcCard [data-pmc][role="checkbox"]')].map(b => b.dataset.pmc))) === '["walk","muscle","stairs","upright"]');
        await R.tap('#pmcCard [data-pmc="walk"]'); await H.sleep(1400);
        const tile = k => P.evaluate(k => { const b = document.querySelector('#pmcCard [data-pmc="' + k + '"]'); return b ? { cls: b.className, on: b.getAttribute('aria-checked'), small: (b.querySelector('small') || {}).textContent } : null; }, k);
        let w = await tile('walk');
        ok('first tap only starts the walk timer: no XP', (await xp()) === xp1, (await xp()) - xp1);
        ok('walk tile counts down, not ticked', w && /\brun\b/.test(w.cls) && w.on === 'false' && /\d:\d\d/.test(w.small), w);
        ok('card says it is only a timer, in the intro line (no extra line)', (await P.evaluate(() => (document.querySelector('#pmcCard .pmc-say') || {}).textContent || '')).includes(await S('honest')) && !(await P.evaluate(() => (document.querySelector('#pmcCard .pmc-ft') || {}).textContent || '')));
        const hRun = (await card() || {}).h;
        ok('a running timer does not make the card taller', c && hRun <= c.h + 1, { before: c && c.h, running: hRun });
        await R.shot(out + '/2-timer-' + engine + '-' + lang + '.png');
        R.step = 'tap storm';
        for (let r = 0; r < 3; r++) for (const k of ['walk', 'muscle', 'stairs', 'upright']) { await R.tap('#pmcCard [data-pmc="' + k + '"]'); await H.sleep(150); }
        await H.sleep(1200);
        ok('tapping all four again and again pays nothing', (await xp()) === xp1, (await xp()) - xp1);
        ok('no achievement, nothing in the ledger', (await ledgerIds()).length === 0 || !(await ledgerIds()).some(i => i.indexOf('pmc:' + a.ev.id) === 0 || i === 'pmc:ach:spike-tamer'), await ledgerIds());
        const run0 = (await P.evaluate(() => LowiAfterMeal.state())).run;
        ok('four timers running', Object.keys(run0 || {}).length === 4, run0);
        R.step = 'reload keeps timers';
        await R.goto(); await H.sleep(engine === 'webkit' ? 10000 : 6000); await tidy(); await H.sleep(2500);
        const run1 = (await P.evaluate(() => LowiAfterMeal.state())).run;
        ok('a reload keeps every timer start', JSON.stringify(run1) === JSON.stringify(run0), { run0, run1 });
        ok('card back after the reload', !!(await card()));
        ok('card open after the reload (not folded by a ring that is still moving in)', !(await P.evaluate(() => (LowiAfterMeal.state() || {}).fold)), await P.evaluate(() => ({ st: LowiAfterMeal.state(), foldHits: window.__pmcFoldHits || null })));
        /* 3 */
        R.step = 'squats and stairs done';
        await skew(6.5);
        ok('squats and stairs wait for a confirm', /\bready\b/.test((await tile('muscle')).cls) && /\bready\b/.test((await tile('stairs')).cls) && (await tile('stairs')).small === await S('confirm'), [await tile('muscle'), await tile('stairs')]);
        await R.shot(out + '/3-confirm-' + engine + '-' + lang + '.png');
        const xp2 = await xp();
        await R.tap('#pmcCard [data-pmc="muscle"]'); await H.sleep(800);
        await R.tap('#pmcCard [data-pmc="stairs"]'); await H.sleep(800);
        await R.tap('#pmcCard [data-pmc="walk"]'); await H.sleep(800);
        ok('confirmed squats + stairs: +6 XP; walk at 6.5 min: nothing', (await xp()) - xp2 === 6, (await xp()) - xp2);
        ok('ledger has pmc:<meal>:muscle and :stairs once', (await ledgerIds()).filter(i => i === 'pmc:' + a.ev.id + ':muscle' || i === 'pmc:' + a.ev.id + ':stairs').length === 2, await ledgerIds());
        await R.tap('#pmcCard [data-pmc="stairs"]'); await H.sleep(700);
        ok('a second confirm pays nothing', (await xp()) - xp2 === 6, (await xp()) - xp2);
        R.step = 'walk done';
        await skew(11);
        await R.tap('#pmcCard [data-pmc="walk"]'); await H.sleep(900);
        ok('walk confirmed after 10 min: +3 XP, upright still running, no achievement', (await xp()) - xp2 === 9 && !(await ledgerIds()).includes('pmc:ach:spike-tamer'), (await xp()) - xp2);
        R.step = 'upright done';
        await skew(31);
        await R.tap('#pmcCard [data-pmc="upright"]'); await H.sleep(900);
        await H.sleep(900);
        let c2 = await card();
        await R.shot(out + '/4-achievement-' + engine + '-' + lang + '.png');
        const xp3 = await xp(), ids = await ledgerIds();
        ok('upright after 30 min + achievement: +3 +20 XP', xp3 - xp2 === 12 + 20, xp3 - xp2);
        ok('secret achievement revealed in ' + lang, c2 && c2.ach && c2.achName === await S('achName'), c2 && c2.text);
        ok('achievement in the ledger once', ids.filter(i => i === 'pmc:ach:spike-tamer').length === 1, ids);
        c = c2;
        /* 4 */
        R.step = 'log 1h ago';
        await R.tap('#pmcCard [data-pmc="close"]'); await H.sleep(700);
        ok('x closes the achievement card', !(await card()));
        const b = await logMeal(lang === 'de' ? 'Omelett' : lang === 'es' ? 'Tortilla francesa' : 'Omelette', 60);
        await H.sleep(1500);
        const pageNow = await P.evaluate(() => Date.now());
        ok('backdated meal logged 1 h ago', b.ev && pageNow - b.ev.ts > 50 * 60000, b.ev && { ts: b.ev.ts, ateSet: b.ev.ateSet });
        ok('no card for a backdated meal', !(await card()), await card());
        /* 5 */
        R.step = 'skip';
        const d = await logMeal(lang === 'de' ? 'Griechischer Joghurt' : lang === 'es' ? 'Yogur griego' : 'Greek yogurt', 0);
        c = await card();
        for (let i = 0; !c && i < 4; i++) { console.log('  no card yet; waiting for:', await P.evaluate(() => LowiAfterMeal.waitingFor()), JSON.stringify(await P.evaluate(() => LowiAfterMeal.state()))); await tidy(); await H.sleep(2000); c = await card(); }
        ok('card again for the next meal eaten now', !!c && d.ev && (await P.evaluate(() => LowiAfterMeal.state().id)) === d.ev.id, c);
        if (c) {
            await R.tap('#pmcCard [data-pmc="skip"]');
            await P.waitForFunction(() => LowiAfterMeal.state() && LowiAfterMeal.state().skip, null, { timeout: 3000 }).catch(() => { });
            if (!(await P.evaluate(() => LowiAfterMeal.state().skip))) {   /* Chromium's touch emulation sometimes drops a tap after a removed card (no touch or pointer event reaches the page): a real mouse click at the same point */
                console.log('  touch tap reached no element, clicking the x with the mouse');
                const bx = await P.locator('#pmcCard [data-pmc="skip"]').first().boundingBox(); await P.mouse.click(bx.x + bx.width / 2, bx.y + bx.height / 2); await H.sleep(800);
            }
        }
        const sk = { card: await card(), st: await P.evaluate(() => LowiAfterMeal.state()) };
        ok('one tap on x skips it', !sk.card && sk.st && sk.st.skip === true, sk);
        await R.goto(); await H.sleep(engine === 'webkit' ? 10000 : 6000); await tidy(); await H.sleep(2500);
        ok('stays skipped after a reload', !(await card()));
        ok('achievement survives the reload', (await ledgerIds()).includes('pmc:ach:spike-tamer'));
    } catch (e) { ok('run finished', false, String(e && e.message || e).slice(0, 300)); }
    const errs = R.errs.filter(e => !/supabase|realtime|websocket|fetch/i.test(e.m));
    ok('no page errors', errs.length === 0, errs.slice(0, 3));
    await R.close();
    const fail = res.filter(r => !r.pass).length;
    console.log(`${engine} ${lang}: ${res.length - fail}/${res.length} passed`);
    process.exit(fail ? 1 : 0);
})();
