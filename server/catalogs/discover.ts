import {defineBenefit} from '../catalog-entry.js';

const product = 'https://www.discover.com/credit-cards/cash-back/it-card/';
const accountFaq = 'https://www.capitalone.com/updates/discover/card-faqs/';
const transition = 'https://www.capitalone.com/updates/discover/consumer-card/';
const reviewed = {cardId:'discover-cashback' as const, retrievedAt:'2026-10-13', effectiveFrom:null, effectiveTo:null, sourceUpdatedAt:null};

// Deliberately omit acquisition offers and quarter-specific merchants. Account
// migration changes some redemption terms without changing the card variant.
export const discoverBenefits = [
  defineBenefit({
    ...reviewed, id:'discover-quarterly', title:'5% rotating quarterly cash back', category:'Rewards', topic:'rewards',
    summary:'Activate each quarter to earn 5% on up to $1,500 in eligible category purchases.',
    use:'Check the issuer’s current categories and activate before making an eligible purchase.',
    enrollment:'Quarterly activation required in Discover, or Capital One after your account moves.',
    payment:'Use your Discover it Cash Back card for eligible category purchases.',
    limit:'$1,500 is the quarterly spending cap for the 5% rate, not a credit balance. Other purchases earn the base rate.',
    exclusions:'Categories change each quarter. No current-quarter merchants are assumed for a different quarter.',
    missing:['Quarterly activation and spending already counted toward the cap are unknown.'],
    sourceUrl:accountFaq, documentTitle:'Discover card FAQs — Capital One', section:'Rewards and benefits: 5% cash back eligibility and activation',
    evidenceStatus:'summary_only', tracking:{kind:'quarterly', activationRequired:true},
  }),
  defineBenefit({
    ...reviewed, id:'discover-base-rewards', title:'1% cash back on other purchases', category:'Rewards', topic:'rewards',
    summary:'Earn 1% cash back on purchases outside the applicable bonus rate.',
    use:'Use your card for purchases you already intend to make.',
    enrollment:'No separate base-rate activation.', payment:'Pay with Discover it Cash Back.',
    limit:'Purchase-based rewards; not a monthly or annual allowance.', exclusions:'The 5% quarterly rate has separate activation and spending limits.',
    sourceUrl:product, documentTitle:'Discover it Cash Back Credit Card', section:'Earn 5% Cash Back — base earning rate',
    evidenceStatus:'summary_only', tracking:{kind:'ongoing'},
  }),
  defineBenefit({
    ...reviewed, id:'discover-redemption', title:'Cash-back redemption options', category:'Rewards', topic:'rewards',
    summary:'Redeem rewards through the issuer; available methods and minimums depend on your account’s platform.',
    use:'Open Rewards in the app that currently manages your card and check the available redemption options.',
    enrollment:'After moving to Capital One, re-enroll preferences if you want automatic statement-credit redemption.',
    payment:'Uses earned rewards, not a new purchase.',
    limit:'After migration: gift-card redemptions have a $25 minimum; cash and statement-credit options remain available.',
    exclusions:'After migration, rewards do not satisfy your minimum payment and Pay with Rewards through Apple Pay is unavailable.',
    missing:['Whether the account has moved to Capital One and its current rewards balance are unknown.'],
    sourceUrl:transition, documentTitle:'Discover is part of Capital One — Consumer Card', section:'Will my credit card rewards redemption options remain the same?',
    evidenceStatus:'summary_only', tracking:{kind:'ongoing'},
  }),
  defineBenefit({
    ...reviewed, id:'discover-reward-validity', title:'Rewards stay valid while the account is open', category:'Rewards', topic:'rewards',
    summary:'Your rewards do not expire for the life of the card account.',
    use:'Redeem when useful; card opening does not create a cash-back expiry deadline.',
    enrollment:'No separate enrollment.', payment:'Applies to earned rewards.',
    limit:'No recurring reward-balance expiration date while the account remains open.',
    exclusions:'This does not establish closure-payout rules or your available rewards balance.',
    sourceUrl:accountFaq, documentTitle:'Discover card FAQs — Capital One', section:'Rewards and benefits: Will my credit card rewards balance remain the same?',
    evidenceStatus:'summary_only', tracking:{kind:'ongoing'},
  }),
  defineBenefit({
    ...reviewed, id:'discover-foreign', title:'No foreign transaction fee', category:'Rewards', topic:'international',
    summary:'Discover does not charge a foreign transaction fee.',
    use:'Check that the overseas merchant accepts Discover before paying.',
    enrollment:'No enrollment.', payment:'Use your Discover card where accepted.',
    limit:'Applies to qualifying card use abroad; not a reimbursement or spending allowance.',
    exclusions:'No foreign transaction fee does not guarantee acceptance at every merchant.',
    sourceUrl:'https://www.discover.com/credit-cards/card-smarts/discover-cards-acceptance/', documentTitle:'Where Are Discover Credit Cards Accepted?', section:'What can you expect when using your Discover Card in a foreign country?',
    sourceUpdatedAt:'2025-10-12', evidenceStatus:'summary_only', tracking:{kind:'ongoing'},
  }),
  defineBenefit({
    ...reviewed, id:'discover-fraud', title:'$0 liability for unauthorized purchases', category:'Protections', topic:'protection',
    summary:'Unauthorized purchases may qualify for $0 fraud liability after issuer review.',
    use:'Report suspected unauthorized purchases promptly to the issuer.',
    enrollment:'No separate enrollment.', payment:'Applies to the Discover card account.',
    limit:'Claims are investigated and verified; no annual credit to spend.',
    exclusions:'Giving someone or a merchant access to your card information is excluded from the issuer’s definition of an unauthorized purchase.',
    sourceUrl:product, documentTitle:'Discover it Cash Back Credit Card', section:'$0 Fraud Liability; footnote 5',
    evidenceStatus:'terms_reviewed', tracking:{kind:'ongoing'},
  }),
];
