/* Companion milestones and observation settings. Timers are diary estimates, not physiology. */
(function(root){
  'use strict';
  const config = {
    version: 'herb-living-20261014-0010',
    stages: [
      {id:'seedling',xp:0,name:['Spark','Funke','Chispa']},
      {id:'sprout',xp:100,name:['Glimmer','Schimmer','Destello']},
      {id:'young',xp:300,name:['Young Comet','Junger Komet','Cometa joven']},
      {id:'flourishing',xp:700,name:['Bright Comet','Heller Komet','Cometa brillante']},
      {id:'radiant',xp:1500,name:['Radiant Comet','Strahlender Komet','Cometa radiante']},
      {id:'legendary',xp:3000,name:['Legendary Comet','Legendärer Komet','Cometa legendario']},
      /* Oct 19 2026 night (Eman reached Legendary: "we need to add more evolutions"): four longer steps after it. XP only:
         no specific food and no Collection progress is ever needed to evolve. */
      {id:'nova',xp:4500,name:['Nova Comet','Nova-Komet','Cometa nova']},
      {id:'titan',xp:7000,name:['Titan Comet','Titanen-Komet','Cometa titán']},
      {id:'monarch',xp:10000,name:['Monarch Comet','Monarchen-Komet','Cometa monarca']},
      {id:'majesty',xp:14000,name:['Majestic Comet','Majestätischer Komet','Cometa majestuoso']}
    ],
    gentleDimAfterHours:48,
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
      provisional:['90-minute optional check-in prompt','3 independent observations before a personal window','30-minute minimum estimate padding','4-hour freshness for an energy report','48-hour gentle companion dimming']
    },
    sources:[
      {title:'NIH · sleep and wake cycles',url:'https://www.nhlbi.nih.gov/health/sleep/sleep-wake-cycle'},
      {title:'NIDDK · food, activity and individual glucose responses',url:'https://www.niddk.nih.gov/health-information/diabetes/overview/healthy-living-with-diabetes'}
    ]
  };
  if(typeof module==='object'&&module.exports)module.exports=config;
  else root.LOWI_HERB_CONFIG=config;
})(typeof window!=='undefined'?window:globalThis);

