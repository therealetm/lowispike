/* Feedback layout check without looking at pictures: in Dark (true black), Night and Day, at iPhone SE / 13 / Pro Max widths, the
   send sheet (empty, with 8 screenshots, recording) and the inbox must not overflow sideways, keep every control inside the screen,
   and keep text contrast at WCAG AA (4.5:1, 3:1 for 18 px+ bold). Usage: node tools/feedback/layout.cjs */
'use strict';
const H = require('../sim/harness.cjs');
const bad = [], ok = [];
const check = (c, m) => { (c ? ok : bad).push(m); console.log((c ? 'ok   ' : 'FAIL ') + m); };

const AUDIT = () => {
    const lum = c => { const m = c.match(/[\d.]+/g); if (!m) return null; const [r, g, b] = m.slice(0, 3).map(x => { x = +x / 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return { L: .2126 * r + .7152 * g + .0722 * b, a: m[3] == null ? 1 : +m[3] }; };
    const parse = c => (c.match(/[\d.]+/g) || []).map(Number);
    /* effective background: blend translucent layers up to the panel over black (the page behind is dimmed) */
    const bgOf = el => {
        const layers = [];
        for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
            const c = parse(getComputedStyle(e).backgroundColor); if (c.length >= 3 && (c[3] == null || c[3] > 0)) layers.push(c);
            if (e.classList.contains('fbk-panel')) break;
        }
        let base = [0, 0, 0];
        for (let i = layers.length - 1; i >= 0; i--) { const [r, g, b, a = 1] = layers[i]; base = [r * a + base[0] * (1 - a), g * a + base[1] * (1 - a), b * a + base[2] * (1 - a)]; }
        return base;
    };
    const L = rgb => { const [r, g, b] = rgb.map(x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return .2126 * r + .7152 * g + .0722 * b; };
    const out = { overflow: 0, outside: [], low: [] };
    const ov = document.querySelector('.fbk-ov'); if (!ov) return { missing: true };
    const body = ov.querySelector('.fbk-body');
    out.overflow = body.scrollWidth - body.clientWidth;
    const vw = innerWidth;
    ov.querySelectorAll('button, input, textarea, .fbk-view').forEach(e => { if (!e.offsetParent || e.closest('.fbk-strip')) return; /* the strip scrolls sideways on purpose */ const r = e.getBoundingClientRect(); if (r.left < -1 || r.right > vw + 1) out.outside.push((e.getAttribute('data-fbk') || e.className || e.tagName) + ' ' + Math.round(r.left) + '..' + Math.round(r.right)); });
    const walker = document.createTreeWalker(ov, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    while (walker.nextNode()) {
        const n = walker.currentNode, el = n.parentElement;
        if (!n.textContent.trim() || !el.offsetParent || seen.has(el)) continue;
        seen.add(el);
        const cs = getComputedStyle(el);
        if (el.closest('.fbk-slide figcaption, .fbk-th b, .fbk-tn b')) continue; /* on-picture badges: white on black */
        let fg = parse(cs.color); const op = +cs.opacity * (el.closest('[disabled]') ? 0 : 1);
        if (el.closest('button:disabled')) continue;
        const bg = bgOf(el);
        const a = fg[3] == null ? 1 : fg[3];
        fg = [fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a)];
        const l1 = L(fg), l2 = L(bg), ratio = (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05);
        const big = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.5 && +cs.fontWeight >= 700);
        if (ratio < (big ? 3 : 4.5)) out.low.push(n.textContent.trim().slice(0, 30) + ' ' + ratio.toFixed(2));
    }
    return out;
};

(async () => {
    for (const vp of [{ width: 320, height: 568, n: 'SE1' }, { width: 390, height: 844, n: '13' }, { width: 430, height: 932, n: 'ProMax' }]) {
        const R = await H.open({ engine: 'chromium', lang: 'de', viewport: { width: vp.width, height: vp.height } });
        const P = R.page, ev = (f, a) => P.evaluate(f, a);
        try {
            await R.goto(); await H.sleep(1200);
            await ev(() => { try { LowiLang.set('de'); } catch (e) { } document.querySelectorAll('.r2-ov').forEach(o => o.remove()); });
            for (const look of ['black', 'night', 'light']) {
                await ev(look => {
                    const h = document.documentElement;
                    if (look === 'light') { h.setAttribute('data-theme', 'light'); h.removeAttribute('data-black'); }
                    else { h.setAttribute('data-theme', 'dark'); if (look === 'black') h.setAttribute('data-black', ''); else h.removeAttribute('data-black'); }
                    window.LowiFeedback.open();
                }, look);
                await H.sleep(300);
                let a = await ev(AUDIT);
                check(!a.overflow && !a.outside.length && !a.low.length, vp.n + ' ' + look + ' send sheet: no sideways overflow, all controls on screen, text contrast AA' + (a.overflow || a.outside.length || a.low.length ? ' ' + JSON.stringify(a) : ''));
                /* with 8 screenshots */
                await ev(() => window.LowiFeedback.open());
                await P.setInputFiles('#fbkFile', Array.from({ length: 8 }, (_, i) => ({ name: 's' + i + '.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') })));
                await P.waitForFunction(() => document.querySelectorAll('.fbk-slide').length === 8, null, { timeout: 60000 }).catch(() => { });
                a = await ev(AUDIT);
                check(!a.overflow && !a.outside.length && !a.low.length, vp.n + ' ' + look + ' with 8 screenshots: same checks' + (a.overflow || a.outside.length || a.low.length ? ' ' + JSON.stringify(a) : ''));
                await ev(() => { const v = document.querySelector('.fbk-view'); if (v) v.scrollLeft = 0; window.LowiFeedback._S.cur = 0; const b = document.querySelector('.fbk-body'); if (b) b.scrollTop = 0; });
                await H.sleep(200);
                const fit = await ev(() => { const v = document.querySelector('.fbk-view'), r = document.querySelector('.fbk-rec'); if (!v || !r) return { v: -1, recBottom: 1e4, vh: innerHeight, n: document.querySelectorAll('.fbk-slide').length }; return { v: Math.round(v.getBoundingClientRect().height), recBottom: Math.round(r.getBoundingClientRect().bottom), vh: innerHeight }; });
                check(fit.recBottom <= fit.vh + 1, vp.n + ' ' + look + ' screenshot viewer (' + fit.v + ' px) and the Record button fit on one screen (button ends at ' + fit.recBottom + ' of ' + fit.vh + ')');
                /* recording state: Stop stays on screen while the viewer is in view */
                await ev(() => { document.querySelector('.fbk-ov').classList.add('is-rec'); });
                const st = await ev(() => { const v = document.querySelector('.fbk-view').getBoundingClientRect(), r = document.querySelector('.fbk-voice').getBoundingClientRect(); return { vTop: Math.round(v.top), rBottom: Math.round(r.bottom), vh: innerHeight }; });
                check(st.vTop >= 0 && st.rBottom <= st.vh + 1, vp.n + ' ' + look + ' while recording: viewer and the voice bar both on screen (' + JSON.stringify(st) + ')');
                await ev(() => { window.LowiFeedback._S.shots = []; document.querySelector('.fbk-ov').remove(); });
                /* inbox look (empty, as the non-owner sees nothing anyway): render a card list directly */
                await ev(() => { window.LowiOwnerAdmin = Object.assign({}, window.LowiOwnerAdmin, { isOwner: () => true }); window.LOWI_CLOUD_X = null; window.LowiFeedback.openInbox(); });
                await H.sleep(300);
                await ev(() => { const I = window.LowiFeedback._I; I.err = ''; I.rows = [{ id: '1a2b3c4d-0000-4000-8000-000000000000', created_at: new Date().toISOString(), name: 'Tester', message: 'Langer Text '.repeat(30), voice_path: 'fb/abcdefgh12/voice.m4a', voice_secs: 30, transcript: 'Transkript '.repeat(20), shots: [], status: 'new', lang: 'de', app_version: '20261105' }]; });
                await ev(() => { const I = window.LowiFeedback._I; I.sel.add(I.rows[0].id); document.querySelector('[data-fbk="fall"]') ? document.querySelector('[data-fbk="fall"]').click() : 0; });
                await H.sleep(200);
                a = await ev(AUDIT);
                check(!a.overflow && !a.outside.length && !a.low.length, vp.n + ' ' + look + ' inbox: same checks' + (a.overflow || a.outside.length || a.low.length ? ' ' + JSON.stringify(a) : ''));
                await ev(() => document.querySelector('.fbk-ov').remove());
            }
            check(!R.errs.length, vp.n + ' no page errors' + (R.errs.length ? ' ' + JSON.stringify(R.errs.slice(0, 3)) : ''));
        } catch (e) { check(false, vp.n + ' threw ' + (e && e.stack || e)); }
        await R.close();
    }
    console.log('\n' + ok.length + ' ok, ' + bad.length + ' failed');
    process.exit(bad.length ? 1 : 0);
})();
