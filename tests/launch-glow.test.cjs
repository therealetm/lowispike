// 24 Nov 2026. First (evening): Misty's glow in the aura colours. Changed the same night (Emmanuel: "This is even worse ... When the app
// is opened, it looks completely different to the intro. I would rather have it completely darked out in black with some falling stars
// ... Whatever the intro is needs to be precisely fitting to how the interface galaxy looks"). Home on his iPhone is a neutral
// near-black (#121214 to #181818), so the launch is that near-black with a few small falling stars, then a plain fade into Home.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const css = (/<style id="lwBootCss">([\s\S]*?)<\/style>/.exec(html) || [])[1];
const boot = (/<script id="lwBootJs">([\s\S]*?)<\/script>/.exec(html) || [])[1];
const red = css.slice(css.indexOf('@media (prefers-reduced-motion:reduce)'));
test('the launch is Home\'s near-black, not navy, and shows no glow, glass or bubbles (none of them matched Home)', () => {
  assert.match(css, /#lwLaunch\{background:linear-gradient\(180deg,#171718 0,#121213 55%,#101011 100%\) #121213\}/);
  assert.match(css, /#lwLaunch \.lwl-neb,#lwLaunch \.lwl-m,#lwLaunch \.lwl-arm\{display:none\}/);
  assert.ok(css.indexOf('#lwLaunch{background:linear-gradient(180deg,#171718') > css.indexOf('#lwLaunch{position:fixed'), 'overrides the old navy scene');
});
test('a few small stars fall slowly; still for reduced motion', () => {
  assert.match(css, /#lwLaunch\.lwl-go \.lwl-s\{animation:lwlFall var\(--t,3s\) linear var\(--dl,0s\) infinite\}/);
  assert.match(css, /@keyframes lwlFall\{0%\{transform:translateY\(-6vh\);opacity:0\}/);
  assert.match(red, /#lwLaunch\.lwl-go \.lwl-s\{animation:none;opacity:\.5\}/);
  assert.ok((html.match(/<i class="lwl-s" style="--x:/g) || []).length >= 10);
});
test('the hand-over is a plain fade; the aura colours are still saved for later use', () => {
  assert.match(css, /html\.lw-launch-out #lwLaunch\{pointer-events:none;animation:lwlOut \.34s/); assert.match(css, /html\.lw-launch-out #lwLaunch \.lwl-m\{animation:none\}/);
  assert.match(boot, /look\.au = \[aa, ab\];/);
});
test('the last wait before Home: two still polls or 0.35 s (was three polls or 0.7 s, so every launch waited 0.7 s)', () => {
  assert.match(boot, /if \(seen && same >= 2\) \{ fin\("still"\); return; \}/); assert.match(boot, /Date\.now\(\) - q >= 350 && Date\.now\(\) - w\.at >= 150/);
});
