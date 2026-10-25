'use strict';
/* Oct 24 2026, Emmanuel (voice): "I want you to nuke Circle, because nobody is using it, so that we just have one chat ... Let's
   keep it all in one. Nuke everything that has to do with being able to open multiple rooms and stuff like that."
   Circles (user-rooms*.js), the support-room split (Room 1, r2, r3 ...), the "Chat rooms & people" sheet, find / join / knock
   and the room number are gone. One Community chat and one Raum for everyone; the tabs, People, Ranking and Send energy stay.
   Live check: tools/one-chat/check.cjs. */
const test = require('node:test'), assert = require('node:assert');
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const R = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const noComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1');

test('Circles are gone: no files, nothing loads them, nothing calls them', () => {
  for (const f of ['user-rooms.js', 'user-rooms-core.js', 'user-rooms.css']) assert.ok(!fs.existsSync(path.join(ROOT, f)), f + ' removed');
  const html = R('index.html');
  assert.doesNotMatch(html, /user-rooms/);
  const app = fs.readdirSync(ROOT).filter(f => /\.(js|css)$/.test(f));
  for (const f of app) assert.doesNotMatch(R(f), /LowiUserRooms|user-rooms|data-ur=|'urooms'/, f);
  assert.doesNotMatch(html, /LowiUserRooms/);
});

test('no word "Circle" left in anything the app shows or says (EN / DE / ES)', () => {
  const shown = /\bCircles?\b|\bcircles? (?:invite|chat|room)|C[ií]rculos?\b|\bc[ií]rculos\b|\bKreise\b|\bcircle(?:s)? for a goal/;
  const app = fs.readdirSync(ROOT).filter(f => /\.js$/.test(f) && f !== 'tutorial-voice-data.js');
  for (const f of app) {
    const code = noComments(R(f));
    const hit = code.match(new RegExp("(['\"`])[^'\"`\\n]*(?:" + shown.source + ")[^'\"`\\n]*\\1"));
    assert.ok(!hit, f + ' shows: ' + (hit && hit[0]));
  }
  const V = require('../tutorial-voice-data.js');
  for (const l of ['en', 'de', 'es']) for (const [k, c] of Object.entries(V.clips[l])) assert.doesNotMatch(c.s, /Circle|C[ií]rculo/, 'voice clip ' + l + ' ' + k);
  assert.ok(!fs.existsSync(path.join(ROOT, 'tutorial-voice/en/new-rooms.mp3')), 'the Circles tour clip is gone');
  const S = require('../tutorial-steps.js');
  assert.ok(!S.STEPS.some(s => s.id === 'new-rooms'), 'the Circles tour step is gone');
  assert.ok(!S.STEPS.some(s => (s.covers || []).includes('user-rooms')));
  /* Oct 25 2026 short tour: People and profiles are part of the one Community card; no card text says Circle in any language */
  assert.ok(!S.STEPS.some(s => s.id === 'cm-name'));
  const cm = S.STEPS.find(s => s.id === 'community');
  assert.ok(cm.covers.includes('person-card') && cm.covers.includes('community-chat'));
  for (const st of S.STEPS) for (const l of ['en', 'de', 'es']) assert.doesNotMatch(st.title[l] + ' ' + st.text[l], /Circle|C[ií]rculo|Kreis/, st.id + '/' + l);
  const v = JSON.parse(R('version.json'));
  for (const l of ['en', 'de', 'es']) assert.doesNotMatch((v.news && v.news.text && v.news.text[l]) || '', /Circle|C[ií]rculo|rooms of up to 30|Räume mit bis zu 30|salas de hasta 30/, 'What\'s New ' + l);
});

function ui(extra) {
  const D = { readyState: 'loading', addEventListener() {}, getElementById: () => null, documentElement: {}, querySelector: () => null };
  const W = Object.assign({ getComputedStyle: () => ({}), addEventListener() {}, LowiRooms: null }, extra || {});
  const ctx = { window: W, document: D, setInterval() {}, setTimeout() {}, location: { hash: '' }, navigator: { language: 'en' } }; vm.createContext(ctx);
  vm.runInContext(R('community-rooms-ui.js'), ctx); return W.LowiRoomsUI;
}

test('Community menu: People first, no Circles, no "Chat rooms & people", no "Find someone", no room sheet', () => {
  const U = ui({ LowiPeopleDir: { open() {} } });
  const keys = U._menuKeys();
  assert.strictEqual(keys[0], 'dir');
  for (const k of ['urooms', 'people', 'find']) assert.ok(!keys.includes(k), k + ' gone');
  assert.ok(keys.includes('invite') && keys.includes('welcome'), 'invite link and welcome stay');
  assert.strictEqual(U.openSheet, undefined); assert.strictEqual(U.closeSheet, undefined);
  const js = R('community-rooms-ui.js');
  for (const k of ['mRooms', 'mPeople', 'roomN', 'youIn', 'knocking', 'letIn', 'notNow', 'moved', 'noAnswer']) assert.doesNotMatch(js, new RegExp('\\b' + k + ':\\['), k + ' string removed');
  assert.doesNotMatch(js, /openSheet|\.rm-find|data-rs=|r\.knocks\(|joinPerson|letIn\(/);
  assert.doesNotMatch(R('community-rooms.css'), /\.rm-(?:find|list|crew|yes)\b/, 'room sheet styles removed');
});

test('the tabs stay: Rangliste · Chat · Raum · Für dich · Studio, one live line without a room number', () => {
  const js = R('community-rooms-ui.js');
  assert.match(js, /\['room','chat','fy','studio','rank'\]/, 'Raum, Chat, Für dich, Studio, Rangliste');
  assert.match(js, /esc\(tr\('hereNow',\{c:ms\.length\}\)\)\+'<\/span>'/, 'live line: "12 here now", nothing else');
  assert.doesNotMatch(js, /tr\('roomN'/);
});

test('back and close: no layer or comment logic depends on Circles any more', () => {
  for (const f of ['back-swipe.js', 'section-nav.js']) assert.doesNotMatch(noComments(R(f)), /Circle|user-rooms|\.ur\b/, f);
  assert.match(R('back-swipe.js'), /function topLayer\(\)/, 'Escape still goes to the top open layer');
});
