'use strict';
/* BH-010 (Oct 19 2026): the starter-plan questions after setup lived only in memory. A reload (or iOS dropping the app) between
   the end of setup and "Make my plan" / "Not now" lost them for good: setupDone was saved, there was no plan, and nothing offered
   them again (only Profile > About you, which a new player does not know about). Sibling of BH-009 ("progress saved mid-flow, the
   resume check looks at a field filled early"). Now afterSetup marks them pending until a plan or "Not now" is saved, and the next
   start reopens them once Home is quiet. Accounts that finished setup before have no mark and are never asked. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'herb-start.js'), 'utf8');
const coreSrc = fs.readFileSync(path.join(root, 'starter-core.js'), 'utf8');
const PEND = 'lowispike.hs-pending.v1';

function page(state, store, opts) {
    opts = opts || {};
    const sheets = [], timers = [], intervals = [], clicks = [];
    let now = 1000;
    const el = () => ({ classList: { contains: () => true, add() {}, remove() {}, toggle() {} }, setAttribute() {}, getAttribute: () => null,
        querySelector: () => null, querySelectorAll: () => [], appendChild() {}, isConnected: true, innerHTML: '', firstElementChild: null, style: {} });
    const home = el();
    const D = {
        hidden: false, documentElement: { lang: 'en' }, head: { appendChild() {} }, body: {},
        getElementById: id => id === 'tab-home' ? home : null,
        querySelector: q => (opts.busySel && opts.busySel(q)) || null,
        querySelectorAll: () => [], createElement: () => el(),
        addEventListener: (t, f) => { if (t === 'click') clicks.push(f); }
    };
    const ls = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
    const R2 = { S: () => state, save() {}, gateUp: () => !!opts.gate, isAccount: () => true, toast() {}, close(ov) { ov.isConnected = false; },
        sheet(html, o) { const ov = { isConnected: true, html, o }; sheets.push(ov); return ov; } };
    const win = { LowiR2: R2, addEventListener() {}, LowiTutorial: opts.tutorial || null };
    const ctx = vm.createContext({ document: D, localStorage: ls, matchMedia: () => ({ matches: false }), MutationObserver: function () { this.observe = () => {}; },
        setTimeout: f => { timers.push(f); return timers.length; }, clearTimeout() {}, setInterval: f => { intervals.push(f); return intervals.length; }, clearInterval() {},
        Date: { now: () => now }, console, globalThis: null, requestAnimationFrame() {} });
    ctx.window = win; ctx.globalThis = win; win.document = D;
    vm.runInContext(coreSrc.replace(/\(typeof window!=='undefined'\?window:globalThis\)\s*;?\s*$/, '(window);'), ctx);
    vm.runInContext(src, ctx);
    return { sheets, timers, store, D, win, step(ms) { now += ms; intervals.forEach(f => f()); }, run(n) { for (let i = 0; i < (n || 10); i++) this.step(400); },
        api: win.LowiHerbStart, click: f => clicks.forEach(c => c(f)) };
}
const ivSheets = p => p.sheets.filter(s => s.o && /hs-ivov/.test(s.o.cls || ''));

/* Oct 28 2026 (slim structure, batch 10, shorter first start): the questions are no longer opened by themselves after setup.
   They are offered later on the Profile card "Startplan" (Starten). An old pending mark from BH-010 is cleared and never resumed. */
test('setup ending no longer opens the starter questions; the Profile card offers them', () => {
    const store = {};
    const s = { setupDone: true, user: { bday: '1996-03-09' } };
    const a = page(s, store);
    assert.ok(a.api, 'herb-start loads');
    a.api.afterSetup();
    a.timers.splice(0).forEach(f => f());
    a.run(10);
    assert.equal(ivSheets(a).length, 0, 'no questions forced after setup');
    assert.ok(!(PEND in store), 'no pending mark');
    assert.match(src, /data-hs-open="redo">'\+esc\(t\('profStart'\)\)/, 'Profile card: Starten opens them');
    assert.equal(typeof a.api.openInterview, 'function', 'still reachable on demand');
});

test('an old pending mark from before is cleared on the next start, nothing opens', () => {
    const store = { [PEND]: '1' };
    const p = page({ setupDone: true, user: {} }, store);
    p.run(10);
    assert.equal(ivSheets(p).length, 0);
    assert.ok(!(PEND in store), 'stale mark removed');
    assert.equal(p.api.resumeTick(), true, 'nothing more to do');
});

test('accounts that finished setup before (no mark) are never pushed into the questions', () => {
    const p = page({ setupDone: true, user: { bday: '1990-01-01' } }, {});
    p.run(20);
    assert.equal(ivSheets(p).length, 0);
});

test('a saved plan or "Not now" still clears the mark', () => {
    assert.match(src, /if\(a==='later'\)\{pendClear\(\);/, '"Not now" clears the mark');
    assert.match(src, /setPlan\(p\);pendClear\(\);/, '"Make my plan" clears the mark');
});
