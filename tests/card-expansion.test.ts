import {test} from 'node:test';
import assert from 'node:assert/strict';
import {corpus} from '../server/corpus';
import {cards,cardIds,RequestSchema} from '../shared/schema';
import {planBenefit} from '../shared/benefit-plan';
import {createRetriever,answer} from '../server/rag';
const item=(id:string)=>corpus.find(b=>b.id===id)!;
test('six supported cards validate and retrieve with isolated attribution',()=>{
 assert.equal(cardIds.length,6);
 const r=createRetriever();try {for(const id of cardIds){
  assert(corpus.some(b=>b.cardId===id),cards[id]);
  const a=answer(RequestSchema.parse({cards:[id],question:'Travel and rewards perks',asOf:'2026-10-13'}),r);
  assert(a.benefits.length>0,id);assert(a.benefits.every(b=>b.cardId===id));assert(a.citations.every(c=>c.cardId===id));
 }}finally{r.close();}
});
test('quarterly earning cap has quarter-end date without a fabricated cash balance',()=>{
 const p=planBenefit(item('discover-quarterly'),'2024-01-20','2026-10-13');
 assert.equal(p.date,'2026-12-31');assert.equal(p.status,'Activation required');assert(!p.dateBasis.includes('$1500'));
 assert.equal(planBenefit(item('discover-quarterly'),'2024-01-20','2027-01-01').date,'2027-03-31');
});
test('billing cycles and certificates do not infer use or availability from card opening',()=>{
 assert.equal(planBenefit(item('custom-top-category'),'2023-01-15','2026-10-13').date,null);
 const p=planBenefit(item('costco-certificate'),'2023-01-15','2026-10-13');
 assert.equal(p.date,'2026-12-31');assert(p.dateLabel.includes('If issued'));assert(p.action.includes('If issued'));
 assert.equal(planBenefit(item('bofa-museums'),'2023-01-15','2026-10-13').date,null);
});
test('all six cards can be selected together without losing a card to the result cap',()=>{
 const r=createRetriever();try{
 const a=answer(RequestSchema.parse({cards:cardIds,question:'I am planning a trip. What perks can I use?',asOf:'2026-10-13'}),r);
 assert.equal(new Set(a.benefits.map(b=>b.cardId)).size,6);
 }finally{r.close();}
});
