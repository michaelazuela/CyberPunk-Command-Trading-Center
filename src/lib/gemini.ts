/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AISettings, Trade } from "../types";
import { retrieveSimilarSetups, formatRAGContextForGemini } from "./rag";
import { NormalizedTradePlan } from "./tradePlan";

async function callGeminiAPI(params: any) {
  const payload: any = {
    model: params.model,
    contents: Array.isArray(params.contents) ? params.contents : [params.contents],
    generationConfig: {}
  };

  // Convert inlineData camelCase to inline_data snake_case
  payload.contents.forEach((content: any) => {
    if (content.parts) {
      content.parts.forEach((part: any) => {
        if (part.inlineData) {
          part.inline_data = {
            mime_type: part.inlineData.mimeType,
            data: part.inlineData.data
          };
          delete part.inlineData;
        }
      });
    }
  });

  if (params.config) {
    if (params.config.temperature !== undefined) payload.generationConfig.temperature = params.config.temperature;
    if (params.config.responseMimeType !== undefined) payload.generationConfig.responseMimeType = params.config.responseMimeType;
    if (params.config.systemInstruction) {
      payload.systemInstruction = { parts: [{ text: params.config.systemInstruction }] };
    }
  }

  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorText = await response.text();
    let parsedError = errorText;
    try {
      const json = JSON.parse(errorText);
      if (json.error && json.error.message) {
        parsedError = json.error.message;
      } else if (json.error) {
        parsedError = typeof json.error === 'string' ? json.error : JSON.stringify(json.error);
      }
    } catch (e) {
      // ignore
    }
    throw new Error(`API error (${response.status} ${response.statusText}): ${parsedError}`);
  }
  const data = await response.json();
  
  if (data.usageMetadata && params.route) {
    const { promptTokenCount, candidatesTokenCount } = data.usageMetadata;
    window.dispatchEvent(new CustomEvent('mnq_gemini_usage', {
      detail: {
        route: params.route,
        model: params.model,
        promptTokens: promptTokenCount || 0,
        completionTokens: candidatesTokenCount || 0
      }
    }));
  }

  if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts.length > 0) {
    return { text: data.candidates[0].content.parts[0].text };
  }
  return { text: "{}" };
}

async function superAgent(imageData: string | { exec: string; eth?: string }, settings?: AISettings, previousAnalysis?: any, historicalTrades?: Trade[], modelOverride?: string, routeName?: string, midnightOpenOverride?: string, ragContextStr?: string, dailyInstrument?: string) {
  const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const prompt = `
    ACT AS THE [MNQ/MES_SUPER_AGENT_V3.0]
    You are a unified system composing multiple expert sub-agents running in strict sequence to prevent hallucination.
    
    [USER-SELECTED DAILY INSTRUMENT]
    Instrument: ${dailyInstrument || "MES"}
    This is the source of truth. Do not override it based on screenshot OCR.
    If the screenshot label appears different, mention it as a warning but continue using the selected instrument.
    
    ${routeName === 'morning_replay' ? '[HISTORICAL REPLAY MODE: MORNING]\nAnalyze the historical day as if current replay time is 10:10 AM ET on the selected Trading Date. Use current Morning Analysis rules only. Do NOT use future data.' : ''}
    ${routeName === 'lunch_replay' ? '[HISTORICAL REPLAY MODE: LUNCH]\nAnalyze the historical day as if current replay time is inside the Lunch Reversal window. Use current Lunch Reversal rules only. Do NOT use future data.' : ''}

    [STRICTURES: ZERO_PROSE | ROBOTIC_PRECISION | COLD_LOGIC | 5M_TIMEFRAME]

    Your task is to process the chart image sequentially in a fully structured JSON response.

    =========================================
    MODULE 0: [HISTORICAL_CONTEXT] (RAG)
    --- RAG CONTEXT INJECTION ---
    ${ragContextStr || 'No similar past setups found.'}
    --- END RAG CONTEXT ---

    --- PREVIOUS SESSION ANALYSIS INJECTION ---
    ${previousAnalysis ? JSON.stringify(previousAnalysis) : 'No previous analysis for this session.'}
    --- END PREVIOUS SESSION ANALYSIS ---

    Use the historical and previous session context above to:
    1. Calibrate confidence based on similar setup outcomes.
    2. Note patterns, such as similar setups winning or losing.
    3. Adjust bias if historical win rate contradicts the current chart signal.
    4. Return historical_context_used as true if similar setups were provided.
    5. Carry forward relevant context from the previous session (e.g., morning ETH levels, Midnight Open analysis).
    6. Do not let historical replay data replace current chart analysis. First perform independent rule-based analysis from the current screenshot. Then use Replay/RAG records only as supporting evidence to adjust confidence and explain whether similar historical setups succeeded or failed.

    =========================================
    MODULE 1: [DATA_EXTRACTOR] (Vision)
    - Focus EXCLUSIVELY on 5-Minute Highs, Lows, Closes.
    - Measure Wick-to-Body ratio precisely. Ignore indicators, volume, VWAP.
    - Identify Sequence: HH, HL, LH, LL.
    - Identify Overlap: Body Overlap > 80%, Overlapping Wicks, Low Velocity.

    =========================================
    MODULE 2: [LOGIC_PROCESSOR] (Strategy)
    - Enforce rules based ONLY on Module 1 data.
    - MOMENTUM(09:30-10:00) ➔ PRIMARY_BIAS. (No single-wick flip).
    - PRIORITY 1 [VILLAIN SWEEP]: IF (WICK > IB_HIGH AND CLOSE < IB_HIGH) ➔ FLIP BIAS TO SHORT (Buyers Trapped).
    - PRIORITY 1 [LIQUIDITY HUNT]: IF (WICK < IB_LOW AND CLOSE > IB_LOW) ➔ FLIP BIAS TO LONG (Sellers Trapped).
    - IF (2x CONSECUTIVE_BARS FAIL_EXTREME) AND (CLOSE < PREV_BODY_LOW) ➔ ACTION: FLIP_BIAS.
    - IF (LAST_HL == INTACT) AND (STAIRCASE == HH/HL) ➔ BIAS: LONG (Ignore wicks).
    - IF (PRICE > IB_HIGH) AND (STAIRCASE == HH/HL) ➔ 2-BAR RULE = ONLY BIAS KILLER.
    - IF (TIME_IN_IB > 45min) ➔ STATUS: NEUTRAL / FRICTION. (Wait: 2-Bar Guard).
    - IF (OVERLAP > 80%) AND (VELOCITY == LOW) ➔ NO_WICK_ENTRY. (Wait: Clearing Bar).
    - IF (WICK > ANCHOR ± 1pt) AND (CLOSE == INSIDE_IB) AND (C2 == DEEP_RECLAIM) ➔ ACTION: FLIP_BIAS. (Stop: Wick_Extreme + 1t).
    - IF (2-BAR_GUARD == TRUE) AND (PRICE > ANCHOR + 5pts) ➔ WAIT: 1st COUNTER-TREND BREATHER. (Execute: Breather_Break).
    - IF (DISTANCE > 10pts) WITHOUT_FILL ➔ STATUS: EXPIRED. (No chase).
    - IF (VERTICAL_RUNAWAY) AND (NO_WICKS) ➔ STAIRCASE = 100% PRIORITY.
    - CALCULATE TARGETS: Risk = |Entry - Stop|. Target 1.5R = Entry ± (Risk * 1.5). Target 2.0R = Entry ± (Risk * 2.0).
    - IF (RISK > 15pts) ➔ TARGET = 1.5R.
    - IF (TIME == 12:30 EDT - 30min) ➔ TARGET = 1.0R - 1.5R.
    - IF (TIME == 10:30) AND (MOVE > 50%_TARGET) ➔ ACTION: STOP = BE / 10:00 STRUCTURE.

    SETUP SIGNATURES:
    T1L: 09:30 Green + Staircase | T2L: 09:30 Doji + 09:35 Green
    T1S: 09:30 Red/Close<Open + Staircase | T2S: Overnight Gap + Red Rejection
    DIST: Upper Wick Rejection + 2-Bar Failure at Highs.

    =========================================
    MODULE 3: [FRICTION_SCANNER] (Devil's Advocate)
    - Challenge Module 2 Processor. SCAN: Overlap > 80%, Overlapping Wicks, Low Velocity, Villain Traps.
    - State if 'SUCCESS', 'WARNING', or 'ERROR' and assess a confidence penalty.

    =========================================
    MODULE 4: [RISK_AUDITOR] (Safety Gate)
    - AUDIT the required stop-loss distance against system caps.
    - MAXIMUM STOP: 8 points. IF RISK > 8 points ➔ WARNING: OVERSIZED RISK.
    - ACCOUNT EQUITY: Assume $5000. IF RISK > 2% ($100 per contract) ➔ WARNING: OVERLEVERAGED.
    - MONTE CARLO PROBABILITY: Based on the 5-minute wicks and HH/HL structure, what is the probability of hitting 2.0R vs 1.0R STOP?
    - Provide a Final GO / NO-GO validation.

    =========================================
    MODULE 5: [MIDNIGHT_STRATEGIST]
    --- MIDNIGHT OPEN ANALYSIS ---
    The Midnight Open is the price at the 12:00 AM ET candle open. It is a
    primary ICT institutional reference level. The trader uses NinjaTrader
    with a horizontal line drawn at this level.

    ${midnightOpenOverride 
      ? `The user has confirmed the midnight open price is: ${midnightOpenOverride}. Use this value — do not attempt to read it from the chart visually.` 
      : `Identify the midnight open horizontal line on the chart and read its price level as accurately as possible.`}

    Statistical edge (use in your bias assessment):
    - RTH opens ABOVE midnight open: 58% probability of retracing DOWN to it (ES) / 57% (NQ). On Thursdays (ES) and Tuesdays (NQ), probabilities are higher.
    - RTH opens BELOW midnight open: 69% probability of retracing UP to it (ES) / 63% (NQ). Tuesday NQ: 73% probability.

    Today is: ${currentDay}. Apply day-specific edge adjustments above.

    =========================================
    MODULE 6: [FINAL_DECISION] (Final Trade Plan)
    - THIS IS CRITICAL: You MUST ALWAYS output the \`final_trade_plan\` object in your JSON response.
    - Act as a Best Plan Selector, not a single-shot answer.
    - Evaluate at least 3 competing setup candidates when visible on the chart: Liquidity Sweep, Momentum/Runaway, FVG/Imbalance, Initial Balance Extension, Opening Order Block, EQH/EQL, PDH/PDL Sweep, and No Trade.
    - Return every reviewed plan in \`candidate_trade_plans\`. Invalid candidates still belong in the array with direction = NO TRADE or null prices and a rejection_reason.
    - Rank candidates by price-action clarity, risk size, R:R, timing window, RAG support/conflict, and risk-auditor status.
    - Return exactly one \`best_trade_plan\` that explains why it beat the alternatives.
    - Consolidate all reasoning across the modules into a final, actionable trade decision.
    - Provide exact entry price, stop-loss price, and realistic targets.
    - IMPORTANT: The app calculates T1 and T2 deterministically from entry and stop (T1 = 1.5R, T2 = 2.0R). You must still return final_trade_plan with decision, entry, stop, confidence, why_this_plan, and what_would_invalidate. You should still return target_1 and target_2 if possible, but the app may recompute them using Risk = abs(entry - stop).
    - CONSISTENCY LOCK: If current_rule_analysis contains an executable setup with entry and stop, best_trade_plan and final_trade_plan MUST repeat the same direction, entry, stop, target_1, and target_2 unless another candidate clearly outranks it. If another candidate wins, current_rule_analysis must explain why the lower-priority setup was rejected.
    - If best_trade_plan/final_trade_plan = NO TRADE, then current_rule_analysis.entry, stop, target_1, and target_2 MUST all be null and current_rule_analysis.no_trade_reason MUST be populated.
    - If no trade is valid, return decision = NO TRADE and explain why. Do not omit final_trade_plan.

    =========================================
    MODULE 7: [TRADE_MANAGEMENT_AGENT] (After Entry Management)
    - This module runs AFTER the Best Plan Selector.
    - Its job is NOT to choose the entry. Its job is to define how the trade should be managed after entry.
    - For every executable best_trade_plan, specify what to do if price moves in favor, stalls before T1, hits 1R, hits T1, or shows a two-bar failure.
    - Prefer T1-first management after vertical morning expansion. T2 should be treated as a runner unless structure stays clean.
    - Define whether success means T1, T2, or structure-based continuation.
    - Define the outcome labels the app should use for proof review and RAG learning: STOPPED_OUT, T1_HIT, T2_HIT, PARTIAL_WIN_THEN_STOP, NEAR_T1_THEN_REVERSED.
    - If no trade is valid, return management_style = NO_MANAGEMENT and explain that there is no active trade to manage.

    Return this object inside your JSON response:
    "midnightAnalysis": { ... }

    ${settings?.customInstructions ? `USER INSTRUCTIONS:\n${settings.customInstructions}` : ''}

    OUTPUT SCHEMA (JSON ONLY):
    {
      "step1_DataExtraction": "Factual extraction of OHLC, wicks, structures.",
      "step2_Strategy": {
        "dayType": "TYPE 1 LONG" | "TYPE 2 LONG" | "TYPE 1 SHORT" | "TYPE 2 SHORT" | "LUNCH REVERSAL" | "DISTRIBUTION" | "NO TRADE",
        "reasoning": "[SYSTEM_PULSE]: [DATA_EXTRACTOR] SYNC | [LOGIC_PROCESSOR] ACTIVE\\n\\nMarkdown table with ENTRY/STOP/TARGET...",
        "confidence": 0-1,
        "sweepAndReclaim": "YES" | "NO",
        "is1055Reversal": boolean,
        "rejectionStrength": "LOW" | "MEDIUM" | "HIGH" | "EXTREME",
        "levelCheck": "string",
        "structureStatus": "string",
        "checks": [ { "label": "string", "passed": true } ],
        "suggestedEntry": 0, "suggestedStop": 0, "suggestedTarget": 0, "suggestedTarget15R": 0, "suggestedTarget20R": 0,
        "tags": ["tag1", "tag2"],
        "sessionLog": { "timestamp": "ISO", "instrument": "MES", "final_bias": "LONG", "confidence": 0.8, "key_structural_level": "5000", "recalibration_status": "ACTIVE" }
      },
      "step3_Review": {
        "findings": "Counter-argument or approval.",
        "ruleCitation": "Specific rule referenced",
        "status": "SUCCESS" | "WARNING" | "ERROR",
        "confidencePenalty": 0.1
      },
      "step4_RiskAudit": {
        "riskAmount": number,
        "riskPercent": number,
        "status": "GO" | "NO-GO" | "WARNING",
        "auditLog": "Detailed risk assessment",
        "monteCarloForecast": "Probabilistic outcome based on volatility",
        "probabilitySuccess": number
      },
      "midnightAnalysis": {
        "level": number,
        "band": [number, number],
        "interactions": [{ "timestamp": "string", "price": number, "type": "WICK_REJECTION" | "PIERCE" | "CLOSE_BEYOND", "session": "ETH" | "RTH_OPEN" | "RTH_LATER" }],
        "role": "SUPPORT" | "RESISTANCE" | "NEUTRAL",
        "wickVetoCandidate": boolean,
        "vetoCount": number,
        "justification": "string",
        "proposals": [
          {
            "option": "A" | "B" | "C",
            "title": "string",
            "description": "string",
            "pros": ["string"],
            "cons": ["string"],
            "recommendation": "string"
          }
        ]
      },
      "executionReview5m": {
         "structure930To1010": "string",
         "initialBalanceBehavior": "string",
         "openingCandleRead": "string",
         "sweepReclaim": "string",
         "mssChoch": "string",
         "entryQuality": "string",
         "stopPlacement": "string",
         "targetQuality": "string"
      },
      "ethContextReview": {
         "available": boolean,
         "status": "detected" | "missing" | "unclear",
         "ethHigh": 0, "ethLow": 0,
         "asianHigh": 0, "asianLow": 0,
         "londonHigh": 0, "londonLow": 0,
         "nyPremarketHigh": 0, "nyPremarketLow": 0,
         "rthOpenRelationToEth": "above_eth_high" | "below_eth_low" | "inside_eth_range" | "at_eth_high" | "at_eth_low" | "unknown",
         "rthOpenRelationToMidnight": "above" | "below" | "at" | "unknown",
         "checklist": {
            "ethHighVisible": "detected", "ethLowVisible": "detected", "asianHighVisible": "detected", "asianLowVisible": "detected",
            "londonHighVisible": "detected", "londonLowVisible": "detected", "midnightOpenConfirmed": "detected",
            "nyPremarketHighVisible": "detected", "nyPremarketLowVisible": "detected", "rthOpenVisible": "detected"
         },
         "planImpact": "string",
         "confidenceAdjustment": "increase" | "decrease" | "neutral",
         "confidenceAdjustmentReason": "string"
      },
      "afternoonTestPlan": {
         "morningBiasCarryover": "LONG" | "SHORT" | "NEUTRAL",
         "lunchExpectation": "CONTINUATION" | "REVERSAL" | "NO TRADE" | "WAIT",
         "keyMorningLevels": ["string"],
         "ethLevelsStillRelevant": ["string"],
         "midnightOpenRelevance": "string",
         "lunchTrapLevel": 0,
         "afternoonInvalidationLevel": 0,
         "confidence": 0,
         "plan": "string"
      },
      "current_rule_analysis": {
        "summary": "string",
        "setup_detected": "string",
        "rule_category": "string",
        "entry": "number or null",
        "stop": "number or null",
        "target_1": "number or null",
        "target_2": "number or null",
        "no_trade_reason": "string or null",
        "base_confidence": "High | Medium | Low"
      },
      "rag_learning_context": {
        "rag_search_attempted": true,
        "rag_records_found": 0,
        "live_records_found": 0,
        "replay_records_found": 0,
        "historical_win_count": 0,
        "historical_loss_count": 0,
        "historical_scratch_count": 0,
        "historical_no_trade_count": 0,
        "average_pnl_ticks": 0,
        "historical_support_rating": "SUPPORTS PLAN | CONFLICTS WITH PLAN | NEUTRAL | INSUFFICIENT DATA",
        "confidence_adjustment": "Increased | Reduced | Unchanged",
        "explanation": "string"
      },
      "final_trade_plan": {
        "decision": "LONG | SHORT | NO TRADE",
        "entry": "number or null",
        "stop": "number or null",
        "target_1": "number or null",
        "target_2": "number or null",
        "risk_reward": "string or null",
        "final_confidence": "High | Medium | Low",
        "why_this_plan": "string",
        "what_would_invalidate": "string"
      },
      "candidate_trade_plans": [
        {
          "id": "candidate_1",
          "rank": 1,
          "setup_name": "Liquidity Sweep | Momentum Entry | FVG | IB Extension | No Trade",
          "rule_category": "string",
          "direction": "LONG | SHORT | NO TRADE",
          "entry": "number or null",
          "stop": "number or null",
          "target_1": "number or null",
          "target_2": "number or null",
          "confidence": "High | Medium | Low",
          "priority_score": 0.0,
          "invalidation": "string",
          "why_this_plan": "string",
          "rag_support": "SUPPORTS PLAN | CONFLICTS WITH PLAN | NEUTRAL | INSUFFICIENT DATA",
          "selected": true,
          "rejection_reason": "null for selected candidate; reason rejected for non-selected candidates"
        }
      ],
      "best_trade_plan": {
        "selected_candidate_id": "candidate_1",
        "decision": "LONG | SHORT | NO TRADE",
        "entry": "number or null",
        "stop": "number or null",
        "target_1": "number or null",
        "target_2": "number or null",
        "final_confidence": "High | Medium | Low",
        "priority_score": 0.0,
        "why_it_won": "string explaining why this candidate beat alternatives",
        "rejected_alternatives": [
          { "setup_name": "string", "rejection_reason": "string" }
        ],
        "rag_support": "SUPPORTS PLAN | CONFLICTS WITH PLAN | NEUTRAL | INSUFFICIENT DATA",
        "what_would_invalidate": "string"
      },
      "trade_management_plan": {
        "management_style": "T1_FIRST | RUNNER | SCALP_ONLY | NO_MANAGEMENT",
        "primary_success_target": "T1 | T2 | STRUCTURE_BASED",
        "move_stop_to_breakeven_at": "number or null",
        "trail_stop_after_t1": "number or null",
        "partial_exit_at_t1": true,
        "runner_rules": "string",
        "failure_warning": "string",
        "if_price_reaches_1r": "string",
        "if_price_reaches_t1": "string",
        "if_price_reverses_before_t1": "string",
        "if_two_bar_failure_appears": "string",
        "outcome_labels": {
          "stopped_out": "STOPPED_OUT",
          "t1_hit": "T1_HIT",
          "t2_hit": "T2_HIT",
          "partial_then_stop": "PARTIAL_WIN_THEN_STOP",
          "near_t1_then_reversed": "NEAR_T1_THEN_REVERSED"
        },
        "management_reasoning": "string"
      },
      "agent_learning_used": true
    }
  `;

  let inlineParts: any[] = [];
  if (typeof imageData === 'string') {
    inlineParts.push({ inlineData: { mimeType: "image/png", data: imageData.split(',')[1] || imageData } });
  } else {
    inlineParts.push({ inlineData: { mimeType: "image/png", data: imageData.exec.split(',')[1] || imageData.exec } });
    if (imageData.eth) {
      inlineParts.push({ inlineData: { mimeType: "image/png", data: imageData.eth.split(',')[1] || imageData.eth } });
    }
  }

  const response = await callGeminiAPI({
    model: modelOverride || "gemini-3.1-pro-preview",
    route: routeName,
    contents: {
      parts: [
        { text: prompt },
        ...inlineParts
      ]
    },
    config: {
      responseMimeType: "application/json",
      temperature: ["morning", "lunch", "morning_replay", "lunch_replay"].includes(routeName || "") ? 0.0 : (settings?.temperature ?? 0.0),
      
    }
  });

  try {
    const text = response.text || "{}";
    const cleanedText = text.replace(/```json\n?|```/g, '').trim();
    return JSON.parse(cleanedText);
  } catch (e) {
    console.error("Super Agent parse failed:", e);
    return null;
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

export interface OCRResult {
  ticker?: string;
  timeframe?: string;
  currentPrice?: number;
  lastTimestamp?: string;
  timezone?: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
}

export async function preCheckChartInfo(imageData: string, analysisType?: string, modelOverride?: string): Promise<OCRResult> {
  const prompt = `
    You are an expert financial chart OCR system. 
    Analyze this chart image and extract the following metadata exactly.
    Do not hallucinate. If you cannot see a value clearly, return null for it.
    
    1. Ticker symbol (e.g. MES, NQ, SPY)
    2. Timeframe (e.g. 5m, 1m, 1h)
    3. The absolute last (current) price shown on the Y-axis or price label.
    4. The most recent time/date on the X-axis.
    5. Overall confidence in reading these numbers (HIGH, MEDIUM, LOW).
    
    Return ONLY valid JSON in this schema:
    {
       "ticker": "string or null",
       "timeframe": "string or null",
       "currentPrice": number or null,
       "lastTimestamp": "string or null",
       "confidence": "HIGH" | "MEDIUM" | "LOW"
    }
  `;

  const context = {
    parts: [
      { text: prompt },
      { inlineData: { data: imageData.split(',')[1], mimeType: "image/jpeg" } }
    ]
  };

  const response = await callGeminiAPI({
    model: modelOverride || "gemini-3.1-flash-preview", 
    route: analysisType || "ocr",
    contents: [context],
    config: {
      temperature: 0.0,
      responseMimeType: "application/json",
      systemInstruction: "You are an automated OCR pre-check system. Output strictly valid JSON."
    } as any
  });

  const textVal = response.text || "";
  try {
    return JSON.parse(textVal) as OCRResult;
  } catch (e) {
    console.error("Failed to parse OCR result", textVal);
    return { confidence: "LOW" };
  }
}

export async function analyzeChart(imageData: string | { exec: string; eth?: string }, settings?: AISettings, accountEquity: number = 5000, previousAnalysis?: any, historicalTrades?: Trade[], analysisType?: string, modelOverride?: string, midnightOpenOverride?: string, dailyInstrument?: string) {
  try {
    const isMorning = analysisType !== 'lunch' && analysisType !== 'lunch_replay';
    const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    
    // RAG Retrieval
    const ragQuery = {
      sessionType: isMorning ? 'morning' : 'lunch',
      instrument: dailyInstrument || 'MES', // Use selected instrument
      dayOfWeek: dayOfWeek,
      rthVsMidnight: undefined, // Unknown at query time
      ibPosition: undefined
    };
    
    let similarSetups: any[] = [];
    let agentLearningSummary: any = null;
    let ragContextStr = "";
    try {
      const { retrieveSimilarSetups, buildAgentLearningSummary } = await import('./rag');
      similarSetups = await retrieveSimilarSetups(ragQuery);
      console.log(`[RAG] Retrieved ${similarSetups.length} similar setups for ${ragQuery.sessionType} analysis`);
      
      if (similarSetups && similarSetups.length > 0) {
        agentLearningSummary = buildAgentLearningSummary(similarSetups);
        ragContextStr = `
--- AGENT LEARNING FROM TRADE HISTORY ---
Similar setups retrieved: ${agentLearningSummary.setupCount}
Completed outcomes: ${agentLearningSummary.completedCount}
Wins: ${agentLearningSummary.winCount}
Losses: ${agentLearningSummary.lossCount}
Scratches: ${agentLearningSummary.scratchCount}
Pending: ${agentLearningSummary.pendingCount}
Historical win rate: ${agentLearningSummary.winRate !== null ? Math.round(agentLearningSummary.winRate * 100) + '%' : "not enough data"}
Average PnL: ${agentLearningSummary.avgPnlTicks !== null ? agentLearningSummary.avgPnlTicks.toFixed(1) : 0} ticks / ${agentLearningSummary.avgPnlDollars !== null ? '$' + agentLearningSummary.avgPnlDollars : '0 dollars'}
Strongest lesson: ${agentLearningSummary.strongestLesson}
Risk warning: ${agentLearningSummary.riskWarning || "none"}
Confidence adjustment: ${agentLearningSummary.confidenceAdjustment}
Reason: ${agentLearningSummary.confidenceAdjustmentReason}
--- END AGENT LEARNING ---

--- MIDNIGHT OPEN RAG LEARNING ---
Similar Midnight Open setups found: ${agentLearningSummary.midnightSetupCount}
Completed outcomes: ${agentLearningSummary.midnightCompletedCount}
Win rate: ${agentLearningSummary.midnightWinRate !== null ? Math.round(agentLearningSummary.midnightWinRate * 100) + '%' : 'no data'}
Average P&L: ${agentLearningSummary.midnightAvgPnlTicks !== null ? agentLearningSummary.midnightAvgPnlTicks.toFixed(1) : 0} ticks / $${agentLearningSummary.midnightAvgPnlDollars || 0}
Pattern learned: ${agentLearningSummary.midnightPatternLearned}
Risk warning: ${agentLearningSummary.midnightRiskWarning || "none"}
Best historical match: ${agentLearningSummary.midnightBestMatch ? 
  `${agentLearningSummary.midnightBestMatch.tradeDate} | ${agentLearningSummary.midnightBestMatch.sessionType} | ${agentLearningSummary.midnightBestMatch.instrument} | ${agentLearningSummary.midnightBestMatch.tradeResult} | ${agentLearningSummary.midnightBestMatch.pnlTicks} ticks` : 
  'None'}
--- END MIDNIGHT OPEN RAG LEARNING ---

Use Agent Learning as evidence, not as a replacement for current chart analysis. If the current chart conflicts with historical outcomes, explain the conflict. If similar historical setups performed poorly, reduce confidence unless the current setup has stronger price-action confirmation.

Use Midnight Open RAG Learning to study how similar historical Midnight Open conditions performed. Do not treat Midnight Open as a temporary UI value. It is a core historical feature used for future trading plans. If similar Midnight Open setups performed poorly, reduce confidence unless current price action is materially stronger. If similar Midnight Open setups performed well, explain whether the current setup matches those winning conditions.
`;
      }
    } catch (e) {
      console.error("[RAG] Retrieval failed", e);
    }
    
    // Step 1: Execute Unified Super Agent
    const superReport = await superAgent(imageData, settings, previousAnalysis, historicalTrades, modelOverride, analysisType, midnightOpenOverride, ragContextStr, dailyInstrument);
    
    if (!superReport) {
      throw new Error("Super Agent returned an empty report.");
    }
    
    // Step 2: Extract steps
    const observation = superReport.step1_DataExtraction || "No extraction completed.";
    const strategy = superReport.step2_Strategy || {};
    const advocateReport = superReport.step3_Review || null;
    const riskAudit = superReport.step4_RiskAudit || null;

    let finalConfidence = typeof strategy.confidence === 'number' ? strategy.confidence : 0;
    const additionalReports: any[] = [];
    
    if (advocateReport) {
      if (advocateReport.confidencePenalty && typeof advocateReport.confidencePenalty === 'number') {
        finalConfidence = Math.max(0, finalConfidence - advocateReport.confidencePenalty);
      }
      additionalReports.push({
        agentName: "Devil's Advocate",
        findings: advocateReport.findings || "",
        ruleCitation: advocateReport.ruleCitation,
        status: advocateReport.status || 'WARNING'
      });
    }

    if (riskAudit) {
      additionalReports.push({
        agentName: "Risk Auditor",
        findings: `${riskAudit.auditLog}\n\nMonte Carlo Forecast: ${riskAudit.monteCarloForecast}`,
        status: riskAudit.status === 'GO' ? 'SUCCESS' : (riskAudit.status === 'NO-GO' ? 'ERROR' : 'WARNING')
      });
    } else {
      // Step 3: Manual Risk Audit Fallback
      const manualRiskReports = await riskAuditorAgent(strategy, accountEquity);
      additionalReports.push(...manualRiskReports);
    }

    // Combine into final result with robust defaults
    return {
      dayType: strategy.dayType || "NO TRADE",
      reasoning: strategy.reasoning || "No reasoning provided by the AI.",
      confidence: finalConfidence,
      checks: Array.isArray(strategy.checks) ? strategy.checks : [],
      sweepAndReclaim: strategy.sweepAndReclaim || "NO",
      is1055Reversal: !!strategy.is1055Reversal,
      rejectionStrength: strategy.rejectionStrength || "LOW",
      levelCheck: strategy.levelCheck || "PENDING",
      structureStatus: strategy.structureStatus || "PENDING",
      suggestedEntry: strategy.suggestedEntry,
      suggestedStop: strategy.suggestedStop,
      suggestedTarget: strategy.suggestedTarget,
      suggestedTarget15R: strategy.suggestedTarget15R,
      suggestedTarget20R: strategy.suggestedTarget20R,
      sessionLog: strategy.sessionLog,
      step4_RiskAudit: riskAudit,
      midnightAnalysis: superReport.midnightAnalysis,
      tradePlan: superReport.tradePlan,
      executionReview5m: superReport.executionReview5m,
      ethContextReview: superReport.ethContextReview,
      afternoonTestPlan: superReport.afternoonTestPlan,
      current_rule_analysis: superReport.current_rule_analysis,
      rag_learning_context: superReport.rag_learning_context,
      final_trade_plan: superReport.final_trade_plan,
      candidate_trade_plans: Array.isArray(superReport.candidate_trade_plans) ? superReport.candidate_trade_plans : [],
      best_trade_plan: superReport.best_trade_plan,
      trade_management_plan: superReport.trade_management_plan,
      agent_learning_used: superReport.agent_learning_used,
      similarSetups,
      agentLearningSummary,
      historicalContextUsed: !!similarSetups.length,
      agentReports: [
        { 
          agentName: "Chart Observer", 
          findings: observation.substring(0, 4000) + (observation.length > 4000 ? "..." : ""), 
          status: 'SUCCESS' as const 
        },
        ...additionalReports
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

  const response = await callGeminiAPI({
    model: "gemini-3.1-pro-preview",
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

  const response = await callGeminiAPI({
    model: "gemini-3.1-pro-preview",
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

export async function reviewTradeProof(image: string, claimedResult: string, contracts: number, modelToUse: string = "gemini-3-pro-preview", dailyInstrument?: string, tradePlan?: NormalizedTradePlan) {
  const planText = tradePlan && tradePlan.canExecute
    ? `
[TRADE PLAN TO VERIFY]
Direction: ${tradePlan.decision}
Entry: ${tradePlan.entry}
Stop: ${tradePlan.stop}
Target 1 (T1): ${tradePlan.t1}
Target 2 (T2): ${tradePlan.t2}
Risk points: ${tradePlan.riskPoints}
`
    : `
[TRADE PLAN TO VERIFY]
No complete normalized trade plan was provided. Return UNCLEAR unless the screenshot itself clearly shows stop/target levels and outcome.
`;

  const systemInstruction = `
You are a futures trade outcome auditor reviewing a chart screenshot provided as proof of whether a MES or MNQ trade plan worked.

The trader has claimed this trade was: ${claimedResult} (${contracts} contract(s)).
The proof screenshot does NOT need to prove an order was placed. Your job is to determine from visible price action whether the planned stop was avoided and whether T1 and/or T2 were reached.

[USER-SELECTED DAILY INSTRUMENT]
Instrument: ${dailyInstrument || "MES"}
This is the source of truth. Do not override it based on screenshot OCR.
If the screenshot label appears different, mention it as a caveat but continue to evaluate the visible price action using the user-selected instrument.

${planText}

Review the screenshot carefully and look for any of the following evidence:
- Price reaching or crossing the stop level before any target
- Price reaching T1 before the stop
- Price reaching T2 before the stop
- Candle highs/lows, wick touches, closes, or visible horizontal levels that confirm the sequence
- Optional: PnL/order evidence if it is visible, but do not require it

Return your analysis in this JSON format only. Do not return text outside the JSON:

{
  "verdict": "CONFIRMED | DISPUTED | UNCLEAR",
  "confidence": "High | Medium | Low",
  "target_1_hit": true,
  "target_2_hit": false,
  "stopped_out": false,
  "evidence_found": [
    "string describing piece of evidence 1",
    "string describing piece of evidence 2"
  ],
  "claimed_result": "${claimedResult}",
  "screenshot_shows": "brief description of what is visible in the screenshot",
  "notes": "any caveats, missing information, or concerns",
  "dispute_reason": "only populated if verdict is DISPUTED — what contradicts the claim"
}

Verdict definitions:
- CONFIRMED: The screenshot clearly supports the claimed result using the visible stop/T1/T2 outcome.
- DISPUTED: The screenshot shows price action that contradicts the claimed result.
- UNCLEAR: The screenshot does not contain enough visible price/level information to confirm or deny.

Target/stop field rules:
- target_1_hit must be true only if T1 is visibly reached before stop, false if visibly not reached, null if unclear.
- target_2_hit must be true only if T2 is visibly reached before stop, false if visibly not reached, null if unclear.
- stopped_out must be true only if stop is visibly reached before targets, false if the screenshot shows stop was not reached, null if unclear.
  `.trim();

  let imgToSend = image;
  try {
    const cloudStorage = await import('./cloudStorage');
    if (import.meta.env.DEV) console.log(`[PROOF REVIEW] Image size before compression: ${Math.round(image.length / 1024)} KB`);
    imgToSend = await cloudStorage.compressImage(image, 1600, 0.6); // Compress aggressively
    if (import.meta.env.DEV) console.log(`[PROOF REVIEW] Image size after compression: ${Math.round(imgToSend.length / 1024)} KB`);
  } catch(e) {
    console.warn("Failed to compress proof image for review, using original");
  }

  const base64Data = imgToSend.split(',')[1] || imgToSend;
  
  if (import.meta.env.DEV) {
    console.log(`[PROOF REVIEW] Started review`);
    console.log(`[PROOF REVIEW] Claimed: ${claimedResult}, Contracts: ${contracts}`);
    console.log(`[PROOF REVIEW] Model: ${modelToUse}`);
  }

  let attempt = 0;
  let lastError = null;

  while(attempt < 3) {
    attempt++;
    try {
      const response: any = await Promise.race([
        callGeminiAPI({
          model: modelToUse,
          contents: [
             { parts: [{ text: "Please review this proof screenshot." }] },
             { parts: [{ inlineData: { mimeType: "image/jpeg", data: base64Data } }] }
          ],
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            temperature: 0.1
          }
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 120000))
      ]);
      
      const text = response.text || "{}";
      const cleaned = text.replace(/```json\n?|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (import.meta.env.DEV) {
        console.log(`[PROOF REVIEW] Verdict: ${parsed.verdict}, Confidence: ${parsed.confidence}`);
      }
      return parsed;

    } catch (e: any) {
      lastError = e;
      const msg = e.message || String(e);
      if (msg.includes('429') || msg.includes('503') || msg.includes('TIMEOUT') || msg.includes('fetch failed')) {
         if (attempt < 3) {
            await new Promise(r => setTimeout(r, 2000 * attempt));
            continue;
         }
      }
      
      // If it's a parsing error but we got here, it's not retryable in the same way
      if (e instanceof SyntaxError) {
         if (import.meta.env.DEV) console.log(`[PROOF REVIEW] PARSE ERROR`, e);
         return {
           verdict: "UNCLEAR",
           confidence: "Low",
           evidence_found: [],
           claimed_result: claimedResult,
           screenshot_shows: "Unknown due to parsing error",
           notes: "The AI response could not be parsed as valid JSON.",
         };
      }
      break; // any other non-retryable error
    }
  }
  
  throw lastError || new Error("Failed to review trade proof");
}
