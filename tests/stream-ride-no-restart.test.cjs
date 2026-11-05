'use strict';
/* Nov 5 2026, owner Phase B item 5: "the game restarts after the flying section, near the stream transition".
   Not reproduced yet (simulated browser only): tools/stream-restart-probe.cjs (Chromium, 150 s: broke out, rode current 5, autopilot,
   0 page reloads, the only "home again" was the autopilot flying her home or the probe's own push) and tools/soak/crash-soak.cjs
   (WebKit, galaxy:4,auto:6, 879 s, 1 page load, no crash, no errors). So there is NO fix here. This file is a guard: it pins down the
   things that would make riding a current (a stream) restart the game, so a change that adds one fails here first. When the owner's
   exact steps or a crash log arrive, the real reproduction goes into tools/stream-restart-probe.cjs and a behaviour test here. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const gb = read('galaxy-bubbles.js'), mg = read('misty-galaxy.js'), mf = read('misty-flight.js'), sp = read('string-pov.js'), at = read('adventure-tiers.js');

test('nothing on the flight / galaxy / stream path reloads or navigates the page', () => {
    for (const [f, s] of [['galaxy-bubbles.js', gb], ['misty-galaxy.js', mg], ['misty-flight.js', mf], ['string-pov.js', sp], ['adventure-tiers.js', at]]) {
        assert.doesNotMatch(s, /location\.reload|location\.replace\(|location\.href\s*=|location\.assign\(/, f + ' must not reload the page');
    }
});

test('catching or leaving a current only notes it and tells adventure-tiers; it never ends the flight or resets the galaxy', () => {
    const i = gb.indexOf('if (riding !== B.riding)');
    assert.ok(i > 0, 'the current-change block is where it was');
    const line = gb.slice(i, gb.indexOf('\n', i));
    assert.match(line, /lowi:galaxy-stream/);
    assert.match(line, /off current/);
    assert.doesNotMatch(line, /\.reset\(|\.stop\(|\bend\(|LowiMistyFlight|LowiMistyGalaxy|LowiStringPov/, 'no reset / end / stop when a current starts or ends');
});

test('the stream event only counts a visit (your own first ride), nothing else', () => {
    assert.match(at, /W\.addEventListener\('lowi:galaxy-stream', \(\) => visit\('streams'\)\);/);
    assert.equal((at.match(/lowi:galaxy-stream/g) || []).length, 1, 'one listener only');
    const v = at.slice(at.indexOf('function visit(id)'), at.indexOf('if (W.addEventListener)'));
    assert.doesNotMatch(v, /reset|reload|LowiMistyFlight|LowiMistyGalaxy|open\(|show\(/, 'a counted visit opens nothing and resets nothing');
});

test('the galaxy sends her home only when she is back inside her own bubble (not on a current)', () => {
    const i = mg.indexOf("note('home again')");
    assert.ok(i > 0);
    const line = mg.slice(mg.lastIndexOf('\n', i), i);
    assert.match(line, /if \(L < reach \* GAL\.BACK\)/, 'home again needs her inside her own edge');
});

test('the reproduction probe exists and says plainly it is a simulated browser', () => {
    const p = read('tools/stream-restart-probe.cjs');
    assert.match(p, /Simulated browser only, not a real iPhone/);
    assert.match(p, /page reloaded/);
    assert.match(p, /end \(abort\|tapped-away\|left\|warp-timeout\|out-timeout\)\|home again/);
});
