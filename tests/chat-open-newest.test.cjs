'use strict';
/* 25 Oct 2026, Emmanuel: "when opening the chat room from the circle, also general, it doesn't start from the most recent message.
   It's on, like, then you have to scroll down." Every chat open lands on the newest message and stays there while photos,
   videos and link previews load late; scrolled up, a new message does not move the list (a "new" pill shows instead).
   Browser proof on top of these: tools/chat-newest/check.cjs (iPhone 13 + iPad, Chromium + WebKit, 300+ messages, late photos). */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const S=require('../chat-stick-core.js');

/* a scroll box of rows with heights; rows can grow (a photo decodes) or be added; top of the box is y=100 on screen */
function box(heights,client=600){
  const ls={};let top=0;
  const rows=heights.map((h,i)=>({id:'cm-'+i,h,parentNode:null}));
  const l={clientHeight:client,children:rows,listeners:ls,
    get scrollHeight(){return Math.max(this.clientHeight,this.children.reduce((a,r)=>a+r.h,0));},
    get scrollTop(){return top;},set scrollTop(v){const n=Math.max(0,Math.min(v,this.scrollHeight-this.clientHeight));if(n!==top){top=n;(ls.scroll||[]).forEach(f=>f());}},
    addEventListener(t,f){(ls[t]=ls[t]||[]).push(f);},
    getBoundingClientRect(){return {top:100,bottom:100+this.clientHeight,height:this.clientHeight};},
    querySelector(sel){return this.children.find(r=>'#'+r.id===sel)||null;},
    fire(t){(ls[t]||[]).forEach(f=>f());}};
  const dress=r=>{r.parentNode=l;r.getBoundingClientRect=()=>{let y=100-top;for(const k of l.children){if(k===r)break;y+=k.h;}return {top:y,bottom:y+r.h,height:r.h};};return r;};
  rows.forEach(dress);l.add=h=>{const r=dress({id:'cm-'+l.children.length,h});l.children.push(r);return r;};
  l.addTop=h=>{const r=dress({id:'cm-top'+Math.random(),h});l.children.unshift(r);return r;};
  l.dropTop=()=>{const r=l.children.shift();r.parentNode=null;return r;};
  return l;
}
function fakeRO(){const all=[];class RO{constructor(cb){this.cb=cb;this.seen=new Set();all.push(this);}observe(e){this.seen.add(e);}unobserve(e){this.seen.delete(e);}disconnect(){this.seen.clear();}}RO.fire=()=>all.forEach(o=>o.cb([]));RO.all=all;return RO;}
const atBottom=l=>l.scrollHeight-l.scrollTop-l.clientHeight;

test('opens on the newest message and stays there while photos load late (no gesture, nothing to scroll by hand)',()=>{
  const heights=[];for(let i=0;i<120;i++)heights.push(i%4===0?40:64);/* 120 rows, photos still undecoded (40 px) */
  const l=box(heights),RO=fakeRO(),t=0,c=S.create(l,{ResizeObserver:RO,now:()=>t});
  c.watch();c.pin();
  assert.equal(atBottom(l),0);assert.equal(c.stuck,true);
  /* the photos near the bottom decode: each grows from 40 to 260 px; the resize observer fires before the next frame */
  for(let i=119;i>=100;i--){if(i%4===0){l.children[i].h=260;RO.fire();assert.equal(atBottom(l),0,'pinned after photo '+i);}}
  /* a link preview card at the very end shows up late, and the box gets shorter (keyboard) */
  l.children[119].h+=180;RO.fire();assert.equal(atBottom(l),0);
  l.clientHeight=420;RO.fire();assert.equal(atBottom(l),0);
  assert.ok(RO.all[0].seen.size>=121,'watches the list and every row');
});

test('a photo that loads after layout (load event) also re-pins, and a new message at the bottom stays in view',()=>{
  const l=box(new Array(100).fill(70)),c=S.create(l,{ResizeObserver:null,now:()=>0});c.watch();c.pin();
  l.children[99].h=300;l.fire('load');assert.equal(atBottom(l),0);
  l.add(90);c.rendered();assert.equal(atBottom(l),0);assert.equal(c.stuck,true);
});

test('scrolling up by hand lets go: late photos and new messages no longer move what you are reading',()=>{
  let t=1000;const l=box(new Array(150).fill(70)),RO=fakeRO(),c=S.create(l,{ResizeObserver:RO,now:()=>t});c.watch();c.pin();
  l.fire('touchstart');l.scrollTop=l.scrollTop-1500;assert.equal(c.stuck,false,'a touch scroll up lets go');
  const r=l.children.find(k=>k.getBoundingClientRect().bottom>101),y0=r.getBoundingClientRect().top,top0=l.scrollTop;
  t+=5000;l.add(80);c.rendered();assert.equal(l.scrollTop,top0,'a new message at the bottom does not move the list');
  /* rows above change (an older photo decodes, the top row drops out of the window): the row being read keeps its place */
  l.children[3].h+=200;RO.fire();assert.equal(Math.round(r.getBoundingClientRect().top),Math.round(y0));
  l.dropTop();c.rendered();assert.equal(Math.round(r.getBoundingClientRect().top),Math.round(y0));
  /* back at the bottom by hand: it sticks again and the next photo keeps it pinned */
  t+=100;l.fire('touchmove');l.scrollTop=l.scrollHeight;assert.equal(c.stuck,true);
  l.children[l.children.length-1].h=400;RO.fire();assert.equal(atBottom(l),0);
});

test('a scroll up from code (no gesture, same box) lets go too; the keyboard closing (box grows, scroll clamps) does not',()=>{
  const l=box(new Array(80).fill(70),500),c=S.create(l,{ResizeObserver:null,now:()=>99999});c.watch();c.pin();
  l.clientHeight=700;l.scrollTop=l.scrollTop;/* the engine clamps after the box grew */l.fire('scroll');assert.equal(c.stuck,true);c.changed();assert.equal(atBottom(l),0);
  l.scrollTop=0;assert.equal(c.stuck,false);c.changed();assert.equal(l.scrollTop,0,'stays where code put it');
  c.pin();assert.equal(atBottom(l),0);assert.equal(c.stuck,true);
});

test('release() (jump to a pinned/replied message, show earlier messages) keeps the place; pin() always lands on the newest',()=>{
  const l=box(new Array(90).fill(70)),c=S.create(l,{ResizeObserver:null,now:()=>0});c.watch();c.pin();
  l.scrollTop=1200;c.release();l.add(70);c.rendered();assert.equal(l.scrollTop,1200);
  c.pin();assert.equal(atBottom(l),0);
});

test('community chat: every open goes through the stick-to-bottom list, the pill says new and points down',()=>{
  const js=read('community-chat.js'),html=read('index.html'),sw=read('sw.js');
  assert.match(js,/function stickOn\(l\)\{if\(!l\|\|!W\.LowiChatStick\|\|\(stickCtl&&stickCtl\.el===l\)\)return;if\(stickCtl\)stickCtl\.stop\(\);stickCtl=W\.LowiChatStick\.create\(l\);stickCtl\.watch\(\);\}/,'the room list gets the controller');
  assert.match(js,/focus=D\.activeElement;stickOn\(list\);const pinned=stuck\(\);/,'a rebuilt list gets it again before every paint');
  const th=js.slice(js.indexOf('function thread(open,focusId){'));
  assert.match(th.slice(0,400),/if\(stickCtl\)\{if\(threadOpen&&focusId\)stickCtl\.release\(\);else if\(!was\|\|!threadOpen\)\{stickCtl\.pin\(\);newCount=0;\}\}/,'opening (from the galaxy Chat button, the Chat tab, anywhere) pins to the newest');
  assert.match(js,/if\(stickCtl\)\{if\(ownNew\)stickCtl\.pin\(\);stickCtl\.rendered\(\);\}/,'every repaint re-pins while stuck and watches new rows');
  assert.match(js,/if\(ms\.length>lastCount&&!pinned&&!ownNew\)/,'a new message while scrolled up counts for the pill instead of moving the list');
  assert.match(js,/button\('latest','<span aria-hidden="true">↓<\/span> '\+tr\('newMessages'\)/);
  assert.match(js,/a==='latest'\)\{[^}]*stickCtl\.pin\(\)/,'the pill brings you down and sticks again');
  assert.match(js,/function goPinned\(id\)\{if\(!id\)return;pinHoldAt=Date\.now\(\);if\(stickCtl\)stickCtl\.release\(\);/);
  const iS=html.indexOf('<script src="chat-stick-core.js?v='),iC=html.indexOf('<script src="community-chat.js?v=');
  assert.ok(iS>0&&iS<iC,'the core loads before the chat');
  assert.ok(sw.match(/const STATIC = \[[^\]]*\]/)[0].includes('"chat-stick-core.js"'),'cached for offline');
});
