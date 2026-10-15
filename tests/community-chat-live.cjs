/* Run only with two dedicated authorized test accounts in the project's secure environment.
   Tokens are read from environment, never printed, saved, or accepted as command arguments. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {LOWI_CHAT_TEST_URL:url,LOWI_CHAT_TEST_PUBLIC_KEY:key,LOWI_CHAT_TEST_A_TOKEN:aToken,LOWI_CHAT_TEST_B_TOKEN:bToken}=process.env;
if(!url||!key||!aToken||!bToken||process.env.LOWI_CHAT_TEST_ALLOW_WRITES!=='1'){
 console.log('SKIP: two authorized test-account tokens and explicit test-write configuration are unavailable. No backend requests or writes made.');process.exit(0);
}
async function user(token){const r=await fetch(url+'/auth/v1/user',{headers:{apikey:key,Authorization:'Bearer '+token}});if(!r.ok)throw Error('test-account authorization failed');return (await r.json()).id;}
function promiseEvent(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});promise.catch(()=>{});const timer=setTimeout(()=>reject(Error('realtime delivery timed out')),15000);return{promise,resolve:v=>{clearTimeout(timer);resolve(v);},cancel:()=>clearTimeout(timer)};}
(async()=>{
 const aId=await user(aToken),bId=await user(bToken);assert.notEqual(aId,bId,'two separate authorized test accounts required');
 const sdk=vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../vendor/supabase-2.117.3.js'),'utf8')+';supabase;',{fetch,URL,Headers,Request,Response,WebSocket,AbortController,Blob,TextDecoder,TextEncoder,FormData,Buffer,setTimeout,clearTimeout,setInterval,clearInterval,console});
 const options=t=>({global:{headers:{Authorization:'Bearer '+t}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}),a=sdk.createClient(url,key,options(aToken)),b=sdk.createClient(url,key,options(bToken));
 await a.realtime.setAuth(aToken);await b.realtime.setAuth(bToken);
 const tag='chat-qa-'+require('node:crypto').randomUUID(),ids=[tag+'a',tag+'b',tag+'s'];let channel=null;const inserted=promiseEvent(),deleted=promiseEvent();
 const check=async q=>{const r=await q;if(r.error)throw Error('backend operation rejected');return r.data;};
 try{
  await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('subscription timeout')),12000);channel=b.channel(tag).on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},p=>{if(p.new.id===ids[0])inserted.resolve(p.new);}).on('postgres_changes',{event:'DELETE',schema:'public',table:'messages'},p=>{if(p.old.id===ids[0])deleted.resolve(p.old);}).subscribe(s=>{if(s==='SUBSCRIBED'){clearTimeout(timeout);resolve();}else if(s==='CHANNEL_ERROR'||s==='TIMED_OUT'){clearTimeout(timeout);reject(Error('realtime subscription failed'));}});});
  await check(a.from('messages').insert({id:ids[0],user_id:aId,who:'Authorized chat QA A',body:'Authorized integration test. This message will be removed.',room:'all'}));await inserted.promise;console.log('PASS: A insert delivered to B over realtime');
  await check(b.from('messages').insert({id:ids[1],user_id:bId,who:'Authorized chat QA B',body:'Authorized test reply.',room:'all',reply_to:ids[0]}));
  const reply=await check(a.from('messages').select('reply_to').eq('id',ids[1]).single());assert.equal(reply.reply_to,ids[0]);console.log('PASS: reply persisted and readable by the other account');
  await check(b.from('reactions').insert({message_id:ids[0],user_id:bId,who:'QA B',emoji:'🌱'}));const rx=await check(a.from('reactions').select('user_id').eq('message_id',ids[0]));assert(rx.some(r=>r.user_id===bId));console.log('PASS: allowed reaction persisted');
  await a.from('messages').update({body:'unauthorized edit'}).eq('id',ids[1]);const owned=await check(b.from('messages').select('body').eq('id',ids[1]).single());assert.equal(owned.body,'Authorized test reply.');console.log('PASS: A cannot edit B message');
  await b.from('messages').delete().eq('id',ids[0]);const kept=await check(a.from('messages').select('id').eq('id',ids[0]).single());assert.equal(kept.id,ids[0]);console.log('PASS: B cannot delete A message');
  const spoof=await a.from('messages').insert({id:ids[2],user_id:bId,who:'QA',body:'Ownership spoof test',room:'all'});assert(spoof.error,'owner spoof must be rejected');console.log('PASS: forged user_id insert rejected');
  await check(a.from('messages').delete().eq('id',ids[0]).eq('user_id',aId));await deleted.promise;console.log('PASS: owner deletion delivered to B over realtime');
 }finally{
  inserted.cancel();deleted.cancel();for(const client of [a,b]){await client.from('messages').delete().in('id',ids);await client.removeAllChannels();}
 }
})().catch(()=>{console.error('FAIL: backend integration check failed. Inspect the secure test environment; credentials are not logged.');process.exitCode=1;});
