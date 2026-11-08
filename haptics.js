/* LOWiSPIKE · a light tap you feel (8 Nov 2026).
   Emmanuel: "füge mal so Vibrationen hinzu, wenn möglich ... Like the phone vibrating ... in the appropriate spot."
   Where it is felt: switching a tab or section (Circle bar, Community tabs), the main action of a screen (Posten, Ich bin dabei, a
   tick in the Challenge), switches, and Speichern / Teilen on a post. Android and most browsers: navigator.vibrate (a 10 ms tick).
   iPhone (Safari has no vibrate): iOS 18 gives the system tick when a switch-style checkbox is toggled, so a hidden one is toggled
   through its label. Older iPhones simply feel nothing. Off with localStorage lowi.haptics = '0'. */
(function (W, D) {
  'use strict';
  if (!W || !D || W.LowiHaptic) return;
  const SEL = '#cspBar [data-csp],[role="tab"],.rm-tab,.csp-tab,[data-r3f="post"],#trPost,.cwk-go,.cwk-tick,.toggle,.fy-act,.tr-pick,.shs-copy,.shs-wa,.stp-chip,[data-act="close-sheet"]';
  let last = 0, lbl = null;
  const off = () => { try { return W.localStorage.getItem('lowi.haptics') === '0'; } catch (e) { return false; } };
  function iosTick() {
    if (!lbl) {
      const id = 'lwHapticSw';
      lbl = D.createElement('label'); lbl.setAttribute('for', id); lbl.setAttribute('aria-hidden', 'true');
      lbl.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
      const inp = D.createElement('input'); inp.type = 'checkbox'; inp.id = id; inp.setAttribute('switch', ''); inp.tabIndex = -1;
      lbl.appendChild(inp); D.body.appendChild(lbl);
    }
    lbl.click();
  }
  function tap() {
    if (off()) return;
    const t = Date.now(); if (t - last < 60) return; last = t;
    try { if (navigator.vibrate && navigator.vibrate(10)) return; } catch (e) { }
    try { if (/iP(hone|ad|od)/.test(navigator.userAgent || '') || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) iosTick(); } catch (e) { }
  }
  D.addEventListener('click', e => {
    const t = e.target; if (!t || !t.closest || !e.isTrusted) return;
    if (t.closest('#lwHapticSw') || (lbl && lbl.contains(t))) return;
    if (t.closest(SEL)) tap();
  }, true);
  W.LowiHaptic = { tap, SEL };
})(typeof window !== 'undefined' ? window : null, typeof document !== 'undefined' ? document : null);
