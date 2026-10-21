#!/usr/bin/env node
'use strict';
/* What GitHub Pages publishes. Until 21 Oct 2026 the deploy uploaded the whole repository, so the working notes, the test
   pages, the build tools and the database proposals were all served next to the app (e.g. /lowispike/AGENTS.md,
   /lowispike/tests/mobile-layout-qa.html). The site is now the tracked files minus the ones a visitor's browser never asks
   for. Nothing the app loads lives in these folders: tests/site-files.test.cjs checks every file the shell, the service
   worker and the stylesheets reference is still published.
   Usage: node scripts/site-files.cjs --out _site   (copies the site)   |   node scripts/site-files.cjs --list */
const fs = require('fs'), path = require('path'), cp = require('child_process');

/* Left out of the published site. Folders end with '/'. */
const EXCLUDE_DIRS = ['.agents/', '.github/', 'playtest/', 'scripts/', 'supabase/', 'tests/', 'tools/'];
const EXCLUDE_FILES = [/\.md$/i, /^skills-lock\.json$/, /^\.gitignore$/, /^package(-lock)?\.json$/];

function published(f) {
  if (EXCLUDE_DIRS.some(d => f.startsWith(d))) return false;
  const base = f.split('/').pop();
  if (EXCLUDE_FILES.some(r => r.test(base))) return false;
  return true;
}

function tracked(root) {
  return cp.execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).split('\0').filter(Boolean);
}

function list(root) { return tracked(root).filter(published); }

function copy(root, out) {
  const files = list(root);
  fs.rmSync(out, { recursive: true, force: true });
  for (const f of files) {
    const dst = path.join(out, f);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(path.join(root, f), dst);
  }
  return files;
}

module.exports = { EXCLUDE_DIRS, EXCLUDE_FILES, published, list, copy };

if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  const i = process.argv.indexOf('--out');
  if (i > 0) {
    const files = copy(root, path.resolve(process.argv[i + 1]));
    console.log('site: ' + files.length + ' files -> ' + process.argv[i + 1] + ' (' + (tracked(root).length - files.length) + ' internal files left out)');
  } else {
    list(root).forEach(f => console.log(f));
  }
}
