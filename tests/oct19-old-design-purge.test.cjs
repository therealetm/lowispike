'use strict';
/* Oct 19 old-design purge (Emmanuel: "Any old UI should be deleted, any old design. I'm seeing that some still have old logos or old
   companion design"). Each check fails on the build before the purge (20261019-130951). */
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('fs'), path = require('path'), crypto = require('crypto'), vm = require('vm');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const md5 = b => crypto.createHash('md5').update(b).digest('hex');
const html = read('index.html');
/* the round-1 pulse-line-in-a-circle logo, as icon-180/192/512.png and as the inline favicon + apple-touch-icon */
const OLD_LOGO = ['9e0c7e2aea47238636122294a164c52a', 'f2d254f3a4b14b5c55321d8a18574acf', 'c9894c82902242879fe54bd59eeefc0c'];
const pngSize = b => ({ sig: b.slice(1, 4).toString(), w: b.readUInt32BE(16), h: b.readUInt32BE(20), colorType: b[25] });

test('app icons are the current Misty cell, not the old pulse-line logo', () => {
  for (const n of [180, 192, 512]) {
    const b = fs.readFileSync(path.join(root, 'icon-' + n + '.png'));
    assert.ok(!OLD_LOGO.includes(md5(b)), 'icon-' + n + '.png is still the old logo');
    const s = pngSize(b);
    assert.equal(s.sig, 'PNG'); assert.equal(s.w, n); assert.equal(s.h, n);
    assert.equal(s.colorType, 2, 'icon-' + n + ' must be opaque RGB (iOS fills transparency with black)');
  }
  const links = [...html.matchAll(/<link rel="(apple-touch-icon|icon)" href="data:image\/png;base64,([^"]+)"/g)];
  assert.equal(links.length, 2, 'favicon + apple-touch-icon stay inline');
  for (const m of links) assert.ok(!OLD_LOGO.includes(md5(Buffer.from(m[2], 'base64'))), m[1] + ' is still the old logo');
  const man = JSON.parse(read('manifest.webmanifest'));
  for (const i of man.icons) assert.ok(fs.existsSync(path.join(root, i.src)), i.src);
  assert.ok(fs.existsSync(path.join(root, 'tools/brand/make-icons.cjs')), 'the icon maker stays, so the icon can be redrawn from Misty');
});

test('launch screen: Misty-blue glass cell, no gold orb or gold i', () => {
  const css = html.slice(html.indexOf('<style id="lwBootCss">'), html.indexOf('</style>', html.indexOf('<style id="lwBootCss">')));
  assert.ok(css.length > 200);
  assert.doesNotMatch(css, /#f4c95a|#c98b1f|#fff8dc|#e8b33f|244,\s*201,\s*90/i, 'gold is back on the launch screen');
  assert.match(css, /\.lwb-orb::before\{[^}]*#0d1b3d/, 'the launch cell has Misty\'s eyes');
  assert.match(css, /\.lwb-w i\{font-style:normal;color:#7fe3ff\}/);
  assert.doesNotMatch(html, /\.r2-logo span\{font-style:italic;color:var\(--gold2/, 'the gold italic i in the wordmark is back');
});

test('the old photo sign-up screen (#onboard) is gone and its entry points open Profile', () => {
  assert.doesNotMatch(html, /id="onboard"|id="obTrack"|class="ob-hero"|\.ob-hero\{|#onboard\{/, 'old #onboard markup or CSS');
  assert.doesNotMatch(html, /function (startOnboarding|finishOnboarding|obGo|obCheck)\(/, 'old onboarding functions');
  assert.doesNotMatch(html, /data:image\/jpeg;base64/, 'a raster photo is embedded again (the old sign-up hero was one)');
  assert.match(html, /window\.openOnboarding = \(\) => goTab\("profile"\);/);
  assert.match(html, /case "setupprofile": goTab\("profile"\); return;/);
  assert.doesNotMatch(html, /obGo\(|\$\("#onboard"\)/, 'a leftover call into the deleted screen');
});

test('daily ritual never falls back to the old potted herb', () => {
  const src = read('daily-ritual.js');
  const fn = src.slice(src.indexOf('function herbSVG()'), src.indexOf('function activeKeys()'));
  assert.ok(fn.length > 50);
  assert.doesNotMatch(fn, /#7ad97a|#a58cff|M32 52V30/i, 'potted herb art');
  assert.match(fn, /plantHTML\(c\.m, 'node', c\.p\)/, 'draws the current Misty when Home is not on screen');
  /* run it with no Home on the page and no Misty renderer: the plain glass cell, never a plant */
  const ctx = { W: {}, $: () => null }; vm.createContext(ctx);
  vm.runInContext('var W=this.W,$=this.$;' + fn + ';this.out=herbSVG();', ctx);
  assert.match(ctx.out, /class="dr-cell"/);
  ctx.W.LowiHerbTamagotchi = { current: () => ({ m: { id: 1 }, p: 'p' }), plantHTML: (m, size) => '<svg class="tmg-plant" data-size="' + size + '"></svg>' };
  vm.runInContext('this.out=herbSVG();', ctx);
  assert.match(ctx.out, /tmg-plant/);
});

test('Community: your own orb and chat avatar are the real Misty, friends keep their own form', () => {
  const src = read('community-chat.js');
  const a = src.indexOf('let ownArt='), b = src.indexOf('\n', src.indexOf('function mate(id,key)'));
  assert.ok(a > 0 && b > a, 'ownMisty + mate');
  const ctx = {
    W: { LowiCompanionCore: { miniSVG: (g, k) => '<svg class="cf-mini" data-k="' + k + '"></svg>' } }, D: { querySelector: () => null },
    scope: 'u-me', own: () => ({ n: 'Misty' }), genomeFor: id => ({ id }), spirit: () => '<svg class="cp-spirit"></svg>'
  };
  vm.createContext(ctx);
  vm.runInContext('var W=this.W,D=this.D,scope=this.scope,own=this.own,genomeFor=this.genomeFor,spirit=this.spirit;' + src.slice(a, b) + ';this.mate=mate;', ctx);
  ctx.W.LowiHerbTamagotchi = { current: () => ({ m: {}, p: 'p' }), plantHTML: (m, size, p, o) => '<svg class="tmg-plant cf-form" data-size="' + size + '" aria-label="' + o.label + '"></svg>' };
  const me = ctx.mate('u-me', 'g0');
  assert.match(me, /cp-own/); assert.match(me, /tmg-plant/); assert.doesNotMatch(me, /cf-mini/, 'own orb is still the old mini blob');
  assert.match(ctx.mate('me', 'g1'), /tmg-plant/);
  assert.match(ctx.mate('u-friend', 'g2'), /cf-mini/, 'friends keep their own mini form');
});

test('companion forms entry shows the real Misty cell', () => {
  const src = read('companion.js');
  const e = src.slice(src.indexOf('function entryBtn()'), src.indexOf('function entries()'));
  assert.match(e, /ownArt\(g\)/); assert.doesNotMatch(e, /C\.miniSVG\(g, 'entry'\)/);
  assert.match(src, /function ownArt\(g\) \{[\s\S]{0,200}T\.plantHTML\(c\.m, 'node', c\.p\)/);
});
