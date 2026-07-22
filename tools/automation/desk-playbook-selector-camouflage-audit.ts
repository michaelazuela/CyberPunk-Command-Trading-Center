import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

type Direction = 'LONG' | 'SHORT';
type SessionName = 'morning' | 'lunch';
type SuppressionReason = 'not_drive_raid' | 'no_selected' | 'direction_fights' | 'incomplete_proof';
type CamouflageClass =
  | 'camouflaged_positive_proof'
  | 'direction_conflict_trap_avoided'
  | 'story_without_5m_proof'
  | 'candidate_present_but_not_drive_raid'
  | 'clean_no_data'
  | 'noise_or_unresolved';

interface SelectedCandidate {
  setupType: string;
  direction: Direction;
  eventTime: string;
  entry: number;
  stop: number;
  target1: number;
  target2: number;
  riskPoints: number;
  outcome?: {
    status?: string;
    pnl?: number;
    r?: number;
    filled?: boolean;
  };
}

interface DayByDayRow {
  date: string;
  session: SessionName;
  movement: string;
  sessionStats?: {
    open: number;
    high: number;
    low: number;
    close: number;
    range: number;
    net: number;
    trend: string;
    bars: number;
  } | null;
  raids: Record<string, boolean>;
  htf: Record<string, { trend: string; bars?: number }>;
  completeCandidateCount: number;
  selected: SelectedCandidate | null;
}

interface DayByDayReport {
  reportType: string;
  generatedAt: string;
  provenanceSummary?: {
    currentRunCount: number;
    staleCount: number;
  };
  rows: DayByDayRow[];
}

interface CamouflageRow {
  date: string;
  session: SessionName;
  movement: string;
  suppressionReason: SuppressionReason;
  camouflageClass: CamouflageClass;
  marketMoveDirection: Direction | 'NONE';
  selectedModel: string | null;
  selectedDirection: Direction | null;
  selectedOutcome: string | null;
  selectedPnl: number | null;
  completeCandidateCount: number;
  activeRaids: string[];
  htfAlignment: 'supports' | 'mixed' | 'caution' | 'data_limited' | 'none';
  complexityScore: number;
  explanation: string;
}

interface CamouflageAuditReport {
  reportType: 'desk_playbook_selector_camouflage_audit';
  generatedAt: string;
  authority: {
    researchOnly: true;
    localOnly: true;
    readsSavedDiagnosticReportOnly: true;
    runsSetupScanner: false;
    postsDiscord: false;
    writesSupabase: false;
    changesTradingRules: false;
    changesCanExecute: false;
    doesNotPromoteExecution: true;
  };
  source: {
    dayByDayReportPath: string;
  };
  summary: {
    sourceWindows: number;
    suppressedWindows: number;
    camouflagedPositiveProof: number;
    directionConflictTrapsAvoided: number;
    storyWithoutFiveMinuteProof: number;
    candidatePresentButNotDriveRaid: number;
    cleanNoData: number;
    noiseOrUnresolved: number;
    positiveSuppressedPnl: number;
    currentRunArtifacts: number | null;
    staleArtifacts: number | null;
  };
  rows: CamouflageRow[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const DRIVE_RAID_MOVEMENTS = new Set([
  'bearish_drive',
  'bullish_drive',
  'high_raid_reversal_down',
  'low_raid_reversal_up',
]);

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function latestDayByDayReport(reportDir: string): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => name.startsWith('ytd-full-scanner-day-by-day-market-move-best-model-map-') && name.endsWith('.json'))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function directionForMovement(movement: string): Direction | null {
  if (movement === 'bearish_drive' || movement === 'high_raid_reversal_down') return 'SHORT';
  if (movement === 'bullish_drive' || movement === 'low_raid_reversal_up') return 'LONG';
  return null;
}

function isCompleteFiveMinuteProof(selected: SelectedCandidate | null): boolean {
  if (!selected) return false;
  return Number.isFinite(selected.entry)
    && Number.isFinite(selected.stop)
    && Number.isFinite(selected.target1)
    && Number.isFinite(selected.target2)
    && Number.isFinite(selected.riskPoints)
    && Boolean(selected.eventTime);
}

function suppressionReason(row: DayByDayRow): SuppressionReason | null {
  const expectedDirection = directionForMovement(row.movement);
  if (!DRIVE_RAID_MOVEMENTS.has(row.movement)) return 'not_drive_raid';
  if (!row.selected || !expectedDirection) return 'no_selected';
  if (row.selected.direction !== expectedDirection) return 'direction_fights';
  if (!isCompleteFiveMinuteProof(row.selected)) return 'incomplete_proof';
  return null;
}

function activeRaids(row: DayByDayRow): string[] {
  return Object.entries(row.raids || {})
    .filter(([, active]) => active)
    .map(([name]) => name);
}

function marketMoveDirection(row: DayByDayRow): Direction | 'NONE' {
  const movementDirection = directionForMovement(row.movement);
  if (movementDirection) return movementDirection;
  const stats = row.sessionStats;
  if (!stats || !Number.isFinite(stats.range) || stats.range <= 0) return 'NONE';
  const directionalQuality = Math.abs(stats.net) / stats.range;
  if (directionalQuality < 0.25) return 'NONE';
  return stats.net > 0 ? 'LONG' : 'SHORT';
}

function htfAlignment(row: DayByDayRow, direction: Direction | 'NONE'): CamouflageRow['htfAlignment'] {
  if (direction === 'NONE') return 'none';
  const trends = ['15m', '60m', '120m', '240m'].map((tf) => row.htf?.[tf]?.trend || 'data_limited');
  if (trends.some((trend) => trend === 'data_limited')) return 'data_limited';
  const wanted = direction === 'LONG' ? 'bullish' : 'bearish';
  const aligned = trends.filter((trend) => trend === wanted).length;
  const opposed = trends.filter((trend) => trend !== wanted && trend !== 'flat').length;
  if (aligned >= 3) return 'supports';
  if (opposed >= 3) return 'caution';
  return 'mixed';
}

function positiveOutcome(selected: SelectedCandidate | null): boolean {
  if (!selected?.outcome) return false;
  const status = selected.outcome.status || '';
  const pnl = selected.outcome.pnl ?? 0;
  return pnl > 0 || status.includes('t1') || status.includes('t2');
}

function losingOutcome(selected: SelectedCandidate | null): boolean {
  if (!selected?.outcome) return false;
  const status = selected.outcome.status || '';
  const pnl = selected.outcome.pnl ?? 0;
  return pnl < 0 || status.includes('stopped');
}

function complexityScore(row: DayByDayRow, moveDirection: Direction | 'NONE'): number {
  const stats = row.sessionStats;
  const directionalQuality = stats && stats.range > 0 ? Math.min(1, Math.abs(stats.net) / stats.range) : 0;
  const raidScore = Math.min(1, activeRaids(row).length / 2);
  const candidateScore = Math.min(1, row.completeCandidateCount / 5);
  const proofScore = isCompleteFiveMinuteProof(row.selected) ? 1 : 0;
  const htf = htfAlignment(row, moveDirection);
  const htfScore = htf === 'supports' ? 1 : htf === 'mixed' ? 0.5 : 0;
  return Number(((directionalQuality * 30) + (raidScore * 20) + (candidateScore * 20) + (proofScore * 20) + (htfScore * 10)).toFixed(2));
}

function classifyCamouflage(row: DayByDayRow, reason: SuppressionReason, moveDirection: Direction | 'NONE'): { kind: CamouflageClass; explanation: string } {
  if (!row.sessionStats && !row.selected) {
    return {
      kind: 'clean_no_data',
      explanation: 'Saved research has no session OHLC stats and no selected 5M candidate. Treat as no-data/no-trade, not hidden edge.',
    };
  }
  if ((reason === 'no_selected' || reason === 'incomplete_proof') && DRIVE_RAID_MOVEMENTS.has(row.movement)) {
    return {
      kind: 'story_without_5m_proof',
      explanation: 'Drive/raid story exists, but the saved selected candidate lacks complete scanner-owned 5M proof.',
    };
  }
  if (reason === 'direction_fights' && losingOutcome(row.selected)) {
    return {
      kind: 'direction_conflict_trap_avoided',
      explanation: 'Phase 1 blocked a selected candidate that fought the window direction and later lost.',
    };
  }
  if (reason === 'not_drive_raid' && row.selected && isCompleteFiveMinuteProof(row.selected) && positiveOutcome(row.selected)) {
    const directionMatchedMove = moveDirection !== 'NONE' && row.selected.direction === moveDirection;
    return {
      kind: directionMatchedMove ? 'camouflaged_positive_proof' : 'candidate_present_but_not_drive_raid',
      explanation: directionMatchedMove
        ? 'Complete positive selected 5M candidate aligned with the measured session move, but Phase 1 skipped it because the market-state label was not drive/raid.'
        : 'Complete positive selected 5M candidate existed, but the saved movement label was not drive/raid and the broader session move was not clearly aligned.',
    };
  }
  if (reason === 'not_drive_raid' && row.selected && isCompleteFiveMinuteProof(row.selected)) {
    return {
      kind: 'candidate_present_but_not_drive_raid',
      explanation: 'A complete selected 5M candidate existed, but Phase 1 intentionally required a drive/raid market-state label.',
    };
  }
  return {
    kind: 'noise_or_unresolved',
    explanation: 'Saved window does not prove a hidden executable move. Keep suppressed until a stronger scanner-owned replay package says otherwise.',
  };
}

function auditRow(row: DayByDayRow): CamouflageRow | null {
  const reason = suppressionReason(row);
  if (!reason) return null;
  const moveDirection = marketMoveDirection(row);
  const classification = classifyCamouflage(row, reason, moveDirection);
  return {
    date: row.date,
    session: row.session,
    movement: row.movement,
    suppressionReason: reason,
    camouflageClass: classification.kind,
    marketMoveDirection: moveDirection,
    selectedModel: row.selected?.setupType || null,
    selectedDirection: row.selected?.direction || null,
    selectedOutcome: row.selected?.outcome?.status || null,
    selectedPnl: Number.isFinite(row.selected?.outcome?.pnl) ? row.selected?.outcome?.pnl ?? null : null,
    completeCandidateCount: row.completeCandidateCount,
    activeRaids: activeRaids(row),
    htfAlignment: htfAlignment(row, moveDirection),
    complexityScore: complexityScore(row, moveDirection),
    explanation: classification.explanation,
  };
}

function buildMarkdown(report: Omit<CamouflageAuditReport, 'markdown'>): string {
  const cell = (value: string): string => value.replace(/\|/g, '\\|');
  const top = report.rows
    .filter((row) => row.camouflageClass === 'camouflaged_positive_proof' || row.camouflageClass === 'story_without_5m_proof')
    .sort((a, b) => b.complexityScore - a.complexityScore)
    .slice(0, 40)
    .map((row) => `| ${row.date} | ${row.session} | ${row.camouflageClass} | ${row.movement} | ${row.marketMoveDirection} | ${row.selectedModel || '-'} | ${row.selectedDirection || '-'} | ${row.selectedOutcome || '-'} | ${row.selectedPnl ?? '-'} | ${row.complexityScore} | ${cell(row.explanation)} |`)
    .join('\n');
  return [
    '# Desk Playbook Suppressed-Window Camouflage Audit',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    'Authority: research-only local audit. It reads saved diagnostic reports and does not run setupScanner, post Discord, write Supabase, change canExecute, promote execution, or change trading rules.',
    '',
    '## Summary',
    `- Suppressed windows: ${report.summary.suppressedWindows}.`,
    `- Camouflaged positive proof: ${report.summary.camouflagedPositiveProof}.`,
    `- Direction-conflict traps avoided: ${report.summary.directionConflictTrapsAvoided}.`,
    `- Story without 5M proof: ${report.summary.storyWithoutFiveMinuteProof}.`,
    `- Candidate present but not drive/raid: ${report.summary.candidatePresentButNotDriveRaid}.`,
    `- Clean no-data: ${report.summary.cleanNoData}.`,
    `- Noise or unresolved: ${report.summary.noiseOrUnresolved}.`,
    `- Positive suppressed selected-candidate P/L: ${report.summary.positiveSuppressedPnl}.`,
    '',
    '## Highest-Interest Rows',
    '',
    '| Date | Session | Class | Movement | Move Direction | Selected Model | Selected Direction | Outcome | P/L | Complexity | Explanation |',
    '|---|---|---|---|---|---|---|---|---|---|---|',
    top,
  ].join('\n');
}

export function buildDeskPlaybookCamouflageAuditReport(args: {
  dayByDayReportPath: string;
  report?: DayByDayReport;
}, generatedAt = new Date().toISOString()): CamouflageAuditReport {
  const sourceReport = args.report ?? JSON.parse(fs.readFileSync(args.dayByDayReportPath, 'utf8')) as DayByDayReport;
  const rows = sourceReport.rows
    .map(auditRow)
    .filter((row): row is CamouflageRow => Boolean(row));
  const summary: Omit<CamouflageAuditReport, 'markdown'>['summary'] = {
    sourceWindows: sourceReport.rows.length,
    suppressedWindows: rows.length,
    camouflagedPositiveProof: rows.filter((row) => row.camouflageClass === 'camouflaged_positive_proof').length,
    directionConflictTrapsAvoided: rows.filter((row) => row.camouflageClass === 'direction_conflict_trap_avoided').length,
    storyWithoutFiveMinuteProof: rows.filter((row) => row.camouflageClass === 'story_without_5m_proof').length,
    candidatePresentButNotDriveRaid: rows.filter((row) => row.camouflageClass === 'candidate_present_but_not_drive_raid').length,
    cleanNoData: rows.filter((row) => row.camouflageClass === 'clean_no_data').length,
    noiseOrUnresolved: rows.filter((row) => row.camouflageClass === 'noise_or_unresolved').length,
    positiveSuppressedPnl: Number(rows
      .filter((row) => row.camouflageClass === 'camouflaged_positive_proof' && row.selectedPnl !== null)
      .reduce((sum, row) => sum + (row.selectedPnl || 0), 0)
      .toFixed(2)),
    currentRunArtifacts: sourceReport.provenanceSummary?.currentRunCount ?? null,
    staleArtifacts: sourceReport.provenanceSummary?.staleCount ?? null,
  };
  const report: Omit<CamouflageAuditReport, 'markdown'> = {
    reportType: 'desk_playbook_selector_camouflage_audit',
    generatedAt,
    authority: {
      researchOnly: true,
      localOnly: true,
      readsSavedDiagnosticReportOnly: true,
      runsSetupScanner: false,
      postsDiscord: false,
      writesSupabase: false,
      changesTradingRules: false,
      changesCanExecute: false,
      doesNotPromoteExecution: true,
    },
    source: {
      dayByDayReportPath: args.dayByDayReportPath,
    },
    summary,
    rows,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

async function main(): Promise<void> {
  const reportDir = path.resolve(readFlag(process.argv, '--report-dir') || DEFAULT_REPORT_DIR);
  const dayByDayReportPath = path.resolve(readFlag(process.argv, '--day-by-day-report') || latestDayByDayReport(reportDir) || '');
  if (!dayByDayReportPath || !fs.existsSync(dayByDayReportPath)) {
    throw new Error(`Missing day-by-day report. Pass --day-by-day-report or place one in ${reportDir}.`);
  }
  const report = buildDeskPlaybookCamouflageAuditReport({ dayByDayReportPath });
  const stamp = Date.now();
  const jsonPath = path.join(reportDir, `desk-playbook-selector-camouflage-audit-${stamp}.json`);
  const mdPath = path.join(reportDir, `desk-playbook-selector-camouflage-audit-${stamp}.md`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(mdPath, report.markdown);
  console.log(JSON.stringify({
    status: 'pass',
    jsonPath,
    mdPath,
    summary: report.summary,
  }, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
