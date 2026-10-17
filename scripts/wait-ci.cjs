#!/usr/bin/env node
'use strict';
// Waits until the required check "Release check and tests" has finished on one commit.
// Usage: node scripts/wait-ci.cjs SHA [--timeout SECONDS]
// Exit 0 = passed, 1 = failed or cancelled, 2 = timed out / could not read GitHub.
// Reads the public GitHub API (no token needed for this public repo; GITHUB_TOKEN is used when set).
const args = process.argv.slice(2);
const sha = args.find(a => /^[0-9a-f]{40}$/.test(a));
if (!sha) { console.error('usage: node scripts/wait-ci.cjs <40-char SHA> [--timeout SECONDS]'); process.exit(2); }
const i = args.indexOf('--timeout');
const timeout = +(i >= 0 ? args[i + 1] : 900) * 1000;
const repo = process.env.LOWISPIKE_REPO || 'therealetm/lowispike';
const CHECK = 'Release check and tests';
const url = `https://api.github.com/repos/${repo}/commits/${sha}/check-runs?check_name=${encodeURIComponent(CHECK)}&filter=latest`;
const headers = { accept: 'application/vnd.github+json', 'user-agent': 'lowispike-wait-ci' };
if (process.env.GITHUB_TOKEN) headers.authorization = 'Bearer ' + process.env.GITHUB_TOKEN;

(async () => {
  const start = Date.now();
  let delay = 15000, last = 'no check run yet';
  console.log(`waiting for "${CHECK}" on ${sha.slice(0, 7)}`);
  while (Date.now() - start < timeout) {
    await new Promise(r => setTimeout(r, delay));
    try {
      const r = await fetch(url, { headers });
      if (r.status === 403 || r.status === 429) { last = 'GitHub API rate limit'; delay = 60000; continue; }
      if (!r.ok) { last = 'HTTP ' + r.status; continue; }
      const runs = (await r.json()).check_runs || [];
      const run = runs.find(x => x.app && x.app.slug === 'github-actions') || runs[0];
      if (!run) continue;
      last = run.status + (run.conclusion ? '/' + run.conclusion : '');
      if (run.status === 'completed') {
        console.log(`"${CHECK}" ${run.conclusion} after ${Math.round((Date.now() - start) / 1000)}s: ${run.html_url}`);
        process.exit(run.conclusion === 'success' ? 0 : 1);
      }
      delay = 15000;
    } catch (e) { last = e.message; }
  }
  console.log(`timed out after ${timeout / 1000}s, last seen: ${last}`);
  process.exit(2);
})();
