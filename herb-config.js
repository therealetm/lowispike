/* LOWiSPIKE herb companion milestones. Visual/personality flavor never changes XP or health logic. */
(function(root){
  'use strict';
  const config={
    version:'herb-tamagotchi-20261013-1506',
    stages:[
      {id:'seedling',xp:0,name:['Seedling','Keimling','Plántula']},
      {id:'sprout',xp:100,name:['Sprout','Spross','Brote']},
      {id:'young',xp:300,name:['Young Herb','Junges Kraut','Hierba joven']},
      {id:'flourishing',xp:700,name:['Flourishing Herb','Blühendes Kraut','Hierba floreciente']},
      {id:'radiant',xp:1500,name:['Radiant Herb','Strahlendes Kraut','Hierba radiante']},
      {id:'legendary',xp:3000,name:['Legendary Bloom','Legendäre Blüte','Flor legendaria']}
    ],
    gentleDimAfterHours:48
  };
  if(typeof module==='object'&&module.exports)module.exports=config;
  else root.LOWI_HERB_CONFIG=config;
})(typeof window!=='undefined'?window:globalThis);
