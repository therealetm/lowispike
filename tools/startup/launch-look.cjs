/* LOWiSPIKE launch scene: Home's own bubble icons for the very first open (28 Oct 2026, evening).
   The launch scene shows Home's ring bubbles as Home last showed them (lowi.launch.look, written by LowiBoot.look in
   index.html). Before Home has ever been shown on this phone there is nothing saved, so the scene falls back to LWL_DEF in
   index.html: Home's icons, taken from Home itself by this script (numbers left out, icons centred), so they are the same.

   node tools/startup/launch-look.cjs [--root DIR] [--check]     (--check: only report whether LWL_DEF is current)
   Run it after changing a Home ring icon. */
'use strict';
const fs = require('fs'), path = require('path');
const H = require('../sim/harness.cjs');
const A = process.argv.slice(2), arg = (k, d) => { const i = A.indexOf('--' + k); return i >= 0 ? A[i + 1] : d; };
const ROOT = path.resolve(arg('root', path.join(__dirname, '..', '..'))), CHECK = A.includes('--check');
const KEYS = ['settings', 'water', 'move', 'scan', 'joy', 'sleep', 'gap', 'fuel'];

function iconsOnly(b) {
    const w = b.w, keep = b.it.filter(q => q.t !== 't');
    if (keep.length && keep.length !== b.it.length) {
        let top = Infinity, bot = -Infinity;
        for (const q of keep) { top = Math.min(top, q.y); bot = Math.max(bot, q.y + q.h); }
        const dy = +(w / 2 - (top + bot) / 2).toFixed(1);
        for (const q of keep) q.y = +(q.y + dy).toFixed(1);
    }
    return { w, it: keep };
}

(async () => {
    const R = await H.open({ engine: 'chromium', lang: 'de', root: ROOT, probe: false, fresh: false, viewport: { width: 390, height: 844 }, dpr: 2 });
    await R.goto();
    await H.sleep(9000);
    const raw = await R.page.evaluate(() => { try { window.LowiBoot.look(); } catch (e) { } return localStorage.getItem('lowi.launch.look'); });
    await R.close();
    if (!raw) throw new Error('Home wrote no lowi.launch.look (was Home on screen?)');
    const S = JSON.parse(raw), D = {};
    for (const k of KEYS) { if (!S.b[k]) throw new Error('no bubble ' + k + ' on Home'); D[k] = iconsOnly(S.b[k]); }
    const js = JSON.stringify(D).replace(/<\//g, '<\\/');
    const f = path.join(ROOT, 'index.html'), html = fs.readFileSync(f, 'utf8');
    const re = /\/\*LWL_DEF\*\/[\s\S]*?\/\*LWL_DEF_END\*\//;
    if (!re.test(html)) throw new Error('LWL_DEF markers not found in index.html');
    const next = html.replace(re, () => '/*LWL_DEF*/' + js + '/*LWL_DEF_END*/');
    if (CHECK) { console.log(next === html ? 'LWL_DEF is current' : 'LWL_DEF differs from Home now'); process.exit(next === html ? 0 : 1); }
    fs.writeFileSync(f, next);
    console.log('LWL_DEF written:', KEYS.map(k => k + ' ' + D[k].it.map(q => q.t).join('')).join(', '), '(' + js.length + ' chars)');
    process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
