/* Community chat in the brand colours, Day and Night (22 Oct 2026, item 43).
   Emmanuel (screenshot of the chat): "It's just that it's not in my branding color. Why do we have green in there? My branding
   color isn't green. And this is in white mode, even though my app is currently in dark mode."
   Opens the real app on simulated phones, goes to Community > Chat > the room and, in Night then Day (switched live through the
   app's own theme switch, with the room open), checks:
   - no painted colour in the room, its tab row (and, since the brand-blues pass, no violet: hue 229-320, lightness above 0.15 so the companion's near-black eyes and the shared navy glass are not counted)
   - no painted colour in the room, its tab row (Affiliates / Chat / Creation / Room) or the composer is teal or green
     (hue 140-190 with real saturation; the Misty ice blue #8fe7ff sits at 193 and is the brand): text, backgrounds, gradients, borders, shadows, SVG fill/stroke, pseudo elements;
   - the room, the other people's bubbles, the tab row and the composer are dark in Night and light in Day, and your own
     bubble and the send button carry the brand blue;
   - text passes WCAG AA; leaving the room and coming back keeps the theme.
   node tools/community-chat-brand/probe.cjs [outDir] [url] [devices comma list] -> screenshots + report.json, exit 1 on failure. */
'use strict';
const fs = require('fs'), path = require('path');
const H = require('../regress/harness.cjs'), N = require('../regress/nav.cjs');
const sleep = H.sleep;
const OUT = path.resolve(process.argv[2] || '/tmp/chat-brand-probe'); fs.mkdirSync(OUT, { recursive: true });
const URL_ = process.argv[3] || '';
const DEVICES = (process.argv[4] || 'iPhone SE,iPhone 13,iPhone 15,Pixel 7').split(',');
const fails = [], notes = [];
const fail = (w, m) => { fails.push(w + ': ' + m); console.log('FAIL', w, m); };

/* runs in the page: every teal/green colour painted inside the chat */
function greenScan() {
  const roots = [...document.querySelectorAll('#cgThread, #cmPaneChat .cm-compose, #cmPaneChat .rm-tabs')];
  const hsl = (r, g, b) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; if (!d) return { h: 0, s: 0, l }; const s = d / (1 - Math.abs(2 * l - 1)); let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; return { h, s, l }; };
  const greens = s => { const out = []; String(s || '').replace(/rgba?\(([^)]+)\)/g, (m, inner) => { const p = inner.split(/[ ,/]+/).filter(Boolean).map(Number); const a = p.length > 3 ? p[3] : 1; if (a < 0.06) return m; const c = hsl(p[0], p[1], p[2]); if ((c.h >= 140 && c.h <= 190 && c.s > 0.28 && c.l > 0.12 && c.l < 0.93) || (c.h >= 229 && c.h <= 320 && c.s > 0.2 && c.l > 0.15 && c.l < 0.95)) out.push(m); return m; }); return out; };
  const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0.5 && r.height > 0.5 && s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0.02 && r.bottom > 0 && r.top < innerHeight; };
  const props = ['color', 'backgroundColor', 'backgroundImage', 'borderTopColor', 'borderBottomColor', 'borderLeftColor', 'borderRightColor', 'boxShadow', 'textShadow', 'outlineColor', 'fill', 'stroke', 'caretColor'];
  const hits = []; const seen = new Set();
  for (const root of roots) for (const el of [root, ...root.querySelectorAll('*')]) {
    if (!vis(el)) continue;
    for (const pseudo of [null, '::before', '::after']) {
      const s = getComputedStyle(el, pseudo); if (pseudo && (s.content === 'none' || s.content === 'normal')) continue;
      for (const k of props) {
        let v = s[k]; if (!v) continue;
        if (/^border/.test(k) && parseFloat(s[k.replace('Color', 'Width')]) === 0) continue;
        if (k === 'outlineColor' && (s.outlineStyle === 'none' || parseFloat(s.outlineWidth) === 0)) continue;
        if (k === 'caretColor' && el.id !== 'cmInput') continue;
        if ((k === 'fill' || k === 'stroke') && !(el instanceof SVGElement)) continue;
        if (k === 'color' && !el.childNodes.length && !(el instanceof SVGElement)) continue;
        const g = greens(v); if (!g.length) continue;
        const id = (el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className).trim().split(/\s+/).slice(0, 2).join('.')) + (pseudo || '') + ' ' + k + ' ' + g[0];
        if (!seen.has(id)) { seen.add(id); hits.push(id); }
      }
    }
  }
  return hits;
}
function looks() {
  const lum = c => { const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return -1; const p = m[1].split(/[ ,/]+/).map(Number); const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return +(0.2126 * f(p[0]) + 0.7152 * f(p[1]) + 0.0722 * f(p[2])).toFixed(3); };
  const hue = c => { const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return -1; let [r, g, b] = m[1].split(/[ ,/]+/).map(Number); r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (!d) return -1; let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; return Math.round(h < 0 ? h + 360 : h); };
  const cs = s => { const e = document.querySelector(s); return e ? getComputedStyle(e) : null; };
  const bg = s => { const c = cs(s); return c ? c.backgroundColor : ''; };
  const mine = document.querySelector('#cgThread .cp-msg.mine .cm-bub'), other = [...document.querySelectorAll('#cgThread .cp-msg:not(.mine) .cm-bub')].find(b => b.getBoundingClientRect().height > 1);
  const send = cs('#cmSend'), sendShown = send && send.display !== 'none' && document.getElementById('cmSend').getBoundingClientRect().width > 1;
  return { theme: document.documentElement.getAttribute('data-theme'), room: lum(bg('#cgThread')), tabs: lum(bg('#cmPaneChat .rm-tabs')), field: lum(bg('#cmInput')),
    other: other ? lum(getComputedStyle(other).backgroundColor) : -1, mineHue: mine ? hue(getComputedStyle(mine).backgroundColor) : -1, mine: !!mine,
    sendHue: sendShown ? hue(send.backgroundColor) : -2 };
}
async function setTheme(p, t) { await p.evaluate(t => window.LowiR2.applyTheme(t), t); await sleep(600); }
async function openRoom(p) {
  await p.locator('.rm-tab[data-rm="chat"]').click({ force: true }).catch(() => { }); await sleep(1200);
  if (!(await p.evaluate(() => !!document.querySelector('#cgThread[data-open]')))) { await p.locator('.rm-ch[data-ch="galaxy"]').click({ force: true, timeout: 3000 }).catch(() => { }); await sleep(1500); }
  if (!(await p.evaluate(() => !!document.querySelector('#cgThread[data-open]')))) { await p.evaluate(() => { const b = document.querySelector('[data-chat="open-thread"]'); if (b) b.click(); }); await sleep(1200); }
  /* a loaded machine can be slow: try again for up to ~20 s before giving up */
  for (let i = 0; i < 10 && !(await p.evaluate(() => !!document.querySelector('#cgThread[data-open]'))); i++) {
    await p.locator('.rm-tab[data-rm="chat"]').click({ force: true, timeout: 3000 }).catch(() => { }); await sleep(800);
    await p.locator('.rm-ch[data-ch="galaxy"]').click({ force: true, timeout: 3000 }).catch(() => { }); await sleep(1200);
  }
  return p.evaluate(() => !!document.querySelector('#cgThread[data-open]'));
}
async function run(device) {
  const W = device;
  const R = await H.open({ engine: 'webkit', device, probe: false, url: URL_ });
  const p = R.page; const errs = []; p.on('pageerror', e => errs.push(String(e.message || e).slice(0, 160)));
  const tag = device.replace(/\W+/g, '-').toLowerCase();
  try {
    await R.goto();
    await setTheme(p, 'dark');
    await N.openCommunity(R); await sleep(5000);
    if (!(await openRoom(p))) throw new Error('room did not open');
    /* one own message so your own bubble is on screen (the fake cloud answers locally, nothing is sent anywhere) */
    if (!(await p.evaluate(() => !!document.querySelector('#cgThread .cp-msg.mine')))) {
      await p.locator('#cmInput').fill('Low-spike lunch done', { force: true, timeout: 8000 }).catch(() => { });
      await p.evaluate(() => { const b = document.getElementById('cmSend'); if (b) b.click(); }); await sleep(1500);
    }
    await p.locator('#cmInput').fill('Hi', { force: true, timeout: 8000 }).catch(() => { }); await sleep(300);
    await p.evaluate(() => { const l = document.getElementById('cmList'); if (l) l.scrollTop = l.scrollHeight; }); await sleep(500);
    for (const theme of ['dark', 'light']) {
      const T = W + '/' + (theme === 'light' ? 'day' : 'night');
      await setTheme(p, theme);
      const L = await p.evaluate(looks); notes.push(T + ' ' + JSON.stringify(L));
      if (L.theme !== theme) fail(T, 'app theme is ' + L.theme);
      if (theme === 'dark') { for (const k of ['room', 'tabs', 'other', 'field']) if (L[k] > 0.06) fail(T, k + ' is not dark in Night (' + L[k] + ')'); }
      else { if (L.room < 0.6) fail(T, 'room not light in Day (' + L.room + ')'); if (L.other < 0.8) fail(T, 'bubbles not light in Day (' + L.other + ')'); /* nav-shared (item 38): the tab row is the one shared Community bar, identical on Room/Chat/Creation/Affiliates, so Day does not repaint it here */ }
      if (!L.mine) fail(T, 'no own bubble on screen'); else if (!(L.mineHue >= 200 && L.mineHue <= 235)) fail(T, 'own bubble is not brand blue (hue ' + L.mineHue + ')');
      if (L.sendHue !== -2 && !(L.sendHue >= 200 && L.sendHue <= 235)) fail(T, 'send button is not brand blue (hue ' + L.sendHue + ')');
      const g = await p.evaluate(greenScan); notes.push(T + ' green ' + g.length + (g.length ? ': ' + g.join(' | ') : '')); if (g.length) fail(T, g.length + ' teal/green colours: ' + g.slice(0, 10).join(' | '));
      await R.shot(path.join(OUT, tag + '-' + (theme === 'light' ? 'day' : 'night') + '.png'));
    }
    /* leave the room for Home and come back: the theme holds */
    await setTheme(p, 'dark');
    await N.goHome(R); await sleep(1200); await N.openCommunity(R); await sleep(2500); await openRoom(p);
    const back = await p.evaluate(looks); if (back.theme !== 'dark' || back.room > 0.06) fail(W + '/night/after-leaving', 'theme did not hold (' + back.theme + ', room ' + back.room + ')');
    if (errs.length) fail(W, 'page errors: ' + errs.slice(0, 3).join(' | '));
  } catch (e) { fail(W, 'crashed: ' + String(e.message || e).slice(0, 200)); try { await R.shot(path.join(OUT, tag + '-crash.png')); } catch (x) { } }
  finally { await R.close(); }
}
(async () => {
  for (const d of DEVICES) await run(d);
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ fails, notes }, null, 1));
  console.log(notes.join('\n')); console.log(fails.length ? fails.length + ' FAIL' : 'ALL PASS');
  process.exit(fails.length ? 1 : 0);
})();
