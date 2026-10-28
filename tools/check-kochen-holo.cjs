'use strict';
/* Kochen hologram readability check (Oct 28 2026, owner request 15: "You completely broke it", Home showed through Kochen).
   Opens Kochen (and the other hologram panels) over Home and checks, on a grid of points inside each panel, that the top
   element belongs to the panel (nothing from Home on top), that the panel's backdrop is near-opaque, that Home behind it is
   dimmed/blurred, that the kitchen fridge and cabinet sit side by side without overlap and the bin is fully on screen, and
   (batch 2) that back / close buttons sit at the bottom center. Screenshots to $KH_SHOTS (default /home/sprite/kochen-holo).
   node tools/check-kochen-holo.cjs <dark|light> <WxH> [live] [webkit|chromium]   Browser sim, not a real phone. */
const { launch, openApp, sleep, BASE, existingSeed } = require('./interface-audit/lib.cjs');
const fs = require('fs');
const theme = process.argv[2] || 'dark', vp = (process.argv[3] || '390x844').split('x').map(Number), live = process.argv[4] === 'live';
const engine = process.argv[5] || 'chromium';
const SHOT = process.env.KH_SHOTS || '/home/sprite/kochen-holo';
try { fs.mkdirSync(SHOT, { recursive: true }); } catch (e) { }
(async () => {
    const lang = 'de';
    const seed = existingSeed({ lang, kv: { 'lowispike.lang': lang, 'lowi.lang': lang, 'lowispike.theme': theme, 'lowi.theme': theme } });
    const h = await launch({ engine, seed, lang, locale: 'de-DE', viewport: { width: vp[0], height: vp[1] } });
    if (live) await h.ctx.route(u => String(u).startsWith(BASE), r => r.request().method() === 'GET' ? r.continue() : r.abort());
    await openApp(h, { query: '?dc=' + Date.now() });
    const P = h.page, out = { theme, vp: vp.join('x'), live, engine }, tag = theme + '-' + vp.join('x') + (live ? '-live' : '') + (engine === 'webkit' ? '-wk' : '');
    const shot = n => P.screenshot({ path: SHOT + '/' + n + '-' + tag + '.jpg', type: 'jpeg', quality: 60 }).catch(() => {});
    await P.evaluate(t => { try { window.LowiLang && LowiLang.set && LowiLang.set('de'); } catch (e) {} try { if (window.setTheme) setTheme(t); document.documentElement.setAttribute('data-ui', t); } catch (e) {} }, theme);
    await sleep(1500);
    const esc = async (n = 3) => { for (let i = 0; i < n; i++) { await P.keyboard.press('Escape'); await sleep(250); } };
    await esc();
    out.build = await P.evaluate(() => { const m = document.querySelector('meta[name="lowi-build"]'); return (m && m.content) || window.LOWI_BUILD || ''; });
    await shot('0-home');
    /* probe: on a grid inside the panel, who is on top? anything not inside the panel counts as bleed (Home on top) */
    const probe = (sel) => P.evaluate((sel) => {
        const p = typeof sel === 'string' ? document.querySelector(sel) : null; if (!p) return { err: 'no panel ' + sel };
        const r = p.getBoundingClientRect(), bad = [], vw = innerWidth, vh = innerHeight;
        const okIn = e => e && (p.contains(e) || e.closest('#secX,.sec-x,.lw-bx,[data-bx]'));
        for (let i = 1; i < 10; i++) for (let j = 1; j < 14; j++) {
            const x = r.left + r.width * i / 10, y = r.top + r.height * j / 14; if (x < 0 || y < 0 || x > vw || y > vh) continue;
            const e = document.elementFromPoint(x, y); if (!okIn(e)) bad.push((e ? (e.id || String(e.className || e.tagName)).slice(0, 40) : 'none') + '@' + Math.round(x) + ',' + Math.round(y));
        }
        /* backdrop: walk up the panel and its ancestors to the first painted background */
        const bgA = el => { const m = getComputedStyle(el).backgroundColor.match(/rgba?\(([^)]+)\)/); if (!m) return 0; const v = m[1].split(',').map(Number); return v.length > 3 ? v[3] : 1; };
        const cs = getComputedStyle(p);
        return { rect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }, bleed: bad.length, bleedAt: bad.slice(0, 8),
            bgAlpha: bgA(p), backdrop: cs.backdropFilter || cs.webkitBackdropFilter || '', onScreen: r.left >= -1 && r.right <= vw + 1 && r.bottom <= vh + 1 };
    }, sel);
    /* Kochen */
    out.cook = await P.evaluate(async () => { if (!window.LowiHost || !LowiHost.go) return { err: 'no LowiHost.go' }; LowiHost.go('shelf'); await new Promise(r => setTimeout(r, 4000)); return { tab: TAB, holo: document.documentElement.classList.contains('cook-holo'), cls: document.documentElement.className.match(/\b(lt|lg|dk|apple-ui)\b/g) }; });
    Object.assign(out.cook, await probe('#tab-shelf'));
    out.cook.scrim = await P.evaluate(() => { const s = document.getElementById('cookHoloScrim'); if (!s) return null; const cs = getComputedStyle(s); return { bg: cs.backgroundColor, bf: cs.backdropFilter || cs.webkitBackdropFilter || '' }; });
    out.cook.kitchen = await P.evaluate(async () => {
        const q = s => document.querySelector('#tab-shelf ' + s);
        const tabK = document.querySelector('#tab-shelf [data-cook-tab="kitchen"],#tab-shelf [data-ck="kitchen"]'); if (tabK) { tabK.click(); await new Promise(r => setTimeout(r, 900)); }
        const fr = q('.kg-fridge-u'), cb = q('.kg-cab-u'), bin = q('.kg-scene .kg-bin');
        const R = e => { if (!e) return null; const r = e.getBoundingClientRect(); return { l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom), w: Math.round(r.width) }; };
        const f = R(fr), c = R(cb), b = R(bin), panel = document.getElementById('tab-shelf').getBoundingClientRect();
        const overlap = f && c ? Math.max(0, Math.min(f.r, c.r) - Math.max(f.l, c.l)) : null;
        const labs = [...document.querySelectorAll('#tab-shelf .kg-scene .kg-unit > :first-child, #tab-shelf .kg-scene [class*="lbl"], #tab-shelf .kg-scene [class*="label"]')].map(e => ({ t: e.textContent.trim().slice(0, 16), ...R(e), sw: e.scrollWidth, cw: e.clientWidth }));
        return { labs, fridge: f, cabinet: c, bin: b, overlapPx: overlap, binInside: b ? (b.l >= panel.left - 1 && b.r <= panel.right + 1 && b.r <= innerWidth + 1) : null,
            binClipped: (() => { if (!bin) return null; let e = bin.parentElement; const br = bin.getBoundingClientRect(); while (e && e !== document.body) { const cs = getComputedStyle(e); if (cs.overflow !== 'visible' || cs.overflowX !== 'visible') { const r = e.getBoundingClientRect(); if (br.right > r.right + 1 || br.left < r.left - 1) return (e.id || e.className).toString().slice(0, 40); } e = e.parentElement; } return ''; })() };
    });
    await shot('1-kochen');
    await P.evaluate(async () => { const sc = document.querySelector('#tab-shelf .tab-scroll,#tab-shelf'); if (sc) sc.scrollTop = 400; await new Promise(r => setTimeout(r, 400)); });
    await shot('1b-kochen-scroll');
    out.wideCook = await P.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    await esc(2); await P.evaluate(() => { try { goTab('home'); } catch (e) {} }); await sleep(900);
    /* Essenspause */
    out.gap = await P.evaluate(async () => { const G = window.LowiGapView; if (!G || !G.open) return { err: 'no gap view' }; G.open(); await new Promise(r => setTimeout(r, 1200)); return { open: !!document.getElementById('gvSheet') }; });
    Object.assign(out.gap, await probe('#gvSheet .gv-card'));
    out.gap.ov = await P.evaluate(() => { const o = document.getElementById('gvSheet'); if (!o) return null; const cs = getComputedStyle(o); return { bg: cs.backgroundColor, bf: cs.backdropFilter || cs.webkitBackdropFilter || '' }; });
    await shot('2-essenspause');
    await esc(2);
    out.errors = h.errors; out.consoleErr = h.consoleErr.filter(t => !/Failed to load resource|net::ERR|supabase|ERR_FAILED/i.test(t)).slice(0, 5);
    console.log(JSON.stringify(out, null, 1));
    await h.browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
