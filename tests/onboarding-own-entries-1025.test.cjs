'use strict';
/* Oct 25 2026 (Eman, handoff from the other account): at "I want" (Ich m\u00f6chte) and "Anything we should look out for?"
   (Worauf sollen wir achten?) people can type their own option and add it with an Add (Hinzuf\u00fcgen / A\u00f1adir) button.
   This is NOT the one free-text condition line from Oct 23 (condNote): that line stays as it is. Own entries become
   chips the person can remove, live in S.health.own (on this phone only, like all health data) and show in Edit profile
   and Your details. DE/EN/ES. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path'), vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const html = read('index.html');
const OE = require('../own-entries.js');

test('cleaning: no markup or control characters, 40 characters, empty is nothing', () => {
  assert.equal(OE.clean('  besser\n\tschlafen <b>jetzt</b> '), 'besser schlafen b jetzt /b');
  assert.equal(OE.clean('x'.repeat(90)).length, 40);
  assert.equal(OE.clean('   '), '');
  assert.equal(OE.clean(null), '');
});

test('adding: duplicates ignored whatever the case, at most six per list', () => {
  let r = OE.add([], ' Hashimoto ');
  assert.deepEqual(r, { list: ['Hashimoto'], added: 'Hashimoto', why: '' });
  r = OE.add(r.list, 'hashimoto');
  assert.equal(r.added, null); assert.equal(r.why, 'dup'); assert.deepEqual(r.list, ['Hashimoto']);
  assert.equal(OE.add(['a', 'b', 'c', 'd', 'e', 'f'], 'g').why, 'full');
  assert.equal(OE.add([], '  ').why, 'empty');
  assert.deepEqual(OE.list(['A', 'a', '', 'B<', 7, 'c', 'd', 'e', 'f', 'g']), ['A', 'B', '7', 'c', 'd', 'e']);
});

test('stored only in S.health.own, empty lists remove it', () => {
  const h = {};
  OE.write(h, { goals: ['besser schlafen'], conds: [] });
  assert.deepEqual(h.own, { goals: ['besser schlafen'], conds: [] });
  assert.deepEqual(OE.read(h), { goals: ['besser schlafen'], conds: [] });
  OE.write(h, { goals: [], conds: [] });
  assert.equal('own' in h, false);
  assert.deepEqual(OE.read(undefined), { goals: [], conds: [] });
  assert.deepEqual(OE.read({ own: { goals: 'x', conds: ['<i>'] } }), { goals: [], conds: ['i'] });
  assert(html.includes('const PRIVATE_KEYS = ["health"];'), 'health never goes to the account backup');
});

test('Add row and chips in English, German and Spanish; typed words are never machine-translated', () => {
  const want = { en: ['Add', 'Remove Hashimoto'], de: ['Hinzuf\u00fcgen', 'Hashimoto entfernen'], es: ['A\u00f1adir', 'Quitar Hashimoto'] };
  for (const l of ['en', 'de', 'es']) {
    const row = OE.rowHTML('conds', l, 'r2obOwnC');
    assert.match(row, new RegExp('data-r2own-add="conds"[^>]*>' + want[l][0] + '<'));
    assert.match(row, /<input[^>]*maxlength="40"[^>]*enterkeyhint="done"/);
    assert.match(row, /data-noi18n/);
    assert.match(row, /aria-label="[^"]+"/);
    const chip = OE.chipHTML('conds', 'Hashimoto', l);
    assert.match(chip, new RegExp('aria-label="' + want[l][1] + '"'));
    assert.match(chip, /data-noi18n/);
    assert.match(chip, /data-r2own-rm="conds" data-own="Hashimoto"/);
  }
  assert.match(OE.chipHTML('goals', '"><img src=x>', 'en'), /data-own="&quot; img src=x"/, 'quotes escaped, brackets stripped');
  assert.ok(OE.rowHTML('goals', 'de', 'x').includes('placeholder="Eigenes, z. B. besser schlafen"'));
  assert.ok(OE.rowHTML('conds', 'es', 'x').includes('placeholder="Lo tuyo, p. ej., Hashimoto"'));
});

function grab(re, what) { const m = html.match(re); assert.ok(m, 'index.html has ' + what); return m[0]; }

test('setup and Edit profile show the Add row under both lists; the Oct 23 condition note line stays separate', () => {
  assert(html.includes('<script src="own-entries.js?v='), 'module loaded');
  assert(html.indexOf('<script src="own-entries.js') < html.indexOf('function condBlock('), 'loaded before setup code');
  const sw = read('sw.js');
  assert.equal(sw.split('"own-entries.js"').length - 1, 2, 'in both service worker lists');
  assert(html.includes("ownChips(\"goals\", ob.ownGoals) + '</div>' + ownRow(\"goals\", \"r2obOwnG\")"), 'setup: I want');
  assert(html.includes("ownChips(\"goals\", own.goals) + '</div>' + ownRow(\"goals\", \"r2eOwnG\")"), 'Edit profile: Goals');
  const cb = grab(/function condBlock\([\s\S]*?\n\}/, 'condBlock');
  assert(cb.includes('ownRow("conds"'), 'look-out-for list gets the Add row');
  assert(cb.indexOf('ownRow("conds"') < cb.indexOf('condNoteHTML('), 'Add row sits with the chips, above the note line');
  assert(cb.includes('condNoteHTML(noteId, note)'), 'note line kept');
});

function world(state, dom) {
  const ctx = vm.createContext({ state, window: { LowiOwnEntries: OE }, $: () => null, document: { addEventListener() {} }, sessionStorage: { getItem: () => null, removeItem() {} } });
  vm.runInContext('const R2 = { S: () => state, save() {}, X: () => null, refreshMe() {}, toast() {}, applyTheme() {} }; let ob = null; const isCond = t => (["PCOS"]).includes(t); const esc = x => String(x); const ownFlush = () => {};', ctx);
  vm.runInContext(grab(/const CONDNOTE_MAX = 120;[\s\S]*?R2\.cleanCondNote = cleanCondNote;/, 'cleanCondNote'), ctx);
  vm.runInContext(grab(/function saveOb\(final\)\{[\s\S]*?\n\}/, 'saveOb'), ctx);
  return ctx;
}

test('saving setup keeps own entries on the phone; an own condition means "None of these" is off', () => {
  const s = { user: {}, health: {} }; const ctx = world(s);
  vm.runInContext('ob = ' + JSON.stringify({ step: 1, bday: '1996-03-09', name: 'T', avatar: '', tags: [], noCond: true, gender: 'f', ownGoals: ['besser schlafen'], ownConds: ['Hashimoto'] }) + '; saveOb(false);', ctx);
  assert.deepEqual(s.health.own, { goals: ['besser schlafen'], conds: ['Hashimoto'] });
  assert.equal(s.user.noCond, false);
  assert.equal(JSON.stringify(s.user).includes('Hashimoto'), false, 'nothing in the account part');
});

test('the page handles Add, Enter, remove, and None of these clears own conditions', () => {
  assert(html.includes('e.target.closest("[data-r2own-add]")'), 'Add button');
  assert(html.includes('e.target.closest("[data-r2own-rm]")'), 'remove chip');
  assert(/data-r2own-in[\s\S]{0,200}Enter|Enter[\s\S]{0,200}data-r2own-in/.test(html), 'Enter adds');
  assert(html.includes('$$("#r2ob .r2-conds [data-r2own-rm]").forEach(b => b.remove()); ob.ownConds = [];'), 'None clears own conditions in setup');
  assert(html.includes('$$(".r2-econd [data-r2own-rm]").forEach(b => b.remove());'), 'None clears own conditions in Edit profile');
  const yd = read('your-details.js');
  assert(yd.includes('ownOf(h).goals') && yd.includes('ownOf(h).conds'), 'Your details lists own entries');
});
