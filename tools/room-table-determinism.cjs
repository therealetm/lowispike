/* Oct 28 2026: the Billardtisch replays a shot on every phone from the shot message alone, so the physics must give bit-identical
   rest positions in every engine. This runs 50 random full-table shots in node, in Chromium and in WebKit (Safari's engine) and
   compares the results exactly.   node tools/room-table-determinism.cjs */
const fs = require('fs'), path = require('path'), os = require('os');
let pw; for (const p of [process.env.PW, path.join(os.homedir(), '.pw/node_modules/playwright'), 'playwright']) { try { if (p) { pw = require(p); break; } } catch (e) { } }
const src = fs.readFileSync(path.join(__dirname, '..', 'room-table-core.js'), 'utf8');
const C = require('../room-table-core.js');
function run(C) {
  let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const out = [];
  for (let k = 0; k < 50; k++) {
    const n = 15 + Math.floor(rnd() * 26), uids = Array.from({ length: n }, (_, i) => 'p' + k + '-' + i);
    const sp = C.homeSpots(uids, {}); const start = uids.map(u => [u, sp[u].x, sp[u].y]);
    const by = uids[Math.floor(rnd() * n)], me = sp[by], tg = sp[uids[(uids.indexOf(by) + 1 + Math.floor(rnd() * (n - 1))) % n]];
    const r = C.simulate(start, by, tg.x - me.x + (rnd() - .5) * 40, tg.y - me.y + (rnd() - .5) * 40, .2 + rnd() * .8);
    out.push(JSON.stringify([r.steps, r.hit, r.final]));
  }
  return out;
}
(async () => {
  const ref = run(C), res = { shots: ref.length, moved: 0, engines: {} };
  for (const s of ref) { const [, hit] = JSON.parse(s); if (hit) res.moved++; }
  for (const eng of ['chromium', 'webkit']) {
    const b = await pw[eng].launch(), p = await b.newPage();
    await p.setContent('<script>' + src + '</script>');
    const got = await p.evaluate('(' + run.toString() + ')(window.LowiTableCore)');
    res.engines[eng] = { identical: got.filter((g, i) => g === ref[i]).length, of: ref.length };
    await b.close();
  }
  console.log(JSON.stringify(res));
  process.exit(Object.values(res.engines).every(e => e.identical === e.of) ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
