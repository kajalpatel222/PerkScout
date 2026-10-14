import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { corpus, type Bundle } from './corpus.js';
import { AnswerSchema, cards, type Request } from '../shared/schema.js';
import { analyzeQuestion } from './search-intent.js';

const concepts = [
  ['travel','trip','weekend','vacation','holiday','journey'],
  ['lounge','airport','flight','quiet','relax','priority','pass'],
  ['hotel','stay','lodging','breakfast','room','ihg','edit'],
  ['international','abroad','overseas','foreign','europe','currency'],
  ['phone','cell','mobile','damage','stolen'], ['hertz','rental','car','cars'],
  ['museum','cultivist','art'], ['events','concert','tickets','stubhub','viagogo'],
  ['dining','restaurant','restaurants','meal'], ['rides','rideshare','lyft','ride'],
  ['fitness','peloton','exercise'], ['streaming','apple','music','tv'],
  ['delivery','dashpass','doordash'], ['security','global','entry','precheck','nexus'],
  ['rewards','miles','points','bonus'],
];
const stopwords = new Set('i a an the am is are be been being to from at on in of for with and or but it this that my me we our you your can could would should do does did what which how when where use have has planning plan benefits benefit perks perk'.split(' '));
export function vector(text:string) {
  const tokens = text.toLowerCase().match(/[a-z]+/g) || [];
  return concepts.map(words => tokens.filter(t => words.includes(t)).length);
}
function similarity(a:number[], b:number[]) {
  const norm = (v:number[]) => Math.sqrt(v.reduce((s,n) => s+n*n,0));
  return a.reduce((s,n,i) => s+n*b[i],0) / (norm(a)*norm(b) || 1);
}
const hash = (b:Bundle) => createHash('sha256').update(JSON.stringify(b)).digest('hex');
type Intent = ReturnType<typeof analyzeQuestion>;

function applicable(b:Bundle, req:Request) {
  return req.cards.includes(b.cardId) && req.asOf >= b.retrievedAt &&
    (!b.effectiveFrom || req.asOf >= b.effectiveFrom) && (!b.effectiveTo || req.asOf <= b.effectiveTo);
}
function coverageOnly(req:Request, intent:Intent) {
  return !intent.broadTrip && /\b(insurance|coverage|collision|waiver|protection)\b/i.test(req.question);
}
function topicAllowed(b:Bundle, intent:Intent) {
  if (intent.excludedTopics.includes(b.topic)) return false;
  const topics = [...intent.explicitTopics, ...intent.expandedTopics];
  return !topics.length || topics.includes(b.topic);
}
function timingKinds(question:string) {
  if (!/\b(reset|resets|renew|renews|expire|expires)\b/i.test(question)) return [];
  const kinds:string[] = [];
  if (/\b(monthly|each month|every month)\b/i.test(question)) kinds.push('monthly');
  if (/\b(calendar year|yearly|annual|annually|each year)\b/i.test(question)) kinds.push('calendar_year');
  if (/\b(anniversary|account year)\b/i.test(question)) kinds.push('anniversary','statement_cycle');
  if (/\b(half.year|six months)\b/i.test(question)) kinds.push('half_year');
  return kinds;
}

export function createRetriever(path=':memory:', bundles:Bundle[]=corpus) {
  const db = new DatabaseSync(path);
  db.exec('CREATE TABLE IF NOT EXISTS passages(id TEXT PRIMARY KEY, body TEXT, vector TEXT); CREATE VIRTUAL TABLE IF NOT EXISTS search USING fts5(id UNINDEXED,body); CREATE TABLE IF NOT EXISTS benefit_records(id TEXT PRIMARY KEY, metadata TEXT NOT NULL, content_hash TEXT NOT NULL); DELETE FROM passages; DELETE FROM search; DELETE FROM benefit_records;');
  for (const b of bundles) {
    const body = [b.title,b.topic,b.summary,b.use,b.enrollment,b.payment,b.limit,b.exclusions].join(' ');
    db.prepare('INSERT INTO benefit_records VALUES(?,?,?)').run(b.id,JSON.stringify(b),hash(b));
    db.prepare('INSERT INTO passages VALUES(?,?,?)').run(b.id,body,JSON.stringify(vector(`${b.topic} ${b.title} ${b.summary}`)));
    db.prepare('INSERT INTO search VALUES(?,?)').run(b.id,body);
  }
  function ranked(req:Request, intent:Intent) {
    const tokens = (req.question.toLowerCase().match(/[a-z]+/g) || []).filter(t => !stopwords.has(t));
    const expression = [...new Set(tokens)].map(t => '"'+t+'"').join(' OR ');
    const matches = expression ? db.prepare('SELECT id FROM search WHERE search MATCH ? ORDER BY rank').all(expression) : [];
    const keyword = new Map(matches.map((r,i) => [String(r.id), 1/(i+1)]));
    const q = vector(req.question);
    const cadence = timingKinds(req.question);
    return bundles.filter(b => applicable(b,req) && topicAllowed(b,intent) && (!cadence.length || cadence.includes(b.tracking.kind)) && (!coverageOnly(req,intent) || b.category === 'Protections'))
      .map(b => {
        const stored = db.prepare('SELECT vector FROM passages WHERE id=?').get(b.id)!;
        const topicScore = intent.explicitTopics.includes(b.topic) ? 1.2 : intent.expandedTopics.includes(b.topic) ? .55 : 0;
        return {b,score:topicScore+(cadence.includes(b.tracking.kind)?1.2:0)+similarity(q,JSON.parse(String(stored.vector)))+.15*(keyword.get(b.id)||0)};
      })
      .filter(r => r.score > .2)
      .sort((a,b) => b.score-a.score || a.b.id.localeCompare(b.b.id));
  }
  return {
    close:() => db.close(),
    search:(req:Request) => {
      const intent = analyzeQuestion(req.question);
      const rankedBenefits = ranked(req,intent).filter(({b}) => b.evidenceStatus !== 'version_unverified' && b.evidenceStatus !== 'conflicting');
      // Cover each relevant topic before adding more matches from a dominant topic.
      // The same rule protects multi-topic questions, not only generic trip prompts.
      const selected:Bundle[] = [];
      const seenTopics = new Set<string>();
      const limit = Math.max(intent.broadTrip ? 8 : 6, req.cards.length*2);
      for (const {b} of rankedBenefits) {
        if (seenTopics.has(b.topic)) continue;
        selected.push(b); seenTopics.add(b.topic);
        if (selected.length === limit) break;
      }
      // On comparisons, include the other selected card before more matches from one card.
      for (const card of req.cards) {
        if (selected.length >= limit || selected.some(b => b.cardId === card)) continue;
        const candidate = rankedBenefits.find(({b}) => b.cardId === card && !selected.includes(b));
        if (candidate) selected.push(candidate.b);
      }
      for (const {b} of rankedBenefits) {
        if (selected.length >= limit) break;
        if (!selected.includes(b)) selected.push(b);
      }
      return selected;
    },
    evidenceGaps:(req:Request) => {
      const intent = analyzeQuestion(req.question);
      return ranked(req,intent).filter(({b}) => b.evidenceStatus === 'version_unverified' || b.evidenceStatus === 'conflicting').slice(0,3).map(({b}) => b);
    },
  };
}

function fitFor(b:Bundle, intent:Intent) {
  if (b.topic === 'rental') return 'If you rent a car, check the booking, payment and eligibility rules before relying on this benefit.';
  if (b.topic === 'rides') return 'If you use Lyft for an eligible ride, this credit may fit. Ride availability at your destination has not been checked.';
  if (b.topic === 'hotel') return 'If you book a qualifying hotel stay, check the required booking channel and minimum stay.';
  if (b.topic === 'lounge') return 'If you fly through an airport with an eligible lounge, this may help before your flight.';
  if (b.topic === 'travel' && b.category !== 'Credits') return 'Check whether the purchases or services in your plan meet this card’s reward or assistance conditions.';
  if (b.topic === 'travel') return intent.broadTrip ? 'Eligible travel purchases for your trip may use this allowance; your remaining amount is unknown.' : 'This is a travel allowance for your selected card; usage and the applicable reset period still need confirmation.';
  return `Relevant to ${b.topic} for your selected card, subject to the cited conditions.`;
}
export function answer(req:Request, retriever:ReturnType<typeof createRetriever>) {
  const historical = req.asOf < '2026-10-13';
  const remainingCreditQuestion = /\b(?:credits?|allowance)\b/i.test(req.question) && /\b(?:remaining|left|balance|unused)\b/i.test(req.question);
  const intent = analyzeQuestion(req.question);
  const hits = historical ? [] : retriever.search(req);
  const gaps = historical ? [] : retriever.evidenceGaps(req);
  // A broad discovery question can show enrollment as a condition without blocking
  // the whole trip plan with a lounge-only follow-up.
  const follow = !intent.broadTrip && hits.some(b => b.id === 'vx-priority') && req.facts.priorityPassEnrolled === undefined;
  const citations = [...hits,...gaps].map(b => ({
    id:b.id,cardId:b.cardId,sourceUrl:b.sourceUrl,documentTitle:b.documentTitle,section:b.section,page:b.page,
    effectiveFrom:b.effectiveFrom,effectiveTo:b.effectiveTo,retrievedAt:b.retrievedAt,
    policyVersionId:`curated-${b.id}-${hash(b).slice(0,12)}`,evidenceStatus:b.evidenceStatus,
    excerpt:[b.summary,b.use,b.enrollment,b.payment,b.limit,b.exclusions].join(' '),
  }));
  const benefits = hits.map(b => {
    const claim = (text:string) => ({text,citationIds:[b.id]});
    return {
      benefitId:b.id,cardId:b.cardId,cardName:cards[b.cardId],benefit:claim(b.title+': '+b.summary),
      whyItFits:fitFor(b,intent),eligibility:'conditional' as const,howToUse:[claim(b.use)],enrollment:[claim(b.enrollment)],
      bookingAndPayment:[claim(b.payment)],limitsAndReset:[claim(b.limit)],exclusions:[claim(b.exclusions)],
      missingEligibilityDetails:b.missing,remainingCredit:{status:'unknown' as const,amount:null},
    };
  });
  const evidenceGaps = gaps.map(b => ({
    benefitId:b.id,cardId:b.cardId,cardName:cards[b.cardId],benefit:b.title,
    reason:{text:b.evidenceStatus === 'conflicting' ? 'The available terms conflict, so current eligibility cannot be established.' : `The issuer-linked guide lists this benefit${b.effectiveFrom ? ` with an effective date of ${b.effectiveFrom}` : ''}; its current applicability to your account is unverified.`,citationIds:[b.id]},
    nextStep:'Confirm the current applicable terms with the issuer before relying on this benefit.',
  }));
  return AnswerSchema.parse({
    schemaVersion:'1',mode:'local-extractive-demo',status:!hits.length?'insufficient_evidence':follow?'needs_details':'answered',
    explanation:remainingCreditQuestion ? 'Your remaining credit is unknown because account and usage data are not connected. Your usage and the applicable reset period are needed to determine what is left.'+(hits.length?' The benefits below show published limits, not your available balance.':'') : hits.length ? intent.broadTrip ? 'Here are options for your trip across relevant travel categories. Suggestions for hotels, flights, rental cars and rides are conditional on your plans.' : 'Here are relevant options for your selected cards. Eligibility depends on the linked terms and your circumstances.' : gaps.length ? 'I found relevant references, but cannot confirm current coverage from the available evidence.' : 'I don’t have sufficient applicable evidence in this small corpus to answer that question.',
    followUp:follow?{question:'Have you enrolled in Priority Pass through Venture X?',factKey:'priorityPassEnrolled'}:null,
    benefits,evidenceGaps,citations,
    notices:[
      'Local extractive demo: no language model or live account connection.',
      'Curated issuer and partner evidence. Unverified or conflicting terms appear only as evidence gaps, never confirmed coverage.',
      ...(intent.broadTrip ? ['Trip-related categories are suggestions, not facts about your itinerary. Local service and hotel availability have not been checked.'] : []),
      ...(historical ? ['Historical applicability cannot be established from these snapshots.'] : []),
      ...(req.asOf>'2026-10-13' ? ['This answer uses sources reviewed on 2026-10-13; later changes have not been checked.'] : []),
      ...(/remaining|left|balance/i.test(req.question) ? ['Remaining credits are unknown without your usage and the applicable reset period.'] : []),
      ...(req.facts.priorityPassEnrolled!==undefined ? [`You reported Priority Pass enrollment: ${req.facts.priorityPassEnrolled?'yes':'no'}. This is a user fact, not policy evidence.`] : []),
    ],
  });
}
