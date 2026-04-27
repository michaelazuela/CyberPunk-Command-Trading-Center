const fs = require('fs');

let content = fs.readFileSync('src/lib/gemini.ts', 'utf8');

// Replace strategySpecialistAgent
const pattern2 = /async function strategySpecialistAgent\(observation: string, settings\?: AISettings, previousAnalysis\?: any\) \{.*?return JSON\.parse\(cleanedText\);\n  \} catch \(e\) \{/s;
const replacement2 = `async function strategySpecialistAgent(observation: string, settings?: AISettings, previousAnalysis?: any) {
  const systemInstruction = \`
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
    2. THE SYSTEM_PULSE: The VERY FIRST LINE of "reasoning" MUST be: \\\`[SYSTEM_PULSE]: [DATA_EXTRACTOR] SYNC | [LOGIC_PROCESSOR] ACTIVE\\\`
    3. THE FOLD RULE: Provide markdown tables for entry/stop/target and logic gate verification.
    
    \${settings?.customInstructions ? \`USER SPECIFIC INSTRUCTIONS:\\n\${settings.customInstructions}\` : ''}

    OUTPUT FORMAT (JSON):
    {
      "dayType": "TYPE 1 LONG" | "TYPE 2 LONG" | "TYPE 1 SHORT" | "TYPE 2 SHORT" | "LUNCH REVERSAL" | "DISTRIBUTION" | "NO TRADE",
      "reasoning": "STRICT HUD VIEW FORMAT: Markdown table with Entry/Stop/Target. Logic gates. ZERO PROSE. Example:\\n[SYSTEM_PULSE]: [DATA_EXTRACTOR] SYNC | [LOGIC_PROCESSOR] ACTIVE\\n\\n| ITEM | VALUE |\\n|---|---|\\n| BIAS | LONG |\\n| ENTRY | 5000 |\\n| STOP | 4995 |\\n| TARGET | 5010 |",
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
      "sessionLog": {
        "timestamp": "1970-01-01T00:00:00.000Z", "instrument": "MES", "final_bias": "LONG", "confidence": "80%", "key_structural_level": "5000", "recalibration_status": "ACTIVE"
      }
    }
  \`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: \`[DATA_EXTRACTOR] Raw Data Block:\\n\${observation}\`,
    config: {
      responseMimeType: "application/json",
      temperature: settings?.temperature ?? 0.0,
      systemInstruction
    }
  });

  try {
    const text = response.text || '{}';
    const cleanedText = text.replace(/\`\`\`json\\n?|\`\`\`/g, '').trim();
    return JSON.parse(cleanedText);
  } catch (e) {`;
content = content.replace(pattern2, replacement2);

// Replace devilsAdvocateAgent
const pattern3 = /async function devilsAdvocateAgent\(observation: string, strategy: any\) \{.*?const text = response\.text \|\| "\{\}";\n    const cleanedText = text\.replace\(\/```json\\n\?\|```\/g, ''\)\.trim\(\);\n    return JSON\.parse\(cleanedText\);\n  \} catch \(e\) \{/s;
const replacement3 = `async function devilsAdvocateAgent(observation: string, strategy: any) {
  if (strategy.dayType === "NO TRADE") return null;

  const prompt = \`
    AGENT: [FRICTION_SCANNER] (Devil's Advocate)
    TASK: Challenge Processor. SCAN: Body Overlap > 80%, Overlapping Wicks, Low Velocity. FLAG: Villain Traps. OUTPUT: Confidence Penalty.

    Observation:
    \${observation}

    Proposed Strategy:
    Bias: \${strategy.dayType}
    Reasoning: \${strategy.reasoning}

    Output valid JSON:
    {
      "findings": "Your counter-argument or approval statement.",
      "ruleCitation": "Specific rule referenced (e.g. '0414_MAX_EXPANSION' or 'ANTI-DRIFT')",
      "status": "SUCCESS" | "WARNING" | "ERROR",
      "confidencePenalty": 0.1
    }
  \`;

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
    const cleanedText = text.replace(/\`\`\`json\\n?|\`\`\`/g, '').trim();
    return JSON.parse(cleanedText);
  } catch (e) {`;
content = content.replace(pattern3, replacement3);

// Replace riskAuditorAgent
const pattern4 = /async function riskAuditorAgent\(strategy: any, accountEquity\?: number\) \{.*?return reports;\n\}/s;
const replacement4 = `async function riskAuditorAgent(strategy: any, accountEquity?: number) {
  const reports: any[] = [];
  
  if (!strategy.suggestedEntry || !strategy.suggestedStop || strategy.dayType === "NO TRADE") {
    reports.push({
      agentName: "[EXECUTION_VALIDATOR]",
      findings: "NO_GO: Missing entry/stop parameters.",
      status: 'ERROR'
    });
    return reports;
  }

  const riskPoints = Math.abs(strategy.suggestedEntry - strategy.suggestedStop);
  
  if (riskPoints > 8) {
    reports.push({
      agentName: "[EXECUTION_VALIDATOR]",
      findings: \`NO_GO: Stop distance (\${riskPoints.toFixed(2)} pts) exceeds 8pt limit.\`,
      status: 'ERROR',
      ruleCitation: "EXECUTION_VALIDATOR_8PT_CAP"
    });
  } else {
    reports.push({
      agentName: "[EXECUTION_VALIDATOR]",
      findings: \`GO: Stop distance (\${riskPoints.toFixed(2)} pts) within limits.\`,
      status: 'SUCCESS'
    });
  }

  return reports;
}`;
content = content.replace(pattern4, replacement4);

fs.writeFileSync('src/lib/gemini.ts', content);
