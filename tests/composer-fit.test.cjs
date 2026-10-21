'use strict';
/* 21 Oct 2026 (Eman: camera and mic cover "Write to the galaxy"; the day/night button covers the word "Room").
   The typing field comes first with camera and mic to its right; the room chip keeps clear of the floating Day/Night
   switch and profile picture (beside the tabs when it fits, else on its own line under them). */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');

test('composer: the field comes first, camera then mic/send float to its right (markup order, so focus follows it)',()=>{
 const js=read('community-chat.js');const row=js.slice(js.indexOf('<div class="cm-inrow">'),js.indexOf('<div class="cs-compose-meta">'));
 const at=id=>row.indexOf('id="'+id+'"');
 for(const id of ['cmInput','cmPhoto','cmPhotoFile','cmMic','cmSend'])assert.ok(at(id)>0,id);
 assert.ok(at('cmInput')<at('cmPhoto'),'field before camera');assert.ok(at('cmPhoto')<at('cmMic'),'camera before mic');assert.ok(at('cmMic')<at('cmSend'));
 assert.ok(row.startsWith('<div class="cm-inrow"><textarea id="cmInput"'),'nothing sits left of the field');
 /* no CSS reorders the row back */
 for(const f of ['community-chat.css','community-voice.css','community-composer.css','liquid-glass.css'])assert.doesNotMatch(read(f).replace(/textarea#cmInput\{order:0\}/g,''),/#cm(Photo|Mic|Input)[^{,]*\{[^}]*[{;\s]order\s*:/,f);
});

test('room bar: chip margin and wrap rules exist',()=>{
 const css=read('community-rooms.css');
 assert.match(css,/\.rm-bar \.rm-chip\{margin-right:var\(--rm-tr,0px\)\}/);
 assert.match(css,/\.rm-bar\[data-rm-wrap\]::after\{content:'';flex-basis:100%/);
 assert.match(css,/\.rm-bar\[data-rm-wrap\] \.rm-chip\{order:2\}/);
});

function world(opts){
 const rect=(l,t,w,h)=>({left:l,top:t,right:l+w,bottom:t+h,width:w,height:h});
 const els={};const mk=(id,r,extra)=>Object.assign({id,__r:r,getBoundingClientRect(){return this.__r;},hidden:false,attrs:{},style:{props:{},setProperty(k,v){this.props[k]=v;}},
  toggleAttribute(k,on){if(on)this.attrs[k]=1;else delete this.attrs[k];},hasAttribute(k){return !!this.attrs[k];}},extra||{});
 const tabs=mk('tabs',rect(24,16,155,40)),chip=mk('chip',rect(0,0,0,0),{offsetWidth:opts.chipW});
 const bar=mk('bar',rect(18,12,opts.vw-36,44),{querySelector:s=>s==='.rm-tabs'?tabs:s==='.rm-chip'?chip:null});
 if(opts.pf)els.pfBtn=mk('pfBtn',rect(opts.vw-58,9,44,44),{display:opts.pfDisplay||'block'});
 if(opts.dn)els.tbTheme=mk('tbTheme',rect(opts.vw-108,9,44,44),{display:'grid'});
 const D={readyState:'loading',addEventListener(){},getElementById:id=>els[id]||null,documentElement:{}};
 const W={getComputedStyle:e=>({display:e.display||'block',visibility:'visible'}),addEventListener(){},LowiRooms:null};
 const ctx={window:W,document:D,setInterval(){},setTimeout(){},MutationObserver:undefined};vm.createContext(ctx);
 vm.runInContext(read('community-rooms-ui.js'),ctx);
 W.LowiRoomsUI.fit(bar);return {bar,chip};
}

test('room bar: a short chip sits beside the tabs, left of the switch and the picture with an 8 px gap',()=>{
 const {bar}=world({vw:430,pf:true,dn:true,chipW:84});
 /* picture at 372, its switch spot from 320 -> chip ends at 312: bar right 412 - 312 = 100 */
 assert.equal(bar.style.props['--rm-tr'],'100px');assert.equal(bar.hasAttribute('data-rm-wrap'),false);
});

test('room bar: "Room 3 · 12 here" that does not fit beside the tabs goes on its own line, not under the buttons',()=>{
 const {bar}=world({vw:390,pf:true,dn:true,chipW:150});
 assert.equal(bar.hasAttribute('data-rm-wrap'),true);assert.equal(bar.style.props['--rm-tr'],'0px');
});

test('room bar: the switch spot is reserved from the picture even before top-bar.js placed the switch',()=>{
 const {bar}=world({vw:430,pf:true,dn:false,chipW:84});
 assert.equal(bar.style.props['--rm-tr'],'100px');
});

test('room bar: with the picture hidden the chip keeps its place at the right edge',()=>{
 const {bar}=world({vw:390,pf:true,pfDisplay:'none',dn:false,chipW:150});
 assert.equal(bar.style.props['--rm-tr'],'0px');assert.equal(bar.hasAttribute('data-rm-wrap'),false);
});
