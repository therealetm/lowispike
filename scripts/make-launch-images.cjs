#!/usr/bin/env node
/* Oct 28 (fast launch): renders the iOS startup images (startup/launch-WxH.png) from the launch glow in index.html (#lwBootCss),
   frozen at its first frame, on the first-paint background. So the Home Screen splash, the first paint and the launch glow are one
   still picture: no white, no jump. Re-run after changing #lwBootCss or #firstPaint:  node scripts/make-launch-images.cjs */
const fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/tmp/pw/node_modules/playwright')); }
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const css = (/<style id="lwBootCss">([\s\S]*?)<\/style>/.exec(html) || [])[1];
const first = (/<style id="firstPaint">([\s\S]*?)<\/style>/.exec(html) || [])[1];
if (!css || !first) { console.error('lwBootCss / firstPaint not found'); process.exit(1); }
const links = [...html.matchAll(/<link rel="apple-touch-startup-image" media="([^"]+)" href="(startup\/launch-(\d+)x(\d+)\.png)">/g)];
(async () => {
  const br = await chromium.launch();
  for (const [, media, href, W, H] of links) {
    const dpr = +(/pixel-ratio:\s*(\d+)/.exec(media) || [0, 2])[1];
    const w = Math.round(W / dpr), h = Math.round(H / dpr);
    const page = await br.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
    await page.setContent('<!doctype html><html class="lw-boot"><head><style>' + first + '</style><style>' + css +
      '\nhtml.lw-boot::before,html.lw-boot::after{animation-play-state:paused!important;animation-delay:0s!important}</style></head><body></body></html>');
    await page.waitForTimeout(60);
    await page.screenshot({ path: path.join(ROOT, href) });
    await page.close();
    console.log(href, w + 'x' + h + '@' + dpr);
  }
  await br.close();
})().catch(e => { console.error(e); process.exit(1); });
