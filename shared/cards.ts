import {z} from 'zod';
export const cardIds=['venture','reserve','bofa-travel','discover-cashback','citi-custom','citi-costco'] as const;
export const cardId=z.enum(cardIds);
export type CardId=typeof cardIds[number];
export const cards:Record<CardId,string>={venture:'Capital One Venture X',reserve:'Chase Sapphire Reserve','bofa-travel':'Bank of America Travel Rewards','discover-cashback':'Discover it® Cash Back','citi-custom':'Citi Custom Cash','citi-costco':'Costco Anywhere Visa by Citi'};
export const cardShortNames:Record<CardId,string>={venture:'Venture X',reserve:'Sapphire Reserve','bofa-travel':'BofA Travel Rewards','discover-cashback':'Discover it Cash Back','citi-custom':'Custom Cash','citi-costco':'Costco Anywhere Visa'};
export const cardIssuers:Record<CardId,string>={venture:'Capital One',reserve:'CHASE','bofa-travel':'Bank of America','discover-cashback':'Discover','citi-custom':'Citi','citi-costco':'Citi / Costco'};
