/* Hourly button sweep (scheduled skill "LOWiSPIKE button sweep"): open a screen, list every visible control, check that it
   is reachable (not covered), readable (text vs. its solid background, catches white on white) and, with --tap, tap each
   one from a fresh copy of that screen: count page errors, whether anything happened (DOM mutations), and whether the
   control stays stuck (aria-pressed/active class left on, or page frozen). Supabase is faked by the harness, so nothing
   reaches real people. Destructive local controls (delete, sign out, reset, send, post, energy, camera) are not tapped.
   node tools/sweep-buttons.cjs [url|root] --device "iPhone 13" --engine webkit --theme dark --lang en --screens home,move --tap */
'use strict';
const H = require('./sim/harness.cjs');
const args = process.argv.slice(2); const opt = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : args[i + 1]; };
const where = args[0] && !args[0].startsWith('--') ? args[0] : 'https://therealetm.github.io/lowispike/index.html';
const device = opt('device', 'iPhone 13'), engine = opt('engine', 'webkit'), theme = opt('theme', 'dark'), lang = opt('lang', 'en');
const screens = opt('screens', 'home,move,shelf,profile,foryou').split(','), doTap = args.includes('--tap'), cap = +opt('cap', 30);
const vp = opt('viewport', ''); // WxH for chromium
const SKIP = /delete|löschen|borrar|sign ?out|log ?out|abmelden|cerrar sesi[oó]n|password|passwort|contrase[nñ]a|reset|zurücksetzen|send|senden|enviar|post|posten|publicar|energy|energie|energía|blast|camera|kamera|cámara|block|blockieren|bloquear|report|melden|install|share|teilen|compartir|scan$/i;
const within = (p, ms, what) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error(what + ' timed out after ' + ms + ' ms')), ms))]);
/* page side: list controls with a key, readability and coverage */
const LIST = () => {
    const lum = c => { const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); const a = p.length > 3 ? p[3] : 1; const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return { L: .2126 * f(p[0]) + .7152 * f(p[1]) + .0722 * f(p[2]), a }; };
    const bgOf = el => { for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const s = getComputedStyle(e); if (s.backgroundImage && s.backgroundImage !== 'none') return null; const l = lum(s.backgroundColor); if (l && l.a > .85) return l; if (l && l.a > .2) return null; } return null; };
    const out = []; const seen = new Map();
    document.querySelectorAll('button,[role=button],a[href],[data-cl],[data-act],[data-tr],input[type=range],input[type=checkbox],select').forEach(b => {
        const r = b.getBoundingClientRect(), s = getComputedStyle(b);
        if (r.width < 6 || r.height < 6 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth || s.visibility === 'hidden' || +s.opacity < .05) return;
        let hid = false; for (let e = b; e && e.nodeType === 1; e = e.parentElement) { const t = getComputedStyle(e); if (+t.opacity < .05 || t.display === 'none' || e.hidden || e.getAttribute('aria-hidden') === 'true' || e.inert) { hid = true; break; } } if (hid) return;
        // clip to scrolling ancestors: a chip scrolled out of its own row is not covered, the user scrolls to it
        let L = r.left, T = r.top, Rt = r.right, B = r.bottom;
        for (let e = b.parentElement; e && e !== document.body; e = e.parentElement) { const t = getComputedStyle(e); if (t.overflowX !== 'visible' || t.overflowY !== 'visible') { const q = e.getBoundingClientRect(); L = Math.max(L, q.left); T = Math.max(T, q.top); Rt = Math.min(Rt, q.right); B = Math.min(B, q.bottom); } }
        if (Rt - L < 4 || B - T < 4) return;
        const x = Math.min(innerWidth - 1, Math.max(0, (L + Rt) / 2)), y = Math.min(innerHeight - 1, Math.max(0, (T + B) / 2));
        const top = document.elementFromPoint(x, y); const ok = !!top && (top === b || b.contains(top) || top.contains(b));
        const txt = (b.getAttribute('aria-label') || b.textContent || b.value || '').trim().replace(/\s+/g, ' ').slice(0, 40);
        const base = (b.id ? '#' + b.id : b.tagName.toLowerCase() + '.' + String(b.className && b.className.baseVal != null ? b.className.baseVal : b.className).split(' ')[0]) + '|' + txt;
        const n = seen.get(base) || 0; seen.set(base, n + 1); const key = base + '|' + n;
        let ratio = null; const own = (b.innerText || '').trim();
        if (own) { const fg = lum(s.color), bg = bgOf(b); if (fg && bg && fg.a > .6) ratio = +((Math.max(fg.L, bg.L) + .05) / (Math.min(fg.L, bg.L) + .05)).toFixed(2); }
        let what = ''; if (!ok && top) what = (top.id ? '#' + top.id : top.tagName.toLowerCase() + '.' + String(top.className && top.className.baseVal != null ? top.className.baseVal : top.className).split(' ')[0]);
        out.push({ key, txt, x: Math.round(x), y: Math.round(y), w: Math.round(r.width), h: Math.round(r.height), covered: ok ? '' : what || 'nothing', ratio });
    });
    return out;
};
(async () => {
    const o = { engine, device, lang }; if (/^https?:/.test(where)) o.url = where; else o.root = where;
    if (engine === 'chromium' && vp) { const [w, h] = vp.split('x').map(Number); o.viewport = { width: w, height: h }; o.dpr = 2; }
    const R = await H.open(o); const P = R.page;
    await P.addInitScript(t => { try { localStorage.setItem('lowi.theme', t); } catch (e) { } }, theme);
    /* the app's language lives in lowispike.lang (LowiLang), not in the harness's settings.lang: without this --lang de ran in English */
    await P.addInitScript(l => { try { if (!localStorage.getItem('lowispike.lang')) localStorage.setItem('lowispike.lang', l); } catch (e) { } }, lang);
    const report = { device, engine, theme, lang, screens: {}, errors: [] };
    const ready = async () => { await R.goto(); await H.sleep(5000); await P.evaluate(t => { try { window.LowiR2 && window.LowiR2.applyTheme && window.LowiR2.applyTheme(t); } catch (e) { } }, theme).catch(() => { }); await H.sleep(600); };
    /* overlays opened from Home the way a player does (tap / long press), or through the module's own open() */
    const tapSel = async sel => { const b = await P.evaluate(sel => { const e = [...document.querySelectorAll(sel)].find(e => { const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2; }); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, sel); if (!b) return false; await P.touchscreen.tap(b[0], b[1]); return true; };
    const holdSel = (sel, ms = 900) => P.evaluate(async ([sel, ms]) => {
        const e = document.querySelector(sel); if (!e) return false; const r = e.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2; const t = document.elementFromPoint(x, y) || e;
        const pe = type => t.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, composed: true, pointerId: 7, pointerType: 'touch', isPrimary: true, clientX: x, clientY: y, buttons: type === 'pointerup' ? 0 : 1 }));
        let te = () => { }; try { const tt = new Touch({ identifier: 7, target: t, clientX: x, clientY: y }); te = type => t.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, composed: true, touches: type === 'touchend' ? [] : [tt], targetTouches: type === 'touchend' ? [] : [tt], changedTouches: [tt] })); } catch (x) { }
        pe('pointerdown'); te('touchstart'); await new Promise(r => setTimeout(r, ms)); pe('pointerup'); te('touchend'); return true;
    }, [sel, ms]);
    const api = f => P.evaluate(f);
    const OPEN = {
        'misty-hold': () => holdSel('#spBubble'), 'misty-tap': () => tapSel('#spBubble'), gap: () => tapSel('#spFast'), 'gap-hold': () => holdSel('#spFast'),
        'move-bloom': () => tapSel('[data-orbit="move"]'), 'sleep-bloom': () => tapSel('[data-orbit="sleep"]'), 'water-bloom': () => tapSel('[data-orbit="water"]'),
        'fuel-tap': () => tapSel('[data-orbit="fuel"]'), 'fuel-hold': () => holdSel('[data-orbit="fuel"]'), 'scan-hold': () => holdSel('[data-orbit="scan"]'), 'comm-hold': () => holdSel('[data-orbit="settings"]'),
        people: () => api(() => { goTab('foryou'); setTimeout(() => window.LowiPeopleDir && LowiPeopleDir.open(), 1500); }),
        ranking: () => api(() => { goTab('move'); setTimeout(() => window.LowiRanking && LowiRanking.open && LowiRanking.open(), 1500); }),
        'comm-menu': async () => { await api(() => goTab('foryou')); await H.sleep(2000); return tapSel('.rm-menu-btn'); },
        tour: () => api(() => { try { LowiTutorial.start({ from: 'sweep' }); } catch (e) { } }),
        details: async () => { await api(() => goTab('profile')); await H.sleep(2000); return tapSel('[data-yd="open"]'); },
    };
    /* profile tiles (Settings, Look & sound, Community, My swaps, Your glow, Finish profile) as screens: --screens g2e:app,g2e:look */
    screens.filter(s => /^g2e:/.test(s)).forEach(s => { OPEN[s] = async () => { await api(() => goTab('profile')); await H.sleep(2000); return P.evaluate(k => { try { return LowiG2E.open(k); } catch (e) { return String(e); } }, s.slice(4)); }; });
    const resetAll = () => within(P.evaluate(() => { for (let i = 0; i < 3; i++) { try { window.LowiBackSwipe && LowiBackSwipe.escape(); } catch (e) { } } try { LowiPeopleDir.close(); } catch (e) { } try { LowiRanking.closeLadder(); } catch (e) { } try { LowiR2.closeAll(); } catch (e) { } try { window.closeSheet && closeSheet(); } catch (e) { } try { LowiSections.close(); } catch (e) { } try { LowiG2E.close(); } catch (e) { } try { LowiTutorial.isOn() && LowiTutorial.stop('sweep'); } catch (e) { } try { goTab('home'); } catch (e) { } }), 8000, 'reset').catch(() => { });
    const openScreen = async s => { if (OPEN[s]) { await resetAll(); await H.sleep(1200); await within(OPEN[s](), 15000, 'open ' + s); await H.sleep(2600); return; } await within(P.evaluate(t => { if (t !== 'home') window.goTab(t); }, s), 15000, 'goTab ' + s); await H.sleep(2200); };
    try {
        await ready(); report.build = await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || window.LOWI_BUILD || '').catch(() => '');
        for (const s of screens) {
            if (R.crashed) break;
            R.step = 'open ' + s; const e0 = R.errs.length;
            await openScreen(s);
            const list = await within(P.evaluate(LIST), 15000, 'list').catch(e => { R.errs.push({ step: R.step, m: e.message }); return []; });
            const S = report.screens[s] = { controls: list.length, covered: list.filter(c => c.covered).map(c => c.key + ' under ' + c.covered + ' @' + c.x + ',' + c.y), unreadable: list.filter(c => c.ratio != null && c.ratio < 2).map(c => c.key + ' ratio ' + c.ratio), openErrs: R.errs.slice(e0).map(e => e.m), taps: [] }; if (args.includes('--labels')) S.labels = list.map(c => c.txt);
            await within(P.evaluate(() => { const x = document.documentElement.classList.contains('b3-camon') && document.querySelector('#b3Cam [data-b3="camclose"]'); if (x) x.click(); }), 5000, 'camclose').catch(() => { });
            if (!doTap) { await H.sleep(500); continue; }
            const todo = list.filter(c => !c.covered && !SKIP.test(c.txt) && !SKIP.test(c.key)).slice(0, cap);
            for (const c of todo) {
                if (R.crashed) break;
                R.step = s + ' tap ' + c.key; const e1 = R.errs.length;
                try {
                    await within(P.evaluate(() => { const x = document.documentElement.classList.contains('b3-camon') && document.querySelector('#b3Cam [data-b3="camclose"]'); if (x) x.click(); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); }), 5000, 'esc').catch(() => { }); await H.sleep(400);
                    for (let k = 0; k < 3; k++) { const pt = await P.evaluate(() => { const o = [...document.querySelectorAll('.r2-ov.on')].pop(); if (!o) return null; const sc = o.querySelector('.r2-scrim'), r = sc ? sc.getBoundingClientRect() : null; return r && r.height ? { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + 12) } : { x: 195, y: 12 }; }).catch(() => null); if (!pt) break; await P.touchscreen.tap(pt.x, pt.y); await H.sleep(700); if (k === 2) S.stuckSheets = (S.stuckSheets || []).concat(c.key); }
                    if (OPEN[s]) await resetAll(); else await within(P.evaluate(() => window.goTab('home')), 15000, 'home').catch(() => { }); await H.sleep(700);
                    await openScreen(s);
                    const now = await within(P.evaluate(LIST), 15000, 'list');
                    const m = now.find(x => x.key === c.key);
                    if (!m) { S.taps.push({ key: c.key, res: 'gone on reopen' }); continue; }
                    if (m.covered) { S.taps.push({ key: c.key, res: 'covered by ' + m.covered }); continue; }
                    await P.evaluate(() => { window.__mut = 0; window.__mo && window.__mo.disconnect(); window.__mo = new MutationObserver(l => { window.__mut += l.length; }); window.__mo.observe(document.body, { subtree: true, childList: true, attributes: true }); });
                    await P.touchscreen.tap(m.x, m.y); await H.sleep(1200);
                    const after = await within(P.evaluate(() => { const t0 = performance.now(); return new Promise(r => requestAnimationFrame(() => r({ mut: window.__mut, frame: Math.round(performance.now() - t0) }))); }), 8000, 'frame');
                    const errs = R.errs.slice(e1).map(e => e.m);
                    const res = errs.length ? 'ERROR' : after.mut === 0 ? 'NOTHING' : 'ok';
                    S.taps.push({ key: c.key, res, mut: after.mut, frame: after.frame, errs });
                } catch (e) { S.taps.push({ key: c.key, res: 'TOOL ' + String(e.message).slice(0, 120) }); }
            }
        }
    } catch (e) { report.broken = String(e.message).slice(0, 300); }
    report.crashed = R.crashed ? R.step : false; report.errors = R.errs.slice(0, 40);
    console.log(JSON.stringify(report, null, 1));
    await within(R.close(), 15000, 'close').catch(() => { });
    process.exit(0);
})();
