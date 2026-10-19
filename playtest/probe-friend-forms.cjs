'use strict';
/* Oct 19 old-design purge round 3: friends on the friends tree (and in Community chat) are drawn with the current glass cell.
   node playtest/probe-friend-forms.cjs [--url URL] [--view chromium390|iphone13] [--shots DIR]
   Seeds two friends with shared looks, opens the friends tree, and reports what each spot draws. Exit 1 if any friend is an old mini-blob
   (cf-mini without the cell wall) or if two friends share gradient ids. */
const path = require('path'), fs = require('fs');
const L = require(process.env.BH_LIB || '/home/sprite/BUGHUNT/playtest/lib.cjs');
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const VIEW = arg('--view') || 'chromium390', SHOTS = arg('--shots');
(async () => {
  let url = arg('--url'), server = null;
  if (!url) { server = await L.serve(path.resolve(__dirname, '..')); url = 'http://127.0.0.1:' + server.address().port + '/'; }
  const h = await L.open({ url, view: VIEW, settle: 6000 });
  await h.page.evaluate(() => {
    const now = Date.now();
    localStorage.setItem('lowispike.friends.v1', JSON.stringify({ list: [
      { uid: 'aaaaaaaa-1111-4000-8000-000000000001', n: 'Ana', c: 'Blaze', since: now - 1e6, src: 'link' },
      { uid: 'bbbbbbbb-2222-4000-8000-000000000002', n: 'Ben', c: 'Drift', since: now - 2e6, src: 'link' },
      { uid: 'cccccccc-3333-4000-8000-000000000003', n: 'Cy', c: 'Nova', since: now - 3e6, src: 'link' }], ts: now }));
    localStorage.setItem('lowispike.friendlooks.v1', JSON.stringify({
      'aaaaaaaa-1111-4000-8000-000000000001': '1.3.0.ff8a5c.ffd36b.s.v.b.w.k1',
      'bbbbbbbb-2222-4000-8000-000000000002': '1.1.2.5cc8ff.b08cff.e.f.s.c.z9' }));
  });
  await h.page.reload(); await L.sleep(6000);
  const out = await h.page.evaluate(async () => {
    try { window.LowiCellRoom.closeTree(); } catch (e) {}
    window.LowiCellRoom.openTree();
    await new Promise(r => setTimeout(r, 1500));
    const spots = [...document.querySelectorAll('.cr-treep .cr-spot')].map(s => {
      const svg = s.querySelector('svg'); const cls = svg ? (svg.getAttribute('class') || '') : '';
      const r = svg ? svg.getBoundingClientRect() : { width: 0, height: 0 };
      return { uid: s.getAttribute('data-uid') || (s.classList.contains('cr-mine') ? 'me' : ''), cls, cell: !!(svg && svg.querySelector('.cw-wall')), w: Math.round(r.width), h: Math.round(r.height), ids: svg ? [...svg.querySelectorAll('[id]')].map(e => e.id) : [] };
    });
    return { spots, hasLooks: !!(window.LowiCompanion && window.LowiCompanion.friendSVG) };
  });
  if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await h.page.screenshot({ path: path.join(SHOTS, VIEW + '-friends-tree.png') }); }
  const friends = out.spots.filter(s => s.uid && s.uid !== 'me');
  const fails = [];
  for (const f of friends) { if (!f.cell) fails.push(f.uid + ': not the current cell (' + f.cls + ')'); if (f.w < 20) fails.push(f.uid + ': too small ' + f.w); }
  const seen = new Map();
  for (const f of friends) for (const id of f.ids) { if (seen.has(id) && seen.get(id) !== f.uid) fails.push('shared id ' + id); seen.set(id, f.uid); }
  console.log(JSON.stringify({ view: VIEW, url, spots: out.spots.map(s => ({ uid: s.uid.slice(0, 8), cls: s.cls.slice(0, 80), cell: s.cell, w: s.w, h: s.h, ids: s.ids.length })), errors: h.log.pageerror.slice(0, 5), fails }, null, 1));
  await h.browser.close(); if (server) server.close();
  process.exit(fails.length || h.log.pageerror.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
