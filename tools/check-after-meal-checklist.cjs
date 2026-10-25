#!/usr/bin/env node
/* After-meal checklist, end to end in a simulated iPhone 13 (390x844).
   node tools/check-after-meal-checklist.cjs [--engine chromium|webkit] [--lang en|de|es] [--url https://therealetm.github.io/lowispike/index.html]
   1. Log a meal eaten "Now" through Fuel's Log meal: after the "Meal logged" sheet closes, the card shows in the language, docked
      under the bubble ring, with four tiles and no overlap with a Home bubble.
   2. Tap a tile: +3 XP once (a second tap pays nothing); the ledger entry is pmc:<meal>:<item>.
   3. Tap the other three: +9 XP, the hidden achievement appears (+20 XP) and is in the ledger once.
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
        const card = () => P.evaluate(() => { const c = document.getElementById('pmcCard'); if (!c || c.hidden) return null; const r = c.getBoundingClientRect();
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
        R.step = 'tick walk'; const xp1 = await xp();
        ok('meal itself still pays (its own 15 XP plus any day bonus)', xp1 - xp0 >= (a.ev.xp || 0), xp1 - xp0);
        await R.tap('#pmcCard [data-pmc="walk"]'); await H.sleep(900);
        const xp2 = await xp();
        ok('walk tick pays +3 XP', xp2 - xp1 === 3, xp2 - xp1);
        ok('ledger has pmc:<meal>:walk', (await ledgerIds()).includes('pmc:' + a.ev.id + ':walk'), await ledgerIds());
        ok('tile shows ticked', await P.evaluate(() => document.querySelector('#pmcCard [data-pmc="walk"]').getAttribute('aria-checked') === 'true'));
        await R.tap('#pmcCard [data-pmc="walk"]'); await H.sleep(700);
        ok('second tap pays nothing', (await xp()) === xp2, (await xp()) - xp2);
        await R.shot(out + '/2-ticked-' + engine + '-' + lang + '.png');
        /* 3 */
        R.step = 'tick rest';
        for (const k of ['muscle', 'water', 'upright']) { await R.tap('#pmcCard [data-pmc="' + k + '"]'); await H.sleep(700); }
        await H.sleep(900);
        c = await card();
        await R.shot(out + '/3-achievement-' + engine + '-' + lang + '.png');
        const xp3 = await xp(), ids = await ledgerIds();
        ok('three more ticks + achievement = +29 XP', xp3 - xp2 === 9 + 20, xp3 - xp2);
        ok('secret achievement revealed in ' + lang, c && c.ach && c.achName === await S('achName'), c && c.text);
        ok('achievement in the ledger once', ids.filter(i => i === 'pmc:ach:spike-tamer').length === 1, ids);
        /* 4 */
        R.step = 'log 1h ago';
        await R.tap('#pmcCard [data-pmc="close"]'); await H.sleep(700);
        ok('x closes the achievement card', !(await card()));
        const b = await logMeal(lang === 'de' ? 'Omelett' : lang === 'es' ? 'Tortilla francesa' : 'Omelette', 60);
        await H.sleep(1500);
        ok('backdated meal logged 1 h ago', b.ev && Date.now() - b.ev.ts > 50 * 60000, b.ev && { ts: b.ev.ts, ateSet: b.ev.ateSet });
        ok('no card for a backdated meal', !(await card()), await card());
        /* 5 */
        R.step = 'skip';
        const d = await logMeal(lang === 'de' ? 'Griechischer Joghurt' : lang === 'es' ? 'Yogur griego' : 'Greek yogurt', 0);
        c = await card();
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
