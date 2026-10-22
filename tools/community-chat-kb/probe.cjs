/* Chat room keyboard check (22 Oct 2026, item 41; Eman from his iPhone: "Look at the text bar. It's way too low. And when you
   try to type, it doesn't work."). Opens Community > Chat in simulated phones (WebKit iPhones as Safari and as a home-screen
   app, Pixel 7 in Chromium) with a stand-in visualViewport that behaves like iOS: the keyboard shrinks the visual viewport and
   iOS pans it down to the caret, the page itself (innerHeight) keeps its size. Checks, in Night and Day:
   - at rest the composer (photo, field, mic) is fully on screen, above the home indicator and above a Safari toolbar that
     covers the bottom of the page;
   - with the keyboard up the composer sits directly on the keyboard, the top bar, pinned bar and tabs stay on screen, the
     newest message stays in view just above the composer, the page does not scroll, and photo/mic are not covered;
   - typing shows in the field, Enter sends and the message shows above the composer, the @mention list opens above it;
   - the room name pill never overlaps the pinned message.
   node tools/community-chat-kb/probe.cjs [outDir] [url] [devices]  -> report.json + screenshots (keyboard drawn in), exit 1 on failure. */
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const H = require('../regress/harness.cjs'), N = require('../regress/nav.cjs');
const sleep = H.sleep;
const OUT = path.resolve(process.argv[2] || '/tmp/chat-kb-probe'); fs.mkdirSync(OUT, { recursive: true });
const URL_ = process.argv[3] || '';
const DEVICES = (process.argv[4] || 'iPhone SE,iPhone 13,iPhone 15,Pixel 7').split(',');
const fails = [], notes = [];
const fail = (w, m) => { fails.push(w + ': ' + m); console.log('FAIL', w, m); };
/* iOS keyboard heights incl. the form-assistant bar (^ v Done), German QWERTZ */
const KB = { 'iPhone SE': 260 + 44, 'iPhone 13': 291 + 44, 'iPhone 15': 291 + 44, 'Pixel 7': 300 };

/* a visualViewport that the probe can shrink and pan like iOS does */
const FAKE_VV = () => {
  const t = new EventTarget(), st = { h: 0, top: 0 };
  for (const [k, g] of Object.entries({ height: () => st.h || innerHeight, width: () => innerWidth, offsetTop: () => st.top, offsetLeft: () => 0, pageTop: () => st.top + scrollY, pageLeft: () => 0, scale: () => 1 }))
    Object.defineProperty(t, k, { get: g, enumerable: true });
  try { Object.defineProperty(window, 'visualViewport', { configurable: true, get: () => t }); } catch (e) { }
  window.__vv = (h, top) => { st.h = h; st.top = top; t.dispatchEvent(new Event('resize')); t.dispatchEvent(new Event('scroll')); };
};

function measure(a) {
  const { vt, vh, sab } = a, vb = vt + vh;
  const q = s => document.querySelector(s);
  const box = e => { if (!e) return null; const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 1 && r.height > 1 && s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > 0 ? r : null; };
  const hit = (x, y) => x && y && x.left < y.right - 1 && y.left < x.right - 1 && x.top < y.bottom - 1 && y.top < x.bottom - 1;
  const R = r => r ? [r.left, r.top, r.right, r.bottom].map(Math.round) : null;
  const out = { errs: [] }, E = m => out.errs.push(m);
  const floor = vb - sab;
  const inp = box(q('#cmInput')), ph = box(q('#cmPhoto')), mic = box(q('#cmMic')) || box(q('#cmSend')), comp = box(q('#cmPaneChat .cm-compose'));
  out.field = R(inp); out.comp = R(comp); out.vt = vt; out.vb = vb;
  for (const [n, r] of [['message field', inp], ['photo button', ph], ['mic/send', mic]]) {
    if (!r) { E('no ' + n); continue; }
    if (r.top < vt - 1 || r.bottom > floor + 0.5) E(n + ' not fully visible (' + Math.round(r.top) + '-' + Math.round(r.bottom) + ', visible ' + Math.round(vt) + '-' + Math.round(floor) + ')');
    const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2), self = n === 'message field' ? q('#cmInput') : n === 'photo button' ? q('#cmPhoto') : (q('#cmMic') && box(q('#cmMic')) ? q('#cmMic') : q('#cmSend'));
    if (el && self && !(el === self || self.contains(el))) E(n + ' covered by ' + (el.id || String(el.className).slice(0, 40) || el.tagName));
  }
  if (a.kb && inp && floor - inp.bottom > 70) E('composer floats ' + Math.round(floor - inp.bottom) + ' px above the keyboard');
  /* top bar, pinned bar, tabs stay on screen */
  const back = box(q('#cgThread .cr-back')), pill = box(q('#cgThread .cr-id')), pin = box(q('#cgThread .cr-pin')), tabs = box(q('#cmPaneChat .rm-tabs'));
  for (const [n, r] of [['back button', back], ['room name', pill], ['pinned message', pin]]) { if (!r) E('no ' + n); else if (r.top < vt - 1 || r.bottom > vb + 1) E(n + ' off screen (' + Math.round(r.top) + ' vs visible top ' + Math.round(vt) + ')'); }
  if (tabs && (tabs.top < vt - 1)) E('tab row off screen');
  if (hit(pill, pin)) E('room name overlaps the pinned message ' + JSON.stringify([R(pill), R(pin)]));
  const title = box(q('#cgThreadTitle')); if (title && pin && hit(title, pin)) E('room title text over the pinned message');
  /* newest message visible just above the composer */
  const list = q('#cmList');
  if (list) {
    const left = list.scrollHeight - list.scrollTop - list.clientHeight; out.left = Math.round(left);
    if (left > 60) E('list not at the newest message (' + Math.round(left) + ' px below)');
    const msgs = [...list.querySelectorAll('.cp-msg')].filter(box); const last = msgs[msgs.length - 1] && msgs[msgs.length - 1].getBoundingClientRect();
    if (!last) E('no messages'); else if (comp) { if (last.bottom > comp.top + 14) E('newest message hidden under the composer (' + Math.round(last.bottom) + ' > ' + Math.round(comp.top) + ')'); if (last.bottom < vt + 120) E('newest message off screen'); }
  }
  /* the page does not scroll */
  const sc = [document.scrollingElement, q('#app'), q('#main'), q('#tab-foryou'), q('#tab-foryou .ls-pager'), q('#cmTrack'), q('#cmPaneChat'), q('#cgThread')].filter(Boolean).map(e => e.scrollTop + e.scrollLeft).reduce((x, y) => x + y, 0);
  if (sc > 1) E('page scrolled by ' + Math.round(sc) + ' px');
  if (inp && parseFloat(getComputedStyle(q('#cmInput')).fontSize) < 16) E('field font under 16 px (iOS zooms)');
  if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) E('sideways overflow');
  return out;
}

/* screenshot of what the eye sees: the visual viewport, with the keyboard drawn under it */
async function shot(p, file, vt, vh, kb) {
  const tmp = file + '.raw.png'; await p.screenshot({ path: tmp }).catch(() => { });
  const dpr = await p.evaluate(() => devicePixelRatio);
  const py = `from PIL import Image,ImageDraw\nim=Image.open(${JSON.stringify(tmp)});W,Hh=im.size;d=${dpr}\nc=Image.new('RGB',(W,Hh),(40,40,46))\ntop=int(${vt}*d);h=int(${vh}*d)\nc.paste(im.crop((0,top,W,min(Hh,top+h))),(0,0))\nif ${kb}>0:\n  dr=ImageDraw.Draw(c);y=h;dr.rectangle([0,y,W,y+int(44*d)],fill=(210,212,218));dr.text((20,y+12*d),'^  v                                      Done',fill=(0,0,0))\n  for r in range(4):\n    for k in range(10):\n      x0=int((4+k*(W/d-8)/10)*d);y0=int(y+(52+r*54)*d);dr.rounded_rectangle([x0+2*d,y0,x0+(W/d-8)/10*d-2*d,y0+44*d],radius=int(5*d),fill=(250,250,252))\nc.save(${JSON.stringify(file)})\n`;
  try { cp.execFileSync('python3', ['-c', py]); fs.unlinkSync(tmp); } catch (e) { }
}
async function setTheme(p, t) { await p.evaluate(t => { const R2 = window.LowiR2; if (R2 && R2.applyTheme) R2.applyTheme(t); document.documentElement.setAttribute('data-theme', t); }, t); await sleep(500); }

async function run(device, mode) {
  const engine = /iPhone/.test(device) ? 'webkit' : 'chromium', W = device + '/' + mode;
  const R = await H.open({ engine, device, probe: false, url: URL_ });
  const p = R.page; const errs = []; p.on('pageerror', e => errs.push(String(e.message || e).slice(0, 160)));
  const tag = device.replace(/\W+/g, '-').toLowerCase() + '-' + mode;
  try {
    await R.ctx.addInitScript(FAKE_VV);
    let sab = 0, toolbar = 0;
    if (mode === 'home') { const s = await p.evaluate(() => ({ w: screen.width, h: screen.height })); await p.setViewportSize({ width: s.w, height: s.h }); sab = 34; }
    if (engine === 'chromium') await p.setViewportSize({ width: 412, height: 839 });
    await R.goto();
    if (mode === 'home') await p.evaluate(() => { document.documentElement.style.setProperty('--sat', '47px'); document.documentElement.style.setProperty('--sab', '34px'); });
    const IH = await p.evaluate(() => innerHeight);
    /* Safari: its bottom toolbar covers the lower part of the page while the layout keeps the full height */
    if (mode === 'safari') { toolbar = 56; await p.evaluate(h => window.__vv(h, 0), IH - toolbar); }
    await setTheme(p, 'dark');
    await N.openCommunity(R); await sleep(5000);
    await p.locator('.rm-tab[data-rm="chat"]').click({ force: true }).catch(() => { }); await sleep(1200);
    if (!(await p.evaluate(() => !!document.querySelector('#cgThread[data-open]')))) { await p.locator('.rm-ch[data-ch="galaxy"]').click({ force: true, timeout: 3000 }).catch(() => { }); await sleep(1500); }
    if (!(await p.evaluate(() => !!document.querySelector('#cgThread[data-open]')))) throw new Error('room did not open');
    await p.evaluate(() => { const l = document.getElementById('cmList'); if (l) l.scrollTop = l.scrollHeight; }); await sleep(600);
    for (const theme of ['dark', 'light']) {
      const T = W + '/' + (theme === 'light' ? 'day' : 'night');
      await setTheme(p, theme);
      await p.evaluate(() => { const l = document.getElementById('cmList'); if (l) l.scrollTop = l.scrollHeight; }); await sleep(400);
      /* at rest */
      const rest = await p.evaluate(measure, { vt: 0, vh: IH - toolbar, sab, kb: 0 }); for (const e of rest.errs) fail(T + '/rest', e);
      notes.push(T + ' rest ' + JSON.stringify({ field: rest.field, vb: rest.vb }));
      await shot(p, path.join(OUT, tag + '-' + theme + '-rest.png'), 0, IH - toolbar, 0);
      /* keyboard up: iOS focuses the field, the visual viewport shrinks and pans down to the caret */
      await p.locator('#cmInput').tap({ force: true, timeout: 5000 }).catch(() => p.locator('#cmInput').focus());
      await p.evaluate(() => document.getElementById('cmInput').focus());
      const kb = KB[device] || 300, vh = IH - kb;
      const fb = await p.evaluate(() => document.getElementById('cmInput').getBoundingClientRect().bottom);
      const pan = engine === 'webkit' ? Math.max(0, Math.round(fb + 12 - vh)) : 0;
      await p.evaluate(([h, t]) => window.__vv(h, Math.min(t, innerHeight - h)), [vh, pan]); await sleep(150);
      await p.evaluate(([h, t]) => window.__vv(h, Math.min(t, innerHeight - h)), [vh, pan]); await sleep(600);
      const vt = await p.evaluate(() => visualViewport.offsetTop);
      const up = await p.evaluate(measure, { vt, vh, sab: 0, kb }); for (const e of up.errs) fail(T + '/keyboard', e);
      notes.push(T + ' keyboard ' + JSON.stringify({ pan, vt, field: up.field, vb: up.vb, left: up.left }));
      await shot(p, path.join(OUT, tag + '-' + theme + '-keyboard.png'), vt, vh, kb);
      /* typing shows in the field; Enter sends and the new message shows above the composer */
      const msg = 'Kb check ' + theme + ' ' + Date.now().toString().slice(-5);
      await p.keyboard.type(msg, { delay: 5 }); await sleep(300);
      const val = await p.evaluate(() => document.getElementById('cmInput').value); if (val !== msg) fail(T + '/keyboard', 'typed text not in the field: ' + JSON.stringify(val));
      const after = await p.evaluate(measure, { vt: await p.evaluate(() => visualViewport.offsetTop), vh, sab: 0, kb }); for (const e of after.errs) if (/field|photo|mic|send|scrolled/.test(e)) fail(T + '/typing', e);
      await p.keyboard.press('Enter'); await sleep(1500);
      const sent = await p.evaluate(m => { const els = [...document.querySelectorAll('#cmList .cp-msg')].filter(e => e.textContent.includes(m)); if (!els.length) return 'not in list'; const r = els[els.length - 1].getBoundingClientRect(), c = document.querySelector('#cmPaneChat .cm-compose').getBoundingClientRect(); return r.bottom <= c.top + 14 && r.top >= visualViewport.offsetTop ? 'ok' : 'hidden ' + Math.round(r.top) + '-' + Math.round(r.bottom) + ' comp ' + Math.round(c.top); }, msg);
      if (sent !== 'ok') fail(T + '/send', 'sent message ' + sent);
      const st = await p.evaluate(measure, { vt: await p.evaluate(() => visualViewport.offsetTop), vh, sab: 0, kb }); for (const e of st.errs) fail(T + '/after-send', e);
      /* @mention list opens above the composer and on screen */
      await p.keyboard.type('@', { delay: 5 }); await sleep(600);
      const men = await p.evaluate(() => { const m = document.getElementById('cmMention'); if (!m || !m.innerHTML.trim()) return 'empty'; const r = m.getBoundingClientRect(); return r.height > 10 && r.top >= visualViewport.offsetTop - 1 && r.bottom <= visualViewport.offsetTop + visualViewport.height + 1 ? 'ok' : 'off screen ' + Math.round(r.top) + '-' + Math.round(r.bottom); });
      if (men !== 'ok') fail(T + '/mention', 'mention list ' + men);
      if (theme === 'light') await shot(p, path.join(OUT, tag + '-light-mention.png'), await p.evaluate(() => visualViewport.offsetTop), vh, kb);
      await p.keyboard.press('Backspace'); await sleep(400); /* removing the @ closes the list, as a finger would */
      const left = await p.evaluate(() => { const m = document.getElementById('cmMention'); return document.getElementById('cmInput').value + '|' + (m && m.getBoundingClientRect().height > 10 ? 'open' : 'closed'); });
      if (left !== '|closed') fail(T + '/mention', 'after deleting the @: ' + left);
      /* keyboard down */
      await p.evaluate(() => document.getElementById('cmInput').blur());
      await p.evaluate(h => window.__vv(h, 0), IH - toolbar); await sleep(700);
      const down = await p.evaluate(measure, { vt: 0, vh: IH - toolbar, sab, kb: 0 }); for (const e of down.errs) fail(T + '/keyboard-closed', e);
    }
    /* camera and mic still answer a tap */
    const cam = await p.evaluate(() => { let picked = false; const f = document.getElementById('cmPhotoFile'); if (f) f.addEventListener('click', e => { picked = true; e.preventDefault(); }, { once: true }); const b = document.getElementById('cmPhoto'); b && b.click(); return new Promise(r => setTimeout(() => r(picked || !!document.querySelector('#csPhoto:not(:empty)')), 400)); });
    notes.push(W + ' camera tap opens picker: ' + cam); if (!cam) fail(W, 'camera button did not open the photo picker');
    if (errs.length) fail(W, 'page errors: ' + errs.slice(0, 3).join(' | '));
  } catch (e) { fail(W, 'crashed: ' + String(e.message || e).slice(0, 200)); await R.shot(path.join(OUT, tag + '-crash.png')); }
  finally { await R.close(); }
}
(async () => {
  for (const d of DEVICES) { if (/iPhone/.test(d)) { await run(d, 'safari'); await run(d, 'home'); } else await run(d, 'browser'); }
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ fails, notes }, null, 1));
  console.log(notes.join('\n')); console.log(fails.length ? fails.length + ' FAIL' : 'ALL PASS');
  process.exit(fails.length ? 1 : 0);
})();
