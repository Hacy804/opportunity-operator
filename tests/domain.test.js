import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBounty, scoreBounty, verifyCandidate } from '../src/domain.js';

const raw = {
  id: 'x', title: ' Bounty ', source: 'authorized-demo-feed', rewardUsd: 1000,
  deadline: '2026-08-30T00:00:00Z', effortHours: 10, winProbability: 0.5,
  strategicReuse: 0.8, risk: 0.1
};

test('normalizes and clamps input', () => {
  const result = normalizeBounty({ ...raw, winProbability: 4 });
  assert.equal(result.title, 'Bounty');
  assert.equal(result.winProbability, 1);
});

test('scores EV with a transparent formula', () => {
  const scored = scoreBounty(normalizeBounty(raw), 35);
  assert.equal(scored.expectedValueUsd, 284);
  assert.equal(scored.recommendation, 'pursue');
});

test('verifier rejects unauthorized sources', () => {
  const result = verifyCandidate({ ...scoreBounty(normalizeBounty(raw)), source: 'private-scrape' });
  assert.equal(result.pass, false);
  assert.equal(result.checks.find(check => check.name === 'authorized source').pass, false);
});

test('missing required fields fail closed', () => {
  assert.throws(() => normalizeBounty({ title: 'incomplete' }), /Missing required/);
});
