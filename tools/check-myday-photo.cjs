'use strict';
/* Nov 5 2026 phone check for the My day + photo result lane (task "My Day and scan simplification").
   A. My day: one Today card, grouped rows (no round bubbles), each row opens its old screen; Dark (true black) look.
   B. Photo of something that is not food (toothpaste): only the line, Retake photo and "It's food, let me type it";
      no name field, eat time, Log as meal, Save photo or GPT link until that tap. Retake reopens the camera.
   C. The AI consent: Allow once, reload the app, the next photo goes straight to the check (no second ask), and a food
      photo shows the normal result with the form.
   The photo check itself is faked locally (no Gemini call): GET says configured, POST answers is_food false / a dish.
   node tools/check-myday-photo.cjs [--engine webkit|chromium] [--lang en] [--out /tmp/mdp/shot] */
const H = require('./sim/harness.cjs'), path = require('path'), fs = require('fs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
(async () => {
  const engine = arg('engine', 'chromium'), lang = arg('lang', 'en'), out = arg('out', '/tmp/mdp/shot');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const root = path.join(__dirname, '..');
  const R = await H.open({ engine, root, lang, members: 5, messages: 5, probe: false, viewport: { width: 390, height: 844 } }), P = R.page;
  if (engine === 'webkit') await R.ctx.addInitScript({ path: path.join(__dirname, 'sim/no-media-init.js') });
  await R.ctx.addInitScript({ path: path.join(__dirname, 'sim/fake-cam-init.js') });
  await R.ctx.addInitScript(l => { try { localStorage.setItem('lowispike.lang', l); window.LOWI_FOOD_AI_URL = location.origin + '/fake-food-photo'; } catch (e) { } }, lang);
  let mode = 'none', posts = 0;
  await P.route(u => /\/fake-food-photo/.test(String(u)), r => {
    const q = r.request();
    if (q.method() === 'GET') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, configured: true, name: false, limit: 10, left: 9 }) });
    posts++;
    const body = mode === 'none' ? { is_food: false, confidence: 'high', note: 'A tube of toothpaste.', dishes: [] }
      : { is_food: true, confidence: 'high', note: '', dishes: [{ name: 'Apple', portion: '1 medium', grams: 180, kcal: 94, protein_g: 0.5, carbs_g: 25, sugar_g: 19, fiber_g: 4.4, fat_g: 0.3 }] };
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  const res = { engine, lang, checks: {} }; process.on('exit', () => { try { fs.writeFileSync(out + '-' + engine + '-res.json', JSON.stringify(res, null, 1)); } catch (e) { } });
  const ok = (k, v, info) => { res.checks[k] = v ? 'PASS' : 'FAIL' + (info !== undefined ? ' ' + JSON.stringify(info) : ''); };
  const errs = []; P.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  await R.goto(); await H.sleep(6000);
  const closeAll = () => P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } try { LowiDex.stop(); } catch (e) { } try { LowiSpirit.close(); } catch (e) { } });

  /* ---------- A. My day ---------- */
  const skipDay = process.argv.includes('--photo-only');
  if (!skipDay) {
  await P.evaluate(() => LowiMyDay.open()); await H.sleep(1500);
  var day = await P.evaluate(() => {
    const d = [...document.querySelectorAll('#myDay')].find(e => !e.closest('.r2-ov.off')); if (!d) return null;
    const rows = [...d.querySelectorAll('.mh-row')].map(b => { const r = b.getBoundingClientRect(); return { k: b.dataset.myday, t: b.querySelector('b').textContent, s: (b.querySelector('small') || {}).textContent || '', h: Math.round(r.height), w: Math.round(r.width) }; });
    const sh = d.closest('.r2-sh'), card = d.querySelector('.mh-dcard');
    return { rows, orbs: d.querySelectorAll('.mh-orb').length, groups: [...d.querySelectorAll('.mh-dgrp')].map(e => e.textContent), card: card && card.textContent, btns: [...d.querySelectorAll('.mh-dbtn')].map(b => b.dataset.myday + ':' + Math.round(b.getBoundingClientRect().height)), overflowX: sh ? sh.scrollWidth - sh.clientWidth : -1, vw: innerWidth };
  });
  res.day = day;
  ok('A1 My day opens', !!day);
  if (day) {
    ok('A2 no round bubbles left in My day', day.orbs === 0, day.orbs);
    ok('A3 grouped rows, each at least 44 pt tall', day.rows.length >= 3 && day.rows.every(r => r.h >= 44), day.rows.map(r => r.h));
    ok('A4 Today card with Catch up / Day recap buttons', !!day.card && day.btns.length >= 1 && day.btns.every(b => +b.split(':')[1] >= 44), day.btns);
    ok('A5 nothing wider than the phone', day.overflowX <= 0, day.overflowX);
    ok('A6 old vague names gone (Extras, Your plate)', !day.rows.some(r => /^(Extras|Your plate)$/.test(r.t)), day.rows.map(r => r.t));
  }
  await R.shot(out + '-' + engine + '-myday.png');
  /* every row still opens what it opened before */
  const opened = {};
  for (const r of (day ? day.rows : [])) {
    await closeAll(); await H.sleep(500);
    await P.evaluate(() => LowiMyDay.open()); await H.sleep(900);
    await P.evaluate(k => { const b = [...document.querySelectorAll('#myDay [data-myday="' + k + '"]')].find(e => !e.closest('.r2-ov.off')); b && b.click(); }, r.k);
    await H.sleep(1400);
    opened[r.k] = await P.evaluate(() => { const ovs = [...document.querySelectorAll('.r2-ov:not(.off), .in-ov:not(.off)')].filter(o => !o.querySelector('#myDay')); const top = ovs[ovs.length - 1]; return { myDayGone: ![...document.querySelectorAll('#myDay')].some(e => !e.closest('.r2-ov.off')), sheet: !!top, txt: top ? top.textContent.replace(/\s+/g, ' ').trim().slice(0, 70) : '' }; });
  }
  res.opened = opened;
  ok('A7 every row closes My day and opens a sheet', Object.keys(opened).length > 0 && Object.values(opened).every(o => o.myDayGone && o.sheet), opened);
  await closeAll(); await H.sleep(500);
  /* Dark (true black) */
  await P.evaluate(() => { document.documentElement.setAttribute('data-black', ''); try { window.LowiTrueBlack && LowiTrueBlack.apply && LowiTrueBlack.apply(); } catch (e) { } });
  await P.evaluate(() => LowiMyDay.open()); await H.sleep(1200);
  res.dark = await P.evaluate(() => { const d = [...document.querySelectorAll('#myDay')].find(e => !e.closest('.r2-ov.off')); const c = s => { const e = d && d.querySelector(s); return e ? getComputedStyle(e).backgroundColor : ''; }; return { list: c('.mh-list'), card: c('.mh-dcard'), rowIc: c('.mh-row-ic') }; });
  await R.shot(out + '-' + engine + '-myday-dark.png');
  await closeAll(); await P.evaluate(() => document.documentElement.removeAttribute('data-black')); await H.sleep(500);
  }

  /* ---------- B. photo of toothpaste ---------- */
  /* the photo goes in the way a gallery pick does (the sim has no camera frames): a .sp-file-in input, the same sheet as the shutter */
  const IMG = path.join(root, 'icon-512.png');
  const snap = async () => {
    await P.evaluate(() => { let i = document.getElementById('mdpIn'); if (!i) { i = document.createElement('input'); i.type = 'file'; i.id = 'mdpIn'; i.className = 'sp-file-in'; i.style.cssText = 'position:fixed;left:-99px'; document.body.appendChild(i); } });
    await P.setInputFiles('#mdpIn', IMG);
    for (let i = 0; i < 20; i++) { await H.sleep(500); if (await P.evaluate(() => !!document.getElementById('spMeal'))) break; }
    (res.snaps = res.snaps || []).push(await P.evaluate(() => ({ meal: !!document.getElementById('spMeal'), lis: !!document.querySelector('.lis-scrim') })));
  };
  const seen = sel => P.evaluate(s => [...document.querySelectorAll(s)].some(e => { if (e.closest('.r2-ov.off')) return false; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden'; }), sel);
  mode = 'none';
  res.consentBefore = await P.evaluate(() => localStorage.getItem('lowi.aiConsent.v1'));
  await snap();
  let asked = false;
  for (let i = 0; i < 20; i++) { await H.sleep(500); if (await P.evaluate(() => !!document.querySelector('.lis-scrim [data-lis="yes"]'))) { asked = true; break; } }
  ok('B0 first photo asks for AI consent', asked);
  if (asked) { await R.shot(out + '-' + engine + '-consent.png'); await P.evaluate(() => document.querySelector('.lis-scrim [data-lis="yes"]').click()); }
  for (let i = 0; i < 30; i++) { await H.sleep(500); if (await P.evaluate(() => !!document.querySelector('.sp-ai.fai-none'))) break; }
  await H.sleep(600);
  const nf = { none: await seen('.sp-ai.fai-none'), retake: await seen('.fai-none-acts .fai-retake'), type: await seen('[data-fai-type]'), form: await seen('#spMeal input[name=title]'), submit: await seen('#spMeal button[type=submit]'), time: await seen('#spMeal .lm-tw'), save: await seen('.sp-photo-acts'), gpt: await seen('.sp-gpt'), msg: await P.evaluate(() => (document.querySelector('.sp-ai.fai-none .fai-msg') || {}).textContent || '') };
  res.noFood = nf;
  ok('B1 not-food line shown', nf.none, nf.msg);
  ok('B2 Retake photo is the main button', nf.retake);
  ok('B3 no name field, eat time, Log as meal, Save photo or GPT link', !nf.form && !nf.submit && !nf.time && !nf.save && !nf.gpt, nf);
  await R.shot(out + '-' + engine + '-nofood.png');
  res.dbg = await P.evaluate(() => { const b = document.querySelector('.sp-ai'); return { cls: b && b.className, html: b && b.innerHTML.slice(0, 400), lis: !!document.querySelector('.lis-scrim'), sh: (document.querySelector('#spMeal') || {}).parentNode && document.querySelector('#spMeal').parentNode.className }; });
  await P.evaluate(() => { const b = document.querySelector('[data-fai-type]'); b && b.click(); }); await H.sleep(600);
  const ty = { form: await seen('#spMeal input[name=title]'), submit: await seen('#spMeal button[type=submit]'), focus: await P.evaluate(() => document.activeElement && document.activeElement.name), gpt: await seen('.sp-gpt') };
  res.typeIt = ty;
  ok('B4 "It\'s food" brings back the form and focuses the name', ty.form && ty.submit && ty.focus === 'title', ty);
  await R.shot(out + '-' + engine + '-nofood-type.png');
  /* retake from a fresh not-food sheet */
  await closeAll(); await H.sleep(800);
  await snap();
  for (let i = 0; i < 30; i++) { await H.sleep(500); if (await P.evaluate(() => !!document.querySelector('.sp-ai.fai-none .fai-retake'))) break; }
  ok('B5 second photo: no consent ask once allowed', !(await P.evaluate(() => !!document.querySelector('.lis-scrim'))));
  await P.evaluate(() => { const b = document.querySelector('.sp-ai.fai-none .fai-retake'); b && b.click(); }); await H.sleep(2500);
  ok('B6 Retake photo opens the camera again', await P.evaluate(() => !!document.getElementById('b3Cam') || !!document.querySelector('.r2-ov:not(.off) .sp-cam, .sp-cam, [data-st="starting"], [data-st="live"], [data-st="denied"], [data-st="nocam"]')), await P.evaluate(() => [...document.querySelectorAll('[id],[data-st]')].filter(e => /cam/i.test(e.id || '') || e.dataset.st).map(e => e.id + ':' + (e.dataset.st || '')).slice(0, 8)));
  await closeAll(); await H.sleep(800);

  /* ---------- C. consent after a reload, and a food photo ---------- */
  res.consentAfterAllow = await P.evaluate(() => localStorage.getItem('lowi.aiConsent.v1'));
  await R.goto(); await H.sleep(6000);
  res.consentAfterReload = await P.evaluate(() => localStorage.getItem('lowi.aiConsent.v1'));
  ok('C1 consent kept after reload', res.consentAfterReload === 'yes', res.consentAfterReload);
  mode = 'food'; const p0 = posts;
  await snap();
  let askedAgain = false;
  for (let i = 0; i < 30; i++) { await H.sleep(500); if (await P.evaluate(() => !!document.querySelector('.lis-scrim'))) { askedAgain = true; break; } if (posts > p0 && await P.evaluate(() => { const b = document.querySelector('.sp-ai'); return b && !/fai-wait/.test(b.className); })) break; }
  await H.sleep(1200);
  ok('C2 no second consent ask after reload; photo went to the check', !askedAgain && posts > p0, { askedAgain, posts: posts - p0 });
  const fd = { nofoodCls: await P.evaluate(() => !!document.querySelector('.r2-sh.fai-nofood')), submit: await seen('#spMeal button[type=submit]'), title: await P.evaluate(() => (document.querySelector('#spMeal input[name=title]') || {}).value || ''), box: await P.evaluate(() => (document.querySelector('.sp-ai') || {}).className || '') };
  res.food = fd;
  ok('C3 food photo: normal result, Log button there', !fd.nofoodCls && fd.submit, fd);
  await R.shot(out + '-' + engine + '-food.png');
  res.errs = errs.slice(0, 6).concat(R.errs.slice(0, 6).map(e => e.m));
  console.log(JSON.stringify(res, null, 1));
  await R.close();
})().catch(e => { console.error(e); process.exit(1); });
