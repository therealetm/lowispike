/* Support rooms load test: N simulated phones run the real community-rooms.js against the fake realtime server.
   node tools/sim/rooms-load.cjs <N> <arrivalSeconds> [cap] [chatSeconds]
   Reports: how many rooms opened, occupancy, how long joining took, how many people had to move (over-cap races), and the
   live traffic each phone receives while everyone chats (1 message per person per minute) and shoots (1 shot per 10 s),
   compared with everyone in one room. */
'use strict';
const rn = require('./rooms-node.cjs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const [N = 100, arrive = 30, capArg = 0, chatS = 20] = process.argv.slice(2).map(Number);
(async () => {
  const C = require('../../community-rooms-core.js'); const cap = capArg || C.CAP;
  const w = rn.world({ cap, minMs: 30, maxMs: 180 });
  const ps = []; for (let i = 0; i < N; i++) ps.push(w.phone('u' + String(i).padStart(5, '0')));
  const t0 = Date.now(), joinMs = [];
  await Promise.all(ps.map(p => new Promise(r => setTimeout(() => { const s = Date.now(); p.start().then(() => { joinMs.push(Date.now() - s); r(); }, r); }, Math.random() * arrive * 1000))));
  let settled = 0, c;
  for (let i = 0; i < 120; i++) { await sleep(500); c = w.census(); const ok = !c.get(0) && [...c.entries()].every(([n, k]) => n === 0 || k <= cap + C.GUESTS); if (ok) { settled = Date.now() - t0; break; } }
  await sleep(1500); c = w.census();
  const moves = ps.map(p => p.events.filter(e => e && e.type === 'joining').length - 1);
  const occ = [...c.entries()].filter(([n]) => n > 0).map(([, k]) => k);
  const sorted = joinMs.slice().sort((a, b) => a - b), pct = q => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  // live traffic for chatS seconds
  ps.forEach(p => { p.got.energy = 0; p.got.insert = 0; }); const f0 = ps.map(p => p.client.frames);
  const end = Date.now() + chatS * 1000; let msgs = 0, shots = 0;
  while (Date.now() < end) { for (const p of ps) { if (Math.random() < 0.25 / 60) { msgs++; w.srv.insert({ id: 'm' + msgs, room: p.rooms.room(), body: 'x' }); } if (Math.random() < 0.25 / 10) { shots++; p.rooms.sendEnergy({ v: 1, id: 's' + shots }); } } await sleep(250); }
  await sleep(800);
  const per = ps.map((p, i) => (p.got.energy + p.got.insert) / chatS), perFrames = ps.map((p, i) => (p.client.frames - f0[i]) / chatS);
  const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
  const oneRoom = (N - 1) * (1 / 60 + 1 / 10); // what each phone would receive per second with everyone in one room
  const out = { N, arriveSeconds: arrive, cap, rooms: occ.length, occupancy: { min: Math.min(...occ), max: Math.max(...occ), avg: +avg(occ).toFixed(1) }, notPlaced: c.get(0) || 0,
    settledSeconds: settled ? +(settled / 1000).toFixed(1) : 'not within 60s', joinSeconds: { p50: +(pct(.5) / 1000).toFixed(2), p95: +(pct(.95) / 1000).toFixed(2), max: +(sorted[sorted.length - 1] / 1000).toFixed(2) },
    peopleMoved: moves.filter(m => m > 0).length, movesTotal: moves.reduce((a, b) => a + Math.max(0, b), 0), sent: { msgs, shots },
    perPhonePerSecond: { chatAndShots: +avg(per).toFixed(2), allFrames: +avg(perFrames).toFixed(2), maxChatAndShots: +Math.max(...per).toFixed(2) }, everyoneInOneRoomPerPhonePerSecond: +oneRoom.toFixed(1),
    serverTotals: w.srv.stats };
  console.log('RESULT ' + JSON.stringify(out));
  ps.forEach(p => p.rooms.stop()); await sleep(300); process.exit(0);
})();
