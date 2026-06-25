# Phase 3 Fresh Tactical Re-entry Candidate Builder

## Current Behavior Before Phase 3

Phase 1/2 created `freshReentryWatch` on `primaryDeskPlay` when the scanner saw this condition:

- A prior same-direction scanner candidate existed.
- The old entry was marked missed, stale, or no-chase.
- Active HTF FVG reaction routing still supported the same side.
- A line in the sand remained available.

That behavior was watch-state only. It told Discord and DeskState that old levels were management/history only and that a fresh deterministic package was required. It did not compute a new entry, stop, T1, or T2.

## Phase 3 Builder

Phase 3 adds `freshReentryCandidates` to `primaryDeskPlay`.

The builder is deterministic and approved for production Discord conditional-plan display only. It computes candidate levels but does not set `canExecute`, does not approve a trade, does not change model definitions, and does not change bar-close handling.

## Exact Inputs

- `freshReentryWatch`
- `htfFvgReactionRouting`
- `htfFvgCascade.childExecutionZone`
- `chartContext.multiTimeframeContext.fiveMinute.candles` or `chartContext.candles`
- `currentPrice`
- `visibilityMetadata.authority.activeModel`
- `TRADE_RULES.maxRiskPoints`
- `TRADE_RULES.targetModel`

## Candidate Conditions

A fresh re-entry candidate can be built only when:

- `freshReentryWatch` exists.
- Active HTF FVG reaction routing is `routed_active_reaction`.
- The latest completed 5M candle accepts the active line in the trade direction.
- The instrument is configured in `TRADE_RULES.instruments`.
- The scanner active desk-plan window is open.
- A protected 5M stop can be derived from recent completed 5M candles.
- App target math can compute T1/T2 from actual entry-to-stop risk.

## Candidate Entries

Entry seeds are deterministic:

1. Active line retest.
2. Child-zone boundary.
3. Child-zone midpoint.

For LONG, child-zone boundary uses the lower edge. For SHORT, it uses the upper edge.

## Stop And Targets

- LONG stop: lowest low from the latest five completed 5M candles below entry, minus one tick.
- SHORT stop: highest high from the latest five completed 5M candles above entry, plus one tick.
- T1/T2: existing app math from `targetsFromEntryStop`.

## Priority And Ordering

Candidates sort by:

1. Ready candidates before blocked candidates.
2. Source priority: active line retest, child-zone boundary, child-zone midpoint.
3. Lower actual risk.
4. Closer entry to current price.
5. Deterministic candidate key.

## Constraints

- Risk must be within `TRADE_RULES.maxRiskPoints` for ready status.
- One candidate per side per line/source.
- Scanner active desk-plan window is required.
- 5M completed candle remains execution authority.
- HTF FVG context routes and frames the setup only.
- Owner review remains required before Phase 3 can be marked complete or approved.

## Risk Impact

The builder reports old entry, old stop, old risk, new entry, new stop, new risk, and risk delta. This is for review and backtest comparison only.

## Approval Boundary

Phase 3 candidate sets carry:

- `approvalStatus: approved_discord_conditional_display`
- `changesTradeApprovals: false`
- `changesCanExecute: false`
- `changesModelDefinitions: false`
- `changesBarCloseHandling: false`
- `approvedForDiscordConditionalDisplay: true`
- `changesExecutionApproval: false`

The trading-logic owner approved this boundary for Discord conditional-plan display only. Any later change that routes these candidates into `canExecute`, execution approval, model definitions, or automated order behavior requires a separate explicit approval.
