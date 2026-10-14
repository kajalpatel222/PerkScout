import React, {useEffect, useRef, useState} from 'react';
import {AnswerSchema, type Answer, type Request} from '../shared/schema';
import {cardIds, cardShortNames, type CardId} from '../shared/cards';
import AnswerResults from './AnswerResults';
import {Icon} from './Visuals';
import './ask.css';

const examples = ['A weekend trip', 'Rental cars and rideshares', 'Compare hotel benefits', 'How much credit is left?'];

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function Ask({selected, onChooseCards, onOpenBenefit}: {
  selected: CardId[];
  onChooseCards: () => void;
  onOpenBenefit: (id: string) => void;
}) {
  const selectedCards = cardIds.filter(id => selected.includes(id));
  const scope = selectedCards.length ? selectedCards : [...cardIds];
  const scopeKey = scope.join(',');
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<Answer | null>(null);
  const [resultScope, setResultScope] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastRequest, setLastRequest] = useState<Request | null>(null);
  const controller = useRef<AbortController | null>(null);
  const requestVersion = useRef(0);
  const currentScope = useRef(scopeKey);
  currentScope.current = scopeKey;

  useEffect(() => {
    controller.current?.abort();
    requestVersion.current += 1;
    setResult(null);
    setLastRequest(null);
    setError('');
    setLoading(false);
    return () => {
      controller.current?.abort();
      requestVersion.current += 1;
    };
  }, [scopeKey]);

  async function submit(request: Request) {
    controller.current?.abort();
    const abortController = new AbortController();
    controller.current = abortController;
    const version = ++requestVersion.current;
    const submittedScope = request.cards.join(',');
    const datedRequest = {...request, asOf: today()};
    setLoading(true);
    setError('');
    setResult(null);
    setLastRequest(datedRequest);
    try {
      const response = await fetch('/api/ask', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(datedRequest), signal: abortController.signal,
      });
      if (!response.ok) {
        let message = 'The benefit service could not finish this search. Please try again.';
        try {
          const body = await response.json();
          if (typeof body.error === 'string') message = body.error;
        } catch { /* Keep the useful fallback when the service returns a non-JSON error. */ }
        throw new Error(message);
      }
      const parsed = AnswerSchema.safeParse(await response.json());
      if (!parsed.success) throw new Error('This answer could not be verified. Please try again.');
      if (version !== requestVersion.current || submittedScope !== currentScope.current || abortController.signal.aborted) return;
      setResult(parsed.data);
      setResultScope(submittedScope);
    } catch (failure) {
      if (version !== requestVersion.current || abortController.signal.aborted || submittedScope !== currentScope.current) return;
      setError(failure instanceof TypeError ? 'The local benefit service is unavailable. Please try again.' : failure instanceof Error ? failure.message : 'Something went wrong. Please try again.');
    } finally {
      if (version === requestVersion.current && submittedScope === currentScope.current && !abortController.signal.aborted) setLoading(false);
    }
  }

  function ask(value: string) {
    const trimmed = value.trim();
    if (trimmed.length < 3) return;
    setQuestion(value);
    void submit({question: trimmed, cards: scope, asOf: today(), facts: {}});
  }

  function cancel() {
    controller.current?.abort();
    requestVersion.current += 1;
    setLoading(false);
  }

  return <div className="ask-page">
    <section className="ask-intro">
      <span className="eyebrow">ASK PERKSCOUT</span>
      <h1>What are you planning?</h1>
      <p className="muted">Find card benefits that fit what you already have in mind.</p>
    </section>
    <section className="ask-composer" aria-label="Ask about card benefits">
      <div className="ask-scope">
        <span><Icon name="cards" size={16}/>{!selectedCards.length ? 'Browsing all cards' : selectedCards.length === 1 ? cardShortNames[selectedCards[0]] : `${selectedCards.length} selected cards`}</span>
        <button className="text-button" type="button" onClick={onChooseCards}>{selectedCards.length ? 'Change cards' : 'Choose cards'}</button>
      </div>
      <form onSubmit={event => {event.preventDefault(); ask(question);}}>
        <label className="sr-only" htmlFor="ask-question">What would you like to do?</label>
        <textarea id="ask-question" value={question} onChange={event => setQuestion(event.target.value)}
          placeholder="I’m planning a weekend trip. Which benefits could I use?"
          maxLength={1500} minLength={3} required rows={3} aria-describedby="ask-privacy"/>
        <div className="ask-form-actions">
          <span className="muted">A real plan is a good place to start.</span>
          <button type="submit" className="primary" disabled={loading || question.trim().length < 3}>{loading ? 'Looking it up…' : 'Find my benefits'} <Icon name="arrow" size={17}/></button>
        </div>
      </form>
      <p id="ask-privacy" className="ask-privacy">No card numbers or login details. Personal balances are not connected.</p>
    </section>
    <div className="ask-examples" aria-label="Example questions">
      {examples.map(example => <button type="button" key={example} disabled={loading} onClick={() => ask(example)}>{example} <Icon name="arrow" size={13}/></button>)}
    </div>
    <div className="ask-results" aria-busy={loading}>
      <span className="sr-only" role="status">{result && resultScope === scopeKey ? result.benefits.length ? `${result.benefits.length} benefits found. Your answer is below.` : 'The search is complete. More evidence is needed; details are below.' : ''}</span>
      {loading && <div className="ask-loading">
        <span className="ask-spinner" aria-hidden="true"/>
        <div role="status"><strong>Finding relevant benefits</strong><p>Checking the catalog and supporting terms.</p></div>
        <button type="button" className="text-button" onClick={cancel}>Cancel</button>
      </div>}
      {error && <div className="error-state ask-error" role="alert"><p>{error}</p>
        <button className="secondary" type="button" onClick={() => lastRequest && void submit(lastRequest)}>Try again</button>
      </div>}
      {result && resultScope === scopeKey && lastRequest && <AnswerResults data={result} lastQuestion={lastRequest.question}
        onOpenBenefit={onOpenBenefit} loading={loading}
        onFollowUp={enrolled => void submit({...lastRequest, facts: {...lastRequest.facts, priorityPassEnrolled: enrolled}})}/>} 
      {!result && !loading && !error && <p className="ask-start-note">Ask about a trip, a purchase, or a benefit. We’ll show the supporting sources.</p>}
    </div>
  </div>;
}
