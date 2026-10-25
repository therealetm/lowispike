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
  W.LowiGptOpen = { GPT: GPT, appURL: appURL, _stayed: stayed };
})();
