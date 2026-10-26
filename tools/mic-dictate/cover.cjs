#!/usr/bin/env node
'use strict';
/* Debug helper: what covers the mic of a field (selector) on Kitchen / Shop. Usage: node tools/mic-dictate/cover.cjs */
const H = require('../sim/harness.cjs');
(async () => {
  const R = await H.open({ lang: 'en', url: '' });
  const P = R.page;
  await R.ctx.addInitScript(() => { function SR() { } SR.prototype.start = function () { }; SR.prototype.stop = SR.prototype.abort = function () { }; window.webkitSpeechRecognition = SR; });
  await R.goto(); await H.sleep(5000);
  const info = (sel) => P.evaluate((sel) => {
    const e = document.querySelector(sel); if (!e) return 'no field';
    const b = e.nextElementSibling; const r = b.getBoundingClientRect(), er = e.getBoundingClientRect();
    const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    const tr = t && t.getBoundingClientRect();
    const chain = []; let n = t; while (n && chain.length < 5) { chain.push((n.tagName + '.' + String(n.className).slice(0, 25) + '#' + n.id)); n = n.parentElement; }
    return { mic: [r.left, r.top, r.width, r.height].map(Math.round), field: [er.left, er.top, er.width, er.height].map(Math.round), vh: innerHeight, cover: t && t.outerHTML.slice(0, 160), coverRect: tr && [tr.left, tr.top, tr.width, tr.height].map(Math.round), chain, micZ: getComputedStyle(b).zIndex, micPos: getComputedStyle(b).position, parentPos: getComputedStyle(e.parentElement).position, sibs: [...e.parentElement.children].map(c => c.tagName + '.' + String(c.className).slice(0, 20)) };
  }, sel);
  await P.evaluate(() => LowiKitchenGame.open()); await H.sleep(1800);
  console.log('KG', JSON.stringify(await info('#kgQ')));
  await P.screenshot({ path: '/home/sprite/mic-kg.png' });
  await P.evaluate(() => { try { LowiKitchenGame.close(); } catch (e) { } goTab('home'); }); await H.sleep(800);
  await P.evaluate(() => LowiStorePicks.open('home-bloom')); await H.sleep(1800);
  const fields = await P.evaluate(() => [...document.querySelectorAll('.stp-card input')].map(e => (e.id ? '#' + e.id : '') + '|' + e.name + '|' + e.className + '|' + e.getAttribute('data-gh')));
  console.log('SHOP fields', JSON.stringify(fields));
  for (const s of ['.stp-card input[name="snack"]', '.stp-card input[data-gh="q"]', '.stp-card input[type="search"]']) { console.log('SHOP', s, JSON.stringify(await info(s).catch(e => String(e)))); }
  await P.screenshot({ path: '/home/sprite/mic-shop.png' });
  await R.close(); process.exit(0);
})().catch(e => { console.error('FAILED', e); process.exit(1); });
