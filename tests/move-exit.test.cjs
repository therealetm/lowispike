'use strict';
/* Oct 15: Move session exit. The "End this session?" sheet sits above the player controls, the controls hide while it is open,
   and back (Safari edge swipe, Android back, Esc) always gets you out: back opens the sheet, back again ends and saves, back on the done screen closes. */
const {test} = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8'), spirit = fs.readFileSync(path.join(__dirname, '../spirit.css'), 'utf8');

test('the end sheet stacks above the player controls and the controls hide while it is open', () => {
  const z = +(html.match(/#mv-player \.mv-confirm\{z-index:(\d+)\}/) || [])[1];
  const ctrl = spirit.match(/\.spirit-app \.mv-ctrl,[^{]*\{[^}]*z-index:\s*(\d+)/);
  assert.ok(z > 0, 'sheet has its own z-index');
  assert.ok(ctrl && z > +ctrl[1], 'sheet z-index ' + z + ' is above the controls (' + (ctrl && ctrl[1]) + ')');
  assert.match(html, /#mv-player\.mv-asking \.mv-ctrl\{visibility:hidden\}/);
  assert.match(html, /\.mv-sm\{height:44px;[^}]*\}/, 'sheet buttons are 44 px tall');
  assert.match(html, /\.mv-safe button::after\{content:"";position:absolute;inset:-10px\}/, 'tip close X has a 44 px touch area');
  assert.match(html, /function endAsk\(\)\{[^\n]*classList\.add\("mv-asking"\)/);
  assert.match(html, /function endKeep\(\)\{[^\n]*classList\.remove\("mv-asking"\)/);
  assert.match(html, /el\.innerHTML = playerHTML\(\);[^\n]*mvGuard\(\)/, 'starting a session sets the back guard');
  assert.match(html, /function closePlayer\(\)\{ mvUnguard\(\);/, 'closing the player clears the back guard');
  assert.match(html, /const SEL = "[^"]*#mv-player\.on[^"]*"/, 'the Add to Home Screen pill hides during a session');
});

function harness() {
  const a = html.indexOf('let mvSkipPop = false;'), b = html.indexOf('\n', html.indexOf('document.addEventListener("keydown", e => { if (e.key !== "Escape"', a));
  assert.ok(a > 0 && b > a, 'back guard block found');
  const log = [], listeners = {}, stack = [{state: null}];
  let idx = 0;
  const player = {on: false};
  const ctx = {
    P: null, log, setTimeout: () => 0,
    history: {get state() { return stack[idx].state; }, pushState(s) { stack.length = idx + 1; stack.push({state: s}); idx++; }, back() { if (idx > 0) { idx--; (listeners.popstate || []).forEach(f => f({})); } }},
    addEventListener: (t, f) => { (listeners[t] = listeners[t] || []).push(f); },
    document: {addEventListener: (t, f) => { (listeners['d' + t] = listeners['d' + t] || []).push(f); }},
    $: s => (s === '#mv-player.on' && player.on ? {} : null)
  };
  ctx.endAsk = () => { log.push('ask'); ctx.P.confirm = true; };
  ctx.endKeep = () => { log.push('keep'); ctx.P.confirm = false; };
  ctx.finish = () => { log.push('finish'); ctx.P.done = true; ctx.P = null; };
  vm.createContext(ctx);
  vm.runInContext(html.slice(a, b), ctx);
  ctx.closePlayer = () => { log.push('close'); ctx.mvUnguard(); player.on = false; };
  const start = () => { ctx.P = {confirm: false, done: false}; player.on = true; ctx.mvGuard(); };
  const esc = () => (listeners.dkeydown || []).forEach(f => f({key: 'Escape', preventDefault() {}}));
  return {ctx, log, start, esc, player, depth: () => idx, back: () => ctx.history.back()};
}

test('back opens the sheet, back again ends and saves, back on the done screen closes', () => {
  const h = harness();
  h.start();
  assert.equal(h.depth(), 1, 'one guard entry while the session runs');
  h.back();
  assert.deepEqual(h.log, ['ask']); assert.equal(h.depth(), 1, 'guard is back so the next back stays in the app');
  h.back();
  assert.deepEqual(h.log, ['ask', 'finish']); assert.ok(h.player.on, 'done screen shows'); assert.equal(h.depth(), 1);
  h.back();
  assert.deepEqual(h.log, ['ask', 'finish', 'close']); assert.ok(!h.player.on); assert.equal(h.depth(), 0, 'no guard left behind');
  h.back();
  assert.deepEqual(h.log, ['ask', 'finish', 'close'], 'back outside a session does nothing here');
});

test('Keep going returns to the session; tapping through to Done leaves no extra history entry', () => {
  const h = harness();
  h.start(); h.back(); h.ctx.endKeep();
  assert.equal(h.ctx.P.confirm, false); assert.ok(h.player.on);
  h.ctx.finish(); h.ctx.closePlayer();
  assert.equal(h.depth(), 0);
  assert.deepEqual(h.log, ['ask', 'keep', 'finish', 'close'], 'the guard pop after Done is swallowed, not treated as a back');
  h.start(); assert.equal(h.depth(), 1, 'a new session gets a fresh guard');
});

test('Esc opens the sheet and Esc again keeps going', () => {
  const h = harness();
  h.start(); h.esc();
  assert.equal(h.ctx.P.confirm, true);
  h.esc();
  assert.equal(h.ctx.P.confirm, false); assert.deepEqual(h.log, ['ask', 'keep']);
});
