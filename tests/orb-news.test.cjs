'use strict';
/* Oct 14: update news comes from the user's own orb (the herb bubble) in a speech bubble, not a generic banner.
   The Q1 banner stays as the hidden engine; "Later" hides it for that build; nothing loops. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const cut = (a, b) => { const i = html.indexOf(a); assert(i >= 0, 'missing ' + a); const j = html.indexOf(b, i); assert(j > i, 'missing ' + b); return html.slice(i, j); };

test('the old banner is only the engine: hidden, never focusable, never read twice', () => {
  assert(html.includes('#lcUpd.g1-ob{display:none!important}'));
  const d = cut('function decorate(){', '/* late text: seen too */');
  assert(d.includes('d.classList.add("g1-upd", "g1-ob")'));
  assert(d.includes('d.setAttribute("aria-hidden", "true")'));
  assert(d.includes('obShow({kind:"update"'));
  assert(!d.includes('flyInto'), 'no fairy flight into a hidden banner');
});

test('the bubble speaks from the real orb on Today, from a copy of it elsewhere, never from a new mascot', () => {
  const a = cut('function obAnchor(){', 'function obPlace(){');
  assert(a.includes('$("#spBubble")') && a.includes('onHome()') && a.includes('elementsFromPoint'));
  const h = cut('function obHerb(){', 'function obPalette(r){');
  assert(h.includes('#spBubble .sp-creature') && h.includes('LowiHerbTamagotchi'));
  assert(!/[\u{1F300}-\u{1FAFF}]/u.test(h), 'no emoji stand-in');
  assert(!html.includes('.spirit-app .g1ob-orb{display:none'), 'the copy is not hidden in the spirit app like the old guide herb');
});

test('Later (button or Esc) hides it for that build only, and the build check never asks at all (Oct 26)', () => {
  const l = cut('function obLater(){', 'function obClick(e){');
  assert(l.includes('localStorage.setItem(LATER, OB.build'));
  assert(l.includes('markSeen(upNews.id)'));
  assert(cut('const LATER', ';') === 'const LATER = "lowi.upd.later"');
  /* Oct 26: the build check never asks at all any more (every release is silent), so Later has nothing left to hold back */
  const q = cut('if (v.build <= BUILD || failedRecently(v.build)) { clearUpd(); return; }', 'const QUIET_AWAY');
  assert(q.includes('clearUpd(); quietLoad(v.build);') && !q.includes('showUpd()'));
  assert(html.includes('e.key === "Escape" && OB && !TOUR'));
});

test('real buttons with names, 44 px targets, and Update goes through the same refresh as the old banner', () => {
  const b = cut('function obButtons(){', '\nlet obT = 0;');
  assert(b.includes('type="button"'));
  assert(b.includes('b("later", "g1ob-2", esc(T("Later")))') && b.includes('b("update", "g1ob-1", esc(T("Update now")))'));
  assert(html.includes('min-height:44px'));
  const c = cut('function obClick(e){', 'addEventListener("keydown"');
  assert(c.includes('const d = $("#lcUpd")') && c.includes('d.click()'));
  assert(c.includes('LowiUpd.go(OB.build)') && c.includes('sessionStorage.setItem(GO, "1")'), 'Update calls the same engine directly with the bubble build');
  const u = cut('function obUpd(s, why){', 'function obClick(e){');
  assert(u.includes('btn.disabled = false') && u.includes('"Try again"') && u.includes('"updslow"') && u.includes('"updoff"'), 'a stalled update hands the button back');
  assert(html.includes('document.addEventListener("lowi:upd"'));
  assert(html.includes('["Update now", "Update", "Aktualisieren", "Actualizar"]'));
});

test('the post-update news is the same orb bubble, and nothing else starts while the orb talks', () => {
  const g = cut('function begin(t){', 'updateFlight++;');
  assert(g.includes('t.kind === "offer"') && g.includes('obShow({kind:"offer"'));
  assert(html.includes('if (TOUR) { helpPlace(); return; } if (OB) return;'));
  assert(html.includes('(OB ? {kind:"ob", k:OB.kind, i:0, n:1} : null)'), 'other popups see it through LowiG1.state()');
  assert(html.includes('"#lcUpd, #g1Ob"') || html.includes('#lcUpd, #g1Ob";'));
});

test('reduced motion: no pop, hop or float', () => {
  const m = html.match(/@media \(prefers-reduced-motion:reduce\)\{#g1Ob[^\n]*/);
  assert(m, 'reduced-motion rule for the orb bubble');
  assert(m[0].includes('animation:none') && m[0].includes('transition:none') && m[0].includes('#spBubble.g1ob-talk'));
});
