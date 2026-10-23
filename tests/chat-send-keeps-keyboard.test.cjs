'use strict';
/* Oct 23 bug hunt (simulated iPhone 13 + SE, live build 20261023-024754): typing in the Community chat and tapping Send moved focus
   off the message field (the tap's mousedown blurred it: focusout cmInput > cmSend, then the disabled button dropped it to the
   page), so the keyboard closed after every message and the next one needed another tap on the field. A press on Send while you
   type now keeps the field focused, and the send itself puts focus back on the field.
   The fixture is the one in community-room.test.cjs, read from that file so the two cannot drift apart. */
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const K = require('../community-chat-core.js');
const roomSrc = fs.readFileSync(path.join(__dirname, 'community-room.test.cjs'), 'utf8');
const a = roomSrc.indexOf('function fixture(){'), b = roomSrc.indexOf('\n}\n', a);
const fixture = new Function('require', 'assert', 'fs', 'vm', 'path', 'K', '__dirname', roomSrc.slice(a, b + 2) + ';return fixture;')(require, assert, fs, vm, path, K, __dirname);
const js = fs.readFileSync(path.join(__dirname, '..', 'community-chat.js'), 'utf8');
const press = (f, type, target) => { let prevented = false; f.event(type, { target, pointerType: 'touch', button: 0, preventDefault() { prevented = true; } }); return prevented; };

test('pressing Send while typing does not take focus from the message field (pointerdown and mousedown)', () => {
  const f = fixture(); f.scope('a');
  const send = f.nodes.cmSend; send.closest = s => s === '#cmSend' ? send : null;
  f.input.focus(); f.input.value = 'hello'; f.event('input', { target: f.input });
  assert.equal(send.disabled, false);
  assert.equal(press(f, 'pointerdown', send), true, 'pointerdown on Send is held back while the field has focus');
  assert.equal(press(f, 'mousedown', send), true, 'so is the mousedown that would blur the field');
  assert.equal(f.doc.activeElement, f.input);
});

test('the press is left alone when you are not typing, when Send is off, and on other buttons', () => {
  const f = fixture(); f.scope('a');
  const send = f.nodes.cmSend; send.closest = s => s === '#cmSend' ? send : null;
  f.doc.activeElement = null; send.disabled = false;
  assert.equal(press(f, 'mousedown', send), false, 'field not focused: nothing to keep');
  f.input.focus(); send.disabled = true;
  assert.equal(press(f, 'mousedown', send), false, 'Send switched off: untouched');
  const other = { closest: () => null };
  assert.equal(press(f, 'mousedown', other), false, 'any other button: untouched');
});

test('sending puts focus back on the message field, so the keyboard stays up for the next message', () => {
  const f = fixture(); f.scope('a');
  const send = f.nodes.cmSend; send.closest = s => s === '#cmSend' ? send : null;
  f.input.focus(); f.input.value = 'first'; f.event('input', { target: f.input });
  press(f, 'pointerdown', send);
  f.doc.activeElement = send; /* a browser that still moved focus to the button */
  f.click({ chat: 'send' });
  assert.equal(f.doc.activeElement, f.input, 'focus is back on the field right in the tap, before the send finishes');
  assert.match(js, /if\(a==='send'\)\{if\(sendKeep\|\|D\.activeElement===D\.getElementById\('cmInput'\)\)focusInput\(\);sendKeep=false;send\(\);\}/);
});

test('a send from a closed keyboard does not open it', () => {
  const f = fixture(); f.scope('a');
  f.input.value = 'from the button'; f.event('input', { target: f.input });
  f.doc.activeElement = null;
  f.click({ chat: 'send' });
  assert.notEqual(f.doc.activeElement, f.input, 'no focus (no keyboard) when you were not typing');
});
