'use strict';
/* Nov 7 2026 (Emmanuel: chat photos look weird, "I want it to be like exactly like with WhatsApp bubble or iMessage bubble when you post a
   picture. Very important"; "if you long press, then that you can save the image, and that should be done for ... every image inside of
   the chat room"). A photo message is the photo in a thin frame of its bubble colour, one width for all photos, the time on the photo
   when there are no words, a caption or meal under it (community-chat.js photoBub, community-tg.css). Holding any picture in a chat
   bubble shows one button, Save photo, which hands the picture to the phone's share sheet (chat-photo-save.js).
   Browser walk (scratch, Chromium, the app with injected messages and local pictures, network blocked): photo bubbles framed, the time
   on the photo, the caption padded under it; a hold shows "Foto sichern", a tap shares lowispike-<date>.jpg (31 KB). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const S = require('../chat-photo-save.js');
const chat = read('community-chat.js'), tg = read('community-tg.css'), js = read('chat-photo-save.js');
const P = 'html body #tab-foryou #cmPaneChat#cmPaneChat[data-room] .cr-room ';
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test('a photo message is the photo in a thin frame, the time on it, a caption under it', () => {
    assert.match(chat, /function photoBub\(m\)\{if\(voiceOf\(m\)\)return '';const ph=photoOf\(m\);return ph\?' cm-pbub'\+\(ph\.caption\|\|ph\.meal\?' cm-pcap':''\):'';\}/);
    assert.match(chat, /'<div class="cm-bub'\+photoBub\(m\)\+'" data-chat-bub="'\+esc\(m\.id\)\+'">'\+head\+quote\+msgBody\(m\)\+foot\+/);
    assert.match(tg, new RegExp(esc(P + '.cp-msg .cm-bub.cm-pbub{padding:3px!important;width:min(272px,70vw)!important;')), 'a thin frame, one width for every photo');
    assert.match(tg, new RegExp(esc(P + '.cm-bub.cm-pbub:not(.cm-pcap) .cm-foot{float:none!important;position:absolute!important;right:10px;bottom:10px;')), 'the time on the photo');
    assert.match(tg, new RegExp(esc(P + '.cm-bub.cm-pbub .cm-t{display:block!important;padding:6px 9px 0!important}')), 'the caption under it');
    assert.match(tg, /\.cm-bub\.cm-pbub \.cs-photo img\{width:100%;height:auto;min-height:96px;max-height:min\(420px,58vh\);object-fit:cover;/, 'portrait stays portrait, never taller than 58% of the screen');
});

test('hold any chat picture: one button that saves it', () => {
    assert.equal(S.SEL, '#cmPaneChat .cm-bub img', 'every picture inside a chat bubble');
    assert.equal(S.HOLD_MS, 480); assert.equal(S.SLOP, 10);
    assert.match(S.fileName('https://x.supabase.co/storage/v1/object/public/media/u/chat-1.webp', new Date(2026, 10, 7, 6, 38, 32)), /^lowispike-20261107-063832\.webp$/);
    assert.equal(S.fileName('https://x/y.jpeg?x=1', new Date(2026, 0, 2, 3, 4, 5)), 'lowispike-20260102-030405.jpg');
    assert.equal(S.fileName('', new Date(2026, 0, 2, 3, 4, 5)), 'lowispike-20260102-030405.jpg');
    assert.match(js, /b\.querySelector\('span'\)\.textContent = T\('Save photo', 'Foto sichern', 'Guardar foto'\);/);
    assert.match(js, /ok = !!\(W\.navigator\.canShare && W\.navigator\.share && W\.navigator\.canShare\(\{ files: \[f\] \}\)\);/, 'the phone\'s share sheet (iPhone: Save Image) from a tap');
    assert.match(js, /bigView\(src\);   \/\* never a download in the Home Screen app: it would leave the app \*\//);
    assert.match(js, /e\.preventDefault\(\); e\.stopPropagation\(\); if \(e\.stopImmediatePropagation\) e\.stopImmediatePropagation\(\);/, 'the click that ends the hold opens nothing');
    assert.match(js, /D\.addEventListener\('contextmenu', e => \{ const img = [^]*?showPill\(img\); \} \}, true\);/, 'right-click on a computer');
    assert.match(tg, /\.cm-bub\.cm-pbub \.cs-photo\{margin:0!important;width:100%;border-radius:15px!important;-webkit-touch-callout:none;/, 'no iOS callout fighting the hold');
});

test('loaded with the page, cached, and the gesture scan knows it', () => {
    assert.match(read('index.html'), /<script src="chat-react-who\.js\?v=[^"]+"><\/script>\n<link rel="stylesheet" href="chat-photo-save\.css\?v=[^"]+">\n<script src="chat-photo-save\.js\?v=[^"]+"><\/script>/);
    assert.match(read('sw.js'), /STATIC\.push\("chat-photo-save\.js", "chat-photo-save\.css"\);/);
    assert.match(read('tutorial-steps.js'), /'chat-photo-save\.js': 'Nov 7 2026 hold a picture in the chat to save it/);
});
