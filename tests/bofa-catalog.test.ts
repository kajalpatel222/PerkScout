import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bofaBenefits} from '../server/catalogs/bofa-travel.js';
import {planBenefit} from '../shared/benefit-plan.js';

test('BofA redemption is earned-point redemption, without an invented annual allowance or expiry',()=>{
  const redemption=bofaBenefits.find(b=>b.id==='bofa-redemption')!;
  assert.equal(redemption.cardId,'bofa-travel');
  assert.equal(redemption.category,'Rewards');
  assert.equal(redemption.tracking.allowance,undefined);
  assert.equal(planBenefit(redemption,'2023-01-15','2026-10-13').date,null);
  assert.match(redemption.limit,/12 months/);
  assert.match(redemption.exclusions,/not a free annual travel allowance/);
});

test('BofA museum access retains its eligible weekend and individual admission limits',()=>{
  const museum=bofaBenefits.find(b=>b.id==='bofa-museums')!;
  assert.match(museum.summary,/first full weekend/);
  assert.match(museum.payment,/photo ID/);
  assert.match(museum.exclusions,/Cardholder only/);
  assert.equal(museum.tracking.allowance,undefined);
});

test('BofA banking-tier bonus remains conditional and no generic Visa protections are asserted',()=>{
  const loyalty=bofaBenefits.find(b=>b.id==='bofa-loyalty')!;
  assert.equal(loyalty.tracking.activationRequired,true);
  assert.match(loyalty.enrollment,/checking account/);
  assert.ok(loyalty.missing.length);
  assert.equal(bofaBenefits.some(b=>b.category==='Protections'),false);
  for(const benefit of bofaBenefits){
    assert.equal(benefit.cardId,'bofa-travel');
    assert.equal(benefit.retrievedAt,'2026-10-13');
    assert.match(new URL(benefit.sourceUrl).hostname,/(^|\.)bankofamerica\.com$/);
  }
});
