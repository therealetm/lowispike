'use strict';
/* 24 Oct 2026 (handoff: offline companions + zoomed-out Circle entry): opens Community -> Room in the simulated app, seats you with
   6 members in the live room (read-only stub, nothing is written), makes 5 other members your friends who are offline, and checks:
   the room opened zoomed out with every companion on screen, offline friends rest (faded, moon, "offline"), tapping one opens
   the profile card ("Resting", no Chat), nothing got selected, and a resting companion is not on the energy table.
   node tools/check-circle-offline.cjs <'iPhone 13'|'iPhone SE'|'iPad'|'iPad landscape'> [url|root] [lang] */
const H = require('./sim/harness.cjs');
const sleep = H.sleep;
(async () => {
  const device = process.argv[2] || 'iPhone 13', where = process.argv[3] || '', lang = process.argv[4] || 'en';
  const SIZES = { 'iPhone 13': [390, 844, 3], 'iPhone SE': [375, 667, 2], 'iPad': [820, 1180, 2], 'iPad landscape': [1180, 820, 2] }, sz = SIZES[device] || [390, 844, 3];
  const o = { device, engine: 'chromium', viewport: { width: sz[0], height: sz[1] }, dpr: sz[2], members: 20, messages: 40, probe: false, lang }; if (/^https?:/.test(where)) o.url = where; else if (where) o.root = where;
  const R = await H.open(o), P = R.page, out = { device, lang, steps: [] }, ok = (name, pass, info) => out.steps.push({ name, pass: pass === null ? null : !!pass, info });
  const tag = device.replace(/\W/g, '') + '-' + lang;
  try {
    await R.goto(); await sleep(5000);
    out.build = await P.evaluate(() => (document.querySelector('meta[name="lowi-build"]') || {}).content || '');
    /* seat the room and the friends before Community opens, so the entry is a fresh one */
    out.seat = await P.evaluate(() => { const R = window.LowiRooms, H = window.LowiCommunityHost; if (!R || !H) return null; const me = (H.uid && H.uid()) || 'me',
      ids = H.people().map(p => p && p.uid).filter(u => u && u !== me && !String(u).startsWith('bot:'));
      const a = [me].concat(ids.slice(0, 6)), fr = ids.slice(6, 11);
      R.status = () => 'in'; R.active = () => true; R.num = () => 1; R.members = () => a.slice(); R.has = u => a.includes(u);
      R.rooms = () => [{ n: 1, u: a.slice(), c: a.length, g: 0, t: Date.now() }]; R.readDirectory = () => Promise.resolve();
      const pm = new Map(H.people().map(p => [p.uid, p]));
      window.LowiCellRoom = Object.assign(window.LowiCellRoom || {}, { friends: () => fr.map(u => ({ uid: u, n: (pm.get(u) || {}).n || 'Friend', c: '#9fd8ff' })) });
      return { here: a, friends: fr }; });
    ok('room seated (stub)', out.seat && out.seat.here.length > 1, out.seat);
    await P.evaluate(() => goTab('foryou')); await sleep(1200);
    await R.tap('#cmPaneChat .rm-tab[data-rm="room"]').catch(() => { }); await sleep(3500);
    const st = await P.evaluate(() => { const g = document.querySelector('#cgGalaxy') || document.querySelector('.cg-field'), vw = innerWidth, vh = innerHeight;
      const b = [...document.querySelectorAll('#cmPaneChat .cg-body')].map(e => { const r = e.querySelector('.cg-orb').getBoundingClientRect(); return { uid: e.dataset.uid, act: e.dataset.chat, rest: e.classList.contains('resting'), me: e.classList.contains('me'), x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), w: Math.round(r.width), op: +getComputedStyle(e).opacity, tag: (e.querySelector('.cg-resttag') || {}).textContent || '', zz: !!e.querySelector('.cg-zz') }; });
      return { vw, vh, bodies: b }; });
    const rest = st.bodies.filter(b => b.rest), live = st.bodies.filter(b => !b.rest);
    ok('offline friends rest on the map', rest.length === out.seat.friends.length && rest.every(b => out.seat.friends.includes(b.uid)), { rest: rest.map(b => b.uid), friends: out.seat.friends });
    ok('people who are here are not resting', live.every(b => b.me || out.seat.here.includes(b.uid) || String(b.uid).startsWith('bot') || !out.seat.friends.includes(b.uid)), live.map(b => b.uid));
    ok('resting look: faded, a moon and "offline"', rest.length && rest.every(b => b.op < .8 && b.zz && b.tag), rest.slice(0, 3));
    ok('resting companions are not live talk targets', rest.every(b => b.act === 'person-off'));
    const onScreen = st.bodies.filter(b => b.x > 0 && b.x < st.vw && b.y > 60 && b.y < st.vh - 60);
    ok('opens zoomed out: every companion is on screen', onScreen.length === st.bodies.length, { on: onScreen.length, all: st.bodies.length, off: st.bodies.filter(b => !onScreen.includes(b)).map(b => [b.uid, b.x, b.y]) });
    out.cam = await P.evaluate(() => { const gx = window.__lgGx; return gx ? { spots: gx.map.spots.length, radius: gx.map.radius } : null; });
    await R.shot('/tmp/co-' + tag + '-room.png');
    /* energy table: a resting uid is not a body */
    out.table = await P.evaluate(u => { const E = window.LowiEnergy || window.LowiCgEnergy; if (!E || !E.offset) return 'no energy api'; return { off: E.offset(u) }; }, rest[0] && rest[0].uid);
    ok('resting companion has no energy-table offset (not on the table)', out.table === 'no energy api' ? null : out.table.off == null, out.table);
    if (rest[0]) {
      const loc = P.locator('#cmPaneChat .cg-body.resting[data-uid="' + rest[0].uid + '"]').first();
      await R.tapEl(loc); await sleep(1400);
      const card = await P.evaluate(() => { const c = [...document.querySelectorAll('.r2-ov.on .cp-card')].pop(); if (!c) return null; return { live: (c.querySelector('.cp-live') || {}).textContent || '', cls: (c.querySelector('.cp-live') || {}).className || '', chat: !!c.querySelector('[data-chat="select-close"]'), note: (c.querySelector('.cp-restnote') || {}).textContent || '' }; });
      ok('tap opens the profile card marked resting, with no Chat', card && /cp-rest/.test(card.cls) && !card.chat && card.note, card);
      await R.shot('/tmp/co-' + tag + '-card.png');
      const to = await P.evaluate(() => (document.querySelector('#cgTo') || {}).textContent || '');
      ok('nobody got selected to talk to', !/Talking|Spricht|Hablando/.test(to), to);
    }
  } catch (e) { ok('run', false, String(e && e.stack || e).slice(0, 600)); }
  out.pass = out.steps.every(s => s.pass !== false);
  console.log(JSON.stringify(out, null, 1));
  await R.close().catch(() => { }); process.exit(out.pass ? 0 : 1);
})();
