#!/usr/bin/env node
'use strict';
// Proves a release is really live on GitHub Pages instead of assuming the push deployed.
// Usage: node scripts/verify-live.cjs [BUILD] [--at-least] [--timeout SECONDS] [--compare] [--base URL]
//   BUILD defaults to the repo's build. --at-least passes when a newer build is already live
//   (another release landed after this one). --compare also checks the live bytes of the
//   shell files equal this checkout. Pages sends Cache-Control max-age=600, so every
//   request carries a cache-busting query.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { buildIds } = require('./release-check.cjs');

const root = path.join(__dirname, '..');
const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const base = (opt('--base') || 'https://therealetm.github.io/lowispike/').replace(/\/?$/, '/');
const timeout = +(opt('--timeout') || 600) * 1000;
const atLeast = args.includes('--at-least');
const want = args.find(a => /^\d{8}-\d{6}$/.test(a)) || buildIds(root)['version.json build'];
const SHELL = ['index.html', 'sw.js', 'version.json', 'apple-ui.js'];

async function get(f) {
  const r = await fetch(base + f + '?cb=' + Date.now() + Math.random().toString(36).slice(2), { cache: 'no-store' });
  if (!r.ok) throw new Error(f + ' HTTP ' + r.status);
  return Buffer.from(await r.arrayBuffer());
}

async function liveIds() {
  const [html, sw, ver] = await Promise.all(['index.html', 'sw.js', 'version.json'].map(get));
  return {
    'index.html': (String(html).match(/name="lowi-build" content="([^"]+)"/) || [])[1],
    'sw.js': (String(sw).match(/SHELL_BUILD = "([^"]+)"/) || [])[1],
    'version.json': JSON.parse(String(ver)).build,
  };
}

(async () => {
  const start = Date.now();
  let last = null, lastErr = null;
  console.log('waiting for ' + base + ' to serve ' + want + (atLeast ? ' or newer' : ''));
  while (Date.now() - start < timeout) {
    try {
      last = await liveIds(); lastErr = null;
      const v = Object.values(last);
      const ok = v.every(x => x && (atLeast ? x >= want : x === want)) && new Set(v).size === 1;
      if (ok) {
        console.log('live OK after ' + Math.round((Date.now() - start) / 1000) + 's: ' + JSON.stringify(last));
        if (args.includes('--compare') && last['version.json'] === want) {
          let bad = 0;
          for (const f of SHELL) {
            const p = path.join(root, f); if (!fs.existsSync(p)) continue;
            const h = b => crypto.createHash('sha256').update(b).digest('hex').slice(0, 12);
            const a = h(fs.readFileSync(p)), b = h(await get(f));
            console.log((a === b ? 'same  ' : 'DIFF  ') + f + ' repo ' + a + ' live ' + b);
            if (a !== b) bad++;
          }
          if (bad) { console.log('live files differ from this checkout'); process.exit(1); }
        }
        process.exit(0);
      }
    } catch (e) { lastErr = e.message; }
    await new Promise(r => setTimeout(r, 15000));
  }
  console.log('NOT LIVE after ' + timeout / 1000 + 's. Last seen: ' + JSON.stringify(last) + (lastErr ? ' error: ' + lastErr : ''));
  console.log('Check the "pages build and deployment" run in the Actions tab; if it failed, push an empty commit or re-run it.');
  process.exit(1);
})();
