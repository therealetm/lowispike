'use strict';
/* Oct 21 (soft-ms, Eman's OK): the fasting milestones say what is typical, never what your body WILL do at a fixed hour. */
const {test} = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('no fasting milestone states a timed body effect as fact (EN / DE / ES)', () => {
  const old = ['Fat burning ramps up', 'Ketones start to rise', '"Liver takes over"', '"Blood sugar settles"', 'Begins around',
    'Fettverbrennung zieht an"', 'Ketone steigen"', 'Beginnt etwa', 'Se activa la quema de grasa', 'Empiezan a subir las cetonas',
    'Empieza unas', '"Ketosis"'];
  old.forEach(s => assert.ok(!html.includes(s), 'still in index.html: ' + s));
});

test('every timed milestone chip says it is typical or uncertain, and keeps its hour', () => {
  const block = html.slice(html.indexOf('const STAGES = [\n  {id:"rise"'), html.indexOf('const HEDGE'));
  const rows = [...block.matchAll(/\{id:"(\w+)", h:(\d+), n:"([^"]+)", t:"([^"]+)"/g)].map(m => ({id: m[1], h: +m[2], n: m[3], t: m[4]}));
  assert.deepEqual(rows.map(r => r.h), [0, 3, 8, 12, 14, 16]);
  rows.filter(r => r.h > 0).forEach(r => {
    assert.match(r.t, /most people|many people|some people|nobody knows/, r.id + ' chip: ' + r.t);
    assert.ok(r.t.includes(r.h + ' h'), r.id + ' keeps its hour');
    assert.match(r.n, /often|may|maybe/, r.id + ' name: ' + r.n);
  });
});
