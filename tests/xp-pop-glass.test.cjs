const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
test('XP card is blue glass under the Daily Quest, comet forms', () => {
  const js = R('herb-quests.js'), css = R('herb-quests.css'), cfg = R('herb-config.js');
  assert.ok(js.includes("getElementById('f3Board')") && js.includes("el.dataset.at = 'quest'"));
  assert.ok(/\.hq-pop, html\.lg \.hq-pop \{[^}]*backdrop-filter/.test(css));
  assert.ok(!/Herb'|Bloom'/.test(cfg), 'no herb stage names');
  assert.ok(cfg.includes("'Legendary Comet'"));
});
