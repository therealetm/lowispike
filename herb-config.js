/* Companion milestones and observation settings. Timers are diary estimates, not physiology. */
(function(root){
  'use strict';
  const config = {
    version: 'herb-body-1',
    stages: [
      {id:'seedling',xp:0,name:['Seedling','Keimling','Plántula']},
      {id:'sprout',xp:100,name:['Sprout','Spross','Brote']},
      {id:'young',xp:300,name:['Young Herb','Junges Kraut','Hierba joven']},
      {id:'flourishing',xp:700,name:['Flourishing Herb','Blühendes Kraut','Hierba floreciente']},
      {id:'radiant',xp:1500,name:['Radiant Herb','Strahlendes Kraut','Hierba radiante']},
      {id:'legendary',xp:3000,name:['Legendary Bloom','Legendäre Blüte','Flor legendaria']}
    ],
    gentleDimAfterHours:72,
    body: {
      minimumIndependentSamples:3,
      observationLookbackDays:90,
      reportFreshHours:4,
      mealAssociationHours:12,
      sleepFreshHours:36,
      checkAfterMealMinutes:90,
      estimatePaddingMinutes:30,
      observationBucketMinutes:15,
      postMealMovementMinutes:120,
      // These are tunable diary settings, not validated hunger, glucose or insulin thresholds.
      provisional:['90-minute optional check-in prompt','3 independent observations before a personal window','30-minute minimum estimate padding','4-hour freshness for an energy report','72-hour gentle companion dimming']
    },
    sources:[
      {title:'NIH · sleep and wake cycles',url:'https://www.nhlbi.nih.gov/health/sleep/sleep-wake-cycle'},
      {title:'NIDDK · food, activity and individual glucose responses',url:'https://www.niddk.nih.gov/health-information/diabetes/overview/healthy-living-with-diabetes'}
    ]
  };
  if(typeof module==='object'&&module.exports)module.exports=config;
  else root.LOWI_HERB_CONFIG=config;
})(typeof window!=='undefined'?window:globalThis);
