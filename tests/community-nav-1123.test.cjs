// 23 Nov 2026 (Emmanuel): top bar = Chat + For You; Ranking in Circle's game bar; For You bubbles = Post, Feed, Create, Circle.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
test('the Community top bar shows Chat and For You only', () => { assert.match(R('community-rooms-ui.js'), /tabOrder\(\)\.filter\(k=>k==='chat'\|\|k==='fy'\)/); });
test('Ranking sits in the Circle game bar and opens the ranking view', () => { const js = R('circle-games.js'); assert.match(js, /\{ id: 'rank', ic: '\\uD83E\\uDD47', t: \(\) => L\('Ranking', 'Ranking', 'Ranking'\), rank: true \}/); assert.match(js, /if \(g\.rank\) \{[^}]*LowiRoomsUI\.showView\('rank'\)/); });
test('For You bubbles: Post, Feed, Create, Circle (Circle opens the Circle room)', () => { const h = R('index.html'); assert.match(h, /en: \["Post", "Saved", "Create", "Affiliate", "Feed", "Circle"\]/); assert.match(h, /it\('b data-fy-circle="1"'/); assert.match(h, /LowiRoomsUI\.setTab\(false\)/); });
test('Ranking keeps the Circle game bar on top, and a game tap leaves Ranking (23 Nov 2026)', () => {
  const js = R('circle-games.js'); assert.match(js, /function rankOn\(\)/); assert.match(js, /const rank = rankOn\(\), circle = circleOn\(\) \|\| rank/); assert.match(js, /if \(rankOn\(\)\) W\.LowiRoomsUI\.setTab\(false\)/);
  assert.match(R('circle-games.css'), /\[data-rm-view="rank"\]>#cspBar\{display:grid!important\}/);
});
test('the Weekly Challenge starts the day you join; a waiting week can start today (23 Nov 2026)', () => {
  const js = R('challenge-week.js'); assert.match(js, /function startFor\(now\) \{ return midnight\(now \|\| new Date\(\)\); \}/); assert.match(js, /data-cwk="now"/); assert.match(js, /u\.daysS\[\(new Date\(ph\.start\.getTime\(\) \+ i \* DAY\)\.getDay\(\) \+ 6\) % 7\]/);
});
