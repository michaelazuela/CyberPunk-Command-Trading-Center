import type { AnalysisResult } from '../types';

export interface ChartFactMergeInput {
  analysis: AnalysisResult;
  ohlcContext: Partial<AnalysisResult['structuredChartContext']> | null;
  ohlcSummary: string;
  sourceName?: string;
}

export function mergeOhlcFactsIntoAnalysis({
  analysis,
  ohlcContext,
  ohlcSummary,
  sourceName = 'NinjaTrader Bridge',
}: ChartFactMergeInput): AnalysisResult {
  if (!ohlcContext) return analysis;

  const existing = analysis.structuredChartContext || {};
  const ohlcAuthoritySummary = `${ohlcSummary} OHLC fields from NinjaTrader are factual and take precedence over AI visual extraction.`;

  return {
    ...analysis,
    reasoning: `${analysis.reasoning || ''}\n\n[NINJATRADER BRIDGE] ${ohlcAuthoritySummary}`.trim(),
    structuredChartContext: {
      ...existing,
      ...ohlcContext,
      keyLevels: {
        ...(existing.keyLevels || {}),
        ...(ohlcContext.keyLevels || {}),
      },
      extractedLevels: ohlcContext.extractedLevels || existing.extractedLevels,
      candles: ohlcContext.candles || existing.candles,
      swings: ohlcContext.swings || existing.swings,
      fvgZones: ohlcContext.fvgZones || existing.fvgZones,
      liquidityEvents: ohlcContext.liquidityEvents || existing.liquidityEvents,
      liquiditySweeps: ohlcContext.liquiditySweeps || existing.liquiditySweeps,
      reclaimEvents: ohlcContext.reclaimEvents || existing.reclaimEvents,
      failedBreakEvents: ohlcContext.failedBreakEvents || existing.failedBreakEvents,
      displacementCandles: ohlcContext.displacementCandles || existing.displacementCandles,
      setupReadyFacts: ohlcContext.setupReadyFacts || existing.setupReadyFacts,
      structuralLevels: ohlcContext.structuralLevels || existing.structuralLevels,
      sessionLevelContext: ohlcContext.sessionLevelContext || existing.sessionLevelContext,
      sessionStory: ohlcContext.sessionStory || existing.sessionStory,
      targetObjectives: ohlcContext.targetObjectives || existing.targetObjectives,
      marketStructure: ohlcContext.marketStructure || existing.marketStructure,
      candleFacts: ohlcContext.candleFacts || existing.candleFacts,
      marketContext: ohlcContext.marketContext || existing.marketContext,
      ocrText: ohlcContext.ocrText || existing.ocrText,
      extractionWarnings: ohlcContext.extractionWarnings || existing.extractionWarnings,
    },
    agentReports: [
      ...(analysis.agentReports || []),
      {
        agentName: sourceName,
        findings: ohlcSummary,
        status: 'SUCCESS' as const,
      },
    ],
  };
}

export function chartFactAuthorityInstruction(): string {
  return 'Chart fact agent extracts or merges facts only. It must not approve trades, alter setup gates, or change executable entry/stop/target values.';
}
