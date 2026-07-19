# OpenAI Desk-Agent Bookmarks

## Purpose

This note records which OpenAI platform capabilities Futures Crusher should use now versus hold for the future custom desk-agent orchestration layer.

The project remains a MES/MNQ decision-support trading desk. These bookmarks do not change scanner eligibility, `canExecute`, Discord posting, Supabase writes, NinjaTrader bridge behavior, entry, stop, target, risk, or automated execution.

## Use Now

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

## Skip

None.

All four references are useful. The current install path is to use prompt caching and customization immediately, while preserving reasoning and programmatic tool calling as future orchestration work after the research pipeline proves the exact need.

## Next Narrow Action

Continue the research-only OpeningDrive no-lookahead separator phase. If an OpenAI-backed desk-agent layer is later built, it should first wrap existing read-only replay scripts and produce the same local artifacts humans can inspect.
