// Food engine benchmark metrics + spec section 14 acceptance (queue step scanfe-i).
// tools/food-bench/metrics.cjs runs every verified benchmark row through the live engine and the app adapter; these
// tests keep the numbers at zero so a fixed classification error can't come back. Expectations are provisional
// (benchmark expertReviewed false): spec section 8 agreement, not expert-reviewed or measured outcomes.
const test = require('node:test');
const assert = require('assert');
const path = require('path');
const {run} = require(path.join(__dirname, '..', 'tools/food-bench/metrics.cjs'));

const out = run();
const M = out.metrics;

test('benchmark metrics: no false approvals, no nutrition math errors, no missed ingredient flags, no overconfident claims', () => {
    assert.ok(out.benchmark.rows >= 15);
    assert.deepStrictEqual(M.falseApprovals, []);
    assert.deepStrictEqual(M.mathErrors, []);
    assert.deepStrictEqual(M.missedFlags, []);
    assert.deepStrictEqual(M.unknownFlags, []);
    assert.deepStrictEqual(M.overconfident, []);
});

test('benchmark metrics: no false rejections, every row inside its expected policy, exposure and confidence', () => {
    assert.deepStrictEqual(M.falseRejections, []);
    assert.strictEqual(M.policyMatch, out.benchmark.rows);
    assert.strictEqual(M.exposureMatch, out.benchmark.rows);
    assert.strictEqual(M.confidenceMatch, out.benchmark.rows);
});

test('benchmark metrics: protein and fat never cancel carbs; every verdict explained; every non-JA has an alternative', () => {
    assert.deepStrictEqual(M.cancelErrors, []);
    assert.deepStrictEqual(M.reasonMisses, []);
    assert.deepStrictEqual(M.noAlternative, []);
});

test('the app path never reads more lenient than the engine, stale stored ok rows of NEIN products are re-rated', () => {
    assert.deepStrictEqual(M.appLenient, []);
    assert.deepStrictEqual(M.appOkOnNein, []);
    assert.deepStrictEqual(M.staleOkOnNein, []);
});

test('spec section 14: every acceptance criterion passes on the benchmark', () => {
    assert.strictEqual(out.acceptance.length, 11);
    const failed = out.acceptance.filter(a => !a.pass).map(a => a.text + ' (' + a.note + ')');
    assert.deepStrictEqual(failed, []);
});
