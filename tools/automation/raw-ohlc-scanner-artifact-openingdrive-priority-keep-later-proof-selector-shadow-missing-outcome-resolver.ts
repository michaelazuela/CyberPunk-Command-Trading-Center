import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingReplayPackageReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-shadow-missing-replay-package';

interface CliOptions {
  missingReplayPackage: string;
  outcomeJson: string[];
  outDir: string;
  json: boolean;
}

interface OutcomeRecord {
  tradeDate: string;
  sessionType: string;
  setupType: string;
  direction: string;
  outcome: string;
  oneMesGross: number;
  sourcePath: string;
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingOutcomeResolverRow {
  packagePriority: number;
  replayQueueKey: string;
  tradeDate: string;
  sessionType: string;
  setupType: string;
  direction: string;
  selectorDecision: string;
  shadowRows: number;
  wouldChangePrimaryRows: number;
  strictOutcomeEvidenceCount: number;
  weakDateSetupDirectionEvidenceCount: number;
  strictGrossOneMesPl: number;
  weakGrossOneMesPl: number;
  strictWins: number;
  strictLosses: number;
  strictNoFillsOrUnresolved: number;
  resolutionStatus: 'resolved_strict' | 'weak_adjacent_evidence_only' | 'unresolved_missing_outcome';
  note: string;
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingOutcomeResolverReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_shadow_missing_outcome_resolver';
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
    missingReplayPackagePath: string;
    outcomeJsonPaths: string[];
  };
  summary: {
    packageRows: number;
    outcomeRecordsLoaded: number;
    resolvedStrictRows: number;
    weakAdjacentOnlyRows: number;
    unresolvedRows: number;
    strictMatchedShadowRows: number;
    stillUnresolvedShadowRows: number;
    strictGrossOneMesPl: number;
    weakAdjacentGrossOneMesPl: number;
    recommendation: 'run_actual_missing_session_replay' | 'mine_strict_resolved_missing_package' | 'fix_inputs';
  };
  rows: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingOutcomeResolverRow[];
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
  const missingReplayPackage = readFlag(args, '--missing-replay-package') ||
    latestMatchingFile(outDir, /^raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-shadow-missing-replay-package-\d+\.json$/);
  const outcomeJson = readFlags(args, '--outcome-json').map((file) => path.resolve(file));
  if (!missingReplayPackage) throw new Error('--missing-replay-package is required.');
  if (!outcomeJson.length) throw new Error('At least one --outcome-json is required.');
  return {
    missingReplayPackage: path.resolve(missingReplayPackage),
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

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingOutcomeResolverReport['authority'] {
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

function normalizeOutcomeRecord(row: Record<string, unknown>, sourcePath: string): OutcomeRecord | null {
  const tradeDate = stringValue(row.tradeDate || row.date);
  const sessionType = stringValue(row.sessionType || row.session);
  const setupType = stringValue(row.setupType || row.model);
  const direction = stringValue(row.direction);
  const outcome = stringValue(row.replayOutcome || row.outcome || row.outcomeLabel || row.outcomeCode);
  const oneMesGross = numberValue(row.replayOneMesGross ?? row.oneMesGross ?? row.grossOneMes ?? row.pnl ?? row.resolvedOneMesPl);
  if (!tradeDate || !sessionType || !setupType || !direction || !outcome || oneMesGross === null) return null;
  if (direction !== 'LONG' && direction !== 'SHORT' && direction !== 'NO TRADE') return null;
  return { tradeDate, sessionType, setupType, direction, outcome, oneMesGross, sourcePath };
}

function loadOutcomeRecords(files: string[]): OutcomeRecord[] {
  const records: OutcomeRecord[] = [];
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const root = asRecord(readJson<unknown>(file));
    for (const key of ['rows', 'findings', 'records']) {
      const rows = Array.isArray(root[key]) ? root[key] as unknown[] : [];
      for (const item of rows) {
        const normalized = normalizeOutcomeRecord(asRecord(item), file);
        if (normalized) records.push(normalized);
      }
    }
    const artifacts = Array.isArray(root.artifacts) ? root.artifacts as unknown[] : [];
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
      }, file);
      if (normalized) records.push(normalized);
    }
  }
  return records;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function strictMatch(pkgRow: { tradeDate: string; sessionType: string; setupType: string; direction: string }, record: OutcomeRecord): boolean {
  return record.tradeDate === pkgRow.tradeDate &&
    record.sessionType === pkgRow.sessionType &&
    record.setupType === pkgRow.setupType &&
    record.direction === pkgRow.direction;
}

function weakDateSetupDirectionMatch(pkgRow: { tradeDate: string; setupType: string; direction: string }, record: OutcomeRecord): boolean {
  return record.tradeDate === pkgRow.tradeDate &&
    record.setupType === pkgRow.setupType &&
    record.direction === pkgRow.direction;
}

function isWinningOutcome(record: OutcomeRecord): boolean {
  return record.oneMesGross > 0 || /T2_HIT|T1_THEN_STOP|TARGET|WIN|t1_and_t2_hit|t1_hit_only/i.test(record.outcome);
}

function isLosingOutcome(record: OutcomeRecord): boolean {
  return record.oneMesGross < 0 || /STOP_HIT|LOSS|stopped_before_t1/i.test(record.outcome);
}

function isNoFillOrUnresolvedOutcome(record: OutcomeRecord): boolean {
  return /NO_FILL|FILLED_OPEN|UNRESOLVED|AMBIGUOUS|no_fill|no_target_or_stop_hit/i.test(record.outcome);
}

function buildMarkdown(
  report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingOutcomeResolverReport, 'markdown'>,
): string {
  return [
    '# OpeningDrive Keep-Later-Proof Selector Shadow Missing Outcome Resolver',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only missing outcome resolver. It consumes saved package and saved outcome reports only. It does not replay OHLC, install ranking, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change entry/stop/target/risk math.',
    '',
    '## Summary',
    `- Package rows: ${report.summary.packageRows}.`,
    `- Outcome records loaded: ${report.summary.outcomeRecordsLoaded}.`,
    `- Strict resolved rows: ${report.summary.resolvedStrictRows}.`,
    `- Weak adjacent-only rows: ${report.summary.weakAdjacentOnlyRows}.`,
    `- Unresolved rows: ${report.summary.unresolvedRows}.`,
    `- Strict matched shadow rows: ${report.summary.strictMatchedShadowRows}.`,
    `- Still unresolved shadow rows: ${report.summary.stillUnresolvedShadowRows}.`,
    `- Strict gross one-MES P/L: ${report.summary.strictGrossOneMesPl}.`,
    `- Weak adjacent gross one-MES P/L: ${report.summary.weakAdjacentGrossOneMesPl}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Rows',
    '| Priority | Key | Strict Evidence | Weak Evidence | Strict P/L | Weak P/L | Status | Note |',
    '|---:|---|---:|---:|---:|---:|---|---|',
    ...report.rows.map((row) => `| ${row.packagePriority} | ${row.replayQueueKey} | ${row.strictOutcomeEvidenceCount} | ${row.weakDateSetupDirectionEvidenceCount} | ${row.strictGrossOneMesPl} | ${row.weakGrossOneMesPl} | ${row.resolutionStatus} | ${row.note} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingOutcomeResolverReport(args: {
  missingReplayPackagePath: string;
  missingReplayPackage: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingReplayPackageReport | null;
  outcomeJsonPaths: string[];
  outcomeRecords: OutcomeRecord[];
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingOutcomeResolverReport {
  const packageRows = args.missingReplayPackage?.rows || [];
  const rows = packageRows.map((pkgRow) => {
    const strict = args.outcomeRecords.filter((record) => strictMatch(pkgRow, record));
    const weak = args.outcomeRecords.filter((record) => weakDateSetupDirectionMatch(pkgRow, record) && !strictMatch(pkgRow, record));
    const strictGrossOneMesPl = round(strict.reduce((sum, record) => sum + record.oneMesGross, 0));
    const weakGrossOneMesPl = round(weak.reduce((sum, record) => sum + record.oneMesGross, 0));
    const resolutionStatus: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingOutcomeResolverRow['resolutionStatus'] = strict.length
      ? 'resolved_strict'
      : weak.length
        ? 'weak_adjacent_evidence_only'
        : 'unresolved_missing_outcome';
    const note = resolutionStatus === 'resolved_strict'
      ? 'Strict same date/session/model/direction outcome evidence exists.'
      : resolutionStatus === 'weak_adjacent_evidence_only'
        ? 'Only same date/model/direction evidence from other sessions exists; do not treat as resolved.'
        : 'No saved outcome evidence for this date/session/model/direction key.';
    return {
      packagePriority: pkgRow.packagePriority,
      replayQueueKey: pkgRow.replayQueueKey,
      tradeDate: pkgRow.tradeDate,
      sessionType: pkgRow.sessionType,
      setupType: pkgRow.setupType,
      direction: pkgRow.direction,
      selectorDecision: pkgRow.selectorDecision,
      shadowRows: pkgRow.shadowRows,
      wouldChangePrimaryRows: pkgRow.wouldChangePrimaryRows,
      strictOutcomeEvidenceCount: strict.length,
      weakDateSetupDirectionEvidenceCount: weak.length,
      strictGrossOneMesPl,
      weakGrossOneMesPl,
      strictWins: strict.filter(isWinningOutcome).length,
      strictLosses: strict.filter(isLosingOutcome).length,
      strictNoFillsOrUnresolved: strict.filter(isNoFillOrUnresolvedOutcome).length,
      resolutionStatus,
      note,
    };
  });
  const blockers = [
    !args.missingReplayPackage ? 'missing replay package report' : null,
    args.missingReplayPackage && args.missingReplayPackage.status !== 'pass' ? `missing replay package status ${args.missingReplayPackage.status}` : null,
    !args.outcomeJsonPaths.length ? 'missing outcome JSON path' : null,
    args.outcomeJsonPaths.some((file) => !fs.existsSync(file)) ? 'one or more outcome JSON paths do not exist' : null,
    args.outcomeJsonPaths.length && !args.outcomeRecords.length ? 'outcome JSON paths loaded zero normalized outcome records' : null,
  ].filter((item): item is string => Boolean(item));
  const unresolvedRows = rows.filter((row) => row.resolutionStatus !== 'resolved_strict');
  const recommendation = blockers.length
    ? 'fix_inputs'
    : unresolvedRows.length
      ? 'run_actual_missing_session_replay'
      : 'mine_strict_resolved_missing_package';
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingOutcomeResolverReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_shadow_missing_outcome_resolver',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      missingReplayPackagePath: args.missingReplayPackagePath,
      outcomeJsonPaths: args.outcomeJsonPaths,
    },
    summary: {
      packageRows: rows.length,
      outcomeRecordsLoaded: args.outcomeRecords.length,
      resolvedStrictRows: rows.filter((row) => row.resolutionStatus === 'resolved_strict').length,
      weakAdjacentOnlyRows: rows.filter((row) => row.resolutionStatus === 'weak_adjacent_evidence_only').length,
      unresolvedRows: rows.filter((row) => row.resolutionStatus === 'unresolved_missing_outcome').length,
      strictMatchedShadowRows: rows.filter((row) => row.resolutionStatus === 'resolved_strict').reduce((sum, row) => sum + row.shadowRows, 0),
      stillUnresolvedShadowRows: unresolvedRows.reduce((sum, row) => sum + row.shadowRows, 0),
      strictGrossOneMesPl: round(rows.reduce((sum, row) => sum + row.strictGrossOneMesPl, 0)),
      weakAdjacentGrossOneMesPl: round(rows.reduce((sum, row) => sum + row.weakGrossOneMesPl, 0)),
      recommendation,
    },
    rows,
    blockers,
    recommendations: recommendation === 'run_actual_missing_session_replay'
      ? [
        'Run actual saved OHLC outcome replay for the unresolved package rows; adjacent-session evidence is not enough.',
        'Prioritize keys with zero strict evidence and high shadowRows before any selector proposal.',
      ]
      : recommendation === 'mine_strict_resolved_missing_package'
        ? ['All package rows have strict outcome evidence; mine the resolved package next.']
        : ['Fix missing or invalid saved input reports before continuing.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingOutcomeResolverReport(
  report: RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingOutcomeResolverReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-shadow-missing-outcome-resolver-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingOutcomeResolverCli(args = process.argv.slice(2)): void {
  const options = parseArgs(args);
  const outcomeRecords = loadOutcomeRecords(options.outcomeJson);
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingOutcomeResolverReport({
    missingReplayPackagePath: options.missingReplayPackage,
    missingReplayPackage: fs.existsSync(options.missingReplayPackage)
      ? readJson<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingReplayPackageReport>(options.missingReplayPackage)
      : null,
    outcomeJsonPaths: options.outcomeJson,
    outcomeRecords,
  });
  const paths = writeRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingOutcomeResolverReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nReport JSON: ${paths.jsonPath}`); console.log(`Report Markdown: ${paths.markdownPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorShadowMissingOutcomeResolverCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
