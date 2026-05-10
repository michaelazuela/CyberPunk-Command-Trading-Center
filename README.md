# MES/MNQ Trading Decision-Support App

This project is a MES/MNQ futures trading decision-support system built with React, Supabase, Cloudflare Pages, and Gemini.

## Core Architecture

- Frontend: Vite + React
- Hosting: Cloudflare Pages
- Server function: Cloudflare Pages Function at `/api/gemini`
- Database/Auth/Storage/RAG: Supabase
- AI provider: Gemini, accessed only through the Cloudflare function

## Important Rules

- Firebase is forbidden.
- Do not install or import `firebase`.
- Do not expose `GEMINI_API_KEY` in browser code or Vite environment variables.
- Gemini API calls must go through `/api/gemini`.
- The app is a decision-support tool, not a prediction tool.
- Gemini interprets screenshots; the app-owned plan engine validates trades and computes executable Entry, Stop, T1, and T2.
- No-trade is a valid outcome.

## Local Development

Prerequisites:

- Node.js
- Supabase project with URL and publishable/anon key

Install and run:

```bash
npm install
npm run dev
```

Required frontend environment variables:

```bash
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-supabase-anon-or-publishable-key"
VITE_AUTH_REDIRECT_URL="http://localhost:3000"
```

Cloudflare-only secret:

```bash
GEMINI_API_KEY="your-gemini-api-key"
```

Set `GEMINI_API_KEY` in Cloudflare Pages environment variables, not in frontend code.

## Verification

Before deploying:

```bash
npm run guard:no-firebase
npm run guard:architecture
npm run guard:schema
npm run lint
npm run build
```

## Project Guidance

- [Agent operating guide](./AGENTS.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Workflows](./docs/WORKFLOWS.md)
- [Data guardrails](./docs/DATA_GUARDRAILS.md)
- [AI Studio maintenance prompt](./prompts/AI_STUDIO_MAINTENANCE_PROMPT.md)
- [Review-only audit prompt](./prompts/REVIEW_ONLY_AUDIT_PROMPT.md)
