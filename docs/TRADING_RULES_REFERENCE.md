# Trading Rules Reference

This document is a reference guide for the current MES/MNQ decision-support workflow. It preserves useful trading concepts from the retired Rules UI playbook, but the app-owned trading engine remains the source of truth.

Source-of-truth files:

- `src/config/tradeRules.ts`
- `src/config/setupRegistry.ts`
- `src/lib/setupScanner.ts`
- `src/lib/tradeDecisionPipeline.ts`
- `src/lib/conditionalPlanBuilder.ts`
- `src/config/timeWindows.ts`

The app is decision support only. It does not place trades or automate execution. AI and OHLC extraction may describe facts, but executable decisions come from the app-owned setup scanner, ranking layer, and trade decision pipeline.

## Current Active Primary Models

Only primary models create active trade candidates in the current workflow.

### Sweep -> MSS -> FVG Retrace

Official label: `Sweep -> MSS -> FVG Retrace`.

This model looks for a complete sequence:

1. A meaningful liquidity sweep.
2. Reclaim after the sweep.
3. Directional displacement.
4. Market structure shift.
5. Retrace into a fair value gap or imbalance.
6. Structure-based stop with app-validated risk.
7. Sufficient target room under the app-owned risk/target model.

The preferred behavior is patience after displacement. The plan should wait for the FVG or imbalance retrace and a protected structure stop. It should not chase an extended displacement candle.

### Raid Reclaim Reversal Reversal

Official label: `Raid Reclaim Reversal Reversal`.

This model looks for a failed breakout or failed breakdown after a raid:

1. A meaningful swing, session, or liquidity level is swept.
2. Continuation fails.
3. Price reclaims back inside the swept level.
4. Entry or retest behavior confirms the failed break.
5. Stop can be placed beyond the sweep wick or protected structure.
6. App-computed target room has a clean path to T1 at 1.5R. T2 at 2.0R is the second target / extension-management objective, not the minimum viability gate.

The model can be qualified or conditional, but execution still requires the completed 5-minute trigger, protected stop, risk validation, and time-window gate.

## Supporting Evidence Only

Supporting evidence can improve context, ranking, and confidence. It does not create a third active executable model.

### Liquidity Sweep

A sweep is useful when price raids a prior high, low, session level, or liquidity pool and then shows evidence of reclaim or rejection. A sweep by itself is not a trade. It must connect to one of the primary models.

### Fair Value Gap / Imbalance

An FVG or imbalance can provide a retrace zone, reaction zone, obstacle, or continuation context. In the active primary model, the imbalance retrace matters after sweep, reclaim, displacement, and structure shift are present.

### Market Structure Shift / Change Of Character

MSS or ChoCH helps confirm that the prior side lost control. It is supporting evidence unless it is part of the complete primary model sequence.

### Equal Highs / Equal Lows

Equal highs and equal lows are resting liquidity references. They can act as targets, reaction zones, or sweep references. They do not approve a trade by themselves.

### Previous Day / Session Sweeps

Previous day highs/lows, ETH levels, Asian/London/NY premarket levels, and RTH session levels help define the market map. A sweep of one of these levels can support a primary setup, but the 5-minute execution chart still owns entry trigger, stop, and final approval.

### Breaker / FVG Overlap

A failed structure retest zone overlapping an imbalance can add confluence. It is supporting evidence, not an independent active model.

### Higher-Timeframe Context

4H, 1H, and 15M data provide macro and session structure. They can improve target context, obstacle awareness, and ranking. They do not replace the 5M execution trigger.

### Midnight Open Context

Midnight Open is retained as context and RAG memory. It can help frame session location, but it is not an execution signal and should not be presented as a predictive probability rule.

## Deprecated / Historical Reference

The old Rules UI playbook included several concepts that may still be useful as educational background. They are not active standalone trade models in the current app-owned decision pipeline unless the setup registry is changed later.

Deprecated or historical concepts include:

- Order Block / 61.8% Golden Ratio.
- Opening Order Block.
- Momentum Entry / Runaway.
- Compression Breakout.
- Initial Balance Extension.
- Opening Gap Fill.
- Algo Kill Zones.
- Mitigation Block.

These concepts should not be shown as active rules in live trade cards, Discord alerts, or the Trading Workflow. If they appear in historical notes, they should be clearly marked as reference only.

The old strategy ranking table, average R/R claims, and fixed "best strategy" ordering from the retired Rules UI are not part of the current engine authority.

## Risk, Stop, And Target Standard

The current standard is deterministic and app-owned:

- Stop must be tied to protected structure.
- Actual risk is calculated from entry to stop.
- Risk must pass the app's configured validation.
- T1 = 1.5R from actual entry-to-stop risk.
- T2 = 2.0R from actual entry-to-stop risk.
- Liquidity, obstacles, reaction zones, and runner objectives are target-management context.
- Imbalances, gaps, opens, and round numbers are reaction or obstacle zones, not standalone liquidity targets.
- No chase entries.
- No trade is valid if the clean 1.5R path, stop clarity, time-window gating, or risk validation fails. A blocked/obstructed 2.0R extension is managed at T1 instead of becoming the minimum blocker by itself.

No-trade and wait states are valid professional outcomes.

## Trading Workflow Standard

The active live UI is the `Trading Workflow` tab, rendered by `SessionLab`.

Core flow:

1. Screenshot staged.
2. Analyze.
3. Decision.
4. Outcome/Proof.
5. Journal/RAG.

Live sessions:

- Morning / AM.
- Lunch / PM Review.

The workflow shows screenshot/precheck states, session chips, and the decision card. Bridge, provider, cache, and diagnostic controls are kept under `Advanced data/model controls`.

Proof and outcome updates feed the journal/RAG loop. They do not approve trades, place orders, or override engine decisions.

## Discord And Visual Plan Standard

Morning scheduled alerts, Lunch scheduled alerts, and live scanner alerts use the shared compact Discord alert summary.

Current standard:

- Main Discord message is compact and validated before send.
- Full audit JSON stays outside the main message.
- Chart Plan PNG shows the visual trade plan.
- Price Level Map / Risk-Reward Ladder PNG shows entry, stop, risk, T1, T2, and liquidity context.
- Attachments support decision review only.
- Discord outcome buttons may update learning/journal fields only.
- No Discord alert places a trade or overrides risk gates.

## Retired Rules UI Status

The old React Rules UI has been retired. This markdown file is now the maintained rules reference.
