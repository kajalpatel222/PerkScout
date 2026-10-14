import {test} from 'node:test';
import assert from 'node:assert/strict';
import {corpus} from '../server/corpus';
import {nextAnniversary,planBenefit} from '../shared/benefit-plan';
const benefit=(id:string)=>corpus.find(b=>b.id===id)!;

test('card start rolls forward to the next account anniversary',()=>{
  const plan=planBenefit(benefit('vx-travel'),'2023-01-15','2026-10-13');
  assert.equal(plan.date,'2027-01-15');assert.equal(plan.dateBasis,'Estimated from card start date');
  assert(!JSON.stringify(plan).includes('Needs details'));assert(!JSON.stringify(plan).includes('remaining":300'));
});
test('anniversary boundary starts the next credit year while bonus can be due today',()=>{
  assert.equal(planBenefit(benefit('vx-travel'),'2023-01-15','2027-01-15').date,'2028-01-15');
  assert.equal(planBenefit(benefit('vx-bonus'),'2023-01-15','2027-01-15').date,'2027-01-15');
  assert.equal(nextAnniversary('2026-10-13','2026-10-13',true),'2027-10-13');
});
test('leap-day anniversary remains anchored to original card date',()=>{
  assert.equal(nextAnniversary('2024-02-29','2026-10-13'),'2027-02-28');
  assert.equal(nextAnniversary('2024-02-29','2027-03-01'),'2028-02-29');
  assert.equal(nextAnniversary('2024-02-30','2026-10-13'),null);
});
test('no benefits presented as available before card starts',()=>{
  for(const b of corpus){const plan=planBenefit(b,'2027-01-01','2026-10-13');assert.equal(plan.status,'Not started');assert.equal(plan.date,'2027-01-01');}
});
test('opening date never implies partner enrollment or reimbursement date',()=>{
  const discount=planBenefit(benefit('vx-cultivist'),'2023-01-15','2026-10-13');
  assert.equal(discount.date,null);assert.equal(discount.status,'Enrollment required');
  assert.equal(planBenefit(benefit('vx-global'),'2023-01-15','2026-10-13').date,null);
  assert.equal(planBenefit(benefit('csr-travel'),'2023-01-15','2026-10-13').date,null);
});
test('calendar periods are derived from the planning date',()=>{
  assert.equal(planBenefit(benefit('csr-lyft'),'2023-01-15','2026-10-13').date,'2026-10-31');
  assert.equal(planBenefit(benefit('csr-dining'),'2023-01-15','2027-06-30').date,'2027-06-30');
  assert.equal(planBenefit(benefit('csr-dining'),'2023-01-15','2027-07-01').date,'2027-12-31');
});
test('ended activation window does not claim an existing membership expired',()=>{
  const plan=planBenefit(benefit('csr-apple'),'2023-01-15','2027-07-01');
  assert.equal(plan.status,'Activation window ended');assert(plan.action.includes('existing memberships may continue'));
});
test('expired offers and old guides remain distinct',()=>{
  assert.equal(planBenefit(benefit('csr-lyft'),'2023-01-15','2027-10-01').status,'Offer ended');
  assert.equal(planBenefit(benefit('vx-rental'),'2023-01-15','2026-10-13').status,'Verify coverage');
});
test('historical planning dates do not reuse current policy as proof',()=>{
  assert.equal(planBenefit(benefit('vx-travel'),'2023-01-15','2025-10-13').status,'Past date');
});
