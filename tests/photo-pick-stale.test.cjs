// Oct 20, 2026, bug hunt run 21 (BH-021, pattern "async result painted into stale UI").
// Two photo pickers shrink the picked photo first (await) and then wrote it into whatever composer/flow was current by then:
// - For You "+ Post" composer (trPhotoIn): post sent meanwhile (C = null) -> TypeError "Cannot set properties of null (setting
//   'meal')" (reproduced on live 20261020-041521 with a private post); composer closed and reopened -> the new composer was touched
//   and repainted by the old pick.
// - Food flow snap (f2File): flow closed and reopened meanwhile -> the old snap dropped into the new flow.
// Now each photo only goes to the composer/flow it was picked for.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function fnSrc(s, sig) {
  const i = s.indexOf(sig); assert.ok(i >= 0, 'missing ' + sig);
  let d = 0; const j = s.indexOf('{', i);
  for (let k = j; k < s.length; k++) { if (s[k] === '{') d++; else if (s[k] === '}') { d--; if (!d) return s.slice(i, k + 1); } }
  throw new Error('unclosed ' + sig);
}
const tick = () => new Promise(r => setImmediate(r));

function composerRig() {
  const waits = [], paints = [], errors = [];
  const ctx = { C: null, res: {}, console: { error: e => errors.push(e) },
    paintRest: () => { paints.push(ctx.C && ctx.C.photo); if (!ctx.C) throw new TypeError("Cannot read properties of null (reading 'loading')"); } };
  const h = { resizeImage: (x, max) => new Promise(r => waits.push({ x, max, go: v => r(v) })) };
  vm.createContext(ctx);
  vm.runInContext(fnSrc(src, 'async function trPhotoPick(x, h)') + '\nres.pick = trPhotoPick;', ctx);
  return { ctx, h, waits, paints, errors, pick: x => ctx.res.pick(x, h) };
}

function flowRig() {
  const waits = [], steps = [];
  const ctx = { F: { on: false }, res: {}, console: { error: () => {} },
    resizeImage: (f, max) => new Promise(r => waits.push({ f, max, go: v => r(v) })),
    stepPhoto: scan => steps.push({ photo: ctx.F.photo, scan }) };
  vm.createContext(ctx);
  vm.runInContext(fnSrc(src, 'async function f2Pick(f)') + '\nres.pick = f2Pick;', ctx);
  return { ctx, waits, steps, pick: f => ctx.res.pick(f) };
}

test('composer: a picked photo still lands in the same open composer (normal case)', async () => {
  const g = composerRig(); const c = { photo: '', meal: { n: 'x' }, mealErr: 'e' }; g.ctx.C = c;
  const p = g.pick({ name: 'a.jpg' }); g.waits[0].go('data:a'); await p; await tick();
  assert.strictEqual(c.photo, 'data:a'); assert.strictEqual(c.meal, null); assert.strictEqual(c.mealErr, '');
  assert.deepStrictEqual(g.paints, ['data:a']);
});

test('composer: post sent while the photo is shrinking -> no TypeError, nothing painted', async () => {
  const g = composerRig(); g.ctx.C = { photo: '' };
  const p = g.pick({ name: 'a.jpg' }); g.ctx.C = null;
  g.waits[0].go('data:a');
  await assert.doesNotReject(p); await tick();
  assert.deepStrictEqual(g.paints, []);
});

test('composer: closed and reopened while shrinking -> the new post stays empty and is not repainted', async () => {
  const g = composerRig(); const old = { photo: '' }; g.ctx.C = old;
  const p = g.pick({ name: 'a.jpg' }); const fresh = { photo: '' }; g.ctx.C = fresh;
  g.waits[0].go('data:a'); await p; await tick();
  assert.strictEqual(fresh.photo, '', 'old photo leaked into the new composer');
  assert.deepStrictEqual(g.paints, []);
});

test('food flow: a snap still opens the photo step of the same flow (normal case)', async () => {
  const g = flowRig(); g.ctx.F = { on: true, photo: '', text: 'x', err: 'y' };
  const p = g.pick({ name: 'm.jpg' }); g.waits[0].go('data:m'); await p; await tick();
  assert.deepStrictEqual(g.steps, [{ photo: 'data:m', scan: true }]);
  assert.strictEqual(g.ctx.F.text, ''); assert.strictEqual(g.ctx.F.err, '');
});

test('food flow: closed and reopened while shrinking -> the new flow does not get the old snap', async () => {
  const g = flowRig(); g.ctx.F = { on: true, photo: '' };
  const p = g.pick({ name: 'm.jpg' }); const fresh = { on: true, photo: '', text: '', err: '' }; g.ctx.F = fresh;
  g.waits[0].go('data:m'); await p; await tick();
  assert.strictEqual(fresh.photo, '', 'old snap leaked into the new flow');
  assert.deepStrictEqual(g.steps, []);
});

test('food flow: closed while shrinking -> nothing opens', async () => {
  const g = flowRig(); const f = { on: true, photo: '' }; g.ctx.F = f;
  const p = g.pick({ name: 'm.jpg' }); f.on = false;
  g.waits[0].go('data:m'); await p; await tick();
  assert.deepStrictEqual(g.steps, []);
});
