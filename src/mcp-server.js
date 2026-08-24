import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { normalizeBounty, scoreBounty, verifyCandidate } from './domain.js';

const port = Number(process.env.MCP_PORT ?? 8788);
const fixtureUrl = new URL('../data/bounties.json', import.meta.url);
const transports = new Map();

function content(value) {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }], structuredContent: value };
}

function createMcpServer() {
  const server = new McpServer({ name: 'opportunity-tools', version: '0.1.0' });

  server.registerTool('fetch_authorized_bounties', {
    description: 'Read the public/authorized demo bounty feed. No login or private data.',
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: false }
  }, async () => content(JSON.parse(await readFile(fixtureUrl, 'utf8'))));

  server.registerTool('normalize_bounties', {
    description: 'Normalize raw bounty records into the project schema.',
    inputSchema: { bounties: z.array(z.record(z.string(), z.unknown())) },
    annotations: { readOnlyHint: true, openWorldHint: false }
  }, async ({ bounties }) => content(bounties.map(normalizeBounty)));

  server.registerTool('score_opportunities', {
    description: 'Calculate transparent expected value and rank opportunities.',
    inputSchema: {
      bounties: z.array(z.record(z.string(), z.unknown())),
      hourlyCost: z.number().positive().default(35)
    },
    annotations: { readOnlyHint: true, openWorldHint: false }
  }, async ({ bounties, hourlyCost }) => {
    const ranked = bounties.map(normalizeBounty).map(item => scoreBounty(item, hourlyCost));
    ranked.sort((a, b) => b.expectedValueUsd - a.expectedValueUsd);
    return content(ranked);
  });

  server.registerTool('research_opportunity', {
    description: 'Perform bounded local research on one authorized feed item.',
    inputSchema: { opportunityId: z.string(), focus: z.string().optional() },
    annotations: { readOnlyHint: true, openWorldHint: false }
  }, async ({ opportunityId, focus }) => content({
    opportunityId,
    focus: focus ?? 'fit, evidence, and constraints',
    evidence: [
      'Source is explicitly authorized for this reproducible demo.',
      'The candidate reuses the safety and verifier architecture.',
      'No external account action is required during agent execution.'
    ],
    confidence: 0.88
  }));

  server.registerTool('independent_verify', {
    description: 'Independently verify the selected candidate against policy and EV checks.',
    inputSchema: { candidate: z.record(z.string(), z.unknown()) },
    annotations: { readOnlyHint: true, openWorldHint: false }
  }, async ({ candidate }) => content(verifyCandidate(candidate)));

  server.registerTool('mock_irreversible_submit', {
    description: 'LOCAL MOCK ONLY. Produce a non-network submission receipt after explicit human approval.',
    inputSchema: { opportunityId: z.string(), summary: z.string() },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false }
  }, async ({ opportunityId, summary }) => content({
    status: 'mocked-not-sent',
    opportunityId,
    summary,
    receipt: `local-mock-${randomUUID()}`,
    externalSideEffects: false
  }));
  return server;
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : undefined;
}

const httpServer = http.createServer(async (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, service: 'opportunity-tools' }));
    return;
  }
  if (req.url !== '/mcp') { res.writeHead(404).end(); return; }
  try {
    const sessionId = req.headers['mcp-session-id'];
    let transport = sessionId ? transports.get(sessionId) : undefined;
    if (!transport && req.method === 'POST') {
      const server = createMcpServer();
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onSessionInitialized: id => transports.set(id, transport)
      });
      transport.onclose = () => {
        if (transport.sessionId) transports.delete(transport.sessionId);
      };
      await server.connect(transport);
    }
    if (!transport) { res.writeHead(400).end('Missing or invalid MCP session'); return; }
    await transport.handleRequest(req, res, req.method === 'POST' ? await readJson(req) : undefined);
  } catch (error) {
    if (!res.headersSent) res.writeHead(500, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  httpServer.listen(port, '127.0.0.1', () => console.log(`MCP http://127.0.0.1:${port}/mcp`));
}

export { createMcpServer, httpServer };
