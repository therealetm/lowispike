// 24 Nov 2026 (Emmanuel: "opening the app takes way too long. I don't even like the animation anymore ... black ... something glowing in
// the middle, vibrating ... then it goes into the color of whatever the person has set to their world ... a seamless illusion ... the
// goal is the fastest app opening in the world"). The launch scene is now only Misty's glow, breathing, in the world's aura colours; it
// opens up into Home. The final layout wait is shorter.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const css = (/<style id="lwBootCss">([\s\S]*?)<\/style>/.exec(html) || [])[1];
const boot = (/<script id="lwBootJs">([\s\S]*?)<\/script>/.exec(html) || [])[1];
test('no flat bubbles flying out (they did not match Home\'s 3D glass bubbles) and no navy brightening (Home is the black world)', () => {
  assert.match(css, /#lwLaunch \.lwl-arm\{display:none\}/); assert.match(css, /#lwLaunch\.lwl-go \.lwl-neb\{animation:none\}/);
});
test('Misty\'s glow breathes in the world\'s aura colours and opens up into Home', () => {
  assert.match(css, /#lwLaunch\.lwl-go \.lwl-core\{animation:lwlCore \.5s cubic-bezier\([^)]*\) both,lwlBreath 1\.1s ease-in-out \.5s infinite alternate\}/);
  assert.match(css, /var\(--lwl-ca,#c9f1ff\)/); assert.match(css, /html\.lw-launch-out #lwLaunch \.lwl-m\{animation:lwlOpen \.34s/);
  assert.match(css, /@keyframes lwlOpen\{from\{transform:scale\(1\);opacity:1\}to\{transform:scale\(1\.35\);opacity:0\}\}/);
  assert.match(boot, /look\.au = \[aa, ab\];/); assert.match(html, /L\.style\.setProperty\("--lwl-ca", au\[0\]\); L\.style\.setProperty\("--lwl-cb", au\[1\]\);/);
  const red = css.slice(css.indexOf('@media (prefers-reduced-motion:reduce)'));
  assert.match(red, /#lwLaunch \.lwl-core,#lwLaunch\.lwl-go \.lwl-core\{animation:none/, 'still for reduced motion'); assert.ok(css.indexOf('lwlBreath 1.1s') < css.indexOf('@media (prefers-reduced-motion:reduce)'));
});
test('the last wait before Home: two still polls or 0.35 s (was three polls or 0.7 s, so every launch waited 0.7 s)', () => {
  assert.match(boot, /if \(seen && same >= 2\) \{ fin\("still"\); return; \}/); assert.match(boot, /Date\.now\(\) - q >= 350 && Date\.now\(\) - w\.at >= 150/);
});
