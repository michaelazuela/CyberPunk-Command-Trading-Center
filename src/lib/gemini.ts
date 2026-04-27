/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";
import { AISettings } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

/**
 * AGENT 1: THE CHART OBSERVER (Vision) -> [DATA_EXTRACTOR]
 * Pure pattern recognition without rule bias.
 */
async function chartObserverAgent(imageData: string) {
  const prompt = `
    [STRICTURES: ZERO_PROSE | ROBOTIC_PRECISION | COLD_LOGIC | 5M_TIMEFRAME]
    
    AGENT: [DATA_EXTRACTOR]
    INPUT: 5m Candlestick Chart.
    TASK: Extract OHLC, IB H/L (09:30-10:00), Wick:Body %, Structural Steps (HH/HL/LH/LL).
    OUTPUT: Raw Data Block.
    
    CRITICAL OBSERVATION:
    - Primary Data: Focus EXCLUSIVELY on 5-Minute Highs, Lows, Closes.
    - Ignore indicators, volume, VWAP.
    - Measure Wick-to-Body ratio precisely.
    - Identify Sequence: HH, HL, LH, LL.
    - Identify Overlap: Body Overlap > 80%, Overlapping Wicks, Low Velocity.
    
    OUTPUT FORMAT: Return raw factual data ONLY. No narrative.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
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
    ACT AS THE [MNQ/MES_MASTER_V2.0]
    [STRICTURES: ZERO_PROSE | ROBOTIC_PRECISION | COLD_LOGIC | 5M_TIMEFRAME]

    AGENT: [LOGIC_PROCESSOR]
    TASK: Execute Rules 1-15. CLASSIFY: Setup Signature. CALCULATE: Entry, Stop, RR Targets. STATUS: Logic Gate Verification.

    2. CONDITIONAL LOGIC TREE (RULES 1-15)
    MOMENTUM(09:30-10:00) ➔ PRIMARY_BIAS. (No single-wick flip).
    IF (2x CONSECUTIVE_BARS FAIL_EXTREME) AND (CLOSE < PREV_BODY_LOW) ➔ ACTION: FLIP_BIAS.
    IF (LAST_HL == INTACT) AND (STAIRCASE == HH/HL) ➔ BIAS: LONG (Ignore wicks).
    IF (PRICE > IB_HIGH) AND (STAIRCASE == HH/HL) ➔ 2-BAR RULE = ONLY BIAS KILLER.
    IF (TIME_IN_IB > 45min) ➔ STATUS: NEUTRAL / FRICTION. (Wait: 2-Bar Guard).
    IF (OVERLAP > 80%) AND (VELOCITY == LOW) ➔ NO_WICK_ENTRY. (Wait: Clearing Bar).
    IF (WICK > ANCHOR ± 1pt) AND (CLOSE == INSIDE_IB) AND (C2 == DEEP_RECLAIM) ➔ ACTION: FLIP_BIAS. (Stop: Wick_Extreme + 1t).
    IF (2-BAR_GUARD == TRUE) AND (PRICE > ANCHOR + 5pts) ➔ WAIT: 1st COUNTER-TREND BREATHER. (Execute: Breather_Break).
    IF (DISTANCE > 10pts) WITHOUT_FILL ➔ STATUS: EXPIRED. (No chase).
    TASK: BYPASS NARRATIVE. (Output binary gates only).
    IF (VERTICAL_RUNAWAY) AND (NO_WICKS) ➔ STAIRCASE = 100% PRIORITY.
    MANDATE: MIN_RR = 2.0R.
    IF (RISK > 15pts) ➔ TARGET = 1.5R.
    IF (TIME == 12:30 EDT - 30min) ➔ TARGET = 1.0R - 1.5R.
    IF (TIME == 10:30) AND (MOVE > 50%_TARGET) ➔ ACTION: STOP = BE / 10:00 STRUCTURE.

    3. SETUP SIGNATURES
    T1L: 09:30 Green Bar + Staircase.
    T2L: 09:30 Doji + 09:35 Green Bar.
    T1S: 09:30 Red Bar / 09:35 Close < 09:30 Open + Staircase.
    T2S: Overnight Gap + Red Open Rejection.
    1055R: Wick past IB (10:45-11:00) + Reclaim inside IB on 10:55 close.
    DIST: Upper Wick Rejection + 2-Bar Failure at Highs.

    # UI & OUTPUT SPECIFICATIONS
    1. ZERO PROSE: No descriptive narrative. Output data strictly bounded.
    2. THE SYSTEM_PULSE: The VERY FIRST LINE of "reasoning" MUST be: \`[SYSTEM_PULSE]: [DATA_EXTRACTOR] SYNC | [LOGIC_PROCESSOR] ACTIVE\`
    3. THE FOLD RULE: Provide markdown tables for entry/stop/target and logic gate verification.
    4. RAG TAGS: Generate 3-5 concise tactical tags (e.g., "morning_rejection", "staircase_long", "friction") for the setup to be indexed.
    
    ${settings?.customInstructions ? `USER SPECIFIC INSTRUCTIONS:\n${settings.customInstructions}` : ''}

    OUTPUT FORMAT (JSON):
    {
      "dayType": "TYPE 1 LONG" | "TYPE 2 LONG" | "TYPE 1 SHORT" | "TYPE 2 SHORT" | "LUNCH REVERSAL" | "DISTRIBUTION" | "NO TRADE",
      "reasoning": "STRICT HUD VIEW FORMAT: Markdown table with Entry/Stop/Target. Logic gates. ZERO PROSE. Example:\n[SYSTEM_PULSE]: [DATA_EXTRACTOR] SYNC | [LOGIC_PROCESSOR] ACTIVE\n\n| ITEM | VALUE |\n|---|---|\n| BIAS | LONG |\n| ENTRY | 5000 |\n| STOP | 4995 |\n| TARGET | 5010 |",
      "confidence": 0-1,
      "sweepAndReclaim": "YES" | "NO",
      "is1055Reversal": boolean,
      "rejectionStrength": "LOW" | "MEDIUM" | "HIGH" | "EXTREME",
      "levelCheck": "string",
      "structureStatus": "string",
      "checks": [ { "label": "string", "passed": true } ],
      "suggestedEntry": 0,
      "suggestedStop": 0,
      "suggestedTarget": 0,
      "tags": ["tag1", "tag2"],
      "sessionLog": {
        "timestamp": "1970-01-01T00:00:00.000Z", "instrument": "MES", "final_bias": "LONG", "confidence": "80%", "key_structural_level": "5000", "recalibration_status": "ACTIVE"
      }
    }
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `[DATA_EXTRACTOR] Raw Data Block:\n${observation}`,
    config: {
      responseMimeType: "application/json",
      temperature: settings?.temperature ?? 0.0,
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

/**
 * AGENT 4: DEVIL'S ADVOCATE (Multi-Step Validation)
 * Challenges the strategy to find weaknesses and cites specific rules.
 */
async function devilsAdvocateAgent(observation: string, strategy: any) {
  if (strategy.dayType === "NO TRADE") return null;

  const prompt = `
    AGENT: [FRICTION_SCANNER] (Devil's Advocate)
    TASK: Challenge Processor. SCAN: Body Overlap > 80%, Overlapping Wicks, Low Velocity. FLAG: Villain Traps. OUTPUT: Confidence Penalty.

    Observation:
    ${observation}

    Proposed Strategy:
    Bias: ${strategy.dayType}
    Reasoning: ${strategy.reasoning}

    Output valid JSON:
    {
      "findings": "Your counter-argument or approval statement.",
      "ruleCitation": "Specific rule referenced (e.g. '0414_MAX_EXPANSION' or 'ANTI-DRIFT')",
      "status": "SUCCESS" | "WARNING" | "ERROR",
      "confidencePenalty": 0.1
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
      }
    });

    const text = response.text || "{}";
    const cleanedText = text.replace(/```json\n?|```/g, '').trim();
    return JSON.parse(cleanedText);
  } catch (e) {
    console.error("Devil's Advocate failed:", e);
    return null;
  }
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

export async function analyzeChart(imageData: string, settings?: AISettings, accountEquity: number = 5000, previousAnalysis?: any) {
  try {
    // Step 1: Observation
    const observation = await chartObserverAgent(imageData);
    if (!observation) {
      throw new Error("Chart observation returned an empty report.");
    }
    
    // Step 2: Strategy Classification
    const strategy = await strategySpecialistAgent(observation, settings, previousAnalysis);
    
    // Step 3: Devil's Advocate
    const advocateReport = await devilsAdvocateAgent(observation, strategy);

    // Step 4: Risk Audit
    const riskReports = await riskAuditorAgent(strategy, accountEquity);
    
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
      sessionLog: strategy.sessionLog,
      agentReports: [
        { 
          agentName: "Chart Observer", 
          findings: observation.substring(0, 4000) + (observation.length > 4000 ? "..." : ""), 
          status: 'SUCCESS' as const 
        },
        ...additionalReports,
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

  const response = await ai.models.generateContent({
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
