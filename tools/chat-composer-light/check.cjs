'use strict';
/* Oct 24 2026 (Emmanuel: in day mode he can't see what he types in the chat room). Opens Community > Chat with the theme set to
   light (and dark for comparison), taps the message field, types, and reads what WebKit/Chromium actually paint: the glyph colour
   is -webkit-text-fill-color when it is set, not color. Passes when typed text and placeholder have at least 4.5:1 contrast
   on the field's own fill in both themes, and focus stays in the field.
   node tools/chat-composer-light/check.cjs [webkit|chromium] [url|root] */
const H = require('../sim/harness.cjs');
const engine = process.argv[2] || 'webkit', where = process.argv[3] || '';
function parse(c) { const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; }
function over(f, b) { return { r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 }; }
function lum(c) { const t = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * t(c.r) + .7152 * t(c.g) + .0722 * t(c.b); }
function ratio(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
(async () => {
    const out = [], bad = [];
    for (const theme of ['light', 'dark']) {
        const o = { device: 'iPhone 13', engine, members: 12, messages: 30, probe: false, lang: 'en', viewport: { width: 390, height: 844 } };
        if (/^https?:/.test(where)) o.url = where; else if (where) o.root = where;
        const R = await H.open(o), P = R.page;
        if (engine === 'webkit') await P.setViewportSize({ width: 390, height: 844 });
        await R.ctx.addInitScript(([t]) => { try { localStorage.setItem('lowi.theme', t); } catch (e) { } }, [theme]);
        await R.goto(); await H.sleep(5000);
        await P.evaluate(() => goTab('foryou')); await H.sleep(900);
        await R.tap('#cmPaneChat .rm-tab[data-rm="chat"]').catch(() => { }); await H.sleep(1800);
        const read = (state) => P.evaluate((state) => {
            const t = document.getElementById('cmInput'); if (!t) return { state, missing: true };
            const s = getComputedStyle(t), ph = getComputedStyle(t, '::placeholder'), pane = document.getElementById('cmPaneChat');
            let host = t.parentElement, under = 'rgb(255, 255, 255)';
            while (host) { const b = getComputedStyle(host).backgroundColor; if (b && !/rgba\(0, 0, 0, 0\)|transparent/.test(b)) { under = b; break; } host = host.parentElement; }
            return { state, theme: document.documentElement.getAttribute('data-theme'), room: !!(pane && pane.hasAttribute('data-room')),
                color: s.color, fill: s.webkitTextFillColor, bg: s.backgroundColor, under, caret: s.caretColor,
                phFill: ph.webkitTextFillColor, phColor: ph.color, focused: document.activeElement === t, value: t.value };
        }, state);
        out.push(await read('empty'));
        await R.tap('#cmInput'); await H.sleep(500); out.push(await read('focused'));
        await P.keyboard.type('Readable in day mode', { delay: 20 }); await H.sleep(500);
        const typing = await read('typing'); out.push(typing);
        await R.shot('/tmp/hunt/composer-' + theme + '-' + engine + '.png');
        for (const r of out.filter(x => x.theme === theme || (x.theme == null && theme))) {
            if (r.missing) { bad.push(theme + ' ' + r.state + ': no #cmInput'); continue; }
            const base = parse(r.under) || { r: 255, g: 255, b: 255, a: 1 }, field = over(parse(r.bg) || { r: 0, g: 0, b: 0, a: 0 }, base);
            const glyph = parse(r.fill && r.fill !== 'rgba(0, 0, 0, 0)' ? r.fill : r.color), phg = parse(r.phFill && r.phFill !== 'rgba(0, 0, 0, 0)' ? r.phFill : r.phColor);
            r.textRatio = +ratio(over(glyph, field), field).toFixed(2); r.phRatio = phg ? +ratio(over(phg, field), field).toFixed(2) : null;
            if (r.textRatio < 4.5) bad.push(theme + ' ' + r.state + ': text contrast ' + r.textRatio + ' (fill ' + r.fill + ' on ' + r.bg + ')');
            if (r.state === 'empty' && r.phRatio != null && r.phRatio < 3) bad.push(theme + ' placeholder contrast ' + r.phRatio);
        }
        if (!typing.focused) bad.push(theme + ': focus left the field while typing');
        if (typing.value !== 'Readable in day mode') bad.push(theme + ': typed text did not land in the field');
        if (R.errs.length) bad.push(theme + ': page errors ' + JSON.stringify(R.errs.slice(0, 3)));
        await R.close();
    }
    console.log(JSON.stringify(out, null, 1));
    console.log(JSON.stringify({ engine, pass: !bad.length, bad }));
    process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error('BROKEN', e && e.stack || e); process.exit(2); });
