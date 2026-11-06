'use strict';
/* Nov 6 2026 (Emmanuel, 5 Nov request 5: saved carousels "somewhere the person can reach"). Save on a For You card already existed,
   but its list was only reachable from an old profile screen and left out other members' posts (it looked at his own, the sample and
   the app's posts only). Now: a Saved button (bookmark + count) sits in For You's top right corner under My posts once something is
   saved; the list holds every saved post wherever it came from (also other members', from the shared table or its last copy on this
   phone), one copy each; a carousel shows how many photos it has; a tap on a saved post opens it where it is in For You; one that
   left For You says so in its row and does not open.
   Browser walk (scratch, recorded in HANDOFF-sheet-bubble.md): local site in Chromium, 390x844 de and 375x667 es. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const html = read('index.html');
function fnSrc(s, sig) {
    const i = s.indexOf(sig); assert.ok(i >= 0, 'missing ' + sig);
    let d = 0; const j = s.indexOf('{', i);
    for (let k = j; k < s.length; k++) { if (s[k] === '{') d++; else if (s[k] === '}') { d--; if (!d) return s.slice(i, k + 1); } }
    throw new Error('unclosed ' + sig);
}
function load(o) {
    const ctx = Object.assign({
        DEMO: [{ id: 'd1' }], T: { posts: [{ id: 'm1' }], saved: {} }, fyCacheRead: () => [{ id: 'k1', who: 'Ana' }],
        window: { LOWI_CLOUD: { live: () => true, posts: () => [{ id: 'c1', who: 'Ana' }, { id: 'm1' }] }, LowiForYou: { botPosts: () => [{ id: 'b1' }] } },
        esc: s => String(s), fyT: s => s, FIC: { save: '<svg/>' }
    }, o || {});
    Object.assign(ctx, ctx.window); /* in the page window.X is also the global X */
    vm.createContext(ctx);
    vm.runInContext(fnSrc(html, 'function fySavedAll()') + '\n' + fnSrc(html, 'function fySavedBtnHTML()'), ctx);
    return ctx;
}

test('Saved holds every saved post wherever it came from, other members\' too, one copy each', () => {
    const c = load();
    assert.deepEqual(Array.from(c.fySavedAll(), p => p.id), ['d1', 'm1', 'c1', 'b1'], 'his own post once, other members\' from the shared table');
    const off = load({ window: { LOWI_CLOUD: { live: () => false, posts: () => [] }, LowiForYou: { botPosts: () => [] } } });
    assert.deepEqual(Array.from(off.fySavedAll(), p => p.id), ['d1', 'm1', 'k1'], 'offline: the last copy on this phone');
    const ls = fnSrc(html, 'function listSheet(kind)');
    assert.match(ls, /const all = kind === "mine" \? DEMO\.concat\(fyMineAll\(\), window\.LowiForYou \? LowiForYou\.botPosts\(\) : \[\]\) : fySavedAll\(\);/);
    assert.match(ls, /all\.filter\(p => \(T\.saved \|\| \{\}\)\[p\.id\]\)/, 'only what is saved');
});

test('the Saved button: shown once something is saved, with its count and a label', () => {
    assert.equal(load().fySavedBtnHTML(), '', 'nothing saved, no button');
    assert.equal(load({ T: { posts: [], saved: { a: 1, b: 1 } } }).fySavedBtnHTML(), '<button class="fy-svd" data-tr="list-saved" aria-label="Saved, 2"><svg/><b>2</b></button>');
    assert.match(html, /'<div class="fy-tops"><button class="fy-mine" data-tr="list-mine" aria-label="' \+ esc\(mineLbl\) \+ '">' \+ esc\(mineLbl\) \+ \(mineN \? ' <b>' \+ mineN \+ '<\/b>' : ''\) \+ '<\/button>' \+ fySavedBtnHTML\(\) \+ '<\/div>'/, 'under My posts');
    assert.match(fnSrc(html, 'function fySavedBtnPaint()'), /insertAdjacentHTML\("beforeend", h\)/);
    assert.match(html, /h\.toast\(on \? "Saved\. Find it under the bookmark at the top\." : "Removed from Saved"\);\n      fySavedBtnPaint\(\); break; \}/, 'saving updates the button at once');
    assert.match(html, /\.fy-tops\{position:absolute;top:12px;right:12px;z-index:6;display:flex;flex-direction:column;align-items:flex-end;gap:8px\}/, 'stacked: no language pushes it into + Post');
    assert.match(html, /\.fy-tops>\.fy-mine\{position:static\}/);
    assert.match(html, /\.fy-svd\{display:inline-flex;align-items:center;gap:5px;height:40px;min-width:44px;/);
});

test('a saved post opens where it is in For You; a carousel row shows its photo count', () => {
    const ls = fnSrc(html, 'function listSheet(kind)');
    assert.match(ls, /\(kind === "mine" \|\| gone \? '' : ' data-tr="open-saved" data-id="' \+ p\.id \+ '" role="button" tabindex="0"'\)/);
    assert.match(ls, /'<span class="fy-lcar" aria-label="' \+ nSl \+ ' photos">' \+ nSl \+ '<\/span>'/);
    assert.match(html, /case "open-saved": \{ if \(e\.target\.closest\('\.fy-lbtn'\)\) break; h\.closeSheet\(\);/);
    assert.match(html, /if \(at\(\)\) return; showFeed\(\); setTimeout\(at, 500\);/);
    assert.match(ls, /gone = !!\(inFeed && !inFeed\.has\(p\.id\)\)/, 'a saved post that left For You');
    assert.match(ls, /\(kind === "mine" \|\| gone \? '' : ' data-tr="open-saved"/, 'does not open');
    assert.match(ls, /' · <span class="fy-gone">Not in For You any more<\/span>'/, 'and says so (plain text, no new spoken sentence)');
});

test('the new words exist in German and Spanish', () => {
    for (const r of [['Saved. Find it under the bookmark at the top.', 'Gespeichert. Du findest es oben beim Lesezeichen.', 'Guardado. Lo encuentras arriba, en el marcador.'],
        ['Not in For You any more', 'Nicht mehr in Für dich', 'Ya no está en Para ti']])
        assert.ok(html.includes('["' + r.join('", "') + '"]'), r[0]);
});
