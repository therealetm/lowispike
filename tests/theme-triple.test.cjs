/* Oct 17 (Eman): "Triple click and then the menu bar opens. And click anywhere else and then it closes." No long press, no copy-select. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

test('the moon/sun button has no long press any more', () => {
    const tb = read('top-bar.js');
    const mount = tb.slice(tb.indexOf('function mountBtn()'), tb.indexOf('/* ---------- 3 · weather sheet'));
    assert.doesNotMatch(mount, /pointerdown/);
    assert.doesNotMatch(mount, /holdT|480\)/);
    assert.match(mount, /btn\.addEventListener\('contextmenu', e => e\.preventDefault\(\)\);/);
});

test('one tap flips at once, three quick taps open the adjuster and put the theme back', () => {
    const tb = read('top-bar.js');
    assert.match(tb, /if \(taps === 1\) \{ toggleTheme\(\); return; \}/);
    assert.match(tb, /if \(taps === 2\) \{ tapT = setTimeout\(\(\) => \{ tapT = 0; if \(taps === 2\) toggleTheme\(\); \}, TAP_GAP\); return; \}/);
    assert.match(tb, /if \(before && effective\(\) !== before\) toggleTheme\(true\);/);
    assert.match(tb, /if \(!quiet && R2 && R2\.toast\)/);
    assert.match(tb, /const TAP_GAP = 500;/);
});

test('tap counting: 1 tap = 1 flip; 2 quick taps = 2 flips; 3 quick taps = adjuster, theme unchanged', async () => {
    const tb = read('top-bar.js');
    const body = tb.slice(tb.indexOf("btn.addEventListener('click', e => {"), tb.indexOf('        btn.__h = null;'));
    function run(gaps) {
        return new Promise(res => {
            let theme = 'dark', flips = 0, opened = 0, handler = null, t0 = 1000;
            const ctx = {
                performance: { now: () => t0 },
                setTimeout, clearTimeout,
                effective: () => theme,
                toggleTheme: () => { theme = theme === 'dark' ? 'light' : 'dark'; flips++; },
                tripleTheme: before => { if (theme !== before) { theme = before; } opened++; },
                btn: { addEventListener: (n, f) => { if (n === 'click') handler = f; } }
            };
            vm.runInNewContext('let taps = 0, lastTap = 0, tapT = 0, before = null; const TAP_GAP = 500;\n' + body, ctx);
            const ev = { timeStamp: 0, preventDefault() {}, stopPropagation() {} };
            handler(ev);
            for (const g of gaps) { t0 += g; handler(ev); }
            setTimeout(() => res({ theme, flips, opened }), 560);
        });
    }
    assert.deepStrictEqual(await run([]), { theme: 'light', flips: 1, opened: 0 });
    assert.deepStrictEqual(await run([200]), { theme: 'dark', flips: 2, opened: 0 });
    assert.deepStrictEqual(await run([200, 200]), { theme: 'dark', flips: 1, opened: 1 });
    assert.deepStrictEqual(await run([900]), { theme: 'dark', flips: 2, opened: 0 });
});

test('the adjuster comes back every time and closes on a tap anywhere else', () => {
    const atm = read('atmosphere.js');
    assert.match(atm, /document\.querySelectorAll\('\.atm-ov\.off'\)\.forEach\(o => o\.remove\(\)\);/);
    assert.match(atm, /const old = document\.querySelector\('\.atm-ov:not\(\.off\)'\); if \(old\) return old;/);
    assert.match(atm, /if \(sh && sh\.contains\(e\.target\)\) return;/);
    assert.match(atm, /try \{ r\.close\(ov\); \} catch \(x\) \{ ov\.remove\(\); \}/);
    assert.match(atm, /document\.addEventListener\('pointerdown', away, true\)/);
});

test('no iOS copy-select or callout on long press, but text fields stay selectable', () => {
    const css = read('top-bar.css');
    assert.match(css, /html,body,button,\[role="button"\],canvas[^{]*\{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none\}/);
    assert.match(css, /input,textarea,select,[^{]*\{-webkit-user-select:text;user-select:text;-webkit-touch-callout:default\}/);
});
