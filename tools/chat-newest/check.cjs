/* Chat opens at the newest message (25 Oct 2026, Emmanuel: "when opening the chat room from the circle, also general, it doesn't
   start from the most recent message ... then you have to scroll down").
   Opens the one Community chat in simulated phones/tablets with 300+ messages whose newest part is photo-heavy, photos answered
   0.8-2.6 s late (like a phone on mobile data), from every entry point:
     A  the Chat tab in the Community bar
     B  Room tab -> the Chat button under the galaxy (after scrolling up before leaving: must still land on the newest)
     C  back arrow out of the chat, then the Chat tab again
   and checks, frame by frame for 4.5 s after each open, that the list sits at the bottom with the newest message in view and
   that late photos never leave it cut off. Then: scrolled up, a new message must NOT move the list and a "new" pill shows;
   the pill brings you down; at the bottom a new photo message stays pinned after it loads.
   node tools/chat-newest/check.cjs [outDir] [url] [cases]   cases: comma list of chromium-phone,chromium-ipad,webkit-phone,webkit-ipad
   With a url it runs against that site (fake Supabase still, nothing is written anywhere). Exit 1 on failure. */
'use strict';
const fs = require('fs'), path = require('path');
const H = require('../regress/harness.cjs'), N = require('../regress/nav.cjs');
const sleep = H.sleep;
const OUT = path.resolve(process.argv[2] || '/tmp/chat-newest'); fs.mkdirSync(OUT, { recursive: true });
const URL_ = process.argv[3] || '';
const ALL = {
  'chromium-phone': { engine: 'chromium', viewport: { width: 390, height: 844 } },
  'chromium-ipad': { engine: 'chromium', viewport: { width: 820, height: 1180 } },
  'webkit-phone': { engine: 'webkit', device: 'iPhone 13' },
  'webkit-ipad': { engine: 'webkit', device: 'iPad (gen 7)' },
};
/* CHAT_NEWEST_DPR=1: WebKit at 1x pixels (same 390x844 / 810x1080 iPhone/iPad viewport, touch, Safari UA). On the shared test VM
   WebKit's software renderer at 3x drops to one frame every 10-60 s under load, which says nothing about the scroll behaviour. */
if (process.env.CHAT_NEWEST_DPR) {
  const os = require('os'); let pw; for (const q of [process.env.PW, path.join(os.homedir(), '.pw/node_modules/playwright'), '/tmp/pw/node_modules/playwright', 'playwright']) { try { if (q) { pw = require(q); break; } } catch (e) { } }
  for (const k of ['webkit-phone', 'webkit-ipad']) { const n = ALL[k].device, nn = n + ' @' + process.env.CHAT_NEWEST_DPR + 'x'; pw.devices[nn] = Object.assign({}, pw.devices[n], { deviceScaleFactor: +process.env.CHAT_NEWEST_DPR }); ALL[k].device = nn; }
}
const CASES = (process.argv[4] || Object.keys(ALL).join(',')).split(',').filter(k => ALL[k]);
const fails = [], notes = [];
const fail = (w, m) => { fails.push(w + ': ' + m); console.log('FAIL', w, m); };
const until = async (p, fn, arg, ms = 8000) => { const t0 = Date.now(); let v; while (Date.now() - t0 < ms) { v = await p.evaluate(fn, arg).catch(() => null); if (v) return v; await sleep(150); } return v; };

/* frame sampler: from now on, every animation frame records how far the list is from its bottom */
const startSampler = p => p.evaluate(() => {
  const s = window.__cnS = { t0: performance.now(), f: [] };
  const tick = () => {
    if (window.__cnS !== s) return; const l = document.getElementById('cmList'), th = document.getElementById('cgThread');
    if (l && th && th.hasAttribute('data-open')) {
      const rows = l.querySelectorAll('[id^="cm-"]'), last = rows[rows.length - 1], lr = l.getBoundingClientRect(), c = document.querySelector('#cmPaneChat .cm-compose');
      const bottomEdge = Math.min(lr.bottom, c ? c.getBoundingClientRect().top : innerHeight);
      const r = last && last.getBoundingClientRect();
      s.f.push({ t: Math.round(performance.now() - s.t0), dist: Math.round(l.scrollHeight - l.scrollTop - l.clientHeight), sh: l.scrollHeight, rows: rows.length, lastOk: !!(r && r.height && r.bottom <= bottomEdge + 3 && r.top < bottomEdge), imgs: l.querySelectorAll('img').length });
    }
    requestAnimationFrame(after);
  };
  /* measure what was painted: after the frame (rAF -> layout -> ResizeObserver -> paint), not inside rAF, where a photo that just
     decoded is laid out before the ResizeObserver had its turn to re-pin (that state never reaches the screen) */
  const after = () => setTimeout(tick, 0);
  requestAnimationFrame(after);
});
const readSampler = p => p.evaluate(() => { const s = window.__cnS; window.__cnS = null; return s ? s.f : []; });

function judge(W, what, f) {
  const shown = f.filter(x => x.rows > 0);
  if (!shown.length) { fail(W, what + ': the chat never showed any messages'); return; }
  const settleT = shown[0].t + 300; /* first paint, plus a few frames */
  const late = shown.filter(x => x.t >= settleT);
  const worst = late.reduce((a, x) => x.dist > a.dist ? x : a, { dist: 0, t: 0 });
  const off = late.filter(x => !x.lastOk).length;
  const end = shown[shown.length - 1];
  notes.push(W + ' ' + what + ' frames=' + shown.length + ' first=' + JSON.stringify(shown[0]) + ' worst=' + JSON.stringify(worst) + ' end=' + JSON.stringify(end) + ' offFrames=' + off);
  if (shown[0].dist > 4) fail(W, what + ': first painted frame is ' + shown[0].dist + ' px above the bottom (visible jump)');
  if (end.dist > 4 || !end.lastOk) fail(W, what + ': ends ' + end.dist + ' px above the bottom, newest message in view: ' + end.lastOk);
  if (worst.dist > 4) fail(W, what + ': ' + worst.dist + ' px above the bottom at ' + worst.t + ' ms (late photos left the newest message out of view)');
  if (off > 1) fail(W, what + ': newest message out of view in ' + off + ' frames after the first paint');
}

async function run(key) {
  const C = ALL[key], W = key;
  const R = await H.open(Object.assign({ probe: false, url: URL_, lang: key.endsWith('ipad') ? 'de' : 'en', messages: 260 }, C));
  const p = R.page;
  try {
    /* the newest part of the chat is photo-heavy: 25 photos among the last 50 messages (they load late, see below) */
    for (let i = 0; i < 25; i++) { R.sim.say(); R.sim.photoSay(); }
    let k = 0; await R.ctx.route(/\/storage\/v1\/object\/public\/media\/.*\.jpe?g/, async r => { await sleep(800 + ((k++ * 467) % 1800)); await r.fallback(); });
    await R.goto();
    await N.openCommunity(R); await sleep(5000);
    const count = await p.evaluate(() => (window.LowiCommunityHost && LowiCommunityHost.messages().length) || 0);
    notes.push(W + ' messages in the chat: ' + count); if (count < 100) fail(W, 'only ' + count + ' messages loaded');
    const tapTab = async rm => { await p.locator('#cmPaneChat .rm-tab[data-rm="' + rm + '"]').first().click({ force: true, timeout: C.engine === 'webkit' ? 120000 : 5000 }); };
    const isOpen = () => p.evaluate(() => !!document.querySelector('#cgThread[data-open]'));
    /* a loaded test computer can drop WebKit to a frame every second or two: wait for the state, not a fixed time */
    const SLOW = C.engine === 'webkit' ? 3 : 1;
    const opened = () => until(p, () => !!document.querySelector('#cgThread[data-open]') && document.querySelectorAll('#cmList [id^="cm-"]').length > 0, null, C.engine === 'webkit' ? 150000 : 30000);
    const closed = () => until(p, () => !document.querySelector('#cgThread[data-open]') && !!document.querySelector('#cgTo [data-chat="history"]') && getComputedStyle(document.querySelector('#cgTo [data-chat="history"]')).display !== 'none', null, C.engine === 'webkit' ? 150000 : 30000);
    /* make sure we start in the Room (galaxy) */
    if (await isOpen()) { await tapTab('room'); await closed(); }

    /* A: Chat tab */
    await startSampler(p); await tapTab('chat'); await opened(); await sleep(4500 * SLOW);
    if (!(await isOpen())) throw new Error('A: the chat tab did not open the chat');
    judge(W, 'A chat tab', await readSampler(p)); await R.shot(path.join(OUT, key + '-A-chat-tab.png'));
    const imgs = await p.evaluate(() => [...document.querySelectorAll('#cmList img')].filter(i => i.complete && i.naturalWidth).length); notes.push(W + ' loaded photos in the list: ' + imgs); if (imgs < 3) fail(W, 'only ' + imgs + ' photos loaded in the visible chat (the check needs photos)');

    /* B: scroll up, leave to the Room, open with the Chat button under the galaxy */
    await p.evaluate(() => { const l = document.getElementById('cmList'); l.scrollTop = Math.max(0, l.scrollHeight / 3); }); await sleep(400);
    await tapTab('room'); await closed();
    if (await isOpen()) fail(W, 'Room tab did not close the chat');
    await startSampler(p);
    const hb = p.locator('#cgTo [data-chat="history"]').first();
    await hb.click({ force: true, timeout: C.engine === 'webkit' ? 120000 : 5000 }).catch(e => fail(W, 'B: Chat button under the galaxy: ' + e.message.split('\n')[0]));
    await opened(); await sleep(4500 * SLOW);
    if (!(await isOpen())) throw new Error('B: the Chat button did not open the chat');
    judge(W, 'B galaxy Chat button', await readSampler(p)); await R.shot(path.join(OUT, key + '-B-galaxy-button.png'));

    /* C: back arrow, then the Chat tab again */
    await p.locator('#cgThread [data-chat="close-thread"]').first().click({ force: true, timeout: C.engine === 'webkit' ? 120000 : 5000 }).catch(() => { }); await closed();
    if (await isOpen()) { await tapTab('room'); await closed(); }
    await startSampler(p); await tapTab('chat'); await opened(); await sleep(4500 * SLOW);
    judge(W, 'C reopen', await readSampler(p));

    /* scrolled up: a new message must not move the list, a small pill shows instead */
    await p.evaluate(() => { const l = document.getElementById('cmList'); l.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, bubbles: true })); l.scrollTop = Math.max(0, l.scrollHeight - l.clientHeight - 1400); }); await sleep(2600 * SLOW);
    /* what you are reading: the first message row in view, and where it sits on screen */
    const anchorOf = () => p.evaluate(() => { const l = document.getElementById('cmList'), lt = l.getBoundingClientRect().top; const r = [...l.querySelectorAll('[id^="cm-"]')].find(e => e.getBoundingClientRect().bottom > lt + 1); return r ? { id: r.id, y: Math.round(r.getBoundingClientRect().top - lt) } : null; });
    const a0 = await anchorOf(), y0 = a0 && a0.y;
    await p.evaluate(id => { window.__cnA = id; }, a0 && a0.id);
    R.sim.say('Fresh line while you read older ones'); await until(p, () => [...document.querySelectorAll('#cmList .cm-t')].some(t => /Fresh line while you read/.test(t.textContent)), null, 20000); await sleep(1500 * SLOW);
    const up = await p.evaluate(() => { const l = document.getElementById('cmList'), pill = document.querySelector('#csJump .cs-jump'), dn = document.querySelector('#cgThread .cr-down'); const vis = e => { if (!e) return false; const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 4 && r.height > 4 && s.display !== 'none' && s.visibility !== 'hidden' && +s.opacity > .1; }; const r = document.getElementById(""+(window.__cnA||'')); return { top: r ? Math.round(r.getBoundingClientRect().top - l.getBoundingClientRect().top) : null, pill: vis(pill), pillText: pill ? pill.textContent : '', down: vis(dn), has: [...l.querySelectorAll('.cm-t')].some(t => /Fresh line while you read/.test(t.textContent)) }; });
    notes.push(W + ' scrolled-up new message ' + JSON.stringify({ y0, ...up }));
    if (!up.has) fail(W, 'the new message never arrived in the list');
    if (up.top == null || Math.abs(up.top - y0) > 4) fail(W, 'a new message moved what you were reading (' + y0 + ' -> ' + up.top + ' px)');
    if (!up.pill) fail(W, 'no "new message" pill while scrolled up');
    await R.shot(path.join(OUT, key + '-D-pill.png'));
    /* the pill brings you down */
    await p.locator('#csJump .cs-jump').first().click({ force: true, timeout: C.engine === 'webkit' ? 120000 : 8000 }).catch(e => fail(W, 'pill tap: ' + e.message.split('\n')[0])); await sleep(1500 * SLOW);
    const down = await p.evaluate(() => { const l = document.getElementById('cmList'); return Math.round(l.scrollHeight - l.scrollTop - l.clientHeight); });
    if (down > 4) fail(W, 'pill tap left the list ' + down + ' px above the bottom');
    /* at the bottom a new photo message stays pinned once the photo loads */
    await startSampler(p); R.sim.photoSay(); await sleep(1200 * SLOW); R.sim.say('And one more after the photo'); await until(p, () => [...document.querySelectorAll('#cmList .cm-t')].some(t => /And one more after the photo/.test(t.textContent)), null, 20000); await sleep(3400 * SLOW);
    const f = await readSampler(p), end = f[f.length - 1] || {};
    notes.push(W + ' pinned new photo end=' + JSON.stringify(end));
    if (!end.lastOk || end.dist > 4) fail(W, 'at the bottom, a new photo message left the list ' + end.dist + ' px above the bottom');
    await R.shot(path.join(OUT, key + '-E-pinned.png'));
    if (R.errs.length) fail(W, 'page errors ' + JSON.stringify(R.errs.slice(0, 3)));
  } catch (e) { fail(W, 'run: ' + String(e.message).split('\n')[0]); await R.shot(path.join(OUT, key + '-error.png')); }
  finally { await R.close(); }
}
(async () => {
  for (const k of CASES) await run(k);
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ fails, notes }, null, 1));
  console.log(notes.join('\n')); console.log(fails.length ? fails.length + ' FAIL' : '0 FAIL');
  process.exit(fails.length ? 1 : 0);
})();
