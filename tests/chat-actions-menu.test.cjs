'use strict';
/* 28 Oct 2026 (Emmanuel, iPhone): "wenn jemand ein Bild schickt und man drückt auf deren Chat Bubble, dann flackert alles ... Dann
   drückst du auf reagieren, dann flackert das wieder. Und dann haben wir da unten komische Emojis. Manche wiederholen sich sogar
   ... du kannst normale iOS Emojis nutzen." The row's HTML no longer depends on a tap (so patchKids keeps the row, the photo and
   the companion), the actions open as one floating menu outside the list, and the reactions are five different system emojis
   shown for the five stored keys. Browser check: tools/check-chat-actions.cjs (simulated iPhone WebKit and Chromium). */
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const K = require('../community-chat-core.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const js = read('community-chat.js'), spirit = read('spirit.js'), tg = read('community-tg.css');
const tick = () => new Promise(r => setTimeout(r, 5));
/* the in-memory room from the pin test, reused as is */
const pinSrc = read('tests/community-chat-pin.test.cjs');
const fixture = new Function('require', 'K', 'js', 'css', 'path', 'fs', 'vm', 'tick', '__dirname', pinSrc.slice(pinSrc.indexOf('function fixture'), pinSrc.indexOf('\nconst now=')) + ';return fixture;')(require, K, js, tg, path, fs, vm, tick, __dirname);
const now = Date.now(), iso = t => new Date(t).toISOString();
const rows = [{ id: 'm1', user_id: 'b', who: 'Bea', body: 'Spitzpaprika mit Linsen', created_at: iso(now - 3e5) }, { id: 'm2', user_id: 'me', who: 'Me', body: 'Mine', created_at: iso(now - 2e5) }];
const fnBody = name => { const i = js.indexOf('function ' + name + '('); assert(i >= 0, name); let d = 0, j = js.indexOf('{', i); for (; j < js.length; j++) { if (js[j] === '{') d++; else if (js[j] === '}' && --d === 0) break; } return js.slice(i, j + 1); };
const NEW = ['❤️', '👍', '😋', '🔥', '🙏'];

test('five reactions, shown as five different system emojis; the stored keys stay the same five (old reactions keep counting)', () => {
  assert.deepEqual(K.SHOW.map(s => s[0]).slice().sort(), K.EMOJI.slice().sort(), 'every stored key is shown, nothing new is stored');
  const shown = K.SHOW.map(s => s[1]);
  assert.deepEqual(shown, NEW);
  assert.equal(new Set(shown).size, 5, 'no duplicates');
  assert.equal(K.glyph('👏'), '👍'); assert.equal(K.glyph('🌱'), '😋'); assert.equal(K.glyph('✨'), '🔥'); assert.equal(K.glyph('🙏'), '🙏'); assert.equal(K.glyph('❤️'), '❤️');
  for (const s of K.SHOW) { assert.equal(s[2].length, 3, 'en/de/es name for ' + s[1]); assert(s[2].every(Boolean)); }
});

test('the app never swaps a reaction emoji for one of its line icons', () => {
  assert.match(spirit, /closest\('[^']*\.cm-emo[^']*'\)/, 'symbols() skips .cm-emo');
  assert.match(js, /<span class="cm-emo" aria-hidden="true">'\+g\+'<\/span>/);
  assert.match(tg, /\.cm-rx \.cm-chip \.cm-emo\{font-family:"Apple Color Emoji"/);
});

test('a row\'s HTML does not depend on a tap: no open state, no inline action pills or picker, reactions poured in afterwards', () => {
  const r = fnBody('renderMessage');
  assert.doesNotMatch(r, /openId|pick===|cp-open|cp-acts|cm-picker/);
  assert.match(r, /<div class="cm-rx" data-rx="'\+esc\(m\.id\)\+'"><\/div>/);
  assert.match(r, /rxHTML\.set\(m\.id,reacts\)/);
  assert.match(js, /patchKids\(list,[^\n]*\n if\(threadOpen\|\|!W\.LowiRooms\)fillRx\(list\);if\(menuFor\)placeMenu\(\);/, 'chips filled right after the list patch, in the same paint');
  assert.match(fnBody('fillRx'), /if\(\(box\.__h\|\|''\)!==h\)\{box\.innerHTML=h;\}/, 'only a box whose chips changed is touched');
});

test('tapping a bubble or ··· opens the floating menu, never a re-render; Escape stays inside the menu', () => {
  assert.match(js, /if\(m&&!m\.status\)\{if\(menuFor===mid\)closeMenu\(\);else openMenu\(mid,false\);\}/);
  assert.match(js, /a==='more'\|\|a==='pick'\)\{if\(menuFor===id\)closeMenu\(\);else openMenu\(id,e\.detail===0\);\}/);
  assert.doesNotMatch(fnBody('openMenu'), /refresh\(/); assert.doesNotMatch(fnBody('closeMenu'), /refresh\(/);
  assert.match(fnBody('menuKeys'), /Escape'\)\{e\.preventDefault\(\);e\.stopPropagation\(\);closeMenu\(\)/, 'Escape closes the menu, not the room');
  assert.match(js, /D\.body\.appendChild\(menuEl\)/, 'the menu lives on <body>, outside the message list');
  assert.match(js, /box-shadow:0 0 0 200vmax var\(--cx-dim\)/, 'the bubble stays lit through a cut-out, no copy of it');
});

test('menu: emoji bar + Reply and Report for others, Delete for your own, no Pin for members; the row stays byte for byte the same', async () => {
  const f = fixture({ rows }); await f.scope('me');
  const row = () => f.win.LowiCommunity.messageHTML(f.host.messages().find(m => m.id === 'm1'), f.host.messages());
  const before = row(), other = f.menu('m1');
  assert.equal(row(), before, 'opening the menu leaves the row\'s HTML the same');
  const emo = [...other.matchAll(/class="cm-emo" aria-hidden="true">([^<]+)</g)].map(x => x[1]);
  assert.deepEqual(emo, NEW);
  assert.match(other, /data-chat="react"[^>]*data-id="m1" data-emoji="🌱"[^>]*aria-label="Yummy"/, 'tapping 😋 stores the old 🌱 key');
  assert.match(other, /data-chat="reply"[^>]*><span class="cx-tx">Reply</); assert.match(other, /data-chat="report"[^>]*><span class="cx-tx">Report message</);
  assert.doesNotMatch(other, /data-chat="delete"|pin-msg/);
  const mine = f.menu('m2');
  assert.match(mine, /data-chat="delete"/); assert.doesNotMatch(mine, /data-chat="report"|pin-msg/);
});

test('old stored reactions still count: the row keeps an empty box for its chips and your old ✨ lights 🔥 in the bar', async () => {
  const f = fixture({ rows }); await f.scope('me');
  f.host.replace(f.host.messages(), [{ message_id: 'm1', user_id: 'x', emoji: '🌱' }, { message_id: 'm1', user_id: 'me', emoji: '✨' }]);
  const html = f.win.LowiCommunity.messageHTML(f.host.messages().find(m => m.id === 'm1'), f.host.messages());
  assert.match(html, /<div class="cm-rx" data-rx="m1"><\/div>/, 'the row itself carries an empty box');
  assert.doesNotMatch(html, /cm-chip/, 'chips are not part of the row HTML');
  assert.match(f.menu('m1'), /data-emoji="✨" aria-pressed="true" aria-label="Fire"/);
});
