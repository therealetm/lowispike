'use strict';
/* BH-034: Community opened from Misty's ranking row ("Misty is number N worldwide") showed the galaxy first and switched to Ranking
   on a 60 ms timer that a busy phone ran 0.3 to 2.5 s late. A tap meant for Ranking in that time picked the companion under the
   finger: live WebKit iPhone 13, a 2nd tap 450 ms after the first gave "Talking to Yuki" (first visit: "Talking to Jonas"), well past
   BH-032's 400 ms same-spot guard. The first-tab rule (community-tab-order.js) also set Room for that moment, and the Home warp
   zoomed into a galaxy you were not going to see. For You (LowiRoomsUI.openOn: the For You bubble, Settings) had the same timer.
   Now the caller says which tab it wants (LowiCommunityTabs.want()), the warp skips the galaxy for it, and the view is switched in
   the same task as goTab, before the browser draws. Live probe: BUGHUNT/playtest/probe-rank-flash.cjs (mock cloud). */
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

/* cut one function out of a file by its header and balanced braces */
function cut(src, header) {
    const i = src.indexOf(header); assert.ok(i >= 0, 'found ' + header);
    let d = 0, j = src.indexOf('{', i);
    for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (!d) break; } }
    return src.slice(i, j + 1);
}
function fakeTimers() {
    const q = []; return { q, setTimeout: (f, ms) => { q.push({ f, ms }); return q.length; }, run() { while (q.length) q.shift().f(); } };
}

function rankingWorld(o = {}) {
    const log = [], T = fakeTimers(); let tab = 'home', view = '', pane = o.pane !== false;
    const W = {
        goTab(t) { log.push('goTab ' + t); tab = t; },
        LowiCommunityTabs: { want() { log.push('want'); } },
        LowiRoomsUI: { showView(v) { log.push('showView ' + v); if (pane) view = v; }, view: () => view }
    };
    const D = { getElementById: id => (id === 'cmPaneChat' && pane ? {} : null) };
    const ctx = { W, D, console, setTimeout: T.setTimeout };
    vm.runInNewContext(cut(read('ranking.js'), 'function open()') + '; this.open = open;', ctx);
    return { open: ctx.open, log, T, makePane() { pane = true; }, view: () => view, tab: () => tab };
}

test('Ranking from Misty\'s card: Ranking is set in the same task as the tab switch, no galaxy frame in between', () => {
    const w = rankingWorld();
    w.open();
    assert.ok(w.log.includes('showView rank'), 'showView(rank) ran inside open(), before any timer: ' + w.log.join(', '));
    assert.strictEqual(w.view(), 'rank');
    assert.strictEqual(w.T.q.length, 0, 'no retry left once Ranking shows');
});

test('Ranking from Misty\'s card: the first-tab rule is told first, so it does not put Room on top for a moment', () => {
    const w = rankingWorld();
    w.open();
    const iw = w.log.indexOf('want'), ig = w.log.indexOf('goTab foryou');
    assert.ok(iw >= 0 && ig > iw, 'want() before goTab: ' + w.log.join(', '));
});

test('first visit, Community page not built yet: open() still retries until Ranking is there', () => {
    const w = rankingWorld({ pane: false });
    w.open();
    assert.ok(w.T.q.length === 1, 'one retry queued');
    w.makePane(); w.T.run();
    assert.strictEqual(w.view(), 'rank');
});

function openOnWorld(o = {}) {
    const log = [], T = fakeTimers(); let active = !!o.active, view = o.view || '';
    const tabEl = { classList: { contains: c => c === 'active' && active } };
    const W = { LowiCommunityTabs: { want() { log.push('want'); } }, goTab(t) { log.push('goTab ' + t); if (!o.slowTab) active = true; } };
    const D = { getElementById: id => (id === 'tab-foryou' ? tabEl : null) };
    const ctx = { W, D, setTimeout: T.setTimeout, ensure: () => true, showView: v => { log.push('showView ' + v); view = v; }, paintFyFeed: () => log.push('paintFy'),
        get view() { return view; } };
    vm.runInNewContext(cut(read('community-rooms-ui.js'), 'function openOn(v)') + '; this.openOn = openOn;', ctx);
    return { openOn: ctx.openOn, log, T, activate() { active = true; } };
}

test('For You (openOn): the view is switched in the same task as goTab', () => {
    const w = openOnWorld();
    w.openOn('fy');
    assert.deepStrictEqual(w.log, ['want', 'goTab foryou', 'showView fy'], 'no galaxy frame first');
    assert.strictEqual(w.T.q.length, 0);
});

test('openOn still waits for a tab that opens late, and repaints For You when already on it', () => {
    const w = openOnWorld({ slowTab: true });
    w.openOn('rank');
    assert.ok(!w.log.includes('showView rank') && w.T.q.length === 1, 'waits');
    w.activate(); w.T.run();
    assert.ok(w.log.includes('showView rank'));
    const v = openOnWorld({ active: true, view: 'fy' });
    v.openOn('fy');
    assert.deepStrictEqual(v.log, ['want', 'showView fy', 'paintFy']);
});

test('community-tab-order: wanted() is true right after want() and wears off', () => {
    const src = read('community-tab-order.js');
    const fresh = src.match(/const FRESH_MS = \d+;/); assert.ok(fresh);
    let now = 1000;
    const ctx = { Date: { now: () => now } };
    vm.runInNewContext('let wantStamp = 0; ' + fresh[0] + cut(src, 'function want()') + cut(src, 'function wanted()') + '; this.want = want; this.wanted = wanted; this.F = FRESH_MS;', ctx);
    now = 1e7; assert.strictEqual(ctx.wanted(), false, 'nothing asked');
    ctx.want(); assert.strictEqual(ctx.wanted(), true);
    now += ctx.F * 2 + 1; assert.strictEqual(ctx.wanted(), false);
    assert.ok(/W\.LowiCommunityTabs = Object\.assign\(\{[^}]*\bwanted\b/.test(src), 'exported');
});

test('galaxy-zoom: no warp into the galaxy when a tab was asked for, even with Room as the first tab', () => {
    const src = read('galaxy-zoom.js');
    const m = src.match(/const firstIsRoom = \(\) => \{[\s\S]*?\n?\s*\};/); assert.ok(m, 'firstIsRoom found');
    const run = T => { const ctx = { W: { LowiCommunityTabs: T, location: { hash: '' } } }; vm.runInNewContext(m[0] + '; this.r = firstIsRoom();', ctx); return ctx.r; };
    assert.strictEqual(run({ order: () => ['room'], wanted: () => true }), false, 'Ranking/For You asked for: no galaxy warp');
    assert.strictEqual(run({ order: () => ['room'], wanted: () => false }), true, 'plain Community bubble with Room first still warps');
    assert.strictEqual(run({ order: () => ['chat'], wanted: () => false }), false);
});

test('community-tab-order: the For You stay rule (back to For You within 30 min) leaves a tab that was asked for', () => {
    const src = read('community-tab-order.js'), f = cut(src, 'function openFirst(deep)');
    const run = (asked, stay) => {
        const log = []; const R = { view: () => 'rank', setTab: x => log.push('setTab ' + x), showView: v => log.push('showView ' + v), paint: () => log.push('paint') };
        const th = { hasAttribute: () => false };
        const ctx = { W: { LowiRoomsUI: R, LowiForYouStay: { back: () => stay } }, D: { getElementById: id => (id === 'cgThread' ? th : null) }, Date: { now: () => 1e7 },
            isOpen: () => true, tabsEl: () => ({}), wire() {}, apply() {}, order: () => ['room'], roomStamp: 0, wantStamp: asked ? 1e7 - 100 : 0, FRESH_MS: 1500,
            firstAction: (first, view, room, fresh, deep) => (deep ? null : 'room'), setTimeout() {}, console };
        vm.runInNewContext(f + '; openFirst(false);', ctx); return log;
    };
    assert.deepStrictEqual(run(true, true), ['paint'], 'Ranking asked for: stays on Ranking');
    assert.deepStrictEqual(run(false, true), ['showView fy'], 'a plain open still goes back to For You');
});
