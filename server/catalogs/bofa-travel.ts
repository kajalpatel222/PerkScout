import type {Bundle} from '../../shared/catalog.js';
import {defineBenefit} from '../catalog-entry.js';

const product='https://www.bankofamerica.com/credit-cards/products/travel-rewards-credit-card/';
const disclosure='https://secure.bankofamerica.com/apply-now-services/credit-cards/rest/get-disclosures/v1/usa/show-in-browser?cId=4079331&isMobile=true&locale=en_US&poCd=U4';
const travelCards='https://www.bankofamerica.com/credit-cards/travel-credit-cards/';
const rewards='https://info.bankofamerica.com/en/rewards/bofa-rewards';
const museums='https://about.bankofamerica.com/en/making-an-impact/arts-and-culture';

// U.S. personal Travel Rewards only; no Premium Rewards or generic Visa coverage.
// Public disclosures supplement (but do not replace) the account's Program Rules.
export const bofaBenefits:Bundle[]=[
  defineBenefit({
    id:'bofa-everyday',cardId:'bofa-travel',title:'Everyday purchase points',category:'Rewards',topic:'rewards',
    summary:'Earn 1.5 points per $1 of net purchases, without an earning cap.',
    use:'Use the card for purchases already planned.',enrollment:'No separate rewards activation.',payment:'Pay with Travel Rewards.',
    limit:'Points do not expire while the account is open with charging privileges.',
    exclusions:'Returns reduce earnings; cash advances, balance transfers, fees and interest earn no points.',missing:[],
    sourceUrl:disclosure,documentTitle:'Bank of America Travel Rewards — Product Disclosure',section:'Travel Rewards Program Information — How You Earn Points; How You May Lose Rewards',page:3,
    evidenceStatus:'terms_reviewed',tracking:{kind:'ongoing'},
  }),
  defineBenefit({
    id:'bofa-portal',cardId:'bofa-travel',title:'BofA Travel booking points',category:'Rewards',topic:'travel',
    summary:'Earn 3 points per $1 on travel purchases booked through BofA Travel.',
    use:'Compare the full booking price and terms before choosing the portal.',enrollment:'No separate rewards activation.',
    payment:'Book through BofA Travel and pay with Travel Rewards.',limit:'Ongoing purchase rewards; no annual allowance.',
    exclusions:'This rate requires a BofA Travel booking.',missing:[],
    sourceUrl:travelCards,documentTitle:'Bank of America — Travel Rewards Credit Cards',section:'Bank of America Travel Rewards — earning through BofA Travel',
    evidenceStatus:'summary_only',tracking:{kind:'ongoing'},
  }),
  defineBenefit({
    id:'bofa-redemption',cardId:'bofa-travel',title:'Travel & dining points redemption',category:'Rewards',topic:'travel',
    summary:'Use earned points for statement credits against qualifying travel and dining, including rental cars and taxis.',
    use:'Choose an eligible past purchase in the issuer rewards redemption flow.',enrollment:'No separate activation.',payment:'The eligible purchase must be on this card.',
    limit:'2,500-point minimum; 1¢ per point. Purchases must be within the preceding 12 months; only the latest 2,500 qualifying purchases are considered.',
    exclusions:'Uses earned points, not a free annual travel allowance. Some travel merchants, in-flight goods/services and duty-free purchases are excluded.',
    missing:['Available points and qualifying purchase dates'],
    sourceUrl:disclosure,documentTitle:'Bank of America Travel Rewards — Product Disclosure',section:'Travel Rewards Program Information — How Your Travel Credit Works',page:3,
    evidenceStatus:'terms_reviewed',tracking:{kind:'ongoing'},
  }),
  defineBenefit({
    id:'bofa-foreign',cardId:'bofa-travel',title:'No foreign transaction fee',category:'Rewards',topic:'international',
    summary:'No foreign transaction fee when using the card abroad.',
    use:'Use for planned international purchases where accepted.',enrollment:'No separate activation.',payment:'Pay with Travel Rewards.',
    limit:'Ongoing card feature; no annual spending allowance.',exclusions:'This does not waive merchant charges or other account fees.',missing:[],
    sourceUrl:product,documentTitle:'Bank of America Travel Rewards Credit Card',section:'Card Details — No annual fee and no foreign transaction fees',
    evidenceStatus:'summary_only',tracking:{kind:'ongoing'},
  }),
  defineBenefit({
    id:'bofa-loyalty',cardId:'bofa-travel',title:'BofA Rewards points boost',category:'Rewards',topic:'rewards',
    summary:'Eligible enrolled members receive a 10%–75% credit-card rewards bonus, depending on their BofA Rewards tier.',
    use:'Check your current program tier and applicable bonus in Bank of America.',
    enrollment:'BofA Rewards enrollment and an eligible personal checking account are required.',payment:'Make eligible purchases with Travel Rewards.',
    limit:'Bonus depends on the qualifying banking relationship; no flat credit allowance.',
    exclusions:'Card ownership alone does not establish program enrollment or tier. Account-specific transition terms may affect the bonus.',
    missing:['BofA Rewards enrollment, current tier and applicable account terms'],
    sourceUrl:rewards,documentTitle:'Bank of America — BofA Rewards',section:'Credit card rewards bonus; FAQs — eligibility and benefit activation',
    evidenceStatus:'summary_only',tracking:{kind:'ongoing',activationRequired:true},
  }),
  defineBenefit({
    id:'bofa-museums',cardId:'bofa-travel',title:'Museums on Us admission',category:'Experiences',topic:'museum',
    summary:'One free general admission for the cardholder at participating museums on the first full weekend of each month.',
    use:'Check the participating museum’s hours and admission procedure before visiting.',
    enrollment:'No separate enrollment listed.',payment:'Present an active eligible card and valid government-issued photo ID.',
    limit:'Only eligible program weekends; admission is subject to availability.',
    exclusions:'Cardholder only; guests, special/ticketed exhibitions, enhanced experiences and fundraising events are excluded. Cannot combine offers.',
    missing:['Participating museum and visit date'],
    sourceUrl:museums,documentTitle:'Bank of America — Arts & Culture: Museums on Us',section:'Museums on Us — Eligibility and terms; How to visit',
    evidenceStatus:'terms_reviewed',tracking:{kind:'ongoing'},
  }),
];
