import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchOfficialHackathonFeed, OFFICIAL_RULES_URL } from '../src/feed.js';

test('live feed validates the official page and preserves provenance', async () => {
  const fakeFetch = async url => {
    assert.equal(url, OFFICIAL_RULES_URL);
    return new Response('The Agent Harness Hackathon — August 24–30, 2026 — TrueForge — $5,000');
  };
  const [item] = await fetchOfficialHackathonFeed(fakeFetch);
  assert.equal(item.source, 'wemakedevs-official-live');
  assert.equal(item.liveVerified, true);
  assert.equal(item.rewardUsd, 5000);
});

test('live feed fails closed when official markers disappear', async () => {
  await assert.rejects(() => fetchOfficialHackathonFeed(async () => new Response('unexpected page')), /expected event markers/);
});
