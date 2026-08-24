import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const port = Number(process.env.DASHBOARD_PORT ?? 4173);
const publicRoot = new URL('../public/', import.meta.url);
const stateFile = new URL('../demo-artifacts/latest-run.json', import.meta.url);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };

const server = http.createServer(async (req, res) => {
  try {
    if (req.url === '/api/state') {
      const data = await readFile(stateFile).catch(() => Buffer.from(JSON.stringify({ status: 'not_started', timeline: [], trueforge: {} })));
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(data); return;
    }
    const name = req.url === '/' ? 'index.html' : req.url.slice(1).replace(/\.\./g, '');
    const data = await readFile(new URL(name, publicRoot));
    res.writeHead(200, { 'content-type': types[extname(name)] ?? 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404).end('Not found'); }
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(port, '127.0.0.1', () => console.log(`Dashboard http://127.0.0.1:${port}`));
}
export { server };
