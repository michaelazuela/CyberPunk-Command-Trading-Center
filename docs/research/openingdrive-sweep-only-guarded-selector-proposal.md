# OpeningDrive Sweep-Only Guarded Selector Proposal

Date: 2026-07-19
Status: Research-only proposal draft.

## Authority Boundary

This proposal does not install selector behavior, change scanner ranking, change `canExecute`, post Discord, write Supabase, read live bridge data, change bridge behavior, or change entry/stop/target/risk math.

The app remains a MES/MNQ decision-support desk. NinjaTrader OHLC remains the highest-authority market data path. The 5M chart remains execution authority. Higher-timeframe context remains map/support/caution only.

## Evidence Basis

The broader OpeningDrive keep-later-proof research package produced:

- 38 strict-ready replay rows.
- 22 resolved rows and 16 unresolved/no-fill rows.
- +1,220.00 gross one-MES P/L across strict-ready rows.
- SweepMssFvgRetrace: 19 rows, 12 resolved, 7 unresolved, +1,272.50 gross one-MES P/L.
- TurtleSoup: 18 rows, 10 resolved, 8 unresolved, -52.50 gross one-MES P/L.
- HtfDisplacementMssContinuation: 1 unresolved row.

The 12 originally excluded rows were later classified as research-accounting carveouts:

- 4 fresh-entry-pending rows.
- 5 stale-invalidated rows.
- 1 countertrend/opposing-MSS conditional row.
- 1 FailedPlanReversal row lacking deterministic entry/stop/T1/T2.
- 1 HTF MSS continuation row lacking protected 5M stop because completed 5M MSS opposed the direction.

Adjusted readiness cleared blocked-row accounting, and the proposal guard passed with:

- Proposal hard stops: none.
- `proposalAllowed`: false by design.
- `livePromotionAllowedRows`: 0.
- Recommendation: prepare a separate guarded Sweep-only proposal.

## Proposed Selector Scope

The only candidate family in scope is `SweepMssFvgRetrace`.

The selector may only be evaluated for candidates that are:

- strict-ready from saved research evidence,
- source/proof-positive,
- deterministic-entry/stop/target complete,
- directionally valid,
- not stale invalidated,
- not waiting for fresh entry,
- not countertrend/opposing-MSS conditional,
- not missing protected 5M structure stop,
- not missing app-owned T1/T2,
- not relying on HTF context as execution authority.

## Explicit Non-Goals

Do not remove or weaken TurtleSoup.

Do not remove or weaken SweepMssFvgRetrace.

Do not broaden the selector to FailedPlanReversal, HTF displacement, OpeningDriveFvgContinuation, AfterLunchDriveFvgContinuation, IntradayMssMicroContinuation, or any other model family in this proposal.

Do not loosen `canExecute`.

Do not promote Gemini/advisory output into executable planning.

Do not change Discord posting, Supabase schema, Supabase writes, bridge behavior, contract rollover, active scanner windows, entry math, stop math, target math, risk rules, or protected-structure validation.

## Required Dry-Run Before Any Live-Facing Install

Before runtime code changes, build a dry-run comparison that shows:

- current primary selected candidate,
- proposed Sweep-only guarded selected candidate,
- whether the selected candidate changes,
- why it changes,
- whether the replacement is strict-ready/source-proof-positive,
- whether all deterministic levels are valid,
- whether all blocked-row carveouts remain research-accounting only,
- one-MES P/L by day/session/model for changed rows,
- no live promotion rows.

The dry-run must fail closed if any candidate lacks completed 5M proof, protected stop, deterministic entry, T1/T2, or source/proof-positive evidence.

## Promotion Gate

A future live-facing install may only be considered after:

- dry-run comparison passes,
- proposal guard still passes,
- no unrelated model family is affected,
- full verification passes,
- the change is explicitly scoped as a guarded selector/ranking change,
- rollback is a single commit revert.

Until then, the selector remains research-only.
