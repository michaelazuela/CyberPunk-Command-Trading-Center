export interface ReviewVisualizationRow {
  sampleId: string;
  timestamp: string | null;
  setupName: string;
  direction: string;
  decision: string;
  executableStatus: string;
  blockReason: string;
  researchQualityScore: number | null;
  researchQualityLabel: string;
  riskPoints: number | null;
  riskScore: number | null;
  riskLabel: string;
  entryCandidate: number | null;
  stopCandidate: number | null;
  targetArea: string;
  humanReviewStatus: string;
  agentAssessmentStatus: string;
  chartEvidenceStatus: string;
  chartPngPath: string | null;
  chartSvgPath: string | null;
  chartReportPath: string | null;
  estimatedGrossContractPnlStatus: string;
  estimatedGrossContractPnlLabel: string;
  session: string;
  instrument: string;
  sourcePath: string | null;
  replayCutoff: string | null;
  raw: unknown;
}

export interface ReviewVisualizationData {
  sourceLabel: string;
  generatedAt: string | null;
  instrument: string;
  rows: ReviewVisualizationRow[];
  summary: {
    totalReviewedSamples: number;
    executableCount: number;
    nonExecutableCount: number;
    mostCommonBlockReason: string;
    averageResearchQualityScore: number | null;
    averageRiskScore: number | null;
    samplesWithChartEvidence: number;
    samplesWithEstimatedGrossContractPnl: number;
  };
  researchQualityScoreBySample: Array<{ sampleId: string; timestamp: string | null; researchQualityScore: number | null; researchQualityLabel: string }>;
  riskScoreBySample: Array<{ sampleId: string; timestamp: string | null; riskScore: number | null; riskLabel: string }>;
  countByBlockReason: Array<{ name: string; count: number }>;
  countBySetupType: Array<{ name: string; count: number }>;
  warnings: string[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringValue(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return null;
}

function numberValue(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return null;
}

function hasRiskScoreLikeValue(...values: unknown[]): boolean {
  return values.some((value) => value !== undefined && value !== null && !(typeof value === 'string' && !value.trim()));
}

function boolValue(...values: unknown[]): boolean | null {
  for (const value of values) if (typeof value === 'boolean') return value;
  return null;
}

function nested(record: Record<string, unknown> | null, key: string): Record<string, unknown> | null {
  return asRecord(record?.[key]);
}

function timestampFor(sample: Record<string, unknown>): string | null {
  const explicit = stringValue(sample.timestamp, sample.completedCandleTime, sample.completed_candle_time, sample.scoringTimestamp);
  if (explicit) return explicit;
  const date = stringValue(sample.date, sample.tradeDate);
  const time = stringValue(sample.time);
  if (date && time) return `${date} ${time}`;
  return date;
}

function targetAreaFor(sample: Record<string, unknown>, candidate: Record<string, unknown> | null): string {
  const targetArea = stringValue(sample.targetArea, sample.target_area, candidate?.targetArea);
  if (targetArea) return targetArea;
  const target1 = numberValue(sample.target1, sample.target_1, sample.t1, candidate?.target1);
  const target2 = numberValue(sample.target2, sample.target_2, sample.t2, candidate?.target2);
  if (target1 !== null && target2 !== null) return `${target1} / ${target2}`;
  if (target1 !== null) return String(target1);
  return 'Not provided';
}

function dollars(value: number | null): string | null {
  if (value === null) return null;
  const prefix = value > 0 ? '+$' : value < 0 ? '-$' : '$';
  return `${prefix}${Math.abs(value).toFixed(2)} gross`;
}

function estimatedPnlLabel(pnl: Record<string, unknown> | null): string {
  if (!pnl) return 'Not recorded';
  const status = stringValue(pnl.status) || 'unknown';
  if (status === 'unavailable_unknown_contract') return 'Unavailable: unknown contract';
  const root = stringValue(pnl.rootSymbol) || 'UNKNOWN';
  const hypothetical = dollars(numberValue(pnl.hypotheticalOutcomeDollars));
  const mfe = dollars(numberValue(pnl.mfeDollars));
  const mae = dollars(numberValue(pnl.maeDollars));
  const values = [
    hypothetical ? `Hyp ${hypothetical}` : null,
    mfe ? `MFE ${mfe}` : null,
    mae ? `MAE ${mae}` : null,
  ].filter(Boolean);
  return values.length
    ? `${root} research-only estimated gross contract P/L: ${values.join('; ')}`
    : `${root} research-only estimated gross contract P/L: ${status}`;
}

function decisionFor(sample: Record<string, unknown>): string {
  return stringValue(
    sample.finalReviewLabel,
    sample.humanInspectionLabel,
    sample.agentInspectionLabel,
    sample.decision,
    sample.classification,
  ) || 'unknown';
}

function executableStatusFor(sample: Record<string, unknown>, candidate: Record<string, unknown> | null): string {
  const explicit = stringValue(sample.executionStatus, candidate?.executionStatus);
  if (explicit) return explicit;
  const canExecute = boolValue(sample.canExecute, candidate?.canExecute);
  if (canExecute === true) return 'executable';
  if (canExecute === false) return 'not_executable';
  return 'review_only';
}

function isExecutable(row: ReviewVisualizationRow): boolean {
  return /^(executable|approved)$/i.test(row.executableStatus);
}

function countBy(rows: ReviewVisualizationRow[], key: keyof ReviewVisualizationRow): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = String(row[key] || 'Unknown');
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([name, count]) => ({ name, count }));
}

function mostCommon(values: Array<{ name: string; count: number }>): string {
  return values[0]?.name || 'None';
}

function average(values: Array<number | null>): number | null {
  const finite = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (!finite.length) return null;
  return Math.round((finite.reduce((sum, value) => sum + value, 0) / finite.length) * 10) / 10;
}

export function adaptReviewAgentOutputToVisualization(input: unknown, sourceLabel = 'Review agent output'): ReviewVisualizationData {
  const warnings: string[] = [];
  const root = asRecord(input);
  if (!root) {
    return emptyVisualization(sourceLabel, 'Malformed review data: expected an object.');
  }

  const samples = Array.isArray(root.samples)
    ? root.samples
    : Array.isArray(root.rows)
      ? root.rows
      : Array.isArray(root.findings)
        ? root.findings
        : [];

  if (!samples.length) warnings.push('No review samples were found in samples, rows, or findings.');

  const instrument = stringValue(root.instrument, root.symbol) || 'Unknown';
  const rows = samples.flatMap((sample, index): ReviewVisualizationRow[] => {
    const record = asRecord(sample);
    if (!record) {
      warnings.push(`Sample ${index + 1} is malformed and was skipped.`);
      return [];
    }

    const candidate = nested(record, 'candidate') || nested(record, 'selectedCandidate');
    const agentAssessment = nested(record, 'agentAssessment');
    const reviewEvidence = nested(record, 'reviewEvidence');
    const estimatedPnl = nested(record, 'estimatedGrossContractPnl');
    const riskReview = nested(record, 'conditionalRiskScore') || nested(record, 'riskReview') || nested(record, 'riskAssessment');
    const researchQuality = nested(record, 'researchQualityScore');
    const risk = nested(record, 'risk');
    const candidateRisk = nested(candidate, 'risk');
    const researchQualityScore = numberValue(researchQuality?.score);
    const riskScore = numberValue(
      researchQuality?.score,
      record.riskScore,
      record.risk_score,
      record.decisionQualityScore,
      riskReview?.score,
      riskReview?.riskScore,
      risk?.score,
      risk?.riskScore,
      candidate?.decisionQualityScore,
      candidate?.riskScore,
      candidateRisk?.score,
      candidateRisk?.riskScore,
    );
    const riskPoints = numberValue(record.riskPoints, record.risk_points, risk?.points, candidate?.riskPoints, candidateRisk?.points);
    const sampleId = stringValue(record.sampleId, record.id, record.reviewSampleId) || `sample-${index + 1}`;
    const blockReason = stringValue(
      record.blockReason,
      record.noTradeReason,
      riskReview?.blockReason,
      record.warningFailureReason,
      record.researchDetectorReason,
    ) || 'No block reason provided';

    if (riskScore === null) {
      const hadRiskScoreField = hasRiskScoreLikeValue(
        researchQuality?.score,
        record.riskScore,
        record.risk_score,
        record.decisionQualityScore,
        riskReview?.score,
        riskReview?.riskScore,
        risk?.score,
        risk?.riskScore,
        candidate?.decisionQualityScore,
        candidate?.riskScore,
        candidateRisk?.score,
        candidateRisk?.riskScore,
      );
      warnings.push(hadRiskScoreField
        ? `${sampleId}: research quality/risk score field was present but not numeric.`
        : `${sampleId}: research quality score was not present in the review output.`);
    }

    return [{
      sampleId,
      timestamp: timestampFor(record),
      setupName: stringValue(record.setupName, record.conceptTitle, record.concept, candidate?.setupType) || 'Unknown setup',
      direction: stringValue(record.direction, candidate?.direction) || 'Unknown',
      decision: decisionFor(record),
      executableStatus: executableStatusFor(record, candidate),
      blockReason,
      researchQualityScore,
      researchQualityLabel: stringValue(researchQuality?.label) || 'Not provided',
      riskPoints,
      riskScore,
      riskLabel: stringValue(researchQuality?.label, record.riskLabel, record.risk_label, riskReview?.label, risk?.label, candidateRisk?.label, record.agentConfidence) || 'Not provided',
      entryCandidate: numberValue(record.entryCandidate, record.entry, candidate?.entry),
      stopCandidate: numberValue(record.stopCandidate, record.stop, candidate?.stop),
      targetArea: targetAreaFor(record, candidate),
      humanReviewStatus: stringValue(record.humanInspectionLabel, record.finalReviewLabel) || 'pending',
      agentAssessmentStatus: stringValue(agentAssessment?.status, record.agentInspectionLabel) || 'not_recorded',
      chartEvidenceStatus: stringValue(reviewEvidence?.evidenceStatus) || (reviewEvidence?.chartAvailable === true ? 'chart_available' : reviewEvidence?.chartAvailable === false ? 'chart_missing' : 'chart_unknown'),
      chartPngPath: stringValue(reviewEvidence?.chartPngPath),
      chartSvgPath: stringValue(reviewEvidence?.chartSvgPath),
      chartReportPath: stringValue(reviewEvidence?.chartReportPath),
      estimatedGrossContractPnlStatus: stringValue(estimatedPnl?.status) || 'not_recorded',
      estimatedGrossContractPnlLabel: estimatedPnlLabel(estimatedPnl),
      session: stringValue(record.session, record.window, record.windowLabel) || 'Unspecified',
      instrument: stringValue(record.instrument, root.instrument, root.symbol) || 'Unknown',
      sourcePath: stringValue(record.sampleSourceReportPath, record.sourceReportPath, root.sourcePath),
      replayCutoff: stringValue(record.replayCutoff, record.replay_cutoff),
      raw: record,
    }];
  });

  const blockCounts = countBy(rows, 'blockReason');
  const setupCounts = countBy(rows, 'setupName');
  const executableCount = rows.filter(isExecutable).length;
  const avgRisk = average(rows.map((row) => row.riskScore));
  const avgResearchQuality = average(rows.map((row) => row.researchQualityScore));
  const samplesWithChartEvidence = rows.filter((row) => row.chartEvidenceStatus === 'chart_available' || Boolean(row.chartPngPath || row.chartSvgPath || row.chartReportPath)).length;
  const samplesWithEstimatedGrossContractPnl = rows.filter((row) => row.estimatedGrossContractPnlStatus !== 'not_recorded' && row.estimatedGrossContractPnlStatus !== 'unavailable_unknown_contract').length;

  if (avgRisk === null && rows.length > 0) {
    warnings.push('Average research quality score is unavailable because the source review output does not include researchQualityScore values.');
  }

  return {
    sourceLabel,
    generatedAt: stringValue(root.generatedAt, root.updatedAt),
    instrument,
    rows,
    summary: {
      totalReviewedSamples: rows.length,
      executableCount,
      nonExecutableCount: rows.length - executableCount,
      mostCommonBlockReason: mostCommon(blockCounts),
      averageResearchQualityScore: avgResearchQuality,
      averageRiskScore: avgRisk,
      samplesWithChartEvidence,
      samplesWithEstimatedGrossContractPnl,
    },
    researchQualityScoreBySample: rows.map((row) => ({
      sampleId: row.sampleId,
      timestamp: row.timestamp,
      researchQualityScore: row.researchQualityScore,
      researchQualityLabel: row.researchQualityLabel,
    })),
    riskScoreBySample: rows.map((row) => ({
      sampleId: row.sampleId,
      timestamp: row.timestamp,
      riskScore: row.riskScore,
      riskLabel: row.riskLabel,
    })),
    countByBlockReason: blockCounts,
    countBySetupType: setupCounts,
    warnings,
  };
}

function emptyVisualization(sourceLabel: string, warning: string): ReviewVisualizationData {
  return {
    sourceLabel,
    generatedAt: null,
    instrument: 'Unknown',
    rows: [],
    summary: {
      totalReviewedSamples: 0,
      executableCount: 0,
      nonExecutableCount: 0,
      mostCommonBlockReason: 'None',
      averageResearchQualityScore: null,
      averageRiskScore: null,
      samplesWithChartEvidence: 0,
      samplesWithEstimatedGrossContractPnl: 0,
    },
    researchQualityScoreBySample: [],
    riskScoreBySample: [],
    countByBlockReason: [],
    countBySetupType: [],
    warnings: [warning],
  };
}
