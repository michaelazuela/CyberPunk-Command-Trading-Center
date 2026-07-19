import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowComparisonReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-shadow-comparison';
import type { UnifiedDeskOutcomeOverlayRecord } from './unified-desk-candidate-book-diagnostic';

interface CliOptions {
  shadowComparison: string;
  outcomeJson: string[];
  outDir: string;
  json: boolean;
}

interface ShadowGroup {
  tradeDate: string;
  sessionType: string;
  setupType: string;
  direction: string;
  selectorDecision: string;
  shadowRows: number;
  keepLaterSweepProofRows: number;
  preferReplacementRows: number;
  wouldChangePrimaryRows: number;
  sampleSnapshotIds: string[];
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowOutcomeJoinRow extends ShadowGroup {
  outcomeEvidenceCount: number;
  wins: number;
  losses: number;
  noFillsOrUnresolved: number;
  grossOneMesPl: number;
  outcomeClassification: 'positive' | 'negative' | 'mixed' | 'no_evidence';
  outcomeSources: string[];
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowOutcomeJoinReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_shadow_outcome_join';
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
    shadowComparisonPath: string;
    outcomeJsonPaths: string[];
  };
  summary: {
    shadowRows: number;
    shadowGroups: number;
    outcomeRecordsLoaded: number;
    joinedGroups: number;
    unmatchedGroups: number;
    joinedShadowRows: number;
    unmatchedShadowRows: number;
    positiveGroups: number;
    negativeGroups: number;
    mixedGroups: number;
    grossJoinedOneMesPl: number;
    recommendation: 'expand_outcome_coverage' | 'mine_joined_outcome_separators' | 'fix_inputs';
  };
  rows: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowOutcomeJoinRow[];
  daySessionModelGroups: Array<{
    tradeDate: string;
    sessionType: string;
    setupType: string;
    direction: string;
    selectorDecision: string;
    shadowRows: number;
    outcomeEvidenceCount: number;
    grossOneMesPl: number;
  }>;
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');

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

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function parseArgs(args = process.argv.slice(2)): CliOptions {
  const outDir = path.resolve(readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR);
  const shadowComparison = readFlag(args, '--shadow-comparison') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-shadow-comparison-\d+\.json$/);
  const outcomeJson = readFlags(args, '--outcome-json').map((file) => path.resolve(file));
  if (!shadowComparison) throw new Error('--shadow-comparison is required.');
  if (!outcomeJson.length) throw new Error('At least one --outcome-json is required.');
  return {
    shadowComparison: path.resolve(shadowComparison),
    outcomeJson,
    outDir,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeOutcomeRecord(record: {
  tradeDate: unknown;
  sessionType: unknown;
  setupType: unknown;
  direction: unknown;
  outcome: unknown;
  oneMesGross: unknown;
  sourcePath: string;
}): UnifiedDeskOutcomeOverlayRecord | null {
  const tradeDate = stringValue(record.tradeDate);
  const sessionType = stringValue(record.sessionType);
  const setupType = stringValue(record.setupType);
  const direction = stringValue(record.direction);
  const outcome = stringValue(record.outcome);
  const oneMesGross = numberValue(record.oneMesGross);
  if (!tradeDate || !sessionType || !setupType || !direction || !outcome || oneMesGross === null) return null;
  if (direction !== 'LONG' && direction !== 'SHORT' && direction !== 'NO TRADE') return null;
  return {
    tradeDate,
    sessionType: sessionType as UnifiedDeskOutcomeOverlayRecord['sessionType'],
    setupType,
    direction: direction as UnifiedDeskOutcomeOverlayRecord['direction'],
    outcome,
    oneMesGross,
    source: 'local_rag_or_review',
    sourcePath: record.sourcePath,
  };
}

function loadOutcomeRecords(files: string[]): UnifiedDeskOutcomeOverlayRecord[] {
  const records: UnifiedDeskOutcomeOverlayRecord[] = [];
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const raw = readJson<unknown>(file);
    const root = asRecord(raw);
    const rows = Array.isArray(root.rows) ? root.rows : [];
    for (const item of rows) {
      const row = asRecord(item);
      const normalized = normalizeOutcomeRecord({
        tradeDate: row.tradeDate || row.date,
        sessionType: row.sessionType || row.session,
        setupType: row.setupType || row.model,
        direction: row.direction,
        outcome: row.replayOutcome || row.outcome || row.outcomeLabel || row.outcomeCode,
        oneMesGross: row.replayOneMesGross ?? row.oneMesGross ?? row.grossOneMes ?? row.pnl ?? row.resolvedOneMesPl,
        sourcePath: file,
      });
      if (normalized) records.push(normalized);
    }
    const findings = Array.isArray(root.findings) ? root.findings : [];
    for (const item of findings) {
      const row = asRecord(item);
      const normalized = normalizeOutcomeRecord({
        tradeDate: row.tradeDate || row.date,
        sessionType: row.sessionType || row.session,
        setupType: row.setupType || row.model,
        direction: row.direction,
        outcome: row.replayOutcome || row.outcome || row.outcomeLabel || row.outcomeCode,
        oneMesGross: row.replayOneMesGross ?? row.oneMesGross ?? row.grossOneMes ?? row.pnl ?? row.resolvedOneMesPl,
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
        outcome: row.replayOutcome || row.outcome || row.outcomeLabel || row.outcomeCode,
        oneMesGross: row.replayOneMesGross ?? row.oneMesGross ?? row.grossOneMes ?? row.pnl ?? row.resolvedOneMesPl,
        sourcePath: file,
      });
      if (normalized) records.push(normalized);
    }
  }
  return records;
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowOutcomeJoinReport['authority'] {
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

function joinKey(parts: {
  tradeDate: string;
  sessionType: string;
  setupType: string;
  direction: string;
}): string {
  return [parts.tradeDate, parts.sessionType, parts.setupType, parts.direction].join('|');
}

function shadowGroupKey(row: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowComparisonReport['rows'][number]): string {
  return [
    row.tradeDate,
    row.sessionType,
    row.shadowSelectedSetupType,
    row.direction,
    row.selectorDecision,
  ].join('|');
}

function buildShadowGroups(rows: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowComparisonReport['rows']): ShadowGroup[] {
  const groups = new Map<string, RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowComparisonReport['rows']>();
  for (const row of rows) groups.set(shadowGroupKey(row), [...(groups.get(shadowGroupKey(row)) || []), row]);
  return [...groups.values()].map((groupRows) => {
    const first = groupRows[0];
    return {
      tradeDate: first.tradeDate,
      sessionType: first.sessionType,
      setupType: first.shadowSelectedSetupType,
      direction: first.direction,
      selectorDecision: first.selectorDecision,
      shadowRows: groupRows.length,
      keepLaterSweepProofRows: groupRows.filter((row) => row.selectorDecision === 'keep_later_sweep_proof').length,
      preferReplacementRows: groupRows.filter((row) => row.selectorDecision === 'prefer_replacement').length,
      wouldChangePrimaryRows: groupRows.filter((row) => row.wouldChangePrimary).length,
      sampleSnapshotIds: groupRows.slice(0, 5).map((row) => row.snapshotId),
    };
  }).sort((a, b) =>
    a.tradeDate.localeCompare(b.tradeDate) ||
    a.sessionType.localeCompare(b.sessionType) ||
    a.setupType.localeCompare(b.setupType) ||
    a.direction.localeCompare(b.direction) ||
    a.selectorDecision.localeCompare(b.selectorDecision)
  );
}

function outcomeIndex(records: UnifiedDeskOutcomeOverlayRecord[]): Map<string, UnifiedDeskOutcomeOverlayRecord[]> {
  const index = new Map<string, UnifiedDeskOutcomeOverlayRecord[]>();
  for (const record of records) {
    const key = joinKey(record);
    index.set(key, [...(index.get(key) || []), record]);
  }
  return index;
}

function isWinningOutcome(record: UnifiedDeskOutcomeOverlayRecord): boolean {
  return record.oneMesGross > 0 || /T2_HIT|T1_THEN_STOP|TARGET|WIN/i.test(record.outcome);
}

function isLosingOutcome(record: UnifiedDeskOutcomeOverlayRecord): boolean {
  return record.oneMesGross < 0 || /STOP_HIT|LOSS/i.test(record.outcome);
}

function isNoFillOrUnresolvedOutcome(record: UnifiedDeskOutcomeOverlayRecord): boolean {
  return /NO_FILL|FILLED_OPEN|UNRESOLVED|AMBIGUOUS|NO_FILL|no_fill/i.test(record.outcome);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function classify(records: UnifiedDeskOutcomeOverlayRecord[]): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowOutcomeJoinRow['outcomeClassification'] {
  if (!records.length) return 'no_evidence';
  const gross = records.reduce((sum, record) => sum + record.oneMesGross, 0);
  if (gross > 0 && !records.some(isLosingOutcome)) return 'positive';
  if (gross < 0) return 'negative';
  return 'mixed';
}

function buildMarkdown(
  report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowOutcomeJoinReport, 'markdown'>,
): string {
  return [
    '# OpeningDrive Keep-Later-Proof Selector Shadow Outcome Join',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only outcome join. It consumes saved reports only. It does not install ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Shadow rows: ${report.summary.shadowRows}.`,
    `- Shadow groups: ${report.summary.shadowGroups}.`,
    `- Outcome records loaded: ${report.summary.outcomeRecordsLoaded}.`,
    `- Joined groups: ${report.summary.joinedGroups}.`,
    `- Unmatched groups: ${report.summary.unmatchedGroups}.`,
    `- Joined shadow rows: ${report.summary.joinedShadowRows}.`,
    `- Unmatched shadow rows: ${report.summary.unmatchedShadowRows}.`,
    `- Positive / negative / mixed groups: ${report.summary.positiveGroups} / ${report.summary.negativeGroups} / ${report.summary.mixedGroups}.`,
    `- Gross joined one-MES P/L: ${report.summary.grossJoinedOneMesPl}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Day / Session / Model',
    '| Date | Session | Setup | Side | Selector | Shadow Rows | Evidence | One-MES P/L |',
    '|---|---|---|---|---|---:|---:|---:|',
    ...report.daySessionModelGroups.map((row) => `| ${row.tradeDate} | ${row.sessionType} | ${row.setupType} | ${row.direction} | ${row.selectorDecision} | ${row.shadowRows} | ${row.outcomeEvidenceCount} | ${row.grossOneMesPl} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowOutcomeJoinReport(args: {
  shadowComparisonPath: string;
  shadowComparison: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowComparisonReport | null;
  outcomeJsonPaths: string[];
  outcomeRecords: UnifiedDeskOutcomeOverlayRecord[];
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowOutcomeJoinReport {
  const shadowRows = args.shadowComparison?.rows || [];
  const groups = buildShadowGroups(shadowRows);
  const outcomes = outcomeIndex(args.outcomeRecords);
  const rows = groups.map((group) => {
    const records = outcomes.get(joinKey(group)) || [];
    return {
      ...group,
      outcomeEvidenceCount: records.length,
      wins: records.filter(isWinningOutcome).length,
      losses: records.filter(isLosingOutcome).length,
      noFillsOrUnresolved: records.filter(isNoFillOrUnresolvedOutcome).length,
      grossOneMesPl: round(records.reduce((sum, record) => sum + record.oneMesGross, 0)),
      outcomeClassification: classify(records),
      outcomeSources: Array.from(new Set(records.map((record) => record.sourcePath || record.source))).sort(),
    };
  });
  const blockers = [
    !args.shadowComparison ? 'missing shadow comparison report' : null,
    args.shadowComparison && args.shadowComparison.status !== 'pass' ? `shadow comparison status ${args.shadowComparison.status}` : null,
    !args.outcomeJsonPaths.length ? 'missing outcome JSON path' : null,
    args.outcomeJsonPaths.some((file) => !fs.existsSync(file)) ? 'one or more outcome JSON paths do not exist' : null,
    args.outcomeJsonPaths.length && !args.outcomeRecords.length ? 'outcome JSON paths loaded zero normalized outcome records' : null,
  ].filter((item): item is string => Boolean(item));
  const joinedGroups = rows.filter((row) => row.outcomeEvidenceCount > 0);
  const unmatchedGroups = rows.filter((row) => row.outcomeEvidenceCount === 0);
  const recommendation = blockers.length
    ? 'fix_inputs'
    : unmatchedGroups.length
      ? 'expand_outcome_coverage'
      : 'mine_joined_outcome_separators';
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowOutcomeJoinReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_shadow_outcome_join',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      shadowComparisonPath: args.shadowComparisonPath,
      outcomeJsonPaths: args.outcomeJsonPaths,
    },
    summary: {
      shadowRows: shadowRows.length,
      shadowGroups: groups.length,
      outcomeRecordsLoaded: args.outcomeRecords.length,
      joinedGroups: joinedGroups.length,
      unmatchedGroups: unmatchedGroups.length,
      joinedShadowRows: joinedGroups.reduce((sum, row) => sum + row.shadowRows, 0),
      unmatchedShadowRows: unmatchedGroups.reduce((sum, row) => sum + row.shadowRows, 0),
      positiveGroups: rows.filter((row) => row.outcomeClassification === 'positive').length,
      negativeGroups: rows.filter((row) => row.outcomeClassification === 'negative').length,
      mixedGroups: rows.filter((row) => row.outcomeClassification === 'mixed').length,
      grossJoinedOneMesPl: round(rows.reduce((sum, row) => sum + row.grossOneMesPl, 0)),
      recommendation,
    },
    rows,
    daySessionModelGroups: rows.map((row) => ({
      tradeDate: row.tradeDate,
      sessionType: row.sessionType,
      setupType: row.setupType,
      direction: row.direction,
      selectorDecision: row.selectorDecision,
      shadowRows: row.shadowRows,
      outcomeEvidenceCount: row.outcomeEvidenceCount,
      grossOneMesPl: row.grossOneMesPl,
    })),
    blockers,
    recommendations: recommendation === 'mine_joined_outcome_separators'
      ? [
        'Mine joined selector groups for no-lookahead outcome separators next.',
        'Keep selector disabled until a separate approval checkpoint proposes scanner-visible behavior.',
      ]
      : recommendation === 'expand_outcome_coverage'
        ? [
          'Expand saved outcome coverage for unmatched shadow dates/sessions before using this as model-quality evidence.',
          'Do not treat unmatched groups as losing or winning evidence.',
        ]
        : ['Fix missing or invalid saved input reports before continuing.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowOutcomeJoinReport(
  report: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowOutcomeJoinReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-shadow-outcome-join-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowOutcomeJoinCli(args = process.argv.slice(2)): void {
  const options = parseArgs(args);
  const outcomeRecords = loadOutcomeRecords(options.outcomeJson);
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowOutcomeJoinReport({
    shadowComparisonPath: options.shadowComparison,
    shadowComparison: fs.existsSync(options.shadowComparison)
      ? readJson<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowComparisonReport>(options.shadowComparison)
      : null,
    outcomeJsonPaths: options.outcomeJson,
    outcomeRecords,
  });
  const paths = writeRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowOutcomeJoinReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nReport JSON: ${paths.jsonPath}`); console.log(`Report Markdown: ${paths.markdownPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowOutcomeJoinCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
