import {z} from 'zod';

const TimingGroupSchema = z.enum([
  'annual', 'monthly', 'half_year', 'per_use', 'membership',
  'multi_year', 'ongoing', 'limited_offer', 'unknown', 'quarterly', 'billing_cycle',
]);

export const TimingSchema = z.object({
  group: TimingGroupSchema,
  label: z.string().min(1),
});

export type BenefitTiming = z.infer<typeof TimingSchema>;

export const TIMING_GROUPS: ReadonlyArray<{
  id: BenefitTiming['group'];
  title: string;
  description: string;
}> = [
  {id:'annual', title:'Each year', description:'Yearly allowances, reward caps, and redemption deadlines. Each benefit follows its own period.'},
  {id:'quarterly', title:'Each quarter', description:'Quarterly rewards categories and earning limits. Activation may be required.'},
  {id:'billing_cycle', title:'Each billing cycle', description:'Rewards limits tied to your statement cycle, not the calendar month.'},
  {id:'monthly', title:'Each month', description:'Monthly allowances. Any unused credit follows the benefit’s expiry rules.'},
  {id:'half_year', title:'Every six months', description:'Separate allowances for January–June and July–December.'},
  {id:'per_use', title:'With eligible bookings & purchases', description:'Benefits tied to a qualifying rental, trip, stay, visit or purchase. Coverage conditions and claim limits still apply.'},
  {id:'membership', title:'Memberships & status', description:'Partner access, subscriptions and status. Activation and renewal follow the partner’s terms.'},
  {id:'multi_year', title:'Every few years', description:'Application-fee credits with a multi-year eligibility cycle. Card opening alone does not establish the next eligible date.'},
  {id:'ongoing', title:'Ongoing benefits', description:'Card features and protections available while their eligibility conditions are met.'},
  {id:'limited_offer', title:'Limited-time offers', description:'Offers with a published availability window rather than an assumed recurring allowance.'},
  {id:'unknown', title:'Timing to confirm', description:'The available source does not establish a reliable timing category.'},
];

// Timing describes how a benefit is used; it does not establish eligibility,
// current policy applicability, claim approval, remaining balance or a reset date.
const overrides: Readonly<Record<string, BenefitTiming>> = {
  'bofa-museums': {group:'monthly',label:'First full weekend each month'},
  'vx-bonus': {group:'annual', label:'After each anniversary'},
  'vx-rental': {group:'per_use', label:'Per qualifying rental'},
  'vx-trip': {group:'per_use', label:'Per qualifying trip'},
  'vx-delay': {group:'per_use', label:'Per qualifying trip'},
  'vx-luggage': {group:'per_use', label:'Per qualifying trip'},
  'vx-purchase': {group:'per_use', label:'Per qualifying purchase'},
  'vx-warranty': {group:'per_use', label:'Per qualifying purchase'},
  'vx-return': {group:'per_use', label:'Per qualifying purchase'},
  'vx-hotel': {group:'per_use', label:'Per qualifying stay'},
  'vx-lifestyle': {group:'per_use', label:'Per qualifying stay'},
  'vx-lounge': {group:'per_use', label:'Per eligible lounge visit'},
  'vx-priority': {group:'per_use', label:'Per eligible lounge visit'},
  'csr-lounge': {group:'per_use', label:'Per eligible lounge visit'},
  'vx-butler': {group:'per_use', label:'Per qualifying service booking'},
  'vx-phone': {group:'ongoing', label:'Protection with eligible bill payment'},
  'vx-hertz': {group:'membership', label:'Status after partner enrollment'},
  'vx-cultivist': {group:'membership', label:'2-year discount from enrollment'},
  'csr-ihg': {group:'membership', label:'Status after partner activation'},
  'csr-apple': {group:'membership', label:'At least 12 months from activation'},
  'csr-dashpass': {group:'membership', label:'Membership from partner activation'},
  'csr-global': {group:'multi_year', label:'Every 4 years'},
  'vx-concierge': {group:'ongoing', label:'Access while eligible'},
};

export function classifyBenefitTiming(b: {
  id: string;
  tracking: {kind: string; years?: number};
}): BenefitTiming {
  // Activation requirements are orthogonal: a monthly credit stays monthly,
  // and enrolled lounge access remains tied to each eligible visit.
  if (Object.hasOwn(overrides, b.id)) return {...overrides[b.id]};
  switch (b.tracking.kind) {
    case 'quarterly': return {group:'quarterly', label:'Each calendar quarter'};
    case 'billing_cycle': return {group:'billing_cycle', label:'Each billing cycle'};
    case 'annual_certificate': return {group:'annual', label:'Annual reward certificate'};
    case 'anniversary': return {group:'annual', label:'Across each account year'};
    case 'statement_cycle': return {group:'annual', label:'Across each statement-based year'};
    case 'calendar_year': return {group:'annual', label:'Across each calendar year'};
    case 'monthly': return {group:'monthly', label:'Across each month'};
    case 'half_year': return {group:'half_year', label:'January–June / July–December'};
    case 'per_stay': return {group:'per_use', label:'Per qualifying stay'};
    case 'rolling_years': return {group:'multi_year', label:b.tracking.years ? `Every ${b.tracking.years} years` : 'Multi-year eligibility cycle'};
    case 'enrollment_years': return {group:'membership', label:'From partner enrollment'};
    case 'ongoing': return {group:'ongoing', label:'Available while eligible'};
    case 'fixed': return {group:'limited_offer', label:'Published offer window'};
    default: return {group:'unknown', label:'Timing to confirm'};
  }
}
