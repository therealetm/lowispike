'use strict';
/* Oct 16 (E-man: "I can't even send voice notes"): Community voice notes, photo thumbnails in the galaxy bubbles,
   tap = connection stream + talk, long-press = person card. */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const K=require('../community-chat-core.js');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const html=read('index.html'),js=read('community-chat.js'),css=read('community-voice.css'),sw=read('sw.js');
const UID='0f3c2b1a-1111-2222-3333-444455556666';
const SRC='https://abcdefghijklmnop.supabase.co/storage/v1/object/public/media/'+UID+'/voice-v1234abcd.m4a';
function storage(){const d={};return {getItem:k=>d[k]||null,setItem:(k,v)=>{d[k]=String(v);}};}

test('voice body: only our own media bucket link, from the sender\'s own folder, plays as a voice note',()=>{
 const body=K.voiceBody(SRC,7.4);
 assert.equal(body,'\u{1F3A4} '+SRC+'#d=7');
 assert.deepEqual(K.voice(body,UID),{src:SRC,dur:7,rest:''});
 assert.deepEqual(K.voice('@Bea '+body,UID),{src:SRC,dur:7,rest:'@Bea'});
 assert.equal(K.voice(body,'someone-else'),null,'a link into another member\'s folder stays text');
 assert.equal(K.voiceBody('https://evil.example.com/voice-abcd.m4a',3),'');
 assert.equal(K.voice('\u{1F3A4} https://evil.example.com/media/'+UID+'/voice-abcd.m4a',UID),null);
 assert.equal(K.voice('\u{1F3A4} javascript:alert(1)',UID),null);
 assert.equal(K.voice('just text',UID),null);
 for(const ext of ['m4a','mp4','aac','webm','ogg'])assert.ok(K.voice('\u{1F3A4} '+SRC.replace('.m4a','.'+ext),UID),ext);
 assert.equal(K.voice('\u{1F3A4} '+SRC.replace('.m4a','.exe'),UID),null);
 assert.equal(K.voice(K.voiceBody(SRC,0),UID).dur,1,'at least one second');
 assert.equal(K.voice(K.voiceBody(SRC,9999),UID).dur,600,'never more than ten minutes');
 assert.equal(K.photo(body,UID),null,'a voice note is never read as a photo');
});

test('a voice note goes through the same outbox: kept for retry, never dumped into the text draft',async()=>{
 let ok=false,sent=[];const body=K.voiceBody(SRC,4);
 const s=K.session({scope:UID,storage:storage(),id:()=>'unused',send:async m=>{sent.push({...m});if(!ok)throw Error('network');return {...m};}});
 await assert.rejects(s.submitPhoto('A',body,'v1234abcd',null));
 let st=s.state();
 assert.equal(st.outbox.length,1);assert.equal(st.outbox[0].id,'v1234abcd');assert.equal(st.outbox[0].t,body);
 assert.equal(st.draft.text,'','the voice link never lands in the text field');
 ok=true;await s.submitPhoto('A',body,'v1234abcd',null);
 st=s.state();assert.equal(st.outbox.length,0);assert.equal(sent.length,2);assert.equal(sent[1].id,'v1234abcd');
 await assert.rejects(s.submitPhoto('A','\u{1F3A4} https://evil.example.com/x.m4a','v2',null),/bad-photo/);
});

test('recording: mic key in the composer, MediaRecorder with an iOS-friendly type, upload to the media bucket, mic-off card',()=>{
 assert.match(js,/id="cmMic" class="cs-mic-btn" data-chat="mic"/);
 assert.match(js,/id="csRec"/);assert.match(js,/id="csMic"/);
 assert.match(js,/'audio\/mp4;codecs=mp4a\.40\.2','audio\/mp4'/,'iOS Safari records audio/mp4');
 assert.match(js,/md\.getUserMedia\(\{audio:/);
 assert.match(js,/path=scope\+'\/voice-'\+id\+'\.'\+ext/);
 assert.match(js,/sb\.storage\.from\('media'\)\.upload\(path,blob/);
 assert.match(js,/K\.voiceBody\(src,dur\)/);
 assert.match(js,/store\.submitPhoto\(name,tag\+body,id/);
 assert.match(js,/const VOICE_MAX=120/);
 assert.match(js,/micDenied:\[/);assert.match(js,/micCard\(/);
 assert.match(js,/if\(D\.hidden\)\{if\(vAudio&&!vAudio\.paused\)vAudio\.pause\(\);if\(rec\)recStop\(false\);\}/,'leaving the app stops recording without sending');
 assert.match(js,/function micSwap\(\)/);
});

test('playback: one shared audio, play buttons in the Chat room and in the galaxy bubbles',()=>{
 assert.match(js,/function voicePlay\(btn\)/);
 assert.match(js,/a==='voice'\)\{voicePlay\(b\);\}/);
 assert.match(js,/function voiceHtml\(vo,by,cls\)/);
 assert.match(js,/function msgBody\(m\)\{const vo=voiceOf\(m\);if\(vo\)return voiceHtml/);
 assert.match(js,/(html\+=|parts\.push\()vo\?button\('voice',inner/);
 assert.match(js,/class="cg-thumb"/,'a photo shows a thumbnail in its galaxy bubble');
});

test('tap a companion = connection stream and talk to them; long-press (or right-click) = person card',()=>{
 assert.match(js,/a==='person'\)\{connect\(b\.dataset\.uid,b\.dataset\.name\);\}/);
 assert.match(js,/function connect\(uid,name\)/);
 assert.match(js,/lpT=setTimeout\(\(\)=>\{lpT=0;if\(g&&g\.kind==='tap'&&pts\.size===1\)lpOpen\(body\);\},450\)/);
 assert.match(js,/gal\.addEventListener\('contextmenu'/);
 assert.match(js,/<svg class="cg-stream" id="cgStream"/);
 assert.match(js,/function streamDraw\(lines,v\)/);assert.match(js,/function streamSurge\(\)/);
});

test('a held press still opens the person card when the finger lift arrives before the hold timer (busy frame)',()=>{
 const end=js.slice(js.indexOf('const end=e=>{'),js.indexOf('const end=e=>{')+700);
 assert.match(end,/if\(lpT&&!lpHeld&&e\.type==='pointerup'&&g&&g\.kind==='tap'&&g\.body&&!pts\.size&&Date\.now\(\)-g\.t0>=450\)\{lpStop\(\);lpOpen\(g\.body\);\}/);
 assert.ok(end.indexOf('lpOpen(g.body)')<end.indexOf('if(lpHeld){'),'fallback runs before the held-press branch, so the tap does not also start a stream');
 assert.match(js,/body:body\|\|null\}/,'the pressed companion is remembered on the gesture');
});

test('voice keys live in the same composer row as the typing bar fix (camera, field, mic, send)',()=>{
 const row=js.slice(js.indexOf('<div class="cm-inrow">'),js.indexOf('<div class="cs-compose-meta">'));
 for(const id of ['cmPhoto','cmInput','cmMic','csRec','cmSend'])assert.ok(row.includes('id="'+id+'"'),id);
 assert.ok(row.indexOf('cmInput')<row.indexOf('cmMic')&&row.indexOf('cmMic')<row.indexOf('cmSend'),'mic between the field and send');
 assert.ok(html.includes('community-composer.css?v='),'typing bar styles still load');
});

test('voice styles load after the chat styles and are cached for offline',()=>{
 const iE=html.indexOf('community-energy.css?v='),iV=html.indexOf('community-voice.css?v='),iC=html.indexOf('community-chat.css?v=');
 assert.ok(iV>iE&&iE>iC,'community-voice.css after community-chat.css and community-energy.css');
 assert.equal((sw.match(/"community-voice\.css"/g)||[]).length,2,'in both sw.js lists');
 for(const sel of ['.cs-mic-btn','.cs-rec','.cs-rec-send','.cs-mic-card','.cs-voice','.cs-vp','.cg-vplay','.cg-thumb','.cg-stream','.cs-st-beads'])assert.ok(css.includes(sel),sel);
 assert.match(css,/\.cg-stream\{[^}]*pointer-events:none/,'the stream never takes a tap');
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(css,/url\((?!#)/,'no picture wallpaper');
});
