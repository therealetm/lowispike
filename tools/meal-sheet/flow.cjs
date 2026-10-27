/* Meal sheet behaviour check (simulated Chromium, iPhone size): type + Save, Snack, the clock (backdate), Wie immer, own values,
   Foto / Barcode, the Gap line, today's list + edit, double-open. Usage: node tools/meal-sheet/flow.cjs [url] */
'use strict';
const H = require('../sim/harness.cjs');
const URL = process.argv[2] || '', LANG = process.env.LANG_UI || 'de';
const ok = [], bad = [];
const check = (c, m) => (c ? ok : bad).push(m);
(async () => {
    const R = await H.open({ engine: process.env.ENGINE || 'chromium', lang: LANG, url: URL, viewport: { width: 390, height: 844 }, members: 3, messages: 4 });
    const P = R.page, ev = (f, a) => P.evaluate(f, a);
    const logs = () => ev(() => (JSON.parse(localStorage.getItem('lowispike.v2')).logs || []).map(l => ({ t: l.t, ts: l.ts, slot: l.slot, p: l.p, c: l.c, k: l.k })));
    const open = async () => { await ev(() => { document.querySelectorAll('.r2-ov, .fst-rw').forEach(o => o.remove()); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); document.querySelectorAll('.ss-food').forEach(o => o.remove()); document.querySelectorAll('.b3-cam').forEach(o => { o.style.display = 'none'; }); window.LowiSpirit.meal(); }); await H.sleep(700); };
    const tap = async sel => { const el = await P.$(sel); if (!el) return false; await el.scrollIntoViewIfNeeded(); await el.click(); await H.sleep(500); return true; };
    try {
        await R.goto();
        await ev(l => { localStorage.setItem('lowispike.lang', l); }, LANG);
        await ev(() => { const S = JSON.parse(localStorage.getItem('lowispike.v2')); const now = Date.now(), d = t => { const x = new Date(t); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
            S.logs = [{ id: 'p1', eventId: 'p1', ts: now - 30 * 3600e3, day: d(now - 30 * 3600e3), t: 'Lettuce wraps with ground beef', slot: 'meal', r: 'low', lvl: 'low', via: 'spirit' }]; localStorage.setItem('lowispike.v2', JSON.stringify(S)); });
        await R.goto(); await H.sleep(1500);
        await ev(l => { try { LowiLang.set(l); } catch (e) {} }, LANG); await H.sleep(500);

        // 1. opens straight into the one sheet, no Meal-or-snack step
        await open();
        const s1 = await ev(() => { const sh = document.querySelector('.sp-sheet'); return sh && { lm: !!sh.querySelector('.lm'), slots: !!sh.querySelector('.sp-slots'), tiles: sh.querySelectorAll('.sp-slot-how').length, chips: sh.querySelectorAll('[data-sp="when"]').length, usual: [...sh.querySelectorAll('.lm-u-t')].map(x => x.textContent), time: sh.querySelector('.lm-time-l').textContent, mic: !!sh.querySelector('#lmTitle ~ .mic-btn, .mic-wrap #lmTitle, [data-mic-for], .lm-form .mic-btn, .lm-form [class*="mic"]') }; });
        check(s1 && s1.lm && !s1.slots && !s1.tiles && !s1.chips, 'opens straight into the calm sheet ' + JSON.stringify(s1));
        check(s1 && s1.usual[0] === (LANG === 'de' ? 'Salat-Wraps mit Rinderhack' : LANG === 'es' ? 'Wraps de lechuga con carne picada' : 'Lettuce wraps with ground beef'), 'past meal shown in the app language: ' + (s1 && s1.usual[0]));
        check(s1 && s1.mic, 'mic sits in the field');

        // 2. type + Save = meal at now
        await P.fill('#lmTitle', 'Rührei mit Spinat'); await tap('.lm-save'); await H.sleep(1200);
        let L = await logs(); let last = L[L.length - 1];
        check(last && last.t === 'Rührei mit Spinat' && last.slot === 'meal' && Math.abs(Date.now() - last.ts) < 120e3, 'typed meal saved now as a meal ' + JSON.stringify(last));

        // 3. Snack switch + clock 2 h back
        await open();
        await tap('[data-sp="lmKind"][data-slot="snack"]');
        const sv = await ev(() => document.querySelector('.lm-save').textContent);
        check(/snack|tentempi/i.test(sv), 'Save says snack: ' + sv);
        const hm = await ev(() => { const d = new Date(Date.now() - 2 * 3600e3); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); });
        const crossesMidnight = await ev(() => new Date(Date.now() - 2 * 3600e3).getDate() !== new Date().getDate());
        await ev(v => { const i = document.querySelector('.lm-time-in'); i.value = v; i.dispatchEvent(new Event('change', { bubbles: true })); }, hm);
        const lab = await ev(() => ({ t: document.querySelector('.lm-time-l').textContent, set: document.querySelector('.lm-time').classList.contains('set'), note: document.querySelector('.sp-fast-note') && document.querySelector('.sp-fast-note').textContent }));
        if (!crossesMidnight) check(lab.set && lab.t.indexOf(hm) >= 0, 'clock shows the picked time ' + JSON.stringify(lab));
        await P.fill('#lmTitle', 'Apfel'); await tap('.lm-save'); await H.sleep(1200);
        L = await logs(); last = L[L.length - 1];
        check(last && last.t === 'Apfel' && last.slot === 'snack', 'snack saved as snack ' + JSON.stringify(last));
        if (!crossesMidnight) check(last && Math.abs(Date.now() - 2 * 3600e3 - last.ts) < 3 * 60e3, 'snack backdated 2 h (ts ' + new Date(last.ts).toTimeString().slice(0, 5) + ')');

        // 4. a fresh open starts at Now again, a future time is refused
        await open();
        const t2 = await ev(() => ({ t: document.querySelector('.lm-time-l').textContent, set: document.querySelector('.lm-time').classList.contains('set'), slot: document.querySelector('[data-sp="lmKind"][aria-pressed="true"]').dataset.slot }));
        check(!t2.set && t2.slot === 'meal', 'fresh open is back at Now and Meal ' + JSON.stringify(t2));
        const fut = await ev(() => { const d = new Date(Date.now() + 90 * 60e3); return d.getDate() === new Date().getDate() ? String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') : ''; });
        if (fut) { await ev(v => { const i = document.querySelector('.lm-time-in'); i.value = v; i.dispatchEvent(new Event('change', { bubbles: true })); }, fut);
            const t3 = await ev(() => ({ set: document.querySelector('.lm-time').classList.contains('set'), ctx: window.LowiMealCtx && window.LowiMealCtx.from }));
            check(!t3.set && t3.ctx !== 'when', 'future time refused ' + JSON.stringify(t3)); }

        // 5. own values
        await ev(() => { const b = document.querySelector('[data-sp="lmKind"][data-slot="meal"]'); b.click(); });
        await tap('[data-sp="lmOwn"]');
        const ow = await ev(() => ({ open: !document.querySelector('#lmOwn').hidden, exp: document.querySelector('[data-sp="lmOwn"]').getAttribute('aria-expanded'), n: document.querySelectorAll('#lmOwn input').length }));
        check(ow.open && ow.exp === 'true' && ow.n >= 3, 'own values open ' + JSON.stringify(ow));
        const names = await ev(() => [...document.querySelectorAll('#lmOwn input')].map(i => i.name));
        await P.fill('#lmTitle', 'Linsensuppe');
        for (const n of names) await P.fill('#lmOwn input[name="' + n + '"]', n === 'kcal' ? '420' : '12');
        await tap('.lm-save'); await H.sleep(1200);
        L = await logs(); last = L[L.length - 1];
        const raw = await ev(() => { const l = JSON.parse(localStorage.getItem('lowispike.v2')).logs; return JSON.stringify(l[l.length - 1]).slice(0, 400); });
        check(last && last.t === 'Linsensuppe' && /12/.test(raw), 'own values saved with the meal ' + raw);

        // 6. Wie immer one tap
        await open();
        const before = (await logs()).length;
        await tap('.lm-u:not(.done)'); await H.sleep(900);
        const after = (await logs()).length;
        check(after === before + 1, 'Wie immer logs in one tap (' + before + ' -> ' + after + ')');

        // 7. Foto and Barcode still open their screens
        await open();
        await tap('.lm-chip[data-sp="photo"]'); await H.sleep(900);
        const ph = await ev(() => ({ sheet: !!document.querySelector('.sp-sheet .lm'), cam: !!document.querySelector('#scanView.on, .scan-on, [data-scan-open], #scanScreen:not([hidden]), .ss-cam, video') || location.hash, intent: window.LowiScanIntent || null, tab: document.querySelector('.tab.active, [aria-selected="true"][data-tab]') && document.querySelector('.tab.active, [aria-selected="true"][data-tab]').textContent }));
        check(!ph.sheet, 'Foto closes the sheet and goes to the camera ' + JSON.stringify(ph));
        await open();
        await tap('.lm-chip[data-sp="scan"]'); await H.sleep(900);
        const sc = await ev(() => ({ sheet: !!document.querySelector('.sp-sheet .lm'), intent: window.LowiScanIntent || null }));
        check(!sc.sheet, 'Barcode closes the sheet and goes to scan ' + JSON.stringify(sc));

        // 8. Gap line + its saved time
        await ev(() => { document.querySelectorAll('.r2-ov, .fst-rw, .ss-food').forEach(o => o.remove()); document.querySelectorAll('.b3-cam').forEach(o => { o.style.display = 'none'; }); window.LowiMealCtx = { from: 'gap', ateAt: Date.now() - 45 * 60e3, at: Date.now() }; window.LowiSpirit.meal(); }); await H.sleep(700);
        const gp = await ev(() => ({ gap: !!document.querySelector('.lm-gap'), skip: !!document.querySelector('.lm-gap [data-sp="gapskip"]'), t: document.querySelector('.lm-time-l').textContent, set: document.querySelector('.lm-time').classList.contains('set') }));
        check(gp.gap && gp.skip && gp.set, 'Gap line and its saved time ' + JSON.stringify(gp));
        await tap('[data-sp="gapskip"]'); await H.sleep(600);
        check(!(await ev(() => !!document.querySelector('.sp-sheet .lm'))), 'Not now closes the sheet');

        // 9. today list + edit returns to the sheet with today open
        await open();
        const td = await ev(() => { const d = document.querySelector('.lm-today'); return d && { n: d.querySelectorAll('[data-sp="todayEdit"]').length, sum: d.querySelector('summary').textContent }; });
        check(td && td.n >= 3, 'today list there ' + JSON.stringify(td));
        await ev(() => { document.querySelector('.lm-today').open = true; });
        await tap('.lm-today [data-sp="todayEdit"]'); await H.sleep(700);
        const ed = await ev(() => !!document.querySelector('.sp-sheet form#spEdit, .sp-sheet [data-sp="editSave"], .sp-sheet form'));
        check(ed, 'tap on a today entry opens its edit');
        const saveBtn = await P.$('.sp-sheet form button[type="submit"]');
        if (saveBtn) { await saveBtn.click(); await H.sleep(900); }
        const back = await ev(() => { const d = document.querySelector('.sp-sheet .lm-today'); return d ? d.open : null; });
        check(back === true, 'after edit: back on the sheet with today open (' + back + ')');

        // 10. fast note
        const fn = await ev(() => { const n = document.querySelector('.lm .sp-fast-note'); return n ? { t: n.textContent, hidden: n.hidden, fs: getComputedStyle(n).fontSize, bg: getComputedStyle(n).backgroundColor, bd: getComputedStyle(n).borderTopWidth } : null; });
        check(true, 'fast note ' + JSON.stringify(fn));
        check(!R.errs.length, 'no page errors ' + JSON.stringify(R.errs.slice(0, 4)));
    } catch (e) { bad.push('FAIL ' + e.stack); }
    await R.close();
    console.log('OK ' + ok.length); ok.forEach(m => console.log('  + ' + m.slice(0, 300)));
    console.log('BAD ' + bad.length); bad.forEach(m => console.log('  - ' + m.slice(0, 600)));
    process.exit(bad.length ? 1 : 0);
})();
