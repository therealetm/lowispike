'use strict';
/* Oct 16 (E-man: "When I'm texting in the community I can almost not even see my writing"): the Community typing bar. */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const C=require('../community-composer.js');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const css=read('community-composer.css'),html=read('index.html'),sw=read('sw.js');

function alphas(rule){return [...rule.matchAll(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)/g)].map(m=>+m[1]);}

test('typing field is solid dark blue glass with white text, beating the see-through grey of liquid-glass',()=>{
  const rule=css.match(/textarea#cmInput#cmInput\{([^}]*)\}/)[1];
  const bg=rule.match(/background:([^;]*)!important/)[1];
  const a=alphas(bg);assert.ok(a.length>=2&&Math.min(...a)>=.9,'field fill is at least 90% opaque: '+bg);
  for(const m of bg.matchAll(/rgba\((\d+),(\d+),(\d+)/g)){const [r,g,b]=m.slice(1).map(Number);assert.ok(b>r&&b>=g&&r<40,'dark blue, no gold/beige: '+m[0]);}
  assert.match(rule,/backdrop-filter:blur\(2\dpx\)/);
  assert.match(rule,/color:#fff!important/);
  assert.match(rule,/border:1px solid rgba\(160,220,255,\.4\d\)!important/,'clear light edge');
  assert.match(css,/::placeholder\{color:rgba\(223,242,255,\.7\d\)!important/,'placeholder stays readable');
  /* the grey see-through rule it must beat: html.lg :is(#app #main,...) textarea = (2,1,2); ours = (3,1,2) */
  assert.match(read('liquid-glass.css'),/rgba\(118, 118, 128, \.2\) !important/);
  assert.match(css,/html #cmPaneChat\[data-spirit-chat\] textarea#cmInput#cmInput/);
});

test('while typing, a dark plate sits behind the whole bar and covered bubbles/names fade out',()=>{
  const plate=css.match(/html\.cs-chat-typing #cmPaneChat\[data-spirit-chat\] \.cm-compose::before\{([^}]*)\}/)[1];
  assert.ok(Math.min(...alphas(plate.match(/background:([^;]*)/)[1]))>=.85,'plate is dark enough to hide the map');
  assert.match(plate,/pointer-events:none/,'plate never blocks camera, send or the Chat pill');
  assert.match(plate,/z-index:-1/);
  assert.match(css,/\.cm-compose\{isolation:isolate\}/,'plate stays inside the composer, under its controls');
  assert.match(css,/#cgField \.cc-under\{opacity:0!important;pointer-events:none!important/);
});

test('overlap check: what sits under (or right next to) the bar is hidden, the rest stays',()=>{
  const bar={left:18,right:372,top:259,bottom:376};
  const box=(l,t,w,h)=>({left:l,top:t,right:l+w,bottom:t+h,width:w,height:h});
  assert.ok(C.overlaps(box(60,320,240,40),bar),'bubble behind the field');
  assert.ok(C.overlaps(box(100,230,80,24),bar),'bubble poking into the top edge');
  assert.ok(C.overlaps(box(100,376+C.PAD-1,80,20),bar),'touching the padding counts');
  assert.equal(C.overlaps(box(100,120,80,24),bar),false,'bubbles higher up stay visible');
  assert.equal(C.overlaps(box(100,376+C.PAD+1,80,20),bar),false);
  assert.equal(C.overlaps(box(100,300,0,0),bar),false,'hidden elements are ignored');
});

test('wired into the app and cached offline, loaded after the other Community styles',()=>{
  const iCss=html.indexOf('community-composer.css?v='),iJs=html.indexOf('community-composer.js?v=');
  assert.ok(iCss>html.indexOf('liquid-glass.css?v=')&&iCss>html.indexOf('misty-hub.css?v=')&&iCss>html.indexOf('community-standout.css?v='));
  assert.ok(iJs>iCss);
  assert.match(sw,/const STATIC = \[[^\]]*"community-composer\.css", "community-composer\.js"/);
  const js=read('community-composer.js');
  assert.doesNotMatch(js,/send|submit|cmSend|innerHTML/,'never touches chat behaviour');
});
