'use strict';
/* BH-046 (bug hunt run 46, Oct 26 2026), pattern P-SESSION-OUTLIVES-SCREEN: something that listens (a microphone) was only
   stopped when its field left the page, not when its screen was closed.
   - Community chat: one tap on the round mic records a voice message (tap mode). Leaving the chat (room back, Home, Community
     closing) kept the microphone recording invisibly, and at the 2 minute cap the recording SENT ITSELF to the chat.
     Seen on the live site (build 20261026-174856): after leaving, the mic track stayed live and a voice upload went out.
   - Dictation mic (new today): closing Kitchen or the chat while dictating kept recognition listening into a hidden box.
   These run the real functions cut out of the files in a sandbox, so they fail on the old code. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

function cut(src, name) {
    const i = src.indexOf('function ' + name + '(');
    if (i < 0) return '';
    let j = src.indexOf('{', src.indexOf(')', i)), depth = 0;
    for (; j < src.length; j++) { const ch = src[j]; if (ch === '{') depth++; else if (ch === '}') { depth--; if (!depth) return src.slice(i, j + 1); } }
    throw new Error('unbalanced ' + name);
}

const chat = read('community-chat.js');
const rect = (w, h) => () => ({ width: w, height: h, top: 600, left: 20, bottom: 600 + h, right: 20 + w });

function chatSandbox(bar) {
    const calls = [];
    const ctx = {
        calls, VOICE_MAX: 120, Math, Date, getComputedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '1' }),
        W: { innerHeight: 844, innerWidth: 390, devicePixelRatio: 2 },
        D: { hidden: false, documentElement: { clientHeight: 844, clientWidth: 390 }, querySelector: () => bar, getElementById: () => null },
        mmss: s => String(s)
    };
    vm.createContext(ctx);
    vm.runInContext('var rec=null,wasOn=true,sk=null,active=()=>false;function recStop(s){calls.push(s);}function voiceStop(){}\n' + cut(chat, 'recShown') + '\n' + cut(chat, 'recTick') + '\n' + cut(chat, 'onShow'), ctx);
    return ctx;
}

test('voice message: recording with its bar no longer on screen is thrown away, never sent at the 2 minute cap', () => {
    const hidden = { isConnected: true, getBoundingClientRect: rect(0, 0), checkVisibility: () => false };
    const ctx = chatSandbox(hidden);
    vm.runInContext('rec={t0:Date.now()-125000,levels:[]};for(let i=0;i<4;i++)recTick(rec);', ctx);
    assert.ok(!ctx.calls.includes(true), 'a hidden recording must never send itself; calls=' + JSON.stringify(ctx.calls));
    assert.ok(ctx.calls.includes(false), 'a hidden recording is stopped and thrown away');
    const gone = { isConnected: false, getBoundingClientRect: rect(300, 40) };
    const c2 = chatSandbox(gone);
    vm.runInContext('rec={t0:Date.now()-5000,levels:[]};for(let i=0;i<3;i++)recTick(rec);', c2);
    assert.deepEqual(c2.calls, [false], 'bar removed from the page = discarded after a few ticks');
});

test('voice message: a visible recording still records and still sends at the cap (no change for real use)', () => {
    const bar = { isConnected: true, getBoundingClientRect: rect(300, 40), checkVisibility: () => true };
    const ctx = chatSandbox(bar);
    vm.runInContext('rec={t0:Date.now()-5000,levels:[]};for(let i=0;i<5;i++)recTick(rec);', ctx);
    assert.deepEqual(ctx.calls, [], 'recording on screen keeps going');
    vm.runInContext('rec.t0=Date.now()-121000;recTick(rec);', ctx);
    assert.deepEqual(ctx.calls, [true], 'the cap still sends a recording you can see');
});

test('voice message: leaving Community stops the recording without sending it', () => {
    const ctx = chatSandbox(null);
    vm.runInContext('rec={t0:Date.now()};onShow();', ctx);
    assert.deepEqual(ctx.calls, [false]);
});

test('dictation mic: a field hidden while listening (Kitchen or chat closed) stops the recognition', () => {
    const src = read('mic-dictate.js');
    const timers = [];
    const ctx = {
        Math, Date, timers, getComputedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '1' }),
        D: { hidden: false }, appleTouch: false, nativeBroken: false, session: null,
        setTimeout: () => 0, clearTimeout: () => { }, setInterval: (f) => { timers.push(f); return timers.length; }, clearInterval: (id) => { timers[id - 1] = null; },
        C: { langTag: () => 'en-US', merge: (v) => ({ value: v }), tidy: x => x }
    };
    vm.createContext(ctx);
    vm.runInContext(`var aborted=0, stopped=0, shown=true, states=[];
      function SR(){ this.start=function(){}; this.abort=function(){ aborted++; var me=this; me.onend&&me.onend(); }; this.stop=function(){ stopped++; this.onend&&this.onend(); }; }
      function lang(){return 'en';} function caret(el){return {value:el.value,s:0,e:0};} function setState(r,s){states.push(s);} function insert(){return false;}
      function hint(){} function markBroken(){} function refreshAll(){} function useKeyboard(){}
      var el={value:'',maxLength:-1,isConnected:true,getBoundingClientRect:function(){return shown?{width:300,height:44}:{width:0,height:0};},checkVisibility:function(){return shown;}};
      ` + cut(src, 'shownField') + '\n' + cut(src, 'startNative'), ctx);
    vm.runInContext('startNative({el:el});', ctx);
    assert.equal(ctx.session !== null, true, 'listening');
    const tick = () => ctx.timers.forEach(f => f && f());
    tick(); tick();
    assert.equal(vm.runInContext('aborted', ctx), 0, 'a visible field keeps listening');
    vm.runInContext('shown=false;', ctx);
    tick(); tick(); tick();
    assert.equal(vm.runInContext('aborted', ctx), 1, 'hidden field: recognition stopped');
    assert.equal(ctx.session, null, 'no session left listening');
    assert.equal(vm.runInContext('states[states.length-1]', ctx), 'idle');
    assert.ok(ctx.timers.every(f => !f), 'the watch timer is cleared when listening ends');
});
