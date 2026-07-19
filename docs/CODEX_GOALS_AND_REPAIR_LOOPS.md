# Codex Goals And Repair Loops

## Purpose

Use this template when Futures Crusher work should continue through discovery, implementation, verification, commit, push, and handoff without stopping after every phase.

This is a Codex operating pattern only. It does not change scanner eligibility, `canExecute`, Discord posting, Supabase writes, NinjaTrader bridge behavior, entry, stop, target, risk, or automated execution.

## When To Use A Goal

Use a Goal for work with a clear finish line and an uncertain path:

- replay research that must produce evidence and a recommendation
- guarded phase installs
- regression hunts that need reproduce, fix, retest
- research-only rank/filter simulations
- documentation plus verification handoffs
- multi-step cleanup where the next action depends on test output

Use a normal prompt for one-off questions, small explanations, or a single file inspection.

## Default Futures Crusher Goal Template

```text
/goal Run the next Futures Crusher research/install phase until:
- the current objective is implemented or proven unnecessary,
- evidence artifacts or test output support the conclusion,
- no live behavior changes unless explicitly approved,
- trading authority boundaries remain intact,
- docs/PROJECT_STATUS.md is updated,
- required guard/test/build checks pass,
- relevant files are committed and pushed,
- the final handoff states trading-logic impact and next narrow action.
```

## Research-Only Goal Template

```text
/goal Complete the requested Futures Crusher research phase using saved/local artifacts only until:
- the target data set is identified,
- the replay/audit scripts run,
- output artifacts are written,
- results are summarized by day/session/model where relevant,
- no scanner-visible, Discord, Supabase, NinjaTrader, canExecute, entry, stop, target, risk, or trading-rule behavior changes,
- docs/PROJECT_STATUS.md records the evidence,
- checks pass,
- the branch is committed and pushed.
```

## Guarded Install Goal Template

```text
/goal Install the approved narrow Futures Crusher change until:
- the exact code boundary is identified,
- the smallest safe patch is applied,
- focused regression tests cover the changed behavior,
- full required checks pass,
- no unrelated files are changed,
- docs/PROJECT_STATUS.md records the impact,
- commit and push succeed,
- the final handoff names any real system touched.
```

## Iterative Repair Loop

For bug hunts and research installs, use this loop:

1. Reproduce or load the current evidence.
2. Identify the smallest failing boundary.
3. Patch only that boundary.
4. Run the focused test or replay.
5. If still failing, turn the failure output into the next repair input.
6. Run the full required checks when the focused proof passes.
7. Update status, commit, push, and hand off.

The loop stops only when the goal is complete, the evidence proves no change is needed, or a real blocker requires user input such as a secret, external account permission, live production approval, or missing source data.

## Safety Boundaries

Goals and repair loops must still obey the Futures Crusher safety gates:

- no automated orders
- no trade approval from AI, prompt text, screenshots, or HTF context alone
- no Gemini/advisory executable plans
- no loosening `canExecute`
- no Supabase writes, Discord posts, NinjaTrader repair writes, Cloudflare deploys, service restarts, or trading-rule changes without the matching gate
- no invented market data
- no broad refactors while repairing a narrow failure

## Useful OpenAI References

- Goals in Codex: https://developers.openai.com/cookbook/examples/codex/using_goals_in_codex
- Iterative repair loops: https://developers.openai.com/cookbook/examples/codex/build_iterative_repair_loops_with_codex
- Subagents: https://learn.chatgpt.com/docs/agent-configuration/subagents?surface=app
- Workspace agents pattern: https://developers.openai.com/cookbook/articles/chatgpt-agents-sales-meeting-prep
- Workspace Agent API trigger: https://developers.openai.com/cookbook/examples/chatgpt/workspace_agents/workspace-agents-api-trigger
