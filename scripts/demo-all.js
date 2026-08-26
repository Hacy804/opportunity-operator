import { spawn } from 'node:child_process';
import { mkdir, open } from 'node:fs/promises';
import process from 'node:process';

const root = new URL('../', import.meta.url);
const work = new URL('../work/', import.meta.url);
await mkdir(work, { recursive: true });
const children = [];

async function start(name, command, args, env = {}) {
  const log = await open(new URL(`${name}.log`, work), 'w');
  const child = spawn(command, args, {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: ['ignore', log.fd, log.fd]
  });
  child.once('exit', code => { if (code && !child.killed) console.error(`${name} exited ${code}`); });
  children.push({ name, child, log });
  return child;
}

async function waitFor(url, timeoutMs = 90000) {
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    try { const response = await fetch(url); if (response.ok) return; last = `${response.status}`; }
    catch (error) { last = error.message; }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${url}: ${last}`);
}

async function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, env: process.env, stdio: 'inherit' });
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`)));
  });
}

async function stop(entry) {
  if (entry.child.exitCode === null) {
    entry.child.kill('SIGTERM');
    await Promise.race([
      new Promise(resolve => entry.child.once('exit', resolve)),
      new Promise(resolve => setTimeout(resolve, 5000))
    ]);
    if (entry.child.exitCode === null) entry.child.kill('SIGKILL');
  }
  await entry.log.close();
}

try {
  await start('mcp', process.execPath, ['src/mcp-server.js']);
  await start('model', process.execPath, ['src/mock-model-server.js']);
  await start('dashboard', process.execPath, ['src/dashboard-server.js']);
  await start('trueforge', new URL('../node_modules/.bin/trueforge', import.meta.url).pathname, ['--port', '8790'], {
    SQLITE_PATH: new URL('../work/trueforge.sqlite', import.meta.url).pathname,
    STANDALONE: 'true', HOST: '127.0.0.1'
  });
  await Promise.all([
    waitFor('http://127.0.0.1:8788/health'), waitFor('http://127.0.0.1:8789/health'),
    waitFor('http://127.0.0.1:4173/api/state'), waitFor('http://127.0.0.1:8790')
  ]);
  await run(process.execPath, ['scripts/run-demo.js', '--approve-local-mock']);

  const trueforge = children.find(entry => entry.name === 'trueforge');
  await stop(trueforge);
  children.splice(children.indexOf(trueforge), 1);
  await start('trueforge-restart', new URL('../node_modules/.bin/trueforge', import.meta.url).pathname, ['--port', '8790'], {
    SQLITE_PATH: new URL('../work/trueforge.sqlite', import.meta.url).pathname,
    STANDALONE: 'true', HOST: '127.0.0.1'
  });
  await waitFor('http://127.0.0.1:8790');
  await run(process.execPath, ['scripts/check-persistence.js']);
  console.log('End-to-end demo passed. Dashboard: http://127.0.0.1:4173 (services now shutting down).');
} finally {
  await Promise.allSettled(children.map(stop));
}
