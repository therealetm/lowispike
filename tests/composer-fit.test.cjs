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

test('room bar: row 1 reserves the floating buttons, the tabs get their own full row',()=>{
 const css=read('community-rooms.css');
 assert.match(css,/\.rm-bar \.rm-head\{padding-right:var\(--rm-tr,0px\)\}/);
 assert.match(css,/\.rm-tabs\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
});

function world(opts){
 const rect=(l,t,w,h)=>({left:l,top:t,right:l+w,bottom:t+h,width:w,height:h});
 const els={};const mk=(id,r,extra)=>Object.assign({id,__r:r,getBoundingClientRect(){return this.__r;},hidden:false,attrs:{},style:{props:{},setProperty(k,v){this.props[k]=v;}},
  toggleAttribute(k,on){if(on)this.attrs[k]=1;else delete this.attrs[k];},hasAttribute(k){return !!this.attrs[k];}},extra||{});
 const head=mk('head',rect(18,12,opts.vw-36,52));
 const bar=mk('bar',rect(18,12,opts.vw-36,112),{querySelector:s=>s==='.rm-head'?head:null});
 if(opts.pf)els.pfBtn=mk('pfBtn',rect(opts.vw-58,9,44,44),{display:opts.pfDisplay||'block'});
 if(opts.dn)els.tbTheme=mk('tbTheme',rect(opts.vw-108,9,44,44),{display:'grid'});
 const D={readyState:'loading',addEventListener(){},getElementById:id=>els[id]||null,documentElement:{}};
 const W={getComputedStyle:e=>({display:e.display||'block',visibility:'visible'}),addEventListener(){},LowiRooms:null};
 const ctx={window:W,document:D,setInterval(){},setTimeout(){},MutationObserver:undefined,location:{hash:''}};vm.createContext(ctx);
 vm.runInContext(read('community-rooms-ui.js'),ctx);
 W.LowiRoomsUI.fit(bar);return {bar};
}

test('room bar: row 1 ends 8 px before the switch and the picture',()=>{
 const {bar}=world({vw:430,pf:true,dn:true});
 /* picture at 372, its switch spot from 320 -> row 1 ends at 312: head right 412 - 312 = 100 */
 assert.equal(bar.style.props['--rm-tr'],'100px');
});

test('room bar: the switch spot is reserved from the picture even before top-bar.js placed the switch',()=>{
 const {bar}=world({vw:430,pf:true,dn:false});
 assert.equal(bar.style.props['--rm-tr'],'100px');
});

test('room bar: with the picture hidden row 1 uses the full width',()=>{
 const {bar}=world({vw:390,pf:true,pfDisplay:'none',dn:false});
 assert.equal(bar.style.props['--rm-tr'],'0px');
});
