'use strict';
// Owner tools (Oct 18, 2026): only the owner can kick / delete, kick is reversible, nothing secret ships.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const C = require('../owner-admin-core.js');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

const OWNER = '83077af7-8475-4628-9328-25bd335db240';
const EMMA1 = '11111111-1111-4111-8111-111111111111';
const EMMA2 = '22222222-2222-4222-8222-222222222222';
const JOSEPH = '33333333-3333-4333-8333-333333333333';

test('owner flag comes only from an explicit true from the server', () => {
    assert.equal(C.ownerFromRpc({ data: true, error: null }), true);
    for (const r of [null, {}, { data: false }, { data: 'true' }, { data: 1 }, { data: true, error: { code: 'PGRST202' } }, { error: { code: '42501' } }])
        assert.equal(C.ownerFromRpc(r), false, JSON.stringify(r));
});

test('non-owner is refused, owner allowed, never on himself, another owner or a bot', () => {
    assert.deepEqual(C.canAct(false, JOSEPH, { id: EMMA1 }), { ok: false, reason: 'not-owner' });
    assert.deepEqual(C.canAct(true, OWNER, { id: EMMA1 }), { ok: true, reason: '' });
    assert.equal(C.canAct(true, OWNER, { id: OWNER }).reason, 'self');
    assert.equal(C.canAct(true, OWNER, { id: JOSEPH, isOwner: true }).reason, 'owner');
    assert.equal(C.canAct(true, OWNER, { id: EMMA1, bot: true }).reason, 'bot');
    assert.equal(C.canAct(true, OWNER, { id: 'Mateo' }).reason, 'no-account');
});

test('kick, undo and let back in keep a consistent state', () => {
    const st = C.kickState([]);
    assert.deepEqual(C.applyKick(st, [EMMA1, EMMA2, EMMA1, 'nope']), [EMMA1, EMMA2]);
    assert.ok(C.isKicked(st, EMMA1) && C.isKicked(st, EMMA2));
    assert.deepEqual(C.applyKick(st, [EMMA1]), [], 'kicking twice changes nothing');
    const last = st.history[st.history.length - 1];
    assert.deepEqual(C.undoCall(last), { rpc: 'admin_unkick', ids: [EMMA1, EMMA2] });
    assert.equal(C.undo(st).type, 'kick');
    assert.equal(st.kicked.size, 0, 'undo lets them back in');
    assert.equal(C.undo(st), null);
    C.applyKick(st, [EMMA1]);
    assert.deepEqual(C.applyUnkick(st, [EMMA1, JOSEPH]), [EMMA1]);
    assert.equal(C.isKicked(st, EMMA1), false);
    assert.deepEqual(C.undoCall(st.history[st.history.length - 1]), { rpc: 'admin_kick', ids: [EMMA1] });
    C.undo(st);
    assert.equal(C.isKicked(st, EMMA1), true, 'undoing a let-back-in kicks again');
    C.setKicked(st, [JOSEPH]);
    assert.deepEqual([...st.kicked], [JOSEPH]);
});

test('kicked members disappear from people lists, others stay', () => {
    const ppl = [{ n: 'Emma', uid: EMMA1 }, { n: 'Joseph', uid: JOSEPH }, { n: 'Mateo', bot: true }];
    assert.equal(C.filterPeople(ppl, new Set()), ppl, 'no kicks: same list, no copy');
    assert.deepEqual(C.filterPeople(ppl, new Set([EMMA1])).map(p => p.n), ['Joseph', 'Mateo']);
});

test('member list groups by name, flags test accounts, never offers the owner himself', () => {
    const rows = [
        { id: EMMA1, name: 'Emma', created_at: '2026-10-10T10:00:00Z' }, { id: EMMA2, name: 'emma ', kicked: true },
        { id: OWNER, name: 'eman', is_owner: true }, { id: JOSEPH, name: 'Joseph Castellar' }];
    const g = C.groupMembers(rows, new Set([EMMA1, EMMA2]));
    assert.equal(g[0].name, 'Emma'); assert.equal(g[0].count, 2); assert.equal(g[0].onTestList, true); assert.equal(g[0].kicked, 1);
    const eman = g.find(x => x.key === 'eman');
    assert.equal(eman.owner, true);
    assert.deepEqual(C.actionable(rows, eman.ids, OWNER), []);
    assert.deepEqual(C.actionable(rows, [OWNER, EMMA1, 'x'], JOSEPH), [EMMA1]);
    assert.deepEqual(C.batches([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
});

test('delete needs the typed word, and errors degrade instead of breaking', () => {
    assert.equal(C.confirmOk('delete '), true);
    assert.equal(C.confirmOk('DEL'), false);
    assert.equal(C.classify({ code: 'PGRST202', message: 'Could not find the function public.is_app_owner' }), 'missing');
    assert.equal(C.classify({ code: '42501' }), 'not-owner');
    assert.equal(C.classify({ message: 'x', context: { status: 404 } }), 'missing');
    assert.equal(C.classify({ message: 'not_owner', context: { status: 403 } }), 'not-owner');
    assert.equal(C.classify({ message: 'Failed to send a request to the Edge Function' }), 'offline');
});

test('server SQL: every owner function checks auth.uid() against app_admins and is closed to anon', () => {
    const sql = read('supabase/proposals/owner_admin_20261018.sql');
    for (const fn of ['is_app_owner', 'admin_kick', 'admin_unkick', 'admin_members']) {
        const body = sql.split('create or replace function public.' + fn)[1].split('$$;')[0];
        assert.match(body, /security definer set search_path = ''/, fn + ' pins search_path');
        assert.match(body, /app_admins/, fn + ' checks the owner table');
        assert.match(body, /auth\.uid\(\)/, fn + ' checks the caller');
        assert.match(sql, new RegExp('revoke execute on function public\\.' + fn + '\\([^)]*\\)\\s+from public, anon'), fn + ' revoked from anon');
    }
    assert.match(sql, /alter table public\.app_admins enable row level security;\s*revoke all on public\.app_admins from anon, authenticated;/);
    assert.doesNotMatch(sql, /create policy[^;]*on public\.app_admins/i, 'nobody may read the owner table through the API');
    assert.doesNotMatch(sql, /grant (insert|update|delete)[^;]*community_kicks/i, 'kicks are only written by the owner functions');
    assert.match(sql, /raise exception 'Account % is not the "eman" profile/);
});

test('delete function: owner-only, typed confirm, never self or another owner; no secret in the app', () => {
    const fn = read('supabase/functions/owner-delete-account/index.ts');
    assert.match(fn, /auth\.getUser\(jwt\)/);
    assert.match(fn, /from\("app_admins"\)/);
    assert.match(fn, /if \(!ownerIds\.has\(me\.id\)\) return out\(req, 403/);
    assert.match(fn, /body\.confirm !== "DELETE"/);
    assert.match(fn, /id === me\.id/);
    /* 26 Oct 2026: the delete is one database transaction (community_delete_account -> lowi_delete_account) run as the caller,
       instead of row-by-row deletes and auth.admin.deleteUser (which left half-deleted accounts); see admin-delete-account.test.cjs */
    assert.match(fn, /asCaller\.rpc\("community_delete_account", \{ target: id \}\)/);
    assert.match(fn, /Deno\.env\.get\("SUPABASE_SERVICE_ROLE_KEY"\)/);
    for (const f of ['owner-admin.js', 'owner-admin-core.js', 'index.html']) {
        const s = read(f);
        assert.doesNotMatch(s, /service_role|SERVICE_ROLE/i, f + ' has no service role key');
    }
    const ui = read('owner-admin.js');
    assert.match(ui, /sb\.rpc\('is_app_owner'\)/, 'owner UI asks the server');
    assert.match(ui, /if \(!ST\.owner\) return;/, 'owner actions do nothing for others');
    assert.match(read('index.html'), /<script src="owner-admin-core\.js\?v=[^"]+"><\/script>\n<script src="owner-admin\.js\?v=/);
});
