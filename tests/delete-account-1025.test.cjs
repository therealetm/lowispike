/* Delete my account, 25 Oct 2026 (a tester, Luise, got "We couldn't delete your account right now. Nothing was deleted").
   Found: (1) the Edge Function delete-my-account was never deployed (404); (2) it deleted rows table by table and the login
   last, and for anyone who caught a product the login delete fails (products_caught_by_fkey via the lowi_rate_products
   trigger), so their profile, posts and chats would already be gone while the login stayed: a half-deleted account.
   Fixed: one database transaction (public.lowi_delete_account), files after it, the owner refused, this phone's push
   subscription removed, and the dialog says the true thing in English, German and Spanish. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const FN = read('supabase/functions/delete-my-account/index.ts');
const SQLP = 'supabase/proposals/delete_account_20261025.sql';

test('the database deletes the whole account in one transaction, including the caught-product case', () => {
  assert.ok(fs.existsSync(path.join(ROOT, SQLP)), SQLP + ' exists');
  const sql = read(SQLP);
  assert.match(sql, /create or replace function public\.lowi_delete_account\(uid uuid\)/);
  assert.match(sql, /security definer/);
  assert.match(sql, /set search_path to ''/);
  assert.match(sql, /app_admins[\s\S]*raise exception 'owner'/, 'the owner account is refused');
  assert.match(sql, /set_config\('lowi\.sys', '1', true\)[\s\S]*update public\.products set caught_by = null, caught_by_name = ''/, 'caught products are released through the trigger first');
  for (const t of ['messages_archive_20261024', 'reactions_archive_20261024', 'swipe_foods']) assert.ok(sql.includes("'" + t + "'"), t + ' has no cascade, so it is cleared by name');
  assert.match(sql, /delete from auth\.users where id = uid/);
  assert.ok(sql.indexOf('update public.products') < sql.indexOf('delete from auth.users'), 'products released before the login goes');
  assert.match(sql, /revoke all on function public\.lowi_delete_account\(uuid\) from anon, authenticated/);
  assert.match(sql, /grant execute on function public\.lowi_delete_account\(uuid\) to service_role/);
});

test('the Edge Function calls that one transaction and no longer deletes table by table before the login', () => {
  assert.match(FN, /\.rpc\(\s*['"]lowi_delete_account['"]/);
  assert.doesNotMatch(FN, /auth\.admin\.deleteUser/, 'the login goes inside the transaction, not in a second step');
  assert.doesNotMatch(FN, /for \(const \[table, col\] of /, 'no row-by-row delete loop');
  assert.match(FN, /owner/);
  assert.match(FN, /out\(req, 403, \{ ok: false, error: "owner" \}\)/);
  const serve = FN.slice(FN.indexOf('Deno.serve'));
  assert.ok(serve.indexOf('rpc(') > 0 && serve.indexOf('rpc(') < serve.indexOf('removeMedia(media)'), 'files are removed only after the database said deleted');
  assert.match(FN, /n1_push/, 'this phone\'s push subscription is removed');
  assert.match(FN, /media_left/);
});

function loadSettings() {
  const src = read('home-settings-sleep-v2.js');
  const a = src.indexOf('const TX = {'), es = src.indexOf('Object.assign(TX.es'), b = src.indexOf('});\n', es);
  assert.ok(a > 0 && es > a && b > es, 'TX table and its additions found');
  return vm.runInNewContext(src.slice(a, b + 3) + '\nTX');
}

test('the dialog has every line in English, German and Spanish, including the owner refusal', () => {
  const TX = loadSettings();
  const keys = ['deleteAccount', 'delTitle', 'delBody', 'delGo', 'delCancel', 'delBusy', 'delFail', 'delGuest', 'delGuestGo', 'delOwner'];
  for (const l of ['en', 'de', 'es']) for (const k of keys) assert.ok(TX[l] && typeof TX[l][k] === 'string' && TX[l][k].trim(), l + '.' + k);
  for (const k of keys) { assert.notEqual(TX.de[k], TX.en[k], 'de.' + k + ' is German'); assert.notEqual(TX.es[k], TX.en[k], 'es.' + k + ' is Spanish'); }
  assert.match(TX.de.delOwner, /nichts gel\u00f6scht/);
  assert.match(TX.es.delOwner, /No se ha borrado nada/);
});

test('both delete buttons tell the owner refusal apart from a failure, and the phone stops getting pushes', () => {
  const src = read('home-settings-sleep-v2.js'), cme = read('community-me.js');
  const sd = src.slice(src.indexOf('async function pushSub'), src.indexOf('function pulse('));
  assert.match(sd, /pushManager[\s\S]*getSubscription/, 'reads this phone\'s push subscription');
  assert.match(sd, /endpoint/);
  assert.match(sd, /unsubscribe\(\)/);
  assert.match(sd, /'owner'/);
  const dd = src.slice(src.indexOf('async function doDelete'), src.indexOf('async function pushSub'));
  assert.match(dd, /delOwner/);
  assert.match(dd, /=== true/);
  const dg = cme.slice(cme.indexOf('async function delGo'), cme.indexOf('function open()'));
  assert.match(dg, /delOwner/);
  assert.match(dg, /=== true/);
});

/* The real cause on the phone: LOWI_CLOUD_X.client() is async, and serverDelete used it without await, so it got a Promise,
   found no .functions on it and returned false at once: the Delete button never sent anything to the server. */
function runServerDelete(answer) {
  const src = read('home-settings-sleep-v2.js');
  const a = src.indexOf('async function pushSub') > 0 ? src.indexOf('async function pushSub') : src.indexOf('async function serverDelete');
  const code = src.slice(a, src.indexOf('function pulse('));
  const log = { invoked: [], signedOut: 0, wiped: 0, unsub: 0 };
  const sub = { endpoint: 'https://push.example/abc', unsubscribe: async () => { log.unsub++; return true; } };
  const sb = {
    functions: { invoke: async (name, opts) => { log.invoked.push({ name, body: opts && opts.body }); return answer; } },
    auth: { signOut: async () => { log.signedOut++; } }
  };
  const ctx = {
    root: { navigator: { serviceWorker: { ready: Promise.resolve({ pushManager: { getSubscription: async () => sub } }) } } },
    fn: (o, k) => !!o && typeof o[k] === 'function', cloud: () => ({ client: async () => sb }),
    wipeDevice: () => { log.wiped++; }, setTimeout, Promise
  };
  vm.createContext(ctx);
  vm.runInContext(code + '\nthis.serverDelete = serverDelete;', ctx);
  return ctx.serverDelete().then(r => ({ r, log }));
}

test('Delete really calls the server (the client is async), and clears the phone only after ok', async () => {
  const ok = await runServerDelete({ data: { ok: true }, error: null });
  assert.equal(ok.log.invoked.length, 1, 'delete-my-account was called');
  assert.equal(ok.log.invoked[0].name, 'delete-my-account');
  assert.equal(ok.log.invoked[0].body.confirm, 'DELETE');
  assert.equal(ok.log.invoked[0].body.endpoint, 'https://push.example/abc');
  assert.equal(ok.r, true);
  assert.equal(ok.log.wiped, 1); assert.equal(ok.log.signedOut, 1); assert.equal(ok.log.unsub, 1);
  const bad = await runServerDelete({ data: null, error: { message: 'x', context: { json: async () => ({ ok: false, error: 'db' }) } } });
  assert.equal(bad.r, false); assert.equal(bad.log.wiped, 0); assert.equal(bad.log.unsub, 0);
  const own = await runServerDelete({ data: null, error: { message: 'x', context: { json: async () => ({ ok: false, error: 'owner' }) } } });
  assert.equal(own.r, 'owner'); assert.equal(own.log.wiped, 0);
});
