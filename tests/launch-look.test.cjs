'use strict';
/* The launch scene shows Home's own bubbles (28 Oct 2026, evening). Emmanuel: "the bubbles are not the same bubbles as on
   my Home, and the colours don't match Home's ... where a bubble has no colour you can put colour in ... and a sound like
   when you open Netflix, vibrating, as if under water in a bubble".
   - lwBootJs keeps what Home's ring bubbles show (icon, number, liquid level and colours) in lowi.launch.look;
   - the script right after #lwLaunch fills the scene's eight bubbles from it (else from LWL_DEF: Home's icons);
   - a bubble dry on Home glows in its own colour;
   - an original launch sound, made with Web Audio, that never holds the app back and stays quiet where it may not play. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const boot = html.match(/<script id="lwBootJs">([\s\S]*?)<\/script>/)[1];
const scene = html.match(/<div id="lwLaunch"[\s\S]*?<\/div>(?=<script>)/)[0];
const reader = html.slice(html.indexOf(scene) + scene.length).match(/^<script>([\s\S]*?)<\/script>/)[1];
const css = html.match(/<style id="lwBootCss">([\s\S]*?)<\/style>/)[1];
const KEYS = ['settings', 'water', 'move', 'scan', 'joy', 'sleep', 'gap', 'fuel'];

function el(tag) {
    const e = { tagName: tag.toUpperCase(), className: '', children: [], attrs: {}, _html: '', textContent: '',
        style: { _p: {}, setProperty(k, v) { this._p[k] = String(v); } },
        appendChild(c) { this.children.push(c); return c; },
        getAttribute(k) { return this.attrs[k] == null ? null : this.attrs[k]; },
        get firstChild() { return this.children[0] || null; } };
    Object.defineProperty(e, 'innerHTML', { set(v) { e._html = v; }, get() { return e._html; } });
    return e;
}
function runReader(look, win) {
    const bubbles = KEYS.map(k => { const b = el('b'); b.className = 'lwl-b'; b.attrs['data-k'] = k; const i = b.appendChild(el('i')); i.appendChild(el('i')); return b; });
    const L = el('div'); L.querySelectorAll = () => bubbles; L.offsetWidth = 390;
    const store = { 'lowi.launch.look': look == null ? null : (typeof look === 'string' ? look : JSON.stringify(look)) };
    const rafs = [];
    const window = Object.assign({ innerWidth: 390, innerHeight: 844, requestAnimationFrame: f => rafs.push(f) }, win || {});
    const ctx = { window, performance: { now: () => 0 }, document: { getElementById: () => L, createElement: el }, localStorage: { getItem: k => store[k] == null ? null : store[k] }, JSON, Math, String };
    vm.runInNewContext(reader, ctx);
    const out = {};
    Object.defineProperty(out, '_L', { value: L }); Object.defineProperty(out, '_rafs', { value: rafs });
    bubbles.forEach(b => { out[b.attrs['data-k']] = { cls: b.className, p: b.style._p, items: (b.firstChild.children[1] || { children: [] }).children }; });
    return out;
}

test('the scene\'s eight bubbles are Home\'s ring, one per Home bubble, each with its liquid layer', () => {
    for (const k of KEYS) assert.match(scene, new RegExp('<b class="lwl-b" data-k="' + k + '" style="--a:-?\\d+deg;--i:\\d"><i><i class="lwl-lq"></i></i></b>'), k);
    assert.doesNotMatch(scene, /--c:/, 'no more planet colours');
});

test('first open (nothing saved yet): Home\'s icons from LWL_DEF in every bubble, each glowing in its own colour', () => {
    const D = JSON.parse(reader.match(/\/\*LWL_DEF\*\/([\s\S]*?)\/\*LWL_DEF_END\*\//)[1]);
    for (const k of KEYS) { assert.ok(D[k] && D[k].it.length, 'icon for ' + k); assert.ok(D[k].it.every(q => q.t !== 't'), 'no numbers in the default ' + k); }
    const r = runReader(null);
    for (const k of KEYS) {
        assert.match(r[k].cls, /lwl-dry/, k + ' glows');
        assert.match(r[k].p['--t'], /^\d+,\d+,\d+$/, k + ' colour');
        assert.ok(r[k].items.length >= 1, k + ' has its icon');
    }
    // Home's own colours where Home has one
    assert.equal(r.water.p['--t'], '110,200,255'); assert.equal(r.move.p['--u'], '30,190,150'); assert.equal(r.sleep.p['--t'], '190,170,255'); assert.equal(r.gap.p['--u'], '52,92,188');
});

test('after Home was shown: each bubble shows Home\'s own liquid level and colours, icon and number, scaled to the scene', () => {
    const look = { v: 1, t: 1, b: {
        water: { w: 88, f: 1, c: ['110,200,255', '40,120,240', 0.69, 0.92], it: [
            { t: 'm', u: 'url("data:image/svg+xml,x")', c: 'rgb(255, 255, 255)', x: 33, y: 20, w: 22, h: 22 },
            { t: 't', s: '6/6', fs: 13, fw: '800', c: 'rgb(255, 255, 255)', x: 32, y: 45, w: 24, h: 16 }] },
        move: { w: 88, f: 0.45, c: ['150,255,210', '30,190,150', 0.7, 0.9], it: [] },
        scan: { w: 88, f: 0, it: [{ t: 's', g: '<svg viewBox="0 0 24 24"><path d="M1 1" stroke="rgb(255, 255, 255)"></path></svg>', c: '#fff', x: 29, y: 28, w: 30, h: 30 }] } } };
    const r = runReader(look);
    assert.equal(r.water.p['--l'], '1'); assert.equal(r.water.p['--t'], '110,200,255'); assert.equal(r.water.p['--a2'], '0.92');
    assert.doesNotMatch(r.water.cls, /lwl-dry/);
    assert.equal(r.move.p['--l'], '0.45');
    assert.match(r.scan.cls, /lwl-dry/, 'dry on Home: glows in its colour'); assert.equal(r.scan.p['--t'], '255,228,150');
    const [ic, num] = r.water.items;
    assert.equal(num.textContent, '6/6');
    assert.equal(num.style.fontSize, 'calc(var(--lwl-d) * 0.1477)');
    assert.equal(ic.className, 'lwl-mk'); assert.match(ic.style.maskImage, /^url\(/);
    // positions are Home's, inside the membrane box that is 4% wider than the button
    assert.equal(ic.style.left, 'calc(var(--lwl-d) * ' + ((33 + 88 * .02) / 88).toFixed(4) + ')');
    assert.match(r.scan.items[0].innerHTML, /^<svg/);
    // a bubble Home did not save keeps the default icon
    assert.ok(r.sleep.items.length >= 1);
});

test('only drawing comes from the saved look: no scripts, no handlers, no foreign content, at most 12 items a bubble', () => {
    const bad = [{ t: 's', g: '<svg onload="alert(1)"></svg>', x: 0, y: 0, w: 9, h: 9 }, { t: 's', g: '<img src=x onerror=1>', x: 0, y: 0, w: 9, h: 9 },
        { t: 's', g: '<svg><script>1</script></svg>', x: 0, y: 0, w: 9, h: 9 }, { t: 'm', u: 'javascript:1', x: 0, y: 0, w: 9, h: 9 }, { t: 'x', x: 0, y: 0, w: 9, h: 9 }];
    const many = Array.from({ length: 20 }, () => ({ t: 't', s: '1', fs: 10, x: 0, y: 0, w: 5, h: 5 }));
    const r = runReader({ v: 1, b: { water: { w: 88, f: 0, it: bad }, move: { w: 88, f: 0, it: many } } });
    assert.equal(r.water.items.length, 0);
    assert.equal(r.move.items.length, 12);
    // broken or old data: the defaults
    for (const junk of ['{', JSON.stringify({ v: 2, b: {} })]) { const q = runReader(junk); assert.ok(q.water.items.length >= 1); }
});

test('Home\'s look is read only while Home is on screen, never from the launch scene, and saved when you leave the app', () => {
    assert.match(boot, /function lookSave\(\)/);
    assert.match(boot, /if \(!done \|\| document\.getElementById\("lwLaunch"\)\) return;/);
    assert.match(boot, /elementFromPoint/, 'a bubble covered by another page is not read');
    assert.match(boot, /if \(n < 6\) return;/, 'nothing half-read is saved');
    assert.match(boot, /var look = \{v:1, t:Date\.now\(\), b:out\}; if \(g\.x > 0 && g\.y > 0 && g\.r > 40 && g\.d > 30\) look\.g = g;\s*localStorage\.setItem\("lowi\.launch\.look", JSON\.stringify\(look\)\)/);
    for (const v of ['--o8-cx', '--o8-cy', '--o8-r', '--o8-d']) assert.ok(boot.includes('hs.getPropertyValue("' + v + '")'), 'Home\'s ring kept: ' + v);
    assert.match(boot, /visibilitychange[\s\S]{0,80}hidden[\s\S]{0,20}lookSave/);
    assert.match(boot, /"lowi:boot-ready", function\(\)\{ setTimeout\(lookSave, 2500\); \}/);
    assert.match(boot, /look: lookSave,/);
    assert.match(boot, /LowiBubbles\.core/, 'liquid colours exactly as Home\'s 3D bubbles compute them');
});

test('the bubbles look like Home\'s glass: a rim over the liquid, 4% wider than the button, and they land without swelling', () => {
    assert.match(css, /#lwLaunch \.lwl-b>i\{top:-2%;left:-2%;width:104%;height:104%;border-radius:50%;overflow:hidden;/);
    assert.match(css, /#lwLaunch \.lwl-b>i::after\{content:"";[^}]*background:radial-gradient\(closest-side,/);
    assert.match(css, /#lwLaunch \.lwl-lq\{[^}]*height:calc\(var\(--l,0\) \* 100%\)/);
    assert.doesNotMatch(css, /lwlBob/, 'the bubbles sit still on Home\'s spots: nothing to snap at the hand-over');
});

function soundCtx(state, prefs) {
    const log = { created: 0, osc: 0, resumed: 0, closed: 0 };
    const node = () => ({ connect() {}, start() {}, stop() {}, gain: { value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} },
        frequency: { value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} }, Q: {}, threshold: {}, ratio: {}, delayTime: {} });
    function AC() { log.created++; this.state = state; this.currentTime = 0; this.sampleRate = 8000; }
    AC.prototype.createGain = node; AC.prototype.createBiquadFilter = node; AC.prototype.createDynamicsCompressor = node; AC.prototype.createDelay = node; AC.prototype.createBufferSource = node;
    AC.prototype.createOscillator = function () { log.osc++; return node(); };
    AC.prototype.createBuffer = function (c, n) { const d = new Float32Array(n); return { getChannelData: () => d }; };
    AC.prototype.resume = function () { log.resumed++; const me = this; return { then(ok) { if (log.gesture) me.state = 'running'; if (me.state === 'running') ok(); } }; };
    AC.prototype.close = function () { log.closed++; };
    const L = {}, timers = [];
    const doc = { documentElement: { classList: { add() {}, remove() {}, contains() { return false; } }, getAttribute() { return null; } },
        addEventListener(t, f) { (L[t] = L[t] || []).push(f); }, removeEventListener(t, f) { L[t] = (L[t] || []).filter(g => g !== f); },
        getElementById() { return null; }, querySelectorAll() { return []; }, readyState: 'loading', styleSheets: [], fonts: null };
    const store = Object.assign({}, prefs);
    const win = { AudioContext: AC, navigator: { audioSession: { type: 'auto' } }, location: { search: '' }, addEventListener(t, f) { (L[t] = L[t] || []).push(f); } };
    win.window = win;
    const ctx = Object.assign(win, { document: doc, localStorage: { getItem: k => store[k] == null ? null : store[k], setItem() {} },
        setTimeout: (f, ms) => { timers.push([f, ms]); return timers.length; }, clearTimeout() {}, performance: { now: () => 0 }, Math, JSON, Float32Array, getComputedStyle: () => ({}) });
    return { ctx, log, L, timers, win };
}
function runSound(state, prefs) {
    const S = soundCtx(state, prefs);
    const a = boot.indexOf('  function chime(c){'), b = boot.indexOf('  launchSound();');
    vm.runInNewContext('var done = false, H = document.documentElement; function now(){ return 0; }\n' + boot.slice(a, b) + 'launchSound();', S.ctx);
    S.timers.splice(0).forEach(([f]) => { try { f(); } catch (e) { } });
    return S;
}

test('the launch sound plays with the scene where the browser lets it, mixes with music and follows the silent switch', () => {
    const S = runSound('running');
    assert.ok(S.log.osc >= 10, 'hum voices, thump and bubbles were made');
    assert.equal(S.win.navigator.audioSession.type, 'ambient');
    assert.ok(S.win.__LOWI_LAUNCH_SOUND != null);
});

test('iPhone: no sound without a tap; a tap while the scene is up plays it; otherwise it stays quiet and lets go', () => {
    const S = runSound('suspended');
    assert.equal(S.log.osc, 0, 'nothing plays on its own');
    S.log.gesture = true; (S.L.touchend || [])[0]();
    assert.ok(S.log.osc >= 10, 'the tap played it');
    const Q = runSound('suspended');
    (Q.L['lowi:boot-ready'] || []).forEach(f => f());
    Q.timers.splice(0).forEach(([f]) => f());
    assert.equal(Q.log.osc, 0); assert.equal(Q.log.closed, 1, 'audio released after the scene');
});

test('quiet when Sound\'s volume is 0 or the launch sound is turned off; never a file, never waited for', () => {
    assert.equal(runSound('running', { 'lowi.worldAudio': JSON.stringify({ on: true, vol: 0 }) }).log.created, 0);
    assert.equal(runSound('running', { 'lowi.launchSound': '0' }).log.created, 0);
    const snd = boot.slice(boot.indexOf('  function chime(c){'), boot.indexOf('  launchSound();'));
    assert.doesNotMatch(snd, /new Audio\(|fetch\(|\.mp3|\.wav|await /);
    assert.match(boot, /  launchSound\(\);\n/);
});
