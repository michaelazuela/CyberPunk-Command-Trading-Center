import { SimilarSetup } from '../types';

export function mapTradeEmbeddingRow(row: any): SimilarSetup {
  return {
    id: row.id,
    source: row.source,
    analysisMode: row.analysis_mode,
    tradeDate: row.trade_date,
    dayOfWeek: row.day_of_week,
    sessionType: row.session_type,
    instrument: row.instrument,
    similarity: row.similarity,
    midnightOpenPrice: row.midnight_open_price,
    rthVsMidnight: row.rth_vs_midnight,
    ibPosition: row.ib_position,
    geminiConfidence: row.gemini_confidence,
    setupQualityScore: row.setup_quality_score,
    tradeResult: row.trade_result,
    pnlTicks: row.pnl_ticks,
    pnlDollars: row.pnl_dollars,
    contracts: row.contracts,
    entryPrice: row.entry_price,
    exitPrice: row.exit_price,
    stopPrice: row.stop_price,
    target1Price: row.target_1_price,
    target2Price: row.target_2_price,
    riskPoints: row.risk_points,
    planSource: row.plan_source,
    screenshotUrl: row.screenshot_url,
    proofScreenshotUrl: row.proof_screenshot_url,
    geminiVerdict: row.gemini_verdict,
    embeddingText: row.embedding_text,
    
    // Midnight Open attributes
    midnightOpenInstrument: row.midnight_open_instrument,
    midnightOpenSource: row.midnight_open_source,
    midnightOpenConfirmedAt: row.midnight_open_confirmed_at,
    midnightOpenDate: row.midnight_open_date,
    midnightOpenStatus: row.midnight_open_status,
    distanceFromMidnightPoints: row.distance_from_midnight_points,
    distanceFromMidnightTicks: row.distance_from_midnight_ticks,
    midnightRole: row.midnight_role,
    midnightInteraction: row.midnight_interaction,
    midnightPlanImpact: row.midnight_plan_impact,
    midnightConfidenceAdjustment: row.midnight_confidence_adjustment,
    midnightConfidenceReason: row.midnight_confidence_reason
  };
}
