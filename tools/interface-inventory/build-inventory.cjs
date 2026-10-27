'use strict';
/* Merges every crawl (<root>.json), walk (walk-<mode>.json), code pass (api.json) and iPad pass (ipad-*.json) in OUT
   into OUT/inventory.json: one entry per distinct interface, numbered by area (H-01, C-12 ...), German name, tap path,
   screenshot file(s), reachable yes/no. Surfaces that only the code pass opened are "nicht erreichbar" (X-). */
const fs = require('fs'), path = require('path');
const OUT = process.env.OUT || '/home/sprite/inv-shots';
const ROOTLBL = {
  gap: ['Home', 'Essenspause-Blase antippen'], water: ['Home', 'Wasser-Blase antippen'], move: ['Home', 'Move-Blase antippen'],
  scan: ['Home', 'Scan-Blase antippen'], sleep: ['Home', 'Schlaf-Blase antippen'], comm: ['Home', 'Community-Blase antippen'],
  fuel: ['Home', 'Fuel-Blase antippen'], misty: ['Home', 'Misty antippen'],
  hcomm: ['Home', 'Community-Blase gedr\u00fcckt halten'], hmove: ['Home', 'Move-Blase gedr\u00fcckt halten'], hfuel: ['Home', 'Fuel-Blase gedr\u00fcckt halten'],
  hmisty: ['Home', 'Misty gedr\u00fcckt halten'], hsleep: ['Home', 'Schlaf-Blase gedr\u00fcckt halten'], hscan: ['Home', 'Scan-Blase gedr\u00fcckt halten'],
  hgap: ['Home', 'Essenspause-Blase gedr\u00fcckt halten'],
  tshelf: ['Cook / Shop'], tprof: ['Profil'], tmove: ['Move'], tscan: ['Scan']
};
const RUNAREA = { gap: 'G', hgap: 'G', water: 'W', move: 'M', hmove: 'M', tmove: 'M', scan: 'S', hscan: 'S', tscan: 'S', sleep: 'SL', hsleep: 'SL',
  comm: 'C', hcomm: 'C', fuel: 'F', hfuel: 'F', tshelf: 'F', misty: 'H', hmisty: 'H', tprof: 'P' };
const AREANAME = { H: 'Home & Misty', C: 'Community', F: 'Fuel / Cook / Shop', M: 'Move', S: 'Scan', W: 'Wasser', G: 'Essenspause', SL: 'Schlaf',
  P: 'Profil & Einstellungen', T: 'Tutorial & Onboarding', X: 'Nicht erreichbar' };
function area(run, sg, tab, key) {
  const k = (key || '') + ' ' + (sg || '');
  if (/^(onboard|tutorial|quicktour|news)$/.test(run)) return 'T';
  if (tab === 'tab-profile') return 'P';
  if (tab === 'tab-foryou' || /tab-comm|tab-community|tab-room|tab-chat/.test(tab)) return 'C';
  if (tab === 'tab-shelf' || tab === 'tab-cook') return 'F';
  if (tab === 'tab-move') return 'M';
  if (tab === 'tab-scan') return 'S';
  if (/hb2-water/.test(k)) return 'W';
  if (/hb2-sleep/.test(k)) return 'SL';
  if (/hb2-move/.test(k)) return 'M';
  if (/b3Cam|rw-scan/.test(k)) return 'S';
  if (/gvSheet|gv-ov|fe-card/.test(k)) return 'G';
  if (/ssFood|r2-sh/.test(k)) return 'F';
  return RUNAREA[run] || 'H';
}
const stepName = s => s.kind === 'scroll' ? 'nach unten scrollen' : s.kind === 'eval' ? (s.js || '') : s.kind === 'hold' ? (s.name && s.name !== '__' ? s.name + ' gedr\u00fcckt halten' : 'gedr\u00fcckt halten') : '\u201e' + (s.name || s.id || s.cls || '?') + '\u201c antippen';
function tapPath(run, steps) {
  const base = ROOTLBL[run] ? ROOTLBL[run].slice() : [run];
  const rest = (steps || []).filter(s => !(s.name === '__' || s.kind === 'eval'));
  return base.concat(rest.map(stepName)).join(' \u2192 ');
}
const short = t => { t = String(t || '').replace(/\s+/g, ' ').trim(); if (t.length > 40) t = t.split(/[,.:\u00b7]/)[0].trim(); return t.slice(0, 60); };
function nameOf(s, tab) {
  const bad = /^(parent|start|fixture|__)?$/i;
  const last = (s.steps || []).filter(x => x.kind === 'tap' && x.name && x.name !== '__').pop();
  if (s.head && !bad.test(s.head)) return short(s.head);
  if (s.via && !bad.test(s.via)) return short(s.via);
  if (last) return short(last.name);
  return { 'hb2-water': 'Wasser-Men\u00fc', 'hb2-sleep': 'Schlaf-Men\u00fc', 'hb2-move': 'Move-Men\u00fc' }[(String(s.key).match(/hb2-(water|sleep|move)/) || [])[0]] || ({ 'tab-shelf': 'Cook / Shop', 'tab-profile': 'Profil', 'tab-move': 'Move', 'tab-scan': 'Scan', 'tab-foryou': 'Community' }[tab]) || s.key || tab;
}
const NAMES_FILE = { 'misty-004': 'Schritte eintragen (Move-Blase)', 'comm-015': 'Sternzeichen (Steinbock)', 'comm-003': 'Community-Men\u00fc', 'hsleep-002': 'Schlaf eintragen (Schlaf-Blase)', 'hmove-003': 'Bewegung: Schritte heute bearbeiten' };
const NAMES_CODE = {
  'LowiBirthCompanion.openCreator': 'Geburtstag & Begleiter erschaffen', 'LowiBook.open': 'Mein Rezeptbuch', 'LowiBucket.openToday': 'Heutige Eink\u00e4ufe (Korb)',
  'LowiCellRoom.openTree': 'Freundesbaum (alte Version)', 'LowiCompanion.open': 'Misty: Entwicklungsweg', 'LowiDayRecap.open': 'Tagesr\u00fcckblick',
  'LowiDex.open': 'Entdecker-Feldbuch', 'LowiDiscovery.openForm': 'Produkt melden (nur auf diesem Handy)', 'LowiE1.open': 'Tagesabschluss',
  'LowiEveningCatchup.open': 'Abend-Nachtrag (Punkte & Mahlzeiten)', 'LowiF2.start': 'Mahlzeit eintragen (nach dem Fasten)',
  'LowiG1.start': 'Alter Guide: leuchtende Scan-Kugel', 'LowiGiftBasket.open': 'Geschenkkorb: Hilf mit', 'LowiGrocery.open': 'Ladenfunde',
  'LowiHerbShop.open': 'Zahl, was du willst (Unterst\u00fctzen)', 'LowiHerbStart.openInterview': 'Startplan-Interview (Moss Leaf)',
  'LowiHerbStart.openPlan': 'N\u00e4chste Schritte (Startplan)', 'LowiIG.open': 'Mach LOWiSPIKE zur App (Installieren)',
  'LowiMealDetail.open': 'Mahlzeit-Details (leer)', 'LowiMicroBook.open': 'Reisetagebuch (K\u00f6rper-Universum)',
  'LowiQuickTour.open': 'Kurz-Tour', 'LowiR2.showGate': 'Konto-Pflicht: Fortschritt speichern (englisch)', 'LowiRanking.openInfo': 'Rangliste: So funktioniert es',
  'LowiRanking.openLadder': 'Level-Leiter (Misty-Level)', 'LowiRitual.openDay': 'Dranbleib-Tag (Tagesziel)', 'LowiRitual.openPicker': 'Dein Rhythmus: Wie oft?',
  'LowiSellerZone.open': 'Seller Zone', 'LowiSpirit.showPick': 'Dein Treffer (Rezept-Vorschlag)', 'LowiStorePicks.open': 'Welcher Laden?',
  'LowiTopBar.openWeather': 'Wetter', 'LowiWeekBasket.open': 'Von zu Hause einkaufen', 'LowiWorld3D.open': 'K\u00f6rperwelt 3D (Blutbahn)',
  'LowiWorldAudio.open': 'K\u00f6rperklang (Welt-Audio)', 'LowiWorldHome.openDetails': 'Misty: Formen, Aura & Wachstum',
  'LowiWorldRegions.openMap': 'K\u00f6rperwelt-Karte', 'LowiMoveBubble.open': 'Schritte eintragen (Move-Blase)',
  'LowiHomeOrbitV2.openSettings': 'Einstellungen (Home-Orbit, alte Version)', 'LowiHomeOrbitV2.openSleep': 'Wie hast du geschlafen? (Home-Orbit)' };
/* screenshots that are not an interface of their own: empty overlays, Home again after a tour */
const DROP = ['api-081', 'api-039', 'api-012', 'quicktour-002'];
/* fixes for surfaces whose detected name is a CSS class or that sit in the wrong area (by first screenshot file) */
const FIX = { 'hcomm-002': ['C', 'Community-Einstellungen (gedr\u00fcckt halten)'], 'comm-005': ['C', 'Profilkarte in der Community'],
  'hmisty-002': ['H', 'Mistys Karte (gedr\u00fcckt halten)'], 'hmisty-005': ['H', 'Mistys Karte: Weltleuchten & Energie'], 'tshelf-011': ['P', 'Profil-Men\u00fc (Du & Einstellungen)'] };
const GENERIC = /^(Kochen|Community|Bewegung|Misty|Profil|Move|Deine Daten|Essenspause)$/;
const normSig = sg => { sg = String(sg || '').replace('#app.', ''); return /^tab-home\|\|\|/.test(sg) ? 'HOME' : sg; };
const items = [], bySig = new Map();
function add(e) {
  e.sig = normSig(e.sig);
  if (e.sig === 'HOME' && e.area !== 'T') { e.area = 'H'; e.name = 'Home (Startseite)'; e.path = 'App \u00f6ffnen'; e.depth = 0; }
  if (/^[.#]/.test(e.name)) e.name = /hb2-fuel/.test(e.name) ? 'Essen-Men\u00fc' : /hb2-water/.test(e.name) ? 'Wasser-Men\u00fc' : /hb2-sleep/.test(e.name) ? 'Schlaf-Men\u00fc' : /hb2-move/.test(e.name) ? 'Move-Men\u00fc' : e.name;
  if (/hb2-all/.test(e.name)) e.name = 'Alle Blasen (Schnell\u00fcbersicht)';
  if (/^Home \u2192 Misty gedr\u00fcckt halten/.test(e.path) && e.area !== 'X') e.area = 'H';
  if (e.last && GENERIC.test(e.name) && short(e.last).indexOf(e.name) === 0) e.name = short(e.last);
  if (!e.name || e.name === 'undefined') e.name = (e.code && e.code[0]) || 'Unbenanntes Fenster';
  if (/^WIE IMMER/i.test(e.name)) e.name = 'Mahlzeit eintragen';
  if (e.last && GENERIC.test(e.name) && e.depth > 1 && short(e.last) !== e.name) e.name = e.name + ' \u2013 ' + short(e.last);
  const fx = FIX[(e.files[0] || '').replace('.jpg', '')]; if (fx) { e.area = fx[0]; e.name = fx[1]; }
  const k = e.sig + '|' + (e.dedupe || '');
  const prev = bySig.get(k);
  if (prev) { prev.files.push(...e.files.filter(f => !prev.files.includes(f))); if (e.depth < prev.depth) { prev.path = e.path; prev.depth = e.depth; } if (e.reachable) prev.reachable = true; return; }
  bySig.set(k, e); items.push(e);
}
const files = fs.readdirSync(OUT);
const exists = f => fs.existsSync(path.join(OUT, f));
for (const f of files.filter(f => /^[a-z]+\.json$/.test(f) && !/^(api|inventory)\.json$/.test(f))) {
  const run = f.replace('.json', ''), st = JSON.parse(fs.readFileSync(path.join(OUT, f), 'utf8'));
  for (const s of st.screens || []) {
    if (!exists(s.id + '.jpg')) continue;
    const tab = s.tab || '', home = !s.steps.length || (s.via === 'start');
    add({ sig: home ? 'HOME' : s.sig, area: home ? 'H' : area(run, s.sig, tab, s.key), name: home ? 'Home (Startseite)' : nameOf(s, tab),
      path: home ? 'App \u00f6ffnen' : tapPath(run, s.steps).replace(/^.*\u201eZur\u00fcck zur Startseite\u201c antippen/, 'Home'), last: ((s.steps || []).filter(x => x.kind === 'tap' && x.name && x.name !== '__').pop() || {}).name, depth: home ? 0 : s.steps.length, files: [s.id + '.jpg'], reachable: true, src: run, via: s.via, txt: (s.txt || '').slice(0, 120) });
  }
}
for (const f of files.filter(f => /^walk-[a-z]+\.json$/.test(f))) {
  const mode = f.slice(5, -5), arr = JSON.parse(fs.readFileSync(path.join(OUT, f), 'utf8'));
  const lbl = { onboard: 'Erster Start (neuer Nutzer)', tutorial: 'Tutorial', quicktour: 'Kurz-Tour', news: 'Update-Tour (Was ist neu)' }[mode] || mode;
  arr.forEach((s, i) => { if (exists(s.id + '.jpg')) add({ sig: 'walk:' + mode + ':' + i, area: 'T', name: lbl + ', Schritt ' + (i + 1) + (s.head ? ': ' + s.head : ''), path: lbl + ' \u2192 Schritt ' + (i + 1), depth: i, files: [s.id + '.jpg'], reachable: true, src: 'walk-' + mode, txt: (s.txt || '').slice(0, 120) }); });
}
if (exists('api.json')) {
  for (const s of JSON.parse(fs.readFileSync(path.join(OUT, 'api.json'), 'utf8'))) {
    if (!s.changed || !exists(s.id + '.jpg')) continue;
    const k = normSig(s.sig) + '|';
    if (k === 'HOME|') continue;
    if (bySig.has(k)) { const p = bySig.get(k); p.code = (p.code || []).concat(s.call); if (!p.files.includes(s.id + '.jpg')) p.altFiles = (p.altFiles || []).concat(s.id + '.jpg'); continue; }
    add({ sig: s.sig, area: 'X', name: s.head || (s.txt ? short(s.txt) : s.call), path: 'Kein Tap-Weg gefunden (nur per Code: ' + s.call + ')', depth: 99, files: [s.id + '.jpg'], reachable: false, src: 'api', code: [s.call], realArea: area('api', s.sig, s.tab, s.key), txt: (s.txt || '').slice(0, 120) });
  }
}
/* iPad shots: ipad-<id>.jpg next to the phone shot of the same interface, listed in ipad.json as {phoneId, file} */
if (exists('ipad.json')) for (const p of JSON.parse(fs.readFileSync(path.join(OUT, 'ipad.json'), 'utf8'))) { const it = items.find(i => i.files.includes(p.phoneId + '.jpg')); if (it && exists(p.file)) it.ipad = (it.ipad || []).concat(p.file); }
/* a code-only surface with the same name as a reachable one is the same screen: keep it as alternative shot */
for (let i = items.length - 1; i >= 0; i--) { const it = items[i]; if (it.area !== 'X') continue;
  const tw = items.find(o => o.reachable && o.name.toLowerCase() === String(it.name).replace(/^F /, '').split(' ').slice(0, 2).join(' ').toLowerCase() || o.reachable && o.name === it.name);
  if (tw) { tw.code = (tw.code || []).concat(it.code || []); items.splice(i, 1); } }
for (let i = items.length - 1; i >= 0; i--) { const it = items[i]; if (!/^Home \u2192/.test(it.path) || it.src === undefined) continue;
  const tw = items.find(o => o !== it && o.area === it.area && o.name === it.name && o.depth <= it.depth);
  if (tw && /tmove|tshelf|tprof|tscan/.test(it.src)) { tw.files.push(...it.files.filter(f => !tw.files.includes(f))); items.splice(i, 1); } }
/* explicit merges: screenshot of the same screen (other state / other path) -> main screenshot */
const MERGE = { 'misty-013': 'fuel-004', 'fuel-006': 'fuel-004', 'misty-018': 'fuel-004', 'api-061': 'hmisty-004', 'comm-011': 'tprof-008',
  'fuel-005': 'fuel-003', 'comm-016': 'tprof-004', 'tprof-011': 'tprof-004', 'api-037': 'api-016', 'tprof-009': 'tprof-010', 'hmove-006': 'hmove-003' };
const CODEMERGE = { 'LowiMoveBubble.open': 'misty-004', 'LowiQuickTour.open': 'quicktour-001' };
for (const [c, to] of Object.entries(CODEMERGE)) { const b = items.find(o => o.files.includes(to + '.jpg')); const a = items.find(o => o !== b && !o.reachable && (o.code || [])[0] === c);
  if (a && b) { b.code = (b.code || []).concat(a.code); items.splice(items.indexOf(a), 1); } }
for (let i = items.length - 1; i >= 0; i--) { const it = items[i]; if (DROP.includes((it.files[0] || '').replace('.jpg', '')) || (!it.reachable && !/[a-z\u00e0-\u00ff]{3}/i.test(String(it.txt || '').replace(/undefined/g, '')))) items.splice(i, 1); }
const byFile = f => items.find(o => o.files.includes(f + '.jpg'));
for (const [from, to] of Object.entries(MERGE)) { const a = byFile(from), b = byFile(to); if (!a || !b || a === b) continue;
  b.files.push(...a.files.filter(f => !b.files.includes(f))); b.code = (b.code || []).concat(a.code || []); if (a.reachable) b.reachable = true;
  if (a.reachable && a.depth < b.depth) { b.path = a.path; b.depth = a.depth; } items.splice(items.indexOf(a), 1); }
/* rule: a code-only surface whose text matches a reachable screen is that screen */
const t80 = t => String(t || '').replace(/\s+/g, ' ').trim().slice(0, 80);
for (let i = items.length - 1; i >= 0; i--) { const it = items[i]; if (it.reachable || !t80(it.txt)) continue;
  const tw = items.find(o => o.reachable && o.area !== 'T' && t80(o.txt) === t80(it.txt)); if (tw && tw.src !== 'tshelf') { tw.code = (tw.code || []).concat(it.code || []); items.splice(i, 1); } }
/* German names for code-only surfaces (by call) and cleanup of raw/long names */
const CODENAME = Object.assign({}, NAMES_CODE);
for (const it of items) {
  const c = (it.code || [])[0];
  if (!it.reachable && c && CODENAME[c]) it.name = CODENAME[c];
  else if (!it.reachable && (/^Lowi\w*\.|#|\u00d7|undefined/.test(it.name) || it.name.length > 40)) { it.name = String(it.txt || '').replace(/[#\u00d7\u2715\u2605]/g, ' ').replace(/\s+/g, ' ').trim().split(/[.!?:]/)[0].split(' ').slice(0, 5).join(' ') || 'Unbenanntes Fenster'; console.log('NEEDS NAME', c, '->', it.name); }
  const fx2 = NAMES_FILE[(it.files[0] || '').replace('.jpg', '')]; if (fx2) it.name = fx2;
  it.name = String(it.name).replace(/, 0 Sachen, \u00f6ffnen$/, '').replace(/, 0$/, '').replace(/^Kochen \u2013 /, 'K\u00fcche \u2013 ');
}
const ORDER = ['H', 'C', 'F', 'M', 'S', 'W', 'G', 'SL', 'P', 'T', 'X'];
items.sort((a, b) => ORDER.indexOf(a.area) - ORDER.indexOf(b.area) || a.depth - b.depth || a.path.localeCompare(b.path, 'de'));
const cnt = {};
for (const it of items) { cnt[it.area] = (cnt[it.area] || 0) + 1; it.nr = it.area + '-' + String(cnt[it.area]).padStart(2, '0'); it.areaName = AREANAME[it.area]; it.name = String(it.name).replace(/\s+/g, ' ').trim().slice(0, 70); }
const out = { built: new Date().toISOString(), device: 'iPhone 390x844, dunkel, Deutsch (iPad 1180x820 nur wo anders)', areas: AREANAME, counts: cnt, total: items.length,
  items: items.map(({ nr, area, areaName, name, path, files, ipad, reachable, src, code, realArea, txt, sig }) => ({ nr, area, areaName, name, path, files, ipad: ipad || [], reachable, src, code: code || [], realArea, txt, sig })) };
fs.writeFileSync(path.join(OUT, 'inventory.json'), JSON.stringify(out, null, 1));
console.log('inventory', items.length, JSON.stringify(cnt));
