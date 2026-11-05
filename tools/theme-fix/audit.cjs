'use strict';
/* Nov 5 2026: phone-sized look audit per screen and theme. For every visible text it finds the colour it sits on (the nearest solid
   background up the tree) and the WCAG contrast; it also lists big dark (navy/black) panels in Day and blue-leaning panels in Dark,
   and anything wider than the screen. Screenshots of each screen. node tools/theme-fix/audit.cjs <dir> <out> [day|black|night] */
const L = require(process.env.LIB || '/home/sprite/BUGHUNT/playtest/lib.cjs');
const path = require('path'), fs = require('fs');
(async () => {
    const dir = process.argv[2] || '.', out = process.argv[3] || '/tmp/theme-audit', look = process.argv[4] || 'day';
    fs.mkdirSync(out, { recursive: true });
    const srv = await L.serve(path.resolve(dir)); const url = 'http://127.0.0.1:' + srv.address().port + '/';
    const pre = `try{if(!sessionStorage.getItem('tfInit')){sessionStorage.setItem('tfInit','1');localStorage.setItem('lowi.tutorial.v1',JSON.stringify({done:true}));localStorage.setItem('lowi.theme',${JSON.stringify(look === 'day' ? 'light' : 'dark')});localStorage.setItem('lowi.atmos',JSON.stringify({mode:'manual',p:${look === 'day' ? 25 : 100}}));localStorage.setItem('lowi.theme.dark',${JSON.stringify(look === 'night' ? 'night' : 'black')});localStorage.setItem('lowi.theme.dark.fix1','1');}}catch(e){}`;
    const h = await L.open({ view: process.env.VIEW || 'chromium390', url, settle: 8000, lang: 'de', preInit: pre });
    const p = h.page, report = {};
    const audit = () => p.evaluate(() => {
        const lum = c => { const m = c.match(/[\d.]+/g); if (!m) return null; const [r, g, b] = m.slice(0, 3).map(v => { v = v / 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return { L: .2126 * r + .7152 * g + .0722 * b, a: m[3] === undefined ? 1 : +m[3], rgb: m.slice(0, 3).map(Number) }; };
        const bgOf = el => { for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const c = getComputedStyle(e); const l = lum(c.backgroundColor); if (l && l.a > .6) return { l, e }; if (c.backgroundImage && c.backgroundImage !== 'none' && /gradient/.test(c.backgroundImage)) { const m = c.backgroundImage.match(/rgba?\([^)]+\)/); if (m) { const g = lum(m[0]); if (g && g.a > .6) return { l: g, e }; } } } return { l: lum(getComputedStyle(document.body).backgroundColor), e: document.body }; };
        const vw = innerWidth, vh = innerHeight, bad = [], seen = new Set();
        const isVis = e => { const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) return false; for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const c = getComputedStyle(x); if (c.display === 'none' || c.visibility === 'hidden' || +c.opacity < .05) return false; } return true; };
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n, count = 0;
        while ((n = walker.nextNode())) { const t = n.textContent.trim(); if (t.length < 2) continue; const e = n.parentElement; if (!e || seen.has(e) || !isVis(e)) continue; seen.add(e); count++;
            const c = getComputedStyle(e), fg = lum(c.color), bg = bgOf(e); if (!fg || !bg.l) continue;
            const ratio = (Math.max(fg.L, bg.l.L) + .05) / (Math.min(fg.L, bg.l.L) + .05) * (fg.a < 1 ? fg.a : 1);
            const big = parseFloat(c.fontSize) >= 24 || (parseFloat(c.fontSize) >= 18.6 && +c.fontWeight >= 700);
            if (ratio < (big ? 3 : 4.5)) bad.push({ t: t.slice(0, 32), r: +ratio.toFixed(2), fg: c.color, bg: getComputedStyle(bg.e).backgroundColor, sel: e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.split(/\s+/).slice(0, 2).join('.') : ''), on: bg.e.tagName.toLowerCase() + (typeof bg.e.className === 'string' && bg.e.className ? '.' + bg.e.className.split(/\s+/)[0] : '') + (bg.e.id ? '#' + bg.e.id : '') }); }
        const panels = []; for (const e of document.querySelectorAll('body *')) { const r = e.getBoundingClientRect(); if (r.width * r.height < vw * vh * .08 || !isVis(e)) continue; const l = lum(getComputedStyle(e).backgroundColor); if (!l || l.a < .6) continue; const [R, G, B] = l.rgb; panels.push({ sel: e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.split(/\s+/)[0] : ''), rgb: l.rgb.join(','), a: l.a, area: Math.round(r.width * r.height / (vw * vh) * 100), blue: B > R + 8 && B >= G }); }
        const wide = [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return isVis(e) && r.right > vw + 2 && r.width < vw * 3 && getComputedStyle(e).position !== 'fixed'; }).slice(0, 5).map(e => e.tagName.toLowerCase() + '.' + (typeof e.className === 'string' ? e.className.split(/\s+/)[0] : ''));
        return { theme: document.documentElement.getAttribute('data-theme'), black: document.documentElement.hasAttribute('data-black'), texts: count, lowContrast: bad.slice(0, 25), lowCount: bad.length, panels: panels.slice(0, 12), wide, scrollW: document.documentElement.scrollWidth };
    });
    const screens = [['home', null], ['shelf', 'shelf'], ['foryou', 'foryou'], ['move', 'move'], ['profile', 'profile'], ['settings', 'settings'], ['koerperklang', 'kk'], ['sky', 'sky'], ['scan', 'scan']];
    for (const [name, tab] of screens) {
        try {
            await p.evaluate(() => { try { window.LowiCommunityMe && LowiCommunityMe.close(); } catch (e) { } document.querySelectorAll('.atm-ov').forEach(o => o.remove()); });
            if (tab === 'settings') { await p.evaluate(() => { try { goTab('foryou'); } catch (e) { } }); await L.sleep(900); await p.evaluate(() => LowiCommunityMe.open()); }
            else if (tab === 'kk') { await p.evaluate(() => { try { goTab('home'); } catch (e) { } }); await L.sleep(900); await p.evaluate(() => { const k = window.LowiKoerperklang || window.LowiBodySound || window.LowiKK; if (k && k.open) k.open(); else { const b = document.querySelector('[data-cme="worldSound"],#kkBtn,[data-open="koerperklang"]'); if (b) b.click(); } }); }
            else if (tab === 'sky') { await p.evaluate(() => window.LowiAtmos && LowiAtmos.openSheet()); }
            else if (tab) await p.evaluate(t => { try { goTab(t); } catch (e) { } }, tab);
            else await p.evaluate(() => { try { goTab('home'); } catch (e) { } });
            await L.sleep(2200);
            const a = await audit(); report[name] = a;
            await p.screenshot({ path: path.join(out, look + '-' + name + '.png') });
            console.log(name, a.theme, 'texts', a.texts, 'low', a.lowCount, 'wide', a.wide.length, 'scrollW', a.scrollW);
        } catch (e) { console.log(name, 'ERR', e.message); }
    }
    fs.writeFileSync(path.join(out, look + '-audit.json'), JSON.stringify(report, null, 1));
    console.log('ERRORS', JSON.stringify(h.log.pageerror || []).slice(0, 600));
    await h.browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
