'use strict';
/* Nov 5 2026 (Emmanuel, in his Feedback inbox: "I can't delete it. I should be able to delete it so it's deleted completely. It
   doesn't ... fill up memory or space or storage ... After I've listened to something and done it ... there should be a simple delete
   or delete all"). The inbox gets Delete on every entry and Delete (n) for the selection (Select all + Delete = delete all), two taps
   each. feedback-core.js removeAll deletes the files (voice notes, screenshots in the private bucket) first and then the rows, so no
   file is left that nobody can reach; when the server keeps something (no delete right), nothing is reported as gone.
   The server rights are in supabase/proposals/feedback_20261105.sql (owner-only delete on the table and the bucket). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const C = require('../feedback-core.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

const ROW = (id, key, o) => Object.assign({ id, status: 'done', voice_path: 'fb/' + key + '/voice.m4a', shots: ['fb/' + key + '/shot-1.jpg', 'fb/' + key + '/shot-2.jpg'] }, o || {});

/* a fake Supabase client: records every call in order; answers are set per test */
function fakeSb(o) {
    o = o || {};
    const log = [];
    const sb = {
        log,
        storage: { from: b => ({ remove: async paths => { log.push(['remove', b, paths.slice()]); if (o.fileErr) return { data: null, error: o.fileErr }; return { data: (o.filesGone === false ? [] : paths.map(name => ({ name }))), error: null }; } }) },
        from: t => ({
            delete: () => ({
                in: (col, ids) => ({
                    select: async cols => { log.push(['delete', t, col, ids.slice(), cols]); if (o.rowErr) return { data: null, error: o.rowErr }; return { data: o.rowsKept ? [] : ids.map(id => ({ id })), error: null }; }
                })
            })
        })
    };
    return sb;
}

test('filesOf: each voice note and screenshot once, only names the server itself accepts', () => {
    const rows = [ROW('a', 'k1abcdef'), ROW('b', 'k2abcdef', { shots: ['fb/k2abcdef/shot-1.jpg', 'fb/k2abcdef/shot-1.jpg'] }), { id: 'c', message: 'text only', shots: [] }, null,
        { id: 'd', voice_path: '../../etc/passwd', shots: ['fb/k3abcdef/shot-1.png', 7, 'avatars/x.jpg'] }];
    assert.deepEqual(C.filesOf(rows), ['fb/k1abcdef/voice.m4a', 'fb/k1abcdef/shot-1.jpg', 'fb/k1abcdef/shot-2.jpg', 'fb/k2abcdef/voice.m4a', 'fb/k2abcdef/shot-1.jpg']);
    assert.deepEqual(C.filesOf([]), []);
});

test('delete: the files go first, then the rows; both counted from what the server really removed', async () => {
    const sb = fakeSb(), rows = [ROW('a', 'k1abcdef'), ROW('b', 'k2abcdef')];
    const r = await C.removeAll(sb, rows, new Set(C.filesOf(rows)));
    assert.deepEqual(r, { ok: true, rows: 2, files: 6, ids: ['a', 'b'] });
    assert.equal(sb.log[0][0], 'remove', 'files first');
    assert.equal(sb.log[0][1], 'feedback', 'the private feedback bucket');
    assert.deepEqual(sb.log[1], ['delete', 'app_feedback', 'id', ['a', 'b'], 'id'], 'then the rows, returning what was deleted');
});

test('delete all: many entries go in batches of 100 files, then one row delete', async () => {
    const rows = Array.from({ length: 60 }, (_, i) => ROW('id' + i, 'key' + String(i).padStart(5, '0')));
    const sb = fakeSb(), r = await C.removeAll(sb, rows, new Set());
    assert.equal(r.ok, true); assert.equal(r.rows, 60); assert.equal(r.files, 180);
    assert.deepEqual(sb.log.filter(x => x[0] === 'remove').map(x => x[2].length), [100, 80]);
    assert.equal(sb.log.filter(x => x[0] === 'delete').length, 1);
});

test('a file error stops it: no row is deleted, so nothing points at files that are half gone', async () => {
    const sb = fakeSb({ fileErr: { message: 'Failed to fetch' } });
    const r = await C.removeAll(sb, [ROW('a', 'k1abcdef')], new Set());
    assert.equal(r.ok, false); assert.equal(r.why, 'offline'); assert.equal(r.stage, 'files');
    assert.ok(!sb.log.some(x => x[0] === 'delete'));
});

test('no delete right on the files (they exist, none removed): nothing is deleted and the owner is told why', async () => {
    const rows = [ROW('a', 'k1abcdef')], sb = fakeSb({ filesGone: false });
    const r = await C.removeAll(sb, rows, new Set(C.filesOf(rows)));
    assert.equal(r.ok, false); assert.equal(r.why, 'denied');
    assert.ok(!sb.log.some(x => x[0] === 'delete'), 'the rows stay, so the files are not orphaned');
});

test('files that were already gone (no signed link) do not block deleting the row', async () => {
    const sb = fakeSb({ filesGone: false }), r = await C.removeAll(sb, [ROW('a', 'k1abcdef')], new Set());
    assert.equal(r.ok, true); assert.equal(r.rows, 1); assert.equal(r.files, 0);
});

test('a row the server keeps (no delete right) is not reported as gone; a row error is classified', async () => {
    let r = await C.removeAll(fakeSb({ rowsKept: true }), [ROW('a', 'k1abcdef')], new Set());
    assert.equal(r.ok, false); assert.equal(r.why, 'denied'); assert.deepEqual(r.ids, []);
    r = await C.removeAll(fakeSb({ rowErr: { code: '42501', message: 'permission denied' } }), [ROW('a', 'k1abcdef')], new Set());
    assert.equal(r.ok, false); assert.equal(r.why, 'denied'); assert.equal(r.stage, 'rows');
});

test('text-only feedback: no file call at all; no client: offline; nothing selected: nothing happens', async () => {
    const sb = fakeSb();
    let r = await C.removeAll(sb, [{ id: 't', message: 'hi', shots: [] }], new Set());
    assert.equal(r.ok, true); assert.ok(!sb.log.some(x => x[0] === 'remove'));
    r = await C.removeAll(null, [ROW('a', 'k1abcdef')]); assert.equal(r.why, 'offline');
    r = await C.removeAll(sb, []); assert.deepEqual(r, { ok: true, rows: 0, files: 0, ids: [] });
});

test('inbox: Delete on every entry and Delete (n) for the selection, two taps, only what the server deleted leaves the list', () => {
    const ui = read('feedback.js');
    assert.match(ui, /class="fbk-chip fbk-del" data-fbk="delsel"' \+ \(n && !I\.busy \? '' : ' disabled'\) \+ '>' \+ esc\(t\.del\(n\)\)/, 'bulk button, disabled without a selection');
    assert.match(ui, /class="fbk-chip sm fbk-del" data-fbk="del1" data-id="' \+ esc\(r\.id\)/, 'one per entry');
    assert.match(ui, /if \(!b\.classList\.contains\('armed'\)\) \{ armDel\(b\); return; \}/, 'the first tap only arms it');
    assert.match(ui, /res = await C\.removeAll\(sb, rows, I\.urls\)/);
    assert.match(ui, /const gone = new Set\(res\.ids \|\| \[\]\);/);
    for (const k of ['del:', 'del1:', 'delSure:', 'delBusy:', 'deleted:', 'delDenied:', 'delFail:']) assert.equal((ui.match(new RegExp('\\n\\s+' + k + '|, ' + k, 'g')) || []).length, 3, k + ' in EN, DE and ES');
    assert.match(read('feedback.css'), /\.fbk-chip\.fbk-del\.armed \{/);
});

test('server: the owner may delete feedback rows and their files (and nobody else)', () => {
    const s = read('supabase/proposals/feedback_20261105.sql');
    assert.match(s, /create policy "owner deletes feedback" on public\.app_feedback for delete to authenticated using \(public\.is_app_owner\(\)\);/);
    assert.match(s, /grant select, delete on public\.app_feedback to authenticated;/);
    assert.match(s, /create policy "feedback owner delete" on storage\.objects for delete to authenticated\s*using \(bucket_id = 'feedback' and public\.is_app_owner\(\)\);/);
});
