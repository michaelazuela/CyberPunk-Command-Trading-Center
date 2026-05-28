/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AISettings, ChartContext, Trade } from "../types";
import { retrieveSimilarSetups, formatRAGContextForGemini } from "./rag";
import { NormalizedTradePlan } from "./tradePlan";
import { loadModelConfig } from "./modelRouter";
import { buildChartContextConsensus } from "./chartContextConsensus";

function coerceGeminiText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value == null) return '{}';
  try {
    return JSON.stringify(value);
  } catch {
    return '{}';
  }
}

async function readJsonResponse(response: Response): Promise<any> {
  const responseText = await response.text();
  if (!responseText) return {};
  try {
    return JSON.parse(responseText);
  } catch (error) {
    const isTimeout = response.status === 524 || responseText.toLowerCase().includes('error code: 524');
    throw new Error(isTimeout
      ? 'Cloudflare timed out while waiting for the Gemini response. Please retry the analysis.'
      : `Gemini returned a non-JSON response: ${responseText.slice(0, 240)}`
    );
  }
}

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
  const data = await readJsonResponse(response);
  if (!response.ok) {
    let parsedError = data;
    if (data.error && data.error.message) {
      parsedError = data.error.message;
    } else if (data.error) {
      parsedError = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
    }
    throw new Error(`API error (${response.status} ${response.statusText}): ${parsedError}`);
  }
  
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

type ChartImagePayload = string | {
  exec: string;
  eth?: string;
  morningExec?: string;
};

async function superAgent(imageData: ChartImagePayload, settings?: AISettings, previousAnalysis?: any, historicalTrades?: Trade[], modelOverride?: string, routeName?: string, midnightOpenOverride?: string, ragContextStr?: string, dailyInstrument?: string, accountEquity: number = 5000, riskPercent: number = 0.02) {
  const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const prompt = `
    ACT AS THE [MNQ/MES_MASTER_TRADING_DESK_V4.0]
    You are a unified institutional futures review desk operating at a 20+ year master-trader standard. You compose multiple expert sub-agents running in strict sequence to prevent hallucination.
    Your voice is decisive, risk-first, structurally aware, and professional. Do not sound like a casual trade assistant. Do not hype trades. Do not claim real-world certification, personal wealth, or guaranteed results.
    
    [USER-SELECTED DAILY INSTRUMENT]
    Instrument: ${dailyInstrument || "MES"}
    This is the source of truth. Do not override it based on screenshot OCR.
    If the screenshot label appears different, mention it as a warning but continue using the selected instrument.

    [15M ETH CONTEXT IMAGE RULE]
    If a second image is provided, treat it as a 15M ETH context screenshot only. It may help extract ETH high/low, Asian high/low, London high/low, NY premarket high/low, overnight high/low, broader trend, compression/expansion, major support/resistance, and early RTH direction into 10:00 AM ET.
    The 15M ETH context image must not approve a trade by itself, generate final entry/stop/T1/T2 by itself, override the 5M execution chart, override the app-owned plan engine, override the deterministic trade decision pipeline, override risk rules, or override setup scanner ranking.
    The 5M execution image remains the authority for entry trigger, active swing, stop placement, risk check, and final trade approval.

    [LUNCH MORNING CONTEXT IMAGE RULE]
    For Lunch Review routes, an additional Morning 5M context image may be provided after the 15M ETH context image. Treat that Morning 5M image as context only. Use it to identify morning high, morning low, initial drive, morning extension, failed continuation potential, and whether the lunch chart is sweeping or reclaiming a morning boundary.
    The Morning 5M context image must not approve a lunch trade by itself, generate lunch entry/stop/T1/T2 by itself, override the current Lunch 5M execution chart, override the app-owned plan engine, override the deterministic trade decision pipeline, override risk rules, or override setup scanner ranking.
    The current Lunch 5M execution image remains the authority for lunch entry trigger, active swing, stop placement, risk check, and final lunch trade approval.

    [LUNCH SUBTYPE FACT EXTRACTION RULE]
    For Lunch routes, extract facts for these Lunch-only subtypes: Lunch Failed High Reversal, Lunch Failed Low Reversal, Lunch Compression Breakout, Lunch Failed Continuation, and Lunch Range Reclaim.
    These subtypes only activate from a completed Morning window. If Morning high/low and Morning window context are missing or unclear, set morningWindowContext.complete=false and keep all lunch subtype evidence as detected=false with missingEvidence explaining the missing Morning context.
    Lunch Failed High Reversal is a SHORT subtype after bullish morning extension, sweep above morning high, and failure to hold above that high. Lunch Failed Low Reversal is the LONG mirror after bearish extension, sweep below morning low, and failed breakdown.
    Gemini extracts these facts only. The app-owned setup scanner decides whether a Lunch subtype is detected, conditional, blocked, or executable.

    [MORNING CONDITIONAL FACT EXTRACTION RULE]
    For Morning routes, extract facts for these Morning-only conditional planning paths: Morning Failed High / Liquidity Rejection and Morning Reclaim Long.
    Morning Failed High / Liquidity Rejection is a SHORT conditional path after price sweeps or wicks above a key resistance/round-number/high zone, fails to hold, and may trigger only after a 5M close below the reclaim/support area.
    Morning Reclaim Long is a LONG conditional path after price reclaims and holds back above a key resistance/round-number/high zone, with stop based on the pullback low or active swing low.
    Gemini extracts the key levels and evidence only. The app-owned conditional plan builder creates the if/then plans, computes risk, and computes T1/T2.
    
    ${routeName === 'morning_replay' ? '[HISTORICAL REPLAY MODE: MORNING]\nAnalyze the historical day as if current replay time is 10:10 AM ET on the selected Trading Date. Use current Morning Analysis rules only. Do NOT use future data.' : ''}
    ${routeName === 'lunch_replay' ? '[HISTORICAL REPLAY MODE: LUNCH]\nAnalyze the historical day as if current replay time is inside the Lunch Review window. Use current Lunch Review rules only. Do NOT use future data.' : ''}

    [STRICTURES: ZERO_PROSE | ROBOTIC_PRECISION | COLD_LOGIC | MASTER_TRADING_DESK | 5M_TIMEFRAME]

    [MASTER TRADING DESK VOICE LOCK]
    - Write like a senior futures desk lead reviewing MES/MNQ execution risk.
    - Every note should answer: What is happening, where it matters, when it becomes valid, why it matters, and what invalidates it.
    - Treat WAIT and NO TRADE as professional outcomes.
    - Never approve trades from authority, confidence, or narrative. The app-owned pipeline decides.

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
    3. Adjust confidence and warnings if historical win rate conflicts with the current chart signal. Do not let memory alter setup rules, entry, stop, targets, time windows, or final approval.
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
    MODULE 2: [LOGIC_PROCESSOR] (Professional Price-Action Context)
    - Extract professional price-action context based ONLY on Module 1 data.
    - 09:30-10:00 opening range defines initial context; it does not approve a trade.
    - If price trades beyond opening range high and closes back below it, mark a bearish liquidity sweep / failed breakout fact.
    - If price trades beyond opening range low and closes back above it, mark a bullish liquidity sweep / failed breakdown fact.
    - If consecutive completed candles fail continuation and close through local structure, mark market structure shift / failed continuation.
    - If price holds a protected swing sequence, mark impulse-continuation context; do not treat the label as execution approval.
    - If price remains inside the opening range with heavy overlap, mark chop/consolidation no-trade context.
    - If overlap > 80% and velocity is low, mark no clean trigger yet and wait for a completed clearing candle.
    - If price fails beyond a mapped reference and reclaims it with a completed candle, extract the sweep/reclaim fact and the protected swing.
    - If price is extended away from the preferred retest zone, mark stale/chase risk. Do not market-enter on the pullback candle itself.
    - BREATHER BREAK PLAN LOCK: If the last visible candle is the breather/pullback candle itself, Breather_Break is NOT an already-triggered entry, but it IS a valid CONDITIONAL_STOP_ENTRY plan when the trend structure is intact. Do NOT output NO TRADE solely because the trigger has not fired yet.
    - For a LONG breather plan: entry = break of the completed breather candle high, stop = breather candle low or nearest protected HL. For a SHORT breather plan: entry = break of the completed breather candle low, stop = breather candle high or nearest protected LH.
    - This is NOT inventing a future price. It is a systematic pending trigger derived from the visible completed candle. Label it trigger_state = PENDING_TRIGGER and explain that execution only occurs if price breaks the trigger level.
    - Only output NO TRADE when there is no measurable trigger candle, no valid structure-stop context, invalid structure, or the setup violates a kill switch.
    - MORNING DECISION WINDOW LOCK: For 9:30-10:10 Morning Analysis, classify the 9:30-10:10 structure first. If later candles are absent, you may select a setup that is valid as a PENDING_TRIGGER using visible 9:30-10:10 levels. Do not require future confirmation before producing ENTRY/STOP/T1/T2.
    - PRICE FORMULA LOCK: The vision pass identifies visible setup clues and trigger-candle measurements only. The executable setup decision, no-trade gate, risk hard-block, and T1/T2 are app-calculated. Do not output non-formula targets.
    - IF (DISTANCE > 10pts) WITHOUT_FILL ➔ STATUS: STALE_CHASE_RISK. (No chase).
    - IF (VERTICAL_RUNAWAY) AND (NO_WICKS) ➔ mark impulse-continuation context only.
    - DO NOT CALCULATE EXECUTABLE TARGETS: Extract entry/stop facts only when clearly readable. The app calculates T1/T2 later from confirmed entry and stop.
    - APP RISK LOCK: final app plans use structure-based stops. Extract visible structure levels only; the app validates actual entry-to-stop risk.
    - IF (TIME == 12:30 EDT - 30min) ➔ TARGET = 1.0R - 1.5R.
    - If an active trade reaches management criteria, describe only structure-based management context. The app/trader manages execution.

    SETUP CONTEXTS:
    - Bullish reclaim after lower liquidity sweep
    - Bearish rejection after upper liquidity sweep
    - Opening range continuation after retest
    - Imbalance pullback after impulse candle
    - Failed continuation through local structure

    =========================================
    MODULE 3: [CHOP_SCANNER] (Devil's Advocate)
    - Challenge Module 2 Processor. SCAN: Overlap > 80%, overlapping wicks, low velocity, failed breakout traps.
    - State if 'SUCCESS', 'WARNING', or 'ERROR' and assess a confidence penalty.

    =========================================
    MODULE 4: [RISK_AUDITOR] (Safety Gate)
    - AUDIT the required stop-loss distance against system caps.
    - STRUCTURE STOP: Stop must be tied to visible structure. IF visual structure suggests wider risk, mark the setup conditional and wait for a cleaner retest or tighter protected structure.
    - ACCOUNT EQUITY: Use configured account equity $${accountEquity}. IF estimated risk exceeds configured Risk Per Trade ${(riskPercent * 100).toFixed(2)}% ($${(accountEquity * riskPercent).toFixed(2)}) ➔ WARNING: OVERLEVERAGED.
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
    MODULE 6: [MASTER_PLAN_EXTRACTOR] (Facts + Candidate Inputs)
    - THIS IS CRITICAL: You MUST ALWAYS output the \`final_trade_plan\` object in your JSON response.
    - The APP owns final trade-plan authority. Your job is to extract chart facts and propose measurable candidate inputs; the shared App Rule Engine will detect the executable setup, apply no-trade gates, hard-block risk, select the final plan, and compute final T1/T2.
    - Evaluate at least 3 competing setup candidates when visible on the chart: Liquidity Sweep, Momentum/Runaway, FVG/Imbalance, Initial Balance Extension, Opening Order Block, EQH/EQL, PDH/PDL Sweep, and No Trade.
    - Return every reviewed plan in \`candidate_trade_plans\`. Invalid candidates still belong in the array with direction = NO TRADE or null prices and a rejection_reason.
    - Give each candidate your observed rank, but understand the app will rerank deterministically by price-action clarity, risk size, R:R, timing window, RAG support/conflict, and risk-auditor status.
    - Return one \`best_trade_plan\` as your reviewer recommendation only. It is advisory only and must never be treated as executable authority.
    - Consolidate all reasoning across the modules into candidate inputs the app can safely evaluate.
    - Provide exact observed entry trigger price and stop-loss price when visible.
    - A conditional stop-entry plan with visible ENTRY and STOP levels is a valid trade plan. It is not a NO TRADE. Use trigger_state = PENDING_TRIGGER when the entry has not fired yet.
    - IMPORTANT: The app calculates T1 and T2 deterministically from confirmed entry and stop (T1 = 1.5R, T2 = 2.0R). You must still return final_trade_plan with decision, entry, stop, confidence, why_this_plan, and what_would_invalidate as advisory fields only. Set target_1 and target_2 to null unless they are already visible chart annotations. The app will recompute executable targets using Risk = abs(entry - stop).
    - TARGET AUTHORITY LOCK: Do not calculate T1/T2. Do not approve a trade because a target looks reachable. The app-owned rule engine is the only executable target authority.
    - EXECUTION AUTHORITY LOCK: current_rule_analysis, best_trade_plan, final_trade_plan, candidate_trade_plans, and legacy suggested fields are advisory chart-observation context only. The app-owned rule engine is the only executable authority.
    - STRUCTURED EXTRACTION LOCK: Always populate structuredChartContext with measurable chart facts. The app setup scanner will prefer structuredChartContext over your narrative text. If price labels, timeframe, entry, stop, or setup evidence cannot be confidently read, set the relevant confidence to Low/Unreadable, add extractionWarnings.messages, set requiresManualConfirmation = true, and set extractionWarnings.manualEntryStopRequired = true. Do not invent exact levels.
    - EXTRACTION AUTHORITY LOCK: Gemini extracts structured candle, swing, FVG, liquidity, gap, level, and confidence facts only. Gemini must not approve trades, must not be the final authority for setup validity, and must not calculate executable T1/T2. Narrative/advisory text is display-only.
    - RISK FACT LOCK: proposedEntry/proposedStop/riskPoints may only be populated when the exact visible entry and stop levels are readable from the chart or manually confirmed. If either is uncertain, set proposedEntry/proposedStop/riskPoints to null, entryConfirmed = false, stopConfirmed = false, riskReadConfidence = Low/Unreadable, entryStopConfidence = Low/Unreadable, and requiresManualConfirmation = true. The app will calculate T1/T2 only after entry and stop are confirmed.
    - FACT OBJECT LOCK: Always return candles, swings, fvgZones, liquidityEvents, extractedLevels as arrays (empty arrays if none are visible), and always return gapContext. Populate compressionRange when visible. These are extraction facts only. Do not use them to approve a trade. Do not guess missing OHLC values; use null with Low/Unreadable confidence.
    - MACHINE EVIDENCE LOCK: Every setupEvidence object must include machine-readable evidence arrays: evidence, missingEvidence, sourceFacts, levelRefs, candleRefs, and confidenceReason. Use sourceFacts such as "liquidityEvents[0]" or "fvgZones[1]", levelRefs such as "activeSwingLow" or "midnightOpen", and candleRefs as candle indexes.
    - If best_trade_plan/final_trade_plan = NO TRADE, then current_rule_analysis.entry, stop, target_1, and target_2 MUST all be null and current_rule_analysis.no_trade_reason MUST be populated.
    - If structure is valid but the entry is pending, best_trade_plan/final_trade_plan MUST NOT be NO TRADE. Return decision LONG/SHORT, trigger_state PENDING_TRIGGER, and exact entry/stop derived from the visible trigger candle.
    - If no trade is valid, return decision = NO TRADE and explain why. Do not omit final_trade_plan.

    =========================================
    MODULE 7: [MASTER_TRADE_MANAGEMENT] (After Entry Management)
    - This module runs AFTER candidate extraction.
    - Its job is NOT to choose the entry. The app chooses the final plan. Your job is to define how a valid selected trade should be managed after entry.
    - For every executable best_trade_plan, specify what to do if price moves in favor, stalls before T1, hits 1R, hits T1, or shows failed continuation through local structure.
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
        "dayType": "LONG" | "SHORT" | "WAIT" | "NO TRADE",
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
      "structuredChartContext": {
        "timeframe": "5m",
        "screenshotUsability": "usable | warning | unusable",
        "screenshotWarning": "string or null",
        "schemaContract": "Gemini extracts facts only. The app decides setup validity, execution approval, risk, entry, stop, T1, T2, and final status.",
        "keyLevels": {
          "currentPrice": 0,
          "priorDayHigh": 0,
          "priorDayLow": 0,
          "overnightHigh": 0,
          "overnightLow": 0,
          "rthOpen": 0,
          "midnightOpen": 0,
          "nearestSupport": 0,
          "nearestResistance": 0,
          "activeSwingHigh": 0,
          "activeSwingLow": 0,
          "initialBalanceHigh": 0,
          "initialBalanceLow": 0,
          "openingRangeHigh": 0,
          "openingRangeLow": 0,
          "triggerCandleHigh": 0,
          "triggerCandleLow": 0,
          "morningHigh": 0,
          "morningLow": 0,
          "morningHighSweep": 0,
          "morningLowSweep": 0
        },
        "requiredArrays": "candles, swings, fvgZones, liquidityEvents, liquiditySweeps, reclaimEvents, failedBreakEvents, displacementCandles, and extractedLevels must always be arrays. Return [] when no fact is visible. Do not omit these fields.",
        "extractedLevels": [
          { "label": "active swing low", "price": 0, "role": "support | resistance | liquidity | magnet | invalidation | unknown", "source": "ocr | manual | inferred | unknown", "confidence": "High | Medium | Low | Unreadable", "evidence": "string" }
        ],
        "candles": [
          { "index": 0, "timestamp": "string or null", "open": 0, "high": 0, "low": 0, "close": 0, "direction": "bullish | bearish | doji | unknown", "bodyQuality": "small | normal | large | unknown", "upperWickQuality": "none | small | large | unknown", "lowerWickQuality": "none | small | large | unknown", "isExpansion": false, "isRejection": false, "isBreather": false, "isReclaim": false, "confidence": "High | Medium | Low | Unreadable" }
        ],
        "swings": [
          { "type": "high | low", "price": 0, "timestamp": "string or null", "candleIndex": 0, "label": "string", "confidence": "High | Medium | Low | Unreadable" }
        ],
        "fvgZones": [
          { "direction": "LONG | SHORT", "upper": 0, "lower": 0, "midpoint": 0, "formedAt": "string or null", "filledPercent": 0, "inverted": false, "reclaimed": false, "reclaimTimestamp": "string or null", "confidence": "High | Medium | Low | Unreadable" }
        ],
        "liquidityEvents": [
          { "type": "sweep | reclaim | equal_highs | equal_lows | pdh_sweep | pdl_sweep | unknown", "direction": "LONG | SHORT | NO TRADE", "level": 0, "sweptLevelLabel": "string", "reclaimed": false, "timestamp": "string or null", "confidence": "High | Medium | Low | Unreadable", "evidence": "string" }
        ],
        "liquiditySweeps": [
          { "type": "sweep", "direction": "LONG | SHORT | NO TRADE", "level": 0, "sweptLevelLabel": "string", "reclaimed": false, "timestamp": "string or null", "confidence": "High | Medium | Low | Unreadable", "evidence": "string" }
        ],
        "reclaimEvents": [
          { "direction": "LONG | SHORT", "reclaimedLevel": 0, "levelLabel": "string", "timestamp": "string or null", "candleIndex": 0, "confidence": "High | Medium | Low | Unreadable", "evidence": "string" }
        ],
        "failedBreakEvents": [
          { "direction": "LONG | SHORT", "failedLevel": 0, "levelLabel": "string", "sweptExtreme": 0, "timestamp": "string or null", "candleIndex": 0, "confidence": "High | Medium | Low | Unreadable", "evidence": "string" }
        ],
        "displacementCandles": [
          { "direction": "LONG | SHORT", "candleIndex": 0, "timestamp": "string or null", "open": 0, "high": 0, "low": 0, "close": 0, "bodyPoints": 0, "rangePoints": 0, "confidence": "High | Medium | Low | Unreadable", "evidence": "string" }
        ],
        "setupReadyFacts": {
          "pullbackIntoFvg": false,
          "fvgReclaimed": false,
          "breakOfStructure": false,
          "sweepThenReclaim": false,
          "notes": []
        },
        "gapContext": {
          "gapPresent": false,
          "direction": "gap_up | gap_down | none | unknown",
          "priorClose": null,
          "openPrice": null,
          "gapSizePoints": null,
          "fillTarget": null,
          "fillAttempted": false,
          "confidence": "High | Medium | Low | Unreadable"
        },
        "compressionRange": {
          "present": false,
          "high": null,
          "low": null,
          "barsCount": null,
          "breakoutDirection": "LONG | SHORT | NO TRADE",
          "confidence": "High | Medium | Low | Unreadable"
        },
        "marketStructure": {
          "trend": "bullish | bearish | neutral | range | chop | unknown",
          "higherHigh": false,
          "higherLow": false,
          "lowerHigh": false,
          "lowerLow": false,
          "marketStructureShift": false,
          "chopRangeCondition": false,
          "compressionCondition": false,
          "expansionCondition": false
        },
        "candleFacts": {
          "lastClosedCandleDirection": "bullish | bearish | doji | unknown",
          "expansionCandlePresent": false,
          "rejectionWickPresent": false,
          "breatherCandlePresent": false,
          "reclaimCandlePresent": false,
          "pullbackPresent": false,
          "closeAboveKeyLevel": false,
          "closeBelowKeyLevel": false
        },
        "setupEvidence": {
          "evidenceObjectContract": "Every setup object must include evidence, missingEvidence, sourceFacts, levelRefs, candleRefs, and confidenceReason. These fields are machine-readable facts, not final trade approval.",
          "liquiditySweep": { "detected": false, "possible": false, "direction": "LONG | SHORT | NO TRADE", "entry": null, "stop": null, "invalidation": null, "requiredTrigger": null, "triggerState": "TRIGGERED | PENDING_TRIGGER | NO_TRIGGER", "confidence": "High | Medium | Low", "evidence": [], "missingEvidence": [], "sourceFacts": [], "levelRefs": [], "candleRefs": [], "confidenceReason": "string or null" },
          "fairValueGap": { "detected": false, "possible": false, "direction": "LONG | SHORT | NO TRADE", "entry": null, "stop": null, "invalidation": null, "requiredTrigger": null, "triggerState": "TRIGGERED | PENDING_TRIGGER | NO_TRIGGER", "confidence": "High | Medium | Low", "evidence": [], "missingEvidence": [], "sourceFacts": [], "levelRefs": [], "candleRefs": [], "confidenceReason": "string or null" },
          "imbalancePullback": { "detected": false, "possible": false, "direction": "LONG | SHORT | NO TRADE", "entry": null, "stop": null, "invalidation": null, "requiredTrigger": null, "triggerState": "TRIGGERED | PENDING_TRIGGER | NO_TRIGGER", "confidence": "High | Medium | Low", "evidence": [], "missingEvidence": [], "sourceFacts": [], "levelRefs": [], "candleRefs": [], "confidenceReason": "string or null" },
          "orderBlockRetest": { "detected": false, "possible": false, "direction": "LONG | SHORT | NO TRADE", "entry": null, "stop": null, "invalidation": null, "requiredTrigger": null, "triggerState": "TRIGGERED | PENDING_TRIGGER | NO_TRIGGER", "confidence": "High | Medium | Low", "evidence": [], "missingEvidence": [], "sourceFacts": [], "levelRefs": [], "candleRefs": [], "confidenceReason": "string or null" },
          "momentumRunaway": { "detected": false, "possible": false, "direction": "LONG | SHORT | NO TRADE", "entry": null, "stop": null, "invalidation": null, "requiredTrigger": null, "triggerState": "TRIGGERED | PENDING_TRIGGER | NO_TRIGGER", "confidence": "High | Medium | Low", "evidence": [], "missingEvidence": [], "sourceFacts": [], "levelRefs": [], "candleRefs": [], "confidenceReason": "string or null" },
          "compressionBreakout": { "detected": false, "possible": false, "direction": "LONG | SHORT | NO TRADE", "entry": null, "stop": null, "invalidation": null, "requiredTrigger": null, "triggerState": "TRIGGERED | PENDING_TRIGGER | NO_TRIGGER", "confidence": "High | Medium | Low", "evidence": [], "missingEvidence": [], "sourceFacts": [], "levelRefs": [], "candleRefs": [], "confidenceReason": "string or null" },
          "openingGapFill": { "detected": false, "possible": false, "direction": "LONG | SHORT | NO TRADE", "entry": null, "stop": null, "invalidation": null, "requiredTrigger": null, "triggerState": "TRIGGERED | PENDING_TRIGGER | NO_TRIGGER", "confidence": "High | Medium | Low", "evidence": [], "missingEvidence": [], "sourceFacts": [], "levelRefs": [], "candleRefs": [], "confidenceReason": "string or null" },
          "previousDayHighLowSweep": { "detected": false, "possible": false, "direction": "LONG | SHORT | NO TRADE", "entry": null, "stop": null, "invalidation": null, "requiredTrigger": null, "triggerState": "TRIGGERED | PENDING_TRIGGER | NO_TRIGGER", "confidence": "High | Medium | Low", "evidence": [], "missingEvidence": [], "sourceFacts": [], "levelRefs": [], "candleRefs": [], "confidenceReason": "string or null" },
          "equalHighsEqualLows": { "detected": false, "possible": false, "direction": "LONG | SHORT | NO TRADE", "entry": null, "stop": null, "invalidation": null, "requiredTrigger": null, "triggerState": "TRIGGERED | PENDING_TRIGGER | NO_TRIGGER", "confidence": "High | Medium | Low", "evidence": [], "missingEvidence": [], "sourceFacts": [], "levelRefs": [], "candleRefs": [], "confidenceReason": "string or null" },
          "breakerBlock": { "detected": false, "possible": false, "direction": "LONG | SHORT | NO TRADE", "entry": null, "stop": null, "invalidation": null, "requiredTrigger": null, "triggerState": "TRIGGERED | PENDING_TRIGGER | NO_TRIGGER", "confidence": "High | Medium | Low", "evidence": [], "missingEvidence": [], "sourceFacts": [], "levelRefs": [], "candleRefs": [], "confidenceReason": "string or null" },
          "mitigationBlock": { "detected": false, "possible": false, "direction": "LONG | SHORT | NO TRADE", "entry": null, "stop": null, "invalidation": null, "requiredTrigger": null, "triggerState": "TRIGGERED | PENDING_TRIGGER | NO_TRIGGER", "confidence": "High | Medium | Low", "evidence": [], "missingEvidence": [], "sourceFacts": [], "levelRefs": [], "candleRefs": [], "confidenceReason": "string or null" },
          "marketStructureShift": { "detected": false, "possible": false, "direction": "LONG | SHORT | NO TRADE", "entry": null, "stop": null, "invalidation": null, "requiredTrigger": null, "triggerState": "TRIGGERED | PENDING_TRIGGER | NO_TRIGGER", "confidence": "High | Medium | Low", "evidence": [], "missingEvidence": [], "sourceFacts": [], "levelRefs": [], "candleRefs": [], "confidenceReason": "string or null" },
          "openingOrderBlock": { "detected": false, "possible": false, "direction": "LONG | SHORT | NO TRADE", "entry": null, "stop": null, "invalidation": null, "requiredTrigger": null, "triggerState": "TRIGGERED | PENDING_TRIGGER | NO_TRIGGER", "confidence": "High | Medium | Low", "evidence": [], "missingEvidence": [], "sourceFacts": [], "levelRefs": [], "candleRefs": [], "confidenceReason": "string or null" },
          "initialBalanceExtension": { "detected": false, "possible": false, "direction": "LONG | SHORT | NO TRADE", "entry": null, "stop": null, "invalidation": null, "requiredTrigger": null, "triggerState": "TRIGGERED | PENDING_TRIGGER | NO_TRIGGER", "confidence": "High | Medium | Low", "evidence": [], "missingEvidence": [], "sourceFacts": [], "levelRefs": [], "candleRefs": [], "confidenceReason": "string or null" },
          "algoKillZone": { "detected": false, "possible": false, "direction": "LONG | SHORT | NO TRADE", "entry": null, "stop": null, "invalidation": null, "requiredTrigger": null, "triggerState": "TRIGGERED | PENDING_TRIGGER | NO_TRIGGER", "confidence": "High | Medium | Low", "evidence": [], "missingEvidence": [], "sourceFacts": [], "levelRefs": [], "candleRefs": [], "confidenceReason": "string or null" },
          "momentumPullback": { "detected": false, "possible": false, "direction": "LONG | SHORT | NO TRADE", "entry": null, "stop": null, "invalidation": null, "requiredTrigger": null, "triggerState": "TRIGGERED | PENDING_TRIGGER | NO_TRIGGER", "confidence": "High | Medium | Low", "evidence": [], "missingEvidence": [], "sourceFacts": [], "levelRefs": [], "candleRefs": [], "confidenceReason": "string or null" },
          "momentumPullbackBreatherReclaim": { "detected": false, "possible": false, "direction": "LONG | SHORT | NO TRADE", "entry": null, "stop": null, "invalidation": null, "requiredTrigger": null, "triggerState": "TRIGGERED | PENDING_TRIGGER | NO_TRIGGER", "confidence": "High | Medium | Low", "evidence": [], "missingEvidence": [], "sourceFacts": [], "levelRefs": [], "candleRefs": [], "confidenceReason": "string or null" },
          "morningFailedHighLiquidityRejection": { "detected": false, "possible": false, "direction": "SHORT | NO TRADE", "entry": null, "stop": null, "invalidation": null, "requiredTrigger": null, "triggerState": "TRIGGERED | PENDING_TRIGGER | NO_TRIGGER", "confidence": "High | Medium | Low", "evidence": [], "missingEvidence": [], "sourceFacts": [], "levelRefs": ["nearestResistance", "nearestSupport", "activeSwingHigh", "activeSwingLow"], "candleRefs": [], "confidenceReason": "string or null" },
          "morningReclaimLong": { "detected": false, "possible": false, "direction": "LONG | NO TRADE", "entry": null, "stop": null, "invalidation": null, "requiredTrigger": null, "triggerState": "TRIGGERED | PENDING_TRIGGER | NO_TRIGGER", "confidence": "High | Medium | Low", "evidence": [], "missingEvidence": [], "sourceFacts": [], "levelRefs": ["nearestResistance", "nearestSupport", "triggerCandleHigh", "activeSwingLow"], "candleRefs": [], "confidenceReason": "string or null" },
          "lunchFailedHighReversal": { "detected": false, "possible": false, "direction": "SHORT | NO TRADE", "entry": null, "stop": null, "invalidation": null, "requiredTrigger": null, "triggerState": "TRIGGERED | PENDING_TRIGGER | NO_TRIGGER", "confidence": "High | Medium | Low", "evidence": [], "missingEvidence": ["requires completed Morning window context"], "sourceFacts": [], "levelRefs": ["morningHigh"], "candleRefs": [], "confidenceReason": "string or null" },
          "lunchFailedLowReversal": { "detected": false, "possible": false, "direction": "LONG | NO TRADE", "entry": null, "stop": null, "invalidation": null, "requiredTrigger": null, "triggerState": "TRIGGERED | PENDING_TRIGGER | NO_TRIGGER", "confidence": "High | Medium | Low", "evidence": [], "missingEvidence": ["requires completed Morning window context"], "sourceFacts": [], "levelRefs": ["morningLow"], "candleRefs": [], "confidenceReason": "string or null" },
          "lunchCompressionBreakout": { "detected": false, "possible": false, "direction": "LONG | SHORT | NO TRADE", "entry": null, "stop": null, "invalidation": null, "requiredTrigger": null, "triggerState": "TRIGGERED | PENDING_TRIGGER | NO_TRIGGER", "confidence": "High | Medium | Low", "evidence": [], "missingEvidence": ["requires completed Morning window context"], "sourceFacts": [], "levelRefs": [], "candleRefs": [], "confidenceReason": "string or null" },
          "lunchFailedContinuation": { "detected": false, "possible": false, "direction": "LONG | SHORT | NO TRADE", "entry": null, "stop": null, "invalidation": null, "requiredTrigger": null, "triggerState": "TRIGGERED | PENDING_TRIGGER | NO_TRIGGER", "confidence": "High | Medium | Low", "evidence": [], "missingEvidence": ["requires completed Morning window context"], "sourceFacts": [], "levelRefs": ["morningHigh", "morningLow"], "candleRefs": [], "confidenceReason": "string or null" },
          "lunchRangeReclaim": { "detected": false, "possible": false, "direction": "LONG | SHORT | NO TRADE", "entry": null, "stop": null, "invalidation": null, "requiredTrigger": null, "triggerState": "TRIGGERED | PENDING_TRIGGER | NO_TRIGGER", "confidence": "High | Medium | Low", "evidence": [], "missingEvidence": ["requires completed Morning window context"], "sourceFacts": [], "levelRefs": ["morningHigh", "morningLow"], "candleRefs": [], "confidenceReason": "string or null" }
        },
        "morningWindowContext": {
          "complete": false,
          "source": "morning_analysis | morning_5m_context | manual | gemini_ocr | unknown",
          "morningHigh": null,
          "morningLow": null,
          "initialBalanceHigh": null,
          "initialBalanceLow": null,
          "openingDriveDirection": "bullish | bearish | range | unknown",
          "morningTrend": "bullish_extension | bearish_extension | compression_range | failed_continuation | unknown",
          "morningHighSwept": false,
          "morningLowSwept": false,
          "failedHoldAboveMorningHigh": false,
          "failedHoldBelowMorningLow": false,
          "rangeReclaimed": false,
          "evidence": [],
          "missingEvidence": [],
          "confidence": "High | Medium | Low"
        },
        "proposedEntry": null,
        "proposedStop": null,
        "riskPoints": null,
        "riskStatus": "WithinLimit | Warning | RiskTooWide | Unknown",
        "entryConfirmed": false,
        "stopConfirmed": false,
        "requiresManualConfirmation": true,
        "screenshotQuality": "High | Medium | Low | Unreadable",
        "levelReadConfidence": "High | Medium | Low | Unreadable",
        "candleReadConfidence": "High | Medium | Low | Unreadable",
        "structureReadConfidence": "High | Medium | Low | Unreadable",
        "setupReadConfidence": "High | Medium | Low | Unreadable",
        "riskReadConfidence": "High | Medium | Low | Unreadable",
        "entryStopConfidence": "High | Medium | Low | Unreadable",
        "extractionWarnings": {
          "screenshotUnclear": false,
          "priceLabelsUnreadable": false,
          "timeframeUnverified": false,
          "levelsUnclear": false,
          "manualEntryStopRequired": false,
          "messages": []
        }
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
        "trigger_state": "TRIGGERED | PENDING_TRIGGER | NO_TRIGGER",
        "entry_trigger": "string explaining the candle/level that must break",
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
        "trigger_state": "TRIGGERED | PENDING_TRIGGER | NO_TRIGGER",
        "entry_trigger": "string explaining the trigger condition or null",
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
          "trigger_state": "TRIGGERED | PENDING_TRIGGER | NO_TRIGGER",
          "entry_trigger": "string explaining the trigger condition or null",
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
        "trigger_state": "TRIGGERED | PENDING_TRIGGER | NO_TRIGGER",
        "entry_trigger": "string explaining the trigger condition or null",
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
    if (imageData.morningExec) {
      inlineParts.push({ inlineData: { mimeType: "image/png", data: imageData.morningExec.split(',')[1] || imageData.morningExec } });
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
    const text = coerceGeminiText(response.text);
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
async function riskAuditorAgent(strategy: any, accountEquity: number, riskPercent: number = 0.02) {
  const maxRisk = accountEquity * riskPercent;
  const stopDistance = Math.abs(strategy.suggestedEntry - strategy.suggestedStop);
  const riskPerContract = stopDistance * 5;
  
  const reports = [];
  
  if (stopDistance !== 5) {
    reports.push({
      agentName: "Risk Auditor",
      findings: `Stop distance (${stopDistance.toFixed(2)} pts) is based on the submitted structure stop. Dollar risk is approximately $${riskPerContract.toFixed(2)} per MES contract against configured budget $${maxRisk.toFixed(2)} (${(riskPercent * 100).toFixed(2)}% of $${accountEquity.toFixed(2)}).`,
      status: 'WARNING'
    });
  } else {
    reports.push({
      agentName: "Risk Auditor",
      findings: `Risk parameters are within system point limits (${stopDistance.toFixed(2)} pts). Dollar risk is approximately $${riskPerContract.toFixed(2)} per MES contract against configured budget $${maxRisk.toFixed(2)} (${(riskPercent * 100).toFixed(2)}% of $${accountEquity.toFixed(2)}).`,
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

export async function analyzeChart(imageData: ChartImagePayload, settings?: AISettings, accountEquity: number = 5000, previousAnalysis?: any, historicalTrades?: Trade[], analysisType?: string, modelOverride?: string, midnightOpenOverride?: string, dailyInstrument?: string, riskPercent: number = 0.02) {
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
    
    const modelConfig = loadModelConfig();

    async function runOpenAIFallback(reason: string) {
      const { validateChartExtractionWithOpenAI } = await import("./openai");
      const fallback = await validateChartExtractionWithOpenAI(imageData, undefined, {
        model: modelConfig.openaiValidationModel,
        routeName: analysisType,
        instrument: dailyInstrument || "MES",
      });
      return {
        dayType: "NO TRADE" as const,
        reasoning: `Gemini extraction was unavailable (${reason}). OpenAI fallback extracted chart facts only; the app-owned pipeline must still decide the final trade status.`,
        confidence: 0,
        checks: [],
        structuredChartContext: fallback?.structuredChartContext,
        openaiValidation: fallback,
        agentReports: [
          {
            agentName: "OpenAI Fallback Extractor",
            findings: "Fallback extraction completed. This does not approve a trade.",
            status: "WARNING" as const,
          },
        ],
      };
    }

    function canUseOpenAIFallback() {
      return modelConfig.providerMode === "openai_fallback" &&
        ["morning", "lunch", "morning_replay", "lunch_replay"].includes(analysisType || "");
    }

    // Step 1: Execute Unified Super Agent
    let superReport: any = null;
    try {
      superReport = await superAgent(imageData, settings, previousAnalysis, historicalTrades, modelOverride, analysisType, midnightOpenOverride, ragContextStr, dailyInstrument, accountEquity, riskPercent);
    } catch (error) {
      if (canUseOpenAIFallback()) {
        console.warn("[OPENAI FALLBACK] Gemini extraction failed; using OpenAI fallback", error);
        return await runOpenAIFallback(error instanceof Error ? error.message : String(error));
      }
      throw error;
    }
    
    if (!superReport) {
      if (canUseOpenAIFallback()) return await runOpenAIFallback("empty Gemini report");
      throw new Error("Super Agent returned an empty report.");
    }

    let structuredChartContext = superReport.structuredChartContext as Partial<ChartContext> | undefined;
    let openaiValidation: any = null;
    const shouldValidateWithOpenAI =
      modelConfig.providerMode === "gemini_openai_validation" &&
      ["morning", "lunch", "morning_replay", "lunch_replay"].includes(analysisType || "");

    if (shouldValidateWithOpenAI) {
      try {
        const { validateChartExtractionWithOpenAI } = await import("./openai");
        openaiValidation = await validateChartExtractionWithOpenAI(imageData, structuredChartContext, {
          model: modelConfig.openaiValidationModel,
          routeName: analysisType,
          instrument: dailyInstrument || "MES",
        });
        const consensus = buildChartContextConsensus(
          structuredChartContext,
          openaiValidation?.structuredChartContext,
          openaiValidation?.validation
        );
        structuredChartContext = consensus.context;
        openaiValidation = {
          ...openaiValidation,
          consensus,
        };
      } catch (error) {
        console.warn("[OPENAI VALIDATION] Chart extraction validation failed", error);
        openaiValidation = {
          validation: {
            provider: "openai",
            agreement: "error",
            disagreements: [],
            warnings: [error instanceof Error ? error.message : String(error)],
            summary: "OpenAI validation failed. Gemini extraction remains primary.",
          },
        };
      }
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
      const manualRiskReports = await riskAuditorAgent(strategy, accountEquity, riskPercent);
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
      structuredChartContext,
      openaiValidation,
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
    You are the Master Trading Desk Quant Reviewer. Your task is to review a trader's history and current rules with institutional discipline and propose refinements.
    
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
    const text = coerceGeminiText(response.text);
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
    You are the Master Trading Desk Risk Reviewer. Validate the current trade setup against the checklist.
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
    const text = coerceGeminiText(response.text);
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
You are the Master Trading Desk Outcome Auditor reviewing a chart screenshot provided as proof of whether a MES or MNQ trade plan worked.

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
      
      const text = coerceGeminiText(response.text);
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

