#!/usr/bin/env node
'use strict';
// The test count may only go up. Reads a node --test log (file argument or stdin), takes the
// pass count, and compares it with the newest "tests N/M" in the commit subjects on this branch.
// Deleting or skipping tests to get green fails here. Set ALLOW_TEST_DROP=1 for an intended drop
// and say why in the commit.
// Usage: node --test tests/*.test.cjs | tee t.log; node scripts/test-floor.cjs t.log [--ref origin/main]
const fs = require('fs');
const { execFileSync } = require('child_process');

function parsePass(log) { const m = log.match(/^ℹ pass (\d+)/m); return m ? +m[1] : null; }
function floorFromSubjects(subjects) { for (const s of subjects) { const m = s.match(/\btests (\d+)\/(\d+)/); if (m) return { floor: +m[1], subject: s }; } return null; }

module.exports = { parsePass, floorFromSubjects };

if (require.main === module) {
  const args = process.argv.slice(2);
  const i = args.indexOf('--ref');
  const ref = i >= 0 ? args[i + 1] : 'HEAD';
  const file = args.find((a, k) => !a.startsWith('--') && args[k - 1] !== '--ref');
  const log = file ? fs.readFileSync(file, 'utf8') : fs.readFileSync(0, 'utf8');
  const pass = parsePass(log);
  if (pass == null) { console.log('ERROR: no "ℹ pass N" line in the test log'); process.exit(1); }
  let subjects = [];
  try { subjects = execFileSync('git', ['log', '--format=%s', '-200', ref], { encoding: 'utf8' }).split('\n'); } catch (e) { console.log('warning: no git history, floor not checked'); }
  const f = floorFromSubjects(subjects);
  if (!f) { console.log('test floor: none recorded yet, ' + pass + ' pass'); process.exit(0); }
  if (pass < f.floor && process.env.ALLOW_TEST_DROP !== '1') {
    console.log('ERROR: ' + pass + ' tests pass, fewer than the ' + f.floor + ' recorded in "' + f.subject.slice(0, 90) + '". Tests must not be deleted or skipped to get green (ALLOW_TEST_DROP=1 if intended).');
    process.exit(1);
  }
  console.log('test floor OK: ' + pass + ' pass, floor ' + f.floor);
}
