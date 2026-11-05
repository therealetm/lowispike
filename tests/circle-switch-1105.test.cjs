'use strict';
/* 5 Nov 2026 regression (Emmanuel, iPhone):
   (1) "When I'm in Circle and I click on shuffle and I say I go back to Billiard, then it just takes me to chat, you know? Or it
       just crashes and restarts."
   (2) "Friend's Tree, I click on Friend's Tree, I click on swipe, I click on shuffle, I click on swipe, I click on Friend's Tree,
       and then it takes me to chat. All of a sudden."
   (3) "when I click on shuffle, I can see the galaxy still in the background ... it's just opening a page above another page ... I can
       even click on it ... and now I'm back into the chat."
   Cause: Mischen / Swipen raise Kochen over Circle (section-nav.js holo; Community stays drawn under it as .holo-under). Coming back
   to Billard made community-tab-order.js think Community had just been opened, so its first-tab rule switched to the first tab
   (Chat, when Chat is first) and, on a big account, rebuilt the chat list under the game. And Circle's room and message bar stayed
   tappable around and under the Kochen card. Here both sequences are replayed against the real community-tab-order.js with the same
   class changes the app makes, and the CSS / bar are checked. The finger-level replay is tools/circle-switch-1105.cjs. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

function cls() { const s = new Set(); return { add: c => s.add(c), remove: c => s.delete(c), contains: c => s.has(c), toggle: (c, on) => { if (on === undefined) on = !s.has(c); on ? s.add(c) : s.delete(c); return on; } }; }

/* A Community page with the class list the app uses, a MutationObserver that runs after each batch of class changes (like the
   browser: once per task, after all of that task's changes), and a LowiRoomsUI that records every tab it is told to open. */
function app(order) {
  const store = { 'lowispike.community.tabs': JSON.stringify(order) };
  const page = { id: 'tab-foryou', classList: cls() };
  let obs = null;
  const doc = { readyState: 'complete', getElementById: id => (id === 'tab-foryou' ? page : null), querySelector: () => null, documentElement: { classList: cls() }, addEventListener() { } };
  const opened = [];
  const win = { localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } }, document: doc, navigator: {}, location: { hash: '' }, addEventListener() { }, scrollY: 0 };
  win.window = win;
  let roomTab = 'room';
  win.LowiRoomsUI = { paint() { opened.push('first-tab rule'); }, tab: () => roomTab, setTab(isChat) { roomTab = isChat ? 'chat' : 'room'; opened.push(roomTab); }, setTabFy() { roomTab = 'fy'; opened.push('fy'); } };
  const timers = [];
  vm.runInNewContext(R('community-tab-order.js'), { window: win, module: undefined, setTimeout: f => { timers.push(f); return timers.length; }, setInterval: () => 0, clearTimeout() { }, Date,
    MutationObserver: function (cb) { obs = cb; this.observe = () => { }; } });
  /* one task of class changes, then the observer, like the browser */
  const task = fn => { fn(page.classList); obs && obs([]); };
  return { task, opened, page, roomTab: () => roomTab, setRoom: t => { roomTab = t; } };
}
/* what section-nav.js / circle-games.js do to the Community page for each tap of the Circle bar */
const toGame = c => { c.remove('active'); c.add('holo-under'); };      /* Mischen / Swipen: Kochen up, Community held under it */
const gameToGame = () => { };                                          /* Mischen <-> Swipen: Kochen stays up */
const toBillard = c => { c.remove('holo-under'); c.add('active'); };  /* Billard: Kochen down, Community back */

for (const order of [['chat', 'room', 'fy', 'rank'], ['room', 'chat', 'fy', 'rank'], ['fy', 'room', 'chat', 'rank']]) {
  test('sequence 1, ' + order[0] + ' first: Circle > Mischen > Billard, three rounds, never jumps to another tab', () => {
    const A = app(order);
    A.task(c => c.add('active'));            /* Community opens: the first-tab rule may run here, once */
    A.setRoom('room'); A.opened.length = 0;  /* the person taps Circle */
    for (let i = 0; i < 3; i++) { A.task(toGame); A.task(toBillard); }
    assert.deepStrictEqual(A.opened, [], 'the first-tab rule never ran on the way back to Billard');
    assert.strictEqual(A.roomTab(), 'room', 'still in Circle');
  });
  test('sequence 2, ' + order[0] + ' first: Swipen > Mischen > Swipen > Billard (the old tree taps are Billard now)', () => {
    const A = app(order);
    A.task(c => c.add('active')); A.setRoom('room'); A.opened.length = 0;
    A.task(toGame); A.task(gameToGame); A.task(gameToGame); A.task(toBillard);
    A.task(toGame); A.task(toBillard);
    assert.deepStrictEqual(A.opened, []);
    assert.strictEqual(A.roomTab(), 'room');
  });
}

test('leaving Community for real still opens the first tab next time (the first-tab rule still works)', () => {
  const A = app(['chat', 'room', 'fy', 'rank']);
  A.task(c => c.add('active')); A.setRoom('room');
  A.task(toGame);                                   /* Mischen */
  A.task(c => c.remove('holo-under'));              /* then Home: Kochen down, Community not shown */
  A.opened.length = 0;
  A.task(c => c.add('active'));                     /* Community opened again from the bubble */
  assert.deepStrictEqual(A.opened, ['first-tab rule'], 'a real new visit still runs the first-tab rule (Chat, as Chat is first)');
});

test('the Circle bar has only Billard, Mischen and Swipen; Billard is reached without leaving Circle', () => {
  const js = R('circle-games.js');
  const ids = [...js.matchAll(/\{ id: '([a-z]+)', ic:/g)].map(m => m[1]);
  assert.deepStrictEqual(ids, ['billard', 'mischen', 'swipen']);
  assert.ok(!/baum|openTree|LowiCellRoom/.test(js.replace(/\/\*[\s\S]*?\*\//g, '')), 'no Friends tree anywhere in the bar');
  assert.match(js, /if \(id === 'billard'\) \{\n\s+if \(tab\(\) === 'shelf'\) go\('foryou'\);/);
});

test('Mischen / Swipen fill the page under the bar and Circle cannot be tapped through them', () => {
  const css = R('circle-games.css');
  assert.match(css, /html\.csp-game\.cook-holo[^{]*#tab-shelf\.tab\.active[^{]*\{\s*left:0!important;right:0!important;width:auto!important;border-radius:0!important;border:0!important;box-shadow:none!important;\s*outline:0!important;background:transparent!important/);
  assert.match(css, /html\.csp-game\.cook-holo\.apple-ui #main #tab-foryou\.holo-under\{opacity:1!important;pointer-events:none!important/, 'Circle under the panel takes no taps');
  assert.match(css, /html\.csp-game\.cook-holo\.cook-holo #app #main #tab-foryou\.holo-under \*\{pointer-events:none!important\}/, 'nor its pager (a swipe there turned to Chat)');
  assert.match(css, /#tab-foryou\.holo-under #cspBar \*,\nhtml\.csp-game\.cook-holo\.cook-holo #app #main #tab-foryou\.holo-under \.rm-bar,[^{]*\.rm-bar \*\{pointer-events:auto!important\}/, 'only the header row and the games bar do');
  assert.match(css, /#tab-foryou\.holo-under #cpRoom,[^{]*holo-under \.cm-compose,[^{]*holo-under #cgThread\{visibility:hidden!important;pointer-events:none!important\}/);
});

test('one Circle background: true black behind all three games in Dark, one shared veil in Night / Day', () => {
  const css = R('circle-games.css');
  assert.match(css, /html\[data-black="1"\]\.csp-circle #main>#tab-foryou #cmPaneChat\{background:#000!important;background-image:none!important\}/);
  assert.match(css, /html\.csp-circle:not\(\[data-black="1"\]\) #main>#tab-foryou #cmPaneChat\{background-color:rgba\(0,0,0,\.38\)!important\}/);
});

test('Friends tree: gone from the app, old links open Circle, friends kept', () => {
  const cr = R('cell-room.js');
  assert.match(cr, /function openTree\(\)\{toCircle\(\);\}/, 'LowiCellRoom.openTree (old links, old buttons) opens Circle');
  assert.match(cr, /function toCircle\(\)\{closeTree\(true\);try\{if\(typeof root\.goTab==='function'\)root\.goTab\('foryou'\);/);
  assert.match(cr, /U\.setTab\(false\)/, 'and picks the Circle tab');
  assert.match(cr, /if\(a==='tree'&&/, 'a stray old tree button still lands somewhere safe');
  assert.match(cr, /addFriend\(inv,'link'\);toCircle\(\);/, 'an invite link still adds the friend, then shows Circle');
  assert.match(cr, /lowispike\.friends\.v1/, 'the saved friends list is untouched');
  assert.ok(!/Freundesbaum|friends tree/.test(R('nav-moves.js').replace(/\/\*[\s\S]*?\*\//g, '')), 'no tree button in the galaxy');
  for (const f of ['companion.js', 'community-chat.js', 'micro-book.js']) assert.ok(!/data-mb="tree"|their friends tree|in friends trees/.test(R(f)), f + ' does not point at the tree');
});
