import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildUnifiedDeskCandidateBook, type UnifiedDeskCandidateBookItem } from '../../src/lib/unifiedDeskCandidateBook';
import type { SetupCandidate } from '../../src/types';
import {
  loadUnifiedDeskCandidateDiagnosticSnapshotsFromDir,
  type UnifiedDeskCandidateDiagnosticReport,
  type UnifiedDeskCandidateDiagnosticRow,
  type UnifiedDeskCandidateDiagnosticSnapshot,
} from './unified-desk-candidate-book-diagnostic';

type RebuildClassification =
  | 'eligible_review_ticket_candidate'
  | 'needs_fresh_5m_proof'
  | 'needs_plan_geometry_rebuild'
  | 'needs_proof_and_geometry'
  | 'not_rebuild_candidate';

export interface UnifiedPositiveCandidateRebuildAuditRow {
  snapshotId: string;
  tradeDate: string | null;
  sessionType: UnifiedDeskCandidateDiagnosticRow['sessionType'];
  candidateKey: string;
  setupType: string;
  direction: SetupCandidate['direction'];
  unifiedState: UnifiedDeskCandidateDiagnosticRow['unifiedPrimaryState'];
  tradingModelState: UnifiedDeskCandidateDiagnosticRow['unifiedPrimaryTradingModelState'];
  score: number | null;
  outcomeAdjustedScore: number | null;
  outcomeEvidenceCount: number;
  outcomeGrossOneMes: number;
  outcomeWins: number;
  outcomeLosses: number;
  outcomeNoFillsOrUnresolved: number;
  hasPlanGeometry: boolean;
  fiveMinuteProofStatus: UnifiedDeskCandidateBookItem['fiveMinuteProofStatus'] | null;
  htfSupport: UnifiedDeskCandidateBookItem['htfSupport'] | null;
  existingPlan: {
    entry: number | null;
    stop: number | null;
    target1: number | null;
    target2: number | null;
    riskPoints: number | null;
  };
  missingFields: string[];
  rebuildClassification: RebuildClassification;
  canExecute: false;
  publishDiscord: false;
  recommendation: string;
}

export interface UnifiedPositiveCandidateRebuildAuditReport {
  reportType: 'unified_positive_candidate_rebuild_audit';
  generatedAt: string;
  authority: {
    readOnly: true;
    researchOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    runsSetupScanner: false;
    changesScannerBehavior: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
    changesRiskRules: false;
    changesBridgeBehavior: false;
  };
  source: {
    unifiedDiagnosticPath: string | null;
    auditDir: string;
    startDate: string | null;
    endDate: string | null;
  };
  summary: {
    unifiedRows: number;
    positiveOverlayRows: number;
    auditedPositiveRows: number;
    eligibleReviewTicketCandidates: number;
    needsFresh5mProof: number;
    needsPlanGeometryRebuild: number;
    needsProofAndGeometry: number;
    notRebuildCandidates: number;
    positiveOutcomeGrossOneMes: number;
    canExecuteFalseRows: number;
    publishDiscordFalseRows: number;
    missingSnapshotRows: number;
    missingCandidateRows: number;
  };
  rows: UnifiedPositiveCandidateRebuildAuditRow[];
  findings: Array<{
    snapshotId: string;
    candidateKey: string | null;
    reason: string;
  }>;
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_AUDIT_DIR = path.join(__dirname, 'discord-audit');
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function setupTypeFromKey(candidateKey: string): string {
  return candidateKey.split('|')[0] || 'unknown';
}

function directionFromKey(candidateKey: string): SetupCandidate['direction'] {
  const value = candidateKey.split('|')[2];
  return value === 'LONG' || value === 'SHORT' || value === 'NO TRADE' ? value : 'NO TRADE';
}

function directionallyValidPlan(item: UnifiedDeskCandidateBookItem): boolean {
  const { entry, stop, target1, target2 } = item;
  if (entry === null || stop === null || target1 === null || target2 === null) return false;
  if (item.direction === 'LONG') return stop < entry && entry < target1 && target1 <= target2;
  if (item.direction === 'SHORT') return stop > entry && entry > target1 && target1 >= target2;
  return false;
}

function missingFields(item: UnifiedDeskCandidateBookItem | null): string[] {
  if (!item) return ['source candidate missing'];
  const fields: string[] = [];
  if (item.entry === null) fields.push('entry');
  if (item.stop === null) fields.push('stop');
  if (item.target1 === null) fields.push('target1');
  if (item.target2 === null) fields.push('target2');
  if (!fields.length && !directionallyValidPlan(item)) fields.push('directionally valid plan geometry');
  if (item.fiveMinuteProofStatus === 'missing') fields.push('fresh completed 5M proof');
  if (item.state === 'no_chase') fields.push('fresh non-stale 5M re-entry proof');
  return fields;
}

function classify(item: UnifiedDeskCandidateBookItem | null): RebuildClassification {
  if (!item) return 'not_rebuild_candidate';
  const hasGeometry = directionallyValidPlan(item);
  const needsProof = item.fiveMinuteProofStatus === 'missing' || item.state === 'no_chase';
  if (item.tradingModelState === 'review_ticket' && hasGeometry && !needsProof) return 'eligible_review_ticket_candidate';
  if (!hasGeometry && needsProof) return 'needs_proof_and_geometry';
  if (!hasGeometry) return 'needs_plan_geometry_rebuild';
  if (needsProof) return 'needs_fresh_5m_proof';
  return 'not_rebuild_candidate';
}

function recommendationFor(row: Pick<UnifiedPositiveCandidateRebuildAuditRow, 'rebuildClassification' | 'setupType'>): string {
  if (row.rebuildClassification === 'eligible_review_ticket_candidate') {
    return 'Positive overlay plus plan geometry and 5M proof are present. Candidate can move to a later scanner-visible review-ticket proof pass, still canExecute=false.';
  }
  if (row.rebuildClassification === 'needs_fresh_5m_proof') {
    return 'Positive outcome evidence exists, but the source candidate still needs fresh completed 5M proof before any review-ticket rebuild.';
  }
  if (row.rebuildClassification === 'needs_plan_geometry_rebuild') {
    return 'Positive outcome evidence exists, but deterministic entry/stop/T1/T2 geometry must be rebuilt and validated before any ticket.';
  }
  if (row.rebuildClassification === 'needs_proof_and_geometry') {
    return 'Positive outcome evidence exists, but both fresh 5M proof and deterministic plan geometry are missing or stale.';
  }
  return `${row.setupType} is positive overlay evidence only. Keep diagnostic-only until a stricter model-specific rebuild path qualifies it.`;
}

function authority(): UnifiedPositiveCandidateRebuildAuditReport['authority'] {
  return {
    readOnly: true,
    researchOnly: true,
    postsDiscord: false,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: false,
    runsSetupScanner: false,
    changesScannerBehavior: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
    changesRiskRules: false,
    changesBridgeBehavior: false,
  };
}

function buildSnapshotIndex(snapshots: UnifiedDeskCandidateDiagnosticSnapshot[]): Map<string, UnifiedDeskCandidateDiagnosticSnapshot> {
  return new Map(snapshots.map((snapshot) => [snapshot.snapshotId, snapshot]));
}

function bookItemForRow(
  row: UnifiedDeskCandidateDiagnosticRow,
  snapshot: UnifiedDeskCandidateDiagnosticSnapshot | undefined,
): UnifiedDeskCandidateBookItem | null {
  if (!snapshot || !row.unifiedPrimaryKey) return null;
  const book = buildUnifiedDeskCandidateBook({
    candidates: snapshot.candidates,
    sessionType: snapshot.sessionType,
    completedBarTime: snapshot.completedBarTime,
  });
  return book.candidates.find((item) => item.candidateKey === row.unifiedPrimaryKey) || null;
}

function buildMarkdown(report: Omit<UnifiedPositiveCandidateRebuildAuditReport, 'markdown'>): string {
  const lines = [
    '# Unified Positive Candidate Rebuild Audit',
    '',
    'Authority: read-only research. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, or alter entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Unified rows: ${report.summary.unifiedRows}.`,
    `- Positive overlay rows: ${report.summary.positiveOverlayRows}.`,
    `- Audited positive rows: ${report.summary.auditedPositiveRows}.`,
    `- Eligible review-ticket candidates: ${report.summary.eligibleReviewTicketCandidates}.`,
    `- Needs fresh 5M proof: ${report.summary.needsFresh5mProof}.`,
    `- Needs plan geometry rebuild: ${report.summary.needsPlanGeometryRebuild}.`,
    `- Needs proof and geometry: ${report.summary.needsProofAndGeometry}.`,
    `- Not rebuild candidates: ${report.summary.notRebuildCandidates}.`,
    `- Positive overlay gross one-MES evidence: $${report.summary.positiveOutcomeGrossOneMes.toFixed(2)}.`,
    '',
    '## Rows',
    '| Date | Session | Setup | Side | State | Trading State | Score | Adjusted | Evidence | Gross | Missing | Classification |',
    '|---|---|---|---|---|---|---:|---:|---:|---:|---|---|',
    ...report.rows.map((row) => `| ${row.tradeDate || '-'} | ${row.sessionType} | ${row.setupType} | ${row.direction} | ${row.unifiedState || '-'} | ${row.tradingModelState || '-'} | ${row.score ?? '-'} | ${row.outcomeAdjustedScore ?? '-'} | ${row.outcomeEvidenceCount} | $${row.outcomeGrossOneMes.toFixed(2)} | ${row.missingFields.join(', ') || '-'} | ${row.rebuildClassification} |`),
    '',
    '## Findings',
    ...(report.findings.length
      ? report.findings.map((finding) => `- ${finding.snapshotId} ${finding.candidateKey || '-'}: ${finding.reason}`)
      : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ];
  return lines.join('\n');
}

function buildRecommendations(report: Omit<UnifiedPositiveCandidateRebuildAuditReport, 'recommendations' | 'markdown'>): string[] {
  const recommendations = [
    'Do not wire scanner-visible tickets from this report directly. It is a rebuild-readiness audit only.',
    'Keep canExecute=false and Discord publishing disabled for every positive overlay candidate.',
  ];
  if (report.summary.eligibleReviewTicketCandidates > 0) {
    recommendations.push('Carry only eligible_review_ticket_candidate rows into a later scanner-visible review-ticket proof pass.');
  }
  if (report.summary.needsFresh5mProof > 0) {
    recommendations.push('For needs_fresh_5m_proof rows, run a model-specific completed-5M proof extractor before any ticket rebuild.');
  }
  if (report.summary.needsPlanGeometryRebuild + report.summary.needsProofAndGeometry > 0) {
    recommendations.push('For geometry-deficient rows, use app-owned deterministic plan builders only; do not infer levels from outcome hindsight.');
  }
  if (report.summary.eligibleReviewTicketCandidates === 0) {
    recommendations.push('No positive overlay row is ready for scanner visibility yet. The next narrow phase should target proof/geometry rebuild by model family.');
  }
  return recommendations;
}

export function buildUnifiedPositiveCandidateRebuildAuditReport(args: {
  diagnostic: UnifiedDeskCandidateDiagnosticReport;
  snapshots: UnifiedDeskCandidateDiagnosticSnapshot[];
  unifiedDiagnosticPath?: string | null;
  auditDir: string;
  startDate?: string | null;
  endDate?: string | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveCandidateRebuildAuditReport {
  const snapshotIndex = buildSnapshotIndex(args.snapshots);
  const findings: UnifiedPositiveCandidateRebuildAuditReport['findings'] = [];
  const positiveRows = args.diagnostic.rows.filter((row) => row.outcomeOverlay.classification === 'positive');
  const rows = positiveRows.map((row) => {
    const snapshot = snapshotIndex.get(row.snapshotId);
    if (!snapshot) findings.push({ snapshotId: row.snapshotId, candidateKey: row.unifiedPrimaryKey, reason: 'Source scanner snapshot not found.' });
    const item = bookItemForRow(row, snapshot);
    if (snapshot && !item) findings.push({ snapshotId: row.snapshotId, candidateKey: row.unifiedPrimaryKey, reason: 'Unified primary candidate not found in rebuilt candidate book.' });
    const rebuildClassification = classify(item);
    const output: UnifiedPositiveCandidateRebuildAuditRow = {
      snapshotId: row.snapshotId,
      tradeDate: row.tradeDate,
      sessionType: row.sessionType,
      candidateKey: row.unifiedPrimaryKey || '-',
      setupType: row.unifiedPrimaryKey ? setupTypeFromKey(row.unifiedPrimaryKey) : 'unknown',
      direction: row.unifiedPrimaryKey ? directionFromKey(row.unifiedPrimaryKey) : 'NO TRADE',
      unifiedState: row.unifiedPrimaryState,
      tradingModelState: row.unifiedPrimaryTradingModelState,
      score: row.unifiedPrimaryScore,
      outcomeAdjustedScore: row.outcomeOverlayAdjustedScore,
      outcomeEvidenceCount: row.outcomeOverlay.evidenceCount,
      outcomeGrossOneMes: row.outcomeOverlay.grossOneMes,
      outcomeWins: row.outcomeOverlay.wins,
      outcomeLosses: row.outcomeOverlay.losses,
      outcomeNoFillsOrUnresolved: row.outcomeOverlay.noFillsOrUnresolved,
      hasPlanGeometry: item ? directionallyValidPlan(item) : false,
      fiveMinuteProofStatus: item?.fiveMinuteProofStatus || null,
      htfSupport: item?.htfSupport || null,
      existingPlan: {
        entry: item?.entry ?? null,
        stop: item?.stop ?? null,
        target1: item?.target1 ?? null,
        target2: item?.target2 ?? null,
        riskPoints: item?.riskPoints ?? null,
      },
      missingFields: missingFields(item),
      rebuildClassification,
      canExecute: false,
      publishDiscord: false,
      recommendation: recommendationFor({ rebuildClassification, setupType: row.unifiedPrimaryKey ? setupTypeFromKey(row.unifiedPrimaryKey) : 'unknown' }),
    };
    return output;
  });

  const withoutRecommendationsAndMarkdown: Omit<UnifiedPositiveCandidateRebuildAuditReport, 'recommendations' | 'markdown'> = {
    reportType: 'unified_positive_candidate_rebuild_audit',
    generatedAt,
    authority: authority(),
    source: {
      unifiedDiagnosticPath: args.unifiedDiagnosticPath || null,
      auditDir: args.auditDir,
      startDate: args.startDate || null,
      endDate: args.endDate || null,
    },
    summary: {
      unifiedRows: args.diagnostic.rows.length,
      positiveOverlayRows: positiveRows.length,
      auditedPositiveRows: rows.length,
      eligibleReviewTicketCandidates: rows.filter((row) => row.rebuildClassification === 'eligible_review_ticket_candidate').length,
      needsFresh5mProof: rows.filter((row) => row.rebuildClassification === 'needs_fresh_5m_proof').length,
      needsPlanGeometryRebuild: rows.filter((row) => row.rebuildClassification === 'needs_plan_geometry_rebuild').length,
      needsProofAndGeometry: rows.filter((row) => row.rebuildClassification === 'needs_proof_and_geometry').length,
      notRebuildCandidates: rows.filter((row) => row.rebuildClassification === 'not_rebuild_candidate').length,
      positiveOutcomeGrossOneMes: roundCurrency(rows.reduce((sum, row) => sum + row.outcomeGrossOneMes, 0)),
      canExecuteFalseRows: rows.filter((row) => row.canExecute === false).length,
      publishDiscordFalseRows: rows.filter((row) => row.publishDiscord === false).length,
      missingSnapshotRows: findings.filter((finding) => finding.reason.includes('snapshot')).length,
      missingCandidateRows: findings.filter((finding) => finding.reason.includes('candidate')).length,
    },
    rows,
    findings,
  };
  const recommendations = buildRecommendations(withoutRecommendationsAndMarkdown);
  const withoutMarkdown = { ...withoutRecommendationsAndMarkdown, recommendations };
  return { ...withoutMarkdown, markdown: buildMarkdown(withoutMarkdown) };
}

export function writeUnifiedPositiveCandidateRebuildAuditReport(
  report: UnifiedPositiveCandidateRebuildAuditReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-candidate-rebuild-audit-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export async function runUnifiedPositiveCandidateRebuildAuditCli(args = process.argv.slice(2)): Promise<void> {
  const unifiedDiagnosticPath = readFlag(args, '--unified-diagnostic');
  if (!unifiedDiagnosticPath) throw new Error('Missing required --unified-diagnostic path.');
  const auditDir = readFlag(args, '--audit-dir') || DEFAULT_AUDIT_DIR;
  const startDate = readFlag(args, '--start-date');
  const endDate = readFlag(args, '--end-date');
  const outDir = readFlag(args, '--out-dir') || DEFAULT_OUT_DIR;
  const diagnostic = JSON.parse(fs.readFileSync(unifiedDiagnosticPath, 'utf8')) as UnifiedDeskCandidateDiagnosticReport;
  const snapshots = loadUnifiedDeskCandidateDiagnosticSnapshotsFromDir(auditDir, { startDate, endDate });
  const report = buildUnifiedPositiveCandidateRebuildAuditReport({
    diagnostic,
    snapshots,
    unifiedDiagnosticPath,
    auditDir,
    startDate,
    endDate,
  });
  const paths = writeUnifiedPositiveCandidateRebuildAuditReport(report, outDir);
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ...paths, summary: report.summary }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.findings.length) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runUnifiedPositiveCandidateRebuildAuditCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
