/* LOWiSPIKE: a phone notification for each Nibblo meal post (25 Oct 2026). Pure logic, no I/O.
   Emmanuel: "I did not get a notification when this bot messaged in the chat room. That's the whole point of this."
   Cause: Nibblo (nibblo_meals_20261025.sql) was built to post quietly. Nothing on the server ever asked n1-push to send
   anything for a bot post, and the For You pillar (A) skips bot accounts on purpose. Now the database pings n1-push
   (action "nibblo") the moment a meal is posted (nibblo_push_20261025.sql), with the 5-minute cron as a fallback.
   Rules: only people whose "Nibblo's meals" switch is on (a subscription saved before the switch existed and before the
   pillars existed gets nothing until the person opens the app once), never in their quiet hours, never while the app is
   open on that phone, one per meal slot, at most three a day ("how often: few" one a day), only while the post is fresh.
   Words: the dish in the phone's language (nibblo-words.ts, generated from nibblo-core.js) in Nibblo's own voice. */
import { lang, local, quiet, type Nudge } from "./logic.ts";
import { hash, on, safeName, sentToday, type PRow } from "./pillars.ts";
import { NB_DISHES, NB_NAME, NB_UID } from "./nibblo-words.ts";

export { NB_UID };
export const NB_ID = /^nb-(\d{8})-([mne])$/;
export const NB_CAP: Record<string, number> = { few: 1, normal: 3, more: 3 };
export const NB_FRESH_MIN = 90;
const LI: Record<string, number> = { en: 0, de: 1, es: 2 };

export const NB_TITLE: Record<string, Record<string, string>> = {
  en: { m: "Breakfast", n: "Lunch", e: "Dinner" },
  de: { m: "Frühstück", n: "Mittagessen", e: "Abendessen" },
  es: { m: "Desayuno", n: "Comida", e: "Cena" },
};
/* {f} = emoji + dish. Short, warm, a little funny, never a chore, never a claim about the body. */
export const NB_LINES: Record<string, Record<string, string[]>> = {
  en: {
    m: ["{f} is up. Breakfast without the sugar rollercoaster.", "Morning! Breakfast idea: {f}. I'd make it for you, but… no hands.", "{f} for breakfast. Low spike, big flavour. Come look."],
    n: ["Lunch drop: {f}. I'd eat it myself if I had a fork.", "Noon slump? Not with {f}.", "{f} just landed in Chat. Lunch, sorted."],
    e: ["Dinner idea: {f}. Sofa-approved.", "{f} tonight? Comfort food, rebuilt.", "Evening craving? {f} has your back."],
  },
  de: {
    m: ["{f} ist da. Frühstück ohne Zuckerachterbahn.", "Moin! Frühstücksidee: {f}. Ich würd's dir ja machen, aber… keine Hände.", "{f} zum Frühstück. Wenig Spike, viel Geschmack. Schau mal rein."],
    n: ["Mittags-Drop: {f}. Ich würd's selbst essen, hätte ich eine Gabel.", "Mittagstief? Nicht mit {f}.", "{f} ist gerade im Chat gelandet. Mittagessen: erledigt."],
    e: ["Abendessen-Idee: {f}. Sofa-geprüft.", "{f} heute Abend? Soulfood, neu gebaut.", "Abendhunger? {f} rettet den Abend."],
  },
  es: {
    m: ["{f} ya está aquí. Desayuno sin montaña rusa de azúcar.", "¡Buenos días! Idea de desayuno: {f}. Te lo haría yo, pero… sin manos.", "{f} para desayunar. Poco pico, mucho sabor. Échale un ojo."],
    n: ["Comida del día: {f}. Me la comería yo si tuviera tenedor.", "¿Bajón de mediodía? Con {f}, no.", "{f} acaba de llegar al chat. Comida, resuelta."],
    e: ["Idea de cena: {f}. Aprobada por el sofá.", "¿{f} esta noche? Comida reconfortante, reinventada.", "¿Antojo de noche? {f} te cubre."],
  },
};

export type NbPost = { id: string; rec?: string | null; dish?: string | null; at?: number | null };

export function nbSlot(id: unknown) { const m = NB_ID.exec(String(id || "")); return m ? { day: m[1], slot: m[2] } : null; }
/* the dish as the phone shows it: emoji + name in its language; an unknown dish falls back to the English name stored with the post */
export function nbDish(rec: unknown, en: unknown, l: string) {
  const d = typeof rec === "string" ? NB_DISHES[rec] : undefined;
  if (d) return d.e + " " + (d.n[LI[l] ?? 0] || d.n[0]);
  return safeName(en, 60) || (l === "de" ? "eine neue Idee" : l === "es" ? "una idea nueva" : "a new idea");
}
export function nbNudge(r: PRow, post: NbPost): Nudge | null {
  const s = nbSlot(post.id); if (!s) return null;
  const l = lang(r), list = NB_LINES[l][s.slot];
  const body = list[hash(post.id) % list.length].replace("{f}", nbDish(post.rec, post.dish, l));
  return { id: "nb-" + s.slot, title: NB_NAME + " · " + NB_TITLE[l][s.slot], body, q: "nb:" + post.id, ttl: 2 * 3600 };
}
export function decideNibblo(r: PRow, now: number, post: NbPost): Nudge | null {
  if (r.enabled === false || !on(r, "n")) return null;
  if (r.uid && r.uid === NB_UID) return null;
  const s = nbSlot(post.id); if (!s) return null;
  if (post.at && now - post.at > NB_FRESH_MIN * 6e4) return null;
  const L = local(now, r.tz, r.tzo);
  const qs = Number.isFinite(r.qs as number) ? (r.qs as number) : 22, qe = Number.isFinite(r.qe as number) ? (r.qe as number) : 7;
  if (quiet(L.h, qs, qe)) return null;
  if (r.seen && now - r.seen < 2 * 6e4) return null;
  const mine = sentToday(r, L.day).filter(x => /^nb-/.test(x));
  if (mine.indexOf("nb-" + s.slot) >= 0) return null;
  if (mine.length >= (NB_CAP[r.freq || "normal"] ?? 3)) return null;
  return nbNudge(r, post);
}
