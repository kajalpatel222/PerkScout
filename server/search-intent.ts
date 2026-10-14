/** Small, deterministic intent expansion for this curated corpus, not a general language model. */
export type SearchIntent = {
  broadTrip: boolean;
  explicitTopics: string[];
  expandedTopics: string[];
  excludedTopics: string[];
};

const topicPatterns: [string, RegExp][] = [
  ['travel', /\b(?:travel(?:ing|ling)?|trips?|vacations?|holidays?|journeys?|getaways?)\b/],
  ['lounge', /\b(?:lounges?|priority\s+pass|airports?)\b/],
  ['hotel', /\b(?:hotels?|stays?|lodging|accommodations?|breakfast|rooms?|ihg|the\s+edit|vacation\s+rentals?|holiday\s+rentals?|rental\s+(?:homes?|houses?|apartments?))\b/],
  ['international', /\b(?:international|abroad|overseas|foreign|currency)\b/],
  ['phone', /\b(?:phones?|cellular|cellphone|mobile)\b/],
  ['rental', /\b(?:rentals?|hertz|rent(?:ing)?\s+(?:(?:a|the|my|our)\s+)?car|car\s+hire|hir(?:e|ing)\s+(?:(?:a|the)\s+)?car)\b/],
  ['museum', /\b(?:museums?|cultivist|art)\b/],
  ['events', /\b(?:events?|concerts?|tickets?|stubhub|viagogo|entertainment)\b/],
  ['dining', /\b(?:dining|restaurants?|meals?)\b/],
  ['rides', /\b(?:lyft|uber|rides?|rideshares?|ride\s+shares?|ride\s+hailing|ridehailing)\b/],
  ['fitness', /\b(?:fitness|peloton|exercise)\b/],
  ['streaming', /\b(?:streaming|apple|music|tv)\b/],
  ['delivery', /\b(?:delivery|dashpass|doordash)\b/],
  ['security', /\b(?:global\s+entry|precheck|pre\s+check|nexus|tsa)\b/],
  ['rewards', /\b(?:rewards?|miles|points|bonus)\b/],
  ['protection', /\b(?:protection|coverage|insurance|collision|trip\s+(?:delay|cancellation|interruption)|baggage|luggage|warranty|purchase\s+protection)\b/],
  ['concierge', /\bconcierge\b/],
  ['airport', /\b(?:airports?|airportbutler|airport\s+butler)\b/],
];

const broadTripTopics = ['travel', 'hotel', 'lounge', 'rental', 'rides', 'rewards'];
const accommodationRental = /\b(?:(?:vacation|holiday|short\s+term)\s+rentals?|rental\s+(?:homes?|houses?|apartments?))\b/g;

export function analyzeQuestion(question: string): SearchIntent {
  const text = question.toLowerCase().replace(/[’‘]/g, "'").replace(/[-–—]/g, ' ').replace(/\s+/g, ' ').trim();
  const vehicleText = text.replace(accommodationRental, 'accommodation');
  const excluded = new Set<string>();

  const negativeRental = /\b(?:(?:no|without)\s+(?:(?:a|any)\s+)?(?:rental\s+cars?|car\s+rentals?|rentals?|hertz)|(?:not|never)\s+(?:be\s+)?renting\b|(?:won't|will\s+not|don't|do\s+not)\s+(?:be\s+)?(?:rent(?:ing)?|hire)\b)/;
  const ownCar = /\b(?:using|driving|taking|bringing)\s+(?:my|our|their|the)\s+own\s+(?:car|vehicle)\b/g;
  const drivingOwnCar = [...text.matchAll(ownCar)].some(match => !/\b(?:not|never)\s*$/.test(text.slice(0, match.index)));
  const coordinatedRentalNegation = /\bnot\s+(?:flying|using\s+(?:lyft|uber|rideshares?|ride\s+shares?))\s+(?:or|and)\s+renting\s+(?:(?:a|any|the)\s+)?cars?\b/;
  if (negativeRental.test(vehicleText) || drivingOwnCar || coordinatedRentalNegation.test(vehicleText)) excluded.add('rental');

  const rides = '(?:lyft|uber|rideshares?|ride\\s+shares?|ride\\s+hailing|ridehailing|rides)';
  const negativeRides = new RegExp(`\\b(?:no|without|not\\s+using|won't\\s+use|will\\s+not\\s+use|don't\\s+need|do\\s+not\\s+need)\\s+(?:any\\s+)?${rides}\\b`);
  const jointNegativeRides = new RegExp(`\\bno\\s+(?:rental\\s+cars?|car\\s+rentals?|rentals?)\\s+(?:or|and)\\s+${rides}\\b`);
  if (negativeRides.test(text) || jointNegativeRides.test(text)) excluded.add('rides');
  if (/\b(?:not\s+flying|won't\s+fly|will\s+not\s+fly|no\s+flights?|without\s+flying)\b/.test(text)) {
    excluded.add('lounge');
    excluded.add('airport');
    excluded.add('security');
  }

  const explicitTopics = topicPatterns
    .filter(([topic, pattern]) => {
      const input = topic === 'rental' ? vehicleText : topic === 'travel'
        ? text.replace(/\btrip\s+(?:delay|cancellation|interruption)\b/g, 'protection').replace(accommodationRental, 'accommodation')
        : text;
      return !excluded.has(topic) && pattern.test(input);
    })
    .map(([topic]) => topic);

  // A plan invites adjacent options. A specific allowance, insurer question, or
  // named benefit stays focused even when the user also mentions a trip.
  const hasTrip = /\b(?:trips?|vacations?|holidays?|journeys?|getaways?|travel(?:ing|ling)?|weekend\s+away)\b/.test(vehicleText);
  const focusedBenefit = /\b(?:travel\s+(?:credits?|insurance|coverage|protection)|trip\s+(?:delay|cancellation|interruption|insurance|coverage|protection)|rental\s+(?:car\s+)?(?:collision|coverage|insurance)|car\s+rental\s+(?:collision|coverage|insurance)|annual\s+(?:credits?|fees?)|monthly\s+credits?|vacation\s+rentals?|holiday\s+rentals?)\b/.test(text);
  const focusedRentalAsk = /\b(?:what|which)\s+(?:car\s+rental|rental(?:\s+car)?|hertz)\s+(?:benefits?|perks?|credits?)\b/.test(text);
  const focusedTopicAsk = /\b(?:compare|comparison|how\s+(?:much|does|do|can)|does|is|are|can\s+(?:i|we))\b[^.!?]*\b(?:hotels?|lyft|uber|hertz|lounges?|rental\s+cars?|insurance|coverage|credits?)\b/.test(text)
    || /\b(?:what|which)\s+(?:hotel|rental|lyft|lounge|dining|travel\s+credit)\s+(?:benefits?|perks?|credits?)\b/.test(text)
    || focusedRentalAsk;
  const openBenefitAsk = /\b(?:what|which|any|all)\b[^.!?]*\b(?:benefits?|perks?)\b/.test(text)
    || /\bwhat\s+can\s+(?:i|we)\s+(?:use|do)\b/.test(text);
  const planPhrase = /\b(?:planning|plan|going|taking|take|organizing|organising)\b[^.!?]*\b(?:trip|vacation|holiday|journey|getaway)\b/.test(text);
  const shortTripPhrase = /^(?:(?:a|my|our|weekend|summer|winter|family|next)\s+)*(?:trip|vacation|holiday|journey|getaway)(?:\s+(?:benefits|perks))?[.!?]?$/.test(text);
  const broadTrip = hasTrip && !focusedBenefit && !focusedTopicAsk && (openBenefitAsk || planPhrase || shortTripPhrase);

  return {
    broadTrip,
    // The trip provides context; a focused rental question does not also ask for
    // the annual travel credit merely because the word "trip" appeared earlier.
    explicitTopics: focusedRentalAsk && !/\btravel\s+credits?\b/.test(text) ? explicitTopics.filter(topic => topic !== 'travel') : explicitTopics,
    expandedTopics: broadTrip ? broadTripTopics.filter(topic => !excluded.has(topic)) : [],
    excludedTopics: [...excluded],
  };
}
