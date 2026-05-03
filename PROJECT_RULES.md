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
  - The `GEMINI_API_KEY` **must never** be exposed in Vite/browser code or `.env` files that get bundled to the client. It must only exist securely in the Cloudflare Page Function environment.
