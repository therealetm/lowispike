'use strict';
// Queue step fairplay-sql (23 Oct 2026): the server-side fair-play trigger must use the same numbers as the app,
// accept every tag the app writes, never cut an honest score, and be safe to run twice.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const SQL = fs.readFileSync(path.join(ROOT, 'supabase/proposals/leaderboard_fairplay_20261023.sql'), 'utf8');
const CB = require('../care-board-core.js');
const WHC = require('../world-home-core.js');
const code = SQL.split('\n').map(l => l.replace(/--.*$/, '')).join('\n');
const constant = name => { const m = new RegExp(name + '\\s+constant int := (\\d+);').exec(code); return m ? +m[1] : NaN; };

test('sunbeams a day and the number of levels match the app', () => {
    assert.equal(constant('sun_day'), CB.GOAL);
    assert.equal(constant('max_lv'), WHC.STAGES.length);
    assert.equal(constant('max_lv'), 25);
    assert.ok(constant('xp_day') >= 1000, 'all-time XP ceiling stays generous (a regular day is about 250 XP)');
});

test('the week and month tags the app writes match the trigger patterns', () => {
    const wk = /\^care1:\(\[0-9\]\{4\}-\[0-9\]\{2\}-\[0-9\]\{2\}\):\(\[0-9\]\{1,3\}\)\$/;
    const mo = /\^care1:\(\[0-9\]\{4\}-\[0-9\]\{2\}\):\(\[0-9\]\{1,3\}\)\$/;
    assert.match(code, wk); assert.match(code, mo);
    const wre = /^care1:([0-9]{4}-[0-9]{2}-[0-9]{2}):([0-9]{1,3})$/, mre = /^care1:([0-9]{4}-[0-9]{2}):([0-9]{1,3})$/;
    for (const t of [new Date(2026, 9, 19, 9), new Date(2026, 9, 25, 23), new Date(2026, 11, 31, 12), new Date(2027, 0, 1, 0, 5)]) {
        const w = CB.tag(CB.periodKey('w', t), 7), m = CB.tag(CB.periodKey('m', t), 31);
        assert.match(w, wre, w); assert.match(m, mre, m);
        assert.ok(CB.untag(w) && CB.untag(m), 'the app reads its own tag back');
    }
});

test('an honest score is never cut: the server cap is at least the app ceiling on every day', () => {
    const sqlDays = (kind, key, today) => {
        const start = kind === 'm' ? new Date(key + '-01T00:00:00Z') : new Date(key + 'T00:00:00Z');
        const t = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
        const diff = Math.round((t - start) / 864e5);
        return Math.min(kind === 'm' ? 31 : 7, Math.max(0, diff + 2));
    };
    for (let d = 0; d < 70; d++) {
        const now = new Date(2026, 9, 1 + d, 13);
        for (const kind of ['w', 'm']) {
            const appMax = CB.daysSoFar(kind, now) * CB.GOAL;
            const serverCap = sqlDays(kind, CB.periodKey(kind, now), now) * constant('sun_day');
            assert.ok(serverCap >= appMax, kind + ' ' + now.toDateString() + ': ' + serverCap + ' < ' + appMax);
        }
    }
});

test('the trigger clamps and never raises, so a normal sync never fails', () => {
    assert.doesNotMatch(code, /raise\s+exception/i);
    for (const col of ['new.xp_week', 'new.xp_month', 'new.lv', 'new.xp', 'new.wk', 'new.mo']) assert.match(code, new RegExp(col.replace('.', '\\.') + ' :='), col);
});

test('updated_at comes from the server so it cannot be backdated to unlock a bigger XP jump', () => {
    assert.match(code, /new\.updated_at := now\(\);/);
    assert.ok(code.indexOf('new.updated_at := now()') < code.indexOf('old.updated_at'), 'set before the XP ceiling is worked out');
});

test('only signed-in or anonymous API writes are clamped; the owner in the SQL editor can still fix a row', () => {
    assert.match(code, /if req_role not in \('authenticated', 'anon'\) then return new; end if;/);
});

test('safe to run twice, fixed search_path, no secrets', () => {
    assert.match(code, /create or replace function public\.profiles_fairplay\(\)/);
    assert.match(code, /drop trigger if exists profiles_fairplay on public\.profiles;/);
    assert.match(code, /create trigger profiles_fairplay before insert or update on public\.profiles/);
    assert.match(code, /set search_path = ''/);
    assert.doesNotMatch(SQL, /service_role\s*key\s*[:=]|eyJ[A-Za-z0-9_-]{20,}|sk_(live|test)_/);
    assert.doesNotMatch(code, /security definer/i, 'runs as the writer, needs no extra rights');
});
