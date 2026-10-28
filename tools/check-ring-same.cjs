#!/usr/bin/env node
/* Same ring everywhere check (28 Oct 2026). Emmanuel: "wenn du was änderst, dann musst du das doch überall ändern": in the
   companion sheet, "Was noch fehlt" > "Ballaststoffe: noch 13 g" opened the OLD Fuel bloom (Einkaufen / Kochen / Mahlzeit orbs)
   round the ring, while a tap on the Home bubble opens Einkaufen. This opens the app and walks every path that can reach the
   Einkaufen bubble or the food menu, and records what opens:
   - Home: tap the Einkaufen bubble
   - companion sheet: every "Was noch fehlt" row that leads to food (meals, protein, fibre, glow)
   - API callers: LowiHomeBloomsV2.open('fuel'), openAll(), LowiMistyPeak.go('fuel')
   - tutorial picture of the Einkaufen card (tutorial-show.js)
   For each: no Kochen / Mahlzeit / Einkaufen orb trio, no bloom anchored on the Einkaufen bubble, the ring's bubbles all visible
   (no empty slot), page errors. Screenshots in --out.
   node tools/check-ring-same.cjs [--engine chromium|webkit] [--lang de|en|es] [--w 390 --h 844] [--url <live index.html>]
   Simulated browser, not a physical iPhone. */
const H = require('./sim/harness.cjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const engine = arg('engine', 'chromium'), lang = arg('lang', 'de'), url = arg('url', ''), out = arg('out', '/tmp/ring-same-check');
const W = +arg('w', 390), Hh = +arg('h', 844), root = arg('root', '');
require('fs').mkdirSync(out, { recursive: true });
const res = []; const ok = (name, pass, info) => { res.push({ name, pass: !!pass }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + (typeof info === 'string' ? info : JSON.stringify(info)) : '')); };
(async () => {
    const R = await H.open(Object.assign({ engine, lang, url, probe: false, fresh: false, viewport: { width: W, height: Hh } }, root ? { root } : {}));
    const P = R.page;
    await R.goto();
    await H.sleep(5000);
    /* a day with one meal logged and fibre / protein short, so the sheet shows the fibre row like on his phone */
    await P.evaluate(() => {
        try {
            const k = 'lowispike.v2', s = JSON.parse(localStorage.getItem(k) || '{}');
            s.logs = s.logs || [];
            s.logs.push({ id: 'ring-chk-1', t: 'Rührei mit Spinat', n: 'Rührei mit Spinat', ts: Date.now() - 3 * 3600e3, kind: 'meal', slot: 'meal', macros: { protein: 20, fiber: 3, carbs: 6, sugar: 2, kcal: 320 } });
            localStorage.setItem(k, JSON.stringify(s));
        } catch (e) { }
    });
    await R.goto();
    await H.sleep(5000);
    const state = () => P.evaluate(() => {
        const vis = el => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 4 && r.height > 4 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05; };
        const bloom = document.getElementById('hb2Bloom');
        const orbs = bloom ? [...bloom.querySelectorAll('.hb2-orb')].map(o => ({ id: o.dataset.id, group: o.dataset.group || bloom.dataset.kind, label: (o.querySelector('b') || {}).textContent || '' })) : [];
        const ring = [...document.querySelectorAll('#whHud [data-orbit]')].map(e => { const r = e.getBoundingClientRect(); return { k: e.getAttribute('data-orbit'), vis: vis(e), x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; });
        const sheet = [...document.querySelectorAll('.r2-ov.on, #gvSheet, .stp-ov, #mistyHub')].map(e => e.id || String(e.className).split(' ')[0]).slice(0, 4);
        const shop = document.documentElement.classList.contains('stp-open') && !!document.querySelector('.stp-ov');
        const gap = !!document.getElementById('gvSheet');
        const fuelBubble = document.querySelector('#whHud [data-orbit="fuel"]');
        const hubEl = document.getElementById('mistyHub');
        const sheetOpen = !!(hubEl && hubEl.closest('.r2-ov.on') && vis(hubEl));
        return { sheetOpen, bloomKind: bloom && bloom.dataset.kind, orbs, ring, sheet, shop, gap, fuelLabel: fuelBubble ? (fuelBubble.getAttribute('aria-label') || fuelBubble.textContent || '').trim().slice(0, 40) : '', zoom: document.documentElement.classList.contains('br-zoom') };
    });
    const reset = async () => {
        await P.evaluate(() => { try { LowiHomeBloomsV2.close(); } catch (e) { } try { LowiMistyHub.close(); } catch (e) { } try { LowiR2.closeAll(); } catch (e) { } try { LowiGapView.close(); } catch (e) { } try { LowiStorePicks.close(); } catch (e) { } try { goTab('home'); } catch (e) { } });
        await H.sleep(1600);
    };
    const OLD = /^(Kochen|Mahlzeit|Cook|Meal|Cocinar|Comida)$/;
    const judge = async (name, s) => {
        const trio = s.orbs.filter(o => o.group === 'fuel' || OLD.test(o.label) || o.id === 'cook' || o.id === 'log');
        ok(name + ': no old Einkaufen/Kochen/Mahlzeit orbs', !trio.length, trio.length ? trio : { bloom: s.bloomKind || 'none', shop: s.shop, gap: s.gap });
        const hidden = s.ring.filter(b => !b.vis && b.k !== 'misty');
        ok(name + ': every ring bubble visible (no empty slot)', !hidden.length, hidden.length ? hidden : undefined);
        await R.shot(out + '/' + name.replace(/[^a-z0-9]+/gi, '-') + '-' + engine + '.png');
    };

    /* 1. Home tap on the Einkaufen bubble */
    await reset();
    await R.tap('#whHud [data-orbit="fuel"]').catch(e => console.log('tap fuel', e.message));
    await H.sleep(1400);
    let s = await state();
    await judge('home-tap', s);
    ok('home-tap: opens Einkaufen (Supermarkt)', s.shop, s.sheet);

    /* 2. companion sheet rows that lead to food */
    for (const k of ['fiber', 'protein', 'fuel', 'glow']) {
        await reset();
        await P.evaluate(() => { try { LowiMistyHub.open(); } catch (e) { } });
        await H.sleep(1500);
        const has = await P.evaluate(k => !!document.querySelector('#mistyPeak li[data-k="' + k + '"] [data-mp]'), k);
        if (!has) { console.log('SKIP sheet row ' + k + ' (not missing in this state)'); continue; }
        const act = await P.evaluate(k => { const b = document.querySelector('#mistyPeak li[data-k="' + k + '"] [data-mp]'); b.scrollIntoView({ block: 'center' }); return b.dataset.mp; }, k);
        await H.sleep(500);
        await R.tap('#mistyPeak li[data-k="' + k + '"] [data-mp]').catch(async () => { await P.evaluate(k => document.querySelector('#mistyPeak li[data-k="' + k + '"] [data-mp]').click(), k); });
        await H.sleep(1800);
        s = await state();
        await judge('sheet-' + k, s);
        if (act === 'fuel') ok('sheet-' + k + ': opens the Essenspause eating hub, companion sheet closed', s.gap && !s.bloomKind && !s.sheetOpen, { act, sheet: s.sheet, bloom: s.bloomKind, sheetOpen: s.sheetOpen });
    }

    /* 3. code paths */
    for (const [name, fn] of [['api-open-fuel', 'LowiHomeBloomsV2.open("fuel")'], ['api-openAll', 'LowiHomeBloomsV2.openAll()'], ['api-peak-go-fuel', 'LowiMistyPeak.go("fuel")']]) {
        await reset();
        await P.evaluate(f => { try { (0, eval)(f); } catch (e) { console.error(e); } }, fn);
        await H.sleep(1500);
        s = await state();
        await judge(name, s);
    }
    /* 4. the same map: Water / Move / Sleep still bloom */
    for (const k of ['water', 'move']) {
        await reset();
        await R.tap('#whHud [data-orbit="' + k + '"]').catch(() => { });
        await H.sleep(1200);
        s = await state();
        ok('home-tap-' + k + ': still blooms its own orbs', s.bloomKind === k && s.orbs.length >= 3, { bloom: s.bloomKind, n: s.orbs.length });
    }
    /* 5. tutorial picture */
    const pic = await P.evaluate(() => { try { const T = window.LowiTutorialShow; if (!T || !T.visHtml) return null; return T.visHtml('fuel', document.documentElement.lang || 'de'); } catch (e) { return 'ERR ' + e.message; } });
    if (pic != null) ok('tutorial fuel picture: no Kochen / Mahlzeit pills', !/Kochen|Mahlzeit eintragen|Cook|Log meal|Cocinar|Registrar/.test(pic), pic.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    await reset();
    const sx = await P.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    ok('no sideways scroll', !sx);
    const errs = R.errs.filter(e => !/supabase|ResizeObserver|WebGL|THREE/i.test(e.m));
    ok('no page errors', !errs.length, errs.slice(0, 3));
    await R.close();
    const bad = res.filter(r => !r.pass);
    console.log((bad.length ? 'FAILED ' + bad.length : 'ALL PASS') + ' (' + res.length + ' checks, ' + engine + ', ' + lang + ', ' + W + 'x' + Hh + (url ? ', ' + url : ', local') + ')');
    process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
