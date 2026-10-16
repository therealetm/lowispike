/* Herb identity: one stable name, voice and symbol from the star sign (playful styling only, never psychology)
   plus the personality type the user already chose. Pure rules, no DOM. */
(function(root){
'use strict';
const SIGNS=[['Aries','fire'],['Taurus','earth'],['Gemini','air'],['Cancer','water'],['Leo','fire'],['Virgo','earth'],['Libra','air'],['Scorpio','water'],['Sagittarius','fire'],['Capricorn','earth'],['Aquarius','air'],['Pisces','water']];
const SIGN_NAMES=SIGNS.map(s=>s[0]);
/* same edges as herb-core.js and index.html zodiac(): [sign, month, last day of that sign in the month] */
const EDGES=[['Capricorn',1,19],['Aquarius',2,18],['Pisces',3,20],['Aries',4,19],['Taurus',5,20],['Gemini',6,20],['Cancer',7,22],['Leo',8,22],['Virgo',9,22],['Libra',10,22],['Scorpio',11,21],['Sagittarius',12,21],['Capricorn',13,0]];
const SIGN_LABEL={
 en:{Aries:'Aries',Taurus:'Taurus',Gemini:'Gemini',Cancer:'Cancer',Leo:'Leo',Virgo:'Virgo',Libra:'Libra',Scorpio:'Scorpio',Sagittarius:'Sagittarius',Capricorn:'Capricorn',Aquarius:'Aquarius',Pisces:'Pisces'},
 de:{Aries:'Widder',Taurus:'Stier',Gemini:'Zwillinge',Cancer:'Krebs',Leo:'Löwe',Virgo:'Jungfrau',Libra:'Waage',Scorpio:'Skorpion',Sagittarius:'Schütze',Capricorn:'Steinbock',Aquarius:'Wassermann',Pisces:'Fische'},
 es:{Aries:'Aries',Taurus:'Tauro',Gemini:'Géminis',Cancer:'Cáncer',Leo:'Leo',Virgo:'Virgo',Libra:'Libra',Scorpio:'Escorpio',Sagittarius:'Sagitario',Capricorn:'Capricornio',Aquarius:'Acuario',Pisces:'Piscis'}};
/* first word: star sign (kept from the earlier names, so a Pisces herb stays Misty) */
const FIRST={Aries:'Ember',Taurus:'Clover',Gemini:'Pip',Cancer:'Pearl',Leo:'Sunny',Virgo:'Sage',Libra:'Lumi',Scorpio:'Nyx',Sagittarius:'Nova',Capricorn:'Moss',Aquarius:'Orbit',Pisces:'Misty'};
/* second word: the full type, one word each (the old two-letter words stay with one type of their family) */
const SECOND={INFP:'Moon',INFJ:'Dusk',INTJ:'Comet',INTP:'Quill',ENFP:'Star',ENFJ:'Glow',ENTJ:'Blaze',ENTP:'Spark',ISFJ:'Dew',ISFP:'Petal',ISTJ:'Root',ISTP:'Pebble',ESFP:'Ray',ESFJ:'Honey',ESTJ:'Oak',ESTP:'Zip'};
const TYPES=Object.keys(SECOND);
const FALLBACK_FIRST='Minti',FALLBACK_SECOND='Leaf';
const TYPE_LABEL={
 en:{INTJ:'Architect',INTP:'Logician',ENTJ:'Commander',ENTP:'Debater',INFJ:'Advocate',INFP:'Mediator',ENFJ:'Protagonist',ENFP:'Campaigner',ISTJ:'Logistician',ISFJ:'Defender',ESTJ:'Executive',ESFJ:'Consul',ISTP:'Virtuoso',ISFP:'Adventurer',ESTP:'Entrepreneur',ESFP:'Entertainer'},
 de:{INTJ:'Architekt',INTP:'Logiker',ENTJ:'Kommandant',ENTP:'Debattierer',INFJ:'Fürsprecher',INFP:'Mediator',ENFJ:'Protagonist',ENFP:'Aktivist',ISTJ:'Logistiker',ISFJ:'Verteidiger',ESTJ:'Organisator',ESFJ:'Konsul',ISTP:'Virtuose',ISFP:'Abenteurer',ESTP:'Unternehmer',ESFP:'Entertainer'},
 es:{INTJ:'Arquitecto',INTP:'Lógico',ENTJ:'Comandante',ENTP:'Innovador',INFJ:'Abogado',INFP:'Mediador',ENFJ:'Protagonista',ENFP:'Activista',ISTJ:'Logista',ISFJ:'Defensor',ESTJ:'Ejecutivo',ESFJ:'Cónsul',ISTP:'Virtuoso',ISFP:'Aventurero',ESTP:'Emprendedor',ESFP:'Animador'}};
const TRAIT={
 en:{I:'calm',E:'bubbly',N:'dreamy',S:'down to earth',T:'clever',F:'big-hearted',J:'tidy',P:'spontaneous',fire:'sparky and quick',earth:'cozy and grounded',air:'breezy and witty',water:'gentle and splashy'},
 de:{I:'ruhig',E:'quirlig',N:'verträumt',S:'bodenständig',T:'schlau',F:'herzlich',J:'ordentlich',P:'spontan',fire:'feurig und flink',earth:'gemütlich und geerdet',air:'luftig und witzig',water:'sanft und blubbernd'},
 es:{I:'tranquila',E:'chispeante',N:'soñadora',S:'práctica',T:'lista',F:'cariñosa',J:'ordenada',P:'espontánea',fire:'ardiente y rápida',earth:'hogareña y serena',air:'ligera y ocurrente',water:'suave y burbujeante'}};
const LANGS=['en','de','es'];
const L=lang=>LANGS.includes(lang)?lang:'en';

function normType(t){t=String(t||'').trim().toUpperCase();return TYPES.includes(t)?t:'';}
function normSign(s){s=String(s||'').trim();const hit=SIGN_NAMES.find(n=>n.toLowerCase()===s.toLowerCase());return hit||'';}
function signFromBirthday(bday){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(bday||''))return '';
 const [y,m,d]=bday.split('-').map(Number),v=new Date(y,m-1,d);
 if(m<1||m>12||d<1||v.getMonth()!==m-1||v.getDate()!==d)return '';
 return d<=EDGES[m-1][2]?EDGES[m-1][0]:EDGES[m][0];
}
function elementOf(sign){const s=SIGNS.find(x=>x[0]===sign);return s?s[1]:'';}
/* inputs: {bday, starSign, types:[first valid wins]} */
function resolve(o){o=o||{};const fromBday=signFromBirthday(o.bday),sign=fromBday||normSign(o.starSign);
 let type='';for(const t of (o.types||[]))if((type=normType(t)))break;
 return{sign,element:elementOf(sign),type,signSource:fromBday?'birthday':sign?'chosen':'',complete:!!(sign&&type)};}
function autoName(sign,type){return (FIRST[normSign(sign)]||FALLBACK_FIRST)+' '+(SECOND[normType(type)]||FALLBACK_SECOND);}
function keyOf(sign,type){return (normSign(sign)||'-')+'|'+(normType(type)||'-');}
/* The name is frozen per input pair: same sign + type always gives back the stored name,
   even if the word lists change in a later build. New inputs give a new name. */
function stableName(stored,sign,type){const key=keyOf(sign,type);
 if(stored&&typeof stored==='object'&&stored.key===key&&typeof stored.name==='string'&&stored.name.trim())return{name:stored.name.trim().slice(0,24),key,changed:false,store:stored};
 const name=autoName(sign,type);return{name,key,changed:true,store:{v:1,key,name}};}
function tags(sign,type){const t=normType(type),out=[];if(t)for(const c of t)out.push(c);const e=elementOf(normSign(sign));if(e)out.push(e);return out;}
function traits(type,lang){const T=TRAIT[L(lang)],t=normType(type);return t?[...t].map(k=>T[k]):[];}
function styleWord(sign,lang){const e=elementOf(normSign(sign));return e?TRAIT[L(lang)][e]:'';}
function signLabel(sign,lang){sign=normSign(sign);return sign?SIGN_LABEL[L(lang)][sign]:'';}
function typeLabel(type,lang){type=normType(type);return type?TYPE_LABEL[L(lang)][type]:'';}

/* ---------- voice: every line is written for one trait; a herb speaks from its own traits only ---------- */
const P=['morning','day','evening','night'];
const V={en:{},de:{},es:{}};
function add(lang,tag,moment,lines){((V[lang][tag]=V[lang][tag]||{})[moment]=V[lang][tag][moment]||[]).push(...lines);}
function set(tag,o){for(const lang of LANGS){const x=o[lang];if(!x)continue;if(x.tap)add(lang,tag,'tap',x.tap);if(x.dizzy)add(lang,tag,'dizzy',x.dizzy);if(x.p)x.p.forEach((l,i)=>l&&add(lang,tag,P[i],[l]));}}
set('I',{en:{tap:['Oh, hi. I like it when it’s just us.','A quiet little tap. My favourite kind.'],dizzy:['Whoa. Too many taps. One quiet second, please.','Spinning… softly… please hold.'],p:['Morning. Slowly. No rush.','A calm moment in the middle of the day. Nice.','Evening light. Let’s get cozy.','Shh. Night mode. Just us and the moon.']},
 de:{tap:['Oh, hallo. Ich mag’s, wenn wir nur zu zweit sind.','Ein leises Antippen. Meine Lieblingssorte.'],dizzy:['Wow. Zu viel Getippe. Kurz Ruhe, bitte.','Dreh mich… ganz leise… bitte warten.'],p:['Morgen. Ganz langsam. Kein Stress.','Ein ruhiger Moment mitten am Tag. Schön.','Abendlicht. Machen wir’s uns gemütlich.','Psst. Nachtmodus. Nur wir und der Mond.']},
 es:{tap:['Ay, hola. Me gusta cuando estamos solo tú y yo.','Un toquecito tranquilo. Mi favorito.'],dizzy:['Uf. Demasiados toques. Un segundito de calma.','Girando… suavecito… espera.'],p:['Buenos días. Despacito. Sin prisa.','Un momento tranquilo a mitad del día. Qué bien.','Luz de tarde. Pongámonos cómodos.','Shh. Modo noche. Solo tú, yo y la luna.']}});
set('E',{en:{tap:['Hiii! Again! Do it again!','You came to see me! Best part of my day.'],dizzy:['Wheee! Okay, okay, I’m dizzy!','Again? No wait, the room is spinning!'],p:['Good morning! What are we eating? What are we doing? Tell me everything!','Midday check-in! I missed you!','Evening! How was your day? Give me the highlights!','Still up? Me too. Party for two, very quietly.']},
 de:{tap:['Hiii! Nochmal! Bitte nochmal!','Du bist da! Das Beste an meinem Tag.'],dizzy:['Wuiii! Okay, okay, mir ist schwindelig!','Nochmal? Nein, warte, alles dreht sich!'],p:['Guten Morgen! Was essen wir? Was machen wir? Erzähl alles!','Mittags-Check-in! Ich hab dich vermisst!','Abend! Wie war dein Tag? Die Highlights, bitte!','Noch wach? Ich auch. Party zu zweit, ganz leise.']},
 es:{tap:['¡Holaaa! ¡Otra vez! ¡Otra!','¡Viniste a verme! Lo mejor de mi día.'],dizzy:['¡Wiii! ¡Vale, vale, me mareo!','¿Otra vez? ¡No, espera, todo da vueltas!'],p:['¡Buenos días! ¿Qué comemos? ¿Qué hacemos? ¡Cuéntamelo todo!','¡Control de mediodía! ¡Te eché de menos!','¡Buenas tardes! ¿Qué tal el día? ¡Lo mejor, por favor!','¿Sigues despierto? Yo también. Fiesta para dos, muy bajito.']}});
set('N',{en:{tap:['I just had a leafy idea. I forgot it. It was brilliant.','What if clouds are just shy herbs?'],p:['I dreamed I was a giant basil tree. Big morning energy.','Today feels like it’s hiding a surprise.','The sky’s doing that pretty thing again. Look.','Stars are just night leaves. I’ve decided.']},
 de:{tap:['Ich hatte gerade eine Blatt-Idee. Weg. Sie war genial.','Was, wenn Wolken einfach schüchterne Kräuter sind?'],p:['Hab geträumt, ich wär ein riesiger Basilikumbaum. Großer Morgen.','Der Tag fühlt sich an, als hätte er eine Überraschung versteckt.','Der Himmel macht wieder dieses schöne Ding. Guck mal.','Sterne sind einfach Nachtblätter. Hab ich beschlossen.']},
 es:{tap:['Tuve una idea de hoja. Se me olvidó. Era genial.','¿Y si las nubes son hierbas tímidas?'],p:['Soñé que era un albahaco gigante. Gran mañana.','Hoy parece que esconde una sorpresa.','El cielo hace otra vez esa cosa bonita. Mira.','Las estrellas son hojas de noche. Lo he decidido.']}});
set('S',{en:{tap:['Sun on my leaves, soil at my roots. Good.','Tap noted. Leaves fluffed. All in order.'],p:['Fresh water, a little light, breakfast. Simple start.','Lunch with something green? My leaves vote yes.','Dinner done right: protein, veggies, done.','Lights out, roots resting. See you tomorrow.']},
 de:{tap:['Sonne auf den Blättern, Erde an den Wurzeln. Passt.','Antippen notiert. Blätter aufgeplustert. Alles da.'],p:['Frisches Wasser, etwas Licht, Frühstück. Einfacher Start.','Mittag mit was Grünem? Meine Blätter sind dafür.','Abendessen, wie es sein soll: Eiweiß, Gemüse, fertig.','Licht aus, Wurzeln ruhen. Bis morgen.']},
 es:{tap:['Sol en las hojas, tierra en las raíces. Bien.','Toque anotado. Hojas esponjadas. Todo en orden.'],p:['Agua fresca, un poco de luz, desayuno. Inicio sencillo.','¿Comida con algo verde? Mis hojas votan que sí.','Cena bien hecha: proteína, verduras, listo.','Luces fuera, raíces descansando. Hasta mañana.']}});
set('T',{en:{tap:['Fun fact: fibre slows the sugar wave. You’re welcome.','Tap efficiency: excellent. Mood: also excellent.'],p:['Morning plan: protein first, sugar later. Smart.','Steady energy beats a sugar rush. Basically science.','Quick evening check: water? Fibre? Good.','Sleep is free recovery. Highly recommend.']},
 de:{tap:['Fun Fact: Ballaststoffe bremsen die Zuckerwelle. Gern geschehen.','Antipp-Effizienz: top. Laune: auch top.'],p:['Morgenplan: erst Eiweiß, Zucker später. Schlau.','Gleichmäßige Energie schlägt Zuckerrausch. Quasi Wissenschaft.','Kurzer Abend-Check: Wasser? Ballaststoffe? Gut.','Schlaf ist Gratis-Regeneration. Sehr zu empfehlen.']},
 es:{tap:['Dato curioso: la fibra frena la ola de azúcar. De nada.','Eficiencia del toque: excelente. Ánimo: también.'],p:['Plan de mañana: primero proteína, el azúcar después. Listo.','Energía estable gana al subidón de azúcar. Pura ciencia.','Repaso rápido: ¿agua? ¿fibra? Bien.','Dormir es recuperación gratis. Lo recomiendo.']}});
set('F',{en:{tap:['You’re doing better than you think. Just saying.','That tap felt like a tiny hug.'],p:['Morning! Be gentle with yourself today.','Whatever today brings, I’m on your side.','You made it through the day. I’m proud of you.','Rest now. You’ve earned it.']},
 de:{tap:['Du machst das besser, als du denkst. Nur so.','Das hat sich angefühlt wie eine Mini-Umarmung.'],p:['Morgen! Sei heute lieb zu dir.','Egal, was heute kommt, ich bin auf deiner Seite.','Du hast den Tag geschafft. Ich bin stolz auf dich.','Ruh dich aus. Hast du dir verdient.']},
 es:{tap:['Lo haces mejor de lo que crees. Solo eso.','Ese toque fue como un abracito.'],p:['¡Buenos días! Sé amable contigo hoy.','Venga lo que venga hoy, estoy de tu lado.','Superaste el día. Me llenas de orgullo.','Descansa. Te lo has ganado.']}});
set('J',{en:{tap:['I’ve already planned our next three leaf wiggles.','Checklist: say hi to you. Done.'],p:['Today’s list is ready. Step one: good morning. Done.','Halfway through the day and right on schedule.','Breakfast for tomorrow planned? I like a head start.','Everything in its place. Now: sleep.']},
 de:{tap:['Ich hab unsere nächsten drei Blattwackler schon geplant.','Liste: Hallo sagen. Erledigt.'],p:['Die Liste für heute steht. Schritt eins: Guten Morgen. Erledigt.','Halber Tag geschafft, genau im Plan.','Frühstück für morgen schon geplant? Ich mag einen Vorsprung.','Alles an seinem Platz. Jetzt: schlafen.']},
 es:{tap:['Ya planeé nuestros próximos tres meneos de hoja.','Lista: saludarte. Hecho.'],p:['La lista de hoy está lista. Paso uno: buenos días. Hecho.','Medio día y todo según el plan.','¿Desayuno de mañana planeado? Me gusta ir con ventaja.','Todo en su sitio. Ahora: a dormir.']}});
set('P',{en:{tap:['No plan today. Just vibes and photosynthesis.','Ooh, surprise tap! I love surprises.'],p:['New day, no script. Let’s see what happens.','Plot twist idea: a new recipe today?','Evening wander? Snack adventure? Both?','Midnight thought: what if tomorrow we try something new?']},
 de:{tap:['Heute kein Plan. Nur Vibes und Fotosynthese.','Ooh, Überraschungs-Tipp! Ich liebe Überraschungen.'],p:['Neuer Tag, kein Drehbuch. Mal sehen, was passiert.','Plot-Twist-Idee: heute ein neues Rezept?','Abendspaziergang? Snack-Abenteuer? Beides?','Mitternachtsgedanke: Was, wenn wir morgen was Neues probieren?']},
 es:{tap:['Hoy sin plan. Solo buena onda y fotosíntesis.','¡Uy, toque sorpresa! Me encantan las sorpresas.'],p:['Día nuevo, sin guion. A ver qué pasa.','Idea giro de guion: ¿una receta nueva hoy?','¿Paseo de tarde? ¿Aventura de picoteo? ¿Las dos?','Idea de medianoche: ¿y si mañana probamos algo nuevo?']}});
set('fire',{en:{tap:['Feel that? Little leaf sparks.','I’m warmed up. Let’s go!'],p:['Rise and shine! I’m already glowing.','Midday heat. I’m thriving.','Sunset colours suit me, don’t they?','My leaves still have a tiny ember glow.']},
 de:{tap:['Spürst du das? Kleine Blattfunken.','Ich bin warmgelaufen. Los geht’s!'],p:['Raus aus den Federn! Ich glühe schon.','Mittagshitze. Ich blühe auf.','Abendrot steht mir, oder?','Meine Blätter glimmen noch ein bisschen.']},
 es:{tap:['¿Lo notas? Chispitas de hoja.','Ya entré en calor. ¡Vamos!'],p:['¡Arriba! Ya estoy brillando.','Calor de mediodía. Estoy en mi salsa.','Los colores del atardecer me quedan bien, ¿no?','Mis hojas aún tienen un brillo de brasa.']}});
set('earth',{en:{tap:['Mmm. Rooted and comfy.','Slow and steady grows the herb.'],p:['Morning soil smells the best.','A good lunch makes good roots.','Cozy evening, warm pot, happy herb.','Tucked into my soil. Goodnight.']},
 de:{tap:['Mmm. Gut verwurzelt und gemütlich.','Langsam und stetig wächst das Kraut.'],p:['Morgenerde riecht am besten.','Gutes Mittagessen, gute Wurzeln.','Gemütlicher Abend, warmer Topf, glückliches Kraut.','In meine Erde gekuschelt. Gute Nacht.']},
 es:{tap:['Mmm. Bien enraizada y a gusto.','Despacio y con constancia crece la hierba.'],p:['La tierra de la mañana huele mejor.','Una buena comida hace buenas raíces.','Tarde acogedora, maceta cálida, hierba feliz.','Arropada en mi tierra. Buenas noches.']}});
set('air',{en:{tap:['Whoosh! A breeze of good mood.','I had a joke for you, but it blew away.'],p:['Fresh morning air. My leaves are chatty.','Breezy afternoon. Ideas everywhere.','Evening breeze. Tell me something fun.','Even the wind is whispering now.']},
 de:{tap:['Wusch! Eine Brise gute Laune.','Ich hatte einen Witz für dich, aber der ist weggeweht.'],p:['Frische Morgenluft. Meine Blätter sind gesprächig.','Luftiger Nachmittag. Überall Ideen.','Abendbrise. Erzähl mir was Lustiges.','Sogar der Wind flüstert jetzt.']},
 es:{tap:['¡Fiuu! Una brisa de buen humor.','Tenía un chiste para ti, pero se lo llevó el viento.'],p:['Aire fresco de mañana. Mis hojas están parlanchinas.','Tarde con brisa. Ideas por todas partes.','Brisa de tarde. Cuéntame algo divertido.','Hasta el viento susurra ya.']}});
set('water',{en:{tap:['Blub. That was a happy blub.','I’m floating on a little cloud of calm.'],p:['Morning dew on my leaves. Fresh.','Had some water yet? I did. Delicious.','Evening ripples. Everything slows down.','Drifting off like a leaf on a pond.']},
 de:{tap:['Blub. Das war ein glückliches Blub.','Ich schwebe auf einer kleinen Ruhewolke.'],p:['Morgentau auf meinen Blättern. Frisch.','Schon was getrunken? Ich schon. Köstlich.','Abendwellen. Alles wird langsamer.','Ich treibe davon wie ein Blatt auf dem Teich.']},
 es:{tap:['Blub. Ese fue un blub feliz.','Floto en una nubecita de calma.'],p:['Rocío de mañana en mis hojas. Fresco.','¿Ya bebiste agua? Yo sí. Riquísima.','Ondas de tarde. Todo va más lento.','Me voy a la deriva como una hoja en un estanque.']}});
const SIGN_LINE={
 en:{Aries:'Aries styling: I’ve already started. On what? Unclear.',Taurus:'Taurus styling: comfy pot, good snack, perfect.',Gemini:'Gemini styling: I have two opinions and both are right.',Cancer:'Cancer styling: your spot next to me is always free.',Leo:'Leo styling: did everyone see that leaf flip?',Virgo:'Virgo styling: one leaf was crooked. Fixed it.',Libra:'Libra styling: one treat, one walk. Fair.',Scorpio:'Scorpio styling: I know what you snacked on.',Sagittarius:'Sagittarius styling: one day I’ll travel. In a bigger pot.',Capricorn:'Capricorn styling: one leaf a day, a forest by spring.',Aquarius:'Aquarius styling: what if herbs had Wi-Fi?',Pisces:'Pisces styling: blub blub, a little daydream.'},
 de:{Aries:'Widder-Style: Ich hab schon angefangen. Womit? Unklar.',Taurus:'Stier-Style: bequemer Topf, guter Snack, perfekt.',Gemini:'Zwillinge-Style: Ich hab zwei Meinungen und beide stimmen.',Cancer:'Krebs-Style: Dein Platz neben mir ist immer frei.',Leo:'Löwe-Style: Hat jeder diesen Blattsalto gesehen?',Virgo:'Jungfrau-Style: Ein Blatt war schief. Erledigt.',Libra:'Waage-Style: ein Leckerli, ein Spaziergang. Fair.',Scorpio:'Skorpion-Style: Ich weiß, was du genascht hast.',Sagittarius:'Schütze-Style: Eines Tages reise ich. In einem größeren Topf.',Capricorn:'Steinbock-Style: ein Blatt pro Tag, im Frühling ein Wald.',Aquarius:'Wassermann-Style: Was, wenn Kräuter WLAN hätten?',Pisces:'Fische-Style: Blub blub, ein kleiner Tagtraum.'},
 es:{Aries:'Estilo Aries: ya empecé. ¿Con qué? Ni idea.',Taurus:'Estilo Tauro: maceta cómoda, buen snack, perfecto.',Gemini:'Estilo Géminis: tengo dos opiniones y las dos son correctas.',Cancer:'Estilo Cáncer: tu sitio a mi lado siempre está libre.',Leo:'Estilo Leo: ¿todos vieron ese giro de hoja?',Virgo:'Estilo Virgo: una hoja estaba torcida. Arreglado.',Libra:'Estilo Libra: un capricho, un paseo. Justo.',Scorpio:'Estilo Escorpio: sé lo que picoteaste.',Sagittarius:'Estilo Sagitario: un día viajaré. En una maceta más grande.',Capricorn:'Estilo Capricornio: una hoja al día, un bosque en primavera.',Aquarius:'Estilo Acuario: ¿y si las hierbas tuvieran wifi?',Pisces:'Estilo Piscis: blub blub, un pequeño sueño despierto.'}};
const NAME_LINE={en:['{name} here. Leaves at your service.','Fun fact: {name} is a great name. I checked.'],de:['Hier ist {name}. Blätter zu Diensten.','Fun Fact: {name} ist ein toller Name. Hab nachgeschaut.'],es:['Aquí {name}. Hojas a tu servicio.','Dato curioso: {name} es un gran nombre. Lo comprobé.']};
/* used while the type is still missing, so a brand-new herb doesn't repeat one line */
const GENERIC={en:{tap:['Hey you. Thanks for checking on me.','A tap! My leaves just did a little wiggle.','I\u2019m still figuring out who I am. Tell me more about you?','Hi! I\u2019m small, but I\u2019m listening.','Every tap makes my roots a bit stronger.'],dizzy:['Whoa, dizzy!','Easy, easy, my leaves are spinning!'],morning:['Good morning! Did you sleep well?','Morning light. My favourite snack.'],day:['Hi there! How\u2019s your day going?','Little midday stretch. Ahh.'],evening:['Good evening! Time to slow down.','Evening already? That went fast.'],night:['Sleepy leaves\u2026','Goodnight soon? I\u2019ll keep watch.']},
 de:{tap:['Hey du. Danke, dass du nach mir schaust.','Angetippt! Meine Bl\u00e4tter haben kurz gewackelt.','Ich finde noch raus, wer ich bin. Erz\u00e4hlst du mir mehr von dir?','Hi! Ich bin klein, aber ich h\u00f6r zu.','Jedes Antippen macht meine Wurzeln ein bisschen st\u00e4rker.'],dizzy:['Huch, schwindelig!','Langsam, langsam, meine Bl\u00e4tter drehen sich!'],morning:['Guten Morgen! Gut geschlafen?','Morgenlicht. Mein Lieblingssnack.'],day:['Hallo du! Wie l\u00e4uft dein Tag?','Kleines Mittagsstrecken. Ahh.'],evening:['Guten Abend! Zeit, runterzufahren.','Schon Abend? Das ging schnell.'],night:['M\u00fcde Bl\u00e4tter\u2026','Bald gute Nacht? Ich halte Wache.']},
 es:{tap:['Hola. Gracias por venir a verme.','\u00a1Un toque! Mis hojas se menearon.','Todav\u00eda estoy descubriendo qui\u00e9n soy. \u00bfMe cuentas m\u00e1s de ti?','\u00a1Hola! Soy peque\u00f1a, pero te escucho.','Cada toque hace mis ra\u00edces un poco m\u00e1s fuertes.'],dizzy:['\u00a1Uy, mareo!','\u00a1Despacio, que mis hojas dan vueltas!'],morning:['\u00a1Buenos d\u00edas! \u00bfDormiste bien?','Luz de ma\u00f1ana. Mi snack favorito.'],day:['\u00a1Hola! \u00bfQu\u00e9 tal tu d\u00eda?','Estiramiento de mediod\u00eda. Ahh.'],evening:['\u00a1Buenas tardes! Hora de bajar el ritmo.','\u00bfYa es de tarde? Qu\u00e9 r\u00e1pido.'],night:['Hojas dormidas\u2026','\u00bfBuenas noches pronto? Yo vigilo.']}};
const hash=s=>{let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h;};
/* every line a herb can say in one moment; order is shuffled per herb, so two herbs never sound alike */
function pool(o){o=o||{};const lang=L(o.lang),moment=o.moment||'tap',sign=normSign(o.sign),type=normType(o.type),name=String(o.name||'').trim();
 const out=[];for(const t of tags(sign,type)){const x=V[lang][t]&&V[lang][t][moment];if(x)out.push(...x);}
 if(moment==='tap'){if(sign)out.push(SIGN_LINE[lang][sign]);if(name)NAME_LINE[lang].forEach(l=>out.push(l.replace('{name}',name)));}
 if(!type)out.push(...(GENERIC[lang][moment]||GENERIC[lang].tap));
 const seed=keyOf(sign,type)+'|'+name;return out.map(l=>[hash(seed+l),l]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);}
/* next line: the first one not said recently; once all are said, the one said longest ago */
function pick(lines,recent){recent=Array.isArray(recent)?recent:[];const fresh=lines.find(l=>!recent.includes(l));if(fresh)return fresh;
 let best=lines[0],at=Infinity;for(const l of lines){const i=recent.indexOf(l);if(i>=0&&i<at){at=i;best=l;}}return best||null;}
function remember(recent,line,limit){recent=(Array.isArray(recent)?recent:[]).filter(l=>l!==line);recent.push(line);return recent.slice(-(limit||24));}
const api={SIGNS,SIGN_NAMES,TYPES,FIRST,SECOND,FALLBACK_FIRST,FALLBACK_SECOND,normType,normSign,signFromBirthday,elementOf,resolve,autoName,keyOf,stableName,tags,traits,styleWord,signLabel,typeLabel,pool,pick,remember};
if(typeof module==='object'&&module.exports)module.exports=api;else root.LowiHerbIdentityCore=api;
})(typeof window!=='undefined'?window:globalThis);
