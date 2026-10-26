/* MAYA-HANDOFF 0.37 (Mon 26 Oct 2026, Emmanuel on his iPad, German UI): "I just finished a session here in the Move, and I didn't get
   any points. No animation, no congrats. This should be giving me the most points ever ... And then the animation should be grandiose."
   Root cause: Mirror mode and Kreuzheben only fired lowi:mirror-done, which nothing listened to, so the session was never saved (Diese
   Woche 0/10 Min, Verlauf: Noch keine) and paid nothing. The Move player paid at most 30 XP.
   These tests run index.html's real saveSession / sessionReward / record against a stub ledger, read mirror-move.js's finish path,
   and check the reward table and the celebration words (move-finish-core.js). */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const html = read('index.html');
const mirror = read('mirror-move.js');
const core = (() => { try { return require('../move-finish-core.js'); } catch (e) { return null; } })();

/* the Move engine's save + pay block, run for real with a stub host */
function moveHarness(opts) {
  opts = opts || {};
  const a = html.indexOf('function saveSession(o){'), b = html.indexOf('function closePlayer(){', a);
  assert.ok(a > 0 && b > a, 'index.html has one saveSession/sessionReward/record block in the Move engine');
  const awards = [], celebrated = [], ledger = [];
  let n = 0;
  const host = {
    award(src, el, ov) {
      if (ov.eventId && ledger.some(e => e.eventId === ov.eventId)) return 0;
      if (ov.perDay && ledger.filter(e => e.src === src).length >= ov.perDay) return 0;
      awards.push(Object.assign({src}, ov)); ledger.push({src, eventId: ov.eventId}); return ov.amt;
    },
    refresh() {}
  };
  const ctx = {
    M: {sessions: [], eq: ['none']}, saves: 0,
    uid: () => 's' + (++n), today: () => '2026-10-26',
    H: () => host, $: () => null, renderScreen() {},
    window: {
      LowiMoveFinishCore: opts.noCore ? undefined : core,
      LowiMoveFinish: {celebrate: o => { celebrated.push(o); return {}; }, open: () => celebrated.length > 0}
    }
  };
  ctx.save = () => { ctx.saves++; };
  ctx.LowiMoveFinish = ctx.window.LowiMoveFinish;
  vm.createContext(ctx);
  vm.runInContext(html.slice(a, b) + '\nthis.record = record; this.saveSession = saveSession; this.sessionReward = sessionReward; this.celebrateSession = celebrateSession;', ctx);
  return {ctx, awards, celebrated};
}

test('a finished Mirror mode session is saved, paid and celebrated (it used to vanish)', () => {
  const {ctx, awards, celebrated} = moveHarness();
  const r = ctx.record({fmt: 'mirror', name: 'Schreibtisch-Reset', moved: 231, complete: true});
  assert.equal(ctx.M.sessions.length, 1, 'shows in Verlauf / Diese Woche (M.sessions)');
  const s = ctx.M.sessions[0];
  assert.equal(s.fmt, 'mirror'); assert.equal(s.moved, 231); assert.equal(s.day, '2026-10-26');
  assert.equal(r.min, 3);
  assert.equal(r.xp, core.xpFor(3, true)); assert.equal(s.xp, r.xp, 'the session remembers what it paid');
  assert.equal(awards.length, 1); assert.equal(awards[0].src, 'move:session'); assert.equal(awards[0].perDay, core.PER_DAY);
  assert.equal(awards[0].eventId, 'move:' + s.id, 'one payment per session');
  assert.equal(celebrated.length, 1, 'the grand finish plays'); assert.equal(celebrated[0].xp, r.xp); assert.equal(celebrated[0].complete, true);
});

test('a finished Kreuzheben session of about 2 minutes (rest skipped) still pays and celebrates', () => {
  const {ctx, awards, celebrated} = moveHarness();
  const r = ctx.record({fmt: 'hinge', name: 'Kreuzheben', moved: 150, reps: 24, complete: true});
  assert.equal(ctx.M.sessions[0].fmt, 'hinge'); assert.equal(ctx.M.sessions[0].reps, 24);
  assert.equal(r.min, 2); assert.ok(r.xp > 0, 'never nothing for a finished routine'); assert.equal(awards.length, 1);
  assert.equal(celebrated.length, 1);
});

test('the fourth big Move reward of a day pays nothing but the session still counts and still celebrates', () => {
  const {ctx, awards, celebrated} = moveHarness();
  for (let i = 0; i < 4; i++) ctx.record({fmt: 'mirror', name: 'x', moved: 240, complete: true});
  assert.equal(ctx.M.sessions.length, 4); assert.equal(awards.length, core.PER_DAY);
  assert.equal(ctx.M.sessions[0].xp, 0); assert.equal(celebrated.length, 4); assert.equal(celebrated[3].xp, 0);
});

test('an unfinished session under 3 minutes is saved but pays nothing and does not celebrate', () => {
  const {ctx, awards, celebrated} = moveHarness();
  const s = ctx.saveSession({fmt: 'desk', name: 'Desk', mins: 5, moved: 120});
  const r = ctx.sessionReward(s, ctx.H(), false);
  ctx.celebrateSession(r.min, r.xp, false, null, false);
  assert.equal(ctx.M.sessions.length, 1); assert.equal(r.xp, 0); assert.equal(awards.length, 0); assert.equal(celebrated.length, 0);
});

test('the Move player pays through the same reward, not the old 30 XP cap', () => {
  const a = html.indexOf('function finish(complete){'), b = html.indexOf('function saveSession(o){', a);
  assert.ok(a > 0 && b > a);
  const body = html.slice(a, b);
  assert.ok(!body.includes('Math.min(30, 2 * min)'), 'old 30 XP cap gone');
  assert.ok(/saveSession\(/.test(body) && /sessionReward\(sess, h, complete\)/.test(body), 'saves and pays through the shared path');
  assert.ok(/celebrateSession\(/.test(body), 'ends with the grand finish');
  const {ctx, awards} = moveHarness();
  const s = ctx.saveSession({fmt: 'desk', name: 'Desk Spike Breaker', mins: 10, moved: 600});
  assert.equal(ctx.sessionReward(s, ctx.H(), true).xp, 200); assert.equal(awards[0].amt, 200);
});

test('Mirror mode and Kreuzheben save through MOVE.record when they reach their end', () => {
  assert.ok(/window\.MOVE = \{[^\n]*\brecord\b/.test(html), 'MOVE.record is exported');
  const a = mirror.indexOf('function finish(s) {'), b = mirror.indexOf('\n    }\n', a);
  assert.ok(a > 0 && b > a);
  const fin = mirror.slice(a, b), rec = mirror.slice(mirror.indexOf('function recordFinish('), a);
  assert.equal((fin.match(/recordFinish\(/g) || []).length, 2, 'both the Mirror routines and Kreuzheben record');
  assert.ok(/W\.MOVE\.record\(\{[^}]*complete: true/.test(rec), 'recorded as a finished routine');
  assert.ok(/if \(finished === flow\) return null/.test(rec), 'one flow is recorded once');
  assert.ok(/activeSec \+=/.test(mirror) && /flow\.phase === 'follow' \|\| flow\.phase === 'rest'/.test(mirror), 'only time that really ran counts');
});

test('reward table: the biggest single reward in the app, capped at 60 minutes and 3 a day', () => {
  assert.ok(core, 'move-finish-core.js exists');
  assert.equal(core.xpFor(2), 0); assert.equal(core.xpFor(0, true), 0);
  assert.equal(core.xpFor(3), 165); assert.equal(core.xpFor(10), 200); assert.equal(core.xpFor(30), 300);
  assert.equal(core.xpFor(60), 450); assert.equal(core.xpFor(120), 450, 'no reward for overdoing it');
  assert.equal(core.xpFor(1, true), 155); assert.equal(core.PER_DAY, 3);
  const lowest = core.xpFor(1, true), amounts = [];
  const files = ['index.html'].concat(fs.readdirSync(root).filter(f => /\.js$/.test(f) && f !== 'move-finish-core.js'));
  for (const f of files) {
    const s = read(f);
    for (const m of s.matchAll(/award\(\s*(\d+)\s*,|amt:\s*(\d+)\b|\bxp\("[\w:]+", (\d+)|PF_XP\s*=\s*(\d+)/g)) amounts.push([f, +(m[1] || m[2] || m[3] || m[4])]);
  }
  assert.ok(amounts.length > 10, 'found the app\'s fixed rewards');
  for (const [f, v] of amounts) assert.ok(v < lowest, f + ' pays ' + v + ' XP, more than or equal to a finished Move session');
});

test('celebration words: EN/DE/ES, your companion\'s own name, never a fixed name', () => {
  for (const l of ['en', 'de', 'es']) {
    const w = core.words({lang: l, min: 12, xp: 210, name: 'Zorbo', pick: 1});
    assert.ok(w.title && w.minutes.includes('12') && w.note && w.more && w.dialog && w.say, l);
    assert.ok(w.glow.includes('Zorbo'), l + ' uses the companion name');
    const c = core.words({lang: l, min: 2, xp: 0, complete: true});
    assert.ok(c.capped && c.note, l + ' capped finished routine still gets a line');
  }
  assert.equal(core.words({lang: 'de', min: 5, xp: 175}).title, 'Geschafft!');
  const all = JSON.stringify(core.TXT) + JSON.stringify(core.SAY) + read('move-finish.js');
  assert.ok(!/misty/i.test(all), 'no fixed companion name');
  for (const l of ['en', 'de', 'es']) for (const s of core.SAY[l]) assert.ok(!/\d/.test(s), 'spoken lines carry no numbers, so each has its recorded clip');
});

test('the celebration is loaded, cached for offline, and can be closed with back', () => {
  for (const f of ['move-finish.css', 'move-finish-core.js', 'move-finish.js']) {
    assert.ok(html.includes(f + '?v='), f + ' loaded'); assert.ok(read('sw.js').includes('"' + f + '"'), f + ' in the offline list');
  }
  assert.ok(/function mvBack\(\)\{[^\n]*LowiMoveFinish[^\n]*close\("back"\)/.test(html), 'back closes the celebration first');
  const js = read('move-finish.js');
  assert.ok(/prefers-reduced-motion/.test(js) && /mf-rm/.test(js), 'calm under Reduce Motion');
  assert.ok(/role', 'dialog'/.test(js) && /aria-live/.test(js), 'VoiceOver announces it');
  assert.ok(/GUARD_MS/.test(js), 'the tap that ended the session cannot close it');
});
