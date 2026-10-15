import type { Bundle } from './catalog.js';
import { DateValue } from './tracker.js';

export type BenefitPlan = {
  date: string | null;
  dateLabel: string;
  dateBasis: string;
  days: number | null;
  action: string;
  status: string;
  priority: number;
};

const iso = (date: Date) => date.toISOString().slice(0, 10);
export function anniversaryInYear(openedOn: string, year: number) {
  const original = new Date(`${openedOn}T00:00:00Z`);
  const month = original.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return iso(new Date(Date.UTC(year, month, Math.min(original.getUTCDate(), lastDay))));
}

export function nextAnniversary(openedOn: string, planningOn: string, includeToday = false) {
  if (!DateValue.safeParse(openedOn).success || !DateValue.safeParse(planningOn).success) return null;
  const firstYear = Number(openedOn.slice(0, 4)) + 1;
  let year = Math.max(firstYear, Number(planningOn.slice(0, 4)));
  let date = anniversaryInYear(openedOn, year);
  if (date < planningOn || (!includeToday && date === planningOn)) date = anniversaryInYear(openedOn, ++year);
  return date;
}

export const displayDate = (date: string) => new Intl.DateTimeFormat('en-US', {
  month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
}).format(new Date(`${date}T00:00:00Z`));

export function planBenefit(b: Bundle, openedOn: string, planningOn: string): BenefitPlan {
  const make = (values: Partial<BenefitPlan>): BenefitPlan => {
    const result = {date:null,dateLabel:'Ongoing benefit',dateBasis:'Subject to eligibility',days:null,
      action:b.summary,status:'Available if eligible',priority:3,...values};
    if (result.date) result.days = Math.round((Date.parse(result.date) - Date.parse(planningOn)) / 86400000);
    return result;
  };
  if (openedOn && openedOn > planningOn) return make({date:openedOn,dateLabel:'Card starts',dateBasis:'Your card start date',
    action:'Your card start date is after this planning date.',status:'Not started',priority:5});
  if (b.evidenceStatus === 'version_unverified' || b.evidenceStatus === 'conflicting') return make({
    dateLabel:'Current coverage unverified',dateBasis:'Check the issuer’s current guide',action:'Confirm current coverage before relying on this protection.',status:'Verify coverage',priority:6});
  if (b.effectiveFrom && planningOn < b.effectiveFrom) return make({date:b.effectiveFrom,dateLabel:'Terms start',
    dateBasis:'Published effective date',action:'These terms start after your planning date.',status:'Not started',priority:5});
  if (planningOn < b.retrievedAt) return make({dateLabel:'Historical terms unverified',dateBasis:'Source reviewed after your planning date',
    action:'Current source information cannot confirm benefits for this past date.',status:'Past date',priority:5});
  if (b.effectiveTo && planningOn > b.effectiveTo) return make({date:b.effectiveTo,dateLabel:'Offer ended',dateBasis:'Published end date',
    action:'The published offer has ended. Check for a replacement offer.',status:'Offer ended',priority:5});

  const kind = b.tracking.kind;
  const allowance = b.tracking.allowance;
  if (kind === 'billing_cycle') return make({dateLabel:'Billing-cycle period',dateBasis:'Statement closing date; not inferred from card opening',action:b.summary,status:'Billing-cycle rewards'});
  if (kind === 'quarterly') {
    const year=Number(planningOn.slice(0,4)),month=Number(planningOn.slice(5,7));
    const date=iso(new Date(Date.UTC(year,Math.ceil(month/3)*3,0)));
    return make({date,dateLabel:'Bonus category period ends',dateBasis:'Calendar quarter; activation and spending conditions apply',action:b.use,status:b.tracking.activationRequired?'Activation required':'Quarterly rewards',priority:1});
  }
  if (kind === 'annual_certificate') return make({date:`${planningOn.slice(0,4)}-12-31`,dateLabel:'If issued this year: redeem by',dateBasis:'Certificate amount and issuance are not connected',action:b.use,status:'Annual reward certificate',priority:1});
  if (kind === 'anniversary') {
    const bonus = b.id === 'vx-bonus';
    const date = openedOn ? nextAnniversary(openedOn, planningOn, bonus) : null;
    return make({date,dateLabel:bonus?'Bonus expected after':'Next account anniversary',
      dateBasis:date?'Estimated from card start date':'Calculated once you add your card start date',
      action:bonus?'Look for the 10,000-mile anniversary bonus; posting may happen later.':
        'Use any unused portion of the $300 annual travel credit on an existing plan through Capital One Travel.',status:date?'Card-year estimate':'Annual benefit',priority:date?1:3});
  }
  if (kind === 'statement_cycle') return make({dateLabel:'Statement-cycle reset',dateBasis:'Exact date is set by the issuer',
    action:'Use any unused travel credit on eligible purchases; check your statement for the reset date.',status:'Account-year benefit',priority:3});
  if (kind === 'rolling_years') return make({dateLabel:`Every ${b.tracking.years} years`,dateBasis:'From the last reimbursement posting date',
    action:'Check issuer availability before paying an application fee; the credit is up to $120.',status:'Eligibility cycle',priority:3});
  if (kind === 'enrollment_years' || (b.tracking.activationRequired && b.tracking.activationBy)) {
    const activationBy = b.tracking.activationBy;
    const ended = activationBy !== null && planningOn > activationBy;
    let duration = kind === 'enrollment_years' ? `${b.tracking.minimumDuration?'At least ':''}${b.tracking.years} ${b.tracking.years===1?'year':'years'} from partner activation` : 'Partner activation determines membership timing';
    if (b.id === 'vx-cultivist') duration = 'Discount lasts two years from eligible enrollment';
    return make({date:activationBy,dateLabel:activationBy?'Activation deadline':'Starts with partner enrollment',
      dateBasis:duration,action:ended?'The activation window has ended; existing memberships may continue under their terms.':
        b.tracking.renewalWarning?'If useful to you, activate with the partner and check automatic renewal pricing.':'Activate with the partner if you want to use this benefit.',
      status:ended?'Activation window ended':'Enrollment required',priority:ended?5:2});
  }
  if (kind === 'calendar_year' || kind === 'half_year' || kind === 'monthly') {
    const year = Number(planningOn.slice(0,4)), month = Number(planningOn.slice(5,7));
    const endMonth = kind==='calendar_year'?12:kind==='half_year'?(month<=6?6:12):month;
    let date = iso(new Date(Date.UTC(year,endMonth,0)));
    if (b.effectiveTo && b.effectiveTo < date) date = b.effectiveTo;
    const cadence = kind==='monthly'?'month':kind==='half_year'?'half-year':'calendar year';
    const days = Math.round((Date.parse(date)-Date.parse(planningOn))/86400000);
    return make({date,dateLabel:'Current period ends',dateBasis:allowance===undefined?`${cadence} rewards period · usage unknown`:`Up to $${allowance} each ${cadence} · remaining amount unknown`,
      action:allowance===undefined?b.summary:`${b.tracking.activationRequired?'Activate first if you haven’t already. ':''}Use any unused credit only for eligible purchases you already plan.`,
      status:days<=30?'Ending soon':b.tracking.activationRequired?'Enrollment required':'Scheduled reset',priority:days<=30?0:1});
  }
  if (kind === 'fixed') return make({date:b.effectiveTo,dateLabel:'Offer ends',dateBasis:'Published deadline',
    action:b.tracking.activationRequired?'Activate this benefit with the partner before relying on it.':'Use the eligible offer for an existing plan before its published end.',
    status:b.tracking.activationRequired?'Enrollment required':'Fixed offer',priority:1});
  if (b.tracking.activationRequired) return make({dateLabel:'Enrollment required',dateBasis:'Card opening does not activate this benefit',
    action:b.enrollment,status:'Enrollment required',priority:2});
  if (kind === 'per_stay') return make({dateLabel:'At each eligible stay',dateBasis:'No annual allowance to spend down',
    action:`${b.summary} ${b.payment}`,status:'Per-stay benefit'});
  if (kind === 'unknown') return make({dateLabel:'Timing varies',dateBasis:'See the linked issuer terms',action:b.summary,status:'Check eligibility'});
  return make({action:b.id==='vx-phone'?'Pay the eligible phone bill with this card; check coverage before a claim.':b.summary});
}
