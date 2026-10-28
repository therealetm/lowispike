'use strict';
/* Oct 28 2026 (slim structure, batch 11): every tapped phone notification opens its target, never a bare Home when there is a
   real place for it. Inventory: lowispike-schlanker-aufbau.html, "11 Handy-Mitteilungen". This runs lis-push.js route() in a
   small fake page and records where each push key lands. */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

function page() {
    const log = [], timers = [];
    const store = {};
    const D = { hidden: false, documentElement: { classList: { contains: () => false } }, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, createElement: () => ({ setAttribute() {}, classList: { add() {} }, querySelector: () => null, appendChild() {} }), body: { appendChild() {} } };
    const W = {
        document: D, localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
        lowiOpen: t => log.push('tab:' + t), cmSeg: v => log.push('seg:' + v),
        LowiSymHome: { shop: () => { log.push('shop'); return true; } },
        LowiCommunity: { select: u => log.push('select:' + u), openMessage: (u, i) => log.push('msg:' + u + ':' + i) },
        navigator: {}, location: { href: 'https://x/' }, addEventListener() {}, matchMedia: () => ({ matches: false })
    };
    W.window = W;
    const ctx = vm.createContext(Object.assign(W, { setTimeout: f => { timers.push(f); return timers.length; }, clearTimeout() {}, setInterval: () => 0, console, Date, JSON, Math, Promise, URL }));
    vm.runInContext(read('lis-push.js'), ctx, { filename: 'lis-push.js' });
    const flush = () => { for (let i = 0; i < 6 && timers.length; i++) timers.splice(0).forEach(f => f()); };
    return { W, log, flush };
}

test('lis-push exposes route()', () => {
    const p = page();
    assert.ok(p.W.LisPush && typeof p.W.LisPush.route === 'function');
});

const cases = [
    ['foryou', ['tab:foryou', 'seg:feed'], 'Für dich: For You'],
    ['community', ['tab:foryou', 'seg:chat'], 'Energie bekommen: Community chat'],
    ['home', ['tab:home'], 'Dein Begleiter / fallback: Home'],
    ['scan', ['tab:home', 'shop'], 'Produkt-Tipp: Einkaufen (was bare Home)'],
    ['scan:prod-1', ['tab:home', 'shop'], 'Produkt-Tipp with a product id: Einkaufen'],
    ['chat:u1:m9', ['tab:foryou', 'seg:chat', 'msg:u1:m9'], 'Neue Chat-Nachricht: that message']
];
for (const [q, want, why] of cases) {
    test('push "' + q + '" opens its target: ' + why, () => {
        const p = page();
        assert.equal(p.W.LisPush.route(q), true);
        p.flush();
        assert.deepStrictEqual(p.log, want);
    });
}

test('the product tip no longer lands on a bare Home', () => {
    const lp = read('lis-push.js');
    assert.doesNotMatch(lp, /q === "home" \|\| q === "scan"/);
});
