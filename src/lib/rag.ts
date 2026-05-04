import { RAGSaveContext, SimilarSetup } from '../types';
import { supabase } from './supabase';
import { generateEmbedding, generateQueryEmbedding, buildEmbeddingText } from './embeddings';

export async function saveToRAG(context: RAGSaveContext): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log("[RAG] Skipped: user not authenticated");
      return;
    }

    const embeddingText = buildEmbeddingText(context);
    let embedding: number[] | null = null;
    let setupQualityScore = 0.5; // Default

    // Simple heuristic for initial quality score
    if (context.geminiConfidence === 'High') setupQualityScore += 0.2;
    if (context.rthVsMidnight === 'below') setupQualityScore += 0.1;

    try {
      embedding = await generateEmbedding(embeddingText);
    } catch (err) {
      console.error("[RAG] Embedding generation failed:", err);
    }

    const record = {
      user_id: user.id,
      trade_id: context.tradeId || null,
      setup_id: context.setupId || null,
      session_type: context.sessionType,
      trade_date: context.tradeDate,
      day_of_week: context.dayOfWeek,
      instrument: context.instrument || 'MES',
      midnight_open_price: context.midnightOpenPrice || null,
      rth_vs_midnight: context.rthVsMidnight || null,
      retrace_probability: context.retraceProbability || null,
      initial_balance_high: context.ibHigh || null,
      initial_balance_low: context.ibLow || null,
      ib_position: context.ibPosition || null,
      entry_price: context.entryPrice || null,
      exit_price: context.exitPrice || null,
      pnl_ticks: context.pnlTicks || null,
      pnl_dollars: context.pnlDollars || null,
      contracts: context.contracts || null,
      gemini_confidence: context.geminiConfidence || null,
      gemini_verdict: context.geminiVerdict || null,
      setup_quality_score: setupQualityScore,
      trade_result: context.tradeResult || 'pending',
      embedding_text: embeddingText,
      embedding: embedding,
      ocr_text: context.ocrText || null,
      gemini_analysis_json: context.geminiAnalysisJson || null,
      screenshot_url: context.screenshotUrl || null,
      proof_screenshot_url: context.proofScreenshotUrl || null,
      midnight_open_source: context.midnightOpenSource || null,
      notes: context.notes || null,
    };

    let result;
    if (context.tradeId) {
      result = await supabase.from('trade_embeddings').update(record).eq('trade_id', context.tradeId);
    } else if (context.setupId) {
      result = await supabase.from('trade_embeddings').update(record).eq('setup_id', context.setupId);
    } 
    
    // If update returned nothing or didn't run, insert
    if (!result || (result.data === null && result.error === null)) {
       await supabase.from('trade_embeddings').insert(record);
    }

    console.log(`[RAG] Saved embedding for ${context.sessionType} setup on ${context.tradeDate} - score: ${setupQualityScore}`);

  } catch (error) {
    console.error("[RAG] Failed to save:", error);
  }
}

export async function retrieveSimilarSetups(queryContext: any): Promise<SimilarSetup[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const queryText = `Session: ${queryContext.sessionType}
Instrument: ${queryContext.instrument}
Date: ${queryContext.dayOfWeek}
RTH opened ${queryContext.rthVsMidnight}
IB Position: ${queryContext.ibPosition}`;

    const queryEmbedding = await generateQueryEmbedding(queryText);

    const { data, error } = await supabase.rpc('match_similar_setups', {
      query_embedding: queryEmbedding,
      match_count: 5,
      filter_instrument: queryContext.instrument || null,
      filter_session: queryContext.sessionType || null,
      filter_result: null
    });

    if (error) {
      console.error("[RAG] DB match failed:", error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      tradeDate: row.trade_date,
      dayOfWeek: row.day_of_week,
      sessionType: row.session_type,
      instrument: row.instrument,
      rthVsMidnight: row.rth_vs_midnight,
      ibPosition: row.ib_position,
      geminiConfidence: row.gemini_confidence,
      setupQualityScore: row.setup_quality_score,
      tradeResult: row.trade_result,
      pnlTicks: row.pnl_ticks,
      embeddingText: row.embedding_text,
      similarity: row.similarity
    }));

  } catch (error) {
    console.error("[RAG] Retrieval failed:", error);
    return [];
  }
}

export function formatRAGContextForGemini(similarSetups: SimilarSetup[]): string {
  if (!similarSetups || similarSetups.length === 0) {
    return `HISTORICAL CONTEXT:
No similar past setups found in trade history yet. This analysis is based entirely on the current screenshot. As trade history grows, similar setups will be surfaced here automatically.`;
  }

  const n = similarSetups.length;
  let wins = 0;
  let totalPnl = 0;
  let setupsStr = "";

  similarSetups.forEach((setup, i) => {
    if (setup.tradeResult === 'win') wins++;
    if (setup.pnlTicks) totalPnl += setup.pnlTicks;
    
    setupsStr += `\nSetup ${i + 1} (${Math.round(setup.similarity * 100)}% match) - ${setup.tradeDate} (${setup.dayOfWeek}):\n`;
    setupsStr += `Midnight open: RTH opened ${setup.rthVsMidnight || 'unknown'}\n`;
    setupsStr += `IB position: ${setup.ibPosition || 'unknown'}\n`;
    setupsStr += `Result: ${(setup.tradeResult || 'PENDING').toUpperCase()}\n`;
    setupsStr += `PnL: ${setup.pnlTicks || 0} ticks\n`;
    setupsStr += `Confidence: ${setup.geminiConfidence || 'unknown'}\n`;
  });

  const win_pct = Math.round((wins / n) * 100);
  const avg_pnl = (totalPnl / n).toFixed(1);

  return `HISTORICAL CONTEXT - ${n} similar past setups retrieved from trade history:
${setupsStr}
Pattern insight:
Of ${n} similar setups, ${wins} resulted in wins (${win_pct}%).
Average PnL on similar setups: ${avg_pnl} ticks.
Use this historical context to calibrate confidence and bias.`;
}

export async function embedPendingRecords(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: pendingRecords, error } = await supabase
      .from('trade_embeddings')
      .select('*')
      .is('embedding', null)
      .eq('user_id', user.id)
      .limit(5);

    if (error || !pendingRecords || pendingRecords.length === 0) return;

    for (const record of pendingRecords) {
      try {
        const embedding = await generateEmbedding(record.embedding_text);
        await supabase
          .from('trade_embeddings')
          .update({ embedding })
          .eq('id', record.id);
      } catch (err) {
        console.error(`[RAG] Failed to embed record ${record.id}:`, err);
      }
    }
  } catch (error) {
    // Quietly fail
  }
}

export async function updateRAGWithTradeResult(
  setupId: string,
  tradeResult: "win" | "loss" | "scratch" | "pending",
  pnlTicks?: number | null,
  pnlDollars?: number | null,
  entryPrice?: number | null,
  exitPrice?: number | null,
  geminiVerdict?: "CONFIRMED" | "DISPUTED" | "UNCLEAR" | null,
  proofScreenshotUrl?: string | null
): Promise<void> {
  try {
    const { data: record, error } = await supabase
      .from('trade_embeddings')
      .select('*')
      .eq('setup_id', setupId)
      .single();

    if (error || !record) return;

    let setupQualityScore = record.setup_quality_score;
    if (tradeResult === 'win') setupQualityScore += 0.2;
    else if (tradeResult === 'loss') setupQualityScore -= 0.1;

    // Use a context builder
    const context: RAGSaveContext = {
      sessionType: record.session_type,
      instrument: record.instrument,
      tradeDate: record.trade_date,
      dayOfWeek: record.day_of_week,
      midnightOpenPrice: record.midnight_open_price,
      rthVsMidnight: record.rth_vs_midnight,
      retraceProbability: record.retrace_probability,
      ibHigh: record.initial_balance_high,
      ibLow: record.initial_balance_low,
      ibPosition: record.ib_position,
      entryPrice: entryPrice !== undefined ? entryPrice : record.entry_price,
      exitPrice: exitPrice !== undefined ? exitPrice : record.exit_price,
      pnlTicks: pnlTicks !== undefined ? pnlTicks : record.pnl_ticks,
      pnlDollars: pnlDollars !== undefined ? pnlDollars : record.pnl_dollars,
      contracts: record.contracts,
      geminiConfidence: record.gemini_confidence,
      geminiVerdict: geminiVerdict !== undefined ? geminiVerdict : record.gemini_verdict,
      tradeResult: tradeResult,
      notes: record.notes
    };

    const newEmbeddingText = buildEmbeddingText(context);
    const newEmbedding = await generateEmbedding(newEmbeddingText);

    await supabase.from('trade_embeddings').update({
      trade_result: tradeResult,
      pnl_ticks: context.pnlTicks,
      pnl_dollars: context.pnlDollars,
      entry_price: context.entryPrice,
      exit_price: context.exitPrice,
      gemini_verdict: context.geminiVerdict,
      proof_screenshot_url: proofScreenshotUrl !== undefined ? proofScreenshotUrl : record.proof_screenshot_url,
      setup_quality_score: setupQualityScore,
      embedding_text: newEmbeddingText,
      embedding: newEmbedding
    }).eq('id', record.id);

    console.log(`[RAG] Updated embedding for setup ${setupId} - result: ${tradeResult}`);
  } catch (error) {
    console.error("[RAG] Failed to update record:", error);
  }
}
