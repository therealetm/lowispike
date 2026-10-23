// Birth companion (Oct 16, 2026): every user's companion is born from their birthday (+ optional birth time).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const C = require('../companion-birth-core.js');

test('formula is deterministic: same birthday and time give the same companion', () => {
  const a = C.generate({ bday: '1994-02-27', btime: '06:30' }), b = C.generate({ bday: '1994-02-27', btime: '6:30' });
  assert.deepStrictEqual(a, b);
  assert.strictEqual(a.sign, 'pisces');
  assert.strictEqual(a.seed, C.fnv('1994-02-27|06:30'));
  const noTime = C.generate({ bday: '1994-02-27' });
  assert.notDeepStrictEqual(noTime.look, a.look, 'the birth time changes the look');
  assert.strictEqual(C.generate({ bday: 'nope' }), null);
  assert.strictEqual(C.generate({ bday: '1994-02-30' }), null);
});

test('star sign edges match the app zodiac', () => {
  const cases = { '2000-03-20': 'pisces', '2000-03-21': 'aries', '2000-12-21': 'sagittarius', '2000-12-22': 'capricorn', '2000-01-19': 'capricorn', '2000-01-20': 'aquarius', '2000-02-18': 'aquarius', '2000-02-19': 'pisces', '2000-07-22': 'cancer', '2000-07-23': 'leo' };
  for (const [d, s] of Object.entries(cases)) assert.strictEqual(C.signOf(d), s, d);
});

test('nearly everyone looks different: 20 000 birthdays give almost 20 000 looks', () => {
  const seen = new Set();
  let d = new Date(Date.UTC(1950, 0, 1));
  for (let i = 0; i < 20000; i++) { const b = d.toISOString().slice(0, 10); const c = C.generate({ bday: b }); seen.add(c.sign + JSON.stringify(c.look) + c.palette.a); d = new Date(d.getTime() + 864e5); }
  assert.ok(seen.size > 19900, 'unique looks: ' + seen.size);
});

test('personality = element x rhythm x modality, defined for every combination in en/de/es', () => {
  const rh = ['04:00', '07:00', '13:00', '20:00'];
  const titles = new Set();
  for (const s of C.SIGN_KEYS) {
    const day = { aries: '04-01', taurus: '05-01', gemini: '06-01', cancer: '07-01', leo: '08-01', virgo: '09-01', libra: '10-01', scorpio: '11-01', sagittarius: '12-01', capricorn: '01-01', aquarius: '02-01', pisces: '03-01' }[s];
    for (const t of rh) {
      const c = C.generate({ bday: '1990-' + day, btime: t });
      assert.strictEqual(c.sign, s);
      for (const l of C.LANGS) { const p = C.personality(c, l); assert.ok(p.title && p.line.length > 20, s + t + l); titles.add(l + p.title); }
    }
  }
  assert.strictEqual(titles.size, 16 * 3, '4 elements x 4 rhythms, in 3 languages');
  assert.strictEqual(C.rhythmOf('1990-01-01', '05:00'), 'dawn');
  assert.strictEqual(C.rhythmOf('1990-01-01', '23:30'), 'night');
});

test('names: friendly pet-style names (no medical-sounding syllables); shuffle walks a seed-fixed order, never changes the look', () => {
  /* Oct 23 (Emmanuel): the old metabolic/cellular names sounded like diseases or medications */
  const c = C.generate({ bday: '1988-08-03', btime: '23:10' });
  const names = [];
  for (let n = 0; n < 12; n++) { const s = C.generate({ bday: c.bday, btime: c.btime, n }); names.push(s.name); assert.deepStrictEqual(s.look, c.look); assert.deepStrictEqual(s.palette, c.palette); assert.ok(/^[A-Z][a-z]+$/.test(s.name), s.name); assert.ok(s.name.length <= 10); }
  assert.strictEqual(new Set(names).size, 12, 'no repeat while shuffling: ' + names.join(', '));
  const pool = C.namePool('leo');
  for (const nm of names) assert.ok(pool.includes(nm), nm + ' comes from the fire + friendly pool');
  const bad = /^(mito|glyco|cyto|ribo|insu|lepti|kreb|keto|endo|lyso|myo|axo|vesi|lipo|enzy|hemo|gluca|nucle)|(cyte|zyme|dria|plast)$/i;
  for (const el of Object.keys(C.NAMES)) for (const nm of C.NAMES[el].concat(C.FRIENDLY)) assert.ok(!bad.test(nm), nm + ' sounds medical');
  assert.strictEqual(new Set(C.FRIENDLY.concat(...Object.values(C.NAMES))).size, C.FRIENDLY.length + Object.values(C.NAMES).reduce((a, x) => a + x.length, 0), 'no duplicate names');
  assert.ok(!C.FRIENDLY.concat(...Object.values(C.NAMES)).includes('Misty'), 'Misty stays the fallback');
  assert.strictEqual(C.nameFor(c.seed, c.sign, 3), C.nameFor(c.seed, c.sign, 3));
  assert.notStrictEqual(C.generate({ bday: '1994-03-10' }).name, undefined);
});

test('art: one well-formed glass-bubble SVG, different for different birthdays, plus the unrevealed mystery spark', () => {
  const a = C.svg(C.generate({ bday: '1994-02-27' })), b = C.svg(C.generate({ bday: '2001-11-12' }));
  for (const s of [a, b]) { assert.ok(s.startsWith('<svg') && s.endsWith('</svg>')); assert.ok(s.includes('lc-bubble') && s.includes('lc-shape')); assert.ok(!/NaN|undefined/.test(s)); }
  assert.notStrictEqual(a.replace(/lc\d+x\d+/g, ''), b.replace(/lc\d+x\d+/g, ''));
  const m = C.mysterySVG();
  assert.ok(m.includes('lc-mystery') && !m.includes('lc-face'), 'the mystery entity has no face');
  for (const s of C.SIGN_KEYS) for (let i = 0; i < 40; i++) assert.ok(!/NaN|undefined/.test(C.svg(C.generate({ bday: '19' + (50 + i) + '-' + String(1 + C.SIGN_KEYS.indexOf(s)).padStart(2, '0') + '-1' + (i % 9) }))));
});

test('companion copy is gender-neutral in en/de/es (an entity, not she or he)', () => {
  const page = read('companion-birth.js'), core = read('companion-birth-core.js'), gate = read('herb-start.js');
  const block = (src, from, to) => src.slice(src.indexOf(from), src.indexOf(to, src.indexOf(from)));
  const tx = block(page, 'const TX={', 'const t=(k,o)');
  const en = [block(tx, 'en:{', 'de:{'), block(core, 'const CORE={', 'de:{'), block(gate, 'en:{', 'de:{')];
  for (const s of en) assert.ok(!/\b(she|her|hers|herself|he|him|his|himself)\b/i.test(s), 'English pronoun in: ' + s.slice(0, 60));
  const de = [block(tx, 'de:{', 'es:{'), block(gate, 'de:{', 'es:{')];
  for (const s of de) assert.ok(!/\b(sie|ihre?|ihren|ihrem|er|ihn)\b/.test(s.replace(/^de:\{/, '').replace('der ihn erledigt', '') /* 'ihn' there is the app part, not the companion */), 'German she/he pronoun');
  const es = [block(tx, 'es:{', '}};'), block(gate, 'es:{', '};')];
  for (const s of es) assert.ok(!/\b(ella|él|lista|cansada|orgullosa|encantad[oa]|dirigirla)\b/i.test(s), 'Spanish gendered word');
  for (const l of ['de', 'es']) for (const k of ['fire', 'earth', 'air', 'water']) assert.ok(!/\b(sie|er|ella|él)\b/i.test(C.personality(C.generate({ bday: '1990-04-01' }), l).line));
  // the app-wide sweep
  assert.ok(read('misty-hub.js').includes("T('How it evolves', 'Wie es sich entwickelt'"));
  assert.ok(!/Estoy orgullosa|demasiado cansada|Toca para dirigirla/.test(read('herb-tamagotchi-core.js') + read('herb-identity-core.js') + read('sun-meter.js') + read('misty-pad.js')));
  assert.ok(!/'[^'\n]*(flies on her own|steer her|Her style|She evolves|She keeps glowing)/.test(read('misty-pad.js') + read('companion.js')));
});

test('wiring: shared API, onboarding reveal after the birthday, optional birth time, Profile, offline cache', () => {
  const page = read('companion-birth.js');
  assert.ok(/window\.LowiBirthCompanion=\{KEY,(SALT_KEY,)?get:getCompanion,getCompanion,has,save,personality,svg/.test(page));
  assert.ok(page.includes('window.getCompanion=getCompanion;'));
  assert.ok(page.includes("KEY='lowispike.companion.v1'") && page.includes("'lowi:companion'"));
  assert.ok(/Object\.assign\(\{\},C\.MISTY\)/.test(page), 'Misty stays the fallback for existing users');
  assert.ok(page.includes('LowiHerbIdentity.setCustomName(rec.name)'), 'the name reaches every place that shows the companion name');
  const html = read('index.html');
  assert.ok(html.includes('<input id="r2obT" type="time"'));
  assert.ok(/if \(ob\.step === 0 && window\.LowiBirthCompanion && LowiBirthCompanion\.reveal\)/.test(html));
  assert.ok(html.includes('["Birth time (optional)", "Geburtszeit (optional)", "Hora de nacimiento (opcional)"]'));
  const ui = read('apple-ui.js');
  assert.ok(ui.indexOf("'companion-birth-core.js','companion-birth.js','herb-start.js'") > 0);
  const sw = read('sw.js');
  for (const f of ['companion-birth-core.js', 'companion-birth.js', 'companion-birth.css']) assert.ok((sw.match(new RegExp('"' + f.replace('.', '\\.') + '"', 'g')) || []).length >= 2, f + ' cached');
});
