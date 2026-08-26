import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const port = Number(process.env.MODEL_PORT ?? 8789);

function allText(messages) {
  return messages.map(message => typeof message.content === 'string' ? message.content : JSON.stringify(message.content ?? '')).join('\n');
}

function toolNames(messages) {
  return messages.flatMap(message => message.tool_calls ?? []).map(call => call.function?.name).filter(Boolean);
}

function availableTool(body, wanted) {
  const tools = body.tools ?? [];
  return tools.find(tool => tool.function?.name === wanted)?.function;
}

function lastToolResult(messages) {
  const tool = [...messages].reverse().find(message => message.role === 'tool');
  if (!tool) return undefined;
  try { return JSON.parse(tool.content); } catch { return tool.content; }
}

function candidate() {
  return {
    id: 'tf-ui-2026', title: 'Best UI — Agent Harness Hackathon', source: 'authorized-demo-feed',
    rewardUsd: 1200, deadline: '2026-08-30T19:00:00.000Z', effortHours: 14,
    winProbability: 0.34, strategicReuse: 0.92, risk: 0.08,
    expectedValueUsd: 134.92, recommendation: 'pursue'
  };
}

function decide(body) {
  const messages = body.messages ?? [];
  const text = allText(messages);
  const calls = toolNames(messages);
  const isSubagent = text.includes('operating as a sub-agent');

  if (isSubagent) {
    if (text.includes('INDEPENDENT VERIFIER')) {
      if (!calls.includes('independent_verify')) {
        return call('independent_verify', { candidate: candidate() });
      }
      return say('Independent verifier PASS: positive EV, authorized source, deadline present, no payment/signing, and submission is local mock only.');
    }
    if (!calls.includes('research_opportunity')) {
      return call('research_opportunity', { opportunityId: 'tf-ui-2026', focus: 'eligibility, evidence, constraints, and strategic fit' });
    }
    return say('Research complete: the selected opportunity is authorized, strategically reusable, and requires no external side effect during this run. Confidence 0.88.');
  }

  if (!calls.includes('fetch_authorized_bounties')) return call('fetch_authorized_bounties', {});
  if (!calls.includes('normalize_bounties')) return call('normalize_bounties', { bounties: unwrap(lastToolResult(messages)) });
  if (!calls.includes('score_opportunities')) return call('score_opportunities', { bounties: unwrap(lastToolResult(messages)), hourlyCost: 35 });
  const subagentCount = calls.filter(name => name === 'create_sub_agent').length;
  if (subagentCount === 0) {
    return call('create_sub_agent', {
      name: 'candidate-researcher',
      input: 'Research opportunity tf-ui-2026 from the authorized demo feed. Check evidence, eligibility constraints, and strategic fit. Do not perform any write, payment, login, signing, or submission. Return a concise evidence summary.'
    });
  }
  if (availableTool(body, 'exec') && !calls.includes('exec')) {
    return call('exec', {
      intent: 'Run a deterministic candidate validation inside the isolated TrueForge sandbox.',
      command: "python - <<'PY'\nimport json\ncandidate={'id':'tf-ui-2026','expectedValueUsd':134.92,'authorized':True}\nassert candidate['expectedValueUsd'] > 0\nassert candidate['authorized'] is True\nopen('candidate-check.json','w').write(json.dumps(candidate))\nprint('SANDBOX_TEST_PASS', json.dumps(candidate))\nPY"
    });
  }
  if (subagentCount === 1) {
    return call('create_sub_agent', {
      name: 'independent-verifier',
      input: `INDEPENDENT VERIFIER: independently check this selected candidate and fail closed on any policy or evidence issue. Do not trust the researcher conclusion. Candidate: ${JSON.stringify(candidate())}`
    });
  }
  if (!calls.includes('mock_irreversible_submit')) {
    return call('mock_irreversible_submit', {
      opportunityId: 'tf-ui-2026',
      summary: 'Verified candidate package. LOCAL MOCK ONLY; do not transmit externally.'
    });
  }
  return say('The locally mocked submission completed after approval. No external side effect occurred.');
}

function unwrap(value) {
  if (value?.structuredContent) return value.structuredContent;
  if (Array.isArray(value)) {
    if (value.length === 1 && value[0]?.type === 'text') return unwrap(value[0].text);
    return value;
  }
  if (typeof value === 'string') {
    try { return unwrap(JSON.parse(value)); } catch { return []; }
  }
  if (value?.content) return unwrap(value.content);
  return value ?? [];
}

function call(name, args) { return { type: 'tool', name, args }; }
function say(content) { return { type: 'text', content }; }

function completion(body) {
  const decision = decide(body);
  const id = `chatcmpl-${randomUUID()}`;
  const created = Math.floor(Date.now() / 1000);
  const message = decision.type === 'tool'
    ? { role: 'assistant', content: null, tool_calls: [{ id: `call-${randomUUID()}`, type: 'function', function: { name: decision.name, arguments: JSON.stringify(decision.args) } }] }
    : { role: 'assistant', content: decision.content };
  return { id, object: 'chat.completion', created, model: body.model, choices: [{ index: 0, message, finish_reason: decision.type === 'tool' ? 'tool_calls' : 'stop' }], usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 } };
}

function streamCompletion(res, body) {
  const full = completion(body);
  const choice = full.choices[0];
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
  const send = payload => res.write(`data: ${JSON.stringify(payload)}\n\n`);
  send({ id: full.id, object: 'chat.completion.chunk', created: full.created, model: full.model, choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }] });
  if (choice.message.tool_calls) {
    const tc = choice.message.tool_calls[0];
    send({ id: full.id, object: 'chat.completion.chunk', created: full.created, model: full.model, choices: [{ index: 0, delta: { tool_calls: [{ index: 0, id: tc.id, type: 'function', function: tc.function }] }, finish_reason: null }] });
  } else {
    send({ id: full.id, object: 'chat.completion.chunk', created: full.created, model: full.model, choices: [{ index: 0, delta: { content: choice.message.content }, finish_reason: null }] });
  }
  send({ id: full.id, object: 'chat.completion.chunk', created: full.created, model: full.model, choices: [{ index: 0, delta: {}, finish_reason: choice.finish_reason }], usage: full.usage });
  res.write('data: [DONE]\n\n');
  res.end();
}

async function bodyJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

const server = http.createServer(async (req, res) => {
  if (req.url === '/health' || req.url === '/v1/models') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(req.url === '/health' ? { ok: true } : { object: 'list', data: [{ id: 'operator-demo', object: 'model' }] }));
    return;
  }
  if (req.url !== '/v1/chat/completions' || req.method !== 'POST') { res.writeHead(404).end(); return; }
  try {
    const body = await bodyJson(req);
    if (body.stream) streamCompletion(res, body);
    else { res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(completion(body))); }
  } catch (error) {
    res.writeHead(500, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: { message: error.message } }));
  }
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(port, '127.0.0.1', () => console.log(`Model http://127.0.0.1:${port}/v1`));
}

export { decide, server };
