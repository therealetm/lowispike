const fs = require('fs'), d = __dirname;
const F = require(d + '/data.js');
const src = fs.readFileSync(d + '/p3_text.js', 'utf8') + '\nmodule.exports={UI,REC,LEFT_TIP};';
const m = { exports: {} }; new Function('module', src)(m);
const { UI, REC } = m.exports;
let bad = 0; const warn = s => { bad++; console.log('PROBLEM', s); };
const special = ['leftover', 'trays', 'pieces'];
for (const id of Object.keys(F.RECIPES)) {
  const r = F.RECIPES[id];
  if (!REC[id]) { warn('no text ' + id); continue; }
  for (const lg of ['de', 'en']) {
    const x = REC[id][lg]; if (!x) { warn('no ' + lg + ' ' + id); continue; }
    ['name', 'statt', 'portion', 'drink', 'why'].forEach(k => { if (!x[k]) warn(id + ' ' + lg + ' missing ' + k); });
    if (r.leftover && !x.reheat) warn(id + ' ' + lg + ' missing reheat');
    const used = new Set();
    x.steps.forEach(s => { for (const mm of s.matchAll(/\{(\w+)(?:\*([\d.]+))?\}/g)) { used.add(mm[1]); if (!special.includes(mm[1]) && !r.ing.find(e => e[0] === mm[1])) warn(id + ' ' + lg + ' unknown token ' + mm[1]); } });
    r.ing.forEach(e => { if (e[0] === 'salt' && /Salz|salt/.test(x.steps.join(' '))) return; if (!used.has(e[0])) warn(id + ' ' + lg + ' ingredient not in steps: ' + e[0]); });
    if (r.leftover && !used.has('leftover')) warn(id + ' ' + lg + ' no leftover step');
  }
  // oil split steps must add up
  const half = REC[id].de.steps.join(' ').match(/\{oil\*0\.5\}/g);
  if (half && half.length !== 2) warn(id + ' oil*0.5 used ' + half.length + 'x');
}
for (const day of F.WEEK) day.slots.forEach(s => { const id = s[1] === 'rest' ? s[2] : s[1]; if (id !== 'shop' && !F.RECIPES[id]) warn('week unknown ' + id); });
// every rest slot must follow a day whose dinner is that recipe
F.WEEK.forEach((day, i) => day.slots.forEach(s => { if (s[1] !== 'rest') return; const prev = F.WEEK[(i + 6) % 7].slots.find(x => F.RECIPES[x[1]] && F.RECIPES[x[1]].slot === 'dinner'); if (!prev || prev[1] !== s[2]) warn('rest mismatch day ' + i); }));
// every thaw has a dinner next day that uses it
F.WEEK.forEach((day, i) => day.tasks.forEach(k => { const nx = F.WEEK[(i + 1) % 7].slots.find(x => F.RECIPES[x[1]] && F.RECIPES[x[1]].slot === 'dinner'); if (!F.RECIPES[nx[1]].ing.find(e => e[0] === k[2])) warn('thaw ' + k[2] + ' not used next day (' + nx[1] + ')'); }));
console.log(bad ? bad + ' problems' : 'all text checks pass');
for (const p of [1, 2, 3]) { const b = F.basket(p, 0); console.log('P', p, 'till', b.total.toFixed(2), 'spare', b.spare.toFixed(2), 'perday', ((b.total - b.spare) / p / 7).toFixed(2)); }
