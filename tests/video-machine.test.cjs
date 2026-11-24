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
  assert.match(js, /W\.indexedDB\.open\('lowi-studio', 1\)/); assert.match(js, /cv\.captureStream\(30\)/); assert.match(js, /new MediaRecorder\(stream/);
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
  assert.match(js, /'<div class="vm-acts"><button class="btn pri" data-vm="again"/, 'one button fills every text, each tap again');
  for (const l of ['Fill texts', 'Texte füllen', 'Rellenar textos']) assert.ok(js.includes(l), l);
});
test('a B-roll is cut once, when it is added; its parts (texts, positions) are kept and never cut again', () => {
  assert.match(js, /if \(!st\.cuts\[id\] \|\| !st\.cuts\[id\]\.length\) st\.cuts\[id\] = plan\(r\.dur\)/);
  assert.match(js, /return bPut\(o\)\.then\(function \(\) \{ useRoll\(o\.id\); \}\);/);
  assert.match(js, /cuts: st\.cuts, used: st\.used\}\)\)/, 'the parts are saved');   /* changed 24 Nov 2026, evening: + the Used folder */
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
  assert.match(js, /function markUsed\(idxs\)/); assert.match(js, /st\.used\.unshift\(\{roll: st\.sess\.id, k: k, ts: now, c: JSON\.parse\(JSON\.stringify\(c\)\)\}\)/);
  assert.match(js, /data-vm="uopen"/); for (const l of ['Not used yet', 'Noch nicht benutzt', 'Aún sin usar', '✓ Used {p}']) assert.ok(js.includes(l), l);
  assert.doesNotMatch(js, /bPut\([^)]*made/, 'made videos are never stored');
});
test('making videos never hangs silently: when the phone blocks it, a clear button asks for one tap; the status says "x / y done"', () => {
  assert.match(js, /function \(\) \{ qErr = 1; \}\)/); assert.match(js, /data-vm="kick">' \+ esc\(t\('tapMake'\)\)/);
  assert.match(js, /D\.addEventListener\('touchend', unlock, true\); D\.addEventListener\('click', unlock, true\);/);
  assert.match(js, /prep: \['🎬 Making your videos: \{p\} done'/); assert.doesNotMatch(js, /Getting your clips ready/);
  assert.match(js, /var idle = new Promise/, 'Save waits for the background maker (one video player)');
  assert.match(js, /function soft\(\) \{ if \(inEdit\(\)\) refresh0\(\); else refresh\(\); \}/);
});
