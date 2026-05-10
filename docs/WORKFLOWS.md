# Workflows

## Morning Analysis

Required context:

- Instrument, usually MES.
- Midnight Open price, manually entered or OCR-assisted.
- 5-minute RTH chart from 9:30 AM through the 10:10 AM candle.
- Optional 15-minute ETH context.

Expected flow:

1. Upload/paste screenshot.
2. Run analysis.
3. Retrieve RAG context before analysis.
4. Generate chart interpretation.
5. Build app-owned normalized trade plan.
6. Display no-trade if the app-owned plan is not executable.
7. Save setup and RAG learning.
8. If a trade is taken, save proof/outcome later.

## Lunch Reversal

Required context:

- 5-minute chart covering 11:50 AM-1:00 PM ET.
- Morning high/low and trap/reclaim behavior.
- Pull-forward Morning, ETH, Midnight Open, and RAG context where available.

Expected flow:

1. Upload/paste lunch screenshot.
2. Retrieve similar historical lunch/replay records.
3. Analyze trap/reversal/continuation behavior.
4. Build app-owned normalized trade plan.
5. Save setup and RAG learning.

## Replay Lab

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
