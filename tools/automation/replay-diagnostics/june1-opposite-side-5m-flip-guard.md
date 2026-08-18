# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26 (requested MES)
Date/session: 2026-06-01 / morning (2026-06-01T09:15:00 to 2026-06-01T12:00:00)
Context window: 120 days (2026-02-01T00:00:00 to 2026-06-01T23:59:59)
Forward target-check horizon: 0 day(s) after the review date

## Coverage
- 5m: 23618 bars (2026-02-01T18:05:00 to 2026-06-01T23:55:00)
- 15m: 7874 bars (2026-02-01T18:15:00 to 2026-06-01T23:45:00)
- 60m: 1954 bars (2026-02-01T19:00:00 to 2026-06-01T23:00:00)
- 120m: 1020 bars (2026-02-01T20:00:00 to 2026-06-01T22:00:00)
- 240m: 516 bars (2026-02-01T22:00:00 to 2026-06-01T22:00:00)

## Research Tags
- none

## Research Rules
- FvgBattleZoneInventory (research_only_supporting_rule): Track only the first same-side 15M FVG reaction zone, the final/deepest same-side 15M FVG battle zone, and the latest active-session same-side 15M FVG from the active displacement leg. The selected 15M battle zone must then be defended on completed 5M candles before any entry model can use it.
  - Required facts: 15M-only inventory for this research rule. | Same-side active-session 15M displacement leg creates the candidate FVG stack. | First same-side 15M FVG is the first reaction zone. | Final/deepest same-side 15M FVG is the structure survival battle zone if the first zone fails. | Latest same-side 15M FVG in the active session can be a valid active-leg battle zone when it is defended by 5M proof. | 5M confirms only after price returns into the selected 15M battle zone and rejects it.
  - Invalidation: Every 15M FVG is tagged as equal importance. | Middle-zone clutter is promoted over first reaction or final/deepest battle-zone roles. | 5M confirmation is used before the 15M battle zone is selected. | The selected 15M battle zone accepts through against the intended direction.
  - Standalone trigger: no
- FvgBalancedPathContinuation (research_only_supporting_rule): If price breaks out of a balanced/rebalanced range and no defended opposing FVG appears before the next real-liquidity or open-FVG objective, the move can travel cleanly through that path. This supports continuation and runner management after a valid FVG proof already exists.
  - Required facts: 15M parent FVG setup is valid. | Completed 5M wick-defense/proof exists. | Nearest protected 5M structure stop is known. | Objective ladder has a real liquidity or open-FVG objective ahead. | No opposing FVG/HTF obstacle defends before that objective.
  - Invalidation: Used without 15M parent FVG plus completed 5M proof. | Opposing FVG/HTF obstacle defends before the objective. | The objective was already reached before entry. | Balanced path is treated as a standalone trigger.
  - Standalone trigger: no

## FVG Inventory At Session Start
- Open below: 5m LONG 7640.75-7642.00 parent 2026-05-28T23:05:00 confirmed 2026-05-28T23:10:00 status partial_touch; 240m LONG 7607.50-7638.75 parent 2026-05-28T14:00:00 confirmed 2026-05-28T17:00:00 status partial_touch; 120m LONG 7607.50-7634.25 parent 2026-05-28T12:00:00 confirmed 2026-05-28T14:00:00 status open_untouched; 5m LONG 7633.25-7634.00 parent 2026-05-28T11:25:00 confirmed 2026-05-28T11:30:00 status open_untouched; 5m LONG 7626.50-7632.00 parent 2026-05-28T11:05:00 confirmed 2026-05-28T11:10:00 status partial_touch; 15m LONG 7627.00-7628.50 parent 2026-05-28T11:15:00 confirmed 2026-05-28T11:30:00 status open_untouched; 60m LONG 7607.50-7625.00 parent 2026-05-28T11:00:00 confirmed 2026-05-28T12:00:00 status open_untouched; 5m LONG 7603.75-7619.00 parent 2026-05-28T10:15:00 confirmed 2026-05-28T10:20:00 status partial_touch; 15m LONG 7600.75-7616.75 parent 2026-05-28T10:15:00 confirmed 2026-05-28T10:30:00 status partial_touch; 120m LONG 7558.50-7598.50 parent 2026-05-24T20:00:00 confirmed 2026-05-24T22:00:00 status partial_touch
- Failed above: 5m SHORT 7652.50-7653.00 parent 2026-05-29T03:20:00 confirmed 2026-05-29T03:25:00 status failed_inverted; 5m LONG 7652.50-7653.50 parent 2026-05-29T08:55:00 confirmed 2026-05-29T09:00:00 status failed_inverted; 5m SHORT 7652.75-7653.25 parent 2026-05-29T08:35:00 confirmed 2026-05-29T08:40:00 status failed_inverted; 5m SHORT 7652.75-7653.00 parent 2026-05-31T18:05:00 confirmed 2026-05-31T18:10:00 status failed_inverted; 5m LONG 7652.75-7656.00 parent 2026-05-31T18:15:00 confirmed 2026-05-31T18:20:00 status failed_inverted; 5m SHORT 7653.00-7653.75 parent 2026-05-29T09:15:00 confirmed 2026-05-29T09:20:00 status failed_inverted; 5m LONG 7653.25-7655.75 parent 2026-05-29T15:10:00 confirmed 2026-05-29T15:15:00 status failed_inverted; 5m LONG 7653.50-7654.25 parent 2026-05-29T07:45:00 confirmed 2026-05-29T07:50:00 status failed_inverted; 5m LONG 7653.50-7654.50 parent 2026-05-29T14:25:00 confirmed 2026-05-29T14:30:00 status failed_inverted; 5m SHORT 7653.75-7656.25 parent 2026-05-29T10:40:00 confirmed 2026-05-29T10:45:00 status failed_inverted
- Open above: 60m LONG 7666.75-7668.00 parent 2026-05-31T20:00:00 confirmed 2026-05-31T21:00:00 status open_untouched; 5m SHORT 7673.75-7675.50 parent 2026-06-01T08:55:00 confirmed 2026-06-01T09:00:00 status open_untouched; 5m SHORT 7679.00-7680.75 parent 2026-06-01T07:55:00 confirmed 2026-06-01T08:00:00 status partial_touch

## Review Order
- Primary campaign to review first: SHORT proof 2026-06-01T12:00:00 from 15M parent 2026-06-01T09:15:00 confirmed 2026-06-01T09:30:00.
- Defended-area management context: 15m LONG 7655.75-7658.50 is a callout before/near T1, not an issue by itself.
- Later rows: 1 secondary idea(s). They cannot lead the story unless the primary campaign is resolved and a separate reset is proven.

## Trace Rows

### 1. SHORT 15M FVG 7660.25-7671.50 parent 2026-06-01T09:15:00 confirmed 2026-06-01T09:30:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-01T09:15:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-01T11:35:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-06-01T11:55:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-06-01T12:00:00. | PASS entry_stop_risk_contract: Entry 7659.00, protected 5M stop 7679.25, risk 20.25 pts. | PASS tactical_targets_from_actual_risk: T1 7628.75 and T2 7618.50 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7658.75.
- Parent displacement: yes
- Parent displacement candle: 2026-06-01T09:15:00
- Parent failure: not found
- First 5M return: 2026-06-01T11:35:00
- 5M wick defense: 2026-06-01T11:55:00
- Proof: 2026-06-01T12:00:00
- Entry/stop/risk: 7659.00 / 7679.25 / 20.25 pts
- T1/T2: 7628.75 / 7618.50
- Nearest liquidity: nearest prior low liquidity 7658.75
- Defended-area / obstacle management callout before or near T1: 15m LONG 7655.75-7658.50 parent 2026-06-01T11:45:00 confirmed 2026-06-01T12:00:00 status open_untouched
- Defended-area reaction: obstacle_defended_management_callout at 2026-06-01T12:10:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7660.25-7671.50 parent 2026-06-01T09:15:00 confirmed 2026-06-01T09:30:00 defended_on_15m defended 2026-06-01T12:00:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7660.25-7671.50 parent 2026-06-01T09:15:00 confirmed 2026-06-01T09:30:00 defended_on_15m defended 2026-06-01T12:00:00
- 5M defense of active 15M zone: confirmed_defense; return 2026-06-01T11:35:00; wick 2026-06-01T11:55:00; proof 2026-06-01T12:00:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7645.50 (prior 5M swing low liquidity from 2026-06-01T10:05:00)
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not pass the clean completed-plan workflow, so balanced-path context stays diagnostic only.
- Open FVGs below at proof: 15m LONG 7655.75-7658.50 parent 2026-06-01T11:45:00 confirmed 2026-06-01T12:00:00 status open_untouched; 240m LONG 7607.50-7638.75 parent 2026-05-28T14:00:00 confirmed 2026-05-28T17:00:00 status partial_touch; 120m LONG 7607.50-7634.25 parent 2026-05-28T12:00:00 confirmed 2026-05-28T14:00:00 status open_untouched; 5m LONG 7633.25-7634.00 parent 2026-05-28T11:25:00 confirmed 2026-05-28T11:30:00 status open_untouched; 5m LONG 7626.50-7632.00 parent 2026-05-28T11:05:00 confirmed 2026-05-28T11:10:00 status partial_touch; 15m LONG 7627.00-7628.50 parent 2026-05-28T11:15:00 confirmed 2026-05-28T11:30:00 status open_untouched; 60m LONG 7607.50-7625.00 parent 2026-05-28T11:00:00 confirmed 2026-05-28T12:00:00 status open_untouched; 5m LONG 7603.75-7619.00 parent 2026-05-28T10:15:00 confirmed 2026-05-28T10:20:00 status partial_touch
- Failed FVGs above at proof: 15m LONG 7659.25-7662.50 parent 2026-05-29T15:30:00 confirmed 2026-05-29T15:45:00 status failed_inverted; 5m LONG 7660.25-7662.50 parent 2026-05-29T15:30:00 confirmed 2026-05-29T15:35:00 status failed_inverted; 5m SHORT 7660.75-7661.00 parent 2026-05-29T13:25:00 confirmed 2026-05-29T13:30:00 status failed_inverted; 15m LONG 7661.00-7663.25 parent 2026-05-31T18:45:00 confirmed 2026-05-31T19:00:00 status failed_inverted; 5m LONG 7661.25-7662.25 parent 2026-05-29T12:05:00 confirmed 2026-05-29T12:10:00 status failed_inverted; 5m LONG 7661.25-7663.25 parent 2026-05-31T18:45:00 confirmed 2026-05-31T18:50:00 status failed_inverted; 5m LONG 7661.75-7662.50 parent 2026-05-29T11:15:00 confirmed 2026-05-29T11:20:00 status failed_inverted; 5m LONG 7662.25-7667.25 parent 2026-05-29T09:45:00 confirmed 2026-05-29T09:50:00 status failed_inverted
- Open FVGs above at proof: 60m SHORT 7659.75-7669.75 parent 2026-06-01T10:00:00 confirmed 2026-06-01T11:00:00 status partial_touch; 5m SHORT 7660.25-7668.75 parent 2026-06-01T09:15:00 confirmed 2026-06-01T09:20:00 status partial_touch; 15m SHORT 7660.25-7671.50 parent 2026-06-01T09:15:00 confirmed 2026-06-01T09:30:00 status partial_touch; 120m SHORT 7666.50-7673.50 parent 2026-06-01T10:00:00 confirmed 2026-06-01T12:00:00 status open_untouched; 60m SHORT 7673.50-7677.25 parent 2026-06-01T09:00:00 confirmed 2026-06-01T10:00:00 status open_untouched; 5m SHORT 7673.75-7675.50 parent 2026-06-01T08:55:00 confirmed 2026-06-01T09:00:00 status open_untouched; 5m SHORT 7679.00-7680.75 parent 2026-06-01T07:55:00 confirmed 2026-06-01T08:00:00 status partial_touch
- Objective ladder: open_fvg 7655.75 not reached (15m LONG open FVG open_untouched parent 2026-06-01T11:45:00 confirmed 2026-06-01T12:00:00); liquidity 7645.50 not reached (prior 5M swing low liquidity from 2026-06-01T10:05:00); liquidity 7644.50 not reached (prior 5M swing low liquidity from 2026-06-01T11:00:00); liquidity 7639.50 not reached (prior 5M swing low liquidity from 2026-06-01T09:35:00); session_extreme 7639.50 not reached (RTH low liquidity before proof); open_fvg 7633.25 not reached (5m LONG open FVG open_untouched parent 2026-05-28T11:25:00 confirmed 2026-05-28T11:30:00); tactical 7628.75 not reached (T1 1.5R); open_fvg 7627.00 not reached (15m LONG open FVG open_untouched parent 2026-05-28T11:15:00 confirmed 2026-05-28T11:30:00); open_fvg 7626.50 not reached (5m LONG open FVG partial_touch parent 2026-05-28T11:05:00 confirmed 2026-05-28T11:10:00); tactical 7618.50 not reached (T2 2.0R); open_fvg 7607.50 not reached (240m LONG open FVG partial_touch parent 2026-05-28T14:00:00 confirmed 2026-05-28T17:00:00); open_fvg 7607.50 not reached (120m LONG open FVG open_untouched parent 2026-05-28T12:00:00 confirmed 2026-05-28T14:00:00); open_fvg 7607.50 not reached (60m LONG open FVG open_untouched parent 2026-05-28T11:00:00 confirmed 2026-05-28T12:00:00); open_fvg 7603.75 not reached (5m LONG open FVG partial_touch parent 2026-05-28T10:15:00 confirmed 2026-05-28T10:20:00)
- Story: SHORT proof completed at 2026-06-01T12:00:00 from 7660.25-7671.50. 15 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Defended-area / obstacle management callout before or near T1: 15m 7655.75-7658.50 with reaction obstacle_defended_management_callout. No structural objective beyond tactical targets was reached inside the session window. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-06-01T13:35:00, one MES $-101.25
- Managed outcome: Stop at 2026-06-01T13:35:00, exit 7679.25, one MES $-101.25
- Reasons: Defended-first continuation precedence: SHORT 5M defense proof completed at 2026-06-01T12:00:00 before any later same-zone failure/reversal read. Review the defended continuation before labeling this zone as failure/reversal. Opposite-side 15M FVG confirmed at 2026-06-01T12:00:00 before/same as SHORT proof; original candidate is blocked by the opposite-side 5M flip before proof guard.

### 2. LONG 15M FVG 7655.75-7658.50 parent 2026-06-01T11:45:00 confirmed 2026-06-01T12:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-06-01T11:45:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-06-01T12:00:00. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-06-01T11:45:00
- Parent failure: not found
- First 5M return: 2026-06-01T12:00:00
- 5M wick defense: none
- Proof: none
- Entry/stop/risk: N/A / N/A / N/A pts
- T1/T2: N/A / N/A
- Nearest liquidity: N/A
- Defended-area / obstacle management callout before or near T1: none before T1
- Defended-area reaction: none
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7655.75-7658.50 parent 2026-06-01T11:45:00 confirmed 2026-06-01T12:00:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7655.75-7658.50 parent 2026-06-01T11:45:00 confirmed 2026-06-01T12:00:00 untested_by_15m
- 5M defense of active 15M zone: returned_no_confirmation; return 2026-06-01T12:00:00; wick none; proof none; 5M returned into the active 15M battle zone, but completed continuation proof was not found.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not produce a completed research plan with entry, stop, and targets.
- Open FVGs below at proof: none
- Failed FVGs above at proof: none
- Open FVGs above at proof: none
- Objective ladder: none
- Story: No completed proof, so no trade story is formed.
- Outcome: NoEntry, one MES +$0.00
- Managed outcome: NoEntry, exit N/A, one MES +$0.00
- Reasons: No 15M acceptance through the parent FVG was found inside this session window. No completed 5M wick-defense candle was found inside the failed FVG zone. No completed 5M continuation close away from the failed FVG zone was found after the return. Selected 15M battle zone did not receive completed 5M defense confirmation.
