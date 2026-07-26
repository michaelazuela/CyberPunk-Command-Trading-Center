# Five-Model Forensic Playbook

Date: 2026-07-25
Status: Micro-Phase 1 source-of-truth definitions only

This playbook defines the five approved forensic desk models that will be installed in later micro-phases. This file is documentation only. It does not install scanner detection, promotion, Discord publishing, Supabase writes, bridge reads, execution approval, or automated orders.

## Operating Contract

- The 5M chart remains execution authority for entry trigger, protected stop, invalidation, and trade plan completion.
- 15M, 60M, 120M, and 240M are context. They may support, caution, or oppose a model, but they do not execute a plan by themselves.
- Each model must support long and short versions unless a later replay proves a side should stay disabled.
- A model is not publishable until the detector can prove: what happened, where it happened, when it completed, why the trade was valid, and where it is wrong.
- One selected plan per active window is the target operating model. Rejected or lower-ranked model candidates are diagnostics, not competing Discord cards.
- No legacy or old context-role labels are approved by this playbook.

## Model 1: Liquidity Raid Reclaim Reversal

Definition: Price raids a meaningful liquidity pool, fails to hold beyond it, reclaims the raided level, and produces completed 5M proof in the reversal direction.

Long version:
- Price raids sell-side liquidity below a meaningful low.
- Price reclaims back above the swept low or recovery line.
- A completed 5M candle confirms bullish rejection, bullish structure shift, or expansion away from the raid.

Short version:
- Price raids buy-side liquidity above a meaningful high.
- Price reclaims back below the swept high or failure line.
- A completed 5M candle confirms bearish rejection, bearish structure shift, or expansion away from the raid.

Required evidence:
- Named raided level: overnight high/low, prior day high/low, session high/low, equal high/low, or other mapped liquidity.
- Sweep/raid wick or completed break beyond the level.
- Reclaim/failure back through the level.
- Completed 5M proof after the reclaim.
- Protected 5M stop beyond the raid structure.

Entry trigger:
- Long: completed 5M close/retest/hold above the reclaim line.
- Short: completed 5M close/retest/hold below the failure line.

Stop rule:
- Beyond the protected 5M raid wick or protected structure swing.

T1/T2 target rules:
- T1 = 1.5R from actual entry to protected stop.
- T2 = 2.0R from actual entry to protected stop.
- HTF/session liquidity may be shown as runner or reaction context only.

Invalidation/cancel rules:
- Long invalidates if completed 5M acceptance returns below protected reclaimed structure or the raid wick stop fails.
- Short invalidates if completed 5M acceptance returns above protected failed structure or the raid wick stop fails.
- No chase if price has already expanded near/past T1 before a valid 5M entry.

AQ/scoring notes:
- Stronger when the raid occurs at a high-strength session or prior-day level.
- Stronger when 15M context shows rejection or displacement away from the raid.
- Weaker when HTF context is data-limited or directly opposing.

Session restrictions:
- Morning and lunch are approved for replay study.
- Evening requires separate proof before production visibility.

Forensic examples:
- June 8: sell-side raid/reclaim long behavior.
- June 9: buy-side raid/failure short behavior.

## Model 2: Raid Failure Displacement Reversal

Definition: Price raids a liquidity pool, fails, then prints displacement in the opposite direction. The displacement is the confirmation that the raid became a reversal attempt rather than a simple probe.

Long version:
- Price raids sell-side liquidity.
- Price fails to continue lower.
- Bullish displacement appears after reclaim.
- 5M proof completes in the reversal direction.

Short version:
- Price raids buy-side liquidity.
- Price fails to continue higher.
- Bearish displacement appears after reclaim/failure.
- 5M proof completes in the reversal direction.

Required evidence:
- Named raid level.
- Failed continuation beyond the raid.
- Displacement candle quality: strong body, close location, and structural consequence.
- Optional FVG/imbalance created by the displacement.
- Completed 5M entry proof and protected stop.

Entry trigger:
- Completed 5M close-through or retest after displacement confirms direction.

Stop rule:
- Protected 5M swing beyond the failed raid or beyond the displacement-origin structure.

T1/T2 target rules:
- T1 = 1.5R.
- T2 = 2.0R.
- Next real liquidity pool may be mapped as runner context after app targets.

Invalidation/cancel rules:
- Cancel if price accepts back through the displacement origin or protected stop.
- Cancel if displacement is only visual size without structure break or meaningful level context.

AQ/scoring notes:
- Stronger when 15M confirms the displacement story.
- Stronger when 60M/120M/240M are aligned or neutral.
- Weaker when the move is already extended before the 5M proof completes.

Session restrictions:
- Morning first.
- Lunch allowed only when the lunch structure creates a fresh raid/failure/displacement sequence.

Forensic examples:
- June 9: raid/failure behavior with directional displacement after the failure.
- June 16 and June 18 research pockets showed overnight-high raid plus bearish displacement as a strong short story, but this model must be validated as a five-model detector before any scanner promotion.

## Model 3: Drive Pullback Continuation

Definition: Price establishes a directional drive, pulls back into a meaningful continuation area, pauses or rejects, and then resumes in the drive direction with completed 5M proof.

Long version:
- Market drives upward.
- Pullback holds above protected structure, a reclaim line, FVG, or prior breakout area.
- 5M proof confirms continuation higher.

Short version:
- Market drives downward.
- Pullback holds below protected structure, a failure line, FVG, or prior breakdown area.
- 5M proof confirms continuation lower.

Required evidence:
- Clear initial drive.
- Pullback into a defined area, not random mid-range chop.
- Pause, rejection, retest hold, or imbalance reaction.
- Completed 5M continuation proof.
- Protected 5M stop behind the pullback structure.

Entry trigger:
- Completed 5M continuation close or retest/hold from the pullback area.

Stop rule:
- Long: below protected pullback swing.
- Short: above protected pullback swing.

T1/T2 target rules:
- T1 = 1.5R.
- T2 = 2.0R.
- Nearby opposing liquidity or HTF obstacles must be noted but cannot replace app targets.

Invalidation/cancel rules:
- Cancel if pullback accepts through protected structure.
- Cancel if the continuation entry appears only after price is near/past T1.
- Cancel if the move is balanced chop without a real drive.

AQ/scoring notes:
- Stronger when the drive follows a raid/reclaim or displacement story.
- Stronger when the pullback is orderly and stop distance is controlled.
- Weaker when stop is too wide or target room is blocked by nearby structure.

Session restrictions:
- Morning and lunch approved for replay study.
- Lunch requires a post-lunch fresh drive or continuation structure, not leftover morning drift.

Forensic examples:
- June 10: lunch pullback, pause, and bearish continuation behavior.
- June 16: afternoon continuation winner evidence should be evaluated through this model family unless a cleaner reversal definition fits the candles.

## Model 4: Structure Shift Continuation

Definition: Price breaks or shifts structure in one direction, then offers a completed 5M continuation entry after retest, hold, or imbalance reaction.

Long version:
- Completed bullish structure shift.
- Retest or hold above the shifted structure.
- Continuation proof completes on 5M.

Short version:
- Completed bearish structure shift.
- Retest or hold below the shifted structure.
- Continuation proof completes on 5M.

Required evidence:
- Completed structure shift, not an incomplete candle.
- Protected 5M swing for stop placement.
- Entry proof after the shift, not just the shift candle itself.
- HTF/15M context marked as support, caution, or conflict.

Entry trigger:
- Completed 5M retest/hold/continuation close after the structure shift.

Stop rule:
- Protected 5M structure swing on the opposite side of the shift.

T1/T2 target rules:
- T1 = 1.5R.
- T2 = 2.0R.
- HTF targets are management context only.

Invalidation/cancel rules:
- Cancel if price accepts back through the shifted structure.
- Cancel if the protected stop is not available or risk is not computable.
- Cancel if HTF is data-limited and the setup depends on HTF structural confirmation.

AQ/scoring notes:
- Stronger with 15M displacement or aligned 60M context.
- Weaker when MSS appears after the best trade location has already passed.

Session restrictions:
- Morning and lunch first.
- Evening only after a separate evening replay package proves behavior.

Forensic examples:
- June 15 and June 17 contained profitable structure-shift/continuation evidence in the PDF forensic pass and should be used as validation fixtures later.

## Model 5: Failed Breakout Reversal

Definition: Price breaks beyond a meaningful range or decision level, cannot hold the breakout, returns back inside or through the level, and then confirms reversal with completed 5M proof.

Long version:
- Failed downside breakout below a range, session low, prior low, or decision line.
- Price reclaims back above the failed breakdown.
- 5M proof confirms long reversal.

Short version:
- Failed upside breakout above a range, session high, prior high, or decision line.
- Price reclaims back below the failed breakout.
- 5M proof confirms short reversal.

Required evidence:
- Named breakout/failure level.
- Failed acceptance beyond that level.
- Completed 5M reversal proof.
- Protected 5M stop beyond failed breakout structure.
- HTF/session map that explains why the failed breakout mattered.

Entry trigger:
- Completed 5M reclaim/close-through or retest after the failed breakout.

Stop rule:
- Beyond the failed breakout wick/structure or protected 5M swing.

T1/T2 target rules:
- T1 = 1.5R.
- T2 = 2.0R.
- Range midpoint, opposite range edge, or real liquidity may be shown as context.

Invalidation/cancel rules:
- Cancel if price accepts back outside the failed-breakout structure.
- Cancel if the breakout has already traveled too far toward target before proof.
- Cancel if there is no protected stop.

AQ/scoring notes:
- Stronger when the failure occurs after a liquidity raid.
- Stronger when reversal proof is clean and risk is controlled.
- Weaker when the failure is inside a noisy balanced range with no clean level.

Session restrictions:
- Morning and lunch approved for replay study.
- Evening requires separate proof.

Forensic examples:
- June 8: failed breakout reversal long behavior matches the PDF-winning trade evidence.
- June 12: morning failure/reversal behavior should be checked against this model if the winning trade came from a failed push rather than continuation.

## Next Install Order

1. Add a typed code registry with exactly these five names and no detector behavior.
2. Add a no-legacy test proving old context-role labels are absent from active code.
3. Install one detector at a time, starting with Liquidity Raid Reclaim Reversal.
4. Replay June 8-28 after each detector.
5. Wire scanner candidates only after all five detectors pass isolated proof.
6. Add selector/promotion only after candidate inventory is clean.
7. Add local Discord preview before any production post.
