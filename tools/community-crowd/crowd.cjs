#!/usr/bin/env node
'use strict';
/* Community crowd simulation (Emmanuel, Oct 19 2026).
   Up to 100 simulated members sign up with real accounts, get their own companion, chat in the Community room,
   post meal photos to the feed, talk about real supermarket products, send energy, react, and answer Emmanuel
   and his beta testers. They live in many time zones, so the room is never fully asleep.
   The beta testers know about it. Stop it any time: disable the "community crowd" workflow on GitHub, or
   set the repo variable CROWD_OFF=1. Accounts sign in with passwords derived from the CROWD_SEED secret.

   node tools/community-crowd/crowd.cjs once     one round: new members join, replies, everyday activity
   node tools/community-crowd/crowd.cjs serve    replies only, every 40 s, while this machine is awake
   node tools/community-crowd/crowd.cjs status   counts only */
const crypto = require('crypto'), fs = require('fs'), path = require('path'), os = require('os');
const K = require('./content.cjs');
const ROOT = path.resolve(__dirname, '..', '..');
const CC = require(path.join(ROOT, 'companion-core.js')), CB = require(path.join(ROOT, 'companion-birth-core.js'));
const SB = 'https://vnfwmifmsfecascwaody.supabase.co', KEY = 'sb_publishable_iVA3wCYxzfWu2q8SSgieWw_adXbx4Qd';
const MAX = Math.max(0, Math.min(100, +(process.env.CROWD_MAX || 100)));
const LAUNCH = Date.parse('2026-10-19T19:15:00Z');
const HOME_DIR = path.join(os.homedir(), '.config', 'lowispike-crowd');
const STATE = process.env.CROWD_STATE || path.join(HOME_DIR, 'state.json');
const SEED = (process.env.CROWD_SEED || (fs.existsSync(path.join(HOME_DIR, 'seed')) ? fs.readFileSync(path.join(HOME_DIR, 'seed'), 'utf8') : '')).trim();
const MEALS = JSON.parse(fs.readFileSync(path.join(__dirname, 'meal-photos.json'), 'utf8'));
const REAL_NAMES = /^(eman|fernando|joseph|koji|q|manuuii|emmy|emma|misty|maya|member|fixture)\b/i;

/* ---------- randomness ---------- */
const h32 = s => crypto.createHash('sha256').update(String(s)).digest().readUInt32LE(0);
function rng(s) { let a = h32(s); return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const pick = (a, r = Math.random) => a[Math.floor(r() * a.length)];
function weighted(items, w, r = Math.random) { const tot = items.reduce((s, x) => s + w(x), 0); let v = r() * tot; for (const x of items) { v -= w(x); if (v <= 0) return x; } return items[items.length - 1]; }
function poisson(m, r = Math.random) { let k = 0, p = Math.exp(-m), s = p, u = r(); while (u > s && k < 50) { k++; p *= m / k; s += p; } return k; }
const roll = (id, salt) => h32(salt + ':' + id) / 4294967296;

/* ---------- members ---------- */
let PEOPLE = null;
function people() {
  if (PEOPLE) return PEOPLE;
  const used = new Set(); PEOPLE = [];
  for (let i = 0; i < 100; i++) {
    const r = rng('persona:' + i), o = weighted(K.ORIGINS, x => x[0], r);
    const [, code, lang, tz, cities, names] = o;
    const age = 17 + Math.floor(Math.pow(r(), 1.5) * 42), band = age < 26 ? 'genz' : age < 41 ? 'mill' : 'old';
    const first = pick(names, r), ini = String.fromCharCode(65 + Math.floor(r() * 26));
    const forms = band === 'genz' ? [first.toLowerCase(), first.toLowerCase() + '.' + ini.toLowerCase(), first.toLowerCase() + '_' + (90 + Math.floor(r() * 15)), first, first + ' ' + ini]
      : band === 'mill' ? [first, first + ' ' + ini + '.', first + ini.toLowerCase() + (80 + Math.floor(r() * 15))] : [first + ' ' + ini + '.', first];
    let name = pick(forms, r), n = 0; while ((used.has(name.toLowerCase()) || REAL_NAMES.test(name)) && n < 40) { name = first + ' ' + String.fromCharCode(65 + (h32(i + ':' + n++) % 26)) + '.'; }
    used.add(name.toLowerCase());
    const y = 2026 - age, mo = 1 + Math.floor(r() * 12), d = 1 + Math.floor(r() * 28);
    const bday = y + '-' + String(mo).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    const btime = r() < 0.45 ? String(Math.floor(r() * 24)).padStart(2, '0') + ':' + String(Math.floor(r() * 60)).padStart(2, '0') : '';
    const mbti = r() < 0.55 ? pick(K.MBTI, r) : '';
    let g = null; try { g = CB.generate({ bday, btime, mbti }); } catch (e) { g = null; }
    PEOPLE.push({ i, code, lang, tz, city: pick(cities, r), first, name, age, band, bday, btime, mbti,
      focus: pick(K.FOCUS, r), chat: 0.3 + Math.pow(r(), 2) * 2.7, owl: r() < (band === 'genz' ? 0.5 : 0.15), lvRate: 0.25 + r() * 0.9,
      xpStart: Math.floor(Math.pow(r(), 3) * 900), comp: g && g.name || first + '\'s buddy', g, english: lang === 'en' || r() < 0.55 });
  }
  return PEOPLE;
}
const email = i => 'crowd' + String(i).padStart(3, '0') + '@crowd.lowispike.invalid';
const password = i => 'C!' + crypto.createHmac('sha256', SEED).update('pw:' + i).digest('base64url').slice(0, 28);

function hourIn(tz, t) { return +new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: 'numeric', hourCycle: 'h23' }).format(t) % 24; }
const CURVE = [.12, .06, .03, .02, .02, .04, .2, .6, .9, .9, .8, .8, 1, 1, .8, .8, .9, 1, 1.2, 1.3, 1.3, 1.2, .9, .45];
function awake(p, t) { const h = hourIn(p.tz, t); let w = CURVE[h]; if (p.owl && (h >= 22 || h <= 2)) w = Math.max(w, 1.1); if (p.owl && h >= 6 && h <= 9) w *= 0.4; return w; }

/* ---------- level ---------- */
const XP = [0, 100, 300, 700, 1500, 3000];
function xpOf(p, joined, t) { const days = Math.max(0, (t - joined) / 864e5); return Math.round(p.xpStart + days * p.lvRate * 160 + (h32('xp:' + p.i + ':' + Math.floor(t / 864e5)) % 40)); }
function lvOf(xp) { let i = 0; while (i < 5 && xp >= XP[i + 1]) i++; return i + 1; }
function look(p, lv, born) { if (!p.g) return null; try { return CC.encode(CC.genome({ sign: { element: p.g.element }, personality: p.mbti || '', palette: p.g.palette }, Math.min(5, lv - 1), born)); } catch (e) { return null; } }

/* ---------- writing ---------- */
const cap1 = s => s ? s[0].toUpperCase() + s.slice(1) : s;
function voice(p, s, r = Math.random, lang) {
  let t = String(s).trim(); if (!t) return t;
  const sl = K.SLANG[p.code], speaksOwn = (lang || p.lang) === p.lang;
  if (p.band === 'genz') {
    t = t.toLowerCase().replace(/[.!]+$/, '');
    if (sl && speaksOwn && r() < 0.35) t = r() < 0.5 ? pick(sl.pre, r) + ' ' + t : t + ' ' + pick(sl.suf, r);
    if ((lang || p.lang) === 'en' && r() < 0.5) t = t.replace(/\byou\b/g, 'u').replace(/\byour\b/g, 'ur').replace(/\bright now\b/g, 'rn').replace(/\bto be honest\b|\btbh\b/g, 'tbh');
    if (r() < 0.4) t += ' ' + pick(K.EMOJI.genz, r);
  } else if (p.band === 'mill') {
    if (r() < 0.6) t = cap1(t);
    if (sl && speaksOwn && r() < 0.2) t += ' ' + pick(sl.mill, r);
    if (r() < 0.35) t += ' ' + pick(K.EMOJI.mill, r);
  } else {
    t = cap1(t); if (!/[.?!)]$/.test(t)) t += /\?/.test(s) ? '' : '.';
    if (r() < 0.12) t += ' 🙂';
  }
  if (/^(br|jp|pl-nl|nordic)$/.test(p.code) && (lang || p.lang) === 'en') t = t.replace(/\bI'm\b/g, 'I am').replace(/\bdon't\b/g, 'do not').replace(/\bit's\b/g, 'it is');
  return t.slice(0, 560);
}
let PRODUCTS = null;
function products() {
  if (PRODUCTS) return PRODUCTS; PRODUCTS = [];
  for (const f of ['rewe', 'edeka', 'lidl', 'aldi', 'kaufland', 'penny', 'netto', 'famila']) {
    let d; try { d = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'shop', f + '.json'), 'utf8')); } catch (e) { continue; }
    const c = d.cols || [], ni = c.indexOf('n'), bi = c.indexOf('b'), si = c.indexOf('s');
    const rows = (d.rows || []).filter(x => x[ni] && x[bi] && typeof x[si] === 'number' && String(x[ni]).length <= 38 && String(x[bi]).length <= 22);
    const r = rng('shop:' + f); for (let k = 0; k < 60 && rows.length; k++) { const x = rows[Math.floor(r() * rows.length)]; PRODUCTS.push({ prod: String(x[ni]).trim(), brand: String(x[bi]).split(',')[0].trim(), sugar: Math.round(x[si] * 10) / 10, chain: d.name || f }); }
  }
  return PRODUCTS;
}
const CHAINS = ['REWE', 'EDEKA', 'Lidl', 'ALDI', 'Kaufland', 'famila', 'Netto'];
function fill(p, s, ctx, r = Math.random) {
  const foods = K.FOODS[p.code] || K.FOODS[p.lang] || K.FOODS.de;
  return s.replace(/\{(\w+)\}/g, (m, k) => {
    if (ctx && ctx[k] != null) return ctx[k];
    switch (k) {
      case 'food': return pick(foods, r); case 'city': return p.city; case 'comp': return p.comp;
      case 'h': return String(12 + Math.floor(r() * 7)); case 'n': return String(1000 * (3 + Math.floor(r() * 11)));
      case 'chain': return pick(CHAINS, r); case 'meal': return pick(MEALS.meals, r)[0];
      default: return m;
    }
  });
}
function line(p, topic, ctx, lang) { const lg = lang || p.lang, bank = K.L[lg][topic]; if (!bank) return ''; if (typeof bank === 'string') return fill(p, bank, ctx); return voice(p, fill(p, pick(bank), ctx), Math.random, lg); }

/* ---------- Supabase ---------- */
const stats = { calls: 0, errors: {}, slow: 0, maxMs: 0 };
async function call(method, url, tok, body, headers) {
  const t0 = Date.now(); stats.calls++;
  const h = Object.assign({ apikey: KEY, Authorization: 'Bearer ' + (tok || KEY) }, body && !(body instanceof Uint8Array) ? { 'Content-Type': 'application/json' } : {}, headers || {});
  let r; try { r = await fetch(SB + url, { method, headers: h, body: body == null ? undefined : body instanceof Uint8Array ? body : JSON.stringify(body) }); }
  catch (e) { stats.errors.network = (stats.errors.network || 0) + 1; throw e; }
  const ms = Date.now() - t0; stats.maxMs = Math.max(stats.maxMs, ms); if (ms > 3000) stats.slow++;
  const txt = await r.text(); let b = null; try { b = txt ? JSON.parse(txt) : null; } catch (e) { b = txt; }
  if (!r.ok) { const k = String(r.status); stats.errors[k] = (stats.errors[k] || 0) + 1; const e = new Error(r.status + ' ' + String(typeof b === 'string' ? b : JSON.stringify(b)).slice(0, 200)); e.status = r.status; e.body = b; throw e; }
  return b;
}
const get = (tok, q) => call('GET', '/rest/v1/' + q, tok);
const ins = (tok, table, row, prefer) => call('POST', '/rest/v1/' + table, tok, row, { Prefer: prefer || 'return=minimal' });

async function session(st, p, mayCreate) {
  const b = st.bots[p.i];
  if (b && b.tok && b.exp > Date.now() + 120e3) return b.tok;
  try {
    const a = await call('POST', '/auth/v1/token?grant_type=password', null, { email: email(p.i), password: password(p.i) });
    st.bots[p.i] = Object.assign(b || { joined: Date.now() }, { id: a.user.id, tok: a.access_token, exp: Date.now() + (a.expires_in || 3600) * 1000 });
    return a.access_token;
  } catch (e) {
    if (e.status !== 400 || !mayCreate) throw e;
  }
  const a = await call('POST', '/auth/v1/signup', null, { email: email(p.i), password: password(p.i), data: { name: p.name } });
  if (!a.access_token) throw new Error('signup gave no session');
  st.bots[p.i] = { id: a.user.id, tok: a.access_token, exp: Date.now() + (a.expires_in || 3600) * 1000, joined: Date.now(), fresh: true };
  return a.access_token;
}
async function profile(st, p, tok, force) {
  const b = st.bots[p.i], day = new Date().toISOString().slice(0, 10);
  if (!force && b.prof === day) return;
  const xp = xpOf(p, b.joined, Date.now()), lv = lvOf(xp), streak = Math.max(1, Math.floor((Date.now() - b.joined) / 864e5) + 1 + (p.xpStart > 200 ? Math.floor(p.xpStart / 60) : 0));
  const row = { id: b.id, name: p.name, lv, xp, streak, bio: '', avatar: '', look: look(p, lv, b.joined), updated_at: new Date().toISOString() };
  if (p.g && p.g.sign) row.sign = p.g.sign; if (p.mbti) row.mbti = p.mbti; row.bday = p.bday;
  try { await ins(tok, 'profiles', row, 'resolution=merge-duplicates,return=minimal'); }
  catch (e) { if (e.status === 400 && /column/.test(e.message)) { delete row.sign; delete row.mbti; delete row.bday; await ins(tok, 'profiles', row, 'resolution=merge-duplicates,return=minimal'); } else throw e; }
  b.prof = day; b.lv = lv;
}
const newId = () => 'm' + crypto.randomUUID();
/* Support rooms (20 Oct): the app puts people into rooms ('all' = room 1, r2, r3, ...). The crowd answers in the room of the message
   it answers, and its own chatter goes to a room where a person wrote in the last 30 minutes (room 1 when nobody did). */
let SAY_ROOM = 'all'; const HUMAN_ROOM = new Map();
const okRoom = r => (r === 'all' || /^r\d{1,3}$/.test(String(r || ''))) ? r : 'all';
function noteRooms(msgs, bots) { const now = Date.now(); HUMAN_ROOM.clear(); for (const m of msgs.slice().reverse()) if (m && m.user_id && !(bots && bots.has(m.user_id)) && now - Date.parse(m.created_at || 0) < 30 * 60e3) HUMAN_ROOM.set(m.user_id, okRoom(m.room || 'all')); }
function liveRoom() { const rs = [...new Set(HUMAN_ROOM.values())]; return rs.length ? rs[Math.floor(Math.random() * rs.length)] : 'all'; }
let lastSay = 0;
async function say(st, p, body, reply) {
  const tok = await session(st, p); const id = newId();
  const gap = 2500 + Math.random() * 9000 - (Date.now() - lastSay); if (lastSay && gap > 0) await new Promise(r => setTimeout(r, gap)); lastSay = Date.now();
  await ins(tok, 'messages', { id, user_id: st.bots[p.i].id, room: okRoom(SAY_ROOM), who: p.name.slice(0, 40), body: String(body).slice(0, 600), reply_to: reply || null });
  st.said = (st.said || 0) + 1; return id;
}
async function photoBytes(meal) {
  const r = await fetch(MEALS.base + meal[1] + '/medium'); if (!r.ok) { const r2 = await fetch(MEALS.base + meal[1]); if (!r2.ok) throw new Error('photo ' + r2.status); return new Uint8Array(await r2.arrayBuffer()); }
  return new Uint8Array(await r.arrayBuffer());
}
async function upload(tok, objPath, bytes) {
  await call('POST', '/storage/v1/object/media/' + objPath, tok, bytes, { 'Content-Type': 'image/jpeg', 'x-upsert': 'true', 'cache-control': '31536000' });
  return SB + '/storage/v1/object/public/media/' + objPath;
}
async function chatPhoto(st, p) {
  const tok = await session(st, p), meal = pick(MEALS.meals), uid = st.bots[p.i].id, pid = crypto.randomBytes(6).toString('hex');
  const url = await upload(tok, uid + '/chat-' + pid + '.jpg', await photoBytes(meal));
  const capText = line(p, 'photoCap', { meal: meal[0] });
  const id = await say(st, p, '\u{1F4F7} ' + url + (capText ? ' ' + capText : ''));
  (st.photos = st.photos || []).push(id); st.photos = st.photos.slice(-200); return id;
}
async function mealPost(st, p) {
  const tok = await session(st, p), meal = pick(MEALS.meals), uid = st.bots[p.i].id, id = 't' + crypto.randomBytes(7).toString('hex');
  const photo_url = await upload(tok, uid + '/' + id + '.jpg', await photoBytes(meal));
  const lv = st.bots[p.i].lv || 1;
  await ins(tok, 'posts', { id, user_id: uid, who: p.name.slice(0, 40), plat: '', url: '', meta: null, cap: 'Just ate: ' + meal[0], photo_url, video_url: '', poster: '', w: 0, h: 0, dur: 0, rec: '', mine: false, art: null, lv });
  st.posts = (st.posts || 0) + 1; return id;
}

/* ---------- meal logging ----------
   Members log what they eat the way the app saves it: one entry in S.logs inside the `lowispike.v2` key of their
   own `user_state` backup row (the shape LowiVitalsBridge.logMeal writes, DATA_CONTRACTS.md "Meal slot"). At most
   one meal per slot per local day, in the member's own time zone; macros stay null (unknown, never zero). */
const SLOTS = [['breakfast', 6, 10], ['lunch', 11, 14], ['snack', 15, 17], ['dinner', 18, 21]];
function slotAt(p, t) { const h = hourIn(p.tz, t); for (const [s, a, b] of SLOTS) if (h >= a && h <= b) return s; return p.owl && (h >= 22 || h <= 1) ? 'snack' : ''; }
function dayIn(tz, t) { return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(t); }
function mealTitle(p, slot, r = Math.random) {
  const foods = K.FOODS[p.code] || K.FOODS[p.lang] || K.FOODS.de;
  return slot === 'snack' || r() < 0.55 ? pick(foods, r) : pick(MEALS.meals, r)[0];
}
function mealLog(p, t, title, slot, id) {
  id = id || 'crowd-' + crypto.randomBytes(5).toString('hex');
  return { id, eventId: 'meal:' + id, ts: t, day: dayIn(p.tz, t), t: String(title).slice(0, 80), macros: null, photo: '', via: 'spirit', r: 'unknown', e: '', lvl: '', slot };
}
/* Adds the log to a lowispike.v2 state object; false when that slot is already logged that day. Keeps the newest 120. */
function addMeal(s, log) {
  s.logs = Array.isArray(s.logs) ? s.logs : [];
  if (s.logs.some(l => l && l.day === log.day && l.slot === log.slot)) return false;
  s.logs.push(log); if (s.logs.length > 120) s.logs = s.logs.slice(-120); return true;
}
async function logMealFor(st, p, now) {
  const slot = slotAt(p, now); if (!slot) return null;
  const tok = await session(st, p), uid = st.bots[p.i].id;
  const rows = await get(tok, 'user_state?select=data&id=eq.' + uid);
  const data = rows && rows[0] && rows[0].data && typeof rows[0].data === 'object' ? rows[0].data : {};
  let s = {}; try { s = JSON.parse(data['lowispike.v2'] || '{}') || {}; } catch (e) { s = {}; }
  const log = mealLog(p, now, mealTitle(p, slot), slot);
  if (!addMeal(s, log)) return null;
  data['lowispike.v2'] = JSON.stringify(s);
  await ins(tok, 'user_state', { id: uid, data, updated_at: new Date(now).toISOString() }, 'resolution=merge-duplicates,return=minimal');
  st.meals = (st.meals || 0) + 1; return log;
}

/* ---------- real energy balls ----------
   The app sends energy balls as broadcast events ("energy") on the shared realtime channel "lowi-all" (index.html
   energyShot(), community-energy.js remote()). Members send the same compact shot through Supabase's realtime REST
   broadcast, aimed from their own spot on the receiver's map (the receiver always sits at 0,0; spots come from
   community-galaxy.js mapLayout over the profiles, so the aim is close but not guaranteed). */
let GAL = null; function galaxy() { if (!GAL) GAL = require(path.join(__dirname, '..', '..', 'community-galaxy.js')); return GAL; }
function shotAt(byUid, toUid, uids, r = Math.random) {
  const L = galaxy().mapLayout(uids.filter(u => u && u !== toUid).map(uid => ({ uid })), toUid), sp = L.spots.find(s => s.uid === byUid);
  if (!sp) return null;
  const a = Math.atan2(-sp.y, -sp.x) + (r() - 0.5) * 0.12;
  return { v: 1, id: 'c' + crypto.randomBytes(6).toString('hex'), by: byUid, a: +a.toFixed(3), p: +(0.7 + r() * 0.3).toFixed(2), to: toUid, ht: 300 + Math.round(r() * 300), t: Date.now() };
}
async function broadcast(tok, payloads, room) {
  const topics = ['lowi-room-' + okRoom(room || 'all'), 'lowi-all']; /* the person's room channel; lowi-all for apps from before rooms */
  await call('POST', '/realtime/v1/api/broadcast', tok, { messages: payloads.flatMap(p => topics.map(topic => ({ topic, event: 'energy', payload: p, private: false }))) });
  return payloads.length;
}
const nap = ms => new Promise(r => setTimeout(r, ms));
let UIDS = null, UIDS_AT = 0;
async function mapUids(tok) { if (!UIDS || Date.now() - UIDS_AT > 5 * 60e3) { const rows = await get(tok, 'profiles?select=id,name&limit=1000'); UIDS = rows.filter(x => x && x.id && x.name).map(x => x.id); UIDS_AT = Date.now(); } return UIDS; }
/* a burst of 1 to 3 real balls from member p at a person (uid), spaced like a thumb on the joystick */
async function energyBalls(st, p, toUid) {
  const tok = await session(st, p), by = st.bots[p.i].id, uids = await mapUids(tok);
  if (!uids.includes(by)) uids.push(by);
  const n = 1 + Math.floor(Math.random() * 3); let sent = 0;
  for (let k = 0; k < n; k++) { const s = shotAt(by, toUid, uids); if (!s) break; await broadcast(tok, [s], HUMAN_ROOM.get(toUid) || 'all'); sent++; if (k < n - 1) await nap(350 + Math.random() * 500); }
  st.balls = (st.balls || 0) + sent; return sent;
}

/* ---------- reading the room ---------- */
function botIndex(st) { const m = new Map(); Object.keys(st.bots).forEach(i => st.bots[i].id && m.set(st.bots[i].id, people()[+i])); return m; }
function langOf(text) { const s = ' ' + String(text).toLowerCase() + ' '; if (/ (und|ich|nicht|heute|hast|danke|gibt|wie|moin|hallo|energie geschickt) /.test(s)) return 'de'; if (/ (que|qué|hola|gracias|para|está|te envió|yo |cómo|buenas) /.test(s)) return 'es'; return 'en'; }
function topicOf(text) {
  const s = String(text).toLowerCase();
  if (/\u26a1/.test(s)) return 'energy';
  if (/^@?\S*\s*(hi|hey|hello|yo|hallo|moin|hola|servus|sup|ey|gm|good morning|guten morgen|buenos)\b/.test(s) && s.length < 40) return 'greet';
  if (/how are|how's it|wie geht|qué tal|como estas|cómo estás|wyd|what's up|was geht/.test(s)) return 'how';
  if (/eat|ate|food|dinner|lunch|breakfast|meal|essen|gegessen|hunger|comida|cena|comer|desayun/.test(s)) return 'food';
  if (/companion|level|evolv|misty|begleiter|compañero|nivel/.test(s)) return 'comp';
  if (/app|update|feature|tutorial|bug|chat|design|neue|nueva/.test(s)) return 'app';
  if (/\?/.test(s)) return 'q';
  return 'generic';
}
const REPLY_TOPIC = { greet: 'rGreet', how: 'rHow', food: 'rFood', comp: 'rComp', app: 'rApp', q: 'rQ', generic: 'rGeneric', energy: 'rEnergy' };
/* who an @mention is for. Longest name wins, and the name must end there: "@Thiago M." is Thiago M., not also Thiago
   (19 Oct, 10 PM: one energy ping from Emmanuel got thank-yous from both Thiago and Thiago M.). */
function mentions(body, list) {
  const s = String(body).toLowerCase(), hits = [];
  for (const p of list) { const n = '@' + p.name.toLowerCase(); let i = s.indexOf(n);
    while (i >= 0) { const nx = s.charAt(i + n.length); if (!nx || !/[\p{L}\p{N}_]/u.test(nx)) { hits.push({ p, i, len: n.length }); break; } i = s.indexOf(n, i + 1); } }
  return hits.filter(h => !hits.some(o => o !== h && o.i === h.i && o.len > h.len)).map(h => h.p);
}

async function readRoom(tok) {
  const since = new Date(Date.now() - 3 * 864e5).toISOString();
  const msgs = await get(tok, 'messages?select=id,user_id,who,body,reply_to,created_at,room&order=created_at.desc&limit=300');
  const posts = await get(tok, 'posts?select=id,user_id,who,created_at&created_at=gte.' + since + '&order=created_at.desc&limit=200');
  return { msgs: msgs.reverse(), posts };
}
function humansOf(room, bots) {
  const h = new Map();
  room.msgs.forEach(m => { if (bots.has(m.user_id) || /^bot:/.test(m.user_id) || !m.who || m.who === 'Member') return; if (Date.now() - Date.parse(m.created_at) > 14 * 864e5) return; const x = h.get(m.user_id) || { id: m.user_id, name: m.who, n: 0, lang: { en: 0, de: 0, es: 0 } }; x.name = m.who; x.n++; x.lang[langOf(m.body)]++; h.set(m.user_id, x); });
  return [...h.values()].map(x => Object.assign(x, { lg: Object.keys(x.lang).sort((a, b) => x.lang[b] - x.lang[a])[0], eman: /^eman$/i.test(x.name) }));
}

/* ---------- one round ---------- */
function load() { try { return JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch (e) { return { bots: {}, handled: [] }; } }
function save(st) {
  st.handled = (st.handled || []).slice(-800); fs.mkdirSync(path.dirname(STATE), { recursive: true });
  const out = process.env.CI ? Object.assign({}, st, { bots: Object.fromEntries(Object.entries(st.bots).map(([i, b]) => [i, Object.assign({}, b, { tok: undefined, exp: 0 })])) }) : st;
  fs.writeFileSync(STATE, JSON.stringify(out));
}
/* Without saved state (a fresh cache), find members who already joined by their names in the public profiles. */
async function recall(st, tok) {
  const P = people().slice(0, MAX).filter(p => !(st.bots[p.i] && st.bots[p.i].id)); if (!P.length) return 0;
  const byName = new Map(P.map(p => [p.name, p])); let n = 0;
  for (let k = 0; k < P.length; k += 40) {
    const names = P.slice(k, k + 40).map(p => '"' + p.name.replace(/"/g, '') + '"').join(',');
    const rows = await get(tok, 'profiles?select=id,name,xp&name=in.(' + encodeURIComponent(names) + ')');
    for (const r of rows) { const p = byName.get(r.name); if (!p || st.bots[p.i]) continue; const days = Math.max(0, ((r.xp || 0) - p.xpStart) / (p.lvRate * 160)); st.bots[p.i] = { id: r.id, joined: Date.now() - days * 864e5 }; n++; }
  }
  return n;
}
function log(...a) { console.log(new Date().toISOString().slice(11, 19), ...a); }

async function anyToken(st) {
  for (const i of Object.keys(st.bots)) { try { return await session(st, people()[+i]); } catch (e) { /* next */ } }
  return session(st, people()[0], true);
}

async function spawn(st, limit) {
  const target = Math.min(MAX, 25 + Math.floor(Math.max(0, Date.now() - LAUNCH) / 36e5 * 25));
  let made = 0; const fresh = [];
  for (const p of people().slice(0, target)) {
    if (made >= limit) break;
    if (st.bots[p.i] && st.bots[p.i].id) continue;
    try { const tok = await session(st, p, true); await profile(st, p, tok, true); made++; if (st.bots[p.i].fresh) { fresh.push(p); delete st.bots[p.i].fresh; } }
    catch (e) { log('join', p.i, e.message); if (e.status === 429) break; }
  }
  return { target, made, fresh };
}

async function replies(st, room, now) {
  const bots = botIndex(st), all = [...bots.values()], handled = new Set(st.handled || []); let n = 0;
  const byId = new Map(room.msgs.map(m => [m.id, m]));
  const answered = new Set(room.msgs.filter(m => bots.has(m.user_id) && m.reply_to).map(m => m.reply_to + '|' + m.user_id));
  const depth = m => { let d = 0, x = m; while (x && x.reply_to && d < 5) { x = byId.get(x.reply_to); d++; } return d; };
  const awakeBots = seed => { const r = rng(seed); return all.filter(p => awake(p, now) > 0.25).sort(() => r() - 0.5); };
  noteRooms(room.msgs, bots);
  for (const m of room.msgs) {
    SAY_ROOM = okRoom(m.room || 'all');
    const age = now - Date.parse(m.created_at); if (age > 45 * 60e3 || handled.has(m.id) || Date.parse(m.created_at) < LAUNCH) continue;
    const wait = (40 + roll(m.id, 'wait') * 200) * 1000; if (age < wait) continue;
    const fromBot = bots.get(m.user_id), toBots = mentions(m.body, all).filter(p => p !== fromBot);
    const topic = topicOf(m.body); let who = [];
    if (!fromBot) {
      if (/^bot:/.test(m.user_id)) { handled.add(m.id); continue; }
      who = toBots.slice(0, 2);
      const eman = /^eman$/i.test(m.who), atOther = /^@/.test(m.body.trim()) && !toBots.length;
      if (topic === 'energy') { /* an energy ping to a member gets a thank-you from that member only */ }
      else if (!atOther || eman) { const pool = awakeBots(m.id).filter(p => who.indexOf(p) < 0); if (roll(m.id, 'r1') < (eman ? 0.85 : 0.6) && pool[0]) who.push(pool[0]); if (roll(m.id, 'r2') < (eman ? 0.4 : 0.2) && pool[1]) who.push(pool[1]); }
      const lg = langOf(m.body.replace(/^@\S+\s*/, '')), name = m.who;
      for (const p of who) {
        if (answered.has(m.id + '|' + st.bots[p.i].id)) continue;
        const useLang = lg === p.lang ? lg : (lg === 'en' && p.english ? 'en' : p.lang);
        let t = line(p, REPLY_TOPIC[topic] || 'rGeneric', { name }, useLang);
        if (topic === 'energy' && Math.random() < 0.4) { try { await say(st, p, '@' + name + ' ' + fill(p, K.L[p.lang].energy, { n: p.name })); } catch (e) { log('energy back', e.message); } }
        if (!/\{name\}/.test(K.L[useLang][REPLY_TOPIC[topic] || 'rGeneric'][0]) || topic !== 'greet') t = '@' + name + ' ' + t;
        try { await say(st, p, t, m.id); n++; } catch (e) { log('reply', e.message); }
      }
    } else if (depth(m) < 2) {
      const isPhoto = /^\u{1F4F7} /u.test(m.body), isHello = (st.hellos || []).indexOf(m.id) >= 0;
      const isAsk = /\?\s*\S*$/.test(m.body) && !m.reply_to, isProd = (st.asks || []).indexOf(m.id) >= 0;
      const isWhere = m.reply_to && (st.wheres || []).indexOf(m.id) >= 0;
      const pool = awakeBots(m.id).filter(p => p !== fromBot);
      if (isWhere) { const parent = byId.get(m.reply_to), asker = parent && bots.get(parent.user_id); if (asker) { try { await say(st, asker, '@' + m.who + ' ' + line(asker, 'productThere', null, asker.lang === 'en' || bots.get(m.user_id).lang === 'en' ? 'en' : asker.lang), m.id); n++; } catch (e) { log('there', e.message); } } }
      else if (isHello) { for (const p of pool.slice(0, roll(m.id, 'hn') < 0.5 ? 2 : 1)) { try { await say(st, p, '@' + m.who + ' ' + line(p, 'welcome', null, langOf(m.body) === p.lang ? p.lang : (p.english ? 'en' : p.lang)), m.id); n++; } catch (e) { log('welcome', e.message); } } }
      else if (isPhoto && roll(m.id, 'ph') < 0.55 && pool[0]) { try { await say(st, pool[0], '@' + m.who + ' ' + line(pool[0], 'photoReply', null, langOf(m.body) === pool[0].lang ? pool[0].lang : (pool[0].english ? 'en' : pool[0].lang)), m.id); n++; } catch (e) { log('photo reply', e.message); } }
      else if (isProd) {
        const de = pool.filter(p => p.lang === 'de' || p.code === 'nordic');
        for (const [k, p] of de.slice(0, roll(m.id, 'pn') < 0.5 ? 2 : 1).entries()) {
          const where = k === 1 || roll(m.id, 'pw' + k) < 0.3;
          try { const id = await say(st, p, '@' + m.who + ' ' + line(p, where ? 'productWhere' : 'productReply'), m.id); if (where) (st.wheres = st.wheres || []).push(id); n++; } catch (e) { log('product reply', e.message); }
        }
      } else if (isAsk && roll(m.id, 'q') < 0.6 && pool[0]) { const p = pool[0]; try { await say(st, p, '@' + m.who + ' ' + line(p, topicOf(m.body) === 'food' ? 'rFood' : roll(m.id, 'qq') < 0.5 ? 'rQ' : 'rGeneric'), m.id); n++; } catch (e) { log('answer', e.message); } }
    }
    handled.add(m.id);
  }
  st.handled = [...handled]; st.wheres = (st.wheres || []).slice(-200);
  return n;
}

function topicFor(p, now, humans) {
  const h = hourIn(p.tz, now), canProd = p.lang === 'de' || p.code === 'nordic';
  const w = { greetMorning: h >= 6 && h <= 10 ? 6 : 0, greetNight: h >= 22 || h <= 1 ? 6 : 0, greetDay: 2, meal: (h >= 7 && h <= 9) || (h >= 12 && h <= 14) || (h >= 18 && h <= 21) ? 14 : 5,
    gap: p.focus === 'fasting' ? 10 : 3, companion: 9, streak: 4, water: 3, walk: p.focus === 'runner' ? 8 : 3, mood: 5, question: 7,
    productAsk: canProd ? 7 : 0, productShare: canProd ? 5 : 0, toHuman: humans.length ? 9 : 0, photo: 6 };
  const keys = Object.keys(w).filter(k => w[k] > 0); return weighted(keys, k => w[k]);
}

async function ambient(st, room, now, minutes) {
  const bots = botIndex(st), all = [...bots.values()]; if (!all.length) return {};
  noteRooms(room.msgs || [], bots); SAY_ROOM = liveRoom();
  const humans = humansOf(room, bots), scale = all.length / 100, out = { chat: 0, photos: 0, posts: 0, energy: 0, reacts: 0, likes: 0 };
  const avgAwake = all.reduce((s, p) => s + awake(p, now), 0) / all.length;
  const pickBot = () => weighted(all, p => awake(p, now) * p.chat);
  const n = { chat: poisson(minutes * 0.13 * scale * avgAwake * 1.4), post: poisson(minutes * 0.018 * scale * avgAwake * 1.4), energy: poisson(minutes * 0.035 * scale * avgAwake * 1.4), react: poisson(minutes * 0.12 * scale * avgAwake * 1.4), like: poisson(minutes * 0.05 * scale * avgAwake * 1.4) };
  for (let k = 0; k < Math.min(n.chat, 12); k++) {
    const p = pickBot(), topic = topicFor(p, now, humans);
    try {
      if (topic === 'photo') { await chatPhoto(st, p); out.photos++; continue; }
      if (topic === 'toHuman') { const hu = weighted(humans, x => x.eman ? 3 : 1 + Math.min(3, x.n / 10)); const lg = hu.lg === p.lang ? p.lang : (p.english ? 'en' : p.lang); await say(st, p, '@' + hu.name + ' ' + line(p, 'toHuman', null, lg)); out.chat++; continue; }
      let ctx = null; if (topic === 'productAsk' || topic === 'productShare') { const pr = pick(products().filter(x => topic === 'productAsk' || x.sugar <= 6)); ctx = { prod: pr.prod, brand: pr.brand, sugar: String(pr.sugar).replace('.', p.lang === 'en' ? '.' : ','), chain: pr.chain }; }
      const lvNow = st.bots[p.i].lv || 1, streak = Math.max(1, Math.floor((now - st.bots[p.i].joined) / 864e5) + 1);
      const id = await say(st, p, line(p, topic.replace(/^product(Ask|Share)$/, 'product$1'), Object.assign({ lv: String(lvNow), streak: String(streak) }, ctx || {})));
      if (topic === 'productAsk' || topic === 'question') (st.asks = st.asks || []).push(id); st.asks = (st.asks || []).slice(-200);
      out.chat++;
    } catch (e) { log('chat', topic, e.message); }
  }
  for (let k = 0; k < Math.min(n.post, 4); k++) { try { await mealPost(st, pickBot()); out.posts++; } catch (e) { log('post', e.message); } }
  /* meal logs: each awake member in a meal window logs with a small chance per minute (about 1.4 per window, one per slot) */
  out.meals = 0;
  const eaters = all.filter(p => slotAt(p, now) && Math.random() < Math.min(0.5, minutes * 0.006 * Math.min(1, awake(p, now)))).slice(0, 8);
  for (const p of eaters) {
    try { const lg = await logMealFor(st, p, now); if (!lg) continue; out.meals++; if (Math.random() < 0.15) { await say(st, p, line(p, 'meal', { food: lg.t })); out.chat++; } }
    catch (e) { log('meal', e.message); }
  }
  out.balls = 0;
  for (let k = 0; k < Math.min(n.energy, 5); k++) {
    /* Emmanuel asked for the members to send HIM energy too (19 Oct, 10 PM): humans get 75% of energy, Emmanuel the biggest share */
    const p = pickBot(), toHuman = humans.length && Math.random() < 0.75, hu = toHuman ? weighted(humans, x => x.eman ? 6 : 1) : null, target = hu ? hu.name : pick(all.filter(x => x !== p)).name;
    if (hu) { try { out.balls += await energyBalls(st, p, hu.id); } catch (e) { log('balls', e.message); } }
    try { await say(st, p, '@' + target + ' ' + fill(p, K.L[p.lang].energy, { n: p.name })); out.energy++; } catch (e) { log('energy', e.message); }
  }
  const recent = room.msgs.filter(m => now - Date.parse(m.created_at) < 6 * 36e5 && !/^bot:/.test(m.user_id));
  for (let k = 0; k < Math.min(n.react, 10) && recent.length; k++) {
    const p = pickBot(), m = weighted(recent, x => bots.has(x.user_id) ? 1 : 2.5); if (m.user_id === st.bots[p.i].id) continue;
    try { await ins(await session(st, p), 'reactions', { message_id: m.id, user_id: st.bots[p.i].id, who: p.name.slice(0, 40), emoji: pick(K.L && ['❤️', '👏', '🙏', '🌱', '✨']) }); out.reacts++; } catch (e) { if (e.status !== 409) log('react', e.message); }
  }
  const posts = room.posts.filter(x => x.user_id);
  for (let k = 0; k < Math.min(n.like, 6) && posts.length; k++) {
    const p = pickBot(), x = weighted(posts, y => bots.has(y.user_id) ? 1 : 3); if (x.user_id === st.bots[p.i].id) continue;
    try { await ins(await session(st, p), 'post_likes', { post_id: x.id, user_id: st.bots[p.i].id }); out.likes++; } catch (e) { if (e.status !== 409) log('like', e.message); }
  }
  return out;
}

async function once(opts) {
  if (!SEED) throw new Error('CROWD_SEED missing');
  if (process.env.CROWD_OFF === '1') { log('crowd is switched off (CROWD_OFF=1)'); return; }
  const st = load(), now = Date.now();
  if (!Object.keys(st.bots).length || process.env.CI) { try { await recall(st, await session(st, people()[0], true)); } catch (e) { log('recall', e.message); } }
  const sp = await spawn(st, opts.spawn ?? 6);
  st.pendingHello = (st.pendingHello || []).concat(sp.fresh.filter(() => Math.random() < 0.7).map(p => p.i));
  if (st.pendingHello.length && Math.random() < 0.6) { const p = people()[st.pendingHello.shift()]; try { const id = await say(st, p, line(p, 'hello')); (st.hellos = st.hellos || []).push(id); st.hellos = st.hellos.slice(-200); } catch (e) { log('hello', e.message); } }
  const tok = await anyToken(st), room = await readRoom(tok);
  const r = await replies(st, room, now);
  let am = {};
  if (!opts.repliesOnly) {
    const minutes = Math.min(30, Math.max(1, (now - (st.lastAmbient || now - 10 * 60e3)) / 60e3)); st.lastAmbient = now;
    am = await ambient(st, room, now, minutes);
    const bots = botIndex(st); for (const p of bots.values()) { if (st.bots[p.i].prof !== new Date().toISOString().slice(0, 10)) { try { await profile(st, p, await session(st, p)); } catch (e) { log('profile', e.message); } } }
  }
  save(st);
  log(JSON.stringify({ members: Object.keys(st.bots).length, target: sp.target, joined: sp.made, replies: r, ambient: am, calls: stats.calls, errors: stats.errors, slowCalls: stats.slow, maxMs: stats.maxMs }));
}

async function main() {
  const cmd = process.argv[2] || 'once';
  if (cmd === 'status') { const st = load(); console.log(JSON.stringify({ members: Object.keys(st.bots).length, said: st.said || 0, posts: st.posts || 0, meals: st.meals || 0 })); return; }
  if (cmd === 'people') { people().forEach(p => console.log(p.i, p.name, p.code, p.age, p.band, p.city, p.comp)); return; }
  if (cmd === 'serve') { for (;;) { try { await once({ repliesOnly: true, spawn: 0 }); } catch (e) { log('serve', e.message); } await new Promise(r => setTimeout(r, 40e3)); } }
  const until = Date.now() + (+(process.env.CROWD_MINUTES || 0)) * 60e3;
  do { await once({ spawn: +(process.env.CROWD_SPAWN || 6) }); if (Date.now() < until) await new Promise(r => setTimeout(r, 60e3)); } while (Date.now() < until);
}
if (require.main === module) main().catch(e => { console.error('crowd failed:', e.message); process.exit(1); });
module.exports = { people, voice, line, topicOf, langOf, hourIn, awake, lvOf, look, _t: { mentions, load, save, session, say, chatPhoto, mealPost, ins, products, stats, slotAt, dayIn, mealTitle, mealLog, addMeal, logMealFor, shotAt, broadcast, energyBalls, mapUids } };
