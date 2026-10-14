import type {Bundle} from './catalog';

export type SituationId = 'travel' | 'food-rides' | 'shopping';

export const situations: ReadonlyArray<{
  id: SituationId;
  label: string;
  description: string;
}> = [
  {id:'travel', label:'Travel', description:'Flights, stays, rentals & getting around'},
  {id:'food-rides', label:'Food & rides', description:'Dining out, delivery & rides'},
  {id:'shopping', label:'Shopping', description:'Everyday rewards & purchase protections'},
];

// A situation is a discovery path, not an eligibility claim. Explicit mappings
// distinguish trip protections from purchase protections with the same topic.
// The card guide remains the complete inventory, including memberships that do
// not belong to one of these three situations.
const situationsByBenefit: Readonly<Record<string, readonly SituationId[]>> = {
  'vx-trip':['travel'],
  'vx-delay':['travel'],
  'vx-luggage':['travel'],
  'vx-purchase':['shopping'],
  'vx-warranty':['shopping'],
  'vx-return':['shopping'],
  'vx-rewards':['travel', 'shopping'],
  'csr-rewards':['travel', 'food-rides'],
  'bofa-redemption':['travel', 'food-rides'],
  'custom-top-category':['travel', 'food-rides', 'shopping'],
  'costco-dining-travel':['travel', 'food-rides'],
};

const topicsBySituation: Readonly<Record<SituationId, ReadonlySet<string>>> = {
  travel:new Set(['travel', 'security', 'lounge', 'hotel', 'rental', 'international', 'airport', 'rides']),
  'food-rides':new Set(['dining', 'delivery', 'rides']),
  shopping:new Set(['rewards', 'phone', 'protection']),
};

/** Preserves source order, card attribution, conditions and evidence metadata. */
export function getSituationBenefits(
  benefits: readonly Bundle[],
  situation: SituationId,
): Bundle[] {
  return benefits.filter(benefit => {
    if (Object.hasOwn(situationsByBenefit, benefit.id)) {
      return situationsByBenefit[benefit.id].includes(situation);
    }
    return topicsBySituation[situation].has(benefit.topic);
  });
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/**
 * Uses inclusive policy dates, never account-opening or enrollment guesses.
 * An unknown effective date is retained with the original evidence status.
 * Activation deadlines do not necessarily end already-enrolled memberships.
 */
export function getGuideBenefits(benefits: readonly Bundle[], asOf: string): Bundle[] {
  if (!validDate(asOf)) throw new RangeError('Guide date must be a valid YYYY-MM-DD date.');
  return benefits.filter(benefit => {
    for (const boundary of [benefit.effectiveFrom, benefit.effectiveTo]) {
      if (boundary !== null && !validDate(boundary)) {
        throw new RangeError(`Invalid policy date for ${benefit.id}.`);
      }
    }
    return (benefit.effectiveFrom === null || benefit.effectiveFrom <= asOf)
      && (benefit.effectiveTo === null || benefit.effectiveTo >= asOf);
  });
}

export function getEvidenceLabel(benefit: Bundle): string | null {
  switch (benefit.evidenceStatus) {
    case 'terms_reviewed': return null;
    case 'summary_only': return 'Issuer summary';
    case 'version_unverified': return 'Current terms to verify';
    case 'conflicting': return 'Conflicting terms';
  }
}

/**
 * Reuse the catalog's tracking classification and reviewed per-benefit
 * overrides. For example, a generic ongoing record can describe museum
 * weekends or a yearly reward cap; neither is a personal expiry date.
 */
export function timingLabel(benefit: Bundle): string {
  return benefit.timing.label;
}
