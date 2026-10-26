/* Checks the admin "Delete account" button on a person's card (26 Oct 2026) in a simulated iPhone 13 (tools/sim/harness.cjs).
   node tools/admin-delete/check.cjs <chromium|webkit> <de|en|es> [url]
   Local (no url): the server is a stand-in route here (functions/v1/owner-delete-account, community_deleted).
   Live (url): real server, three throwaway anonymous TEST accounts (lowi_test:true, hidden from real people):
     A = the admin for a moment (tools/admin-delete/admin-toggle.sh), V = a normal viewer, T = the target that gets DELETED.
     Prints "IDS a v t" first; the caller deletes A and V afterwards (tools/admin-delete/live.sh). Touches no real person.
   Both: the button only for the admin, a confirm that says it can't be undone, a server failure (forced 500) shows an error
   and keeps the person, then the real delete: "deleted" on the card, the person gone from every list, also after a reload. */
'use strict';
const H = require('../sim/harness.cjs');
const { execSync } = require('child_process');
const fs = require('fs');
const [engine = 'chromium', lang = 'de', url = ''] = process.argv.slice(2);
const out = '/tmp/ad-shots'; fs.mkdirSync(out, { recursive: true });
const res = [], notes = []; const ok = (n, p, d) => { res.push({ n, pass: !!p }); console.log((p ? '  ok   ' : '  FAIL ') + n + (p ? '' : '  ' + JSON.stringify(d === undefined ? '' : d).slice(0, 400))); };
const slow = engine === 'webkit' ? 2 : 1;
(async () => {
    const R = await H.open({ engine, lang, url: url || undefined, name: 'AD Test', fresh: true, cloud: url ? false : undefined });
    const P = R.page;
    /* local stand-in for the server */
    const SV = { admin: false, out: false, kicks: [], deleted: [], names: {} };
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
        await P.context().route(/\/rest\/v1\/community_deleted/, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SV.deleted.map(user_id => ({ user_id }))) }));
        await P.context().route(/\/functions\/v1\/owner-delete-account/, async r => {
            if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }, body: 'ok' });
            let b = {}; try { b = JSON.parse(r.request().postData() || '{}'); } catch (e) { }
            const J = (s, d) => r.fulfill({ status: s, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(d) });
            if (!SV.admin) return J(403, { error: 'not_owner' });
            if (b.confirm !== 'DELETE') return J(400, { error: 'confirm' });
            const id = (b.ids || [])[0]; SV.deleted.push(id); SV.kicks = SV.kicks.filter(x => x !== id); return J(200, { deleted: [id], failed: [], media_left: 0 });
        });
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
        if (vis === 'click') {
            /* 25 Oct release: live proof must be a real tap. Wait for the sheet to finish sliding in (up to 8 s), re-scrolling. */
            let v2 = vis;
            for (let i = 0; i < 16 && v2 !== 'tap'; i++) {
                await H.sleep(500);
                v2 = await P.evaluate(q => { const e = document.querySelector(q); if (!e) return 'missing'; e.scrollIntoView({ block: 'center' });
                    const r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2; const hit = y > 0 && y < innerHeight && document.elementFromPoint(x, y);
                    return hit && (hit === e || e.contains(hit)) ? 'tap' : 'click'; }, sel);
            }
            if (v2 !== 'tap') {
                const why = await P.evaluate(q => { const e = document.querySelector(q); const r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2; const h = document.elementFromPoint(x, y);
                    const d = n => n ? (n.tagName + '#' + n.id + '.' + String(n.className).slice(0, 60)) : 'none'; const chain = []; for (let a = e; a && chain.length < 14; a = a.parentElement) { const cs = getComputedStyle(a), rr = a.getBoundingClientRect(); chain.push(d(a).slice(0, 70) + ' mh' + cs.maxHeight + ' tr' + cs.transform.slice(0, 40) + ' t' + Math.round(rr.top) + ' b' + Math.round(rr.bottom) + ' sh' + a.scrollHeight + ' ch' + a.clientHeight + ' st' + Math.round(a.scrollTop) + ' ov' + cs.overflowY + ' pe' + cs.pointerEvents + ' pos' + cs.position); } const ine = e.closest('[inert]'); const g = document.getElementById('r2gate'); return { inert: ine ? d(ine) : '', html: document.documentElement.className.slice(0, 200), gate: g ? (g.hidden ? 'hidden' : 'shown') : 'none', all: (document.elementsFromPoint(x, y) || []).slice(0, 5).map(d), x: Math.round(x), y: Math.round(y), ih: innerHeight, vvh: visualViewport && visualViewport.height, hit: d(h), chain }; }, sel);
                if (url && engine === 'webkit' && why.y > 0 && why.y < why.ih) { notes.push('webkit hit-test miss mid-slide on ' + sel + ' (on screen at y' + why.y + '), clicked'); await P.$eval(sel, e => e.click()); return; }
                if (url) { try { require('fs').writeFileSync('/home/sprite/ad-why.json', JSON.stringify(why, null, 1)); } catch (e) { } ok('real tap possible on ' + sel, false, why); throw new Error('not tappable: ' + sel); }
                console.log('    (' + sel + ': off screen in this engine, click() used)'); await P.evaluate(q => document.querySelector(q).click(), sel); return;
            }
            console.log('    (' + sel + ': tapped after the sheet settled)');
        }
        await R.tap(sel);
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
        const TOG = (on, uid) => new Promise(ok2 => require('child_process').exec('tools/admin-delete/admin-toggle.sh ' + (on ? 'on ' : 'off ') + uid, () => ok2()));
        const vis = async t => P.evaluate(async t => { const c = await LOWI_CLOUD_X.client(); const p = await c.from('profiles').select('id').eq('id', t); const k = await c.from('community_kicks').select('user_id').eq('user_id', t); const d = await c.from('community_deleted').select('user_id').eq('user_id', t);
            return { profile: p.error ? 'err ' + p.error.message : p.data.length, kick: k.error ? 'err ' + k.error.message : k.data.length, tomb: d.error ? 'err ' + d.error.message : d.data.length, removed: LowiHiddenAccounts.isRemoved(t), hidden: LowiHiddenAccounts.isHidden(t), people: (LowiCommunity.people ? LowiCommunity.people() : []).some(x => (x.uid || x.id) === t) }; }, t);
        if (url) {
            const mk = await P.evaluate(async () => { const c = window.LOWI_CFG, outp = {};
                for (const k of ['a', 'v', 't']) { const q = await fetch(c.url + '/auth/v1/signup', { method: 'POST', headers: { apikey: c.key, 'Content-Type': 'application/json' }, body: JSON.stringify({ data: { lowi_test: true } }) });
                    const d = await q.json(); if (!q.ok || !d.access_token) return 'signup failed ' + q.status + ' ' + JSON.stringify(d).slice(0, 160); if (!d.expires_at) d.expires_at = Math.floor(Date.now() / 1000) + (d.expires_in || 3600); outp[k] = d; }
                return outp; });
            if (typeof mk === 'string') throw new Error(mk);
            for (const k of ['a', 'v', 't']) { sessions[k] = mk[k]; ids[k] = mk[k].user.id; }
            console.log('IDS ' + ids.a + ' ' + ids.v + ' ' + ids.t + ' ' + me);
            ok('three test accounts made, all marked test', ['a', 'v', 't'].every(k => mk[k].user.user_metadata && mk[k].user.user_metadata.lowi_test === true), Object.keys(mk));
            R.step = 'T first start'; me = await become('t'); ok('target signed in', me === ids.t, me);
            R.step = 'viewer'; me = await become('v');
            let s = await vis(ids.t); ok('before: a normal account sees the target\'s profile', s.profile === 1 && s.tomb === 0 && !s.removed, s);
            let c = await card(ids.t, 'AD Test'); ok('normal account: the card opens, with no Delete button', c.card && !c.btn, c);
            const forged = await P.evaluate(async t => { const c = await LOWI_CLOUD_X.client(); const r = await c.functions.invoke('owner-delete-account', { body: { ids: [t], confirm: 'DELETE' } }); return { status: r.error && r.error.context && r.error.context.status, data: r.data }; }, ids.t);
            ok('normal account: calling the delete directly is refused (403)', forged.status === 403 && !forged.data, forged);
            const forged2 = await P.evaluate(t => LowiCommunityRemove._rpc('community_delete_account', { target: t }), ids.t);
            ok('normal account: calling the database delete directly is refused (not_admin)', forged2 && forged2.error && /not_admin|42501/.test(JSON.stringify(forged2.error)), forged2);
            s = await vis(ids.t); ok('the target still exists after both refused calls', s.profile === 1 && s.tomb === 0, s);
            R.step = 'admin'; await TOG(true, ids.a);
            me = await become('a');
            ok('test admin: the server says admin', (await P.evaluate(() => LowiCommunityRemove.state().admin)) === true);
        } else {
            let c = await card(TID, 'Emmanuel'); ok('normal account: the card opens, with no Delete button', c.card && !c.btn, c);
            SV.admin = true; SV.names[TID] = 'Emmanuel'; await P.evaluate(() => LowiCommunityRemove.load(true)); await P.waitForFunction(() => LowiCommunityRemove.state().admin === true, null, { timeout: 20000 }).catch(() => { });
            ids.t = TID;
        }
        const NAME = url ? 'AD Test' : 'Emmanuel';
        R.step = 'ask';
        let c = await card(ids.t, NAME);
        ok('admin: "' + T.btn + '" on the card, below Block person', c.btn && c.label.indexOf(T.btn) >= 0 && c.below, c);
        await R.shot(out + '/' + engine + '-' + lang + (url ? '-live' : '') + '-button.png');
        await tap('.cp-card .cr-admin [data-cr="ask"]'); await H.sleep(900 * slow);
        const cf = await P.evaluate(() => { const f = document.querySelector('.cp-card .cr-confirm'); return f && !f.hidden ? f.textContent : ''; });
        ok('one confirm step that says the account is deleted for good', cf.indexOf(T.yes) >= 0 && cf.indexOf(T.body.split('{n}').pop().slice(-25)) >= 0, cf.slice(0, 220));
        await R.shot(out + '/' + engine + '-' + lang + (url ? '-live' : '') + '-confirm.png');
        R.step = 'server failure';
        await P.route(/\/functions\/v1\/owner-delete-account/, r => r.request().method() === 'OPTIONS' ? r.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }, body: 'ok' })
            : r.fulfill({ status: 500, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: '{"error":"boom"}' }));
        await tap('.cp-card .cr-confirm [data-cr="yes"]');
        await P.waitForFunction(() => { const r = document.querySelector('.cp-card .cr-result'); return r && r.textContent.trim(); }, null, { timeout: 30000 }).catch(() => { });
        let r1 = await P.evaluate(t => ({ text: (document.querySelector('.cp-card .cr-result') || {}).textContent, done: !!document.querySelector('.cp-card .cr-admin.cr-done'), removed: LowiHiddenAccounts.isRemoved(t), yes: !!document.querySelector('.cp-card .cr-confirm [data-cr="yes"]:not([disabled])') }), ids.t);
        ok('server failure: an error, no "deleted", the person stays, and you can try again', r1.text === T.delFailed && !r1.done && !r1.removed && r1.yes, r1);
        await R.shot(out + '/' + engine + '-' + lang + (url ? '-live' : '') + '-error.png');
        await P.unroute(/\/functions\/v1\/owner-delete-account/);
        R.step = 'delete';
        await tap('.cp-card .cr-confirm [data-cr="yes"]');
        await P.waitForFunction(t => document.querySelector('.cp-card .cr-admin.cr-done') || ((document.querySelector('.cp-card .cr-result') || {}).textContent || '') !== t, T.delFailed, { timeout: 30000 }).catch(() => { });
        await H.sleep(500);
        const done = await P.evaluate(t => ({ text: (document.querySelector('.cp-card .cr-result') || {}).textContent, removed: LowiHiddenAccounts.isRemoved(t), hidden: LowiHiddenAccounts.isHidden(t), people: (LowiCommunity.people ? LowiCommunity.people() : []).some(x => (x.uid || x.id) === t), stored: (localStorage.getItem('lowi.deletedIds.v1') || '').indexOf(t) >= 0 }), ids.t);
        ok('deleted: the card says so, and the person is gone from every list at once', done.text === require('../../community-remove-core.js').fill(T.done, NAME) && done.removed && done.hidden && !done.people && done.stored, done);
        await R.shot(out + '/' + engine + '-' + lang + (url ? '-live' : '') + '-done.png');
        if (url) {
            await TOG(false, ids.a);
            const db = execSync((process.env.SB || '/tmp/sbw.sh') + " db query --linked \"select (select count(*) from auth.users where id='" + ids.t + "') login, (select count(*) from public.profiles where id='" + ids.t + "') profile, (select count(*) from public.community_deleted where user_id='" + ids.t + "') tomb\" -o csv 2>/dev/null").toString().trim().split('\n').pop();
            ok('on the server: login 0, profile 0, tombstone 1', db === '0,0,1', db);
            R.step = 'viewer after'; await become('v');
            const s = await vis(ids.t);
            ok('a normal account after a reload: no profile, the app hides the person, not in the people list', s.profile === 0 && s.kick === 0 && s.tomb === 1 && s.removed && !s.people, s);
            R.step = 'target after'; await P.evaluate(s => { localStorage.setItem('lowi.auth', JSON.stringify(s)); }, sessions.t);
            const post = await P.evaluate(async ([t, s]) => { const c = window.LOWI_CFG; const q = await fetch(c.url + '/rest/v1/messages', { method: 'POST', headers: { apikey: c.key, Authorization: 'Bearer ' + s.access_token, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify({ id: 'ad-' + Date.now(), user_id: t, room: 'zz-delete-test', who: 'AD Test', body: 'ad-test' }) }); return q.status + ' ' + (await q.text()).slice(0, 120); }, [ids.t, sessions.t]);
            ok('the deleted account can no longer write anything (server refuses)', !/^20\d/.test(post), post);
            if (/^20\d/.test(post)) console.log('WARNING a test message was posted: ' + post);
        } else {
            R.step = 'reload'; SV.admin = false; await boot();
            const s = await P.evaluate(t => ({ removed: LowiHiddenAccounts.isRemoved(t) }), TID);
            ok('after a reload the deleted person stays hidden', s.removed, s);
        }
        ok('no page errors', R.errs.length === 0, R.errs.slice(0, 3));
    } catch (e) {
        ok('run finished (step ' + R.step + ')', false, String(e && e.message || e).slice(0, 300));
        if (url && ids.a) try { execSync('tools/admin-delete/admin-toggle.sh off ' + ids.a, { stdio: 'inherit' }); } catch (er) { }
    }
    if (notes.length) console.log('NOTES ' + notes.join(' | '));
    await R.close();
    const f = res.filter(r => !r.pass).length;
    console.log((f ? 'FAILED ' : 'ALL PASS ') + (res.length - f) + '/' + res.length + ' ' + engine + ' ' + lang + (url ? ' live' : ' local'));
    process.exit(f ? 1 : 0);
})();
