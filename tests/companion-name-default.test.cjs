// 25 Nov 2026 (Emmanuel: "Misty is just my specific companion name. It has nothing to do with anything and anybody else ... Misty's a name
// nobody else should be seeing apart from me"). companion-name.js: the default companion name is "Misty" only on the owner's account,
// else the companion's star-sign name; every fallback in the app asks it; Pisces no longer suggests Misty.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
function load(store, auto) { const mem = Object.assign({}, store); const W = { localStorage: { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); } }, dispatchEvent() {}, CustomEvent: function () {} };
  if (auto) W.LowiHerbIdentity = { autoName: () => auto, setCustomName: v => { W.__custom = v; } }; const ctx = { window: W, localStorage: W.localStorage, CustomEvent: function () {} }; vm.createContext(ctx); vm.runInContext(R('companion-name.js'), ctx); return W; }
test('the default name: Misty only on the owner\'s account, else the star-sign name, else Lumi', () => {
  assert.strictEqual(load({}, 'Coral Bloom').LowiDefaultName(), 'Coral Bloom');
  assert.strictEqual(load({}, '').LowiDefaultName(), 'Lumi');
  assert.strictEqual(load({ 'lowispike.mine.misty': '1' }, 'Coral Bloom').LowiDefaultName(), 'Misty');
});
test('when the owner is confirmed, his device is marked and his companion keeps "Misty" as its own name', () => {
  const W = load({}, 'Coral Bloom'); W.LowiMarkMine();
  assert.strictEqual(W.LowiDefaultName(), 'Misty'); assert.strictEqual(W.__custom, 'Misty');
  assert.match(R('owner-admin.js'), /if \(ST\.owner\) \{ try \{ if \(window\.LowiMarkMine\) window\.LowiMarkMine\(\); \} catch \(e\) \{ \} \}/);
  assert.match(R('index.html'), /<script src="companion-name\.js\?v=/);
});
test('no fallback in the app hands "Misty" to everyone any more; Pisces suggests Coral', () => {
  for (const f of ['cell-room.js', 'companion.js', 'day-recap.js', 'misty-hub.js', 'misty-scale.js', 'ranking.js', 'spirit.js', 'world-home.js', 'lowi-ask.js', 'adventure.js', 'mirror-hinge.js', 'nutri-stats.js', 'region-pals.js', 'tutorial.js', 'after-meal-checklist.js', 'misty-peak.js', 'evo-card.js', 'misty-history.js', 'day-recap-core.js', 'region-pals-core.js']) {
    const code = R(f).replace(/\(typeof window !== 'undefined' && window\.LowiDefaultName \? window\.LowiDefaultName\(\) : 'Misty'\)/g, '');
    assert.doesNotMatch(code, /(\|\||return|:)\s*'Misty'/, f);
  }
  assert.match(R('herb-identity-core.js'), /Pisces:'Coral'\}/); assert.match(R('herb-tamagotchi-core.js'), /'Coral','Bubbles','Nori'/);
});
