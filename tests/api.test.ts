import {after, before, test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, readdirSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import type {Server} from 'node:http';
import type {AddressInfo} from 'node:net';
import {AnswerSchema, cardIds} from '../shared/schema.js';
import {CatalogSchema} from '../shared/catalog.js';

let server: Server;
let baseUrl: string;
let emptyDirectory: string;

before(async () => {
  emptyDirectory = mkdtempSync(join(tmpdir(), 'perkscout-api-'));
  const originalDirectory = process.cwd();
  // Import the shared app from a directory with no data/ folder.
  // A filesystem-backed index would fail here or leave an artifact behind.
  process.chdir(emptyDirectory);
  let app;
  try {
    app = (await import('../server/app.js')).default;
  } finally {
    process.chdir(originalDirectory);
  }
  server = await new Promise<Server>((resolve, reject) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
    listening.once('error', reject);
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  if (server) await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  if (emptyDirectory) rmSync(emptyDirectory, {recursive: true, force: true});
});

function ask(body: unknown) {
  return fetch(`${baseUrl}/api/ask`, {
    method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body),
  });
}

test('hosted API starts without a data directory or filesystem artifacts', () => {
  assert.deepEqual(readdirSync(emptyDirectory), []);
});

test('hosted entry preserves health and catalog API paths', async () => {
  const health = await fetch(`${baseUrl}/api/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), {ok: true, mode: 'local-extractive-demo'});

  const response = await fetch(`${baseUrl}/api/catalog`);
  assert.equal(response.status, 200);
  const catalog = CatalogSchema.parse(await response.json());
  assert.deepEqual([...new Set(catalog.map(benefit => benefit.cardId))].sort(), [...cardIds].sort());
});

test('Ask returns validated, attributed evidence without claiming remaining credit', async () => {
  const response = await ask({cards: ['venture', 'reserve'], question: 'I am planning a weekend trip. What benefits can I use?', asOf: '2026-10-15'});
  assert.equal(response.status, 200);
  const result = AnswerSchema.parse(await response.json());
  assert.equal(result.status, 'answered');
  assert(result.benefits.length > 0);
  assert(result.citations.length > 0);
  const citations = new Map(result.citations.map(citation => [citation.id, citation]));
  for (const benefit of result.benefits) {
    assert(['venture', 'reserve'].includes(benefit.cardId));
    assert.deepEqual(benefit.remainingCredit, {status: 'unknown', amount: null});
    const claims = [benefit.benefit, ...benefit.howToUse, ...benefit.enrollment, ...benefit.bookingAndPayment, ...benefit.limitsAndReset, ...benefit.exclusions];
    for (const claim of claims) for (const id of claim.citationIds) {
      const citation = citations.get(id);
      assert(citation, `Missing citation ${id}`);
      assert.equal(citation.cardId, benefit.cardId);
    }
  }
});

test('invalid card or date input receives a JSON validation error', async () => {
  for (const body of [
    {cards: ['unsupported'], question: 'Travel benefits'},
    {cards: ['venture'], question: 'Travel benefits', asOf: '2026-02-30'},
  ]) {
    const response = await ask(body);
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /Choose a card/);
  }
});

test('malformed JSON receives a safe JSON error instead of an HTML stack trace', async () => {
  const response = await fetch(`${baseUrl}/api/ask`, {
    method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{"question":',
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {error: 'The request must contain valid JSON.'});
});

test('oversized bodies preserve the API request limit', async () => {
  const response = await ask({question: 'a'.repeat(9000), cards: ['venture']});
  assert.equal(response.status, 413);
  assert.match((await response.json()).error, /too large/);
});
