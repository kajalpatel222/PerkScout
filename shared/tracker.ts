import {z} from 'zod';
import type {Bundle} from './catalog';
export const DateValue=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v);
const optionalDate=DateValue.or(z.literal(''));
export const BenefitInput=z.object({enrollment:z.enum(['unknown','not_enrolled','enrolled']).default('unknown'),enrolledOn:optionalDate.default(''),confirmedExpiry:optionalDate.default(''),lastReimbursed:optionalDate.default(''),periodStart:optionalDate.default(''),periodEnd:optionalDate.default(''),used:z.number().finite().min(0).nullable().default(null),usagePeriod:z.string().default('')});
export const ProfileSchema=z.object({openedOn:optionalDate.default(''),anniversary:optionalDate.default(''),benefits:z.record(BenefitInput).default({})});
export type Profile=z.infer<typeof ProfileSchema>;export type BenefitFact=z.infer<typeof BenefitInput>;
export const emptyFact=():BenefitFact=>BenefitInput.parse({});
function addYears(date:string,years:number){const d=new Date(date+'T00:00:00Z'),month=d.getUTCMonth(),day=d.getUTCDate();const last=new Date(Date.UTC(d.getUTCFullYear()+years,month+1,0)).getUTCDate();return new Date(Date.UTC(d.getUTCFullYear()+years,month,Math.min(day,last))).toISOString().slice(0,10);}
function previousDay(date:string){return new Date(Date.parse(date)-86400000).toISOString().slice(0,10);}
export function deadline(asOf:string,policyEnd:string|null,confirmedExpiry:string){const end=[policyEnd,confirmedExpiry||null].filter((v):v is string=>!!v).sort()[0];if(!end)return {date:null,days:null,label:'No verified deadline',origin:'unknown'};const days=Math.round((Date.parse(end)-Date.parse(asOf))/86400000);return {date:end,days,label:days<0?'Expired':days===0?'Ends today':days<=30?'Ends soon':'Upcoming deadline',origin:end===policyEnd?'Official advertised end date':'User-entered expiry'};}
export function track(b:Bundle,p:Profile,f:BenefitFact,asOf:string){
 const kind=b.tracking.kind;let start:string|null=null,end:string|null=null,event='Deadline',message='No recurring deadline',warning:string|null=null;let date:string|null=null;let eventCountsAsExpiry=true;
 const unverified=b.evidenceStatus==='version_unverified'||b.evidenceStatus==='conflicting';
 if(unverified)return {date:null,days:null,event:'Unverified',message:'Current terms need verification',remaining:null,periodKey:'',warning:'Tracking disabled until applicable terms are verified.',status:'Verify terms'};
 if(b.effectiveFrom&&asOf<b.effectiveFrom)return {date:b.effectiveFrom,days:Math.round((Date.parse(b.effectiveFrom)-Date.parse(asOf))/86400000),event:'Starts',message:'Not yet effective',remaining:null,periodKey:'',warning:null,status:'Not started'};
 const year=Number(asOf.slice(0,4)),month=Number(asOf.slice(5,7));
 if(kind==='calendar_year'||kind==='half_year'||kind==='monthly'){
  const first=kind==='calendar_year'?1:kind==='half_year'?(month<=6?1:7):month;const last=kind==='calendar_year'?12:kind==='half_year'?(month<=6?6:12):month;
  start=`${year}-${String(first).padStart(2,'0')}-01`;end=new Date(Date.UTC(year,last,0)).toISOString().slice(0,10);date=end;event='Period ends';message=kind==='half_year'?'Half-year allowance':kind==='monthly'?'Monthly allowance':'Calendar-year allowance';
 }else if(kind==='anniversary'){
  // Account opening date is insufficient on Feb 29: use an issuer-confirmed anniversary.
  const anniversary=p.anniversary;
  if(anniversary&&anniversary>=asOf&&anniversary<=addYears(asOf,1)) {date=anniversary;event='Anniversary';end=previousDay(anniversary);start=addYears(anniversary,-1);message='Account-year tracking';}
  else message='Add issuer-confirmed next anniversary';
  if(b.id==='vx-bonus'){event='Bonus expected after';eventCountsAsExpiry=false;start=null;end=null;}
 }else if(kind==='statement_cycle'){
  if(f.periodStart&&f.periodEnd&&f.periodStart<=asOf&&asOf<=f.periodEnd){start=f.periodStart;end=f.periodEnd;date=end;event='Period ends';message='Issuer-confirmed statement period';}else message='Add current period dates from issuer';
 }else if(kind==='rolling_years'){
  if(f.lastReimbursed&&f.lastReimbursed<=asOf){date=addYears(f.lastReimbursed,b.tracking.years!);event='Eligible again';eventCountsAsExpiry=false;message='Based on last reimbursement posting date';}else message='Add last reimbursement date';
 }else if(kind==='enrollment_years'){
  if(f.enrollment==='enrolled'&&f.enrolledOn&&f.enrolledOn<=asOf&&(!b.tracking.notBefore||f.enrolledOn>=b.tracking.notBefore)&&(!b.tracking.activationBy||f.enrolledOn<=b.tracking.activationBy)){
   date=addYears(f.enrolledOn,b.tracking.years!);event=b.tracking.minimumDuration?'Minimum coverage through':'Discount ends';eventCountsAsExpiry=!b.tracking.minimumDuration;message='Based on your enrollment date';
  }else message='Add eligible enrollment date';
 }else if(kind==='fixed'){
  message='Fixed offer end date';
  if(b.tracking.allowance&&b.effectiveFrom&&b.effectiveTo){start=b.effectiveFrom;end=b.effectiveTo;}
 }else if(kind==='per_stay'){message='Per stay · no annual balance';}else if(kind==='unknown'){message='Confirm deadline with issuer or partner';}
 if(b.tracking.activationRequired&&f.enrollment!=='enrolled'&&b.tracking.activationBy){date=b.tracking.activationBy;event='Activate by';}
 if(f.confirmedExpiry){if(!date||f.confirmedExpiry<date||b.tracking.minimumDuration){date=f.confirmedExpiry;event='Confirmed expiry';eventCountsAsExpiry=true;}}
 if(b.effectiveTo&&(!date||b.effectiveTo<=date)){date=b.effectiveTo;event='Offer ends';eventCountsAsExpiry=true;}
 const days=date?Math.round((Date.parse(date)-Date.parse(asOf))/86400000):null;
 if(b.effectiveTo&&asOf>b.effectiveTo)warning='Offer ended. Confirm any continuing account benefits.';
 if(f.enrolledOn&&f.enrolledOn>asOf)warning='Enrollment date is after the view date.';
 if(f.enrolledOn&&b.tracking.notBefore&&f.enrolledOn<b.tracking.notBefore)warning='Earlier enrollment requires separate terms.';
 if(b.tracking.renewalWarning&&f.enrollment==='enrolled')warning='Check the partner’s actual renewal date and price.';
 const periodKey=start&&end?`${start}/${end}`:'';
 const periodActive=!!periodKey&&start!<=asOf&&asOf<=end!&&(!b.effectiveTo||asOf<=b.effectiveTo)&&(!f.confirmedExpiry||asOf<=f.confirmedExpiry);
 const enrollmentOkay=!b.tracking.activationRequired||(f.enrollment==='enrolled'&&(!f.enrolledOn||f.enrolledOn<=asOf));
 let remaining:number|null=null;
 if(b.tracking.allowance&&periodActive&&enrollmentOkay&&f.used!==null&&f.usagePeriod===periodKey){if(f.used<=b.tracking.allowance)remaining=Math.round((b.tracking.allowance-f.used)*100)/100;else warning='Recorded usage exceeds this period’s allowance. Check the input.';}
 if(f.used!==null&&f.usagePeriod!==periodKey)warning='Recorded usage belongs to another or unconfirmed period.';
 const expired=days!==null&&days<0&&eventCountsAsExpiry;
 const status=expired?'Expired':b.tracking.activationRequired&&f.enrollment!=='enrolled'?'Needs enrollment':days!==null&&days>=0&&days<=30?'Due soon':kind==='rolling_years'&&days!==null&&days<=0?'Check eligibility':date?'Tracked':kind==='ongoing'||kind==='per_stay'?'Ongoing':'Needs details';
 return {date,days,event,message,remaining,periodKey,warning,status};
}
