'use strict';
/* Companion visits on Home (MAYA-HANDOFF item 23): a message to you arrives as the sender's companion flying into Home. */
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const V = require('../home-visit.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const NOW = Date.UTC(2026, 9, 19, 20, 30);
const msg = (id, uid, by, text, ts, extra) => Object.assign({ id, uid, by, text, ts, seen: false }, extra || {});
function booted(scope, visited) { const st = V.fresh(); V.intake(st, { scope, list: [] }, NOW, () => visited || []); st.reset = false; return st; }

test('only new messages to you queue a visit; seen, remembered, energy pings, your own and very old ones never do', () => {
    const st = booted('me', ['old1']);
    const r = V.intake(st, { scope: 'me', list: [
        msg('a', 'u1', 'Thiago', 'hey are you there?', NOW + 1000),
        msg('s', 'u2', 'Luis', 'seen already', NOW + 1000, { seen: true }),
        msg('old1', 'u3', 'Paolo', 'visited on this phone before', NOW + 1000),
        msg('e', 'u4', 'Mia', '\u26a1 Mia sent you energy', NOW + 1000),
        msg('e2', 'u4', 'Mia', '@Emmanuel \u26a1 Mia hat dir Energie geschickt!', NOW + 1000),
        msg('mine', 'me', 'Me', 'my own', NOW + 1000),
        msg('ancient', 'u5', 'Ana', 'from yesterday morning', NOW - 13 * 3600e3)
    ] }, NOW + 2000);
    assert.deepEqual(r, [['a', 'queued']]);
    assert.equal(st.queue.length, 1); assert.equal(st.queue[0].by, 'Thiago'); assert.equal(st.queue[0].text, 'hey are you there?');
    /* scanning again brings nothing twice */
    assert.deepEqual(V.intake(st, { scope: 'me', list: [msg('a', 'u1', 'Thiago', 'hey are you there?', NOW + 1000)] }, NOW + 3000), []);
});

test('several messages from one person become one visit; a fifth waiting person becomes "+N more"', () => {
    const st = booted('me');
    const L = ['u1', 'u1', 'u2', 'u3', 'u4', 'u5', 'u6'].map((u, i) => msg('m' + i, u, 'P' + u, 'text ' + i, NOW + 1000 + i));
    V.intake(st, { scope: 'me', list: L }, NOW + 5000);
    assert.equal(st.queue.length, V.QUEUE_MAX);
    assert.deepEqual(st.queue[0].ids, ['m0', 'm1']); assert.equal(st.queue[0].count, 2); assert.equal(st.queue[0].text, 'text 1', 'the newest words of that person');
    assert.equal(st.more, 2);
    const order = []; let e; while ((e = V.next(st))) order.push([e.uid, e.more]);
    assert.deepEqual(order, [['u1', 0], ['u2', 0], ['u3', 0], ['u4', 2]], 'the last visitor carries the "+2 more" line');
});

test('the person visiting right now gets the new words in place instead of a second visit', () => {
    const st = booted('me');
    V.intake(st, { scope: 'me', list: [msg('a', 'u1', 'Bea', 'one', NOW + 1000)] }, NOW + 1500);
    st.current = V.next(st);
    const r = V.intake(st, { scope: 'me', list: [msg('a', 'u1', 'Bea', 'one', NOW + 1000), msg('b', 'u1', 'Bea', 'two', NOW + 2000)] }, NOW + 2500);
    assert.deepEqual(r, [['b', 'current']]); assert.equal(st.current.text, 'two'); assert.deepEqual(st.current.ids, ['a', 'b']); assert.equal(st.queue.length, 0);
    st.current.leaving = true;
    V.intake(st, { scope: 'me', list: [msg('c', 'u1', 'Bea', 'three', NOW + 3000)] }, NOW + 3500);
    assert.equal(st.queue.length, 1, 'once they are leaving, a new message is a new visit');
});

test('after a reload or time away, old history is not replayed: only the two newest unseen come by, the rest is "+N more"', () => {
    const st = V.fresh();
    const list = [1, 2, 3, 4, 5].map(i => msg('b' + i, 'u' + i, 'P' + i, 't' + i, NOW - i * 600e3));
    V.intake(st, { scope: 'me', list }, NOW, () => []);
    assert.deepEqual(st.queue.map(q => q.id), ['b2', 'b1']);
    assert.equal(st.more, 3);
    /* nothing from the backlog comes twice */
    assert.deepEqual(V.intake(st, { scope: 'me', list }, NOW + 1000), []);
});

test('switching accounts drops the other account\'s visitors and loads only this account\'s memory', () => {
    const mem = { a: ['x1'], b: ['y1'] };
    const st = V.fresh();
    V.intake(st, { scope: 'a', list: [msg('n1', 'u1', 'Bea', 'for A', NOW + 5000)] }, NOW, s => mem[s]);
    assert.equal(st.queue.length, 1); st.reset = false;
    V.intake(st, { scope: 'b', list: [msg('x1', 'u9', 'Cy', 'for B', NOW + 6000)] }, NOW + 7000, s => mem[s]);
    assert.equal(st.reset, true); assert.equal(st.scope, 'b');
    assert.deepEqual(st.queue.map(q => q.text), ['for B'], 'A\'s visitor is gone; B\'s id x1 is not in B\'s memory');
    assert.deepEqual(st.visited, ['y1']);
    V.intake(st, { scope: '', list: [msg('z', 'u1', 'Bea', 'signed out', NOW + 8000)] }, NOW + 9000, s => mem[s]);
    assert.equal(st.queue.length, 0, 'signed out: nobody visits');
});

test('the room\'s own toast: Home takes a message only while Home is in front; elsewhere the toast shows and Home forgets it', () => {
    const st = booted('me');
    V.intake(st, { scope: 'me', list: [msg('a', 'u1', 'Bea', 'hi', NOW + 1000), msg('b', 'u2', 'Cy', 'yo', NOW + 1000)] }, NOW + 1500);
    assert.equal(V.claim(st, 'a', true), true);
    assert.equal(V.claim(st, 'b', false), false);
    assert.deepEqual(st.queue.map(q => q.id), ['a']); assert(st.visited.includes('b'), 'toasted elsewhere: no visit later');
    assert.equal(V.claim(st, 'zzz', true), false, 'unknown message: the room decides');
    st.current = V.next(st); assert.equal(V.claim(st, 'a', false), true, 'already visiting');
});

test('visits that could not happen for 10 minutes, or that Community shows anyway, are remembered and dropped', () => {
    const st = booted('me');
    V.intake(st, { scope: 'me', list: [msg('a', 'u1', 'Bea', 'hi', NOW + 1000)] }, NOW + 1000);
    assert.equal(V.expire(st, NOW + 5 * 60e3), 0);
    assert.equal(V.expire(st, NOW + 11 * 60e3), 1); assert.equal(st.queue.length, 0); assert(st.visited.includes('a'));
    V.intake(st, { scope: 'me', list: [msg('b', 'u2', 'Cy', 'yo', NOW + 12 * 60e3)] }, NOW + 12 * 60e3);
    V.drop(st); assert.equal(st.queue.length, 0); assert(st.visited.includes('b'));
});

test('landing spot: the free band under the Home ring on iPhone and iPad, beside it in landscape, never off screen', () => {
    /* ring rects measured on the local build: iPhone 13 (390x664) and iPad portrait (820x1180) */
    const phone = V.place({ vw: 390, vh: 664, ring: { left: 7, top: 91, right: 383, bottom: 467 }, cardH: 92 });
    assert.equal(phone.mode, 'below'); assert(phone.y - 32 > 467, 'companion below the ring'); assert(phone.cardTop + 92 <= 664 - 10, 'card fits');
    assert(phone.cardLeft >= 16 && phone.cardLeft + phone.cardW <= 390 - 16);
    const pad = V.place({ vw: 820, vh: 1180, ring: { left: 117, top: 250, right: 703, bottom: 836 }, cardH: 100, orb: 84 });
    assert.equal(pad.mode, 'below'); assert(pad.y - 42 > 836);
    const land = V.place({ vw: 844, vh: 390, ring: { left: 270, top: 10, right: 574, bottom: 380 }, cardH: 92 });
    assert.equal(land.mode, 'side'); assert(land.cardLeft >= 8 && land.cardLeft + land.cardW <= 844 - 8); assert(land.x > 574 || land.x < 270);
    const tight = V.place({ vw: 320, vh: 480, ring: { left: 0, top: 20, right: 320, bottom: 470 }, cardH: 92 });
    assert.equal(tight.mode, 'over'); assert(tight.cardTop + 92 <= 480);
    const top = V.place({ vw: 390, vh: 664, ring: { left: 7, top: 300, right: 383, bottom: 650 }, cardH: 92 });
    assert.equal(top.mode, 'above'); assert(664 - top.cardBottom <= top.y - 32, 'card ends above the companion');
});

test('the flight starts small, well outside the screen, from the same side for the same person, and ends exactly on the spot', () => {
    const a = V.origin('user-123', 195, 560, 390, 664), b = V.origin('user-123', 195, 560, 390, 664), c = V.origin('someone-else', 195, 560, 390, 664);
    assert.deepEqual(a, b); assert.notDeepEqual(a, c);
    for (const uid of ['user-123', 'someone-else', 'u-t', 'u-l', 'u-p', 'x', 'y', 'z']) {
        const o = V.origin(uid, 195, 560, 390, 664), sx = 195 + o.dx, sy = 560 + o.dy;
        assert(sx < 0 || sx > 390 || sy < 0 || sy > 664, uid + ' starts outside the screen');
        assert(Math.min(Math.abs(sx), Math.abs(sx - 390), Math.abs(sy), Math.abs(sy - 664)) <= 140, uid + ' starts just past the edge, so the flight is in view');
        assert(!(o.a > Math.PI / 3 && o.a < 2 * Math.PI / 3), 'never straight up from below');
    }
    const p = V.path(a.dx, a.dy, 10);
    assert.equal(p[0].x, Math.round(a.dx * 10) / 10); assert(p[0].s < 0.2 && p[0].o === 0);
    assert.deepEqual([p[10].x, p[10].y, p[10].s, p[10].o], [0, 0, 1, 1]);
    for (let i = 1; i < p.length; i++) assert(p[i].s >= p[i - 1].s, 'grows as it comes closer');
    const mid = p[5], straight = Math.abs(mid.x * a.dy - mid.y * a.dx) / Math.hypot(a.dx, a.dy);
    assert(straight > 10, 'a curve, not a straight line');
});

test('words in English, German and Spanish; long messages are shortened, never cut mid-word', () => {
    for (const l of ['en', 'de', 'es']) for (const k of Object.keys(V.UI.en)) assert(V.UI[l][k], l + ' ' + k);
    assert.equal(V.words('es', 'came', { n: 'Thiago' }), 'Thiago ha entrado en tu mundo');
    assert.equal(V.words('de', 'more', { k: 3 }), '+3 weitere f\u00fcr dich in der Community');
    assert.equal(V.words('fr', 'reply'), 'Reply');
    const s = V.short('word '.repeat(60), 40);
    assert(s.length <= 40 && s.endsWith('\u2026') && !/wor\u2026$/.test(s));
});

test('the page shows the message as text and animates only transform and opacity (light on the iPhone)', () => {
    const js = read('home-visit.js');
    assert.doesNotMatch(js.replace(/face\.innerHTML = svg/, ''), /innerHTML\s*=/, 'only the room\'s own companion drawing goes in as markup');
    assert.match(js, /msg\.textContent = short\(e\.text/); assert.match(js, /who\.textContent = name/);
    for (const m of js.matchAll(/anim\(\w+, (\[[^\]]*\])/g)) assert.doesNotMatch(m[1], /left|top|width|height|filter|box-shadow/, m[1]);
    assert.doesNotMatch(js, /requestAnimationFrame|getContext\(|THREE/, 'no animation loop, no canvas, no WebGL');
    assert.match(js, /prefers-reduced-motion: reduce/);
    const html = read('index.html'), sw = read('sw.js');
    assert.match(html, /<link rel="stylesheet" href="home-visit\.css\?v=[^"]+">\s*<script src="home-visit\.js\?v=[^"]+"><\/script>/);
    assert(html.indexOf('home-visit.js') > html.indexOf('community-chat.js'), 'after the room it reads from');
    assert.equal((sw.match(/"home-visit\.js"/g) || []).length, 2); assert.equal((sw.match(/"home-visit\.css"/g) || []).length, 2);
});

/* the room side: community-chat.js tells Home which messages are addressed to you and lets Home take the toast */
function room() {
    const src = read('tests/community-chat-ui.test.cjs');
    const a = src.indexOf('function fixture(){'), b = src.indexOf('\ntest(', a);
    assert(a > 0 && b > a, 'fixture from community-chat-ui.test.cjs');
    const K = require('../community-chat-core.js');
    const make = new Function('require', 'K', 'assert', 'fs', 'vm', 'path', '__dirname', src.slice(a, b) + '\nreturn fixture;');
    return make(require, K, assert, fs, vm, path, __dirname)();
}
test('room: directed() lists only unseen messages to you (a mention or a reply), without marking anything seen', () => {
    const f = room(); const now = Date.now();
    f.host.people = () => [{ uid: 'b', n: 'Bea', lv: 1 }, { uid: 'c', n: 'Cy', lv: 1 }];
    let ms = [{ id: '1', uid: 'a', by: 'Fixture A', t: 'hello room', ts: now - 9000 }, { id: '2', uid: 'b', by: 'Bea', t: '@Fixture A old one', ts: now - 8000 }];
    f.host.messages = () => ms; f.scope('a');
    assert.equal(typeof f.win.LowiCommunity.directed, 'function');
    let d = f.win.LowiCommunity.directed();
    assert.equal(d.scope, 'a'); assert.equal(JSON.stringify(d.list.map(m => [m.id, m.seen])), JSON.stringify([['2', true]]), 'what was there when the room first counted is already seen');
    ms = ms.concat([{ id: '3', uid: 'c', by: 'Cy', t: '@Fixture A  dinner at 8?', ts: now - 3000 }, { id: '4', uid: 'b', by: 'Bea', t: 'agreed', ts: now - 2000, re: '1' }, { id: '5', uid: 'c', by: 'Cy', t: '@Bea not for you', ts: now - 1000 }, { id: '6', uid: 'a', by: 'Fixture A', t: '@Bea mine', ts: now - 500 }]);
    d = f.win.LowiCommunity.directed();
    assert.equal(JSON.stringify(d.list.filter(m => !m.seen).map(m => [m.id, m.uid, m.by, m.text])), JSON.stringify([['3', 'c', 'Cy', 'dinner at 8?'], ['4', 'b', 'Bea', 'agreed']]));
    assert.equal(f.win.LowiCommunity.directed().list.filter(m => !m.seen).map(m => m.id).join(), '3,4', 'reading does not mark seen');
    f.scope('z'); assert.equal(f.win.LowiCommunity.directed().list.filter(m => !m.seen).length, 0, 'another account sees none of it');
});
test('room: while Home takes the visit, the "is talking to you" toast stays away; otherwise it shows as before', () => {
    const f = room(); const now = Date.now(); const made = [];
    const toast = { attrs: {}, setAttribute(k, v) { this.attrs[k] = v; if (k === 'data-on') made.push(this.innerHTML); }, removeAttribute(k) { delete this.attrs[k]; } };
    const get = f.doc.getElementById; f.doc.getElementById = id => id === 'cgToast' ? toast : get(id);
    f.host.active = () => false;
    f.host.people = () => [{ uid: 'b', n: 'Bea', lv: 1 }];
    let ms = [{ id: '1', uid: 'b', by: 'Bea', t: 'hi', ts: now - 9000 }];
    /* bug hunt run 16: pin quiet hours off. Without this the test read the machine clock and failed every night from 22:00 to
       08:00 (standard quiet hours keep the toast away), which also blocked night releases. */
    f.storage['lowi.community.prefs.v1:a'] = JSON.stringify({ quietEnabled: false });
    f.host.messages = () => ms; f.scope('a');
    const asked = []; f.win.LowiHomeVisit = { has: id => { asked.push(id); return true; } };
    ms = ms.concat([{ id: '2', uid: 'b', by: 'Bea', t: '@Fixture A look at Home', ts: Date.now() }]);
    f.win.LowiCommunity.refresh(); f.flush();
    assert.equal(asked.join(), '2'); assert.equal(made.length, 0, 'no toast: the companion visits instead');
    f.win.LowiHomeVisit = { has: () => false };
    ms = ms.concat([{ id: '3', uid: 'b', by: 'Bea', t: '@Fixture A and again', ts: Date.now() + 1 }]);
    f.win.LowiCommunity.refresh(); f.flush();
    assert.equal(made.length, 1, 'not on Home: the toast shows'); assert.match(made[0], /and again/);
});
