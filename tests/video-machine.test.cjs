// 24 Nov 2026 (Emmanuel: "upload that 60-second video and it will automatically be cut ... 5 ... 8 ... 13 ... 21 seconds ... see all
// the chopped up versions, just like a TikTok profile ... the text on screen was already on there ... not cover the profile picture or
// the like button ... magnets ... clicks into the center ... a text on screen bio ... one is in I form, one is in U form ... save all the
// clips into my gallery"). Studio > Video machine, phase 1 (studio/video-machine.js, studio-ai "captions").
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const js = R('studio/video-machine.js');
const ctx = { window: {}, document: {} }; ctx.window.STUDIO = { L: 'en', esc: s => s }; vm.createContext(ctx); vm.runInContext(js.replace('(window, document)', '(window, document)'), ctx);
const C = ctx.window.StudioVMCore;
test('a 60 s B-roll is cut into 8 / 13 / 5 / 21 s pieces, each with its own style, nothing longer than the video', () => {
  const p = JSON.parse(JSON.stringify(C.plan(60)));
  assert.deepStrictEqual(p.map(x => x.sec), [8, 13, 5, 21, 8, 5]);
  assert.deepStrictEqual(p.map(x => x.style), ['I', 'you', 'general', 'teaching', 'relatable', 'funny']);
  assert.ok(p[p.length - 1].end <= 60); assert.strictEqual(p[1].start, 8);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(C.plan(30))).map(x => x.sec), [8, 13, 5]);
  assert.strictEqual(C.plan(3).length, 1, 'a short clip stays one piece'); assert.strictEqual(C.plan(0).length, 0);
});
test('magnets: the text snaps to the centre lines; the safe zone keeps it off TikTok\'s buttons, name and caption', () => {
  assert.strictEqual(C.snap(0.52, 0.5, 0.035), 0.5); assert.strictEqual(C.snap(0.6, 0.5, 0.035), 0.6);
  assert.ok(C.SAFE.r <= 0.85 && C.SAFE.b <= 0.7 && C.SAFE.t >= 0.12, 'right buttons, bottom caption, top tabs stay clear');
  assert.match(js, /var x = Math\.min\(SAFE\.r - hw, Math\.max\(SAFE\.l \+ hw, c\.x\)\), y = Math\.min\(SAFE\.b - hh, Math\.max\(SAFE\.t \+ hh, c\.y\)\);/);
});
test('B-rolls stay on the phone; the video is made on the phone and saved through the share sheet', () => {
  assert.match(js, /W\.indexedDB\.open\('lowi-studio', 2\)/);   /* changed 24 Nov 2026, night: v2 adds the finished-videos store */ assert.match(js, /cv\.captureStream\(30\)/); assert.match(js, /new MediaRecorder\(stream/);
  assert.match(js, /navigator\.share\(\{files: files\}\)/); assert.doesNotMatch(js, /storage\.from\(|\.upload\(/);
});
test('the AI writes from the creator\'s style and the picked playlist; owner only on the server', () => {
  assert.match(js, /S\.ai\(\{action: 'captions', bio: styleText\(\), examples: examples\(\)/);
  const f = R('supabase/functions/studio-ai/index.ts');
  assert.match(f, /if \(body\.action === "captions"\) \{\n\s+if \(!\(await isOwner\(req\)\)\) return out\(req, 403, \{ error: "owner_only" \}\);/);
  assert.match(f, /No medical claims, no diagnoses, no promises about blood sugar numbers\./);
  const a = R('studio/accounts.js'); assert.match(a, /function style\(v\) \{/); assert.match(a, /window\.StudioVM \? '<button class="btn pri ap-vw" data-acc="vm">'/);
});
test('accounts.js reads the browser window as window (its W is the word list): the Video link and mic buttons show again', () => {
  const a = R('studio/accounts.js');
  assert.doesNotMatch(a, /\bW\.(StudioVM|StudioWords|SpeechRecognition|webkitSpeechRecognition)/);
  assert.match(a, /var SR = window\.SpeechRecognition \|\| window\.webkitSpeechRecognition;/);
});
test('clips are made in the background so Save is one tap; drawn muted (iPhones refuse sound without a tap) (24 Nov 2026)', () => {
  assert.match(js, /function queue\(\) \{/); assert.match(js, /frames\(\); setTimeout\(queue, 300\);/);
  /* changed 24 Nov 2026, evening: Save all saves the parts not used yet (all of them when every part is used) and then marks them used */
  assert.match(js, /if \(k === 'saveAll'\) \{ var ix = toSave\(\); return share\(ix\.map\(function \(i\) \{ return fileOf\(got\(i\), i\); \}\)\)\.then\(function \(ok\) \{ if \(ok\) markUsed\(ix\); \}\); \}/);
  /* changed 24 Nov 2026, evening: one shared video element (RV) draws every clip */
  assert.match(js, /RV\.muted = true; RV\.setAttribute\('muted', ''\)/); assert.doesNotMatch(js, /createMediaElementSource/);
});
test('each clip: its own AI text, a text from the Swipe file library (with the creator\'s TikTok), translate EN/DE/ES and back; AI errors say why', () => {
  for (const k of ["k === 'aione'", "k === 'trc'", "k === 'trundo'", "k === 'lib'", "k === 'libuse'"]) assert.ok(js.includes(k), k);
  assert.match(js, /st\.aiNote = t\('aiWhy', whyOf\(e\)\)/);
  const f = R('supabase/functions/studio-ai/index.ts');
  assert.match(f, /if \(texts\.filter\(Boolean\)\.length < clips\.length\) \{/, 'a second, plain-text try');
  assert.match(f, /return out\(req, why === "busy" \? 429 : 502, \{ error: why === "busy" \? "busy" : "ai_failed", detail: clip\(why, 300\) \}\);/);
  assert.match(R('studio/index.html'), /er\.detail = j && j\.detail \|\| '';/);
});
/* 24 Nov 2026, evening (Emmanuel: "switch from inspo to storage ... B-rolls at the top ... below that, I see the cut version. So it
   doesn't have to always cut my B-rolls again ... click on the button, they're all filled ... save") */
test('Profile has Inspo | B-rolls: the shelf on top, the chosen B-roll\'s parts below, Fill texts and Save all', () => {
  const a = R('studio/accounts.js');
  assert.match(a, /data-acc="pt" data-v="broll"/); assert.match(a, /if \(k === 'pt'\) \{ PT = b\.dataset\.v === 'broll' \? 'broll' : 'inspo';/);
  assert.match(a, /StudioVM\.mount\(document\.getElementById\('vmProf'\)\)/);
  assert.match(js, /W\.StudioVM = \{open: open, close: close, mount: mount,/);
  /* changed 25 Nov 2026 (Emmanuel: "it shouldn't just start generating ... pick one by one which one I want to save ... resize them all ... a check mark"): ✨ New texts, then 🎬 Make → 📲 Save for the ticked parts */
  assert.match(js, /var a = '<button class="btn pri" data-vm="newT"/, 'one button writes the texts, each tap again');
  for (const l of ['✨ New texts', '✨ Neue Texte', '✨ Textos nuevos']) assert.ok(js.includes(l), l);
});
test('a B-roll is cut once, when it is added; its parts (texts, positions) are kept and never cut again', () => {
  assert.match(js, /if \(!st\.cuts\[id\] \|\| !st\.cuts\[id\]\.length\) st\.cuts\[id\] = plan\(r\.dur\)/);
  assert.match(js, /return bPut\(o\)\.then\(function \(\) \{ useRoll\(o\.id\); \}\);/);
  assert.match(js, /cuts: st\.cuts, used: st\.used, pref: st\.pref\}\)\)/, 'the parts are saved');   /* changed 24 Nov 2026, evening: + the Used folder; 25 Nov: + your size/place */
  const go = /function go\(\) \{[\s\S]*?\n  \}/.exec(js)[0]; assert.doesNotMatch(go, /plan\(/, 'Fill texts does not re-cut');
});
test('only B-rolls use space: made videos are not stored; the profile says how much is used', () => {
  assert.match(js, /navigator\.storage\.estimate\(\)/); assert.doesNotMatch(js, /bPut\(\{[^}]*blob/i);
  assert.match(js, /storeN: \['B-rolls on this phone: \{p\}'/);
});
/* 24 Nov 2026, evening (Emmanuel: "I changed the size, yet ... when I click on save is still the old version ... once I've saved
   something, that should be in a different folder ... repurpose them on different platforms ... it keeps saying it's still generating 0
   out of 5. I don't know what that means") */
test('a made video counts only while it matches the part exactly as it is now: a changed size, text or place makes it again', () => {
  assert.match(js, /function ckey\(c\) \{ return JSON\.stringify\(\[c\.start, c\.end, c\.text, c\.x, c\.y, c\.size, c\.look\]\); \}/);
  assert.match(js, /function got\(i\) \{ var c = st\.sess && st\.sess\.clips\[i\], m = made\[i\]; return c && m && m\.k === ckey\(c\) \? m\.b : null; \}/);
  assert.doesNotMatch(js, /share\(\[fileOf\(made\[/); assert.doesNotMatch(js, /fileOf\(made\[i\]/);
  assert.match(js, /var i0 = cur; if \(got\(i0\)\) return share/);
});
test('saved videos go to the Used folder (a recipe, not a file) and can be saved again; Fill texts makes new ones', () => {
  /* changed 25 Nov 2026 (Emmanuel: "it shouldn't just start generating ... pick one by one which one I want to save ... resize them all ... a check mark"): no separate Used folder; a saved part shows ✓ Saved, and the log stays a small recipe list */
  assert.match(js, /function markUsed\(idxs\)/); assert.match(js, /st\.used\.unshift\(\{roll: st\.sess\.id, k: k, t: tk, ts: now, c: JSON\.parse\(JSON\.stringify\(c\)\)\}\)/);
  assert.doesNotMatch(js, /data-vm="uopen"/); for (const l of ['✓ Saved', '✓ Gespeichert', '✓ Guardado']) assert.ok(js.includes(l), l);
  assert.doesNotMatch(js, /bPut\([^)]*made/, 'made videos are never stored');
});
test('making videos never hangs silently: when the phone blocks it, a clear button asks for one tap; the status says "x / y done"', () => {
  assert.match(js, /function \(\) \{ qErr = 1; \}\)/);   /* unchanged */ assert.match(js, /data-vm="kick">' \+ esc\(t\('tapMake'\)\)/);
  assert.match(js, /D\.addEventListener\('touchend', unlock, true\); D\.addEventListener\('click', unlock, true\);/);
  assert.match(js, /prep: \['🎬 Making your videos: \{p\} done'/); assert.doesNotMatch(js, /Getting your clips ready/);
  assert.match(js, /var idle = new Promise/, 'Save waits for the background maker (one video player)');
  assert.match(js, /function soft\(\) \{ if \(inEdit\(\)\) \{ refresh0\(\); mkSync\(\); \} else refresh\(\); \}/);   /* changed 24 Nov 2026, night: the editor's button follows too */
});
/* 24 Nov 2026, night (Emmanuel: "the video ... stopping every like 2 seconds, stopping, moving, stopping ... like a video with a bad
   connection ... I just posted a video and I didn't even notice"). Checked in Chromium: a 13 s part came out as 390 frames, every gap
   exactly 1/30 s, all 390 frames different (ffprobe + framemd5). */
test('videos are built frame by frame on exact 1/30 s timestamps (WebCodecs + MP4), not screen-recorded in real time', () => {
  assert.match(js, /function wcOK\(\) \{ return !!\(W\.VideoEncoder && W\.VideoFrame/);
  /* changed 25 Nov 2026: + the B-roll (rid) */ assert.match(js, /if \(!wcOK\(\)\) return renderRec\(c, onP, rid\);/, 'older phones keep the recorder');
  assert.match(js, /new W\.VideoFrame\(cv, \{timestamp: Math\.round\(k \* 1e6 \/ FPS\), duration: Math\.round\(1e6 \/ FPS\)\}\)/);
  assert.match(js, /v\.requestVideoFrameCallback\(tick\)/); assert.match(js, /if \(enc\.encodeQueueSize > 6\) \{ v\.pause\(\);/, 'waits for the encoder instead of dropping frames');
  assert.match(js, /sc\.src = '\.\.\/vendor\/mp4-muxer-5\.1\.3\.js'/);
  const v = R('vendor/mp4-muxer-5.1.3.js'); assert.match(v, /^\/\*! mp4-muxer 5\.1\.3/); assert.match(v, /var Mp4Muxer = \(\(\) => \{/);
  assert.ok(fs.existsSync(path.join(__dirname, '..', 'vendor', 'mp4-muxer-5.1.3.LICENSE.txt')));
});
/* 24 Nov 2026, night (Emmanuel: "I changed the text size, and the one that it saved or generated is not the one that I chose"): the
   editor drew the text with CSS, the video with a canvas, in another font, so lines broke differently. Checked in Chromium: editor and
   a frame of the saved file are the same, line for line. */
test('the editor shows the text drawn by the same drawText() and font as the saved video', () => {
  assert.match(js, /<canvas class="vm-pv" id="vmC"/); assert.match(js, /x\.clearRect\(0, 0, cw, ch\); drawText\(x, c, cw, ch\);/);
  assert.match(js, /ctx\.font = '700 ' \+ fs \+ 'px ' \+ FONT;/); assert.match(js, /class="vm-text ghost" id="vmT"/);
  assert.match(R('studio/index.html'), /\.vm-text\.ghost,\.vm-text\.ghost\.box\{color:transparent;/);
});
/* 24 Nov 2026, night (Emmanuel: "why is it that a done video, I have to always click on make video? This is already done ... isn't
   there a better, faster way to get these videos, especially with the ones that are done?") */
test('finished videos are kept on the phone (one per part) and survive closing the app; the editor button shows the live state', () => {
  assert.match(js, /W\.indexedDB\.open\('lowi-studio', 2\)/); assert.match(js, /if \(!d\.objectStoreNames\.contains\('made'\)\) d\.createObjectStore\('made', \{keyPath: 'id'\}\);/);
  assert.match(js, /st = x\.objectStore\(store \|\| 'broll'\)/, 'the made videos go into their own store');
  /* changed 25 Nov 2026 (one queue for every B-roll): */ assert.match(js, /mm\[i\] = \{b: blob, k: snap0\}; mPut\(rid, i, mm\[i\]\);/); assert.match(js, /function loadRolls\(\) \{ return loadMade\(\)\.then\(bAll\)/);
  assert.match(js, /var bDel = function \(id\) \{[^\n]*mDelRoll\(id\)/, 'deleting a B-roll deletes its videos');
  assert.match(js, /function mkLabel\(\) \{ return got\(cur\) \? t\('toPhone'\) : \(qRun && qNow === cur \? t\('making', qPc\) : t\('make'\)\); \}/);
  /* changed 25 Nov 2026 (Emmanuel: "it shouldn't just start generating ... pick one by one which one I want to save ... resize them all ... a check mark"): nothing is made by itself: only the parts you tapped 🎬 Make for */
  /* changed 25 Nov 2026 (one queue for every B-roll): */ assert.match(js, /JOBS = jobsLeft\(\);   \/\* finished ones leave the list \*\//);
  assert.doesNotMatch(js, /requeue\(/, 'moving or resizing never starts making a video');
  assert.match(js, /var MAXW = 2 \* Math\.min\(0\.5 - SAFE\.l, SAFE\.r - 0\.5\) \* 0\.97;/, 'opening a finished part does not nudge it (that made it again)');
});
/* 24 Nov 2026, night (Emmanuel: "You broke my app? Nothing is working after closing & opening", black screen) */
test('nothing is made in the background before a tap in this visit; a visit that died while making a video does not start again by itself', () => {
  assert.match(js, /try \{ CRASHED = !!localStorage\.getItem\(BUSY\); localStorage\.removeItem\(BUSY\); \} catch \(e\) \{ \}/);
  /* changed 25 Nov 2026 (one queue for every B-roll): */ assert.match(js, /if \(!TAPPED \|\| qRun \|\| qErr \|\| qHold \|\| !canMake\(\)\) return;/);
  assert.match(js, /qErr = CRASHED \? 1 : 0,/); assert.match(js, /busyOn\(\); var done = function \(x\) \{ busyOff\(\); return x; \}/);
  assert.match(js, /var cv = CV \|\| \(CV = D\.createElement\('canvas'\)\);/, 'one canvas for every video');
});
/* 24 Nov 2026, night (Emmanuel: "there's a bug here, it keeps flickering ... think of my workflow ... What happens if I do this 10 times,
   20 times, 30 times? How will it look organized in there? Can the ones that have been already used be tucked in somewhere else ...
   conveniency is the most important thing"). Checked in Chromium: upload -> texts by themselves; 4 s idle -> 0 redraws, no page jump;
   Save -> parts to "✓ Used · 3" (folded); Fill again -> 3 new parts, Used stays 3; a used video is made again and saved on its own. */
test('the B-rolls panel never redraws in a loop and never moves the page', () => {
  /* changed 25 Nov 2026 (one queue for every B-roll): */ assert.match(js, /var j = JOBS\[0\]; if \(!j\) return;/, 'nothing left: no redraw, no new round');
  assert.match(js, /if \(html === lastHTML && h\.firstChild\) \{ drawTiles\(\); storeLine\(\); return; \}/);   /* changed 25 Nov 2026: the previews are canvases, redrawn without a redraw of the panel */
  assert.doesNotMatch(js.slice(js.indexOf('function mountPaint')), /scrollIntoView/);
  assert.match(js, /if \(same && sl >= 0\) sh\.scrollLeft = sl;/);
  assert.match(js, /if \(FR\.id === st\.sess\.id \+ ':' \+ st\.sess\.clips\.length && st\.sess\.clips\.every\(function \(_c, k\) \{ return FR\[k\]; \}\)\) return;/);
});
test('workflow: a new B-roll gets its texts by itself; text language on the panel; each part says Ready', () => {
  /* changed 25 Nov 2026 (Emmanuel: "it shouldn't just start generating ... pick one by one which one I want to save ... resize them all ... a check mark"): no texts by themselves any more: a new B-roll shows a spinner, is cut, and waits for ✨ New texts */
  assert.doesNotMatch(js, /autoFill\(/); assert.match(js, /if \(k === 'sel'\) \{ useRoll\(b\.dataset\.id\); FR = \[\]; refresh\(\); return; \}/);
  assert.match(js, /<div class="vm-lang"><span>' \+ esc\(t\('textLang'\)\)/); assert.match(js, /'<b class="vm-ok vm-okp">' \+ esc\(t\('made'\)\) \+ '<\/b>'/);
  for (const l of ['Text language', 'Textsprache', 'Idioma del texto', 'Pick a playlist, then tap ✨ New texts.']) assert.ok(js.includes(l), l);
});
test('used videos are folded under "✓ Used · n", grouped by day, and made again on their own without touching the new parts', () => {
  /* changed 25 Nov 2026 (Emmanuel: "it shouldn't just start generating ... pick one by one which one I want to save ... resize them all ... a check mark"): the Used folder and its day groups are gone ("I don't know if the today and yesterday thing is smart"); each B-roll cover says how many you saved and when */
  assert.doesNotMatch(js, /data-vm="utog"/); assert.doesNotMatch(js, /<h5 class="vm-day">/);
  assert.match(js, /'<b class="vm-cdn">✓ ' \+ us\.length \+ '<\/b><small class="vm-cdd">' \+ esc\(agoTxt\(last\)\) \+ '<\/small>'/);
  const uo = js.slice(js.indexOf("if (k === 'uopen')"), js.indexOf("if (k === 'uopen')") + 1200);
  assert.doesNotMatch(js, /Object\.assign\(st\.sess\.clips\[j\]/, 'a saved recipe is never written over a part');
});
test('the B-roll cover is replaced by the first part\'s picture (the upload cover is often black on iPhones)', () => {
  assert.match(js, /if \(i === 0 && !r\.tf\) \{ r\.thumb = FR\[0\]; r\.tf = 1; bPut\(r\)/);
});
/* 25 Nov 2026 (Emmanuel: "I can click on the playlist that I want the knowledge to go from ... pick one by one which one I want to save
   ... resize them all ... a joystick ... it also saves my size and my positioning preference ... I don't see any loading ... how does it
   learn from the viral text in the playlists ... I don't want this to become a guessing game"). Checked in Chromium: upload -> spinner,
   no AI call; New texts without a playlist -> asks for one; with it -> the playlist's text on screen goes to the AI; nothing is made by
   itself; untick one -> "Make 2 videos" -> "Save 2" -> 2 files, both ✓ Saved, cover "✓ 2 · Today"; size 30 + ↓ moves all three and is
   remembered, the ✓ stays; ↻ asks for one text. */
test('the AI learns from the playlist\'s text on screen (the viral text itself), not only hooks and spoken words', () => {
  assert.match(js, /return \{screen: String\(x\.onscreen \|\| ''\)\.slice\(0, 500\), hook: x\.hook \|\| '',/);
  const f = R('supabase/functions/studio-ai/index.ts');
  assert.match(f, /const scr = clip\(e && e\.screen, 500\)/); assert.match(f, /"\\n   on screen: "/);
  assert.match(f, /Study them before you write: how the first line stops the scroll/); assert.match(f, /Never copy or lightly reword an example\./);
});
/* changed 25 Nov 2026 (Emmanuel: "inspo as default knowledge"): no playlist is needed any more; with none picked the AI learns from Inspo */
test('texts are written only on a tap, for the ticked parts or one part (↻); Inspo is the default knowledge', () => {
  assert.match(js, /if \(k === 'newT'\) \{ if \(busy\) return;\s*var all = /);
  assert.match(js, /if \(k === 'reone'\) \{[^\n]*return write\(\[st\.sess\.clips\[ri\]\]\); \}/);
  assert.match(js, /data-vm="tsel"/); assert.match(js, /function selIdx0\(\)/);
});
test('🎬 Make only for the ticked parts, then 📲 Save; saved parts show ✓ Saved and keep it when moved or resized', () => {
  assert.match(js, /if \(k === 'makeSel'\) \{ var mi = selIdx\(\)\.filter/); assert.match(js, /if \(k === 'saveSel'\) \{[^\n]*markUsed\(si\)/);
  assert.match(js, /function tkey\(c\) \{ return JSON\.stringify\(\[c\.start, c\.end, String\(c\.text \|\| ''\)\.trim\(\)\]\); \}/);
  assert.match(js, /howMake: \['🎬 Make puts the text on the video/);
});
test('one size and one joystick for all texts, kept in the safe zone and remembered for new parts', () => {
  /* changed 25 Nov 2026: A− / A+ buttons instead of the slider */ assert.match(js, /data-vm="asz" data-d="2"/); assert.match(js, /data-vm="amv" data-dx="0" data-dy="-1"/); assert.match(js, /data-vm="amv" data-c="1"/);
  assert.match(js, /function allSet\(fn\) \{ if \(!st\.sess\) return; st\.sess\.clips\.forEach\(function \(c\) \{ fn\(c\); clampClip\(c\); \}\);/);
  assert.match(js, /x: st\.pref\.x, y: st\.pref\.y, size: st\.pref\.size, look: st\.pref\.look/);
  assert.match(js, /function clampClip\(c\)/);
});
test('previews are drawn by the video\'s own drawText(); an upload shows a spinner; making never hangs silently', () => {
  assert.match(js, /if \(c\.text\) drawText\(x, c, w, h\);/); assert.match(js, /<canvas data-tc="' \+ i \+ '" width="270" height="480">/);
  assert.match(js, /new Array\(ADDING \+ 1\)\.join\('<div class="vm-cd vm-adding" role="status">/);
  assert.match(js, /if \(Date\.now\(\) - lastT > 12000\) \{ clearInterval\(wd\); fail\(new Error\('stall'\)\); \}/);
});
/* 25 Nov 2026 (Emmanuel: "I want to be able to edit my core up here, my style ... select a new style or type in a new style, and the old
   style is then unselected ... different styles for my different accounts. And don't make things ... longer to scroll ... swipe right to
   see the rest of the playlist names"). Checked in Chromium: playlists in one row; + New style "Second account" becomes ✓ and is the
   bio sent to the AI; tapping "My style" switches back. */
test('styles: several per account, one picked (✓), tap again to edit, ＋ to add; the picked one is what the AI writes with', () => {
  const a = R('studio/accounts.js');
  assert.match(a, /function styleList\(a\) \{ a = a \|\| cur\(\); if \(!a\) return \[\]; if \(!Array\.isArray\(a\.styles\)\) \{ a\.styles = a\.style \? \[\{id: 's1', name: 'My style', text: a\.style\}\] : \[\];/, 'the old single style becomes the first');
  assert.match(a, /styles: styles, styleUse: styleUse, styleSave: styleSave, styleDel: styleDel\};/);
  assert.match(js, /if \(!sid\) return styleDlg\(null\); if \(sid === A2\.sel\) return styleDlg\(sx\); StudioAcc\.styleUse\(sid\);/);
  assert.match(js, /styleRow\(\) \+\s*'<div class="vm-row2"><span class="vm-l2">' \+ esc\(t\('learn'\)\)/);
});
test('the style and playlist rows swipe sideways instead of stacking (the page stays short)', () => {
  assert.match(R('studio/index.html'), /\.vm-plc\{display:flex;flex-wrap:nowrap!important;gap:8px;overflow-x:auto;/);
  assert.match(js, /<div class="vm-chips vm-plc">' \+\s*A\.list\.map/); assert.match(js, /\('<div class="vm-chips vm-plc"><button class="pill' \+ \(!st\.pl \? ' acc' : ''\)/);   /* changed 25 Nov 2026: ⭐ Inspo first in the playlist row */
});
/* 25 Nov 2026 (Emmanuel: "wouldn't it make sense to have the default just be the AI learning from the inspo ... inspo as default knowledge
   and the playlist as selective ones"; "sometimes it doesn't work. I have to click on it 3 times or 4 times") */
test('the AI learns from the account\'s Inspo by default (⭐ Inspo first in the row); a playlist is the specific choice', () => {
  assert.match(js, /if \(!st\.pl\) inspoIds\(\)\.forEach\(function \(i\) \{ ids\[i\] = 1; \}\);/);
  assert.match(js, /data-vm="pl" data-id="" aria-pressed="' \+ !st\.pl \+ '">' \+ esc\(t\('inspoDef'\)\)/);
  assert.doesNotMatch(js, /return S\.toast\(t\('pickPl'\)\)/, 'no playlist needed any more');
});
test('a failed AI call in Studio tries again by itself twice, except for answers that cannot change', () => {
  const h = R('studio/index.html');
  assert.match(h, /function ai\(payload, n\) \{/); assert.match(h, /again = n < 2 && !\/\^\(limit\|bad_link\|bad_request\|owner_only\|too_long\)\$\/\.test\(m\);/);
  assert.match(h, /setTimeout\(r, n \? 4000 : 1500\)/);
});
/* 25 Nov 2026 (Emmanuel: "it said saved ... But now it tells me there's no place where I could click save all videos ... Now I had to click
   on make videos again, and now I feel like it's restarting"). Checked in Chromium: after Save -> "📲 Save 3 again" at once (3 files
   again), chips "✓ Saved · 📲"; A+ -> Size 24 -> 26 and the bar says Make (the texts changed). */
test('when every part is saved, all are ticked and the button says "Save N again"; nothing needs making again', () => {
  assert.match(js, /function selIdx0\(\) \{[^\n]*return n\.length \? n : w; \}/);
  assert.match(js, /t\('saveAgain', n\) : t\('saveN', n\)/); assert.match(js, /saveAgain: \['📲 Save \{p\} again'/);
});
test('all texts are resized with A− / A+ buttons, not a slider a scroll could move by accident', () => {
  assert.doesNotMatch(js, /id="vmAsz"/); assert.match(js, /data-vm="asz" data-d="-2"/); assert.match(js, /if \(k === 'asz'\) \{ var nz = Math\.max\(14, Math\.min\(40,/);
});
/* 25 Nov 2026 (Emmanuel: "I went to a different B-roll to save those ... is it now still showing me that it's saving the older stuff on the
   other B-roll? ... I should be able to multi-work, on all B-rolls"). Checked in Chromium with two B-rolls: Make on the first, switch,
   Make on the second -> one line "Making a video for the 0:30 B-roll · 40% · 6 left", the first cover "🎬 3 · 18%"; both end on "📲 Save 3". */
test('one queue for every B-roll: jobs carry their B-roll, making goes on while you switch, covers and a top line say what is left', () => {
  assert.doesNotMatch(js, /\bWANT\b/, 'the old list held only part numbers');
  assert.match(js, /function madeOf\(rid, i\)/); assert.match(js, /JOBS\.push\(\{r: st\.sess\.id, i: i\}\)/);
  assert.match(js, /render\(c, function \(pc\) \{[\s\S]{0,400}\}, rid\)/, 'made from its own B-roll');
  assert.match(js, /var r = roll\(rid \|\| st\.sess\.id\); if \(!r\) return rej\(new Error\('norec'\)\);/);
  assert.match(js, /<b class="vm-cdq">🎬 ' \+ jobsLeft\(r\.id\)\.length/); assert.match(js, /<p class="vm-now" role="status">/);
});
/* 25 Nov 2026 (Emmanuel: "I'm trying to change the text manually ... it's buggy ... I can't even see my video or where the text is ...
   Keep snapping back or snapping out"). Checked in Chromium: typing for 8 s while a video was being made -> the same text box, still
   focused, every word kept; typing mode on, bottom bar hidden. */
test('the editor is never redrawn from the background; typing shrinks the video above the keyboard; no AutoFill on the text box', () => {
  assert.match(js, /function refresh\(\) \{ if \(inEdit\(\)\) \{ mkSync\(\); if \(HOST && HOST\.isConnected\) mountPaint\(\); return; \}/);
  /* changed 25 Nov 2026 (Emmanuel: "you made an extra box for it ... on Instagram ... I can edit the text on the B-roll"): the box under the
     video is gone; the text is typed right on the video */
  assert.match(js, /name="vm-onscreen-text" autocomplete="off"/);
  assert.match(js, /function startInline\(\) \{\s*if \(inl\) return; inl = true; fit\(\); el\.classList\.add\('vm-typing'\);/);
  const h = R('studio/index.html'); assert.match(h, /\.vm\.vm-typing \.vm-stage\{width:min\(100%,calc\(\(var\(--vvh,420px\) - 190px\) \* 9 \/ 16\)\)!important\}/);
  assert.match(h, /\.vm\.vm-typing \.vm-safen,\.vm\.vm-typing \.vnav/);
});
/* 25 Nov 2026 (Emmanuel: "you made an extra box for it ... on Instagram or on TikTok, I can edit the text on the B-roll ... when you're about
   to post a story"). Checked in Chromium: a tap on the text opens typing on the video (focused, its words in it), typed words are kept
   after Done, a drag of 60 px moves the text (y 0.42 -> 0.54) without opening typing. */
test('typing happens on the video: a tap types, a move drags, Done ends; no box under the video', () => {
  assert.doesNotMatch(js, /id="vmTx"/);
  assert.match(js, /<textarea id="vmIn" class="vm-inl/); assert.match(js, /<button type="button" class="vm-done" id="vmDone" hidden>/);
  assert.match(js, /var tap = !drag\.moved && e && e\.type === 'pointerup';[^\n]*if \(tap\) startInline\(\);/);
  assert.match(js, /if \(Math\.abs\(e\.clientX - drag\.sx\) < 6 && Math\.abs\(e\.clientY - drag\.sy\) < 6\) return; drag\.moved = true;/);
  assert.match(R('studio/index.html'), /\.vm-inl\{position:absolute;z-index:3;transform:translate\(-50%,-50%\);/);
  for (const l of ['Tap the text to type on the video', 'Tipp auf den Text, um im Video zu schreiben', 'Toca el texto para escribir en el vídeo']) assert.ok(js.includes(l), l);
});
