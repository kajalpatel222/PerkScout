import {z} from 'zod';
import {cardId} from './cards';
import {TimingSchema} from './benefit-timing';
export const TrackingSchema=z.object({kind:z.enum(['ongoing','per_stay','anniversary','statement_cycle','calendar_year','half_year','monthly','rolling_years','enrollment_years','fixed','unknown','quarterly','billing_cycle','annual_certificate']),allowance:z.number().positive().optional(),years:z.number().int().positive().optional(),activationRequired:z.boolean().default(false),activationBy:z.string().nullable().default(null),notBefore:z.string().nullable().default(null),minimumDuration:z.boolean().default(false),renewalWarning:z.boolean().default(false)});
export const BundleSchema=z.object({id:z.string(),cardId,title:z.string(),topic:z.string(),category:z.enum(['Credits','Lounges','Hotels & status','Rewards','Experiences','Protections']),summary:z.string(),use:z.string(),enrollment:z.string(),payment:z.string(),limit:z.string(),exclusions:z.string(),missing:z.array(z.string()),sourceUrl:z.string().url(),documentTitle:z.string(),section:z.string(),page:z.number().int().positive().nullable(),effectiveFrom:z.string().nullable(),effectiveTo:z.string().nullable(),retrievedAt:z.string(),sourceUpdatedAt:z.string().nullable(),evidenceStatus:z.enum(['terms_reviewed','summary_only','version_unverified','conflicting']),tracking:TrackingSchema,timing:TimingSchema});
export const CatalogSchema=z.array(BundleSchema);
export type Bundle=z.infer<typeof BundleSchema>;
export type Tracking=z.infer<typeof TrackingSchema>;
