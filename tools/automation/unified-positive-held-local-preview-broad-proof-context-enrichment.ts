import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UnifiedPositiveHeldLocalPreviewBroadRiskCapValidationReport } from './unified-positive-held-local-preview-broad-risk-cap-validation';
import type { UnifiedPositiveHeldLocalPreviewIntakeTriageReport } from './unified-positive-held-local-preview-intake-triage';

type BroadRow = UnifiedPositiveHeldLocalPreviewBroadRiskCapValidationReport['rows'][number];
type IntakeRow = UnifiedPositiveHeldLocalPreviewIntakeTriageReport['rows'][number];
type Direction = 'LONG' | 'SHORT';

interface OhlcBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface EnrichedRow {
  rowId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: Direction;
  proofState: string | null;
  riskQuality: string | null;
  occurrences: number | null;
  triageDecision: string;
  outcomeBucket: BroadRow['outcomeBucket'];
  outcomeLabel: BroadRow['outcomeLabel'];
  resolvedOneMesPl: number | null;
  riskPoints: number;
  proofTime: string | null;
  entryHitTime: string | null;
  proofToEntryMinutes: number | null;
  sourceFile: string | null;
  completedBarsAfterProof: number;
  mfePoints: number | null;
  maePoints: number | null;
  mfeR: number | null;
  maeR: number | null;
  issueTags: string[];
  blockers: string[];
}

interface GroupSummary {
  groupId: string;
  setupType: string;
  proofState: string;
  rows: number;
  winners: number;
  losses: number;
  unresolved: number;
  blocked: number;
  grossResolvedOneMesPl: number | null;
  avgProofToEntryMinutes: number | null;
  avgWinnerMfeR: number | null;
  avgLossMfeR: number | null;
  avgWinnerMaeR: number | null;
  avgLossMaeR: number | null;
  sameBarEntryWinners: number;
  sameBarEntryLosses: number;
  staleEntryOver30MinuteWinners: number;
  staleEntryOver30MinuteLosses: number;
  highMaeLosses: number;
  lowMfeLosses: number;
}

export interface UnifiedPositiveHeldLocalPreviewBroadProofContextEnrichmentReport {
  reportType: 'unified_positive_held_local_preview_broad_proof_context_enrichment';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: {
    readOnly: true;
    localOnly: true;
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
    changesDiscordPosting: false;
    changesAppRuntime: false;
  };
  source: {
    reportDir: string;
    broadRiskCapValidationPath: string | null;
    intakeTriagePath: string | null;
    auditDir: string;
  };
  assumptions: {
    usesCompletedFiveMinuteTapesOnly: true;
    enrichmentIsResearchOnly: true;
    missingBarsAreNotInvented: true;
    unresolvedRowsAreNotWinsOrLosses: true;
    staleEntryThresholdMinutes: 30;
    livePromotionAllowed: false;
  };
  summary: {
    sourceRows: number;
    enrichedRows: number;
    blockedRows: number;
    winners: number;
    losses: number;
    unresolved: number;
    grossResolvedOneMesPl: number | null;
    groupSummaries: number;
    livePromotionAllowedRows: 0;
  };
  groups: GroupSummary[];
  rows: EnrichedRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_AUDIT_DIR = path.join(__dirname, 'discord-audit');
const STALE_ENTRY_THRESHOLD_MINUTES = 30;

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  const matches = fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return matches[0] || null;
}

function authority(): UnifiedPositiveHeldLocalPreviewBroadProofContextEnrichmentReport['authority'] {
  return {
    readOnly: true,
    localOnly: true,
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
    changesDiscordPosting: false,
    changesAppRuntime: false,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function numberOrNull(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeTime(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  return value.trim().replace(/\.\d+/, '').replace(/(?:Z|[+-]\d{2}:\d{2})$/, '').slice(0, 19);
}

function normalizeBar(value: unknown): OhlcBar | null {
  const record = asRecord(value);
  const time = normalizeTime(record.time ?? record.candle_time_et ?? record.timestamp);
  const open = numberOrNull(record.open);
  const high = numberOrNull(record.high);
  const low = numberOrNull(record.low);
  const close = numberOrNull(record.close);
  if (!time || open === null || high === null || low === null || close === null) return null;
  return { time, open, high, low, close };
}

function timeMs(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function avg(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((sum, value) => sum + value, 0) / numeric.length) : null;
}

function sum(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function toR(points: number | null, riskPoints: number): number | null {
  return points === null || riskPoints <= 0 ? null : round(points / riskPoints);
}

function loadTapeBars(auditDir: string, sourceFile: string | null): OhlcBar[] {
  if (!sourceFile) return [];
  const filePath = path.isAbsolute(sourceFile) ? sourceFile : path.join(auditDir, sourceFile);
  if (!fs.existsSync(filePath)) return [];
  const tape = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>;
  const byTime = new Map<string, OhlcBar>();
  for (const event of Object.values(asRecord(tape.events))) {
    const bar = normalizeBar(asRecord(event).completed5m);
    if (bar) byTime.set(bar.time, bar);
  }
  return [...byTime.values()].sort((a, b) => timeMs(a.time) - timeMs(b.time));
}

function crosses(direction: Direction, bar: OhlcBar, level: number): boolean {
  return direction === 'LONG' ? bar.high >= level : bar.low <= level;
}

function proofToEntryMinutes(proofTime: string | null, entryHitTime: string | null): number | null {
  if (!proofTime || !entryHitTime) return null;
  const minutes = (timeMs(entryHitTime) - timeMs(proofTime)) / 60000;
  return Number.isFinite(minutes) ? round(minutes) : null;
}

function pathExcursions(args: {
  row: BroadRow;
  intake: IntakeRow | null;
  bars: OhlcBar[];
}): { completedBarsAfterProof: number; mfePoints: number | null; maePoints: number | null; blockers: string[] } {
  const proofTime = normalizeTime(args.intake?.firstSeenTime) || args.intake?.firstSeenTime || null;
  const eligibleBars = proofTime ? args.bars.filter((bar) => timeMs(bar.time) >= timeMs(proofTime)) : args.bars;
  const blockers = [
    !args.intake ? 'missing matching intake triage row' : null,
    !proofTime ? 'missing proof time' : null,
    args.bars.length === 0 ? 'missing local completed 5M tape bars' : null,
  ].filter((item): item is string => Boolean(item));
  if (blockers.length || !args.intake) {
    return { completedBarsAfterProof: eligibleBars.length, mfePoints: null, maePoints: null, blockers };
  }
  const entryIndex = eligibleBars.findIndex((bar) => crosses(args.row.direction as Direction, bar, args.intake.entry));
  if (entryIndex < 0) {
    return { completedBarsAfterProof: eligibleBars.length, mfePoints: null, maePoints: null, blockers };
  }
  const replayBars = eligibleBars.slice(entryIndex + 1);
  if (replayBars.length === 0) {
    return { completedBarsAfterProof: eligibleBars.length, mfePoints: null, maePoints: null, blockers: [] };
  }
  const highs = replayBars.map((bar) => bar.high);
  const lows = replayBars.map((bar) => bar.low);
  const mfePoints = args.row.direction === 'LONG'
    ? Math.max(...highs) - args.intake.entry
    : args.intake.entry - Math.min(...lows);
  const maePoints = args.row.direction === 'LONG'
    ? args.intake.entry - Math.min(...lows)
    : Math.max(...highs) - args.intake.entry;
  return {
    completedBarsAfterProof: eligibleBars.length,
    mfePoints: round(Math.max(0, mfePoints)),
    maePoints: round(Math.max(0, maePoints)),
    blockers,
  };
}

function issueTags(row: EnrichedRow): string[] {
  const tags = [
    row.outcomeBucket === 'winner' ? 'winner' : null,
    row.outcomeBucket === 'loss' ? 'stopped_before_t1' : null,
    row.outcomeBucket === 'unresolved' ? row.outcomeLabel : null,
    row.proofState ? `proof_${row.proofState}` : null,
    row.riskQuality ? `risk_${row.riskQuality}` : null,
    row.proofToEntryMinutes === 0 ? 'same_bar_entry' : null,
    row.proofToEntryMinutes !== null && row.proofToEntryMinutes > STALE_ENTRY_THRESHOLD_MINUTES ? 'stale_entry_over_30m' : null,
    row.maeR !== null && row.maeR >= 1 ? 'mae_at_or_over_1r' : null,
    row.mfeR !== null && row.mfeR < 1 ? 'mfe_under_1r' : null,
    row.entryHitTime && row.mfeR === null && row.maeR === null ? 'post_entry_path_unavailable' : null,
  ].filter((tag): tag is string => Boolean(tag));
  return tags.length ? tags : ['clean_research_row'];
}

function buildRow(row: BroadRow, intake: IntakeRow | null, auditDir: string): EnrichedRow {
  const sourceFile = intake?.sourceFile || null;
  const proofTime = normalizeTime(intake?.firstSeenTime) || intake?.firstSeenTime || null;
  const minutes = proofToEntryMinutes(proofTime, row.entryHitTime);
  const bars = loadTapeBars(auditDir, sourceFile);
  const path = pathExcursions({ row, intake, bars });
  const enriched: EnrichedRow = {
    rowId: row.rowId,
    tradeDate: row.tradeDate,
    session: row.session,
    setupType: row.setupType,
    direction: row.direction as Direction,
    proofState: intake?.proofState || null,
    riskQuality: intake?.riskQuality || null,
    occurrences: typeof intake?.occurrences === 'number' ? intake.occurrences : null,
    triageDecision: row.triageDecision,
    outcomeBucket: row.outcomeBucket,
    outcomeLabel: row.outcomeLabel,
    resolvedOneMesPl: row.resolvedOneMesPl,
    riskPoints: row.riskPoints,
    proofTime,
    entryHitTime: row.entryHitTime,
    proofToEntryMinutes: minutes,
    sourceFile,
    completedBarsAfterProof: path.completedBarsAfterProof,
    mfePoints: path.mfePoints,
    maePoints: path.maePoints,
    mfeR: toR(path.mfePoints, row.riskPoints),
    maeR: toR(path.maePoints, row.riskPoints),
    issueTags: [],
    blockers: path.blockers,
  };
  enriched.issueTags = issueTags(enriched);
  return enriched;
}

function groupRows(rows: EnrichedRow[]): GroupSummary[] {
  const groups = new Map<string, EnrichedRow[]>();
  for (const row of rows) {
    const proofState = row.proofState || 'unknown_proof';
    const key = `${row.setupType}|${proofState}`;
    groups.set(key, [...(groups.get(key) || []), row]);
  }
  return [...groups.entries()]
    .map(([key, group]) => {
      const [setupType, proofState] = key.split('|');
      const winners = group.filter((row) => row.outcomeBucket === 'winner');
      const losses = group.filter((row) => row.outcomeBucket === 'loss');
      return {
        groupId: key,
        setupType,
        proofState,
        rows: group.length,
        winners: winners.length,
        losses: losses.length,
        unresolved: group.filter((row) => row.outcomeBucket === 'unresolved').length,
        blocked: group.filter((row) => row.blockers.length > 0).length,
        grossResolvedOneMesPl: sum(group.map((row) => row.resolvedOneMesPl)),
        avgProofToEntryMinutes: avg(group.map((row) => row.proofToEntryMinutes)),
        avgWinnerMfeR: avg(winners.map((row) => row.mfeR)),
        avgLossMfeR: avg(losses.map((row) => row.mfeR)),
        avgWinnerMaeR: avg(winners.map((row) => row.maeR)),
        avgLossMaeR: avg(losses.map((row) => row.maeR)),
        sameBarEntryWinners: winners.filter((row) => row.issueTags.includes('same_bar_entry')).length,
        sameBarEntryLosses: losses.filter((row) => row.issueTags.includes('same_bar_entry')).length,
        staleEntryOver30MinuteWinners: winners.filter((row) => row.issueTags.includes('stale_entry_over_30m')).length,
        staleEntryOver30MinuteLosses: losses.filter((row) => row.issueTags.includes('stale_entry_over_30m')).length,
        highMaeLosses: losses.filter((row) => row.issueTags.includes('mae_at_or_over_1r')).length,
        lowMfeLosses: losses.filter((row) => row.issueTags.includes('mfe_under_1r')).length,
      };
    })
    .sort((a, b) => (b.grossResolvedOneMesPl ?? 0) - (a.grossResolvedOneMesPl ?? 0) || b.rows - a.rows);
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewBroadProofContextEnrichmentReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Broad Proof/Context Enrichment',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only proof/context enrichment. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, change entry/stop/target/risk math, or change Discord posting behavior.',
    '',
    '## Summary',
    `- Source rows: ${report.summary.sourceRows}.`,
    `- Enriched rows: ${report.summary.enrichedRows}.`,
    `- Blocked rows: ${report.summary.blockedRows}.`,
    `- Winners: ${report.summary.winners}.`,
    `- Losses: ${report.summary.losses}.`,
    `- Unresolved: ${report.summary.unresolved}.`,
    `- Gross resolved one-MES P/L: ${report.summary.grossResolvedOneMesPl ?? 'not available'}.`,
    `- Group summaries: ${report.summary.groupSummaries}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Groups',
    '| Group | Rows | W/L/U/B | P/L | Avg Proof->Entry | Avg MFE R W/L | Avg MAE R W/L | Same-Bar W/L | Stale>30 W/L | High-MAE Losses | Low-MFE Losses |',
    '|---|---:|---|---:|---:|---|---|---|---|---:|---:|',
    ...report.groups.map((row) => `| ${escapeTable(row.groupId)} | ${row.rows} | ${row.winners}/${row.losses}/${row.unresolved}/${row.blocked} | ${row.grossResolvedOneMesPl ?? '-'} | ${row.avgProofToEntryMinutes ?? '-'} | ${row.avgWinnerMfeR ?? '-'}/${row.avgLossMfeR ?? '-'} | ${row.avgWinnerMaeR ?? '-'}/${row.avgLossMaeR ?? '-'} | ${row.sameBarEntryWinners}/${row.sameBarEntryLosses} | ${row.staleEntryOver30MinuteWinners}/${row.staleEntryOver30MinuteLosses} | ${row.highMaeLosses} | ${row.lowMfeLosses} |`),
    '',
    '## Sample Rows',
    '| Row | Setup | Session | Side | Proof | Bucket | P/L | Proof->Entry | Risk | MFE R | MAE R | Tags | Blockers |',
    '|---|---|---|---|---|---|---:|---:|---:|---:|---:|---|---|',
    ...report.rows.slice(0, 80).map((row) => `| ${escapeTable(row.rowId)} | ${escapeTable(row.setupType)} | ${escapeTable(row.session)} | ${row.direction} | ${escapeTable(row.proofState ?? '-')} | ${row.outcomeBucket} | ${row.resolvedOneMesPl ?? '-'} | ${row.proofToEntryMinutes ?? '-'} | ${row.riskPoints} | ${row.mfeR ?? '-'} | ${row.maeR ?? '-'} | ${escapeTable(row.issueTags.join(', '))} | ${escapeTable(row.blockers.join(', ') || '-')} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewBroadProofContextEnrichmentReport(args: {
  reportDir: string;
  broadRiskCapValidationPath: string | null;
  broadRiskCapValidationReport: UnifiedPositiveHeldLocalPreviewBroadRiskCapValidationReport | null;
  intakeTriagePath: string | null;
  intakeTriageReport: UnifiedPositiveHeldLocalPreviewIntakeTriageReport | null;
  auditDir: string;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewBroadProofContextEnrichmentReport {
  const sourceRows = args.broadRiskCapValidationReport?.rows || [];
  const intakeById = new Map<string, IntakeRow>((args.intakeTriageReport?.rows || []).map((row) => [row.intakeId, row]));
  const rows = sourceRows.map((row) => buildRow(row, intakeById.get(row.rowId) || null, args.auditDir));
  const groups = groupRows(rows);
  const blockers = [
    !args.broadRiskCapValidationPath ? 'missing broad risk-cap validation path' : null,
    !args.broadRiskCapValidationReport ? 'missing broad risk-cap validation report' : null,
    args.broadRiskCapValidationReport && args.broadRiskCapValidationReport.status !== 'pass' ? `broad risk-cap validation status ${args.broadRiskCapValidationReport.status}` : null,
    !args.intakeTriagePath ? 'missing intake triage path' : null,
    !args.intakeTriageReport ? 'missing intake triage report' : null,
    sourceRows.length === 0 ? 'no broad validation source rows found' : null,
    rows.some((row) => row.blockers.length > 0) ? 'one or more rows could not be fully enriched from local intake/tape data' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<UnifiedPositiveHeldLocalPreviewBroadProofContextEnrichmentReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_broad_proof_context_enrichment',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      broadRiskCapValidationPath: args.broadRiskCapValidationPath,
      intakeTriagePath: args.intakeTriagePath,
      auditDir: args.auditDir,
    },
    assumptions: {
      usesCompletedFiveMinuteTapesOnly: true,
      enrichmentIsResearchOnly: true,
      missingBarsAreNotInvented: true,
      unresolvedRowsAreNotWinsOrLosses: true,
      staleEntryThresholdMinutes: STALE_ENTRY_THRESHOLD_MINUTES,
      livePromotionAllowed: false,
    },
    summary: {
      sourceRows: sourceRows.length,
      enrichedRows: rows.length,
      blockedRows: rows.filter((row) => row.blockers.length > 0).length,
      winners: rows.filter((row) => row.outcomeBucket === 'winner').length,
      losses: rows.filter((row) => row.outcomeBucket === 'loss').length,
      unresolved: rows.filter((row) => row.outcomeBucket === 'unresolved').length,
      grossResolvedOneMesPl: sum(rows.map((row) => row.resolvedOneMesPl)),
      groupSummaries: groups.length,
      livePromotionAllowedRows: 0,
    },
    groups,
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Do not use proof/context enrichment until all rows join to local intake and completed 5M tape data.']
      : [
        'Use this enrichment only to choose the next research package; it is not a live filter or rank overlay.',
        'Compare loss rows with high MAE, low MFE, stale entry, same-bar entry, and proof-state clusters before any scanner-visible behavior change.',
        'No live promotion, Discord posting, Supabase write, canExecute change, model removal, or trading-rule change is recommended from this phase.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewBroadProofContextEnrichmentReport(
  report: UnifiedPositiveHeldLocalPreviewBroadProofContextEnrichmentReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-broad-proof-context-enrichment-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewBroadProofContextEnrichmentCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const auditDir = readFlag(args, '--audit-dir') || DEFAULT_AUDIT_DIR;
  const broadRiskCapValidationPath = readFlag(args, '--broad-risk-cap-validation') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-broad-risk-cap-validation-\d+\.json$/);
  const intakeTriagePath = readFlag(args, '--intake-triage') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-intake-triage-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewBroadProofContextEnrichmentReport({
    reportDir: outDir,
    broadRiskCapValidationPath,
    broadRiskCapValidationReport: broadRiskCapValidationPath && fs.existsSync(broadRiskCapValidationPath)
      ? JSON.parse(fs.readFileSync(broadRiskCapValidationPath, 'utf8')) as UnifiedPositiveHeldLocalPreviewBroadRiskCapValidationReport
      : null,
    intakeTriagePath,
    intakeTriageReport: intakeTriagePath && fs.existsSync(intakeTriagePath)
      ? JSON.parse(fs.readFileSync(intakeTriagePath, 'utf8')) as UnifiedPositiveHeldLocalPreviewIntakeTriageReport
      : null,
    auditDir,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewBroadProofContextEnrichmentReport(report, outDir);
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runUnifiedPositiveHeldLocalPreviewBroadProofContextEnrichmentCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
