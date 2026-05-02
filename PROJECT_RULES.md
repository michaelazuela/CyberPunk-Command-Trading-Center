# Project Rules

This project has been migrated from Firebase to Supabase.

Firebase is forbidden.

Do not:
- install firebase
- import firebase/*
- create or restore src/lib/firebase.ts
- use Firebase Auth
- use Firestore
- use Firebase Storage
- restore firestore.rules
- use firebase-applet-config.json
- expose GEMINI_API_KEY in Vite/browser code

Use:
- Supabase Auth
- Supabase database
- Supabase Storage
- Cloudflare Pages
- Cloudflare Pages Functions
- /api/gemini for Gemini calls

Before completing any code change, verify:
- package.json does not contain firebase
- no source file imports firebase/*
- npm run lint passes
- npm run build passes
