'use strict';
/* Bug hunt BH-020 (Oct 20 2026): a Community photo with a caption takes seconds to upload and the composer stays usable.
   Old code: when the upload landed it cleared the whole draft and the input, so a message typed during the upload was lost
   (live 20261020-030834, playtest/probe-photo-caption.cjs: typed "Is the soup any good?" while "Sending photo…" -> input empty).
   Now only what went out with the photo leaves the composer. Pattern: async result painted into stale UI (stale snapshot). */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const K=require('../community-chat-core.js');
const js=fs.readFileSync(path.join(__dirname,'..','community-chat.js'),'utf8');
const UID='0f3c2b1a-1111-2222-3333-444455556666';
const SRC='https://abcdefghijklmnop.supabase.co/storage/v1/object/public/media/'+UID+'/chat-p1234abcd.jpg';
function storage(){const d={};return {getItem:k=>d[k]||null,setItem:(k,v)=>{d[k]=String(v);}};}

test('nothing typed during the upload: the caption and the answered reply leave the composer',()=>{
 assert.deepEqual(K.afterCaption({text:'Lunch today',reply:'m1'},{text:'Lunch today',reply:'m1'}),{text:'',reply:null});
 assert.deepEqual(K.afterCaption({text:'Lunch today ',reply:null},{text:'Lunch today',reply:null}),{text:'',reply:null});
});
test('caption cleared and a new message typed during the upload: the new message stays',()=>{
 assert.deepEqual(K.afterCaption({text:'Lunch today',reply:null},{text:'Is the soup any good?',reply:null}),{text:'Is the soup any good?',reply:null});
});
test('kept typing after the caption: only the caption part goes, the rest stays',()=>{
 assert.deepEqual(K.afterCaption({text:'Lunch today',reply:null},{text:'Lunch today and a question',reply:null}),{text:'and a question',reply:null});
});
test('no caption: whatever was typed meanwhile stays; a reply picked during the upload stays, the answered one goes',()=>{
 assert.deepEqual(K.afterCaption({text:'',reply:null},{text:'hey',reply:null}),{text:'hey',reply:null});
 assert.deepEqual(K.afterCaption({text:'Lunch',reply:'m1'},{text:'Lunch',reply:'m2'}),{text:'',reply:'m2'});
 assert.deepEqual(K.afterCaption({text:'',reply:'m1'},{text:'',reply:'m1'}),{text:'',reply:null});
 assert.deepEqual(K.afterCaption(null,null),{text:'',reply:null});
});
test('with the real outbox session: text typed during the upload survives the photo send',async()=>{
 const s=K.session({scope:UID,storage:storage(),id:()=>'unused',send:async m=>({...m})});
 s.setDraft('Lunch today',null);const sent=s.state().draft;
 s.setDraft('Is the soup any good?',null);
 const left=K.afterCaption(sent,s.state().draft);s.setDraft(left.text,left.reply);
 await s.submitPhoto('A',K.photoBody(SRC,'Lunch today'),'p1234abcd',null);
 assert.equal(s.state().draft.text,'Is the soup any good?');
});
test('sendPhoto reads the composer again after the upload and keeps what was typed (no blind clear)',()=>{
 const fn=js.slice(js.indexOf('async function sendPhoto('),js.indexOf('async function mediaUpload('));
 assert.ok(fn.length>100);
 assert.doesNotMatch(fn,/if\(ds\.draft\.text\)draft\('',null\)/,'old blind clear of the whole draft');
 assert.doesNotMatch(fn,/inp\.value=''/,'old blind clear of the input');
 const up=fn.indexOf('await mediaUpload('),use=fn.indexOf('K.afterCaption(ds.draft,draftState().draft)');
 assert.ok(up>0&&use>up,'afterCaption runs on the composer as it is after the upload');
 assert.match(fn,/inp\.value=left\.text/);
});
