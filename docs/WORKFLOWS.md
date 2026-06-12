# Workflows

## Trading Workflow

The active live UI is the `Trading Workflow` tab in `src/App.tsx`, rendered by `SessionLab`.

Core flow:

1. Screenshot staged.
2. Analyze.
3. Decision.
4. Outcome/Proof.
5. Journal/RAG.

The live sessions are:

- Morning / AM.
- Lunch / PM Review.

The workflow shows session chips, visible screenshot/OCR/precheck states, and an `Advanced data/model controls` disclosure for bridge, provider, cache, and diagnostic controls.

The current rules reference lives in `docs/TRADING_RULES_REFERENCE.md`. Active trade candidates are limited to the current primary models from the app-owned setup registry; supporting evidence is context, not a third executable model.

## Morning / AM

Required context:

- Instrument, usually MES.
- Midnight Open price, manually entered or OCR-assisted.
- 5-minute RTH setup-scan chart from 9:15 AM through 12:00 PM ET.
- Opening range context from 9:30 AM through 10:00 AM ET when available.
- Optional 15-minute ETH context.

Expected flow:

1. Upload/paste screenshot.
2. Confirm the staged/precheck state.
3. Run analysis with the explicit Analyze button.
4. Retrieve RAG context before analysis.
5. Generate chart interpretation.
6. Build app-owned normalized trade plan.
7. Display no-trade if the app-owned plan is not executable.
8. Save setup and RAG learning.
9. If a trade is taken, save proof/outcome later.

## Lunch / PM Review

Required context:

- 5-minute setup-scan chart covering 12:00 PM-4:00 PM ET.
- Morning high/low and trap/reclaim behavior.
- Pull-forward Morning, ETH, Midnight Open, and RAG context where available.

Expected flow:

1. Upload/paste lunch screenshot.
2. Confirm the staged/precheck state.
3. Retrieve RAG context before analysis.
4. Analyze trap/reversal/continuation behavior.
5. Build app-owned normalized trade plan.
6. Save setup and RAG learning.

## Replay Lab

`ReplayLab.tsx` is retained as inactive replay/backtest source material and is not an active `App.tsx` tab. It should not be activated as-is.

Current replay/backtest requirements and the proposed rewrite architecture are documented in `docs/REPLAY_BACKTEST_REQUIREMENTS.md`.

Required context:

- Trading date entered manually.
- Instrument selected manually.
- Midnight Open price manually entered or OCR-assisted.
- Morning Review box for 15-minute ETH and 5-minute execution.
- Lunch Review box for lunch screenshot.

Expected flow:

1. User enters historical trading date and instrument.
2. User uploads/pastes the relevant screenshots into the focused boxes.
3. App runs replay analysis using `replay_morning` or `replay_lunch`.
4. User marks the historical outcome: win, loss, scratch, no trade, or missed.
5. Supabase stores the setup and RAG record.

Future replay UI should be rebuilt with shared Trading Workflow components before any route is activated.

## Proof Review

Proof screenshots should show whether:

- The stop held or was hit.
- T1 was reached.
- T2 was reached.
- The final marked outcome matches visible price action.

Proof upload is optional, but strongly recommended for replay learning quality.

## Database Health Checks

Use the Data Health panel to confirm:

- Supabase is connected.
- Latest setup saved.
- Latest RAG row saved.
- Latest proof saved.
- Pending embeddings count.
- Last database error.
