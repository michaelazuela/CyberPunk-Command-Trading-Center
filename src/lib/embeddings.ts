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

  const direction = context.geminiAnalysisJson?.tradePlan?.bias || "UNKNOWN";
  
  return `DAILY INSTRUMENT:
Instrument: ${context.instrument}
Source: User-selected daily instrument
OCR ticker observed: ${ocrTicker}
Ticker mismatch warning: ${mismatchWarning}

FUTURES TRADE OUTCOME:
Instrument: ${context.instrument}
Session: ${context.sessionType === 'morning' ? 'Morning' : 'Lunch'}
Direction: ${direction}
Contracts: ${context.contracts ?? 'unknown'}
Entry: ${context.entryPrice ?? 'unknown'}
Stop: ${context.geminiAnalysisJson?.tradePlan?.stop ?? 'unknown'}
Target: ${context.geminiAnalysisJson?.tradePlan?.target ?? 'unknown'}
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
