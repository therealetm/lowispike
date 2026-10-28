/* Oct 28 2026, late (Emmanuel: the small middle drawn on the felt is not symmetric with the board; the faint LOWiSPIKE on the
   felt can't be read: throw both out). The felt carries no off-centre markings and no watermark; the only marking is the middle
   ring round the exact centre. A shot must also finish when the phone stops drawing frames. */
'use strict';
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'room-table.js'), 'utf8'), css = fs.readFileSync(path.join(root, 'room-table.css'), 'utf8');
const C = require(path.join(root, 'room-table-core.js'));
test('no LOWiSPIKE watermark, no head spot, no head line or circle on the felt', () => {
  assert.ok(!/rt-mark|LOWiSPIKE<\/span>/.test(js), 'watermark markup gone');
  assert.ok(!/rt-spot/.test(js) && !/\.rt-spot/.test(css), 'off-centre spot gone');
  assert.ok(!/\.rt-mark/.test(css), 'watermark style gone');
  assert.ok(!/\.rt-felt::before/.test(css), 'head line and circle at 25 % gone');
});
test('the middle ring sits on the exact centre of the table', () => {
  assert.strictEqual(C.T.MID_X * 2, C.T.W); assert.strictEqual(C.T.MID_Y * 2, C.T.H);
});
test('a shot finishes even when no frames come (watchdog)', () => {
  assert.ok(/function kick\(\)\{watch\(\);/.test(js), 'kick arms the watchdog');
  assert.ok(/stats\.frames===wdF\)\{if\(play\.moving\(\)\)play\.settle\(\);finishPlay\(\)/.test(js), 'stalled shot jumps to its end');
});
test('shooting into the cushion beside you catapults you off it', () => {
  const start = [['me', 50, 900], ['x', 900, 100]];
  const r = C.simulate(start, 'me', -1, 0, .5);
  assert.ok(r && r.self, 'the blast comes back off the cushion into you');
  const me = r.final.find(b => b[0] === 'me');
  assert.ok(me[1] - 50 > 300, 'you fly well away from the wall: ' + me[1]);
});
