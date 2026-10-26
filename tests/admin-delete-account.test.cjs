/* 26 Oct 2026: the admin's button on a person's card DELETES the account (Emmanuel, voice message with a screenshot of an "E"
   account he had removed: "I removed it, and it's still there. This should be deleting their accounts. Fix it.").
   Covers: the server deletes (Edge Function owner-delete-account -> SQL community_delete_account -> lowi_delete_account),
   the deleted person disappears from every list (tombstones in community_deleted, also from caches and after a reload),
   no false "deleted" message when the server did not confirm, and non-admins can't do it.
   The rolled-back run against the real database is tools/admin-delete/sql-test.sh (not part of npm test: it needs the
   Supabase login). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const C = require('../community-remove-core.js');
const E = '4364cf20-1ce4-4a90-8159-d0e84fcbbea7', OTHER = '22222222-2222-4222-8222-222222222222';

test('the button and the confirm say plainly that the account gets deleted for good, in English, German and Spanish', () => {
    for (const l of ['en', 'de', 'es']) for (const k of ['delFailed', 'delSelf']) assert.ok(C.TXT[l][k] && C.TXT[l][k].trim(), l + '.' + k);
    assert.match(C.TXT.en.btn, /Delete account/);
    assert.match(C.TXT.de.btn, /Konto löschen/);
    assert.match(C.TXT.es.btn, /Borrar cuenta/);
    assert.match(C.TXT.en.body, /deleted for good[\s\S]*can’t be undone/);
    assert.match(C.TXT.de.body, /endgültig gelöscht[\s\S]*nicht rückgängig/);
    assert.match(C.TXT.es.body, /para siempre[\s\S]*No se puede deshacer/);
    for (const l of ['en', 'de', 'es']) assert.doesNotMatch(C.TXT[l].body, /Nothing is deleted|Nichts wird gelöscht|No se borra nada/);
    assert.strictEqual(C.fill(C.TXT.en.done, 'E'), 'E’s account was deleted.');
});

test('"deleted" only when the server lists the id; every other answer is a failure with a reason', () => {
    assert.deepStrictEqual(C.deleteOutcome({ data: { deleted: [E.toUpperCase()], failed: [] } }, E), { ok: true, reason: '' });
    const no = (res, reason) => assert.deepStrictEqual(C.deleteOutcome(res, E), { ok: false, reason }, JSON.stringify(res));
    no({ data: { deleted: [], failed: [{ id: E, reason: 'db' }] } }, 'delFailed');
    no({ data: { deleted: [OTHER], failed: [] } }, 'delFailed');
    no({ data: { deleted: [], failed: [{ id: E, reason: 'not_admin' }] } }, 'notAdmin');
    no({ data: { deleted: [], failed: [{ id: E, reason: 'rate_limited' }] } }, 'rate');
    no({ data: { deleted: [], failed: [{ id: E, reason: 'target_is_admin' }] } }, 'delSelf');
    no({ error: { message: 'Edge Function returned a non-2xx status code', context: { status: 403 } } }, 'notAdmin');
    no({ error: { message: 'Edge Function returned a non-2xx status code', context: { status: 500 } } }, 'delFailed');
    no({ error: { message: 'Failed to fetch' } }, 'offline');
    no({ data: true }, 'delFailed');
    no({ data: 'ok' }, 'delFailed');
    no({}, 'delFailed');
    no(null, 'delFailed');
    assert.deepStrictEqual(C.deleteCall(E.toUpperCase()), { fn: 'owner-delete-account', body: { ids: [E], confirm: 'DELETE' } });
});

/* community-remove.js in a sandbox with a fake page and a fake Supabase client: press "Delete for good" on E's card */
function cardSandbox(answer) {
    const store = {}, calls = [], listeners = {};
    const el = (extra) => Object.assign({ hidden: false, disabled: false, textContent: '', classList: { add() { }, toggle() { }, contains() { return false; } } }, extra);
    const out = el(), yes = el(), conf = el({ querySelector: () => yes }), ask = el();
    const box = el({ getAttribute: k => ({ 'data-cr-id': E, 'data-cr-name': 'E' }[k]), querySelector: q => ({ '.cr-result': out, '[data-cr="yes"]': yes, '.cr-confirm': conf, '[data-cr="ask"]': ask }[q]) });
    box.classList = { list: [], add(c) { this.list.push(c); }, toggle() { }, contains(c) { return this.list.includes(c); } };
    const sb = {
        rpc: async (n) => { calls.push('rpc:' + n); return n === 'community_is_admin' ? { data: true } : { data: false }; },
        from: (t) => ({ select: () => ({ limit: async () => { calls.push('from:' + t); return { data: [] }; } }) }),
        functions: { invoke: async (fn, opts) => { calls.push('invoke:' + fn + ':' + JSON.stringify(opts.body)); return answer; } }
    };
    const doc = {
        documentElement: { classList: { toggle() { } } }, visibilityState: 'visible',
        addEventListener: (n, f) => { (listeners[n] = listeners[n] || []).push(f); },
        querySelectorAll: () => [], getElementById: () => null, createElement: () => el()
    };
    const ctx = {
        document: doc, navigator: { onLine: true }, console,
        localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
        LOWI_CLOUD_X: { state: () => ({ uid: '83077af7-8475-4628-9328-25bd335db240', live: true }), client: async () => sb },
        MutationObserver: function () { this.observe = () => { }; },
        setTimeout: (f) => 0, setInterval: () => 0, clearTimeout() { },
        addEventListener() { }, dispatchEvent() { }, CustomEvent: function (n) { this.type = n; }
    };
    ctx.window = ctx; ctx.self = ctx; ctx.globalThis = ctx;
    vm.createContext(ctx);
    vm.runInContext(R('bot-accounts.js'), ctx);
    vm.runInContext(R('hidden-accounts.js'), ctx);
    vm.runInContext(R('community-remove-core.js'), ctx);
    vm.runInContext(R('community-remove.js'), ctx);
    const pressYes = async () => {
        await ctx.LowiCommunityRemove.load(true);
        const btn = { getAttribute: () => 'yes', closest: q => (q === '[data-cr]' ? btn : q === '.cr-admin' ? box : null) };
        for (const f of listeners.click || []) f({ target: btn, preventDefault() { }, stopPropagation() { } });
        for (let i = 0; i < 20; i++) await new Promise(r => setImmediate(r));
    };
    return { ctx, calls, out, box, store, pressYes };
}

test('Delete for good calls the server delete and says "deleted" only after the server confirmed it', async () => {
    const s = cardSandbox({ data: { deleted: [E], failed: [], media_left: 0 } });
    await s.pressYes();
    assert.ok(s.calls.includes('invoke:owner-delete-account:' + JSON.stringify({ ids: [E], confirm: 'DELETE' })), s.calls.join(' | '));
    assert.ok(!s.calls.includes('rpc:community_remove'), 'no reversible hide any more');
    assert.strictEqual(s.out.textContent, 'E’s account was deleted.');
    assert.ok(s.ctx.LowiHiddenAccounts.isRemoved(E), 'gone from every list on this phone at once');
    assert.ok(JSON.parse(s.store['lowi.deletedIds.v1']).includes(E), 'remembered as deleted across a reload');
});

test('no false "deleted": a refused, failed or empty answer shows an error and keeps the person', async () => {
    for (const [answer, want] of [
        [{ data: { deleted: [], failed: [{ id: E, reason: 'db' }] } }, C.TXT.en.delFailed],
        [{ error: { message: 'Edge Function returned a non-2xx status code', context: { status: 403 } } }, C.TXT.en.notAdmin],
        [{ error: { message: 'Failed to fetch' } }, C.TXT.en.offline],
        [{ data: {} }, C.TXT.en.delFailed]]) {
        const s = cardSandbox(answer);
        await s.pressYes();
        assert.strictEqual(s.out.textContent, want, JSON.stringify(answer));
        assert.notStrictEqual(s.out.textContent, C.fill(C.TXT.en.done, 'E'));
        assert.ok(!s.box.classList.contains('cr-done'));
        assert.ok(!s.ctx.LowiHiddenAccounts.isRemoved(E), 'still listed, because it still exists');
    }
});

test('a deleted person disappears from every list for everyone, also when their kick row is gone and after a reload', () => {
    /* the kick row goes with the login (cascade), so the tombstone is what keeps cached copies hidden */
    const h = C.hiddenIds({ data: [] }, { data: [{ user_id: E }] }, [], []);
    assert.deepStrictEqual(h, { removed: [E], deleted: [E] });
    /* a failed read keeps what the phone knew; tombstones never shrink */
    assert.deepStrictEqual(C.hiddenIds({ error: { message: 'x' } }, { error: { message: 'x' } }, [OTHER], [E]), { removed: [OTHER, E], deleted: [E] });
    assert.deepStrictEqual(C.hiddenIds({ data: [{ user_id: OTHER }] }, { data: [] }, [], [E]).removed.sort(), [OTHER, E].sort());
    /* hidden-accounts.js hides them from Room, Chat, Ranking, For You, People and mentions, and the cache survives a reload */
    const store = {}, ctx = { localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } }, CustomEvent: function () { }, dispatchEvent() { } };
    ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx; vm.createContext(ctx);
    vm.runInContext(R('bot-accounts.js'), ctx); vm.runInContext(R('hidden-accounts.js'), ctx);
    ctx.LowiHiddenAccounts.setRemoved(h.removed);
    const people = [{ id: E, name: 'E' }, { id: OTHER, name: 'Luise' }];
    assert.deepStrictEqual(ctx.LowiHiddenAccounts.visible(people).map(p => p.name), ['Luise']);
    const ctx2 = { localStorage: ctx.localStorage, CustomEvent: function () { }, dispatchEvent() { } };
    ctx2.window = ctx2; ctx2.globalThis = ctx2; ctx2.self = ctx2; vm.createContext(ctx2);
    vm.runInContext(R('bot-accounts.js'), ctx2); vm.runInContext(R('hidden-accounts.js'), ctx2);
    assert.ok(ctx2.LowiHiddenAccounts.isRemoved(E), 'after a reload, before the network answers');
    /* the app reads the tombstones on every load */
    assert.match(R('community-remove.js'), /from\('community_deleted'\)\.select\('user_id'\)/);
});

test('the server: only an admin can delete, in one transaction, every row including energy and the Room spot', () => {
    const fn = R('supabase/functions/owner-delete-account/index.ts'), sql = R('supabase/proposals/admin_delete_account_20261026.sql');
    assert.match(fn, /from\("app_admins"\)/);
    assert.match(fn, /403, \{ error: "not_owner" \}/);
    assert.match(fn, /global: \{ headers: \{ Authorization: `Bearer \$\{jwt\}` \} \}/, 'the database call runs as the caller, so SQL checks the admin again');
    assert.match(fn, /asCaller\.rpc\("community_delete_account", \{ target: id \}\)/);
    assert.match(fn, /deleted\.push\(id\)/);
    assert.doesNotMatch(fn, /eyJ[A-Za-z0-9_-]{20,}|sb_secret_/, 'no key in the repo');
    assert.match(sql, /function public\.community_delete_account[\s\S]*community_remove_guard\(target\)[\s\S]*lowi_delete_account\(target\)/);
    assert.match(sql, /revoke all on function public\.lowi_delete_account\(uuid\) from public, anon, authenticated/);
    assert.match(sql, /revoke all on function public\.community_delete_account\(uuid\) from public, anon/);
    for (const t of ['companion_rest', 'energy_gifts', 'studio_passes', 'studio_pin_tries']) assert.match(sql, new RegExp(t), t + ' cleared');
    assert.match(sql, /create table if not exists public\.community_deleted/);
    assert.match(sql, /grant select on public\.community_deleted to authenticated/);
    assert.doesNotMatch(sql, /grant (insert|update|delete|all)[^;]*community_deleted/);
    assert.ok(fs.existsSync(path.join(__dirname, '..', 'tools/admin-delete/sql-test.sql')), 'the rolled-back server test exists');
});
