import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type Direction = 'LONG' | 'SHORT';
type OutcomeLabel = 't1_and_t2_hit' | 't1_hit_only' | 'stopped_before_t1' | 'no_fill' | 'no_target_or_stop_hit' | 'blocked';
type OutcomeBucket = 'winner' | 'loss' | 'unresolved' | 'blocked';

interface IntakeRow {
  intakeId: string;
  tradeDate: string;
  session: string;
  instrument: string;
  setupType: string;
  direction: Direction;
  firstSeenTime: string;
  entry: number;
  stop: number;
  target1: number;
  target2: number;
  riskPoints: number;
  sourceFile: string;
  triageDecision: string;
}

interface OhlcBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface ReplayRow {
  rowId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: Direction;
  triageDecision: string;
  riskPoints: number;
  outcomeBucket: OutcomeBucket;
  outcomeLabel: OutcomeLabel;
  resolvedOneMesPl: number | null;
  entryHitTime: string | null;
  blockers: string[];
}

interface GroupSummary {
  groupId: string;
  setupType: string;
  tradeDate: string | null;
  session: string | null;
  rows: number;
  winners: number;
  losses: number;
  unresolved: number;
  blocked: number;
  grossResolvedOneMesPl: number | null;
}

export interface UnifiedPositiveHeldLocalPreviewModelFamilyBroadReplayReport {
  reportType: 'unified_positive_held_local_preview_model_family_broad_replay';
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
    intakeTriagePath: string | null;
    auditDir: string;
    setupTypes: string[];
  };
  assumptions: {
    usesCompletedFiveMinuteTapesOnly: true;
    usesIntakeTriageRowsOnly: true;
    missingBarsAreNotInvented: true;
    outcomeIsResearchOnly: true;
    noLiveFilterInstalled: true;
    noRankBoostInstalled: true;
    noModelRemoved: true;
    livePromotionAllowed: false;
  };
  summary: {
    intakeRowsRead: number;
    targetRows: number;
    replayedRows: number;
    blockedRows: number;
    winners: number;
    losses: number;
    unresolved: number;
    grossResolvedOneMesPl: number | null;
    modelGroups: number;
    daySessionModelGroups: number;
    livePromotionAllowedRows: 0;
  };
  modelGroups: GroupSummary[];
  daySessionModelGroups: GroupSummary[];
  rows: ReplayRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_AUDIT_DIR = path.join(__dirname, 'discord-audit');
const DEFAULT_SETUP_TYPES = ['SweepMssFvgRetrace', 'AfterLunchDriveFvgContinuation'];
const POINT_VALUE = 5;

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

function authority(): UnifiedPositiveHeldLocalPreviewModelFamilyBroadReplayReport['authority'] {
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

function sum(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function loadTapeBars(auditDir: string, sourceFile: string): OhlcBar[] {
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

function crosses(row: Pick<IntakeRow, 'direction'>, bar: OhlcBar, level: number): boolean {
  return row.direction === 'LONG' ? bar.high >= level : bar.low <= level;
}

function hitsStop(row: Pick<IntakeRow, 'direction'>, bar: OhlcBar, stop: number): boolean {
  return row.direction === 'LONG' ? bar.low <= stop : bar.high >= stop;
}

function pointsToPl(direction: Direction, entry: number, exit: number): number {
  const points = direction === 'LONG' ? exit - entry : entry - exit;
  return round(points * POINT_VALUE);
}

function geometryBlocker(row: IntakeRow): string | null {
  if (row.direction === 'LONG') {
    if (row.stop >= row.entry) return 'directionally invalid long entry-to-stop geometry';
    if (row.target1 <= row.entry || row.target2 <= row.entry) return 'directionally invalid long target geometry';
  } else {
    if (row.stop <= row.entry) return 'directionally invalid short entry-to-stop geometry';
    if (row.target1 >= row.entry || row.target2 >= row.entry) return 'directionally invalid short target geometry';
  }
  return null;
}

function replayRow(row: IntakeRow, auditDir: string): ReplayRow {
  const bars = loadTapeBars(auditDir, row.sourceFile);
  const proofTime = normalizeTime(row.firstSeenTime) || row.firstSeenTime;
  const riskPoints = round(Math.abs(row.entry - row.stop));
  const invalidGeometry = geometryBlocker(row);
  const blockers = [
    bars.length === 0 ? 'missing local completed 5M tape bars' : null,
    riskPoints <= 0 ? 'missing positive risk' : null,
    invalidGeometry,
  ].filter((item): item is string => Boolean(item));
  if (blockers.length) {
    return {
      rowId: row.intakeId,
      tradeDate: row.tradeDate,
      session: row.session,
      setupType: row.setupType,
      direction: row.direction,
      triageDecision: row.triageDecision,
      riskPoints,
      outcomeBucket: 'blocked',
      outcomeLabel: 'blocked',
      resolvedOneMesPl: null,
      entryHitTime: null,
      blockers,
    };
  }
  const eligibleBars = bars.filter((bar) => timeMs(bar.time) >= timeMs(proofTime));
  const entryIndex = eligibleBars.findIndex((bar) => crosses(row, bar, row.entry));
  if (entryIndex < 0) {
    return {
      rowId: row.intakeId,
      tradeDate: row.tradeDate,
      session: row.session,
      setupType: row.setupType,
      direction: row.direction,
      triageDecision: row.triageDecision,
      riskPoints,
      outcomeBucket: 'unresolved',
      outcomeLabel: 'no_fill',
      resolvedOneMesPl: null,
      entryHitTime: null,
      blockers: [],
    };
  }
  const replayBars = eligibleBars.slice(entryIndex + 1);
  let stopTime: string | null = null;
  let t1Time: string | null = null;
  let t2Time: string | null = null;
  for (const bar of replayBars) {
    if (!stopTime && hitsStop(row, bar, row.stop)) stopTime = bar.time;
    if (!t1Time && crosses(row, bar, row.target1)) t1Time = bar.time;
    if (!t2Time && crosses(row, bar, row.target2)) t2Time = bar.time;
  }
  const stoppedFirst = Boolean(stopTime && (!t1Time || timeMs(stopTime) <= timeMs(t1Time)));
  const outcomeLabel: OutcomeLabel = stoppedFirst
    ? 'stopped_before_t1'
    : t2Time
      ? 't1_and_t2_hit'
      : t1Time
        ? 't1_hit_only'
        : 'no_target_or_stop_hit';
  const exit = outcomeLabel === 'stopped_before_t1'
    ? row.stop
    : outcomeLabel === 't1_and_t2_hit'
      ? row.target2
      : outcomeLabel === 't1_hit_only'
        ? row.target1
        : null;
  return {
    rowId: row.intakeId,
    tradeDate: row.tradeDate,
    session: row.session,
    setupType: row.setupType,
    direction: row.direction,
    triageDecision: row.triageDecision,
    riskPoints,
    outcomeBucket: exit === null ? 'unresolved' : outcomeLabel === 'stopped_before_t1' ? 'loss' : 'winner',
    outcomeLabel,
    resolvedOneMesPl: exit === null ? null : pointsToPl(row.direction, row.entry, exit),
    entryHitTime: eligibleBars[entryIndex].time,
    blockers: [],
  };
}

function readRows(report: Record<string, unknown> | null): IntakeRow[] {
  return Array.isArray(report?.rows) ? report.rows as IntakeRow[] : [];
}

function groupRows(rows: ReplayRow[], mode: 'model' | 'daySessionModel'): GroupSummary[] {
  const groups = new Map<string, ReplayRow[]>();
  for (const row of rows) {
    const key = mode === 'model'
      ? row.setupType
      : `${row.tradeDate}|${row.session}|${row.setupType}`;
    groups.set(key, [...(groups.get(key) || []), row]);
  }
  return [...groups.entries()].map(([groupId, group]) => {
    const [tradeDate, session, setupType] = mode === 'model' ? [null, null, groupId] : groupId.split('|');
    return {
      groupId,
      setupType,
      tradeDate,
      session,
      rows: group.length,
      winners: group.filter((row) => row.outcomeBucket === 'winner').length,
      losses: group.filter((row) => row.outcomeBucket === 'loss').length,
      unresolved: group.filter((row) => row.outcomeBucket === 'unresolved').length,
      blocked: group.filter((row) => row.outcomeBucket === 'blocked').length,
      grossResolvedOneMesPl: sum(group.map((row) => row.resolvedOneMesPl)),
    };
  }).sort((a, b) => a.groupId.localeCompare(b.groupId));
}

function parseSetupTypes(value: string | null): string[] {
  const parsed = (value || '').split(',').map((item) => item.trim()).filter(Boolean);
  return parsed.length ? parsed : DEFAULT_SETUP_TYPES;
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewModelFamilyBroadReplayReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Model-Family Broad Replay',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only broad model-family replay from intake triage and completed 5M decision tapes. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change scanner behavior, change trading logic, change canExecute, install rank boosts/penalties, remove models, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Setup types: ${report.source.setupTypes.join(', ')}.`,
    `- Intake rows read: ${report.summary.intakeRowsRead}.`,
    `- Target rows: ${report.summary.targetRows}.`,
    `- Replayed rows: ${report.summary.replayedRows}.`,
    `- Blocked rows: ${report.summary.blockedRows}.`,
    `- W/L/U: ${report.summary.winners}/${report.summary.losses}/${report.summary.unresolved}.`,
    `- Gross resolved one-MES P/L: ${report.summary.grossResolvedOneMesPl ?? '-'}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    '',
    '## Model Groups',
    '| Model | Rows | W/L/U/B | P/L |',
    '|---|---:|---|---:|',
    ...report.modelGroups.map((row) => `| ${escapeTable(row.setupType)} | ${row.rows} | ${row.winners}/${row.losses}/${row.unresolved}/${row.blocked} | ${row.grossResolvedOneMesPl ?? '-'} |`),
    '',
    '## Day Session Model Groups',
    '| Date | Session | Model | Rows | W/L/U/B | P/L |',
    '|---|---|---|---:|---|---:|',
    ...report.daySessionModelGroups.map((row) => `| ${row.tradeDate || '-'} | ${row.session || '-'} | ${escapeTable(row.setupType)} | ${row.rows} | ${row.winners}/${row.losses}/${row.unresolved}/${row.blocked} | ${row.grossResolvedOneMesPl ?? '-'} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewModelFamilyBroadReplayReport(args: {
  reportDir: string;
  intakeTriagePath: string | null;
  intakeTriageReport: Record<string, unknown> | null;
  auditDir: string;
  setupTypes?: string[];
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewModelFamilyBroadReplayReport {
  const setupTypes = args.setupTypes?.length ? args.setupTypes : DEFAULT_SETUP_TYPES;
  const setupSet = new Set(setupTypes);
  const intakeRows = readRows(args.intakeTriageReport);
  const targetRows = intakeRows.filter((row) => setupSet.has(row.setupType) && row.triageDecision !== 'already_processed_reference');
  const rows = targetRows.map((row) => replayRow(row, args.auditDir));
  const modelGroups = groupRows(rows, 'model');
  const daySessionModelGroups = groupRows(rows, 'daySessionModel');
  const blockers = [
    !args.intakeTriagePath ? 'missing intake triage path' : null,
    !args.intakeTriageReport ? 'missing intake triage report' : null,
    intakeRows.length === 0 ? 'intake triage report has no rows' : null,
    targetRows.length === 0 ? 'no target setup rows found' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<UnifiedPositiveHeldLocalPreviewModelFamilyBroadReplayReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_model_family_broad_replay',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      intakeTriagePath: args.intakeTriagePath,
      auditDir: args.auditDir,
      setupTypes,
    },
    assumptions: {
      usesCompletedFiveMinuteTapesOnly: true,
      usesIntakeTriageRowsOnly: true,
      missingBarsAreNotInvented: true,
      outcomeIsResearchOnly: true,
      noLiveFilterInstalled: true,
      noRankBoostInstalled: true,
      noModelRemoved: true,
      livePromotionAllowed: false,
    },
    summary: {
      intakeRowsRead: intakeRows.length,
      targetRows: targetRows.length,
      replayedRows: rows.length,
      blockedRows: rows.filter((row) => row.outcomeBucket === 'blocked').length,
      winners: rows.filter((row) => row.outcomeBucket === 'winner').length,
      losses: rows.filter((row) => row.outcomeBucket === 'loss').length,
      unresolved: rows.filter((row) => row.outcomeBucket === 'unresolved').length,
      grossResolvedOneMesPl: sum(rows.map((row) => row.resolvedOneMesPl)),
      modelGroups: modelGroups.length,
      daySessionModelGroups: daySessionModelGroups.length,
      livePromotionAllowedRows: 0,
    },
    modelGroups,
    daySessionModelGroups,
    rows,
    blockers,
    recommendations: blockers.length
      ? ['Do not use broad model-family replay until all target rows replay from local completed 5M tape.']
      : [
        'Use this replay only as research evidence for model-family validation and next package selection.',
        'Do not install boosts, penalties, hard filters, canExecute changes, Discord changes, Supabase writes, bridge behavior, model removal, or entry/stop/target/risk changes from this report.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewModelFamilyBroadReplayReport(
  report: UnifiedPositiveHeldLocalPreviewModelFamilyBroadReplayReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-model-family-broad-replay-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewModelFamilyBroadReplayCli(args = process.argv.slice(2)): void {
  const outDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const auditDir = readFlag(args, '--audit-dir') || DEFAULT_AUDIT_DIR;
  const intakeTriagePath = readFlag(args, '--intake-triage') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-intake-triage-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewModelFamilyBroadReplayReport({
    reportDir: outDir,
    intakeTriagePath,
    intakeTriageReport: intakeTriagePath && fs.existsSync(intakeTriagePath)
      ? JSON.parse(fs.readFileSync(intakeTriagePath, 'utf8')) as Record<string, unknown>
      : null,
    auditDir,
    setupTypes: parseSetupTypes(readFlag(args, '--setup-types')),
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewModelFamilyBroadReplayReport(report, outDir);
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
    runUnifiedPositiveHeldLocalPreviewModelFamilyBroadReplayCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
