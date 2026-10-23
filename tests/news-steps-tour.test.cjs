const test = require('node:test'); const assert = require('node:assert'); const fs = require('fs'); const path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
test('Show me walks through every new thing (news.steps)', () => {
  const h = R('index.html'), v = JSON.parse(R('version.json'));
  assert.ok(h.includes('if (NEWS && Array.isArray(NEWS.steps) && NEWS.steps.length) return "steps";'));
  assert.ok(h.includes('begin({steps, i:0, kind:"news"})'));
  assert.ok(h.includes('(TOUR.kind === "tour" || TOUR.kind === "news") && toTab(s.tab)'));
  assert.ok(h.includes('if (newsGo() === "steps") offerTour(); else offerNews(); return; }'), "one gate: Show me card when there are steps");
  assert.ok(Array.isArray(v.news.steps) && v.news.steps.length >= 1);
  for (const s of v.news.steps) { assert.ok(['home', 'foryou', 'scan', 'shelf', 'move'].includes(s.tab)); for (const l of ['en', 'de', 'es']) assert.ok(s.text[l], l); }
});
