import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface CliOptions {
  lossProfile: string;
  structuralContext: string;
  samebarReport: string;
  outDir: string;
  json: boolean;
}

interface Authority {
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
}

type LossClass =
  | 'replay_stop_then_later_targets'
  | 'first_replay_bar_stop'
  | 'target_room_risk_context'
  | 'duplicate_reentry_cluster'
  | 'unclassified_loss';

interface LossProfileRow {
  tradeDate: string;
  session: string;
  proofTime: string;
  direction: string;
  prioritySetupType: string;
  priorityOneMesPl: number | null;
  priorityLoss: boolean;
  priorityEntry: number | null;
  priorityStop: number | null;
  priorityRiskPoints: number;
  initialRankTags: string[];
  postEntryResearchTags: string[];
}

interface StructuralRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  proofTime: string;
  direction: string;
  prioritySetupType: string;
  priorityOneMesPl: number | null;
  priorityLoss: boolean;
  bestConditionalSetupType: string | null;
  executionStatus: string | null;
  blockReason: string | null;
  targetRoomStatus: string | null;
  htfLineInSandStatus: string | null;
  timeframeMssStatus: string | null;
  riskAdvisoryStatus: string | null;
  structuralTags: string[];
}

interface SameBarRow {
  ticketId: string;
  outcomeLabel: string;
  outcomeStatus: string;
  resolvedOneMesPl: number | null;
  proofTime: string;
  entryHitTime: string | null;
  firstReplayBarTime: string | null;
  stopHitTime: string | null;
  t1HitTime: string | null;
  t2HitTime: string | null;
  riskPoints: number | null;
  mfeR: number | null;
  maeR: number | null;
  separatorTags: string[];
}

interface ClassifiedLossRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  proofTime: string;
  direction: string;
  prioritySetupType: string;
  priorityOneMesPl: number | null;
  priorityEntry: number | null;
  priorityStop: number | null;
  priorityRiskPoints: number | null;
  bestConditionalSetupType: string | null;
  blockReason: string | null;
  targetRoomStatus: string | null;
  riskAdvisoryStatus: string | null;
  outcomeLabel: string | null;
  stopHitTime: string | null;
  t1HitTime: string | null;
  t2HitTime: string | null;
  mfeR: number | null;
  maeR: number | null;
  duplicateClusterKey: string;
  duplicateClusterSize: number;
  classes: LossClass[];
  recommendation: 'do_not_install_filter' | 'review_reentry_handling' | 'needs_manual_case_review';
}

export interface RawOhlcScannerArtifactOpeningDrivePriorityLossCaseClassifierReport {
  reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_loss_case_classifier';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: Authority;
  source: {
    lossProfile: string;
    structuralContext: string;
    samebarReport: string;
  };
  assumptions: {
    consumesSavedReportsOnly: true;
    classifiesResearchLossRowsOnly: true;
    duplicateClusterUsesEntryStopAndTargetTiming: true;
    stopThenLaterTargetsMeansReplayOrderingNotLiveApproval: true;
    livePromotionAllowed: false;
  };
  summary: {
    lossRows: number;
    duplicateClusters: number;
    clusteredRows: number;
    replayStopThenLaterTargetsRows: number;
    firstReplayBarStopRows: number;
    targetRoomRiskContextRows: number;
    unclassifiedLossRows: number;
    livePromotionAllowedRows: 0;
    broadeningAllowedNow: false;
    recommendation: 'do_not_install_filter' | 'inspect_reentry_and_dedupe_policy' | 'fix_inputs';
  };
  rows: ClassifiedLossRow[];
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

function latestMatchingFile(pattern: RegExp): string | null {
  if (!fs.existsSync(DEFAULT_REPORT_DIR)) return null;
  const matches = fs.readdirSync(DEFAULT_REPORT_DIR)
    .filter((file) => pattern.test(file))
    .map((file) => path.join(DEFAULT_REPORT_DIR, file))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return matches[0] || null;
}

export function parseRawOhlcScannerArtifactOpeningDrivePriorityLossCaseClassifierArgs(
  argv = process.argv.slice(2),
): CliOptions {
  const outDir = path.resolve(readFlag(argv, '--out-dir') || DEFAULT_REPORT_DIR);
  const lossProfile = readFlag(argv, '--loss-profile') ||
    latestMatchingFile(/^raw-ohlc-scanner-artifact-openingdrive-priority-loss-profile-\d+\.json$/);
  const structuralContext = readFlag(argv, '--structural-context') ||
    latestMatchingFile(/^raw-ohlc-scanner-artifact-openingdrive-priority-structural-context-miner-\d+\.json$/);
  const samebarReport = readFlag(argv, '--samebar-report') ||
    latestMatchingFile(/^raw-ohlc-scanner-artifact-samebar-separator-drilldown-\d+\.json$/);
  if (!lossProfile) throw new Error('--loss-profile is required.');
  if (!structuralContext) throw new Error('--structural-context is required.');
  if (!samebarReport) throw new Error('--samebar-report is required.');
  return {
    lossProfile: path.resolve(lossProfile),
    structuralContext: path.resolve(structuralContext),
    samebarReport: path.resolve(samebarReport),
    outDir,
    json: argv.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): Authority {
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

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function rowKey(row: Pick<LossProfileRow, 'tradeDate' | 'session' | 'proofTime' | 'direction' | 'prioritySetupType'>): string {
  return [row.tradeDate, row.session, row.proofTime, row.direction, row.prioritySetupType].join('|');
}

function clusterKey(profile: LossProfileRow, samebar: SameBarRow | null): string {
  return [
    profile.tradeDate,
    profile.session,
    profile.direction,
    profile.prioritySetupType,
    profile.priorityEntry ?? 'no-entry',
    profile.priorityStop ?? 'no-stop',
    samebar?.stopHitTime ?? 'no-stop-hit',
    samebar?.t1HitTime ?? 'no-t1',
    samebar?.t2HitTime ?? 'no-t2',
  ].join('|');
}

function classify(args: {
  profile: LossProfileRow;
  structural: StructuralRow;
  samebar: SameBarRow | null;
  clusterSize: number;
}): LossClass[] {
  const classes: LossClass[] = [];
  if (args.samebar?.stopHitTime && (args.samebar.t1HitTime || args.samebar.t2HitTime)) {
    classes.push('replay_stop_then_later_targets');
  }
  if (args.samebar?.separatorTags.includes('first_replay_bar_stop')) {
    classes.push('first_replay_bar_stop');
  }
  if (
    args.structural.targetRoomStatus === 'blocked_before_t1' ||
    args.structural.riskAdvisoryStatus === 'RISK_ABOVE_STANDARD_LIMIT' ||
    args.structural.riskAdvisoryStatus === 'RISK_EXTENDED_STRUCTURAL'
  ) {
    classes.push('target_room_risk_context');
  }
  if (args.clusterSize > 1) classes.push('duplicate_reentry_cluster');
  return classes.length ? [...new Set(classes)] : ['unclassified_loss'];
}

function rowRecommendation(classes: LossClass[]): ClassifiedLossRow['recommendation'] {
  if (classes.includes('unclassified_loss')) return 'needs_manual_case_review';
  if (classes.includes('replay_stop_then_later_targets') || classes.includes('duplicate_reentry_cluster')) return 'review_reentry_handling';
  return 'do_not_install_filter';
}

function buildMarkdown(report: Omit<RawOhlcScannerArtifactOpeningDrivePriorityLossCaseClassifierReport, 'markdown'>): string {
  return [
    '# OpeningDrive Priority Loss Case Classifier',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only read-only research classifier. It consumes saved reports only and does not change scanner behavior, canExecute, Discord, Supabase, bridge behavior, entry/stop/target/risk math, or live promotion.',
    '',
    '## Summary',
    '',
    `- Loss rows: ${report.summary.lossRows}.`,
    `- Duplicate clusters / clustered rows: ${report.summary.duplicateClusters}/${report.summary.clusteredRows}.`,
    `- Stop-then-later-target rows: ${report.summary.replayStopThenLaterTargetsRows}.`,
    `- First replay bar stop rows: ${report.summary.firstReplayBarStopRows}.`,
    `- Target-room/risk-context rows: ${report.summary.targetRoomRiskContextRows}.`,
    `- Unclassified loss rows: ${report.summary.unclassifiedLossRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Loss Rows',
    '',
    ...report.rows.map((row) => `- ${row.tradeDate} ${row.proofTime} ${row.prioritySetupType} ${row.direction}: P/L ${row.priorityOneMesPl}, best ${row.bestConditionalSetupType || 'none'}, risk ${row.priorityRiskPoints}, classes ${row.classes.join(', ')}.`),
    '',
    '## Recommendations',
    '',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildRawOhlcScannerArtifactOpeningDrivePriorityLossCaseClassifierReport(args: {
  lossProfilePath: string;
  structuralContextPath: string;
  samebarReportPath: string;
  lossProfile: { rows?: LossProfileRow[] };
  structuralContext: { rows?: StructuralRow[]; status?: string };
  samebarReport: { rows?: SameBarRow[]; status?: string };
}, generatedAt = new Date().toISOString()): RawOhlcScannerArtifactOpeningDrivePriorityLossCaseClassifierReport {
  const profileLosses = asArray<LossProfileRow>(args.lossProfile.rows).filter((row) => row.priorityLoss);
  const structuralByKey = new Map(asArray<StructuralRow>(args.structuralContext.rows)
    .filter((row) => row.priorityLoss)
    .map((row) => [rowKey(row), row]));
  const samebarByTicket = new Map(asArray<SameBarRow>(args.samebarReport.rows).map((row) => [row.ticketId, row]));
  const clusterKeys = new Map<string, number>();
  for (const profile of profileLosses) {
    const structural = structuralByKey.get(rowKey(profile));
    const samebar = structural ? samebarByTicket.get(structural.ticketId) || null : null;
    const key = clusterKey(profile, samebar);
    clusterKeys.set(key, (clusterKeys.get(key) || 0) + 1);
  }
  const rows = profileLosses.flatMap((profile): ClassifiedLossRow[] => {
    const structural = structuralByKey.get(rowKey(profile));
    if (!structural) return [];
    const samebar = samebarByTicket.get(structural.ticketId) || null;
    const key = clusterKey(profile, samebar);
    const duplicateClusterSize = clusterKeys.get(key) || 1;
    const classes = classify({ profile, structural, samebar, clusterSize: duplicateClusterSize });
    return [{
      ticketId: structural.ticketId,
      tradeDate: profile.tradeDate,
      session: profile.session,
      proofTime: profile.proofTime,
      direction: profile.direction,
      prioritySetupType: profile.prioritySetupType,
      priorityOneMesPl: profile.priorityOneMesPl,
      priorityEntry: profile.priorityEntry,
      priorityStop: profile.priorityStop,
      priorityRiskPoints: profile.priorityRiskPoints,
      bestConditionalSetupType: structural.bestConditionalSetupType,
      blockReason: structural.blockReason,
      targetRoomStatus: structural.targetRoomStatus,
      riskAdvisoryStatus: structural.riskAdvisoryStatus,
      outcomeLabel: samebar?.outcomeLabel || null,
      stopHitTime: samebar?.stopHitTime || null,
      t1HitTime: samebar?.t1HitTime || null,
      t2HitTime: samebar?.t2HitTime || null,
      mfeR: samebar?.mfeR ?? null,
      maeR: samebar?.maeR ?? null,
      duplicateClusterKey: key,
      duplicateClusterSize,
      classes,
      recommendation: rowRecommendation(classes),
    }];
  });
  const blockers = [
    args.structuralContext.status && args.structuralContext.status !== 'pass' ? 'structural context report did not pass' : null,
    args.samebarReport.status && args.samebarReport.status !== 'pass' ? 'same-bar report did not pass' : null,
    rows.length !== profileLosses.length ? `classified ${rows.length} of ${profileLosses.length} loss rows` : null,
  ].filter((item): item is string => Boolean(item));
  const duplicateClusters = [...clusterKeys.values()].filter((count) => count > 1).length;
  const clusteredRows = rows.filter((row) => row.duplicateClusterSize > 1).length;
  const replayStopThenLaterTargetsRows = rows.filter((row) => row.classes.includes('replay_stop_then_later_targets')).length;
  const firstReplayBarStopRows = rows.filter((row) => row.classes.includes('first_replay_bar_stop')).length;
  const targetRoomRiskContextRows = rows.filter((row) => row.classes.includes('target_room_risk_context')).length;
  const unclassifiedLossRows = rows.filter((row) => row.classes.includes('unclassified_loss')).length;
  const recommendation = blockers.length
    ? 'fix_inputs'
    : unclassifiedLossRows === 0 && (replayStopThenLaterTargetsRows > 0 || clusteredRows > 0)
      ? 'inspect_reentry_and_dedupe_policy'
      : 'do_not_install_filter';
  const base: Omit<RawOhlcScannerArtifactOpeningDrivePriorityLossCaseClassifierReport, 'markdown'> = {
    reportType: 'raw_ohlc_scanner_artifact_openingdrive_priority_loss_case_classifier',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      lossProfile: args.lossProfilePath,
      structuralContext: args.structuralContextPath,
      samebarReport: args.samebarReportPath,
    },
    assumptions: {
      consumesSavedReportsOnly: true,
      classifiesResearchLossRowsOnly: true,
      duplicateClusterUsesEntryStopAndTargetTiming: true,
      stopThenLaterTargetsMeansReplayOrderingNotLiveApproval: true,
      livePromotionAllowed: false,
    },
    summary: {
      lossRows: rows.length,
      duplicateClusters,
      clusteredRows,
      replayStopThenLaterTargetsRows,
      firstReplayBarStopRows,
      targetRoomRiskContextRows,
      unclassifiedLossRows,
      livePromotionAllowedRows: 0,
      broadeningAllowedNow: false,
      recommendation,
    },
    rows,
    blockers,
    recommendations: recommendation === 'inspect_reentry_and_dedupe_policy'
      ? [
        'Do not install a new rank penalty from these losses.',
        'Next narrow phase should inspect re-entry/deduplication policy because clustered rows repeatedly stop first and later reach targets.',
        'Keep canExecute, entry, stop, target, Discord, Supabase, bridge, and live scanner behavior unchanged.',
      ]
      : ['Do not install a live rank filter from this case classifier.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

function writeReport(report: RawOhlcScannerArtifactOpeningDrivePriorityLossCaseClassifierReport, outDir: string): string {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-scanner-artifact-openingdrive-priority-loss-case-classifier-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outDir, `${base}.md`), `${report.markdown}\n`, 'utf8');
  return jsonPath;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const options = parseRawOhlcScannerArtifactOpeningDrivePriorityLossCaseClassifierArgs();
  const report = buildRawOhlcScannerArtifactOpeningDrivePriorityLossCaseClassifierReport({
    lossProfilePath: options.lossProfile,
    structuralContextPath: options.structuralContext,
    samebarReportPath: options.samebarReport,
    lossProfile: readJson(options.lossProfile),
    structuralContext: readJson(options.structuralContext),
    samebarReport: readJson(options.samebarReport),
  });
  const jsonPath = writeReport(report, options.outDir);
  if (options.json) console.log(JSON.stringify({ status: report.status, jsonPath, summary: report.summary, blockers: report.blockers }, null, 2));
  else { console.log(report.markdown); console.log(`\nWrote ${jsonPath}`); }
  if (report.status !== 'pass') process.exitCode = 1;
}
