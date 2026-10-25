'use strict';
/* Oct 23 2026 (Emmanuel): setup and Profile offer four gender choices, Frau / Mann / Nichtbinär / Keine Angabe
   (Woman / Man / Non-binary / Prefer not to say; Mujer / Hombre / No binario / Prefiero no decirlo). Non-binary and
   prefer-not-to-say never turn into woman or man, and nothing about the body is guessed from them: PCOS follows the
   person's own pick, the cycle is only switched on by itself for "Frau" and stays a free opt-in for everyone else.
   Also: one optional line to type an own condition (e.g. sickle cell disease). It lives in S.health, so it stays on
   this phone like all health data (PRIVATE_KEYS), and the hint says it is no medical advice. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path'), vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const html = read('index.html');

function grab(re, what) { const m = html.match(re); assert.ok(m, 'index.html has ' + what); return m[0]; }

function world(state) {
  const ctx = vm.createContext({ state, window: {}, $: () => null, document: { addEventListener() {} }, sessionStorage: { getItem: () => null, removeItem() {} } });
  vm.runInContext('const R2 = { S: () => state, save() {}, X: () => null, refreshMe() {}, toast() {}, applyTheme() {} }; let ob = null; const isCond = t => (["PCOS", "Insulin resistance", "Pre-diabetes"]).includes(t); const esc = x => String(x);', ctx);
  vm.runInContext(grab(/const CONDNOTE_MAX = 120;[\s\S]*?R2\.cleanCondNote = cleanCondNote;/, 'cleanCondNote'), ctx);
  vm.runInContext(grab(/function saveOb\(final\)\{[\s\S]*?\n\}/, 'saveOb'), ctx);
  return ctx;
}
const setOb = (ctx, o) => vm.runInContext('ob = ' + JSON.stringify(Object.assign({ step: 1, bday: '1996-03-09', name: 'Tester', avatar: '', tags: [], noCond: false, gender: '' }, o)) + '; saveOb(false);', ctx);

test('four gender choices in setup and Profile, in the approved order, with stored codes f / m / n / x', () => {
  const g = grab(/const GENDERS = (\[.*?\]\]);/, 'GENDERS');
  assert.deepEqual(JSON.parse(g.replace(/^const GENDERS = /, '').replace(/;$/, '')), [['f', 'Woman'], ['m', 'Man'], ['n', 'Non-binary'], ['x', 'Prefer not to say']]);
  assert(html.includes("'<div class=\"r2-obsub\">Gender</div><div class=\"r2-chips r2-gender\">' + GENDERS.map("), 'setup uses the shared list');
  assert(html.includes('LowiR2.GENDERS) || [["f", "Woman"], ["m", "Man"], ["n", "Non-binary"], ["x", "Prefer not to say"]]).map('), 'Profile uses the same four');
  assert(!/\[\["f", "A woman"\], \["m", "A man"\], \["x", "Prefer not to say"\]\]/.test(html), 'no three-choice list left');
});

test('German and Spanish words are the ones Emmanuel approved', () => {
  for (const row of [['Gender', 'Geschlecht', 'Género'], ['Woman', 'Frau', 'Mujer'], ['Man', 'Mann', 'Hombre'], ['Non-binary', 'Nichtbinär', 'No binario'], ['Prefer not to say', 'Keine Angabe', 'Prefiero no decirlo']])
    assert(html.includes('["' + row.join('", "') + '"]'), row[0]);
  const yd = read('your-details.js');
  assert(yd.includes("n: 'Non-binary'") && yd.includes("n: 'Nichtbinär'") && yd.includes("n: 'No binario'"), 'Your details names non-binary in all three languages');
});

test('saving setup keeps non-binary and prefer-not-to-say as they are; old Frau / Mann values stay', () => {
  for (const g of ['f', 'm', 'n', 'x']) {
    const s = { user: {}, health: {} }; const ctx = world(s); setOb(ctx, { gender: g });
    assert.equal(s.user.gender, g);
  }
  const s = { user: { gender: 'f' }, health: {} }; const ctx = world(s); setOb(ctx, { gender: '' });
  assert.equal(s.user.gender, 'f', 'an empty pick never overwrites a saved choice');
});

test('PCOS follows the own pick for anyone except Mann; nothing is guessed from gender', () => {
  for (const [g, tags, want] of [['f', ['PCOS'], true], ['n', ['PCOS'], true], ['x', ['PCOS'], true], ['', ['PCOS'], true], ['m', ['PCOS'], false], ['f', [], false], ['n', [], false]]) {
    const s = { user: {}, health: {} }; const ctx = world(s); setOb(ctx, { gender: g, tags });
    assert.equal(s.health.pcos, want, g + ' ' + tags);
  }
  assert(!/pcos && S\.user\.gender === "f"/.test(html), 'PCOS tips are not women-only any more');
  assert(html.includes('H.gender = b => { S.user.gender = b.getAttribute("data-v"); if (S.user.gender === "m") S.health.pcos = false;'));
});

test('the cycle is switched on by itself only for Frau; non-binary and prefer-not-to-say keep the free opt-in', () => {
  assert(html.includes('function isFem(){ const s = gS(); return !!(s && s.user && s.user.gender === "f"); }'));
  assert(!/gender === "n"[^\n]*cycle|cycle[^\n]*gender === "n"/.test(html), 'no cycle rule assumes anything for non-binary');
});

test('own condition: cleaned, max 120, saved only in S.health (stays on this phone), empty removes it', () => {
  const s = { user: {}, health: {} }; const ctx = world(s);
  setOb(ctx, { condNote: '  Sichelzell<script>krankheit\n\t ' });
  assert.equal(s.health.condNote, 'Sichelzell script krankheit');
  assert.equal(s.user.condNote, undefined, 'not in the account backup part');
  setOb(ctx, { condNote: 'x'.repeat(400) });
  assert.equal(s.health.condNote.length, 120);
  setOb(ctx, { condNote: '   ' });
  assert.equal('condNote' in s.health, false);
  assert(html.includes('const PRIVATE_KEYS = ["health"];'), 'health is never synced to the account');
  /* Oct 25 (Emmanuel's call): the separate line is gone, its text is folded into own chips (own-entries.js fold, 40 characters
     each, escaped, Enter adds). What setup still stores here is only the part that did not fit, cleaned exactly as before. */
  assert(!html.includes('maxlength="\' + CONDNOTE_MAX + \'"'), 'no second typing field under "watch out for"');
  assert(html.includes('(noteId ? condHintHTML() : "")'), 'only the honest hint is left where the line was');
  assert(html.includes('ob.condNote = o.left;'), 'setup keeps only what did not fit in the chips');
});

test('own condition shows in setup and in Edit profile, with the honest hint in three languages', () => {
  assert(html.includes('condBlock("data-r2tag", "data-r2none", ob.tags, ob.noCond, ob.gender, ob.condNote, "r2obCondNote")'));
  assert(html.includes('condBlock("data-r2etag", "data-r2enone", sel, !!u.noCond, u.gender || "", (s.health && s.health.condNote) || "", "r2eCondNote")'));
  /* Oct 25: the "Something else? Type it here" line merged into the Add box: no label, placeholder or field of its own left */
  assert(!html.includes('"Something else? Type it here"') && !html.includes('"e.g. sickle cell disease"'), 'old line gone in every language');
  assert(!html.includes('$("#r2obCondNote")') && !html.includes('$("#r2eCondNote")'), 'nothing reads the old field any more');
  assert(html.includes('["Stays on this phone. A note for you, not medical advice.", "Bleibt auf diesem Handy. Eine Notiz für dich, keine medizinische Beratung.", "Se queda en este móvil. Es una nota para ti, no un consejo médico."]'));
  assert(read('your-details.js').includes("typeof h.condNote === 'string'"), 'Your details lists it with the conditions');
});

test('the community and the food photo never get health data', () => {
  assert(!/condNote/.test(read('community-chat-cloud.js') + read('food-photo-ai.js') + read('account-sync-core.js')));
});
