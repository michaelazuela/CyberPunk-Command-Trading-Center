# FVG Research Rule Contract v1

Boundary: research_only_no_live_scanner_discord_supabase_or_trading_rule_change

Model lane: FairValueGapResearchModel

Purpose: lock the fair value gap research workflow so reviewed cases use the same rule language. This is a documentation and research-contract artifact only. It does not change the live scanner, Discord posting, Supabase behavior, NinjaTrader bridge behavior, or execution/risk logic.

Portable guardrail: `tools/automation/replay-diagnostics/fvg-research-guardrails-v1.md`

Mandatory workflow: every FVG review starts with the HTF/15M story and active FVG stack before any 5M row can be treated as a trade. A 5M row without the 15M story is diagnostic_only.

## Authority Stack

1. HTF map first: 60M, 120M, and 240M provide support, obstacle, draw, or caution only.
2. 15M parent setup: a real 15M displacement must create the parent FVG.
   - Parent timestamp discipline: the parent time is the 15M candle/formation that created the FVG zone. A later candle that trades through, rejects, expands away from, or confirms the zone is proof/continuation context, not the parent.
3. Drill to 5M: price must return into the 15M FVG area or a clean nested/aligned 5M FVG.
4. Completed 5M wick defense: a completed 5M candle must test and reject/defend the FVG area without accepting through it against the trade.
5. Entry: the default research entry is the completed 5M wick-defense or confirmation close.
6. Stop: the stop is the nearest protected 5M structure for the active side.
7. Targets: T1 and T2 are calculated from actual entry-to-stop risk. HTF/FVG obstacles and real liquidity are management context, not standalone trade approval.

## Concrete Rules

### 15M FVG Hold + Nested 5M FVG Defense Continuation

Price returns into a valid 15M parent FVG. Inside that parent FVG, a nested 5M FVG or 5M wick-defense area exists. A completed 5M candle defends that nested area and continues in the parent direction.

Required facts:
- Valid 15M parent FVG exists.
- Price returns into the 15M parent FVG.
- Nested/aligned 5M FVG or 5M wick-defense area exists inside the parent zone.
- Completed 5M candle defends the nested area.
- Entry, nearest protected 5M stop, T1, and T2 are known.
- Target room remains after proof.

Invalidation:
- No valid 15M parent FVG.
- No valid same-direction 15M parent FVG; mark `invalid_parent_15m_fvg_not_confirmed`.
- 5M proof occurs outside the parent FVG context.
- Price accepts through the FVG against the trade before proof.
- No protected 5M stop.
- T1/T2 already reached before proof.

### 15M FVG Failure / Breakdown Continuation

A 15M FVG or support/resistance zone fails. Price accepts through that FVG against the original side, then a pullback/rejection into the failed area or aligned 5M structure gives completed 5M proof for continuation in the failure direction.

Required facts:
- Valid 15M parent FVG exists.
- Price accepts through the parent FVG against the original side.
- Pullback/rejection into the failed FVG or aligned nested 5M area occurs.
- Completed 5M proof confirms continuation in the failure direction.
- Stop is nearest protected 5M structure.
- T1/T2 are calculated from actual risk.

Invalidation:
- No valid 15M parent FVG.
- No acceptance/failure through the parent area.
- No completed 5M rejection/continuation proof.
- Price has already delivered the target room before proof.

### 15M FVG Stack Defense Continuation

In a directional move, do not inventory every FVG. Inventory only the active 15M fair value gap battle zones from the displacement leg:

- First reaction zone: the first meaningful 15M FVG price returns into after displacement. A clean defense here means the move is strong.
- Final battle zone: if price accepts through the first reaction zone, the final/deepest same-side 15M FVG becomes the last defense area. If this zone defends, continuation remains valid. If it fails, the original structure is suspect.
- Middle FVG clutter is ignored unless the user explicitly promotes a specific zone during chart review.

Required facts:
- HTF/15M story supports continuation or shows no accepted reversal.
- A same-side 15M FVG battle-zone inventory exists.
- The first reaction 15M FVG either defends or fails cleanly.
- If the first reaction FVG fails, the final/deepest same-side 15M FVG battle zone defends.
- Completed 5M proof confirms continuation in the original direction.
- Entry, nearest protected 5M stop, T1, and T2 are known.

Invalidation:
- No valid 15M FVG battle-zone inventory.
- Price accepts through the final defended FVG.
- Opposite side has completed 5M proof after acceptance through the final defended FVG.
- No protected 5M stop.
- Target room is gone before proof.

Anti-drift:
- Do not classify a late opposite-side row against a defended final 15M FVG stack.
- Opposite side requires accepted break through the final defended FVG plus completed 5M proof.
- Do not promote a later same-side row as the primary setup when the 15M story
  already produced an earlier final battle-zone defense and completed 5M proof.

### Balanced Path To Liquidity / Open FVG Objective

If price breaks out of a balanced/rebalanced range and no defended opposing FVG appears before the next real-liquidity draw or separately labeled open-FVG objective, the move can travel cleanly through that path. This supports continuation and runner management only after a valid FVG proof already exists.

Required facts:
- Candidate already passed the 15M parent plus completed 5M proof workflow.
- First real-liquidity draw or separately labeled open-FVG objective is ahead.
- FVG objectives are tracked separately from real liquidity.
- The path between entry and objective is balanced/rebalanced.
- No opposing FVG/HTF obstacle defends before delivery.

Invalidation:
- Balanced path is used as a standalone trigger.
- FVG/objective zones are mislabeled as liquidity.
- Opposing FVG or HTF obstacle defends before delivery.
- Objective was already reached before entry.

### Opposing FVG Obstacle Before T1

Before scoring continuation, check for a defended opposing FVG or HTF reaction zone between entry and T1. If that obstacle defends before liquidity or tactical target delivery, continuation is downgraded or failed.

Required facts:
- Opposing FVG/HTF reaction zone is between entry and T1.
- Price reaches that area after proof.
- Reaction/defense is observed before T1 or before the intended first objective.

Meaning:
- FVG obstacles take priority over a simple liquidity ladder.
- Liquidity target remains useful, but it does not override a defended opposing FVG.

### Management Continuation After First Campaign

After the first valid same-direction FVG campaign in a drive, later same-direction FVG proof is management or add-on context by default. It is not a new primary model trade unless an explicit reset/add-on rule has been approved.

Required facts:
- First same-direction FVG campaign already exists in the active drive.
- Later same-direction FVG proof appears before a clean reset.
- Later trade path reaches an older opposing FVG/HTF reaction area before full tactical target delivery.
- That older opposing FVG/HTF reaction area defends.

Meaning:
- The later row can explain continuation, partial management, or add-on context.
- It must not be promoted as a fresh standalone model trade by default.
- If the defended older FVG blocks full delivery before T1/T2, record the defended FVG as the reason management was required.

## Anti-Drift Language

- Do not call FVG/objective zones liquidity. Real liquidity means prior swing liquidity, session high/low liquidity, or equal high/low liquidity.
- Do not promote a row without a valid 15M parent FVG.
- Do not drift the parent timestamp forward. Parent means the 15M FVG creation/formation time, not the later continuation or confirmation candle.
- Do not promote defended-first continuation by changing the parent FVG direction. Defended-first is a same-direction timing precedence rule only.
- Do not classify a rule-matching trade as a human-review exception. If it matches the contract, it is rule-based research.
- Do not treat HTF context as execution authority.
- Do not treat balanced path as a trigger.
- Do not begin with raw 5M rows. Start with HTF/15M story, then validate the parent FVG, failed FVG, or FVG stack.
- Do not approve opposite-side trades against a defended final 15M FVG stack unless price accepts through it and completed 5M proof confirms the reversal.
- Do not tag every 15M FVG. For this research lane, track the first reaction zone and final battle zone only.
- If facts are unclear, classify as diagnostic_only until the chart review resolves the missing fact.

## Reviewed Case Bindings

- 2026-01-07: mixed case. Morning long is blocked/downgraded by opposing FVG obstacle before T1. Afternoon short belongs to FVG failure/breakdown diagnostic logic if 5M proof is clean.
- 2026-01-13: valid short case. 12:00 rejection candidate binds to 15M FVG failure/breakdown continuation with balanced path to liquidity. Later wide-risk row is blocked or treated as management context.
- 2026-01-15: valid short case. Trade 1 is the primary campaign. Trade 2 is continuation/management from Trade 1 unless a reset/add-on rule is approved later.
- 2026-01-16: valid Trade 1 only. Other raw rows are rejected because they lack valid 15M parent FVG support.
- 2026-01-20: valid Trade 4 correction. The parent FVG is the 12:45 15M zone around 6983-6991. The 13:00 long-wick bearish candle is continuation/acceptance through that already-created parent, not the parent creation candle.
- 2026-01-20 Trade 6: management continuation short, not a fresh standalone primary trade. The 13:45 candle is the impulse/displacement leg, the 14:00 15M candle confirms the parent FVG, and the older Dec 19 02:15/02:30 15M LONG FVG area around 6940.25-6949.00 defended before full tactical delivery.
- 2026-01-21: valid long case. 9:30 15M parent FVG plus tiny nested 5M FVG/wick defense around 6957 is a rule-based 15M FVG Hold + Nested 5M FVG Defense Continuation.
- 2026-01-22: valid FVG stack defense long story. Late short rows are invalid because price defended the final/lowest 15M bullish FVG in the stack and never accepted below it with clean 5M bearish proof.
- 2026-01-27: valid FVG stack defense long story. Parent/displacement was created at 10:45 ET. Correct entry area is 13:05 ET and completed 5M proof is 13:15 ET. The later 13:30 machine-selected row is management/context, not the primary setup lesson.
- 2026-01-28: invalid prior long candidate. The claimed 11:45 15M parent is not a real same-direction LONG parent FVG for this model; mark it `invalid_parent_15m_fvg_not_confirmed`.
