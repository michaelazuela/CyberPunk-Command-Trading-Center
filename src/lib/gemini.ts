/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { AISettings, Trade } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

async function superAgent(imageData: string, settings?: AISettings, previousAnalysis?: any, historicalTrades?: Trade[]) {
  const prompt = `
    ACT AS THE [MNQ/MES_SUPER_AGENT_V3.0]
    You are a unified system composing multiple expert sub-agents running in strict sequence to prevent hallucination.
    
    [STRICTURES: ZERO_PROSE | ROBOTIC_PRECISION | COLD_LOGIC | 5M_TIMEFRAME]

    Your task is to process the chart image sequentially in a fully structured JSON response.

    =========================================
    MODULE 0: [HISTORICAL_CONTEXT] (RAG)
    ${historicalTrades && historicalTrades.length > 0 ? `
    The following is a summary of recent trade outcomes to help you avoid repeating mistakes and stick to what works.
    HISTORICAL TRADES:
    ${historicalTrades.map(t => `- Date: ${t.date}, Type: ${t.dayType}, Direction: ${t.direction}, Outcome: ${t.status}, PnL: ${t.pnl}, Notes: ${t.notes}`).join('\n')}
    ` : 'No historical trade context available.'}

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
    1055R: Wick past IB (10:45-11:00) + Reclaim inside IB on 10:55 close.
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
    MODULE 5: [MIDNIGHT_STRATEGIST] (Risk Filter Layer - Option B)
    - ANALYZE the Midnight Level (00:00 Open) and Midnight Band (±2 points).
    - MANDATORY RULE (Option B):
      1. WICK VETO: If 3+ wick-only interactions occur in the Midnight Band (no close beyond), trigger a VETO for any trade fading that level.
      2. CONFLUENCE: If a trade setup aligns with an RTH level AND the Midnight Band, and NO wick veto is present, increase confidence score by 0.15.
      3. RISK FILTER: Flag any trade that triggers an entry directly into a strong Midnight rejection as 'ERROR' in the risk audit.
    - CLASSIFY role: SUPPORT, RESISTANCE, or NEUTRAL.
    - PROVIDE direct justification based on Option B integration rules.

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
      }
    }
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: {
      parts: [
        { text: prompt },
        { inlineData: { mimeType: "image/png", data: imageData.split(',')[1] } }
      ]
    },
    config: {
      responseMimeType: "application/json",
      temperature: settings?.temperature ?? 0.0,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
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

export async function preCheckChartInfo(imageData: string): Promise<OCRResult> {
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

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [context],
    config: {
      temperature: 0.0,
      responseMimeType: "application/json",
      systemInstruction: "You are an automated OCR pre-check system. Output strictly valid JSON.",
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
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

export async function analyzeChart(imageData: string, settings?: AISettings, accountEquity: number = 5000, previousAnalysis?: any, historicalTrades?: Trade[]) {
  try {
    // Step 1: Execute Unified Super Agent
    const superReport = await superAgent(imageData, settings, previousAnalysis, historicalTrades);
    
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

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Current Rules: ${currentRules}\n\nTrade History: ${JSON.stringify(trades)}`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
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
    model: "gemini-3.1-pro-preview",
    contents: context,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
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
