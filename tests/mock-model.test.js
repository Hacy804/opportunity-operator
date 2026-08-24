import test from 'node:test';
import assert from 'node:assert/strict';
import { decide } from '../src/mock-model-server.js';

test('root starts through MCP feed', () => {
  assert.equal(decide({ messages: [{ role: 'user', content: 'go' }] }).name, 'fetch_authorized_bounties');
});

test('subagent performs bounded research', () => {
  const decision = decide({ messages: [
    { role: 'system', content: 'You are operating as a sub-agent' },
    { role: 'user', content: 'research candidate' }
  ] });
  assert.equal(decision.name, 'research_opportunity');
});
