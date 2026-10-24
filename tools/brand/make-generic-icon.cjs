'use strict';
/* Oct 24 (Eman, call Oct 23): "my own companion picture is the icon for everybody, that makes no sense". The Home Screen icon is
   now a generic LOWiSPIKE mark, the same for every user and never a companion: six glowing planets on a hexagon, joined by fine
   light threads, inside one living glass bubble on the deep-blue galaxy. No eyes, no face, no Misty.
   node tools/brand/make-generic-icon.cjs [out.png]  -> 1024 px PNG (default /tmp/lowi-icon-1024.png);
   python3 tools/brand/make-generic-icon.py resizes it into icon-180/192/512.png and the two inline data URIs in index.html.
   Needs playwright (PW=/tmp/pw/node_modules/playwright by default). */
const out = process.argv[2] || '/tmp/lowi-icon-1024.png';
const { chromium } = require(process.env.PW || '/tmp/pw/node_modules/playwright');
const C = 512, R = 214;
const COLS = ['#8fe7ff', '#a8ffd8', '#ffb36b', '#ffe08a', '#c4b5ff', '#6fb8ff'];
const pts = COLS.map((c, i) => { const a = (-90 + 60 * i) * Math.PI / 180; return [C + R * Math.cos(a), C + R * Math.sin(a), c]; });
let stars = '';
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
for (let i = 0; i < 70; i++) { const x = rnd() * 1024, y = rnd() * 1024, d = Math.hypot(x - C, y - C); if (d < 430) continue; stars += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.8 + rnd() * 1.8).toFixed(2)}" fill="#cfe8ff" opacity="${(0.25 + rnd() * 0.5).toFixed(2)}"/>`; }
const hex = pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
const spokes = pts.map(p => `<line x1="${C}" y1="${C}" x2="${p[0].toFixed(1)}" y2="${p[1].toFixed(1)}"/>`).join('');
const planets = pts.map((p, i) => `<radialGradient id="pg${i}" cx="36%" cy="30%" r="75%"><stop offset="0" stop-color="#ffffff"/><stop offset=".28" stop-color="${p[2]}"/><stop offset="1" stop-color="${p[2]}" stop-opacity=".55"/></radialGradient>`).join('');
const orbs = pts.map((p, i) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="92" fill="url(#halo${i})"/><circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="50" fill="url(#pg${i})"/><circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="50" fill="none" stroke="#ffffff" stroke-opacity=".45" stroke-width="2.5"/>`).join('');
const halos = pts.map((p, i) => `<radialGradient id="halo${i}"><stop offset=".45" stop-color="${p[2]}" stop-opacity=".45"/><stop offset="1" stop-color="${p[2]}" stop-opacity="0"/></radialGradient>`).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><defs>
<radialGradient id="bg" cx="50%" cy="44%" r="75%"><stop offset="0" stop-color="#163a7a"/><stop offset=".38" stop-color="#0a1f48"/><stop offset=".7" stop-color="#050d22"/><stop offset="1" stop-color="#03050a"/></radialGradient>
<radialGradient id="glass" cx="36%" cy="30%" r="78%"><stop offset="0" stop-color="#ffffff" stop-opacity=".20"/><stop offset=".38" stop-color="#96d2ff" stop-opacity=".07"/><stop offset=".72" stop-color="#285ab4" stop-opacity=".10"/><stop offset="1" stop-color="#8cc8ff" stop-opacity=".22"/></radialGradient>
<radialGradient id="core"><stop offset="0" stop-color="#e9fbff" stop-opacity=".95"/><stop offset=".35" stop-color="#8fe7ff" stop-opacity=".55"/><stop offset="1" stop-color="#8fe7ff" stop-opacity="0"/></radialGradient>
<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="22"/></filter>
${planets}${halos}</defs>
<rect width="1024" height="1024" fill="url(#bg)"/>${stars}
<circle cx="${C}" cy="${C}" r="404" fill="none" stroke="#5aaaff" stroke-opacity=".35" stroke-width="40" filter="url(#soft)"/>
<circle cx="${C}" cy="${C}" r="400" fill="url(#glass)"/>
<circle cx="${C}" cy="${C}" r="398" fill="none" stroke="#8fe7ff" stroke-opacity=".55" stroke-width="6"/>
<path d="M ${C - 250} ${C - 250} A 352 352 0 0 1 ${C + 60} ${C - 350}" fill="none" stroke="#ffffff" stroke-opacity=".35" stroke-width="14" stroke-linecap="round"/>
<g stroke="#bfefff" stroke-opacity=".55" stroke-width="4" fill="none"><polygon points="${hex}"/></g>
<g stroke="#bfefff" stroke-opacity=".22" stroke-width="3">${spokes}</g>
<circle cx="${C}" cy="${C}" r="90" fill="url(#core)"/>
${orbs}
</svg>`;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1024, height: 1024 } });
  await p.setContent('<html><body style="margin:0;background:#03050a">' + svg + '</body></html>');
  await p.screenshot({ path: out, clip: { x: 0, y: 0, width: 1024, height: 1024 } });
  await b.close();
  console.log('wrote ' + out);
})().catch(e => { console.error(e); process.exit(1); });
