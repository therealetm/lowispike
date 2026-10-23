'use strict';
// Oct 23, 2026, misty-peak: Misty's sheet opens with World glow, the bar to her peak (Supernova) and what is still missing.
// Simulated phone check (browser simulation, not a real phone): open Misty's sheet, check World glow sits right under her name,
// never reads 100% while rows are missing, lists them with words in the app language, a missing row taps through and closes
// the sheet, nothing is wider than the screen, and no page errors.
// Usage: THEME=light|dark node tools/sim/misty-peak.cjs [device] [lang] [url]
const path = require('path');
const H = require('./harness.cjs');
const device = process.argv[2] || 'iPhone 13', lang = process.argv[3] || 'en', url = process.argv[4] || '';
const theme = process.env.THEME || '';
const tag = device.replace(/\s+/g, '') + '-' + lang + (theme ? '-' + (theme === 'light' ? 'day' : 'night') : '');
const WORD = { en: 'World glow', de: 'Weltleuchten', es: 'Brillo del mundo' };
const MISS = { en: 'missing', de: 'fehlt', es: 'falta' };
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
        const api = await P.evaluate(() => { try { const p = window.LowiMistyPeak && window.LowiMistyPeak.now(); return p ? { pct: p.pct, missing: p.missing, peak: p.peak } : null; } catch (e) { return { err: String(e) }; } });
        ok(!!api && api.pct != null, 'World glow reading works (' + JSON.stringify(api) + ')');
        const opened = await P.evaluate(() => { try { return !!(window.LowiMistyHub && window.LowiMistyHub.open && window.LowiMistyHub.open()); } catch (e) { return false; } });
        await H.sleep(1500);
        ok(opened, 'Misty sheet opens');
        const m = await P.evaluate(() => {
            const h = document.querySelector('#mistyHub'); if (!h) return null;
            const c = h.querySelector('#mistyPeak'); if (!c) return { card: false };
            const head = h.querySelector('header'), doors = h.querySelector('.mh-doors');
            const vw = innerWidth, wide = [...h.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > vw + 1; }).length;
            const rect = c.getBoundingClientRect();
            return {
                card: true, title: c.querySelector('.mp-head h3').textContent.trim(), pct: +c.querySelector('.mp-pct').textContent.replace(/\D/g, ''),
                sub: c.querySelector('.mp-sub').textContent, rows: c.querySelectorAll('.mp-list li').length, open: c.querySelectorAll('.mp-list li[data-done="0"] button').length,
                afterHead: !!(head && head.compareDocumentPosition(c) & 4), beforeDoors: !!(doors && c.compareDocumentPosition(doors) & 4),
                gap: Math.round(rect.top - head.getBoundingClientRect().bottom), wide, sw: document.documentElement.scrollWidth > vw + 1,
                power: !!h.querySelector('.ms-power'), mood: !!h.querySelector('.mh-mood, [data-mh="mood"]'), journal: !!h.querySelector('[data-mh="journal"]'),
                tag: ((document.querySelector('#spBubble .sp-bubble-name') || {}).textContent || '')
            };
        });
        ok(!!m && m.card, 'World glow card in the sheet');
        if (m && m.card) {
            ok(m.title === WORD[lang] || m.title === 'Supernova', 'title in the app language (' + m.title + ')');
            ok(m.afterHead && m.beforeDoors, 'right under her name, above Forms and Glow');
            ok(m.gap >= 0 && m.gap <= 24, 'first thing under her name, the first thing you see when you pull the sheet up (gap ' + m.gap + ' px)');
            ok(m.rows >= 6, 'checklist rows (' + m.rows + ')');
            ok(m.pct < 100 && m.open >= 1 && new RegExp(MISS[lang] + '|Supernova', 'i').test(m.sub + ' ' + (lang === 'en' ? 'missing' : '')), 'not 100% while things are missing (' + m.pct + '%, ' + m.open + ' open, "' + m.sub + '")');
            ok(!/\b100\s?%/.test(m.tag), 'name tag never says 100% while held (' + m.tag.trim() + ')');
            ok(!m.power && !m.mood && !m.journal, 'no Hunt power row, mood card or Food journal back');
            ok(m.wide === 0 && !m.sw, 'nothing wider than the screen (' + m.wide + ')');
        }
        /* a missing row taps through: the sheet closes */
        await P.evaluate(() => { const b = document.querySelector('#mistyPeak .mp-list li[data-done="0"] button'); b && b.click(); }); await H.sleep(1600);
        const closed = await P.evaluate(() => { const h = document.querySelector('#mistyHub'); const ov = h && h.closest('.r2-ov'); return !h || !ov || ov.classList.contains('off') || getComputedStyle(ov).display === 'none'; });
        ok(closed, 'a missing row closes the sheet and goes to its place');
        const errs = R.errs.filter(e => !/supabase|realtime|websocket/i.test(e.m));
        ok(errs.length === 0, 'no page errors (' + errs.length + ')'); if (errs.length) console.log(JSON.stringify(errs.slice(0, 4)).slice(0, 1200));
    } catch (e) { ok(false, e.message.slice(0, 300)); } finally { await R.close(); }
    console.log(bad ? 'RESULT FAIL ' + bad : 'RESULT PASS');
    process.exit(bad ? 1 : 0);
})();
