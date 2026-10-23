'use strict';
// Oct 23, 2026, misty-sheet-a: Misty's sheet no longer shows 'Tell Misty how you feel', the Hunt power row or the Food journal door.
// Simulated phone check (browser simulation, not a real phone): open Misty's sheet with hunt power-ups present, check the three are
// gone, the two doors (Forms, Glow) are there and open, nothing is wider than the screen, and no page errors.
// Usage: THEME=light|dark node tools/sim/misty-sheet-a.cjs [device] [lang] [url]
const path = require('path');
const H = require('./harness.cjs');
const device = process.argv[2] || 'iPhone 13', lang = process.argv[3] || 'en', url = process.argv[4] || '';
const theme = process.env.THEME || '';
const tag = device.replace(/\s+/g, '') + '-' + lang + (theme ? '-' + (theme === 'light' ? 'day' : 'night') : '');
let bad = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + '[' + tag + '] ' + m); if (!c) bad++; };

(async () => {
    const R = await H.open({ root: path.join(__dirname, '..', '..'), url, lang, device, members: 8, messages: 20 });
    try {
        await R.ctx.addInitScript(l => {
            try { const s = JSON.parse(localStorage.getItem('lowispike.v2') || '{}'); s.xp = 2400; localStorage.setItem('lowispike.v2', JSON.stringify(s)); if (l !== 'en') localStorage.setItem('lowispike.lang', l); } catch (e) { }
        }, lang);
        await R.goto(); await H.sleep(2500);
        const P = R.page;
        if (theme) { await P.evaluate(t => { try { window.LowiR2.applyTheme(t); } catch (e) { } }, theme); await H.sleep(600); }
        /* pretend the hunt game has power-ups, so the old Hunt power row would have shown */
        await P.evaluate(() => { window.LowiMistyPower = { read: () => ({ level: 3, xp: 40, next: 100, boost: 0.05, label: 'Spark' }) }; try { window.dispatchEvent(new Event('lowi:misty-power')); } catch (e) { } });
        const opened = await P.evaluate(() => { try { return !!(window.LowiMistyHub && window.LowiMistyHub.open && window.LowiMistyHub.open()); } catch (e) { return false; } });
        await H.sleep(1500);
        ok(opened, 'Misty sheet opens');
        const m = await P.evaluate(() => {
            const h = document.querySelector('#mistyHub'); if (!h) return null;
            const t = h.innerText.replace(/\s+/g, ' ');
            const vw = innerWidth, wide = [...h.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > vw + 1; }).length;
            return {
                mood: !!h.querySelector('.mh-mood, [data-mh="mood"]'), power: !!h.querySelector('.ms-power'),
                feelText: /how you feel|wie du dich f\u00fchlst|c\u00f3mo te sientes/i.test(t), huntText: /Hunt power|Jagd-?Kraft|Poder de caza/i.test(t),
                journal: !!h.querySelector('[data-mh="journal"]') || /Food journal|Ern\u00e4hrungstagebuch|Essens-?tagebuch|Diario de comidas/i.test(t),
                doors: [...h.querySelectorAll('.mh-doors [data-mh]')].map(b => b.dataset.mh), energy: !!h.querySelector('.ms-card'), wide, sw: document.documentElement.scrollWidth > vw + 1
            };
        });
        ok(!!m, 'sheet content found');
        if (m) {
            ok(!m.mood && !m.feelText, 'no "Tell Misty how you feel" card');
            ok(!m.power && !m.huntText, 'no Hunt power row');
            ok(!m.journal, 'no Food journal door');
            ok(m.doors.join() === 'forms,glow', 'two doors Forms + Glow (' + m.doors.join() + ')');
            ok(m.energy, 'energy card still there');
            ok(m.wide === 0 && !m.sw, 'nothing wider than the screen (' + m.wide + ')');
        }
        /* Glow opens from the sheet and replaces it (one sheet at a time) */
        await P.evaluate(() => { const b = document.querySelector('#mistyHub [data-mh="glow"]'); b && b.click(); }); await H.sleep(1400);
        const g = await P.evaluate(() => { const vis = [...document.querySelectorAll('.r2-ov')].filter(o => !o.classList.contains('off') && getComputedStyle(o).display !== 'none' && getComputedStyle(o).visibility !== 'hidden'); return { n: vis.length, hub: vis.some(o => o.querySelector('#mistyHub')) }; });
        ok(g.n >= 1 && !g.hub, 'Glow opens on its own sheet (visible ' + g.n + ', hub visible ' + g.hub + ')');
        const errs = R.errs.filter(e => !/supabase|realtime|websocket/i.test(e.m));
        ok(errs.length === 0, 'no page errors (' + errs.length + ')'); if (errs.length) console.log(JSON.stringify(errs.slice(0, 4)).slice(0, 1200));
    } catch (e) { ok(false, e.message.slice(0, 300)); } finally { await R.close(); }
    console.log(bad ? 'RESULT FAIL ' + bad : 'RESULT PASS');
    process.exit(bad ? 1 : 0);
})();
