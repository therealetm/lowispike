'use strict';
/* Oct 19 evolution escalation: draws the user's own companion at all ten forms side by side (the same drawing Home, Forms and the
   care room use) and, with --evo N, opens the evolution moment for form N.
   node playtest/probe-evo-stages.cjs [--url URL] [--view iphone13|ipad|chromium390] [--evo 1..9] [--out FILE]
   Prints, per form: the viewBox, the trait groups drawn, stone count, and whether any trait leaves the frame. Exit 1 on page errors
   or a trait outside the frame. */
const path = require('path');
const L = require(process.env.BH_LIB || '/home/sprite/BUGHUNT/playtest/lib.cjs');
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const VIEW = arg('--view') || 'iphone13', EVO = +(arg('--evo') || 0), OUT = arg('--out') || path.join(__dirname, 'evo-' + VIEW + (EVO ? '-evo' + EVO : '') + '.png');
(async () => {
  let url = arg('--url'), server = null;
  if (!url) { server = await L.serve(path.resolve(__dirname, '..')); url = 'http://127.0.0.1:' + server.address().port + '/'; }
  const bday = arg('--bday') || '1997-10-27', btime = arg('--btime') || '07:45';
  const pre = `try{localStorage.setItem('lowispike.v2',JSON.stringify({v:2,setupDone:true,onboarded:true,user:{name:'Fixture',bday:'${bday}'},xp:40,ledger:[],logs:[],settings:{lang:'en'}}));localStorage.setItem('lowispike.companion.v1',JSON.stringify({v:1,bday:'${bday}',btime:'${btime}',n:0,name:'Selketlix',created:1}));}catch(e){}`;
  const h = await L.open({ url, view: VIEW, preInit: pre, settle: 8000 });
  const { page } = h;
  const r = await page.evaluate(async (EVO) => {
    const T = window.LowiHerbTamagotchi, x = T.current(), out = [];
    const d = document.createElement('div'); d.id = 'evoGrid';
    d.style.cssText = 'position:fixed;inset:0;z-index:2147483600;background:#071433;display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:30px 6px;align-content:start';
    for (let i = 0; i < 10; i++) {
      const m = Object.assign({}, x.m, { index: i, stage: Object.assign({}, x.m.stage) });
      const c = document.createElement('div'); c.style.cssText = 'height:' + Math.round(innerHeight / 4.4) + 'px;display:flex;align-items:center;justify-content:center;border:1px solid #234';
      c.innerHTML = T.plantHTML(m, 'hero', x.p);
      const svg = c.querySelector('svg'); if (svg) { svg.style.width = '100%'; svg.style.height = '100%'; }
      d.appendChild(c);
    }
    document.body.appendChild(d);
    await new Promise(r => setTimeout(r, 300));
    [...d.children].forEach((c, i) => {
      const svg = c.querySelector('svg'); if (!svg) { out.push({ i, svg: false }); return; }
      const sb = svg.getBoundingClientRect(); let outside = [];
      svg.querySelectorAll('.cf-ear,.cf-wing,.cf-wing2,.cf-tail,.cf-horn,.cf-stone,.cf-crest,.cf-crown,.cf-wing3,.cf-horn2,.cf-mane,.cf-diadem,.cf-flare,.cf-orbit').forEach(e => { const b = e.getBoundingClientRect(); const o = Math.max(sb.left - b.left, b.right - sb.right, sb.top - b.top, b.bottom - sb.bottom); if (o > 2) outside.push(e.getAttribute('class') + ' by ' + Math.round(o / sb.width * 100) + '%'); });
      out.push({ i, st: svg.getAttribute('data-cf-st'), vb: svg.getAttribute('viewBox'), traits: [...new Set([...svg.querySelectorAll('[class^="cf-"]')].map(e => e.getAttribute('class').split(' ')[0]))].join(','), stones: svg.querySelectorAll('.cf-stone').length, outside: [...new Set(outside)] });
    });
    let nm = ''; try { nm = T.name(x.p); } catch (e) { nm = 'ERR ' + e.message; } return { name: nm, out };
  }, EVO);
  await page.screenshot({ path: OUT });
  let evo = null;
  if (EVO) {
    evo = await page.evaluate(async (EVO) => {
      document.getElementById('evoGrid').remove();
      const T = window.LowiHerbTamagotchi, x = T.current();
      const m = Object.assign({}, x.m, { index: EVO });
      const dlg = document.createElement('div'); dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-modal', 'true'); dlg.style.cssText = 'position:fixed;left:0;top:0;width:200px;height:200px;background:#333;z-index:10';
      document.body.appendChild(dlg);
      T.evolve(m, EVO - 1);
      await new Promise(r => setTimeout(r, 600));
      const waited = !document.getElementById('lhEvolution');
      dlg.remove();
      await new Promise(r => setTimeout(r, 1500));
      const e = document.getElementById('lhEvolution');
      if (!e) return { waitedForDialog: waited, open: false };
      const b = e.querySelector('.lh-evolution-content').getBoundingClientRect();
      return { waitedForDialog: waited, open: true, cls: e.className, before: !!e.querySelector('.lh-evo-before svg'), after: !!e.querySelector('.lh-evo-after svg'), rays: e.querySelectorAll('.lh-evo-ray').length, card: [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)], vw: innerWidth, vh: innerHeight, title: (e.querySelector('h2') || {}).textContent };
    }, EVO);
    await page.screenshot({ path: OUT.replace(/\.png$/, '-a.png') });
    await L.sleep(2600);
    await page.screenshot({ path: OUT.replace(/\.png$/, '-b.png') });
  }
  const s = await L.snap(h);
  const bad = r.out.some(o => o.outside && o.outside.length) || s.err.length || (h.log.pageerror || []).length;
  console.log(JSON.stringify({ view: VIEW, r, evo, err: s.err, pageerror: h.log.pageerror }, null, 1));
  await h.browser.close(); if (server) server.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
