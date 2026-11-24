// 23 Nov 2026 (Emmanuel): the People list shows when everyone was last online.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const js = R('last-seen.js');
test('the app marks you as seen while it is open (at most every 3 min, server every 2 min) and reads id + last_seen only', () => {
  assert.match(js, /c\.rpc\('touch_seen'\)/); assert.match(js, /Date\.now\(\) - lastTouch < 180e3/); assert.match(js, /select\('id,last_seen'\)/, 'fallback'); assert.match(js, /c\.rpc\('people_seen'\)/);
  const sql = R('supabase/proposals/last_seen_20261123.sql');
  assert.match(sql, /where id = auth\.uid\(\) and \(last_seen is null or last_seen < now\(\) - interval '2 minutes'\)/); assert.match(sql, /revoke all on function public\.touch_seen\(\) from public, anon/);
});
/* changed 23 Nov 2026 (Emmanuel: "It's just showing me the date. I need to see the exact time"): the clock time is always shown */
test('short labels with the clock time, three languages', () => {
  const W = {}, D = { addEventListener() {}, visibilityState: 'hidden' }; const st = global.setInterval, so = global.setTimeout; global.setInterval = () => 0; global.setTimeout = () => 0;
  try { new Function('window', 'document', js.replace(/\(typeof window[^;]*\);\s*$/, '(window, document);'))(W, D); } finally { global.setInterval = st; global.setTimeout = so; }
  const L = W.LowiLastSeen, now = Date.now();
  assert.equal(L.label(now - 60e3, 'en'), 'Online now'); assert.equal(L.label(now - 20 * 60e3, 'en'), '20 min ago');
  const hm = ms => new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const d0 = new Date(); d0.setHours(0, 0, 0, 0); const today = Math.max(d0.getTime() + 60e3, now - 3 * 3600e3);
  if (now - today >= 3600e3) assert.equal(L.label(today, 'en'), 'Today, ' + hm(today));
  const yest = d0.getTime() - 3600e3; assert.equal(L.label(yest, 'en'), 'Yesterday, ' + hm(yest)); assert.match(L.label(yest, 'es'), /^Ayer, \d\d:\d\d$/); assert.match(L.label(yest, 'de'), /^Gestern, \d\d:\d\d$/);
  assert.match(L.label(now - 10 * 86400e3, 'en'), /^\d{1,2} [A-Z][a-z]{2}, \d\d:\d\d$/); assert.match(L.label(now - 4 * 86400e3, 'en'), /, \d\d:\d\d$/); assert.equal(L.label(0, 'en'), '');
});
test('the People rows show it under the name and the file is loaded and cached', () => {
  const pd = R('people-directory.js'); assert.match(pd, /<small class="pd-seen">/); assert.match(pd, /D\.addEventListener\('lowi:lastseen', paint\)/);
  assert.match(R('index.html'), /<script src="last-seen\.js\?v=/); assert.match(R('sw.js'), /STATIC\.push\("last-seen\.js"\)/);
});
test('people_seen takes every trace an open app leaves, the billiard room included (23 Nov 2026)', () => {
  const q = R('supabase/proposals/people_seen_20261123.sql');
  for (const t of ['auth.sessions', 'public.user_state', 'public.messages', 'public.reactions', 'public.posts', 'public.post_likes', 'public.companion_rest b where b.moved_by', 'p.last_seen']) assert.ok(q.includes(t), t);
  assert.match(q, /revoke all on function public\.people_seen\(\) from public, anon;/);
});
/* 24 Nov 2026 (Emmanuel: "the most recent people are always on the top ... organized by the time. Last seen") */
test('People: everyone else is sorted by last seen, newest first; no time goes last (by name)', () => {
  const pd = require('fs').readFileSync(require('path').join(__dirname, '..', 'people-directory.js'), 'utf8');
  assert.match(pd, /rest\.sort\(\(a, b\) => ls\(b\.uid\) - ls\(a\.uid\)\);/);
  const t = { a: 5, b: 0, c: 9 }, rest = [{ uid: 'a' }, { uid: 'b' }, { uid: 'c' }]; const ls = u => t[u];
  rest.sort((a, b) => ls(b.uid) - ls(a.uid)); assert.deepStrictEqual(rest.map(r => r.uid), ['c', 'a', 'b']);
});
/* 24 Nov 2026, night (Emmanuel: "Why are they all not in the same format ... the ones that have none of them should have some"): 1318
   profiles, the server sends at most 1000 rows a request, so people after row 1000 had no time; and older days mixed "Fri 20 Nov" with "16 Nov" */
test('last seen is read page by page (all people get a time) and every older day has one format, no weekday', () => {
  const ls = require('fs').readFileSync(require('path').join(__dirname, '..', 'last-seen.js'), 'utf8');
  assert.match(ls, /r = await c\.rpc\('people_seen'\)\.range\(from, from \+ 999\);/); assert.match(ls, /if \(r\.data\.length < 1000\) break;/);
  assert.doesNotMatch(ls.replace(/\/\*[\s\S]*?\*\//g, ''), /weekday/);
  assert.match(require('fs').readFileSync(require('path').join(__dirname, '..', 'supabase/proposals/people_seen_20261123.sql'), 'utf8'), /order by 2 desc nulls last, 1;/);
  const W = { }, D = { addEventListener() {}, visibilityState: 'hidden' }; const vm = require('vm'), ctx = { window: W, document: D, setInterval() {}, setTimeout() {}, Date, CustomEvent: function () {} };
  vm.createContext(ctx); vm.runInContext(ls, ctx); const L = W.LowiLastSeen;
  const d1 = new Date(); d1.setDate(d1.getDate() - 3); d1.setHours(7, 16, 0, 0); const d2 = new Date(); d2.setDate(d2.getDate() - 9); d2.setHours(15, 21, 0, 0);
  const a = L.label(d1.getTime(), 'en'), b = L.label(d2.getTime(), 'en'); assert.match(a, /^\d{1,2} [A-Z][a-z]{2}(?: \d{4})?, 07:16$/, a); assert.match(b, /^\d{1,2} [A-Z][a-z]{2}(?: \d{4})?, 15:21$/, b);
});
