/* FAKE demo account for the promo video (no real person, no real posts). Clock is fixed by the harness. */
module.exports = (lang, base) => `try{
 if(!sessionStorage.getItem('promo.seeded')){
  sessionStorage.setItem('promo.seeded','1');
  const day=t=>{const d=new Date(t);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
  const now=${base}, h=3600e3;
  const m1=now-7*h, m2=now-11.5*h, m3=now-24*h, k=day(now);
  localStorage.setItem('lowispike.v2', JSON.stringify({v:2,setupDone:true,onboarded:true,user:{name:'Alex',bday:'1993-06-14'},xp:2400,settings:{lang:'${lang}'},
   ledger:[{eventId:'herb-first:planted',ts:now-20*24*h,src:'herb-first',xp:0},{day:k,ts:now-10*h,amt:2,src:'water',label:'Glass of water',eventId:'w1'},{day:k,ts:now-8*h,amt:2,src:'water',label:'Glass of water',eventId:'w2'},{day:k,ts:now-6*h,amt:2,src:'water',label:'Glass of water',eventId:'w3'},{day:k,ts:now-4*h,amt:2,src:'water',label:'Glass of water',eventId:'w4'},{day:k,ts:now-6.5*h,amt:5,src:'move:walk',label:'Walk',eventId:'mv1'}],
   logs:[
    {id:'meal:demo-1',eventId:'meal:demo-1',ts:m1,day:day(m1),t:'Salmon, broccoli and avocado',lvl:'low',r:'ja',e:'🥗',slot:'dinner',macros:{kcal:540,protein:38,carbs:9,sugar:3,fiber:7,fat:36}},
    {id:'meal:demo-2',eventId:'meal:demo-2',ts:m2,day:day(m2),t:'Greek yogurt with berries',lvl:'low',r:'ja',e:'🥣',slot:'breakfast'},
    {id:'meal:demo-3',eventId:'meal:demo-3',ts:m3,day:day(m3),t:'Omelette with spinach',lvl:'low',r:'ja',e:'🍳',slot:'lunch'}],saved:[]}));
  localStorage.setItem('lowispike.companion.v1', JSON.stringify({v:1,bday:'1993-06-14',btime:'08:30',n:0,name:'Nova',created:1}));
  const wt={};wt[k]=4;localStorage.setItem('lowi_fast_v1', JSON.stringify({last:m1,water:wt}));localStorage.setItem('lowi.daily.seen',k);
  localStorage.setItem('lowispike.companionprefs.v1', JSON.stringify({share:true,traits:true,born:now-20*24*h}));
  localStorage.setItem('lowi.pad.hint','1');localStorage.setItem('lowi.wh.hint.v1','{"travelled":1,"opens":9}');localStorage.setItem('lowi.hint.holdCommunity','1');localStorage.setItem('lowi.hint.communityHold','1');
  localStorage.setItem('lowispike.tutorial-auto.v1', JSON.stringify({s:'done'}));
  localStorage.setItem('lowispike.lang','${lang}');localStorage.setItem('lowi.lang','${lang}');
 }
}catch(e){}`;
