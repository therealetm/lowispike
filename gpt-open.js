/* 25 Oct 2026 (Emmanuel, urgent): "Wenn man auf Deep Analyze drückt, dann zeigt sich der kostenpflichtige Chat GPT an. Der neue ist
   direkt die App. Jeder hat Chat GPT auf seinem Handy, direkt Custom, der Custom GPT."
   Deep analyze (scanner bar + not-found card) and the Cook GPT card were already plain links to the right Custom GPT. But in the
   iPhone / iPad Home Screen app iOS opens a target=_blank link in its in-app Safari sheet, where universal links never reach the
   ChatGPT app: he got chatgpt.com in the sheet with "Content failed to load".
   Here, only in the iOS Home Screen app: the tap hands the same /g/ path to the ChatGPT app's own scheme (com.openai.chat://).
   If the app is not there the page stays visible; the link then says so, and the next tap is the plain link to the Custom GPT
   (never bare chatgpt.com, never an iframe). Safari tabs, Android and desktop keep the plain link: the system opens the app there. */
(function () {
  "use strict";
  var W = window, D = W.document;
  if (W.LowiGptOpen) return;
  var GPT = "https://chatgpt.com/g/g-69481a874bf08191b8118f8d88c9c90e-lowispike";
  var HINT = {
    de: "Keine ChatGPT-App? Nochmal tippen für den Browser",
    en: "No ChatGPT app? Tap again to open it in the browser",
    es: "¿Sin la app de ChatGPT? Toca otra vez para el navegador"
  };
  /* only a Custom GPT link (/g/g-...) gets an app link; bare chatgpt.com or anything else gets none */
  function appURL(href) {
    var m = /^https:\/\/(?:chatgpt\.com|chat\.openai\.com)\/g\/(g-[A-Za-z0-9-]+)\/?(?:[?#].*)?$/.exec(String(href || ""));
    return m ? "com.openai.chat://chatgpt.com/g/" + m[1] : "";
  }
  function ios() {
    var n = W.navigator || {}, u = n.userAgent || "";
    return /iPhone|iPad|iPod/.test(u) || (n.platform === "MacIntel" && n.maxTouchPoints > 1);
  }
  function standalone() {
    try { return W.navigator.standalone === true || !!(W.matchMedia && W.matchMedia("(display-mode: standalone)").matches); } catch (e) { return false; }
  }
  function lang() {
    var l = "";
    try { l = (W.LowiLang && W.LowiLang.get && W.LowiLang.get()) || (D.documentElement && D.documentElement.lang) || "en"; } catch (e) { l = "en"; }
    l = String(l).slice(0, 2);
    return HINT[l] ? l : "en";
  }
  var pending = null, left = false, webUntil = 0, hinted = null, oldText = "", restoreT = 0;
  function restore() {
    if (hinted) { try { hinted.textContent = oldText; } catch (e) {} }
    hinted = null; webUntil = 0;
  }
  function gone() { if (pending) left = true; }
  /* 2.5 s after the hand-off: the page never went to the background, so no ChatGPT app took the link */
  function stayed() {
    var a = pending; pending = null;
    if (!a || left || D.visibilityState === "hidden") return;
    var s = a.querySelector && a.querySelector("small");
    if (s) { restore(); hinted = s; oldText = s.textContent; s.textContent = HINT[lang()]; }
    webUntil = Date.now() + 30000;
    try { W.clearTimeout(restoreT); restoreT = W.setTimeout(restore, 30000); } catch (e) {}
  }
  function onTap(e) {
    if (!e || e.defaultPrevented || (e.button && e.button !== 0)) return;
    var t = e.target, a = t && t.closest ? t.closest("a[href]") : null;
    if (!a) return;
    var app = appURL(a.getAttribute("href"));
    if (!app || !ios() || !standalone()) return;
    if (webUntil && Date.now() < webUntil) { restore(); return; } /* no app: this tap is the plain link to the Custom GPT */
    e.preventDefault();
    pending = a; left = false;
    W.location.href = app;
    try { W.setTimeout(stayed, 2500); } catch (err) {}
  }
  D.addEventListener("click", onTap, true);
  D.addEventListener("visibilitychange", function () { if (D.visibilityState === "hidden") gone(); });
  D.addEventListener("pagehide", gone);

  /* 29 Oct 2026 (Emmanuel, on the barcode result "Milky Candy": "In why i need a button that open my custom gpt for deeper
     analyses"). One shared button for every result card: the Why? panel of the scan card (barcode, typed number, name search),
     the photo check's verdict and the product card. It is the same plain link to his Custom GPT as Deep analyze (so the iOS
     Home Screen hand-off above still applies) and, in the same tap, copies what the app knows about this food: name, brand,
     portion, nutrients, ingredients, the verdict and its reason. He pastes it in the GPT. No ?q= prompt in the link: the
     ChatGPT app link carries none, and on the web it would send a message for him (decision of 21 Oct). */
  var DX = {
    en: { b: "Deeper analysis in the GPT", s: "Copies the data, opens your GPT", ok: "Copied. Paste it in the GPT.", no: "Opens your GPT. Copying didn't work here.",
      head: "LOWISPIKE SCAN: please analyse this in more depth.", prod: "Product", meal: "Meal (photo check)", brand: "Brand", code: "Barcode", pack: "Pack", portion: "Portion", per100: "Per 100 g", per100ml: "Per 100 ml", ing: "Ingredients",
      foods: "On the plate", drinks: "Drinks", total: "Total", verdict: "App verdict", often: "How often", why: "App's reason",
      kcal: "kcal", carbs: "carbs", sugar: "sugar", fiber: "fibre", protein: "protein", fat: "fat",
      ask: "Check the verdict against your rules, explain it in more depth and name concrete LOWiSPIKE alternatives." },
    de: { b: "Tiefer analysieren im GPT", s: "Kopiert die Daten, öffnet deinen GPT", ok: "Kopiert. Im GPT einfügen.", no: "Öffnet deinen GPT. Kopieren ging hier nicht.",
      head: "LOWISPIKE SCAN: Bitte analysiere das genauer.", prod: "Produkt", meal: "Mahlzeit (Foto-Check)", brand: "Marke", code: "Barcode", pack: "Packung", portion: "Portion", per100: "Pro 100 g", per100ml: "Pro 100 ml", ing: "Zutaten",
      foods: "Auf dem Teller", drinks: "Getränke", total: "Gesamt", verdict: "Urteil der App", often: "Wie oft", why: "Grund der App",
      kcal: "kcal", carbs: "KH", sugar: "Zucker", fiber: "Ballaststoffe", protein: "Eiweiß", fat: "Fett",
      ask: "Prüf das Urteil nach deinen Regeln, erklär es genauer und nenn konkrete LOWiSPIKE-Alternativen." },
    es: { b: "Análisis a fondo en el GPT", s: "Copia los datos y abre tu GPT", ok: "Copiado. Pégalo en el GPT.", no: "Abre tu GPT. Aquí no se pudo copiar.",
      head: "LOWISPIKE SCAN: analiza esto más a fondo, por favor.", prod: "Producto", meal: "Comida (control de la foto)", brand: "Marca", code: "Código de barras", pack: "Envase", portion: "Porción", per100: "Por 100 g", per100ml: "Por 100 ml", ing: "Ingredientes",
      foods: "En el plato", drinks: "Bebidas", total: "Total", verdict: "Veredicto de la app", often: "Con qué frecuencia", why: "Motivo de la app",
      kcal: "kcal", carbs: "carbohidratos", sugar: "azúcar", fiber: "fibra", protein: "proteína", fat: "grasa",
      ask: "Revisa el veredicto con tus reglas, explícalo más a fondo y da alternativas LOWiSPIKE concretas." }
  };
  function dl(l) {
    if (typeof l === "number") l = ["en", "de", "es"][l] || "en";
    l = String(l || lang()).slice(0, 2);
    return DX[l] ? l : "en";
  }
  function escH(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function gptURL() {
    try { var g = W.LowiVitalsBridge && W.LowiVitalsBridge.gpt; if (g && /^https:\/\/chatgpt\.com\/g\//.test(g)) return g; } catch (e) {}
    return GPT;
  }
  function nOk(v) { return typeof v === "number" && isFinite(v); }
  function fmt(v, l) { var n = Math.round(v * 10) / 10; var s = String(n); return l === "en" ? s : s.replace(".", ","); }
  /* "250 kcal · 30 g KH · 12 g Zucker · ..." from {kcal, carbs, sugar, fiber, protein, fat} */
  function nutLine(o, l) {
    var X = DX[l], out = [];
    if (!o) return "";
    if (nOk(o.kcal)) out.push(Math.round(o.kcal) + " " + X.kcal);
    ["carbs", "sugar", "fiber", "protein", "fat"].forEach(function (k) { if (nOk(o[k])) out.push(fmt(o[k], l) + " g " + X[k]); });
    return out.join(" · ");
  }
  /* the text that goes to the clipboard: plain lines, the GPT reads it as a scan request */
  function deepText(o, l) {
    o = o || {}; l = dl(l);
    var X = DX[l], L = [X.head, ""];
    var put = function (k, v) { v = String(v == null ? "" : v).replace(/\s+/g, " ").trim(); if (v) L.push(k + ": " + v); };
    if (o.kind === "meal") {
      L.push(X.meal);
      (o.foods || []).forEach(function (f) { if (f && f.name) L.push("- " + f.name + (f.portion ? " (" + f.portion + ")" : "") + (nutLine(f, l) ? ": " + nutLine(f, l) : "")); });
      if (o.drinks && o.drinks.length) { L.push(X.drinks + ":"); o.drinks.forEach(function (f) { if (f && f.name) L.push("- " + f.name + (f.portion ? " (" + f.portion + ")" : "") + (nutLine(f, l) ? ": " + nutLine(f, l) : "")); }); }
      put(X.total, nutLine(o.total, l));
    } else {
      put(X.prod, o.name);
      put(X.brand, o.brand);
      put(X.code, o.code);
      put(X.pack, o.pack);
      put(X.portion, o.portion);
      put(o.drink ? X.per100ml : X.per100, nutLine(o.per100, l));
      put(X.ing, String(o.ingredients || "").slice(0, 700));
    }
    put(X.verdict, o.verdict);
    put(X.often, o.often);
    var r = (o.reasons || []).map(function (x) { return String(x || "").replace(/\s+/g, " ").trim(); }).filter(Boolean);
    if (r.length) put(X.why, r.join(" "));
    L.push("", X.ask);
    return L.join("\n").slice(0, 3000);
  }
  var SPARK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.9 5.6L19.5 10.5l-5.6 1.9L12 18l-1.9-5.6L4.5 10.5l5.6-1.9z"/><path d="M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/></svg>';
  /* the button: a real link (target _blank, no data-b3 / data-ss / data-mr, so no card's own click handler swallows it) */
  function deepHTML(o, l, cls) {
    l = dl(l);
    var X = DX[l];
    return '<a class="gpt-deep' + (cls ? " " + escH(cls) : "") + '" href="' + escH(gptURL()) + '" target="_blank" rel="noopener" data-gpt-deep="' + escH(deepText(o, l)) + '" data-gpt-l="' + l + '">' +
      SPARK + '<span><b>' + escH(X.b) + '</b><small>' + escH(X.s) + '</small></span></a>';
  }
  function legacyCopy(text) {
    var ta = null, ok = false;
    try {
      ta = D.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", "");
      ta.style.position = "fixed"; ta.style.top = "0"; ta.style.left = "0"; ta.style.opacity = "0"; ta.style.fontSize = "16px";
      D.body.appendChild(ta); ta.select(); try { ta.setSelectionRange(0, text.length); } catch (e) {}
      ok = !!(D.execCommand && D.execCommand("copy"));
    } catch (e) { ok = false; }
    try { if (ta && ta.parentNode) ta.parentNode.removeChild(ta); } catch (e) {}
    return ok;
  }
  var deepT = 0;
  function said(a, ok) {
    var s = a && a.querySelector ? a.querySelector("small") : null, X = DX[dl(a.getAttribute("data-gpt-l"))];
    if (!s) return;
    s.textContent = ok ? X.ok : X.no;
    a.setAttribute("data-gpt-copied", ok ? "1" : "0");
    try { W.clearTimeout(deepT); deepT = W.setTimeout(function () { if (s.isConnected !== false) s.textContent = X.s; a.removeAttribute("data-gpt-copied"); }, 30000); } catch (e) {}
  }
  /* window capture: runs before the hand-off above (document capture), still inside the tap, so the clipboard accepts it */
  function onDeep(e) {
    if (!e || (e.button && e.button !== 0)) return;
    var t = e.target, a = t && t.closest ? t.closest("a[data-gpt-deep]") : null;
    if (!a) return;
    var text = a.getAttribute("data-gpt-deep") || "";
    if (!text) return;
    var n = W.navigator || {};
    try {
      if (n.clipboard && n.clipboard.writeText) {
        n.clipboard.writeText(text).then(function () { said(a, true); }, function () { said(a, legacyCopy(text)); });
        return;
      }
    } catch (err) {}
    said(a, legacyCopy(text));
  }
  W.addEventListener("click", onDeep, true);
  W.LowiGptOpen = { GPT: GPT, appURL: appURL, _stayed: stayed, deepText: deepText, deepHTML: deepHTML, url: gptURL };
})();
