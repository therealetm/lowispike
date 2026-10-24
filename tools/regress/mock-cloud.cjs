/* LOWiSPIKE simulation backend (item 31, 20 Oct 2026). A fake Supabase for Playwright runs, so the real app can be played
   signed in, with a full Community (members, 300 chat messages, photos, reactions) and live realtime traffic, without a
   single request reaching the real project. Nothing here talks to the network: every *.supabase.co request is answered
   locally, every other foreign host is aborted, and writes are only recorded in memory.

   const cloud = require('./mock-cloud.cjs');
   const sim = await cloud.install(ctx, { members: 45, messages: 300, me: 'Emmanuel' });
   sim.say('Hello @Emmanuel')            // a member writes in the room (realtime INSERT)
   sim.shoot({...})                       // an energy broadcast
   sim.writes                             // what the app tried to write (method, table, body)
*/
'use strict';
const fs = require('fs'), path = require('path');
const PROJECT = 'vnfwmifmsfecascwaody';
const HOST = PROJECT + '.supabase.co';
const SIGNS = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
const TYPES = ['INTJ', 'ENFP', 'ISFJ', 'ESTP', 'INFP', 'ENTJ', 'ISTP', 'ESFJ'];
const NAMES = ['Lena', 'Marco', 'Aylin', 'Jonas', 'Sofia', 'Mateo', 'Hannah', 'Luca', 'Mia', 'Noah', 'Emma', 'Elias', 'Lea', 'Paul', 'Clara', 'Ben', 'Lina', 'Finn', 'Ida', 'Leon',
    'Nora', 'Felix', 'Zoe', 'Max', 'Ella', 'Theo', 'Amira', 'Karim', 'Yuki', 'Diego', 'Lucia', 'Pablo', 'Carmen', 'Hugo', 'Ines', 'Omar', 'Sara', 'Tim', 'Nina', 'Jan', 'Maja', 'Erik', 'Lara', 'Tom', 'Rosa', 'Vito', 'Alba', 'Oskar'];
const LINES = ['Morning everyone ☀️', 'Just logged my breakfast, oats + berries', 'who wants to race to Legendary?', 'my companion just evolved!!', 'haha same', 'anyone tried the cauliflower nacho tray?',
    'Walked 8k steps today 🚶', 'that spike estimate surprised me', 'good night all 🌙', 'how do you get the gold crown?', 'sending energy your way', 'lol', '😂😂', 'drink water reminder 💧',
    'Can someone explain the billiard thing?', 'fasting day 3, feeling good', 'this app is addictive', 'my sugar was fine after the lentil bowl', 'what level are you?', 'Nova form looks insane',
    'Long message incoming: today I tried to cook three of the recipes in a row and honestly the okonomiyaki was the best one, crispy edges, soft middle, and my glucose stayed flat the whole afternoon which I did not expect at all.',
    'ok who keeps shooting me 😤', 'brb', 'Guten Morgen!', '¡Hola a todos!', '👀', 'that hologram visit is so cool', 'snack ideas without sugar?', 'Pathfinder badge got!', 'galaxy is crowded today'];

function b64url(o) { return Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_'); }
function uuid(n) { const h = (n >>> 0).toString(16).padStart(8, '0'); return h + '-0000-4000-8000-' + String(n).padStart(12, '0'); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

function world(opts) {
    let seed = opts.seed || 7; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const pick = a => a[Math.floor(rnd() * a.length)];
    const me = { id: uuid(1), name: opts.me || 'Emmanuel' };
    const now = Date.now();
    const profiles = [{ id: me.id, name: me.name, sign: 'leo', mbti: 'ENFP', lv: 6, streak: 9, bio: '', avatar: '', bday: '', xp: 2400, xp_week: 300, wk: '', xp_month: 900, mo: '', weight: '' }];
    for (let i = 0; i < (opts.members || 45); i++) profiles.push({ id: uuid(100 + i), name: NAMES[i % NAMES.length] + (i >= NAMES.length ? ' ' + (i + 1) : ''), sign: pick(SIGNS), mbti: pick(TYPES), lv: 1 + Math.floor(rnd() * 10), streak: Math.floor(rnd() * 30), bio: rnd() < .3 ? 'Here for the galaxy' : '', avatar: '', bday: '', xp: Math.floor(rnd() * 6000), xp_week: Math.floor(rnd() * 500), wk: '', xp_month: Math.floor(rnd() * 2000), mo: '', weight: '' });
    const others = profiles.slice(1);
    const messages = [], reactions = [];
    const N = opts.messages == null ? 300 : opts.messages;
    for (let i = 0; i < N; i++) {
        const p = rnd() < .08 ? profiles[0] : pick(others);
        let body = pick(LINES);
        if (rnd() < .12) body = '@' + me.name + ' ' + body;
        if (rnd() < (opts.photoShare == null ? .06 : opts.photoShare)) body = '\u{1F4F7} https://' + HOST + '/storage/v1/object/public/media/' + p.id.replace(/-/g, '') + '/chat-m' + i + 'x.jpg' + (rnd() < .5 ? ' look at this' : '');
        const id = uuid(10000 + i);
        const reply = i > 5 && rnd() < .1 ? messages[Math.floor(rnd() * messages.length)].id : null;
        messages.push({ id, user_id: p.id, who: p.name, body, reply_to: reply, created_at: new Date(now - (N - i) * 95000).toISOString(), room: 'all' });
        if (rnd() < .25) { const k = 1 + Math.floor(rnd() * 3); for (let j = 0; j < k; j++) { const q = pick(profiles); reactions.push({ message_id: id, user_id: q.id, who: q.name, emoji: pick(['❤️', '😂', '🔥', '👏', '💧']) }); } }
    }
    /* photo urls must carry the sender id without dashes? the regex wants [A-Za-z0-9_-]{6,64} and equal to uid: keep uid as is */
    messages.forEach(m => { if (m.body.indexOf('/media/') > 0) m.body = m.body.replace(/media\/[0-9a-f]+\//, 'media/' + m.user_id + '/'); });
    const posts = [];
    for (let i = 0; i < (opts.posts == null ? 40 : opts.posts); i++) { const p = pick(others); posts.push({ id: uuid(50000 + i), user_id: p.id, who: p.name, created_at: new Date(now - i * 3600000).toISOString(), cap: pick(LINES), photo_url: rnd() < .6 ? 'https://' + HOST + '/storage/v1/object/public/media/' + p.id + '/post-' + i + '.jpg' : '', url: '', plat: '', lv: p.lv }); }
    /* Circles (chat redesign 24 Oct 2026, opt-in with opts.circles): one circle someone else made that you are in, with a
       short conversation and reactions; one you made with a new message from a friend (unread in the switcher). */
    const circles = [], circleMembers = [];
    if (opts.circles) {
        const a = others[0], b = others[1], c = others[2];
        circles.push({ id: uuid(80001), owner_id: a.id, owner_name: a.name, name: 'Typ 2 walkers', topic: 'Evening walks after dinner', icon: '\u{1F319}', created_at: new Date(now - 5 * 864e5).toISOString() });
        circles.push({ id: uuid(80002), owner_id: me.id, owner_name: me.name, name: 'Night owls', topic: '', icon: '\u{1F989}', created_at: new Date(now - 2 * 864e5).toISOString() });
        circleMembers.push({ room_id: circles[0].id, user_id: a.id, who: a.name, status: 'member' }, { room_id: circles[0].id, user_id: me.id, who: me.name, status: 'member' }, { room_id: circles[0].id, user_id: b.id, who: b.name, status: 'member' },
            { room_id: circles[1].id, user_id: c.id, who: c.name, status: 'member' }, { room_id: circles[1].id, user_id: b.id, who: b.name, status: 'pending' });
        const conv = [[a, 'Walk at 6 tonight?'], [a, 'Same loop as Monday'], [me, 'I\'m in!'], [b, 'Me too, bringing the dog \u{1F415}'], [a, 'Perfect'], [me, 'My sugar stayed flat after yesterday\'s walk, this works'], [b, 'Nice!! \u{1F44F}']];
        conv.forEach(([p, body], i) => { const id = 'u-sim-c1-' + i; messages.push({ id, user_id: p.id, who: p.name, body, reply_to: null, created_at: new Date(now - (conv.length - i) * 4 * 60e3 - 864e5 * (i < 2 ? 1 : 0)).toISOString(), room: 'u:' + circles[0].id }); });
        reactions.push({ message_id: 'u-sim-c1-2', user_id: a.id, who: a.name, emoji: '\u{1F44D}' }, { message_id: 'u-sim-c1-2', user_id: b.id, who: b.name, emoji: '\u{1F44D}' }, { message_id: 'u-sim-c1-5', user_id: a.id, who: a.name, emoji: '\u2764\uFE0F' });
        messages.push({ id: 'u-sim-c2-0', user_id: c.id, who: c.name, body: 'Anyone awake? Late snack ideas?', reply_to: null, created_at: new Date(now - 6 * 60e3).toISOString(), room: 'u:' + circles[1].id });
    }
    return { me, profiles, others, messages, reactions, posts, rnd, pick, circles, circleMembers };
}

async function install(ctx, opts) {
    opts = opts || {};
    const W = world(opts);
    const sim = { W, writes: [], sockets: new Set(), topics: new Map(), log: [], counts: { rest: 0, ws: 0, storage: 0 }, rest: {} };
    const photos = fs.readdirSync(path.join(__dirname, 'fixtures')).filter(f => /\.jpg$/.test(f)).map(f => fs.readFileSync(path.join(__dirname, 'fixtures', f)));
    const exp = Math.floor(Date.now() / 1000) + 30 * 86400;
    const user = { id: W.me.id, aud: 'authenticated', role: 'authenticated', email: 'sim@example.invalid', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-09-01T00:00:00Z', is_anonymous: false };
    const token = b64url({ alg: 'HS256', typ: 'JWT' }) + '.' + b64url({ sub: W.me.id, role: 'authenticated', aud: 'authenticated', exp, iat: exp - 3600, email: user.email }) + '.c2lt';
    const session = { access_token: token, refresh_token: 'sim-refresh', token_type: 'bearer', expires_in: 3600 * 24 * 30, expires_at: exp, user };
    sim.session = session;
    await ctx.addInitScript(([s]) => { try { if (!localStorage.getItem('lowi.auth')) localStorage.setItem('lowi.auth', s); } catch (e) { } }, [JSON.stringify(session)]);
    const json = (route, body, status, headers) => route.fulfill({ status: status || 200, contentType: 'application/json', headers: Object.assign({ 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-expose-headers': 'content-range', 'content-range': '0-' + Math.max(0, (Array.isArray(body) ? body.length : 1) - 1) + '/*' }, headers || {}), body: JSON.stringify(body) });
    function table(name) {
        switch (name) {
            case 'messages': return W.messages.slice().reverse();
            case 'user_rooms': return W.circles || [];
            case 'user_room_members': return W.circleMembers || [];
            case 'reactions': return W.reactions;
            case 'profiles': return W.profiles;
            case 'posts': return W.posts;
            default: return [];
        }
    }
    await ctx.route(u => { try { const h = new URL(u).host; return h.endsWith('.supabase.co') || h.endsWith('.supabase.in'); } catch (e) { return false; } }, async route => {
        const q = route.request(), u = new URL(q.url()), m = q.method();
        if (m === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
        if (u.host !== HOST) return json(route, { message: 'sim: unknown project' }, 404);
        const p = u.pathname;
        if (p.startsWith('/auth/v1/')) {
            if (/\/user$/.test(p)) return json(route, user);
            if (/\/token/.test(p)) return json(route, session);
            if (/\/logout/.test(p)) return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*' } });
            return json(route, session);
        }
        if (p.startsWith('/storage/v1/object/public/')) {
            sim.counts.storage++;
            if (/\.(jpe?g|webp|png)$/.test(p)) { let h = 0; for (const c of p) h = (h * 31 + c.charCodeAt(0)) >>> 0; return route.fulfill({ status: 200, contentType: 'image/jpeg', headers: { 'access-control-allow-origin': '*', 'cache-control': 'max-age=3600' }, body: photos[h % photos.length] }); }
            return route.fulfill({ status: 404, body: '' });
        }
        if (p.startsWith('/storage/v1/')) { sim.writes.push({ m, p, at: Date.now() }); return json(route, { Key: p, Id: 'sim' }); }
        if (p.startsWith('/functions/v1/')) { sim.writes.push({ m, p, at: Date.now() }); return json(route, { ok: true, sim: true }); }
        if (p.startsWith('/rest/v1/rpc/')) { sim.writes.push({ m, p, at: Date.now() }); return json(route, false); }
        if (p.startsWith('/rest/v1/')) {
            sim.counts.rest++;
            const t = p.split('/')[3];
            sim.rest[m + ' ' + t] = (sim.rest[m + ' ' + t] || 0) + 1;
            if (m === 'GET' || m === 'HEAD') {
                let rows = table(t);
                /* circle filters: u:<id> messages only show in their circle, never in the community room */
                const F = (k, v) => { if (!v) return; if (/^eq\./.test(v)) { const x = v.slice(3); rows = rows.filter(r => String(r[k]) === x); } else if (/^in\.\(/.test(v)) { const xs = v.slice(4, -1).split(',').map(z => z.replace(/^"|"$/g, '')); rows = rows.filter(r => xs.includes(String(r[k]))); } };
                if (t === 'messages') { const rv = u.searchParams.get('room') || ''; if (/u:/.test(rv)) F('room', rv); else rows = rows.filter(r => !/^u:/.test(r.room || '')); }
                if (t === 'reactions') F('message_id', u.searchParams.get('message_id'));
                if (t === 'user_rooms') { F('owner_id', u.searchParams.get('owner_id')); F('id', u.searchParams.get('id')); }
                if (t === 'user_room_members') { F('user_id', u.searchParams.get('user_id')); F('room_id', u.searchParams.get('room_id')); F('status', u.searchParams.get('status')); }
                const lim = +u.searchParams.get('limit'); if (lim) rows = rows.slice(0, lim);
                const eqId = u.searchParams.get('id'); if (eqId && /^eq\./.test(eqId)) rows = rows.filter(r => r.id === eqId.slice(3));
                const accept = q.headers()['accept'] || '';
                if (/vnd\.pgrst\.object/.test(accept)) return rows[0] ? json(route, rows[0]) : json(route, { code: 'PGRST116', message: 'no rows' }, 406);
                return json(route, rows);
            }
            let body = null; try { body = q.postDataJSON(); } catch (e) { body = q.postData(); }
            sim.writes.push({ m, t, body, at: Date.now() });
            /* echo the write the way PostgREST does with return=representation, and play it back on realtime like the server would */
            const rows = (Array.isArray(body) ? body : [body]).filter(Boolean).map(r => Object.assign({ created_at: new Date().toISOString() }, r));
            if (m === 'POST' && t === 'messages') rows.forEach(r => { r.id = r.id || uuid(900000 + sim.writes.length); r.room = r.room || 'all'; W.messages.push(r); setTimeout(() => sim.change('messages', 'INSERT', r), opts.echoMs || 250); });
            if (m === 'DELETE' && t === 'messages') { const id = (u.searchParams.get('id') || '').replace(/^eq\./, ''); const i = W.messages.findIndex(x => x.id === id); if (i >= 0) { W.messages.splice(i, 1); setTimeout(() => sim.change('messages', 'DELETE', null, { id }), 200); } }
            const accept = q.headers()['accept'] || '';
            if (/vnd\.pgrst\.object/.test(accept)) return json(route, rows[0] || {}, 201);
            return json(route, rows, m === 'POST' ? 201 : 200);
        }
        return json(route, { message: 'sim: unhandled ' + p }, 404);
    });
    /* realtime: a tiny Phoenix server speaking the 2.0.0 JSON array frames */
    await ctx.routeWebSocket(/supabase\.co\/realtime\//, ws => {
        sim.sockets.add(ws); sim.counts.ws++;
        ws.onMessage(msg => {
            if (typeof msg !== 'string') { sim.log.push('binary frame ' + msg.length); return; }
            let f; try { f = JSON.parse(msg); } catch (e) { return; }
            const [jr, ref, topic, ev, payload] = f;
            if (ev === 'heartbeat') return ws.send(JSON.stringify([null, ref, 'phoenix', 'phx_reply', { status: 'ok', response: {} }]));
            if (ev === 'phx_join') {
                const pc = ((payload && payload.config && payload.config.postgres_changes) || []).map((b, i) => Object.assign({ id: 1000 + i }, b));
                sim.topics.set(topic, { ws, jr, pc });
                ws.send(JSON.stringify([jr, ref, topic, 'phx_reply', { status: 'ok', response: { postgres_changes: pc } }]));
                setTimeout(() => { try { ws.send(JSON.stringify([jr, null, topic, 'system', { channel: topic.replace(/^realtime:/, ''), extension: 'postgres_changes', message: 'Subscribed to PostgreSQL', status: 'ok' }])); } catch (e) { } }, 50);
                return;
            }
            if (ev === 'phx_leave') { sim.topics.delete(topic); return ws.send(JSON.stringify([jr, ref, topic, 'phx_reply', { status: 'ok', response: {} }])); }
            if (ev === 'broadcast') { sim.writes.push({ m: 'BROADCAST', t: topic, body: payload, at: Date.now() }); if (ref) ws.send(JSON.stringify([jr, ref, topic, 'phx_reply', { status: 'ok', response: {} }])); return; }
            if (ref) ws.send(JSON.stringify([jr, ref, topic, 'phx_reply', { status: 'ok', response: {} }]));
        });
        ws.onClose(() => { sim.sockets.delete(ws); for (const [k, v] of sim.topics) if (v.ws === ws) sim.topics.delete(k); });
    });
    sim.change = (tbl, type, rec, old) => {
        for (const [topic, t] of sim.topics) {
            const ids = t.pc.filter(b => b.table === tbl && (b.event === '*' || b.event === type)).map(b => b.id);
            if (!ids.length) continue;
            try { t.ws.send(JSON.stringify([t.jr, null, topic, 'postgres_changes', { ids, data: { schema: 'public', table: tbl, commit_timestamp: new Date().toISOString(), type, eventType: type, columns: [], record: rec || {}, old_record: old || {}, errors: null } }])); } catch (e) { }
        }
    };
    sim.broadcast = (event, payload) => { for (const [topic, t] of sim.topics) { try { t.ws.send(JSON.stringify([t.jr, null, topic, 'broadcast', { type: 'broadcast', event, payload }])); } catch (e) { } } };
    let n = 0;
    sim.say = (text, who) => { const p = who || W.pick(W.others); const r = { id: uuid(700000 + (n++)), user_id: p.id, who: p.name, body: text || W.pick(LINES), reply_to: null, created_at: new Date().toISOString(), room: 'all' }; W.messages.push(r); sim.change('messages', 'INSERT', r); return r; };
    sim.react = (msgId, emoji) => { const p = W.pick(W.others); const r = { message_id: msgId, user_id: p.id, who: p.name, emoji: emoji || '❤️' }; W.reactions.push(r); sim.change('reactions', 'INSERT', r); };
    sim.profileTick = () => { const p = W.pick(W.others); p.xp += 5; p.lv = Math.min(10, p.lv); sim.change('profiles', 'UPDATE', p, { id: p.id }); };
    sim.photoSay = (who) => { const p = who || W.pick(W.others); return sim.say('\u{1F4F7} https://' + HOST + '/storage/v1/object/public/media/' + p.id + '/chat-live' + (n + 1) + '.jpg', p); };
    sim.lines = LINES;
    return sim;
}
module.exports = { install, HOST, uuid };
