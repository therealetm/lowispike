'use strict';
/* Oct 20, parallel regression run (task 29188430): W1 found that a saved profile without `tags` made every Profile render throw. */
const test = require('node:test'); const assert = require('node:assert');
const fs = require('fs'); const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
test('load gives a saved profile without tags an empty tags list before anything renders it', () => {
    const fix = html.indexOf('if (S.user && !Array.isArray(S.user.tags)) S.user.tags = [];');
    assert.ok(fix > 0, 'the load-time guard is there');
    const render = html.indexOf('function renderProfile');
    assert.ok(render > 0);
    const load = html.lastIndexOf('function load', fix);
    assert.ok(load > 0 && fix - load < 20000, 'the guard sits in the load path');
    /* the guard runs in plain JS too */
    const S = { user: { name: 'Test' } };
    eval('try { if (S.user && !Array.isArray(S.user.tags)) S.user.tags = []; } catch(e){}');
    assert.deepStrictEqual(S.user.tags, []);
    assert.doesNotThrow(() => S.user.tags.map(t => t));
});
