import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { httpServer } from '../src/mcp-server.js';

test('MCP Streamable HTTP session initializes and lists tools', async t => {
  await new Promise((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(0, '127.0.0.1', resolve);
  });
  const address = httpServer.address();
  assert.ok(address && typeof address === 'object');
  const transport = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${address.port}/mcp`));
  const client = new Client({ name: 'opportunity-operator-test', version: '0.1.0' });
  t.after(async () => {
    await client.close();
    await new Promise(resolve => httpServer.close(resolve));
  });
  await client.connect(transport);

  const result = await client.listTools();
  const names = result.tools.map(tool => tool.name);
  assert.ok(names.includes('fetch_authorized_bounties'));
  assert.ok(names.includes('mock_irreversible_submit'));
});
