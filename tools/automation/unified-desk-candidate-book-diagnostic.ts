import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildUnifiedDeskCandidateBook,
  buildUnifiedDeskCandidateKey,
  type UnifiedDeskCandidateBookItem,
} from '../../src/lib/unifiedDeskCandidateBook';
import type { SetupCandidate } from '../../src/types';

type DiagnosticSessionType = 'morning' | 'lunch' | 'replay_morning' | 'replay_lunch';
type SelectionComparison = 'same_primary' | 'unified_promotes_different' | 'current_missing' | 'no_candidates';

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
  unifiedPrimaryScore: number | null;
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
    findingsCount: number;
  };
  rows: UnifiedDeskCandidateDiagnosticRow[];
  findings: UnifiedDeskCandidateDiagnosticFinding[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');

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

function recommendation(row: Omit<UnifiedDeskCandidateDiagnosticRow, 'recommendation'>): string {
  if (row.comparison === 'no_candidates') return 'No candidate book decision. Preserve current no-trade/no-candidate behavior.';
  if (row.comparison === 'current_missing') return 'Replay artifact has no current selected candidate. Use unified primary for human review only, not live wiring.';
  if (row.comparison === 'same_primary') return 'Current selection and unified primary agree. Keep behavior unchanged.';
  if (row.unifiedPrimaryState === 'human_review') return 'Investigate as a possible human-review improvement before scanner wiring.';
  if (row.unifiedPrimaryState === 'no_chase') return 'Unified book correctly avoids chasing; require fresh completed 5M proof.';
  if (row.unifiedPrimaryState === 'blocked') return 'Unified book prefers a blocked candidate only for diagnostic visibility; keep scanner behavior unchanged.';
  return 'Different primary requires replay review before any live behavior change.';
}

function analyzeSnapshot(snapshot: UnifiedDeskCandidateDiagnosticSnapshot): {
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
  const comparison: SelectionComparison = !snapshot.candidates.length
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
    unifiedPrimaryScore: primary?.score || null,
    comparison,
  };
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
    '',
    '## Rows',
    '| Snapshot | Session | Current | Unified Primary | State | Comparison | Recommendation |',
    '|---|---|---|---|---|---|---|',
    ...report.rows.map((row) => `| ${row.snapshotId} | ${row.sessionType} | ${row.currentSelectedKey || '-'} | ${row.unifiedPrimaryKey || '-'} | ${row.unifiedPrimaryState || '-'} | ${row.comparison} | ${row.recommendation} |`),
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
): UnifiedDeskCandidateDiagnosticReport {
  const analyzed = snapshots.map(analyzeSnapshot);
  const rows = analyzed.map((item) => item.row);
  const findings = analyzed.flatMap((item) => item.findings);
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

export async function runUnifiedDeskCandidateDiagnosticCli(args = process.argv.slice(2)): Promise<void> {
  const inputJson = readFlag(args, '--input-json');
  if (!inputJson) throw new Error('--input-json is required for unified desk candidate-book diagnostic.');
  const outDir = readFlag(args, '--out-dir') || DEFAULT_OUT_DIR;
  const report = buildUnifiedDeskCandidateDiagnosticReport(loadUnifiedDeskCandidateDiagnosticSnapshots(inputJson));
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
