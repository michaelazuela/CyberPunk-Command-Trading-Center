import { RAGSaveContext } from '../types';

export function buildEmbeddingText(context: RAGSaveContext): string {
  const noteContent = (context.notes || "").substring(0, 200).replace(/\n/g, ' ');

  // Attempt to extract OCR ticker if it was present
  let ocrTicker = "unknown";
  if (context.ocrText) {
    try {
      const parsedOcr = JSON.parse(context.ocrText);
      if (parsedOcr.ticker) ocrTicker = parsedOcr.ticker;
    } catch {}
  }
  
  const mismatchWarning = ocrTicker !== "unknown" && ocrTicker !== context.instrument ? "yes" : "no";

  const appPlan = context.trade_plan_json?.normalized_plan || context.geminiAnalysisJson?.normalized_plan;
  const direction = appPlan?.decision || "UNKNOWN";
  const selectedAppCandidate =
    context.finalTradePlan?.opportunitySelection?.bestExecutableCandidate ||
    context.finalTradePlan?.opportunitySelection?.bestConditionalCandidate ||
    context.setupCandidates?.find((candidate: any) => candidate.executionStatus === 'Executable') ||
    context.setupCandidates?.find((candidate: any) => candidate.executionStatus === 'Conditional') ||
    null;
  const appSetupSubtype = selectedAppCandidate?.scenarioLabel || selectedAppCandidate?.setupType || appPlan?.setupName || appPlan?.source || "unknown";
  const targetContext = selectedAppCandidate?.targetObjectivePlan;
  const targetContextSummary = targetContext
    ? [
        `Target model: ${targetContext.targetModel || 'fixed_r_with_structural_context'}`,
        `Target quality: ${targetContext.targetQuality || 'unknown'}`,
        `Obstacle/reaction zone: ${targetContext.obstacleTarget1?.label || 'none'} ${targetContext.obstacleTarget1?.price ?? ''}`.trim(),
        `Real 15M/session liquidity LQ1: ${targetContext.liquidityTarget1?.label || 'none'} ${targetContext.liquidityTarget1?.price ?? ''}`.trim(),
        `Real 15M/session liquidity LQ2: ${targetContext.liquidityTarget2?.label || 'none'} ${targetContext.liquidityTarget2?.price ?? ''}`.trim(),
        `Real 15M/session liquidity runner: ${targetContext.liquidityRunnerTarget?.label || 'none'} ${targetContext.liquidityRunnerTarget?.price ?? ''}`.trim(),
        `Nearest real liquidity target: ${targetContext.nearestLiquidityTarget?.label || 'none'} ${targetContext.nearestLiquidityTarget?.price ?? ''}`.trim(),
        `Runner objective: ${targetContext.runnerTarget?.label || 'none'} ${targetContext.runnerTarget?.price ?? ''}`.trim(),
        `Target management instruction: ${targetContext.targetManagementInstruction || 'none'}`,
        `Target path warning: ${targetContext.targetPathWarning || 'none'}`,
      ].join('\n')
    : 'No liquidity-aware target context was attached to the selected plan.';
  const chartContext = context.chartContext || context.geminiAnalysisJson?.structuredChartContext || {};
  const sessionStory = chartContext?.sessionStory;
  const sessionStorySummary = sessionStory
    ? [
        `Session story bias: ${sessionStory.bias || 'unknown'}`,
        `Session story summary: ${sessionStory.summary || 'none'}`,
        `Session relationships: ${Array.isArray(sessionStory.relationships) && sessionStory.relationships.length
          ? sessionStory.relationships.slice(0, 4).map((item: any) => `${item.label}: ${item.bias} (${item.scoreImpact})`).join('; ')
          : 'none'}`,
        `Displacement zones: ${Array.isArray(sessionStory.displacementZones) && sessionStory.displacementZones.length
          ? sessionStory.displacementZones.slice(0, 4).map((zone: any) => `${zone.label} ${zone.lower}-${zone.upper} ${zone.direction} confidence ${zone.confidence}`).join('; ')
          : 'none'}`,
      ].join('\n')
    : 'No session story context was attached.';
  const bestPlan = context.geminiAnalysisJson?.best_trade_plan;
  const candidatePlans = Array.isArray(context.geminiAnalysisJson?.candidate_trade_plans)
    ? context.geminiAnalysisJson.candidate_trade_plans
    : [];
  const candidateSummary = candidatePlans.length
    ? candidatePlans.slice(0, 5).map((candidate: any) => {
        const status = candidate.selected ? "SELECTED" : "REJECTED";
        const reason = candidate.selected
          ? candidate.why_this_plan
          : candidate.rejection_reason || "Lower priority than selected setup.";
        return `- ${status}: ${candidate.setup_name || "Unnamed setup"} | ${candidate.direction || "NO TRADE"} | confidence ${candidate.confidence || "unknown"} | ${reason}`;
      }).join('\n')
    : "- No candidate plan committee data available.";
  const managementPlan = context.geminiAnalysisJson?.trade_management_plan;
  const workflowMode = context.workflowMode || (context.analysis_mode === 'historical_replay' || context.source === 'replay_lab' ? 'replay' : context.sessionType);
  const proofSubmitted = context.proofSubmitted ?? Boolean(context.proofScreenshotUrl);
  const tradeConfirmed = context.tradeConfirmed ?? ['win', 'loss', 'scratch', 'no_trade', 'missed_trade'].includes(String(context.tradeResult || '').toLowerCase());
  const tradeTaken = context.tradeTaken ?? ['win', 'loss', 'scratch'].includes(String(context.tradeResult || '').toLowerCase());
  
  return `DAILY INSTRUMENT:
Instrument: ${context.instrument}
Source: User-selected daily instrument
OCR ticker observed: ${ocrTicker}
Ticker mismatch warning: ${mismatchWarning}

FUTURES TRADE OUTCOME:
Workflow Mode: ${workflowMode}
Analysis Mode: ${context.analysis_mode === 'historical_replay' ? 'Historical Replay (Backtest)' : 'Live Trading'}
Source: ${context.source === 'replay_lab' ? 'Replay Lab' : 'Live UI'}
Instrument: ${context.instrument}
Session: ${context.sessionType === 'morning' ? 'Morning' : 'Lunch'}
Trade Confirmed: ${tradeConfirmed ? 'yes' : 'no'}
Trade Taken: ${tradeTaken ? 'yes' : 'no'}
Proof Submitted: ${proofSubmitted ? 'yes' : 'no'}
Direction: ${direction}
App Setup/Subtype: ${appSetupSubtype}
Contracts: ${context.contracts ?? 'unknown'}
Entry: ${context.entryPrice ?? 'unknown'}
Stop: ${context.stopPrice ?? 'unknown'}
T1: ${context.t1 ?? 'unknown'}
T2: ${context.t2 ?? 'unknown'}
Risk Points: ${context.riskPoints ?? 'unknown'}
Plan Source: ${context.planSource ?? 'unknown'}
App Plan Engine:
- Winner: ${appSetupSubtype}
- Why it won: ${context.whyThisPlan || appPlan?.whyThisPlan || bestPlan?.why_it_won || 'unknown'}
- RAG support: ${bestPlan?.rag_support || context.geminiAnalysisJson?.rag_learning_context?.historical_support_rating || 'unknown'}
Target Context:
${targetContextSummary}
Session Story:
${sessionStorySummary}
Authority Note: AI advisory plans are stored as context only. Executable levels, target math, and trade status come from app-normalized fields above.
Candidate plans reviewed:
${candidateSummary}
Trade Management Agent:
- Style: ${managementPlan?.management_style || 'unknown'}
- Primary success target: ${managementPlan?.primary_success_target || 'unknown'}
- Move stop to breakeven at: ${managementPlan?.move_stop_to_breakeven_at ?? 'unknown'}
- Trail stop after T1: ${managementPlan?.trail_stop_after_t1 ?? 'unknown'}
- 1R rule: ${managementPlan?.if_price_reaches_1r || 'unknown'}
- T1 rule: ${managementPlan?.if_price_reaches_t1 || 'unknown'}
- Failure warning: ${managementPlan?.failure_warning || 'unknown'}
Exit: ${context.exitPrice ?? 'unknown'}
Result: ${context.tradeResult?.toUpperCase() ?? 'PENDING'}
PnL: ${context.pnlTicks ?? 0} ticks ($${context.pnlDollars ?? 0})
Proof: ${context.geminiVerdict?.toUpperCase() ?? 'NO PROOF'}
What happened: ${noteContent}

Midnight Open:
- Instrument: ${context.midnightOpenInstrument ?? 'unknown'}
- Date: ${context.midnightOpenDate ?? 'unknown'}
- Price: ${context.midnightOpenPrice ?? 'unknown'}
- Status: ${context.midnightOpenStatus ?? 'unknown'}
- Source: ${context.midnightOpenSource ?? 'unknown'}
- RTH vs Midnight: ${context.rthVsMidnight ?? 'unknown'}
- Distance from Midnight: ${context.distanceFromMidnightPoints ?? 'unknown'} points / ${context.distanceFromMidnightTicks ?? 'unknown'} ticks
- Midnight Role: ${context.midnightRole ?? 'UNCONFIRMED'}
- Midnight Interaction: ${context.midnightInteraction ?? 'UNCONFIRMED'}
- Plan Impact: ${context.midnightPlanImpact ?? 'unknown'}
- Confidence Adjustment: ${context.midnightConfidenceAdjustment ?? 'unknown'}
- Confidence Reason: ${context.midnightConfidenceReason ?? 'unknown'}

Retrace probability: ${context.retraceProbability ? context.retraceProbability * 100 : 'unknown'}%
Initial Balance: High ${context.ibHigh ?? 'unknown'} / Low ${context.ibLow ?? 'unknown'}
IB Position: ${context.ibPosition ?? 'unknown'}`;
}

async function callEmbeddingsProxy(text: string, taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY"): Promise<number[]> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'embedContent',
          model: 'text-embedding-004',
          content: {
            parts: [{ text }]
          },
          taskType
        })
      });

      const responseText = await response.text();
      let data: any = {};
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        const isTimeout = response.status === 524 || responseText.toLowerCase().includes('error code: 524');
        throw new Error(isTimeout
          ? 'Embedding API timed out before Cloudflare received a response.'
          : `Embedding API returned a non-JSON response: ${responseText.slice(0, 160)}`
        );
      }

      if (!response.ok) {
        const message = data?.error?.message || data?.error || `Embedding API error: ${response.status}`;
        throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
      }

      if (data.embedding && data.embedding.values) {
        return data.embedding.values;
      } else {
         throw new Error("Invalid embedding response structure");
      }
    } catch (err) {
      if (attempt === 3) {
        throw new Error(`Failed to generate embedding after 3 attempts: ${err}`);
      }
      const delay = attempt === 1 ? 2000 : 5000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error("Failed to generate embedding");
}

export async function generateEmbedding(text: string): Promise<number[]> {
  return await callEmbeddingsProxy(text, "RETRIEVAL_DOCUMENT");
}

export async function generateQueryEmbedding(text: string): Promise<number[]> {
  return await callEmbeddingsProxy(text, "RETRIEVAL_QUERY");
}
