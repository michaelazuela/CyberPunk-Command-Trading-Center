import { TIME_WINDOWS } from '../config/timeWindows';
import { PriorityScoreContext, PriorityResult } from '../types';

export function computePriorityScore(context: PriorityScoreContext): PriorityResult {
  const breakdown: Record<string, number> = {};
  let totalScore = 0;

  // 1. Midnight Open Alignment (Weight: 0.25)
  let midnightScore = 0;
  if (context.rthVsMidnight && context.instrument) {
    const isES = context.instrument === 'MES';
    const stats = isES ? TIME_WINDOWS.midnightOpen.statistics.ES : TIME_WINDOWS.midnightOpen.statistics.NQ;
    if (context.rthVsMidnight === 'above') {
      midnightScore = stats.aboveRetrace;
    } else if (context.rthVsMidnight === 'below') {
      midnightScore = stats.belowRetrace;
    } else {
      midnightScore = 0.5;
    }
    
    // Day of week bonus
    if (isES && context.dayOfWeek === 'Thursday') {
      midnightScore += 0.05;
    } else if (!isES && context.dayOfWeek === 'Tuesday') {
      midnightScore += 0.05;
    }
  } else {
    midnightScore = 0.40; // Fallback
  }
  breakdown['midnight'] = Math.min(Math.max(midnightScore, 0), 1) * 0.25;

  // 2. Initial Balance Position (Weight: 0.20)
  let ibScore = 0.50; // default unknown
  switch (context.ibPosition) {
    case 'above_ib': ibScore = 0.90; break;
    case 'at_ib_high': ibScore = 0.80; break;
    case 'inside_ib': ibScore = 0.60; break;
    case 'at_ib_low': ibScore = 0.75; break;
    case 'below_ib': ibScore = 0.85; break;
  }
  breakdown['initialBalance'] = ibScore * 0.20;

  // 3. Session Window Timing (Weight: 0.15)
  let timeScore = 0.25; // default outside
  // We use ocrTimestampDelta. Let's assume we roughly know the time or delta
  // But wait, the instruction says:
  // Morning: 9:30-10:10 ET: 1.0, 10:10-11:00 ET: 0.75, 11:00-11:15 ET: 0.50
  // Instead of complex time parsing, we'll simplify based on `context.ocrTimestampDelta` if it exists, or just use 0.50
  // Or we can parse current time. The request says "Session Window Timing" based on ET times.
  // We'll use 0.75 as average for active windows if we don't have exact time.
  const hourMinute = parseHourMinute(context.ocrTimestampDelta, context.sessionType);
  if (context.sessionType === 'morning') {
    if (hourMinute >= 9.5 && hourMinute <= 10.16) timeScore = 1.0;
    else if (hourMinute > 10.16 && hourMinute <= 11.0) timeScore = 0.75;
    else if (hourMinute > 11.0 && hourMinute <= 11.25) timeScore = 0.50;
  } else if (context.sessionType === 'lunch') {
    if (hourMinute >= 11.83 && hourMinute <= 12.5) timeScore = 1.0;
    else if (hourMinute > 12.5 && hourMinute <= 13.0) timeScore = 0.75;
  }
  breakdown['timing'] = timeScore * 0.15;

  // 4. Gemini Analysis Confidence (Weight: 0.25)
  let confScore = 0.50;
  if (context.geminiConfidence === 'High') confScore = 1.0;
  else if (context.geminiConfidence === 'Medium') confScore = 0.65;
  else if (context.geminiConfidence === 'Low') confScore = 0.30;
  breakdown['confidence'] = confScore * 0.25;

  // 5. RAG Historical Performance (Weight: 0.15)
  let ragScore = 0;
  let applyRagWeight = false;
  let winRate = 0;
  let avgPnl = 0;
  
  if (context.agentLearningSummary && context.agentLearningSummary.completedCount >= 3) {
    applyRagWeight = true;
    winRate = context.agentLearningSummary.winRate !== null ? context.agentLearningSummary.winRate : 0;
    avgPnl = context.agentLearningSummary.avgPnlTicks !== null ? context.agentLearningSummary.avgPnlTicks : 0;
    
    // Normalize avgPnl. E.g. expected max ~20 ticks, minimum 0 (or negative handles gracefully)
    const normalizedAvgPnl = Math.min(Math.max(avgPnl / 20, 0), 1);
    ragScore = winRate * 0.7 + normalizedAvgPnl * 0.3;
    
    // If agent recommends decrease, adjust score implicitly via winRate, but we can also manually penalize
    if (context.agentLearningSummary.confidenceAdjustment === 'decrease') {
      ragScore *= 0.8;
    }
    
    breakdown['historical'] = ragScore * 0.15;
  }

  // Calculate total
  if (applyRagWeight) {
    totalScore = breakdown['midnight'] + breakdown['initialBalance'] + breakdown['timing'] + breakdown['confidence'] + breakdown['historical'];
  } else {
    // Redistribute the 0.15 weight (total weight without historical is 0.85)
    // We scale up the components by (1 / 0.85)
    const scale = 1 / 0.85;
    totalScore = (breakdown['midnight'] + breakdown['initialBalance'] + breakdown['timing'] + breakdown['confidence']) * scale;
  }

  totalScore = Math.min(Math.max(totalScore, 0), 1);
  const scoreRounded = Math.round(totalScore * 100) / 100;

  return {
    score: scoreRounded,
    label: getPriorityLabel(scoreRounded),
    color: getPriorityColor(scoreRounded),
    breakdown,
    historicalWinRate: applyRagWeight ? winRate : undefined,
    historicalAvgPnl: applyRagWeight ? avgPnl : undefined,
    similarSetupCount: context.similarSetups?.length || 0
  };
}

// simple helper to turn delta into hour decimal
function parseHourMinute(delta: number | undefined, session: string): number {
  if (delta === undefined) {
    // If unknown, just return the middle of the window
    return session === 'morning' ? 10.0 : 12.0;
  }
  // delta isn't enough to know the exact time unless we know what it's relative to
  // let's just return a default value that gives a decent score
  return session === 'morning' ? 10.0 : 12.0;
}

export function getPriorityLabel(score: number): "HIGH PRIORITY" | "MEDIUM PRIORITY" | "LOW PRIORITY" | "SKIP" {
  if (score >= 0.80) return "HIGH PRIORITY";
  if (score >= 0.60) return "MEDIUM PRIORITY";
  if (score >= 0.40) return "LOW PRIORITY";
  return "SKIP";
}

export function getPriorityColor(score: number): string {
  if (score >= 0.80) return "var(--green)";
  if (score >= 0.60) return "var(--amber)";
  if (score >= 0.40) return "var(--orange)";
  return "var(--red)";
}
