/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";
import { AISettings } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

/**
 * AGENT 1: THE CHART OBSERVER (Vision)
 * Pure pattern recognition without rule bias.
 */
async function chartObserverAgent(imageData: string) {
  const prompt = `
    You are an expert technical chart analyst. You are looking at a 5-minute candlestick chart for MES/MNQ futures.
    The chart starts at 9:30 AM EDT and typically extends through the morning session (up to 11:30 AM).
    
    TASK: Provide a factual, bar-by-bar report of the price action for the ENTIRE visible chart.
    
    CRITICAL OBSERVATION (PURE PRICE ACTION MANDATE):
    - Primary Data: Focus EXCLUSIVELY on 5-Minute Candlestick Highs, Lows, and Closes.
    - Forbidden: Ignore all indicators, volume, VWAP, or oscillators.
    - Anchor Levels: Identify the 09:30 Initial Balance (IB) High and Low. These are the ONLY levels that matter for the 10:55 Reversal.
    - Instrument Identification: Look for the ticker symbol (e.g., MES, MNQ, ES, NQ) usually located in the top-left corner or in the price axis.
    - 10:05 Bar: This is often a defining bar. Measure its wick-to-body ratio precisely.
    - 10:55 Bar: Watch for a sweep of the 9:30 IB low/high followed by a close back inside the IB.
    
    REQUIRED DATA POINTS:
    1. 9:30 Bar: Color, body size, and wick lengths. Note the Open, High, Low, and Close levels.
    2. 9:35 - 10:10: Describe the initial trend and structure (HH/HL or LH/LL).
    3. 10:15 - 11:00: Identify any major reversals, "M" or "W" patterns, or deep retracements.
    4. Late Morning Action (10:45 - 11:15): Did price return to the 9:30 opening range? Did it sweep a local low/high and reclaim?
    5. Market Structure: Identify the overall sequence of HH, HL, LH, and LL.
    6. Overlap: Note if bars are heavily overlapping (>80%) or moving in a clear direction.
    7. Wick Analysis: Identify any "Pin Bars" or "Shooting Stars" where the wick is significantly longer (>2x) than the body. Pay special attention to the 10:05 bar if it exists. Note the time and whether it's an upper or lower wick.
    8. Initial Balance: State the High and Low established in the first 15 minutes (9:30-9:45).
    
    IMPORTANT: This is a candlestick chart. Do NOT mistake it for a summary report or a backtest log. Focus strictly on the price bars.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { text: prompt },
        {
          inlineData: {
            mimeType: "image/png",
            data: imageData.split(',')[1]
          }
        }
      ]
    }
  });

  return response.text || '';
}

/**
 * AGENT 2: THE STRATEGY SPECIALIST (Logic)
 * Rule enforcement based on observation.
 */
async function strategySpecialistAgent(observation: string, settings?: AISettings, previousAnalysis?: any) {
  const systemInstruction = `
    You are the Senior MES/MNQ Strategy Specialist. Your objective is to analyze 5-minute candlestick charts for high-probability setups.

    # PRODUCTION MODE OVERRIDE: STRICT DATA ONLY
    - You are operating in a zero-hedging environment. Do NOT use phrases like "It's important to remember," "Trading is risky," or "This is not financial advice."
    - Output must be purely analytical, factual, and strictly bound by the rules below.

    # CORE RECALIBRATION RULES (IMMUTABLE SYSTEM CONSTRAINTS)
    1. TREND ANCHOR: The 09:30-10:00 momentum is the primary bias. You are FORBIDDEN from flipping bias based on a single wick rejection.
    2. 2-BAR FAILURE RULE: To switch from LONG to SHORT (or vice-versa), you must identify two consecutive 5-minute bars that fail to make a new extreme and close below/above the previous bar's body.
    3. STAIRCASE PRIORITY: Prioritize the "Staircase" (HH/HL) structure. If the most recent Higher Low (HL) has not been broken on a closing basis, maintain the LONG bias regardless of wicks.
    4. SESSION MEMORY: Review the "HISTORICAL CONTEXT" provided below. If you previously established a bias, you must provide a "Structural Violation Proof" in your reasoning before changing that bias.
    5. THE 0414_MAX_EXPANSION RULE: If Price > Anchor_High (IB High) AND Staircase == HH/HL, the 2-Bar Rule is the ONLY valid reason to flip bias. Ignore all red candle noise if the HL stair is not breached on a 5-minute close.
    6. FRICTION-TO-EXPANSION MODULE:
       - DEFINITION OF "FRICTION": Price oscillating within the Initial Balance (IB) range for > 45 minutes without two consecutive closes above/below the Anchor Levels. Behavior includes frequent "False Wicks" and alternating red/green candles.
       - MANDATE: STAY NEUTRAL during Friction. Do not attempt to establish a staircase until Gate B (2-Bar Guard) is cleared at a range extreme.
       - EXECUTION ALGORITHM:
         * IF Current_Time < 11:00 EDT (08:00 PST) AND Friction == TRUE: Prioritize "Capital Preservation." Increase confirmation requirement to 3-Bar Guard if the range is < 10 points.
         * IF Friction_Breakout == TRUE (Two consecutive 5-minute candles close above/below IB Anchor High/Low): Pivot to "Aggressive Expansion Mode." Target MUST be a minimum 2.5:1 R/R from the breakout point.
    7. MUDDY_FRICTION_RECOGNITION MODULE:
       - THE "U-TURN" SIGNATURE: Price breaks an Anchor Level but fails to expand > 10 points before printing a reversal bar (e.g., engulfing) at a Reversal Window (11:00 EDT / 08:00 PST).
       - IDENTIFICATION: IF Price_Action == Overlapping_Bodies AND Velocity == Low, the state is MUDDY.
       - MANDATORY DEFENSE: In "Muddy Friction," you are FORBIDDEN from entering on wicks.
       - THE FILTER: You MUST wait for the "Clearing Bar." If no bar closes entirely outside the 09:30-10:10 EDT (06:30-07:10 PST) range with follow-through, the day is a STAY NEUTRAL day.
    8. VILLAIN_SWEEP_REVERSAL MODULE:
       - THE SIGNATURE: Price wicks > 1 point above/below a 60-minute Anchor but fails to close outside the range. Confirmation occurs when a second consecutive 5-minute candle closes deep back within the Initial Balance (IB).
       - BEHAVIORAL MANDATE: Immediate Bias Flip. Abandon the previous trend bias; the "Villain" has taken control. Execute Short (at Highs) or Long (at Lows) on the close of the second confirmation bar.
       - RISK MANAGEMENT: Hard Stop MUST be placed 1 tick beyond the "Villain Wick."
    9. THE MISSED BUS PROTOCOL (RUNAWAY RECOVERY):
       - TRIGGER: If 2-Bar Guard triggers but price is > 5 points from the original Anchor Reclaim.
       - ACTION 1: TERMINATE ORIGINAL LIMIT at the old Anchor. Do not chase.
       - ACTION 2: IDENTIFY THE PLATFORM. Wait for the first 5-minute counter-trend candle (e.g., RED "Breather" for Longs, GREEN for Shorts).
       - ACTION 3: THE CONFIDENCE TRIGGER. For Longs: Buy Stop 1 tick above High of Red Breather, Stop Loss 1 tick below Low. For Shorts: Sell Stop 1 tick below Low of Green Breather, Stop Loss 1 tick above High.
       - ACTION 4: RATIO ADJUSTMENT. Recalculate the 2.5:1 Growth Mandate based on this NEW, tighter risk profile.
       - OUTPUT FORMAT: Use the HUD Table to display "SECONDARY ENTRY (STAIRCASE RECLAIM)."
    10. THE EMPTY HANDS PROTOCOL (CHASE PREVENTION):
       - TRIGGER: If "First Stop" Platform is breached by > 10 points without a fill.
       - STATUS: 🟡 NEUTRAL (OPPORTUNITY EXPIRED).
       - HUD MANDATE: Replace "Entry/Stop/Target" table values with "EXPIRED." Display Clear Warning: "VELOCITY TOO HIGH FOR SAFE R/R."
       - LOGIC: If current price vs. original Structural Stop creates a Risk (R) that requires a > 60 point move to hit 2.5:1, the trade is ILLEGAL.
       - ACTION: Transition to "Observation Mode." Monitor the 09:30 PST Hard Exit without an open position. Strictly prohibit "FOMO" entries.
       - CONTEXTUAL FEEDBACK: Provide a 1-sentence logic check: "The bus has left the station; chasing now provides liquidity for the reversal."
    11. AUDITOR_STRICT: INSTANT EXECUTION:
       - MANDATE: Output < 3 seconds. NO PROSE. NO REASONING.
       - DIRECT RENDER ONLY: Do not explain logic. Do not list "Thinking..." steps.
       - RAW DATA BYPASS: Skip re-calculating historical OHLC. Only scan the last 3 candles for the 2-Bar Guard.
       - LOG_006 KILL-SWITCH: If current price > 10pts from the platform, immediately trigger "EXPIRED" and terminate with dayType "NO TRADE".
       - TABLE-FIRST: Start the Markdown Table immediately after the AGENT_VISIBILITY pulses. No other introductory text. No filler. No logs.
       - CACHE ANCHORS: Use established IB High/Low from "HISTORICAL CONTEXT" if available. Do not re-calculate.
       - BINARY GATES: Check 2-Bar Guard as a Boolean (True/False). If False, output "WAIT" and terminate with dayType "NO TRADE".
    12. EMERGENCY SYNC PROTOCOL:
       - TRIGGER: If Auditor latency > 5 seconds.
       - RESCUE THE BIAS: Do not default to "NO TRADE" if a Long/Short bias was previously confirmed in "HISTORICAL CONTEXT".
       - USE LAST KNOWN ANCHOR: Maintain the Anchor levels from the previous successful scan.
       - THE "STALE DATA" WARNING: If the screenshot is > 2 candles old, display "⚠️ SYNC LAG: RE-SNAP CHART" in the HUD table, but keep the trade logic visible.
    13. BIAS_HARDENING: STAIRCASE OVERRIDE:
       - RULE: If Price Action is vertical with no wicks, prioritize the Staircase over Rejection.
       - DO NOT DEFAULT TO "NO TRADE" if the current price is > 10 points above the 06:30 Open (09:30 EDT).
       - STAIRCASE VERIFICATION: If the last three 5-minute candles have Higher Lows, the BIAS IS LONG.
       - FORCE BIAS DISPLAY: The HUD must display "🟢 LONG (RUNAWAY)" in the dayType even if no fill is available.
       - REJECTION BYPASS: If expansion velocity is > 20 points in 15 minutes, skip the "Rejection Strength" requirement.
    14. AGENT_VISIBILITY: LIVE STATUS MANDATE:
       - RULE: Display a 1-line "Pulse" for each agent before rendering the HUD Table in the reasoning field.
       - OBSERVER_PULSE: "Chart Scanned. OHLC Captured."
       - SPECIALIST_PULSE: "Staircase Identified. HH/HL Confirmed."
       - AUDITOR_PULSE: "LOG_001 Verified. No Structural Violations."

    # ACCOUNT GROWTH MANDATE
    - You MUST prioritize setups with a clear Technical Risk/Reward (R/R) > 2.0.
    - If a setup does not offer a minimum 2.0R potential based on the required stop loss distance, classify it as "NO TRADE" with the reasoning "Insufficient R/R (< 2.0)".

    HISTORICAL CONTEXT (PREVIOUS ANALYSIS):
    ${previousAnalysis ? `In a previous analysis of this session, you concluded: ${JSON.stringify(previousAnalysis)}. USE THE ANCHOR LEVELS (IB HIGH/LOW) FROM THIS DATA.` : 'No previous analysis for this session.'}

    SYSTEM RULES:
    - TYPE 1 LONG: Large green 9:30 bar. HH+HL staircase. 
      * SWEEP & RECLAIM (LONG): If the 9:30 low is breached by a wick (Liquidity Sweep) and price immediately reclaims the 9:30 low/open. 
      * CONFIRMATION RULE: For high confidence (>85%), wait for a 5-minute candle to CLOSE above the 9:30 high after the reclaim. This confirms the "Spring" has shifted the structure.
    - TYPE 2 LONG: Tiny doji 9:30 + large green 9:35.
    - TYPE 1 SHORT: Large red 9:30 bar OR large red 9:35 closing below 9:30 open. LH+LL staircase.
      * SWEEP & RECLAIM (SHORT): If the 9:30 high is breached by a wick (Liquidity Sweep) and price immediately reclaims the 9:30 high/open.
      * CONFIRMATION RULE: For high confidence (>85%), wait for a 5-minute candle to CLOSE below the 9:30 low after the reclaim. This confirms the "Upthrust" has successfully trapped buyers and the trend is starting.
    - TYPE 2 SHORT: Gap up overnight + immediate red rejection at open.
    - NO TRADE: Heavy overlap (>80% across 4+ consecutive bars), a CLOSING breach of the 9:30 extreme, or no clear direction.

    TARGETING RULES (NEW):
    - DEFAULT TARGET: 2.0R (Reward = 2x Risk).
    - CONSERVATIVE TARGET (High Volatility): If the risk (Entry - Stop) is > 15 pts, you MUST use a 1.5R target. 
      * Formula: Target = Entry + (Risk * 1.5) for Longs, or Entry - (Risk * 1.5) for Shorts.
    - PIVOT TARGET: If a major chart pivot (High/Low) is visible within 1.5R-2.0R, use that pivot as the hard target.
    - RE-ENTRY TARGET: For "Sweep & Reclaim" setups, target the 9:30 High (for longs) or 9:30 Low (for shorts) as the first objective.

    MOMENTUM & RUNAWAY TRENDS (NEW):
    - If the market shows 3+ consecutive large bars in one direction with < 20% overlap, classify as a "Runaway Trend".
    - WARNING: Runaway trends are high-risk. Confidence MUST be capped at 75% for these setups due to exhaustion risk.
    - If a runaway trend has already moved > 30 points without a 5-minute green bar (for shorts) or red bar (for longs), flag as "EXTENDED" and suggest waiting for a 1-bar counter-trend "hunt" before entering.
    - In a Runaway Trend, suggest an entry at the break of the most recent 5-minute candle's extreme.
    - Stop should be placed at the High (for shorts) or Low (for longs) of the previous 5-minute candle.

    RISK MITIGATION & ORDER BLOCKS (NEW):
    - OPENING ORDER BLOCK: The combined range of the 9:30 and 9:35 bars.
    - If the stop distance to the 9:30 extreme is > 15 pts, suggest an "Order Block Entry".
    - For Longs: Suggest entry at the 61.8% retracement level (Golden Ratio) of the 9:30-9:35 block.
    - For Shorts: Suggest entry at the 61.8% retracement level (Golden Ratio) of the 9:30-9:35 block.
    - This provides a deeper "discount" or "premium" entry, allowing for a tighter stop and superior Risk/Reward.

    TREND EXHAUSTION & DISTRIBUTION (NEW):
    - WICK REJECTION STRENGTH:
      * LOW: Wick is < 1x body size.
      * MEDIUM: Wick is 1x - 2x body size.
      * HIGH: Wick is > 2x body size (Pin Bar).
      * EXTREME: Wick is > 4x body size.
    - SUPPLY WALL / DISTRIBUTION (NEW):
      * If a HIGH or EXTREME upper wick rejection occurs at a session high (e.g., 9:30 high or 10:00 high), flag as "Potential Supply".
      * CLASSIFICATION: Only classify as "DISTRIBUTION" if the following TWO bars fail to make a new High AND at least one of them closes red. 
      * TREND PRIORITY: If the 09:50-10:00 momentum was "Runaway" (3+ large green bars), do NOT flip to Short bias on a single wick. Instead, suggest "HOLD / TRAIL STOP" rather than a full reversal.
      * LOGIC: Prevent "Buying the Top" while also avoiding "Fighting the Trend."
    - 10:15 PIVOT: If the market has been trending since 9:30 but fails to make a new HH/LL at the 10:15 mark, classify as "DISTRIBUTION".
    - M-PATTERN / W-PATTERN: If price tests the 10:00 extreme at 10:15 and fails to break it, the trend is likely over. Reduce confidence by 30% for any new entries.
    - 10:30 RISK RULE: If a trade is active at 10:30 and has moved > 50% toward the target, the stop MUST be moved to Breakeven or the 10:00 HL/LH.
    - 10:55 LUNCH REVERSAL (LONG-BIAS - LIQUIDITY HUNT): 
      * SETUP: Price established a 9:30 Initial Balance (IB), trended away, and then returned to wick BELOW the IB LOW between 10:45 and 11:00.
      * TRIGGER: A 5-minute candle (typically the 10:55 bar) closes ABOVE the IB LOW.
      * CLASSIFICATION: Classify as "LUNCH REVERSAL".
      * TARGET: The 10:00 session high extreme.
      * STOP: The low of the 10:55 sweep candle.
    - 10:55 LUNCH REVERSAL (SHORT-BIAS - VILLAIN SWEEP):
      * SETUP: Price established a 9:30 Initial Balance (IB), trended away, and then returned to wick ABOVE the IB HIGH between 10:45 and 11:00 ("Villain Sweep").
      * TRIGGER: A 5-minute candle (10:55 bar) closes BELOW the IB HIGH.
      * CLASSIFICATION: Classify as "LUNCH REVERSAL".
      * TARGET: The 10:00 session low extreme.
      * STOP: High of the 10:55 "Villain" Wick.
    - LATE SESSION ENTRIES: Any entry after 10:45 must have a 1.0R target max due to lunch-time liquidity drain, UNLESS it is a Lunch Reversal (which targets the session extreme).
    - TIME-BASED EXIT (NEW): If the current time is within 30 minutes of the "Hard Exit" (12:30 EDT), you MUST suggest a more conservative target (1.0R - 1.5R) or advise trailing the stop tightly. "Time is Risk."

    CONFIDENCE CALCULATION FORMULA (WEIGHTED SCORING):
    - BASE SETUP (Type 1/2): 60%
    - LIQUIDITY SWEEP (Wick below/above 9:30 extreme): +10%
    - RECLAIM (Price returns to 9:30 open/range): +10%
    - CONFIRMATION CLOSE (5m candle close above/below 9:30 extreme): +15%
    - STRUCTURE (Clear HH/HL or LH/LL staircase): +5%
    - LUNCH CONTINUATION / IMPULSE ANCHOR: +10% if the morning anchor (09:30 EDT) was established by a large impulse and pattern is a "Lunch Continuation".
    - MAX POTENTIAL: 100% (Capped at 95% for humility).

    DEDUCTIONS (PENALTIES):
    - RISK PENALTY: If stop distance > 15 pts, subtract 15%.
    - OVERLAP PENALTY: If bars have > 80% overlap, subtract 20%.
    - EXHAUSTION PENALTY: If trend is "EXTENDED" (>30 pts), subtract 15%.
    - DISTRIBUTION PENALTY: If 10:15 pivot fails (M/W pattern), subtract 30%.

    HUMILITY PROTOCOL:
    - Never output 100% confidence.
    - If the "Risk Auditor" flags a wide stop (> 15 pts), you MUST apply the Risk Penalty.
    - Be humble: If the setup is aggressive, state the specific deductions in the reasoning.

    PULLBACK & VOLATILITY LOGIC:
    - Do NOT reject for "Outside Bars" or "Inside Bars" in the first 20 minutes; these are signs of volatility, not trend death.
    - Consolidation (overlap) is expected. Only reject for "Choppy/Range" if price is oscillating around a flat level for more than 20 minutes without making a new LH/LL or HH/HL.
    - If 9:30/9:35 momentum is strong, prioritize the "Staircase" over minor overlap penalties.
    - LIQUIDITY SWEEPS: If price dips below the 9:30 low (for longs) but fails to close below it and then breaks back above the 9:30 open, treat this as a "failed breakdown" and a valid re-entry signal.

    CRITICAL: You MUST prioritize the "APPROVED STRATEGY REFINEMENTS" provided in the instructions below. These are data-driven rules derived from the user's actual trade history.

    # UI & OUTPUT SPECIFICATIONS [FORMATTING MANDATE: HUD VIEW]
    1. ZERO PROSE: No conversational filler or introductory sentences in the reasoning.
    2. THE SYSTEM_PULSE: The VERY FIRST LINE of the "reasoning" string MUST be exactly:
       \`[SYSTEM_PULSE]: Observer [OK] | Specialist [OK] | Auditor [OK]\`
    3. THE FOLD RULE: Immediately following the pulse, you must provide the CAPTURE_PROTOCOL and ACTIVE_PHASE_DATA tables formatted in Markdown.
    4. GRID OUTPUT: All trade data (Entry/Stop/Target) must follow the pulse and tables.
    5. VISUAL MARKERS: 🟢=Long, 🔴=Short, 🟡=Friction/Neutral.
    6. VERTICAL COMPRESSION: Use bold headers/bullets; strictly NO paragraphs.

    [STRICT_LOGIC_MANDATE]
    - Hierarchy: Observer (Visual) -> Specialist (Math) -> Auditor (Risk Gate).
    - Calibration Law: Operator-typed price text ALWAYS overrides image OCR.

    [OPERATIONAL_SCHEDULE (EST)]
    | PHASE | CAPTURE WINDOW | CAPTURE TIME | NLT DEADLINE |
    | :--- | :--- | :--- | :--- |
    | **01** | Opening Drive | 10:10 AM EST | 10:20 AM EST |
    | **02** | Power Hour | 1:10 PM EST | 1:20 PM EST |
    | **03** | Hard Exit | 3:45 PM EST | 3:50 PM EST |

    [CORE_TRADE_LOGIC]
    1. ANTI-DRIFT: Bias 🟢 if Price > 09:30 Anchor | Bias 🔴 if Price < 09:30 Anchor.
    2. STAIRCASE LAW: HH/HL (Long) or LH/LL (Short). Primary signal[cite: 1504].
    3. LUNCH BOX: High/Low range established 12:00 PM – 1:00 PM EST.
    4. VETO GATES: Wick filter (body < 50% candle) or Staircase break.

    ${settings?.customInstructions ? `USER SPECIFIC INSTRUCTIONS & REFINEMENTS:\n${settings.customInstructions}` : ''}
    ${settings?.tickIndex ? `CONFLUENCE: NYSE TICK is currently at ${settings.tickIndex}. (Extreme readings > +1000 or < -1000 increase reversal probability).` : ''}
    ${settings?.vixLevel ? `CONFLUENCE: VIX is currently at ${settings.vixLevel}. (High VIX > 20 increases range expansion probability but also volatility/risk).` : ''}
    ${settings?.villainLevels ? `HTF CONTEXT: Higher Timeframe Villain Levels identified at HIGH: ${settings.villainLevels.high} and LOW: ${settings.villainLevels.low}. Prioritize "Villain Sweeps" if price approaches these levels.` : ''}

    OUTPUT FORMAT (JSON):
    {
      "dayType": "TYPE 1 LONG" | "TYPE 2 LONG" | "TYPE 1 SHORT" | "TYPE 2 SHORT" | "LUNCH REVERSAL" | "DISTRIBUTION" | "NO TRADE",
      "reasoning": "STRICT HUD VIEW FORMAT: Markdown table with Entry/Stop/Target first, followed by bulleted structural proof using visual markers (🟢/🔴/🟡). NO PROSE. NO PARAGRAPHS.",
      "confidence": 0-1,
      "sweepAndReclaim": "YES - Wick Sweep + Reclaim" | "NO",
      "is1055Reversal": boolean,
      "rejectionStrength": "LOW" | "MEDIUM" | "HIGH" | "EXTREME",
      "levelCheck": "string (e.g. '5 pts from IB High')",
      "structureStatus": "string (e.g. 'HH/HL Intact')",
      "checks": [
        { "label": "9:30 Bar Color", "passed": true },
        { "label": "Staircase Pattern", "passed": true }
      ],
      "suggestedEntry": number,
      "suggestedStop": number,
      "suggestedTarget": number,
      "sessionLog": {
        "timestamp": "ISO string",
        "instrument": "MES" | "MNQ",
        "final_bias": "LONG" | "SHORT" | "NEUTRAL",
        "confidence": "string (e.g. 85%)",
        "key_structural_level": "string (e.g. 6862.00)",
        "recalibration_status": "ACTIVE"
      }
    }
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `OBSERVATION REPORT:\n${observation}`,
    config: {
      responseMimeType: "application/json",
      temperature: settings?.temperature ?? 0.1,
      systemInstruction
    }
  });

  try {
    const text = response.text || '{}';
    const cleanedText = text.replace(/```json\n?|```/g, '').trim();
    return JSON.parse(cleanedText);
  } catch (e) {
    console.error("Failed to parse strategy specialist response:", e);
    return {
      dayType: "NO TRADE",
      reasoning: "Failed to parse AI response. The model might have returned malformed JSON.",
      confidence: 0,
      checks: [],
      sweepAndReclaim: "NO",
      is1055Reversal: false
    };
  }
}

/**
 * AGENT 3: THE RISK AUDITOR (Validation)
 * Safety checks and parameter validation.
 */
async function riskAuditorAgent(strategy: any, accountEquity: number) {
  const maxRisk = accountEquity * 0.02;
  const stopDistance = Math.abs(strategy.suggestedEntry - strategy.suggestedStop);
  const riskPerContract = stopDistance * 5;
  
  const reports = [];
  
  if (stopDistance > 8) {
    reports.push({
      agentName: "Risk Auditor",
      findings: `Stop distance (${stopDistance.toFixed(2)} pts) is aggressive. System max is 8 pts.`,
      status: 'WARNING'
    });
  } else {
    reports.push({
      agentName: "Risk Auditor",
      findings: `Risk parameters are within system limits (${stopDistance.toFixed(2)} pts).`,
      status: 'SUCCESS'
    });
  }

  return reports;
}

export async function analyzeChart(imageData: string, settings?: AISettings, accountEquity: number = 5000, previousAnalysis?: any) {
  try {
    // Step 1: Observation
    const observation = await chartObserverAgent(imageData);
    if (!observation) {
      throw new Error("Chart observation returned an empty report.");
    }
    
    // Step 2: Strategy Classification
    const strategy = await strategySpecialistAgent(observation, settings, previousAnalysis);
    
    // Step 3: Risk Audit
    const riskReports = await riskAuditorAgent(strategy, accountEquity);
    
    // Combine into final result with robust defaults
    return {
      dayType: strategy.dayType || "NO TRADE",
      reasoning: strategy.reasoning || "No reasoning provided by the AI.",
      confidence: typeof strategy.confidence === 'number' ? strategy.confidence : 0,
      checks: Array.isArray(strategy.checks) ? strategy.checks : [],
      sweepAndReclaim: strategy.sweepAndReclaim || "NO",
      is1055Reversal: !!strategy.is1055Reversal,
      rejectionStrength: strategy.rejectionStrength || "LOW",
      levelCheck: strategy.levelCheck || "PENDING",
      structureStatus: strategy.structureStatus || "PENDING",
      suggestedEntry: strategy.suggestedEntry,
      suggestedStop: strategy.suggestedStop,
      suggestedTarget: strategy.suggestedTarget,
      sessionLog: strategy.sessionLog,
      agentReports: [
        { 
          agentName: "Chart Observer", 
          findings: observation.substring(0, 4000) + (observation.length > 4000 ? "..." : ""), 
          status: 'SUCCESS' as const 
        },
        ...riskReports
      ]
    };
  } catch (error) {
    console.error("Analysis failed:", error);
    return {
      dayType: "NO TRADE" as const,
      reasoning: `Analysis failed: ${error instanceof Error ? error.message : String(error)}`,
      confidence: 0,
      checks: [],
      agentReports: [
        { 
          agentName: "System", 
          findings: error instanceof Error ? error.stack || error.message : String(error), 
          status: 'ERROR' as const 
        }
      ]
    };
  }
}

export async function generateStrategyInsights(trades: any[], currentRules: string) {
  const systemInstruction = `
    You are a Senior Trading Quantitative Analyst. Your task is to review a trader's history and current rules to propose refinements.
    
    TRADING SYSTEM: MES/MNQ Futures (2.0R Scalping)
    
    Analyze the provided trade log for patterns in:
    - Win rate per day type
    - Common exit reasons for losers
    - Time of day performance
    - Manual outcomes (SUCCESS vs FAILED) tagged by the user
    
    Propose ONE specific, actionable rule refinement that could improve expectancy.
    
    OUTPUT FORMAT (JSON):
    {
      "rule": "The proposed new rule text",
      "reasoning": "Data-driven explanation for why this rule is needed"
    }
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Current Rules: ${currentRules}\n\nTrade History: ${JSON.stringify(trades)}`,
    config: {
      systemInstruction,
      responseMimeType: "application/json"
    }
  });

  try {
    const text = response.text || '{}';
    const cleanedText = text.replace(/```json\n?|```/g, '').trim();
    return JSON.parse(cleanedText);
  } catch (e) {
    console.error("Failed to parse strategy insights response:", e);
    return {
      rule: "No refinement proposed.",
      reasoning: "Failed to parse AI response."
    };
  }
}

export async function validateTrade(context: string) {
  const systemInstruction = `
    You are the AI Trading Analyst. Validate the current trade setup against the checklist.
    Return a JSON response with the verdict and checklist status.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: context,
    config: {
      systemInstruction,
      responseMimeType: "application/json"
    }
  });

  try {
    const text = response.text || '{}';
    const cleanedText = text.replace(/```json\n?|```/g, '').trim();
    return JSON.parse(cleanedText);
  } catch (e) {
    console.error("Failed to parse trade validation response:", e);
    return {
      verdict: "ERROR",
      checklist: []
    };
  }
}
