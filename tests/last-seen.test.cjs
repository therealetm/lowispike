// 23 Nov 2026 (Emmanuel): the People list shows when everyone was last online.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const js = R('last-seen.js');
test('the app marks you as seen while it is open (at most every 3 min, server every 2 min) and reads id + last_seen only', () => {
  assert.match(js, /c\.rpc\('touch_seen'\)/); assert.match(js, /Date\.now\(\) - lastTouch < 180e3/); assert.match(js, /select\('id,last_seen'\)/);
  const sql = R('supabase/proposals/last_seen_20261123.sql');
  assert.match(sql, /where id = auth\.uid\(\) and \(last_seen is null or last_seen < now\(\) - interval '2 minutes'\)/); assert.match(sql, /revoke all on function public\.touch_seen\(\) from public, anon/);
});
test('short labels in three languages', () => {
  const W = {}, D = { addEventListener() {}, visibilityState: 'hidden' }; const st = global.setInterval, so = global.setTimeout; global.setInterval = () => 0; global.setTimeout = () => 0;
  try { new Function('window', 'document', js.replace(/\(typeof window[^;]*\);\s*$/, '(window, document);'))(W, D); } finally { global.setInterval = st; global.setTimeout = so; }
  const L = W.LowiLastSeen, now = Date.now();
  assert.equal(L.label(now - 60e3, 'en'), 'Online now'); assert.equal(L.label(now - 20 * 60e3, 'en'), '20 min ago'); assert.equal(L.label(now - 3 * 3600e3, 'de'), 'vor 3 Std.');
  assert.equal(L.label(now - 30 * 3600e3, 'es'), 'Ayer'); assert.equal(L.label(now - 4 * 86400e3, 'en'), '4 days ago'); assert.equal(L.label(0, 'en'), '');
});
test('the People rows show it under the name and the file is loaded and cached', () => {
  const pd = R('people-directory.js'); assert.match(pd, /<small class="pd-seen">/); assert.match(pd, /D\.addEventListener\('lowi:lastseen', paint\)/);
  assert.match(R('index.html'), /<script src="last-seen\.js\?v=/); assert.match(R('sw.js'), /STATIC\.push\("last-seen\.js"\)/);
});
