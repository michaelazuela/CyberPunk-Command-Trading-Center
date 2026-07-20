import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UnifiedPositiveHeldLocalPreviewSweepBoostCollisionDrilldownReport } from './unified-positive-held-local-preview-sweep-boost-collision-drilldown';

type Bucket = 'improved' | 'worsened' | 'same';

interface CandidateShape {
  setupType?: string;
  direction?: string;
  confidence?: string;
  riskPoints?: number | null;
  riskPolicy?: string;
  rankScore?: number;
  levelContextSummary?: string;
  evidence?: string[];
  missingEvidence?: string[];
  targetRoom?: { targetRoomStatus?: string; targetRoomReason?: string };
  activeRuleset?: {
    htfLineInSand?: {
      status?: string;
      obstacleSource?: string | null;
      obstacleType?: string | null;
    };
  };
}

interface ArtifactEventShape {
  eventTime?: string;
  date?: string;
  session?: string;
  setupCandidateStatus?: { statuses?: CandidateShape[] };
}

interface ArtifactShape {
  events?: Record<string, ArtifactEventShape>;
}

interface JoinedCollisionRow {
  period: 'train' | 'test';
  slateId: string;
  ticketId: string;
  bucket: Bucket;
  deltaOneMesPl: number | null;
  session: string;
  beforeSetupType: string | null;
  direction: string;
  features: string[];
}

interface SegmentSummary {
  rows: number;
  improved: number;
  worsened: number;
  same: number;
  deltaOneMesPl: number | null;
}

interface GuardSegment {
  feature: string;
  train: SegmentSummary;
  test: SegmentSummary;
  total: SegmentSummary;
  score: number;
  verdict: 'caution_candidate' | 'too_much_improved_collision' | 'insufficient_transfer';
  reason: string;
}

export interface UnifiedPositiveHeldLocalPreviewSweepBoostCollisionSnapshotGuardMinerReport {
  reportType: 'unified_positive_held_local_preview_sweep_boost_collision_snapshot_guard_miner';
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
    trainCollisionPath: string | null;
    trainArtifactPath: string | null;
    testCollisionPath: string | null;
    testArtifactPath: string | null;
  };
  assumptions: {
    savedReportsOnly: true;
    extractsScannerSnapshotFieldsOnly: true;
    outcomeBucketsUsedOnlyForEvaluation: true;
    noRuntimeRankingChange: true;
    runtimeRankConsumerAllowedByThisReport: false;
  };
  summary: {
    trainRows: number;
    testRows: number;
    trainMatchedRows: number;
    testMatchedRows: number;
    cautionCandidates: number;
    bestCandidateFeature: string | null;
    bestCandidateTrainWorsened: number;
    bestCandidateTestWorsened: number;
    bestCandidateTotalDeltaOneMesPl: number | null;
    runtimeRankConsumerAllowedByThisReport: false;
    recommendation: 'validate_caution_candidate' | 'mine_more_fields' | 'fix_inputs';
  };
  cautionCandidates: GuardSegment[];
  otherSegments: GuardSegment[];
  rows: JoinedCollisionRow[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const SETUP = 'SweepMssFvgRetrace';

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function readJson<T>(filePath: string | null): T | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function authority(): UnifiedPositiveHeldLocalPreviewSweepBoostCollisionSnapshotGuardMinerReport['authority'] {
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

function normalizeTime(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  return value.trim().replace(/\.\d+/, '').replace(/(?:Z|[+-]\d{2}:\d{2})$/, '').slice(0, 19);
}

function eventTime(eventKey: string, event: ArtifactEventShape): string {
  return normalizeTime(event.eventTime) || normalizeTime(eventKey) || eventKey;
}

function ticketId(event: ArtifactEventShape, candidate: CandidateShape, time: string): string {
  return [
    event.date || time.slice(0, 10),
    event.session || 'unknown',
    candidate.setupType || 'UnknownSetup',
    candidate.direction || 'UNKNOWN',
    time.replace(/[^0-9T]/g, '').slice(0, 15),
  ].join('-');
}

function artifactIndex(artifact: ArtifactShape | null): Map<string, CandidateShape> {
  const index = new Map<string, CandidateShape>();
  for (const [eventKey, event] of Object.entries(artifact?.events || {})) {
    const time = eventTime(eventKey, event);
    for (const candidate of event.setupCandidateStatus?.statuses || []) {
      if (candidate.setupType === SETUP) index.set(ticketId(event, candidate, time), candidate);
    }
  }
  return index;
}

function riskBucket(value: unknown): string {
  const risk = Number(value);
  if (!Number.isFinite(risk)) return 'risk_unknown';
  if (risk <= 4) return 'risk_lte_4';
  if (risk <= 8) return 'risk_4_8';
  if (risk <= 12) return 'risk_8_12';
  return 'risk_gt_12';
}

function rankBucket(value: unknown): string {
  const rank = Number(value);
  if (!Number.isFinite(rank)) return 'rank_unknown';
  if (rank < 100) return 'rank_lt100';
  if (rank < 120) return 'rank_100_119';
  if (rank < 140) return 'rank_120_139';
  return 'rank_gte140';
}

function textTags(candidate: CandidateShape): string[] {
  const text = [
    candidate.levelContextSummary || '',
    candidate.targetRoom?.targetRoomReason || '',
    ...(candidate.evidence || []),
    ...(candidate.missingEvidence || []),
  ].join(' | ').toLowerCase();
  const tags: Array<[string, string]> = [
    ['clean 1.5r path unavailable', 'txt_blocked_before_1r'],
    ['t1 1.5r is available', 'txt_t1_available'],
    ['t2 2.0r extension is obstructed', 'txt_t2_obstructed'],
    ['rth open', 'txt_rth_open'],
    ['rth morning', 'txt_rth_morning'],
    ['london', 'txt_london'],
    ['asian', 'txt_asian'],
    ['imbalance', 'txt_imbalance'],
    ['session low', 'txt_session_low'],
    ['session high', 'txt_session_high'],
    ['chop', 'txt_chop'],
    ['opposing completed 5m', 'txt_opposing_5m'],
    ['avoid shorts in discount', 'txt_avoid_short_discount'],
    ['avoid longs in premium', 'txt_avoid_long_premium'],
    ['risk exceeds standard', 'txt_risk_exceeds'],
  ];
  return tags.filter(([needle]) => text.includes(needle)).map(([, tag]) => tag);
}

function features(row: UnifiedPositiveHeldLocalPreviewSweepBoostCollisionDrilldownReport['rows'][number], candidate: CandidateShape): string[] {
  const base = [
    `session=${row.session}`,
    `direction=${candidate.direction || 'UNKNOWN'}`,
    `session_direction=${row.session}|${candidate.direction || 'UNKNOWN'}`,
    `confidence=${candidate.confidence || 'unknown'}`,
    `risk=${riskBucket(candidate.riskPoints)}`,
    `riskPolicy=${candidate.riskPolicy || 'unknown'}`,
    `target=${candidate.targetRoom?.targetRoomStatus || 'target_unknown'}`,
    `htfStatus=${candidate.activeRuleset?.htfLineInSand?.status || 'htf_unknown'}`,
    `htfObs=${candidate.activeRuleset?.htfLineInSand?.obstacleSource || 'none'}:${candidate.activeRuleset?.htfLineInSand?.obstacleType || 'none'}`,
    `rank=${rankBucket(candidate.rankScore)}`,
    `before=${row.before.setupType || 'unknown'}`,
    ...textTags(candidate),
  ];
  const combos: string[] = [];
  for (let i = 0; i < base.length; i += 1) {
    for (let j = i + 1; j < base.length; j += 1) combos.push(`${base[i]}&&${base[j]}`);
  }
  return [...base, ...combos];
}

function joinCollisionRows(
  period: 'train' | 'test',
  collision: UnifiedPositiveHeldLocalPreviewSweepBoostCollisionDrilldownReport | null,
  artifact: ArtifactShape | null,
): { rows: JoinedCollisionRow[]; sourceRows: number; matchedRows: number } {
  const index = artifactIndex(artifact);
  const sourceRows = (collision?.rows || []).filter((row) => row.after.setupType === SETUP);
  const rows = sourceRows.flatMap((row) => {
    const ticket = row.after.ticketId;
    const candidate = ticket ? index.get(ticket) : null;
    if (!ticket || !candidate) return [];
    return [{
      period,
      slateId: row.slateId,
      ticketId: ticket,
      bucket: row.bucket,
      deltaOneMesPl: row.deltaOneMesPl,
      session: row.session,
      beforeSetupType: row.before.setupType,
      direction: candidate.direction || row.after.direction || 'UNKNOWN',
      features: features(row, candidate),
    }];
  });
  return { rows, sourceRows: sourceRows.length, matchedRows: rows.length };
}

function summarize(rows: JoinedCollisionRow[]): SegmentSummary {
  return {
    rows: rows.length,
    improved: rows.filter((row) => row.bucket === 'improved').length,
    worsened: rows.filter((row) => row.bucket === 'worsened').length,
    same: rows.filter((row) => row.bucket === 'same').length,
    deltaOneMesPl: sum(rows.map((row) => row.deltaOneMesPl)),
  };
}

function classify(train: SegmentSummary, test: SegmentSummary): Pick<GuardSegment, 'verdict' | 'reason' | 'score'> {
  const totalWorsened = train.worsened + test.worsened;
  const totalImproved = train.improved + test.improved;
  const score = round(((train.deltaOneMesPl ?? 0) + (test.deltaOneMesPl ?? 0)) - totalImproved * 50 - train.same * 5 - test.same * 5);
  if (train.worsened > 0 && test.worsened > 0 && totalImproved <= 1) {
    return {
      verdict: 'caution_candidate',
      reason: 'Feature catches worsened Sweep replacements in both periods while colliding with at most one improved replacement.',
      score,
    };
  }
  if (totalWorsened > 0 && totalImproved > 1) {
    return {
      verdict: 'too_much_improved_collision',
      reason: 'Feature catches worsened replacements, but would also suppress multiple improved Sweep replacements.',
      score,
    };
  }
  return {
    verdict: 'insufficient_transfer',
    reason: 'Feature does not catch worsened Sweep replacements in both train and test periods.',
    score,
  };
}

function buildSegments(trainRows: JoinedCollisionRow[], testRows: JoinedCollisionRow[]): GuardSegment[] {
  const keys = [...new Set([...trainRows, ...testRows].flatMap((row) => row.features))];
  return keys.map((feature) => {
    const train = summarize(trainRows.filter((row) => row.features.includes(feature)));
    const test = summarize(testRows.filter((row) => row.features.includes(feature)));
    const total = summarize([...trainRows, ...testRows].filter((row) => row.features.includes(feature)));
    return { feature, train, test, total, ...classify(train, test) };
  }).sort((a, b) => a.score - b.score || b.total.worsened - a.total.worsened || a.feature.localeCompare(b.feature));
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewSweepBoostCollisionSnapshotGuardMinerReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Sweep Boost Collision Snapshot Guard Miner',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only saved-report scanner-snapshot guard mining. It does not install ranking behavior, run setupScanner, post Discord, write Supabase, read live bridge data, change canExecute, or change trade math.',
    '',
    '## Summary',
    `- Train/test source rows: ${report.summary.trainRows}/${report.summary.testRows}.`,
    `- Train/test matched rows: ${report.summary.trainMatchedRows}/${report.summary.testMatchedRows}.`,
    `- Caution candidates: ${report.summary.cautionCandidates}.`,
    `- Best feature: ${report.summary.bestCandidateFeature || '-'}.`,
    `- Best train/test worsened: ${report.summary.bestCandidateTrainWorsened}/${report.summary.bestCandidateTestWorsened}.`,
    `- Best total delta: ${report.summary.bestCandidateTotalDeltaOneMesPl ?? '-'}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Top Caution Candidates',
    '| Feature | Train I/W/S | Train Delta | Test I/W/S | Test Delta | Total I/W/S | Total Delta | Score |',
    '|---|---|---:|---|---:|---|---:|---:|',
    ...report.cautionCandidates.slice(0, 20).map((row) => `| ${row.feature.replace(/\|/g, '/')} | ${row.train.improved}/${row.train.worsened}/${row.train.same} | ${row.train.deltaOneMesPl ?? '-'} | ${row.test.improved}/${row.test.worsened}/${row.test.same} | ${row.test.deltaOneMesPl ?? '-'} | ${row.total.improved}/${row.total.worsened}/${row.total.same} | ${row.total.deltaOneMesPl ?? '-'} | ${row.score} |`),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewSweepBoostCollisionSnapshotGuardMinerReport(args: {
  reportDir?: string;
  trainCollisionPath?: string | null;
  trainArtifactPath?: string | null;
  testCollisionPath?: string | null;
  testArtifactPath?: string | null;
  trainCollisionReport?: UnifiedPositiveHeldLocalPreviewSweepBoostCollisionDrilldownReport | null;
  trainArtifact?: ArtifactShape | null;
  testCollisionReport?: UnifiedPositiveHeldLocalPreviewSweepBoostCollisionDrilldownReport | null;
  testArtifact?: ArtifactShape | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewSweepBoostCollisionSnapshotGuardMinerReport {
  const reportDir = path.resolve(args.reportDir || DEFAULT_REPORT_DIR);
  const trainCollisionPath = args.trainCollisionPath ?? latestMatchingFile(reportDir, /^unified-positive-held-local-preview-sweep-boost-collision-drilldown-\d+\.json$/);
  const testCollisionPath = args.testCollisionPath ?? trainCollisionPath;
  const trainArtifactPath = args.trainArtifactPath ?? null;
  const testArtifactPath = args.testArtifactPath ?? null;
  const trainCollisionReport = args.trainCollisionReport ?? readJson<UnifiedPositiveHeldLocalPreviewSweepBoostCollisionDrilldownReport>(trainCollisionPath);
  const testCollisionReport = args.testCollisionReport ?? readJson<UnifiedPositiveHeldLocalPreviewSweepBoostCollisionDrilldownReport>(testCollisionPath);
  const trainArtifact = args.trainArtifact ?? readJson<ArtifactShape>(trainArtifactPath);
  const testArtifact = args.testArtifact ?? readJson<ArtifactShape>(testArtifactPath);
  const trainJoin = joinCollisionRows('train', trainCollisionReport, trainArtifact);
  const testJoin = joinCollisionRows('test', testCollisionReport, testArtifact);
  const segments = buildSegments(trainJoin.rows, testJoin.rows);
  const cautionCandidates = segments.filter((segment) => segment.verdict === 'caution_candidate');
  const best = cautionCandidates[0] || null;
  const blockers = [
    !trainCollisionPath && !args.trainCollisionReport ? 'missing train collision drilldown path' : null,
    !testCollisionPath && !args.testCollisionReport ? 'missing test collision drilldown path' : null,
    !trainArtifactPath && !args.trainArtifact ? 'missing train raw scanner artifact path' : null,
    !testArtifactPath && !args.testArtifact ? 'missing test raw scanner artifact path' : null,
    !trainCollisionReport ? 'missing train collision drilldown report' : null,
    !testCollisionReport ? 'missing test collision drilldown report' : null,
    !trainArtifact ? 'missing train raw scanner artifact' : null,
    !testArtifact ? 'missing test raw scanner artifact' : null,
    trainCollisionReport && trainCollisionReport.status !== 'pass' ? `train collision status ${trainCollisionReport.status}` : null,
    testCollisionReport && testCollisionReport.status !== 'pass' ? `test collision status ${testCollisionReport.status}` : null,
    trainJoin.sourceRows > 0 && trainJoin.matchedRows !== trainJoin.sourceRows ? `train matched ${trainJoin.matchedRows}/${trainJoin.sourceRows}` : null,
    testJoin.sourceRows > 0 && testJoin.matchedRows !== testJoin.sourceRows ? `test matched ${testJoin.matchedRows}/${testJoin.sourceRows}` : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<UnifiedPositiveHeldLocalPreviewSweepBoostCollisionSnapshotGuardMinerReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_sweep_boost_collision_snapshot_guard_miner',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: { reportDir, trainCollisionPath, trainArtifactPath, testCollisionPath, testArtifactPath },
    assumptions: {
      savedReportsOnly: true,
      extractsScannerSnapshotFieldsOnly: true,
      outcomeBucketsUsedOnlyForEvaluation: true,
      noRuntimeRankingChange: true,
      runtimeRankConsumerAllowedByThisReport: false,
    },
    summary: {
      trainRows: trainJoin.sourceRows,
      testRows: testJoin.sourceRows,
      trainMatchedRows: trainJoin.matchedRows,
      testMatchedRows: testJoin.matchedRows,
      cautionCandidates: cautionCandidates.length,
      bestCandidateFeature: best?.feature || null,
      bestCandidateTrainWorsened: best?.train.worsened || 0,
      bestCandidateTestWorsened: best?.test.worsened || 0,
      bestCandidateTotalDeltaOneMesPl: best?.total.deltaOneMesPl ?? null,
      runtimeRankConsumerAllowedByThisReport: false,
      recommendation: blockers.length ? 'fix_inputs' : best ? 'validate_caution_candidate' : 'mine_more_fields',
    },
    cautionCandidates,
    otherSegments: segments.filter((segment) => segment.verdict !== 'caution_candidate').slice(0, 50),
    rows: [...trainJoin.rows, ...testJoin.rows].sort((a, b) => a.period.localeCompare(b.period) || a.slateId.localeCompare(b.slateId)),
    blockers,
    recommendations: blockers.length
      ? ['Fix saved collision drilldown and raw scanner artifact inputs before guard mining.']
      : best
        ? [
          'Treat the top caution feature as research-only until validated against another fresh scanner-artifact package.',
          'Do not install a raw Sweep boost or penalty from this report alone.',
          'Keep canExecute, Discord, Supabase, bridge behavior, entry/stop/target/risk, and live ranking unchanged.',
        ]
        : [
          'No transferable caution feature found from the current scanner snapshot fields; mine richer fields before any live proposal.',
          'Keep canExecute, Discord, Supabase, bridge behavior, entry/stop/target/risk, and live ranking unchanged.',
        ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewSweepBoostCollisionSnapshotGuardMinerReport(
  report: UnifiedPositiveHeldLocalPreviewSweepBoostCollisionSnapshotGuardMinerReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-sweep-boost-collision-snapshot-guard-miner-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewSweepBoostCollisionSnapshotGuardMinerCli(args = process.argv.slice(2)): void {
  const outDir = path.resolve(readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR);
  const report = buildUnifiedPositiveHeldLocalPreviewSweepBoostCollisionSnapshotGuardMinerReport({
    reportDir: outDir,
    trainCollisionPath: readFlag(args, '--train-collision'),
    trainArtifactPath: readFlag(args, '--train-artifact'),
    testCollisionPath: readFlag(args, '--test-collision'),
    testArtifactPath: readFlag(args, '--test-artifact'),
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewSweepBoostCollisionSnapshotGuardMinerReport(report, outDir);
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, cautionCandidates: report.cautionCandidates.slice(0, 10), blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runUnifiedPositiveHeldLocalPreviewSweepBoostCollisionSnapshotGuardMinerCli();
}
