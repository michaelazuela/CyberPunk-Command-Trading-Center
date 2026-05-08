import { RAGSaveContext, SimilarSetup } from '../types';
import { supabase } from './supabase';
import { generateEmbedding, generateQueryEmbedding, buildEmbeddingText } from './embeddings';
import { mapTradeEmbeddingRow } from './ragMapper';

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
      analysis_mode: context.analysis_mode || 'live',
      source: context.source || 'app',
      session_type: context.sessionType,
      trade_date: context.tradeDate,
      day_of_week: context.dayOfWeek,
      instrument: context.instrument || 'MES',
      midnight_open_price: context.midnightOpenPrice ?? null,
      midnight_open_instrument: context.midnightOpenInstrument ?? null,
      midnight_open_source: context.midnightOpenSource ?? null,
      midnight_open_confirmed_at: context.midnightOpenConfirmedAt ?? null,
      midnight_open_date: context.midnightOpenDate ?? null,
      midnight_open_status: context.midnightOpenStatus ?? null,
      distance_from_midnight_points: context.distanceFromMidnightPoints ?? null,
      distance_from_midnight_ticks: context.distanceFromMidnightTicks ?? null,
      midnight_role: context.midnightRole || null,
      midnight_interaction: context.midnightInteraction || null,
      midnight_plan_impact: context.midnightPlanImpact || null,
      midnight_confidence_adjustment: context.midnightConfidenceAdjustment || null,
      midnight_confidence_reason: context.midnightConfidenceReason || null,
      rth_vs_midnight: context.rthVsMidnight || null,
      retrace_probability: context.retraceProbability ?? null,
      initial_balance_high: context.ibHigh ?? null,
      initial_balance_low: context.ibLow ?? null,
      ib_position: context.ibPosition ?? null,
      entry_price: context.entryPrice ?? null,
      exit_price: context.exitPrice ?? null,
      stop_price: context.stopPrice ?? null,
      target_1_price: context.t1 ?? null,
      target_2_price: context.t2 ?? null,
      risk_points: context.riskPoints ?? null,
      plan_source: context.planSource || null,
      pnl_ticks: context.pnlTicks ?? null,
      pnl_dollars: context.pnlDollars ?? null,
      contracts: context.contracts ?? null,
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
      notes: context.notes || null,

      execution_5m_screenshot_url: context.execution_5m_screenshot_url || null,
      execution_5m_storage_path: context.execution_5m_storage_path || null,
      execution_timeframe: context.execution_timeframe || null,
      eth_15m_context_screenshot_url: context.eth_15m_context_screenshot_url || null,
      eth_15m_context_storage_path: context.eth_15m_context_storage_path || null,
      context_timeframe: context.context_timeframe || null,
      context_session: context.context_session || null,
      eth_context_available: context.eth_context_available || false,
      eth_context_status: context.eth_context_status || null,
      eth_high: context.eth_high || null,
      eth_low: context.eth_low || null,
      asian_high: context.asian_high || null,
      asian_low: context.asian_low || null,
      london_high: context.london_high || null,
      london_low: context.london_low || null,
      ny_premarket_high: context.ny_premarket_high || null,
      ny_premarket_low: context.ny_premarket_low || null,
      rth_open_relation_to_eth: context.rth_open_relation_to_eth || null,
      rth_open_relation_to_midnight: context.rth_open_relation_to_midnight || null,
      trade_plan_json: context.trade_plan_json || null,
      execution_review_json: context.execution_review_json || null,
      eth_context_review_json: context.eth_context_review_json || null,
      afternoon_test_plan_json: context.afternoon_test_plan_json || null,
      midnight_open_review_json: context.midnight_open_review_json || null,
      
      window_start: context.window_start || null,
      window_end: context.window_end || null,
      window_timezone: context.window_timezone || null,
      required_screenshot_range: context.required_screenshot_range || null,
    };

    let existingId = null;
    if (context.tradeId) {
      const { data } = await supabase.from('trade_embeddings').select('id').eq('trade_id', context.tradeId).maybeSingle();
      if (data) existingId = data.id;
    } else if (context.setupId) {
      const { data } = await supabase.from('trade_embeddings').select('id').eq('setup_id', context.setupId).maybeSingle();
      if (data) existingId = data.id;
    } 
    
    if (existingId) {
       await supabase.from('trade_embeddings').update(record).eq('id', existingId);
    } else {
       const { error: insertError } = await supabase.from('trade_embeddings').insert(record);
       if (insertError) {
         const conflictTarget = context.tradeId ? ['trade_id', context.tradeId] : context.setupId ? ['setup_id', context.setupId] : null;
         if (insertError.code === '23505' && conflictTarget) {
           await supabase.from('trade_embeddings').update(record).eq(conflictTarget[0], conflictTarget[1]);
         } else {
           throw insertError;
         }
       }
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

    return (data || []).map((row: any) => mapTradeEmbeddingRow(row));

  } catch (error) {
    console.error("[RAG] Retrieval failed:", error);
    return [];
  }
}

export function buildAgentLearningSummary(similarSetups: SimilarSetup[]) {
  const completedOutcomes = similarSetups.filter(s => ['win', 'loss', 'scratch'].includes(s.tradeResult?.toLowerCase() || ''));
  
  let winCount = 0;
  let lossCount = 0;
  let scratchCount = 0;
  let totalPnlTicks = 0;
  let totalPnlDollars = 0;
  let pnlTicksCount = 0;
  let pnlDollarsCount = 0;

  // Midnight variables
  let midnightWinCount = 0;
  let midnightLossCount = 0;
  let midnightTotalPnlTicks = 0;
  let midnightTotalPnlDollars = 0;
  let midnightPnlTicksCount = 0;
  let midnightPnlDollarsCount = 0;
  const midnightSetups = similarSetups.filter(s => !!s.midnightOpenPrice);
  const completedMidnightSetups = midnightSetups.filter(s => ['win', 'loss', 'scratch'].includes(s.tradeResult?.toLowerCase() || ''));

  completedOutcomes.forEach(setup => {
    const res = setup.tradeResult?.toLowerCase() || '';
    if (res === 'win') winCount++;
    else if (res === 'loss') lossCount++;
    else if (res === 'scratch') scratchCount++;

    if (setup.pnlTicks !== null && setup.pnlTicks !== undefined) {
      totalPnlTicks += setup.pnlTicks;
      pnlTicksCount++;
    }
    if (setup.pnlDollars !== null && setup.pnlDollars !== undefined) {
      totalPnlDollars += setup.pnlDollars;
      pnlDollarsCount++;
    }
  });

  completedMidnightSetups.forEach(setup => {
    const res = setup.tradeResult?.toLowerCase() || '';
    if (res === 'win') midnightWinCount++;
    else if (res === 'loss') midnightLossCount++;

    if (setup.pnlTicks !== null && setup.pnlTicks !== undefined) {
      midnightTotalPnlTicks += setup.pnlTicks;
      midnightPnlTicksCount++;
    }
    if (setup.pnlDollars !== null && setup.pnlDollars !== undefined) {
      midnightTotalPnlDollars += setup.pnlDollars;
      midnightPnlDollarsCount++;
    }
  });

  const setupCount = similarSetups.length;
  const completedCount = completedOutcomes.length;
  const pendingCount = setupCount - completedCount;

  const winRate = completedCount > 0 ? winCount / completedCount : null;
  const avgPnlTicks = pnlTicksCount > 0 ? totalPnlTicks / pnlTicksCount : null;
  const avgPnlDollars = pnlDollarsCount > 0 ? totalPnlDollars / pnlDollarsCount : null;

  const midnightSetupCount = midnightSetups.length;
  const midnightCompletedCount = completedMidnightSetups.length;
  const midnightWinRate = midnightCompletedCount > 0 ? midnightWinCount / midnightCompletedCount : null;
  const midnightAvgPnlTicks = midnightPnlTicksCount > 0 ? midnightTotalPnlTicks / midnightPnlTicksCount : null;
  const midnightAvgPnlDollars = midnightPnlDollarsCount > 0 ? midnightTotalPnlDollars / midnightPnlDollarsCount : null;
  const midnightBestMatch = midnightSetups.length > 0 ? midnightSetups[0] : undefined;
  
  let midnightPatternLearned = "Not enough Midnight Open history yet.";
  if (midnightCompletedCount >= 1) {
    midnightPatternLearned = `When similar Midnight Open setups occurred, they won ${midnightWinCount} out of ${midnightCompletedCount} times.`;
  }
  let midnightRiskWarning: string | undefined;
  if (midnightWinRate !== null && midnightWinRate <= 0.4) {
    midnightRiskWarning = "Past trades underperformed when similar Midnight Open conditions were present.";
  }

  let strongestLesson = "Not enough completed similar setups yet. Continue logging outcomes.";
  let confidenceAdjustment: "increase" | "decrease" | "neutral" = "neutral";
  let riskWarning: string | undefined;

  let bestMatch = similarSetups.length > 0 ? similarSetups[0] : undefined;

  if (completedCount >= 3) {
    if (winRate !== null && winRate >= 0.70) {
      confidenceAdjustment = "increase";
      strongestLesson = `Historically, similar setups have performed well (${Math.round(winRate * 100)}% win rate). Watch for confirmation.`;
    } else if (winRate !== null && winRate <= 0.40) {
      confidenceAdjustment = "decrease";
      strongestLesson = `Warning: Similar setups have significantly underperformed (${Math.round(winRate * 100)}% win rate). Proceed with caution.`;
    } else {
      confidenceAdjustment = "neutral";
      strongestLesson = "Similar setups have mixed results historically. Follow standard entry rules.";
    }
  }

  if (avgPnlTicks !== null && avgPnlTicks < 0) {
    riskWarning = `Historically negative expectancy observed on similar setups (avg ${avgPnlTicks.toFixed(1)} ticks). Tighten stops if entering.`;
  }

  if (bestMatch && bestMatch.tradeResult?.toLowerCase() === 'loss') {
    strongestLesson += " Note: The most similar historical setup resulted in a LOSS.";
  }

  const confidenceAdjustmentReason = `Win rate is ${winRate !== null ? Math.round(winRate * 100) + '%' : 'unknown'} with ${completedCount} completed setups.`;

  return {
    setupCount,
    completedCount,
    winCount,
    lossCount,
    scratchCount,
    pendingCount,
    winRate,
    avgPnlTicks,
    avgPnlDollars,
    bestMatch,
    strongestLesson,
    riskWarning,
    confidenceAdjustment,
    confidenceAdjustmentReason,
    
    // Midnight
    midnightSetupCount,
    midnightCompletedCount,
    midnightWinRate,
    midnightAvgPnlTicks,
    midnightAvgPnlDollars,
    midnightBestMatch,
    midnightPatternLearned,
    midnightRiskWarning
  };
}

export function formatRAGContextForGemini(similarSetups: SimilarSetup[]): string {
  if (!similarSetups || similarSetups.length === 0) {
    return `HISTORICAL CONTEXT:
No similar past setups found in trade history yet. You MUST analyze this entirely from the current screenshot using existing rules. Return { "agent_learning_used": false }.`;
  }

  const n = similarSetups.length;
  let wins = 0;
  let losses = 0;
  let scratches = 0;
  let misses = 0;
  let totalPnl = 0;
  let setupsStr = "";
  
  let liveCount = 0;
  let replayCount = 0;

  similarSetups.forEach((setup, i) => {
    if (setup.tradeResult === 'win') wins++;
    else if (setup.tradeResult === 'loss') losses++;
    else if (setup.tradeResult === 'scratch') scratches++;
    else if (setup.tradeResult === 'no_trade' || setup.tradeResult === 'pending') misses++; // treats no_trade/pending as miss
    
    if (setup.source === 'replay_lab') replayCount++;
    else liveCount++;

    if (setup.pnlTicks) totalPnl += setup.pnlTicks;
    
    setupsStr += `\nSetup ${i + 1} (${Math.round(setup.similarity * 100)}% match) - ${setup.tradeDate} (${setup.dayOfWeek}):\n`;
    setupsStr += `Source: ${setup.source === 'replay_lab' ? 'Replay Lab (Historical Backtest)' : 'Live Trading'}\n`;
    setupsStr += `Midnight open: RTH opened ${setup.rthVsMidnight || 'unknown'}\n`;
    setupsStr += `IB position: ${setup.ibPosition || 'unknown'}\n`;
    setupsStr += `Result: ${(setup.tradeResult || 'PENDING').toUpperCase()}\n`;
    setupsStr += `PnL: ${setup.pnlTicks || 0} ticks\n`;
    setupsStr += `Confidence at the time: ${setup.geminiConfidence || 'unknown'}\n`;
  });

  const win_pct = Math.round((wins / n) * 100);
  const avg_pnl = (totalPnl / n).toFixed(1);

  return `HISTORICAL CONTEXT - ${n} similar past setups retrieved from RAG memory:
- ${liveCount} Live Records
- ${replayCount} Replay Lab Records

${setupsStr}

Historical Support Context:
Of ${n} similar setups: ${wins} wins (${win_pct}%), ${losses} losses, ${scratches} scratches.
Average PnL on similar setups: ${avg_pnl} ticks.

You MUST use this historical data to decide whether it SUPPORTS, CONFLICTS WITH, or is NEUTRAL towards the plan you derived in your current rule analysis step. Return { "agent_learning_used": true }.`;
}

export async function embedPendingRecords(): Promise<void> {
  // embedPendingRecords only repairs missing vector embeddings. It does not itself display learning insights.
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (import.meta.env.DEV) console.log("[AGENT LEARNING] Checking for pending embeddings...");

    const { data: pendingRecords, error } = await supabase
      .from('trade_embeddings')
      .select('*')
      .is('embedding', null)
      .eq('user_id', user.id)
      .limit(5);

    if (error || !pendingRecords || pendingRecords.length === 0) return;

    let updatedCount = 0;
    for (const record of pendingRecords) {
      try {
        const embedding = await generateEmbedding(record.embedding_text);
        await supabase
          .from('trade_embeddings')
          .update({ embedding })
          .eq('id', record.id);
        updatedCount++;
      } catch (err) {
        console.error(`[RAG] Failed to embed record ${record.id}:`, err);
      }
    }
    
    if (import.meta.env.DEV) console.log(`[AGENT LEARNING] Pending embedding backfill complete: ${updatedCount} updated`);
  } catch (error) {
    // Quietly fail
  }
}

export async function updateRAGWithTradeResult(
  setupId: string,
  tradeResult: "win" | "loss" | "scratch" | "pending" | "no_trade" | "missed_trade" | string,
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
      midnightOpenInstrument: record.midnight_open_instrument,
      midnightOpenSource: record.midnight_open_source,
      midnightOpenConfirmedAt: record.midnight_open_confirmed_at,
      midnightOpenDate: record.midnight_open_date,
      midnightOpenStatus: record.midnight_open_status,
      distanceFromMidnightPoints: record.distance_from_midnight_points,
      distanceFromMidnightTicks: record.distance_from_midnight_ticks,
      midnightRole: record.midnight_role,
      midnightInteraction: record.midnight_interaction,
      midnightPlanImpact: record.midnight_plan_impact,
      midnightConfidenceAdjustment: record.midnight_confidence_adjustment,
      midnightConfidenceReason: record.midnight_confidence_reason,
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

    console.log(`[RAG] Midnight Open learning updated for setup ${setupId}`);
  } catch (error) {
    console.error("[RAG] Failed to update record:", error);
  }
}
