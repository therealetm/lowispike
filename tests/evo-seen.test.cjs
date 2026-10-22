'use strict';
/* Oct 22 2026 evo-popup (Emmanuel): "MISTY COMET GREW!" (Star cell, Level 5 of 10) came back every time he closed, reopened or updated the app.
   Cause: the herb prefs key is 'lowi.herb.tamagotchi.v2:' + scope(), and scope() is 'u:<name>' while the app opens and the cloud uid once
   sign-in has loaded. refresh() wrote the pending marker (evoFrom) under the first key, the card waited for the skin, and by the time it was
   closed finishEvolution() cleared the marker under the uid key. The 'u:<name>' record kept evoFrom, so every reopen replayed the card.
   These tests run the real refresh()/finishEvolution() source with the DOM parts stubbed. */
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const js = fs.readFileSync(path.join(__dirname, '..', 'herb-tamagotchi.js'), 'utf8');
const slice = (a, b) => { const i = js.indexOf(a), j = js.indexOf(b, i); assert.ok(i >= 0 && j > i, a); return js.slice(i, j); };
const lineOf = a => { const i = js.indexOf(a); assert.ok(i >= 0, a); return js.slice(i, js.indexOf('\n', i)); };

function storage(init) {
    const m = new Map(Object.entries(init || {}));
    return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k),
        key: i => [...m.keys()][i] ?? null, get length() { return m.size; }, _m: m };
}

/* one app session: fresh JS (empty cache), same localStorage */
function session(ls, env) {
    const ctx = { localStorage: ls, env, C: { stages: Array.from({ length: 10 }, (_, i) => ({ xp: i * 100 })) }, shown: [] };
    vm.createContext(ctx);
    const src = [
        'var localStorage=this.localStorage,env=this.env,C=this.C,shown=this.shown,evolution=null,screen=null,previousXP=0,lastPage="";',
        'var D={documentElement:{classList:{remove(){},add(){}}},getElementById:()=>null};var window={};',
        'function scope(){return env.uid||("u:"+env.name);}',
        'const cache=new Map(),pkey=()=>"lowi.herb.tamagotchi.v2:"+scope();',
        /* readPrefs as in the app: stored record, else defaults with lastSeenStage = the current form */
        'function readPrefs(){const key=pkey();if(cache.has(key))return cache.get(key);let p=null;try{p=JSON.parse(localStorage.getItem(key)||"null");}catch(e){}if(!p)p={highestStage:env.stage,lastSeenStage:env.stage};localStorage.setItem(key,JSON.stringify(p));cache.set(key,p);return p;}',
        slice('function savePrefs(p){', 'function current('),
        'function current(){const p=readPrefs(),m={index:env.stage,xp:env.stage*100};return{p,m};}',
        'function mountCard(){}function mountDock(){}function renderRoom(){}function activePage(){return"";}function syncReminder(){}',
        /* evolve stub: the card is on screen (what the real evolve does once the skin is ready) */
        'function evolve(m,from){shown.push([from,m.index]);evolution={remove(){}};evoShown=m.index;}',
        lineOf('let evoWait=0'),
        lineOf('function finishEvolution(){'),
        js.slice(js.indexOf('function refresh(force){'), js.indexOf('return m;}', js.indexOf('function refresh(force){')) + 'return m;}'.length),
        'this.refresh=refresh;this.finish=finishEvolution;this.prefs=readPrefs;this.seen=typeof seenStage=="function"?seenStage:null;'
    ].join('\n');
    vm.runInContext(src, ctx);
    return ctx;
}

const UID = 'b6f1c2d0-uid', sh = s => JSON.parse(JSON.stringify(s.shown));

test('evo-popup: after acknowledging Level 5 (stage index 4) under the same key, a reopen does not replay it', () => {
    const ls = storage(), env = { name: 'Emmanuel', uid: UID, stage: 3 };
    let s = session(ls, env); s.refresh(true); assert.equal(s.shown.length, 0, 'nothing new on first open');
    env.stage = 4; s.refresh(); assert.deepEqual(sh(s), [[3, 4]], 'the new form celebrates once');
    s.finish();
    for (let i = 0; i < 3; i++) { s = session(ls, env); s.refresh(true); s.refresh(); assert.equal(s.shown.length, 0, 'reopen ' + (i + 1) + ' stays quiet'); }
    assert.equal(JSON.parse(ls.getItem('lowispike.evo.seen.v1')).stage, 4, 'the seen form is kept in a backed-up lowispike.* key');
});

test('evo-popup: the key switch u:<name> -> cloud uid during the celebration no longer replays it on every reopen', () => {
    const ls = storage(), env = { name: 'Emmanuel', uid: '', stage: 3 };
    let s = session(ls, env); s.refresh(true); env.uid = UID; s.refresh(); env.uid = '';
    s = session(ls, env); s.refresh(true);              /* reopen: still signed out for a moment */
    env.stage = 4; s.refresh();                           /* XP from the cloud: Level 5 */
    assert.deepEqual(sh(s), [[3, 4]]);
    env.uid = UID; s.refresh();                           /* sign-in loads while the card waits/plays */
    s.finish();                                           /* "Yay! Continue" under the uid key */
    for (let i = 0; i < 3; i++) {
        env.uid = ''; s = session(ls, env); s.refresh(true);   /* reopen/update: opens under u:Emmanuel first */
        env.uid = UID; s.refresh(true);
        assert.equal(s.shown.length, 0, 'reopen ' + (i + 1) + ': no replay');
    }
    assert.equal(s.prefs().evoFrom, undefined);
    env.uid = ''; s = session(ls, env); assert.equal(s.prefs().evoFrom, undefined, 'the u:<name> record has no stale marker');
});

test('evo-popup: a stale marker left by the old build (Emmanuel\'s phone today) is retired without one more replay', () => {
    const ls = storage({
        'lowi.herb.tamagotchi.v2:u:Emmanuel': JSON.stringify({ lastSeenStage: 4, highestStage: 4, evoFrom: 3 }),
        ['lowi.herb.tamagotchi.v2:' + UID]: JSON.stringify({ lastSeenStage: 4, highestStage: 4 })
    });
    const env = { name: 'Emmanuel', uid: '', stage: 4 };
    const s = session(ls, env); s.refresh(true); env.uid = UID; s.refresh(true);
    assert.equal(s.shown.length, 0);
    env.uid = ''; assert.equal(session(ls, env).prefs().evoFrom, undefined);
});

test('evo-popup: a genuinely new form still celebrates after an acknowledged one, across the key switch', () => {
    const ls = storage(), env = { name: 'Emmanuel', uid: '', stage: 3 };
    let s = session(ls, env); s.refresh(true); env.stage = 4; s.refresh(); env.uid = UID; s.refresh(); s.finish();
    env.uid = ''; s = session(ls, env); s.refresh(true);
    env.stage = 5; s.refresh();
    assert.deepEqual(sh(s), [[4, 5]], 'Level 6 celebrates, starting from the acknowledged Level 5');
    /* app closed before the card was closed (BH-013): it plays again on the next open */
    env.uid = UID; s = session(ls, env); s.refresh(true);
    env.uid = ''; s = session(ls, env); s.refresh(true);
    assert.deepEqual(sh(s), [[4, 5]], 'an unseen celebration survives a reload');
    s.finish(); env.uid = UID; s = session(ls, env); s.refresh(true);
    assert.equal(s.shown.length, 0, 'and once closed it is done');
    assert.equal(s.seen(), 5);
});

test('evo-popup: a cloud restore that brings back an older herb record does not replay a form already seen', () => {
    const ls = storage(), env = { name: 'Emmanuel', uid: UID, stage: 3 };
    let s = session(ls, env); s.refresh(true); env.stage = 4; s.refresh(); s.finish();
    /* restore(): lowispike.* keys come back from the backup (the seen key is in it); the herb prefs record is old/missing */
    ls.setItem('lowi.herb.tamagotchi.v2:' + UID, JSON.stringify({ lastSeenStage: 2, highestStage: 2 }));
    ls.removeItem('lowi.herb.tamagotchi.v2:u:Emmanuel');
    s = session(ls, env); s.refresh(true);
    assert.equal(s.shown.length, 0);
    assert.equal(JSON.parse(ls.getItem('lowi.herb.tamagotchi.v2:' + UID)).lastSeenStage, 4, 'the restored record is healed up to the seen form');
    assert.ok(js.includes("SEEN_KEY='lowispike.evo.seen.v1'"), 'the seen key starts with lowispike. so the account backup keeps it');
});
