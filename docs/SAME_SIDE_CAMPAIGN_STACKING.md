# Same-Side Campaign Stacking

Same-side campaign stacking is a Discord and DeskState presentation layer. It groups multiple candidates that point in the same direction and reference the same tactical area so the desk can show one campaign instead of isolated, competing cards.

## Boundary

- Trading logic changed: no.
- `canExecute` changed: no.
- Setup definitions, ranking, risk gates, stop/target math, model definitions, and 5M bar-close handling remain unchanged.
- The stack is review-map context only. It cannot approve execution, place orders, or loosen risk.

## Stack Rules

Candidates may stack when they share:

- direction: `LONG` or `SHORT`;
- overlapping or nearby active tactical zone, FVG, reaction zone, or entry area;
- complete or meaningful structured evidence from the scanner lifecycle.

The stack assigns deterministic roles:

- `lead_tactical_plan`: best fresh complete tactical plan by decision quality, model confidence, lower risk, rank, then key;
- `entry_evidence`: same-side defended FVG, sweep/reclaim, or opening-drive entry evidence;
- `continuation_confirmation`: same-side MSS or continuation evidence;
- `htf_context`: higher-timeframe support or reaction context;
- `management_target_context`: target/runner context after entry is no longer fresh;
- `stale_entry_reference`: no-chase or management-only reference;
- `invalidated_reference`: failed reference kept out of live trade-plan wording.

## Display Rules

Discord must show:

- one same-side campaign stack section;
- lead entry, stop, T1, and T2 from the lead tactical plan;
- supporting models as evidence, not competing fresh entries;
- fresh-entry, no-chase, or management-only status;
- stand-down condition;
- `Review only. Not execution approval. canExecute remains unchanged.`

When a stack is active, Discord level lines must use the same lead tactical level package as the campaign section. Do not recompute a second T1/T2 package in fallback text.

## June 30 Reference

For the June 30 morning LONG sequence:

- `SweepMssFvgRetrace LONG` is the lead tactical plan when fresh.
- `OpeningDriveFvgContinuation LONG` is entry evidence.
- `IntradayMssMicroContinuation LONG` is continuation thesis.
- After price leaves the shared zone, Discord must show no-chase or management-only context instead of staying silent or presenting a stale fresh entry.

The mirrored SHORT path follows the same rules.
