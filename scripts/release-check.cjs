#!/usr/bin/env node
'use strict';
// Release gate for LOWiSPIKE. No dependencies, runs in CI and before every push.
// Usage: node scripts/release-check.cjs [repoRoot]
// Exit 0 = OK (warnings may print), exit 1 = a release must not go out like this.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const BUILD_RE = /^\d{8}-\d{6}$/;
const TUTORIAL_RULE_FROM = '20261019-164000'; // the first release that ships the replayable tutorial; every later What's New must name its tutorial step
const STRAY_RE = [
  /(^|\/)\.DS_Store$/, /\.log$/, /\.orig$/, /\.rej$/, /\.bak$/, /\.swp$/, /~$/,
  /(^|\/)node_modules\//, /(^|\/)\.env(\.|$)/, /\.pem$/, /(^|\/)id_(rsa|ed25519)(\.pub)?$/,
];
const BIG_ERROR = 25 * 1024 * 1024; // GitHub warns at 50 MB and blocks at 100 MB
const BIG_WARN = 2 * 1024 * 1024;   // big for a page an iPhone has to parse
const BIG_WARN_SKIP = /^(vendor|data)\//;
const TEXT_RE = /\.(html|js|cjs|mjs|css|json|md|yml|yaml|sh|py|sql|ts|webmanifest|svg|toml)$/;

function read(root, f) {
  try { return fs.readFileSync(path.join(root, f), 'utf8'); } catch (e) { return null; }
}

function trackedFiles(root) {
  try {
    return execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20 })
      .split('\0').filter(Boolean);
  } catch (e) {
    const out = [];
    (function walk(dir) {
      for (const n of fs.readdirSync(path.join(root, dir))) {
        if (n === '.git') continue;
        const rel = dir ? dir + '/' + n : n;
        if (fs.statSync(path.join(root, rel)).isDirectory()) walk(rel); else out.push(rel);
      }
    })('');
    return out;
  }
}

// Every place the build id lives. They must all agree or the update check loops or serves stale files.
function buildIds(root) {
  const ids = {};
  const html = read(root, 'index.html');
  if (html != null) { const m = html.match(/<meta name="lowi-build" content="([^"]*)"/); ids['index.html meta lowi-build'] = m ? m[1] : null; }
  const ver = read(root, 'version.json');
  if (ver != null) { try { ids['version.json build'] = JSON.parse(ver).build || null; } catch (e) { ids['version.json build'] = null; } }
  const sw = read(root, 'sw.js');
  if (sw != null) {
    const a = sw.match(/SHELL_BUILD = "([^"]*)"/); ids['sw.js SHELL_BUILD'] = a ? a[1] : null;
    const b = sw.match(/const CACHE = "lowispike-updates-([^"]*)"/); ids['sw.js CACHE'] = b ? b[1] : null;
  }
  const ui = read(root, 'apple-ui.js');
  if (ui != null) { const m = ui.match(/const v='([^']*)'/); ids["apple-ui.js const v"] = m ? m[1] : null; }
  return ids;
}

function check(root) {
  const errors = [], warnings = [], info = [];
  const ids = buildIds(root);
  const values = Object.values(ids);
  for (const [where, v] of Object.entries(ids)) {
    if (!v) errors.push('build id missing in ' + where);
    else if (!BUILD_RE.test(v)) errors.push('build id "' + v + '" in ' + where + ' is not YYYYMMDD-HHMMSS');
  }
  const distinct = [...new Set(values.filter(Boolean))];
  if (distinct.length > 1) errors.push('build ids disagree: ' + Object.entries(ids).map(([k, v]) => k + '=' + v).join(', '));
  const build = distinct.length === 1 ? distinct[0] : null;
  if (build) info.push('build ' + build);

  const verText = read(root, 'version.json');
  if (verText != null) {
    let ver = null;
    try { ver = JSON.parse(verText); } catch (e) { errors.push('version.json is not valid JSON: ' + e.message); }
    if (ver) {
      /* Oct 26 2026 (Emmanuel: "no more notification updates"): releases are always silent. Builds on phones show the
         "I've got something new for you!" ask when "loud" is newer than they are, or missing from the first 64 bytes. */
      if (ver.loud !== '20000101-000000' || verText.indexOf('"loud":"20000101-000000"') < 0 || verText.indexOf('"loud":"20000101-000000"') > 40)
        errors.push('version.json "loud" must stay "20000101-000000", right after "build": updates always ship silently, never ask phones to update (MAYA-HANDOFF standing rule, 26 Oct)');
      const n = ver.news || {};
      if (!n.id) errors.push('version.json news.id missing');
      for (const l of ['en', 'de', 'es']) {
        if (!n.text || typeof n.text[l] !== 'string' || !n.text[l].trim()) errors.push('version.json news.text.' + l + ' missing (What\'s New must ship in EN/DE/ES)');
      }
      if (build && n.id && !String(n.id).endsWith(build)) warnings.push('news.id "' + n.id + '" does not end with the build id; What\'s New may not reappear for this release');
      /* Oct 19 2026: every What's New entry from the tutorial release on says how tutorial-steps.js covers it (TUTORIAL.md) */
      const nb = (String(n.id || '').match(/(\d{8}-\d{6})$/) || [])[1] || '';
      if (nb && nb >= TUTORIAL_RULE_FROM) {
        let S = null; try { S = require(path.resolve(root, 'tutorial-steps.js')); } catch (e) { }
        if (!S) errors.push('tutorial-steps.js is missing or broken (the tutorial must ship with every release)');
        else if (!S.newsOk(n.tutorial)) errors.push('version.json news.tutorial must be a tutorial step id or {"none": "why"}: release with news.json "tutorial" set (TUTORIAL.md)');
      }
      const kb = Buffer.byteLength(verText) / 1024;
      info.push('version.json ' + kb.toFixed(0) + ' KB');
      if (kb > 100) warnings.push('version.json is ' + kb.toFixed(0) + ' KB and every update check downloads it; consider moving older What\'s New entries out of it');
    }
  }

  const files = trackedFiles(root);
  for (const f of files) {
    if (STRAY_RE.some(r => r.test(f))) errors.push('stray or secret-looking file is tracked: ' + f);
    let size = 0;
    try { size = fs.statSync(path.join(root, f)).size; } catch (e) { continue; }
    if (size > BIG_ERROR) errors.push(f + ' is ' + (size / 1048576).toFixed(1) + ' MB (over 25 MB)');
    else if (size > BIG_WARN && !BIG_WARN_SKIP.test(f)) warnings.push(f + ' is ' + (size / 1048576).toFixed(1) + ' MB; big files cost parse time and memory on iPhone');
    if (TEXT_RE.test(f) && !/^vendor\//.test(f) && size < BIG_ERROR) {
      const t = read(root, f) || '';
      if (/^(<{7}|>{7}) /m.test(t)) errors.push('merge conflict marker left in ' + f);
    }
  }

  const html = read(root, 'index.html');
  if (html && build) {
    const odd = new Set();
    const re = /([\w./-]+\.(?:js|css|mjs))\?v=([^"'\s)&>]*)/g; let m;
    while ((m = re.exec(html))) if (m[2] !== build && !/^['"+]/.test(m[2])) odd.add(m[1] + '?v=' + m[2]);
    if (odd.size) warnings.push('files with their own version tag (not the build id), so the service worker never caches them by build: ' + [...odd].sort().join(', '));
  }
  return { errors, warnings, info, build, files: files.length };
}

module.exports = { check, buildIds, BUILD_RE };

if (require.main === module) {
  const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
  const r = check(root);
  for (const i of r.info) console.log('info: ' + i);
  for (const w of r.warnings) console.log('warning: ' + w);
  for (const e of r.errors) console.log('ERROR: ' + e);
  console.log(r.errors.length ? 'release-check FAILED (' + r.errors.length + ' error(s))' : 'release-check OK (' + r.files + ' tracked files, ' + r.warnings.length + ' warning(s))');
  process.exit(r.errors.length ? 1 : 0);
}
