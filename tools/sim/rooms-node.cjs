/* Runs the real community-rooms.js for N simulated phones in one Node process, against tools/sim/fake-realtime.cjs.
   const rn = require('./rooms-node.cjs'); const sim = rn.world({cap: 30}); const p = sim.phone('u1'); await p.start(); */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..', '..');
const CORE = fs.readFileSync(path.join(ROOT, 'community-rooms-core.js'), 'utf8');
const RT = fs.readFileSync(path.join(ROOT, 'community-rooms.js'), 'utf8');
const fake = require('./fake-realtime.cjs');
function world(opts) {
  opts = opts || {};
  const srv = fake.server(opts);
  const phones = [];
  function phone(uid, name) {
    const store = new Map(), events = [];
    const ctx = { console, setTimeout, clearTimeout, setInterval, clearInterval, Promise, Date, Math, JSON, Map, Set, Array, Object, String, Number, Error };
    ctx.window = ctx; ctx.globalThis = ctx; ctx.LOWI_ROOM_CAP = opts.cap || 0;
    ctx.sessionStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
    ctx.CustomEvent = function (type, init) { this.type = type; this.detail = init && init.detail; };
    ctx.document = { dispatchEvent: e => { events.push(e.detail); return true; } };
    vm.createContext(ctx); vm.runInContext(CORE, ctx); vm.runInContext(RT, ctx);
    const client = srv.client(), got = { energy: 0, insert: 0 };
    const p = { uid, name: name || uid, ctx, client, events, got, rooms: ctx.LowiRooms,
      start: () => ctx.LowiRooms.start({ client: async () => client, uid: () => uid, name: () => p.name, onInsert: () => got.insert++, onEnergy: () => got.energy++, onSwitch: () => {}, onStatus: () => {} }) };
    phones.push(p); return p;
  }
  function census() { const by = new Map(); for (const p of phones) { const r = p.rooms.active() ? p.rooms.num() : 0; by.set(r, (by.get(r) || 0) + 1); } return by; }
  return { srv, phone, phones, census };
}
module.exports = { world };
