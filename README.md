# US Business Assistant

A small, static, three-route guide for international companies doing business in the United States.

## Run locally

1. Copy `.env.example` to `.env`.
2. Add your server-side Dify API key to `DIFY_API_KEY`.
3. Keep the model, prompt, Tavily search, and answer rules in the Dify app.
4. Run `npm run dev`.
5. Open `http://localhost:4173/`.

The custom chat calls `/api/chat`; the server proxies Dify's streaming `/chat-messages` response. No Dify API key is used in browser code.

For a static build, run `npm run build`; the generated site is written to `dist/`.
