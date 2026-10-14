import {test} from 'node:test';
import assert from 'node:assert/strict';
import {discoverBenefits} from '../server/catalogs/discover';
import {CatalogSchema} from '../shared/catalog';

test('Discover quarterly earning cap is not modeled as an available cash credit', () => {
  const quarterly = discoverBenefits.find(b => b.id === 'discover-quarterly')!;
  assert.equal(quarterly.tracking.kind, 'quarterly');
  assert.equal(quarterly.tracking.activationRequired, true);
  assert.equal(quarterly.tracking.allowance, undefined);
  assert.match(quarterly.limit, /spending cap/);
  assert.match(quarterly.exclusions, /Categories change each quarter/);
});

test('Discover corpus preserves variant, issuer provenance and migration uncertainty', () => {
  CatalogSchema.parse(discoverBenefits);
  assert.equal(new Set(discoverBenefits.map(b => b.id)).size, discoverBenefits.length);
  for (const benefit of discoverBenefits) {
    assert.equal(benefit.cardId, 'discover-cashback');
    assert.equal(benefit.retrievedAt, '2026-10-13');
    assert.ok(['www.discover.com', 'www.capitalone.com'].includes(new URL(benefit.sourceUrl).hostname));
    assert.doesNotMatch(benefit.title, /Cashback Match|welcome|first.year/i);
  }
  const redemption = discoverBenefits.find(b => b.id === 'discover-redemption')!;
  assert.match(redemption.exclusions, /do not satisfy your minimum payment/);
  assert.match(redemption.missing.join(' '), /moved to Capital One/);
});
