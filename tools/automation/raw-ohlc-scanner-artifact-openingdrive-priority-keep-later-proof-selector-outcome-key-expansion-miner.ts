import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

interface CliOptions {
  reportDir: string;
  auditDir: string;
  json: boolean;
}

type JsonReport = {
  status?: string;
  rows?: Record<string, unknown>[];
  summary?: Record<string, unknown>;
};

interface Gate {
  name: string;
  status: 'pass' | 'fail' | 'caution';
  proof: string;
}

interface KeyCoverageRow {
  tradeDate: string;
  session: string;
  setupType: string;
  direction: string;
  realKeepLaterRows: number;
  deterministicLevelsValidRows: number;
  exactOutcomeMatches: number;
  looseOutcomeMatches: number;
  scannerTapeAvailable: boolean;
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorOutcomeKeyExpansionMinerReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_outcome_key_expansion_miner';
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
    auditDir: string;
    realMetadataReplayPath: string | null;
    outcomePath: string | null;
  };
  assumptions: {
    savedReportsOnly: true;
    scannerTapesAreLocalArtifactsOnly: true;
    noOutcomeRowsInvented: true;
    runtimeRankConsumerAllowedByThisReport: false;
  };
  gates: Gate[];
  summary: {
    realKeepLaterRows: number;
    realKeepLaterRowsWithValidLevels: number;
    realDateRange: { first: string | null; last: string | null };
    outcomeRows: number;
    outcomeDateRange: { first: string | null; last: string | null };
    exactOutcomeMatchedRows: number;
    looseOutcomeMatchedRows: number;
    unmatchedRealRows: number;
    unmatchedRealRowsWithScannerTape: number;
    unmatchedRealRowsWithoutScannerTape: number;
    distinctRealGroups: number;
    distinctRealGroupsWithScannerTape: number;
    runtimeRankConsumerAllowedByThisReport: false;
    recommendation: 'build_real_row_replay_package_from_local_scanner_tapes' | 'expand_existing_outcome_join' | 'fix_inputs';
  };
  keyCoverageRows: KeyCoverageRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_AUDIT_DIR = path.join(__dirname, 'discord-audit');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function parseArgs(args = process.argv.slice(2)): CliOptions {
  return {
    reportDir: path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR),
    auditDir: path.resolve(readFlag(args, '--audit-dir') || DEFAULT_AUDIT_DIR),
    json: args.includes('--json'),
  };
}

function latestMatchingFile(reportDir: string, prefix: string): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => name.startsWith(prefix) && name.endsWith('.json'))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function readJson(filePath: string | null): JsonReport | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as JsonReport;
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function bool(value: unknown): boolean {
  return value === true;
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorOutcomeKeyExpansionMinerReport['authority'] {
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

function dateRange(dates: string[]): { first: string | null; last: string | null } {
  const sorted = [...new Set(dates.filter(Boolean))].sort();
  return { first: sorted[0] || null, last: sorted[sorted.length - 1] || null };
}

function key(parts: Array<string | null>): string {
  return parts.map((part) => part || '').join('|');
}

function scannerTapeExists(auditDir: string, tradeDate: string, session: string): boolean {
  const filePath = path.join(auditDir, `scanner-decision-tape-${tradeDate}-MES-${session}.json`);
  return fs.existsSync(filePath);
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorOutcomeKeyExpansionMinerReport, 'markdown'>): string {
  return [
    '# OpeningDrive ProofSelectionSignal Outcome Key Expansion Miner',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only saved-report/key coverage miner. It does not replay outcomes, install rank consumers, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Real keep_later_sweep_proof rows: ${report.summary.realKeepLaterRows}.`,
    `- Real valid-level keep-later rows: ${report.summary.realKeepLaterRowsWithValidLevels}.`,
    `- Real date range: ${report.summary.realDateRange.first ?? '-'} to ${report.summary.realDateRange.last ?? '-'}.`,
    `- Outcome rows: ${report.summary.outcomeRows}.`,
    `- Outcome date range: ${report.summary.outcomeDateRange.first ?? '-'} to ${report.summary.outcomeDateRange.last ?? '-'}.`,
    `- Exact outcome matched rows: ${report.summary.exactOutcomeMatchedRows}.`,
    `- Loose outcome matched rows: ${report.summary.looseOutcomeMatchedRows}.`,
    `- Unmatched real rows: ${report.summary.unmatchedRealRows}.`,
    `- Unmatched real rows with local scanner tape: ${report.summary.unmatchedRealRowsWithScannerTape}.`,
    `- Unmatched real rows without local scanner tape: ${report.summary.unmatchedRealRowsWithoutScannerTape}.`,
    `- Distinct real groups with local scanner tape: ${report.summary.distinctRealGroupsWithScannerTape}/${report.summary.distinctRealGroups}.`,
    `- Runtime rank consumer allowed by this report: ${report.summary.runtimeRankConsumerAllowedByThisReport}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Gates',
    ...report.gates.map((gate) => `- ${gate.name}: ${gate.status} - ${gate.proof}`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorOutcomeKeyExpansionMinerReport(args: {
  reportDir?: string;
  auditDir?: string;
  realMetadataReplayPath?: string | null;
  outcomePath?: string | null;
  realMetadataReplay?: JsonReport | null;
  outcome?: JsonReport | null;
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorOutcomeKeyExpansionMinerReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const auditDir = path.resolve(args.auditDir || DEFAULT_AUDIT_DIR);
  const realPath = args.realMetadataReplayPath ?? latestMatchingFile(reportDir, 'raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-real-metadata-replay-audit-');
  const outcomePath = args.outcomePath ?? latestMatchingFile(reportDir, 'unified-positive-held-local-preview-replay-package-outcome-');
  const real = args.realMetadataReplay ?? readJson(realPath);
  const outcome = args.outcome ?? readJson(outcomePath);
  const realRows = (real?.rows || []).filter((row) => row.selectorDecision === 'keep_later_sweep_proof');
  const outcomeRows = outcome?.rows || [];
  const exactOutcomeKeys = new Set(outcomeRows.map((row) => key([
    str(row.tradeDate),
    str(row.session),
    str(row.setupType),
    str(row.direction),
    str(row.proofTime),
  ])));
  const looseOutcomeKeys = new Set(outcomeRows.map((row) => key([
    str(row.tradeDate),
    str(row.session),
    str(row.setupType),
    str(row.direction),
  ])));
  const grouped = new Map<string, KeyCoverageRow>();
  let exactOutcomeMatchedRows = 0;
  let looseOutcomeMatchedRows = 0;
  let unmatchedRealRowsWithScannerTape = 0;
  let unmatchedRealRowsWithoutScannerTape = 0;
  for (const row of realRows) {
    const tradeDate = str(row.tradeDate) || 'unknown';
    const session = str(row.session) || 'unknown';
    const setupType = str(row.setupType) || 'unknown';
    const direction = str(row.direction) || 'unknown';
    const exact = exactOutcomeKeys.has(key([tradeDate, session, setupType, direction, str(row.completedBarTime)]));
    const loose = looseOutcomeKeys.has(key([tradeDate, session, setupType, direction]));
    const tapeAvailable = scannerTapeExists(auditDir, tradeDate, session);
    if (exact) exactOutcomeMatchedRows += 1;
    if (loose) looseOutcomeMatchedRows += 1;
    if (!exact) {
      if (tapeAvailable) unmatchedRealRowsWithScannerTape += 1;
      else unmatchedRealRowsWithoutScannerTape += 1;
    }
    const groupKey = key([tradeDate, session, setupType, direction]);
    const group = grouped.get(groupKey) || {
      tradeDate,
      session,
      setupType,
      direction,
      realKeepLaterRows: 0,
      deterministicLevelsValidRows: 0,
      exactOutcomeMatches: 0,
      looseOutcomeMatches: 0,
      scannerTapeAvailable: tapeAvailable,
    };
    group.realKeepLaterRows += 1;
    if (bool(row.deterministicLevelsValid)) group.deterministicLevelsValidRows += 1;
    if (exact) group.exactOutcomeMatches += 1;
    if (loose) group.looseOutcomeMatches += 1;
    group.scannerTapeAvailable = group.scannerTapeAvailable || tapeAvailable;
    grouped.set(groupKey, group);
  }
  const keyCoverageRows = [...grouped.values()].sort((a, b) =>
    a.tradeDate.localeCompare(b.tradeDate) || a.session.localeCompare(b.session) || a.setupType.localeCompare(b.setupType));
  const realKeepLaterRowsWithValidLevels = realRows.filter((row) => bool(row.deterministicLevelsValid)).length;
  const unmatchedRealRows = realRows.length - exactOutcomeMatchedRows;
  const distinctRealGroupsWithScannerTape = keyCoverageRows.filter((row) => row.scannerTapeAvailable).length;
  const gates: Gate[] = [
    {
      name: 'real_metadata_rows_available',
      status: real?.status === 'pass' && realRows.length > 0 ? 'pass' : 'fail',
      proof: `status=${real?.status ?? 'missing'} realKeepLaterRows=${realRows.length}`,
    },
    {
      name: 'outcome_rows_available',
      status: outcome?.status === 'pass' && outcomeRows.length > 0 ? 'pass' : 'fail',
      proof: `status=${outcome?.status ?? 'missing'} outcomeRows=${outcomeRows.length}`,
    },
    {
      name: 'direct_outcome_key_coverage',
      status: exactOutcomeMatchedRows > 0 ? 'pass' : 'caution',
      proof: `exactOutcomeMatchedRows=${exactOutcomeMatchedRows}; zero means existing outcome evidence is from a different date/key set.`,
    },
    {
      name: 'local_scanner_tape_coverage',
      status: unmatchedRealRowsWithScannerTape > 0 ? 'pass' : 'fail',
      proof: `unmatchedRowsWithScannerTape=${unmatchedRealRowsWithScannerTape} unmatchedRowsWithoutScannerTape=${unmatchedRealRowsWithoutScannerTape}`,
    },
    {
      name: 'runtime_rank_consumer_disabled',
      status: 'pass',
      proof: 'runtimeRankConsumerAllowedByThisReport=false',
    },
  ];
  const failedGates = gates.filter((gate) => gate.status === 'fail');
  const blockers = [
    !realPath ? 'missing real-metadata replay audit report' : null,
    !outcomePath ? 'missing replay-package outcome report' : null,
    ...failedGates.map((gate) => `outcome-key expansion gate failed: ${gate.name}`),
  ].filter((item): item is string => Boolean(item));
  const recommendation = blockers.length
    ? 'fix_inputs'
    : exactOutcomeMatchedRows > 0
      ? 'expand_existing_outcome_join'
      : 'build_real_row_replay_package_from_local_scanner_tapes';
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorOutcomeKeyExpansionMinerReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_outcome_key_expansion_miner',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { reportDir, auditDir, realMetadataReplayPath: realPath, outcomePath },
    assumptions: {
      savedReportsOnly: true,
      scannerTapesAreLocalArtifactsOnly: true,
      noOutcomeRowsInvented: true,
      runtimeRankConsumerAllowedByThisReport: false,
    },
    gates,
    summary: {
      realKeepLaterRows: realRows.length,
      realKeepLaterRowsWithValidLevels,
      realDateRange: dateRange(realRows.map((row) => str(row.tradeDate) || '')),
      outcomeRows: outcomeRows.length,
      outcomeDateRange: dateRange(outcomeRows.map((row) => str(row.tradeDate) || '')),
      exactOutcomeMatchedRows,
      looseOutcomeMatchedRows,
      unmatchedRealRows,
      unmatchedRealRowsWithScannerTape,
      unmatchedRealRowsWithoutScannerTape,
      distinctRealGroups: keyCoverageRows.length,
      distinctRealGroupsWithScannerTape,
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation,
    },
    keyCoverageRows,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved-report inputs before building the real-row replay package.']
      : [
        'Do not use the June outcome-backed P/L as row-level proof for the July real metadata rows.',
        'Build a real-row replay package from local scanner-decision tapes for the unmatched real keep-later rows.',
        'Keep runtime ranking disabled until the real-row replay package produces outcome coverage on the same date/key set.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const options = parseArgs();
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorOutcomeKeyExpansionMinerReport({
    reportDir: options.reportDir,
    auditDir: options.auditDir,
  });
  fs.mkdirSync(options.reportDir, { recursive: true });
  const outPath = path.join(options.reportDir, `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-outcome-key-expansion-miner-${Date.now()}.json`);
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  if (options.json) console.log(JSON.stringify({ outPath, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  else {
    console.log(report.markdown);
    console.log(`\nReport written: ${outPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
