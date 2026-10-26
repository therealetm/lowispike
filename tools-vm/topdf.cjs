// Render MAYA-HANDOFF.md to a clean A4 PDF with marked + Playwright Chromium.
const fs = require('fs');
const { marked } = require('/tmp/pw/node_modules/marked');
const { chromium } = require('/tmp/pw/node_modules/playwright');
const src = process.argv[2], out = process.argv[3];
const body = marked.parse(fs.readFileSync(src, 'utf8'));
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@page { size: A4; margin: 18mm 16mm 18mm 16mm; }
body { font-family: "Liberation Sans", Arial, "Noto Color Emoji", sans-serif; font-size: 10pt; line-height: 1.45; color: #1d1d1f; }
h1 { font-size: 20pt; margin: 0 0 8pt; color: #0b3d5c; }
h2 { font-size: 14pt; margin: 18pt 0 6pt; color: #0b3d5c; border-bottom: 1px solid #cfd8dc; padding-bottom: 3pt; page-break-after: avoid; }
h3 { font-size: 11.5pt; margin: 12pt 0 4pt; color: #234; page-break-after: avoid; }
p, li { orphans: 3; widows: 3; }
ul, ol { padding-left: 16pt; margin: 4pt 0 6pt; }
li { margin: 2pt 0; }
code { font-family: "Liberation Mono", monospace; font-size: 8.6pt; background: #f2f4f5; padding: 0 2pt; border-radius: 2pt; word-break: break-word; }
pre { background: #f2f4f5; padding: 6pt 8pt; border-radius: 4pt; white-space: pre-wrap; page-break-inside: avoid; }
pre code { background: none; padding: 0; }
hr { border: 0; border-top: 1px solid #e0e0e0; margin: 14pt 0; }
a { color: #0b5c8c; text-decoration: none; }
</style></head><body>${body}</body></html>`;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.setContent(html, { waitUntil: 'load' });
  await p.pdf({ path: out, format: 'A4', printBackground: true, displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: '<div style="font-size:7pt;color:#888;width:100%;text-align:center">LOWiSPIKE handoff for the next Maya, 19 Oct 2026 — page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
    margin: { top: '16mm', bottom: '18mm', left: '16mm', right: '16mm' } });
  await b.close();
})();
