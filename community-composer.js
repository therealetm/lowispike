/* Oct 16 (E-man: "I can almost not even see my writing"): while you type in Community, speech bubbles and names that
   would sit under the typing bar are faded out (class cc-under, see community-composer.css), so the bar only ever shows
   what you type. Runs only while the keyboard is up; touches no chat logic. */
(function(){
'use strict';
const PAD=10;
function overlaps(r,c){return r.width>0&&r.height>0&&r.left<c.right+PAD&&c.left-PAD<r.right&&r.top<c.bottom+PAD&&c.top-PAD<r.bottom;}
if(typeof module!=='undefined'&&module.exports)module.exports={overlaps,PAD};
if(typeof document==='undefined')return;
const D=document,H=D.documentElement;
let raf=0;
function mark(){
  const field=D.getElementById('cgField'),comp=D.querySelector('#cmPaneChat .cm-compose');
  if(!field||!comp)return 0;
  const c=comp.getBoundingClientRect();let n=0;
  for(const el of field.querySelectorAll('.cg-bub,.cg-name')){
    /* measure without our own fade so a bubble comes back as soon as it moves away */
    const on=overlaps(el.getBoundingClientRect(),c);el.classList.toggle('cc-under',on);if(on)n++;}
  return n;}
function clear(){for(const el of D.querySelectorAll('#cgField .cc-under'))el.classList.remove('cc-under');}
function typing(){return H.classList.contains('cs-chat-typing');}
function loop(){raf=0;if(!typing()){clear();return;}mark();raf=requestAnimationFrame(loop);}
function sync(){if(typing()){if(!raf)raf=requestAnimationFrame(loop);}else{if(raf){cancelAnimationFrame(raf);raf=0;}clear();}}
try{new MutationObserver(sync).observe(H,{attributes:true,attributeFilter:['class']});}catch(e){}
sync();
window.LowiComposer={mark,clear,sync,overlaps};
})();
