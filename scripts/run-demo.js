import { mkdir, writeFile } from 'node:fs/promises';
import { TrueForge } from '@truefoundry/trueforge-sdk';

const baseUrl = process.env.TRUEFORGE_BASE_URL ?? 'http://127.0.0.1:8790';
const mcpUrl = process.env.MCP_BASE_URL ?? 'http://127.0.0.1:8788/mcp';
const modelUrl = process.env.MODEL_BASE_URL ?? 'http://127.0.0.1:8789/v1';
const approveLocalMock = process.argv.includes('--approve-local-mock');
const skipSandbox = process.env.DEMO_SKIP_SANDBOX === '1';
const client = new TrueForge({ baseUrl, timeoutInSeconds: 600 });

const state = {
  project: 'Opportunity Operator',
  mode: 'safe local demo',
  startedAt: new Date().toISOString(),
  status: 'configuring',
  selected: { id: 'tf-ui-2026', title: 'Best UI — Agent Harness Hackathon', ev: 134.92 },
  trueforge: { version: '0.1.4', harness: true, mcp: false, sandbox: false, subagents: 0, approvalGate: false, sessionPersistence: false },
  blockers: skipSandbox ? ['TrueForge local sandbox unavailable inside the outer Codex macOS sandbox; official isolation was not bypassed.'] : [],
  timeline: [],
  events: []
};
const artifact = new URL('../demo-artifacts/latest-run.json', import.meta.url);

async function save() {
  await mkdir(new URL('../demo-artifacts/', import.meta.url), { recursive: true });
  await writeFile(artifact, `${JSON.stringify(state, null, 2)}\n`);
}
function timeline(label, detail, kind = 'action') {
  state.timeline.push({ at: new Date().toISOString(), label, detail, kind });
}

async function put(path, body) {
  const response = await fetch(`${baseUrl}${path}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`${path}: ${response.status} ${await response.text()}`);
  return response.json();
}

await put('/api/v1/settings/model-providers', {
  manifest: {
    type: 'custom', name: 'operator-local', base_url: modelUrl,
    models: [{ model_id: 'operator-demo', name: 'operator-demo', properties: { context_length: 32000, max_output_tokens: 4096 } }]
  }
});
await put('/api/v1/settings/mcp-servers', {
  manifest: { type: 'remote', name: 'opportunity-tools', url: mcpUrl, description: 'Authorized bounty feed, scoring, verification, and local mock submission.' }
});
timeline('Harness configured', 'TrueForge model adapter and MCP connector configured through the settings API.');

const { data: session } = await client.sessions.create({
  agent: {
    spec: {
      model: { name: 'operator-local/operator-demo', params: { temperature: 0 } },
      instructions: 'Operate the opportunity pipeline. Use the authorized feed only. Delegate research and independent verification to separate subagents. Execute deterministic validation in the TrueForge sandbox. Never pay, sign, log in, publish, or submit externally. The final submit tool is a local mock and must pause for approval.',
      mcpServers: [{
        name: 'opportunity-tools', enableTools: ['@all'], preload: true,
        requireApprovalForTools: ['mock_irreversible_submit']
      }],
      config: {
        sandbox: { enabled: !skipSandbox },
        dynamicSubAgents: { enabled: true },
        askUserQuestions: { enabled: true },
        contextManagement: { compaction: { enabled: true }, largeToolResponse: { enabled: true } },
        iterationLimit: 30
      }
    }
  }
});
state.sessionId = session.id;
state.status = 'running';
timeline('Session created', `Persistent TrueForge session ${session.id}.`);
await save();

const eventIndex = new Map();
const approvals = [];
async function consume(stream) {
  for await (const { data: event } of stream.withMetadata()) {
    state.events.push(event);
    if (event.id) eventIndex.set(event.id, event);
    if (event.type === 'tool.call') {
      const name = event.toolInfo?.name ?? event.name ?? 'tool';
      timeline(`Tool · ${name}`, 'Executed by the TrueForge agent loop.');
      if (['fetch_authorized_bounties', 'normalize_bounties', 'score_opportunities'].includes(name)) state.trueforge.mcp = true;
      if (name === 'exec') state.trueforge.sandbox = true;
      if (name === 'create_sub_agent') state.trueforge.subagents += 1;
    }
    if (event.type === 'tool.approval_required') {
      state.trueforge.approvalGate = true;
      approvals.push(event);
      timeline('Approval required', 'TrueForge paused before mock_irreversible_submit.', 'approval');
      state.status = 'waiting_for_approval';
    }
    if (event.type === 'turn.done' && event.state?.status === 'paused') state.status = 'waiting_for_approval';
    await save();
  }
}

await consume(await client.sessions.createTurnStream(session.id, {
  input: [{ type: 'user.message', content: 'Run the authorized opportunity pipeline end to end. Select the best positive-EV candidate, research it with a subagent, validate in the sandbox, use an independent verifier, then request approval for the local mock submission.' }]
}));

if (!approvals.length) throw new Error('Safety assertion failed: TrueForge did not pause for approval.');
if (approveLocalMock) {
  const decisions = [];
  for (const approvalEvent of approvals) {
    for (const ref of approvalEvent.toolCalls) {
      decisions.push({ type: 'user.tool_approval', threadId: approvalEvent.threadId, toolCallId: ref.id, approval: { status: 'allow' } });
    }
  }
  timeline('Human approved local mock', 'Explicit demo-only approval; no network submission exists.', 'approval');
  state.status = 'resuming';
  await consume(await client.sessions.createTurnStream(session.id, { input: decisions }));
  state.status = 'completed_safe_mock';
} else {
  timeline('Stopped safely', 'Run intentionally remains paused until a human approves the local mock.', 'approval');
}

const { data: persisted } = await client.sessions.get(session.id);
state.trueforge.sessionPersistence = persisted.id === session.id;
state.completedAt = new Date().toISOString();
await save();

const required = state.trueforge.mcp && (state.trueforge.sandbox || skipSandbox) && state.trueforge.subagents >= 2 && state.trueforge.approvalGate && state.trueforge.sessionPersistence;
if (!required) throw new Error(`Harness evidence incomplete: ${JSON.stringify(state.trueforge)}`);
console.log(JSON.stringify({ ok: true, status: state.status, sessionId: session.id, evidence: state.trueforge, artifact: 'demo-artifacts/latest-run.json' }, null, 2));
