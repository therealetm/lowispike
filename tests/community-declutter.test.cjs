// 5 Nov 2026 (owner, voice): "the community thingy up there makes everything crammed ... the word opens the people list, the arrow opens
// settings, that's confusing ... nuke it ... chat, circle, ranking, for you and then profile" / "move members to ranking ... that round
// button there becomes members ... so the chat doesn't become a snitch" / "remove the old chat button and 'Write to the galaxy' from the
// Billiard page, the main Chat has it".
'use strict';
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const noComments = s => s.replace(/\/\*[\s\S]*?\*\//g, '');

test('Community: no heading; the tabs are the top row and one round profile button at its end opens settings', () => {
  const ui = noComments(read('community-rooms-ui.js'));
  assert.doesNotMatch(ui, /class="rm-head"|class="rm-name"|class="rm-live"|class="rm-chev"/, 'the Community name, live line and arrow are gone');
  assert.match(ui, /<div class="rm-top"><div class="rm-tabs" role="tablist">/, 'the tabs are the top row');
  assert.match(ui, /<button type="button" class="rm-pf rm-menu-btn" data-rm="menu" aria-haspopup="dialog">/, 'profile button opens the menu (settings)');
  assert.match(ui, /else if\(a==='menu'\)\{\s*toggleMenu\(false\);try\{if\(W\.LowiCommunityMe&&typeof W\.LowiCommunityMe\.open==='function'&&W\.LowiCommunityMe\.open\(\)\)return;/, 'the one tap opens the settings page, no word-vs-arrow split');
  assert.doesNotMatch(ui, /LowiPeopleDir\.open\(\{at:'here'\}\)/, 'nothing above the chat opens who is online');
  assert.match(ui, /profile:\['Profile & settings','Profil & Einstellungen','Perfil y ajustes'\]/, 'labelled in all three languages');
  assert.match(ui, /\['room','chat','fy','rank'\]/, 'Circle, Chat, For You, Ranking are all still there');
});

test('Community: the profile button keeps the glass look, a 44 px+ target and a focus ring; no new tab', () => {
  const css = read('community-rooms.css');
  assert.match(css, /\.rm-pf\{appearance:none;flex:none;display:grid;place-items:center;width:52px;height:52px;[^}]*border-radius:50%;[^}]*background:var\(--rm-glass\);border:1px solid var\(--rm-edge\)/);
  assert.match(css, /@media \(max-width:359px\)\{#cmPaneChat\[data-spirit-chat\] \.rm-pf\{width:44px;height:44px\}/);
  assert.match(css, /\.rm-pf:focus-visible\{outline:2px solid var\(--rm-cyan\)/);
  assert.doesNotMatch(read('community-rooms-ui.js'), /data-rm="profile"|data-rm="members"/, 'no extra tab');
});

function fitWorld(o) {
  const rect = (l, t, w, h) => ({ left: l, top: t, right: l + w, bottom: t + h, width: w, height: h });
  const mk = (id, r, extra) => Object.assign({ id, __r: r, getBoundingClientRect() { return this.__r; }, style: { props: {}, setProperty(k, v) { this.props[k] = v; } } }, extra || {});
  const top = mk('top', rect(18, 12, o.vw - 36, 52)), els = {};
  const bar = mk('bar', rect(18, 12, o.vw - 36, 52), { querySelector: s => s === '.rm-top' ? top : null });
  if (o.x) els.secX = mk('secX', rect(14, 10, 44, 44), { display: o.x });
  const D = { readyState: 'loading', addEventListener() {}, getElementById: id => els[id] || null, documentElement: {} };
  const W = { getComputedStyle: e => ({ display: e.display || 'block', visibility: 'visible', opacity: '1' }), addEventListener() {}, LowiRooms: null };
  const ctx = { window: W, document: D, setInterval() {}, setTimeout() {}, MutationObserver: undefined, location: { hash: '' } }; vm.createContext(ctx);
  vm.runInContext(read('community-rooms-ui.js'), ctx); W.LowiRoomsUI.fit(bar); return bar.style.props;
}

test('Community: the top row keeps clear of the page back button only while it shows top left', () => {
  assert.strictEqual(fitWorld({ vw: 390, x: 'grid' })['--rm-tl'], '48px', '14+44-18+8');
  assert.strictEqual(fitWorld({ vw: 390, x: 'none' })['--rm-tl'], '0px', 'handed to the bottom: no space reserved');
  assert.strictEqual(fitWorld({ vw: 390 })['--rm-tl'], '0px');
});

test('Ranking: the round button is Members (People: everyone + online now), How it works sits with the XP / Forever chips', () => {
  const js = read('ranking.js');
  assert.match(js, /'<button type="button" class="rk-info rk-mem" data-rk="members" aria-haspopup="dialog" aria-label="' \+ esc\(tr\('members'\)\)/);
  assert.match(js, /'<button type="button" class="rk-chip rk-how" data-rk="info" aria-haspopup="dialog">' \+ ico\('info'[^\n]*esc\(tr\('info'\)\) \+ '<\/span><\/button><\/div>'/, 'How it works is the last chip');
  assert.match(js, /members: \['Members', 'Mitglieder', 'Miembros'\]/);
  assert.match(js, /if \(t\.dataset\.rk === 'members'\) \{ openMembers\(t\); return; \}/);
  assert.match(js, /function openMembers\(t\) \{\s*const P = W\.LowiPeopleDir;[\s\S]{0,120}P\.open\(\{ at: 'here' \}\)/, 'opens the existing People list');
  const css = read('ranking.css');
  assert.match(css, /\.rm-rank \.rk-chips\{flex-wrap:wrap;row-gap:6px\}/, 'three chips wrap on a small phone instead of overflowing');
  assert.match(css, /\.rm-rank \.rk-mem\{width:40px;height:40px/);
});

test('Billiard (Circle) page: no To-everyone chat button and no message field; the Chat tab keeps both', () => {
  const css = read('community-rooms.css');
  assert.match(css, /html\.csp-circle:not\(\.cr-room\):not\(\.csp-game\) #cmPaneChat\[data-spirit-chat\]:not\(\[data-room\]\) #cgTo,\nhtml\.csp-circle:not\(\.cr-room\):not\(\.csp-game\) #cmPaneChat\[data-spirit-chat\]:not\(\[data-room\]\) \.cm-compose\{display:none!important\}/);
  const rt = read('room-table.js');
  assert.match(rt, /function fieldHidden\(\)\{const c=D\.querySelector\('#cmPaneChat \.cm-compose'\)/);
  assert.match(rt, /if\(go\)toChat\(\);\}/, 'tapping a ball with the field hidden opens the Chat tab with that person picked');
  assert.match(read('circle-games.js'), /classList\.toggle\('csp-circle'/, 'the page class the rule keys on still exists');
});

test('tutorial: the People card now points at Ranking', () => {
  const s = read('tutorial-steps.js');
  assert.match(s, /id: 'new-people', area: 'new', where: 'community', target: \['\.rm-tab\[data-rm="rank"\]', '\.rm-tabs'\]/);
  assert.match(s, /en: 'New: Members, the round button in Ranking, opens People/);
  assert.doesNotMatch(s, /target: \[[^\]]*\.rm-name/);
});
