/* Checks the admin "Remove from community" in a simulated iPhone 13 (tools/sim/harness.cjs).
   node tools/community-remove/check.cjs <chromium|webkit> <de|en|es> [url]
   Local (no url): the server is a stand-in route here, so it checks the app side: the button only for the admin, the confirm,
     the person leaving every list, Restore, and the calm screen for a removed person.
   Live (url): real server, three throwaway anonymous TEST accounts (lowi_test:true, hidden from real people):
     A = the admin for a moment (CR_ADMIN_ON / CR_ADMIN_OFF shell commands with {uid}), V = a normal viewer, T = the target.
     Prints "IDS a v t" first so the caller can delete them afterwards even if a step fails. Writes nothing for real people. */
'use strict';
const H = require('../sim/harness.cjs');
const { execSync } = require('child_process');
const fs = require('fs');
const [engine = 'chromium', lang = 'de', url = ''] = process.argv.slice(2);
const out = '/tmp/cr-shots'; fs.mkdirSync(out, { recursive: true });
const res = []; const ok = (n, p, d) => { res.push({ n, pass: !!p }); console.log((p ? '  ok   ' : '  FAIL ') + n + (p ? '' : '  ' + JSON.stringify(d === undefined ? '' : d).slice(0, 400))); };
const slow = engine === 'webkit' ? 2 : 1;
(async () => {
    const R = await H.open({ engine, lang, url: url || undefined, name: 'CR Test', fresh: true });
    const P = R.page;
    /* local stand-in for the server */
    const SV = { admin: false, out: false, kicks: [], names: {} };
    const TID = '9b1d2c3e-4f50-4a61-8b72-0c93d4e5f6a7';
    if (!url) {
        await P.context().route(/\/rest\/v1\/rpc\/community_(is_admin|am_removed|remove|restore|removed_list)/, async r => {
            const fn = r.request().url().match(/community_([a-z_]+)/)[1]; let b = {}; try { b = JSON.parse(r.request().postData() || '{}'); } catch (e) { }
            const J = (s, d) => r.fulfill({ status: s, contentType: 'application/json', body: JSON.stringify(d) });
            if (fn === 'is_admin') return J(200, SV.admin);
            if (fn === 'am_removed') return J(200, SV.out);
            if (!SV.admin) return J(403, { code: '42501', message: 'not_admin' });
            if (fn === 'remove') { if (!SV.kicks.includes(b.target)) SV.kicks.push(b.target); return J(200, { removed: true, user_id: b.target }); }
            if (fn === 'restore') { SV.kicks = SV.kicks.filter(x => x !== b.target); return J(200, { removed: false, user_id: b.target }); }
            return J(200, SV.kicks.map(id => ({ user_id: id, name: SV.names[id] || 'Member', removed_at: new Date().toISOString() })));
        });
        await P.context().route(/\/rest\/v1\/community_kicks/, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SV.kicks.map(user_id => ({ user_id }))) }));
    }
    const tidy = () => P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } const g = document.getElementById('r2gate'); if (g) g.remove(); document.querySelectorAll('.dr-ov').forEach(x => x.remove()); document.documentElement.classList.remove('gate-boot', 'gate-up'); });
    const boot = async () => {
        await R.goto(); await H.sleep(7000 * slow);
        await P.evaluate(l => { try { window.LowiLang && LowiLang.set && LowiLang.set(l); } catch (e) { } }, lang); await H.sleep(1000);
        await tidy();
        await P.waitForFunction(() => { try { const s = LOWI_CLOUD_X.state(); return s && s.uid && s.live; } catch (e) { return false; } }, null, { timeout: 90000 }).catch(() => { });
        await P.evaluate(() => window.LowiCommunityRemove && LowiCommunityRemove.load(true)).catch(() => { });
        await H.sleep(1500 * slow);
        return P.evaluate(() => { try { return LOWI_CLOUD_X.state().uid || ''; } catch (e) { return ''; } });
    };
    /* scroll the sheet like a finger would: WebKit ignores scrollIntoView inside the card sheet */
    /* scroll the sheet like a finger would, then tap. Headless WebKit can leave the card sheet mid slide-in (its top below the
       screen, seen in a debug run), so a control still off screen after scrolling gets a click() instead, and the log says so. */
    const tap = async sel => {
        const vis = await P.evaluate(q => { const e = document.querySelector(q); if (!e) return 'missing'; e.scrollIntoView({ block: 'center' });
            for (let a = e.parentElement; a; a = a.parentElement) { const cs = getComputedStyle(a); if (a.scrollHeight > a.clientHeight + 2 && /auto|scroll/.test(cs.overflowY)) { const r = e.getBoundingClientRect(), ar = a.getBoundingClientRect(); a.scrollTop += (r.top + r.height / 2) - (ar.top + Math.min(ar.height, innerHeight) / 2); } }
            const r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2; const hit = y > 0 && y < innerHeight && document.elementFromPoint(x, y);
            return hit && (hit === e || e.contains(hit)) ? 'tap' : 'click'; }, sel);
        await H.sleep(400 * slow);
        if (vis === 'click') { console.log('    (' + sel + ': off screen in this engine, click() used)'); await P.evaluate(q => document.querySelector(q).click(), sel); }
        else await R.tap(sel);
    };
    const sessions = {};
    const become = async who => {
        await P.evaluate(s => { localStorage.setItem('lowi.auth', JSON.stringify(s)); localStorage.setItem('lowi.gate', 'done'); }, sessions[who]);
        return boot();
    };
    let T = null;
    let ids = {};
    const card = async (uid, name) => {
        await P.evaluate(() => window.goTab('foryou')); await H.sleep(1500 * slow); await tidy();
        await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } document.querySelectorAll('.cp-card, .cs-sheet').forEach(s => { const o = s.closest('.r2-ov') || s.closest('[class*=ov]'); if (o) o.remove(); else s.remove(); }); });
        await P.waitForFunction(() => !document.querySelector('.cp-card'), null, { timeout: 10000 }).catch(() => { });
        await P.evaluate(([u, n]) => LowiCommunity.openProfile(u, n), [uid, name]);
        await P.waitForSelector('.cp-card[data-person]', { timeout: 20000 * slow }).catch(() => { });
        await H.sleep(1200 * slow);
        return P.evaluate(() => { const c = document.querySelector('.cp-card[data-person]'), a = c && c.querySelector('.cr-admin'), b = a && a.querySelector('[data-cr="ask"]');
            const blk = c && c.querySelector('[data-chat="block"]'); const rb = b && b.getBoundingClientRect(), rk = blk && blk.getBoundingClientRect();
            return { card: !!c, person: c && c.getAttribute('data-person'), btn: !!(b && rb.height > 30), label: b && b.textContent.trim(), below: !!(rb && rk && rb.top >= rk.bottom - 1) }; });
    };
    try {
        let me = await boot();
        T = await P.evaluate(l => LowiCommunityRemoveCore.text(l), lang).catch(() => null);
        if (!T) throw new Error('community-remove-core.js not loaded');
        const build = await P.evaluate(() => { const s = [...document.scripts].map(x => x.src).find(x => /community-remove\.js\?v=/.test(x)); return s ? s.split('v=')[1] : 'missing'; });
        ok('community-remove.js loaded (build ' + build + ')', build !== 'missing', build);
        if (url) {
            /* three anonymous test accounts, marked lowi_test so real people never see them */
            const mk = await P.evaluate(async () => { const c = window.LOWI_CFG, outp = {};
                for (const k of ['a', 'v', 't']) { const q = await fetch(c.url + '/auth/v1/signup', { method: 'POST', headers: { apikey: c.key, 'Content-Type': 'application/json' }, body: JSON.stringify({ data: { lowi_test: true } }) });
                    const d = await q.json(); if (!q.ok || !d.access_token) return 'signup failed ' + q.status + ' ' + JSON.stringify(d).slice(0, 160); if (!d.expires_at) d.expires_at = Math.floor(Date.now() / 1000) + (d.expires_in || 3600); outp[k] = d; }
                return outp; });
            if (typeof mk === 'string') throw new Error(mk);
            for (const k of ['a', 'v', 't']) { sessions[k] = mk[k]; ids[k] = mk[k].user.id; }
            console.log('IDS ' + ids.a + ' ' + ids.v + ' ' + ids.t + ' ' + me);
            ok('three test accounts made, all marked test', ['a', 'v', 't'].every(k => mk[k].user.user_metadata && mk[k].user.user_metadata.lowi_test === true), Object.keys(mk));
            R.step = 'T first start';
            me = await become('t'); ok('target signed in', me === ids.t, me);
            ok('target is not removed yet: no calm screen', !(await P.evaluate(() => !!document.getElementById('crOut'))));
            const vis = async () => P.evaluate(async t => { const c = await LOWI_CLOUD_X.client(); const p = await c.from('profiles').select('id').eq('id', t); const k = await c.from('community_kicks').select('user_id').eq('user_id', t);
                return { profile: p.error ? 'err ' + p.error.message : p.data.length, kick: k.error ? 'err ' + k.error.message : k.data.length, hidden: LowiHiddenAccounts.isHidden(t), people: (LowiCommunity.people ? LowiCommunity.people() : []).some(x => (x.uid || x.id) === t) }; }, ids.t);
            R.step = 'viewer'; me = await become('v');
            let s = await vis(); ok('before: a normal account sees the target\'s profile', s.profile === 1 && s.kick === 0 && !s.hidden, s);
            ok('normal account: the server says not admin', (await P.evaluate(() => LowiCommunityRemove.state().admin)) === false);
            let c = await card(ids.t, 'CR Test'); ok('normal account: the card opens, with no Remove button', c.card && !c.btn, c);
            const forged = await P.evaluate(t => LowiCommunityRemove._rpc('community_remove', { target: t }), ids.t);
            ok('normal account: calling the server directly is refused (not_admin)', forged && forged.error && /not_admin|42501/.test(JSON.stringify(forged.error)), forged);
            await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } LowiCommunity.settings(); }); await H.sleep(2000 * slow);
            ok('normal account: no Removed people list in settings', !(await P.evaluate(() => !!document.querySelector('.cr-removed'))));
            R.step = 'admin'; execSync(process.env.CR_ADMIN_ON.replace(/\{uid\}/g, ids.a), { stdio: 'inherit' });
            me = await become('a');
            ok('test admin: the server says admin', (await P.evaluate(() => LowiCommunityRemove.state().admin)) === true);
        } else {
            SV.admin = false; await P.evaluate(() => LowiCommunityRemove.load(true)); await H.sleep(800);
            let c = await card(TID, 'Emmanuel'); ok('normal account: the card opens, with no Remove button', c.card && !c.btn, c);
            await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } LowiCommunity.settings(); }); await H.sleep(1500);
            ok('normal account: no Removed people list in settings', !(await P.evaluate(() => !!document.querySelector('.cr-removed'))));
            SV.admin = true; SV.names[TID] = 'Emmanuel'; await P.evaluate(() => LowiCommunityRemove.load(true)); await P.waitForFunction(() => LowiCommunityRemove.state().admin === true, null, { timeout: 20000 }).catch(() => { });
            ids.t = TID;
        }
        R.step = 'remove';
        console.log('    state: ' + JSON.stringify(await P.evaluate(() => { let c = null; try { c = LOWI_CLOUD_X.state(); } catch (e) { } return { st: LowiCommunityRemove.state(), cloud: c && { uid: !!c.uid, live: c.live, phase: c.phase } }; })));
        let c = await card(ids.t, url ? 'CR Test' : 'Emmanuel');
        ok('admin: "' + T.btn + '" on the card, below Block person', c.btn && c.label.indexOf(T.btn) >= 0 && c.below, c);
        await R.shot(out + '/' + engine + '-' + lang + (url ? '-live' : '') + '-button.png');
        await tap('.cp-card .cr-admin [data-cr="ask"]'); await H.sleep(900 * slow);
        console.log('    after ask: ' + await P.evaluate(() => { const f = document.querySelectorAll('.cp-card .cr-confirm'); return f.length + ' confirm(s), hidden=' + [...f].map(x => x.hidden).join(',') + ' ask=' + LowiCommunityRemove.state().ask; }));
        const cf = await P.evaluate(() => { const f = document.querySelector('.cp-card .cr-confirm'); return f && !f.hidden ? f.textContent : ''; });
        ok('one confirm step with a clear sentence', cf.indexOf(T.yes) >= 0 && cf.length > 80, cf.slice(0, 160));
        await R.shot(out + '/' + engine + '-' + lang + (url ? '-live' : '') + '-confirm.png');
        await tap('.cp-card .cr-confirm [data-cr="yes"]');
        await P.waitForFunction(() => { const r = document.querySelector('.cp-card .cr-result'); return r && r.textContent.trim(); }, null, { timeout: 30000 }).catch(() => { });
        const done = await P.evaluate(t => ({ text: (document.querySelector('.cp-card .cr-result') || {}).textContent, removed: LowiHiddenAccounts.isRemoved(t), hidden: LowiHiddenAccounts.isHidden(t), bot: LowiBotAccounts.isBot(t) }), ids.t);
        ok('removed: the card says so, and the person is hidden at once', /\S/.test(done.text) && done.removed && done.hidden && done.bot && (url || SV.kicks.includes(TID)), done);
        await R.shot(out + '/' + engine + '-' + lang + (url ? '-live' : '') + '-done.png');
        if (url) {
            R.step = 'viewer after'; await become('v');
            const s = await P.evaluate(async t => { const c = await LOWI_CLOUD_X.client(); const p = await c.from('profiles').select('id').eq('id', t); const k = await c.from('community_kicks').select('user_id').eq('user_id', t);
                return { profile: p.error ? 'err' : p.data.length, kick: k.error ? 'err' : k.data.length, hidden: LowiHiddenAccounts.isHidden(t), people: (LowiCommunity.people ? LowiCommunity.people() : []).some(x => (x.uid || x.id) === t) }; }, ids.t);
            ok('after: the server hides the profile from a normal account, the app hides the person, not in the people list', s.profile === 0 && s.kick === 1 && s.hidden && !s.people, s);
            R.step = 'target after'; await become('t');
            await P.evaluate(() => window.goTab('foryou')); await H.sleep(2500 * slow);
            const o = await P.evaluate(() => { const e = document.getElementById('crOut'), r = e && e.getBoundingClientRect(); return { on: !!(e && r.width > 300 && r.height > 500), text: e && e.textContent }; });
            ok('the removed person sees "' + T.outTitle + '"', o.on && o.text.indexOf(T.outTitle) >= 0, o);
            await R.shot(out + '/' + engine + '-' + lang + '-live-out.png');
            const post = await P.evaluate(async t => { const c = await LOWI_CLOUD_X.client(); const r = await c.from('messages').insert({ id: 'cr-' + Date.now(), user_id: t, room: 'all', who: 'CR Test', body: 'cr-test' }).select('id'); return r.error ? r.error.message : 'posted ' + JSON.stringify(r.data); }, ids.t);
            ok('the removed person cannot post (server refuses)', /row-level security/i.test(post), post);
            if (/^posted/.test(post)) console.log('WARNING a test message was posted: ' + post);
            R.step = 'admin restore'; await become('a');
        }
        R.step = 'restore';
        await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } window.goTab('foryou'); }); await H.sleep(1200 * slow);
        await P.evaluate(() => LowiCommunity.settings()); await H.sleep(1000 * slow);
        await P.waitForSelector('.cr-removed .cr-item[data-cr-id="' + ids.t + '"]', { timeout: 30000 }).catch(() => { });
        const li = await P.evaluate(t => { const s = document.querySelector('.cr-removed'); return { list: !!s, title: s && s.querySelector('h2').textContent, item: !!(s && s.querySelector('.cr-item[data-cr-id="' + t + '"]')) }; }, ids.t);
        ok('admin: "' + T.list + '" in Community settings shows the person', li.list && li.title.indexOf(T.list) >= 0 && li.item, li);
        await P.evaluate(() => document.querySelector('.cr-removed').scrollIntoView({ block: 'center' })); await H.sleep(500);
        await R.shot(out + '/' + engine + '-' + lang + (url ? '-live' : '') + '-list.png');
        await tap('.cr-removed .cr-item[data-cr-id="' + ids.t + '"] [data-cr="restore"]');
        await P.waitForFunction(t => !document.querySelector('.cr-removed .cr-item[data-cr-id="' + t + '"]'), ids.t, { timeout: 30000 }).catch(() => { });
        const rs = await P.evaluate(t => ({ gone: !document.querySelector('.cr-removed .cr-item[data-cr-id="' + t + '"]'), text: (document.querySelector('.cr-removed > .cr-result') || {}).textContent, removed: LowiHiddenAccounts.isRemoved(t), hidden: LowiHiddenAccounts.isHidden(t) }), ids.t);
        ok('Restore: the person is back', rs.gone && /\S/.test(rs.text) && !rs.removed && (url ? true : !rs.hidden) && (url || !SV.kicks.includes(TID)), rs);
        if (url) {
            execSync(process.env.CR_ADMIN_OFF.replace(/\{uid\}/g, ids.a), { stdio: 'inherit' });
            R.step = 'viewer restored'; await become('v');
            const s = await P.evaluate(async t => { const c = await LOWI_CLOUD_X.client(); const p = await c.from('profiles').select('id').eq('id', t); return { profile: p.error ? 'err' : p.data.length, hidden: LowiHiddenAccounts.isRemoved(t) }; }, ids.t);
            ok('after Restore a normal account sees the profile again', s.profile === 1 && !s.hidden, s);
            await become('t'); await P.evaluate(() => window.goTab('foryou')); await H.sleep(2000 * slow);
            ok('and the person no longer sees the calm screen', !(await P.evaluate(() => !!document.getElementById('crOut'))));
        } else {
            R.step = 'removed person'; SV.admin = false; SV.out = true;
            await P.evaluate(() => { try { LowiR2.closeAll(); } catch (e) { } LowiCommunityRemove.load(true); window.goTab('foryou'); }); await H.sleep(2500 * slow);
            const o = await P.evaluate(() => { const e = document.getElementById('crOut'), r = e && e.getBoundingClientRect(); return { on: !!(e && r.width > 300 && r.height > 500), text: e && e.textContent }; });
            ok('a removed person sees "' + T.outTitle + '" over Community', o.on && o.text.indexOf(T.outTitle) >= 0, o);
            await R.shot(out + '/' + engine + '-' + lang + '-out.png');
            await tidy(); console.log('    top at Home button: ' + await P.evaluate(() => { const b = document.querySelector('#crOut [data-cr=home]'); b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); let e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2), p = []; for (let i = 0; e && i < 5; i++, e = e.parentElement) p.push(e.tagName + '#' + e.id + '.' + String(e.className).slice(0, 40)); return p.join(' < '); }));
            await tap('#crOut [data-cr="home"]'); await H.sleep(1500 * slow);
            ok('"' + T.outHome + '" goes back to Home', await P.evaluate(() => !document.getElementById('tab-foryou').classList.contains('active') || document.querySelector('.tab.active') && document.querySelector('.tab.active').id !== 'tab-foryou'));
            SV.out = false; await P.evaluate(() => LowiCommunityRemove.load(true)); await H.sleep(800);
            ok('restored: the calm screen goes away', !(await P.evaluate(() => !!document.getElementById('crOut'))));
        }
        ok('no page errors', R.errs.length === 0, R.errs.slice(0, 3));
    } catch (e) {
        ok('run finished (step ' + R.step + ')', false, String(e && e.message || e).slice(0, 300));
        if (url && ids.a) try { execSync(process.env.CR_ADMIN_OFF.replace(/\{uid\}/g, ids.a), { stdio: 'inherit' }); } catch (er) { }
    }
    await R.close();
    const f = res.filter(r => !r.pass).length;
    console.log((f ? 'FAILED ' : 'ALL PASS ') + (res.length - f) + '/' + res.length + ' ' + engine + ' ' + lang + (url ? ' live' : ' local'));
    process.exit(f ? 1 : 0);
})();
