# Trading Rules Baseline

Last updated: 2026-05-21

This document is a guardrail for future Codex sessions. It describes the approved trading scope, analyzer expectations, and workflow constraints for the MES/MNQ decision-support app. It is documentation only and must not be treated as permission to change application logic.

## 1. Trading Scope

- Primary instrument: MES.
- Secondary/future instrument: MNQ. MNQ support must not break MES workflows.
- Primary execution chart: 5-minute chart.
- Higher timeframes are context only:
  - 15M: session map, liquidity, displacement, imbalance, targets, obstacles.
  - 60M: broader session structure and larger pullback/reaction zones.
  - 240M: macro structure and major liquidity objectives.
- RTH context matters:
  - Opening range and RTH high/low are context.
  - Morning window must understand overnight/ETH, Asian, London, NY premarket, and prior session levels.
  - PM/later-session analysis must understand completed AM structure before evaluating afternoon conditions.
- Approved live trading windows:
  - AM/Morning: 9:30 AM-11:15 AM ET.
  - PM/Afternoon: future/de-emphasized unless specifically enabled.
  - Lunch/Noon review window currently exists in project history as 11:50 AM-1:00 PM ET, but old Lunch Reversal logic must not be used as the model for the new AM/PM workflow.
- Market Mapping mode may run 24 hours/day to build context, but it must not produce actionable trade plans outside approved execution windows.

## 2. Core Setup Types

Current active primary scanner models are intentionally narrow:

1. `Sweep -> MSS -> FVG Retrace`
2. `Turtle Soup Reversal`

The following concepts are allowed as setup facts, confluence, supporting evidence, or user-facing explanation, but they must not independently approve a trade unless they are part of an approved primary model.

### Turtle Soup

Turtle Soup is an approved primary model.

Bullish Turtle Soup:

- Price sweeps below sell-side liquidity or a prior/session swing low.
- Price fails to continue lower.
- Price reclaims back above the swept level.
- Bullish displacement and/or market structure shift improves confidence.
- Entry is allowed only after reclaim confirmation or retrace following displacement.
- Stop is below the sweep wick/protected structure.
- Target is opposing buy-side liquidity.
- Minimum expected value must be at least 2.0R.

Bearish Turtle Soup:

- Price sweeps above buy-side liquidity or a prior/session swing high.
- Price fails to continue higher.
- Price reclaims back below the swept level.
- Bearish displacement and/or market structure shift improves confidence.
- Entry is allowed only after reclaim confirmation or retrace following displacement.
- Stop is above the sweep wick/protected structure.
- Target is opposing sell-side liquidity.
- Minimum expected value must be at least 2.0R.

### FVG / Imbalance

FVG/imbalance is supporting evidence and part of the active `Sweep -> MSS -> FVG Retrace` primary model.

FVG alone must not approve a trade.

Approved use:

- Expansion/impulse creates an imbalance zone.
- Price retraces into the imbalance.
- Entry is considered only when the primary model gates are met:
  - sweep,
  - reclaim,
  - displacement,
  - market structure shift,
  - FVG retrace,
  - structure stop,
  - target room,
  - minimum 2.0R.

User-facing wording should prefer `Imbalance Zone`; `FVG` may be used as a known shorthand when helpful.

### Order Block

Order Block-style concepts are not active standalone trade models.

Professional wording:

- Use `Prior Impulse Reaction Zone` instead of Order Block.
- This can be context, a reaction area, or a confluence zone.
- It must not independently create an active trade candidate or approval.

### Breaker Block

Breaker Block is supporting evidence only.

Professional wording:

- Use `Failed Structure Retest Zone`.
- Breaker/FVG overlap may add confluence.
- Breaker/FVG overlap must not qualify a trade by itself.

### Wick / Rejection Behavior

Wicks are supporting evidence only. A wick alone is never a valid trade trigger.

Bullish wick/rejection support:

- Price wicks below meaningful sell-side liquidity.
- Candle closes back above the swept level.
- Lower wick should show meaningful rejection relative to body/range.
- Stronger when followed by displacement or market structure shift.

Bearish wick/rejection support:

- Price wicks above meaningful buy-side liquidity.
- Candle closes back below the swept level.
- Upper wick should show meaningful rejection relative to body/range.
- Stronger when followed by displacement or market structure shift.

Reject wick-only trades when:

- Wick occurs inside chop/consolidation.
- Wick does not sweep a meaningful level.
- Price does not close back beyond the swept level.
- Minimum 2.0R is unavailable.

### Liquidity Sweep Behavior

A liquidity sweep means price trades beyond a known reference level. A touch is not enough.

Valid reference levels include:

- Prior swing high/low.
- Session high/low.
- Equal high/low resting liquidity pool.
- Prior session high/low.
- Previous day/week/month high/low.
- Asian/London/NY premarket high/low.

Sweep behavior is supporting evidence unless it becomes part of:

- `Sweep -> MSS -> FVG Retrace`
- `Turtle Soup Reversal`

Default implementation parameters may include minimum sweep ticks, stop offset ticks, and confirmation timeframe. These are app parameters, not official trading doctrine, and should be logged for replay/journal validation.

## 3. AM/PM Workflow Rules

AM and PM workflows must be separate.

Requirements:

- AM analysis must not trigger PM logic.
- PM analysis must not trigger AM logic.
- Neither AM nor PM should trigger old Lunch Reversal logic.
- AM and PM should function like the Replay Window workflow:
  - explicit upload/paste,
  - screenshot preview,
  - explicit Analyze/Process button,
  - deterministic output,
  - proof/journal/RAG tracking where applicable.
- Mode/session state must be isolated:
  - screenshots,
  - previews,
  - extracted context,
  - setup results,
  - final plans,
  - proof,
  - trade confirmation,
  - RAG records.
- Reset must clear only the active workflow/mode.

Current UI direction:

- Discord is the primary trade-alert interface.
- UI is primarily RAG/admin.
- If AM/PM workflow UI is reintroduced, use Replay Window behavior as the workflow model, not old Lunch Reversal panels.

## 4. Screenshot Analyzer Expectations

The user must be able to paste or upload screenshots.

Analyzer workflow:

1. User pastes or uploads screenshot.
2. Screenshot preview displays before analysis.
3. Analyzer must not auto-run just because an image is pasted or uploaded.
4. User must intentionally click Analyze/Process.
5. Analyzer extracts facts only; app-owned deterministic engines decide the plan state.

Required output fields:

- Bias/read.
- Setup/model type.
- Entry idea or entry zone.
- Structure stop.
- Target(s).
- Invalidation.
- Trade / no-trade / wait / conditional decision.
- No-trade reason when applicable.

15M ETH screenshot rule:

- 15M/ETH context is context only.
- It may identify overnight structure, session highs/lows, trend, compression/expansion, major support/resistance, and early RTH direction.
- It must not approve trades, generate final executable entry/stop/T1/T2, override the 5M chart, override plan engine, override setup scanner, or override trade decision pipeline.

5M execution chart rule:

- 5M remains execution authority for:
  - trigger,
  - active swing,
  - stop placement,
  - risk check,
  - final approval.

## 5. Risk And Trade Management

Stop placement:

- Stop must be tied to active swing, sweep wick, protected structure, or invalidation area.
- Do not use arbitrary fixed stops as the primary approval rule.
- If max stop/risk constraints are implemented, preserve them unless the user explicitly requests a change.

Risk:

- Actual risk is measured from entry to structure stop.
- If actual risk is too wide, return wait/blocked/no-trade instead of moving the stop artificially.
- If setup has no valid structure stop, it cannot be approved.

Targets:

- Targets must be rule-based, not random.
- Tactical targets can use R multiples from confirmed entry and stop.
- Liquidity targets should prefer real liquidity:
  - session highs/lows,
  - swing highs/lows,
  - equal high/low liquidity pools,
  - prior day/week/month levels.
- Imbalances, gaps, opens, and round numbers should be shown as obstacles/reaction zones, not mislabeled as liquidity.
- If target room is poor or nearest obstacle blocks the plan, return wait/blocked/no-trade.

No-trade conditions must be explicit:

- No confirmed setup.
- No completed 5M trigger.
- Current candle unfinished.
- Outside approved window.
- Missing key level.
- Missing structure stop.
- Actual extended structural risk.
- Target room poor.
- Price already chased/stale.
- Conflicting or unclear data.
- Chop/consolidation.

## 6. Journal / Tracking Expectations

Every useful analysis, alert, replay result, and trader-confirmed outcome should be able to feed a journal/RAG record.

Required journal fields:

- Date/time.
- Session.
- Instrument.
- Setup/model type.
- Bias.
- Entry.
- Stop.
- Target.
- Result.
- Screenshot/reference ID.
- Analyzer decision.
- Notes.

Preferred expanded fields:

- Direction.
- Scanner score.
- Planned R.
- Actual result in R.
- Max favorable excursion.
- Max adverse excursion.
- Win/loss/breakeven.
- Discord alert ID.
- Outcome button pressed.
- Setup tags:
  - sweep,
  - reclaim,
  - displacement,
  - MSS,
  - FVG/imbalance,
  - Turtle Soup,
  - wick rejection,
  - premium/discount,
  - HTF aligned.

Discord outcome buttons:

- May record whether the trader took the trade and what happened.
- Must feed RAG/journal learning only.
- Must not approve trades, place trades, or override risk rules.

## 7. Guardrails For Future Codex Sessions

Do not alter trading rules while fixing UI workflow.

Do not add new strategy logic unless specifically requested.

Do not use deprecated Lunch Reversal code as the AM/PM workflow model.

Replay Window behavior is the model for AM/PM workflow:

- paste/upload,
- preview,
- explicit Analyze/Process,
- explicit output,
- proof/outcome tracking,
- reset scoped to the active workflow.

Preserve:

- Dark mode.
- Screenshot paste/upload behavior.
- Screenshot preview before analysis.
- Manual click-to-analyze behavior.
- Supabase/Cloudflare-only architecture.
- Gemini/OpenAI API keys only in Cloudflare/server environments.
- NinjaTrader bridge as read-only.
- No automated order placement.

Do not reintroduce:

- Firebase.
- Old custom-rule labels as active scanner logic.
- Old Lunch Reversal as an active AM/PM workflow model.
- Supporting evidence as standalone active trade models.
- AI as executable trade authority.

Future code changes should keep active scanner candidates limited to:

- `SetupType.SweepMssFvgRetrace`
- `SetupType.TurtleSoup`

Supporting evidence may enrich the plan, but the deterministic app-owned pipeline must decide wait, conditional, executable, approved, blocked, missed, or no-trade.
