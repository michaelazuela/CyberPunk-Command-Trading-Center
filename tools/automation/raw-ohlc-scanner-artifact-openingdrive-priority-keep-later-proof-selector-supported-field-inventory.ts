import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealMetadataReplayAuditReport,
} from './raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-real-metadata-replay-audit';

interface FieldStatRow {
  field: string;
  observedRows: number;
  presentRows: number;
  presentRate: number;
  distinctValues: string[];
  supportedForNextMiner: boolean;
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSupportedFieldInventoryReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_supported_field_inventory';
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
    artifactPaths: string[];
  };
  assumptions: {
    savedArtifactsOnly: true;
    usesCurrentProofSelectionSignalBuilder: true;
    inventoriesKeepLaterRowsWithValidLevelsOnly: true;
    noRuntimeRankingChange: true;
    runtimeRankConsumerAllowedByThisReport: false;
  };
  summary: {
    artifactsRead: number;
    eventsScanned: number;
    keepLaterRowsWithValidLevels: number;
    fieldsInventoried: number;
    supportedFields: number;
    runtimeRankConsumerAllowedByThisReport: false;
    recommendation: 'mine_supported_fields_against_outcomes' | 'fix_inputs';
  };
  fieldStats: FieldStatRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const SINGLE_DAY_ARTIFACT = /^raw-ohlc-scanner-artifacts-MES-(\d{4}-\d{2}-\d{2})-to-\1-\d+\.json$/;
const TARGET_FIELDS = [
  'candidateState',
  'detectedStatus',
  'confidence',
  'riskAdvisoryStatus',
  'executionStatus',
  'blockReason',
  'entryClarity',
  'stopClarity',
  'targetClarity',
  'proximityScore',
  'levelContextScore',
  'rankScore',
  'targetRoom.targetRoomStatus',
  'targetRoom.cleanPathToT1',
  'targetRoom.t2ExtensionObstructed',
  'activeRuleset.timeframeMss.status',
  'activeRuleset.htfLineInSand.status',
  'evidence.length',
  'missingEvidence.length',
];

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function artifactEvents(artifact: Record<string, unknown>): Record<string, unknown>[] {
  const events = artifact.events;
  if (Array.isArray(events)) return events as Record<string, unknown>[];
  if (events && typeof events === 'object') return Object.values(events as Record<string, unknown>) as Record<string, unknown>[];
  return [];
}

function latestSingleDayArtifacts(reportDir: string): string[] {
  if (!fs.existsSync(reportDir)) return [];
  const byDate = new Map<string, string>();
  for (const name of fs.readdirSync(reportDir)) {
    const match = name.match(SINGLE_DAY_ARTIFACT);
    if (!match) continue;
    const filePath = path.join(reportDir, name);
    const existing = byDate.get(match[1]);
    if (!existing || fs.statSync(filePath).mtimeMs > fs.statSync(existing).mtimeMs) byDate.set(match[1], filePath);
  }
  return [...byDate.values()].sort();
}

function valueAt(record: Record<string, unknown>, field: string): unknown {
  if (field.endsWith('.length')) {
    const base = valueAt(record, field.slice(0, -7));
    return Array.isArray(base) ? base.length : null;
  }
  return field.split('.').reduce<unknown>((current, key) => (
    current && typeof current === 'object' && !Array.isArray(current)
      ? (current as Record<string, unknown>)[key]
      : null
  ), record);
}

function printable(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
}

function candidateKey(eventTime: string, index: number, setupType: string, direction: string): string {
  return `${eventTime}:${index}:${setupType}:${direction}`;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function authority(): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSupportedFieldInventoryReport['authority'] {
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

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSupportedFieldInventoryReport, 'markdown'>): string {
  return [
    '# OpeningDrive ProofSelectionSignal Supported Field Inventory',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only saved-artifact field inventory. It does not install ranking behavior, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Artifacts read: ${report.summary.artifactsRead}.`,
    `- Events scanned: ${report.summary.eventsScanned}.`,
    `- keep_later rows with valid levels: ${report.summary.keepLaterRowsWithValidLevels}.`,
    `- Fields inventoried: ${report.summary.fieldsInventoried}.`,
    `- Supported fields: ${report.summary.supportedFields}.`,
    `- Runtime rank consumer allowed by this report: ${report.summary.runtimeRankConsumerAllowedByThisReport}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSupportedFieldInventoryReport(args: {
  reportDir?: string;
  artifactPaths?: string[];
  artifacts?: { artifactPath: string; artifact: Record<string, unknown> }[];
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSupportedFieldInventoryReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const artifactInputs = args.artifacts || (args.artifactPaths || latestSingleDayArtifacts(reportDir)).map((artifactPath) => ({
    artifactPath: path.resolve(artifactPath),
    artifact: readJson<Record<string, unknown>>(path.resolve(artifactPath)),
  }));
  const rows: Record<string, unknown>[] = [];
  let eventsScanned = 0;
  for (const input of artifactInputs) {
    const audit = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorRealMetadataReplayAuditReport({
      artifactPath: input.artifactPath,
      artifact: input.artifact,
    });
    const keepLaterKeys = new Set(audit.rows
      .filter((row) => row.selectorDecision === 'keep_later_sweep_proof' && row.deterministicLevelsValid)
      .map((row) => row.candidateKey));
    const events = artifactEvents(input.artifact);
    eventsScanned += events.length;
    for (const event of events) {
      const eventTime = typeof event.eventTime === 'string' ? event.eventTime : '';
      const statuses = (event.setupCandidateStatus as Record<string, unknown> | undefined)?.statuses;
      if (!Array.isArray(statuses)) continue;
      statuses.forEach((status, index) => {
        if (!status || typeof status !== 'object') return;
        const row = status as Record<string, unknown>;
        const setupType = typeof row.setupType === 'string' ? row.setupType : '';
        const direction = row.direction === 'LONG' || row.direction === 'SHORT' ? row.direction : '';
        if (keepLaterKeys.has(candidateKey(eventTime, index, setupType, direction))) rows.push(row);
      });
    }
  }
  const fieldStats = TARGET_FIELDS.map((field): FieldStatRow => {
    const values = rows.map((row) => printable(valueAt(row, field))).filter((value): value is string => value !== null);
    const distinctValues = [...new Set(values)].sort((a, b) => a.localeCompare(b));
    const presentRate = rows.length ? round(values.length / rows.length) : 0;
    return {
      field,
      observedRows: rows.length,
      presentRows: values.length,
      presentRate,
      distinctValues: distinctValues.slice(0, 12),
      supportedForNextMiner: rows.length > 0 && presentRate >= 0.95 && distinctValues.length > 1,
    };
  });
  const blockers = [
    artifactInputs.length === 0 ? 'missing saved single-day scanner artifacts' : null,
    rows.length === 0 ? 'no keep_later_sweep_proof rows with valid deterministic levels found' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSupportedFieldInventoryReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_keep_later_proof_selector_supported_field_inventory',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { reportDir, artifactPaths: artifactInputs.map((input) => input.artifactPath) },
    assumptions: {
      savedArtifactsOnly: true,
      usesCurrentProofSelectionSignalBuilder: true,
      inventoriesKeepLaterRowsWithValidLevelsOnly: true,
      noRuntimeRankingChange: true,
      runtimeRankConsumerAllowedByThisReport: false,
    },
    summary: {
      artifactsRead: artifactInputs.length,
      eventsScanned,
      keepLaterRowsWithValidLevels: rows.length,
      fieldsInventoried: fieldStats.length,
      supportedFields: fieldStats.filter((row) => row.supportedForNextMiner).length,
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation: blockers.length ? 'fix_inputs' : 'mine_supported_fields_against_outcomes',
    },
    fieldStats,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved artifact coverage before supported-field inventory.']
      : [
        'Use only supported fields with high presence and multiple values in the next outcome separator miner.',
        'Keep this research-only; it does not justify any scanner-visible rank consumer by itself.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function runCli(): void {
  const args = process.argv.slice(2);
  const reportDir = path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR);
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityKeepLaterProofSelectorSupportedFieldInventoryReport({ reportDir });
  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `raw-ohlc-scanner-artifact-openingdrive-priority-keep-later-proof-selector-supported-field-inventory-${Date.now()}.json`);
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  if (args.includes('--json')) console.log(JSON.stringify({ outPath, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  else {
    console.log(report.markdown);
    console.log(`\nReport written: ${outPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli();
}
