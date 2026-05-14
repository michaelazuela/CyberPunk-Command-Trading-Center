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
Contracts: ${context.contracts ?? 'unknown'}
Entry: ${context.entryPrice ?? 'unknown'}
Stop: ${context.stopPrice ?? 'unknown'}
T1: ${context.t1 ?? 'unknown'}
T2: ${context.t2 ?? 'unknown'}
Risk Points: ${context.riskPoints ?? 'unknown'}
Plan Source: ${context.planSource ?? 'unknown'}
App Plan Engine:
- Winner: ${appPlan?.setupName || appPlan?.source || direction}
- Why it won: ${context.whyThisPlan || appPlan?.whyThisPlan || bestPlan?.why_it_won || 'unknown'}
- RAG support: ${bestPlan?.rag_support || context.geminiAnalysisJson?.rag_learning_context?.historical_support_rating || 'unknown'}
Advisory Note: candidate/best/final model trade plans are stored as context only; executable levels come from app-normalized fields above.
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

      if (!response.ok) {
        throw new Error(`Embedding API error: ${response.status}`);
      }

      const data = await response.json();
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
