'use strict';
/* Affiliates · Master Blueprint (affiliates/): one series shell, product-only differences, honest numbers, reference tiers. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const B = require('../affiliates/blueprint-core.js');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

const fullWebsite = { pick: 'juwelier', city: 'Flensburg', leads: '7', business: 'Goldschmiede Hansen' };
const fullSponsor = { pick: 'Kaffee', contacted: '12', brand: 'Bohnenwerk', idea: 'drei Hooks für ihr neues Abo', price: '250', learning: 'Nenne immer einen festen Preis', replies: '2' };

test('German numbers are spelled out the way they are spoken', () => {
  const want = { 0: 'null', 1: 'eins', 7: 'sieben', 12: 'zwölf', 21: 'einundzwanzig', 30: 'dreißig', 99: 'neunundneunzig', 101: 'einhunderteins', 121: 'einhunderteinundzwanzig', 1000: 'eintausend', 1500: 'eintausendfünfhundert', 2021: 'zweitausendeinundzwanzig', 30000: 'dreißigtausend' };
  for (const n of Object.keys(want)) assert.equal(B.numberWords(Number(n)), want[n]);
  assert.equal(B.euroWords(250), 'zweihundertfünfzig Euro');
  assert.equal(B.euroWords(249.5), 'zweihundertneunundvierzig Euro fünfzig');
  assert.equal(B.euroWords(1), 'einen Euro');
  assert.equal(B.parseNum('1.500'), 1500); assert.equal(B.parseNum('249,50'), 249.5); assert.equal(B.parseNum('abc'), null); assert.equal(B.parseNum(''), null);
  assert.equal(B.parseNum('2,5', { int: true }), null);
});

test('both products share one series shell: same on-screen challenge, same opening and outro shots', () => {
  for (const d of [1, 2, 17]) {
    const w = B.buildScript('website', d, fullWebsite), s = B.buildScript('sponsor', d, fullSponsor);
    assert.equal(w.onScreen, s.onScreen);
    assert.match(w.onScreen, new RegExp('30\\.000 € in einem Monat mit ChatGPT · Tag ' + d + '/30'));
    assert.equal(w.sections[0].shot, 'talk'); assert.equal(s.sections[0].shot, 'talk');
    assert.equal(w.sections.at(-1).shot, 'outro'); assert.equal(s.sections.at(-1).shot, 'outro');
    assert.ok(w.sections.slice(1, -1).some(x => x.shot === 'screen') && s.sections.slice(1, -1).some(x => x.shot === 'screen'));
  }
});

test('switching product loads that product\'s workflow, keyword and CTA', () => {
  const w = B.buildScript('website', 1, fullWebsite).text, s = B.buildScript('sponsor', 1, fullSponsor).text;
  for (const k of ['Lead-Skill', 'Website-Skill', 'Proposal-Skill', 'Lande ich den Kunden?', '„Webdesign“']) assert.ok(w.includes(k), k);
  for (const k of ['Sponsor', 'PDF']) assert.ok(!w.includes(k), 'website script mentions ' + k);
  assert.ok(s.includes('Erster Tag, an dem ChatGPT autonom zwölf Sponsoren angeschrieben hat.'));
  assert.ok(s.includes('Heute highlighten wir Bohnenwerk.'));
  assert.ok(s.includes('Das heutige Learning aus der PDF, die meine ChatGPT-Agentur nutzt: Nenne immer einen festen Preis.'));
  assert.ok(s.includes('Preis im Angebot: zweihundertfünfzig Euro.'));
  assert.ok(s.includes('Bisher haben zwei Marken geantwortet.'));
  assert.ok(s.endsWith('Folgt mir, um herauszufinden, welche Antworten wirklich Geld wert sind, und kommentiert „Sponsor“ für meinen PDF Agency Skill.'));
  assert.ok(!s.includes('Website-Skill') && !s.includes('Webdesign'));
  assert.ok(B.buildScript('sponsor', 3, fullSponsor).text.startsWith('Erneuter Tag, an dem ChatGPT autonom zwölf Sponsoren angeschrieben hat.'));
  assert.ok(B.buildScript('sponsor', 3, Object.assign({}, fullSponsor, { contacted: '1', replies: '1' })).text.includes('autonom einen Sponsor angeschrieben hat. '.trim()));
});

test('a website day talks about one industry only, in every line', () => {
  for (const ind of B.INDUSTRIES) {
    const s = B.buildScript('website', 1, { pick: ind.id, leads: '3' });
    assert.ok(s.ready, ind.id);
    for (const other of B.INDUSTRIES) if (other.id !== ind.id) {
      const hit = [other.one, other.many].filter(w => !ind.one.includes(w) && !ind.many.includes(w) && s.text.includes(w));
      assert.deepEqual(hit, [], ind.id + ' script mentions ' + other.id);
    }
    assert.ok(B.agentPrompt('website', { pick: ind.id }).includes(ind.many));
    assert.ok(B.shotList('website', 1, { pick: ind.id })[1].beats.join(' ').includes(ind.many));
  }
  /* the sample that mixed a jeweller with a hairdresser is caught */
  const p = B.factProblems('website', 1, { pick: 'juwelier', business: 'Friseur Müller' });
  assert.equal(p.length, 1); assert.equal(p[0].k, 'business'); assert.match(p[0].msg, /Friseursalon/);
  assert.deepEqual(B.factProblems('website', 1, { pick: 'juwelier', business: 'Juwelier Hansen' }), []);
});

test('missing facts stay visible gaps; nothing is invented', () => {
  const s = B.buildScript('sponsor', 1, {});
  assert.equal(s.ready, false);
  assert.deepEqual(s.missing.sort(), ['brand', 'contacted', 'idea', 'learning', 'price', 'replies']);
  assert.ok(s.text.includes(B.GAP));
  assert.ok(!/\b(zwölf|drei|fünf|zehn|Lovable|HitPaw|DockPilot)\b/.test(s.text), 'no sample brands or numbers leak in');
  const w = B.buildScript('website', 1, { pick: 'friseur' });
  assert.deepEqual(w.missing, ['leads']); assert.ok(w.text.includes('Er hat ' + B.GAP + ' Treffer gefunden.'));
  /* zero sponsors contacted cannot carry the hook; zero replies is a real fact */
  assert.ok(B.missingFacts('sponsor', 1, Object.assign({}, fullSponsor, { contacted: '0' })).includes('contacted'));
  assert.ok(B.buildScript('sponsor', 1, Object.assign({}, fullSponsor, { replies: '0' })).text.includes('Bisher hat noch keine Marke geantwortet.'));
  /* the email line says what really happened */
  assert.ok(B.buildScript('website', 1, fullWebsite).text.includes('Den schicke ich jetzt per E-Mail raus.'));
  assert.ok(B.buildScript('website', 1, Object.assign({ emailSent: true }, fullWebsite)).text.includes('Den habe ich per E-Mail verschickt.'));
  /* yesterday's update only from day 2, naming yesterday's business */
  assert.ok(!B.buildScript('website', 1, Object.assign({ update: 'won' }, fullWebsite)).text.includes('zugesagt'));
  assert.ok(B.buildScript('website', 2, Object.assign({ update: 'won' }, fullWebsite), { business: 'Juwelier Hansen' }).text.includes('Juwelier Hansen hat zugesagt.'));
  /* no digits in the spoken lines */
  for (const x of B.buildScript('sponsor', 12, fullSponsor).sections) assert.ok(!/\d/.test(x.lines.join(' ')), x.id);
});

test('shot list: talking head with iPad, one continuous laptop take, talking head with iPad', () => {
  for (const p of ['website', 'sponsor']) {
    const sh = B.shotList(p, 1, {});
    assert.deepEqual(sh.map(s => s.kind), ['talk', 'screen', 'outro']);
    assert.match(sh[0].how, /iPad/); assert.match(sh[2].how, /iPad/); assert.match(sh[1].how, /ElevenLabs/);
  }
  assert.equal(B.shotList('sponsor', 2, { update: 'won' }).length, 4);
});

test('affiliate links: own link per product, product checked, partner ID required', () => {
  const sp = 'https://shop.beacons.ai/emanuristic/' + B.SPONSOR_PRODUCT_ID;
  const aff = '?affiliateLinkId=11111111-2222-4333-8444-555555555555';
  assert.equal(B.checkLink('sponsor', sp + aff).ok, true);
  assert.equal(B.checkLink('sponsor', sp).level, 'warn');
  assert.equal(B.checkLink('website', sp + aff).ok, false, 'the Sponsoren-Agent link is not the website product');
  assert.equal(B.checkLink('sponsor', 'https://shop.beacons.ai/emanuristic/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' + aff).ok, false);
  assert.equal(B.checkLink('website', 'https://shop.beacons.ai/emanuristic/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' + aff).ok, true);
  assert.equal(B.checkLink('website', 'http://evil.example/emanuristic/x').ok, false);
  assert.equal(B.checkLink('website', '').level, 'empty');
  /* no affiliate ID is baked into the page */
  for (const f of ['affiliates/index.html', 'affiliates/blueprint.js', 'affiliates/blueprint-core.js']) assert.ok(!/affiliateLinkId=[0-9a-f]{8}/i.test(read(f)), f);
  const st = B.fresh(); assert.deepEqual(st.links, { website: '', sponsor: '' });
});

test('checklist persists per product and day and ticks itself from real state', () => {
  let st = B.fresh();
  assert.equal(B.checklist(st, 'website', 1).done, 1);
  st.days.website['1'] = { facts: fullWebsite, checks: { recOpen: true, bogus: true }, post: { url: 'https://www.tiktok.com/@x/video/1', date: '2026-10-21' } };
  st.links.website = 'https://shop.beacons.ai/emanuristic/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee?affiliateLinkId=11111111-2222-4333-8444-555555555555';
  const store = { m: {}, getItem(k) { return this.m[k] || null; }, setItem(k, v) { this.m[k] = v; } };
  B.save(store, st); st = B.load(store);
  const c = B.checklist(st, 'website', 1);
  assert.equal(c.total, B.CHECKS.length);
  assert.deepEqual(c.items.filter(i => i.done).map(i => i.k), ['product', 'link', 'facts', 'recOpen', 'posted']);
  assert.ok(!('bogus' in st.days.website['1'].checks));
  assert.equal(B.checklist(st, 'sponsor', 1).done, 1, 'the other product has its own list');
  assert.equal(B.checklist(st, 'website', 2).done, 2, 'day two starts fresh (link stays)');
  /* broken or hostile storage falls back safely */
  assert.deepEqual(B.load({ getItem: () => '{not json' }), B.fresh());
  const bad = B.sanitize({ product: 'x', days: { website: { '999': {}, '2': { post: { url: 'javascript:alert(1)' } } } }, sales: [{ product: 'website', amount: -5, date: '2026-10-01' }] });
  assert.equal(bad.product, 'website'); assert.equal(bad.days.website['999'], undefined); assert.equal(bad.days.website['2'].post, null); assert.equal(bad.sales.length, 0);
});

test('funnel: valid denominators, confirmed only, no double counting', () => {
  const st = B.fresh();
  let f = B.funnel(st);
  assert.equal(f.posts, 0); assert.equal(f.clicks, null); assert.equal(f.clicksPerPost, null); assert.equal(f.salesPerClick, null);
  st.days.website['1'] = { facts: {}, checks: {}, post: { url: 'https://t/1', date: '2026-10-21' } };
  st.days.website['2'] = { facts: {}, checks: {}, post: { url: 'https://t/2', date: '2026-10-22' } };
  st.days.sponsor['1'] = { facts: {}, checks: {}, post: null };
  assert.ok(B.setClicks(st, 'website', '0', '2026-10-21').ok);
  f = B.funnel(st, 'website');
  assert.equal(f.posts, 2); assert.equal(f.clicks, 0); assert.equal(f.clicksPerPost, 0); assert.equal(f.salesPerClick, null, 'no rate over zero clicks');
  assert.equal(B.funnel(st).clicks, null, 'total needs clicks for both products');
  assert.equal(B.setClicks(st, 'website', '12,5').ok, false);
  B.setClicks(st, 'website', '40', '2026-10-21'); B.setClicks(st, 'sponsor', '10', '2026-10-21');
  assert.ok(B.addSale(st, { product: 'website', amount: '99', date: '2026-10-02', status: 'confirmed', ref: 'A1' }).ok);
  assert.equal(B.addSale(st, { product: 'website', amount: '99', date: '2026-10-03', status: 'confirmed', ref: 'a1' }).ok, false, 'same order twice');
  assert.equal(B.addSale(st, { product: 'website', amount: '99', date: '2026-10-03', status: 'confirmed', ref: '' }).ok, false, 'confirmed needs an order number');
  assert.ok(B.addSale(st, { product: 'sponsor', amount: '99', date: '2026-10-04', status: 'reported' }).ok);
  assert.equal(B.addSale(st, { product: 'sponsor', amount: '99', date: '2099-01-01', status: 'reported' }, '2026-10-21').ok, false, 'no future sales');
  f = B.funnel(st);
  assert.equal(f.confirmed, 1); assert.equal(f.reported, 1); assert.equal(f.clicks, 50); assert.equal(f.clicksPerPost, 25); assert.equal(f.salesPerClick, 0.02);
  B.setClicks(st, 'website', '0', '2026-10-21');
  f = B.funnel(st, 'website'); assert.equal(f.salesPerClick, null); assert.ok(f.warnings.some(w => /veraltet/.test(w)));
});

test('reference tiers: Burak\'s three sales give 29,70 €; each sale is paid at the tier it falls in', () => {
  const st = B.fresh();
  ['2026-10-01', '2026-10-09', '2026-10-14'].forEach((d, i) => B.addSale(st, { product: 'website', amount: 99, date: d, status: 'confirmed', ref: 'B' + i }));
  B.addSale(st, { product: 'website', amount: 99, date: '2026-10-15', status: 'reported' });
  let e = B.earnings(st);
  assert.equal(e.count, 3); assert.equal(e.revenue, 297); assert.equal(e.commission, 29.7);
  assert.equal(e.rateNow, 0.10); assert.equal(e.nextRate, 0.15); assert.equal(e.toNext, 7);
  assert.equal(e.feeWaived, true); assert.equal(e.feeWaivedFrom, '2026-10');
  assert.equal(B.earnings(B.fresh()).toWaiver, 2);
  assert.deepEqual([1, 10, 11, 50, 51, 150, 151, 999].map(B.rateFor), [0.1, 0.1, 0.15, 0.15, 0.25, 0.25, 0.45, 0.45]);
  for (let i = 3; i < 12; i++) B.addSale(st, { product: 'sponsor', amount: 99, date: '2026-10-20', status: 'confirmed', ref: 'C' + i });
  e = B.earnings(st);
  assert.equal(e.count, 12); assert.equal(e.commission, Math.round((10 * 9.9 + 2 * 14.85) * 100) / 100);
  assert.equal(e.rateNow, 0.15); assert.equal(e.toNext, 38);
});

test('pages: shareable, private, branded, and the app tabs point at them', () => {
  const a = read('affiliates/index.html'), c = read('create/index.html');
  for (const [f, html] of [['affiliates', a], ['create', c]]) {
    assert.match(html, new RegExp('<link rel="canonical" href="https://therealetm.github.io/lowispike/' + f + '/">'));
    assert.match(html, /og:image/); assert.match(html, /viewport-fit=cover/); assert.ok(!/console\.log/.test(html));
  }
  assert.match(a, /<meta name="robots" content="noindex">/);
  assert.ok(!/fetch\(|XMLHttpRequest|sendBeacon/.test(read('affiliates/blueprint.js') + read('affiliates/blueprint-core.js')), 'the blueprint sends nothing anywhere');
  assert.ok(!/innerHTML/.test(read('affiliates/blueprint.js')), 'user text never becomes HTML');
  const ui = read('community-rooms-ui.js');
  assert.match(ui, /create:'create\/',aff:'affiliates\/'/);
  assert.match(ui, /data-rm="create"/); assert.match(ui, /data-rm="aff"/);
  const S = require('../scripts/site-files.cjs'), pub = new Set(S.list(root));
  for (const f of ['affiliates/index.html', 'affiliates/blueprint.js', 'affiliates/blueprint-core.js', 'affiliates/blueprint.css', 'create/index.html']) assert.ok(pub.has(f), f + ' is published');
});

test('service worker: other pages never replace the saved app shell', () => {
  const sw = read('sw.js');
  assert.match(sw, /function isShell\(url\)\{ return url\.pathname === scopePath \|\| url\.pathname === scopePath \+ "index\.html"; \}/);
  assert.match(sw, /if \(req\.mode === "navigate" && !isShell\(url\)\) return;/);
});
