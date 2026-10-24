/* Button sweep 10:20 (Oct 24) lead: in Circles, a tap on a companion's bubble or body and then the next reset found
   goTab undefined (page left the app?). Open Circles, tap each bubble/body once, report URL, loads, open layers, errors.
   node tools/sweep-buttons-circles-probe.cjs [url|root] --engine chromium --lang es */
'use strict';
const H = require('./sim/harness.cjs');
const args = process.argv.slice(2); const opt = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : args[i + 1]; };
const where = args[0] && !args[0].startsWith('--') ? args[0] : 'https://therealetm.github.io/lowispike/index.html';
const room = args.includes('--room'); const SEL = room ? '.cg-body,.cg-bub' : '.ur button';
const engine = opt('engine', 'chromium'), lang = opt('lang', 'es'), only = opt('only', '');
(async () => {
    const o = { engine, lang, members: 12, messages: 30 }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
    if (engine === 'chromium') { o.viewport = { width: 390, height: 844 }; o.dpr = 2; } else o.device = opt('device', 'iPhone 13');
    const R = await H.open(o); const P = R.page;
    P.on('framenavigated', f => { if (f === P.mainFrame()) console.log('NAV', f.url()); });
    P.on('popup', p => console.log('POPUP', p.url()));
    await R.goto(); await H.sleep(6000);
    const app = P.url();
    const state = () => P.evaluate(() => ({ url: location.href, goTab: typeof window.goTab, ur: !!document.querySelector('.ur'), layers: [...document.querySelectorAll('[aria-modal=true],dialog[open],.r2-ov.on,#sheetwrap.open')].map(e => e.id || String(e.className).slice(0, 30)), tab: document.body.dataset.tab || '' })).catch(e => ({ dead: e.message.slice(0, 80) }));
    const openC = async () => { await P.evaluate(() => { try { LowiUserRooms.close(); } catch (e) { } try { LowiR2.closeAll(); } catch (e) { } goTab('foryou'); }); await H.sleep(2000); if (!room) { await P.evaluate(() => LowiUserRooms.open()); await H.sleep(2500); } };
    await openC();
    const list = await P.evaluate(SEL => [...document.querySelectorAll(SEL)].filter(b => { const r = b.getBoundingClientRect(); return r.width > 6 && r.top > 0 && r.top < innerHeight; }).map(b => (b.getAttribute('aria-label') || b.textContent || '').trim().slice(0, 50)), SEL);
    console.log('CONTROLS', JSON.stringify(list));
    for (const t of list) {
        if (only && !t.includes(only)) continue;
        if (/enviar|send|energ|block|report|bloque|denunc/i.test(t)) { console.log('SKIP', t); continue; }
        if (P.url() !== app || (await state()).goTab !== 'function') { console.log('RELOAD (was off app)'); await R.goto(); await H.sleep(6000); }
        await openC(); const e0 = R.errs.length;
        const pt = await P.evaluate(([t, sel]) => { const b = [...document.querySelectorAll(sel)].find(b => (b.getAttribute('aria-label') || b.textContent || '').trim().slice(0, 50) === t); if (!b) return null; const r = b.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const top = document.elementFromPoint(x, y); return { x, y, hit: top === b || b.contains(top) }; }, [t, SEL]);
        if (!pt) { console.log('GONE', t); continue; }
        if (!pt.hit) { console.log('COVERED', t); continue; }
        await P.touchscreen.tap(pt.x, pt.y); await H.sleep(2500);
        const s = await state();
        console.log('TAP', JSON.stringify(t), '->', JSON.stringify(s), 'errs', JSON.stringify(R.errs.slice(e0).map(e => e.m.slice(0, 160))));
    }
    console.log('LOADS', R.loads, 'CRASHED', R.crashed);
    await R.close().catch(() => { }); process.exit(0);
})();
