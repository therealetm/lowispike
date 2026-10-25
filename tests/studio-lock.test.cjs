/* 25 Oct 2026 Studio lock (Emmanuel: "Studio under construction. I want it locked. So no one can see inside. But I can get
   access ... as the admin. So maybe lock it with a password."). Rules: studio-lock-core.js. Server: studio_lock_20261025.sql
   (checked against a real Postgres by tools/studio-lock/test-sql.sh). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const C = require('../studio-lock-core.js');

test('the lock texts exist in German, English and Spanish, with every line filled', () => {
    const keys = Object.keys(C.TXT.en);
    for (const l of ['en', 'de', 'es']) for (const k of keys) assert.ok(C.TXT[l][k] && C.TXT[l][k].trim(), l + '.' + k);
    assert.strictEqual(C.TXT.de.title, 'Im Aufbau');
    assert.strictEqual(C.TXT.en.title, 'Under construction');
    assert.strictEqual(C.TXT.es.title, 'En construcción');
    assert.strictEqual(C.text('fr'), C.TXT.en, 'unknown language falls back to English');
});

test('a PIN is digits only, 4 to 8 of them', () => {
    assert.strictEqual(C.normalizePin(' 12a3-4 '), '1234');
    assert.strictEqual(C.normalizePin('123456789'), '12345678');
    assert.strictEqual(C.normalizePin(null), '');
    assert.ok(C.pinReady('0000'));
    assert.ok(!C.pinReady('123'));
    assert.ok(!C.pinReady('12a4'));
});

test('only an explicit yes from the server opens Studio; no answer keeps the remembered verdict for this device only', () => {
    assert.strictEqual(C.accessFromRpc({ data: true }), true);
    assert.strictEqual(C.accessFromRpc({ data: false }), false);
    assert.strictEqual(C.accessFromRpc({ data: 'true' }), null, 'a string is not a yes');
    assert.strictEqual(C.accessFromRpc({ error: { message: 'x' } }), null);
    assert.strictEqual(C.accessFromRpc(null), null);
    const pass = 'a'.repeat(48), uid = 'u1';
    assert.strictEqual(C.decide(true, '', '', ''), true);
    assert.strictEqual(C.decide(false, 'pass', pass, uid), false, 'the server says no: locked, whatever is remembered');
    assert.strictEqual(C.decide(null, '', '', uid), false, 'nothing remembered: locked');
    assert.strictEqual(C.decide(null, 'pass', pass, uid), true, 'this device typed the PIN: opens offline');
    assert.strictEqual(C.decide(null, 'pass', '', uid), false, 'a mark without its pass does nothing');
    assert.strictEqual(C.decide(null, 'uid:u1', '', 'u1'), true, 'the owner was signed in here');
    assert.strictEqual(C.decide(null, 'uid:u1', '', 'u2'), false, 'someone else signed in on the same phone: locked');
    assert.strictEqual(C.decide(null, '1', '', 'u1'), false, 'a plain flag never opens it');
    assert.strictEqual(C.okMark(true, 'u1'), 'pass');
    assert.strictEqual(C.okMark(false, 'u1'), 'uid:u1');
    assert.strictEqual(C.okMark(false, ''), '');
});

test('the unlock answer: a pass on ok, a clear reason otherwise', () => {
    const p = 'ab12'.repeat(12);
    assert.deepStrictEqual(C.unlockFromRpc({ data: { ok: true, pass: p } }), { ok: true, pass: p, reason: '' });
    assert.strictEqual(C.unlockFromRpc({ data: { ok: true, pass: 'short' } }).ok, false, 'a malformed pass is not trusted');
    assert.strictEqual(C.unlockFromRpc({ data: { ok: false, reason: 'wrong' } }).reason, 'wrong');
    assert.strictEqual(C.unlockFromRpc({ data: { ok: false, reason: 'wait' } }).reason, 'wait');
    assert.strictEqual(C.unlockFromRpc({ data: { ok: false, reason: 'weird' } }).reason, 'error');
    assert.strictEqual(C.unlockFromRpc({ error: { message: 'TypeError: Failed to fetch' } }).reason, 'offline');
    assert.strictEqual(C.unlockFromRpc({ error: { message: 'function does not exist' } }).reason, 'error');
    assert.strictEqual(C.reasonText('wrong', 'de'), 'Falsche PIN.');
    assert.strictEqual(C.reasonText('wait', 'es'), C.TXT.es.wait);
    assert.strictEqual(C.reasonText('error', 'en'), C.TXT.en.failed);
});

test('the PIN is never in the app or the repo: no 1994 in any Studio lock file, and the SQL keeps only a placeholder', () => {
    const files = ['studio-lock-core.js', 'studio-lock.js', 'studio-lock.css', 'supabase/proposals/studio_lock_20261025.sql',
        'tools/studio-lock/test-sql.sh', 'tools/studio-lock/local-pg-stub.sql', 'community-rooms-ui.js'];
    for (const f of files) assert.ok(!/1994/.test(R(f)), f + ' must not contain the PIN');
    for (const f of fs.readdirSync(path.join(__dirname, '..', 'tools/studio-lock'))) assert.ok(!/1994/.test(R('tools/studio-lock/' + f)), f);
    const sql = R('supabase/proposals/studio_lock_20261025.sql');
    assert.match(sql, /crypt\('<PIN>'/, 'the SQL only shows how to set it');
    assert.ok(!/\$2[aby]\$/.test(sql), 'no bcrypt hash in the repo either (a 4-digit hash is guessed offline in seconds)');
});

test('server side: the hash table has no grants, tries are rate limited, the owner role is reused, passes are stored hashed', () => {
    const sql = R('supabase/proposals/studio_lock_20261025.sql');
    for (const t of ['studio_lock', 'studio_pin_tries', 'studio_passes']) {
        assert.match(sql, new RegExp('alter table public\\.' + t + ' enable row level security'), t + ' RLS');
        assert.match(sql, new RegExp('revoke all on public\\.' + t + ' from public, anon, authenticated'), t + ' no grants');
    }
    assert.match(sql, /security definer set search_path = ''/);
    assert.match(sql, /public\.is_app_admin\(\)/, 'the owner is the existing app_admins role');
    assert.match(sql, /interval '15 minutes'\) >= 5/, 'per account');
    assert.match(sql, /interval '1 hour'\) >= 12/, 'everyone together, per hour');
    assert.match(sql, /interval '1 day'\) >= 60/, 'everyone together, per day');
    assert.match(sql, /pg_advisory_xact_lock/, 'parallel guesses wait for each other');
    assert.match(sql, /extensions\.crypt\(pin, h\) <> h/, 'bcrypt compare on the server');
    assert.match(sql, /digest\(tok, 'sha256'\)/, 'only the pass hash is stored');
    assert.match(sql, /grant\s+execute on function public\.studio_unlock\(text\) to anon, authenticated/);
    assert.match(sql, /revoke execute on function public\.studio_forget_devices\(\) from public, anon/);
    assert.ok(!/select[^;]*pin_hash[^;]*into[^;]*;[\s\S]*return[^;]*pin_hash/.test(sql), 'the hash never goes back to the app');
});

test('Community > Studio: no frame while locked, the lock panel instead, no switch, no page link; a missing lock module stays locked', () => {
    const ui = R('community-rooms-ui.js');
    assert.match(ui, /function studioLocked\(\)\{const L=W\.LowiStudioLock;try\{return !L\|\|L\.locked\(\)!==false;\}catch\(e\)\{return true;\}\}/);
    assert.match(ui, /const lk=!!VIEWS\[view\]&&studioLocked\(\);if\(lk\)dropFrames\(''\);/, 'frames made before go');
    assert.match(ui, /SL\.paint\(box,lk&&pageActive\(\)\)/);
    assert.match(ui, /if\(VIEWS\[view\]&&!lk&&!frames\[view\]&&pageActive\(\)\)\{/, 'no iframe is created while locked');
    assert.match(ui, /const on=!!VIEWS\[view\]&&!studioLocked\(\);/, 'no Affiliates | Creation switch while locked');
    assert.match(ui, /if\(studioLocked\(\)\)for\(let i=it\.length-1;i>=0;i--\)if\(it\[i\]\[0\]==='copyview'\)it\.splice\(i,1\);/, 'no page link in the menu');
    assert.match(ui, /W\.addEventListener\('lowi:studio-lock',\(\)=>\{if\(VIEWS\[view\]\)paint\(\);\}\);/, 'repaints as soon as the server answers');
});

test('studio-lock.js: asks the server, keeps the pass on this device only, PIN field is numeric and masked, 44 px lock button', () => {
    const js = R('studio-lock.js'), css = R('studio-lock.css');
    assert.match(js, /rpc\('studio_access', \{ pass: p \|\| null \}\)/);
    assert.match(js, /rpc\('studio_unlock', \{ pin \}\)/);
    assert.strictEqual(C.PASS_KEY.indexOf('lowispike.'), -1, 'not a lowispike.* key, so the account backup never carries it to another phone');
    assert.match(js, /else \{ put\(C\.OK_KEY, ''\); if \(p\) put\(C\.PASS_KEY, ''\); \}/, 'a refused pass is forgotten');
    assert.match(js, /type="password" inputmode="numeric" pattern="\[0-9\]\*" maxlength="8" autocomplete="off"/);
    assert.match(js, /role="status" aria-live="polite"/);
    assert.match(js, /data-noi18n/);
    assert.ok(!/innerHTML\s*=\s*[^;]*ST\.msg/.test(js.replace(/esc\(ST\.msg\)/g, '')), 'messages are escaped');
    assert.match(css, /\.sl-key\{[^}]*width:44px;height:44px/);
    assert.match(css, /prefers-reduced-motion/);
});

test('wired: loads after community-rooms-ui.js, cached offline on its own line, own version tag like every app file', () => {
    const html = R('index.html'), sw = R('sw.js');
    const a = html.indexOf('<script src="community-rooms-ui.js'), b = html.indexOf('<script src="studio-lock-core.js'), c = html.indexOf('<script src="studio-lock.js');
    assert.ok(a > 0 && b > a && c > b, 'order');
    assert.match(html, /<link rel="stylesheet" href="studio-lock\.css\?v=\d{8}-\d{6}">/);
    assert.match(sw, /\nSTATIC\.push\("studio-lock-core\.js", "studio-lock\.js", "studio-lock\.css"\);[^\n]*\n/);
});
