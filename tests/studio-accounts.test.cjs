// 22 Nov 2026 (Emmanuel): Studio > Profile: several accounts, a TikTok-like switcher, profile from a link, inspo picked from the Swipe file.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const html = R('studio/index.html'), js = R('studio/accounts.js'), fn = R('supabase/functions/studio-ai/index.ts'), sql = R('supabase/proposals/studio_accounts_20261122.sql');
test('Studio has a third tab, Profile, in three languages', () => { assert.match(html, /data-tab="profile"/); assert.match(html, /profile: \['Profile', 'Profil', 'Perfil'\]/); assert.match(html, /<script src="accounts\.js\?v=\d+"><\/script>/); });
test('Profile tab hands rendering and the open list to accounts.js', () => { assert.match(html, /if \(TAB === 'profile'\) \{/); assert.match(html, /StudioAcc\.items\(SW\)/); assert.match(html, /StudioAcc\.addBtn\(x\)/); });
test('accounts: switcher, add / edit / delete, inspo picker, remove from one account', () => { for (const k of ["'switch'", "'use'", "'add'", "'saveacc'", "'delacc'", "'pick'", "'ptog'", "'psave'", "'rmone'", "'fetch'"]) assert.ok(js.includes("k === " + k), k); });
test('accounts are kept on the phone and in the person\'s own cloud row', () => { assert.match(js, /lowi\.studio\.accounts\.v1/); assert.match(js, /from\('studio_accounts'\)\.upsert\(\{user_id: UID/); assert.match(sql, /using \(user_id = auth\.uid\(\)\)/); assert.match(sql, /revoke all on public\.studio_accounts from anon/); });
test('profile link reader returns name, handle, bio and a lasting picture', () => { assert.match(fn, /body\.action === "profile"/); assert.match(fn, /webapp\.user-detail/); assert.match(fn, /async function asDataUrl/); assert.match(fn, /take\(sub, "profile", 30\)/); });
test('Swipe file: adding a link or @handle that is already there asks first; profile tiles show followers and bio (23 Nov 2026)', () => {
  assert.match(html, /function dupOf\(o\)/); assert.match(html, /if \(!id\) \{ var same = dupOf\(o\); if \(same\.length && !confirm\(t\('dupQ'\)/);
  assert.match(html, /x\.followers \? '<span class="vw">' \+ PERSON/); assert.match(html, /<p class="bio">/);
});
test('accounts: reorder with up / down, name only in the switcher, own picture; forms are full pages with Save pinned (23 Nov 2026)', () => {
  assert.match(js, /k === 'up' \|\| k === 'down'\) return move\(b\.dataset\.k/); assert.match(js, /function pickPic\(\)/); assert.match(js, /toDataURL\('image\/jpeg', 0\.82\)/);
  assert.match(js, /var inner = avatar\(a, 46\) \+ '<span><b>' \+ esc\(a\.name \|\| a\.handle\) \+ '<\/b><small>' \+ esc\(\(a\.inspo \|\| \[\]\)\.length/);
  assert.match(html, /\.dlg \.in>\.btns:last-child,\.dlg \.in>\.btns\.pin\{position:sticky;bottom:0/); assert.match(html, /body:has\(\.dlg\.on\) #selbar\{display:none!important\}/);
});
test('Profile drafts: + Idea (type or speak), Save draft, a Drafts tile first like TikTok, text-on-screen draft tiles (23 Nov 2026)', () => {
  for (const k of ["'idea'", "'isave'", "'imic'", "'drafts'", "'dopen'", "'idel'"]) assert.ok(js.includes("k === " + k), k);
  assert.match(js, /var SR = W\.SpeechRecognition \|\| W\.webkitSpeechRecognition;/); assert.match(js, /a\.drafts\.unshift\(\{id: 'd'/); assert.match(js, /\(RM \? '' : dTile\)/);
});
test('Swipe file playlists: rows that swipe sideways, the name opens the full grid, the owner makes them in Edit (23 Nov 2026)', () => {
  assert.match(html, /\.pl-row\{display:grid;grid-auto-flow:column/); assert.match(html, /if \(b\.dataset\.pl\) \{ PL = b\.dataset\.pl;/); assert.match(html, /function plDlg\(id\)/); assert.match(html, /DOC\.lists = L0; return save\(\)/);
  assert.match(html, /if \(TAB === 'swipe' && PL\) \{ var q = lists\(\)/);
});
