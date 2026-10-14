import React from 'react';
import {type Answer} from '../shared/schema';
import {cards, cardShortNames} from '../shared/cards';
import {Icon} from './Visuals';

type Claim = Answer['benefits'][number]['benefit'];

function sourceHref(citation: Answer['citations'][number]) {
  return citation.page ? `${citation.sourceUrl.split('#')[0]}#page=${citation.page}` : citation.sourceUrl;
}

function ClaimText({claim, citations}: {claim: Claim; citations: Answer['citations']}) {
  const sources = citations.filter(citation => claim.citationIds.includes(citation.id));
  return <>{claim.text}{sources.map(citation => <a className="ask-claim-reference" key={citation.id}
    href={sourceHref(citation)} target="_blank" rel="noreferrer"
    aria-label={`Source: ${citation.documentTitle}, ${citation.section}`}>
    [{citations.indexOf(citation) + 1}]
  </a>)}{!sources.length && <span className="ask-evidence-label"> Source unavailable</span>}</>;
}

function Sources({citations, allCitations}: {citations: Answer['citations']; allCitations: Answer['citations']}) {
  if (!citations.length) return <p className="ask-evidence-label">Supporting source unavailable.</p>;
  return <div className="ask-sources">
    <h4>Supporting sources</h4>
    {citations.map(citation => <article className="ask-source" key={citation.id}>
      <a href={sourceHref(citation)} target="_blank" rel="noreferrer">
        [{allCitations.indexOf(citation) + 1}] {citation.documentTitle} <Icon name="external" size={12}/>
      </a>
      <p>{cards[citation.cardId]} · {citation.section}{citation.page !== null ? ` · Page ${citation.page}` : ''}</p>
      <p>Retrieved {citation.retrievedAt} · {citation.effectiveFrom ? `Effective from ${citation.effectiveFrom}` : 'Effective start not provided'}{citation.effectiveTo ? ` · Ends ${citation.effectiveTo}` : ''}</p>
      <p className="ask-source-version">Policy version: {citation.policyVersionId}</p>
      {citation.evidenceStatus !== 'terms_reviewed' && <p className="ask-evidence-label">
        {citation.evidenceStatus === 'version_unverified' ? 'Current applicability unverified' : citation.evidenceStatus === 'conflicting' ? 'Conflicting terms' : 'Issuer summary; full terms may add conditions'}
      </p>}
      <p className="ask-source-excerpt">Curated paraphrase: {citation.excerpt}</p>
    </article>)}
  </div>;
}

export default function AnswerResults({data, lastQuestion, onFollowUp, onOpenBenefit, loading = false}: {
  data: Answer;
  lastQuestion: string;
  onFollowUp: (enrolled: boolean) => void;
  onOpenBenefit: (id: string) => void;
  loading?: boolean;
}) {
  return <section className="ask-answer" aria-label={`Answer to ${lastQuestion}`}>
    <div className="ask-answer-heading">
      <span className="eyebrow">FOR YOUR PLAN</span>
      <h2>{data.benefits.length ? `${data.benefits.length} ${data.benefits.length === 1 ? 'benefit' : 'benefits'} to explore` : 'A little more certainty needed'}</h2>
      <p>{data.explanation}</p>
    </div>
    {data.followUp && <section className="ask-followup" aria-label="A detail that affects eligibility">
      <p>{data.followUp.question}</p>
      <div>
        <button type="button" className="secondary" disabled={loading} onClick={() => onFollowUp(true)}>Yes, enrolled</button>
        <button type="button" className="secondary" disabled={loading} onClick={() => onFollowUp(false)}>No, not yet</button>
      </div>
    </section>}
    {data.benefits.length > 0 && <div className="ask-benefit-list">
      {data.benefits.map(benefit => {
        const groups = [
          ['How to use', benefit.howToUse], ['Enrollment', benefit.enrollment],
          ['Booking & payment', benefit.bookingAndPayment], ['Limits & reset', benefit.limitsAndReset],
          ['Exclusions', benefit.exclusions],
        ] as const;
        const citationIds = new Set([benefit.benefit, ...groups.flatMap(([, claims]) => claims)].flatMap(claim => claim.citationIds));
        return <article className="ask-benefit-row" key={benefit.benefitId}>
          <div className="ask-benefit-copy">
            <span className="ask-card-label"><span className={`ask-card-dot ${benefit.cardId}`} aria-hidden="true"/>{cardShortNames[benefit.cardId]}</span>
            <h3><button type="button" onClick={() => onOpenBenefit(benefit.benefitId)}>{benefit.benefit.text.split(':')[0]} <Icon name="chevron" size={16}/></button></h3>
            <p className="ask-fit">{benefit.whyItFits}</p>
          </div>
          <details className="ask-answer-details">
            <summary>Answer details & sources</summary>
            <p><ClaimText claim={benefit.benefit} citations={data.citations}/></p>
            <dl>{groups.filter(([, claims]) => claims.length).map(([label, claims]) => <div key={label}>
              <dt>{label}</dt><dd>{claims.map((claim, index) => <p key={`${label}-${index}`}><ClaimText claim={claim} citations={data.citations}/></p>)}</dd>
            </div>)}</dl>
            {benefit.missingEligibilityDetails.length > 0 && <div className="ask-conditions-note">
              <strong>Before you use it</strong>
              <ul>{benefit.missingEligibilityDetails.map((detail, index) => <li key={index}>{detail}</li>)}</ul>
            </div>}
            <Sources citations={data.citations.filter(citation => citationIds.has(citation.id))} allCitations={data.citations}/>
          </details>
        </article>;
      })}
    </div>}
    {data.evidenceGaps.length > 0 && <section className="ask-evidence-gaps" aria-label="Benefits with unverified terms">
      <h3>Terms to verify</h3>
      <p className="muted">These may be relevant, but the available evidence does not confirm current coverage.</p>
      {data.evidenceGaps.map(gap => <article key={gap.benefitId}>
        <span className="ask-card-label">{cardShortNames[gap.cardId]}</span>
        <h4><button type="button" onClick={() => onOpenBenefit(gap.benefitId)}>{gap.benefit} <Icon name="chevron" size={15}/></button></h4>
        <p>{gap.nextStep}</p>
        <details className="ask-answer-details">
          <summary>Why this needs verification</summary>
          <p><ClaimText claim={gap.reason} citations={data.citations}/></p>
          <Sources citations={data.citations.filter(citation => gap.reason.citationIds.includes(citation.id))} allCitations={data.citations}/>
        </details>
      </article>)}
    </section>}
    {data.notices.length > 0 && <details className="ask-notices">
      <summary>What this answer can confirm</summary>
      {data.notices.map((notice, index) => <p key={index}>{notice}</p>)}
    </details>}
  </section>;
}
