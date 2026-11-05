'use strict';
/* Koerperklang sheet contrast check (Nov 5 2026): opens the sheet from Settings and computes WCAG contrast for every visible text
   node in it against the sheet/group background it sits on. node tools/koerperklang-contrast.cjs <dark|night|light> [engine] */
const { launch, openApp, sleep, existingSeed } = require('./interface-audit/lib.cjs');
const look = process.argv[2] || 'dark', engine = process.argv[3] || 'chromium';
(async () => {
    const lang = 'de', theme = look === 'light' ? 'light' : 'dark';
    const kv = { 'lowispike.lang': lang, 'lowi.lang': lang, 'lowispike.theme': theme, 'lowi.theme': theme };
    if (look === 'night') kv['lowi.theme.dark'] = 'night'; if (look === 'dark') kv['lowi.theme.dark'] = 'black';
    const h = await launch({ engine, seed: existingSeed({ lang, kv }), lang, locale: 'de-DE', viewport: { width: 390, height: 844 } });
    await openApp(h, { query: '?dc=' + Date.now() }); const P = h.page; await sleep(2500);
    for (let i = 0; i < 3; i++) { await P.keyboard.press('Escape'); await sleep(200); }
    await P.evaluate(async () => { try { LowiCommunityMe.open(); } catch (e) { } await new Promise(r => setTimeout(r, 1400)); document.querySelector('[data-cme="worldSound"]').click(); await new Promise(r => setTimeout(r, 1600)); });
    const res = await P.evaluate(() => {
        const p = document.querySelector('.wa-panel:not(.mb-ghost)'); if (!p) return 'no sheet';
        const rgb = s => { const m = s.match(/[\d.]+/g) || []; return { r: +m[0] || 0, g: +m[1] || 0, b: +m[2] || 0, a: m[3] == null ? 1 : +m[3] }; };
        const L = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c.r) + .7152 * f(c.g) + .0722 * f(c.b); };
        const mix = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
        const bgOf = e => { const st = []; for (let a = e; a; a = a.parentElement) { const c = rgb(getComputedStyle(a).backgroundColor); if (c.a > 0) st.push(c); if (c.a >= 1) break; if (a === p) break; } let b = { r: 0, g: 0, b: 0, a: 1 }; for (let i = st.length - 1; i >= 0; i--) b = mix(st[i], b); return b; };
        const out = []; const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT); let n;
        while ((n = w.nextNode())) { const t = n.nodeValue.trim(); if (!t) continue; const e = n.parentElement, cs = getComputedStyle(e); const rg = document.createRange(); rg.selectNodeContents(n); if (!rg.getClientRects().length || cs.visibility === 'hidden') continue;
            let op = 1; for (let a = e; a && a !== p.parentElement; a = a.parentElement) op *= +getComputedStyle(a).opacity;
            const bg = bgOf(e), fg0 = rgb(cs.color), fg = mix({ ...fg0, a: fg0.a * op }, bg); const c1 = L(fg), c2 = L(bg); const cr = (Math.max(c1, c2) + .05) / (Math.min(c1, c2) + .05);
            out.push({ t: t.slice(0, 28), cls: String(e.className).slice(0, 18), px: cs.fontSize, cr: Math.round(cr * 10) / 10 }); }
        return out;
    });
    console.log(look, engine, JSON.stringify(res));
    await h.browser.close();
})().catch(e => { console.error(e); process.exit(1); });
