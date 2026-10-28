'use strict';
/* Sweep 2026-10-28 22:05: rate filled pasta and Spanish pasta names via LowiDex.nameEst (same path as the Scan name chip),
   en/de/es side by side, with the reason the result card shows. node tools/sweep-pasta-names-2205.cjs [url|root] */
const H = require('./sim/harness.cjs');
const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY, 'i') : null;
const ROWS0 = [
  ['tortellini', 'Tortellini', 'tortellini'], ['tortelloni', 'Tortelloni', 'tortelloni'], ['ravioli', 'Ravioli', 'raviolis'],
  ['dumplings', 'Maultaschen', 'empanadillas'], ['gyoza', 'Teigtaschen', 'gyozas'], ['spaghetti', 'Spaghetti', 'espaguetis'],
  ['noodles', 'Nudeln', 'fideos'], ['tagliatelle', 'Bandnudeln', 'tallarines'], ['macaroni', 'Makkaroni', 'macarrones'],
  ['lasagna', 'Lasagne', 'lasaña'], ['gnocchi', 'Gnocchi', 'ñoquis'], ['cake', 'Torte', 'tarta'],
  ['zucchini noodles', 'Zucchininudeln', 'fideos de calabacín'], ['zoodles', 'Zucchini-Nudeln', 'espaguetis de calabacín'],
  ['shirataki noodles', 'Shirataki-Nudeln', 'fideos shirataki'], ['konjac noodles', 'Konjaknudeln', 'fideos de konjac'],
  ['vegetable noodles', 'Gemüsenudeln', 'fideos de verdura'], ['cauliflower rice', 'Blumenkohlreis', 'arroz de coliflor'],
  ['broccoli rice', 'Brokkolireis', 'arroz de brócoli'], ['zucchini', 'Zucchini', 'calabacín'], ['whole wheat pasta', 'Vollkornnudeln', 'pasta integral']
];
const ROWS = ROWS0.filter(r => !ONLY || ONLY.test(r[0]));
(async () => {
  const url = process.argv[2] || 'https://therealetm.github.io/lowispike/index.html';
  const R = await H.open({ device: 'iPhone 13', engine: 'chromium', members: 4, messages: 4, probe: false, lang: 'en', ...(/^https?:/.test(url) ? { url } : { root: url }) }), P = R.page;
  await R.goto(); await H.sleep(5000);
  const res = await P.evaluate(rows => rows.map(r => r.map(q => { try { const p = LowiDex.nameEst({ name: q, brand: '', typed: true, verdict: 'unknown', why: [], score: null }); return [q, p && p.nameEst ? p.verdict : '-', p && p.nameEst ? (p.nameEst.hit || '') : '', p ? JSON.stringify(p.why || '').slice(0, 90) : '']; } catch (e) { return [q, 'ERR ' + e.message, '', '']; } })), ROWS);
  for (const r of res) console.log(r.map(x => x[0] + ':' + x[1] + (x[2] ? '(' + x[2] + ')' : '') + ' ' + x[3]).join('\n   | '));
  console.log('errs', JSON.stringify(R.errs.slice(0, 3)));
  await R.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
