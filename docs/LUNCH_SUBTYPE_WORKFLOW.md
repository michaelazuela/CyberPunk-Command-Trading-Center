# Lunch Reversal Subtype Workflow

Lunch Reversal uses five deterministic Lunch-only subtypes:

- `LunchFailedHighReversal`
- `LunchFailedLowReversal`
- `LunchCompressionBreakout`
- `LunchFailedContinuation`
- `LunchRangeReclaim`

These are not global Morning setup types. They only run for `lunch` and `replay_lunch`.

## Morning Window Dependency

Lunch subtypes must work from the completed Morning window. They may not activate from the Lunch 5M screenshot alone.

Required Morning context:

- Morning high
- Morning low
- Morning trend or range state
- Morning extension or compression state
- Morning high/low sweep state, when relevant
- Confidence that the Morning window context is complete

If Morning context is missing, Lunch subtypes remain not detected and report missing evidence. The app may still review generic Lunch setup candidates, but the five Lunch subtypes cannot become executable.

## Subtype Definitions

`LunchFailedHighReversal` is a short subtype after bullish morning extension, sweep above the morning high, and failure to hold above that high.

`LunchFailedLowReversal` is the long-side mirror after bearish morning extension, sweep below the morning low, and failure to hold below that low.

`LunchCompressionBreakout` requires completed Morning context plus a defined lunch/morning compression range and a 5M breakout trigger.

`LunchFailedContinuation` requires a directional Morning move, an attempted Lunch continuation, and a failed push at or near a Morning extreme or key level.

`LunchRangeReclaim` requires a defined Morning or Lunch range, a failed break outside that range, and a 5M reclaim back inside.

## Authority Boundary

Gemini may extract Lunch subtype facts, but it does not approve trades.

The app-owned setup scanner, plan engine, and trade decision pipeline decide:

- setup detection
- execution status
- entry
- stop
- T1 and T2
- invalidation
- risk approval
- final trade status

## RAG Learning

The selected app-owned setup or subtype is saved into RAG through the final trade plan, setup candidates, workflow persistence JSON, and embedding text. This lets future Lunch plans study whether a subtype such as `LunchFailedHighReversal` or `LunchRangeReclaim` actually worked.
