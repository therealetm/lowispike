/* In-process fake of the Supabase Realtime pieces community-rooms.js uses (channels, presence, broadcast), with network delay.
   Lets the real community-rooms.js run for hundreds of simulated phones in one Node process (tools/sim/rooms-load.cjs and
   tests/community-rooms-runtime.test.cjs). Presence semantics follow Supabase: track() replaces this key's entry, untrack /
   leaving removes it, every subscriber gets a sync shortly after a change. Counts every frame a phone receives. */
'use strict';
function server(opts) {
  opts = opts || {};
  const lat = () => (opts.minMs || 20) + Math.random() * ((opts.maxMs || 120) - (opts.minMs || 20));
  const topics = new Map(); // name -> {subs:Set<chan>, presence: Map<key, payload>}
  const stats = { frames: 0, joins: 0, presenceMsgs: 0, broadcasts: 0 };
  /* Oct 24 2026: frames to one channel arrive in the order they were sent, as on one Supabase socket. Random latency per frame
     let an older presence snapshot land after a newer one, so a phone could end up missing someone who was there. */
  const pump = ch => { if (ch.timer || !ch.q.length) return; ch.timer = setTimeout(() => { ch.timer = null; const now = Date.now(); while (ch.q.length && ch.q[0].t <= now) ch.q.shift().f(); pump(ch); }, Math.max(0, ch.q[0].t - Date.now())); };
  /* one queue per channel, drained by one timer: separate timers can fire out of order when the event loop is busy */
  const at = (ch, f, due) => { const t = Math.max(due || (Date.now() + lat()), (ch.nextAt || 0) + 1); ch.nextAt = t; (ch.q = ch.q || []).push({ t, f }); pump(ch); };
  const T = name => { let t = topics.get(name); if (!t) { t = { subs: new Set(), presence: new Map() }; topics.set(name, t); } return t; };
  function syncAll(name) {
    const t = topics.get(name); if (!t) return; stats.presenceMsgs++;
    const snap = {}; for (const [k, p] of t.presence) snap[k] = [Object.assign({}, p)];
    for (const ch of t.subs) at(ch, () => { if (!ch.joined) return; ch.state = JSON.parse(JSON.stringify(snap)); ch.client.frames++; stats.frames++; ch.fire('presence', 'sync', {}); });
  }
  function client() {
    const c = { frames: 0, channels: new Set() };
    c.channel = (name, cfg) => {
      const key = (cfg && cfg.config && cfg.config.presence && cfg.config.presence.key) || ('anon-' + Math.random().toString(36).slice(2));
      const self = !!(cfg && cfg.config && cfg.config.broadcast && cfg.config.broadcast.self);
      const ch = { name, key, client: c, handlers: [], state: {}, joined: false, removed: false };
      ch.on = (type, filter, cb) => { ch.handlers.push({ type, filter: filter || {}, cb }); return ch; };
      ch.fire = (type, event, payload) => { for (const h of ch.handlers) if (h.type === type && (h.filter.event === event || h.filter.event === '*')) try { h.cb(payload); } catch (e) { console.error(e); } };
      ch.subscribe = cb => { stats.joins++; setTimeout(() => { if (ch.removed) return cb && cb('CLOSED'); ch.joined = true; T(name).subs.add(ch); c.channels.add(ch); cb && cb('SUBSCRIBED');
        /* like Supabase: an empty sync can come first, the real presence_state a moment later */
        setTimeout(() => { if (ch.joined) ch.fire('presence', 'sync', {}); }, 5);
        /* the snapshot is the room as it is when presence_state arrives (Oct 24 2026: it was taken at subscribe time, so a
           phone that joined first lost everyone who tracked in between, which real Supabase never does) */
        at(ch, () => { if (!ch.joined) return; const t = T(name), snap = {}; for (const [k, p] of t.presence) snap[k] = [Object.assign({}, p)]; ch.state = JSON.parse(JSON.stringify(snap)); c.frames++; stats.frames++; ch.fire('presence', 'sync', {}); }, Date.now() + lat() + (opts.stateMs || 150)); }, lat()); return ch; };
      ch.presenceState = () => ch.state;
      ch.track = async p => { if (!ch.joined) return 'error'; await new Promise(r => setTimeout(r, lat())); if (!ch.joined) return 'error'; T(name).presence.set(key, Object.assign({}, p)); syncAll(name); return 'ok'; };
      ch.untrack = async () => { const t = topics.get(name); if (t && t.presence.delete(key)) syncAll(name); return 'ok'; };
      ch.send = async m => { if (!ch.joined) return 'error'; stats.broadcasts++; const t = topics.get(name); if (!t) return 'ok';
        for (const o of t.subs) if (o !== ch || self) setTimeout(() => { if (!o.joined) return; o.client.frames++; stats.frames++; o.fire('broadcast', m.event, { event: m.event, payload: m.payload }); }, lat()); return 'ok'; };
      ch.insert = row => ch.fire('postgres_changes', 'INSERT', { new: row });
      return ch;
    };
    c.removeChannel = ch => { if (!ch) return; ch.removed = true; const t = topics.get(ch.name); if (t) { t.subs.delete(ch); if (t.presence.delete(ch.key)) syncAll(ch.name); if (!t.subs.size && !t.presence.size) topics.delete(ch.name); } ch.joined = false; c.channels.delete(ch); };
    return c;
  }
  /* What a database INSERT on a room fans out to: every subscribed channel whose filter matches (room=eq.<id>). */
  function insert(row) { let n = 0; for (const [, t] of topics) for (const ch of t.subs) for (const h of ch.handlers) { if (h.type !== 'postgres_changes' || h.filter.table !== 'messages') continue; const f = h.filter.filter; if (f && f !== 'room=eq.' + row.room) continue; n++; ch.client.frames++; stats.frames++; try { h.cb({ new: row }); } catch (e) { } } return n; }
  return { client, topics, stats, insert };
}
module.exports = { server };
