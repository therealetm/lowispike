/* Builds a phone-sized PDF (German, 2 people) from the same data and texts as the page. */
const fs = require('fs'), path = require('path'), d = __dirname, { chromium } = require('playwright');
const r = f => fs.readFileSync(path.join(d, f), 'utf8');
const css = `
@page{size:100mm 178mm;margin:0}
:root{--bg:#fffdf8;--card:#f3efe6;--fg:#1d2218;--muted:#5d6152;--accent:#ffb02e;--ink:#1c1304;--atext:#9a5a00;--ok:#17683a;--okbg:#e2f2e7;--bad:#a4372a;--badbg:#f8e1dc}
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
html,body{margin:0;background:var(--bg);color:var(--fg);font:500 10.5pt/1.4 Inter,'DejaVu Sans',sans-serif}
.pg{padding:7mm 6mm 6mm;break-after:page}
.pg:last-child{break-after:auto}
h1,h2,h3{margin:0;line-height:1.1;font-weight:800;letter-spacing:-.01em}
h1{font-size:24pt}h2{font-size:17pt}h3{font-size:12.5pt}
.kick{font-size:8pt;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--atext);margin-bottom:2mm}
.sub{color:var(--muted);font-weight:700;margin:1.5mm 0 0}
.brand{display:flex;align-items:center;gap:2mm;font-size:8pt;font-weight:800;letter-spacing:.14em;margin-bottom:5mm}
.brand svg{width:4.5mm;height:4.5mm}
.box{background:var(--card);border-radius:4mm;padding:3.5mm 4mm;margin-top:3.5mm;break-inside:avoid}
.box.acc{background:var(--accent);color:var(--ink)}
.box.ok{background:var(--okbg)}
ol,ul{margin:1.5mm 0 0;padding-left:5mm}
li{margin:.8mm 0}
.wk{display:grid;grid-template-columns:auto 7mm 1fr;gap:.8mm 2.5mm;align-items:center;margin-top:3mm}
.wk svg{width:7mm;height:7mm}
.wk b{font-size:10pt}
.wk small{display:block;color:var(--muted);font-weight:600;font-size:8.5pt}
.big{font-size:28pt;font-weight:800;color:var(--atext);line-height:1}
.ais{margin-top:4mm;break-inside:avoid}
.ais h3{display:flex;justify-content:space-between;font-size:11pt;border-bottom:.4mm solid var(--fg);padding-bottom:1mm}
.ais h3 span{font-weight:700;color:var(--muted);font-size:9pt}
.it{display:grid;grid-template-columns:4.5mm 7mm 1fr auto;gap:2mm;align-items:baseline;padding:1.3mm 0;border-bottom:.2mm solid #ddd6c8}
.bx{width:3.6mm;height:3.6mm;border:.45mm solid var(--fg);border-radius:.8mm;align-self:center}
.it b{font-size:11pt}.it small{color:var(--muted);font-weight:600;font-size:8.5pt}
.it .pr{font-weight:700;font-size:9pt;white-space:nowrap}
.tl{margin-top:3mm;display:grid;grid-template-columns:12mm 1fr;gap:2mm 2.5mm}
.tl .t{font-weight:800;font-size:11pt;color:var(--atext)}
.tl .c b{display:block;font-size:10.5pt}.tl .c small{color:var(--muted);font-weight:600;font-size:8.5pt}
.tag{display:inline-block;background:var(--accent);color:var(--ink);border-radius:9mm;font-size:7pt;font-weight:800;padding:.2mm 2mm;margin-bottom:.6mm}
.tag.cold{background:#d6ecf8;color:#124560}
.rc{margin-top:5mm;break-inside:auto}
.rh{display:flex;gap:3mm;align-items:center;break-after:avoid}
.rh svg{width:13mm;height:13mm;flex:none;background:var(--card);border-radius:50%;padding:1mm}
.swap{display:inline-block;background:var(--badbg);color:var(--bad);border-radius:9mm;font-size:7.5pt;font-weight:800;padding:.3mm 2.2mm;margin-top:1mm}
.meta{display:flex;flex-wrap:wrap;gap:1.5mm;margin-top:2.5mm}
.meta span{background:var(--card);border-radius:9mm;padding:.6mm 2.5mm;font-size:8.5pt;font-weight:700}
.eat{background:var(--okbg);border-radius:3mm;padding:2mm 3mm;margin-top:2mm;font-weight:700;font-size:9.5pt}
.eat b{color:var(--ok)}
.ing{display:grid;grid-template-columns:1fr auto;gap:.2mm 3mm;margin-top:2mm;font-size:9.5pt;break-inside:avoid}
.ing span:nth-child(odd){border-bottom:.2mm solid #e4ddcf;padding:.6mm 0}
.ing span:nth-child(even){border-bottom:.2mm solid #e4ddcf;padding:.6mm 0;font-weight:800;text-align:right}
.st{margin:2.5mm 0 0;padding:0;list-style:none;counter-reset:s}
.st li{counter-increment:s;position:relative;padding-left:7mm;margin:1.6mm 0;break-inside:avoid}
.st li::before{content:counter(s);position:absolute;left:0;top:0;width:5mm;height:5mm;border-radius:50%;background:var(--accent);color:var(--ink);font-weight:800;font-size:8pt;display:grid;place-items:center}
.st b{color:var(--atext)}
.nut{color:var(--muted);font-size:8pt;font-weight:600;margin-top:1.5mm}
.foot{color:var(--muted);font-size:7.5pt;font-weight:600;margin-top:4mm}
`;
const body = `<div id="app" hidden></div><div id="cta" hidden></div><div id="veil" hidden></div>
<section id="sheet-r" hidden><div class="in"></div></section><section id="sheet-l" hidden><div class="in"></div></section><div id="toast" hidden></div>
<main id="out"></main>
<script>window.FAW_PRINT = true;
try { localStorage.setItem('faw.v1', JSON.stringify({ lang: 'de', people: 2, seen: true, checks: {} })); } catch (e) {}
${r('data.js')}
${r('p2_icons.js')}
${r('p3_text.js')}
${r('p4_app.js')}
(function () {
  const F = FAW, A = FAWAPP, t = UI.de, P = 2, b = F.basket(P, 0);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const order = [6, 0, 1, 2, 3, 4, 5]; /* starts Sunday */
  const dish = k => k;
  let h = '';
  /* page 1: start */
  h += '<section class="pg"><div class="brand">' + ICONS.leaf + 'LOWISPIKE</div><div class="kick">Für ' + A.ppl(P) + ' · 7 Tage</div><h1>Fakeaway-Woche</h1>' +
    '<p class="sub">Burger, Pizza, Döner & Co. Ohne Zucker, ohne Mehl. Einmal am Tag kochen.</p>' +
    '<div class="box acc"><h3>So startest du</h3><ol>' + t.first.map((x, i) => '<li>' + esc(i === 0 ? 'Samstag einkaufen. Die Liste ist auf Seite 2.' : i === 2 ? 'Sonntag geht’s los. Jeder Tag beginnt auf einer neuen Seite.' : x) + '</li>').join('') + '</ol></div>' +
    '<div class="wk">' + order.map(i => { const day = F.WEEK[i], din = day.slots.find(s => F.RECIPES[s[1]] && F.RECIPES[s[1]].slot === 'dinner'); return '<b>' + t.daysS[i] + '</b>' + ICONS[dish(day.theme)] + '<div><b>' + esc(t.themes[day.theme]) + '</b><small>Abends: ' + esc(REC[din[1]].de.name) + '</small></div>'; }).join('') + '</div></section>';
  /* page 2: shopping */
  const perDay = (b.total - b.spare) / P / 7;
  h += '<section class="pg"><div class="kick">Samstag, 10:00</div><h2>Einkaufsliste</h2><div class="big" style="margin-top:2mm">ca. ' + A.eur0(b.total) + '</div>' +
    '<p class="sub">' + esc(t.forP(A.ppl(P), A.eur(perDay))) + '. ' + esc(t.spare(A.eur0(b.spare))) + '</p>' +
    F.AISLES.map(a => { const rs = b.rows.filter(x => F.ITEMS[x.it].aisle === a); if (!rs.length) return ''; return '<div class="ais"><h3>' + t.aisles[a] + '<span>' + A.eur(rs.reduce((s, x) => s + x.cost, 0)) + '</span></h3>' +
      rs.map(x => { const I = F.ITEMS[x.it]; return '<div class="it"><span class="bx"></span><b>' + x.packs + '×</b><span>' + esc(I.de) + '<br><small>' + esc(I.pk[0]) + (I.store ? ' · ' + I.store : '') + '</small></span><span class="pr">' + (I.est ? 'ca. ' : '') + A.eur(x.cost) + '</span></div>'; }).join('') + '</div>'; }).join('') +
    '<div class="box"><h3>' + t.basics + '</h3><p class="sub" style="margin-top:1mm">' + Object.keys(F.ITEMS).filter(k => F.ITEMS[k].basic).map(k => esc(F.ITEMS[k].de)).join(' · ') + '</p></div>' +
    '<div class="box ok"><h3>' + t.after + '</h3><ul>' + t.afterL.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>' +
    '<p class="foot">' + esc(t.prices) + '</p><p class="foot">' + esc(t.med) + '</p></section>';
  /* day pages */
  order.forEach(i => {
    const day = F.WEEK[i], s0 = A.startTime(day);
    const items = day.slots.map(s => ({ time: s[0], kind: s[1] === 'shop' ? 'shop' : s[1] === 'rest' ? 'rest' : 'meal', id: s[1] === 'rest' ? s[2] : s[1] }))
      .concat(day.tasks.map(k => ({ time: k[0], kind: 'thaw', id: k[2] }))).sort((a, c) => a.time < c.time ? -1 : 1);
    h += '<section class="pg"><div class="kick">' + t.daysL[i] + '</div><h2>' + esc(t.themes[day.theme]) + '</h2><p class="sub">' + esc(s0 ? t.cookAt(s0) : t.noCook) + '</p><div class="tl">' +
      items.map(x => {
        if (x.kind === 'thaw') return '<div class="t">' + x.time + '</div><div class="c"><span class="tag cold">Auftauen</span><b>' + esc(t.thaw[x.id][0]) + ' (' + esc(t.thaw[x.id][1]) + ')</b><small>' + esc(t.thawSub) + '</small></div>';
        if (x.kind === 'shop') return '<div class="t">' + x.time + '</div><div class="c"><b>Einkaufen</b><small>Liste auf Seite 2</small></div>';
        const tx = REC[x.id].de, rest = x.kind === 'rest';
        return '<div class="t">' + x.time + '</div><div class="c">' + (rest ? '<span class="tag">' + t.rest + '</span>' : '') + '<b>' + esc(tx.name) + '</b><small>' + esc(rest ? 'Aufwärmen: ' + tx.reheat : tx.portion) + '</small></div>';
      }).join('') + '</div>';
    items.filter(x => x.kind === 'meal').forEach(x => {
      const id = x.id, rc = F.RECIPES[id], tx = REC[id].de, tm = F.times(id), pp = F.perPortion(id);
      h += '<div class="rc"><div class="rh">' + ICONS[rc.icon] + '<div><div class="kick" style="margin:0">' + x.time + ' · ' + t.slotN[rc.slot] + '</div><h3>' + esc(tx.name) + '</h3><span class="swap">' + esc(tx.statt) + '</span></div></div>' +
        '<div class="meta"><span>' + rc.min + ' Min</span><span>' + A.eur(pp.eur) + ' pro Portion</span><span>Dazu: ' + esc(tx.drink) + '</span></div>' +
        '<div class="eat"><b>Pro Person:</b> ' + esc(tx.portion) + (rc.leftover ? '<br><b>Doppelt kochen:</b> die Hälfte ist morgen dein Mittagessen.' : '') + '</div>' +
        '<ol class="st">' + tx.steps.map(s => '<li>' + A.stepHtml(s, id, P, tm) + '</li>').join('') + '</ol>' +
        '<div class="nut">Pro Portion: ' + Math.round(pp.kcal) + ' kcal · ' + Math.round(pp.protein) + ' g Eiweiß · ' + Math.round(pp.carbs) + ' g Kohlenhydrate · ' + Math.round(pp.fat) + ' g Fett</div></div>';
    });
    h += '<p class="foot">' + esc(t.hungry) + '</p></section>';
  });
  h += '';
  document.getElementById('out').innerHTML = h;
  document.title = 'Fakeaway-Woche';
})();
</script>`;
const html = '<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Fakeaway-Woche</title><style>' + css + '</style></head><body>' + body + '</body></html>';
fs.writeFileSync(path.join(d, 'print.html'), html);
(async () => {
  const br = await chromium.launch(); const ctx = await br.newContext({ locale: 'de-DE' }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.join(d, 'print.html')); await p.waitForTimeout(400);
  await p.pdf({ path: path.join(d, 'Fakeaway-Woche.pdf'), width: '100mm', height: '178mm', printBackground: true, preferCSSPageSize: true });
  console.log(errs.join('\n') || 'pdf ok'); await br.close();
})();
