# FVG Research Guardrails v1

Boundary: research_only_no_live_scanner_discord_supabase_or_trading_rule_change

Package: FairValueGapResearchModel

Purpose: keep fair value gap research portable, repeatable, and story-first. This guardrail travels with the FVG research files so the model can be reviewed or installed later without pulling in old model noise.

## Mandatory Workflow

Every FVG review or replay must follow this order:

1. Build the HTF and 15M story first.
2. Identify the active 15M parent FVG, FVG stack, or failed FVG.
   - The parent FVG timestamp is the candle/formation that created the FVG zone.
   - Do not relabel a later candle that trades through, expands away from, or confirms the zone as the parent.
3. Decide whether the market is continuing, failing, balanced, or reacting into an obstacle.
4. Drill into 5M only after the 15M story is valid.
5. Require completed 5M proof before a research trade is valid.
6. Anchor stop to nearest protected 5M structure.
7. Calculate T1 and T2 from actual entry-to-stop risk.
8. Add real liquidity, open FVG objectives, HTF reaction zones, and balanced-path notes as management context only.

If the 15M story is missing or contradicted, the row is diagnostic_only. Do not promote it from a 5M row alone.

## Authority Stack

- 240M / 120M / 60M: map, major FVG/reaction zones, larger draw, obstacle, or caution.
- 15M: parent setup authority for this research lane.
- 5M: execution proof, protected stop, invalidation, and entry timing.
- 1M: future refinement only after completed 5M proof. It is not part of this guardrail yet.

## Core FVG Research Rules

### 15M FVG Hold + Nested 5M FVG Defense Continuation

Price returns into a valid 15M parent FVG. A nested or aligned 5M FVG/wick-defense area inside that parent zone defends. A completed 5M candle confirms continuation in the parent direction.

### Defended-First Continuation Precedence

When the same 15M battle zone can be read as both a defended continuation and a later failure/reversal, review the first completed 5M defense/continuation proof first. The later opposite-side failure is secondary until price accepts through the defended zone and gives fresh opposite-side 5M proof.

### 15M FVG Failure / Breakdown Continuation

Price accepts through a valid 15M parent FVG against the original side. A pullback or rejection into the failed area, or an aligned nested 5M area, gives completed 5M proof for continuation in the failure direction.

### 15M FVG Stack Defense Continuation

In a directional move, do not tag every FVG. The research inventory tracks only the 15M fair value gap battle zones from the active displacement leg:

- First reaction zone: the first meaningful 15M FVG price returns into after displacement. If it defends and continuation resumes, the move is strong.
- Final battle zone: if price accepts through the first reaction zone, the final/deepest same-side 15M FVG becomes the last defense area. If it defends, continuation remains valid. If it fails, the original structure is suspect.
- Middle FVG clutter is not tracked for this research rule unless the user explicitly promotes a specific zone during visual review.

Long version:
- HTF/15M story is bullish or actively continuing higher.
- Price pulls back into the first bullish 15M FVG reaction zone. If it fails, price must defend the final/lowest bullish 15M FVG battle zone.
- Completed 5M proof confirms continuation higher.
- Shorts are blocked unless price accepts below that final defended 15M FVG and then gives clean 5M bearish proof.

Short version:
- HTF/15M story is bearish or actively continuing lower.
- Price retraces into the first bearish 15M FVG reaction zone. If it fails, price must defend the final/highest bearish 15M FVG battle zone.
- Completed 5M proof confirms continuation lower.
- Longs are blocked unless price accepts above that final defended 15M FVG and then gives clean 5M bullish proof.

### Balanced Path To Liquidity / Open FVG Objective

If price breaks out of a balanced/rebalanced range and no defended opposing FVG appears before the next real-liquidity draw or separately labeled open-FVG objective, the move can travel cleanly through that path. This supports continuation and runner management only after valid FVG proof already exists.

### Opposing FVG Obstacle Before T1

Before scoring continuation, check for a defended opposing FVG or HTF reaction zone between entry and T1. A defended obstacle before T1 downgrades or fails continuation.

### Management Continuation After First Campaign

After the first clean same-direction FVG campaign is active, later same-direction FVG proof in the same drive is management or add-on context by default. It is not a new primary trade unless an explicit reset/add-on rule has been approved.

If the later continuation reaches an older opposing FVG before T1 and that FVG defends, the correct label is management_continuation, not fresh standalone model trade. The Jan 20 Trade 6 review is the control case: the short continued from the earlier sell-side campaign, then the older Dec 19 02:15/02:30 15M LONG FVG area defended before full tactical delivery.

## Anti-Drift Rules

- Do not begin with raw 5M rows. Begin with HTF/15M story.
- Do not drift the parent timestamp forward. Parent means the 15M FVG creation/formation time, not the later 15M or 5M continuation candle.
- Do not promote a trade without a valid 15M parent FVG, failed FVG, or FVG stack defense.
- Do not call FVG/objective zones liquidity. Real liquidity means prior swing liquidity, session high/low liquidity, or equal high/low liquidity.
- Do not use balanced path as a standalone trigger.
- Do not use HTF context as execution authority.
- Do not classify rule-matching trades as human-review exceptions.
- Do not label a later same-zone failure/reversal before reviewing the first completed 5M defended continuation proof.
- Do not approve opposite-side trades against a defended final FVG stack unless price accepts through the final defended FVG and completed 5M proof confirms the reversal.
- If the facts are unclear, mark diagnostic_only and ask for chart review.

## Portable Install Rule

When this package is moved into another project, copy this guardrail with:

- `fvg-research-rule-contract-v1.md`
- `fvg-research-rule-contract-v1.json`
- the compact reviewed-case summary files
- any locked visual-review notes

The receiving project must treat this file as the FVG research source of truth until the user explicitly approves live implementation.
