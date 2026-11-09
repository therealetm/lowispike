'use strict';
/* Nov 9 2026 (Emmanuel: "Das Video, was da ist, ist zwar gut, aber es ist immer noch falsch. Weil das nicht wirklich zum neuesten
   Standard ist"). The Quick tour is remade from today's app: one German and one English cut, the same eight scenes and the same
   length (companion, scan, carousel posts, share on WhatsApp or as a story, the weekly challenge, recipes to listen to, the
   supermarket, end card), short captions, a spoken line per scene. It is back on the app's first screen as one small pill.
   Three things the new footage showed were fixed on the way: "· now" in the German For You feed, the pale line on the
   "Anhören: mitkochen" button, and the round back button sitting on the caption at the foot of a For You post. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const Q = require('../quick-tour.js');

function mp4(file) {
  const b = fs.readFileSync(path.join(root, file)), i = b.indexOf('mvhd');
  const secs = b[i + 4] === 1 ? Number(b.readBigUInt64BE(i + 4 + 4 + 16 + 4)) / b.readUInt32BE(i + 4 + 4 + 16) : b.readUInt32BE(i + 4 + 4 + 8 + 4) / b.readUInt32BE(i + 4 + 4 + 8);
  /* the picture size from the track headers (16.16 fixed point at the end of tkhd; the sound track says 0 x 0) */
  let w = 0, h = 0;
  for (let k = b.indexOf('tkhd'); k > 0; k = b.indexOf('tkhd', k + 4)) {
    const off = b[k + 4] === 1 ? k + 92 : k + 80;
    w = Math.max(w, b.readUInt32BE(off) / 65536); h = Math.max(h, b.readUInt32BE(off + 4) / 65536);
  }
  return { b, secs, w, h };
}

test('two cuts, German and English: H.264 + AAC, 720 x 1280, faststart, under 4 MB, the same length, Spanish plays English', () => {
  assert.equal(Q.VIDEO.src.de, 'media/quick-tour-de.mp4');
  assert.equal(Q.VIDEO.src.en, 'media/quick-tour-en.mp4');
  assert.notEqual(Q.VIDEO.version, '1', 'a new version, so no phone replays the old cut from its cache');
  const de = mp4(Q.VIDEO.src.de), en = mp4(Q.VIDEO.src.en);
  for (const [n, m] of [['de', de], ['en', en]]) {
    assert.ok(m.b.length > 500 * 1024 && m.b.length < 4 * 1024 * 1024, n + ' size ' + m.b.length);
    assert.ok(m.b.indexOf('avc1') > 0 && m.b.indexOf('mp4a') > 0, n + ': H.264 picture and AAC sound');
    assert.ok(m.b.indexOf('moov') < m.b.indexOf('mdat'), n + ': faststart');
    assert.equal(m.w, 720, n + ' width'); assert.equal(m.h, 1280, n + ' height');
    assert.ok(Math.abs(m.secs - Q.VIDEO.seconds) <= 1, n + ' is ' + m.secs.toFixed(2) + ' s');
  }
  assert.ok(Math.abs(de.secs - en.secs) < 0.2, 'the same scenes at the same times: ' + de.secs + ' / ' + en.secs);
  assert.ok(Q.VIDEO.seconds < 45, 'shorter than the old 45 s cut');
  assert.equal(Q.src('es'), Q.src('en'), 'Spanish falls back to the English cut');
  assert.equal(Q.label('de'), 'Kurze Tour · ' + Q.VIDEO.seconds + ' Sek.');
  const poster = fs.readFileSync(path.join(root, Q.POSTER));
  assert.ok(poster[0] === 0xff && poster[1] === 0xd8 && poster.length < 80 * 1024, 'a small jpg poster');
});

test('the app\'s first screen shows the tour again as one small pill; the browser install screen and later steps do not', () => {
  const css = read('onboarding-calm.css');
  assert.match(css, /#r2gate \.r2-start\.hs\[data-hs-step="0"\] \.hs-qt \{ min-height: 32px;[^}]*\}/, 'compact, 32 pt drawn');
  assert.match(css, /#r2gate \.r2-start\.hs\[data-hs-step="0"\] \.hs-qt::after \{ content: ""; position: absolute; inset: -6px 0; \}/, '44 pt to tap');
  assert.match(css, /#r2gate \.r2-start\.a1 \.a1-qt,/, 'still hidden on the Add to Home Screen screen');
  assert.ok(!/\.hs-qt \{ display: none/.test(css));
  const hs = read('herb-start.js');
  assert.match(hs, /if\(step===0\)body=.*\+habits\(\)\+qtPill\(\)\+/, 'the pill is drawn on step 0 only');
});

test('For You says "jetzt" / "ahora" / "now" in the app language (the pane is data-noi18n, the dictionary never reached it)', () => {
  const html = read('index.html');
  const i = html.indexOf('function ago(ts){'), j = html.indexOf('\nfunction art(p){', i);
  assert.ok(i > 0 && j > i);
  const make = lang => new Function('window', 'localStorage', html.slice(i, j) + '\nreturn ago;')({ LowiLang: { get: () => lang } }, { getItem: () => null });
  const now = Date.now();
  assert.equal(make('de')(now), 'jetzt');
  assert.equal(make('es')(now), 'ahora');
  assert.equal(make('en')(now), 'now');
  assert.equal(make('de')(now - 26 * 3600e3), 'gestern');
  assert.equal(make('de')(now - 3 * 86400e3), '3 Tage');
  assert.equal(make('es')(now - 3 * 86400e3), '3 días');
  assert.equal(make('en')(now - 5 * 60e3), '5 min');
});

test('the "Anhören: mitkochen" button keeps its second line dark on cyan, above the glass rule that greys every small', () => {
  assert.match(read('liquid-glass.css'), /html\.lg #app #main \.tab :is\(\.sub, \.muted, small, \.lab, \.hint\)/, 'the rule it has to beat');
  assert.match(read('challenge-week.css'), /html\.lg #app #main \.tab \.cwk-play \.cwk-play-t small,html \.cwk-play \.cwk-play-t small\{color:#062033!important;opacity:\.78\}/);
});

test('a For You post ends above the round back button, so its caption is never under it', () => {
  assert.match(read('foryou-rail.css'), /html\.lw-bx-on #cmFeed:has\(> #fyFeed\)\{padding-bottom:58px\}/);
  assert.match(read('bottom-close.css'), /\.lw-bx\{position:fixed;left:50%;bottom:calc\(env\(safe-area-inset-bottom, 0px\) \+ 14px/, 'the button sits 14 px above the safe area, 56 px tall');
});
