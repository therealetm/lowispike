/* Companion milestones and observation settings. Timers are diary estimates, not physiology. */
(function(root){
  'use strict';
  const WHC = (typeof module === 'object' && module.exports) ? require('./world-home-core.js') : root.LowiWorldHomeCore;
  if (!WHC || !WHC.STAGES) throw new Error('herb-config.js needs world-home-core.js (the level table) loaded first');
  const STAGE_IDS = ['seedling', 'sprout', 'young', 'flourishing', 'radiant', 'legendary', 'nova', 'titan', 'monarch', 'majesty', 'pulsar', 'prism', 'crystal', 'thunder', 'supernova', 'orbit', 'quasar', 'zenith', 'phoenix', 'galaxy', 'celestial', 'eternal', 'cosmic', 'genesis', 'cosmos'];
  const config = {
    version: 'herb-living-20261014-0010',
    /* Oct 22, 2026: names and XP come from the ONE level table, world-home-core.js STAGES (the cell stages Misty's growth
       sheet shows). The old Comet / plant names are gone. ids stay as internal state and art keys only; nobody sees them. */
    stages: WHC.STAGES.map((s, i) => ({ id: STAGE_IDS[i] || ('stage' + (i + 1)), xp: s.xp, name: s.n.slice() })),
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

