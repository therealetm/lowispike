'use strict';
/* Affiliates page (affiliates/), simplified 21 Oct 2026: link comes from Eman on WhatsApp, pick Webdesign or UGC, get the baseline
   script (Burak's proven structure) with shot list and caption, see the commission levels. No forms, shuffle, tracking or sales entry. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const B = require('../affiliates/blueprint-core.js');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

test('two series: Webdesign (AI Website Client System) and UGC (AI Sponsoren-Agent), same price, own keyword', () => {
  assert.deepEqual(B.ORDER, ['webdesign', 'ugc', 'lowispike']); // third track: the 30-day LOWiSPIKE shuffle challenge (21 Oct)
  assert.equal(B.SERIES.webdesign.product, 'AI Website Client System'); assert.equal(B.SERIES.webdesign.keyword, 'Webdesign');
  assert.equal(B.SERIES.ugc.product, 'AI Sponsoren-Agent'); assert.equal(B.SERIES.ugc.keyword, 'Sponsor');
  assert.equal(B.SERIES.webdesign.price, 99); assert.equal(B.SERIES.ugc.price, 99);
});

test('each script is complete: on-screen title, talking head opening, laptop scenes, outro with the keyword CTA', () => {
  for (const id of B.ORDER) {
    const s = B.SERIES[id];
    assert.match(s.onScreen, id === 'lowispike' ? /^Tag \[X\] \u00b7 \[Ziel\] Kilo weniger in \[Zeitraum\]/ : /^Tag \[X\] auf dem Weg zu 30\.000/);
    assert.equal(s.scenes[0].shot, 'talk'); assert.equal(s.scenes.at(-1).shot, 'outro');
    assert.ok(s.scenes.slice(1, -1).every(x => x.shot === 'screen' || (id === 'lowispike' && (x.shot === 'cook' || x.shot === 'talk'))));
    assert.ok(s.scenes.every(x => x.lines.length && x.lines.every(l => l.trim().length > 0)));
    assert.ok(s.scenes.at(-1).lines.join(' ').includes('\u201e' + s.keyword + '\u201c'));
    assert.ok(s.caption.includes('\u201e' + s.keyword + '\u201c') && /#werbung/.test(s.caption), 'caption carries keyword and ad label');
    assert.ok(s.shots.length === 3 && s.shots[1].beats.length >= 4, 'short shot list');
    const t = B.scriptText(id);
    assert.ok(t.startsWith('Text auf dem Bildschirm: ' + s.onScreen));
    for (const x of s.scenes) assert.ok(t.includes('[' + x.label + ']') && t.includes(x.lines.join(' ')));
  }
});

test('Webdesign follows Burak\'s series: Lead-Skill, Website-Skill, Proposal-Skill, e-mail, "Lande ich den Kunden"', () => {
  const t = B.scriptText('webdesign');
  for (const k of ['Tag [X] meiner Challenge, diesen Monat 30.000 Euro mit Websites zu machen.', 'Lead-Skill', 'Website-Skill', 'Und das ist das Ergebnis.', 'Proposal-Skill', 'per E-Mail an den Besitzer', 'Glaubt ihr, dass ich damit den Kunden lande?', '[Branche]'])
    assert.ok(t.includes(k), k);
  assert.ok(!/Sponsor|PDF/.test(t));
});

test('UGC follows the Sponsoren-Agent series: sponsors, brand, offer, learning, Agency-Skill, Tag 30 outro', () => {
  const t = B.scriptText('ugc');
  for (const k of ['[Anzahl] potenzielle Sponsoren', '[Marke]', '[Videoidee]', '[Preis] Euro', 'Merkt euch:', 'Agency-Skill', 'an Tag 30', 'Kommentiert \u201eSponsor\u201c'])
    assert.ok(t.includes(k), k);
  assert.ok(!/Webdesign|Website-Skill/.test(t));
});

test('no fill-in gaps, no sample brands or invented numbers in the template', () => {
  for (const id of B.ORDER) {
    const t = B.scriptText(id) + B.SERIES[id].caption;
    assert.ok(!/FEHLT|fehlt/.test(t));
    assert.ok(!/DockPilot|Lovable|HitPaw|Bohnenwerk|Friseur|Juwel/.test(t), id + ' leaks a sample');
    assert.ok(B.placeholders(id).length >= 1 && B.placeholders(id).every(p => /^\[[^\]]+\]$/.test(p)));
  }
  assert.deepEqual(B.placeholders('ugc'), ['[X]', '[Anzahl]', '[Produkt]', '[Marke]', '[Videoidee]', '[Preis]']);
});

test('levels from the partner dashboard: 10 / 15 / 25 / 45 %, each sale paid at the level it falls in', () => {
  assert.deepEqual([1, 10, 11, 50, 51, 150, 151, 999].map(B.rateFor), [0.1, 0.1, 0.15, 0.15, 0.25, 0.25, 0.45, 0.45]);
  assert.deepEqual(B.levels().map(l => [l.level, l.range, l.pct, l.perSale]), [[1, '1\u201310', '10\u00a0%', 9.9], [2, '11\u201350', '15\u00a0%', 14.85], [3, '51\u2013150', '25\u00a0%', 24.75], [4, 'ab 151', '45\u00a0%', 44.55]]);
  assert.equal(B.totalFor(3), 29.7); /* Burak's three sales */
  assert.equal(B.totalFor(10), 99); assert.equal(B.totalFor(12), 128.7);
  assert.equal(B.totalFor(50), 693); assert.equal(B.totalFor(150), 3168); assert.equal(B.totalFor(200), 5395.5);
  assert.deepEqual(B.examples().map(e => [e.sales, e.total, e.level]), [[10, 99, 1], [50, 693, 2], [150, 3168, 3], [200, 5395.5, 4]]);
  assert.equal(B.eur(3168), '3.168,00\u00a0\u20ac'); assert.equal(B.eur(9.9), '9,90\u00a0\u20ac');
});

test('page: WhatsApp line on top, two cards, tip, earnings; the old tools are gone', () => {
  const html = read('affiliates/index.html'), js = read('affiliates/blueprint.js'), core = read('affiliates/blueprint-core.js'), all = html + js + core;
  assert.ok(html.includes('Deinen pers\u00f6nlichen Affiliate-Link bekommst du direkt von Eman per WhatsApp.'));
  assert.match(html, /id="seriesCards"/); assert.match(html, /id="scriptView"/); assert.match(html, /id="earnView"/);
  assert.ok(/HeyGen/.test(html) && /Higgsfield/.test(html) && /Pers\u00f6nlichkeit/.test(html) && /kostenlos/.test(html));
  assert.equal(B.t('de', 'copyScript'), 'Skript kopieren'); assert.equal(B.t('de', 'copyCaption'), 'Caption kopieren'); // texts live in blueprint-core STRINGS (EN/DE/ES) since the page follows the app language
  for (const gone of ['Link kopieren', 'Beacons', 'Zufall l\u00e4uft', 'Fakten von heute', 'Tag 1 von 30', 'Als gepostet', 'Meine Zahlen', 'Sponsoren-Agent:', 'type="url"', 'addSale', 'checklist', 'Noch '])
    assert.ok(!all.includes(gone), 'still has: ' + gone);
  // localStorage is back on purpose (21 Oct): it only holds the app language and the affiliate's own id for the share link
  assert.ok(!/localStorage\.setItem\((?!k)/.test(js), 'no other saved data');
  assert.ok(!/wa\.me|api\.whatsapp/.test(all), 'no invented WhatsApp number');
});

test('start screen fits one iPhone screen: the round button sits in the bar, no empty strip kept for it, short-screen rules', () => {
  const html = read('affiliates/index.html'), css = read('affiliates/blueprint.css');
  const bar = html.slice(html.indexOf('<div class="bar">'), html.indexOf('<div class="hero">'));
  assert.ok(bar.includes('id="fabEarn"'), 'the round button is inside the start bar');
  assert.ok(!/\.fab\{[^}]*position:absolute/.test(css), 'the round button no longer floats over the bottom of the screen');
  assert.ok(!/\.hero\{[^}]*0 72px\}/.test(css), 'no 72 px strip kept at the bottom');
  assert.match(css, /@media \(max-height:760px\)\{[^]*#viewStart \.hero/, 'short screens tighten the start screen');
  assert.match(css, /#viewStart \.linkline\{[^}]*margin-bottom:0/, 'the last line adds no hidden margin below it');
});

test('pages: shareable, private, branded, and the app tabs point at them', () => {
  const a = read('affiliates/index.html'), c = read('create/index.html');
  for (const [f, html] of [['affiliates', a], ['create', c]]) {
    assert.match(html, new RegExp('<link rel="canonical" href="https://therealetm.github.io/lowispike/' + f + '/">'));
    assert.match(html, /og:image/); assert.match(html, /viewport-fit=cover/); assert.ok(!/console\.log/.test(html));
  }
  assert.match(a, /<meta name="robots" content="noindex">/);
  assert.ok(!/fetch\(|XMLHttpRequest|sendBeacon/.test(read('affiliates/blueprint.js') + read('affiliates/blueprint-core.js')), 'the page sends nothing anywhere');
  assert.ok(!/innerHTML/.test(read('affiliates/blueprint.js')), 'text never becomes HTML');
  const ui = read('community-rooms-ui.js');
  assert.match(ui, /create:'create\/',aff:'affiliates\/'/);
  // tabs are built from the user's saved order (community-tab-order.js), so check the default order and the generated button
  assert.match(ui, /\['room','chat','fy','studio','rank'\]/);   /* 23 Oct: Ranking joined the bar; 24 Oct: For You + Studio (Affiliates | Creation) */
  assert.match(ui, /tabOrder\(\)\.map\(k=>'<button type="button" role="tab" class="rm-tab" data-rm="'\+k\+'"><\/button>'\)/);
  assert.match(ui, /a==='create'\|\|a==='aff'\|\|a==='rank'\|\|a==='fy'\|\|a==='studio'\)showView\(a\)/);
  assert.match(ui, /data-rmsw="'\+k\+'"/, 'Studio opens Affiliates or Creation with its small switch');
  const S = require('../scripts/site-files.cjs'), pub = new Set(S.list(root));
  for (const f of ['affiliates/index.html', 'affiliates/blueprint.js', 'affiliates/blueprint-core.js', 'affiliates/blueprint.css', 'create/index.html']) assert.ok(pub.has(f), f + ' is published');
});

test('service worker: other pages never replace the saved app shell', () => {
  const sw = read('sw.js');
  assert.match(sw, /function isShell\(url\)\{ return url\.pathname === scopePath \|\| url\.pathname === scopePath \+ "index\.html"; \}/);
  assert.match(sw, /if \(req\.mode === "navigate" && !isShell\(url\)\) return;/);
});
