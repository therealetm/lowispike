'use strict';
/* The published site (scripts/site-files.cjs) leaves out the notes, tests and tools, and keeps everything the app loads. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const S = require('../scripts/site-files.cjs');
const root = path.resolve(__dirname, '..');
const site = S.list(root), pub = new Set(site);
const tracked = new Set(require('node:child_process').execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20 }).split('\0').filter(Boolean));

test('working notes, AI playbooks, test pages and build tools are not published', () => {
  for (const f of ['AGENTS.md', 'AI_PLAYBOOK.md', 'MAYA-HANDOFF.md', 'SUCCESSOR_HANDOFF.md', 'README.md', 'TICKETS.md', 'skills-lock.json', '.agents/skills/apple-design/SKILL.md', 'tests/mobile-layout-qa.html', 'tools/interface-audit/lib.cjs', 'scripts/release.sh', 'supabase/config.toml', '.github/workflows/ci.yml'])
    if (tracked.has(f)) assert.ok(!pub.has(f), f + ' must not be published');
  assert.ok(!site.some(f => /\.md$/i.test(f)), 'no markdown is published');
  assert.ok(!site.some(f => /^(tests|tools|scripts|playtest|supabase|\.agents|\.github)\//.test(f)));
});

test('the shell, the service worker list, the manifest icons and the public pages are published', () => {
  for (const f of ['index.html', 'sw.js', 'version.json', 'manifest.webmanifest', 'lowispike.html', '404.html', 'robots.txt', 'sitemap.xml', 'og-image.png']) assert.ok(pub.has(f), f + ' must be published');
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  const STATIC = JSON.parse(sw.match(/const STATIC = (\[[^\]]*\])/)[1]);
  assert.ok(STATIC.length > 50);
  for (const f of STATIC) assert.ok(pub.has(f), 'service worker caches ' + f + ' but it is not published');
  const man = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
  for (const i of man.icons) assert.ok(pub.has(i.src.split('?')[0]), 'manifest icon ' + i.src);
});

test('every local file the published code names is itself published', () => {
  const missing = [];
  const re = /["'`(=]\s*\.?\/?([A-Za-z0-9_][\w.\/-]*\.(?:js|mjs|css|json|png|jpe?g|webp|svg|gif|mp3|wav|ogg|m4a|mp4|webm|glb|gltf|task|wasm|webmanifest|html|txt|xml))(?:[?#][^"'`)\s]*)?["'`)]/g;
  for (const f of site) {
    if (!/\.(html|js|mjs|css|webmanifest)$/.test(f) || /^vendor\//.test(f)) continue;
    const t = fs.readFileSync(path.join(root, f), 'utf8');
    for (const m of t.matchAll(re)) {
      const ref = path.posix.normalize(path.posix.join(path.posix.dirname(f), m[1]));
      const flat = m[1];
      if ((tracked.has(ref) && !pub.has(ref)) || (tracked.has(flat) && !pub.has(flat))) missing.push(f + ' -> ' + m[1]);
    }
  }
  assert.deepEqual([...new Set(missing)], [], 'referenced but left out of the site');
});
