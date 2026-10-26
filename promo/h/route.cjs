const fs=require('fs');
const NUT=fs.readFileSync('/home/sprite/PROMO/nutella.json','utf8'), AI=fs.readFileSync('/home/sprite/PROMO/meal-ai.json','utf8');
const H0={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*','access-control-expose-headers':'*','content-type':'application/json'};
/* FAKE community messages (invented names, invented text). Nothing from the real database. */
const LANG=process.env.LANG2||'en';
const BASE=Date.parse(process.env.CLOCK||'2026-10-27T19:30:00+01:00');
const MSG={en:[
 ['Jonas','Swapped my afternoon croissant for Greek yogurt + nuts. No 3 PM crash today!',95],
 ['Priya','10-minute walk after lunch, done ✅ my companion just levelled up',70],
 ['Lena','Scanned my “healthy” granola… likely blood sugar spike. Back on the shelf 😅',48],
 ['Marco','Anyone tried the Caesar lettuce boats? Making them tonight',31],
 ['Sofia','Day 12 of my streak 🔥 small steps really add up',17],
 ['Jonas','@Marco yes! 10 minutes, super easy',9]],
 de:[
 ['Jonas','Croissant am Nachmittag gegen Joghurt mit Nüssen getauscht. Kein Tief um 15 Uhr!',95],
 ['Priya','10 Minuten Spaziergang nach dem Mittag ✅ mein Begleiter ist gerade aufgestiegen',70],
 ['Lena','Mein „gesundes“ Müsli gescannt… wahrscheinlicher Blutzuckeranstieg. Zurück ins Regal 😅',48],
 ['Marco','Hat jemand die Caesar-Salatschiffchen probiert? Gibt’s heute Abend',31],
 ['Sofia','Tag 12 meiner Serie 🔥 kleine Schritte zählen wirklich',17],
 ['Jonas','@Marco ja! 10 Minuten, total einfach',9]]};
const rows=()=> (MSG[LANG]||MSG.en).map((m,i)=>({id:'00000000-0000-4000-8000-00000000000'+i,user_id:'00000000-0000-4000-9000-00000000000'+i,who:m[0],body:m[1],reply_to:null,created_at:new Date(BASE-m[2]*60000).toISOString(),room:'galaxy',meal:null})).reverse();
const route=(q,u)=>{ if(/openfoodfacts/.test(u.host)) return {status:200,contentType:'application/json',body:NUT};
 if(/functions\/v1\/food-photo/.test(u.pathname)){ if(q.method()==='OPTIONS') return {status:200,headers:H0,body:'ok'}; if(q.method()==='GET') return {status:200,headers:H0,body:JSON.stringify({ok:true,configured:true,limit:3,left:2})}; return {status:200,headers:H0,body:AI}; }
 if(process.env.COMM && /supabase\.co$/.test(u.host)){
   if(q.method()==='OPTIONS') return {status:200,headers:H0,body:''};
   if(q.method()==='GET' && /rest\/v1\/messages/.test(u.pathname)) { if(/like/.test(u.search)) return {status:200,headers:H0,body:'[]'}; return {status:200,headers:H0,body:JSON.stringify(rows())}; }
   if(q.method()==='GET' && /rest\/v1\/reactions/.test(u.pathname)) return {status:200,headers:H0,body:JSON.stringify([{message_id:'00000000-0000-4000-8000-000000000001',user_id:'x1',who:'Sofia',emoji:'🔥'},{message_id:'00000000-0000-4000-8000-000000000001',user_id:'x2',who:'Marco',emoji:'🔥'},{message_id:'00000000-0000-4000-8000-000000000002',user_id:'x3',who:'Priya',emoji:'😂'}])};
   if(q.method()==='GET' && /rest\/v1\//.test(u.pathname)) return {status:200,headers:H0,body:'[]'};
   if(q.method()==='GET' && /auth\/v1\/user/.test(u.pathname)) return {status:200,headers:H0,body:JSON.stringify({id:'00000000-0000-4000-9000-0000000000aa',aud:'authenticated',role:'authenticated',email:'demo@example.invalid',user_metadata:{name:'Alex'}})};
   return null; /* every write is aborted */
 }
 return null;};
module.exports={route};
