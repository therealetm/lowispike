/* Shared profile details (24 Oct 2026, Emmanuel: "Birthday mandatory shared with a countdown to the next birthday, star sign mandatory
   shared, personality shared if they have one, else a link to the personality test in their language").
   Pure rules, no DOM. Since 24 Oct 2026 08:30 (Emmanuel: "always visible, not optional, no hide toggle") this goes public for every
   account that has a birthday saved, with no consent step and no opt-out (the setup and Community settings say so):
     profiles.bday = '0004-MM-DD'  day and month only. Year 0004 is a marker, never a birth year (the column's check wants YYYY-MM-DD;
                                   0004 is a leap year, so 29 February fits). Nobody's age or birth year ever leaves the phone.
     profiles.sign = the star sign worked out from that day (never typed in or guessed)
     profiles.mbti = their personality type, only when they have set one
   Readers accept another person's birthday, sign and type ONLY in that form: an older row with a real year (written before
   this rule) is treated as not shared. */
(function(root){
'use strict';
const YEAR='0004';
const SIGNS=['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
/* [sign, first month, first day] in calendar order; tropical dates as used by the rest of the app (index.html zodiac()) */
const STARTS=[['Capricorn',1,1],['Aquarius',1,20],['Pisces',2,19],['Aries',3,21],['Taurus',4,20],['Gemini',5,21],['Cancer',6,21],['Leo',7,23],['Virgo',8,23],['Libra',9,23],['Scorpio',10,23],['Sagittarius',11,22],['Capricorn',12,22]];
const NAMES={
 en:{Aries:'Aries',Taurus:'Taurus',Gemini:'Gemini',Cancer:'Cancer',Leo:'Leo',Virgo:'Virgo',Libra:'Libra',Scorpio:'Scorpio',Sagittarius:'Sagittarius',Capricorn:'Capricorn',Aquarius:'Aquarius',Pisces:'Pisces'},
 de:{Aries:'Widder',Taurus:'Stier',Gemini:'Zwillinge',Cancer:'Krebs',Leo:'Löwe',Virgo:'Jungfrau',Libra:'Waage',Scorpio:'Skorpion',Sagittarius:'Schütze',Capricorn:'Steinbock',Aquarius:'Wassermann',Pisces:'Fische'},
 es:{Aries:'Aries',Taurus:'Tauro',Gemini:'Géminis',Cancer:'Cáncer',Leo:'Leo',Virgo:'Virgo',Libra:'Libra',Scorpio:'Escorpio',Sagittarius:'Sagitario',Capricorn:'Capricornio',Aquarius:'Acuario',Pisces:'Piscis'}};
const GLYPH={Aries:'♈',Taurus:'♉',Gemini:'♊',Cancer:'♋',Leo:'♌',Virgo:'♍',Libra:'♎',Scorpio:'♏',Sagittarius:'♐',Capricorn:'♑',Aquarius:'♒',Pisces:'♓'};
/* The free 16Personalities test in each app language (pages checked open on 24 Oct 2026). */
const TEST={en:'https://www.16personalities.com/free-personality-test',de:'https://www.16personalities.com/de/kostenloser-personlichkeitstest',es:'https://www.16personalities.com/es/test-de-personalidad'};
const L=l=>l==='de'||l===1?'de':l==='es'||l===2?'es':'en';
const leap=y=>(y%4===0&&y%100!==0)||y%400===0;
const DIM=[31,29,31,30,31,30,31,31,30,31,30,31];
const type=v=>/^[IE][NS][TF][JP]$/.test(String(v||'').toUpperCase().slice(0,4))?String(v).toUpperCase().slice(0,4):'';
/* {m,d} from a full date YYYY-MM-DD (own private birthday) - or null */
function monthDay(v){const s=String(v==null?'':v).trim(),x=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s);if(!x)return null;const y=+x[1],m=+x[2],d=+x[3];if(m<1||m>12||d<1||d>DIM[m-1])return null;if(m===2&&d===29&&!leap(y))return null;return {m,d};}
/* the public form of a birthday: '0004-MM-DD', or '' */
function encode(v){const md=monthDay(v);return md?YEAR+'-'+String(md.m).padStart(2,'0')+'-'+String(md.d).padStart(2,'0'):'';}
/* {m,d} from a public birthday; anything else (a real year, junk) -> null, so an old full birthday never shows */
function decode(v){const s=String(v==null?'':v).trim();return s.slice(0,5)===YEAR+'-'?monthDay(s):null;}
function signOf(md){if(!md)return '';let z='';for(const s of STARTS)if(md.m>s[1]||(md.m===s[1]&&md.d>=s[2]))z=s[0];return z;}
function signName(sign,lang){return SIGNS.includes(sign)?NAMES[L(lang)][sign]:'';}
function glyph(sign){return GLYPH[sign]||'';}
/* the next birthday from today (local days). 29 February is kept on 28 February in years without one. 0 = today. */
function next(md,now){if(!md)return null;const t=new Date(now==null?Date.now():now);t.setHours(0,0,0,0);
 const on=y=>new Date(y,md.m-1,md.m===2&&md.d===29&&!leap(y)?28:md.d);
 let n=on(t.getFullYear());if(n<t)n=on(t.getFullYear()+1);return {days:Math.round((n-t)/864e5),date:n};}
function dayMonth(md,lang){if(!md)return '';try{return new Date(2000,md.m-1,md.d,12).toLocaleDateString({en:'en-GB',de:'de-DE',es:'es-ES'}[L(lang)],{day:'numeric',month:'long'});}catch(e){return md.d+'.'+md.m+'.';}}
const CD={en:['Birthday today! 🎉','Tomorrow','in {n} days'],de:['Heute Geburtstag! 🎉','Morgen','in {n} Tagen'],es:['¡Cumpleaños hoy! 🎉','Mañana','en {n} días']};
function countdown(days,lang){const c=CD[L(lang)];return days===0?c[0]:days===1?c[1]:c[2].replace('{n}',String(days));}
function testLink(lang){return TEST[L(lang)];}
/* what pushProfile publishes for this person: day/month, the sign from it and their type; all '' without a valid birthday (nothing invented) */
function publicRow(user,mbti){user=user||{};const b=encode(user.bday);if(!b)return {bday:'',sign:'',mbti:''};return {bday:b,sign:signOf(decode(b)),mbti:type(mbti)};}
/* what the app may show for someone else's profile row: their shared day/month, sign and type, or nothing */
function readPublic(row){row=row||{};const md=decode(row.bday);if(!md)return {bday:'',s:'',t:'',md:null};return {bday:encode(YEAR+row.bday.slice(4)),s:signOf(md),t:type(row.mbti||row.t),md};}
const api={YEAR,SIGNS,TEST,type,monthDay,encode,decode,signOf,signName,glyph,next,dayMonth,countdown,testLink,publicRow,readPublic,leap};
if(typeof module==='object'&&module.exports)module.exports=api;else root.LowiProfileShare=api;
})(typeof window==='object'?window:globalThis);
