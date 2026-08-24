import { readFile } from 'node:fs/promises';
import { TrueForge } from '@truefoundry/trueforge-sdk';
const run = JSON.parse(await readFile(new URL('../demo-artifacts/latest-run.json', import.meta.url), 'utf8'));
const client = new TrueForge({ baseUrl: process.env.TRUEFORGE_BASE_URL ?? 'http://127.0.0.1:8790' });
const { data: session } = await client.sessions.get(run.sessionId);
if (session.id !== run.sessionId) throw new Error('Session did not survive restart');
console.log(JSON.stringify({ ok: true, sessionId: session.id, survivedServerRestart: true }));
