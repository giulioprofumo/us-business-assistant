import { createServer } from 'node:http';
import { readFile, access } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 4173);

async function loadEnv() {
  try {
    const raw = await readFile(join(root, '.env'), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  } catch {}
}

const contentTypes = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' };
const routes = { '/': 'index.html', '/how-it-works': 'how-it-works.html', '/chat': 'chat.html' };

await loadEnv();

async function readJsonBody(request) {
  let body = '';
  for await (const chunk of request) body += chunk;
  return JSON.parse(body || '{}');
}

async function proxyDifyChat(request, response) {
  if (request.method !== 'POST') {
    response.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8', Allow: 'POST' });
    response.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }
  const apiKey = process.env.DIFY_API_KEY;
  if (!apiKey) {
    response.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ error: 'Dify is not configured yet. Add DIFY_API_KEY to the server environment.' }));
    return;
  }
  let input;
  try { input = await readJsonBody(request); } catch {
    response.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ error: 'Invalid request body.' }));
    return;
  }
  const query = typeof input.query === 'string' ? input.query.trim() : '';
  if (!query) {
    response.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ error: 'Ask a question to begin.' }));
    return;
  }
  const baseUrl = (process.env.DIFY_API_BASE_URL || 'https://api.dify.ai/v1').replace(/\/$/, '');
  const upstream = await fetch(`${baseUrl}/chat-messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ inputs: {}, query, response_mode: 'streaming', conversation_id: typeof input.conversation_id === 'string' ? input.conversation_id : '', user: typeof input.user === 'string' && input.user ? input.user : 'usba-visitor' }),
  });
  response.writeHead(upstream.status, { 'Content-Type': upstream.headers.get('content-type') || 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  if (!upstream.body) { response.end(); return; }
  for await (const chunk of upstream.body) response.write(chunk);
  response.end();
}

createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (url.pathname === '/api/chat') {
    try { await proxyDifyChat(request, response); } catch {
      if (!response.headersSent) response.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ error: 'The Dify service could not be reached.' }));
    }
    return;
  }
  const relative = routes[url.pathname] || url.pathname.replace(/^\//, '');
  const safePath = normalize(relative).replace(/^\.\.(?:[\\/]|$)/, '');
  const filePath = join(root, safePath);
  try {
    await access(filePath);
    const body = await readFile(filePath);
    response.writeHead(200, { 'Content-Type': contentTypes[extname(filePath)] || 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
}).listen(port, () => console.log(`US Business Assistant running at http://localhost:${port}`));
