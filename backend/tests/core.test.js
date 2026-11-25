import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDeterministicLeadScore } from '../src/services/crm/leadScoringService.js';
import { chunkText, cleanText } from '../src/services/rag/ragService.js';
import { encryptSecret, decryptSecret, maskSecret, maskEmail } from '../src/utils/crypto.js';

test('Lead scoring produces deterministic hot/warm/cold categories', () => {
  const hot = calculateDeterministicLeadScore(
    {
      interest: 'high',
      budgetFit: 'suitable',
      purchaseTimeline: 'within_30_days',
      decisionAuthority: 'decision_maker',
    },
    {},
    8
  );
  assert.ok(hot.leadScore >= 80);
  assert.equal(hot.leadStatus, 'hot');
  assert.equal(hot.recommendedAction, 'schedule_demo');

  const cold = calculateDeterministicLeadScore(
    {
      interest: 'low',
      budgetFit: 'unsuitable',
      purchaseTimeline: 'later',
      decisionAuthority: 'researcher',
    },
    {},
    1
  );
  assert.ok(cold.leadScore < 50);
  assert.equal(cold.leadStatus, 'cold');
});

test('RAG text cleaning and chunking splits long documents cleanly', () => {
  const sample = 'Pricing Plan A costs $99 per month. '.repeat(60);
  const cleaned = cleanText(sample);
  assert.ok(cleaned.length > 0);
  const chunks = chunkText(cleaned, 400, 50);
  assert.ok(chunks.length > 2);
});

test('Crypto helpers encrypt, decrypt, and mask secrets accurately', () => {
  const secret = 'sk-test-1234567890abcdef';
  const encrypted = encryptSecret(secret);
  assert.notEqual(encrypted, secret);
  assert.equal(decryptSecret(encrypted), secret);
  assert.equal(maskSecret(secret), 'sk-***def');
  assert.equal(maskEmail('founder@acme.com'), 'fo***@acme.com');
});
