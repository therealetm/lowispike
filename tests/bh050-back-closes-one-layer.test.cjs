'use strict';
/* BH-050 (bug hunt run 50, Oct 26 2026), pattern P-BACK-ONE-LAYER: Safari's back swipe (and Android back) sends Escape through
   back-swipe.js. Three layers did not own their Escape:
   - the companion creator (Profile > Your companion, companion-birth.js) had no Escape at all: back left it open, went Home under
     it, and the next back left LOWiSPIKE;
   - the body world's World map (body-world-regions.js) had no Escape: back went past it and closed the whole body world;
   - the Sound panel (world-audio.js) closed on Escape in the bubble phase next to the body world's own Escape, so one back closed
     both, and the panel's fade-out ghost kept role="dialog", so back-swipe.js saw nothing change.
   Seen on the live site (build 20261026-200906): probe-back-world.cjs map + sound = WORLD_CLOSED_TOO; probe-back-user.cjs B =
   creator stayed on top of Home, then LEFT_APP. These run the real files in a small fake page, so they fail on the old code. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

/* a document with capture and bubble listeners, enough to dispatch Escape the way back-swipe.js does */
function fakeDoc() {
    const L = { cap: {}, bub: {} };
    const D = {
        nodes: {},
        addEventListener(t, f, o) { const k = (o === true || (o && o.capture)) ? 'cap' : 'bub'; (L[k][t] = L[k][t] || []).push(f); },
        removeEventListener(t, f) { ['cap', 'bub'].forEach(k => { L[k][t] = (L[k][t] || []).filter(g => g !== f); }); },
        getElementById(id) { return this.nodes[id] || null; },
        querySelector() { return null; }, querySelectorAll() { return []; },
        createElement() { return { setAttribute() { }, classList: { add() { }, remove() { } }, addEventListener() { } }; },
        body: { appendChild() { } }, documentElement: { classList: { contains: () => false, add() { }, remove() { } } }
    };
    /* Escape from inside the layer: capture listeners on the document first, then the bubble listeners, unless stopped */
    D.escape = () => {
        let stopped = false;
        const e = { key: 'Escape', stopPropagation() { stopped = true; }, stopImmediatePropagation() { stopped = true; }, preventDefault() { } };
        for (const f of (L.cap.keydown || [])) { f(e); if (stopped) return e; }
        for (const f of (L.bub.keydown || [])) f(e);
        return e;
    };
    return D;
}

test('companion creator: back (Escape) closes it, and nothing under it', () => {
    const src = read('companion-birth.js');
    const start = src.indexOf('D.addEventListener(\'click\',e=>{if(e.target.closest&&e.target.closest(\'[data-lcopen]\'))openCreator();});');
    assert.ok(start > 0, 'creator click hook still there');
    const tail = src.slice(start).split('\n').slice(0, 4).join('\n');
    const D = fakeDoc();
    let closed = 0, under = 0;
    const ov = { classList: { contains: c => c === 'on' } };
    D.nodes.lcOv = ov;
    D.addEventListener('keydown', e => { if (e.key === 'Escape') under++; });       /* a layer under it (Home, a sheet) */
    vm.runInNewContext(tail, { D, openCreator() { }, closeOv() { closed++; delete D.nodes.lcOv; } });
    D.escape();
    assert.equal(closed, 1, 'Escape closed the creator (it stayed open before, and back went Home under it)');
    assert.equal(under, 0, 'only the creator closed');
    D.escape();
    assert.equal(under, 1, 'with the creator gone, Escape reaches what is under it again');
});

test('World map is deleted (owner request 12, Oct 28 2026): no map, no map button, no map Escape left behind', () => {
    const src = read('body-world-regions.js');
    assert.ok(!/bwrMap|openMap|bwr-map/.test(src), 'no World map code in the regions controller');
    assert.ok(!/bwr-map/.test(read('body-world-regions.css')) && !/bwr-map/.test(read('world-home.css')), 'no World map css');
});

test('Sound panel: back (Escape) closes the panel only, the body world stays', () => {
    const src = read('world-audio.js');
    const line = src.split('\n').find(l => /addEventListener\('keydown'/.test(l) && /waPanel/.test(l));
    assert.ok(line, 'Sound panel Escape line');
    const D = fakeDoc();
    let toggled = 0, worldClosed = 0;
    D.nodes.waPanel = {};
    D.addEventListener('keydown', e => { if (e.key === 'Escape') worldClosed++; });  /* body-world-3d.js onKey, added when the world opens */
    vm.runInNewContext(line, { D, togglePanel(v) { if (v === false) { toggled++; delete D.nodes.waPanel; } } });
    D.escape();
    assert.equal(toggled, 1, 'panel closed');
    assert.equal(worldClosed, 0, 'the body world did not close with it (it did before)');
});

test('back-swipe: a dialog fading out as an aria-hidden ghost counts as closed, so back stays in the app', () => {
    const SRC = read('back-swipe.js');
    const st = { stack: [null], i: 0, ghost: false, backs: 0 };
    const docL = {}, winL = {}, timers = [];
    const D = {
        documentElement: { className: 'wh-on bw3-full-open' }, body: { className: '' }, activeElement: null,
        querySelector(q) { return q === '.tab.active' ? { id: 'tab-home' } : null; },
        querySelectorAll(q) {
            if (q === '[aria-modal="true"], dialog[open]') return [];
            if (q === '[role="dialog"]:not([aria-hidden="true"])') return { length: st.ghost ? 1 : 2 };
            return { length: 2 };   /* the ghost is still in the page with its classes for the fade-out */
        },
        addEventListener(t, f) { (docL[t] = docL[t] || []).push(f); },
        dispatchEvent(e) { if (e.key === 'Escape') st.ghost = true; return true; }
    };
    const history = {
        get state() { return st.stack[st.i]; },
        pushState(s) { st.stack = st.stack.slice(0, st.i + 1); st.stack.push(s); st.i++; },
        back() { st.backs++; if (st.i > 0) st.i--; }
    };
    const W = { history, document: D, getComputedStyle: () => ({ display: 'block', visibility: 'visible', zIndex: '1' }), addEventListener(t, f) { (winL[t] = winL[t] || []).push(f); } };
    vm.runInNewContext(SRC, { window: W, document: D, history, KeyboardEvent: function (t, o) { return Object.assign({ type: t }, o); }, setTimeout: f => timers.push(f) });
    (docL.pointerdown || []).forEach(f => f({}));
    history.back(); (winL.popstate || []).forEach(f => f({})); while (timers.length) timers.shift()();
    assert.equal(st.ghost, true, 'Escape reached the panel');
    assert.equal(st.backs, 1, 'no second history.back (that left the app)');
    assert.equal(st.stack[st.i] && st.stack[st.i].lowiBack, 1, 'guard put back');
});

/* Run 51: the fourth layer from the same live probe (probe-back-layers.cjs, build 20261026-200906: LowiHerbStart.openInterview =
   LEFT_APP). The starter interview is a full sheet with no close button and had no Escape. */
function interview() {
    const src = read('herb-start.js');
    const a = src.indexOf('function ivNext(){'), b = src.indexOf("D.addEventListener('keydown',ivEsc,true);");
    assert.ok(a > 0 && b > a, 'interview Escape code found');
    const D = fakeDoc();
    let under = 0, painted = 0, closed = 0, timers = [];
    D.addEventListener('keydown', e => { if (e.key === 'Escape') under++; });
    const ctx = {
        D, C: { QUESTIONS: [{ id: 'a' }, { id: 'b' }, { id: 'c' }], newPlan: () => ({ actions: [] }) },
        IV: null, ivPaint() { painted++; }, ivClose() { closed++; ctx.IV = null; }, reduce: () => false,
        setTimeout: f => timers.push(f), pendClear() { }, plan: () => null, S: () => ({}), save() { }, R: () => ({}), t: k => k, refresh() { }
    };
    vm.createContext(ctx);
    vm.runInContext(src.slice(a, b + "D.addEventListener('keydown',ivEsc,true);".length) + ';this.ivNext=ivNext;', ctx);
    return { D, ctx, timers, get under() { return under; }, get closed() { return closed; } };
}

test('starter interview: back (Escape) goes one question back, and on the first screen means "Not now"', () => {
    const k = interview(), { D, ctx } = k;
    vm.runInContext('IV={step:2,answers:{},ov:{isConnected:true}}', ctx);
    D.escape();
    assert.equal(vm.runInContext('IV.step', ctx), 1, 'one question back (before: nothing, and back left the app)');
    D.escape(); D.escape();
    assert.equal(vm.runInContext('IV.step', ctx), -1, 'back to the first screen');
    assert.equal(k.under, 0, 'nothing under the interview reacted');
    D.escape();
    assert.equal(k.closed, 1, 'first screen: Escape = Not now, the sheet closes');
    D.escape();
    assert.equal(k.under, 1, 'with the interview gone, Escape reaches what is under it again');
});

test('starter interview: back from the plan returns to the last question, and the plan timer does not jump over it', () => {
    const k = interview(), { D, ctx, timers } = k;
    vm.runInContext('IV={step:2,answers:{},ov:{isConnected:true}}', ctx);
    ctx.ivNext();                                   /* last answer: "thinking" step 3, timer to the plan */
    assert.equal(vm.runInContext('IV.step', ctx), 3);
    D.escape();                                     /* back while thinking */
    assert.equal(vm.runInContext('IV.step', ctx), 2, 'back to the last question');
    timers.shift()();
    assert.equal(vm.runInContext('IV.step', ctx), 2, 'the old timer did not move it on to a half-made plan');
    vm.runInContext('IV.step=4', ctx);              /* the plan */
    D.escape();
    assert.equal(vm.runInContext('IV.step', ctx), 2, 'from the plan back to the last question');
});

test('back-swipe: a changed data-back-step counts as back did something', () => {
    const SRC = read('back-swipe.js');
    const st = { stack: [null], i: 0, step: '2', backs: 0 };
    const docL = {}, winL = {}, timers = [];
    const D = {
        documentElement: { className: 'wh-on' }, body: { className: '' }, activeElement: null,
        querySelector(q) { return q === '.tab.active' ? { id: 'tab-home' } : null; },
        querySelectorAll(q) {
            if (q === '[aria-modal="true"], dialog[open]') return [];
            if (q === '[data-back-step]') return [{ getAttribute: () => st.step }];
            return { length: 1 };
        },
        addEventListener(t, f) { (docL[t] = docL[t] || []).push(f); },
        dispatchEvent(e) { if (e.key === 'Escape') st.step = '1'; return true; }
    };
    const history = {
        get state() { return st.stack[st.i]; },
        pushState(s) { st.stack = st.stack.slice(0, st.i + 1); st.stack.push(s); st.i++; },
        back() { st.backs++; if (st.i > 0) st.i--; }
    };
    const W = { history, document: D, getComputedStyle: () => ({ display: 'block', visibility: 'visible', zIndex: '1' }), addEventListener(t, f) { (winL[t] = winL[t] || []).push(f); } };
    vm.runInNewContext(SRC, { window: W, document: D, history, KeyboardEvent: function (t, o) { return Object.assign({ type: t }, o); }, setTimeout: f => timers.push(f) });
    (docL.pointerdown || []).forEach(f => f({}));
    history.back(); (winL.popstate || []).forEach(f => f({})); while (timers.length) timers.shift()();
    assert.equal(st.step, '1', 'Escape reached the interview');
    assert.equal(st.backs, 1, 'no second history.back (that left the app)');
});
