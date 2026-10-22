const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
test('XP card is blue glass under the Daily Quest, cell stage names', () => {
  const js = R('herb-quests.js'), css = R('herb-quests.css'), cfg = R('herb-config.js');
  assert.ok(js.includes("getElementById('f3Board')") && js.includes("el.dataset.at = 'quest'"));
  assert.ok(/\.hq-pop, html\.lg \.hq-pop \{[^}]*backdrop-filter/.test(css));
  assert.ok(!/Herb'|Bloom'/.test(cfg), 'no herb stage names');
  // Oct 22, 2026: stage names come from the one level table (world-home-core.js STAGES), not a Comet list of their own
  assert.ok(!/Comet'/.test(cfg) && cfg.includes('WHC.STAGES'));
  assert.strictEqual(require('../herb-config.js').stages[5].name[0], 'Legend');
});
