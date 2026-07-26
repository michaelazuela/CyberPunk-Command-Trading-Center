import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UnifiedPositiveHeldLocalPreviewPositiveFamilyBoostValidationReport } from './unified-positive-held-local-preview-positive-family-boost-validation';
import type {
  UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport,
  UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow,
} from './unified-positive-held-local-preview-replay-package-source-proof-timing';

type TimingRow = UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingRow;
type CollisionBucket = 'improved' | 'worsened' | 'same';

interface TicketSnapshot {
  ticketId: string | null;
  setupType: string | null;
  outcomeBucket: TimingRow['outcomeBucket'] | null;
  resolvedOneMesPl: number | null;
  direction: string | null;
  proofTime: string | null;
  proofToEntryMinutes: number | null;
  proofToEntryBucket: string;
  riskPoints: number | null;
  riskBucket: string;
  mfeR: number | null;
  maeR: number | null;
  issueTags: string[];
}

interface CollisionRow {
  slateId: string;
  tradeDate: string;
  session: string;
  bucket: CollisionBucket;
  deltaOneMesPl: number | null;
  topChanged: boolean;
  before: TicketSnapshot;
  after: TicketSnapshot;
}

interface GroupSummary {
  key: string;
  rows: number;
  improved: number;
  worsened: number;
  same: number;
  deltaOneMesPl: number | null;
}

export interface UnifiedPositiveHeldLocalPreviewSweepBoostCollisionDrilldownReport {
  reportType: 'unified_positive_held_local_preview_sweep_boost_collision_drilldown';
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
    sourceProofTimingPath: string | null;
    boostValidationPath: string | null;
    selectedSetupTypes: string[];
  };
  assumptions: {
    savedReportsOnly: true;
    sweepOnlyBoostReportsExpected: true;
    outcomesUsedOnlyForEvaluation: true;
    noRuntimeRankingChange: true;
    runtimeRankConsumerAllowedByThisReport: false;
  };
  summary: {
    changedSlates: number;
    improvedSlates: number;
    worsenedSlates: number;
    sameSlates: number;
    changedTopSelectionDeltaOneMesPl: number | null;
    worsenedDeltaOneMesPl: number | null;
    worsenedWhereAfterSweep: number;
    worsenedWhereBeforeWinner: number;
    runtimeRankConsumerAllowedByThisReport: false;
    recommendation: 'mine_worsened_sweep_guard' | 'validate_sweep_boost_oos' | 'fix_inputs';
  };
  worsenedByBeforeSetup: GroupSummary[];
  worsenedByAfterIssueTag: GroupSummary[];
  worsenedByAfterProofToEntryBucket: GroupSummary[];
  worsenedByAfterRiskBucket: GroupSummary[];
  rows: CollisionRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const SWEEP = 'NoInstalledSetup';

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function readJson<T>(filePath: string | null): T | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): UnifiedPositiveHeldLocalPreviewSweepBoostCollisionDrilldownReport['authority'] {
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

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function sum(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function riskBucket(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'unknown';
  if (value <= 6) return '<=6';
  if (value <= 8) return '6.25-8';
  if (value <= 10) return '8.25-10';
  if (value <= 12) return '10.25-12';
  return '>12';
}

function proofToEntryBucket(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'unknown';
  if (value <= 0) return 'same_bar';
  if (value <= 10) return '1-10m';
  if (value <= 30) return '11-30m';
  return '>30m';
}

function snapshot(ticketId: string | null, timingByTicket: Map<string, TimingRow>): TicketSnapshot {
  const row = ticketId ? timingByTicket.get(ticketId) || null : null;
  return {
    ticketId,
    setupType: row?.setupType || null,
    outcomeBucket: row?.outcomeBucket || null,
    resolvedOneMesPl: row?.resolvedOneMesPl ?? null,
    direction: row?.direction || null,
    proofTime: row?.proofTime || null,
    proofToEntryMinutes: row?.proofToEntryMinutes ?? null,
    proofToEntryBucket: proofToEntryBucket(row?.proofToEntryMinutes),
    riskPoints: row?.riskPoints ?? null,
    riskBucket: riskBucket(row?.riskPoints),
    mfeR: row?.mfeR ?? null,
    maeR: row?.maeR ?? null,
    issueTags: row?.issueTags || [],
  };
}

function bucket(delta: number | null): CollisionBucket {
  if (typeof delta !== 'number' || !Number.isFinite(delta) || delta === 0) return 'same';
  return delta > 0 ? 'improved' : 'worsened';
}

function compareGroups(a: GroupSummary, b: GroupSummary): number {
  return b.rows - a.rows || (a.deltaOneMesPl ?? 0) - (b.deltaOneMesPl ?? 0) || a.key.localeCompare(b.key);
}

function groupRows(rows: CollisionRow[], keyFor: (row: CollisionRow) => string | string[]): GroupSummary[] {
  const groups = new Map<string, CollisionRow[]>();
  for (const row of rows) {
    const keys = keyFor(row);
    for (const key of Array.isArray(keys) ? keys : [keys]) {
      groups.set(key, [...(groups.get(key) || []), row]);
    }
  }
  return [...groups.entries()].map(([key, group]) => ({
    key,
    rows: group.length,
    improved: group.filter((row) => row.bucket === 'improved').length,
    worsened: group.filter((row) => row.bucket === 'worsened').length,
    same: group.filter((row) => row.bucket === 'same').length,
    deltaOneMesPl: sum(group.map((row) => row.deltaOneMesPl)),
  })).sort(compareGroups);
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewSweepBoostCollisionDrilldownReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Sweep Boost Collision Drilldown',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only saved-report Sweep boost collision drilldown. It does not install ranking behavior, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Changed slates: ${report.summary.changedSlates}.`,
    `- Improved/worsened/same: ${report.summary.improvedSlates}/${report.summary.worsenedSlates}/${report.summary.sameSlates}.`,
    `- Changed top-selection delta: ${report.summary.changedTopSelectionDeltaOneMesPl ?? '-'}.`,
    `- Worsened delta: ${report.summary.worsenedDeltaOneMesPl ?? '-'}.`,
    `- Worsened after Sweep: ${report.summary.worsenedWhereAfterSweep}.`,
    `- Worsened where prior top was a winner: ${report.summary.worsenedWhereBeforeWinner}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Worsened By Prior Model',
    '| Prior Model | Rows | Delta |',
    '|---|---:|---:|',
    ...report.worsenedByBeforeSetup.map((row) => `| ${row.key} | ${row.rows} | ${row.deltaOneMesPl ?? '-'} |`),
    '',
    '## Worsened By Sweep Issue Tag',
    '| Sweep Issue Tag | Rows | Delta |',
    '|---|---:|---:|',
    ...report.worsenedByAfterIssueTag.map((row) => `| ${row.key} | ${row.rows} | ${row.deltaOneMesPl ?? '-'} |`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewSweepBoostCollisionDrilldownReport(args: {
  reportDir?: string;
  sourceProofTimingPath?: string | null;
  boostValidationPath?: string | null;
  sourceProofTimingReport?: UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport | null;
  boostValidationReport?: UnifiedPositiveHeldLocalPreviewPositiveFamilyBoostValidationReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewSweepBoostCollisionDrilldownReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const sourceProofTimingPath = args.sourceProofTimingPath ?? latestMatchingFile(reportDir, /^unified-positive-held-local-preview-replay-package-source-proof-timing-\d+\.json$/);
  const boostValidationPath = args.boostValidationPath ?? latestMatchingFile(reportDir, /^unified-positive-held-local-preview-positive-family-boost-validation-\d+\.json$/);
  const sourceProofTimingReport = args.sourceProofTimingReport ?? readJson<UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport>(sourceProofTimingPath);
  const boostValidationReport = args.boostValidationReport ?? readJson<UnifiedPositiveHeldLocalPreviewPositiveFamilyBoostValidationReport>(boostValidationPath);
  const timingByTicket = new Map((sourceProofTimingReport?.rows || []).map((row) => [row.ticketId, row]));
  const selectedSetupTypes = boostValidationReport?.source.selectedSetupTypes || [];
  const changed = (boostValidationReport?.slates || [])
    .filter((slate) => slate.topChanged)
    .map((slate) => {
      const before = snapshot(slate.topBeforeTicketId, timingByTicket);
      const after = snapshot(slate.topAfterTicketId, timingByTicket);
      const delta = typeof slate.topBeforeOneMesPl === 'number' && typeof slate.topAfterOneMesPl === 'number'
        ? round(slate.topAfterOneMesPl - slate.topBeforeOneMesPl)
        : null;
      return {
        slateId: slate.slateId,
        tradeDate: slate.tradeDate,
        session: slate.session,
        bucket: bucket(delta),
        deltaOneMesPl: delta,
        topChanged: slate.topChanged,
        before,
        after,
      };
    }).sort((a, b) => a.tradeDate.localeCompare(b.tradeDate) || a.session.localeCompare(b.session));
  const worsened = changed.filter((row) => row.bucket === 'worsened');
  const blockers = [
    !sourceProofTimingPath && !args.sourceProofTimingReport ? 'missing source/proof timing path' : null,
    !boostValidationPath && !args.boostValidationReport ? 'missing positive-family boost validation path' : null,
    !sourceProofTimingReport ? 'missing source/proof timing report' : null,
    !boostValidationReport ? 'missing positive-family boost validation report' : null,
    sourceProofTimingReport && sourceProofTimingReport.status !== 'pass' ? `source/proof timing status ${sourceProofTimingReport.status}` : null,
    boostValidationReport && boostValidationReport.status !== 'pass' ? `positive-family boost validation status ${boostValidationReport.status}` : null,
    boostValidationReport && (selectedSetupTypes.length !== 1 || selectedSetupTypes[0] !== SWEEP) ? `expected Sweep-only boost validation, got ${selectedSetupTypes.join(',') || 'none'}` : null,
    boostValidationReport && boostValidationReport.summary.topChangedSlates === 0 ? 'no changed slates found' : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<UnifiedPositiveHeldLocalPreviewSweepBoostCollisionDrilldownReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_sweep_boost_collision_drilldown',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir,
      sourceProofTimingPath,
      boostValidationPath,
      selectedSetupTypes,
    },
    assumptions: {
      savedReportsOnly: true,
      sweepOnlyBoostReportsExpected: true,
      outcomesUsedOnlyForEvaluation: true,
      noRuntimeRankingChange: true,
      runtimeRankConsumerAllowedByThisReport: false,
    },
    summary: {
      changedSlates: changed.length,
      improvedSlates: changed.filter((row) => row.bucket === 'improved').length,
      worsenedSlates: worsened.length,
      sameSlates: changed.filter((row) => row.bucket === 'same').length,
      changedTopSelectionDeltaOneMesPl: sum(changed.map((row) => row.deltaOneMesPl)),
      worsenedDeltaOneMesPl: sum(worsened.map((row) => row.deltaOneMesPl)),
      worsenedWhereAfterSweep: worsened.filter((row) => row.after.setupType === SWEEP).length,
      worsenedWhereBeforeWinner: worsened.filter((row) => row.before.outcomeBucket === 'winner_t1_t2').length,
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation: blockers.length ? 'fix_inputs' : worsened.length ? 'mine_worsened_sweep_guard' : 'validate_sweep_boost_oos',
    },
    worsenedByBeforeSetup: groupRows(worsened, (row) => row.before.setupType || 'missing_before_setup'),
    worsenedByAfterIssueTag: groupRows(worsened, (row) => row.after.issueTags.length ? row.after.issueTags : ['no_issue_tags']),
    worsenedByAfterProofToEntryBucket: groupRows(worsened, (row) => row.after.proofToEntryBucket),
    worsenedByAfterRiskBucket: groupRows(worsened, (row) => row.after.riskBucket),
    rows: changed,
    blockers,
    recommendations: blockers.length
      ? ['Fix saved source/proof and Sweep-only boost validation inputs before collision drilldown.']
      : worsened.length
        ? [
          'Do not install a raw Sweep model-family boost yet; worsened changed slates need a no-lookahead collision guard.',
          'Mine a guard against Sweep replacements that collide with profitable OpeningDrive, HTF continuation, Intraday, or AfterLunch tops.',
          'Keep canExecute, Discord, Supabase, bridge behavior, entry/stop/target/risk, and live ranking unchanged from this diagnostic.',
        ]
        : [
          'Sweep-only boost has no changed-slate collision in this package; validate on another OOS package before any live proposal.',
          'Keep canExecute, Discord, Supabase, bridge behavior, entry/stop/target/risk, and live ranking unchanged from this diagnostic.',
        ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewSweepBoostCollisionDrilldownReport(
  report: UnifiedPositiveHeldLocalPreviewSweepBoostCollisionDrilldownReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-sweep-boost-collision-drilldown-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewSweepBoostCollisionDrilldownCli(args = process.argv.slice(2)): void {
  const outDir = path.resolve(readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR);
  const sourceProofTimingPath = readFlag(args, '--source-proof-timing') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-replay-package-source-proof-timing-\d+\.json$/);
  const boostValidationPath = readFlag(args, '--boost-validation') ||
    latestMatchingFile(outDir, /^unified-positive-held-local-preview-positive-family-boost-validation-\d+\.json$/);
  const report = buildUnifiedPositiveHeldLocalPreviewSweepBoostCollisionDrilldownReport({
    reportDir: outDir,
    sourceProofTimingPath,
    boostValidationPath,
    sourceProofTimingReport: readJson<UnifiedPositiveHeldLocalPreviewReplayPackageSourceProofTimingReport>(sourceProofTimingPath),
    boostValidationReport: readJson<UnifiedPositiveHeldLocalPreviewPositiveFamilyBoostValidationReport>(boostValidationPath),
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewSweepBoostCollisionDrilldownReport(report, outDir);
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runUnifiedPositiveHeldLocalPreviewSweepBoostCollisionDrilldownCli();
}
