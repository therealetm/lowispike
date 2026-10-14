'use strict';
/* Oct 14: "view password" in Profile. A stored password can never be shown (Supabase keeps only a hash), so Profile
   offers "Forgot your password?" -> explanation + set a new one while signed in. Plus: opened Profile parts scroll. */
const {test} = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const r2s = html.indexOf('/* ---------- profile: hero, edit, password, sign out ---------- */'), r2 = html.slice(r2s, html.indexOf('/* ---------- events ---------- */', r2s));
const pwFn = r2.slice(r2.indexOf('function pwHTML(forgot){'), r2.indexOf('function confirmHTML(kind){'));

test('Account card offers "Forgot your password?" next to Change password', () => {
  const acct = r2.slice(r2.indexOf('R2.accountHTML = function(){'), r2.indexOf('function editHTML(){'));
  assert.match(acct, /data-r2p="password">Change password</);
  assert.match(acct, /data-r2p="pwforgot">Forgot your password\?</);
  assert.ok(!/View password|Show password/i.test(acct), 'reset is never labelled as view password');
  assert.match(html, /if \(v === "pwforgot"\) return void R2\.sheet\(pwHTML\(true\)\);/);
  assert.match(html, /if \(v === "password"\) return void R2\.sheet\(pwHTML\(false\)\);/);
});

test('the forgot sheet says the old password cannot be shown and sets a new one through Supabase updateUser', () => {
  assert.match(pwFn, /can\\'t be shown, not even by LOWiSPIKE/);
  assert.match(pwFn, /scrambled code/);
  assert.match(pwFn, /data-r2form="pw"/);
  assert.match(pwFn, /autocomplete="new-password"/);
  assert.match(pwFn, /autocomplete="username"/);
  assert.match(pwFn, /data-r2a="eye"/);
  const change = r2.slice(r2.indexOf('async function changePw(form){'), r2.indexOf('function saveEdit(){'));
  assert.match(change, /sb\.auth\.updateUser\(\{ password: pw \}\)/);
  assert.match(change, /pw\.length < 8/);
  assert.match(change, /if \(r\.error\) throw r\.error; R2\.close\(\); R2\.toast\("Password changed"\)/, 'success only after the backend confirms');
});

test('no password is ever stored, logged or put in a URL by the profile code', () => {
  const change = r2.slice(r2.indexOf('async function changePw(form){'), r2.indexOf('function saveEdit(){'));
  assert.ok(!/localStorage|sessionStorage|console\.|location|fetch\(/.test(change));
  assert.ok(!/value="' \+ esc\(pw/.test(pwFn));
  assert.ok(!/name="password"[^>]*value=/.test(pwFn), 'the password field starts empty');
});

test('eye button shows and hides what is typed, with an accessible label', () => {
  const es = html.indexOf('if (v === "eye") { const i = a.parentNode'), ev = html.slice(es, html.indexOf('if (v === "skip")', es));
  assert.match(ev, /i\.type = show \? "text" : "password"/);
  assert.match(ev, /aria-pressed/);
  assert.match(ev, /Hide password/);
  assert.match(html, /eyeOff:'<svg/);
});

test('new copy is translated to German and Spanish', () => {
  for (const en of ['Forgot your password?', "Your password can't be shown, not even by LOWiSPIKE.", 'Saved it on your iPhone? Look in the Passwords app.', 'Hide password', "That's already your password. Pick a new one."]) {
    const row = html.indexOf('["' + en + '", ');
    assert.ok(row > 0, en);
  }
  assert.match(html, /\["Forgot your password\?", "Passwort vergessen\?", /);
});

test('backend errors for the same or a stale password get a clear message', () => {
  const em = html.slice(html.indexOf('function errMsg(e){'), html.indexOf('function busy(form, on, label)'));
  assert.match(em, /same_password/);
  assert.match(em, /reauthenticat/);
});

test('an opened Profile part scrolls and clears the orb', () => {
  assert.match(html, /html\.g2e-on\.g2e-open #tab-profile\{overflow-y:auto!important/);
  assert.match(html, /html\.g2e-on\.g2e-open #tab-profile::after\{content:"";display:block;flex:none;order:99;height:var\(--g2fSp/);
});
