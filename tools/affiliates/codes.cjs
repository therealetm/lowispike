#!/usr/bin/env node
/* Eman's switchboard for the Affiliates page. Edits affiliates/access-list.js and affiliates/recruits.js; then release as usual.
   Codes are printed once and never written to the repo: only their PBKDF2 hash goes into access-list.js.

   node tools/affiliates/codes.cjs add --kind legacy --tracks webdesign,ugc --note "Max (WhatsApp)"   -> prints a VIP-... code
   node tools/affiliates/codes.cjs add --kind buyer --tracks webdesign --note "Webdesign buyers, Beacons delivery" -> WEB-... code
   node tools/affiliates/codes.cjs revoke --note "Max (WhatsApp)"      (or --code VIP-XXXX-XXXX-XXXX)
   node tools/affiliates/codes.cjs recruit --by <affiliate link or id> --video <TikTok/Instagram link> --series webdesign
   node tools/affiliates/codes.cjs list */
'use strict';
const fs = require('fs'), path = require('path');
const A = require('../../affiliates/access-core.js');
const ROOT = path.resolve(__dirname, '..', '..');
const FILES = { access: path.join(ROOT, 'affiliates/access-list.js'), recruits: path.join(ROOT, 'affiliates/recruits.js') };
const PREFIX = { webdesign: 'WEB', ugc: 'UGC' };

function readData(f) { const t = fs.readFileSync(f, 'utf8'); const m = t.match(/\/\*DATA\*\/([\s\S]*?)\/\*END\*\//); if (!m) throw new Error('no DATA block in ' + f); return { t, d: JSON.parse(m[1]) }; }
function writeData(f, x, d) { fs.writeFileSync(f, x.t.replace(/\/\*DATA\*\/[\s\S]*?\/\*END\*\//, () => '/*DATA*/' + JSON.stringify(d, null, 2) + '/*END*/')); }
function args(a) { const o = { _: a[0] }; for (let i = 1; i < a.length; i++) if (a[i].startsWith('--')) { o[a[i].slice(2)] = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : true; } return o; }
const today = () => new Date().toISOString().slice(0, 10);

async function main(o) {
  if (o._ === 'add') {
    const x = readData(FILES.access), d = x.d;
    const tracks = String(o.tracks || '').split(',').map(s => s.trim()).filter(Boolean);
    if (!tracks.length || tracks.some(t => !PREFIX[t])) throw new Error('--tracks webdesign,ugc');
    const kind = o.kind === 'buyer' ? 'buyer' : 'legacy';
    const n = Math.max(1, Math.min(50, Number(o.count) || 1)), out = [];
    for (let i = 0; i < n; i++) {
      const code = A.newCode(o.prefix || (kind === 'legacy' ? 'VIP' : (tracks.length === 1 ? PREFIX[tracks[0]] : 'ALL')));
      const h = await A.hash(code, d);
      d.codes.push({ h, tracks, kind, note: String(o.note || kind) + (n > 1 ? ' #' + (i + 1) : ''), added: today() });
      out.push(code);
    }
    writeData(FILES.access, x, d);
    out.forEach(c => console.log(c));
  } else if (o._ === 'revoke') {
    const x = readData(FILES.access), d = x.d, before = d.codes.length;
    const h = o.code ? await A.hash(o.code, d) : null;
    d.codes = d.codes.filter(c => !(h ? c.h === h : (o.note && c.note === o.note)));
    writeData(FILES.access, x, d);
    console.log('removed', before - d.codes.length);
  } else if (o._ === 'recruit') {
    const by = A.idFrom(o.by); if (!by) throw new Error('--by needs the affiliate\'s Beacons link or its affiliateLinkId');
    if (!A.videoOk(o.video)) throw new Error('--video must be a TikTok or Instagram link');
    const x = readData(FILES.recruits), d = x.d;
    d.verified.push({ by, video: String(o.video).trim(), series: o.series === 'ugc' ? 'ugc' : 'webdesign', ok: today() });
    writeData(FILES.recruits, x, d);
    console.log('active recruits for', by, '=', A.recruitsFor(by, d));
  } else if (o._ === 'list') {
    const a = readData(FILES.access).d, r = readData(FILES.recruits).d;
    a.codes.forEach(c => console.log(c.kind.padEnd(7), c.tracks.join('+').padEnd(14), c.added || '', c.note));
    console.log(r.verified.length + ' verified recruit videos');
  } else { console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 10).join('\n')); }
}
main(args(process.argv.slice(2))).catch(e => { console.error(e.message); process.exit(1); });
