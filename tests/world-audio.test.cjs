// World sound: opt-in calm soundscape + warp sounds in the 3D body world; no leaves inside the body.
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..');
const C = require('../world-audio-core.js');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const js = read('world-audio.js'), css = read('world-audio.css'), core = read('world-audio-core.js'), loader = read('apple-ui.js'), sw = read('sw.js');
const regions = read('body-world-regions.js'), season = read('season.js');

test('prefs: only volume and the warp switch are stored, never "on"', () => {
    assert.deepStrictEqual(C.loadPrefs(null), { vol: 40, warp: true });
    assert.deepStrictEqual(C.loadPrefs('{"vol":250,"warp":false,"on":true}'), { vol: 100, warp: false });
    assert.deepStrictEqual(C.loadPrefs('nonsense'), { vol: 40, warp: true });
    const s = JSON.parse(C.savePrefs({ vol: 12.6, warp: true, on: true }));
    assert.deepStrictEqual(s, { vol: 13, warp: true });
    assert.ok(!('on' in s));
    assert.ok(!/localStorage\.setItem\([^)]*\bon\b/.test(js));
});

test('volume curve: silent at 0, rising, capped and restrained', () => {
    assert.strictEqual(C.masterGain(0), 0);
    let prev = -1;
    for (let v = 0; v <= 100; v += 5) { const g = C.masterGain(v); assert.ok(g >= prev); prev = g; }
    assert.ok(C.masterGain(100) <= 0.5);
    assert.ok(C.masterGain(40) < 0.15, 'the default is quiet');
    assert.strictEqual(C.clampVol(-5), 0); assert.strictEqual(C.clampVol('x'), 40);
});

test('comfortable mix: nothing bright, slow fades, a limiter, no beeps', () => {
    for (const hz of C.allHz()) assert.ok(hz > 0 && hz <= C.MAX_HZ, 'frequency ' + hz);
    assert.ok(C.FADE_IN >= 2, 'slow fade in');
    assert.ok(C.MIX.limiter.ratio >= 8 && C.MIX.limiter.threshold <= -12);
    assert.ok(js.includes('createDynamicsCompressor'));
    assert.ok(!/type = 'square'|type = 'sawtooth'/.test(js), 'no harsh waveforms');
    assert.ok(C.MIX.pulse.attack >= 0.05, 'the pulse has a soft attack');
    const ts = C.pulses(0, 30); assert.ok(ts.length >= 18 && ts.length <= 30, 'about 40-55 soft pulses a minute');
    for (let i = 1; i < ts.length; i++) assert.ok(ts[i] - ts[i - 1] > 1);
});

test('no medical, sleep, tinnitus or anxiety claims in the copy', () => {
    const all = JSON.stringify(C.STR).toLowerCase();
    for (const w of ['tinnitus', 'anxiety', 'angst', 'ansiedad', 'heal', 'heil', 'cure', 'therap', 'sleep better', 'besser schlafen', 'treat', 'diagnos', 'medic'])
        assert.ok(!all.includes(w), w);
    for (const k of Object.keys(C.STR)) assert.strictEqual(C.STR[k].length, 3, k + ' en/de/es');
});

test('opt-in: the context is only made inside a tap, no autoplay on load', () => {
    assert.ok(js.includes('function setOn(') && js.includes('st.on = !!on'));
    assert.ok(/let prefs[\s\S]*?const st = \{ on: false/.test(js), 'starts off');
    const bootTail = js.slice(js.indexOf('/* ---------- lifecycle'));
    assert.ok(!/setOn\(true\)/.test(js), 'nothing turns it on by itself');
    assert.ok(bootTail.includes("if (!st.on || D.hidden || !st.ctx) return;"), 'resume only after the user turned it on');
    assert.ok(js.includes('ctx.resume()'));
});

test('lifecycle: world close, hidden app and page hide stop the sound', () => {
    assert.ok(js.includes("if (!open) { pause(C.CLOSE_FADE)"));
    assert.ok(js.includes("if (D.hidden) { killWarp(0.05); stopAmbient(0)") && js.includes('st.ctx.suspend()'));
    assert.ok(js.includes("'pagehide'") && js.includes('st.ctx.close()'));
    assert.ok(C.audible({ on: true, open: true, hidden: false }));
    assert.ok(!C.audible({ on: true, open: false, hidden: false }));
    assert.ok(!C.audible({ on: true, open: true, hidden: true }));
    assert.ok(!C.audible({ on: false, open: true, hidden: false }));
    assert.ok(!C.warpAudible({ on: true, open: true, hidden: false, warp: false, running: true }));
});

test('warp sounds follow the real fly-to phases, once each', () => {
    for (const p of ['start', 'dive', 'arrive', 'cancel']) assert.ok(regions.includes("warpEv('" + p + "'"), p);
    assert.ok(regions.includes("new CustomEvent('lowi:world-warp'"));
    assert.ok(js.includes("addEventListener('lowi:world-warp'"));
    let g = C.guard(null, 'start', 'liver', 10); assert.ok(g.play);
    g = C.guard(g.last, 'start', 'liver', 10.1); assert.ok(!g.play, 'duplicate ignored');
    g = C.guard(g.last, 'dive', 'liver', 10.2); assert.ok(g.play);
    g = C.guard(g.last, 'start', 'liver', 11); assert.ok(g.play, 'a new trip plays again');
    assert.ok(js.includes('killWarp(0.12)'), 'one warp voice at a time');
});

test('UI: a Klang pill in the world top bar with switch, volume and warp toggle', () => {
    assert.ok(js.includes("top.insertBefore(btn, x)"));
    assert.ok(js.includes('role="switch" data-wa="on"') && js.includes('type="range"') && js.includes('data-wa="warp"'));
    assert.ok(/\.wa-btn \{[^}]*height: 44px/.test(css), '44px tap target');
    assert.ok(js.includes("'world-audio.css'") && !loader.includes("'world-audio.css'"));
});

test('no leaves inside the body: season adds no 3D particles, keeps Home leaves', () => {
    assert.ok(!season.includes('new THREE.Points') && !season.includes('a.hub.add('), 'no motes in the hub');
    assert.ok(!season.includes('moteTexture'));
    assert.ok(season.includes('ssn-p'), 'Home leaf layer stays');
    assert.ok(season.includes('bg.lerp(haze, haze.amt)'), 'soft season haze stays');
});

test('loader and service worker', () => {
    const files = loader.match(/const files=\[([^\]]*)\]/)[1];
    assert.ok(files.indexOf("'world-audio-core.js'") >= 0 && files.indexOf("'world-audio-core.js'") < files.indexOf("'world-audio.js'"));
    const lines = sw.split('\n').filter(l => l.includes('"xp-tap.css"'));
    assert.strictEqual(lines.length, 2);
    for (const l of lines) for (const f of ['world-audio-core.js', 'world-audio.js', 'world-audio.css']) assert.ok(l.includes('"' + f + '"'), f);
    assert.ok(!/award\(|addXp|LowiXp/.test(js + core), 'no XP from sound');
});
