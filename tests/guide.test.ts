import {test} from 'node:test';
import assert from 'node:assert/strict';
import {corpus} from '../server/corpus';
import {cardIds} from '../shared/cards';
import type {Bundle} from '../shared/catalog';
import {getEvidenceLabel, getGuideBenefits, getSituationBenefits, situations, timingLabel} from '../shared/guide';

function item(id: string): Bundle {
  const benefit = corpus.find(benefit => benefit.id === id);
  assert.ok(benefit, `Missing catalog benefit: ${id}`);
  return benefit;
}

test('the anonymous guide preserves the complete current corpus and all six cards', () => {
  const guide = getGuideBenefits(corpus, '2026-10-14');
  assert.equal(guide.length, corpus.length);
  assert.deepEqual(new Set(guide.map(benefit => benefit.cardId)), new Set(cardIds));
  assert.equal(situations.length, 3);
  for (const benefit of guide) assert.equal(benefit, item(benefit.id));
});

test('travel includes rental and rideshare, with rides also discoverable under food & rides', () => {
  const travel = new Set(getSituationBenefits(corpus, 'travel').map(benefit => benefit.id));
  for (const id of ['vx-rental', 'vx-hertz', 'costco-rental', 'csr-lyft', 'vx-trip', 'vx-delay', 'vx-luggage']) {
    assert.ok(travel.has(id), id);
  }
  const local = getSituationBenefits(corpus, 'food-rides').map(benefit => benefit.id);
  for (const id of ['csr-lyft', 'csr-dining', 'csr-dashpass', 'costco-dining-travel', 'bofa-redemption']) {
    assert.ok(local.includes(id), id);
  }
});

test('purchase protections do not become travel insurance and discovery preserves card filtering', () => {
  const shopping = new Set(getSituationBenefits(corpus, 'shopping').map(benefit => benefit.id));
  for (const id of ['vx-purchase', 'vx-warranty', 'vx-return', 'costco-purchase', 'discover-quarterly']) {
    assert.ok(shopping.has(id), id);
  }
  for (const id of ['vx-trip', 'vx-delay', 'vx-luggage', 'vx-rental']) assert.ok(!shopping.has(id), id);
  const travel = getSituationBenefits(corpus, 'travel');
  assert.ok(!travel.some(benefit => benefit.id === 'vx-purchase'));
  const onlyVenture = corpus.filter(benefit => benefit.cardId === 'venture');
  assert.ok(getSituationBenefits(onlyVenture, 'travel').every(benefit => benefit.cardId === 'venture'));
});

test('policy date boundaries are inclusive and do not mix expired and future versions', () => {
  const base = item('vx-travel');
  const versions: Bundle[] = [
    {...base, id:'old', effectiveFrom:null, effectiveTo:'2026-10-13'},
    {...base, id:'current', effectiveFrom:'2026-10-14', effectiveTo:'2026-10-31'},
    {...base, id:'next', effectiveFrom:'2026-11-01', effectiveTo:null},
  ];
  const ids = (date: string) => getGuideBenefits(versions, date).map(benefit => benefit.id);
  assert.deepEqual(ids('2026-10-13'), ['old']);
  assert.deepEqual(ids('2026-10-14'), ['current']);
  assert.deepEqual(ids('2026-10-31'), ['current']);
  assert.deepEqual(ids('2026-11-01'), ['next']);
  assert.throws(() => getGuideBenefits(versions, '2026-02-30'), RangeError);
  assert.throws(() => getGuideBenefits(versions, '2026-10-14T00:00:00Z'), RangeError);
});

test('unknown applicability and conflicting sources stay visible with explicit evidence labels', () => {
  const unverified = item('vx-rental');
  const conflicting: Bundle = {...unverified, id:'conflicting', evidenceStatus:'conflicting'};
  const guide = getGuideBenefits([unverified, conflicting], '2026-10-14');
  assert.equal(guide.length, 2);
  assert.equal(getEvidenceLabel(unverified), 'Current terms to verify');
  assert.equal(getEvidenceLabel(conflicting), 'Conflicting terms');
  assert.equal(getEvidenceLabel(item('vx-hotel')), 'Issuer summary');
  assert.equal(getEvidenceLabel(item('vx-travel')), 'Issuer summary');
  assert.equal(getEvidenceLabel(item('vx-priority')), null);
});

test('enrollment cutoff is not used as the end of an existing membership', () => {
  const apple = item('csr-apple');
  assert.equal(apple.tracking.activationBy, '2027-06-22');
  assert.equal(getGuideBenefits([apple], '2027-06-23').length, 1);
  assert.equal(timingLabel(apple), 'At least 12 months from activation');
});

test('timing keeps annual allowances, reward caps, per-use coverage and enrollment distinct', () => {
  assert.equal(timingLabel(item('vx-travel')), 'Across each account year');
  assert.equal(timingLabel(item('csr-travel')), 'Across each statement-based year');
  assert.equal(timingLabel(item('vx-rental')), 'Per qualifying rental');
  assert.equal(timingLabel(item('costco-gas')), 'Annual combined spending cap');
  assert.equal(timingLabel(item('bofa-museums')), 'First full weekend each month');
  assert.equal(timingLabel(item('vx-global')), 'Every 4 years');
  assert.equal(getEvidenceLabel(item('vx-rental')), 'Current terms to verify');
});
