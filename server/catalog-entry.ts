import {BundleSchema,TrackingSchema,type Bundle,type Tracking} from '../shared/catalog.js';
import {classifyBenefitTiming} from '../shared/benefit-timing.js';
type Input=Pick<Bundle,'id'|'cardId'|'title'|'category'|'topic'|'summary'|'sourceUrl'|'documentTitle'|'section'> & Partial<Omit<Bundle,'tracking'>> & {tracking:Pick<Tracking,'kind'>&Partial<Tracking>};
export function defineBenefit(input:Input):Bundle {
 const tracking=TrackingSchema.parse(input.tracking);
 return BundleSchema.parse({use:'Check the linked issuer terms for eligible purchases you already plan.',enrollment:'No separate enrollment established by this source.',payment:'Use the eligible card; see linked terms.',limit:'Subject to issuer terms; no remaining reward balance assumed.',exclusions:'Issuer eligibility and exclusions apply.',missing:['Account eligibility and reward usage are not connected'],page:null,effectiveFrom:null,effectiveTo:null,retrievedAt:'2026-10-13',sourceUpdatedAt:null,evidenceStatus:'summary_only',...input,tracking,timing:input.timing??classifyBenefitTiming({id:input.id,tracking})});
}
