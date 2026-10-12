/* Editable game policy; no sponsorship, votes, price or catch count enters assessment. */
(function(root){
  'use strict';
  const config = {
    version:'discovery-1', criteriaVersion:'label-v1-20261012', criteriaStatus:'provisional-existing-rules',
    points:{first:100,evidence:20,confirmation:10,correction:30,price:10,highestTierBonus:0},
    caps:{evidence:40,confirmation:30,correction:60,price:30},
    limits:{contributionsPerDay:10,flagsPerDay:3,pricesPerStorePerDay:1},
    freshnessDays:30, reviewFreshnessDays:180,
    nutrition:{sugarCaution:5,sugarOutside:12,carbsCaution:15,carbsOutside:35,drinkSugarOutside:2.5},
    tiers:{epicEnabled:false,legendaryEnabled:false,independentReviewRequired:true},
    currencies:['EUR','USD','GBP','CHF','CAD','AUD','NZD','PLN','SEK','NOK','DKK'],
    backendAcceptanceEnabled:false
  };
  if(typeof module==='object'&&module.exports) module.exports=config;
  else root.LOWI_DISCOVERY_CONFIG=config;
})(typeof window==='undefined'?globalThis:window);
