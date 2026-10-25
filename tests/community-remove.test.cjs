/* 25 Oct 2026: the admin's "Remove from community" (Emmanuel: "Can you give me the option as an admin to just kick people
   out of the community? I can still see names that I don't even know who they are. [...] A simple remove would be nice.").
   Rules: community-remove-core.js. UI: community-remove.js. Server: supabase/proposals/community_remove_20261025.sql
   (checked against a real Postgres by tools/community-remove/test-sql.sh). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const C = require('../community-remove-core.js');
const A = '22222222-2222-4222-8222-222222222222', OWNER = '83077af7-8475-4628-9328-25bd335db240';

test('every label exists in German, English and Spanish, with the person\'s name where it belongs', () => {
    const keys = Object.keys(C.TXT.en);
    for (const l of ['en', 'de', 'es']) for (const k of keys) assert.ok(C.TXT[l][k] && C.TXT[l][k].trim(), l + '.' + k);
    assert.strictEqual(C.TXT.en.btn, 'Remove from community');
    assert.strictEqual(C.TXT.de.btn, 'Aus der Community entfernen');
    assert.strictEqual(C.TXT.es.btn, 'Quitar de la comunidad');
    for (const l of ['en', 'de', 'es']) for (const k of ['title', 'body', 'done', 'restored']) assert.ok(C.TXT[l][k].includes('{n}'), l + '.' + k + ' names the person');
    assert.strictEqual(C.fill(C.TXT.en.title, 'Emmanuel'), 'Remove Emmanuel?');
    assert.strictEqual(C.fill(C.TXT.de.title, ' '), 'Member entfernen?', 'no name: a neutral word, never an empty gap');
    assert.strictEqual(C.text('fr'), C.TXT.en);
    assert.match(C.TXT.en.body, /Nothing is deleted/, 'the confirm says it can be undone');
    assert.match(C.TXT.de.outTitle, /nicht mehr Teil dieser Community/);
});

test('only an explicit true from the server makes the admin; a string, an error or nothing never does', () => {
    assert.strictEqual(C.adminFrom({ data: true }), true);
    for (const r of [{ data: false }, { data: 'true' }, { data: 1 }, { error: { message: 'x' }, data: true }, null, undefined, {}]) assert.strictEqual(C.adminFrom(r), false, JSON.stringify(r));
    assert.strictEqual(C.removedFrom({ data: true }), true);
    assert.strictEqual(C.removedFrom({ data: 'yes' }), false);
});

test('the button: admin only, never on your own card, only on a real account id', () => {
    assert.ok(C.canRemove({ admin: true, self: OWNER }, A));
    assert.ok(!C.canRemove({ admin: false, self: OWNER }, A), 'not admin');
    assert.ok(!C.canRemove({ admin: 'true', self: OWNER }, A), 'only a real true');
    assert.ok(!C.canRemove({ admin: true, self: OWNER }, OWNER), 'not yourself');
    assert.ok(!C.canRemove({ admin: true, self: OWNER }, OWNER.toUpperCase()), 'not yourself in capitals either');
    assert.ok(!C.canRemove({ admin: true, self: OWNER }, 'bot:luna'), 'a bot name is not an account');
    assert.ok(!C.canRemove(null, A));
});

test('removed ids are cleaned: valid, lower case, no duplicates', () => {
    assert.deepStrictEqual(C.idsFrom([{ user_id: A.toUpperCase() }, { user_id: A }, { user_id: 'nope' }, null, { id: OWNER }]), [A, OWNER]);
    assert.deepStrictEqual(C.idsFrom(null), []);
});

test('server errors become a sentence the admin understands', () => {
    assert.strictEqual(C.reasonOf({ error: { message: 'not_admin', code: '42501' } }), 'notAdmin');
    assert.strictEqual(C.reasonOf({ error: { message: 'rate_limited', code: 'P0001' } }), 'rate');
    assert.strictEqual(C.reasonOf({ error: { message: 'not_yourself' } }), 'self');
    assert.strictEqual(C.reasonOf({ error: { message: 'TypeError: Failed to fetch' } }), 'offline');
    assert.strictEqual(C.reasonOf({ error: { message: 'boom' } }), 'failed');
    assert.strictEqual(C.reasonOf({ data: {} }), '');
    assert.strictEqual(C.reasonText('rate', 'de'), C.TXT.de.rate);
    assert.strictEqual(C.reasonText('weird', 'es'), C.TXT.es.failed);
});

test('the Removed people list: newest first, a name for everyone, nothing on an error', () => {
    const l = C.listFrom({ data: [{ user_id: A, name: 'Emmanuel', removed_at: '2026-10-25T10:00:00Z' }, { user_id: OWNER, name: '', removed_at: '2026-10-25T11:00:00Z' }, { user_id: 'x', name: 'bad' }] });
    assert.deepStrictEqual(l.map(x => x.name), ['Member', 'Emmanuel']);
    assert.strictEqual(C.listFrom({ error: { message: 'not_admin' } }), null);
});

/* hidden-accounts.js and bot-accounts.js in a sandbox: a removed person is hidden by every list that already hides test accounts */
function sandbox(cache) {
    const store = Object.assign({}, cache || {}), events = [];
    const ctx = { localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } }, CustomEvent: function (n) { this.type = n; }, dispatchEvent: e => events.push(e.type) };
    ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
    vm.createContext(ctx);
    vm.runInContext(R('bot-accounts.js'), ctx);
    vm.runInContext(R('hidden-accounts.js'), ctx);
    return { ctx, store, events };
}
test('a removed person is hidden like a test account everywhere, and comes back on Restore', () => {
    const { ctx, store, events } = sandbox();
    const H = ctx.LowiHiddenAccounts, B = ctx.LowiBotAccounts;
    assert.ok(H && B, 'both modules load');
    const p = { id: A, name: 'Emmanuel' };
    assert.strictEqual(H.isHidden(p), false);
    assert.strictEqual(H.setRemoved([A.toUpperCase()]), true);
    assert.ok(H.isRemoved(A) && H.isHidden(p) && H.isHidden(A), 'hidden in Room, Ranking, For You, People list, mentions');
    assert.ok(B.isBot(p), 'and in the lists that only ask isBot (galaxy, Add a friend)');
    assert.ok(!B.isBot({ id: A, me: true }), 'your own row is never treated as a bot');
    assert.deepStrictEqual(H.visible([p, { id: OWNER, name: 'eman' }]).map(x => x.name), ['eman']);
    assert.ok(events.includes('lowi-bots'), 'lists are told to redraw');
    assert.ok(JSON.parse(store['lowi.removedIds.v1']).ids.includes(A), 'remembered for the next start');
    const again = sandbox(store);
    assert.ok(again.ctx.LowiHiddenAccounts.isHidden(p), 'the next start already hides them before the network answers');
    assert.strictEqual(H.setRemoved([]), true);
    assert.strictEqual(H.isHidden(p), false, 'Restore brings them back');
    assert.strictEqual(H.setRemoved([]), false, 'no change, no redraw');
});

test('Chat hides messages from removed people, but never your own', () => {
    const s = R('community-chat.js');
    assert.match(s, /function removedBy\(m\)\{[^}]*isRemoved/, 'messages() asks hidden-accounts.js');
    assert.match(s, /function messages\(\)\{[^\n]*!removedBy\(m\)/);
    assert.match(s, /m\.uid!==scope/, 'your own messages stay');
});

test('the app wiring: loaded on every page start, precached, button under Block person, list in Community settings', () => {
    const html = R('index.html'), sw = R('sw.js'), ui = R('community-remove.js');
    for (const f of ['community-remove-core.js', 'community-remove.js']) assert.match(html, new RegExp('<script src="' + f.replace('.', '\\.') + '\\?v='));
    assert.match(html, /<link rel="stylesheet" href="community-remove\.css\?v=/);
    assert.match(sw, /STATIC\.push\("community-remove-core\.js", "community-remove\.js", "community-remove\.css"\)/);
    assert.match(ui, /\.cp-card\[data-person\]/, 'every profile card');
    assert.match(ui, /card\.appendChild\(box\)/, 'at the bottom, below Block person');
    assert.match(ui, /#csBlockedList/, 'Removed people sits in Community settings after Blocked people');
    assert.match(ui, /rpc\('community_remove', \{ target: id \}\)/);
    assert.match(ui, /rpc\('community_restore', \{ target: id \}\)/);
    assert.match(ui, /data-cr="ask"[\s\S]*cr-confirm[\s\S]*data-cr="yes"/, 'one confirm step before anything happens');
    assert.doesNotMatch(ui, /83077af7/, 'no admin id in the app: the server decides');
    assert.doesNotMatch(ui, /\.delete\(|admin_delete|owner-delete-account/, 'never deletes');
});

test('Safari: the card decoration decorates with a plain timer, not a detached requestAnimationFrame (no button showed in WebKit)', () => {
    const ui = R('community-remove.js');
    assert.doesNotMatch(ui, /\(W\.requestAnimationFrame \|\| setTimeout\)\(/);
    assert.match(ui, /raf = setTimeout\(decorate, 30\)/, 'a plain timer, which Safari always runs');
});

test('the server file: admin checked on the server, reversible, logged, rate-limited, hides rows, never deletes people', () => {
    const s = R('supabase/proposals/community_remove_20261025.sql');
    for (const f of ['community_is_admin', 'community_remove', 'community_restore', 'community_removed_list', 'community_am_removed', 'community_remove_guard'])
        assert.match(s, new RegExp('create or replace function public\\.' + f + '\\([^)]*\\)[\\s\\S]{0,160}security definer set search_path = \'\''), f + ' is security definer with an empty search_path');
    assert.match(s, /public\.is_app_admin\(\)/, 'the existing admin list');
    assert.match(s, /raise exception 'not_admin' using errcode = '42501'/);
    assert.match(s, /raise exception 'not_yourself'/);
    assert.match(s, /raise exception 'target_is_admin'/);
    assert.match(s, /interval '10 minutes'\) >= 30/);
    assert.match(s, /interval '1 day'\) >= 300/);
    assert.match(s, /insert into public\.community_removal_log \(actor, target, action, target_name\) values \(me, target, 'remove'/);
    assert.match(s, /insert into public\.community_removal_log \(actor, target, action, target_name\) values \(me, target, 'restore'/);
    assert.match(s, /revoke all on public\.community_removal_log from public, anon, authenticated;/, 'nobody reads the log through the app');
    assert.match(s, /revoke all on public\.community_kicks from public, anon, authenticated;\ngrant select \(user_id\) on public\.community_kicks to authenticated;/, 'only the ids are readable, nobody writes');
    assert.match(s, /revoke execute on function public\.community_remove_guard\(uuid\) from public, anon, authenticated;/);
    assert.match(s, /as restrictive for select to authenticated using/);
    assert.match(s, /as restrictive for insert to authenticated with check/);
    assert.doesNotMatch(s.replace(/^--.*$/gm, ''), /delete from (auth\.users|public\.profiles|public\.messages)/i, 'no account or message is ever deleted');
    assert.doesNotMatch(s.replace(/^--.*$/gm, ''), /create (or replace )?function public\.is_app_owner/, 'the old owner-admin Members/Delete card stays dormant');
});

test('live check runs against the real site mark their accounts as test accounts (no more strangers called Emmanuel)', () => {
    const h = R('tools/sim/harness.cjs');
    assert.match(h, /if \(o\.url && process\.env\.SIM_LIVE_UNMARKED !== '1'\) await ctx\.route\([^\n]*auth\\\/v1\\\/signup/);
    assert.match(h, /lowi_test: true/);
});
