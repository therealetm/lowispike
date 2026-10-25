/* Phone notifications release (25 Oct 2026). Energy received is pushed by the server from public.energy_gifts (a trigger right
   after each shot, cron as fallback), claimed once so it is never pushed twice; the companion never guilt-trips or plays
   dead (Reddit users hated Duolingo's owl doing that) and stops knocking after it was ignored. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const ROOT = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('energy_gifts: a trigger calls n1-push after each insert, the function claims rows before pushing', () => {
  const sql = read('supabase/proposals/n1_push_energy_hook_20261025.sql');
  assert.match(sql, /after insert on public\.energy_gifts/i);
  assert.match(sql, /net\.http_post/);
  assert.match(sql, /"a":"gifts"/);
  assert.match(sql, /exception when others/i, 'a failed call never blocks the energy shot itself');
  const fn = read('supabase/functions/n1-push/index.ts');
  assert.match(fn, /b\.a === "gifts"/);
  assert.match(fn, /pushed_at=is\.null&seen_at=is\.null/);
  assert.match(fn, /return=representation/, 'claim and read in one update');
  assert.match(fn, /!g\.to_online/, 'someone online in the galaxy saw it: no push');
  assert.match(fn, /await gifts\(\)/, 'cron also flushes, in case the trigger call was lost');
});

test('the companion never guilt-trips, plays dead or fades away, in any language', async () => {
  const { DW } = await import(pathToFileURL(path.join(ROOT, 'supabase/functions/n1-push/pillars.ts')).href);
  const bad = /fading|dying|dead|sad|cry|verblass|sterb|tot\b|traurig|wein|desvanec|muer|triste|llor/i;
  for (const l of ['en', 'de', 'es']) for (const t of Object.keys(DW[l])) for (const s of DW[l][t]) assert.doesNotMatch(s, bad, l + ' ' + t + ': ' + s);
});
