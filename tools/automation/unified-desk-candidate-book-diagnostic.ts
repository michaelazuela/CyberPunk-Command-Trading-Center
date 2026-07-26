import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildUnifiedDeskCandidateBook,
  buildUnifiedDeskCandidateKey,
  type UnifiedDeskCandidateBookItem,
  type UnifiedTradingModelCandidateState,
} from '../../src/lib/unifiedDeskCandidateBook';
import type { SetupCandidate } from '../../src/types';

type DiagnosticSessionType = 'morning' | 'lunch' | 'evening' | 'replay_morning' | 'replay_lunch' | 'replay_evening';
type SelectionComparison = 'same_primary' | 'unified_promotes_different' | 'current_missing' | 'no_candidates';
type OutcomeOverlaySource = 'formal_master_desk' | 'no_chase_rebuild_pack' | 'no_chase_rebuild_simulation' | 'local_rag_or_review';

export interface UnifiedDeskOutcomeOverlayRecord {
  tradeDate: string;
  sessionType: DiagnosticSessionType;
  setupType: string;
  direction: SetupCandidate['direction'];
  outcome: string;
  oneMesGross: number;
  source: OutcomeOverlaySource;
  sourcePath?: string | null;
}

export interface UnifiedDeskOutcomeOverlaySummary {
  evidenceCount: number;
  wins: number;
  losses: number;
  noFillsOrUnresolved: number;
  grossOneMes: number;
  scoreAdjustment: number;
  classification: 'positive' | 'negative' | 'mixed' | 'no_evidence';
  sources: OutcomeOverlaySource[];
}

export interface UnifiedDeskCandidateDiagnosticSnapshot {
  snapshotId: string;
  tradeDate?: string | null;
  sessionType: DiagnosticSessionType;
  completedBarTime?: string | null;
  candidates: SetupCandidate[];
  currentSelectedCandidateIndex?: number | null;
  currentSelectedCandidate?: SetupCandidate | null;
  currentCanExecute?: boolean;
}

export interface UnifiedDeskCandidateDiagnosticOptions {
  outcomeOverlayRecords?: UnifiedDeskOutcomeOverlayRecord[];
}

export interface UnifiedDeskCandidateDiagnosticFinding {
  snapshotId: string;
  checkId: string;
  reason: string;
  evidence: string[];
}

export interface UnifiedDeskCandidateDiagnosticRow {
  snapshotId: string;
  tradeDate: string | null;
  sessionType: DiagnosticSessionType;
  completedBarTime: string | null;
  currentSelectedKey: string | null;
  currentSelectedState: UnifiedDeskCandidateBookItem['state'] | null;
  currentCanExecute: boolean;
  unifiedPrimaryKey: string | null;
  unifiedPrimaryState: UnifiedDeskCandidateBookItem['state'] | null;
  unifiedPrimaryTradingModelState: UnifiedTradingModelCandidateState | null;
  unifiedPrimaryScore: number | null;
  outcomeOverlayAdjustedScore: number | null;
  outcomeOverlay: UnifiedDeskOutcomeOverlaySummary;
  comparison: SelectionComparison;
  recommendation: string;
}

export interface UnifiedDeskCandidateDiagnosticReport {
  reportType: 'unified_desk_candidate_book_diagnostic';
  generatedAt: string;
  authority: {
    readOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    changesScannerBehavior: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
    changesRiskRules: false;
    changesBridgeBehavior: false;
  };
  summary: {
    snapshotsAudited: number;
    samePrimaryCount: number;
    unifiedDifferentPrimaryCount: number;
    currentMissingCount: number;
    noCandidateCount: number;
    executableCurrentSelectionsPreserved: number;
    humanReviewPrimaryCount: number;
    noChasePrimaryCount: number;
    blockedPrimaryCount: number;
    tradingModelStateCounts: Record<UnifiedTradingModelCandidateState, number>;
    outcomeOverlayRecordsLoaded: number;
    outcomeOverlayMatchedRows: number;
    outcomeOverlayPositiveRows: number;
    outcomeOverlayNegativeRows: number;
    outcomeOverlayNoFillOrUnresolvedRows: number;
    outcomeOverlayGrossOneMes: number;
    findingsCount: number;
  };
  rows: UnifiedDeskCandidateDiagnosticRow[];
  findings: UnifiedDeskCandidateDiagnosticFinding[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');
const DIAGNOSTIC_SESSIONS = new Set<DiagnosticSessionType>([
  'morning',
  'lunch',
  'evening',
  'replay_morning',
  'replay_lunch',
  'replay_evening',
]);

function authority(): UnifiedDeskCandidateDiagnosticReport['authority'] {
  return {
    readOnly: true,
    postsDiscord: false,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: false,
    changesScannerBehavior: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
    changesRiskRules: false,
    changesBridgeBehavior: false,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function booleanValue(value: unknown): boolean {
  return value === true;
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeSession(value: unknown): DiagnosticSessionType | null {
  const session = stringValue(value);
  return session && DIAGNOSTIC_SESSIONS.has(session as DiagnosticSessionType)
    ? session as DiagnosticSessionType
    : null;
}

function dateInRange(value: string | null, startDate?: string | null, endDate?: string | null): boolean {
  if (!value) return false;
  if (startDate && value < startDate) return false;
  if (endDate && value > endDate) return false;
  return true;
}

function sameCandidate(a: SetupCandidate | null | undefined, b: SetupCandidate | null | undefined): boolean {
  if (!a || !b) return false;
  return a.setupType === b.setupType &&
    a.scenarioLabel === b.scenarioLabel &&
    a.direction === b.direction &&
    a.entry === b.entry &&
    a.stop === b.stop &&
    a.target1 === b.target1 &&
    a.target2 === b.target2;
}

function selectedIndex(snapshot: UnifiedDeskCandidateDiagnosticSnapshot): number | null {
  if (typeof snapshot.currentSelectedCandidateIndex === 'number') {
    return snapshot.currentSelectedCandidateIndex >= 0 && snapshot.currentSelectedCandidateIndex < snapshot.candidates.length
      ? snapshot.currentSelectedCandidateIndex
      : null;
  }
  if (!snapshot.currentSelectedCandidate) return null;
  const index = snapshot.candidates.findIndex((candidate) => sameCandidate(candidate, snapshot.currentSelectedCandidate));
  return index >= 0 ? index : null;
}

function overlayKey(parts: {
  tradeDate: string | null | undefined;
  sessionType: string | null | undefined;
  setupType: string | null | undefined;
  direction: string | null | undefined;
}): string | null {
  if (!parts.tradeDate || !parts.sessionType || !parts.setupType || !parts.direction) return null;
  return [parts.tradeDate, parts.sessionType, parts.setupType, parts.direction].join('|');
}

function setupTypeFromCandidateKey(candidateKey: string | null): string | null {
  return candidateKey?.split('|')[0] || null;
}

function directionFromCandidateKey(candidateKey: string | null): SetupCandidate['direction'] | null {
  const value = candidateKey?.split('|')[2];
  return value === 'LONG' || value === 'SHORT' || value === 'NO TRADE' ? value : null;
}

function isWinningOutcome(record: UnifiedDeskOutcomeOverlayRecord): boolean {
  return record.oneMesGross > 0 || /T2_HIT|T1_THEN_STOP|TARGET|WIN/i.test(record.outcome);
}

function isLosingOutcome(record: UnifiedDeskOutcomeOverlayRecord): boolean {
  return record.oneMesGross < 0 || /STOP_HIT|LOSS/i.test(record.outcome);
}

function isNoFillOrUnresolvedOutcome(record: UnifiedDeskOutcomeOverlayRecord): boolean {
  return /NO_FILL|FILLED_OPEN|UNRESOLVED|AMBIGUOUS/i.test(record.outcome);
}

function boundedScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value * 100) / 100));
}

function buildOutcomeOverlayIndex(records: UnifiedDeskOutcomeOverlayRecord[]): Map<string, UnifiedDeskOutcomeOverlayRecord[]> {
  const index = new Map<string, UnifiedDeskOutcomeOverlayRecord[]>();
  for (const record of records) {
    const key = overlayKey(record);
    if (!key) continue;
    const existing = index.get(key) || [];
    existing.push(record);
    index.set(key, existing);
  }
  return index;
}

function summarizeOutcomeOverlay(records: UnifiedDeskOutcomeOverlayRecord[]): UnifiedDeskOutcomeOverlaySummary {
  const evidenceCount = records.length;
  if (!evidenceCount) {
    return {
      evidenceCount: 0,
      wins: 0,
      losses: 0,
      noFillsOrUnresolved: 0,
      grossOneMes: 0,
      scoreAdjustment: 0,
      classification: 'no_evidence',
      sources: [],
    };
  }
  const wins = records.filter(isWinningOutcome).length;
  const losses = records.filter(isLosingOutcome).length;
  const noFillsOrUnresolved = records.filter(isNoFillOrUnresolvedOutcome).length;
  const grossOneMes = Math.round(records.reduce((sum, record) => sum + record.oneMesGross, 0) * 100) / 100;
  let scoreAdjustment = 0;
  if (grossOneMes > 0) scoreAdjustment += Math.min(10, grossOneMes / 25);
  if (wins > 0 && losses === 0 && noFillsOrUnresolved === 0) scoreAdjustment += 4;
  if (losses > 0) scoreAdjustment -= 14 + losses * 3;
  if (noFillsOrUnresolved > 0) scoreAdjustment -= Math.min(12, noFillsOrUnresolved * 3);
  if (noFillsOrUnresolved > wins) scoreAdjustment -= 6;
  const classification = scoreAdjustment > 2
    ? 'positive'
    : scoreAdjustment < -2
      ? 'negative'
      : 'mixed';
  return {
    evidenceCount,
    wins,
    losses,
    noFillsOrUnresolved,
    grossOneMes,
    scoreAdjustment: Math.round(scoreAdjustment * 100) / 100,
    classification,
    sources: Array.from(new Set(records.map((record) => record.source))).sort(),
  };
}

function recommendation(row: Omit<UnifiedDeskCandidateDiagnosticRow, 'recommendation'>): string {
  if (row.outcomeOverlay.classification === 'negative') return 'Outcome/RAG overlay penalizes this primary. Keep diagnostic-only and review filters before scanner wiring.';
  if (row.outcomeOverlay.classification === 'positive' && row.unifiedPrimaryTradingModelState === 'review_ticket') {
    return 'Outcome/RAG overlay supports this review ticket. Candidate for the next scanner-visible review-ticket proof pass.';
  }
  if (row.comparison === 'no_candidates') return 'No candidate book decision. Preserve current no-trade/no-candidate behavior.';
  if (row.comparison === 'current_missing') return 'Replay artifact has no current selected candidate. Use unified primary for human review only, not live wiring.';
  if (row.comparison === 'same_primary') return 'Current selection and unified primary agree. Keep behavior unchanged.';
  if (row.unifiedPrimaryState === 'human_review') return 'Investigate as a possible human-review improvement before scanner wiring.';
  if (row.unifiedPrimaryState === 'no_chase') return 'Unified book correctly avoids chasing; require fresh completed 5M proof.';
  if (row.unifiedPrimaryState === 'blocked') return 'Unified book prefers a blocked candidate only for diagnostic visibility; keep scanner behavior unchanged.';
  return 'Different primary requires replay review before any live behavior change.';
}

function analyzeSnapshot(
  snapshot: UnifiedDeskCandidateDiagnosticSnapshot,
  overlayIndex = new Map<string, UnifiedDeskOutcomeOverlayRecord[]>(),
): {
  row: UnifiedDeskCandidateDiagnosticRow;
  findings: UnifiedDeskCandidateDiagnosticFinding[];
} {
  const findings: UnifiedDeskCandidateDiagnosticFinding[] = [];
  const currentIndex = selectedIndex(snapshot);
  const currentSelectedKey = currentIndex === null ? null : buildUnifiedDeskCandidateKey(snapshot.candidates[currentIndex], currentIndex);
  const canExecuteByCandidateKey = currentSelectedKey && snapshot.currentCanExecute
    ? { [currentSelectedKey]: true }
    : undefined;
  if (snapshot.currentCanExecute && currentSelectedKey === null) {
    findings.push({
      snapshotId: snapshot.snapshotId,
      checkId: 'can_execute_mapping',
      reason: 'Snapshot had currentCanExecute=true but no selected candidate could be mapped into the unified book.',
      evidence: [`candidates=${snapshot.candidates.length}`],
    });
  }
  const book = buildUnifiedDeskCandidateBook({
    candidates: snapshot.candidates,
    sessionType: snapshot.sessionType,
    completedBarTime: snapshot.completedBarTime,
    canExecuteByCandidateKey,
  });
  const primary = book.primaryDeskIdea;
  const currentItem = currentSelectedKey
    ? book.candidates.find((candidate) => candidate.candidateKey === currentSelectedKey) || null
    : null;
  const comparison: SelectionComparison = !snapshot.candidates.length || !primary
    ? 'no_candidates'
    : !currentSelectedKey
      ? 'current_missing'
      : primary?.candidateKey === currentSelectedKey
        ? 'same_primary'
        : 'unified_promotes_different';
  if (primary && primary.approvalBoundary.changesCanExecute !== false) {
    findings.push({
      snapshotId: snapshot.snapshotId,
      checkId: 'approval_boundary',
      reason: 'Unified primary approval boundary changed canExecute behavior.',
      evidence: [primary.candidateKey],
    });
  }
  if (primary?.canExecute && !snapshot.currentCanExecute) {
    findings.push({
      snapshotId: snapshot.snapshotId,
      checkId: 'can_execute_boundary',
      reason: 'Unified book marked a candidate executable without existing currentCanExecute=true mapping.',
      evidence: [primary.candidateKey],
    });
  }
  const rowBase = {
    snapshotId: snapshot.snapshotId,
    tradeDate: snapshot.tradeDate || null,
    sessionType: snapshot.sessionType,
    completedBarTime: snapshot.completedBarTime || null,
    currentSelectedKey,
    currentSelectedState: currentItem?.state || null,
    currentCanExecute: Boolean(snapshot.currentCanExecute),
    unifiedPrimaryKey: primary?.candidateKey || null,
    unifiedPrimaryState: primary?.state || null,
    unifiedPrimaryTradingModelState: primary?.tradingModelState || null,
    unifiedPrimaryScore: primary?.score || null,
    outcomeOverlayAdjustedScore: null as number | null,
    outcomeOverlay: summarizeOutcomeOverlay(overlayIndex.get(overlayKey({
      tradeDate: snapshot.tradeDate,
      sessionType: snapshot.sessionType,
      setupType: setupTypeFromCandidateKey(primary?.candidateKey || null),
      direction: directionFromCandidateKey(primary?.candidateKey || null),
    }) || '') || []),
    comparison,
  };
  rowBase.outcomeOverlayAdjustedScore = primary
    ? boundedScore(primary.score + rowBase.outcomeOverlay.scoreAdjustment)
    : null;
  return {
    row: { ...rowBase, recommendation: recommendation(rowBase) },
    findings,
  };
}

function buildMarkdown(report: Omit<UnifiedDeskCandidateDiagnosticReport, 'markdown'>): string {
  const lines = [
    '# Unified Desk Candidate Book Diagnostic',
    '',
    'Authority: read-only diagnostic. It does not post Discord, write Supabase, read live bridge data, change scanner behavior, change trading logic, change canExecute, or alter entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Snapshots audited: ${report.summary.snapshotsAudited}.`,
    `- Same primary: ${report.summary.samePrimaryCount}.`,
    `- Unified different primary: ${report.summary.unifiedDifferentPrimaryCount}.`,
    `- Current missing: ${report.summary.currentMissingCount}.`,
    `- No candidates: ${report.summary.noCandidateCount}.`,
    `- Human-review primaries: ${report.summary.humanReviewPrimaryCount}.`,
    `- No-chase primaries: ${report.summary.noChasePrimaryCount}.`,
    `- Blocked primaries: ${report.summary.blockedPrimaryCount}.`,
    `- Trading model states: ${Object.entries(report.summary.tradingModelStateCounts).map(([state, count]) => `${state}=${count}`).join(', ')}.`,
    `- Outcome/RAG overlay: records=${report.summary.outcomeOverlayRecordsLoaded}; matchedRows=${report.summary.outcomeOverlayMatchedRows}; positiveRows=${report.summary.outcomeOverlayPositiveRows}; negativeRows=${report.summary.outcomeOverlayNegativeRows}; noFillOrUnresolvedRows=${report.summary.outcomeOverlayNoFillOrUnresolvedRows}; grossOneMes=${report.summary.outcomeOverlayGrossOneMes}.`,
    '',
    '## Rows',
    '| Snapshot | Session | Current | Unified Primary | State | Trading Model State | Score | Overlay | Adjusted | Comparison | Recommendation |',
    '|---|---|---|---|---|---|---:|---|---:|---|---|',
    ...report.rows.map((row) => `| ${row.snapshotId} | ${row.sessionType} | ${row.currentSelectedKey || '-'} | ${row.unifiedPrimaryKey || '-'} | ${row.unifiedPrimaryState || '-'} | ${row.unifiedPrimaryTradingModelState || '-'} | ${row.unifiedPrimaryScore ?? '-'} | ${row.outcomeOverlay.classification} (${row.outcomeOverlay.scoreAdjustment}) | ${row.outcomeOverlayAdjustedScore ?? '-'} | ${row.comparison} | ${row.recommendation} |`),
  ];
  if (report.findings.length) {
    lines.push('', '## Findings');
    for (const finding of report.findings) lines.push(`- ${finding.snapshotId} ${finding.checkId}: ${finding.reason}`);
  } else {
    lines.push('', '## Findings', '- None.');
  }
  return lines.join('\n');
}

export function buildUnifiedDeskCandidateDiagnosticReport(
  snapshots: UnifiedDeskCandidateDiagnosticSnapshot[],
  generatedAt = new Date().toISOString(),
  options: UnifiedDeskCandidateDiagnosticOptions = {},
): UnifiedDeskCandidateDiagnosticReport {
  const outcomeOverlayRecords = options.outcomeOverlayRecords || [];
  const overlayIndex = buildOutcomeOverlayIndex(outcomeOverlayRecords);
  const analyzed = snapshots.map((snapshot) => analyzeSnapshot(snapshot, overlayIndex));
  const rows = analyzed.map((item) => item.row);
  const findings = analyzed.flatMap((item) => item.findings);
  const tradingModelStateCounts: Record<UnifiedTradingModelCandidateState, number> = {
    execution_ready: 0,
    review_ticket: 0,
    ranked_candidate: 0,
    blocked_missing_5m_proof: 0,
    blocked_missing_plan_geometry: 0,
    blocked_no_fill: 0,
    blocked: 0,
    no_trade: 0,
  };
  for (const row of rows) {
    if (row.unifiedPrimaryTradingModelState) tradingModelStateCounts[row.unifiedPrimaryTradingModelState] += 1;
  }
  const reportWithoutMarkdown = {
    reportType: 'unified_desk_candidate_book_diagnostic' as const,
    generatedAt,
    authority: authority(),
    summary: {
      snapshotsAudited: rows.length,
      samePrimaryCount: rows.filter((row) => row.comparison === 'same_primary').length,
      unifiedDifferentPrimaryCount: rows.filter((row) => row.comparison === 'unified_promotes_different').length,
      currentMissingCount: rows.filter((row) => row.comparison === 'current_missing').length,
      noCandidateCount: rows.filter((row) => row.comparison === 'no_candidates').length,
      executableCurrentSelectionsPreserved: rows.filter((row) => row.currentCanExecute && row.currentSelectedState === 'executable').length,
      humanReviewPrimaryCount: rows.filter((row) => row.unifiedPrimaryState === 'human_review').length,
      noChasePrimaryCount: rows.filter((row) => row.unifiedPrimaryState === 'no_chase').length,
      blockedPrimaryCount: rows.filter((row) => row.unifiedPrimaryState === 'blocked').length,
      tradingModelStateCounts,
      outcomeOverlayRecordsLoaded: outcomeOverlayRecords.length,
      outcomeOverlayMatchedRows: rows.filter((row) => row.outcomeOverlay.evidenceCount > 0).length,
      outcomeOverlayPositiveRows: rows.filter((row) => row.outcomeOverlay.classification === 'positive').length,
      outcomeOverlayNegativeRows: rows.filter((row) => row.outcomeOverlay.classification === 'negative').length,
      outcomeOverlayNoFillOrUnresolvedRows: rows.filter((row) => row.outcomeOverlay.noFillsOrUnresolved > 0).length,
      outcomeOverlayGrossOneMes: Math.round(outcomeOverlayRecords.reduce((sum, record) => sum + record.oneMesGross, 0) * 100) / 100,
      findingsCount: findings.length,
    },
    rows,
    findings,
  };
  return { ...reportWithoutMarkdown, markdown: buildMarkdown(reportWithoutMarkdown) };
}

export function loadUnifiedDeskCandidateDiagnosticSnapshots(file: string): UnifiedDeskCandidateDiagnosticSnapshot[] {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as unknown;
  const root = asRecord(raw);
  const snapshots = Array.isArray(root.snapshots) ? root.snapshots : Array.isArray(raw) ? raw : [];
  return snapshots as UnifiedDeskCandidateDiagnosticSnapshot[];
}

export function snapshotFromScannerAuditFile(file: string): UnifiedDeskCandidateDiagnosticSnapshot | null {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as unknown;
  const root = asRecord(raw);
  const normalizedPlan = asRecord(root.normalizedPlan);
  const candidates = Array.isArray(normalizedPlan.setupCandidates)
    ? normalizedPlan.setupCandidates as SetupCandidate[]
    : [];
  if (!candidates.length) return null;
  const tradeDate = stringValue(root.tradeDate);
  const sessionType = normalizeSession(root.session);
  if (!tradeDate || !sessionType) return null;
  const completed5m = asRecord(root.completed5m);
  const selected = root.sourceCandidate || root.candidate || asRecord(normalizedPlan.opportunitySelection).bestExecutableCandidate || asRecord(normalizedPlan.opportunitySelection).bestConditionalCandidate || null;
  return {
    snapshotId: path.basename(file, '.json'),
    tradeDate,
    sessionType,
    completedBarTime: stringValue(completed5m.time) || stringValue(root.scoringTimestamp) || stringValue(root.createdAt),
    candidates,
    currentSelectedCandidate: selected as SetupCandidate | null,
    currentCanExecute: booleanValue(normalizedPlan.canExecute) || booleanValue(asRecord(root.deskState).canExecute),
  };
}

export function loadUnifiedDeskCandidateDiagnosticSnapshotsFromDir(
  dir: string,
  options: { startDate?: string | null; endDate?: string | null } = {},
): UnifiedDeskCandidateDiagnosticSnapshot[] {
  const files = fs.readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => path.join(dir, name))
    .sort();
  const snapshots: UnifiedDeskCandidateDiagnosticSnapshot[] = [];
  for (const file of files) {
    const snapshot = snapshotFromScannerAuditFile(file);
    if (!snapshot || !dateInRange(snapshot.tradeDate || null, options.startDate, options.endDate)) continue;
    snapshots.push(snapshot);
  }
  return snapshots;
}

function normalizeOutcomeRecord(record: {
  tradeDate: unknown;
  sessionType: unknown;
  setupType: unknown;
  direction: unknown;
  outcome: unknown;
  oneMesGross: unknown;
  source: OutcomeOverlaySource;
  sourcePath: string;
}): UnifiedDeskOutcomeOverlayRecord | null {
  const tradeDate = stringValue(record.tradeDate);
  const sessionType = normalizeSession(record.sessionType);
  const setupType = stringValue(record.setupType);
  const direction = stringValue(record.direction);
  const outcome = stringValue(record.outcome);
  const oneMesGross = numberValue(record.oneMesGross);
  if (!tradeDate || !sessionType || !setupType || !direction || !outcome || oneMesGross === null) return null;
  if (direction !== 'LONG' && direction !== 'SHORT' && direction !== 'NO TRADE') return null;
  if (setupType === 'Unknown') return null;
  return {
    tradeDate,
    sessionType,
    setupType,
    direction,
    outcome,
    oneMesGross,
    source: record.source,
    sourcePath: record.sourcePath,
  };
}

function outcomeSourceForReport(reportType: string | null): OutcomeOverlaySource {
  if (reportType === 'formal_ohlc_master_desk_audit') return 'formal_master_desk';
  if (reportType === 'no_chase_artifact_rebuild_pack') return 'no_chase_rebuild_pack';
  if (reportType === 'no_chase_artifact_rebuild_simulation') return 'no_chase_rebuild_simulation';
  return 'local_rag_or_review';
}

export function loadUnifiedDeskOutcomeOverlayRecords(files: string[]): UnifiedDeskOutcomeOverlayRecord[] {
  const records: UnifiedDeskOutcomeOverlayRecord[] = [];
  for (const file of files) {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as unknown;
    const root = asRecord(raw);
    const reportType = stringValue(root.reportType);
    const source = outcomeSourceForReport(reportType);
    const findings = Array.isArray(root.findings) ? root.findings : [];
    for (const item of findings) {
      const row = asRecord(item);
      const normalized = normalizeOutcomeRecord({
        tradeDate: row.date,
        sessionType: row.session,
        setupType: row.setupType,
        direction: row.direction,
        outcome: row.outcome,
        oneMesGross: row.oneMesGross,
        source,
        sourcePath: file,
      });
      if (normalized) records.push(normalized);
    }
    const rows = Array.isArray(root.rows) ? root.rows : [];
    for (const item of rows) {
      const row = asRecord(item);
      const normalized = normalizeOutcomeRecord({
        tradeDate: row.tradeDate,
        sessionType: row.sessionType,
        setupType: row.setupType,
        direction: row.direction,
        outcome: row.replayOutcome || row.outcome,
        oneMesGross: row.replayOneMesGross ?? row.oneMesGross,
        source,
        sourcePath: file,
      });
      if (normalized) records.push(normalized);
    }
    const artifacts = Array.isArray(root.artifacts) ? root.artifacts : [];
    for (const item of artifacts) {
      const artifact = asRecord(item);
      const replay = asRecord(artifact.replay);
      const normalized = normalizeOutcomeRecord({
        tradeDate: artifact.tradeDate,
        sessionType: artifact.sessionType,
        setupType: artifact.setupType,
        direction: artifact.direction,
        outcome: replay.outcome || artifact.outcome,
        oneMesGross: replay.oneMesGross ?? artifact.oneMesGross,
        source,
        sourcePath: file,
      });
      if (normalized) records.push(normalized);
    }
    const genericRecords = Array.isArray(root.records) ? root.records : [];
    for (const item of genericRecords) {
      const row = asRecord(item);
      const normalized = normalizeOutcomeRecord({
        tradeDate: row.tradeDate || row.date,
        sessionType: row.sessionType || row.session,
        setupType: row.setupType || row.model,
        direction: row.direction,
        outcome: row.outcome || row.outcomeCode,
        oneMesGross: row.oneMesGross || row.grossOneMes || row.pnl,
        source,
        sourcePath: file,
      });
      if (normalized) records.push(normalized);
    }
  }
  return records;
}

export function writeUnifiedDeskCandidateDiagnosticReport(
  report: UnifiedDeskCandidateDiagnosticReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-desk-candidate-book-diagnostic-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function readFlags(args: string[], flag: string): string[] {
  const values: string[] = [];
  const prefix = `${flag}=`;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === flag && args[index + 1] && !args[index + 1].startsWith('--')) {
      values.push(args[index + 1]);
      index += 1;
    } else if (arg.startsWith(prefix)) {
      values.push(arg.slice(prefix.length));
    }
  }
  return values;
}

export async function runUnifiedDeskCandidateDiagnosticCli(args = process.argv.slice(2)): Promise<void> {
  const inputJson = readFlag(args, '--input-json');
  const inputDir = readFlag(args, '--input-dir');
  if (!inputJson && !inputDir) throw new Error('--input-json or --input-dir is required for unified desk candidate-book diagnostic.');
  const outDir = readFlag(args, '--out-dir') || DEFAULT_OUT_DIR;
  const snapshots = inputDir
    ? loadUnifiedDeskCandidateDiagnosticSnapshotsFromDir(inputDir, {
      startDate: readFlag(args, '--start-date'),
      endDate: readFlag(args, '--end-date'),
    })
    : loadUnifiedDeskCandidateDiagnosticSnapshots(inputJson as string);
  const outcomeOverlayRecords = loadUnifiedDeskOutcomeOverlayRecords(readFlags(args, '--outcome-json'));
  const report = buildUnifiedDeskCandidateDiagnosticReport(snapshots, new Date().toISOString(), {
    outcomeOverlayRecords,
  });
  const paths = writeUnifiedDeskCandidateDiagnosticReport(report, outDir);
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
  runUnifiedDeskCandidateDiagnosticCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
