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
  taxonomyNote?: string;
  recommendedNextStep: string;
  ruleChange?: 'none' | string;
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
    name: string;
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
  'Fading run toward all-time high / major buy-side liquidity': {
    plainEnglishMeaning: 'Price aggressively moves toward ATH, high of day, or major buy-side liquidity, then fails to sustain the run.',
    whyItMayMatterFor6K: 'It may identify a research-only bearish fade context without replacing Turtle Soup sweep/reclaim requirements.',
    currentCoverage: 'partially_covered',
    watchlistOnly: true,
  },
  'Judas Swing / false run logic as a source concept, with taxonomy caution': {
    plainEnglishMeaning: 'A false move concept that must be labeled carefully because strict Judas Swing has a specific session-open definition.',
    whyItMayMatterFor6K: 'It can help taxonomy, but should route true sweep/reclaim events through existing Turtle Soup.',
    currentCoverage: 'partially_covered',
    watchlistOnly: true,
  },
  'Market Maker Sell Model / MMSM as source narrative': {
    plainEnglishMeaning: 'A bearish delivery narrative where price moves from buy-side inducement toward sell-side liquidity.',
    whyItMayMatterFor6K: 'Useful research language only; it cannot approve trades or become a parallel executable model.',
    currentCoverage: 'research_only',
    watchlistOnly: true,
  },
  'Sell-side draw after buy-side failure': {
    plainEnglishMeaning: 'After price fails near buy-side liquidity, the next contextual draw may be clean sell-side liquidity below.',
    whyItMayMatterFor6K: '6K already maps liquidity targets, but this false-run fade pattern is not approved as an execution model.',
    currentCoverage: 'partially_covered',
    watchlistOnly: true,
  },
  'Relative equal lows / clean lows as downside liquidity': {
    plainEnglishMeaning: 'Clean lows below price may become a downside liquidity objective after bearish delivery begins.',
    whyItMayMatterFor6K: 'This overlaps with market-map liquidity context but must not create entries or targets by itself.',
    currentCoverage: 'already_covered',
    watchlistOnly: true,
  },
  'Suspension block / premium zone': {
    plainEnglishMeaning: 'A premium-side reference area where bearish delivery may begin if price cannot continue higher.',
    whyItMayMatterFor6K: 'May be tagged for research, not execution authority.',
    currentCoverage: 'not_covered',
    watchlistOnly: true,
  },
  'Bearish fair value gap / SIBI': {
    plainEnglishMeaning: 'A bearish imbalance that may mark sell-side delivery from the premium area.',
    whyItMayMatterFor6K: 'FVG facts can support current analysis, but are not standalone approval gates.',
    currentCoverage: 'partially_covered',
    watchlistOnly: true,
  },
  'Inversion fair value gap': {
    plainEnglishMeaning: 'A former imbalance flips behavior and acts as resistance/support context.',
    whyItMayMatterFor6K: 'Useful bridge-research context only unless current approved gates separately confirm.',
    currentCoverage: 'partially_covered',
    watchlistOnly: true,
  },
  'Order block and down-close candle support/resistance behavior': {
    plainEnglishMeaning: 'A candle or order-block reference may become the structure price reacts from.',
    whyItMayMatterFor6K: 'Current 6K may observe structure, but this cannot replace the 5M trigger/risk pipeline.',
    currentCoverage: 'partially_covered',
    watchlistOnly: true,
  },
  'Wick consequent encroachment / body staying below wick midpoint': {
    plainEnglishMeaning: 'Bodies failing to close above a wick midpoint may show inability to sustain bullish delivery.',
    whyItMayMatterFor6K: 'Potential research filter only; not an approved trigger.',
    currentCoverage: 'not_covered',
    watchlistOnly: true,
  },
  'Bodies must stay below premium wick / IFVG midpoint': {
    plainEnglishMeaning: 'Bearish control is suspected only while closes respect the premium boundary.',
    whyItMayMatterFor6K: 'May support future smoke-test labeling, but cannot create execution authority.',
    currentCoverage: 'not_covered',
    watchlistOnly: true,
  },
  'Price fails to rip higher when it should': {
    plainEnglishMeaning: 'Price hesitates or rejects when bullish continuation should be immediate.',
    whyItMayMatterFor6K: 'A caution/context idea only; subjective behavior must be translated into bridge facts before testing.',
    currentCoverage: 'research_only',
    watchlistOnly: true,
  },
  'Speed and distance needed for bearish delivery': {
    plainEnglishMeaning: 'The fade idea needs decisive bearish movement, not slow chop.',
    whyItMayMatterFor6K: 'Could be a future descriptive metric, but not a current setup gate.',
    currentCoverage: 'partially_covered',
    watchlistOnly: true,
  },
  'Spending too much time in a zone as caution': {
    plainEnglishMeaning: 'If price lingers in the premium zone without dropping, the fade idea weakens.',
    whyItMayMatterFor6K: 'Useful research caution that aligns with wait/no-trade discipline.',
    currentCoverage: 'partially_covered',
    watchlistOnly: true,
  },
  'Partial-taking when price stalls near target': {
    plainEnglishMeaning: 'Manual trade management may reduce exposure if price stalls near a draw.',
    whyItMayMatterFor6K: 'Research-only management note; it must not alter app targets or outcome behavior.',
    currentCoverage: 'research_only',
    watchlistOnly: true,
  },
  'Avoid chasing after move already delivers': {
    plainEnglishMeaning: 'If the downside move has already happened, the idea becomes review context only.',
    whyItMayMatterFor6K: 'Aligns with existing no-chase and stale/no-fresh-entry protections.',
    currentCoverage: 'already_covered',
    watchlistOnly: true,
  },
  'Manual discretion around fast wicks / manipulation risk': {
    plainEnglishMeaning: 'Fast wick behavior requires caution and should not be automated into trade authority.',
    whyItMayMatterFor6K: 'Supports research guardrails and manual review only.',
    currentCoverage: 'research_only',
    watchlistOnly: true,
  },
  'Time-based market windows': {
    plainEnglishMeaning: 'Defined market windows are studied as timing context for liquidity delivery.',
    whyItMayMatterFor6K: 'May help research when current approved setups tend to appear, but cannot approve a trade.',
    currentCoverage: 'partially_covered',
    watchlistOnly: true,
  },
  'Minimum framework: 10 handles / 40 ticks for index futures': {
    plainEnglishMeaning: 'A minimum expected delivery range used for research, not a guaranteed target.',
    whyItMayMatterFor6K: 'Could support after-action measurement without changing 6K target formulas.',
    currentCoverage: 'research_only',
    watchlistOnly: true,
  },
  'Minimum framework is expected delivery range, not exact entry-to-exit demand': {
    plainEnglishMeaning: 'The range expectation is contextual and should not be treated as an entry/exit prescription.',
    whyItMayMatterFor6K: 'Protects app-owned targets and risk rules from source-model drift.',
    currentCoverage: 'research_only',
    watchlistOnly: true,
  },
  'Draw on liquidity as primary skill': {
    plainEnglishMeaning: 'The research focus is identifying where price is likely trying to deliver.',
    whyItMayMatterFor6K: '6K already maps liquidity as context; execution still requires approved gates.',
    currentCoverage: 'partially_covered',
    watchlistOnly: true,
  },
  'Previous day high/low as liquidity draw': {
    plainEnglishMeaning: 'Prior-day extremes may act as draw or obstacle context.',
    whyItMayMatterFor6K: 'Covered by market map context, not standalone approval.',
    currentCoverage: 'already_covered',
    watchlistOnly: true,
  },
  'Previous session high/low as liquidity draw': {
    plainEnglishMeaning: 'Prior session highs/lows may act as draw or obstacle context.',
    whyItMayMatterFor6K: 'Covered by session map context, not standalone approval.',
    currentCoverage: 'already_covered',
    watchlistOnly: true,
  },
  'Previous weekly high/low as liquidity draw': {
    plainEnglishMeaning: 'Prior weekly extremes may act as higher-timeframe liquidity context.',
    whyItMayMatterFor6K: 'Useful map context only; it cannot replace 5M execution authority.',
    currentCoverage: 'partially_covered',
    watchlistOnly: true,
  },
  'New week opening gap as draw or expansion reference': {
    plainEnglishMeaning: 'A new week opening gap may become a draw, reference, or expansion context.',
    whyItMayMatterFor6K: 'Potential research context; not an approved 6K trigger.',
    currentCoverage: 'not_covered',
    watchlistOnly: true,
  },
  'FVG / inefficiency as draw or entry framework': {
    plainEnglishMeaning: 'An imbalance may provide context for delivery or repricing.',
    whyItMayMatterFor6K: 'FVG facts already support Model 1 context, but do not approve trades by themselves.',
    currentCoverage: 'partially_covered',
    watchlistOnly: true,
  },
  'London 3:00-4:00 NY window': {
    plainEnglishMeaning: 'A London timing window to study for liquidity delivery behavior.',
    whyItMayMatterFor6K: 'Research only; 6K execution windows remain unchanged.',
    currentCoverage: 'not_covered',
    watchlistOnly: true,
  },
  'AM 10:00-11:00 NY window': {
    plainEnglishMeaning: 'A morning timing window to study for liquidity delivery behavior.',
    whyItMayMatterFor6K: 'Overlaps the morning workflow, but cannot change current session gates.',
    currentCoverage: 'partially_covered',
    watchlistOnly: true,
  },
  'PM 2:00-3:00 NY window': {
    plainEnglishMeaning: 'An afternoon timing window to study for liquidity delivery behavior.',
    whyItMayMatterFor6K: 'Research only; it does not create a new execution window.',
    currentCoverage: 'not_covered',
    watchlistOnly: true,
  },
  'FVG forms inside the 60-minute window': {
    plainEnglishMeaning: 'The imbalance appears during the studied window.',
    whyItMayMatterFor6K: 'May become a research tag, but current Model 1/Turtle Soup gates still decide.',
    currentCoverage: 'partially_covered',
    watchlistOnly: true,
  },
  'Market structure shift plus FVG as setup component': {
    plainEnglishMeaning: 'A structure shift and imbalance may support a setup component.',
    whyItMayMatterFor6K: 'Partially overlaps Model 1, but Model 1 remains the approval path.',
    currentCoverage: 'partially_covered',
    watchlistOnly: true,
  },
  'Bodies respecting the FVG': {
    plainEnglishMeaning: 'Candle bodies respecting the imbalance may support the delivery thesis.',
    whyItMayMatterFor6K: 'Potential research filter only unless current approved gates pass.',
    currentCoverage: 'partially_covered',
    watchlistOnly: true,
  },
  'Entry may occur inside the window, but exit may occur later': {
    plainEnglishMeaning: 'The timing context may start a move that completes outside the window.',
    whyItMayMatterFor6K: 'Research note only; it must not alter execution or target logic.',
    currentCoverage: 'research_only',
    watchlistOnly: true,
  },
  'Need for 20-30+ examples before considering rule approval': {
    plainEnglishMeaning: 'The concept needs a meaningful sample before any rule review.',
    whyItMayMatterFor6K: 'Aligns with current research-desk guardrails.',
    currentCoverage: 'already_covered',
    watchlistOnly: true,
  },
  'One-market specialization': {
    plainEnglishMeaning: 'Study one market deeply before expanding to others.',
    whyItMayMatterFor6K: 'Supports MES-first research discipline.',
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

function isFalseRunResearch(input: ResearchExtractorInput): boolean {
  const haystack = [
    input.sourceTitle,
    input.sessionContext,
    input.transcriptText,
    ...input.requestedConcepts,
  ].join(' ').toLowerCase();
  return haystack.includes('fading run to ath') ||
    haystack.includes('false-run') ||
    haystack.includes('false run') ||
    haystack.includes('judas') ||
    haystack.includes('mmsm') ||
    haystack.includes('liquidity fade near highs');
}

function isTimeWindowResearch(input: ResearchExtractorInput): boolean {
  const haystack = [
    input.sourceTitle,
    input.sessionContext,
    input.transcriptText,
    ...input.requestedConcepts,
  ].join(' ').toLowerCase();
  return haystack.includes('time-window liquidity delivery') ||
    haystack.includes('time window liquidity delivery') ||
    haystack.includes('time-based market windows') ||
    haystack.includes('10 handles / 40 ticks') ||
    haystack.includes('fvg / inefficiency as draw');
}

export function extractResearchBrief(input: ResearchExtractorInput): ResearchBrief {
  const falseRunResearch = isFalseRunResearch(input);
  const timeWindowResearch = isTimeWindowResearch(input);
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
    if (timeWindowResearch && lower.includes('model 1')) {
      return {
        target,
        comparison: 'partially_covered' as const,
        note: 'Time-window FVG/inefficiency plus liquidity draw may overlap with Model 1 components, but only current Model 1 gates can approve.',
      };
    }
    if (timeWindowResearch && lower.includes('turtle')) {
      return {
        target,
        comparison: 'partially_covered' as const,
        note: 'A true sweep/raid plus reclaim should be evaluated through existing Turtle Soup; time-window context cannot approve by itself.',
      };
    }
    if (falseRunResearch && lower.includes('turtle')) {
      return {
        target,
        comparison: 'partially_covered' as const,
        note: 'A true sweep/raid plus reclaim should be evaluated through existing Turtle Soup; false-run behavior without true sweep + reclaim remains research-only context.',
      };
    }
    if (lower.includes('model 1')) {
      return {
        target,
        comparison: 'partially_covered' as const,
        note: falseRunResearch
          ? 'Model 1 gates cannot be bypassed by MMSM/Judas Swing narrative or a false-run read.'
          : 'Model 1 already requires approved sweep/reclaim/displacement/MSS/FVG gates; the final-hour draw idea cannot bypass those gates.',
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

  const weeklyNewsletterSummary: ResearchBriefWeeklySummary = timeWindowResearch
    ? {
        researchTitle: 'Time-Window Liquidity Delivery Research',
        status: 'research_only',
        candidateName: 'Time-Window Liquidity Delivery Watchlist',
        primaryIdea: 'Study FVG/inefficiency delivery toward liquidity during defined market windows.',
        taxonomyNote: 'If Model 1 or Turtle Soup gates pass, classify through existing approved models; otherwise keep as advisory research.',
        recommendedNextStep: 'Collect 20-30 bridge-backed examples per window before any rule review.',
        ruleChange: 'none',
        approvalBoundarySummary: 'Research only: no rules, scanner changes, entries, stops, targets, alerts, or model promotion.',
        includeInWeeklyNewsletter: true,
      }
    : falseRunResearch
    ? {
        researchTitle: 'False-Run Liquidity Fade Near Highs Research',
        status: 'research_only',
        candidateName: 'False-Run Liquidity Fade Near Highs Watchlist',
        primaryIdea: 'Fade a run toward ATH or major buy-side liquidity when price fails to sustain and begins drawing toward sell-side liquidity.',
        taxonomyNote: 'If sweep + reclaim exists, evaluate through existing Turtle Soup; otherwise keep as advisory research.',
        recommendedNextStep: 'Collect 20-30 bridge-backed examples before any rule review.',
        ruleChange: 'none',
        approvalBoundarySummary: 'Research only: no rules, scanner changes, entries, stops, targets, alerts, or model promotion.',
        includeInWeeklyNewsletter: true,
      }
    : {
        researchTitle: 'ICT Final-Hour Liquidity Draw Research',
        status: 'research_only',
        candidateName: 'Final-Hour ICT-Style Liquidity Draw Watchlist',
        primaryIdea: 'Late-day draw toward clean buy-side liquidity during the 3:15-3:45 ET final-hour macro window.',
        recommendedNextStep: 'Keep as research note and collect 20-30 bridge-backed examples before any human rule review.',
        ruleChange: 'none',
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
      name: weeklyNewsletterSummary.candidateName,
      purpose: timeWindowResearch
        ? 'Identify research-only conditions where a defined time window, FVG/inefficiency, and draw on liquidity align, while still requiring current approved 6K rules before any trade can be considered.'
        : falseRunResearch
        ? 'Identify research-only bearish conditions where price runs toward ATH, high of day, or major buy-side liquidity, fails to sustain, then starts drawing toward sell-side liquidity.'
        : 'Identify late-day conditions where price forms a foothold and appears likely to draw toward clean buy-side liquidity during the 3:15-3:45 ET macro window.',
      status: 'research_candidate_only',
      executable: false,
      createsEntries: false,
      createsStops: false,
      createsTargets: false,
      createsOutcomeButtons: false,
      createsAutoAlerts: false,
    },
    candidateConditions: timeWindowResearch
      ? {
          contextConditions: [
            'Instrument: ES/MES first; NQ/MNQ later only after study.',
            'Time windows to study: London 3:00-4:00 NY, AM 10:00-11:00 NY, PM 2:00-3:00 NY.',
            'There must be a clear draw on liquidity.',
            'Larger-timeframe context must not strongly conflict.',
            'Minimum expected delivery framework should be at least 10 handles / 40 ticks for index futures, but this is not a trade target.',
          ],
          structureConditions: [
            'FVG or inefficiency forms or is repriced inside the time window.',
            'Market structure shift may be present.',
            'Bodies respect the FVG/inefficiency.',
            'Liquidity draw is identifiable before entry logic is considered.',
            'Price has room to move toward the draw without immediate major obstruction.',
          ],
          invalidationCautionConditions: [
            'No clear draw on liquidity.',
            'Larger-timeframe context conflicts.',
            'Price already reached the draw.',
            'FVG is not respected.',
            'Price is too extended to chase.',
            'Risk would be too wide under current approved rules.',
            'The condition does not satisfy current Model 1 or Turtle Soup gates.',
          ],
        }
      : falseRunResearch
      ? {
          contextConditions: [
            'Instrument: ES/MES first; NQ/MNQ later only after study.',
            'Price has recently run aggressively toward ATH, high of day, or major buy-side liquidity.',
            'Price fails to take or sustain above the high.',
            'Larger-timeframe context must not strongly conflict with bearish fade.',
            'There must be meaningful sell-side liquidity below.',
          ],
          structureConditions: [
            'Price trades into premium zone / suspension block / bearish FVG / IFVG / order block.',
            'Bodies remain below key wick midpoint / consequent encroachment / bearish premium boundary.',
            'Failed continuation higher appears after a buy-side run.',
            'Bearish displacement begins from the premium area.',
            'Sell-side imbalance or bearish FVG forms.',
            'Price starts drawing toward clean sell-side liquidity.',
          ],
          invalidationCautionConditions: [
            'ATH or buy-side liquidity is cleanly taken and sustained.',
            'Bodies close above premium wick midpoint / IFVG midpoint.',
            'Price spends too much time in the bearish zone without dropping.',
            'Larger timeframe strongly supports continuation higher.',
            'Price already reached sell-side target.',
            'Move is too extended to chase.',
            'Risk would be too wide under current approved rules.',
            'No true sweep + reclaim exists, meaning it cannot be treated as Turtle Soup.',
          ],
        }
      : {
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
    bridgeDataResearchPlan: timeWindowResearch
      ? [
          'Use local bridge data only.',
          'Replay completed bars only.',
          'Study the 3:00-4:00 NY, 10:00-11:00 NY, and 2:00-3:00 NY windows separately.',
          'Identify the draw on liquidity before classifying any setup.',
          'Identify FVG/inefficiency inside the window.',
          'Identify whether MSS occurred.',
          'Identify whether bodies respected the FVG.',
          'Determine whether current Model 1 or Turtle Soup gates actually passed.',
          'If approved gates do not pass, classify as advisory-only time-window research.',
          'Track 20-30 examples per window before any rule approval discussion.',
        ]
      : falseRunResearch
      ? [
          'Use local bridge data only.',
          'Replay completed bars only.',
          'Focus on sessions where price runs toward ATH / HOD / buy-side liquidity.',
          'Identify whether price actually swept/raided established liquidity.',
          'Identify whether price reclaimed after the sweep.',
          'If sweep + reclaim exists, classify through current Turtle Soup gates.',
          'If no sweep + reclaim exists, classify as advisory-only false-run / liquidity-fade context.',
          'Identify bearish FVG/SIBI/IFVG/order block/premium wick structures.',
          'Identify whether bodies stayed below the relevant midpoint.',
          'Identify downside sell-side liquidity target.',
          'Determine whether price displaced toward sell-side liquidity.',
          'Track whether the move was already too extended.',
          'Track 20-30 examples before any rule approval discussion.',
        ]
      : [
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
    advisoryDiscordDraft: timeWindowResearch
      ? 'Time-Window Liquidity Delivery candidate forming. Watch only - a draw on liquidity and FVG/inefficiency may be aligning inside a defined market window. Evaluate only through current 6K Model 1 or Turtle Soup rules. Do not chase.'
      : falseRunResearch
      ? 'False-Run Liquidity Fade Near Highs candidate forming. Watch only - price ran toward major buy-side liquidity / ATH and may be drawing back toward sell-side liquidity. If a true sweep + reclaim forms, evaluate through current Turtle Soup rules. Otherwise, keep this as research-only context. Do not chase.'
      : 'Final-Hour ICT-Style Liquidity Draw forming. Watch only - price may be drawing toward clean buy-side liquidity during the 3:15-3:45 macro. Wait for current approved 6K rules to confirm. Do not chase.',
    guardrails: timeWindowResearch
      ? [
          'This is not an approved executable model.',
          'Do not create entries, stops, T1/T2, or outcome buttons.',
          'Do not override Model 1 or Turtle Soup.',
          'Do not allow this to approve trades.',
          'Do not duplicate Model 1 or Turtle Soup under a time-window label.',
          'Do not use later target delivery to retroactively validate an invalid setup.',
          'Collect 20-30 examples per window first.',
        ]
      : falseRunResearch
      ? [
          'This is not an approved executable model.',
          'Do not create entries, stops, T1/T2, or outcome buttons.',
          'Do not override Model 1 or Turtle Soup.',
          'Do not allow this to approve trades.',
          'Do not duplicate Turtle Soup under a new Judas Swing or false-run label.',
          'Do not use later downside delivery to retroactively validate an invalid setup.',
          'Collect 20-30 examples first.',
        ]
      : [
          'This is not an approved executable model.',
          'Do not create entries, stops, T1/T2, or outcome buttons.',
          'Do not override Model 1 or Turtle Soup.',
          'Do not allow this to approve trades.',
          'Do not use later success to retroactively validate an invalid setup.',
          'Collect 20-30 examples first.',
        ],
    recommendedNextStep: timeWindowResearch
      ? 'Keep as research note only and create a future advisory-only bridge smoke-test prompt after enough examples are collected per window.'
      : falseRunResearch
      ? 'Keep as research note only and create a future advisory-only bridge smoke-test prompt after enough examples are collected.'
      : 'Keep as research note only and create a future advisory-only smoke test prompt after enough examples are collected.',
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
