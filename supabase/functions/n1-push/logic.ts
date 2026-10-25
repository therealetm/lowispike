/* LOWiSPIKE N1 part 2 (Oct 11, 2026): phone notifications (web push). Pure logic, no I/O:
   which nudge to send for one stored subscription right now, the words (EN/DE/ES), and the Web Push crypto
   (RFC 8291 aes128gcm payload encryption + RFC 8292 VAPID), all with WebCrypto. */

export type Row = {
  endpoint: string; p256dh: string; auth: string;
  lang?: string | null; tz?: string | null; tzo?: number | null;
  enabled?: boolean | null; freq?: string | null; qs?: number | null; qe?: number | null;
  fast_last?: number | null; fast_h?: number | null;
  day?: string | null; open?: number | null; total?: number | null; streak?: number | null; seen?: number | null;
  sent_day?: string | null; sent_ids?: string[] | null; last_push?: number | null;
  e1_closed?: string | null; e1_inv?: string | null; close_day?: string | null;
};
export type Nudge = { id: string; title: string; body: string; q: string; ttl: number; tpl?: string; ref?: string };

const GAP: Record<string, number> = { few: 4, normal: 2, more: 1 };

const W: Record<string, Record<string, string>> = {
  en: {
    morning: "Good morning! Before any feed: {n} quests are waiting for you today. Two minutes and you're on the board.",
    morningF: "Good morning! Your {h} h fast ends at {t}. Open LOWiSPIKE before any feed and clear your first quest.",
    fastDone: "You made it: {h} h fasted at {t}. Break it gently and log the meal for points.",
    evening: "{n} quests still open. Clear one before bed and keep your streak alive.",
    eveningS: "{n} quests still open. Clear one before bed and keep your {d}-day streak alive.",
    test: "Phone notifications are on. I'll nudge you here outside your quiet hours.",
    close: "Bedtime soon. {d} of {n} quests done today. Close your day for +15 XP and see tomorrow's first quest.",
    closeS: "Bedtime soon. {d} of {n} quests done, {s}-day streak. Close your day for +15 XP and see tomorrow's first quest.",
    tomorrow: "tomorrow", uhr: "",
  },
  de: {
    morning: "Guten Morgen! Vor jedem Feed: heute warten {n} Quests auf dich. Zwei Minuten und du bist dabei.",
    morningF: "Guten Morgen! Dein {h}-Std.-Fasten endet um {t}. Öffne LOWiSPIKE vor jedem Feed und schaff deine erste Quest.",
    fastDone: "Geschafft: {h} Std. gefastet um {t}. Brich sanft und trag die Mahlzeit für Punkte ein.",
    evening: "Noch {n} Quests offen. Schaff eine vor dem Schlafen und halte deine Serie.",
    eveningS: "Noch {n} Quests offen. Schaff eine vor dem Schlafen und halte deine {d}-Tage-Serie.",
    test: "Handy-Benachrichtigungen sind an. Ich stupse dich hier außerhalb deiner Ruhezeit an.",
    close: "Bald Schlafenszeit. {d} von {n} Quests heute geschafft. Schließ deinen Tag ab für +15 XP und sieh die erste Quest von morgen.",
    closeS: "Bald Schlafenszeit. {d} von {n} Quests geschafft, {s}-Tage-Serie. Schließ deinen Tag ab für +15 XP und sieh die erste Quest von morgen.",
    tomorrow: "morgen", uhr: " Uhr",
  },
  es: {
    morning: "¡Buenos días! Antes de cualquier feed: hoy te esperan {n} misiones. Dos minutos y ya estás dentro.",
    morningF: "¡Buenos días! Tu ayuno de {h} h termina a las {t}. Abre LOWiSPIKE antes de cualquier feed y completa tu primera misión.",
    fastDone: "Lo lograste: {h} h de ayuno a las {t}. Rómpelo suave y registra la comida para ganar puntos.",
    evening: "Te quedan {n} misiones. Completa una antes de dormir y mantén tu racha.",
    eveningS: "Te quedan {n} misiones. Completa una antes de dormir y mantén tu racha de {d} días.",
    test: "Las notificaciones del móvil están activadas. Te avisaré aquí fuera de tus horas de silencio.",
    close: "Ya casi es hora de dormir. Hoy llevas {d} de {n} misiones. Cierra tu día por +15 XP y mira la primera misión de mañana.",
    closeS: "Ya casi es hora de dormir. {d} de {n} misiones, racha de {s} días. Cierra tu día por +15 XP y mira la primera misión de mañana.",
    tomorrow: "mañana", uhr: "",
  },
};
const LOC: Record<string, string> = { en: "en-GB", de: "de-DE", es: "es-ES" };
export function lang(r: Row) { const l = String(r.lang || "en").slice(0, 2); return l === "de" || l === "es" ? l : "en"; }
export function words(l: string, k: string, v?: Record<string, string | number>) {
  let s = W[l] && k in W[l] ? W[l][k] : (k in W.en ? W.en[k] : k);
  if (v) for (const x of Object.keys(v)) s = s.split("{" + x + "}").join(String(v[x]));
  return s;
}

/* local wall clock of the user: by time zone name, else by the offset the phone sent */
export function local(ms: number, tz?: string | null, tzo?: number | null) {
  if (tz) {
    try {
      const f = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
      const p: Record<string, string> = {}; for (const x of f.formatToParts(new Date(ms))) p[x.type] = x.value;
      return { day: p.year + "-" + p.month + "-" + p.day, h: (+p.hour % 24) + (+p.minute) / 60, hh: String(+p.hour % 24).padStart(2, "0"), mm: p.minute };
    } catch (_e) { /* fall through */ }
  }
  const d = new Date(ms + (tzo || 0) * 6e4);
  return { day: d.toISOString().slice(0, 10), h: d.getUTCHours() + d.getUTCMinutes() / 60, hh: String(d.getUTCHours()).padStart(2, "0"), mm: String(d.getUTCMinutes()).padStart(2, "0") };
}
export function clock(ms: number, now: number, r: Row) {
  const l = lang(r), a = local(ms, r.tz, r.tzo), b = local(now, r.tz, r.tzo);
  let t = a.hh + ":" + a.mm;
  t += words(l, "uhr");
  if (a.day !== b.day) t = words(l, "tomorrow") + " " + t;
  return t;
}
export function quiet(h: number, qs: number, qe: number) {
  const a = qs % 24, b = qe; if (a === b) return false;
  return a < b ? (h >= a && h < b) : (h >= a || h < b);
}

/* E1 part 2: the game day (until 4 am it still counts as the evening before) and the bedtime window:
   1.5 h before quiet start until quiet start */
export function gameDay(now: number, r: Row) { return local(now - 4 * 36e5, r.tz, r.tzo).day; }
export function bedWindow(h: number, qs: number) {
  const b = (qs % 24) || 24, a = b - 1.5; let x = h; if (x < 4) x += 24;
  return x >= a && x < b;
}

/* the one nudge for this row at this moment, or null. Each kind once a day; the fast end comes on time (ignores how
   often, still respects quiet hours); nothing while the app was open in the last 10 minutes. */
export function decide(r: Row, now: number): Nudge | null {
  if (r.enabled === false) return null;
  const L = local(now, r.tz, r.tzo), l = lang(r);
  const qs = Number.isFinite(r.qs as number) ? (r.qs as number) : 22, qe = Number.isFinite(r.qe as number) ? (r.qe as number) : 7;
  if (quiet(L.h, qs, qe)) return null;
  if (r.seen && now - r.seen < 10 * 6e4) return null;
  const sent = r.sent_day === L.day && Array.isArray(r.sent_ids) ? r.sent_ids : [];
  const gapOk = !r.last_push || now - r.last_push >= (GAP[r.freq || "normal"] || 2) * 36e5 - 6e4;
  const fh = +(r.fast_h || 0) || 16, fl = +(r.fast_last || 0);
  const end = fl ? fl + fh * 36e5 : 0;
  const mk = (id: string, body: string, q: string, ttl: number): Nudge => ({ id, title: "LOWiSPIKE", body, q, ttl });
  if (end && now >= end && now - end < 3 * 36e5 && sent.indexOf("fastDone") < 0) return mk("fastDone", words(l, "fastDone", { h: fh, t: clock(end, now, r) }), "eat", 3 * 3600);
  const total = +(r.total || 0) || 6, seenToday = !!r.seen && r.day === L.day;
  const open = r.day === L.day ? Math.max(0, +(r.open ?? total)) : total;
  /* E1 part 2: "close your day" once a game day in the bedtime window, only while the day is not closed and the bubble
     has not invited in the app tonight; it takes the place of the evening streak saver. Gap: how often, at most 1 h. */
  const g = gameDay(now, r), inBed = bedWindow(L.h, qs);
  if (inBed && r.e1_closed !== g && r.e1_inv !== g && r.close_day !== g) {
    const gap1 = !r.last_push || now - r.last_push >= Math.min(GAP[r.freq || "normal"] || 2, 1) * 36e5 - 6e4;
    if (gap1) {
      const s = +(r.streak || 0), d = Math.max(0, total - open);
      return mk("close", words(l, s > 1 ? "closeS" : "close", { d, n: total, s }), "close", 90 * 60);
    }
  }
  if (inBed && (r.close_day === g || r.e1_closed === g)) return null;
  /* 25 Oct 2026: the morning hello and the evening streak saver are gone. The four pillars (pillars.ts) take their place:
     the companion speaks on days the app was not opened, For You and products bring something real. */
  void seenToday; void gapOk;
  return null;
}
/* the row fields to store after sending n */
export function after(r: Row, n: Nudge, now: number) {
  const L = local(now, r.tz, r.tzo);
  const ids = r.sent_day === L.day && Array.isArray(r.sent_ids) ? r.sent_ids.slice() : [];
  if (ids.indexOf(n.id) < 0) ids.push(n.id);
  const o: Record<string, unknown> = { sent_day: L.day, sent_ids: ids, last_push: now };
  if (n.id === "close") o.close_day = gameDay(now, r);
  return o;
}

/* ---------- Web Push crypto ---------- */
const te = new TextEncoder();
export function b64u(b: Uint8Array) { let s = ""; for (const c of b) s += String.fromCharCode(c); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
export function unb64u(s: string) { s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; const r = atob(s); const o = new Uint8Array(r.length); for (let i = 0; i < r.length; i++) o[i] = r.charCodeAt(i); return o; }
function cat(...a: Uint8Array[]) { const n = a.reduce((x, y) => x + y.length, 0); const o = new Uint8Array(n); let i = 0; for (const x of a) { o.set(x, i); i += x.length; } return o; }
async function hmac(key: Uint8Array, data: Uint8Array) {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data));
}
/* RFC 8291: one aes128gcm record */
export async function encrypt(p256dh: string, auth: string, payload: Uint8Array, salt?: Uint8Array, asKeys?: CryptoKeyPair) {
  const ua = unb64u(p256dh), sec = unb64u(auth);
  const kp = asKeys || await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]) as CryptoKeyPair;
  const asPub = new Uint8Array(await crypto.subtle.exportKey("raw", kp.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", ua, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, kp.privateKey, 256));
  const prkKey = await hmac(sec, shared);
  const ikm = await hmac(prkKey, cat(te.encode("WebPush: info\0"), ua, asPub, new Uint8Array([1])));
  salt = salt || crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, cat(te.encode("Content-Encoding: aes128gcm\0"), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, cat(te.encode("Content-Encoding: nonce\0"), new Uint8Array([1])))).slice(0, 12);
  const k = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, k, cat(payload, new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 16, 0]);
  return cat(salt, rs, new Uint8Array([asPub.length]), asPub, ct);
}
/* RFC 8292: VAPID header for the push service of this endpoint */
export async function vapid(endpoint: string, jwk: JsonWebKey, pub: string, sub: string, now = Date.now()) {
  const aud = new URL(endpoint).origin;
  const h = b64u(te.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const c = b64u(te.encode(JSON.stringify({ aud, exp: Math.floor(now / 1000) + 12 * 3600, sub })));
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, te.encode(h + "." + c)));
  return "vapid t=" + h + "." + c + "." + b64u(sig) + ", k=" + pub;
}
export const HOSTS = [/^fcm\.googleapis\.com$/, /^web\.push\.apple\.com$/, /^[a-z0-9.-]*push\.services\.mozilla\.com$/, /^[a-z0-9.-]*\.notify\.windows\.com$/, /^android\.googleapis\.com$/];
export function okEndpoint(e: unknown) {
  if (typeof e !== "string" || e.length > 1000) return false;
  try { const u = new URL(e); return u.protocol === "https:" && HOSTS.some(h => h.test(u.hostname)); } catch (_e) { return false; }
}
/* send one push; returns the HTTP status */
export async function push(r: Row, data: unknown, ttl: number, jwk: JsonWebKey, pub: string, sub: string, urgency = "normal") {
  const body = await encrypt(r.p256dh, r.auth, te.encode(JSON.stringify(data)));
  const res = await fetch(r.endpoint, { method: "POST", headers: { Authorization: await vapid(r.endpoint, jwk, pub, sub), "Content-Encoding": "aes128gcm", "Content-Type": "application/octet-stream", TTL: String(ttl), Urgency: urgency }, body });
  try { await res.body?.cancel(); } catch (_e) { /* ignore */ }
  return res.status;
}
