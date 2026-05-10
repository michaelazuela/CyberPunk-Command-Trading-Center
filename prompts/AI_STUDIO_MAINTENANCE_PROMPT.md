# Google AI Studio Maintenance Prompt

Use this prompt when asking Google AI Studio to edit the project.

```text
You are maintaining my MES/MNQ trading decision-support app.

Before making changes, read:
- AGENTS.md
- PROJECT_RULES.md
- AGENTS_AND_RULES.md
- README.md
- security_spec.md
- docs/ARCHITECTURE.md
- docs/WORKFLOWS.md
- docs/DATA_GUARDRAILS.md
- src/config/timeWindows.ts
- src/lib/planEngine.ts
- src/lib/tradePlan.ts
- src/lib/rag.ts
- functions/api/gemini.js

Non-negotiables:
- Supabase and Cloudflare only.
- Firebase is forbidden.
- Gemini API calls must go through /api/gemini.
- Do not expose GEMINI_API_KEY in frontend code.
- Gemini may describe the chart, but the app owns executable trade decisions.
- Do not show Gemini as the source of the executable trade plan UI.
- T1 must be app-computed at 1.5R.
- T2 must be app-computed at 2.0R.
- No-trade is a valid outcome.
- Use src/config/timeWindows.ts for all time windows.
- Morning required screenshot range is 9:30 AM through the 10:10 AM candle.
- Lunch required screenshot range is 11:50 AM-1:00 PM ET.
- Replay sessions must use sessionType replay_morning or replay_lunch.
- Save setup/trade/RAG records to Supabase where applicable.

Task:
[DESCRIBE THE CHANGE HERE]

Verification:
Before final response, run:
- npm run guard:no-firebase
- npm run guard:architecture
- npm run guard:schema
- npm run lint
- npm run build

Final response must include:
- Files changed
- Behavior changed, if any
- Supabase migration required, if any
- Whether Firebase guard passed
- Whether architecture guard passed
- Whether schema guard passed
- Whether lint passed
- Whether build passed
```
