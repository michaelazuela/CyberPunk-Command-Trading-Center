# Review-Only Audit Prompt

Use this prompt when you want an audit before approving code changes.

```text
CONSULTATION + AUDIT ONLY. Do not write or modify code yet.

Review the current repo and read:
- AGENTS.md
- PROJECT_RULES.md
- AGENTS_AND_RULES.md
- README.md
- security_spec.md
- docs/ARCHITECTURE.md
- docs/WORKFLOWS.md
- docs/DATA_GUARDRAILS.md
- package.json
- src/App.tsx
- src/lib/gemini.ts
- src/lib/planEngine.ts
- src/lib/tradePlan.ts
- src/lib/rag.ts
- src/lib/cloudStorage.ts
- src/config/timeWindows.ts
- functions/api/gemini.js
- supabase/migrations

Return:
1. Current architecture summary
2. Current tab/workflow summary
3. Files controlling screenshot analysis
4. Files controlling app-owned trade plans
5. Files controlling Supabase persistence
6. Any drift from the project guardrails
7. Any outdated naming or legacy references
8. Security concerns
9. Database/schema concerns
10. Top five recommended fixes ranked by impact-to-effort ratio

Constraints:
- Do not modify code.
- Do not add Firebase.
- Do not change trading rules without explicit approval.
- No-trade remains valid.
```
