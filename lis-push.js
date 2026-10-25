/* ===== LOWiSPIKE phone notifications, four pillars (25 Oct 2026) =====
   Works with the N1 part 2 block in index.html (#n1pJs: permission, subscription, settings row) and the n1-push edge function.
   A  For You: a real food photo or recipe from the feed, at meal times
   B  Product: a community-rated product, at shopping times (never "go shopping now")
   C  Energy received: someone sent your companion energy, also while you were offline
   D  Your own companion, Tamagotchi style, on days you have not opened the app
   N  Nibblo's meals (25 Oct 2026): the bot's breakfast, lunch and dinner post in Chat, sent by the server (n1-push nibblo.ts);
      a tap opens Chat at that post (and Nibblo's recipe, when nibblo-core.js offers LowiNibblo.openRecipe)
   This file adds: the five switches (stored on the phone, sent with the subscription), the login token so the subscription
   belongs to your account (needed for C), the companion name, where a tapped push opens, a one-time ask that does not depend
   on the old Home hint bubble, and the hook for C: window.LisPush.energySent(toUid). */
(function(){
"use strict";
if (window.LisPush) return;
const D = document, KEY = "lowi.pushPillars", AKEY = "lowi.pushAsk";
const FN = "https://vnfwmifmsfecascwaody.supabase.co/functions/v1/n1-push";
const P = () => window.LowiN1P || null;
const LANG = () => { let l = "en"; try { l = (window.LowiLang && LowiLang.get && LowiLang.get()) || localStorage.getItem("lowispike.lang") || D.documentElement.lang || "en"; } catch(e){} l = String(l).slice(0, 2); return l === "de" || l === "es" ? l : "en"; };
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const js = k => { try { return JSON.parse(localStorage.getItem(k) || "{}") || {}; } catch(e){ return {}; } };
const put = (k, o) => { try { localStorage.setItem(k, JSON.stringify(o)); } catch(e){} return o; };

const W = {
  en: {d:"Your companion", dSub:"Only on days you haven't opened the app", c:"Energy", cSub:"When someone sends your companion energy, also when you're offline",
    n:"Nibblo's meals", nSub:"Nibblo's low-spike meal idea at breakfast, lunch and dinner",
    a:"For You", aSub:"A real food photo or recipe from the feed, around mealtimes", b:"Product", bSub:"A product the community rated, around shopping days",
    what:"What can reach you", ask:"Can I message you when the app is closed? Energy from friends, a recipe from For You, a good product find, and the odd note from me. Never in your quiet hours.",
    yes:"Yes, message me", no:"Not now", ok:"Deal. I'll be charming. Mostly."},
  de: {d:"Dein Begleiter", dSub:"Nur an Tagen, an denen du die App nicht ge\u00f6ffnet hast", c:"Energie", cSub:"Wenn jemand deinem Begleiter Energie schickt, auch wenn du offline bist",
    n:"Nibblos Mahlzeiten", nSub:"Nibblos Essensidee mit wenig Spike, zum Fr\u00fchst\u00fcck, Mittag- und Abendessen",
    a:"For You", aSub:"Ein echtes Essensfoto oder Rezept aus dem Feed, um die Essenszeiten", b:"Produkt", bSub:"Ein Produkt, das die Community bewertet hat, rund um Einkaufstage",
    what:"Was dich erreichen darf", ask:"Darf ich dir schreiben, wenn die App zu ist? Energie von Freunden, ein Rezept aus For You, ein guter Produktfund und mal was von mir. Nie in deiner Ruhezeit.",
    yes:"Ja, schreib mir", no:"Nicht jetzt", ok:"Abgemacht. Ich bleib charmant. Meistens."},
  es: {d:"Tu compa\u00f1ero", dSub:"Solo los d\u00edas que no has abierto la app", c:"Energ\u00eda", cSub:"Cuando alguien manda energ\u00eda a tu compa\u00f1ero, tambi\u00e9n sin conexi\u00f3n",
    n:"Comidas de Nibblo", nSub:"La idea de comida de bajo pico de Nibblo en el desayuno, la comida y la cena",
    a:"For You", aSub:"Una foto de comida o receta real del feed, cerca de las comidas", b:"Producto", bSub:"Un producto valorado por la comunidad, cerca de los d\u00edas de compra",
    what:"Qu\u00e9 te puede llegar", ask:"\u00bfTe puedo escribir con la app cerrada? Energ\u00eda de amigos, una receta de For You, un buen hallazgo de producto y alguna nota m\u00eda. Nunca en tus horas de silencio.",
    yes:"S\u00ed, escr\u00edbeme", no:"Ahora no", ok:"Trato hecho. Ser\u00e9 encantador. Casi siempre."}
};
const w = k => (W[LANG()] && W[LANG()][k]) || W.en[k] || k;

/* ---------- the five switches (all on by default once phone notifications are on) ---------- */
const ORDER = ["d", "c", "n", "a", "b"];
function pillars(){ const s = js(KEY), o = {}; ORDER.forEach(k => { o[k] = s[k] !== false; }); return o; }
function setPillar(k, v){ if (ORDER.indexOf(k) < 0) return pillars(); const s = pillars(); s[k] = !!v; put(KEY, s); try { const p = P(); p && p.sync && p.sync(true); } catch(e){} return s; }
function pillarHTML(){ const p = pillars();
  return '<div class="lisp-pil" role="group" aria-label="' + esc(w("what")) + '"><div class="small muted lisp-what">' + esc(w("what")) + '</div>' +
    ORDER.map(k => '<button type="button" class="lisp-sw' + (p[k] ? " on" : "") + '" data-lisp="' + k + '" role="switch" aria-checked="' + p[k] + '"><span class="lisp-t"><b>' + esc(w(k)) + '</b><span class="small muted">' + esc(w(k + "Sub")) + '</span></span><span class="lisp-k" aria-hidden="true"></span></button>').join("") + '</div>'; }
D.addEventListener("click", e => { const a = e.target && e.target.closest && e.target.closest("[data-lisp]"); if (!a) return;
  e.preventDefault(); e.stopPropagation(); const k = a.dataset.lisp, on = !a.classList.contains("on");
  try { window.LowiAudio && LowiAudio.play && LowiAudio.play("tap"); } catch(x){}
  setPillar(k, on); a.classList.toggle("on", on); a.setAttribute("aria-checked", String(on)); }, true);

/* ---------- what goes along with the subscription ---------- */
function cname(){ try { const B = window.LowiBirthCompanion; const n = B && B.displayName ? B.displayName() : ""; return String(n || "").slice(0, 24); } catch(e){ return ""; } }
function extra(){ const o = {pillars:pillars()}; const n = cname(); if (n) o.cn = n; return o; }
/* the login token of a real (not anonymous) account, or "" */
async function tok(){ try { const X = window.LOWI_CLOUD_X; if (!X || !X.client) return ""; const sb = await X.client(); const s = sb && (await sb.auth.getSession()).data.session;
  return s && s.user && !s.user.is_anonymous ? s.access_token : ""; } catch(e){ return ""; } }

/* ---------- C: energy received ----------
   Since the release (25 Oct 2026) the server does this by itself: every shot that lands is a row in public.energy_gifts, and
   a database trigger asks n1-push to push it right away. The app no longer sends anything, so a shot is never pushed twice.
   Kept as a harmless no-op for any code that still calls it. */
function energySent(){ return Promise.resolve({ok:true, why:"server"}); }
void FN;

/* ---------- where a tapped push opens ---------- */
function route(q){
  const tab = t => { try { if (typeof window.lowiOpen === "function") window.lowiOpen(t); else if (typeof window.goTab === "function") window.goTab(t); } catch(e){} };
  const seg = v => { try { if (typeof window.cmSeg === "function") window.cmSeg(v); } catch(e){} };
  if (q === "foryou") { tab("foryou"); setTimeout(() => seg("feed"), 350); return true; }
  if (q === "community") { tab("foryou"); setTimeout(() => seg("chat"), 350); return true; }
  if (q === "home" || q === "scan") { tab("home"); return true; }
  const nb = /^nb:(nb-\d{8}-[mne])$/.exec(String(q || ""));
  if (nb) { tab("foryou"); setTimeout(() => seg("chat"), 350); setTimeout(() => nbShow(nb[1], 0), 900); return true; }
  return false; }
/* a Nibblo push: Chat scrolled to that meal post, then Nibblo's recipe if nibblo-core.js offers it (recipe task) */
function nbShow(id, n){
  const el = D.querySelector('#tab-foryou [data-id="' + id + '"]') || D.querySelector('[data-id="' + id + '"]');
  if (!el && n < 12) { setTimeout(() => nbShow(id, n + 1), 400); return; }
  try { el && el.scrollIntoView({block: "center", behavior: "smooth"}); } catch(e){}
  try { const N = window.LowiNibblo; if (N && typeof N.openRecipe === "function") N.openRecipe(id); } catch(e){} }

/* ---------- the one-time ask (the old Home hint bubble that used to ask is gone) ----------
   Only on the second day of use or later, on Home, with nothing else open, when the phone can do it (on iPhone: from the
   Home Screen app) and the person has never answered the system question. "Not now" waits 7 days, at most twice. */
function days(){ const a = js(AKEY), d = new Date().toISOString().slice(0, 10); if (a.last !== d) { a.last = d; a.n = (a.n || 0) + 1; put(AKEY, a); } return a.n || 1; }
function askable(){ const p = P(); if (!p || !p.mode) return false;
  if (p.mode() !== "off" || !("Notification" in window) || Notification.permission !== "default") return false;
  const a = js(AKEY); if (a.done || (a.no || 0) >= 2 || (a.at && Date.now() - a.at < 7 * 864e5)) return false;
  if (days() < 2) return false;
  const home = D.getElementById("tab-home"); if (!home || !home.classList.contains("active")) return false;
  if (D.querySelector('[aria-modal="true"]:not([hidden]), .sheet.open, .tour-on, .lisp-card')) return false;
  return true; }
function ask(force){
  if (!force && !askable()) return false;
  const a = js(AKEY); a.at = Date.now(); put(AKEY, a);
  const c = D.createElement("div"); c.className = "lisp-card"; c.setAttribute("role", "dialog"); c.setAttribute("aria-label", w("yes"));
  c.innerHTML = '<p class="lisp-q"></p><div class="lisp-b"><button type="button" class="chip lisp-no"></button><button type="button" class="chip on lisp-yes"></button></div>';
  c.querySelector(".lisp-q").textContent = (cname() ? cname() + ": " : "") + w("ask");
  c.querySelector(".lisp-yes").textContent = w("yes"); c.querySelector(".lisp-no").textContent = w("no");
  const close = () => { c.classList.add("out"); setTimeout(() => c.remove(), 260); };
  c.querySelector(".lisp-yes").addEventListener("click", () => { const s = js(AKEY); s.done = 1; put(AKEY, s);
    const p = P(); (p && p.enable ? p.enable() : Promise.resolve("off")).then(m => { if (m === "on") { c.querySelector(".lisp-q").textContent = w("ok"); c.querySelector(".lisp-b").remove(); setTimeout(close, 2600); } else close(); }, close); });
  c.querySelector(".lisp-no").addEventListener("click", () => { const s = js(AKEY); s.no = (s.no || 0) + 1; put(AKEY, s); close(); });
  D.body.appendChild(c); return true; }
function init(){ days(); setTimeout(() => { try { ask(false); } catch(e){} }, 25000); }
if (D.readyState === "loading") D.addEventListener("DOMContentLoaded", init); else setTimeout(init, 0);

window.LisPush = {pillars, setPillar, pillarHTML, extra, tok, energySent, route, ask, askable, w};
})();
