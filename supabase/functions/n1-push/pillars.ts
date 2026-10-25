/* LOWiSPIKE phone notifications, four pillars (25 Oct 2026). Pure logic, no I/O. The strategy is in
   lis-benachrichtigungsstrategie.md (Emmanuel's copy); the rules below are Maya's proposal, not yet tuned with real data.
   A  For You: a real recent food photo or recipe from the feed, at meal times. Nudges people to photograph their own meal.
   B  Product: a community-rated product from the database, at shopping times. Never "go shopping now".
   C  Energy received: someone sent your companion energy, also while you were offline. Event driven (action "energy").
   D  Your own companion, Tamagotchi style, only on days you have not opened the app yet.
   Shared rules: nothing in quiet hours, nothing while the app was open in the last 10 minutes, a daily budget by
   "how often" (few 1, normal 2, more 3; energy has its own cap of 3), the same minimum gap as before, and every text only
   says things the app really knows (days since the app was last open, a real post, a real product, a real energy shot). */
import { lang, local, quiet, type Nudge, type Row } from "./logic.ts";

export type Pillars = { a?: boolean; b?: boolean; c?: boolean; d?: boolean };
export type PRow = Row & {
  uid?: string | null; pillars?: Pillars | null; cn?: string | null;
  d_miss?: number | null; last_d?: number | null; last_a?: number | null; last_b?: number | null; last_tpl?: string | null;
  energy_q?: { n: string; at: number }[] | null; energy_day?: string | null; energy_n?: number | null; last_e?: number | null;
};
export type Post = { id: string; who: string; cap: string; user_id?: string | null; at: number };
export type Product = { id: string; name: string; brand?: string | null; store?: string | null; verdict: string };
export type Ctx = { posts?: Post[]; products?: Product[] };

export const BUDGET: Record<string, number> = { few: 1, normal: 2, more: 3 };
export const GAPH: Record<string, number> = { few: 4, normal: 2, more: 1 };
export const ENERGY_CAP = 3;
const DAY = 864e5, H = 36e5;

/* consent per pillar: a row saved before pillars existed (null) gets the companion and energy only */
export function on(r: PRow, k: keyof Pillars) {
  const p = r.pillars;
  if (!p || typeof p !== "object") return k === "c" || k === "d";
  return p[k] !== false;
}
export function hash(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function weekday(day: string) { return new Date(day + "T12:00:00Z").getUTCDay(); } /* 0 Sunday */
const fill = (s: string, v: Record<string, string | number>) => { for (const k of Object.keys(v)) s = s.split("{" + k + "}").join(String(v[k])); return s; };
export function safeName(v: unknown, n = 24) {
  if (typeof v !== "string") return "";
  return v.replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, n);
}

const DEF_C: Record<string, string> = { en: "Your companion", de: "Dein Begleiter", es: "Tu compañero" };
export function cname(r: PRow) { return safeName(r.cn) || DEF_C[lang(r)]; }

/* the companion's voice. {c} companion name, {d} whole days since the app was last open. Cheeky, never about the body,
   never a claim about food or behaviour the app did not log. Tier by days away: 1, 2-3, 4-7, 8+ (the last letter). */
export const DW: Record<string, Record<string, string[]>> = {
  en: {
    t1: ["Just checking in. Not that I was waiting by the door or anything.", "Yesterday without you was fine. Totally fine. Come say hi?", "I did three laps of my bubble. Alone. Your turn to show up."],
    t2: ["{d} days. I've started talking to the bubbles. They don't answer.", "Fun fact: I can count. It's been {d} days.", "I picked out recipes for you {d} days ago. They're getting cold."],
    t3: ["I found a new current in the galaxy. Want to ride it with me?", "{d} days. I told the other companions you're on a secret mission. Don't make me a liar.", "Day {d} without you. I've rearranged my bubble twice. Nobody noticed."],
    t4: ["I'll stop knocking for a while. The door's open whenever you're hungry.", "No more knocking from me for a while. I'll be right here when you feel like it."],
  },
  de: {
    t1: ["Ich wollte nur mal fragen. Nicht dass ich an der Tür gewartet hätte oder so.", "Gestern ohne dich war okay. Völlig okay. Kommst du kurz Hallo sagen?", "Ich bin drei Runden in meiner Blase geschwommen. Allein. Jetzt bist du dran."],
    t2: ["{d} Tage. Ich rede jetzt mit den Blasen. Die antworten nicht.", "Kleiner Fakt: Ich kann zählen. Es sind {d} Tage.", "Ich hab dir vor {d} Tagen Rezepte rausgesucht. Die werden langsam kalt."],
    t3: ["Ich hab eine neue Strömung in der Galaxie gefunden. Fliegst du mit?", "{d} Tage. Ich hab den anderen erzählt, du bist auf geheimer Mission. Lass mich nicht lügen.", "Tag {d} ohne dich. Ich hab meine Blase zweimal umgeräumt. Keiner hat's gemerkt."],
    t4: ["Ich hör jetzt eine Weile auf zu klopfen. Die Tür ist offen, wenn du Hunger hast.", "Ich klopf erstmal nicht mehr. Ich bin einfach da, wenn dir danach ist."],
  },
  es: {
    t1: ["Solo pasaba a saludar. No es que te estuviera esperando en la puerta ni nada.", "Ayer sin ti estuvo bien. Totalmente bien. ¿Vienes a saludar?", "Di tres vueltas a mi burbuja. Solo. Te toca aparecer."],
    t2: ["{d} días. Ya hablo con las burbujas. No contestan.", "Dato curioso: sé contar. Van {d} días.", "Te elegí recetas hace {d} días. Se están enfriando."],
    t3: ["Encontré una corriente nueva en la galaxia. ¿Vuelas conmigo?", "{d} días. Les dije a los demás compañeros que estás en una misión secreta. No me hagas quedar mal.", "Día {d} sin ti. He reordenado mi burbuja dos veces. Nadie se dio cuenta."],
    t4: ["Voy a dejar de llamar a la puerta un tiempo. Está abierta cuando tengas hambre.", "Dejo de llamar un tiempo. Aquí estaré cuando te apetezca."],
  },
};
export const PW: Record<string, Record<string, string[] | string>> = {
  en: {
    a: ["{f} by {w}. My mouth is watering, and I don't even have one.", "New in For You: {f} from {w}. Snap your next meal too, I'm nosy.", "{w} just shared {f}. I'd steal a bite if I had hands."],
    bBetter: ["Spotted{s}: {p}. The community rates it a better pick. Just saying, for your next shop.", "Community find{s}: {p}, rated a better pick. Scan it if you see it."],
    bOk: ["Spotted{s}: {p}. The community rates it okay. Just saying, for your next shop.", "Community find{s}: {p}, rated okay. Scan it if you see it."],
    at: " at {s}", e1: "{n} just sent {c} energy. Someone's popular.", eN: "{n} and {k} others sent {c} energy while you were away.", e2: "{n} sent {c} energy while you were away.",
  },
  de: {
    a: ["{f} von {w}. Mir läuft das Wasser im Mund zusammen, und ich hab nicht mal einen.", "Neu in For You: {f} von {w}. Fotografier dein nächstes Essen auch, ich bin neugierig.", "{w} hat gerade {f} geteilt. Ich würd was klauen, wenn ich Hände hätte."],
    bBetter: ["Gesichtet{s}: {p}. Die Community bewertet es als bessere Wahl. Nur so, für den nächsten Einkauf.", "Community-Fund{s}: {p}, als bessere Wahl bewertet. Scann es, wenn du es siehst."],
    bOk: ["Gesichtet{s}: {p}. Die Community bewertet es als okay. Nur so, für den nächsten Einkauf.", "Community-Fund{s}: {p}, als okay bewertet. Scann es, wenn du es siehst."],
    at: " bei {s}", e1: "{n} hat {c} gerade Energie geschickt. Da ist wohl jemand beliebt.", eN: "{n} und {k} weitere haben {c} Energie geschickt, während du weg warst.", e2: "{n} hat {c} Energie geschickt, während du weg warst.",
  },
  es: {
    a: ["{f} de {w}. Se me hace la boca agua, y eso que no tengo boca.", "Nuevo en For You: {f} de {w}. Haz foto a tu próxima comida también, soy curioso.", "{w} acaba de compartir {f}. Robaría un bocado si tuviera manos."],
    bBetter: ["Visto{s}: {p}. La comunidad lo valora como mejor opción. Por si acaso, para tu próxima compra.", "Hallazgo de la comunidad{s}: {p}, mejor opción. Escanéalo si lo ves."],
    bOk: ["Visto{s}: {p}. La comunidad lo valora como aceptable. Por si acaso, para tu próxima compra.", "Hallazgo de la comunidad{s}: {p}, aceptable. Escanéalo si lo ves."],
    at: " en {s}", e1: "{n} acaba de mandar energía a {c}. Alguien es popular.", eN: "{n} y {k} más mandaron energía a {c} mientras no estabas.", e2: "{n} mandó energía a {c} mientras no estabas.",
  },
};
const pw = (l: string, k: string) => (PW[l] || PW.en)[k];

export function sentToday(r: PRow, day: string) { return r.sent_day === day && Array.isArray(r.sent_ids) ? r.sent_ids : []; }
/* pushes today that count against the daily budget (energy has its own cap) */
export function used(r: PRow, day: string) { return sentToday(r, day).filter(x => !/^e/.test(x)).length; }
export function daysAway(r: PRow, now: number) { return r.seen ? Math.floor((now - r.seen) / DAY) : 1; }
/* misses: D pushes in a row without the app being opened afterwards */
export function misses(r: PRow) { return r.seen && r.last_d && r.seen > r.last_d ? 0 : (+(r.d_miss || 0)); }

export function cleanCap(s: string) { return safeName(String(s || "").replace(/^\s*(just ate|gerade gegessen|acabo de comer)\s*:\s*/i, ""), 60); }

export function energyNudge(r: PRow, names: string[]): Nudge {
  const l = lang(r), c = cname(r), n = safeName(names[0], 24) || "?";
  const body = names.length === 1 ? fill(pw(l, "e2") as string, { n, c }) : fill(pw(l, "eN") as string, { n, c, k: names.length - 1 });
  return { id: "e" + Date.now().toString(36).slice(-4), title: c + " \u26a1", body, q: "community", ttl: 12 * 3600 };
}
export function energyNow(r: PRow, sender: string): Nudge {
  const l = lang(r), c = cname(r);
  return { id: "e" + Date.now().toString(36).slice(-4), title: c + " \u26a1", body: fill(pw(l, "e1") as string, { n: safeName(sender, 24) || "?", c }), q: "community", ttl: 6 * 3600 };
}
/* can an energy push go out to this row right now (true), or must it wait in the queue (false)? */
export function energyOpen(r: PRow, now: number) {
  if (r.enabled === false || !on(r, "c")) return false;
  const L = local(now, r.tz, r.tzo);
  const qs = Number.isFinite(r.qs as number) ? (r.qs as number) : 22, qe = Number.isFinite(r.qe as number) ? (r.qe as number) : 7;
  if (quiet(L.h, qs, qe)) return false;
  const n = r.energy_day === L.day ? +(r.energy_n || 0) : 0;
  if (n >= ENERGY_CAP) return false;
  if (r.last_e && now - r.last_e < 30 * 6e4) return false; /* several shots in half an hour become one summary */
  return true;
}

/* the one pillar push for this row now, or null. Called after the old decide() (fast end, close your day) found nothing. */
export function decidePillar(r: PRow, now: number, ctx: Ctx = {}): Nudge | null {
  if (r.enabled === false) return null;
  const L = local(now, r.tz, r.tzo), l = lang(r), c = cname(r);
  const qs = Number.isFinite(r.qs as number) ? (r.qs as number) : 22, qe = Number.isFinite(r.qe as number) ? (r.qe as number) : 7;
  if (quiet(L.h, qs, qe)) return null;
  if (r.seen && now - r.seen < 10 * 6e4) return null;
  const sent = sentToday(r, L.day);
  /* C: shots that waited (quiet hours, cap, half-hour bundling) go out as one summary */
  const q = Array.isArray(r.energy_q) ? r.energy_q.filter(x => x && x.n && now - x.at < 3 * DAY) : [];
  if (q.length && energyOpen(r, now)) {
    const names: string[] = []; for (const x of q) if (names.indexOf(x.n) < 0) names.push(x.n);
    return energyNudge(r, names);
  }
  const freq = r.freq || "normal";
  if (used(r, L.day) >= (BUDGET[freq] || 2)) return null;
  if (r.last_push && now - r.last_push < (GAPH[freq] || 2) * H - 6e4) return null;
  const seenToday = !!r.seen && local(r.seen, r.tz, r.tzo).day === L.day;
  const pick = (arr: string[], salt: string) => {
    let i = hash(r.endpoint + L.day + salt) % arr.length;
    if (arr.length > 1 && r.last_tpl === salt + i) i = (i + 1) % arr.length;
    return { s: arr[i], tpl: salt + i };
  };
  /* D: own companion, 10:00 to 20:00, only when the app was not opened today, once a day, backing off when ignored */
  if (on(r, "d") && !seenToday && L.h >= 10 && L.h < 20 && sent.indexOf("d") < 0) {
    const d = Math.max(1, daysAway(r, now)), m = misses(r);
    const wait = m >= 10 || d > 30 ? Infinity : m >= 6 ? 7 * DAY : m >= 3 ? 3 * DAY : 20 * H;
    if (wait !== Infinity && (!r.last_d || now - r.last_d >= wait)) {
      const tier = d >= 8 || m >= 5 ? "t4" : d >= 4 ? "t3" : d >= 2 ? "t2" : "t1";
      const p = pick((DW[l] || DW.en)[tier], "d" + tier);
      return { id: "d", title: c, body: fill(p.s, { c, d }), q: "home", ttl: 4 * 3600, tpl: p.tpl } as Nudge;
    }
  }
  /* A: For You, around lunch (11:30-13:30) or dinner (17:00-19:00), at most every 44 hours */
  const meal = (L.h >= 11.5 && L.h < 13.5) || (L.h >= 17 && L.h < 19);
  if (on(r, "a") && meal && sent.indexOf("a") < 0 && (!r.last_a || now - r.last_a >= 44 * H)) {
    const posts = (ctx.posts || []).filter(p => p.cap && p.who && (!r.uid || p.user_id !== r.uid) && now - p.at < 3 * DAY && now - p.at >= 0);
    if (posts.length) {
      const post = posts[hash(r.endpoint + L.day + "a") % posts.length];
      const p = pick(pw(l, "a") as string[], "a");
      return { id: "a", title: "LOWiSPIKE \u00b7 For You", body: fill(p.s, { f: cleanCap(post.cap), w: safeName(post.who, 20) }), q: "foryou", ttl: 3 * 3600, tpl: p.tpl, ref: post.id } as Nudge;
    }
  }
  /* B: product, Saturday 9:00-12:00 or Thursday/Friday 16:00-18:30, at most every 3 days */
  const wd = weekday(L.day);
  const shop = (wd === 6 && L.h >= 9 && L.h < 12) || ((wd === 4 || wd === 5) && L.h >= 16 && L.h < 18.5);
  if (on(r, "b") && shop && sent.indexOf("b") < 0 && (!r.last_b || now - r.last_b >= 3 * DAY - H)) {
    const prods = (ctx.products || []).filter(p => p.name && (p.verdict === "better" || p.verdict === "ok"));
    if (prods.length) {
      const pr = prods[hash(r.endpoint + L.day + "b") % prods.length];
      const store = safeName(pr.store, 24), name = safeName([pr.brand, pr.name].filter(Boolean).join(" "), 48);
      const p = pick(pw(l, pr.verdict === "better" ? "bBetter" : "bOk") as string[], "b");
      return { id: "b", title: "LOWiSPIKE", body: fill(p.s, { p: name, s: store ? fill(pw(l, "at") as string, { s: store }) : "" }), q: "scan", ttl: 6 * 3600, tpl: p.tpl, ref: pr.id } as Nudge;
    }
  }
  return null;
}

/* the extra row fields to store after a pillar push (on top of logic.after) */
export function afterPillar(r: PRow, n: Nudge & { tpl?: string }, now: number) {
  const L = local(now, r.tz, r.tzo), o: Record<string, unknown> = {};
  if (n.tpl) o.last_tpl = n.tpl;
  if (n.id === "d") { o.last_d = now; o.d_miss = misses(r) + 1; }
  if (n.id === "a") o.last_a = now;
  if (n.id === "b") o.last_b = now;
  if (/^e/.test(n.id)) { o.last_e = now; o.energy_q = []; o.energy_day = L.day; o.energy_n = (r.energy_day === L.day ? +(r.energy_n || 0) : 0) + 1; }
  return o;
}
