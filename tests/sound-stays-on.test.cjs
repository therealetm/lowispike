// Oct 22 2026 (Emmanuel: "When user turns sound on it should stay on all the time even if they leave the app. And it should stay on
// or turn on when they come back on the app."): every sound switch keeps its on choice across leaving the app, reloads and fresh opens,
// and sound comes back on return or on the first tap where the browser blocks it. Fails on the old code (world sound never stored "on").
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const C = require('../world-audio-core.js');
const wa = read('world-audio.js'), tv = read('tutorial-voice.js'), aff = read('affiliates/script-voice.js'), html = read('index.html');

test('world sound: the on choice is stored and read back (a reload keeps it on)', () => {
    const saved = C.savePrefs({ vol: 55, warp: true, on: true });
    assert.strictEqual(JSON.parse(saved).on, true, 'on is written');
    assert.strictEqual(C.loadPrefs(saved).on, true, 'on is read back after a reload');
    assert.strictEqual(C.loadPrefs(C.savePrefs({ vol: 55, on: false })).on, false, 'off stays off');
    assert.strictEqual(C.loadPrefs(null).on, false, 'a new user starts silent');
    assert.strictEqual(C.loadPrefs('{"on":"yes"}').on, false, 'only a real true turns it on');
});

test('world sound: boot restores it, only the switch writes it, return and first tap bring it back', () => {
    assert.ok(/const st = \{ on: false[^\n]*\n[\s\S]{0,300}if \(prefs\.on\) st\.on = true;/.test(wa), 'restored right after the engine state');
    const setOn = wa.slice(wa.indexOf('function setOn('), wa.indexOf('/* ---------- warp sounds'));
    assert.ok(setOn.includes('prefs.on = st.on; save();'), 'the switch stores the choice');
    const vis = wa.slice(wa.indexOf("D.addEventListener('visibilitychange'"), wa.indexOf("W.addEventListener('lowi:lang'"));
    assert.ok(!/prefs\.on\s*=|setOn\(false\)/.test(vis), 'hiding the app never turns the choice off');
    assert.ok(vis.includes('if (D.hidden) { if (!st.ctx) return;') && vis.includes('else if (audible()) begin();'), 'back in front: begins again, also with a closed context');
    assert.ok(wa.includes("W.addEventListener('pageshow'") && /e\.persisted\) \{ wasPlay = false; sync\(\)/.test(wa), 'page cache return restarts it');
    assert.ok(wa.includes('else begin();   /* also right after a reload'), 'sync starts it even before a context exists');
    const tap = wa.slice(wa.indexOf('function tapResume('), wa.indexOf("D.addEventListener('click', tapResume"));
    assert.ok(tap.includes('if (!st.on || D.hidden) return;') && tap.includes('begin(); unlock(st.ctx);'), 'first tap anywhere makes, resumes and unlocks the context');
    assert.ok(wa.includes("D.addEventListener('keydown', tapResume, true)"));
    assert.ok(/ctx\.state === 'interrupted' \|\| ctx\.state === 'suspended'\) && audible\(\)\) \{ try \{ const p = ctx\.resume\(\)/.test(wa), 'iOS interrupted/suspended is resumed');
    assert.ok(wa.includes('unlocked: false });'), 'a new context needs its own unlock');
    assert.strictEqual((wa.match(/setOn\(true\)/g) || []).length, 1, 'nothing else turns it on by itself');
});

test('tutorial voice: stays on, reads the card again on return, first tap reads a blocked card', () => {
    assert.ok(tv.includes("let on = pref.get() === '1'"), 'stored choice');
    assert.ok(/visibilitychange', \(\) => \{ if \(D\.hidden\) halt\(\); else comeBack\(\); \}/.test(tv));
    assert.ok(tv.includes("W.addEventListener('pageshow', e => { if (e && e.persisted) comeBack(); });"));
    const cb = tv.slice(tv.indexOf('function comeBack('), tv.indexOf("D.addEventListener('visibilitychange'"));
    assert.ok(cb.includes('quietNow') && cb.includes("H.classList.contains('lt-on')") && cb.includes('say(ctxNow.sp)'), 'only while the tour is open and not paused');
    const g = tv.slice(tv.indexOf('function onGesture('), tv.indexOf("D.addEventListener('touchend', onGesture"));
    assert.ok(g.includes("closest('.lt-speak')") && /if \(blocked && ctxNow && !quietNow && !onSpeaker\) \{[^\n]*say\(ctxNow\.sp\)/.test(g), 'first tap anywhere (not the speaker) reads it');
    assert.ok(!/on = false|pref\.set\(false\)/.test(g + cb), 'nothing but the speaker turns it off');
    const say = tv.slice(tv.indexOf('async function say('), tv.indexOf('let ctxNow'));
    assert.ok(say.includes("if (e && e.name === 'NotAllowedError') { blocked = true;") && !/\bon = /.test(say), 'blocked keeps the speaker ON');
});

test('affiliate script read aloud: goes on from the same line when the app is back', () => {
    assert.ok(aff.includes("if (D.hidden) { hidPaused = status === 'playing'; pause(); return; }"));
    assert.ok(aff.includes("if (hidPaused && status === 'paused' && group && items.length && frameShown()) start(group, items, Math.min(idx, items.length - 1));"));
});

test('app sounds: stored switch, woken again after iOS interrupted/suspended', () => {
    assert.ok(html.includes('const KEY = "lowi_sfx";'));
    assert.ok(html.includes('["touchend", "click", "keydown"].forEach(t => document.addEventListener(t, wakeSfx, {capture:true, passive:true}));'));
    assert.ok(html.includes('ac.state === "suspended" || ac.state === "interrupted"'));
    assert.ok(/const wakeSfx = \(\) => \{ if \(document\.hidden \|\| !S\.on\) return;/.test(html), 'never wakes sound the user switched off');
});
