const fs = require('fs'), path = require('path'), d = __dirname;
const r = f => fs.readFileSync(path.join(d, f), 'utf8');
const body = `
<main class="wrap" id="app"></main>
<div class="cta" id="cta"></div>
<div class="veil" id="veil"></div>
<section class="sheet" id="sheet-r" aria-hidden="true" role="dialog" aria-modal="true"><div class="in"></div></section>
<section class="sheet" id="sheet-l" aria-hidden="true" role="dialog" aria-modal="true"><div class="in"></div></section>
<section class="sheet" id="sheet-j" aria-hidden="true" role="dialog" aria-modal="true"><div class="in"></div></section>
<div class="toast" id="toast" role="status"></div>
<noscript>JavaScript is needed.</noscript>
<script>
document.getElementById('sheet-r').inert = true; document.getElementById('sheet-l').inert = true; document.getElementById('sheet-j').inert = true;
${r('data.js')}
${r('p2_icons.js')}
${r('p3_text.js')}
${r('p4_app.js')}
</script>
`;
/* (the artifact copy fakeaway.html is not built in LOWiSPIKE) */
/* (no artifact copy here) */

/* standalone page for hosting inside the app (no artifact skeleton around it) */
const head = r('p1_head.html').replace('<meta name="claude:viewport-fit-sides" content="cover">\n', '');
const standalone = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#050b1e">
<meta name="description" content="Eine Woche Burger, Pizza, Döner & Co. ohne Zucker und Mehl. Mit Uhrzeiten, Mengen, Einkaufsliste und Preis.">
<meta property="og:title" content="Fakeaway-Woche">
<meta property="og:description" content="Eine Woche Burger, Pizza, Döner & Co. ohne Zucker und Mehl. Mit Einkaufsliste und Preis.">
<meta property="og:type" content="website">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}[hidden]{display:none!important}img{max-width:100%}</style>
${head}
</head>
<body>${body}</body>
</html>
`;
/* Nov 8 2026: in LOWiSPIKE the page is served from the repo's fakeaway/ (https://therealetm.github.io/lowispike/fakeaway/) */
fs.writeFileSync(path.join(d, '..', '..', '..', 'fakeaway', 'index.html'), standalone);
console.log('built index.html', standalone.length, 'bytes');

/* Nov 8 2026: the same data, texts, icons and helpers for the app's Weekly Challenge panel (challenge-week.js). No page, no
   listeners (FAW_HEADLESS); window.FAW (data.js) and window.FAW_TX (texts, icons) are all it adds. */
const core = `/* built by tools/fakeaway/src/build.cjs: do not edit by hand */
(function () {
'use strict';
window.FAW_HEADLESS = true;
var module; /* data.js always sets self.FAW here */
${r('data.js')}
var FAW = self.FAW;
${r('p2_icons.js')}
${r('p3_text.js')}
${r('p4_app.js')}
window.FAW_TX = { UI, REC, LEFT_TIP, ICONS };
})();
`;
fs.writeFileSync(path.join(d, '..', '..', '..', 'faw-core.js'), core);
console.log('built faw-core.js', core.length, 'bytes');
