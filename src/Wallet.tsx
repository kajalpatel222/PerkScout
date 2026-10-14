import React, {useEffect, useState} from 'react';
import {cards,cardIds,type CardId} from '../shared/schema';
import {CatalogSchema, type Bundle} from '../shared/catalog';
import {ProfileSchema, type Profile} from '../shared/tracker';
import {planBenefit, nextAnniversary, displayDate} from '../shared/benefit-plan';
import {TIMING_GROUPS} from '../shared/benefit-timing';

const empty = (): Profile => ProfileSchema.parse({});
const initial = (): Record<CardId, Profile> => {
  try {
    const data = JSON.parse(localStorage.getItem('perkscout-wallet-v1') || '{}');
    return Object.fromEntries(cardIds.map(id=>[id,ProfileSchema.safeParse(data[id]||{}).success?ProfileSchema.parse(data[id]||{}):empty()])) as Record<CardId,Profile>;
  } catch { return Object.fromEntries(cardIds.map(id=>[id,empty()])) as Record<CardId,Profile>; }
};

export default function Wallet() {
  const [profiles,setProfiles] = useState(initial);
  const [active,setActive] = useState<CardId>('venture');
  const [catalog,setCatalog] = useState<Bundle[]>([]);
  const [error,setError] = useState('');
  const [planningOn,setPlanningOn] = useState('2026-10-13');
  const [filter,setFilter] = useState('all');
  const [category,setCategory] = useState('all');
  const [timing,setTiming] = useState('all');
  const [search,setSearch] = useState('');
  const [saveError,setSaveError] = useState('');
  useEffect(() => {
    fetch('/api/catalog').then(r => {if(!r.ok) throw Error(); return r.json();})
      .then(data => setCatalog(CatalogSchema.parse(data)))
      .catch(() => setError('Could not load benefits. Reload to retry.'));
  }, []);
  useEffect(() => {
    try {localStorage.setItem('perkscout-wallet-v1',JSON.stringify(profiles));setSaveError('');}
    catch {setSaveError('Browser storage unavailable. Your dates last only for this session.');}
  }, [profiles]);
  const profile = profiles[active];
  const items = catalog.filter(b => b.cardId===active);
  // Benefits are read-only. Previously saved benefit inputs are preserved but not used by this plan.
  const planned = items.map(b => ({b,s:planBenefit(b,profile.openedOn,planningOn)}));
  const byPriority = (a:typeof planned[number],b:typeof planned[number]) => a.s.priority-b.s.priority || (a.s.date||'9999').localeCompare(b.s.date||'9999');
  const visible = planned.filter(({b,s}) => (timing==='all'||b.timing.group===timing) && (category==='all'||b.category===category) &&
    `${b.title} ${b.category} ${b.timing.label}`.toLowerCase().includes(search.toLowerCase()) &&
    (filter==='all'||filter==='soon'&&s.days!==null&&s.days>=0&&s.days<=30||filter==='enrollment'&&b.tracking.activationRequired))
    .sort(byPriority);
  const groups = TIMING_GROUPS.map(group=>({...group,items:visible.filter(t=>t.b.timing.group===group.id)})).filter(group=>group.items.length);
  const availableGroups = TIMING_GROUPS.filter(group=>items.some(b=>b.timing.group===group.id));
  const upcoming = planned.filter(t => t.s.date && t.s.days!==null && t.s.days>=0 && t.s.priority<5).sort((a,b)=>a.s.date!.localeCompare(b.s.date!))[0];
  const anniversary = profile.openedOn ? nextAnniversary(profile.openedOn,planningOn) : null;

  return <section className="wallet">
    <div className="answer-heading"><span className="eyebrow">YOUR BENEFIT PLAN</span><h2>Know when your benefits apply.</h2><p>Yearly credits, benefits for each booking, and ongoing perks—all in one plan.</p></div>
    <div className="wallet-tabs" role="group" aria-label="Choose card">{Object.entries(cards).map(([id,name]) =>
      <button aria-pressed={active===id} key={id} onClick={()=>{setActive(id as CardId);setCategory('all');setTiming('all');setFilter('all');setSearch('');}}>{name} <span className="tab-count">{catalog.filter(b=>b.cardId===id).length}</span></button>)}</div>
    <div className="profile-panel plan-setup">
      <div><h3>{cards[active]}</h3><p>Your dates stay in this browser.</p></div>
      <label>Card start date<input type="date" value={profile.openedOn} onChange={e=>setProfiles(p=>({...p,[active]:{...p[active],openedOn:e.target.value}}))}/></label>
      <label>Planning date<input type="date" value={planningOn} required onChange={e=>{if(e.target.value)setPlanningOn(e.target.value);}}/></label>
      <div className="derived-anniversary"><span>Next anniversary</span><strong>{anniversary?displayDate(anniversary):'Calculated from your start date'}</strong><small>Estimated · benefit-specific rules still apply</small></div>
    </div>
    {saveError&&<p role="alert">{saveError}</p>}
    {profile.openedOn && profile.openedOn>planningOn && <p className="row-warning">Your card starts after this planning date. Benefits are shown as not yet started.</p>}
    <div className="plan-overview"><div><span>Next known date</span><strong>{upcoming?.s.date?displayDate(upcoming.s.date):'No dated event yet'}</strong><small>{upcoming?.b.title||'Explore ongoing benefits below'}</small></div></div>
    <section className="timing-browser" aria-label="Browse benefits by timing">
      <div className="timing-intro"><h3>When can you use it?</h3><p>Choose a group or browse them all below.</p></div>
      <div className="timing-options" role="group" aria-label="Benefit timing">
        <button aria-pressed={timing==='all'} onClick={()=>setTiming('all')}><strong>All benefits</strong><span>{items.length}</span></button>
        {availableGroups.map(group=><button key={group.id} aria-pressed={timing===group.id} onClick={()=>setTiming(group.id)}><strong>{group.title}</strong><span>{items.filter(b=>b.timing.group===group.id).length}</span></button>)}
      </div>
    </section>
    <div className="catalog-controls">
      <label>Find a benefit<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Travel, Hertz, phone…"/></label>
      <label>Benefit type<select value={category} onChange={e=>setCategory(e.target.value)}><option value="all">All types</option>{Array.from(new Set(items.map(b=>b.category))).map(c=><option key={c}>{c}</option>)}</select></label>
      <label>Show<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All benefits</option><option value="soon">Within 30 days</option><option value="enrollment">Requires enrollment</option></select></label>
    </div>
    <p className="coverage">{visible.length} of {items.length} catalog benefits · Dates don’t establish enrollment or remaining credit. Check your issuer before use.</p>
    {error&&<p role="alert">{error}</p>}{!catalog.length&&!error&&<p role="status">Building your benefit plan…</p>}{catalog.length>0&&!visible.length&&<div className="empty">No benefits match these filters.</div>}
    <div className="timing-sections">{groups.map(group=><section className="timing-section" aria-labelledby={`timing-${group.id}`} key={group.id}>
      <div className="timing-heading"><div><h3 id={`timing-${group.id}`}>{group.title} <span>{group.items.length}</span></h3><p>{group.description}</p></div></div>
      <div className="tracker-list">{group.items.map(({b,s})=><article className="tracker-row information-row" key={b.id} id={`benefit-${b.id}`}>
      <div className="row-main"><div><span className="eyebrow">{b.category} · {b.timing.label}</span><h3>{b.title}</h3><p>{s.action}</p></div>
        <div className="row-status"><span className={'badge '+(s.status==='Ending soon'?'urgent':'')}>{s.status}</span><strong>{s.date?displayDate(s.date):b.timing.label}</strong>{s.date&&<span>{s.dateLabel}{s.days!==null&&s.days>=0?` · ${s.days} days`:''}</span>}<small>{s.dateBasis}</small></div>
        <a className="source-link" href={b.sourceUrl+(b.page?`#page=${b.page}`:'')} target="_blank" rel="noreferrer">Official details ↗</a>
      </div>
    </article>)}</div></section>)}</div>
  </section>;
}
