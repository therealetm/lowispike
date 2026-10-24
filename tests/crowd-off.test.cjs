'use strict';
/* Oct 24 2026 (Emmanuel: "delete all the bots in the chat room"; only one labelled inspiration bot from now on). The simulated
   crowd (tools/community-crowd) must not run on a schedule any more, and a manual run needs the explicit CROWD_ON variable. */
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const wf = fs.readFileSync(path.join(__dirname, '..', '.github/workflows/community-crowd.yml'), 'utf8');
const live = wf.split('\n').filter(l => !/^\s*#/.test(l)).join('\n');

test('the crowd workflow has no schedule', () => {
  assert.doesNotMatch(live, /^\s*schedule:/m);
  assert.doesNotMatch(live, /cron:/);
});

test('a manual crowd run is a no-op unless CROWD_ON is set to 1', () => {
  assert.match(live, /if: vars\.CROWD_OFF != '1' && vars\.CROWD_ON == '1'/);
});
