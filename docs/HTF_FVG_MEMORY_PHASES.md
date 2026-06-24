# HTF FVG Memory Install Plan

Purpose: prevent full-window higher-timeframe fair value gap context from drifting out of scanner routing when the recent display FVG list is truncated.

## Phase 1: Full-Window HTF FVG Inventory

- Build machine-readable FVG inventory from the full loaded OHLC window for 240M, 120M, 60M, and 15M.
- Preserve existing recent `fvgZones` behavior for local display/tactical consumers.
- Expose `fullWindowFvgZones` and `fullWindowCandles` as context-only fields.
- Do not change setup definitions, ranking, entry, stop, target, risk, `canExecute`, or bar-close handling.

## Phase 2: HTF FVG Lifecycle State

- Classify full-window parent zones as active, partially mitigated, rejected, accepted through, inverted, or data-limited.
- Use completed OHLC only.
- Report insufficient HTF history as data quality, not as a no-setup conclusion.

## Phase 3: Nearest Active Reaction Routing

- Route the nearest active parent zone around current price into DeskState.
- Include parent stack, zone bounds, state, reaction evidence, line in the sand, and stand-down condition.
- Keep 5M as execution authority.

## Phase 4: Discord And DeskState Contract

- Display active HTF FVG reaction context in the primary desk play when present.
- Prevent complete high-quality conditional plans from being buried by stale or lower-quality maps.
- Require machine-readable zone bounds in Discord/chart payloads when HTF FVG context is referenced.

## Phase 5: Drift Hardening

- Maintain real-case regression coverage for June 11 parent FVG into June 24 reaction routing.
- Guard against using only capped recent `fvgZones` for HTF parent memory.
- Add replay checks that prove Discord text, chart cards, DeskState, and RAG records agree on the same active parent zone.
- Keep recent display zones and full-window parent-zone memory as separate responsibilities.
