# OpenAI Desk-Agent Bookmarks

## Purpose

This note records which OpenAI platform capabilities Futures Crusher should use now versus hold for the future custom desk-agent orchestration layer.

The project remains a MES/MNQ decision-support trading desk. These bookmarks do not change scanner eligibility, `canExecute`, Discord posting, Supabase writes, NinjaTrader bridge behavior, entry, stop, target, risk, or automated execution.

## Use Now

### Codex Goals

Source: https://developers.openai.com/cookbook/examples/codex/using_goals_in_codex

Use Goals now for multi-step Futures Crusher phases where the instruction is effectively "keep going until this is actually done."

Best fits:

- replay research with evidence artifacts
- guarded phase installs
- bug hunts with reproduce/fix/retest loops
- verification, commit, push, and handoff work

Installed boundary:

- `docs/CODEX_GOALS_AND_REPAIR_LOOPS.md` defines default Futures Crusher Goal templates and stopping conditions.
- Goals do not override safety gates. They make persistence explicit while preserving approvals for live side effects.

### Iterative Repair Loops

Source: https://developers.openai.com/cookbook/examples/codex/build_iterative_repair_loops_with_codex

Use iterative repair loops now for local/debug/research work:

- run the focused proof
- patch the smallest failing boundary
- rerun focused proof
- repeat until the evidence passes or a real blocker is reached

Installed boundary:

- `docs/CODEX_GOALS_AND_REPAIR_LOOPS.md` defines the Futures Crusher repair loop.
- Repair loops remain local and evidence-driven unless a separate safety-gated phase approves real side effects.

### Prompt Caching

Source: https://developers.openai.com/api/docs/guides/prompt-caching

Use prompt caching for repeated, stable desk-agent context:

- Futures Crusher guardrails.
- `AGENTS.md` and `docs/CODEX_RULES.md` authority language.
- Approved model definitions and non-negotiables.
- Static replay and audit instructions.
- Fixed output contracts for current trade reports and handoffs.

Implementation rule:

- Keep stable instructions first.
- Put variable market/session/replay payloads last.
- Do not use cached prompts to bypass fresh OHLC, completed 5M proof, risk validation, or safety gates.

Installed boundary:

- `src/lib/openai.ts` keeps the optional OpenAI chart validator's Futures Crusher authority prompt and JSON output contract as stable leading messages.
- Route, instrument, primary chart context, and image data remain the variable tail.
- This lets OpenAI's prompt caching apply naturally when the same validator boundary repeats, without adding a new dependency or changing execution authority.

### Codex / ChatGPT Customization

Source: https://learn.chatgpt.com/docs/customization/overview

Use customization surfaces now to keep the operating model durable:

- `AGENTS.md` for repo-level rules.
- Futures Crusher personal plugin skills for guardrails, safety gates, phase installs, verification, commits, pushes, and handoff.
- Focused project docs for trading authority, replay research, and phase status.

Implementation rule:

- Keep durable behavior in repo docs or the Futures Crusher plugin.
- Keep one-off instructions in the current task only.
- Do not move trading approval into prompt text, memory, Gemini, or advisory model output.

Installed boundary:

- The optional OpenAI validator now carries the durable Futures Crusher authority language in a reusable prompt constant.
- The prompt states the same locked authority model as the repo: decision-support only, NinjaTrader OHLC as highest-authority data when present, 5M as execution authority, HTF as context only, and app-owned scanner/pipeline as execution authority.

## Bookmark For Later

### Preserve Reasoning Across Calls

Source: https://developers.openai.com/api/docs/guides/reasoning#preserve-reasoning-across-calls

Bookmark for a future custom desk-agent orchestration layer that carries a structured research chain across multiple calls.

Use only after there is a defined agent boundary for:

- replay package discovery
- read-only candidate mining
- structured handoff summaries
- no-side-effect audit state

Do not use it to preserve hidden trade approval state. Any executable decision must still be reconstructed from durable OHLC facts, scanner output, deterministic risk checks, and explicit gate results.

### Programmatic Tool Calling

Source: https://developers.openai.com/api/docs/guides/tools-programmatic-tool-calling

Bookmark for future research orchestration where an agent can call local read-only tools in a strict sequence:

- artifact discovery
- replay package generation
- outcome comparison
- separator diagnostics
- status/handoff generation

Required Futures Crusher boundary:

- Read-only/research-side first.
- No Supabase writes, Discord posts, NinjaTrader repair writes, Cloudflare deployments, service restarts, or trading-rule changes without the existing safety-gate checkpoint.
- Any side-effect tool must have an explicit approval boundary, idempotency, readback, and rollback plan before it is exposed to agent orchestration.

### Subagents

Source: https://learn.chatgpt.com/docs/agent-configuration/subagents?surface=app

Bookmark for near-term parallel audits:

- one subagent can inspect replay artifacts
- one can inspect tests
- one can inspect docs/status
- one can inspect risk or architecture boundaries

Required Futures Crusher boundary:

- Subagents are read-only/research-side by default.
- Parent task owns final edits, verification, commit, push, and handoff.
- Subagents inherit permissions, so do not delegate live Supabase, Discord, NinjaTrader, Cloudflare, or trading-rule changes without an explicit safety-gated plan.

### Workspace Agents And API Triggers

Sources:

- https://developers.openai.com/cookbook/articles/chatgpt-agents-sales-meeting-prep
- https://developers.openai.com/cookbook/examples/chatgpt/workspace_agents/workspace-agents-api-trigger

Bookmark for later scheduled desk-report or review-workflow orchestration.

Do not implement now because this introduces external agent runs, access tokens, destinations, asynchronous output verification, idempotency, and approval behavior. Futures Crusher would need a separate design before any API-triggered workspace agent can touch reports, RAG, Discord, Supabase, or production workflows.

## Skip

None as source material.

The sales-meeting-prep cookbook is not a direct Futures Crusher feature, but its repeatable-agent workflow pattern is useful later. Borrow the pattern only; do not implement the sales workflow.

## Next Narrow Action

Continue the research-only OpeningDrive no-lookahead separator phase. If an OpenAI-backed desk-agent layer is later built, it should first wrap existing read-only replay scripts and produce the same local artifacts humans can inspect.
