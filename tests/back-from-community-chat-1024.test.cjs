'use strict';
/* Oct 24 2026 (button sweep 12:20): Community > the Chat tab, or a tap on a speech bubble / companion in the Room, opens the chat
   (#cgThread[data-open]). One back (edge swipe, phone back) closed the chat AND Community, landing on Home; the next back left
   the app. Two causes:
   1. back-swipe.js's signature of open layers did not count the chat, so section-nav.js (its popstate runs next) did not know
      this back had already closed something and closed Community too.
   2. A bubble / companion tap opens the chat through LowiCommunity.thread() itself, so community-rooms-ui.js's `from` stayed
      empty and back had nowhere to go but out of Community.
   Now one back closes the chat and stays in Community; the next back goes Home. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const BACK = fs.readFileSync(path.join(ROOT, 'back-swipe.js'), 'utf8');
const RUI = fs.readFileSync(path.join(ROOT, 'community-rooms-ui.js'), 'utf8');

function sigWith(chatOpen) {
    const D = {
        documentElement: { className: 'sec-open comm' }, body: { className: '' },
        querySelector: q => (q === '.tab.active' ? { id: 'tab-foryou' } : null),
        querySelectorAll: q => (q === '#cgThread[data-open]' ? { length: chatOpen ? 1 : 0 } : { length: 3 }),
        addEventListener() { },
    };
    const W = { history: { pushState() { }, state: null }, addEventListener() { }, getComputedStyle: () => ({}) };
    W.document = D;
    vm.runInNewContext(BACK, { window: W, document: D, KeyboardEvent: function () { }, setTimeout, console });
    return W.LowiBackSwipe.sig();
}

test('back-swipe.js: the open-layer signature changes when only the Community chat closes', () => {
    const open = sigWith(true), shut = sigWith(false);
    assert.notStrictEqual(open, shut, 'closing the chat must change sig(), or section-nav.js closes Community as well');
    /* section-nav.js / back-swipe.js compare the layer part only (everything after the page classes) */
    const layers = g => g.split('|').slice(2).join('|');
    assert.notStrictEqual(layers(open), layers(shut));
});

test('community-rooms-ui.js: a chat opened by a tap inside Community goes back to the tab under it', () => {
    assert.match(RUI, /addEventListener\('pointerdown',[^\n]*closest\('#tab-foryou'\)/, 'taps inside the Community page are noted');
    const fn = RUI.match(/function threadMoved\(\)\{[^\n]*\}/);
    assert.ok(fn, 'threadMoved() exists');
    assert.match(fn[0], /from=\(view==='create'\|\|view==='aff'\|\|view==='rank'\|\|view==='fy'\)\?view:'room'/);
    assert.match(fn[0], /!wasOpen&&!from/, 'only when the chat just opened and nobody set from (Chat tab / entry unchanged)');
    assert.match(RUI, /new MutationObserver\(\(\)=>\{threadMoved\(\);paint\(\);\}\)/, 'runs when #cgThread data-open changes');
    /* setTab keeps wasOpen in step so its own from (or entry = no from) is kept */
    assert.match(RUI, /c\.thread\(true\);wasOpen=open\(\);paint\(\);return;/);
});

test('community-rooms-ui.js threadMoved(): bubble tap sets from=room, Chat tab and entry stay as they were', () => {
    const fnSrc = RUI.match(/function threadMoved\(\)\{[^\n]*\}/)[0];
    const run = ({ isOpen, wasOpen, from, view, tapAgo }) => {
        const ctx = { isOpenV: isOpen, wasOpen, from, view, roomTapAt: tapAgo == null ? 0 : Date.now() - tapAgo, Date };
        vm.runInNewContext('function open(){return isOpenV;}\n' + fnSrc + '\nthreadMoved();', ctx);
        return ctx;
    };
    assert.strictEqual(run({ isOpen: true, wasOpen: false, from: '', view: '', tapAgo: 200 }).from, 'room');
    assert.strictEqual(run({ isOpen: true, wasOpen: false, from: '', view: 'rank', tapAgo: 200 }).from, 'rank');
    assert.strictEqual(run({ isOpen: true, wasOpen: true, from: '', view: '', tapAgo: 200 }).from, '', 'entry (setTab already set wasOpen)');
    assert.strictEqual(run({ isOpen: true, wasOpen: false, from: '', view: '', tapAgo: null }).from, '', 'opened with no tap (from Home): leaves Community as before');
    assert.strictEqual(run({ isOpen: true, wasOpen: false, from: '', view: '', tapAgo: 9000 }).from, '', 'an old tap does not count');
    assert.strictEqual(run({ isOpen: false, wasOpen: true, from: 'room', view: '', tapAgo: 200 }).wasOpen, false);
});
