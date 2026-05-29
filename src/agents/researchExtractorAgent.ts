export interface ResearchExtractorInput {
  sourceTitle: string;
  sourceType: 'transcript' | 'article' | 'notes' | string;
  transcriptText: string;
  market: string;
  sessionContext: string;
  requestedConcepts: string[];
  currentModelComparisonTargets: string[];
}

export interface ResearchConcept {
  conceptName: string;
  plainEnglishMeaning: string;
  transcriptEvidence: string;
  timestamp: string | null;
  whyItMayMatterFor6K: string;
  currentCoverage: 'already_covered' | 'partially_covered' | 'not_covered' | 'research_only';
  watchlistOnly: boolean;
}

export interface ResearchBriefWeeklySummary {
  researchTitle: string;
  status: 'research_only';
  candidateName: string;
  primaryIdea: string;
  recommendedNextStep: string;
  approvalBoundarySummary: string;
  includeInWeeklyNewsletter: true;
}

export interface ResearchBrief {
  sourceSummary: {
    videoTitle: string;
    sourceType: string;
    marketDiscussed: string;
    sessionContext: string;
    sourceDate: string | null;
    disclaimer: string;
  };
  extractedConcepts: ResearchConcept[];
  candidateWatchlistModel: {
    name: 'Final-Hour ICT-Style Liquidity Draw Watchlist';
    purpose: string;
    status: 'research_candidate_only';
    executable: false;
    createsEntries: false;
    createsStops: false;
    createsTargets: false;
    createsOutcomeButtons: false;
    createsAutoAlerts: false;
  };
  candidateConditions: {
    contextConditions: string[];
    structureConditions: string[];
    invalidationCautionConditions: string[];
  };
  comparisonToExistingRules: Array<{
    target: string;
    comparison: 'already_covered' | 'partially_covered' | 'not_covered' | 'research_only';
    note: string;
  }>;
  bridgeDataResearchPlan: string[];
  advisoryDiscordDraft: string;
  guardrails: string[];
  recommendedNextStep: string;
  weeklyNewsletterSummary: ResearchBriefWeeklySummary;
  approvalBoundary: {
    researchApprovesTrade: false;
    researchChangesRules: false;
    researchCreatesEntry: false;
    researchCreatesTargets: false;
    researchAddsExecutableModel: false;
    researchChangesScanner: false;
    researchChangesBridge: false;
    researchChangesDiscord: false;
  };
}

const CONCEPT_DETAILS: Record<string, Omit<ResearchConcept, 'conceptName' | 'transcriptEvidence' | 'timestamp'>> = {
  'Last-hour macro window: 3:15-3:45 ET': {
    plainEnglishMeaning: 'A late-session observation window where price may seek a final liquidity draw before the close.',
    whyItMayMatterFor6K: 'It could help research late-day context without changing Morning/Lunch execution windows.',
    currentCoverage: 'not_covered',
    watchlistOnly: true,
  },
  'Liquidity target: relative equal highs / clean highs': {
    plainEnglishMeaning: 'Clean buy-side highs above price may act as a late-day draw on liquidity.',
    whyItMayMatterFor6K: '6K already maps real liquidity targets, but this final-hour use case is not an approved model.',
    currentCoverage: 'partially_covered',
    watchlistOnly: true,
  },
  'Smooth vs jagged price action': {
    plainEnglishMeaning: 'Cleaner movement may imply easier delivery toward liquidity; jagged action warns of noise.',
    whyItMayMatterFor6K: 'Could support future research scoring, but must not become a trade trigger by itself.',
    currentCoverage: 'partially_covered',
    watchlistOnly: true,
  },
  'Price stops going lower': {
    plainEnglishMeaning: 'Downside continuation stalls before the late-day move attempts to draw higher.',
    whyItMayMatterFor6K: 'May overlap with reversal context, but 6K still requires approved 5M gates for execution.',
    currentCoverage: 'partially_covered',
    watchlistOnly: true,
  },
  'PD array foothold': {
    plainEnglishMeaning: 'Price finds support at a premium/discount array such as an imbalance or order block.',
    whyItMayMatterFor6K: 'Useful as context for research, not execution authority.',
    currentCoverage: 'partially_covered',
    watchlistOnly: true,
  },
  'IFVG / FVG / order block support': {
    plainEnglishMeaning: 'A fair value gap, inverse FVG, or order block acts as the proposed foothold for the move.',
    whyItMayMatterFor6K: 'FVG and breaker/order-block facts exist as supporting context, but not as standalone approval.',
    currentCoverage: 'partially_covered',
    watchlistOnly: true,
  },
  'Down-close candle watched as support': {
    plainEnglishMeaning: 'A prior down-close candle may be monitored as a support reference for late-day expansion.',
    whyItMayMatterFor6K: 'Not currently an approved 6K setup gate; should stay research-only.',
    currentCoverage: 'not_covered',
    watchlistOnly: true,
  },
  'Accumulation before expansion': {
    plainEnglishMeaning: 'Price compresses or bases before expanding toward the liquidity draw.',
    whyItMayMatterFor6K: 'Could become a descriptive bridge research tag, but not an executable rule.',
    currentCoverage: 'partially_covered',
    watchlistOnly: true,
  },
  'Spring / displacement higher': {
    plainEnglishMeaning: 'A quick expansion higher after the foothold suggests the draw may be underway.',
    whyItMayMatterFor6K: 'Displacement exists in current context/ranking, but does not approve a trade alone.',
    currentCoverage: 'already_covered',
    watchlistOnly: true,
  },
  'Risk reduction after movement': {
    plainEnglishMeaning: 'After movement starts, risk should be reduced rather than chasing wider exposure.',
    whyItMayMatterFor6K: 'Aligns with current no-chase and RiskTooWide discipline.',
    currentCoverage: 'already_covered',
    watchlistOnly: true,
  },
  'Avoid chasing if move is already in a hurry': {
    plainEnglishMeaning: 'If price is already running, the idea becomes observation-only until a fresh approved setup forms.',
    whyItMayMatterFor6K: 'Directly aligns with existing stale/no-chase and conditional risk-score guardrails.',
    currentCoverage: 'already_covered',
    watchlistOnly: true,
  },
};

function normalizeConceptName(value: string): string {
  return value.replace(/\u2013|\u2014/g, '-').replace(/\s+/g, ' ').trim();
}

function conceptEvidence(concept: string, transcriptText: string): { evidence: string; timestamp: string | null } {
  const normalized = normalizeConceptName(concept);
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const timestampPattern = new RegExp(`(?:\\[?(\\d{1,2}:\\d{2}(?::\\d{2})?)\\]?[^\\n]{0,160}${escaped}|${escaped}[^\\n]{0,160}\\[?(\\d{1,2}:\\d{2}(?::\\d{2})?)\\]?)`, 'i');
  const timestampMatch = transcriptText.match(timestampPattern);
  const timestamp = timestampMatch?.[1] || timestampMatch?.[2] || null;
  return {
    evidence: timestamp
      ? `Transcript references ${normalized} near ${timestamp}.`
      : `Transcript/task notes identify ${normalized}; exact timestamp was not available in the provided prompt.`,
    timestamp,
  };
}

function sourceDateFromTranscript(transcriptText: string): string | null {
  const match = transcriptText.match(/\b(20\d{2}-\d{2}-\d{2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},\s+20\d{2})\b/i);
  return match?.[1] || null;
}

export function extractResearchBrief(input: ResearchExtractorInput): ResearchBrief {
  const requestedConcepts = [...input.requestedConcepts];
  const extractedConcepts = requestedConcepts.map((rawConcept) => {
    const conceptName = normalizeConceptName(rawConcept);
    const detail = CONCEPT_DETAILS[conceptName] || {
      plainEnglishMeaning: 'Research concept extracted from transcript notes for manual review.',
      whyItMayMatterFor6K: 'Potential context only; separate approval would be required before implementation.',
      currentCoverage: 'research_only' as const,
      watchlistOnly: true,
    };
    const evidence = conceptEvidence(conceptName, input.transcriptText);
    return {
      conceptName,
      ...detail,
      transcriptEvidence: evidence.evidence,
      timestamp: evidence.timestamp,
    };
  });

  const comparisonToExistingRules = input.currentModelComparisonTargets.map((target) => {
    const lower = target.toLowerCase();
    if (lower.includes('model 1')) {
      return {
        target,
        comparison: 'partially_covered' as const,
        note: 'Model 1 already requires approved sweep/reclaim/displacement/MSS/FVG gates; the final-hour draw idea cannot bypass those gates.',
      };
    }
    if (lower.includes('turtle')) {
      return {
        target,
        comparison: 'partially_covered' as const,
        note: 'Turtle Soup already handles sweep/reclaim reversals; final-hour liquidity draw remains context only unless approved 5M gates confirm.',
      };
    }
    if (lower.includes('watchlist') || lower.includes('fvg')) {
      return {
        target,
        comparison: 'partially_covered' as const,
        note: 'Existing watchlists are advisory-only. This research candidate should follow the same boundary.',
      };
    }
    if (lower.includes('risk')) {
      return {
        target,
        comparison: 'already_covered' as const,
        note: 'Conditional risk scoring already keeps manual decisions separate from app approval.',
      };
    }
    return {
      target,
      comparison: 'research_only' as const,
      note: 'No executable rule relationship should be assumed without bridge-backed review and separate approval.',
    };
  });

  const weeklyNewsletterSummary: ResearchBriefWeeklySummary = {
    researchTitle: 'ICT Final-Hour Liquidity Draw Research',
    status: 'research_only',
    candidateName: 'Final-Hour ICT-Style Liquidity Draw Watchlist',
    primaryIdea: 'Late-day draw toward clean buy-side liquidity during the 3:15-3:45 ET final-hour macro window.',
    recommendedNextStep: 'Keep as research note and collect 20-30 bridge-backed examples before any human rule review.',
    approvalBoundarySummary: 'Research only: no rules, scanner changes, entries, stops, targets, alerts, or model promotion.',
    includeInWeeklyNewsletter: true,
  };

  return {
    sourceSummary: {
      videoTitle: input.sourceTitle,
      sourceType: input.sourceType,
      marketDiscussed: input.market,
      sessionContext: input.sessionContext,
      sourceDate: sourceDateFromTranscript(input.transcriptText),
      disclaimer: 'Educational research only. This does not approve trades, change rules, or create execution authority.',
    },
    extractedConcepts,
    candidateWatchlistModel: {
      name: 'Final-Hour ICT-Style Liquidity Draw Watchlist',
      purpose: 'Identify late-day conditions where price forms a foothold and appears likely to draw toward clean buy-side liquidity during the 3:15-3:45 ET macro window.',
      status: 'research_candidate_only',
      executable: false,
      createsEntries: false,
      createsStops: false,
      createsTargets: false,
      createsOutcomeButtons: false,
      createsAutoAlerts: false,
    },
    candidateConditions: {
      contextConditions: [
        'Instrument: ES/MES first; NQ/MNQ only as a later study.',
        'Time window: 3:15-3:45 ET final-hour macro.',
        'Optional observation around 3:30 ET, but do not hard-code as a rule yet.',
        'Larger-timeframe context must not strongly conflict.',
      ],
      structureConditions: [
        'Price has stopped going lower.',
        'Price forms or respects a foothold.',
        'Foothold may be IFVG, FVG, order block, or down-close candle support.',
        'Clean relative equal highs or smooth highs exist above as potential buy-side liquidity.',
        'There is room to target the liquidity before major resistance.',
        'Price begins to displace/spring higher from the foothold.',
      ],
      invalidationCautionConditions: [
        'Price already reached the liquidity draw.',
        'Price is too extended to chase.',
        'Larger timeframe directly conflicts.',
        'No clean liquidity draw exists.',
        'Price remains jagged/noisy without clear foothold.',
        'Risk would be too wide under current approved rules.',
      ],
    },
    comparisonToExistingRules,
    bridgeDataResearchPlan: [
      'Use local bridge data only.',
      'Replay completed bars.',
      'Focus on 3:15-3:45 ET.',
      'Identify clean relative equal highs above.',
      'Identify whether price stopped going lower before the move.',
      'Identify candidate footholds: IFVG/FVG/order block/down-close candle.',
      'Determine whether price displaced toward the liquidity draw.',
      'Determine whether T1/T2 would have been met only as after-action context.',
      'Track 20-30 examples before any rule approval discussion.',
    ],
    advisoryDiscordDraft: 'Final-Hour ICT-Style Liquidity Draw forming. Watch only - price may be drawing toward clean buy-side liquidity during the 3:15-3:45 macro. Wait for current approved 6K rules to confirm. Do not chase.',
    guardrails: [
      'This is not an approved executable model.',
      'Do not create entries, stops, T1/T2, or outcome buttons.',
      'Do not override Model 1 or Turtle Soup.',
      'Do not allow this to approve trades.',
      'Do not use later success to retroactively validate an invalid setup.',
      'Collect 20-30 examples first.',
    ],
    recommendedNextStep: 'Keep as research note only and create a future advisory-only smoke test prompt after enough examples are collected.',
    weeklyNewsletterSummary,
    approvalBoundary: {
      researchApprovesTrade: false,
      researchChangesRules: false,
      researchCreatesEntry: false,
      researchCreatesTargets: false,
      researchAddsExecutableModel: false,
      researchChangesScanner: false,
      researchChangesBridge: false,
      researchChangesDiscord: false,
    },
  };
}
