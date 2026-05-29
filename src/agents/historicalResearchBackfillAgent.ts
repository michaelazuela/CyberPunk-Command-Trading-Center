export type ResearchBackfillConceptId =
  | 'time_window_liquidity_delivery'
  | 'false_run_liquidity_fade'
  | 'amd_range_model'
  | 'final_hour_liquidity_draw';

export type ResearchBackfillConceptSelector = 'all' | ResearchBackfillConceptId;

export type ResearchBackfillDirection = 'LONG' | 'SHORT' | 'NO TRADE';

export interface HistoricalResearchBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface ResearchBackfillEvent {
  concept: ResearchBackfillConceptId;
  date: string;
  time: string | null;
  direction: ResearchBackfillDirection;
  window?: string | null;
  summary: string;
  classification?: 'model1_overlap' | 'turtle_soup_overlap' | 'advisory_only';
  model1Overlap?: boolean;
  turtleSoupOverlap?: boolean;
  trueSweepReclaim?: boolean;
  drawIdentified?: boolean;
  fvgOrInefficiency?: boolean;
  cleanLiquidityDraw?: boolean;
  footholdPresent?: boolean;
  htfConflict?: boolean;
  accumulationZone?: boolean;
  manipulationLeg?: boolean;
  distributionFollowThrough?: boolean;
  reachedDrawAfterFact?: boolean;
  failedOrReversed?: boolean;
  warningPatterns?: string[];
  failureReasons?: string[];
}

export interface HistoricalResearchBackfillInput {
  from: string;
  to: string;
  instrument: 'MES' | 'MNQ' | string;
  selectedConcept?: ResearchBackfillConceptSelector;
  completedBars5m?: HistoricalResearchBar[];
  supabaseRecords?: unknown[];
  auditRecords?: unknown[];
  diagnosticReports?: unknown[];
  existingResearchNotes?: string[];
  dataWarnings?: string[];
  events?: ResearchBackfillEvent[];
  sourceCoverage?: HistoricalResearchSourceCoverage;
  barCoverage?: HistoricalResearchBarCoverage[];
  detectorAudit?: Partial<Record<ResearchBackfillConceptId, HistoricalResearchDetectorAudit>>;
}

export interface HistoricalResearchSourceCoverage {
  localBridgeDatesScanned: string[];
  supabaseRecordsScanned: number;
  auditJsonRecordsScanned: number;
  diagnosticReportsScanned: number;
  skippedDates: string[];
  missingDataDates: string[];
  perDateBarCoverage?: HistoricalResearchPerDateBarCoverage[];
}

export interface HistoricalResearchBarCoverage {
  timeframe: '5m' | '15m' | '60m' | '240m' | 'daily';
  rawBarsLoaded: number;
  barsFilteredIncomplete: number;
  completedBarsRemaining: number;
  invalidTimestampCount?: number;
  invalidOhlcCount?: number;
  requestFailures?: number;
}

export interface HistoricalResearchPerDateBarCoverage {
  date: string;
  window: string;
  timeframe: '5m' | '15m' | '60m' | '240m';
  from: string;
  to: string;
  rawBarsLoaded: number;
  barsFilteredIncomplete: number;
  completedBarsRemaining: number;
  invalidTimestampCount: number;
  invalidOhlcCount: number;
  requestFailed: boolean;
  errorMessage: string | null;
}

export interface HistoricalResearchDetectorAudit {
  conceptId: ResearchBackfillConceptId;
  datesEvaluated: string[];
  rawCandidatePrefilterCount: number;
  rejectedCount: number;
  topRejectionReasons: string[];
  finalCandidateCount: number;
}

export interface HistoricalResearchConceptReport {
  conceptId: ResearchBackfillConceptId;
  title: string;
  totalCandidates: number;
  datesReviewed: { from: string; to: string };
  dataGaps: string[];
  classificationCounts: {
    model1Overlap: number;
    turtleSoupOverlap: number;
    advisoryOnly: number;
  };
  approvedModelOverlaps: {
    model1: number;
    turtleSoup: number;
  };
  advisoryOnlyCount: number;
  commonReasons: string[];
  sampleEvents: Array<{
    date: string;
    time: string | null;
    direction: ResearchBackfillDirection;
    window: string | null;
    summary: string;
    classification: 'model1_overlap' | 'turtle_soup_overlap' | 'advisory_only';
  }>;
  sampleThreshold: {
    minimum: number;
    current: number;
    met: boolean;
  };
  metrics: Record<string, number | Record<string, number>>;
  recommendation: 'continue_collecting' | 'review_manually' | 'stop_tracking' | 'consider_future_advisory_smoke_test';
  ruleChangeRecommendation: 'none' | 'human_review_only';
}

export interface HistoricalResearchBackfillReport {
  reportType: 'historical_research_backfill';
  generatedAt: string;
  from: string;
  to: string;
  instrument: string;
  selectedConcept: ResearchBackfillConceptSelector;
  executiveSummary: string[];
  dataCoverage: {
    completed5mBars: number;
    sourceCoverage: HistoricalResearchSourceCoverage;
    barCoverage: HistoricalResearchBarCoverage[];
    supabaseRecords: number;
    auditRecords: number;
    diagnosticReports: number;
    existingResearchNotes: number;
    dataGaps: string[];
  };
  detectorAudit: HistoricalResearchDetectorAudit[];
  zeroCandidateExplanation: string[];
  conceptReports: HistoricalResearchConceptReport[];
  approvedModelOverlap: {
    model1: number;
    turtleSoup: number;
    total: number;
  };
  advisoryOnlyFindings: string[];
  repeatedFailureNoEntryReasons: string[];
  candidateConceptsWorthContinuedTracking: string[];
  candidateConceptsNotWorthContinuingYet: string[];
  humanReviewQueue: string[];
  doNotChangeYetItems: string[];
  recommendedNextSteps: string[];
  markdown: string;
  approvalBoundary: {
    researchBackfillApprovesTrade: false;
    researchBackfillChangesRules: false;
    researchBackfillCreatesEntry: false;
    researchBackfillCreatesTargets: false;
    researchBackfillOverridesScanner: false;
    researchBackfillPromotesModel: false;
    researchBackfillBuildsNewPlan: false;
    researchBackfillWritesRagMemory: false;
  };
}

const CONCEPT_TITLES: Record<ResearchBackfillConceptId, string> = {
  time_window_liquidity_delivery: 'Time-Window Liquidity Delivery',
  false_run_liquidity_fade: 'False-Run Liquidity Fade Near Highs',
  amd_range_model: 'Accumulation-Manipulation-Distribution Range Model',
  final_hour_liquidity_draw: 'Final-Hour Liquidity Draw',
};

const CONCEPT_ORDER: ResearchBackfillConceptId[] = [
  'time_window_liquidity_delivery',
  'false_run_liquidity_fade',
  'amd_range_model',
  'final_hour_liquidity_draw',
];

function classificationFor(event: ResearchBackfillEvent): 'model1_overlap' | 'turtle_soup_overlap' | 'advisory_only' {
  if (event.classification) return event.classification;
  if (event.model1Overlap) return 'model1_overlap';
  if (event.turtleSoupOverlap || event.trueSweepReclaim) return 'turtle_soup_overlap';
  return 'advisory_only';
}

function selectedConcepts(selector: ResearchBackfillConceptSelector): ResearchBackfillConceptId[] {
  return selector === 'all' ? CONCEPT_ORDER : [selector];
}

function topStrings(values: string[], limit = 5): string[] {
  const counts = new Map<string, number>();
  values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([value, count]) => `${value} (${count})`);
}

function increment(map: Record<string, number>, key: string | null | undefined): void {
  const normalized = key && key.trim() ? key : 'unspecified';
  map[normalized] = (map[normalized] || 0) + 1;
}

function buildMetrics(conceptId: ResearchBackfillConceptId, events: ResearchBackfillEvent[]): Record<string, number | Record<string, number>> {
  const countByWindow: Record<string, number> = {};
  const countByDirection: Record<string, number> = {};
  events.forEach((event) => {
    increment(countByWindow, event.window);
    increment(countByDirection, event.direction);
  });

  if (conceptId === 'time_window_liquidity_delivery') {
    return {
      countByWindow,
      countByDirection,
      countWithDrawIdentified: events.filter((event) => event.drawIdentified).length,
      countWithFvgOrInefficiency: events.filter((event) => event.fvgOrInefficiency).length,
      countWithModel1Overlap: events.filter((event) => event.model1Overlap).length,
      countWithTurtleSoupOverlap: events.filter((event) => event.turtleSoupOverlap || event.trueSweepReclaim).length,
      countAdvisoryOnly: events.filter((event) => classificationFor(event) === 'advisory_only').length,
    };
  }

  if (conceptId === 'false_run_liquidity_fade') {
    return {
      majorHighFalseRunCandidates: events.length,
      trueSweepReclaimCount: events.filter((event) => event.trueSweepReclaim).length,
      turtleSoupMappedCount: events.filter((event) => event.turtleSoupOverlap || event.trueSweepReclaim).length,
      advisoryOnlyCount: events.filter((event) => classificationFor(event) === 'advisory_only').length,
      reachedSellSideDrawAfterFactCount: events.filter((event) => event.reachedDrawAfterFact).length,
      failedOrReversedCount: events.filter((event) => event.failedOrReversed).length,
      countByDirection,
    };
  }

  if (conceptId === 'amd_range_model') {
    return {
      accumulationZoneCount: events.filter((event) => event.accumulationZone).length,
      manipulationLegCount: events.filter((event) => event.manipulationLeg).length,
      distributionFollowThroughCount: events.filter((event) => event.distributionFollowThrough).length,
      bullishCases: events.filter((event) => event.direction === 'LONG').length,
      bearishCases: events.filter((event) => event.direction === 'SHORT').length,
      countWithModel1Overlap: events.filter((event) => event.model1Overlap).length,
      countWithTurtleSoupOverlap: events.filter((event) => event.turtleSoupOverlap || event.trueSweepReclaim).length,
      countAdvisoryOnly: events.filter((event) => classificationFor(event) === 'advisory_only').length,
    };
  }

  return {
    finalHourCandidateCount: events.length,
    cleanLiquidityDrawCount: events.filter((event) => event.cleanLiquidityDraw || event.drawIdentified).length,
    footholdCount: events.filter((event) => event.footholdPresent || event.fvgOrInefficiency).length,
    htfConflictCount: events.filter((event) => event.htfConflict).length,
    advisoryOnlyCount: events.filter((event) => classificationFor(event) === 'advisory_only').length,
    currentApprovedModelOverlapCount: events.filter((event) => event.model1Overlap || event.turtleSoupOverlap || event.trueSweepReclaim).length,
    countByDirection,
  };
}

function buildConceptReport(
  conceptId: ResearchBackfillConceptId,
  input: HistoricalResearchBackfillInput,
  events: ResearchBackfillEvent[],
): HistoricalResearchConceptReport {
  const classifications = events.map(classificationFor);
  const reasons = events.flatMap((event) => [...(event.failureReasons || []), ...(event.warningPatterns || [])]);
  const model1Overlap = classifications.filter((value) => value === 'model1_overlap').length;
  const turtleSoupOverlap = classifications.filter((value) => value === 'turtle_soup_overlap').length;
  const advisoryOnly = classifications.filter((value) => value === 'advisory_only').length;
  const recommendation: HistoricalResearchConceptReport['recommendation'] =
    events.length >= 30
      ? 'review_manually'
      : events.length > 0
        ? 'continue_collecting'
        : 'consider_future_advisory_smoke_test';

  return {
    conceptId,
    title: CONCEPT_TITLES[conceptId],
    totalCandidates: events.length,
    datesReviewed: { from: input.from, to: input.to },
    dataGaps: input.dataWarnings || [],
    classificationCounts: {
      model1Overlap,
      turtleSoupOverlap,
      advisoryOnly,
    },
    approvedModelOverlaps: {
      model1: model1Overlap,
      turtleSoup: turtleSoupOverlap,
    },
    advisoryOnlyCount: advisoryOnly,
    commonReasons: topStrings(reasons),
    sampleEvents: events.slice(0, 8).map((event) => ({
      date: event.date,
      time: event.time,
      direction: event.direction,
      window: event.window || null,
      summary: event.summary,
      classification: classificationFor(event),
    })),
    sampleThreshold: {
      minimum: 20,
      current: events.length,
      met: events.length >= 20,
    },
    metrics: buildMetrics(conceptId, events),
    recommendation,
    ruleChangeRecommendation: 'none',
  };
}

function uniqueDatesFromBars(bars: HistoricalResearchBar[] | undefined): string[] {
  return [...new Set((bars || []).map((bar) => bar.time.slice(0, 10)).filter(Boolean))].sort();
}

function uniqueDatesFromEvents(events: ResearchBackfillEvent[]): string[] {
  return [...new Set(events.map((event) => event.date).filter((date) => date && date !== 'unknown'))].sort();
}

function defaultSourceCoverage(input: HistoricalResearchBackfillInput): HistoricalResearchSourceCoverage {
  const localBridgeDatesScanned = uniqueDatesFromBars(input.completedBars5m);
  return {
    localBridgeDatesScanned,
    supabaseRecordsScanned: (input.supabaseRecords || []).length,
    auditJsonRecordsScanned: (input.auditRecords || []).length,
    diagnosticReportsScanned: (input.diagnosticReports || []).length,
    skippedDates: [],
    missingDataDates: localBridgeDatesScanned.length ? [] : [input.from === input.to ? input.from : `${input.from}..${input.to}`],
  };
}

function defaultBarCoverage(input: HistoricalResearchBackfillInput): HistoricalResearchBarCoverage[] {
  return [{
    timeframe: '5m',
    rawBarsLoaded: (input.completedBars5m || []).length,
    barsFilteredIncomplete: 0,
    completedBarsRemaining: (input.completedBars5m || []).length,
  }];
}

function mergeDetectorAudit(
  input: HistoricalResearchBackfillInput,
  conceptId: ResearchBackfillConceptId,
  events: ResearchBackfillEvent[],
): HistoricalResearchDetectorAudit {
  const provided = input.detectorAudit?.[conceptId];
  const rejectionReasons = [
    ...(provided?.topRejectionReasons || []),
    ...events.flatMap((event) => event.failureReasons || []),
  ];
  return {
    conceptId,
    datesEvaluated: provided?.datesEvaluated?.length ? [...provided.datesEvaluated] : uniqueDatesFromEvents(events),
    rawCandidatePrefilterCount: provided?.rawCandidatePrefilterCount ?? events.length,
    rejectedCount: provided?.rejectedCount ?? 0,
    topRejectionReasons: topStrings(rejectionReasons),
    finalCandidateCount: events.length,
  };
}

function explainZeroCandidates(input: HistoricalResearchBackfillInput, detectorAudit: HistoricalResearchDetectorAudit[]): string[] {
  const reasons: string[] = [];
  const sourceCoverage = input.sourceCoverage || defaultSourceCoverage(input);
  const barCoverage = input.barCoverage || defaultBarCoverage(input);
  const completedBars = barCoverage.reduce((sum, item) => sum + item.completedBarsRemaining, 0);
  const rawPrefilter = detectorAudit.reduce((sum, item) => sum + item.rawCandidatePrefilterCount, 0);
  const auditRecords = sourceCoverage.auditJsonRecordsScanned;
  if (completedBars === 0) reasons.push('No completed bridge bars were available for detector evaluation.');
  if (auditRecords > 0 && rawPrefilter === 0) {
    reasons.push(`${auditRecords} audit JSON record(s) were scanned as history, but none contained a research concept or diagnostic classification that the backfill currently maps into candidate events.`);
  }
  if ((input.diagnosticReports || []).length === 0) reasons.push('No diagnostic replay reports were available to map approved/advisory classifications.');
  if (rawPrefilter === 0 && completedBars > 0) reasons.push('Completed bars loaded, but concept detector prefilters did not find qualifying ranges in the configured windows.');
  if (detectorAudit.some((item) => item.rejectedCount > 0)) reasons.push('Detector prefilters found reviewed records/bars, but all were rejected by research-only filters; see detector audit rejection reasons.');
  if (!reasons.length) reasons.push('No research events were produced; detector implementation may need deeper concept-specific mapping.');
  return reasons;
}

function listOrNone(values: string[]): string[] {
  return values.length ? values : ['none'];
}

function formatMetrics(metrics: Record<string, number | Record<string, number>>): string[] {
  return Object.entries(metrics).map(([key, value]) => {
    if (typeof value === 'number') return `- ${key}: ${value}`;
    const nested = Object.entries(value).map(([nestedKey, count]) => `${nestedKey}=${count}`).join(', ');
    return `- ${key}: ${nested || 'none'}`;
  });
}

function renderConceptMarkdown(index: number, report: HistoricalResearchConceptReport): string {
  const conceptNumber = index - 2;
  return [
    `## ${index}. Concept ${conceptNumber} - ${report.title}`,
    `- Total candidates: ${report.totalCandidates}`,
    `- Dates reviewed: ${report.datesReviewed.from} to ${report.datesReviewed.to}`,
    `- Data gaps: ${listOrNone(report.dataGaps).join(' | ')}`,
    `- Model 1 overlaps: ${report.approvedModelOverlaps.model1}`,
    `- Turtle Soup overlaps: ${report.approvedModelOverlaps.turtleSoup}`,
    `- Advisory-only: ${report.advisoryOnlyCount}`,
    `- 20-30 sample threshold met: ${report.sampleThreshold.met ? 'yes' : 'no'} (${report.sampleThreshold.current}/${report.sampleThreshold.minimum})`,
    `- Recommendation: ${report.recommendation}`,
    `- Rule change recommendation: ${report.ruleChangeRecommendation}`,
    '',
    'Metrics:',
    ...formatMetrics(report.metrics),
    '',
    'Common reasons:',
    ...listOrNone(report.commonReasons).map((reason) => `- ${reason}`),
    '',
    'Sample events:',
    ...(report.sampleEvents.length
      ? report.sampleEvents.map((event) => `- ${event.date} ${event.time || ''} ${event.direction} ${event.window || 'unspecified'}: ${event.summary} (${event.classification})`)
      : ['- none']),
  ].join('\n');
}

export function renderHistoricalResearchBackfillMarkdown(report: Omit<HistoricalResearchBackfillReport, 'markdown'>): string {
  const conceptMap = new Map(report.conceptReports.map((concept) => [concept.conceptId, concept]));
  return [
    `# Historical Research Backfill - ${report.instrument}`,
    '',
    '## 1. Executive Summary',
    ...report.executiveSummary.map((line) => `- ${line}`),
    '',
    '## 2. Data Coverage',
    `- Completed 5M bars: ${report.dataCoverage.completed5mBars}`,
    `- Local bridge dates scanned: ${report.dataCoverage.sourceCoverage.localBridgeDatesScanned.join(', ') || 'none'}`,
    `- Supabase records: ${report.dataCoverage.supabaseRecords}`,
    `- Audit records: ${report.dataCoverage.auditRecords}`,
    `- Diagnostic reports: ${report.dataCoverage.diagnosticReports}`,
    `- Existing research notes: ${report.dataCoverage.existingResearchNotes}`,
    `- Skipped dates: ${report.dataCoverage.sourceCoverage.skippedDates.join(', ') || 'none'}`,
    `- Missing-data dates: ${report.dataCoverage.sourceCoverage.missingDataDates.join(', ') || 'none'}`,
    `- Data gaps: ${listOrNone(report.dataCoverage.dataGaps).join(' | ')}`,
    '',
    'Bar coverage:',
    ...report.dataCoverage.barCoverage.map((item) => `- ${item.timeframe}: raw=${item.rawBarsLoaded}, incomplete filtered=${item.barsFilteredIncomplete}, completed=${item.completedBarsRemaining}, invalid timestamps=${item.invalidTimestampCount || 0}, invalid OHLC=${item.invalidOhlcCount || 0}, request failures=${item.requestFailures || 0}`),
    '',
    'Per-date bridge coverage:',
    ...(report.dataCoverage.sourceCoverage.perDateBarCoverage?.length
      ? [
          ...report.dataCoverage.sourceCoverage.perDateBarCoverage.slice(0, 40).map((item) =>
            `- ${item.date} ${item.window} ${item.timeframe}: raw=${item.rawBarsLoaded}, completed=${item.completedBarsRemaining}, incomplete filtered=${item.barsFilteredIncomplete}, failed=${item.requestFailed ? 'yes' : 'no'}${item.errorMessage ? `, error=${item.errorMessage}` : ''}`
          ),
          ...(report.dataCoverage.sourceCoverage.perDateBarCoverage.length > 40
            ? [`- ...${report.dataCoverage.sourceCoverage.perDateBarCoverage.length - 40} additional per-date coverage rows omitted from markdown; see JSON report.`]
            : []),
        ]
      : ['- none']),
    '',
    'Zero-candidate explanation:',
    ...listOrNone(report.zeroCandidateExplanation).map((line) => `- ${line}`),
    '',
    'Detector audit:',
    ...report.detectorAudit.map((item) => `- ${CONCEPT_TITLES[item.conceptId]}: dates=${item.datesEvaluated.length}, raw prefilter=${item.rawCandidatePrefilterCount}, rejected=${item.rejectedCount}, final=${item.finalCandidateCount}, top rejection=${item.topRejectionReasons.join(' | ') || 'none'}`),
    '',
    renderConceptMarkdown(3, conceptMap.get('time_window_liquidity_delivery') || emptyConcept('time_window_liquidity_delivery', report.from, report.to)),
    '',
    renderConceptMarkdown(4, conceptMap.get('false_run_liquidity_fade') || emptyConcept('false_run_liquidity_fade', report.from, report.to)),
    '',
    renderConceptMarkdown(5, conceptMap.get('amd_range_model') || emptyConcept('amd_range_model', report.from, report.to)),
    '',
    renderConceptMarkdown(6, conceptMap.get('final_hour_liquidity_draw') || emptyConcept('final_hour_liquidity_draw', report.from, report.to)),
    '',
    '## 7. Approved Model Overlap',
    `- Model 1: ${report.approvedModelOverlap.model1}`,
    `- Turtle Soup: ${report.approvedModelOverlap.turtleSoup}`,
    `- Total approved-model overlaps: ${report.approvedModelOverlap.total}`,
    '- Overlaps are historical classification context only. They do not approve new trades.',
    '',
    '## 8. Advisory-Only Findings',
    ...listOrNone(report.advisoryOnlyFindings).map((line) => `- ${line}`),
    '',
    '## 9. Repeated Failure / No-Entry Reasons',
    ...listOrNone(report.repeatedFailureNoEntryReasons).map((line) => `- ${line}`),
    '',
    '## 10. Candidate Concepts Worth Continued Tracking',
    ...listOrNone(report.candidateConceptsWorthContinuedTracking).map((line) => `- ${line}`),
    '',
    '## 11. Candidate Concepts Not Worth Continuing Yet',
    ...listOrNone(report.candidateConceptsNotWorthContinuingYet).map((line) => `- ${line}`),
    '',
    '## 12. Human Review Queue',
    ...listOrNone(report.humanReviewQueue).map((line) => `- ${line}`),
    '',
    '## 13. Do-Not-Change-Yet Items',
    ...report.doNotChangeYetItems.map((line) => `- ${line}`),
    '',
    '## 14. Recommended Next Steps',
    ...report.recommendedNextSteps.map((line) => `- ${line}`),
    '',
    '## 15. Approval Boundary',
    ...Object.entries(report.approvalBoundary).map(([key, value]) => `- ${key}: ${String(value)}`),
  ].join('\n');
}

function emptyConcept(conceptId: ResearchBackfillConceptId, from: string, to: string): HistoricalResearchConceptReport {
  return buildConceptReport(conceptId, { from, to, instrument: 'MES', dataWarnings: [] }, []);
}

export function runHistoricalResearchBackfill(input: HistoricalResearchBackfillInput): HistoricalResearchBackfillReport {
  const selectedConcept = input.selectedConcept || 'all';
  const concepts = selectedConcepts(selectedConcept);
  const events = [...(input.events || [])].filter((event) => concepts.includes(event.concept));
  const detectorAudit = concepts.map((conceptId) => mergeDetectorAudit(
    input,
    conceptId,
    events.filter((event) => event.concept === conceptId),
  ));
  const conceptReports = concepts.map((conceptId) => buildConceptReport(
    conceptId,
    input,
    events.filter((event) => event.concept === conceptId),
  ));
  const model1 = conceptReports.reduce((sum, concept) => sum + concept.approvedModelOverlaps.model1, 0);
  const turtleSoup = conceptReports.reduce((sum, concept) => sum + concept.approvedModelOverlaps.turtleSoup, 0);
  const advisoryOnlyTotal = conceptReports.reduce((sum, concept) => sum + concept.advisoryOnlyCount, 0);
  const zeroCandidateExplanation = events.length === 0 ? explainZeroCandidates(input, detectorAudit) : [];
  const repeatedReasons = topStrings(events.flatMap((event) => event.failureReasons || []));
  const continuedTracking = conceptReports
    .filter((concept) => concept.totalCandidates > 0 || concept.recommendation === 'consider_future_advisory_smoke_test')
    .map((concept) => `${concept.title}: ${concept.recommendation}; sample threshold ${concept.sampleThreshold.current}/${concept.sampleThreshold.minimum}.`);
  const reportWithoutMarkdown: Omit<HistoricalResearchBackfillReport, 'markdown'> = {
    reportType: 'historical_research_backfill',
    generatedAt: new Date().toISOString(),
    from: input.from,
    to: input.to,
    instrument: input.instrument,
    selectedConcept,
    executiveSummary: [
      `Historical research scan covered ${input.from} to ${input.to} for ${input.instrument}.`,
      `${events.length} research candidate event(s) were classified from completed bars and existing records.`,
      `${advisoryOnlyTotal} event(s) remain advisory-only. No executable model promotion is recommended.`,
    ],
    dataCoverage: {
      completed5mBars: (input.completedBars5m || []).length,
      sourceCoverage: input.sourceCoverage || defaultSourceCoverage(input),
      barCoverage: input.barCoverage || defaultBarCoverage(input),
      supabaseRecords: (input.supabaseRecords || []).length,
      auditRecords: (input.auditRecords || []).length,
      diagnosticReports: (input.diagnosticReports || []).length,
      existingResearchNotes: (input.existingResearchNotes || []).length,
      dataGaps: [...(input.dataWarnings || [])],
    },
    detectorAudit,
    zeroCandidateExplanation,
    conceptReports,
    approvedModelOverlap: {
      model1,
      turtleSoup,
      total: model1 + turtleSoup,
    },
    advisoryOnlyFindings: conceptReports
      .filter((concept) => concept.advisoryOnlyCount > 0)
      .map((concept) => `${concept.title}: ${concept.advisoryOnlyCount} advisory-only event(s).`),
    repeatedFailureNoEntryReasons: repeatedReasons,
    candidateConceptsWorthContinuedTracking: continuedTracking,
    candidateConceptsNotWorthContinuingYet: conceptReports
      .filter((concept) => concept.totalCandidates === 0)
      .map((concept) => `${concept.title}: no samples in the selected data set yet.`),
    humanReviewQueue: conceptReports
      .filter((concept) => concept.sampleThreshold.met)
      .map((concept) => `${concept.title}: sample threshold met; review manually before any rule discussion.`),
    doNotChangeYetItems: [
      'Do not change trading rules from this backfill.',
      'Do not add executable research models.',
      'Do not add entries, stops, targets, outcome buttons, or RAG writes from research-only classifications.',
      'Do not let later movement retroactively approve invalid setup gates.',
    ],
    recommendedNextSteps: [
      'Continue collecting completed-bar examples until each concept reaches 20-30 reviewed samples.',
      'Use Model 1 and Turtle Soup only when their existing approved gates independently pass.',
      'Keep research concepts advisory-only unless a separate human approval process changes the rules.',
    ],
    approvalBoundary: {
      researchBackfillApprovesTrade: false,
      researchBackfillChangesRules: false,
      researchBackfillCreatesEntry: false,
      researchBackfillCreatesTargets: false,
      researchBackfillOverridesScanner: false,
      researchBackfillPromotesModel: false,
      researchBackfillBuildsNewPlan: false,
      researchBackfillWritesRagMemory: false,
    },
  };
  return {
    ...reportWithoutMarkdown,
    markdown: renderHistoricalResearchBackfillMarkdown(reportWithoutMarkdown),
  };
}
