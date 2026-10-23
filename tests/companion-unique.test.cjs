// Companion one of a kind (Oct 24, 2026). Eman: "is it really randomized? Like nobody will ever get the same companion, right?"
// Before: the look came from birthday (+ time) alone, so two people born the same day got the same companion and name.
// Now a NEW companion also mixes in the account's own random salt (stored in the companion record, synced with the account).
// Older companions (records without salt) must stay exactly as they were: look, colours, name and the "New name" order.
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const C = require('../companion-birth-core.js');
const cb = read('companion-birth.js');

const LEGACY_SIG = 'bd951c4e804eb7ca984e2079279e79440c14d0b9a134cdef8c583e3dd7da3bd1'; /* sha256 over the v1 output of the pre-Oct-24 core */
const traits = c => { const l = c.look; return [c.sign, l.body, l.eyes, l.mouth, l.marks, l.aura, l.acc, l.parts, c.palette.a, c.palette.b, Math.round(l.size * 20), Math.round(l.squish * 20)].join('|'); };

test('older companions (no salt) are byte for byte what they were before Oct 24', () => {
    /* fingerprint of 12,000 v1 companions (looks, colours, names, shuffle positions) taken from the code before this change */
    const h = crypto.createHash('sha256');
    let d = new Date(Date.UTC(1950, 0, 1));
    for (let i = 0; i < 3000; i++) {
        const b = d.toISOString().slice(0, 10);
        for (const t of ['', '07:45']) for (const n of [0, 3]) h.update(JSON.stringify(C.generate({ bday: b, btime: t, n })));
        d = new Date(d.getTime() + 86400000 * 9);
    }
    assert.strictEqual(h.digest('hex'), LEGACY_SIG);
    const c = C.generate({ bday: '1990-03-05' });
    assert.strictEqual(c.v, 1); assert.strictEqual(c.salt, undefined); assert.strictEqual(c.name, 'Lotus');
    for (const bad of ['', null, 'x', 'has space!', 'ab', '<script>']) assert.deepStrictEqual(C.generate({ bday: '1990-03-05', salt: bad }), c, 'an invalid salt (' + bad + ') means the old companion');
});

test('same birthday, different accounts: different companions; same account: the same one on every device', () => {
    const a = C.generate({ bday: '1990-03-05', salt: 'acct0000aa' }), a2 = C.generate({ bday: '1990-03-05', salt: 'acct0000aa' });
    assert.deepStrictEqual(a, a2, 'deterministic per account (iPhone and iPad draw the same)');
    assert.strictEqual(a.v, 2); assert.strictEqual(a.salt, 'acct0000aa');
    const old = C.generate({ bday: '1990-03-05' });
    assert.strictEqual(a.sign, old.sign); assert.strictEqual(a.element, old.element); assert.strictEqual(a.rhythm, old.rhythm); assert.strictEqual(a.type, old.type);
    assert.deepStrictEqual(a.palette.base, old.palette.base, 'the birthday still decides the colour family');
    /* 3,000 people born on exactly the same day: no two near-identical companions (same parts, same colour, similar size) */
    const seen = new Set(), names = new Set();
    for (let i = 0; i < 3000; i++) { const c = C.generate({ bday: '1990-03-05', salt: 'acct' + String(i).padStart(6, '0') }); const k = traits(c); assert.ok(!seen.has(k), 'duplicate look at ' + i); seen.add(k); names.add(c.name); }
    assert.ok(names.size > 60, 'suggested names spread over the pool (' + names.size + ')');
});

test('salt: 64 random bits, safe characters, never two the same in 50,000', () => {
    const s = new Set();
    for (let i = 0; i < 50000; i++) { const x = C.newSalt(); assert.ok(C.validSalt(x) === x, x); s.add(x); }
    assert.strictEqual(s.size, 50000);
});

test('v2 art and colours stay well formed in every sign; shuffling names never changes the look', () => {
    for (const sg of C.SIGN_KEYS) for (let i = 0; i < 30; i++) {
        const b = '19' + (60 + i) + '-' + String(1 + C.SIGN_KEYS.indexOf(sg)).padStart(2, '0') + '-1' + (i % 9);
        const c = C.generate({ bday: b, salt: C.newSalt() });
        assert.ok(!/NaN|undefined/.test(C.svg(c, { size: 120 })));
        for (const k of ['a', 'b', 'deep']) assert.match(c.palette[k], /^#[0-9a-f]{6}$/);
        assert.ok(Math.abs(c.look.hue) <= 14 && Math.abs(c.look.lt) <= 0.04);
    }
    const c = C.generate({ bday: '1988-08-03', btime: '23:10', salt: 'shufflesalt1' }), names = [];
    for (let n = 0; n < 20; n++) { const s = C.generate({ bday: c.bday, btime: c.btime, n, salt: c.salt }); assert.deepStrictEqual(s.look, c.look); names.push(s.name); }
    assert.strictEqual(new Set(names).size, 20, 'no repeat while shuffling');
    for (const nm of names) assert.ok(C.namePool(c.sign, 2).includes(nm));
});

test('the extra names follow the same rules and only new companions use them', () => {
    const all = [].concat(...Object.values(C.NAMES), C.FRIENDLY);
    for (const nm of C.MORE_NAMES) { assert.ok(/^[A-Z][a-z]+$/.test(nm) && nm.length <= 10, nm); assert.ok(!all.includes(nm), nm + ' already in the pool'); assert.notStrictEqual(nm, 'Misty'); }
    assert.strictEqual(new Set(C.MORE_NAMES).size, C.MORE_NAMES.length);
    assert.strictEqual(C.namePool('leo').length, C.NAMES.fire.length + C.FRIENDLY.length, 'v1 pool unchanged');
    assert.strictEqual(C.namePool('leo', 2).length, C.NAMES.fire.length + C.FRIENDLY.length + C.MORE_NAMES.length);
});

test('no false promise: the code no longer claims two companions never share a shade, the app never says unique', () => {
    const core = read('companion-birth-core.js');
    assert.ok(!/never share the exact shade/.test(core));
    for (const f of ['companion-birth.js', 'companion-birth-core.js', 'herb-start.js']) assert.ok(!/einzigartig|unique companion|único/i.test(read(f).replace(/\/\*[\s\S]*?\*\//g, '')), f);
});

/* companion-birth.js in a tiny browser stand-in */
function boot(store) {
    const ls = new Map(Object.entries(store || {}));
    const any = () => { const e = { style: { setProperty() { } }, classList: { add() { }, remove() { } }, dataset: {}, addEventListener() { }, setAttribute() { }, getAttribute: () => null, appendChild() { }, querySelectorAll: () => [], focus() { } }; e.querySelector = () => e; return e; };
    const D = { readyState: 'complete', getElementById: () => null, querySelector: () => null, head: any(), createElement: any, addEventListener() { }, documentElement: { lang: 'en' } };
    const w = {
        document: D, LowiBirthCompanionCore: C, CustomEvent: function (t, o) { this.type = t; this.detail = o && o.detail; },
        localStorage: { getItem: k => (ls.has(k) ? ls.get(k) : null), setItem: (k, v) => ls.set(k, String(v)), removeItem: k => ls.delete(k) },
        LowiHerbIdentity: { autoName: () => 'Mossy', setCustomName() { } }, LowiHerbTamagotchi: { readPrefs: () => ({}) },
        addEventListener() { }, dispatchEvent() { }, requestAnimationFrame: () => 0, setTimeout: () => 0, matchMedia: () => ({ matches: true })
    };
    w.window = w;
    vm.runInNewContext(cb, w);
    return { B: w.LowiBirthCompanion, ls };
}

test('an existing companion is untouched: same look, same name, no salt added, also after rename and re-reveal', () => {
    const g = C.generate({ bday: '1990-05-12', btime: '', n: 2 });
    const rec = { v: 1, bday: '1990-05-12', btime: '', n: 2, name: 'Bubbles', created: 1 };
    const { B, ls } = boot({ 'lowispike.companion.v1': JSON.stringify(rec) });
    const c = B.get();
    assert.deepStrictEqual(c.look, g.look); assert.deepStrictEqual(c.palette, g.palette); assert.strictEqual(c.name, 'Bubbles'); assert.strictEqual(c.v, 1);
    const again = B.reveal(any0(), { bday: '1990-05-12', btime: '', instant: true });
    assert.deepStrictEqual(again.look, g.look, 'the Profile creator with the same birthday shows the very same companion');
    assert.strictEqual(again.salt, undefined);
    B.save(again); B.rename('Zed'); B.rename('');
    const after = JSON.parse(ls.get('lowispike.companion.v1'));
    assert.strictEqual(after.salt, undefined, 'no salt sneaks into an old record');
    assert.strictEqual(after.name, g.autoName, 'resetting the name gives the same suggestion as before');
    assert.strictEqual(ls.has('lowispike.companion.salt.v1'), false);
});
function any0() { const e = { style: { setProperty() { } }, classList: { add() { }, remove() { } }, addEventListener() { }, setAttribute() { }, querySelectorAll: () => [] }; e.querySelector = () => e; return e; }

test('a new companion gets the account salt, keeps it through a reload mid-reveal, and a synced device draws the same one', () => {
    const p = boot({});
    const c1 = p.B.reveal(any0(), { bday: '1990-03-05', btime: '', instant: true });
    assert.strictEqual(c1.v, 2); assert.ok(C.validSalt(c1.salt));
    assert.strictEqual(p.ls.get('lowispike.companion.salt.v1'), c1.salt, 'the salt is stored at once');
    const c1b = p.B.reveal(any0(), { bday: '1990-03-05', btime: '', instant: true });
    assert.deepStrictEqual(c1b.look, c1.look, 'a reload in the middle of the reveal shows the same companion');
    p.B.save(c1);
    const rec = JSON.parse(p.ls.get('lowispike.companion.v1'));
    assert.strictEqual(rec.salt, c1.salt);
    /* the iPad gets the same lowispike.* keys through the account backup / sync */
    const ipad = boot({ 'lowispike.companion.v1': p.ls.get('lowispike.companion.v1'), 'lowispike.companion.salt.v1': p.ls.get('lowispike.companion.salt.v1') });
    const c2 = ipad.B.get();
    assert.deepStrictEqual(c2.look, c1.look); assert.deepStrictEqual(c2.palette, c1.palette); assert.strictEqual(c2.name, c1.name);
    /* even if only the companion record came over, the salt inside it is enough */
    const ipad2 = boot({ 'lowispike.companion.v1': p.ls.get('lowispike.companion.v1') });
    assert.deepStrictEqual(ipad2.B.get().look, c1.look);
    /* someone else, same birthday, own account: a different companion */
    const other = boot({}).B.reveal(any0(), { bday: '1990-03-05', btime: '', instant: true });
    assert.notStrictEqual(other.salt, c1.salt); assert.notStrictEqual(traits(other), traits(c1));
    /* an old companion whose owner picks a new birthday: a new companion, now with a salt */
    const legacy = boot({ 'lowispike.companion.v1': JSON.stringify({ v: 1, bday: '1985-01-01', btime: '', n: 0, name: 'Ember', created: 1 }) });
    const nc = legacy.B.reveal(any0(), { bday: '1985-07-07', btime: '', instant: true });
    assert.strictEqual(nc.v, 2);
});
