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
const items = [], bySig = new Map();
function add(e) {
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
      path: home ? 'App \u00f6ffnen' : tapPath(run, s.steps), depth: home ? 0 : s.steps.length, files: [s.id + '.jpg'], reachable: true, src: run, via: s.via, txt: (s.txt || '').slice(0, 120) });
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
    const k = s.sig + '|';
    if (bySig.has(k)) { const p = bySig.get(k); p.code = (p.code || []).concat(s.call); if (!p.files.includes(s.id + '.jpg')) p.altFiles = (p.altFiles || []).concat(s.id + '.jpg'); continue; }
    add({ sig: s.sig, area: 'X', name: s.head || s.call, path: 'Kein Tap-Weg gefunden (nur per Code: ' + s.call + ')', depth: 99, files: [s.id + '.jpg'], reachable: false, src: 'api', code: [s.call], realArea: area('api', s.sig, s.tab, s.key), txt: (s.txt || '').slice(0, 120) });
  }
}
/* iPad shots: ipad-<id>.jpg next to the phone shot of the same interface, listed in ipad.json as {phoneId, file} */
if (exists('ipad.json')) for (const p of JSON.parse(fs.readFileSync(path.join(OUT, 'ipad.json'), 'utf8'))) { const it = items.find(i => i.files.includes(p.phoneId + '.jpg')); if (it && exists(p.file)) it.ipad = (it.ipad || []).concat(p.file); }
const ORDER = ['H', 'C', 'F', 'M', 'S', 'W', 'G', 'SL', 'P', 'T', 'X'];
items.sort((a, b) => ORDER.indexOf(a.area) - ORDER.indexOf(b.area) || a.depth - b.depth || a.path.localeCompare(b.path, 'de'));
const cnt = {};
for (const it of items) { cnt[it.area] = (cnt[it.area] || 0) + 1; it.nr = it.area + '-' + String(cnt[it.area]).padStart(2, '0'); it.areaName = AREANAME[it.area]; it.name = String(it.name).replace(/\s+/g, ' ').trim().slice(0, 70); }
const out = { built: new Date().toISOString(), device: 'iPhone 390x844, dunkel, Deutsch (iPad 1180x820 nur wo anders)', areas: AREANAME, counts: cnt, total: items.length,
  items: items.map(({ nr, area, areaName, name, path, files, ipad, reachable, src, code, realArea, txt }) => ({ nr, area, areaName, name, path, files, ipad: ipad || [], reachable, src, code: code || [], realArea, txt })) };
fs.writeFileSync(path.join(OUT, 'inventory.json'), JSON.stringify(out, null, 1));
console.log('inventory', items.length, JSON.stringify(cnt));
