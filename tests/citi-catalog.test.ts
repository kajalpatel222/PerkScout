import {test} from 'node:test';
import assert from 'node:assert/strict';
import {citiBenefits} from '../server/catalogs/citi';

const benefit = (id:string) => {
  const result=citiBenefits.find(b=>b.id===id);
  assert.ok(result, id);
  return result;
};

test('Custom Cash billing-cycle reward cap is not a monthly credit allowance',()=>{
  const item=benefit('custom-top-category');
  assert.equal(item.tracking.kind,'billing_cycle');
  assert.equal(item.tracking.allowance,undefined);
  assert.match(item.summary,/\$500 each billing cycle/);
  assert.equal(item.tracking.activationRequired,false);
});

test('Costco combined annual spend cap is separate from conditional annual certificate',()=>{
  const gas=benefit('costco-gas');
  assert.equal(gas.tracking.allowance,undefined);
  assert.match(gas.summary,/5%.*4%.*share a \$7,000/);
  const certificate=benefit('costco-certificate');
  assert.equal(certificate.tracking.kind,'annual_certificate');
  assert.equal(certificate.tracking.allowance,undefined);
  assert.match(certificate.summary,/February.*December 31/);
  assert.match(certificate.use,/If issued/);
  assert.ok(certificate.missing.some(value=>value.includes('unknown')));
});

test('Citi protection summaries retain uncertainty and distinguish paid services',()=>{
  for (const id of ['costco-rental','costco-purchase']) {
    const item=benefit(id);
    assert.equal(item.evidenceStatus,'summary_only');
    assert.equal(item.timing.group,'per_use');
    assert.ok(item.missing.some(value=>value.includes('unverified')));
  }
  assert.match(benefit('costco-roadside').exclusions,/You pay/);
  assert.match(benefit('costco-travel-assistance').exclusions,/you pay/);
});

test('Citi catalog keeps card attribution and official provenance without acquisition offers',()=>{
  assert.equal(citiBenefits.length,12);
  for (const item of citiBenefits) {
    assert.equal(item.cardId,item.id.startsWith('custom-')?'citi-custom':'citi-costco');
    assert.equal(new URL(item.sourceUrl).hostname,'www.citi.com');
    assert.equal(item.retrievedAt,'2026-10-13');
    assert.ok(item.documentTitle && item.section);
    assert.doesNotMatch(item.title,/welcome|intro APR|sign.?up/i);
  }
});
