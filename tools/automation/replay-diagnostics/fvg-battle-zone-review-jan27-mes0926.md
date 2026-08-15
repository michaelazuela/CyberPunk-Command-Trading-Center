# Jan 7 FVG Failure Diagnostic Trace

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-01-27 / full-rth (2026-01-27T09:15:00 to 2026-01-27T16:00:00)
Context window: 120 days (2025-09-29T00:00:00 to 2026-01-28T23:59:59)
Forward target-check horizon: 1 day(s) after the review date

## Coverage
- 5m: 17420 bars (2025-10-28T18:05:00 to 2026-01-28T23:55:00)
- 15m: 5806 bars (2025-10-28T18:15:00 to 2026-01-28T23:45:00)
- 60m: 1423 bars (2025-10-28T19:00:00 to 2026-01-28T23:00:00)
- 120m: 742 bars (2025-10-28T20:00:00 to 2026-01-28T22:00:00)
- 240m: 371 bars (2025-10-28T22:00:00 to 2026-01-28T22:00:00)

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
- Open below: 5m LONG 7106.00-7106.75 created 2026-01-26T21:45:00 status partial_touch; 15m LONG 7101.00-7104.25 created 2026-01-26T21:30:00 status open_untouched; 5m LONG 7102.00-7104.00 created 2026-01-26T21:15:00 status open_untouched; 5m LONG 7100.75-7102.00 created 2026-01-26T21:10:00 status open_untouched; 60m LONG 7096.75-7100.00 created 2026-01-26T22:00:00 status open_untouched; 15m LONG 7097.75-7098.00 created 2026-01-26T20:45:00 status open_untouched; 15m LONG 7070.75-7086.75 created 2026-01-26T10:00:00 status partial_touch; 60m LONG 7065.50-7083.75 created 2026-01-26T11:00:00 status open_untouched; 120m LONG 7057.50-7083.75 created 2026-01-26T12:00:00 status open_untouched; 240m LONG 7063.00-7083.75 created 2026-01-26T14:00:00 status open_untouched
- Failed above: 5m LONG 7107.75-7108.50 created 2026-01-13T22:10:00 status failed_inverted; 5m SHORT 7107.75-7109.25 created 2026-01-16T07:00:00 status failed_inverted; 15m LONG 7107.75-7110.00 created 2026-01-13T22:30:00 status failed_inverted; 15m LONG 7107.75-7108.75 created 2026-01-26T22:15:00 status failed_inverted; 240m SHORT 7107.75-7109.50 created 2026-01-16T14:00:00 status failed_inverted; 5m LONG 7108.00-7108.75 created 2025-10-29T12:25:00 status failed_inverted; 5m LONG 7108.00-7110.00 created 2026-01-12T10:00:00 status failed_inverted; 15m SHORT 7108.00-7110.75 created 2026-01-11T19:30:00 status failed_inverted; 15m SHORT 7108.00-7109.75 created 2026-01-13T23:30:00 status failed_inverted; 15m LONG 7108.00-7109.00 created 2026-01-15T21:45:00 status failed_inverted
- Open above: 15m SHORT 7111.75-7114.00 created 2026-01-27T07:30:00 status partial_touch; 5m SHORT 7112.50-7114.00 created 2026-01-27T07:10:00 status open_untouched; 15m SHORT 7120.25-7121.50 created 2026-01-15T14:30:00 status open_untouched; 15m SHORT 7122.25-7123.25 created 2026-01-15T14:15:00 status open_untouched; 15m SHORT 7127.75-7130.75 created 2026-01-13T10:00:00 status partial_touch

## Trace Rows

### 1. LONG 15M FVG 7109.50-7110.75 created 2026-01-27T10:15:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-27T10:00:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-01-27T10:00:00
- Parent failure: not found
- First 5M return: not found
- 5M wick defense: none
- Proof: none
- Entry/stop/risk: N/A / N/A / N/A pts
- T1/T2: N/A / N/A
- Nearest liquidity: N/A
- Opposing FVG obstacle before T1: none before T1
- Opposing FVG reaction: none
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7109.50-7110.75 created 2026-01-27T10:15:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7109.50-7110.75 created 2026-01-27T10:15:00 untested_by_15m
- 5M defense of active 15M zone: not_returned; return none; wick none; proof none; 5M did not return into the selected 15M battle zone before the session ended.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not produce a completed research plan with entry, stop, and targets.
- Open FVGs below at proof: none
- Failed FVGs above at proof: none
- Open FVGs above at proof: none
- Objective ladder: none
- Story: No completed proof, so no trade story is formed.
- Outcome: NoEntry, one MES +$0.00
- Managed outcome: NoEntry, exit N/A, one MES +$0.00
- Reasons: No 15M acceptance through the parent FVG was found inside this session window. After the parent failure, 5M did not return into the failed 15M FVG zone. No completed 5M wick-defense candle was found inside the failed FVG zone. No completed 5M continuation close away from the failed FVG zone was found after the return. Selected 15M battle zone did not receive completed 5M defense confirmation.

### 2. LONG 15M FVG 7120.00-7123.25 created 2026-01-27T11:00:00
- Verdict: valid_trace_candidate
- Continuation read: obstacle_before_t1_manage_or_downgrade
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-27T10:45:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-01-27T13:00:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-27T13:00:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-01-27T13:30:00, 2026-01-27T14:10:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-01-27T13:30:00. | PASS entry_stop_risk_contract: Entry 7123.75, protected 5M stop 7114.75, risk 9.00 pts. | PASS tactical_targets_from_actual_risk: T1 7137.25 and T2 7141.75 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7124.00.
- Parent displacement: yes
- Parent displacement candle: 2026-01-27T10:45:00
- Parent failure: 2026-01-27T13:00:00
- First 5M return: 2026-01-27T13:00:00
- 5M wick defense: 2026-01-27T13:30:00, 2026-01-27T14:10:00
- Proof: 2026-01-27T13:30:00
- Entry/stop/risk: 7123.75 / 7114.75 / 9.00 pts
- T1/T2: 7137.25 / 7141.75
- Nearest liquidity: nearest prior high liquidity 7124.00
- Opposing FVG obstacle before T1: 5m LONG 7124.25-7125.50 created 2026-01-12T13:10:00 status failed_inverted
- Opposing FVG reaction: obstacle_reached_then_continued at 2026-01-27T13:35:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7109.50-7110.75 created 2026-01-27T10:15:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7109.50-7110.75 created 2026-01-27T10:15:00 untested_by_15m
- 5M defense of active 15M zone: confirmed_defense; return 2026-01-27T11:00:00; wick 2026-01-27T11:00:00; proof 2026-01-27T11:00:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: 7131.00 (prior 5M swing high liquidity from 2026-01-27T11:20:00)
- Balanced path to liquidity: not_balanced_path_to_liquidity - The near liquidity objective sat in the path but was not reached during the replay window.
- Open FVGs below at proof: 5m LONG 7120.25-7122.25 created 2026-01-27T13:25:00 status partial_touch; 5m LONG 7117.50-7119.50 created 2026-01-27T13:20:00 status open_untouched; 15m LONG 7109.50-7110.75 created 2026-01-27T10:15:00 status open_untouched; 5m LONG 7109.50-7110.25 created 2026-01-27T09:55:00 status open_untouched; 120m LONG 7096.75-7108.75 created 2026-01-27T00:00:00 status partial_touch; 5m LONG 7100.75-7102.00 created 2026-01-26T21:10:00 status partial_touch; 60m LONG 7096.75-7100.00 created 2026-01-26T22:00:00 status open_untouched; 15m LONG 7097.75-7098.00 created 2026-01-26T20:45:00 status open_untouched
- Failed FVGs above at proof: 5m LONG 7124.25-7125.50 created 2026-01-12T13:10:00 status failed_inverted; 5m LONG 7124.25-7124.50 created 2026-01-13T01:55:00 status failed_inverted; 15m LONG 7124.25-7125.00 created 2026-01-12T13:30:00 status failed_inverted; 60m LONG 7125.00-7126.25 created 2026-01-12T15:00:00 status failed_inverted; 5m SHORT 7125.25-7125.50 created 2026-01-12T17:00:00 status failed_inverted; 15m LONG 7125.25-7125.75 created 2026-01-27T11:15:00 status failed_inverted; 120m LONG 7125.25-7126.25 created 2026-01-12T16:00:00 status failed_inverted; 5m LONG 7126.00-7127.50 created 2026-01-09T14:55:00 status failed_inverted
- Open FVGs above at proof: none
- Objective ladder: liquidity 7127.00 reached 2026-01-27T13:35:00 (prior 5M swing high liquidity from 2026-01-27T12:30:00); liquidity 7127.50 reached 2026-01-27T14:00:00 (prior 5M swing high liquidity from 2026-01-27T10:50:00); liquidity 7131.00 not reached (prior 5M swing high liquidity from 2026-01-27T11:20:00); liquidity 7131.50 not reached (prior 5M swing high liquidity from 2026-01-27T11:45:00); session_extreme 7131.50 not reached (RTH high liquidity before proof); tactical 7137.25 not reached (T1 1.5R); tactical 7141.75 not reached (T2 2.0R)
- Story: LONG proof completed at 2026-01-27T13:30:00 from 7120.00-7123.25. 8 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Opposing FVG obstacle before T1: 5m 7124.25-7125.50 with reaction obstacle_reached_then_continued. Structural objectives reached after proof: 7127.00 liquidity, 7127.50 liquidity. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-01-27T19:40:00, one MES +$67.50
- Managed outcome: LQ1 at 2026-01-27T19:25:00, exit 7131.00, one MES +$36.25
- Reasons: Qualified by this diagnostic heuristic.

### 3. LONG 15M FVG 7125.25-7125.75 created 2026-01-27T11:15:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: obstacle_before_t1_manage_or_downgrade
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-27T10:45:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-01-27T12:15:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-27T12:15:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-01-27T13:30:00, 2026-01-27T14:10:00, 2026-01-27T15:35:00, 2026-01-27T15:45:00, 2026-01-27T15:50:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-01-27T13:55:00. | PASS entry_stop_risk_contract: Entry 7126.00, protected 5M stop 7122.75, risk 3.25 pts. | PASS tactical_targets_from_actual_risk: T1 7131.00 and T2 7132.50 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7126.25. | FAIL first_valid_same_parent_proof: Earlier same-side completed 5M proof from the same parent displacement already completed at 2026-01-27T13:30:00. Later same-parent rows are management/re-entry context unless a reset rule is explicitly approved.
- Parent displacement: yes
- Parent displacement candle: 2026-01-27T10:45:00
- Parent failure: 2026-01-27T12:15:00
- First 5M return: 2026-01-27T12:15:00
- 5M wick defense: 2026-01-27T13:30:00, 2026-01-27T14:10:00, 2026-01-27T15:35:00, 2026-01-27T15:45:00, 2026-01-27T15:50:00
- Proof: 2026-01-27T13:55:00
- Entry/stop/risk: 7126.00 / 7122.75 / 3.25 pts
- T1/T2: 7131.00 / 7132.50
- Nearest liquidity: nearest prior high liquidity 7126.25
- Opposing FVG obstacle before T1: 5m SHORT 7126.25-7126.75 created 2026-01-09T15:45:00 status failed_inverted
- Opposing FVG reaction: obstacle_reached_then_continued at 2026-01-27T14:00:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7109.50-7110.75 created 2026-01-27T10:15:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7109.50-7110.75 created 2026-01-27T10:15:00 untested_by_15m
- 5M defense of active 15M zone: confirmed_defense; return 2026-01-27T12:00:00; wick 2026-01-27T15:35:00; proof 2026-01-27T15:35:00; 5M returned into the active 15M battle zone, rejected it, and closed back in the continuation direction.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: no_liquidity_target - No meaningful real-liquidity target was found between entry and T1.
- Open FVGs below at proof: 15m LONG 7120.25-7122.75 created 2026-01-27T13:45:00 status open_untouched; 5m LONG 7120.25-7122.25 created 2026-01-27T13:25:00 status partial_touch; 5m LONG 7117.50-7119.50 created 2026-01-27T13:20:00 status open_untouched; 15m LONG 7109.50-7110.75 created 2026-01-27T10:15:00 status open_untouched; 5m LONG 7109.50-7110.25 created 2026-01-27T09:55:00 status open_untouched; 120m LONG 7096.75-7108.75 created 2026-01-27T00:00:00 status partial_touch; 5m LONG 7100.75-7102.00 created 2026-01-26T21:10:00 status partial_touch; 60m LONG 7096.75-7100.00 created 2026-01-26T22:00:00 status open_untouched
- Failed FVGs above at proof: 5m SHORT 7126.25-7126.75 created 2026-01-09T15:45:00 status failed_inverted; 5m SHORT 7126.25-7127.50 created 2026-01-15T12:20:00 status failed_inverted; 5m LONG 7127.00-7127.50 created 2026-01-15T12:10:00 status failed_inverted; 15m SHORT 7127.00-7129.50 created 2026-01-12T18:15:00 status failed_inverted; 60m SHORT 7127.00-7128.50 created 2026-01-12T19:00:00 status failed_inverted; 5m SHORT 7127.75-7129.50 created 2026-01-13T09:50:00 status failed_inverted; 5m LONG 7129.00-7129.50 created 2026-01-12T16:30:00 status failed_inverted; 5m LONG 7131.00-7132.00 created 2026-01-12T14:40:00 status failed_inverted
- Open FVGs above at proof: none
- Objective ladder: liquidity 7127.00 reached 2026-01-27T14:00:00 (prior 5M swing high liquidity from 2026-01-27T12:30:00); liquidity 7127.25 reached 2026-01-27T14:00:00 (prior 5M swing high liquidity from 2026-01-27T13:35:00); liquidity 7127.50 reached 2026-01-27T14:00:00 (prior 5M swing high liquidity from 2026-01-27T10:50:00); tactical 7131.00 not reached (T1 1.5R); liquidity 7131.00 not reached (prior 5M swing high liquidity from 2026-01-27T11:20:00); liquidity 7131.50 not reached (prior 5M swing high liquidity from 2026-01-27T11:45:00); session_extreme 7131.50 not reached (RTH high liquidity before proof); tactical 7132.50 not reached (T2 2.0R)
- Story: LONG proof completed at 2026-01-27T13:55:00 from 7125.25-7125.75. 8 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Opposing FVG obstacle before T1: 5m 7126.25-7126.75 with reaction obstacle_reached_then_continued. Structural objectives reached after proof: 7127.00 liquidity, 7127.25 liquidity, 7127.50 liquidity. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: Stop at 2026-01-27T15:55:00, one MES $-16.25
- Managed outcome: Stop at 2026-01-27T15:55:00, exit 7122.75, one MES $-16.25
- Reasons: Late same-parent FVG continuation blocked. Earlier same-side completed 5M proof from the same parent displacement already completed at 2026-01-27T13:30:00. Later same-parent rows are management/re-entry context unless a reset rule is explicitly approved.

### 4. SHORT 15M FVG 7120.25-7121.25 created 2026-01-27T13:15:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: FAIL 15m_parent_displacement: 15M FVG exists, but no candle in the three-candle FVG formation passed the displacement heuristic. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-01-27T13:30:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-27T16:00:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-01-27T16:00:00. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: no
- Parent displacement candle: none
- Parent failure: 2026-01-27T13:30:00
- First 5M return: 2026-01-27T16:00:00
- 5M wick defense: 2026-01-27T16:00:00
- Proof: none
- Entry/stop/risk: N/A / N/A / N/A pts
- T1/T2: N/A / N/A
- Nearest liquidity: N/A
- Opposing FVG obstacle before T1: none before T1
- Opposing FVG reaction: none
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: first_reaction_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7120.25-7121.25 created 2026-01-27T13:15:00 failed_acceptance_through_15m failed 2026-01-27T13:30:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7120.25-7121.25 created 2026-01-27T13:15:00 failed_acceptance_through_15m failed 2026-01-27T13:30:00
- 5M defense of active 15M zone: accepted_through_zone; return 2026-01-27T13:15:00; wick none; proof none; 5M returned into the active 15M battle zone but accepted through it at 2026-01-27T13:20:00.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not produce a completed research plan with entry, stop, and targets.
- Open FVGs below at proof: none
- Failed FVGs above at proof: none
- Open FVGs above at proof: none
- Objective ladder: none
- Story: No completed proof, so no trade story is formed.
- Outcome: NoEntry, one MES +$0.00
- Managed outcome: NoEntry, exit N/A, one MES +$0.00
- Reasons: 15M parent FVG exists, but no candle in the three-candle FVG formation is strong displacement by the current heuristic. No completed 5M continuation close away from the failed FVG zone was found after the return. Selected 15M battle zone did not receive completed 5M defense confirmation.

### 5. LONG 15M FVG 7120.25-7122.75 created 2026-01-27T13:45:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-27T13:30:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-27T13:45:00. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-01-27T13:45:00. | PASS entry_stop_risk_contract: Entry 7123.50, protected 5M stop 7114.75, risk 8.75 pts. | PASS tactical_targets_from_actual_risk: T1 7136.75 and T2 7141.00 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7123.75.
- Parent displacement: yes
- Parent displacement candle: 2026-01-27T13:30:00
- Parent failure: not found
- First 5M return: 2026-01-27T13:45:00
- 5M wick defense: none
- Proof: 2026-01-27T13:45:00
- Entry/stop/risk: 7123.50 / 7114.75 / 8.75 pts
- T1/T2: 7136.75 / 7141.00
- Nearest liquidity: nearest prior high liquidity 7123.75
- Opposing FVG obstacle before T1: 5m LONG 7124.25-7125.50 created 2026-01-12T13:10:00 status failed_inverted
- Opposing FVG reaction: obstacle_reached_then_continued at 2026-01-27T13:50:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: latest_active_leg_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7109.50-7110.75 created 2026-01-27T10:15:00 untested_by_15m
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7109.50-7110.75 created 2026-01-27T10:15:00 untested_by_15m
- 5M defense of active 15M zone: returned_no_confirmation; return 2026-01-27T13:45:00; wick none; proof none; 5M returned into the active 15M battle zone, but completed continuation proof was not found.
- Meaningful liquidity target before T1: 7131.00 (prior 5M swing high liquidity from 2026-01-27T11:20:00)
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not pass the clean completed-plan workflow, so balanced-path context stays diagnostic only.
- Open FVGs below at proof: 15m LONG 7120.25-7122.75 created 2026-01-27T13:45:00 status open_untouched; 5m LONG 7120.25-7122.25 created 2026-01-27T13:25:00 status partial_touch; 5m LONG 7117.50-7119.50 created 2026-01-27T13:20:00 status open_untouched; 15m LONG 7109.50-7110.75 created 2026-01-27T10:15:00 status open_untouched; 5m LONG 7109.50-7110.25 created 2026-01-27T09:55:00 status open_untouched; 120m LONG 7096.75-7108.75 created 2026-01-27T00:00:00 status partial_touch; 5m LONG 7100.75-7102.00 created 2026-01-26T21:10:00 status partial_touch; 60m LONG 7096.75-7100.00 created 2026-01-26T22:00:00 status open_untouched
- Failed FVGs above at proof: 5m LONG 7124.25-7125.50 created 2026-01-12T13:10:00 status failed_inverted; 5m LONG 7124.25-7124.50 created 2026-01-13T01:55:00 status failed_inverted; 15m LONG 7124.25-7125.00 created 2026-01-12T13:30:00 status failed_inverted; 60m LONG 7125.00-7126.25 created 2026-01-12T15:00:00 status failed_inverted; 5m SHORT 7125.25-7125.50 created 2026-01-12T17:00:00 status failed_inverted; 15m LONG 7125.25-7125.75 created 2026-01-27T11:15:00 status failed_inverted; 120m LONG 7125.25-7126.25 created 2026-01-12T16:00:00 status failed_inverted; 5m LONG 7126.00-7127.50 created 2026-01-09T14:55:00 status failed_inverted
- Open FVGs above at proof: none
- Objective ladder: liquidity 7127.00 reached 2026-01-27T14:00:00 (prior 5M swing high liquidity from 2026-01-27T12:30:00); liquidity 7127.50 reached 2026-01-27T14:00:00 (prior 5M swing high liquidity from 2026-01-27T10:50:00); liquidity 7131.00 not reached (prior 5M swing high liquidity from 2026-01-27T11:20:00); liquidity 7131.50 not reached (prior 5M swing high liquidity from 2026-01-27T11:45:00); session_extreme 7131.50 not reached (RTH high liquidity before proof); tactical 7136.75 not reached (T1 1.5R); tactical 7141.00 not reached (T2 2.0R)
- Story: LONG proof completed at 2026-01-27T13:45:00 from 7120.25-7122.75. 8 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Opposing FVG obstacle before T1: 5m 7124.25-7125.50 with reaction obstacle_reached_then_continued. Structural objectives reached after proof: 7127.00 liquidity, 7127.50 liquidity. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-01-27T19:40:00, one MES +$66.25
- Managed outcome: LQ1 at 2026-01-27T19:25:00, exit 7131.00, one MES +$37.50
- Reasons: No 15M acceptance through the parent FVG was found inside this session window. No completed 5M wick-defense candle was found inside the failed FVG zone. Selected 15M battle zone did not receive completed 5M defense confirmation.
