#!/usr/bin/env node
/* Chat redesign + room switcher probe (24 Oct 2026). Plays the real app against the simulated cloud (mock-cloud.cjs with
   circles: one circle you are in, one you made with a new message): Community > chat shows the switcher strip; tapping a
   circle opens it in the chat look (bubbles, faces, time, ··· menu, reactions); a reaction and a message are written;
   the strip takes you to the other circle and back to Community. Checks layout (nothing off screen or overlapping) at each
   size and saves screenshots. Nothing reaches the network.
   node tools/chat-switch/probe.cjs <outDir> [url] [device...]      (ENGINE=chromium by default; WebKit taps crash here) */
'use strict';
const fs = require('fs'), path = require('path');
const H = require('../regress/harness.cjs'), N = require('../regress/nav.cjs');
const sleep = H.sleep;
const out = process.argv[2] || '/tmp/chat-switch-probe', url = process.argv[3] || '';
const devices = process.argv.slice(4).length ? process.argv.slice(4) : ['iPhone 13', 'iPhone SE', 'iPad (gen 7)', 'iPad (gen 7) landscape'];
fs.mkdirSync(out, { recursive: true });
const layout = () => {
  const W = innerWidth, Hh = innerHeight, bad = [];
  const vis = e => { if (!e) return false; const b = e.getBoundingClientRect(), cs = getComputedStyle(e); return b.width > 2 && b.height > 2 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const card = document.querySelector('.ur-card');
  const scope = card && vis(card) ? card : document.getElementById('cgThread');
  const box = scope ? scope.getBoundingClientRect() : { left: 0, right: W, top: 0, bottom: Hh };
  for (const e of (scope ? scope.querySelectorAll('button,input,.ur-bub,.cs-chip') : [])) {
    if (!vis(e)) continue; const b = e.getBoundingClientRect();
    if (e.closest('.cs-row') || e.closest('.ur-msgs')) { if (b.left < -1 || b.right > W + 1) { if (!e.closest('.cs-row')) bad.push('off screen x: ' + (e.className || e.tagName)); } continue; }
    if (b.left < box.left - 1 || b.right > box.right + 1 || b.top < box.top - 1 || b.bottom > box.bottom + 1) bad.push('outside card: ' + (e.className || e.tagName) + ' ' + [b.left, b.top, b.right, b.bottom].map(Math.round));
  }
  /* header controls must not overlap each other */
  const hd = [...document.querySelectorAll('.ur-chead > *')].filter(vis).map(e => [e.className, e.getBoundingClientRect()]);
  for (let i = 0; i < hd.length; i++) for (let j = i + 1; j < hd.length; j++) { const a = hd[i][1], b = hd[j][1]; if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) bad.push('header overlap ' + hd[i][0] + ' / ' + hd[j][0]); }
  const sw = document.querySelector(card && vis(card) ? '.ur-card .cs-strip' : '#cgThread > .cs-strip');
  const ol = document.querySelector('.ur-msgs');
  return { w: W, h: Hh, bad, strip: sw ? [...sw.querySelectorAll('.cs-chip')].map(c => (c.getAttribute('aria-current') ? '*' : '') + c.textContent.trim() + (c.querySelector('.cs-dot') ? '•' : '')) : null,
    stripBox: sw ? (r => [r.left, r.top, r.width, r.height].map(Math.round))(sw.getBoundingClientRect()) : null, hscroll: document.documentElement.scrollWidth > W + 1,
    bubbles: document.querySelectorAll('.ur-bub').length, olScroll: ol ? ol.scrollHeight > ol.clientHeight : null };
};
async function run(device) {
  const tag = device.replace(/[^a-z0-9]+/gi, '-').toLowerCase(), res = { device, steps: [] };
  const R = await H.open({ engine: process.env.ENGINE || 'chromium', device, probe: false, url, circles: true, members: 20, messages: 60 });
  const p = R.page, step = async (name, extra) => { const l = await p.evaluate(layout); res.steps.push(Object.assign({ name }, l, extra || {})); await p.screenshot({ path: path.join(out, tag + '-' + name + '.png') }).catch(() => { }); return l; };
  try {
    await R.goto(); await N.openCommunity(R); await sleep(3000);
    await p.locator('.rm-tab[data-rm="chat"]').click({ force: true }).catch(() => { }); await sleep(800);
    await p.evaluate(() => window.LowiChatSwitch && LowiChatSwitch.tick(true));
    await p.waitForSelector('#cgThread > .cs-strip', { timeout: 15000 }).catch(() => { });
    await sleep(600);
    const pinTop = await p.evaluate(() => { const l = document.getElementById('cmList'); return l ? getComputedStyle(l).paddingTop : ''; });
    await step('1-community', { listPaddingTop: pinTop });
    await p.locator('#cgThread > .cs-strip .cs-chip', { hasText: 'Typ 2 walkers' }).click({ timeout: 8000 });
    await p.waitForSelector('.ur-card[data-mode=room] .ur-bub', { timeout: 15000 }); await sleep(800);
    await step('2-circle');
    /* ··· on a friend's message, then laugh at it */
    const more = p.locator('.ur-them .ur-more').last(); await more.click({ force: true }); await sleep(400);
    const menu = await p.evaluate(() => { const m = document.querySelector('.ur-menu'); return m ? { emoji: m.querySelectorAll('.ur-rxe').length, items: [...m.querySelectorAll('.ur-mi')].map(b => b.textContent.trim()), inView: (r => r.bottom <= document.querySelector('.ur-msgs').getBoundingClientRect().bottom + 2)(m.getBoundingClientRect()) } : null; });
    await step('3-menu', { menu });
    await p.locator('.ur-menu .ur-rxe').nth(2).click(); await sleep(700);
    const reacted = R.sim.writes.filter(w => w.t === 'reactions' && w.m === 'POST').map(w => w.body && w.body.emoji);
    await p.fill('.ur-say .ur-in', 'See you at 6 👋'); await p.locator('.ur-say .ur-send').click(); await sleep(900);
    const sent = R.sim.writes.filter(w => w.t === 'messages' && w.m === 'POST').map(w => w.body && (w.body.room + ' ' + w.body.body));
    await step('4-sent', { reacted, sent, mineLast: await p.evaluate(() => { const l = [...document.querySelectorAll('.ur-m')].pop(); return l ? l.className + ' ' + l.textContent.slice(0, 40) : ''; }) });
    await p.locator('.ur-card .cs-chip', { hasText: 'Night owls' }).click(); await sleep(1500);
    await step('5-own-circle', { info: await p.evaluate(() => { const i = document.querySelector('.ur-info'), a = document.querySelector('.ur-askbar'); return { info: !!i, askbar: a ? a.textContent : '', asks: document.querySelectorAll('.ur-ask').length }; }) });
    await p.locator('.ur-card .cs-chip.cs-home').click(); await sleep(1500);
    await step('6-back-community', { overlay: await p.evaluate(() => !!document.querySelector('.ur-card')), chat: await p.evaluate(() => { const t = document.getElementById('cgThread'); return !!(t && t.offsetParent); }) });
  } catch (e) { res.error = String(e.message || e).split('\n')[0]; await p.screenshot({ path: path.join(out, tag + '-error.png') }).catch(() => { }); }
  finally { res.pageErrors = (R.errors || []).slice(0, 5); await R.close(); }
  return res;
}
(async () => {
  const all = [];
  for (const d of devices) { const r = await run(d); all.push(r); console.log(JSON.stringify(r)); }
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(all, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
