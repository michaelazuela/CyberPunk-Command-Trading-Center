import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface CliOptions {
  beforeArtifact: string;
  afterArtifact: string;
  outDir: string;
  json: boolean;
}

interface CandidateShape {
  setupType?: string;
  direction?: string;
  detectedStatus?: string;
  executionStatus?: string;
  blockReason?: string | null;
  entry?: number | null;
  stop?: number | null;
  target1?: number | null;
  target2?: number | null;
  riskPoints?: number | null;
}

interface ArtifactEventShape {
  eventTime?: string;
  date?: string;
  session?: string;
  setupCandidateStatus?: {
    statuses?: CandidateShape[];
  };
}

interface ArtifactShape {
  reportType?: string;
  generatedAt?: string;
  instrument?: string;
  startDate?: string;
  endDate?: string;
  events?: Record<string, ArtifactEventShape>;
}

interface ComparisonRow {
  eventTime: string;
  date: string;
  session: string;
  setupType: string;
  direction: string;
  beforeDetectedStatus: string | null;
  afterDetectedStatus: string | null;
  beforeExecutionStatus: string | null;
  afterExecutionStatus: string | null;
  beforeBlockReason: string | null;
  afterBlockReason: string | null;
  beforeEntry: number | null;
  afterEntry: number | null;
  beforeStop: number | null;
  afterStop: number | null;
  beforeTarget1: number | null;
  afterTarget1: number | null;
  beforeTarget2: number | null;
  afterTarget2: number | null;
  beforeRiskPoints: number | null;
  afterRiskPoints: number | null;
  changed: boolean;
}

export interface RawOhlcScannerArtifactComparisonReport {
  reportType: 'raw_ohlc_scanner_artifact_comparison';
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
    changesTradingRules: false;
    changesCanExecute: false;
    changesBridgeBehavior: false;
    changesScannerBehavior: false;
    changesDiscordPosting: false;
  };
  source: {
    beforeArtifact: string;
    afterArtifact: string;
  };
  summary: {
    beforeEvents: number;
    afterEvents: number;
    joinedRows: number;
    changedRows: number;
    invalidGeometryBeforeRows: number;
    invalidGeometryAfterRows: number;
    executableBeforeRows: number;
    executableAfterRows: number;
    conditionalBeforeRows: number;
    conditionalAfterRows: number;
    blockedBeforeRows: number;
    blockedAfterRows: number;
    livePromotionAllowedRows: 0;
    recommendation: 'use_repaired_artifact_for_replay_chain' | 'investigate_artifact_drift';
  };
  rows: ComparisonRow[];
  blockers: string[];
  recommendations: string[];
  reportMarkdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

export function parseRawOhlcScannerArtifactComparisonArgs(args = process.argv.slice(2)): CliOptions {
  const beforeArtifact = readFlag(args, '--before-artifact');
  const afterArtifact = readFlag(args, '--after-artifact');
  if (!beforeArtifact) throw new Error('--before-artifact is required.');
  if (!afterArtifact) throw new Error('--after-artifact is required.');
  return {
    beforeArtifact,
    afterArtifact,
    outDir: readFlag(args, '--out-dir') || DEFAULT_OUT_DIR,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function rowKey(eventTime: string, candidate: CandidateShape): string {
  return [
    eventTime,
    candidate.setupType || '',
    candidate.direction || '',
  ].join('|');
}

function flattenRows(artifact: ArtifactShape): Map<string, { event: ArtifactEventShape; candidate: CandidateShape }> {
  const rows = new Map<string, { event: ArtifactEventShape; candidate: CandidateShape }>();
  for (const [eventTime, event] of Object.entries(artifact.events || {})) {
    for (const candidate of event.setupCandidateStatus?.statuses || []) {
      if (!candidate.setupType || !candidate.direction) continue;
      rows.set(rowKey(eventTime, candidate), { event: { ...event, eventTime }, candidate });
    }
  }
  return rows;
}

function sameNumber(a: number | null, b: number | null): boolean {
  return a === b || (a !== null && b !== null && Math.abs(a - b) < 0.00001);
}

function candidateChanged(before: CandidateShape | null, after: CandidateShape | null): boolean {
  if (!before || !after) return true;
  return before.detectedStatus !== after.detectedStatus ||
    before.executionStatus !== after.executionStatus ||
    (before.blockReason || null) !== (after.blockReason || null) ||
    !sameNumber(numberOrNull(before.entry), numberOrNull(after.entry)) ||
    !sameNumber(numberOrNull(before.stop), numberOrNull(after.stop)) ||
    !sameNumber(numberOrNull(before.target1), numberOrNull(after.target1)) ||
    !sameNumber(numberOrNull(before.target2), numberOrNull(after.target2)) ||
    !sameNumber(numberOrNull(before.riskPoints), numberOrNull(after.riskPoints));
}

function isInvalidGeometry(candidate: CandidateShape): boolean {
  return candidate.executionStatus === 'Blocked' && candidate.blockReason === 'InvalidStopLocation';
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactComparisonReport, 'reportMarkdown'>): string {
  const lines = [
    '# Raw OHLC Scanner Artifact Comparison',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only artifact comparison. It reads saved scanner artifact packages only and does not run setupScanner, post Discord, write Supabase, read live bridge data, change trading rules, change canExecute, or change scanner behavior.',
    '',
    '## Summary',
    `- Before/after events: ${report.summary.beforeEvents}/${report.summary.afterEvents}.`,
    `- Joined rows: ${report.summary.joinedRows}.`,
    `- Changed rows: ${report.summary.changedRows}.`,
    `- Invalid geometry before/after: ${report.summary.invalidGeometryBeforeRows}/${report.summary.invalidGeometryAfterRows}.`,
    `- Executable before/after: ${report.summary.executableBeforeRows}/${report.summary.executableAfterRows}.`,
    `- Conditional before/after: ${report.summary.conditionalBeforeRows}/${report.summary.conditionalAfterRows}.`,
    `- Blocked before/after: ${report.summary.blockedBeforeRows}/${report.summary.blockedAfterRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Changed Rows',
    '| Time | Session | Setup | Direction | Before | After | Entry | Stop | T1 | T2 | Risk |',
    '|---|---|---|---|---|---|---:|---:|---:|---:|---:|',
  ];
  for (const row of report.rows.filter((item) => item.changed).slice(0, 60)) {
    lines.push(`| ${row.eventTime} | ${row.session} | ${row.setupType} | ${row.direction} | ${row.beforeExecutionStatus || '-'}:${row.beforeBlockReason || '-'} | ${row.afterExecutionStatus || '-'}:${row.afterBlockReason || '-'} | ${row.beforeEntry ?? '-'} -> ${row.afterEntry ?? '-'} | ${row.beforeStop ?? '-'} -> ${row.afterStop ?? '-'} | ${row.beforeTarget1 ?? '-'} -> ${row.afterTarget1 ?? '-'} | ${row.beforeTarget2 ?? '-'} -> ${row.afterTarget2 ?? '-'} | ${row.beforeRiskPoints ?? '-'} -> ${row.afterRiskPoints ?? '-'} |`);
  }
  lines.push('', '## Blockers');
  lines.push(...(report.blockers.length ? report.blockers.map((item) => `- ${item}`) : ['- None.']));
  lines.push('', '## Recommendations');
  lines.push(...report.recommendations.map((item) => `- ${item}`));
  return lines.join('\n');
}

export function buildRawOhlcScannerArtifactComparisonReport(args: {
  beforeArtifactPath: string;
  beforeArtifact: ArtifactShape | null;
  afterArtifactPath: string;
  afterArtifact: ArtifactShape | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactComparisonReport {
  const beforeRows = args.beforeArtifact ? flattenRows(args.beforeArtifact) : new Map<string, { event: ArtifactEventShape; candidate: CandidateShape }>();
  const afterRows = args.afterArtifact ? flattenRows(args.afterArtifact) : new Map<string, { event: ArtifactEventShape; candidate: CandidateShape }>();
  const keys = Array.from(new Set([...beforeRows.keys(), ...afterRows.keys()])).sort();
  const rows = keys.map((key) => {
    const before = beforeRows.get(key) || null;
    const after = afterRows.get(key) || null;
    const event = after?.event || before?.event || {};
    const candidate = after?.candidate || before?.candidate || {};
    return {
      eventTime: stringOrNull(event.eventTime) || key.split('|')[0],
      date: stringOrNull(event.date) || '',
      session: stringOrNull(event.session) || '',
      setupType: candidate.setupType || key.split('|')[1] || '',
      direction: candidate.direction || key.split('|')[2] || '',
      beforeDetectedStatus: stringOrNull(before?.candidate.detectedStatus),
      afterDetectedStatus: stringOrNull(after?.candidate.detectedStatus),
      beforeExecutionStatus: stringOrNull(before?.candidate.executionStatus),
      afterExecutionStatus: stringOrNull(after?.candidate.executionStatus),
      beforeBlockReason: stringOrNull(before?.candidate.blockReason),
      afterBlockReason: stringOrNull(after?.candidate.blockReason),
      beforeEntry: numberOrNull(before?.candidate.entry),
      afterEntry: numberOrNull(after?.candidate.entry),
      beforeStop: numberOrNull(before?.candidate.stop),
      afterStop: numberOrNull(after?.candidate.stop),
      beforeTarget1: numberOrNull(before?.candidate.target1),
      afterTarget1: numberOrNull(after?.candidate.target1),
      beforeTarget2: numberOrNull(before?.candidate.target2),
      afterTarget2: numberOrNull(after?.candidate.target2),
      beforeRiskPoints: numberOrNull(before?.candidate.riskPoints),
      afterRiskPoints: numberOrNull(after?.candidate.riskPoints),
      changed: candidateChanged(before?.candidate || null, after?.candidate || null),
    };
  });
  const beforeCandidates = [...beforeRows.values()].map((row) => row.candidate);
  const afterCandidates = [...afterRows.values()].map((row) => row.candidate);
  const blockers = [
    !args.beforeArtifact ? 'missing before artifact' : null,
    !args.afterArtifact ? 'missing after artifact' : null,
    args.beforeArtifact && args.afterArtifact && Object.keys(args.beforeArtifact.events || {}).length !== Object.keys(args.afterArtifact.events || {}).length
      ? 'before and after artifact event counts differ'
      : null,
  ].filter((item): item is string => Boolean(item));
  const summary = {
    beforeEvents: Object.keys(args.beforeArtifact?.events || {}).length,
    afterEvents: Object.keys(args.afterArtifact?.events || {}).length,
    joinedRows: rows.length,
    changedRows: rows.filter((row) => row.changed).length,
    invalidGeometryBeforeRows: beforeCandidates.filter(isInvalidGeometry).length,
    invalidGeometryAfterRows: afterCandidates.filter(isInvalidGeometry).length,
    executableBeforeRows: beforeCandidates.filter((candidate) => candidate.executionStatus === 'Executable').length,
    executableAfterRows: afterCandidates.filter((candidate) => candidate.executionStatus === 'Executable').length,
    conditionalBeforeRows: beforeCandidates.filter((candidate) => candidate.executionStatus === 'Conditional').length,
    conditionalAfterRows: afterCandidates.filter((candidate) => candidate.executionStatus === 'Conditional').length,
    blockedBeforeRows: beforeCandidates.filter((candidate) => candidate.executionStatus === 'Blocked').length,
    blockedAfterRows: afterCandidates.filter((candidate) => candidate.executionStatus === 'Blocked').length,
    livePromotionAllowedRows: 0 as const,
    recommendation: blockers.length || rows.some((row) => row.afterExecutionStatus === 'Executable' && row.beforeExecutionStatus !== 'Executable')
      ? 'investigate_artifact_drift' as const
      : 'use_repaired_artifact_for_replay_chain' as const,
  };
  const withoutMarkdown: Omit<RawOhlcScannerArtifactComparisonReport, 'reportMarkdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_comparison',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: {
      readOnly: true,
      localOnly: true,
      researchOnly: true,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      runsSetupScanner: false,
      changesTradingRules: false,
      changesCanExecute: false,
      changesBridgeBehavior: false,
      changesScannerBehavior: false,
      changesDiscordPosting: false,
    },
    source: {
      beforeArtifact: args.beforeArtifactPath,
      afterArtifact: args.afterArtifactPath,
    },
    summary,
    rows,
    blockers,
    recommendations: summary.recommendation === 'use_repaired_artifact_for_replay_chain'
      ? ['Use the repaired raw-OHLC scanner artifact package as the source for the next replay package/outcome/source-proof chain.']
      : ['Investigate changed executable rows, event-count drift, or missing artifacts before replay-chain expansion.'],
  };
  return { ...withoutMarkdown, reportMarkdown: buildMarkdown(withoutMarkdown) };
}

export function writeRawOhlcScannerArtifactComparisonReport(report: RawOhlcScannerArtifactComparisonReport, outDir: string): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-comparison-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.reportMarkdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export async function runRawOhlcScannerArtifactComparisonCli(rawArgs = process.argv.slice(2)): Promise<void> {
  const options = parseRawOhlcScannerArtifactComparisonArgs(rawArgs);
  const report = buildRawOhlcScannerArtifactComparisonReport({
    beforeArtifactPath: options.beforeArtifact,
    beforeArtifact: readJson<ArtifactShape>(options.beforeArtifact),
    afterArtifactPath: options.afterArtifact,
    afterArtifact: readJson<ArtifactShape>(options.afterArtifact),
  });
  const paths = writeRawOhlcScannerArtifactComparisonReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...paths, summary: report.summary, blockers: report.blockers }, null, 2));
  } else {
    console.log(report.reportMarkdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runRawOhlcScannerArtifactComparisonCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
