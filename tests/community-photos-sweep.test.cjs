'use strict';
/* Oct 16 (handoff Tasks 11 + 8): Community chat photos, person cards and the blue-glass style sweep. */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const K=require('../community-chat-core.js');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const html=read('index.html'),js=read('community-chat.js'),css=read('community-chat.css'),sweep=read('style-sweep.css'),sw=read('sw.js');
const UID='0f3c2b1a-1111-2222-3333-444455556666';
const SRC='https://abcdefghijklmnop.supabase.co/storage/v1/object/public/media/'+UID+'/chat-p1234abcd.jpg';
function storage(){const d={};return {getItem:k=>d[k]||null,setItem:(k,v)=>{d[k]=String(v);}};}

test('photo body: only our own media bucket link, from the sender\'s own folder, renders as a picture',()=>{
 const body=K.photoBody(SRC,'  Lunch   today ');
 assert.equal(body,'\u{1F4F7} '+SRC+' Lunch today');
 assert.deepEqual(K.photo(body,UID),{src:SRC,caption:'Lunch today'});
 assert.equal(K.photo(body,'someone-else'),null,'a link into another member\'s folder is plain text');
 assert.equal(K.photoBody('https://evil.example.com/x.jpg','hi'),'');
 assert.equal(K.photo('\u{1F4F7} https://evil.example.com/media/'+UID+'/chat-abcd.jpg',UID),null);
 assert.equal(K.photo('\u{1F4F7} javascript:alert(1)',UID),null);
 assert.equal(K.photo('just text',UID),null);
});
test('photo body stays inside the 600 character message limit',()=>{
 const body=K.photoBody(SRC,'x'.repeat(2000));
 assert(body.length<=600,'length '+body.length);
 assert.equal(K.photo(body,UID).src,SRC);
});
test('a photo goes through the same outbox: one send, kept for retry with the same id, never dumped into the text draft',async()=>{
 let ok=false,sent=[];const body=K.photoBody(SRC,'hi');
 const s=K.session({scope:UID,storage:storage(),id:()=>'unused',send:async m=>{sent.push({...m});if(!ok)throw Error('network');return {...m};}});
 s.setDraft('typed text',null);
 await assert.rejects(s.submitPhoto('A',body,'p1234abcd',null));
 assert.equal(s.state().outbox.length,1);assert.equal(s.state().outbox[0].status,'unconfirmed');assert.equal(s.state().outbox[0].id,'p1234abcd');
 assert.equal(s.state().draft.text,'typed text','the text draft is untouched');
 ok=true;await s.submitPhoto('A',body,'p1234abcd',null);
 assert.equal(sent.length,2);assert.equal(sent[1].id,sent[0].id);assert.equal(s.state().outbox.length,0);
 await assert.rejects(s.submitPhoto('A','\u{1F4F7} https://evil.example.com/a.jpg','x',null));
});
test('photos are shrunk on the device (1600 px JPEG, size cap) and uploaded to the media bucket under the member\'s folder',()=>{
 assert.match(js,/1600\/Math\.max\(w0,h0\)/);
 assert.match(js,/'image\/jpeg',\.82/);
 assert.match(js,/file\.size>25e6/);
 assert.match(js,/from\('media'\)\.upload\(path/);
 assert.match(js,/const path=scope\+'\/chat-'\+pin\.id\+'\.jpg'/);
 assert.match(js,/id="cmPhotoFile" accept="image\/\*"/);
 assert.match(js,/a==='photo-pick'\)\{pickPhoto\(\)/);
 assert.match(js,/photoBots/,'bots never get photos');
});
test('thread shows the picture and caption, never the raw link; previews and alerts say "New picture"',()=>{
 assert.match(js,/function msgBody\(m\)/);
 assert.match(js,/class="cs-photo" data-chat="photo"/);
 assert.match(js,/function plain\(m\)/);
 assert.match(css,/\.cs-photo/);
});
test('tapping a person opens the glass person card with only shared details and real actions',()=>{
 assert.match(js,/function openPerson\(id,name\)/);
 assert.match(js,/function openProfile\(id,name\)\{if\(!blocked\(id\)\)\{openPerson\(id,name\);return;\}/);
 assert.match(js,/a==='person'\)\{openProfile\(/);
 assert.match(js,/pcNotShared/);
 assert.match(js,/button\('select-close'/);
 assert.match(js,/button\('energy'/);
 assert.match(css,/\.cp-card/);
 assert.match(html,/bday:\/\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$\/\.test/,'own birthday only, read locally');
});
test('style sweep: one scoped layer loaded after liquid glass, cached offline, no picture wallpaper, no gold',()=>{
 assert.match(html,/<script src="liquid-glass\.js\?v=[0-9-]+"><\/script>\n<link rel="stylesheet" id="sweepCss" href="style-sweep\.css\?v=[0-9-]+">/);
 assert.equal((sw.match(/"style-sweep\.css"/g)||[]).length,2);
 assert.doesNotMatch(sweep,/url\(/i,'no image wallpapers in the sweep');
 assert.doesNotMatch(sweep,/#(ffd|f5c|e8b|d4a|ffc107|ffb)/i,'no gold left in the sweep');
 assert.match(sweep,/--ms-glass:/);
});
test('style sweep leaves the reserved areas alone',()=>{
 for(const re of [/moon/i,/\.fy-/,/foryou/i,/mv-player|workout/i,/flight/i,/ipad-banner|\.ib-/i,/companion/i,/audio/i])assert.doesNotMatch(sweep.replace(/\/\*[\s\S]*?\*\//g,''),re,String(re));
});
