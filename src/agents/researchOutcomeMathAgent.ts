import type {
  HistoricalResearchBackfillReport,
  ResearchBackfillConceptId,
  ResearchBackfillDirection,
  ResearchCandidateEvent,
} from './historicalResearchBackfillAgent';
import {
  calculateResearchHypotheticalOutcomeOverlay,
  type ResearchHypotheticalOutcomeLabel,
  type ResearchHypotheticalOutcomeOverlay,
} from './researchHypotheticalOutcomeOverlayAgent';
import type { ResearchSampleReviewPack, ResearchReviewSample } from './researchSampleReviewAgent';

export interface ResearchOutcomeBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  advisoryOnly?: true;
  source?: string;
}

export interface ResearchOutcomeThresholds {
  thresholdOnePoints: number;
  thresholdTwoPoints: number;
  adverseThresholdPoints: number;
  observationWindowBars: number;
}

export interface ResearchOutcomeCandidate {
  candidateId: string;
  date: string;
  time: string | null;
  instrument: string;
  concept: string;
  direction: ResearchBackfillDirection;
  window: string | null;
  classification: 'model1_overlap' | 'HISTORICAL_REVERSAL_overlap' | 'advisory_only';
  summary: string;
  advisoryOnly: true;
  sourcePath?: string;
  futureBars?: ResearchOutcomeBar[];
  postSignalBars?: ResearchOutcomeBar[];
  observationWindowBars?: ResearchOutcomeBar[];
  referencePrice?: number | null;
  dataQualityNotes?: string[];
}

export type FirstMeaningfulMove = 'favorable' | 'adverse' | 'mixed' | 'insufficient_data';
export type OutcomeClassification =
  | 'favorable_continuation'
  | 'favorable_then_failed'
  | 'adverse_first'
  | 'neutral'
  | 'insufficient_data';

export interface ResearchCandidateOutcome {
  candidateId: string;
  date: string;
  time: string | null;
  instrument: string;
  concept: string;
  direction: ResearchBackfillDirection;
  window: string | null;
  classification: 'model1_overlap' | 'HISTORICAL_REVERSAL_overlap' | 'advisory_only';
  advisoryOnly: true;
  observationWindowBars: number;
  observationWindowMinutes: number;
  referencePrice: number | null;
  maxFavorableExcursionPoints: number | null;
  maxAdverseExcursionPoints: number | null;
  maxFavorableExcursionTicks: number | null;
  maxAdverseExcursionTicks: number | null;
  timeToMaxFavorableBars: number | null;
  timeToMaxAdverseBars: number | null;
  timeToMaxFavorableMinutes: number | null;
  timeToMaxAdverseMinutes: number | null;
  thresholdOnePoints: number;
  thresholdTwoPoints: number;
  thresholdOneTouched: boolean | null;
  thresholdTwoTouched: boolean | null;
  adverseThresholdPoints: number;
  adverseThresholdTouched: boolean | null;
  firstMeaningfulMove: FirstMeaningfulMove;
  outcomeClassification: OutcomeClassification;
  hypotheticalOutcomeOverlay: ResearchHypotheticalOutcomeOverlay;
  dataQualityNotes: string[];
}

export interface ResearchHypotheticalOverlaySummary {
  favorableContinuationCount: number;
  favorableContinuationRate: number | null;
  partialFavorableCount: number;
  partialFavorableRate: number | null;
  adverseFirstCount: number;
  adverseFirstRate: number | null;
  neutralNoResolutionCount: number;
  neutralNoResolutionRate: number | null;
  ambiguousSameBarCount: number;
  ambiguousSameBarRate: number | null;
  insufficientDataCount: number;
  insufficientDataRate: number | null;
}

export interface ResearchOutcomeMathReport {
  reportType: 'research_outcome_math';
  generatedAt: string;
  sourcePath: string;
  instrument: string;
  advisoryOnly: true;
  executionApproved: false;
  thresholds: ResearchOutcomeThresholds;
  summary: {
    totalCandidates: number;
    evaluatedCandidates: number;
    insufficientDataCandidates: number;
    thresholdOneTouchRate: number | null;
    thresholdTwoTouchRate: number | null;
    adverseThresholdTouchRate: number | null;
    favorableFirstRate: number | null;
    adverseFirstRate: number | null;
    hypotheticalOverlay: ResearchHypotheticalOverlaySummary;
  };
  conceptSummaries: Array<{
    concept: string;
    totalCandidates: number;
    evaluatedCandidates: number;
    thresholdOneTouchRate: number | null;
    thresholdTwoTouchRate: number | null;
    adverseThresholdTouchRate: number | null;
    favorableFirstRate: number | null;
    adverseFirstRate: number | null;
    medianMfePoints: number | null;
    medianMaePoints: number | null;
    hypotheticalOverlay: ResearchHypotheticalOverlaySummary;
    advisoryOnly: true;
  }>;
  candidateOutcomes: ResearchCandidateOutcome[];
  markdown: string;
  approvalBoundary: {
    outcomeMathApprovesTrade: false;
    outcomeMathChangesRules: false;
    outcomeMathCreatesEntry: false;
    outcomeMathCreatesTargets: false;
    outcomeMathPromotesModel: false;
  };
}

export interface ResearchOutcomeMathInput {
  sourcePath: string;
  instrument: string;
  candidates: ResearchOutcomeCandidate[];
  bars5m?: ResearchOutcomeBar[];
  thresholds?: Partial<ResearchOutcomeThresholds>;
  generatedAt?: string;
}

const DEFAULT_THRESHOLDS: ResearchOutcomeThresholds = {
  thresholdOnePoints: 4,
  thresholdTwoPoints: 8,
  adverseThresholdPoints: 4,
  observationWindowBars: 12,
};

const TICKS_PER_POINT: Record<string, number> = {
  MES: 4,
  MNQ: 4,
};

const FORBIDDEN_EXECUTABLE_KEYS = new Set([
  'entry',
  'stop',
  'stopLoss',
  'target',
  'targets',
  'T1',
  'T2',
  't1',
  't2',
  'riskReward',
  'canExecute',
  'orderInstructions',
  'alerts',
  'outcomeButtons',
  'ragPayload',
  'journalPayload',
]);

function normalizeThresholds(input?: Partial<ResearchOutcomeThresholds>): ResearchOutcomeThresholds {
  return {
    thresholdOnePoints: finitePositive(input?.thresholdOnePoints) ?? DEFAULT_THRESHOLDS.thresholdOnePoints,
    thresholdTwoPoints: finitePositive(input?.thresholdTwoPoints) ?? DEFAULT_THRESHOLDS.thresholdTwoPoints,
    adverseThresholdPoints: finitePositive(input?.adverseThresholdPoints) ?? DEFAULT_THRESHOLDS.adverseThresholdPoints,
    observationWindowBars: Math.max(1, Math.trunc(finitePositive(input?.observationWindowBars) ?? DEFAULT_THRESHOLDS.observationWindowBars)),
  };
}

function finitePositive(value: number | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function candidateTimestamp(candidate: ResearchOutcomeCandidate): string | null {
  if (!candidate.date || !candidate.time) return null;
  return `${candidate.date}T${candidate.time.length === 5 ? `${candidate.time}:00` : candidate.time}`;
}

function validBar(bar: ResearchOutcomeBar): boolean {
  return Boolean(
    bar.time &&
    [bar.open, bar.high, bar.low, bar.close].every((value) => typeof value === 'number' && Number.isFinite(value)) &&
    bar.high >= Math.max(bar.open, bar.close) &&
    bar.low <= Math.min(bar.open, bar.close),
  );
}

function sortedBars(bars: ResearchOutcomeBar[]): ResearchOutcomeBar[] {
  return bars.filter(validBar).sort((a, b) => a.time.localeCompare(b.time));
}

function findReferenceAndFutureBars(candidate: ResearchOutcomeCandidate, sourceBars: ResearchOutcomeBar[], thresholds: ResearchOutcomeThresholds): {
  referenceBar: ResearchOutcomeBar | null;
  futureBars: ResearchOutcomeBar[];
  notes: string[];
} {
  const notes: string[] = [];
  const candidateLevelBars = sortedBars(candidate.postSignalBars || candidate.observationWindowBars || candidate.futureBars || []);
  if (candidateLevelBars.length && typeof candidate.referencePrice === 'number' && Number.isFinite(candidate.referencePrice)) {
    const futureBars = candidateLevelBars.slice(0, thresholds.observationWindowBars);
    if (futureBars.length < thresholds.observationWindowBars) {
      notes.push(`Used candidate-level post-signal observation window with ${futureBars.length} bar(s), shorter than the configured ${thresholds.observationWindowBars}-bar window.`);
    } else {
      notes.push('Used candidate-level post-signal observation window from the source JSON.');
    }
    return {
      referenceBar: {
        time: candidateTimestamp(candidate) || futureBars[0].time,
        open: candidate.referencePrice,
        high: candidate.referencePrice,
        low: candidate.referencePrice,
        close: candidate.referencePrice,
      },
      futureBars,
      notes,
    };
  }
  const candidateTime = candidateTimestamp(candidate);
  if (!candidateTime) {
    return { referenceBar: null, futureBars: [], notes: ['Candidate is missing a date/time, so outcome math cannot establish a neutral reference bar.'] };
  }
  const bars = sortedBars(candidateLevelBars.length ? candidateLevelBars : sourceBars);
  if (!bars.length) {
    return { referenceBar: null, futureBars: [], notes: ['No saved future 5M bars were available in the source JSON; no live or bridge data was requested.'] };
  }
  const referenceIndex = bars.findIndex((bar) => bar.time >= candidateTime);
  if (referenceIndex < 0) {
    return { referenceBar: null, futureBars: [], notes: ['No saved bar was found at or after the candidate timestamp.'] };
  }
  const futureBars = bars.slice(referenceIndex + 1, referenceIndex + 1 + thresholds.observationWindowBars);
  if (!futureBars.length) notes.push('No future bars were available after the reference bar.');
  if (futureBars.length < thresholds.observationWindowBars) {
    notes.push(`Only ${futureBars.length} future bar(s) were available for a ${thresholds.observationWindowBars}-bar observation window.`);
  }
  return { referenceBar: bars[referenceIndex], futureBars, notes };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function pointsToTicks(points: number | null, instrument: string): number | null {
  if (points === null) return null;
  return Math.round(points * (TICKS_PER_POINT[instrument] || 4));
}

function firstTouchIndex(values: number[], threshold: number): number | null {
  const index = values.findIndex((value) => value >= threshold);
  return index >= 0 ? index : null;
}

function classifyOutcome(
  favorableIndex: number | null,
  adverseIndex: number | null,
  thresholdTwoTouched: boolean,
): { firstMeaningfulMove: FirstMeaningfulMove; outcomeClassification: OutcomeClassification } {
  if (favorableIndex === null && adverseIndex === null) {
    return { firstMeaningfulMove: 'mixed', outcomeClassification: 'neutral' };
  }
  if (favorableIndex !== null && adverseIndex !== null && favorableIndex === adverseIndex) {
    return { firstMeaningfulMove: 'mixed', outcomeClassification: 'neutral' };
  }
  if (adverseIndex !== null && (favorableIndex === null || adverseIndex < favorableIndex)) {
    return { firstMeaningfulMove: 'adverse', outcomeClassification: 'adverse_first' };
  }
  if (favorableIndex !== null && adverseIndex !== null && favorableIndex < adverseIndex) {
    return { firstMeaningfulMove: 'favorable', outcomeClassification: 'favorable_then_failed' };
  }
  return {
    firstMeaningfulMove: 'favorable',
    outcomeClassification: thresholdTwoTouched ? 'favorable_continuation' : 'neutral',
  };
}

export function calculateResearchCandidateOutcome(
  candidate: ResearchOutcomeCandidate,
  sourceBars: ResearchOutcomeBar[],
  thresholdInput?: Partial<ResearchOutcomeThresholds>,
): ResearchCandidateOutcome {
  const thresholds = normalizeThresholds(thresholdInput);
  const baseNotes = [...(candidate.dataQualityNotes || [])];
  const observationWindowMinutes = thresholds.observationWindowBars * 5;
  const insufficient = (notes: string[]): ResearchCandidateOutcome => ({
    candidateId: candidate.candidateId,
    date: candidate.date,
    time: candidate.time,
    instrument: candidate.instrument,
    concept: candidate.concept,
    direction: candidate.direction,
    window: candidate.window,
    classification: candidate.classification,
    advisoryOnly: true,
    observationWindowBars: thresholds.observationWindowBars,
    observationWindowMinutes,
    referencePrice: null,
    maxFavorableExcursionPoints: null,
    maxAdverseExcursionPoints: null,
    maxFavorableExcursionTicks: null,
    maxAdverseExcursionTicks: null,
    timeToMaxFavorableBars: null,
    timeToMaxAdverseBars: null,
    timeToMaxFavorableMinutes: null,
    timeToMaxAdverseMinutes: null,
    thresholdOnePoints: thresholds.thresholdOnePoints,
    thresholdTwoPoints: thresholds.thresholdTwoPoints,
    thresholdOneTouched: null,
    thresholdTwoTouched: null,
    adverseThresholdPoints: thresholds.adverseThresholdPoints,
    adverseThresholdTouched: null,
    firstMeaningfulMove: 'insufficient_data',
    outcomeClassification: 'insufficient_data',
    hypotheticalOutcomeOverlay: calculateResearchHypotheticalOutcomeOverlay({
      direction: candidate.direction,
      hypotheticalReferencePrice: null,
      postSignalBars: [],
      thresholds,
      notes: [...baseNotes, ...notes],
    }),
    dataQualityNotes: [...baseNotes, ...notes],
  });

  if (candidate.direction !== 'LONG' && candidate.direction !== 'SHORT') {
    return insufficient(['Candidate direction is missing or not LONG/SHORT.']);
  }
  const { referenceBar, futureBars, notes } = findReferenceAndFutureBars(candidate, sourceBars, thresholds);
  if (!referenceBar || !futureBars.length) return insufficient(notes);

  const referencePrice = referenceBar.close;
  const hypotheticalOutcomeOverlay = calculateResearchHypotheticalOutcomeOverlay({
    direction: candidate.direction,
    hypotheticalReferencePrice: referencePrice,
    postSignalBars: futureBars,
    thresholds,
    notes: [...baseNotes, ...notes],
  });
  const favorableByBar = futureBars.map((bar) =>
    candidate.direction === 'LONG' ? bar.high - referencePrice : referencePrice - bar.low
  ).map((value) => Math.max(0, value));
  const adverseByBar = futureBars.map((bar) =>
    candidate.direction === 'LONG' ? referencePrice - bar.low : bar.high - referencePrice
  ).map((value) => Math.max(0, value));
  const maxFavorable = Math.max(...favorableByBar);
  const maxAdverse = Math.max(...adverseByBar);
  const maxFavorableIndex = favorableByBar.findIndex((value) => value === maxFavorable);
  const maxAdverseIndex = adverseByBar.findIndex((value) => value === maxAdverse);
  const thresholdOneIndex = firstTouchIndex(favorableByBar, thresholds.thresholdOnePoints);
  const thresholdTwoIndex = firstTouchIndex(favorableByBar, thresholds.thresholdTwoPoints);
  const adverseIndex = firstTouchIndex(adverseByBar, thresholds.adverseThresholdPoints);
  const thresholdTwoTouched = thresholdTwoIndex !== null;
  const classification = classifyOutcome(thresholdOneIndex, adverseIndex, thresholdTwoTouched);

  return {
    candidateId: candidate.candidateId,
    date: candidate.date,
    time: candidate.time,
    instrument: candidate.instrument,
    concept: candidate.concept,
    direction: candidate.direction,
    window: candidate.window,
    classification: candidate.classification,
    advisoryOnly: true,
    observationWindowBars: thresholds.observationWindowBars,
    observationWindowMinutes,
    referencePrice: round(referencePrice),
    maxFavorableExcursionPoints: round(maxFavorable),
    maxAdverseExcursionPoints: round(maxAdverse),
    maxFavorableExcursionTicks: pointsToTicks(maxFavorable, candidate.instrument),
    maxAdverseExcursionTicks: pointsToTicks(maxAdverse, candidate.instrument),
    timeToMaxFavorableBars: maxFavorableIndex + 1,
    timeToMaxAdverseBars: maxAdverseIndex + 1,
    timeToMaxFavorableMinutes: (maxFavorableIndex + 1) * 5,
    timeToMaxAdverseMinutes: (maxAdverseIndex + 1) * 5,
    thresholdOnePoints: thresholds.thresholdOnePoints,
    thresholdTwoPoints: thresholds.thresholdTwoPoints,
    thresholdOneTouched: thresholdOneIndex !== null,
    thresholdTwoTouched,
    adverseThresholdPoints: thresholds.adverseThresholdPoints,
    adverseThresholdTouched: adverseIndex !== null,
    firstMeaningfulMove: classification.firstMeaningfulMove,
    outcomeClassification: classification.outcomeClassification,
    hypotheticalOutcomeOverlay,
    dataQualityNotes: [...baseNotes, ...notes],
  };
}

function rate(outcomes: ResearchCandidateOutcome[], predicate: (outcome: ResearchCandidateOutcome) => boolean): number | null {
  const evaluated = outcomes.filter((outcome) => outcome.outcomeClassification !== 'insufficient_data');
  if (!evaluated.length) return null;
  return round(evaluated.filter(predicate).length / evaluated.length);
}

function median(values: number[]): number | null {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? round(sorted[mid]) : round((sorted[mid - 1] + sorted[mid]) / 2);
}

function summarizeOutcomes(outcomes: ResearchCandidateOutcome[]) {
  return {
    totalCandidates: outcomes.length,
    evaluatedCandidates: outcomes.filter((outcome) => outcome.outcomeClassification !== 'insufficient_data').length,
    insufficientDataCandidates: outcomes.filter((outcome) => outcome.outcomeClassification === 'insufficient_data').length,
    thresholdOneTouchRate: rate(outcomes, (outcome) => outcome.thresholdOneTouched === true),
    thresholdTwoTouchRate: rate(outcomes, (outcome) => outcome.thresholdTwoTouched === true),
    adverseThresholdTouchRate: rate(outcomes, (outcome) => outcome.adverseThresholdTouched === true),
    favorableFirstRate: rate(outcomes, (outcome) => outcome.firstMeaningfulMove === 'favorable'),
    adverseFirstRate: rate(outcomes, (outcome) => outcome.firstMeaningfulMove === 'adverse'),
    hypotheticalOverlay: summarizeHypotheticalOverlays(outcomes),
  };
}

function overlayRate(outcomes: ResearchCandidateOutcome[], label: ResearchHypotheticalOutcomeLabel): number | null {
  if (!outcomes.length) return null;
  return round(outcomes.filter((outcome) => outcome.hypotheticalOutcomeOverlay.hypotheticalOutcomeLabel === label).length / outcomes.length);
}

function summarizeHypotheticalOverlays(outcomes: ResearchCandidateOutcome[]): ResearchHypotheticalOverlaySummary {
  return {
    favorableContinuationCount: outcomes.filter((outcome) => outcome.hypotheticalOutcomeOverlay.hypotheticalOutcomeLabel === 'favorable_continuation').length,
    favorableContinuationRate: overlayRate(outcomes, 'favorable_continuation'),
    partialFavorableCount: outcomes.filter((outcome) => outcome.hypotheticalOutcomeOverlay.hypotheticalOutcomeLabel === 'partial_favorable').length,
    partialFavorableRate: overlayRate(outcomes, 'partial_favorable'),
    adverseFirstCount: outcomes.filter((outcome) => outcome.hypotheticalOutcomeOverlay.hypotheticalOutcomeLabel === 'adverse_first').length,
    adverseFirstRate: overlayRate(outcomes, 'adverse_first'),
    neutralNoResolutionCount: outcomes.filter((outcome) => outcome.hypotheticalOutcomeOverlay.hypotheticalOutcomeLabel === 'neutral_no_resolution').length,
    neutralNoResolutionRate: overlayRate(outcomes, 'neutral_no_resolution'),
    ambiguousSameBarCount: outcomes.filter((outcome) => outcome.hypotheticalOutcomeOverlay.hypotheticalOutcomeLabel === 'ambiguous_same_bar').length,
    ambiguousSameBarRate: overlayRate(outcomes, 'ambiguous_same_bar'),
    insufficientDataCount: outcomes.filter((outcome) => outcome.hypotheticalOutcomeOverlay.hypotheticalOutcomeLabel === 'insufficient_data').length,
    insufficientDataRate: overlayRate(outcomes, 'insufficient_data'),
  };
}

function conceptSummaries(outcomes: ResearchCandidateOutcome[]): ResearchOutcomeMathReport['conceptSummaries'] {
  const concepts = [...new Set(outcomes.map((outcome) => outcome.concept))].sort();
  return concepts.map((concept) => {
    const conceptOutcomes = outcomes.filter((outcome) => outcome.concept === concept);
    const summary = summarizeOutcomes(conceptOutcomes);
    return {
      concept,
      totalCandidates: summary.totalCandidates,
      evaluatedCandidates: summary.evaluatedCandidates,
      thresholdOneTouchRate: summary.thresholdOneTouchRate,
      thresholdTwoTouchRate: summary.thresholdTwoTouchRate,
      adverseThresholdTouchRate: summary.adverseThresholdTouchRate,
      favorableFirstRate: summary.favorableFirstRate,
      adverseFirstRate: summary.adverseFirstRate,
      medianMfePoints: median(conceptOutcomes.map((outcome) => outcome.maxFavorableExcursionPoints).filter((value): value is number => value !== null)),
      medianMaePoints: median(conceptOutcomes.map((outcome) => outcome.maxAdverseExcursionPoints).filter((value): value is number => value !== null)),
      hypotheticalOverlay: summary.hypotheticalOverlay,
      advisoryOnly: true,
    };
  });
}

function listOrNone(values: string[]): string[] {
  return values.length ? values : ['none'];
}

export function renderResearchOutcomeMathMarkdown(report: Omit<ResearchOutcomeMathReport, 'markdown'>): string {
  return [
    `# Research Outcome Math - ${report.instrument}`,
    '',
    '## 1. Executive Summary',
    `- Source: ${report.sourcePath}`,
    `- Total candidates: ${report.summary.totalCandidates}`,
    `- Evaluated candidates: ${report.summary.evaluatedCandidates}`,
    `- Insufficient-data candidates: ${report.summary.insufficientDataCandidates}`,
    '',
    '## 2. Research-Only Boundary',
    '- This is research-only.',
    '- Outcome math does not approve trades.',
    '- Thresholds are research thresholds, not entries, stops, or targets.',
    '- Human review and additional validation are required before any model or rule discussion.',
    '- No executable changes are made.',
    '',
    '## 3. Threshold Configuration',
    `- thresholdOnePoints: ${report.thresholds.thresholdOnePoints}`,
    `- thresholdTwoPoints: ${report.thresholds.thresholdTwoPoints}`,
    `- adverseThresholdPoints: ${report.thresholds.adverseThresholdPoints}`,
    `- observationWindowBars: ${report.thresholds.observationWindowBars}`,
    '',
    '## 4. Overall Outcome Summary',
    `- Threshold one touch rate: ${report.summary.thresholdOneTouchRate ?? 'n/a'}`,
    `- Threshold two touch rate: ${report.summary.thresholdTwoTouchRate ?? 'n/a'}`,
    `- Adverse threshold touch rate: ${report.summary.adverseThresholdTouchRate ?? 'n/a'}`,
    `- Favorable-first rate: ${report.summary.favorableFirstRate ?? 'n/a'}`,
    `- Adverse-first rate: ${report.summary.adverseFirstRate ?? 'n/a'}`,
    `- Hypothetical favorable continuation: ${report.summary.hypotheticalOverlay.favorableContinuationCount} (${report.summary.hypotheticalOverlay.favorableContinuationRate ?? 'n/a'})`,
    `- Hypothetical partial favorable: ${report.summary.hypotheticalOverlay.partialFavorableCount} (${report.summary.hypotheticalOverlay.partialFavorableRate ?? 'n/a'})`,
    `- Hypothetical adverse first: ${report.summary.hypotheticalOverlay.adverseFirstCount} (${report.summary.hypotheticalOverlay.adverseFirstRate ?? 'n/a'})`,
    `- Hypothetical neutral/no resolution: ${report.summary.hypotheticalOverlay.neutralNoResolutionCount} (${report.summary.hypotheticalOverlay.neutralNoResolutionRate ?? 'n/a'})`,
    `- Hypothetical ambiguous same bar: ${report.summary.hypotheticalOverlay.ambiguousSameBarCount} (${report.summary.hypotheticalOverlay.ambiguousSameBarRate ?? 'n/a'})`,
    `- Hypothetical insufficient data: ${report.summary.hypotheticalOverlay.insufficientDataCount} (${report.summary.hypotheticalOverlay.insufficientDataRate ?? 'n/a'})`,
    '',
    '## 5. Concept Outcome Summary',
    ...report.conceptSummaries.map((summary) => `- ${summary.concept}: total=${summary.totalCandidates}, evaluated=${summary.evaluatedCandidates}, thresholdOne=${summary.thresholdOneTouchRate ?? 'n/a'}, thresholdTwo=${summary.thresholdTwoTouchRate ?? 'n/a'}, adverse=${summary.adverseThresholdTouchRate ?? 'n/a'}, hypotheticalFavorableContinuation=${summary.hypotheticalOverlay.favorableContinuationCount}, hypotheticalPartial=${summary.hypotheticalOverlay.partialFavorableCount}, hypotheticalAdverseFirst=${summary.hypotheticalOverlay.adverseFirstCount}, medianMFE=${summary.medianMfePoints ?? 'n/a'}, medianMAE=${summary.medianMaePoints ?? 'n/a'}, advisoryOnly=${summary.advisoryOnly}`),
    '',
    '## 6. Candidate Outcome Details',
    ...report.candidateOutcomes.slice(0, 40).map((outcome) => `- ${outcome.candidateId}: ${outcome.date} ${outcome.time || ''} ${outcome.direction} ${outcome.concept}; referencePrice=${outcome.referencePrice ?? 'n/a'}; MFE=${outcome.maxFavorableExcursionPoints ?? 'n/a'}; MAE=${outcome.maxAdverseExcursionPoints ?? 'n/a'}; firstMove=${outcome.firstMeaningfulMove}; classification=${outcome.outcomeClassification}; hypotheticalOutcome=${outcome.hypotheticalOutcomeOverlay.hypotheticalOutcomeLabel}; advisoryOnly=${outcome.advisoryOnly}`),
    ...(report.candidateOutcomes.length > 40 ? [`- ...${report.candidateOutcomes.length - 40} additional candidate outcome(s) in JSON output.`] : []),
    '',
    '## 7. Data Quality Notes',
    ...listOrNone([...new Set(report.candidateOutcomes.flatMap((outcome) => outcome.dataQualityNotes))]).map((note) => `- ${note}`),
    '',
    '## 8. Do-Not-Change-Yet Items',
    '- Do not change trading rules from outcome math.',
    '- Do not promote research concepts into executable models.',
    '- Do not create executable plans from favorable movement.',
    '',
    '## 9. Approval Boundary',
    ...Object.entries(report.approvalBoundary).map(([key, value]) => `- ${key}: ${String(value)}`),
  ].join('\n');
}

export function runResearchOutcomeMath(input: ResearchOutcomeMathInput): ResearchOutcomeMathReport {
  const thresholds = normalizeThresholds(input.thresholds);
  const outcomes = input.candidates.map((candidate) =>
    calculateResearchCandidateOutcome(candidate, input.bars5m || [], thresholds)
  );
  const summary = summarizeOutcomes(outcomes);
  const reportWithoutMarkdown: Omit<ResearchOutcomeMathReport, 'markdown'> = {
    reportType: 'research_outcome_math',
    generatedAt: input.generatedAt || new Date().toISOString(),
    sourcePath: input.sourcePath,
    instrument: input.instrument,
    advisoryOnly: true,
    executionApproved: false,
    thresholds,
    summary,
    conceptSummaries: conceptSummaries(outcomes),
    candidateOutcomes: outcomes,
    approvalBoundary: {
      outcomeMathApprovesTrade: false,
      outcomeMathChangesRules: false,
      outcomeMathCreatesEntry: false,
      outcomeMathCreatesTargets: false,
      outcomeMathPromotesModel: false,
    },
  };
  assertNoExecutableOutcomeFields(reportWithoutMarkdown);
  return {
    ...reportWithoutMarkdown,
    markdown: renderResearchOutcomeMathMarkdown(reportWithoutMarkdown),
  };
}

function forbiddenPaths(value: unknown, path = 'report'): string[] {
  if (!value || typeof value !== 'object') return [];
  const paths: string[] = [];
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const next = `${path}.${key}`;
    if (FORBIDDEN_EXECUTABLE_KEYS.has(key)) paths.push(next);
    if (key === 'executionApproved' && child !== false) paths.push(next);
    paths.push(...forbiddenPaths(child, next));
  }
  return paths;
}

export function assertNoExecutableOutcomeFields(value: unknown): void {
  const paths = forbiddenPaths(value);
  if (paths.length) throw new Error(`Research outcome math contains prohibited executable field(s): ${paths.join(', ')}`);
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {};
}

function barsFromUnknown(value: unknown): ResearchOutcomeBar[] {
  return Array.isArray(value) ? value.filter((item) => validBar(item as ResearchOutcomeBar)) as ResearchOutcomeBar[] : [];
}

export function extractOutcomeInputFromSource(sourcePath: string, source: unknown, instrument: string): ResearchOutcomeMathInput {
  const record = asObject(source);
  const reportType = String(record.reportType || '');
  const bars5m = [
    ...barsFromUnknown(record.completedBars5m),
    ...barsFromUnknown(record.bars5m),
    ...barsFromUnknown(record.researchBars),
  ];

  if (reportType === 'historical_research_backfill') {
    const report = source as HistoricalResearchBackfillReport & {
      completedBars5m?: ResearchOutcomeBar[];
      bars5m?: ResearchOutcomeBar[];
      researchBars?: ResearchOutcomeBar[];
    };
    const candidates = (report.fullCandidateEvents || []).map((event, index) => fromBackfillCandidate(event, report.instrument || instrument, index));
    return { sourcePath, instrument: report.instrument || instrument, candidates, bars5m };
  }

  if (reportType === 'research_sample_review_pack') {
    const pack = source as ResearchSampleReviewPack & {
      completedBars5m?: ResearchOutcomeBar[];
      bars5m?: ResearchOutcomeBar[];
      researchBars?: ResearchOutcomeBar[];
    };
    const candidates = (pack.samples || []).map((sample, index) => fromReviewSample(sample, pack.instrument || instrument, index));
    return { sourcePath, instrument: pack.instrument || instrument, candidates, bars5m };
  }

  throw new Error('Source must be a historical research backfill report or research sample review pack.');
}

function fromBackfillCandidate(event: ResearchCandidateEvent, instrument: string, index: number): ResearchOutcomeCandidate {
  return {
    candidateId: `${event.concept}-${String(index + 1).padStart(3, '0')}`,
    date: event.date,
    time: event.time,
    instrument: event.instrument || instrument,
    concept: event.concept,
    direction: event.direction,
    window: event.window,
    classification: event.classification,
    summary: event.summary,
    advisoryOnly: true,
    postSignalBars: event.postSignalBars,
    referencePrice: event.referencePrice,
    dataQualityNotes: event.dataQualityNotes,
  };
}

function fromReviewSample(sample: ResearchReviewSample, instrument: string, index: number): ResearchOutcomeCandidate {
  return {
    candidateId: sample.sampleId || `sample-${String(index + 1).padStart(3, '0')}`,
    date: sample.date,
    time: sample.time,
    instrument,
    concept: sample.concept as ResearchBackfillConceptId,
    direction: sample.direction,
    window: sample.window,
    classification: sample.classification,
    summary: sample.summary,
    advisoryOnly: true,
    sourcePath: sample.sampleSourceReportPath,
    dataQualityNotes: sample.dataQualityNotes,
  };
}
