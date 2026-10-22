#!/usr/bin/env node
/* Affiliates: the scripts read aloud (22 Oct 2026), checked in simulated phones (WebKit iPhone + Chromium Android).
   Audio output is stubbed (headless browsers have no speakers): play() of a recorded clip "ends" after 250 ms and is logged,
   so the check sees which recorded clips were asked for, in which order, and that the device's robot voice was never used.
   Usage: node tools/blueprint/voice-check.cjs [outdir]   (needs Playwright in /tmp/pw like the other tools/blueprint checks) */
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const pw = require(process.env.PW || '/tmp/pw/node_modules/playwright');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = process.argv[2] || '/tmp/aff-voice-check'; fs.mkdirSync(OUT, { recursive: true });
const B = require(path.join(ROOT, 'affiliates', 'blueprint-core.js'));
const AV = require(path.join(ROOT, 'affiliates', 'script-voice.js'));
const V = require(path.join(ROOT, 'app-voice.js'));
const ACCESS = require(path.join(ROOT, 'affiliates', 'access-list.js'));
const MEMBER = (ACCESS.codes.find(c => c.tracks.includes('webdesign') && c.tracks.includes('ugc')) || {}).h;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.mp3': 'audio/mpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const PARENT = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="lowi-build" content="TESTBUILD"></head>' +
  '<body style="margin:0"><iframe id="f" src="affiliates/" style="border:0;width:100vw;height:100vh"></iframe><script>window.got=[];addEventListener("lowi:media",e=>got.push(e.detail));</script></body></html>';
const served = [];
const srv = http.createServer((q, res) => {
  let u = decodeURIComponent(q.url.split('?')[0]); served.push(q.url);
  if (u === '/lowispike/__parent.html') { res.writeHead(200, { 'Content-Type': TYPES['.html'] }); return res.end(PARENT); }
  if (!u.startsWith('/lowispike/')) { res.writeHead(404); return res.end(); }
  u = u.slice('/lowispike/'.length); if (!u || u.endsWith('/')) u += 'index.html';
  const f = path.join(ROOT, u); if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, b) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); res.end(b); });
});
const fails = [], notes = [];
const fail = (w, m) => { fails.push(w + ': ' + m); console.log('FAIL ' + w + ': ' + m); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
/* the stub: clips "play" for 250 ms; the robot voice is counted */
function stub() {
  window.__played = []; window.__robot = 0;
  const P = HTMLMediaElement.prototype;
  P.play = function () { const s = String(this.src || ''); if (/^blob:/.test(s)) { window.__played.push(Date.now()); const el = this; setTimeout(() => { el.onended && el.onended(); }, 250); } return Promise.resolve(); };
  P.pause = function () { };
  try { if (window.speechSynthesis) window.speechSynthesis.speak = function (u) { window.__robot++; setTimeout(() => u.onend && u.onend(), 50); }; } catch (e) { }
}
async function st(fr) { return fr.evaluate(() => window.LowiAffVoice.state()); }
async function until(fr, fn, ms, what, W) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const s = await st(fr); if (fn(s)) return s; await sleep(80); } const s = await st(fr); fail(W, 'timed out waiting for ' + what + ' (state ' + JSON.stringify(s) + ')'); return s; }

async function standalone(base, sz) {
  const W = 'voice@' + sz.name;
  const browser = await pw[sz.engine].launch();
  const ctx = await browser.newContext(Object.assign({}, pw.devices[sz.device]));
  await ctx.addInitScript(l => { try { localStorage.setItem('lowispike.lang', l); } catch (e) { } }, sz.lang);
  await ctx.addInitScript(h => { try { localStorage.setItem('lowi.aff.unlock.v1', JSON.stringify([h])); } catch (e) { } }, MEMBER);
  await ctx.addInitScript(stub);
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  const clips = []; page.on('request', r => { const m = r.url().match(/\/app-voice\/(\w+)\/([a-z0-9]+)\.mp3/); if (m) clips.push(m[1] + '/' + m[2]); });
  try {
    await page.goto(base + 'affiliates/#webdesign', { waitUntil: 'load' });
    await page.waitForSelector('#scriptView:not([hidden]) #listenAll');
    const s = B.series(sz.lang).webdesign, p = AV.plan(B, s, { open: true, pick: 'webdesign', lang: sz.lang, day: 1 });
    if ((await page.textContent('#listenAll .vlabel')) !== AV.t(sz.lang, 'listen')) fail(W, 'idle label');
    if ((await page.locator('#scriptView .row.scene .say-btn').count()) !== s.scenes.length) fail(W, 'one play button per scene');
    if (await page.isVisible('#listenAgain')) fail(W, 'start over shows before anything played');
    /* no sound before a tap: nothing fetched or played on load */
    await sleep(400);
    if (clips.length || (await page.evaluate(() => window.__played.length))) fail(W, 'sound or clips before a tap');
    await page.screenshot({ path: path.join(OUT, sz.name + '-1-idle.png'), fullPage: false });
    /* play the whole script */
    await page.click('#listenAll');
    let x = await until(page, v => v.status === 'playing' && v.key === 's0-0', 3000, 'first line', W);
    if ((await page.textContent('#listenAll .vlabel')) !== AV.t(sz.lang, 'pause')) fail(W, 'playing label');
    if ((await page.getAttribute('#listenAll', 'aria-pressed')) !== 'true') fail(W, 'aria-pressed while playing');
    if (!(await page.locator('[data-say="s0-0"].saying').count())) fail(W, 'line being read is not lit');
    if ((await page.textContent('#listenWhere')) !== AV.t(sz.lang, 'sceneOf', { n: 1, total: s.scenes.length })) fail(W, 'scene counter');
    if (!(await page.isVisible('#listenAgain'))) fail(W, 'start over hidden while playing');
    await page.screenshot({ path: path.join(OUT, sz.name + '-2-playing.png'), fullPage: false });
    x = await until(page, v => v.key === 's1-0', 8000, 'scene 2', W);
    /* the clips asked for are exactly the recorded ones for the lines read so far, in order */
    const want = [].concat(...p.all.slice(0, 2).map(i => V.pieces(i.text).map(pc => sz.lang + '/' + V.idOf(sz.lang, pc))));
    for (const id of want) if (!clips.includes(id)) fail(W, 'clip not requested ' + id);
    if (clips.some(c => !c.startsWith(sz.lang + '/'))) fail(W, 'clip from another language ' + clips.join(','));
    /* pause, continue from the same line */
    await page.click('#listenAll');
    x = await until(page, v => v.status === 'paused', 2000, 'paused', W);
    const at = x.key;
    if ((await page.textContent('#listenAll .vlabel')) !== AV.t(sz.lang, 'resume')) fail(W, 'paused label');
    if (await page.locator('.saying').count()) fail(W, 'a line stays lit while paused');
    const n0 = await page.evaluate(() => window.__played.length); await sleep(700);
    if ((await page.evaluate(() => window.__played.length)) !== n0) fail(W, 'still playing after pause');
    await page.click('#listenAll');
    x = await until(page, v => v.status === 'playing', 2000, 'continue', W);
    if (x.key !== at) fail(W, 'continue did not resume at ' + at + ' but ' + x.key);
    /* start over */
    await page.click('#listenAgain');
    x = await until(page, v => v.status === 'playing' && v.key === 's0-0', 2000, 'start over', W);
    /* one scene alone */
    const sb = page.locator('#scriptView .row.scene .say-btn').nth(2);
    await sb.scrollIntoViewIfNeeded(); await sb.click();
    x = await until(page, v => v.status === 'playing' && v.key === 's2-0', 3000, 'scene 3 alone', W);
    if ((await sb.getAttribute('aria-pressed')) !== 'true' || (await sb.getAttribute('aria-label')) !== AV.t(sz.lang, 'pauseScene', { n: 3 })) fail(W, 'scene button state');
    if ((await page.textContent('#listenAll .vlabel')) !== AV.t(sz.lang, 'listen')) fail(W, 'big button not back to idle while a scene plays');
    x = await until(page, v => v.status === 'done', 12000, 'scene 3 done', W);
    if ((await sb.getAttribute('aria-pressed')) !== 'false') fail(W, 'scene button after done');
    /* the whole script runs to the end, then offers Listen again */
    await page.evaluate(() => window.scrollTo(0, 0)); await page.click('#listenAll');
    x = await until(page, v => v.status === 'done', 40000, 'whole script done', W);
    if ((await page.textContent('#listenAll .vlabel')) !== AV.t(sz.lang, 'again')) fail(W, 'done label');
    const total = [].concat(...p.all.map(i => V.pieces(i.text))).length;
    notes.push(W + ': whole Webdesign script = ' + p.all.length + ' lines / ' + total + ' clips');
    /* switching track stops it */
    await page.click('#listenAll'); await until(page, v => v.status === 'playing', 2000, 'playing again', W);
    await page.click('#sw-lowispike');
    x = await st(page); if (x.status !== 'idle') fail(W, 'track switch did not stop: ' + JSON.stringify(x));
    /* LOWiSPIKE: the day line plays on its own */
    await page.waitForSelector('#dayLine');
    const db = page.locator('.day-head .say-btn');
    if (!(await db.count())) fail(W, 'day line has no play button');
    else {
      await db.scrollIntoViewIfNeeded(); await db.click();
      x = await until(page, v => v.status === 'playing' && v.key === 'day', 3000, 'day line', W);
      await page.screenshot({ path: path.join(OUT, sz.name + '-3-day.png'), fullPage: false });
      await page.click('#dayNext');
      x = await st(page); if (x.status !== 'idle') fail(W, 'day change did not stop');
    }
    /* leaving the screen stops it */
    await page.evaluate(() => window.scrollTo(0, 0)); await page.click('#listenAll'); await until(page, v => v.status === 'playing', 2000, 'playing', W);
    await page.click('#toShots'); x = await st(page); if (x.status !== 'idle') fail(W, 'leaving the script did not stop');
    if (await page.evaluate(() => window.__robot)) fail(W, 'robot voice used ' + (await page.evaluate(() => window.__robot)) + ' times');
    const fo = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: innerWidth })); if (fo.sw > fo.w + 1) fail(W, 'sideways overflow ' + JSON.stringify(fo));
  } catch (e) { fail(W, 'threw ' + String(e.message).split('\n')[0]); await page.screenshot({ path: path.join(OUT, sz.name + '-error.png') }); }
  if (errs.length) fail(W, 'page errors ' + errs.slice(0, 3).join(' | '));
  await browser.close();
}

/* a visitor without a code hears the free preview only: scene 1 */
async function locked(base) {
  const W = 'voice-locked@iphone';
  const browser = await pw.webkit.launch(); const ctx = await browser.newContext(Object.assign({}, pw.devices['iPhone 13']));
  await ctx.addInitScript(() => { try { localStorage.setItem('lowispike.lang', 'de'); } catch (e) { } }); await ctx.addInitScript(stub);
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  try {
    await page.goto(base + 'affiliates/#ugc', { waitUntil: 'load' }); await page.waitForSelector('#scriptView:not([hidden]) #listenAll');
    if ((await page.textContent('#listenAll .vlabel')) !== AV.t('de', 'listenPreview')) fail(W, 'preview label');
    if ((await page.locator('#scriptView .say-btn').count()) !== 1) fail(W, 'only scene 1 has a play button');
    await page.click('#listenAll');
    const n = B.series('de').ugc.scenes[0].lines.length;
    let x = await until(page, v => v.status === 'done', 15000, 'preview done', W);
    const keys = await page.evaluate(() => [...document.querySelectorAll('[data-say]')].map(e => e.getAttribute('data-say')));
    if (keys.some(k => !/^s0-/.test(k)) || keys.length !== n) fail(W, 'locked lines are readable ' + keys.join(','));
    await page.screenshot({ path: path.join(OUT, 'locked-de.png'), fullPage: false });
  } catch (e) { fail(W, 'threw ' + String(e.message).split('\n')[0]); }
  if (errs.length) fail(W, 'page errors ' + errs.slice(0, 3).join(' | '));
  await browser.close();
}

/* inside the app (Community tab frame): the app build's clip list, the app's sound pauses, another voice pauses this one, a hidden
   tab pauses it */
async function embedded(base) {
  const W = 'voice-embedded@iphone';
  const browser = await pw.webkit.launch(); const ctx = await browser.newContext(Object.assign({}, pw.devices['iPhone 13']));
  await ctx.addInitScript(() => { try { localStorage.setItem('lowispike.lang', 'en'); } catch (e) { } }); await ctx.addInitScript(stub);
  await ctx.addInitScript(h => { try { localStorage.setItem('lowi.aff.unlock.v1', JSON.stringify([h])); } catch (e) { } }, MEMBER);
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
  try {
    served.length = 0;
    await page.goto(base + '__parent.html', { waitUntil: 'load' });
    const fr = page.frameLocator('#f'); await fr.locator('#startBtn').waitFor({ timeout: 10000 });
    const ff = page.frames().find(f => /\/affiliates\//.test(f.url()));
    await fr.locator('#startBtn').click(); await fr.locator('#listenAll').waitFor();
    await fr.locator('#listenAll').click();
    await until(ff, v => v.status === 'playing', 3000, 'playing in frame', W);
    await sleep(600);
    if (!served.some(u => /app-voice-data\.js\?v=TESTBUILD/.test(u))) fail(W, 'clip list not the app build: ' + served.filter(u => /app-voice-data/.test(u)).join(','));
    let got = await page.evaluate(() => window.got);
    if (!got.some(d => d.id === 'aff-voice' && d.on)) fail(W, 'app not told to pause its sound ' + JSON.stringify(got));
    await page.evaluate(() => dispatchEvent(new CustomEvent('lowi:media', { detail: { on: true, id: 'tutorial-voice' } })));
    await until(ff, v => v.status === 'paused', 1500, 'paused by another voice', W);
    got = await page.evaluate(() => window.got);
    if (!got.some(d => d.id === 'aff-voice' && d.on === false)) fail(W, 'app not told the voice stopped');
    await fr.locator('#listenAll').click(); await until(ff, v => v.status === 'playing', 2000, 'continue in frame', W);
    await page.evaluate(() => { document.getElementById('f').style.display = 'none'; });
    await until(ff, v => v.status === 'paused', 2500, 'paused when the tab hides the frame', W);
  } catch (e) { fail(W, 'threw ' + String(e.message).split('\n')[0]); }
  if (errs.length) fail(W, 'page errors ' + errs.slice(0, 3).join(' | '));
  await browser.close();
}

srv.listen(0, '127.0.0.1', async () => {
  const base = 'http://127.0.0.1:' + srv.address().port + '/lowispike/';
  for (const sz of [{ name: 'iphone-se-de', engine: 'webkit', device: 'iPhone SE', lang: 'de' }, { name: 'iphone-13-en', engine: 'webkit', device: 'iPhone 13', lang: 'en' }, { name: 'pixel-7-es', engine: 'chromium', device: 'Pixel 7', lang: 'es' }]) { await standalone(base, sz); console.log('done', sz.name); }
  await locked(base); console.log('done locked');
  await embedded(base); console.log('done embedded');
  notes.forEach(n => console.log('note ' + n));
  console.log(fails.length ? 'VOICE CHECK FAILED (' + fails.length + ')' : 'VOICE CHECK PASSED', '- screenshots in', OUT);
  srv.close(); process.exit(fails.length ? 1 : 0);
});
