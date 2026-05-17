# Project Rules: Supabase & Cloudflare ONLY (Firebase Forbidden)

This project has been explicitly migrated from Firebase to **Supabase** and **Cloudflare**.

## FIRESTORE / FIREBASE IS FORBIDDEN

To prevent accidental rollbacks or re-introductions:
- **Firebase is strictly forbidden.**
- **Do not** install `firebase`, `firebase-admin`, or related packages.
- **Do not** import `firebase/*`.
- **Do not** create or restore `src/lib/firebase.ts`.
- **Do not** use Firebase Auth, Firestore, Firebase Storage, `firestore.rules`, or Firebase config JSON files (`firebase-applet-config.json`, `firebase-blueprint.json`).

## APPROVED ARCHITECTURE

- **Database/Auth/Storage**: Use **Supabase**.
  - Supabase client is initialized in `src/lib/supabase.ts`.
- **Hosting/Functions**: Use **Cloudflare Pages**.
  - Cloudflare Pages Functions are in the `functions/` directory.
- **AI / LLM Integration**:
  - Gemini API calls **must** go through the proxy at `/api/gemini` (`functions/api/gemini.js`).
  - Optional OpenAI validation, if enabled, must also go through a Cloudflare Function boundary. OpenAI may validate chart facts, but it must not approve trades or expose `OPENAI_API_KEY` to browser code.
  - The `GEMINI_API_KEY` **must never** be exposed in Vite/browser code or `.env` files that get bundled to the client. It must only exist securely in the Cloudflare Page Function environment.

## TRADE DECISION AUTHORITY

AI/OHLC extraction may describe what is visible on the chart. The app-owned setup scanner, candidate scoring layer, plan engine, and trade decision pipeline decide whether a trade is executable, conditional, wait, no-trade, outside-rules, or invalid screenshot.

User-facing notes must be plain trading instructions. Do not present raw model confidence, internal score labels, or advisory AI fields as executable instructions.
