import { RAGSaveContext } from '../types';

export function buildEmbeddingText(context: RAGSaveContext): string {
  const noteContent = context.notes || "";
  const notesTruncated = noteContent.substring(0, 200).replace(/\n/g, ' ');

  const dateStr = context.tradeDate;
  const dayStr = context.dayOfWeek;

  return `Session: ${context.sessionType}
Instrument: ${context.instrument}
Date: ${dateStr} (${dayStr})
Midnight Open: ${context.midnightOpenPrice ?? 'Unknown'} | RTH opened ${context.rthVsMidnight ?? 'unknown'} midnight open
Retrace probability: ${context.retraceProbability ? context.retraceProbability * 100 : 'unknown'}%
Initial Balance: High ${context.ibHigh ?? 'unknown'} / Low ${context.ibLow ?? 'unknown'}
IB Position: ${context.ibPosition ?? 'unknown'}
Entry: ${context.entryPrice ?? 'unknown'} | Exit: ${context.exitPrice ?? 'unknown'} | PnL: ${context.pnlTicks ?? 'unknown'} ticks (${context.pnlDollars !== null && context.pnlDollars !== undefined ? '$' + context.pnlDollars : 'unknown'})
Contracts: ${context.contracts ?? 'unknown'}
Gemini confidence: ${context.geminiConfidence ?? 'unknown'}
Gemini verdict: ${context.geminiVerdict ?? 'unknown'}
Trade result: ${context.tradeResult ?? 'pending'}
Setup notes: ${notesTruncated}`;
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
