# Jan 29 FVG Battle Zone Review

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change
Instrument: MES 09-26
Date/session: 2026-01-29 / full-rth (2026-01-29T09:15:00 to 2026-01-29T16:00:00)
Context window: 120 days (2025-10-01T00:00:00 to 2026-01-29T23:59:59)

## Human-Locked Jan 29 Correction

Boundary: research_only_no_live_scanner_discord_or_trading_rule_change

Locked workflow:
- Tell the HTF/15M story first.
- Require a valid same-direction 15M parent before any 5M proof can promote.
- Parent timestamp is the completed 15M displacement/FVG creation event, not a later retest or management candle.
- Proof timestamp is the first completed 5M wick-defense/continuation confirmation after price returns into the valid 15M battle zone.
- Defended-first continuation is reviewed before a later same-zone failure/reversal label.
- Later retests and management candles cannot rewrite the parent/proof.

Locked Jan 29 rows:
- Morning SHORT: valid research candidate. Parent displacement 09:15 ET, 15M FVG print 09:30 ET, first 5M proof/execution 09:35 ET. This is a story-first, same-direction parent setup, not a loose 5M-led read.
- Afternoon LONG: valid research candidate. Parent 12:15 ET, first 5M proof/review anchor 12:55 ET, not 13:25/13:35. T1 around 7110 was hit; T2 is not the locked lesson.

## Coverage
- 5m: 17696 bars (2025-10-28T18:05:00 to 2026-01-29T23:55:00)
- 15m: 5898 bars (2025-10-28T18:15:00 to 2026-01-29T23:45:00)
- 60m: 1446 bars (2025-10-28T19:00:00 to 2026-01-29T23:00:00)
- 120m: 754 bars (2025-10-28T20:00:00 to 2026-01-29T22:00:00)
- 240m: 377 bars (2025-10-28T22:00:00 to 2026-01-29T22:00:00)

## Research Tags
- none

## Research Rules
- FvgBattleZoneInventory (research_only_supporting_rule): Track only the first same-side 15M FVG reaction zone and the final/deepest same-side 15M FVG battle zone from the active displacement leg. The selected 15M battle zone must then be defended on completed 5M candles before any entry model can use it.
  - Required facts: 15M-only inventory for this research rule. | Same-side 15M displacement leg creates the candidate FVG stack. | First same-side 15M FVG is the first reaction zone. | Final/deepest same-side 15M FVG is the structure survival battle zone if the first zone fails. | 5M confirms only after price returns into the selected 15M battle zone and rejects it.
  - Invalidation: Every 15M FVG is tagged as equal importance. | Middle-zone clutter is promoted over first reaction or final/deepest battle-zone roles. | 5M confirmation is used before the 15M battle zone is selected. | The selected 15M battle zone accepts through against the intended direction.
  - Standalone trigger: no
- FvgBalancedPathContinuation (research_only_supporting_rule): If price breaks out of a balanced/rebalanced range and no defended opposing FVG appears before the next real-liquidity or open-FVG objective, the move can travel cleanly through that path. This supports continuation and runner management after a valid FVG proof already exists.
  - Required facts: 15M parent FVG setup is valid. | Completed 5M wick-defense/proof exists. | Nearest protected 5M structure stop is known. | Objective ladder has a real liquidity or open-FVG objective ahead. | No opposing FVG/HTF obstacle defends before that objective.
  - Invalidation: Used without 15M parent FVG plus completed 5M proof. | Opposing FVG/HTF obstacle defends before the objective. | The objective was already reached before entry. | Balanced path is treated as a standalone trigger.
  - Standalone trigger: no

## FVG Inventory At Session Start
- Open below: 60m LONG 7122.50-7125.00 created 2026-01-29T01:00:00 status partial_touch; 120m LONG 7119.00-7125.00 created 2026-01-29T02:00:00 status partial_touch; 15m LONG 7122.25-7124.00 created 2026-01-28T23:45:00 status partial_touch; 5m LONG 7122.25-7123.50 created 2026-01-28T23:25:00 status partial_touch; 60m LONG 7119.00-7120.50 created 2026-01-29T00:00:00 status open_untouched; 60m LONG 7112.75-7115.75 created 2026-01-28T23:00:00 status open_untouched; 15m LONG 7111.50-7115.50 created 2026-01-28T21:45:00 status partial_touch; 5m LONG 7112.00-7114.00 created 2026-01-28T21:30:00 status partial_touch; 15m LONG 7107.75-7109.25 created 2026-01-28T21:30:00 status open_untouched; 15m LONG 7070.75-7086.75 created 2026-01-26T10:00:00 status partial_touch
- Failed above: 5m LONG 7126.50-7127.25 created 2026-01-27T19:15:00 status failed_inverted; 5m SHORT 7126.75-7127.50 created 2026-01-27T15:35:00 status failed_inverted; 5m LONG 7126.75-7128.00 created 2026-01-29T00:00:00 status failed_inverted; 5m LONG 7127.00-7127.50 created 2026-01-15T12:10:00 status failed_inverted; 5m LONG 7127.00-7127.50 created 2026-01-27T14:35:00 status failed_inverted; 5m LONG 7127.00-7127.25 created 2026-01-29T00:25:00 status failed_inverted; 15m SHORT 7127.00-7129.50 created 2026-01-12T18:15:00 status failed_inverted; 60m SHORT 7127.00-7128.50 created 2026-01-12T19:00:00 status failed_inverted; 5m SHORT 7127.50-7127.75 created 2026-01-27T15:30:00 status failed_inverted; 5m SHORT 7127.75-7129.50 created 2026-01-13T09:50:00 status failed_inverted
- Open above: 5m SHORT 7131.50-7134.75 created 2026-01-29T09:10:00 status open_untouched; 15m SHORT 7141.25-7144.50 created 2026-01-28T07:30:00 status partial_touch

## Trace Rows

### 1. SHORT 15M FVG 7129.00-7134.00 created 2026-01-29T09:30:00
- Human lock: valid_research_candidate_morning_short_parent_0915_fvg_0930_proof_0935
- Verdict: valid_research_candidate_human_locked
- Continuation read: valid_morning_short_parent_0915_fvg_0930_proof_0935
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-29T09:15:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-29T09:35:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-01-29T09:35:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-01-29T09:35:00. | PASS entry_stop_risk_contract: Entry 7122.75, protected 5M stop 7139.00, risk 16.25 pts. | PASS tactical_targets_from_actual_risk: T1 7098.50 and T2 7090.25 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7122.50.
- Parent displacement: yes
- Parent displacement candle: 2026-01-29T09:15:00
- Parent failure: not found
- First 5M return: 2026-01-29T09:35:00
- 5M wick defense: 2026-01-29T09:35:00
- Proof: 2026-01-29T09:35:00
- Entry/stop/risk: 7122.75 / 7139.00 / 16.25 pts
- T1/T2: 7098.50 / 7090.25
- Nearest liquidity: nearest prior low liquidity 7122.50
- Opposing FVG obstacle before T1: 60m LONG 7119.00-7120.50 created 2026-01-29T00:00:00 status open_untouched
- Opposing FVG reaction: obstacle_reached_then_continued at 2026-01-29T09:40:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: not_in_battle_inventory
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7134.00-7136.50 created 2026-01-29T05:15:00 failed_acceptance_through_15m defended 2026-01-29T05:45:00 failed 2026-01-29T08:45:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7134.00-7136.50 created 2026-01-29T05:15:00 failed_acceptance_through_15m defended 2026-01-29T05:45:00 failed 2026-01-29T08:45:00
- 5M defense of active 15M zone: not_selected_15m_battle_zone; return none; wick none; proof none; The active 15M FVG is not the first reaction zone or final/deepest battle zone, so 5M defense is diagnostic only and cannot promote this research model.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not pass the clean completed-plan workflow, so balanced-path context stays diagnostic only.
- Open FVGs below at proof: 60m LONG 7119.00-7120.50 created 2026-01-29T00:00:00 status open_untouched; 60m LONG 7112.75-7115.75 created 2026-01-28T23:00:00 status open_untouched; 15m LONG 7111.50-7115.50 created 2026-01-28T21:45:00 status partial_touch; 5m LONG 7112.00-7114.00 created 2026-01-28T21:30:00 status partial_touch; 15m LONG 7107.75-7109.25 created 2026-01-28T21:30:00 status open_untouched; 15m LONG 7070.75-7086.75 created 2026-01-26T10:00:00 status partial_touch; 60m LONG 7065.50-7083.75 created 2026-01-26T11:00:00 status open_untouched; 120m LONG 7057.50-7083.75 created 2026-01-26T12:00:00 status open_untouched
- Failed FVGs above at proof: 5m LONG 7123.00-7124.00 created 2026-01-27T18:10:00 status failed_inverted; 5m LONG 7123.50-7124.50 created 2026-01-13T12:00:00 status failed_inverted; 5m LONG 7123.50-7123.75 created 2026-01-15T13:35:00 status failed_inverted; 5m SHORT 7123.50-7124.50 created 2026-01-27T12:20:00 status failed_inverted; 5m SHORT 7123.50-7123.75 created 2026-01-27T16:00:00 status failed_inverted; 5m SHORT 7123.50-7127.75 created 2026-01-28T18:15:00 status failed_inverted; 5m LONG 7123.75-7124.75 created 2026-01-28T16:25:00 status failed_inverted; 5m LONG 7124.25-7125.50 created 2026-01-12T13:10:00 status failed_inverted
- Open FVGs above at proof: 15m SHORT 7129.00-7134.00 created 2026-01-29T09:30:00 status open_untouched; 5m SHORT 7131.50-7134.75 created 2026-01-29T09:10:00 status partial_touch; 15m SHORT 7141.25-7144.50 created 2026-01-28T07:30:00 status partial_touch
- Objective ladder: open_fvg 7119.00 reached 2026-01-29T09:40:00 (60m LONG open FVG open_untouched created 2026-01-29T00:00:00); open_fvg 7112.75 reached 2026-01-29T09:40:00 (60m LONG open FVG open_untouched created 2026-01-28T23:00:00); open_fvg 7112.00 reached 2026-01-29T09:45:00 (5m LONG open FVG partial_touch created 2026-01-28T21:30:00); open_fvg 7111.50 reached 2026-01-29T09:45:00 (15m LONG open FVG partial_touch created 2026-01-28T21:45:00); open_fvg 7107.75 reached 2026-01-29T09:45:00 (15m LONG open FVG open_untouched created 2026-01-28T21:30:00); tactical 7098.50 reached 2026-01-29T09:45:00 (T1 1.5R); tactical 7090.25 reached 2026-01-29T09:50:00 (T2 2.0R); open_fvg 7070.75 reached 2026-01-29T10:05:00 (15m LONG open FVG partial_touch created 2026-01-26T10:00:00); open_fvg 7065.50 reached 2026-01-29T10:05:00 (60m LONG open FVG open_untouched created 2026-01-26T11:00:00); open_fvg 7057.50 reached 2026-01-29T10:15:00 (120m LONG open FVG open_untouched created 2026-01-26T12:00:00)
- Story: SHORT proof completed at 2026-01-29T09:35:00 from 7129.00-7134.00. 11 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Opposing FVG obstacle before T1: 60m 7119.00-7120.50 with reaction obstacle_reached_then_continued. Structural objectives reached after proof: 7119.00 open_fvg, 7112.75 open_fvg, 7112.00 open_fvg, 7111.50 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-01-29T09:45:00, one MES +$121.25
- Managed outcome: T1 at 2026-01-29T09:45:00, exit 7098.50, one MES +$121.25
- Reasons: No 15M acceptance through the parent FVG was found inside this session window. 15M FVG is middle-zone clutter for this research model; only the first reaction zone or final/deepest battle zone can promote.

### 2. SHORT 15M FVG 7104.00-7125.50 created 2026-01-29T10:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-29T09:45:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-29T16:00:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-01-29T16:00:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-01-29T16:00:00. | PASS entry_stop_risk_contract: Entry 7103.00, protected 5M stop 7134.50, risk 31.50 pts. | PASS tactical_targets_from_actual_risk: T1 7055.75 and T2 7040.00 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior low liquidity 7102.75.
- Parent displacement: yes
- Parent displacement candle: 2026-01-29T09:45:00
- Parent failure: not found
- First 5M return: 2026-01-29T16:00:00
- 5M wick defense: 2026-01-29T16:00:00
- Proof: 2026-01-29T16:00:00
- Entry/stop/risk: 7103.00 / 7134.50 / 31.50 pts
- T1/T2: 7055.75 / 7040.00
- Nearest liquidity: nearest prior low liquidity 7102.75
- Opposing FVG obstacle before T1: 5m LONG 7092.50-7099.25 created 2026-01-29T16:00:00 status open_untouched
- Opposing FVG reaction: obstacle_before_t1_not_reached
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: not_in_battle_inventory
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7134.00-7136.50 created 2026-01-29T05:15:00 failed_acceptance_through_15m defended 2026-01-29T05:45:00 failed 2026-01-29T08:45:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7134.00-7136.50 created 2026-01-29T05:15:00 failed_acceptance_through_15m defended 2026-01-29T05:45:00 failed 2026-01-29T08:45:00
- 5M defense of active 15M zone: not_selected_15m_battle_zone; return none; wick none; proof none; The active 15M FVG is not the first reaction zone or final/deepest battle zone, so 5M defense is diagnostic only and cannot promote this research model.
- Meaningful liquidity target before T1: 7077.25 (prior 5M swing low liquidity from 2026-01-29T15:35:00)
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not pass the clean completed-plan workflow, so balanced-path context stays diagnostic only.
- Open FVGs below at proof: 5m LONG 7092.50-7099.25 created 2026-01-29T16:00:00 status open_untouched; 5m LONG 7092.00-7092.25 created 2026-01-29T15:55:00 status open_untouched; 15m LONG 7083.75-7088.25 created 2026-01-29T16:00:00 status open_untouched; 5m LONG 7083.00-7087.50 created 2026-01-29T15:45:00 status open_untouched; 5m LONG 7063.50-7066.00 created 2026-01-29T13:15:00 status partial_touch; 5m LONG 7057.75-7060.50 created 2026-01-29T13:10:00 status open_untouched; 15m LONG 7039.50-7041.50 created 2026-01-29T11:45:00 status open_untouched; 5m LONG 7021.50-7036.75 created 2026-01-29T11:20:00 status partial_touch
- Failed FVGs above at proof: 15m LONG 7103.25-7103.75 created 2026-01-14T04:30:00 status failed_inverted; 5m SHORT 7103.50-7105.50 created 2026-01-07T14:15:00 status failed_inverted; 5m LONG 7103.75-7104.00 created 2026-01-26T13:35:00 status failed_inverted; 5m LONG 7103.75-7104.00 created 2026-01-26T14:15:00 status failed_inverted; 5m SHORT 7104.00-7105.00 created 2026-01-07T11:30:00 status failed_inverted; 5m SHORT 7104.00-7104.50 created 2026-01-14T00:00:00 status failed_inverted; 120m LONG 7104.00-7105.00 created 2025-10-29T00:00:00 status failed_inverted; 5m LONG 7104.25-7105.00 created 2025-10-28T22:05:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7104.00-7112.75 created 2026-01-29T09:50:00 status partial_touch; 15m SHORT 7104.00-7125.50 created 2026-01-29T10:00:00 status partial_touch; 5m SHORT 7119.50-7120.50 created 2026-01-29T09:45:00 status open_untouched; 5m SHORT 7123.50-7125.50 created 2026-01-29T09:40:00 status open_untouched; 5m SHORT 7131.50-7134.75 created 2026-01-29T09:10:00 status partial_touch; 15m SHORT 7141.25-7144.50 created 2026-01-28T07:30:00 status partial_touch
- Objective ladder: open_fvg 7092.50 not reached (5m LONG open FVG open_untouched created 2026-01-29T16:00:00); open_fvg 7092.00 not reached (5m LONG open FVG open_untouched created 2026-01-29T15:55:00); open_fvg 7083.75 not reached (15m LONG open FVG open_untouched created 2026-01-29T16:00:00); open_fvg 7083.00 not reached (5m LONG open FVG open_untouched created 2026-01-29T15:45:00); liquidity 7077.25 not reached (prior 5M swing low liquidity from 2026-01-29T15:35:00); liquidity 7075.50 not reached (prior 5M swing low liquidity from 2026-01-29T14:35:00); liquidity 7073.75 not reached (prior 5M swing low liquidity from 2026-01-29T15:05:00); liquidity 7065.50 not reached (prior 5M swing low liquidity from 2026-01-29T14:05:00); liquidity 7065.00 not reached (prior 5M swing low liquidity from 2026-01-29T13:35:00); open_fvg 7063.50 not reached (5m LONG open FVG partial_touch created 2026-01-29T13:15:00); open_fvg 7057.75 not reached (5m LONG open FVG open_untouched created 2026-01-29T13:10:00); tactical 7055.75 not reached (T1 1.5R); liquidity 7052.75 not reached (prior 5M swing low liquidity from 2026-01-29T10:15:00); liquidity 7050.00 not reached (prior 5M swing low liquidity from 2026-01-29T13:00:00)
- Story: SHORT proof completed at 2026-01-29T16:00:00 from 7104.00-7125.50. 14 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Opposing FVG obstacle before T1: 5m 7092.50-7099.25 with reaction obstacle_before_t1_not_reached. No structural objective beyond tactical targets was reached inside the session window. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: NoEntry, one MES +$0.00
- Managed outcome: NoEntry, exit N/A, one MES +$0.00
- Reasons: No 15M acceptance through the parent FVG was found inside this session window. 15M FVG is middle-zone clutter for this research model; only the first reaction zone or final/deepest battle zone can promote.

### 3. SHORT 15M FVG 7080.00-7095.25 created 2026-01-29T10:15:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-29T09:45:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-01-29T16:00:00. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-01-29T09:45:00
- Parent failure: 2026-01-29T16:00:00
- First 5M return: not found
- 5M wick defense: none
- Proof: none
- Entry/stop/risk: N/A / N/A / N/A pts
- T1/T2: N/A / N/A
- Nearest liquidity: N/A
- Opposing FVG obstacle before T1: none before T1
- Opposing FVG reaction: none
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: not_in_battle_inventory
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7134.00-7136.50 created 2026-01-29T05:15:00 failed_acceptance_through_15m defended 2026-01-29T05:45:00 failed 2026-01-29T08:45:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7134.00-7136.50 created 2026-01-29T05:15:00 failed_acceptance_through_15m defended 2026-01-29T05:45:00 failed 2026-01-29T08:45:00
- 5M defense of active 15M zone: not_selected_15m_battle_zone; return none; wick none; proof none; The active 15M FVG is not the first reaction zone or final/deepest battle zone, so 5M defense is diagnostic only and cannot promote this research model.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not produce a completed research plan with entry, stop, and targets.
- Open FVGs below at proof: none
- Failed FVGs above at proof: none
- Open FVGs above at proof: none
- Objective ladder: none
- Story: No completed proof, so no trade story is formed.
- Outcome: NoEntry, one MES +$0.00
- Managed outcome: NoEntry, exit N/A, one MES +$0.00
- Reasons: After the parent failure, 5M did not return into the failed 15M FVG zone. No completed 5M wick-defense candle was found inside the failed FVG zone. No completed 5M continuation close away from the failed FVG zone was found after the return. 15M FVG is middle-zone clutter for this research model; only the first reaction zone or final/deepest battle zone can promote.

### 4. SHORT 15M FVG 7071.25-7078.25 created 2026-01-29T10:30:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-29T10:00:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-01-29T14:15:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-29T14:15:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-01-29T14:15:00, 2026-01-29T14:40:00. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-01-29T10:00:00
- Parent failure: 2026-01-29T14:15:00
- First 5M return: 2026-01-29T14:15:00
- 5M wick defense: 2026-01-29T14:15:00, 2026-01-29T14:40:00
- Proof: none
- Entry/stop/risk: N/A / N/A / N/A pts
- T1/T2: N/A / N/A
- Nearest liquidity: N/A
- Opposing FVG obstacle before T1: none before T1
- Opposing FVG reaction: none
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: not_in_battle_inventory
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7134.00-7136.50 created 2026-01-29T05:15:00 failed_acceptance_through_15m defended 2026-01-29T05:45:00 failed 2026-01-29T08:45:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7134.00-7136.50 created 2026-01-29T05:15:00 failed_acceptance_through_15m defended 2026-01-29T05:45:00 failed 2026-01-29T08:45:00
- 5M defense of active 15M zone: not_selected_15m_battle_zone; return none; wick none; proof none; The active 15M FVG is not the first reaction zone or final/deepest battle zone, so 5M defense is diagnostic only and cannot promote this research model.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not produce a completed research plan with entry, stop, and targets.
- Open FVGs below at proof: none
- Failed FVGs above at proof: none
- Open FVGs above at proof: none
- Objective ladder: none
- Story: No completed proof, so no trade story is formed.
- Outcome: NoEntry, one MES +$0.00
- Managed outcome: NoEntry, exit N/A, one MES +$0.00
- Reasons: No completed 5M continuation close away from the failed FVG zone was found after the return. 15M FVG is middle-zone clutter for this research model; only the first reaction zone or final/deepest battle zone can promote.

### 5. SHORT 15M FVG 7036.00-7051.25 created 2026-01-29T11:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-29T10:45:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-01-29T12:15:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-29T12:55:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-01-29T13:00:00. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-01-29T10:45:00
- Parent failure: 2026-01-29T12:15:00
- First 5M return: 2026-01-29T12:55:00
- 5M wick defense: 2026-01-29T13:00:00
- Proof: none
- Entry/stop/risk: N/A / N/A / N/A pts
- T1/T2: N/A / N/A
- Nearest liquidity: N/A
- Opposing FVG obstacle before T1: none before T1
- Opposing FVG reaction: none
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: not_in_battle_inventory
- 15M first reaction zone: first_reaction_15m_fvg SHORT 7134.00-7136.50 created 2026-01-29T05:15:00 failed_acceptance_through_15m defended 2026-01-29T05:45:00 failed 2026-01-29T08:45:00
- 15M final/deepest battle zone: final_deepest_15m_fvg SHORT 7134.00-7136.50 created 2026-01-29T05:15:00 failed_acceptance_through_15m defended 2026-01-29T05:45:00 failed 2026-01-29T08:45:00
- 5M defense of active 15M zone: not_selected_15m_battle_zone; return none; wick none; proof none; The active 15M FVG is not the first reaction zone or final/deepest battle zone, so 5M defense is diagnostic only and cannot promote this research model.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not produce a completed research plan with entry, stop, and targets.
- Open FVGs below at proof: none
- Failed FVGs above at proof: none
- Open FVGs above at proof: none
- Objective ladder: none
- Story: No completed proof, so no trade story is formed.
- Outcome: NoEntry, one MES +$0.00
- Managed outcome: NoEntry, exit N/A, one MES +$0.00
- Reasons: No completed 5M continuation close away from the failed FVG zone was found after the return. 15M FVG is middle-zone clutter for this research model; only the first reaction zone or final/deepest battle zone can promote.

### 6. LONG 15M FVG 7039.50-7041.50 created 2026-01-29T11:45:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-29T11:15:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-01-29T11:15:00
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
- 15M battle-zone active role: final_deepest_15m_fvg
- 15M first reaction zone: first_reaction_15m_fvg LONG 7134.50-7138.25 created 2026-01-29T03:00:00 failed_acceptance_through_15m defended 2026-01-29T03:15:00 failed 2026-01-29T05:00:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7039.50-7041.50 created 2026-01-29T11:45:00 untested_by_15m
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

### 7. LONG 15M FVG 7053.50-7066.25 created 2026-01-29T12:30:00
- Human lock: valid_research_candidate_afternoon_long_parent_1215_first_proof_1255_t1_7110_hit; later 13:25/13:35 labels are management, not first proof.
- Verdict: valid_research_candidate_human_locked
- Continuation read: valid_afternoon_long_parent_1215_first_proof_1255
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-29T12:15:00. | CONTEXT 15m_parent_failure_or_acceptance: 15M acceptance through/failure observed at 2026-01-29T13:00:00. | PASS 5m_return_to_parent_or_nested_fvg: 5M returned into the parent/nested FVG at 2026-01-29T13:00:00. | PASS completed_5m_wick_defense: Completed 5M wick defense found at 2026-01-29T13:25:00, 2026-01-29T13:30:00, 2026-01-29T13:35:00, 2026-01-29T14:05:00. | PASS completed_5m_continuation_proof: Completed 5M continuation proof closed at 2026-01-29T13:25:00. | PASS entry_stop_risk_contract: Entry 7070.75, protected 5M stop 7044.50, risk 26.25 pts. | PASS tactical_targets_from_actual_risk: T1 7110.25 and T2 7123.25 were calculated from actual risk. | CONTEXT target_room_or_liquidity_context: Nearest real liquidity context: nearest prior high liquidity 7071.00.
- Parent displacement: yes
- Parent displacement candle: 2026-01-29T12:15:00
- Parent failure: 2026-01-29T13:00:00
- First 5M return: 2026-01-29T13:00:00
- 5M wick defense: 2026-01-29T13:25:00, 2026-01-29T13:30:00, 2026-01-29T13:35:00, 2026-01-29T14:05:00
- Proof: 2026-01-29T13:25:00
- Entry/stop/risk: 7070.75 / 7044.50 / 26.25 pts
- T1/T2: 7110.25 / 7123.25
- Nearest liquidity: nearest prior high liquidity 7071.00
- Opposing FVG obstacle before T1: 5m SHORT 7071.00-7074.50 created 2025-12-12T04:35:00 status failed_inverted
- Opposing FVG reaction: obstacle_reached_then_continued at 2026-01-29T13:30:00
- 15M battle-zone scope: 15m_only_active_displacement_leg
- 15M battle-zone active role: not_in_battle_inventory
- 15M first reaction zone: first_reaction_15m_fvg LONG 7134.50-7138.25 created 2026-01-29T03:00:00 failed_acceptance_through_15m defended 2026-01-29T03:15:00 failed 2026-01-29T05:00:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7039.50-7041.50 created 2026-01-29T11:45:00 untested_by_15m
- 5M defense of active 15M zone: not_selected_15m_battle_zone; return none; wick none; proof none; The active 15M FVG is not the first reaction zone or final/deepest battle zone, so 5M defense is diagnostic only and cannot promote this research model.
- Meaningful liquidity target before T1: 7080.50 (prior 5M swing high liquidity from 2026-01-29T12:40:00)
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not pass the clean completed-plan workflow, so balanced-path context stays diagnostic only.
- Open FVGs below at proof: 5m LONG 7063.50-7066.00 created 2026-01-29T13:15:00 status partial_touch; 5m LONG 7057.75-7060.50 created 2026-01-29T13:10:00 status open_untouched; 15m LONG 7039.50-7041.50 created 2026-01-29T11:45:00 status open_untouched; 5m LONG 7021.50-7036.75 created 2026-01-29T11:20:00 status partial_touch; 120m LONG 6984.50-7022.75 created 2026-01-21T17:00:00 status partial_touch; 60m LONG 6984.50-7016.00 created 2026-01-21T16:00:00 status partial_touch; 5m LONG 6978.75-7013.50 created 2026-01-21T14:35:00 status partial_touch; 15m LONG 6981.75-7013.50 created 2026-01-21T14:45:00 status partial_touch
- Failed FVGs above at proof: 5m SHORT 7071.00-7074.50 created 2025-12-12T04:35:00 status failed_inverted; 5m LONG 7071.00-7071.50 created 2025-12-24T07:20:00 status failed_inverted; 5m SHORT 7071.00-7071.25 created 2025-12-24T08:15:00 status failed_inverted; 5m LONG 7071.00-7071.75 created 2026-01-05T11:55:00 status failed_inverted; 5m SHORT 7071.00-7072.50 created 2026-01-09T02:30:00 status failed_inverted; 5m LONG 7071.00-7072.25 created 2026-01-09T02:45:00 status failed_inverted; 5m SHORT 7071.00-7073.25 created 2026-01-23T01:45:00 status failed_inverted; 15m SHORT 7071.00-7072.50 created 2025-12-12T04:45:00 status failed_inverted
- Open FVGs above at proof: 5m SHORT 7080.00-7084.75 created 2026-01-29T10:05:00 status partial_touch; 15m SHORT 7080.00-7095.25 created 2026-01-29T10:15:00 status partial_touch; 60m SHORT 7080.00-7127.75 created 2026-01-29T11:00:00 status partial_touch; 120m SHORT 7080.00-7122.75 created 2026-01-29T12:00:00 status open_untouched; 5m SHORT 7104.00-7112.75 created 2026-01-29T09:50:00 status open_untouched; 15m SHORT 7104.00-7125.50 created 2026-01-29T10:00:00 status open_untouched; 5m SHORT 7119.50-7120.50 created 2026-01-29T09:45:00 status open_untouched; 5m SHORT 7123.50-7125.50 created 2026-01-29T09:40:00 status open_untouched
- Objective ladder: liquidity 7071.25 reached 2026-01-29T13:30:00 (prior 5M swing high liquidity from 2026-01-29T10:30:00); liquidity 7077.00 reached 2026-01-29T13:45:00 (prior 5M swing high liquidity from 2026-01-29T12:25:00); liquidity 7080.50 reached 2026-01-29T13:45:00 (prior 5M swing high liquidity from 2026-01-29T12:40:00); open_fvg 7084.75 reached 2026-01-29T14:20:00 (5m SHORT open FVG partial_touch created 2026-01-29T10:05:00); open_fvg 7095.25 reached 2026-01-29T15:55:00 (15m SHORT open FVG partial_touch created 2026-01-29T10:15:00); tactical 7110.25 reached 2026-01-29T16:00:00 (T1 1.5R); open_fvg 7112.75 not reached (5m SHORT open FVG open_untouched created 2026-01-29T09:50:00); open_fvg 7120.50 not reached (5m SHORT open FVG open_untouched created 2026-01-29T09:45:00); open_fvg 7122.75 not reached (120m SHORT open FVG open_untouched created 2026-01-29T12:00:00); tactical 7123.25 not reached (T2 2.0R); open_fvg 7125.50 not reached (15m SHORT open FVG open_untouched created 2026-01-29T10:00:00); open_fvg 7125.50 not reached (5m SHORT open FVG open_untouched created 2026-01-29T09:40:00); open_fvg 7127.75 not reached (60m SHORT open FVG partial_touch created 2026-01-29T11:00:00); liquidity 7134.50 not reached (prior 5M swing high liquidity from 2026-01-29T09:35:00)
- Story: LONG proof completed at 2026-01-29T13:25:00 from 7053.50-7066.25. 16 failed/open FVG areas remained above as resistance/memory. 8 open FVG areas remained below as downside draw/context. Opposing FVG obstacle before T1: 5m 7071.00-7074.50 with reaction obstacle_reached_then_continued. Structural objectives reached after proof: 7071.25 liquidity, 7077.00 liquidity, 7080.50 liquidity, 7084.75 open_fvg. T1/T2 are tactical; open FVG/liquidity levels explain whether a runner had structural support.
- Outcome: T1 at 2026-01-29T16:00:00, one MES +$197.50
- Managed outcome: LQ1 at 2026-01-29T13:45:00, exit 7080.50, one MES +$48.75
- Reasons: 15M FVG is middle-zone clutter for this research model; only the first reaction zone or final/deepest battle zone can promote.

### 8. LONG 15M FVG 7083.75-7088.25 created 2026-01-29T16:00:00
- Verdict: diagnostic_only_not_valid_under_clean_workflow
- Continuation read: diagnostic_only_no_completed_plan
- Gate trace: PASS 15m_parent_displacement: 15M FVG formation includes displacement at 2026-01-29T15:45:00. | CONTEXT 15m_parent_failure_or_acceptance: No 15M acceptance through/failure was observed; this may still be continuation context, but it does not prove a failed-FVG model. | FAIL 5m_return_to_parent_or_nested_fvg: 5M never returned into the parent/nested FVG during the session window. | FAIL completed_5m_wick_defense: No completed 5M wick-defense candle was found inside the FVG area. | FAIL completed_5m_continuation_proof: No completed 5M continuation close away from the FVG was found after wick defense. | FAIL entry_stop_risk_contract: Missing valid entry, protected 5M stop, or positive entry-to-stop risk. | FAIL tactical_targets_from_actual_risk: T1/T2 could not be calculated from actual entry-to-stop risk. | FAIL target_room_or_liquidity_context: No nearest real liquidity objective was found before proof.
- Parent displacement: yes
- Parent displacement candle: 2026-01-29T15:45:00
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
- 15M battle-zone active role: not_in_battle_inventory
- 15M first reaction zone: first_reaction_15m_fvg LONG 7134.50-7138.25 created 2026-01-29T03:00:00 failed_acceptance_through_15m defended 2026-01-29T03:15:00 failed 2026-01-29T05:00:00
- 15M final/deepest battle zone: final_deepest_15m_fvg LONG 7039.50-7041.50 created 2026-01-29T11:45:00 untested_by_15m
- 5M defense of active 15M zone: not_selected_15m_battle_zone; return none; wick none; proof none; The active 15M FVG is not the first reaction zone or final/deepest battle zone, so 5M defense is diagnostic only and cannot promote this research model.
- Meaningful liquidity target before T1: none before T1
- Balanced path to liquidity: diagnostic_only_no_completed_plan - The row did not produce a completed research plan with entry, stop, and targets.
- Open FVGs below at proof: none
- Failed FVGs above at proof: none
- Open FVGs above at proof: none
- Objective ladder: none
- Story: No completed proof, so no trade story is formed.
- Outcome: NoEntry, one MES +$0.00
- Managed outcome: NoEntry, exit N/A, one MES +$0.00
- Reasons: No 15M acceptance through the parent FVG was found inside this session window. After the parent failure, 5M did not return into the failed 15M FVG zone. No completed 5M wick-defense candle was found inside the failed FVG zone. No completed 5M continuation close away from the failed FVG zone was found after the return. 15M FVG is middle-zone clutter for this research model; only the first reaction zone or final/deepest battle zone can promote.
