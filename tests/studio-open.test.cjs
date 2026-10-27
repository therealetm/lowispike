'use strict';
/* 27 Oct 2026 (Emmanuel, with a screenshot of the locked Studio tab: "Also, um remove this we can open it up now. Delete the password
   or whatever."): Studio in Community is open for everyone. The 25 Oct lock is gone: no Under construction / Im Aufbau panel, no
   PIN or password, no Private badge, no Lock button, no server check before Affiliates or Creation shows, on the tab or on the pages. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const LOCK_FILES = ['studio-lock.js', 'studio-lock-core.js', 'studio-lock.css', 'studio-gate.js'];
const LOCK_WORDS = /LowiStudioLock|studioLocked|studio-lock|studio-gate|studio_access|studio_unlock|lowi:studio-lock|sl-lock|sl-gated/;

test('the Studio lock files are gone and nothing loads them', () => {
    for (const f of LOCK_FILES) assert.ok(!fs.existsSync(path.join(ROOT, f)), f + ' still exists');
    for (const f of ['index.html', 'sw.js', 'affiliates/index.html', 'create/index.html'])
        assert.doesNotMatch(read(f), LOCK_WORDS, f + ' still loads or asks the Studio lock');
});

test('the Studio tab makes the Affiliates / Creation page as soon as it is open, with no lock check in between', () => {
    const s = read('community-rooms-ui.js');
    assert.doesNotMatch(s, LOCK_WORDS);
    assert.match(s, /const VIEWS=\{create:'create\/',aff:'affiliates\/'\}/);
    /* ensureView: a Studio view with no frame yet gets its frame when Community is the open page */
    assert.match(s, /if\(VIEWS\[view\]&&!frames\[view\]&&pageActive\(\)\)\{/);
    /* the Affiliates / Creation switch shows whenever a Studio view is chosen */
    assert.match(s, /const on=!!VIEWS\[view\];/);
    /* the menu's Studio page link is not hidden any more */
    assert.doesNotMatch(s, /splice\(i,1\);\/\* no Studio page link/);
});

test('Affiliates and Creation open straight away: no hidden body waiting for a yes from the server', () => {
    for (const f of ['affiliates/index.html', 'create/index.html']) {
        const h = read(f);
        assert.doesNotMatch(h, /<html[^>]*class="[^"]*sl-/, f + ' still starts hidden');
        assert.doesNotMatch(h, /visibility:\s*hidden/, f + ' still hides its body');
    }
});

test('no Locked / Under construction text for Studio is left, in any language', () => {
    const s = read('community-rooms-ui.js') + read('index.html');
    for (const w of ['Im Aufbau', 'Studio wird gerade gebaut', 'Under construction', 'Studio is being built', 'En construcción', 'Studio se está construyendo'])
        assert.ok(!s.includes(w), 'still says "' + w + '"');
});
