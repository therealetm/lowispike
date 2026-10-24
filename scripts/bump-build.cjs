#!/usr/bin/env node
'use strict';
// Moves every build id to a new one and (optionally) prepends a What's New entry.
// Replaces the bump block that was copy-pasted into each one-off release script.
// Usage:
//   node scripts/bump-build.cjs [--build YYYYMMDD-HHMMSS] [--live URL|--no-live] [--news news.json | --quiet] [--dry-run]
//   --quiet = a silent bug fix: no "New version" ask, no "Update loaded", no What's New (see applyBump)
// news.json: {"slug":"care-board","tutorial":"<step id>"|{"none":"why"},"go":{"tab":"home"},"lead":{en,de,es},"steps":[...],"text":{"en":"..","de":"..","es":".."}}
// Prints the new build id on the last line.
const fs = require('fs');
const path = require('path');
const { buildIds, BUILD_RE } = require('./release-check.cjs');

const LIVE = 'https://therealetm.github.io/lowispike/version.json';
const ID_FILES = ['index.html', 'sw.js', 'apple-ui.js'];

function toDate(id) { return new Date(Date.UTC(+id.slice(0, 4), +id.slice(4, 6) - 1, +id.slice(6, 8), +id.slice(9, 11), +id.slice(11, 13), +id.slice(13, 15))); }
function fromDate(d) { const p = n => String(n).padStart(2, '0'); return d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) + '-' + p(d.getUTCHours()) + p(d.getUTCMinutes()) + p(d.getUTCSeconds()); }
// Berlin wall clock written as if UTC, which is how build ids are compared.
function berlinNow(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(now).map(p => [p.type, p.value]));
  return parts.year + parts.month + parts.day + '-' + parts.hour + parts.minute + parts.second;
}
// New id = now, but always at least one second after both the repo build and the live build.
function nextBuild(repo, live, now) {
  let t = toDate(now);
  for (const x of [repo, live]) if (x && BUILD_RE.test(x)) { const after = new Date(toDate(x).getTime() + 1000); if (after > t) t = after; }
  return fromDate(t);
}

// Oct 19 2026 (Emmanuel: "with every new update, the tutorial also needs to be updated"): every What's New entry says how the
// replayable tutorial covers it. news.json "tutorial": "<step id in tutorial-steps.js>" or {"none": "why no step is needed"}.
// Returns an error string, or '' when the entry is fine. See TUTORIAL.md.
function checkTutorial(root, news) {
  if (!news) return '';
  let S = null;
  try { S = require(path.resolve(root, 'tutorial-steps.js')); } catch (e) { return ''; }
  const ids = S.STEPS.map(s => s.id).join(', ');
  if (news.tutorial == null) return 'news.json has no "tutorial" field. Every release must keep the tutorial current (TUTORIAL.md):\n' +
    '  add "tutorial": "<step id>" when a step explains this change (update that step in tutorial-steps.js if the feature changed;\n' +
    '  add a new step for a new feature), or "tutorial": {"none": "why no tutorial step is needed"}. Step ids: ' + ids;
  if (news.tour != null) {
    if (!Array.isArray(news.tour) || !news.tour.length) return 'news.json "tour" must be a list of step ids (part \'new\' in tutorial-steps.js), e.g. ["new-kitchen"]; got ' + JSON.stringify(news.tour);
    const bad = news.tour.filter(id => !S.STEPS.some(s => s.id === id));
    if (bad.length) return 'news.json "tour" names steps that do not exist: ' + bad.join(', ') + '. Add them to part \'new\' in tutorial-steps.js. Step ids: ' + ids;
  }
  if (!S.newsOk(news.tutorial)) return 'news.json "tutorial" must be an existing step id (' + ids + ') or {"none": "a reason of at least 8 characters"}; got ' + JSON.stringify(news.tutorial);
  return '';
}

/* Oct 24 2026 (Emmanuel: "if you find a bug and you fix it, don't send out an update notification that annoys the people. They
   don't need to know that."): a quiet release (--quiet) is a silent bug fix. version.json keeps "loud" = the newest build that
   announces itself, right after "build" so the app's 64-byte update poll sees it. The app asks to update (and says "Update
   loaded") only when "loud" is newer than the build it runs; a quiet build just arrives the next time the app opens. A normal
   release sets loud = its own build. A quiet release cannot carry What's New (--news). */
function applyBump(root, oldId, newId, news, opts) {
  const quiet = !!(opts && opts.quiet);
  if (quiet && news) throw new Error('a quiet release (silent bug fix) has no What\'s New: drop --news or --quiet');
  const changed = [];
  for (const f of ID_FILES) {
    const p = path.join(root, f);
    if (!fs.existsSync(p)) continue;
    const t = fs.readFileSync(p, 'utf8');
    const u = t.split(oldId).join(newId);
    if (u !== t) { fs.writeFileSync(p, u); changed.push(f); }
  }
  const vp = path.join(root, 'version.json');
  const raw = fs.readFileSync(vp, 'utf8');
  const d0 = JSON.parse(raw);
  const loud = quiet ? (BUILD_RE.test(d0.loud || '') ? d0.loud : oldId) : newId;
  const d = Object.assign({ build: newId, loud }, d0, { build: newId, loud });
  if (news) {
    const n = d.news = d.news || {};
    n.text = n.text || {};
    for (const l of ['en', 'de', 'es']) {
      if (!news.text || !news.text[l]) throw new Error('news.text.' + l + ' is required');
      n.text[l] = n.text[l] ? news.text[l] + '\n\n' + n.text[l] : news.text[l];
    }
    n.id = (news.slug || 'release') + '-' + newId;
    n.go = news.go || { tab: 'home' };
    n.date = newId.slice(0, 4) + '-' + newId.slice(4, 6) + '-' + newId.slice(6, 8);
    /* Oct 23 sweep: lead and steps belong to one release. Keeping the last release's (as before) made every release without
       its own tour offer the older change's tour ("Bubbles open in one round circle", "The Seller Zone now shows real product
       photos"), and that offer marks the news seen, so the new release's own text never showed. */
    /* "Show me" stays (Oct 16): a release without its own steps gets one step with its own news text, on its go tab. */
    if (news.lead) n.lead = news.lead; else delete n.lead;
    if (Array.isArray(news.steps) && news.steps.length) n.steps = news.steps;
    else n.steps = [{ tab: (news.go && news.go.tab) || 'home', text: { en: news.text.en, de: news.text.de, es: news.text.es } }];
    if (news.tutorial) n.tutorial = news.tutorial; else delete n.tutorial;
    /* Oct 23 2026: What's New is a mini tour in the tutorial's card. tour = this release's step ids (part 'new' in tutorial-steps.js);
       without "tour", a "tutorial" step id is the tour; with neither, the release shows one card with its own text. */
    { let S = null; try { S = require(path.resolve(root, 'tutorial-steps.js')); } catch (e) { }
      const tour = S && S.tourOf ? S.tourOf(news) : (Array.isArray(news.tour) ? news.tour : []);
      if (tour.length) n.tour = tour; else delete n.tour;
      /* the last releases' ids and tours, newest first, so a phone that skipped builds gets ONE tour with every unseen release's steps */
      const prev = (Array.isArray(n.history) ? n.history : []).filter(h => h && h.id && h.id !== n.id);
      n.history = [{ id: n.id, tour }].concat(prev).slice(0, 12); }
  }
  fs.writeFileSync(vp, JSON.stringify(d) + (raw.endsWith('\n') ? '\n' : ''));
  changed.push('version.json');
  return changed;
}

async function main() {
  const args = process.argv.slice(2);
  const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
  const root = path.resolve(opt('--root') || path.join(__dirname, '..'));
  const ids = buildIds(root);
  const distinct = [...new Set(Object.values(ids))];
  if (distinct.length !== 1 || !BUILD_RE.test(distinct[0] || '')) { console.error('build ids disagree before bump, fix first: ' + JSON.stringify(ids)); process.exit(2); }
  const oldId = distinct[0];
  let live = null;
  if (!args.includes('--no-live')) {
    const url = (opt('--live') || LIVE) + '?cb=' + Date.now();
    try { live = (await (await fetch(url, { cache: 'no-store' })).json()).build; } catch (e) { console.error('could not read live build (' + e.message + '); pass --no-live to bump without it'); process.exit(3); }
  }
  const newId = opt('--build') || nextBuild(oldId, live, berlinNow());
  if (!BUILD_RE.test(newId)) { console.error('bad --build ' + newId); process.exit(2); }
  if (newId <= oldId || (live && newId <= live)) { console.error('new build ' + newId + ' must be after repo ' + oldId + ' and live ' + live); process.exit(2); }
  const news = opt('--news') ? JSON.parse(fs.readFileSync(opt('--news'), 'utf8')) : null;
  if (news && args.includes('--quiet')) { console.error('BLOCKER: a quiet release (silent bug fix) has no What\'s New: drop --news or --quiet'); process.exit(5); }
  const tutErr = checkTutorial(root, news);
  if (tutErr) { console.error('BLOCKER: ' + tutErr); process.exit(5); }
  if (news && !Array.isArray(news.tour) && typeof news.tutorial !== 'string') console.warn('WARNING: this release has no tour step, so What\'s New shows only one card with its text. A user-visible change must ship a step in part \'new\' of tutorial-steps.js and list it in news.json "tour" (TUTORIAL.md, "What\'s New is a mini tour").');
  console.log('repo=' + oldId + ' live=' + live + ' new=' + newId);
  if (args.includes('--dry-run')) { console.log(newId); return; }
  const changed = applyBump(root, oldId, newId, news, { quiet: args.includes('--quiet') });
  const after = buildIds(root);
  if (new Set(Object.values(after)).size !== 1) { console.error('bump left ids disagreeing: ' + JSON.stringify(after)); process.exit(4); }
  for (const f of ID_FILES) { const p = path.join(root, f); if (fs.existsSync(p) && fs.readFileSync(p, 'utf8').includes(oldId)) { console.error('old build left in ' + f); process.exit(4); } }
  console.log('changed ' + changed.join(' '));
  console.log(newId);
}

module.exports = { nextBuild, berlinNow, applyBump, checkTutorial, toDate, fromDate };
if (require.main === module) main();
