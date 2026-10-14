import type {ReactNode} from 'react';
import {cardIssuers, type CardId} from '../shared/cards';
import './visuals.css';

export type IconName = 'compass' | 'arrow' | 'chevron' | 'close' | 'plane' | 'car' | 'coffee' | 'bag' | 'shield' | 'ticket' | 'gift' | 'hotel' | 'search' | 'check' | 'plus' | 'external' | 'chat' | 'cards' | 'clock';

const iconPaths: Record<IconName, ReactNode> = {
  compass: <><circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5L16 8Z"/></>,
  arrow: <><path d="M5 12h14m-6-6 6 6-6 6"/></>,
  chevron: <path d="m9 5 7 7-7 7"/>,
  close: <path d="m6 6 12 12M6 18 18 6"/>,
  plane: <path d="M12 2c-1 0-1.5 1-1.5 2.5V8L3 13v2l7.5-2v5L8 20v2l4-1 4 1v-2l-2.5-2v-5L21 15v-2l-7.5-5V4.5C13.5 3 13 2 12 2Z" transform="rotate(35 12 12)"/>,
  car: <><path d="m5 8 1.4-3.5A2 2 0 0 1 8.3 3h7.4a2 2 0 0 1 1.9 1.5L19 8M4 8h16l1 4v6H3v-6l1-4Z"/><path d="M5 18v3m14-3v3M7 12h1m8 0h1M3 8H1m20 0h2"/></>,
  coffee: <><path d="M4 8h13v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Zm13 1h2a3 3 0 0 1 0 6h-2M2 22h20M7 2v3m4-3v3m4-3v3"/></>,
  bag: <><path d="M5 7h14l2 14H3L5 7Z"/><path d="M8 9V6a4 4 0 0 1 8 0v3"/></>,
  shield: <><path d="m12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6l8-3Z"/><path d="m8.5 12 2.5 2.5 4.5-5"/></>,
  ticket: <><path d="M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4V5Z"/><path d="M15 5v3m0 3v2m0 3v3"/></>,
  gift: <><path d="M3 8h18v4H3V8Zm2 4v9h14v-9M12 8v13"/><path d="M12 8H8a3 3 0 1 1 3-3l1 3Zm0 0h4a3 3 0 1 0-3-3l-1 3Z"/></>,
  hotel: <><path d="M5 22V3h14v19M2 22h20M9 22v-5h6v5M9 7h1m4 0h1M9 12h1m4 0h1"/></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  plus: <path d="M12 5v14M5 12h14"/>,
  external: <><path d="M14 3h7v7m0-7L10 14"/><path d="M10 4H4v16h16v-6"/></>,
  chat: <path d="M20 11a8 8 0 0 1-8 8H7l-5 3 2-6a8 8 0 1 1 16-5Z"/>,
  cards: <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M7 7V4a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v10M3 12h18M7 16h3"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
};

export function Icon({name, size = 20, className = ''}: {name: IconName; size?: number; className?: string}) {
  return <svg className={`ps-visual-icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{iconPaths[name]}</svg>;
}

export function BrandMark() {
  return <span className="ps-visual-brand" aria-hidden="true"><Icon name="compass" size={24}/></span>;
}

export type SituationKind = 'travel' | 'food-rides' | 'shopping';

export function SituationArt({kind, compact = false}: {kind: SituationKind; compact?: boolean}) {
  return <span className={`ps-visual-scene ps-visual-scene--${kind}${compact ? ' ps-visual-scene--compact' : ''}`} aria-hidden="true">
    <span className="ps-visual-ground"/>
    {kind === 'travel' && <>
      <span className="ps-visual-sun"/>
      <span className="ps-visual-cloud"/>
      <span className="ps-visual-mountain"/>
      <span className="ps-visual-mountain ps-visual-mountain--back"/>
      <span className="ps-visual-plane"><Icon name="plane"/></span>
    </>}
    {kind === 'food-rides' && <>
      <span className="ps-visual-sun"/>
      <span className="ps-visual-leaf"/>
      <span className="ps-visual-leaf ps-visual-leaf--second"/>
      <span className="ps-visual-coffee"><Icon name="coffee"/></span>
      <span className="ps-visual-car"><Icon name="car"/></span>
    </>}
    {kind === 'shopping' && <>
      <span className="ps-visual-cloud"/>
      <span className="ps-visual-bag"><Icon name="bag"/></span>
      <span className="ps-visual-bag ps-visual-bag--second"><Icon name="bag"/></span>
      <span className="ps-visual-spark">✦</span>
    </>}
  </span>;
}

const artNames: Record<CardId, string> = {
  venture: 'Venture X', reserve: 'Sapphire Reserve', 'bofa-travel': 'Travel Rewards',
  'discover-cashback': 'it® Cash Back', 'citi-custom': 'Custom Cash', 'citi-costco': 'Costco Anywhere',
};

export function CardArt({cardId, small = false}: {cardId: CardId; small?: boolean}) {
  return <span className={`ps-visual-card ps-visual-card--${cardId}${small ? ' ps-visual-card--small' : ''}`} aria-hidden="true">
    <span className="ps-visual-card-issuer">{cardIssuers[cardId]}</span>
    <span className="ps-visual-chip"/>
    <span className="ps-visual-card-name">{artNames[cardId]}</span>
  </span>;
}
