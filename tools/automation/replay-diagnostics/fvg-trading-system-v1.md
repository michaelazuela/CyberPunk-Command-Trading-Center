# FVG Trading System v1

Status: research system document only.

Boundary: this document does not change the live scanner, Discord posting, Supabase behavior, NinjaTrader bridge behavior, automated execution, or risk logic.

Purpose: consolidate the Fair Value Gap research into one trading system. The reviewed dates are examples under the rules. They are not separate models.

## One-System Rule

We are no longer treating each reviewed date as its own rule.

Every reviewed trade must fit one shared workflow:

1. Build the HTF and 15M story first.
2. Find a valid same-direction 15M parent FVG, failed 15M FVG, or 15M FVG stack.
3. Decide whether the market is defending, failing, balancing, or reacting into an obstacle.
4. Drill into 5M only after the 15M story is valid.
5. Require completed 5M proof before any research trade is valid.
6. Anchor the stop to nearest protected 5M structure.
7. Calculate T1 and T2 from actual entry-to-stop risk.
8. Use liquidity, open FVGs, defended FVGs, balanced path, and HTF reaction zones as management context.

If the 15M story is missing, the row is diagnostic only. A 5M row by itself is not a trade.

## Core Definitions

### HTF Map

60M, 120M, and 240M provide the bigger story: support, obstacle, reaction area, open FVG inventory, draw, or caution.

HTF does not trigger a trade by itself. It tells us where a trade may have room, where it may fail, and where it may need management.

### 15M Parent FVG

The 15M parent FVG is the 15M displacement candle or formation that creates the FVG zone the trade is based on.

The parent is not the later candle that touches, rejects, expands away from, or confirms the zone. Later candles are proof or management context.

### 15M Battle-Zone Inventory

Do not tag every 15M FVG.

Track only the important battle zones from the active displacement leg:

- First defended area: the first meaningful 15M FVG price returns into after displacement.
- Final battle zone: the deepest same-side 15M FVG that must defend if the first defended area fails.
- Opposing defended FVG: an older or opposite-side FVG that can block delivery or force management.

For a bullish structure, the first bullish FVG should defend. If price runs through it, the final lower bullish FVG must defend or the bullish structure is suspect.

For a bearish structure, the first bearish FVG should defend. If price runs through it, the final higher bearish FVG must defend or the bearish structure is suspect.

### 5M Confirmation

5M is the execution proof layer.

The 5M confirms a defended 15M battle zone when price returns into the 15M zone or an aligned nested 5M FVG, rejects it, and completes a 5M candle back in the trade direction without accepting through the zone.

### Opposite-Side 5M Flip Before Proof

If price returns into the selected 15M parent/battle-zone FVG and a completed 5M candle accepts through that zone in the opposite direction before same-direction 5M proof, the original candidate is invalid.

This is a no-trade/invalid-candidate rule, not a reversal entry by itself.

- LONG candidate: completed 5M close below the selected bullish 15M zone before long proof blocks the long.
- SHORT candidate: completed 5M close above the selected bearish 15M zone before short proof blocks the short.
- Do not call opposite-side acceptance wick defense.
- Do not move proof to a later candle to rescue the original side.

### Balanced Path

A balanced path is a rebalanced price area where there is no meaningful defended opposing FVG before the next real liquidity or open-FVG objective.

Balanced path is never a standalone trigger. It supports target management after the trade already has a valid 15M parent and completed 5M proof.

### Real Liquidity

Real liquidity means prior swing highs/lows, session highs/lows, or equal highs/equal lows.

FVGs are not liquidity. FVGs are reaction zones, defended zones, obstacles, or open-FVG objectives.

## Core Trade Rules

### Rule 1: 15M FVG Hold + Nested 5M Defense Continuation

Price returns into a valid same-direction 15M parent FVG. Inside or aligned with that parent zone, a 5M FVG or wick-defense area defends. A completed 5M candle confirms continuation.

Required:

- Valid same-direction 15M parent FVG.
- Price returns into the 15M parent zone or aligned nested 5M FVG.
- Completed 5M defense candle.
- Entry, protected 5M stop, T1, and T2 are known.
- Target room still exists after proof.

Invalid if:

- No valid same-direction 15M parent FVG.
- 5M evidence is outside the 15M story.
- Price accepts through the parent zone against the trade.
- Stop is not nearest protected 5M structure.
- Targets were already reached before proof.

Examples:

- 2026-01-21: valid long. 9:30 15M parent FVG, tiny nested 5M FVG/wick defense around 6957, entry 6962.25, protected stop 6930.50, T1 7010.00, T2 7025.75.
- 2026-01-26: valid long. 15M battle zone from the morning displacement, 5M entry area around 10:05, later targets hit.
- 2026-01-27: valid long. Parent/displacement created around 10:45, proof around 13:05-13:15, later machine-selected row was management/context.
- 2026-01-29: valid afternoon long. 12:15 parent, 12:55 proof, T1 hit.

### Rule 2: 15M FVG Failure / Breakdown Continuation

A valid 15M parent FVG fails. Price accepts through it against the original side, then pulls back or rejects from the failed area. Completed 5M proof confirms continuation in the failure direction.

Required:

- Valid 15M parent FVG exists first.
- Price accepts through that parent FVG against the original side.
- Pullback/rejection into the failed FVG or aligned 5M area.
- Completed 5M continuation proof.
- Protected 5M stop and target room.

Invalid if:

- There was no valid 15M parent FVG to fail.
- Price never accepted through the parent zone.
- 5M proof is missing.
- The move already delivered before proof.

Examples:

- 2026-01-13: valid short. 10:00 15M bearish displacement, return/rejection near 12:00, balanced path toward the 7100 area.
- 2026-01-15: valid short campaign. Trade 1 was the primary short; Trade 2 was continuation/management, not a separate fresh model.
- 2026-01-16: valid Trade 1 short only. Later raw rows were rejected because they lacked valid 15M parent FVG support.
- 2026-01-29: valid morning short. 9:15 parent, 9:35 proof.

### Rule 3: 15M FVG Stack Defense Continuation

In a directional move, track the first defended area and the final battle zone. If the first zone fails but the final same-side FVG defends, the original structure can still continue.

Required:

- HTF/15M story supports continuation or has not accepted reversal.
- First defended area or final battle zone is clearly identified.
- If first defended area fails, final battle zone defends.
- Completed 5M proof confirms continuation from the defended zone.

Invalid if:

- No same-side 15M FVG stack exists.
- Price accepts through the final battle zone.
- Opposite side gets completed 5M proof after acceptance through the final battle zone.

Examples:

- 2026-01-22: short ideas invalid. Price defended the final lower 15M bullish battle zone and resumed higher.
- 2026-01-26: valid long. The active morning FVG stack created the continuation battle zone.
- 2026-01-27: valid long. Same stack-defense idea as the prior day.
- 2026-01-28: prior long candidate invalid because there was no real same-direction 15M parent FVG.

### Rule 4: Defended-First Precedence

When the same 15M zone can be read as either defended continuation or later failure, review the defended continuation first.

The later opposite-side trade only becomes valid if price accepts through the defended zone and then gives fresh completed 5M proof.

Examples:

- 2026-01-28: the tool drifted by reviewing later failure/reversal logic before proving a valid same-direction parent. The corrected result was invalid_parent_15m_fvg_not_confirmed.
- 2026-01-29: the long should be reviewed before labeling the same area as a later short/failure.

### Rule 5: Management Continuation After First Campaign

After the first clean same-direction FVG campaign is active, later same-side FVG proof is management or add-on context by default.

It is not a fresh primary trade unless a separate reset/add-on rule is approved later.

Examples:

- 2026-01-15: Trade 2 was continuation/management from Trade 1.
- 2026-01-20: corrected management continuation short. The later short did not deserve to keep resurfacing as a fresh standalone trade.
- 2026-01-27: later row was management/context after the real earlier proof.

## Entry Rules

Default entry is the completed 5M confirmation close after the 15M parent or battle zone has defended or failed.

Aggressive entries may be researched later using 1M refinement, but 1M does not approve a trade in v1.

Do not enter from:

- A raw 5M row without the 15M story.
- A later candle that only looks cleaner after the real proof already happened.
- A retest that overwrites a human-locked parent/proof pair.

## Stop Rules

Stop is always nearest protected 5M structure for the active side.

Do not use random tight stops, wide arbitrary stops, or HTF zones as the execution stop.

If nearest protected 5M structure makes the risk unacceptable, the row is diagnostic or no-trade unless a separate risk rule is approved.

## Target Rules

App tactical targets:

- T1 = 1.5R from actual entry-to-stop risk.
- T2 = 2.0R from actual entry-to-stop risk.

Management context:

- Defended opposing FVG before or near T1.
- Real liquidity objective.
- Open FVG objective.
- Balanced path to liquidity.
- HTF reaction zone.

A defended FVG before T1 is not automatically an issue. It must be called out. It blocks only if it invalidates the story, removes target room, or proves acceptance against the trade.

## No-Trade Rules

No trade when:

- No valid same-direction 15M parent FVG exists.
- The setup is only 5M evidence.
- HTF/15M story contradicts the trade.
- Price accepts through the final battle zone against the trade.
- The row is a late same-side variant without a reset/add-on rule.
- Target room is already gone before proof.
- Entry/stop/target math does not match the candle truth.
- The candidate only works by relabeling a later candle as the parent.
- 2026-06-01: short invalid; 5M bullish flip/acceptance through bearish 15M zone before short proof.

Examples:

- 2026-01-20: invalid later short stopped out and did not reach stated target.
- 2026-01-28: no valid same-direction 15M parent FVG for the proposed long.
- 2026-01-30: no valid trade. Defended-area/obstacle callouts existed, but they did not create a clean v1 trade.

## Case Study Index

| Date | System Lesson |
| --- | --- |
| 2026-01-07 | Older defended FVG/obstacle can block continuation; inventory memory matters. |
| 2026-01-13 | Failed acceptance plus 15M FVG rejection and balanced path can validate the short. |
| 2026-01-15 | Trade 1 primary campaign; Trade 2 management continuation. |
| 2026-01-16 | Only rows with valid 15M parent FVG survive. |
| 2026-01-20 | Management continuation must not be promoted as fresh standalone trade. |
| 2026-01-21 | Rule-based 15M parent plus tiny nested 5M FVG defense long, not human-review exception. |
| 2026-01-22 | Final bullish battle zone defended; shorts invalid. |
| 2026-01-26 | Valid long from 15M battle zone and earlier 5M proof. |
| 2026-01-27 | Repeatable battle-zone continuation; earlier proof matters. |
| 2026-01-28 | Invalid parent lock; no same-direction 15M parent FVG. |
| 2026-01-29 | Valid morning short and afternoon long; defended-first before later failure labels. |
| 2026-01-30 | No-trade lock; obstacle callouts do not equal trade approval. |

## Product Direction

This is the isolated FVG system package we can later promote into product work.

Do not rip old live models out until this system can stand alone through replay proof.

Do not install live until the research system proves:

- Same rules hold across January, June, and July.
- Parent timestamps do not drift.
- 15M story always comes before 5M proof.
- Stop always anchors to nearest protected 5M structure.
- Targets always match actual entry-stop risk and candle truth.
- No-trade outcomes remain clean.
