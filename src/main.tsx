import React, {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {CatalogSchema, type Bundle} from '../shared/catalog';
import {cards, cardIds, cardShortNames, type CardId} from '../shared/cards';
import {getGuideBenefits, getSituationBenefits, getEvidenceLabel, situations, timingLabel, type SituationId} from '../shared/guide';
import {BrandMark, CardArt, Icon, SituationArt, type IconName} from './Visuals';
import Ask from './Ask';
import {BenefitDrawer, CardPicker} from './Overlays';
import './style.css';

const selectionKey='perkscout-selected-cards-v1';
function readSelection(): CardId[] {
  try {const value=JSON.parse(localStorage.getItem(selectionKey)||'[]'); return Array.isArray(value)?cardIds.filter(id=>value.includes(id)):[];} catch {return [];}
}
function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function readRoute(){
  const [path='/explore',query='']=location.hash.slice(1).split('?');
  return {path:path||'/explore',benefit:new URLSearchParams(query).get('benefit')};
}
function go(path:string){location.hash=path;}
function benefitIcon(b:Bundle):IconName{
  if(b.topic==='rental'||b.topic==='rides')return 'car';
  if(b.category==='Protections')return 'shield';
  if(b.topic==='hotel')return 'hotel';
  if(['dining','delivery'].includes(b.topic))return 'coffee';
  if(b.category==='Rewards')return 'gift';
  if(b.category==='Experiences')return 'ticket';
  return 'plane';
}

function BenefitList({benefits,onOpen,showCard=true}:{benefits:Bundle[];onOpen:(id:string)=>void;showCard?:boolean}){
  const [search,setSearch]=useState('');
  const [category,setCategory]=useState('All benefits');
  const categories=Array.from(new Set(benefits.map(b=>b.category)));
  const visible=benefits.filter(b=>(category==='All benefits'||category===b.category)&&`${b.title} ${b.summary} ${cards[b.cardId]} ${b.topic}`.toLowerCase().includes(search.toLowerCase().trim()));
  return <section className="guide-list" aria-label="Benefit guide">
    <div className="list-tools"><label className="search-field"><Icon name="search" size={18}/><span className="sr-only">Search benefits</span><input type="search" placeholder="Find a benefit" value={search} onChange={e=>setSearch(e.target.value)}/></label><label className="category-select"><span className="sr-only">Benefit category</span><select value={category} onChange={e=>setCategory(e.target.value)}><option>All benefits</option>{categories.map(c=><option key={c}>{c}</option>)}</select></label><span className="list-count" aria-live="polite">{visible.length} {visible.length===1?'benefit':'benefits'}</span></div>
    {!visible.length?<div className="empty-state"><Icon name="search" size={30}/><h2>No matching benefits</h2><p>Try another search or explore a different card.</p>{(search||category!=='All benefits')&&<button className="secondary" onClick={()=>{setSearch('');setCategory('All benefits');}}>Clear filters</button>}</div>:<div className="benefit-list">{visible.map(b=>{
      const warning=b.evidenceStatus==='version_unverified'||b.evidenceStatus==='conflicting';
      return <button className="benefit-row" key={b.id} onClick={()=>onOpen(b.id)}><span className={'benefit-symbol '+(warning?'symbol-warning':'')}><Icon name={benefitIcon(b)}/></span><span className="benefit-copy"><strong>{b.title}</strong>{showCard&&<span className="benefit-card-name"><i className={'card-dot '+b.cardId}/>{cardShortNames[b.cardId]}</span>}<span className="benefit-rule">{b.summary}</span></span><span className={'benefit-cadence '+(warning?'warning-text':'')}>{warning?getEvidenceLabel(b):timingLabel(b)}</span><Icon name="chevron" size={18}/></button>;
    })}</div>}
  </section>;
}

function App(){
  const [route,setRoute]=useState(readRoute);
  const [selected,setSelected]=useState<CardId[]>(readSelection);
  const [picking,setPicking]=useState(false);
  const [catalog,setCatalog]=useState<Bundle[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [retry,setRetry]=useState(0);
  const [storageNote,setStorageNote]=useState('');
  const [asOf,setAsOf]=useState(today);
  const heading=useRef<HTMLElement>(null);
  const openedDrawer=useRef(false);

  useEffect(()=>{const update=()=>setRoute(readRoute());window.addEventListener('hashchange',update);return()=>window.removeEventListener('hashchange',update);},[]);
  useEffect(()=>{setPicking(false);heading.current?.focus({preventScroll:true});window.scrollTo(0,0);},[route.path]);
  useEffect(()=>{if(route.benefit)setPicking(false);},[route.benefit]);
  useEffect(()=>{const update=()=>setAsOf(today());window.addEventListener('focus',update);const timer=window.setInterval(update,60000);return()=>{window.removeEventListener('focus',update);window.clearInterval(timer);};},[]);
  useEffect(()=>{
    const abort=new AbortController();setLoading(true);setError('');
    void (async()=>{try {const response=await fetch('/api/catalog',{signal:abort.signal});if(!response.ok)throw Error('The benefit guide could not be loaded.');const data=CatalogSchema.parse(await response.json());if(!abort.signal.aborted)setCatalog(data);}catch(e){if(!abort.signal.aborted)setError(e instanceof Error?e.message:'The benefit guide could not be loaded.');}finally{if(!abort.signal.aborted)setLoading(false);}})();
    return()=>abort.abort();
  },[retry]);

  const guide=getGuideBenefits(catalog,asOf);
  const scoped=guide.filter(b=>selected.length===0||selected.includes(b.cardId));
  const activeCard=cardIds.find(id=>route.path===`/cards/${id}`);
  const activity=situations.find(s=>route.path===`/explore/${s.id}`);
  const isCards=route.path.startsWith('/cards');
  const isAsk=route.path==='/ask';
  const isAll=route.path==='/explore/all';
  const isHome=route.path==='/explore'||route.path==='/';
  const validRoute=isHome||isAsk||isAll||activity||route.path==='/cards'||activeCard;
  const scope=selected.length?`${selected.length} ${selected.length===1?'card':'cards'} selected`:'Browsing all 6 cards';
  const detail=guide.find(b=>b.id===route.benefit);
  function saveSelection(next:CardId[]){setSelected(next);setPicking(false);try{localStorage.setItem(selectionKey,JSON.stringify(next));setStorageNote('');}catch{setStorageNote('Your card selection will last for this visit. This browser could not save it.');}}
  function openBenefit(id:string){openedDrawer.current=true;go(`${route.path}?benefit=${encodeURIComponent(id)}`);}
  function closeBenefit(){if(openedDrawer.current){openedDrawer.current=false;history.back();}else{history.replaceState(null,'',`#${route.path}`);setRoute(readRoute());}}
  function toggleCard(id:CardId){saveSelection(selected.includes(id)?selected.filter(x=>x!==id):[...selected,id]);}

  const catalogState=loading?<div className="loading-state" role="status"><span className="loading-dot"/>Opening the benefit guide…</div>:error?<div className="error-state" role="alert"><h2>We couldn’t load the guide.</h2><p>Check that the local API is running, then try again.</p><button className="secondary" onClick={()=>setRetry(x=>x+1)}>Try again</button></div>:null;
  function scopeButton(){return <button className="scope-button" onClick={()=>setPicking(true)}><Icon name="cards" size={17}/>{scope}<Icon name="chevron" size={15}/></button>;}
  function cardGrid(ids:readonly CardId[]){return <div className="card-grid">{ids.map(id=><article className="card-guide-tile" key={id}><a className="card-guide-link" href={`#/cards/${id}`}><CardArt cardId={id}/><span className="card-guide-name">{cardShortNames[id]}</span><span className="card-guide-issuer">{cards[id]}</span><span className="card-guide-bottom">{guide.filter(b=>b.cardId===id).length} benefits in this guide <Icon name="arrow" size={18}/></span></a><button className={'card-save '+(selected.includes(id)?'is-saved':'')} aria-label={`${selected.includes(id)?'Remove':'Add'} ${cardShortNames[id]} ${selected.includes(id)?'from':'to'} my cards`} aria-pressed={selected.includes(id)} onClick={()=>toggleCard(id)}><Icon name={selected.includes(id)?'check':'plus'} size={18}/></button></article>)}</div>;}

  return <><a className="skip-link" href="#main-content" onClick={e=>{e.preventDefault();heading.current?.focus();}}>Skip to content</a><header className="app-header"><div className="header-inner"><a href="#/explore" className="brand" aria-label="PerkScout home"><BrandMark/><span>PerkScout<span className="brand-period">.</span></span></a><nav className="main-nav" aria-label="Main navigation"><a href="#/explore" aria-current={!isCards&&!isAsk?'page':undefined}>Explore</a><a href="#/cards" aria-current={isCards?'page':undefined}>{selected.length?'My cards':'Cards'}</a><a href="#/ask" aria-current={isAsk?'page':undefined}><Icon name="chat" size={17}/>Ask</a></nav><span className="guide-mode"><span/>Benefit guide</span></div></header>
    <main id="main-content" ref={heading} tabIndex={-1} className="app-main">
      {storageNote&&<p role="status" className="storage-note">{storageNote}</p>}
      {isHome&&<><section className="home-heading"><div><span className="eyebrow">A LITTLE MORE FROM YOUR EVERYDAY</span><h1>Good plans.<br/>Meet your perks<span className="blue-text">.</span></h1><p>Find what your cards can do for the things you already love.</p></div><div className="hero-compass" aria-hidden="true"><Icon name="compass" size={68}/><span>✦</span></div></section><div className="section-label"><h2>What’s on your mind?</h2>{scopeButton()}</div><div className="situation-grid">{situations.map(s=><a className="situation-tile" href={`#/explore/${s.id}`} key={s.id}><SituationArt kind={s.id as SituationId}/><span className="situation-caption"><span><strong>{s.label}</strong><small>{s.id==='travel'?'From takeoff to check-in':s.id==='food-rides'?'Out for dinner. Home with a ride.':'A little more with each purchase'}</small></span><Icon name="arrow"/></span></a>)}</div>
        <section className="make-yours"><div className="make-yours-icon"><Icon name="cards" size={27}/></div><div><h2>{selected.length?'Your cards. Your guide.':'Make it yours.'}</h2><p>{selected.length?selected.map(id=>cardShortNames[id]).join(' · '):'Choose your cards to see the benefits that fit your wallet.'}</p></div><button className="primary" onClick={()=>setPicking(true)}>{selected.length?'Edit my cards':'Choose my cards'}<Icon name="plus" size={17}/></button></section>
        <div className="explore-bottom"><a href="#/explore/all" className="inline-link">Browse every benefit <Icon name="arrow" size={17}/></a><a href="#/ask" className="inline-link muted-link"><Icon name="chat" size={17}/>Have a plan in mind? Ask PerkScout</a></div></>}
      {route.path==='/cards'&&<><div className="page-heading"><div><span className="eyebrow">YOUR BENEFITS, BY CARD</span><h1>{selected.length?'Meet your wallet.':'Find your card.'}</h1><p>One simple guide for everything each card offers.</p></div><button className="secondary" onClick={()=>setPicking(true)}><Icon name="plus" size={17}/>{selected.length?'Edit my cards':'Choose my cards'}</button></div>{catalogState||<>{cardGrid(selected.length?selected:cardIds)}{selected.length>0&&selected.length<cardIds.length&&<details className="other-cards"><summary>Explore other card guides <span>{cardIds.length-selected.length} more</span></summary>{cardGrid(cardIds.filter(id=>!selected.includes(id)))}</details>}<p className="catalog-note">{selected.length?'Your selection is saved on this browser.':'Browse freely, or use + to save a card to your wallet.'} No account connection needed.</p></>}</>}
      {activeCard&&<><a href="#/cards" className="back-link"><Icon name="arrow" size={16}/>{selected.length?'My cards':'All cards'}</a><div className="page-heading card-page-heading"><div><span className="eyebrow">CARD GUIDE</span><h1>{cardShortNames[activeCard]}</h1><p>{cards[activeCard]}</p><button className="text-button save-inline" onClick={()=>toggleCard(activeCard)}><Icon name={selected.includes(activeCard)?'check':'plus'} size={16}/>{selected.includes(activeCard)?'In my cards · remove':'Add to my cards'}</button></div><CardArt cardId={activeCard}/></div>{catalogState||<BenefitList key={activeCard} benefits={guide.filter(b=>b.cardId===activeCard)} onOpen={openBenefit} showCard={false}/>}</>}
      {(activity||isAll)&&<><a href="#/explore" className="back-link"><Icon name="arrow" size={16}/>Explore</a><div className="page-heading"><div><span className="eyebrow">{isAll?'THE WHOLE GUIDE':'PERKS FOR YOUR PLANS'}</span><h1>{activity?.label||'All benefits'}</h1><p>{activity?.description||'Explore the benefits in your guide, at your own pace.'}</p></div>{activity&&<SituationArt kind={activity.id} compact/>}</div><div className="scope-line">{scopeButton()}<span>Published benefits · personal usage unknown</span></div>{catalogState||<BenefitList key={`${route.path}:${selected.join(',')}`} benefits={activity?getSituationBenefits(scoped,activity.id):scoped} onOpen={openBenefit}/>}</>}
      {isAsk&&<Ask selected={selected} onChooseCards={()=>setPicking(true)} onOpenBenefit={openBenefit}/>}
      {!validRoute&&<div className="empty-state"><h1>Let’s get you back to the guide.</h1><a className="primary" href="#/explore">Explore benefits</a></div>}
      <footer className="app-footer"><span>Useful perks. Plans you already have.</span><details><summary>About this demo</summary><p>A curated guide for six U.S. personal cards. Coverage isn’t exhaustive. Sources and review dates are in each benefit.</p><p>Ask uses local evidence retrieval and extractive answers. No generative model, live account data, purchases, or automatic enrollment. No API key is required.</p><p>Only your card selection is saved in this browser. Don’t enter card numbers, CVVs, or credentials.</p></details></footer>
    </main>
    {picking&&!route.benefit&&<CardPicker selected={selected} onSave={saveSelection} onClose={()=>setPicking(false)}/>}
    {route.benefit&&<BenefitDrawer benefit={detail} loading={loading} error={error} onRetry={()=>setRetry(x=>x+1)} onClose={closeBenefit}/>}
  </>;
}

createRoot(document.getElementById('root')!).render(<App/>);
