import { access, readFile } from 'node:fs/promises';

const required = ['README.md', 'SECURITY.md', '.env.example', 'docs/DEMO_SCRIPT.md', 'docs/SUBMISSION_DRAFT.md', 'public/index.html'];
await Promise.all(required.map(path => access(new URL(`../${path}`, import.meta.url))));
const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');
for (const phrase of ['TrueForge', 'mermaid', 'AI coding', 'human approval']) {
  if (!readme.toLowerCase().includes(phrase.toLowerCase())) throw new Error(`README missing: ${phrase}`);
}
console.log(`Static checks passed (${required.length} required files).`);
