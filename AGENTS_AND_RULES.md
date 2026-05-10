# MES/MNQ Trading System: Master Agent & Rules Playbook

This document outlines the specialized agents powering the AI analysis and the core systemic rules they strictly follow to evaluate the MES/MNQ charts.

---

## 1. The Agents

The system uses a multi-agent architectural matrix to validate every potential trading setup, ensuring decisions are based on data and risk-management logic rather than emotion.

### Agent 1: The Chart Observer (Vision)
**Role:** Pure pattern recognition without rule bias.
**Directive:** Analyzes the 5-minute candlestick chart for factual price action, ignoring indicators and volume. Extracts the 09:30 Initial Balance (IB) High/Low, wick-to-body ratios, and the sequence of HH/HL/LH/LL. 
**Output:** A factual, bar-by-bar observation report.

### Agent 2: The Strategy Specialist (Logic)
**Role:** Rule enforcement based on the Observer's data.
**Directive:** Matches the observed price action against the rigid system core recalibration rules (e.g., 2-Bar Failure, 0414_Max_Expansion). It identifies the specific setup (Type 1 Long/Short, Lunch Reversal, Distribution) and proposes stop placements and entry boundaries.
**Output:** Strategy classification, risk bounds, confidence score, and specific reasons for bias generation. Executable T1 and T2 are calculated by the app, not by the agent.

### Agent 3: Devil's Advocate (Multi-Step Validation)
**Role:** Adversarial critique of the Strategy Specialist's setup.
**Directive:** Challenges the proposed strategy to find weaknesses, friction points, or overlapping wicks that the Specialist might have overlooked. Evaluates the findings specifically against systemic rules like the "Anti-Drift" or "Staircase Priority" mandates.
**Output:** Rule citations, risk warnings, counter-arguments, and a confidence penalty reduction if vulnerabilities are found.

### Agent 4: The Risk Auditor (Validation)
**Role:** Safety checks and parameter enforcement.
**Directive:** Audits the required stop-loss distance of the setup against the trader's total account equity and system caps (e.g., maximum 8-point stop allowance). 
**Output:** Final GO / NO-GO validation on the technical risk thresholds.

### Agent 5: The Trade Management Agent
**Role:** Post-entry decision support.
**Directive:** Explains how to manage an already selected app-owned trade plan if price moves in favor, stalls before T1, reaches 1R, reaches T1, or shows a two-bar failure. This agent does not create executable entry, stop, T1, or T2 levels.
**Output:** Management notes, stop movement guidance, failure warnings, and partial/runner logic.

---

## 2. Core Recalibration Rules (Immutable System Constraints)

The agents enforce the following systemic rules strictly:

### Fundamental Trend & Structure
1. **TREND ANCHOR:** The 09:30-10:00 momentum forms the primary bias. Flipping bias based on a single wick rejection is forbidden.
2. **2-BAR FAILURE RULE:** To switch from LONG to SHORT (or vice-versa), two consecutive 5-minute bars must fail to make a new extreme and close below/above the previous bar's body.
3. **STAIRCASE PRIORITY:** The "Staircase" (HH/HL) structure takes precedence. If the most recent Higher Low (HL) is intact on a closing basis, maintain the LONG bias regardless of intraday wicks.
4. **THE 0414_MAX_EXPANSION RULE:** If Price > Anchor_High (IB High) AND Staircase == HH/HL, the 2-Bar Rule is the ONLY valid reason to flip bias. Red candle noise is ignored if the HL stair holds.

### Pattern Recognition & Setup Signatures
5. **FRICTION-TO-EXPANSION MODULE:** Price oscillating within the IB range for > 45 minutes signifies "Friction".
   - *Mandate:* STAY NEUTRAL. Do not establish a staircase until the 2-Bar Guard clears the range.
6. **MUDDY FRICTION_RECOGNITION:** Indicated by overlapping bodies and low velocity (the U-Turn Signature).
   - *Defense:* Entering on wicks is FORBIDDEN. Wait for a "Clearing Bar".
7. **VILLAIN_SWEEP_REVERSAL MODULE:** Price wicks > 1 point above/below an anchor but fails to close outside the range, followed by a second consecutive candle closing deep back inside the IB.
   - *Mandate:* Immediate Bias Flip. Execute Short (at Highs) or Long (at Lows). Hard Stop 1 tick beyond the Villain Wick.

### Execution Protocols
8. **THE MISSED BUS (RUNAWAY RECOVERY):** Triggers if the 2-Bar Guard flashes but price is > 5 points from the original Anchor. Wait for the first counter-trend candle (e.g., Red "Breather"), execute safely above/below that breather, and recalculate R/R based on the tighter risk profile.
9. **THE EMPTY HANDS PROTOCOL (CHASE PREVENTION):** If momentum pushes > 10 points without filling the original limit, the setup is labeled "EXPIRED". Do not chase.
10. **AUDITOR_STRICT INSTANT EXECUTION:** Raw execution logic bypassing narrative. Identifies the 2-Bar Guard to quickly output binary gates (Wait vs. Go).
11. **BIAS_HARDENING (STAIRCASE OVERRIDE):** If the action is vertical with no wicks (Runaway), the staircase takes full priority over rejection strength. Bias remains LONG.

### Target & Exit Algorithms
12. **ACCOUNT GROWTH MANDATE:** Minimum 2.0R technical potential required.
13. **CONSERVATIVE TARGET:** If risk is > 15 pts, mandate a tighter 1.5R target due to expansion limits.
14. **TIME-BASED EXIT:** If entered within 30 minutes of the 12:30 EDT Hard Exit, targets reduce to 1.0R - 1.5R to prevent liquidity drain risks.
15. **10:30 RISK RULE:** If a trade is active at 10:30 and has moved > 50% toward target, the stop MUST move to Breakeven or the 10:00 structural HL/LH.

---

## 3. Session Strategy Categories

- **TYPE 1 LONG:** Large green 9:30 bar. HH+HL staircase. 
  - *Sweep & Reclaim:* Wick below 9:30 low, immediate recovery. 
- **TYPE 2 LONG:** Tiny doji 9:30 + large green 9:35.
- **TYPE 1 SHORT:** Large red 9:30 bar OR large red 9:35 closing below 9:30 open. LH+LL staircase.
  - *Sweep & Reclaim:* Wick above 9:30 high, immediate recovery.
- **TYPE 2 SHORT:** Gap up overnight + immediate red rejection at the opening bell.
- **LUNCH REVERSAL:** The canonical review window is 11:50 AM-1:00 PM ET. Price should show a noon trap, false breakout, sweep/reclaim, or failure behavior against morning structure. The app should use `src/config/timeWindows.ts` as the source of truth for this window.
- **DISTRIBUTION / SUPPLY WALL:** Massive upper wick rejection at session highs, followed by 2 bars failing to break highs with at least one red close.
- **NO TRADE:** Heavy overlap (>80% over 4 bars), poor R/R, or erratic directional behavior.
