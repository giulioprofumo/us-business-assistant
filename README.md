# Askfirst.us

Askfirst.us is an independent guide for international companies doing business in the United States. It combines a small editorial website with a server-side Dify chat proxy.

It is not a U.S. government service, law firm, accounting firm, or substitute for professional advice.

## What is included

- `/` — landing page and question starter
- `/how-it-works` — trust, capabilities, answer-quality guidance, and coming-soon features
- `/chat` — streaming chat UI connected to Dify through `/api/chat`
- `/api/chat` — server-side proxy that keeps `DIFY_API_KEY` out of browser code

The front end is plain HTML, CSS, and JavaScript. There are no framework or runtime dependencies to install.

## Run locally

Requirements: Node.js 18.18 or newer.

```bash
cp .env.example .env
# Edit .env and add your Dify credentials.
npm run dev
```

Open [http://localhost:4173](http://localhost:4173).

On Windows PowerShell, the copy step is:

```powershell
Copy-Item .env.example .env
```

## Environment variables

| Variable | Required for chat | Description |
| --- | --- | --- |
| `DIFY_API_KEY` | Yes | Server-side Dify application key. Never commit it or put it in browser code. |
| `DIFY_API_BASE_URL` | No | Dify API base URL. Defaults to `https://api.dify.ai/v1`. |
| `PORT` | No | Local server port. Defaults to `4173`. |

The local server reads `.env` automatically. In Vercel, add the same variables under Project Settings → Environment Variables. The chat page will show an error message rather than exposing a key when Dify is not configured.

## Build

```bash
npm run build
```

This copies the static site into `dist/`. The build is useful for checking the site and for Vercel, which is configured through `vercel.json`.

## Deploy with Vercel

1. Push this repository to GitHub.
2. Import the repository into Vercel.
3. Keep the build command as `npm run build` and the output directory as `dist`.
4. Add `DIFY_API_KEY` in Vercel Environment Variables. Add `DIFY_API_BASE_URL` only if you use a non-default Dify endpoint.
5. Redeploy after changing environment variables.

Do not put the Dify key in `.env.example`, HTML, CSS, or `app.js`. `.env` is ignored by Git.

## GitHub collaboration checklist

Before sharing:

1. Confirm that `.env` is not listed by `git status`.
2. Review the diff for API keys, tokens, private URLs, and personal data.
3. Commit the project and push it to a private repository first.
4. Add the collaborator in GitHub under **Settings → Collaborators** with the least access they need.
5. Share the repository URL and this README, then agree on a branch naming convention such as `feature/...` and `fix/...`.

Useful checks:

```bash
git status
git diff --check
git diff -- .
```

The local Sites metadata under `.openai/` is ignored so it does not get mixed into the GitHub project. Keep it local unless you intentionally want to share deployment metadata.

## Project structure

```text
index.html          Landing page
how-it-works.html   Guide and trust page
chat.html           Chat interface
styles.css          Shared design system and responsive layout
app.js              Menu, accordion, search, and streaming chat behavior
server.mjs          Local static server and Dify proxy
api/chat.js         Vercel serverless version of the Dify proxy
build.mjs           Copies site files into dist/
vercel.json         Vercel build and function settings
.env.example        Safe configuration template
```

## Notes for future edits

- Keep claims about sources, privacy, pricing, and verification aligned with what the implementation actually does.
- Keep service-provider connections and guided workflows labeled **Coming soon** until they are implemented.
- For chat changes, test both the configured-Dify state and the missing-configuration/error state.
