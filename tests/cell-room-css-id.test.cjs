'use strict';
/* Oct 24 2026: cell-room.js skipped loading cell-room.css because index.html's community-room.css <link> uses the same id
   "crCss". In Chromium the Friends tree then rendered unstyled and its Add friend button sat under the galaxy, untappable. */
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const dir = path.join(__dirname, '..'), read = f => fs.readFileSync(path.join(dir, f), 'utf8');
test('cell-room.css is injected under an id no other page element uses', () => {
  const m = read('cell-room.js').match(/getElementById\('([^']+)'\)\)\{const l=D\.createElement\('link'\);l\.id='([^']+)'[^}]*cell-room\.css/);
  assert.ok(m, 'cell-room.js injects cell-room.css');
  assert.equal(m[1], m[2]);
  for (const f of fs.readdirSync(dir).filter(f => /\.(html|js)$/.test(f) && f !== 'cell-room.js'))
    assert.doesNotMatch(read(f), new RegExp('id=["\']' + m[1] + '["\']|\\.id\\s*=\\s*["\']' + m[1] + '["\']'), f + ' reuses the id');
});
