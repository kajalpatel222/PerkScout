import {test} from 'node:test';
import assert from 'node:assert/strict';
import {corpus} from '../server/corpus';
import {classifyBenefitTiming, TimingSchema, TIMING_GROUPS} from '../shared/benefit-timing';
import {planBenefit} from '../shared/benefit-plan';

const benefit = (id: string) => {
  const result = corpus.find(b => b.id === id);
  assert.ok(result, `Missing catalog benefit: ${id}`);
  return result;
};

test('travel credit is a yearly allowance while rental coverage is per qualifying rental', () => {
  assert.deepEqual(classifyBenefitTiming(benefit('vx-travel')), {
    group:'annual', label:'Across each account year',
  });
  assert.deepEqual(classifyBenefitTiming(benefit('vx-rental')), {
    group:'per_use', label:'Per qualifying rental',
  });
  assert.equal(classifyBenefitTiming(benefit('csr-travel')).group, 'annual');
  assert.equal(classifyBenefitTiming(benefit('csr-hotel')).group, 'annual');
  assert.equal(classifyBenefitTiming(benefit('vx-bonus')).label, 'After each anniversary');
});

test('enrollment is independent of a credit’s reset period and lounge visit cadence', () => {
  for (const [id, group] of [
    ['csr-lyft', 'monthly'], ['csr-peloton', 'monthly'],
    ['csr-stubhub', 'half_year'], ['vx-priority', 'per_use'],
  ]) {
    const item = benefit(id);
    assert.equal(item.tracking.activationRequired, true);
    assert.equal(classifyBenefitTiming(item).group, group);
    const withoutEnrollment = {
      ...item, tracking:{...item.tracking, activationRequired:false},
    };
    assert.deepEqual(classifyBenefitTiming(item), classifyBenefitTiming(withoutEnrollment));
  }
});

test('coverage and visit benefits describe the qualifying event rather than an annual credit', () => {
  for (const id of ['vx-trip', 'vx-delay', 'vx-luggage', 'vx-purchase', 'vx-warranty', 'vx-return', 'vx-hotel', 'vx-lifestyle', 'vx-lounge', 'vx-priority', 'csr-lounge', 'vx-butler']) {
    assert.equal(classifyBenefitTiming(benefit(id)).group, 'per_use', id);
  }
  assert.deepEqual(classifyBenefitTiming(benefit('vx-phone')), {
    group:'ongoing', label:'Protection with eligible bill payment',
  });
});

test('membership duration and activation deadlines do not become spending allowance resets', () => {
  for (const id of ['vx-hertz', 'vx-cultivist', 'csr-ihg', 'csr-apple', 'csr-dashpass']) {
    assert.equal(classifyBenefitTiming(benefit(id)).group, 'membership', id);
  }
  assert.equal(classifyBenefitTiming(benefit('csr-select-hotel')).group, 'limited_offer');
  assert.equal(classifyBenefitTiming(benefit('csr-dining')).group, 'half_year');
});

test('multi-year reimbursement cadence does not invent an eligibility date or anchor', () => {
  for (const id of ['vx-global', 'csr-global']) {
    assert.deepEqual(classifyBenefitTiming(benefit(id)), {group:'multi_year', label:'Every 4 years'});
    assert.equal(planBenefit(benefit(id), '2023-01-15', '2026-10-13').date, null);
  }
});

test('timing classification preserves source uncertainty and does not claim coverage', () => {
  const rental = benefit('vx-rental');
  const before = structuredClone(rental);
  assert.equal(rental.evidenceStatus, 'version_unverified');
  assert.equal(classifyBenefitTiming(rental).group, 'per_use');
  assert.deepEqual(rental, before);
  assert.equal(planBenefit(rental, '2023-01-15', '2026-10-13').status, 'Verify coverage');
  const conflicting = {...rental, evidenceStatus:'conflicting' as const};
  assert.equal(classifyBenefitTiming(conflicting).group, 'per_use');
  assert.equal(planBenefit(conflicting, '2023-01-15', '2026-10-13').status, 'Verify coverage');
});

test('every curated benefit maps to one unique known group and a validated label', () => {
  const groupIds = TIMING_GROUPS.map(group => group.id);
  assert.equal(new Set(groupIds).size, groupIds.length);
  assert.equal(groupIds.length, 11);
  for (const item of corpus) {
    const result = TimingSchema.parse(classifyBenefitTiming(item));
    assert.equal(groupIds.filter(id => id === result.group).length, 1, item.id);
    assert.notEqual(result.group, 'unknown', item.id);
  }
});

test('unsupported timing stays unknown and classification results cannot mutate shared overrides', () => {
  assert.deepEqual(classifyBenefitTiming({id:'future-benefit', tracking:{kind:'unverified'}}), {
    group:'unknown', label:'Timing to confirm',
  });
  assert.equal(classifyBenefitTiming({id:'toString', tracking:{kind:'unknown'}}).group, 'unknown');
  const first = classifyBenefitTiming(benefit('vx-rental'));
  first.group = 'annual';
  assert.equal(classifyBenefitTiming(benefit('vx-rental')).group, 'per_use');
});
