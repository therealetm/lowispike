'use strict';
/* P4: a brand-new person (empty storage). Walks the first-run screens like a person would: reads each screen, tries Back,
   submits an empty name, types a name and presses Enter, then the account step. Sign-up cannot reach the server here (every
   non-GET and every other host is blocked), so this also shows what a person sees when sign-up fails. */
const L = require('./lib.cjs');
const lang = process.argv[3] || 'en';
(async () => {
  const h = await L.launch({ device: process.argv[2] || 'iPhone 13', seed: null, locale: lang === 'de' ? 'de-DE' : lang === 'es' ? 'es-ES' : 'en-US' });
  const { page } = h;
  await page.goto(L.BASE, { waitUntil: 'load', timeout: 120000 }); await L.sleep(9000);
  const screen = async tag => {
    const s = await page.evaluate(() => {
      const vis = e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 1 && r.height > 1 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05; };
      const root = [...document.querySelectorAll('.r2-ov,.r2-start,#r2ob,.hs-ivov,[aria-modal=true]')].filter(vis).pop() || document.body;
      const txt = [...root.querySelectorAll('h1,h2,h3,p,li,label,small')].filter(vis).map(e => e.innerText.trim().replace(/\s+/g, ' ')).filter(Boolean).slice(0, 18);
      const btn = [...root.querySelectorAll('button,a[href],input,select,textarea')].filter(vis).map(e => { const r = e.getBoundingClientRect(); return (e.getAttribute('aria-label') || e.innerText || e.placeholder || e.type || '').trim().replace(/\s+/g, ' ').slice(0, 60) + ' [' + Math.round(r.width) + 'x' + Math.round(r.height) + '@' + Math.round(r.top) + (r.bottom > innerHeight ? ' OFFSCREEN' : '') + ']'; });
      const sc = document.scrollingElement; const inner = [...root.querySelectorAll('*')].filter(e => e.scrollHeight > e.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(e).overflowY)).length;
      return { root: root.className && String(root.className).slice(0, 60), step: (document.querySelector('[data-hs-step]') || {}).dataset ? (document.querySelector('[data-hs-step]') || { dataset: {} }).dataset.hsStep : '', txt, btn, scrollables: inner, html: [...document.documentElement.classList].filter(c => /gate|ob|setup|wh-home/.test(c)).join(' ') };
    });
    console.log('### ' + tag + '\n' + JSON.stringify(s));
    await L.shot(page, 'p4-' + lang + '-' + tag.replace(/\W+/g, '_'));
    return s;
  };
  const click = async (sel, tag) => { const ok = await L.tap(page, sel); console.log('tap ' + sel + ' -> ' + ok); await L.sleep(1800); return screen(tag); };
  await screen('first-open');
  await click('[data-hs="plant"]', 'after-plant');
  await click('[data-hs="back"]', 'back-from-1');
  await click('[data-hs="plant"]', 'plant-again');
  await click('[data-hs="name"]', 'step2-play');
  await click('[data-hs="play"]', 'step3-name');
  await click('[data-hs="you"]', 'empty-name-submit');
  console.log('focus after empty submit', (await L.top(page)).focus);
  await page.locator('#hsYou').fill('Emma ');
  await page.locator('#hsYou').press('Enter'); await L.sleep(2200);
  await screen('step4-reward');
  await click('[data-r2a="signup"]', 'signup-sheet');
  const inputs = await page.evaluate(() => [...document.querySelectorAll('input')].filter(e => e.getBoundingClientRect().width > 1).map(e => [e.type, e.name || e.id, e.autocomplete, e.getAttribute('inputmode'), e.getAttribute('aria-label') || (e.labels && e.labels[0] && e.labels[0].innerText) || e.placeholder]));
  console.log('inputs', JSON.stringify(inputs));
  // try email sign-up with bad then plausible values, see the error copy (server unreachable here)
  const email = page.locator('input[type=email]:visible').first();
  if (await email.count()) {
    await email.fill('not-an-email'); const pw = page.locator('input[type=password]:visible').first(); if (await pw.count()) await pw.fill('x');
    const submit = page.locator('.r2-ov button[type=submit]:visible, .r2-ov .r2-btn.pri:visible').first();
    if (await submit.count()) { await submit.click({ force: true }).catch(() => { }); await L.sleep(1500); await screen('signup-bad-email'); }
    await email.fill('newperson@example.invalid'); if (await pw.count()) await pw.fill('correct horse battery 9');
    if (await submit.count()) { await submit.click({ force: true }).catch(() => { }); await L.sleep(4000); await screen('signup-server-unreachable'); }
  }
  // is there a way on without an account?
  const ways = await page.evaluate(() => [...document.querySelectorAll('button,a')].filter(e => e.getBoundingClientRect().width > 1 && getComputedStyle(e).visibility !== 'hidden').map(e => (e.innerText || e.getAttribute('aria-label') || '').trim()).filter(t => /later|skip|without|not now|continue|close|back|sp\u00e4ter|ohne|m\u00e1s tarde|sin cuenta/i.test(t)));
  console.log('ways-on', JSON.stringify(ways));
  console.log('errors', JSON.stringify(h.errors)); console.log('blocked', JSON.stringify(h.blocked));
  await h.browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
