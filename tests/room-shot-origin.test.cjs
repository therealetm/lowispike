'use strict';
/* Oct 28 2026 (Emmanuel, call + Room screenshot): "when I try to shoot someone, it's not coming out of ... where my thingy is ...
   we can see where my companion is, but look at where the blast is"; "when you open it, it's supposed to be so much zoomed out
   that we already see everyone"; the line "Alle in der Galaxie koennen lesen, was du sendest" under the composer "I don't know
   why the text is even there ... it's cropped".
   Reproduced in Chromium (tools/room-shot-probe.cjs, 390x844, fake cloud): after someone's hit rolled your companion off its seat,
   the energy form you aim with was drawn on your old seat, 666 px from your companion (the ball itself already left from your
   companion: fireAt() uses the table position). The Room's fit used everyone's seats, so a companion rolled away (yours) was
   outside the view on opening. Fixed: the form uses the same table position as the shot and the companion; the fit uses where
   everyone rests; every opening of Community or the Room tab starts fitted to everyone. */
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const E = require('../community-energy.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const energy = read('community-energy.js'), chat = read('community-chat.js'), roomsUi = read('community-rooms-ui.js'), fitCss = read('readability-fit.css');

test('a hit moves your body on the table: the table position (what the shot, the companion and now the aim use) is not your seat', () => {
  const t = E.table();
  const seats = [{ uid: 'me', me: true, x: 0, y: 0, r: 22 }, { uid: 'b', x: 0, y: -120, r: 22 }];
  t.sync(seats, 600, { x: 0, y: 0 });
  /* b shoots you straight down */
  t.fire({ x: 0, y: -120, uid: 'b' }, Math.PI / 2, 1, 20, { to: 'me' });
  let n = 0; while (t.busy() && n++ < 2400) t.step(1 / 60);
  const at = t.pos('me');
  assert.ok(at && at.y > 60, 'you were rolled well below your seat (y ' + (at && Math.round(at.y)) + ')');
  assert.ok(Math.hypot(at.x - seats[0].x, at.y - seats[0].y) > 60, 'so drawing the aim on the seat would miss your companion');
});

test('the aim form is drawn from your table position (aimAt), not from your seat', () => {
  const draw = energy.slice(energy.indexOf('function draw('), energy.indexOf('function draw(') + 2500);
  assert.match(draw, /const me=meSpot\(g\),meAt=aimAt\(g,me\);/);
  assert.match(draw, /if\(aimNow&&aimNow\.ok&&me\)\{const p=scr\(g,meAt\)/, 'the form starts at meAt');
  assert.doesNotMatch(draw, /if\(aimNow&&aimNow\.ok&&me\)\{const p=scr\(g,me\)/, 'not at the seat');
  assert.match(energy, /function aimAt\(g,me\)\{[^\n]*t\.pos\(me\.uid\)/, 'aimAt reads the same table position fireAt() shoots from');
  assert.match(energy, /const at=t\.pos\(me\.uid\)\|\|me,from=\{x:at\.x,y:at\.y,uid:me\.uid\}/, 'control: the shot leaves from the table position');
});

test('the Room fit uses where everyone rests (LowiEnergy.peek), holds still during a roll, and fits again once a landing is placed', () => {
  assert.match(energy, /function peek\(uid\)\{if\(tb&&tb\.has\(uid\)\)return tb\.offset\(uid\);/, 'peek reads the table without building or syncing it');
  assert.match(energy, /W\.LowiEnergy=\{mount,offset,peek,/);
  assert.match(chat, /function fitCam\(gx,v\)\{let busy=false;[^\n]*if\(busy&&fitMemo/, 'mid-roll the last fit stays');
  assert.match(chat, /const spots=fitSpots\(gx\),gal=/, 'the fit is over the resting positions');
  assert.match(chat, /x:s\.x\+o\.x,y:s\.y\+o\.y/);
  assert.match(chat, /if\(fitLate&&fitLateN<3\)\{fitLateN\+\+;schedulePlace\(\);\}/);
  assert.doesNotMatch(chat.slice(chat.indexOf('function fitSpots'), chat.indexOf('function fitCam')), /\.offset\(/, 'no offset() inside the fit: offset() calls geom(), which calls the fit');
});

test('peek: null with no table, a saved landing spot reads as not placed yet', () => {
  /* the browser part is not loaded under node; the rule is in the source */
  assert.match(energy, /const L=tb\?tb\.landed\(uid\):!!loadLand\(\)\[uid\];return L\?undefined:null;/);
});

test('every opening of Community and of the Room tab starts fitted to everyone', () => {
  assert.match(chat, /if\(on&&!wasOn\)\{wasOn=true;enterAt=Date\.now\(\);koRetry=0;[^\n]*camUser=false;camFree=false;cam=null;/);
  assert.doesNotMatch(chat, /if\(on&&!wasOn\)\{[^\n]*if\(!camUser\)cam=null;/, 'a zoom from an earlier visit no longer carries over');
  assert.match(roomsUi, /const wasRoom=cur\(\)==='room';[^\n]*\n[^\n]*\n if\(!wasRoom\)\{try\{if\(W\.LowiCgMap&&W\.LowiCgMap\.reset\)W\.LowiCgMap\.reset\(\);/);
});

test('the line under the composer no longer says who can read; it hides when it has nothing to say', () => {
  assert.doesNotMatch(chat, /tr\('hint'\)/, 'the generic "Everyone in the galaxy can read" line is not shown');
  assert.doesNotMatch(chat, /fill\('hintTo',selN\):tr/, 'nor its "to someone" variant');
  assert.equal((chat.match(/inp\.value\.length\?inp\.value\.length\+'\/600':''/g) || []).length, 2, 'the counter is empty while nothing is typed');
  assert.match(fitCss, /\.cs-compose-meta:has\(#csDraft:empty\):has\(#csCount:empty\)\{display:none!important\}/);
  assert.match(chat, /tr\('draft'\)/, 'control: the kept-draft line still shows');
});
