'use strict';
/* Companion one of a kind (Oct 24, 2026), in the browser like a user, at phone and tablet size:
   A  a new account opens Profile > companion, brings one to life for 1990-08-01, keeps it; after a reload it is the same one;
   B  a second new account with the same birthday gets a different companion;
   S  "sync": a fresh device that gets A's lowispike.* keys (as the account backup / sync brings them) shows A's companion;
   L  an existing companion (record without salt) looks exactly as the old formula draws it, and re-opening the creator with
      the same birthday keeps it and adds no salt.
   Also: no page errors, the reveal fits the screen (no sideways overflow, buttons at least 40 px).
   node tools/check-companion-unique.cjs [iphone|ipad] [url] [lang] [outdir]   (no url = this folder served locally)
   Runs in mobile Chromium at iPhone 13 (390x844) or iPad Air (820x1180) size: this machine has no WebKit libraries. */
const H = require('./sim/harness.cjs'), fs = require('fs'), path = require('path');
const device = process.argv[2] || 'iphone', url = process.argv[3] || '', lang = process.argv[4] || 'en', out = process.argv[5] || '/tmp/cunique';
fs.mkdirSync(out, { recursive: true });
const tag = (device + '-' + lang).replace(/\W/g, '');
const res = []; const ok = (name, pass, info) => { res.push({ name, pass: !!pass, info }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (info ? ' ' + JSON.stringify(info) : '')); };
const KEY = 'lowispike.companion.v1', SALT = 'lowispike.companion.salt.v1';

async function session(pre, name) {
    const R = await H.open({ engine: 'chromium', viewport: /ipad/i.test(device) ? { width: 820, height: 1180 } : { width: 390, height: 844 }, dpr: /ipad/i.test(device) ? 2 : 3, url, lang, probe: false, members: 3, messages: 3 });
    if (pre) await R.ctx.addInitScript(([p]) => { try { if (!sessionStorage.getItem('cu.init')) { sessionStorage.setItem('cu.init', '1'); for (const k in p) localStorage.setItem(k, p[k]); } } catch (e) { } }, [pre]);
    await R.ctx.addInitScript(([l]) => { try { localStorage.setItem('lowispike.lang', l); localStorage.setItem('lowi.lang', l); } catch (e) { } }, [lang]);
    await R.goto(); await H.sleep(5000);
    R.name = name; return R;
}
const state = R => R.page.evaluate(([K, S]) => { const B = window.LowiBirthCompanion, c = B && B.has() ? B.get() : null; return { rec: localStorage.getItem(K), salt: localStorage.getItem(S), c: c && { v: c.v, salt: c.salt, look: c.look, palette: c.palette, name: c.name, sign: c.sign } }; }, [KEY, SALT]);
/* open the creator from Profile (the real button) and bring the companion to life */
async function bringToLife(R, shot) {
    await R.page.evaluate(() => { window.goTab && goTab('profile'); }); await H.sleep(1500);
    const card = await R.page.$('#lcProf');
    if (card) { await R.page.evaluate(() => document.getElementById('lcProf').scrollIntoView({ block: 'center' })); await H.sleep(500); await R.tap('#lcProf').catch(() => { }); }
    await H.sleep(900);
    if (!(await R.page.$('#lcOv [data-lcgo]'))) { R.via = 'api'; await R.page.evaluate(() => window.LowiBirthCompanion.openCreator()); await H.sleep(900); }
    await R.page.evaluate(() => { const b = document.querySelector('#lcB'); if (b && !b.value) b.value = '1990-08-01'; });
    await R.tap('#lcOv [data-lcgo]').catch(async () => { R.via = (R.via || '') + '+click'; await R.page.evaluate(() => document.querySelector('#lcOv [data-lcgo]').click()); });
    await H.sleep(2600);
    const fit = await R.page.evaluate(() => {
        const ov = document.getElementById('lcOv'); if (!ov) return { none: true };
        const card = ov.querySelector('.lc-card').getBoundingClientRect(), small = [];
        ov.querySelectorAll('button').forEach(b => { const r = b.getBoundingClientRect(); if (r.width && r.height && (r.height < 40 || r.width < 40) && !b.hasAttribute('data-lcx')) small.push((b.innerText || b.className).trim().slice(0, 20) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); });
        return { cardL: Math.round(card.left), cardR: Math.round(card.right), vw: innerWidth, sideways: document.documentElement.scrollWidth > innerWidth + 1, small, name: (ov.querySelector('.lc-name') || {}).textContent || '' };
    });
    if (shot) await R.shot(path.join(out, tag + '-' + shot + '.png'));
    fit.via = R.via || 'tap';
    const go = await R.page.$('#lcOv [data-lc=go]'); if (go) { await R.tap('#lcOv [data-lc=go]').catch(() => R.page.evaluate(() => document.querySelector('#lcOv [data-lc=go]').click())); await H.sleep(1200); }
    return fit;
}

(async () => {
    /* A: new account */
    const A = await session(null, 'A');
    const fitA = await bringToLife(A, 'A-reveal');
    ok('reveal fits the screen', !fitA.none && !fitA.sideways && fitA.cardL >= 0 && fitA.cardR <= fitA.vw && !fitA.small.length, fitA);
    const a1 = await state(A);
    ok('A: new companion is v2 with a stored salt', a1.c && a1.c.v === 2 && a1.c.salt && JSON.parse(a1.rec).salt === a1.c.salt && a1.salt === a1.c.salt, { v: a1.c && a1.c.v, salt: a1.c && a1.c.salt, name: a1.c && a1.c.name });
    await A.goto(); await H.sleep(4000);
    const a2 = await state(A);
    ok('A: after a reload the very same companion', a2.c && JSON.stringify(a2.c) === JSON.stringify(a1.c));
    await A.page.evaluate(() => { window.goTab && goTab('profile'); }); await H.sleep(1500); await A.shot(path.join(out, tag + '-A-profile.png'));
    const errsA = A.errs.slice(); const keysA = { [KEY]: a1.rec, [SALT]: a1.salt };
    await A.close();
    /* B: another new account, same birthday */
    const B = await session(null, 'B');
    await bringToLife(B, 'B-reveal');
    const b1 = await state(B);
    const diff = b1.c && a1.c && JSON.stringify([b1.c.look, b1.c.palette]) !== JSON.stringify([a1.c.look, a1.c.palette]);
    ok('B: same birthday, different account -> different companion', diff && b1.c.salt !== a1.c.salt, { A: a1.c && a1.c.look, B: b1.c && b1.c.look, Aname: a1.c && a1.c.name, Bname: b1.c && b1.c.name });
    ok('B: same sign as A (birthday still the base)', b1.c && a1.c && b1.c.sign === a1.c.sign, { sign: b1.c && b1.c.sign });
    const errsB = B.errs.slice(); await B.close();
    /* S: a second device of account A */
    const S = await session(keysA, 'S');
    const s1 = await state(S);
    ok('second device of the same account shows the same companion', s1.c && JSON.stringify(s1.c) === JSON.stringify(a1.c), { name: s1.c && s1.c.name });
    const errsS = S.errs.slice(); await S.close();
    /* L: an existing (older) companion */
    const old = { v: 1, bday: '1990-08-01', btime: '', n: 1, name: 'Bubbles', created: 1700000000000 };
    const L = await session({ [KEY]: JSON.stringify(old) }, 'L');
    const l1 = await state(L);
    const ref = await L.page.evaluate(o => { const c = window.LowiBirthCompanionCore.generate({ bday: o.bday, btime: o.btime, n: o.n, name: o.name }); return { look: c.look, palette: c.palette }; }, old);
    ok('existing companion keeps its look, colours and name, v1, no salt', l1.c && l1.c.v === 1 && !l1.c.salt && l1.c.name === 'Bubbles' && JSON.stringify([l1.c.look, l1.c.palette]) === JSON.stringify([ref.look, ref.palette]) && !l1.salt, { look: l1.c && l1.c.look });
    await bringToLife(L, 'L-reveal');
    const l2 = await state(L);
    ok('existing companion: creator with the same birthday keeps it, adds no salt', l2.c && !JSON.parse(l2.rec).salt && JSON.stringify(l2.c.look) === JSON.stringify(l1.c.look) && l2.c.name === 'Bubbles', { rec: l2.rec });
    const errsL = L.errs.slice(); await L.close();
    const errs = [...errsA, ...errsB, ...errsS, ...errsL];
    ok('no page errors', !errs.length, errs.slice(0, 5));
    const pass = res.filter(r => r.pass).length;
    console.log('RESULT ' + tag + ' ' + pass + '/' + res.length);
    fs.writeFileSync(path.join(out, tag + '.json'), JSON.stringify(res, null, 1));
    process.exit(pass === res.length ? 0 : 1);
})().catch(e => { console.log('CRASH', e && e.stack); process.exit(2); });
