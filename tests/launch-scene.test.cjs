'use strict';
// Oct 28 2026, Emmanuel on his iPhone (home-screen app): "black first, then it blinks white, then the loading thing for like a second
// ... when you open the app, only the animation, a bit more impressive, more fitting to our whole app design."
// The white blink: the boot gate hid the body with opacity 0, and WebKit shows nothing of a page whose body is hidden until the page
// has loaded (LocalFrameView::qualifiesAsVisuallyNonEmpty), so the empty white web view showed after the startup picture.
// Now the body opens early, its first element is the launch scene #lwLaunch, the body stays visible and only the app under the scene
// is held back. The scene plays while the app loads, never adds waiting time, and dissolves into Home, its bubbles on Home's ring.
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const bootJs = (html.match(/<script id="lwBootJs">([\s\S]*?)<\/script>/) || [])[1] || '';
const bootCss = (html.match(/<style id="lwBootCss">([\s\S]*?)<\/style>/) || [])[1] || '';
const scene = (html.match(/<div id="lwLaunch"[\s\S]*?<\/div>(?=<script>)/) || [])[0] || '';
const noComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '');

test('the body opens with the launch scene as its very first element, and the scene is built at once', () => {
    assert.ok(scene.length > 500, 'scene markup found');
    const body = html.search(/<body[\s>]/), first = html.indexOf('<', html.indexOf('>', body) + 1);
    assert.strictEqual(html.slice(first, first + 18), '<div id="lwLaunch"', 'the first thing in the body is the scene');
    assert.strictEqual(html.split('id="lwLaunch"').length, 2, 'exactly one scene');
    assert.ok(html.indexOf('</head>') < first && html.indexOf('</head>') < html.indexOf('<div id="app"'));
    assert.match(html.slice(first, first + scene.length + 20000), /<\/div><script>(?:(?!<\/script>)[\s\S])*document\.getElementById\("lwLaunch"\)\.offsetWidth<\/script>/, 'laid out right away (after Home\'s bubbles are filled in)');
    assert.ok(html.indexOf('id="lwLaunch"') < html.indexOf('<link rel="stylesheet"', body), 'before the app stylesheets, so they never hold up its first frame');
});

test('WebKit counts the scene as content from the first frame: an opaque cover and a fixed-size inline SVG, nothing to load', () => {
    assert.match(scene, /<svg class="lwl-gl" width="48" height="48"/);
    assert.doesNotMatch(scene.replace(/url\(#[\w-]+\)/g, ""), /<img|url\(|src=/, 'nothing in the scene waits for the network');
    assert.doesNotMatch(noComments(bootCss).match(/#lwLaunch\{[^}]*\}/)[0], /url\(/);
    assert.match(bootCss, /#lwLaunch\{position:fixed;top:0;right:0;bottom:0;left:0;z-index:2147483647;/);
    assert.match(bootCss, /#03050a 82%\) #03050a;/, 'opaque: a solid colour under the gradient');
});

test('the body is never hidden while starting; only the app under the scene is', () => {
    const css = noComments(bootCss);
    assert.doesNotMatch(css, /html\.lw-boot body\s*[,{]/);
    assert.doesNotMatch(css, /html\.lw-boot body\{[^}]*(opacity|visibility|display)/);
    assert.match(css, /html\.lw-boot body>:not\(#lwLaunch\),html\.lw-boot>:not\(head\):not\(body\)\{opacity:0!important/);
    assert.match(css, /html:not\(\.lw-boot\):not\(\.lw-launch-out\) #lwLaunch\{display:none!important\}/, 'gone once Home shows');
    assert.match(css, /html\.lw-boot #lwLaunch,html\.lw-boot #lwLaunch \*,html\.lw-launch-out #lwLaunch \*\{animation-play-state:running!important\}/, 'the scene plays while the app\'s own animations wait');
});

test('the scene: no logo and no text, hidden from VoiceOver, sparks gather into Misty\'s glow, eight glass bubbles land on Home\'s ring', () => {
    assert.strictEqual(scene.replace(/<[^>]+>/g, '').trim(), '', 'no text in the scene');
    assert.doesNotMatch(scene + bootCss, /LOW<i>i<\/i>SPIKE|LOWiSPIKE<|wordmark\{/);
    assert.match(scene, /^<div id="lwLaunch" aria-hidden="true">/);
    assert.strictEqual((scene.match(/class="lwl-b[\s"]/g) || []).length, 8, 'eight bubbles, like Home');
    assert.ok((scene.match(/class="lwl-k"/g) || []).length >= 12, 'sparks');
    assert.match(bootCss, /--lwl-x:var\(--o8-cx,50vw\);--lwl-y:var\(--o8-cy,46vh\);--lwl-r:var\(--o8-r,[^;]+\);--lwl-d:var\(--o8-d,[^;]+\);/, 'placed with Home\'s ring geometry');
    const orbit = fs.readFileSync(path.join(root, 'home-orbit-v2.js'), 'utf8');
    for (const v of ['--o8-cx', '--o8-cy']) assert.ok(orbit.includes("setVar(H, '" + v + "'"), 'Home sets ' + v + ' on the html element');
    assert.match(bootCss, /@keyframes lwlIn\{/, 'bubbles spiral in');
    assert.match(bootCss, /@keyframes lwlGather\{/, 'sparks gather');
});

test('dark in both themes: the scene uses fixed colours, never the theme\'s background', () => {
    const sceneCss = noComments(bootCss).split('\n').filter(l => l.includes('#lwLaunch')).join('\n');
    assert.doesNotMatch(sceneCss, /var\(--(bg|card|text|ink)/, 'no theme colours in the scene');
    assert.match(bootCss, /html\.lw-boot,html\.lw-launch-out\{background:#03050a!important;color-scheme:dark\}/);
});

test('Reduce Motion: the bubbles simply fade in, no spiral, no shock ring, no shine', () => {
    const rm = (bootCss.match(/@media \(prefers-reduced-motion:reduce\)\{([\s\S]*?)\n\}/) || [])[1] || '';
    assert.match(rm, /#lwLaunch \.lwl-b\{animation:lwlFade/);
    assert.match(rm, /#lwLaunch \.lwl-wave,#lwLaunch \.lwl-shine,#lwLaunch \.lwl-gl\{display:none\}/);
    assert.match(rm, /#lwLaunch \.lwl-core\{animation:none/);
});

/* run the gate: the scene leaves the page after the fade, and nothing waits for the animation */
function runGate() {
    const timers = [], cls = new Set(), docL = {}, rafs = [];
    const L = { id: 'lwLaunch', parentNode: null }; const body = { removeChild(c) { c.parentNode = null; this.gone = c; } }; L.parentNode = body;
    const H = { classList: { add: c => cls.add(c), remove: c => cls.delete(c), contains: c => cls.has(c) } };
    const document = { documentElement: H, readyState: 'loading', getElementById: id => (id === 'lwLaunch' && L.parentNode ? L : null),
        querySelectorAll: () => [], addEventListener: (t, f) => { (docL[t] = docL[t] || []).push(f); } };
    const win = { document, location: { search: '' }, Date: { now: () => 0 }, performance: { now: () => 1 }, innerWidth: 390, innerHeight: 844,
        getComputedStyle: () => ({ visibility: 'visible', opacity: '1' }), matchMedia: () => ({ matches: false }),
        setTimeout: (f, ms) => { const x = { f, ms }; timers.push(x); return x; }, clearTimeout: x => { const i = timers.indexOf(x); if (i >= 0) timers.splice(i, 1); },
        requestAnimationFrame: f => { rafs.push(f); return rafs.length; }, addEventListener() {}, dispatchEvent() {}, CustomEvent: function () {} };
    win.window = win;
    vm.runInNewContext(bootJs, win);
    return { win, cls, timers, L, body, docL };
}

test('when Home is ready the scene dissolves (taps go through at once) and is removed from the page 380 ms later', () => {
    const g = runGate();
    assert.ok(g.cls.has('lw-boot'));
    g.win.LowiBoot.reveal('test');
    assert.ok(!g.cls.has('lw-boot') && g.cls.has('lw-launch-out'), 'fading out, Home visible underneath');
    assert.ok(g.L.parentNode, 'the scene stays for its fade');
    const t = g.timers.find(x => x.ms === 380); assert.ok(t, 'removal after the fade');
    t.f();
    assert.ok(!g.cls.has('lw-launch-out'));
    assert.strictEqual(g.L.parentNode, null, 'the scene has left the page');
    assert.ok(!/minimum|MIN_SHOW|minShow|animationend/i.test(bootJs), 'Home never waits for the animation');
});
