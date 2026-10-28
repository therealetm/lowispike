#!/usr/bin/env node
/* Oct 28 (launch scene, "only the animation"): renders the iOS startup images (startup/launch-WxH.png) from the launch scene in
   index.html (#lwBootCss + the #lwLaunch markup), frozen at its very first frame, at each device's own size. So the Home Screen
   startup picture IS the scene's first frame: when iOS hands over to the page there is nothing to see change, and the scene
   simply starts moving. Re-run after changing #lwBootCss, #lwLaunch or #firstPaint:  node scripts/make-launch-images.cjs
   (Before Oct 28 this rendered the html::before/::after launch glow.) */
const fs = require('fs'), path = require('path');
let chromium; try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/tmp/pw/node_modules/playwright')); }
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const css = (/<style id="lwBootCss">([\s\S]*?)<\/style>/.exec(html) || [])[1];
const first = (/<style id="firstPaint">([\s\S]*?)<\/style>/.exec(html) || [])[1];
const scene = (/<div id="lwLaunch"[\s\S]*?<\/div>(?=<script>)/.exec(html) || [])[0];
if (!css || !first || !scene) { console.error('lwBootCss / firstPaint / #lwLaunch not found'); process.exit(1); }
const links = [...html.matchAll(/<link rel="apple-touch-startup-image" media="([^"]+)" href="(startup\/launch-(\d+)x(\d+)\.png)">/g)];
/* frame 0: every animation held at its start (all of them start from their "from" state, with fill both) */
const HOLD = '\nhtml.lw-boot body #lwLaunch,html.lw-boot body #lwLaunch *{animation-play-state:paused!important;transition:none!important}';
module.exports.page = (extra) => '<!doctype html><html class="lw-boot"><head><meta name="color-scheme" content="dark"><style>' + first + '</style><style>' + css + HOLD + (extra || '') + '</style></head><body>' + scene + '</body></html>';
if (require.main === module) (async () => {
  const br = await chromium.launch();
  for (const [, media, href, W, H] of links) {
    const dpr = +(/pixel-ratio:\s*(\d+)/.exec(media) || [0, 2])[1];
    const w = Math.round(W / dpr), h = Math.round(H / dpr);
    const page = await br.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, colorScheme: 'dark' });
    await page.setContent(module.exports.page());
    await page.waitForTimeout(80);
    await page.screenshot({ path: path.join(ROOT, href) });
    await page.close();
    console.log(href, w + 'x' + h + '@' + dpr);
  }
  await br.close();
})().catch(e => { console.error(e); process.exit(1); });
