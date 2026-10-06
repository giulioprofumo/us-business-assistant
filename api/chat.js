export default async function handler(request, response) {
  if (request.method !== 'POST') { response.setHeader('Allow', 'POST'); response.status(405).json({ error: 'Method not allowed' }); return; }
  if (!process.env.DIFY_API_KEY) { response.status(503).json({ error: 'Dify is not configured yet. Add DIFY_API_KEY in Vercel environment variables.' }); return; }
  const input = typeof request.body === 'string' ? JSON.parse(request.body || '{}') : (request.body || {});
  const query = typeof input.query === 'string' ? input.query.trim() : '';
  if (!query) { response.status(400).json({ error: 'Ask a question to begin.' }); return; }
  const baseUrl = (process.env.DIFY_API_BASE_URL || 'https://api.dify.ai/v1').replace(/\/$/, '');
  const upstream = await fetch(`${baseUrl}/chat-messages`, {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.DIFY_API_KEY}`, 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ inputs: {}, query, response_mode: 'streaming', conversation_id: typeof input.conversation_id === 'string' ? input.conversation_id : '', user: typeof input.user === 'string' && input.user ? input.user : 'usba-visitor' }),
  });
  response.status(upstream.status); response.setHeader('Content-Type', upstream.headers.get('content-type') || 'text/event-stream; charset=utf-8'); response.setHeader('Cache-Control', 'no-cache, no-transform'); response.setHeader('X-Accel-Buffering', 'no');
  if (!upstream.body) { response.end(); return; }
  for await (const chunk of upstream.body) response.write(chunk);
  response.end();
}
