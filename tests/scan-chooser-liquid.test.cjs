'use strict';
/* Nov 7 2026 Scan chooser, liquid (Emmanuel, screenshot of the chooser: "Typing in a barcode and or typing in the food's name, I feel
   like that should just go into a button, das heißt manually or something, damit alles einfach einheitlich aussieht ... Transparenz,
   Design, Liquid, Bubble, Style ... It should have looked more impressive when opening ... very meh, very boring").
   - The two typing fields wait behind one row of the chooser, Type it in; the panel under the card is only the round X until then.
   - Type it in opens the fields with the food name focused; Back, the phone's back and Escape bring the four ways back.
   - Each way in is its own glass bubble with a glossy round icon; the card is clear glass over two slow colour orbs; the lens springs
     in with a ring of light, the rows float up one after another, a sheen crosses once. No motion when the phone asks for less.
   Browser walk (scratch, Chromium, local site, network blocked, 393 x 852 with the iPhone's safe areas): before, the Deep analyze row
   was cut off behind the two fields and Photos could not be reached; after, the whole card shows above the X, and Type it in opens
   the fields with the food name focused (screenshots checked). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const html = read('index.html');
const css = read('scan-glass.css');
function fnSrc(s, sig) {
    const i = s.indexOf(sig); assert.ok(i >= 0, 'missing ' + sig);
    let d = 0; const j = s.indexOf('{', i);
    for (let k = j; k < s.length; k++) { if (s[k] === '{') d++; else if (s[k] === '}') { d--; if (!d) return s.slice(i, k + 1); } }
    throw new Error('unclosed ' + sig);
}

test('Type it in is a row like the others and says what it opens, in three languages', () => {
    assert.ok(html.includes('optMan: ["Type it in", "Manuell eingeben", "Escribirlo"],'));
    assert.ok(html.includes('optManS: ["Barcode number or the food\'s name", "Barcode-Nummer oder Name vom Essen", "Número del código o nombre del alimento"],'));
    assert.ok(html.includes('manBack: ["Back", "Zurück", "Atrás"],'));
    assert.match(fnSrc(html, 'function pickHTML(s)'), /row\("button", 'type="button" data-b3="pickman"', "b3-popt-man", IC\.key, t\("optMan"\), t\("optManS"\)\)/);
    assert.match(html, /case "pickman": sfx\("tap"\); pickManual\(true\); break;\n    case "pickback": sfx\("tap"\); pickManual\(false\); break;/);
});

/* pickManual on a small stand-in scanner */
function scanner(pick) {
    const cls = new Set(['b3-cam'].concat(pick ? ['b3-pick'] : [])), attrs = {};
    const input = { focused: 0, focus() { this.focused++; } };
    const el = { classList: { contains: c => cls.has(c), toggle: (c, on) => { if (on) cls.add(c); else cls.delete(c); return on; } },
        setAttribute: (k, v) => { attrs[k] = v; }, removeAttribute: k => { delete attrs[k]; }, contains: () => true };
    const doc = { activeElement: { blurred: 0, blur() { this.blurred++; } } };
    const ctx = { CAM: { el }, $: sel => (sel === '#b3Nm' ? input : null), document: doc };
    vm.createContext(ctx); vm.runInContext(fnSrc(html, 'function pickManual(on)'), ctx);
    return { ctx, cls, attrs, input, doc };
}

test('Type it in opens the fields with the food name focused, Back closes them, and the phone\'s back sees a layer to close', () => {
    const s = scanner(true);
    s.ctx.pickManual(true);
    assert.ok(s.cls.has('b3-man'));
    assert.equal(s.attrs['data-back-layer'], 'man', 'back-swipe.js counts it, so the phone\'s back closes only the fields');
    assert.equal(s.input.focused, 1, 'the food name, keyboard up');
    s.ctx.pickManual(false);
    assert.ok(!s.cls.has('b3-man'));
    assert.equal(s.attrs['data-back-layer'], undefined);
    assert.equal(s.doc.activeElement.blurred, 1, 'the keyboard goes down');
    const live = scanner(false); live.ctx.pickManual(true);
    assert.ok(!live.cls.has('b3-man'), 'only on the chooser, never on the live camera');
    assert.match(html, /document\.addEventListener\("keydown", e => \{ if \(e\.key !== "Escape" \|\| !CAM\) return; if \(CAM\.el && CAM\.el\.classList\.contains\("b3-man"\)\) \{ pickManual\(false\); return; \} closeScanner\(\); \}\);/, 'Escape (and so the phone\'s back) first closes the fields');
    assert.match(html, /'<div class="b3-cbot"><button type="button" class="b3-mback" data-b3="pickback">' \+ IC_BACK \+ '<span>' \+ esc\(t\("manBack"\)\) \+ '<\/span><\/button>/);
});

test('until then the panel under the card is only the round X, and the card reaches down to it', () => {
    assert.ok(css.includes('.b3-cam.b3-pick:not(.b3-man) .b3-ctype, .b3-cam.b3-pick:not(.b3-man) .b3-nmlive { display: none !important; }'));
    assert.match(css, /\.b3-cam\.b3-pick:not\(\.b3-man\) \.b3-cbot, html\.lg \.b3-cam\.b3-pick:not\(\.b3-man\) \.b3-cbot \{ background: none !important;/);
    assert.ok(css.includes('.b3-cam.b3-pick.b3-man .b3-cmsg { display: none !important; }'));
    assert.ok(css.includes('html.lw-bx-on .b3-cam.b3-pick:not(.b3-man) .b3-cmsg, html.lw-bx-on.lg .b3-cam.sg-docked.b3-pick:not(.b3-man) .b3-cmsg { bottom: calc(env(safe-area-inset-bottom, 0px) + 86px) !important; }'));
    assert.ok(css.includes('.b3-mback { display: none; }'));
});

test('the liquid look: glass bubbles, glossy round icons, clear glass card over slow colour orbs', () => {
    assert.match(css, /\.b3-poic \{ width: 40px; height: 40px; flex: none; border-radius: 50%;/);
    for (const k of ['live', 'photo', 'man', 'deep']) assert.match(css, new RegExp('\\.b3-popt-' + k + ' \\.b3-poic \\{ background: linear-gradient\\(160deg, [^)]*\\); (?:color: #2b1d02; )?box-shadow: inset 0 2px 3px rgba\\(255, 255, 255, \\.[56]+\\)'), k);
    assert.match(css, /\.b3-cam\.b3-pick \.b3-pickbox\.b3-pchoose \{[^}]*backdrop-filter: blur\(26px\) saturate\(1\.8\);/);
    assert.match(css, /\.b3-cam\.b3-pick \.b3-shade::before \{[^}]*animation: b3orb 16s ease-in-out infinite alternate; \}/);
});

test('the opening: lens, card, rows one after another, one sheen; none of it when the phone asks for less motion', () => {
    assert.match(css, /\.b3-pchoose \.b3-plens \{ animation: b3lens /);
    assert.match(css, /\.b3-pchoose \.b3-plens::after \{[^}]*animation: b3ring 1s ease-out \.2s 1 both; \}/);
    assert.match(css, /\.b3-pchoose::after \{[^}]*animation: b3sheen 1\.1s [^;]*\.55s 1 both; \}/);
    const d = [1, 2, 3, 4].map(n => Number((css.match(new RegExp('\\.b3-popt:nth-child\\(' + n + '\\) \\{ animation-delay: ([.\\d]+)s; \\}')) || [])[1]));
    assert.ok(d.every((x, i) => x > 0 && (!i || x > d[i - 1])), 'one after another: ' + d.join(', '));
    const rm = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce) {'));
    for (const sel of ['.b3-cam.b3-pick .b3-shade::before', '.b3-cam.b3-pick .b3-pickbox.b3-pchoose', '.b3-pchoose::after', '.b3-pchoose .b3-plens', '.b3-cam.b3-pick .b3-pchoose .b3-popt']) assert.ok(rm.includes(sel), sel);
    assert.match(rm, /\{ animation: none !important; \}/);
});
