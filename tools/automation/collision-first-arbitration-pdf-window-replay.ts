import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ExecutionStatus, NoTradeReason, SetupCandidate, SetupCandidateStatus, SetupType } from '../../src/types';
import { applyCollisionFirstArbitration } from '../../src/lib/collisionFirstArbitration';
import { scenarioScore } from '../../src/lib/scenarioSelection';
import { extractProfitablePdfTradesFromText } from './liquidity-raid-reclaim-reversal-pdf-window-filter';

type SessionName = 'morning' | 'lunch';
type Direction = 'LONG' | 'SHORT';
type ModelId =
  | 'LiquidityRaidReclaimReversal'
  | 'RaidFailureDisplacementReversal'
  | 'DrivePullbackContinuation'
  | 'StructureShiftContinuation'
  | 'FailedBreakoutReversal';

interface Args {
  pdfTextPath: string | null;
  pdfPath: string | null;
  startDate: string;
  endDate: string;
  windowMinutes: number;
  maxEntryDistancePoints: number;
  replayReports: string[];
  json: boolean;
}

interface ReplayRow {
  date: string;
  session: SessionName;
  proofTime: string | null;
  direction: Direction;
  entry: number;
  stop: number;
  target1: number;
  target2: number;
  riskPoints: number;
  htfContext?: string;
  evidence?: string[];
}

interface ModelRow extends ReplayRow {
  model: ModelId;
}

interface PdfTrade {
  date: string;
  session: SessionName;
  direction: Direction;
  entryTimeEt: string;
  entry: number;
  exit: number;
  dollars: number;
}

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  return args[index + 1] || null;
}

function readListFlag(args: string[], flag: string): string[] {
  const values: string[] = [];
  args.forEach((arg, index) => {
    if (arg === flag && args[index + 1]) values.push(args[index + 1]);
  });
  return values;
}

function parseArgs(argv = process.argv.slice(2)): Args {
  return {
    pdfTextPath: readFlag(argv, '--pdf-text'),
    pdfPath: readFlag(argv, '--pdf'),
    startDate: readFlag(argv, '--start-date') || '2026-06-08',
    endDate: readFlag(argv, '--end-date') || '2026-06-26',
    windowMinutes: Number(readFlag(argv, '--window-minutes') || 60),
    maxEntryDistancePoints: Number(readFlag(argv, '--max-entry-distance-points') || 12),
    replayReports: readListFlag(argv, '--replay-report'),
    json: argv.includes('--json'),
  };
}

function latestReport(pattern: RegExp): string {
  const outDir = path.resolve('tools/automation/diagnostic-reports');
  const file = fs.readdirSync(outDir)
    .filter((name) => pattern.test(name))
    .map((name) => ({ name, stat: fs.statSync(path.join(outDir, name)) }))
    .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs)[0];
  if (!file) throw new Error(`No diagnostic report matched ${pattern}`);
  return path.join(outDir, file.name);
}

function defaultReplayReports(): string[] {
  return [
    latestReport(/^liquidity-raid-reclaim-reversal-replay-proof-MES-2026-06-08-to-2026-06-28-\d+\.json$/),
    latestReport(/^raid-failure-displacement-reversal-replay-proof-MES-2026-06-08-to-2026-06-28-\d+\.json$/),
    latestReport(/^drive-pullback-continuation-replay-proof-MES-2026-06-08-to-2026-06-28-\d+\.json$/),
    latestReport(/^structure-shift-continuation-replay-proof-MES-2026-06-08-to-2026-06-28-\d+\.json$/),
    latestReport(/^failed-breakout-reversal-replay-proof-MES-2026-06-08-to-2026-06-28-\d+\.json$/),
  ];
}

function modelFromPath(filePath: string): ModelId {
  const name = path.basename(filePath);
  if (name.startsWith('liquidity-raid-reclaim-reversal')) return 'LiquidityRaidReclaimReversal';
  if (name.startsWith('raid-failure-displacement-reversal')) return 'RaidFailureDisplacementReversal';
  if (name.startsWith('drive-pullback-continuation')) return 'DrivePullbackContinuation';
  if (name.startsWith('structure-shift-continuation')) return 'StructureShiftContinuation';
  if (name.startsWith('failed-breakout-reversal')) return 'FailedBreakoutReversal';
  throw new Error(`Cannot infer model from ${filePath}`);
}

function setupTypeFromModel(model: ModelId): SetupType {
  if (model === 'LiquidityRaidReclaimReversal') return SetupType.LiquidityRaidReclaimReversal;
  if (model === 'RaidFailureDisplacementReversal') return SetupType.RaidFailureDisplacementReversal;
  if (model === 'DrivePullbackContinuation') return SetupType.DrivePullbackContinuation;
  if (model === 'FailedBreakoutReversal') return SetupType.FailedBreakoutReversal;
  return SetupType.StructureShiftContinuation;
}

function minutesOfDay(isoOrLocal: string): number {
  const match = /T(\d{2}):(\d{2})/.exec(isoOrLocal);
  if (!match) return -1;
  return Number(match[1]) * 60 + Number(match[2]);
}

function sameDayMinuteDelta(later: string, earlier: string): number {
  return minutesOfDay(later) - minutesOfDay(earlier);
}

function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function readPdfText(args: Args): string {
  if (args.pdfTextPath) return fs.readFileSync(args.pdfTextPath, 'utf8');
  if (!args.pdfPath) return '';
  const script = [
    'import sys',
    'from pypdf import PdfReader',
    'reader = PdfReader(sys.argv[1])',
    "print('\\n'.join(page.extract_text() or '' for page in reader.pages))",
  ].join('\n');
  return execFileSync('python', ['-c', script, args.pdfPath], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
}

function readRows(reportPath: string): ModelRow[] {
  const root = JSON.parse(fs.readFileSync(reportPath, 'utf8')) as { rows?: ReplayRow[] };
  const model = modelFromPath(reportPath);
  return (root.rows || [])
    .filter((row) =>
      row.proofTime &&
      (row.direction === 'LONG' || row.direction === 'SHORT') &&
      isValidNumber(row.entry) &&
      isValidNumber(row.stop) &&
      isValidNumber(row.target1) &&
      isValidNumber(row.target2) &&
      isValidNumber(row.riskPoints)
    )
    .map((row) => ({ ...row, model }));
}

function rowToCandidate(row: ModelRow): SetupCandidate {
  return {
    setupType: setupTypeFromModel(row.model),
    scenarioLabel: row.model,
    direction: row.direction,
    detectedStatus: SetupCandidateStatus.Detected,
    confidence: row.htfContext === 'support' ? 'High' : 'Medium',
    priority: setupTypeFromModel(row.model) === SetupType.StructureShiftContinuation ? 92 : 90,
    entry: row.entry,
    stop: row.stop,
    target1: row.target1,
    target2: row.target2,
    riskPoints: row.riskPoints,
    riskAdvisoryStatus: 'RISK_WITHIN_STANDARD_LIMIT',
    riskPolicy: 'STANDARD_RISK',
    invalidation: row.direction === 'LONG'
      ? `Invalid below protected 5M structure stop ${row.stop}.`
      : `Invalid above protected 5M structure stop ${row.stop}.`,
    entryClarity: 90,
    stopClarity: 90,
    targetClarity: 90,
    evidence: [
      ...(row.evidence || []),
      'Completed 5M proof from replay row.',
      'Protected 5M structure stop and app target math present.',
    ],
    missingEvidence: [],
    executionStatus: ExecutionStatus.Executable,
    blockReason: null,
    requiredTrigger: 'Completed 5M proof from replay row.',
    nextAction: 'Replay candidate only; no live behavior or Discord publishing.',
    reducedRiskPlan: null,
  };
}

function clusterKey(row: ModelRow): string {
  return `${row.date}|${row.session}|${row.proofTime}`;
}

function nearestTrade(trades: PdfTrade[], rows: ModelRow[], windowMinutes: number): PdfTrade | null {
  const proofTime = rows[0]?.proofTime;
  if (!proofTime) return null;
  return trades
    .filter((trade) => trade.date === rows[0].date && trade.session === rows[0].session)
    .map((trade) => ({ trade, minutesBeforeEntry: sameDayMinuteDelta(trade.entryTimeEt, proofTime) }))
    .filter((item) => item.minutesBeforeEntry >= 0 && item.minutesBeforeEntry <= windowMinutes)
    .sort((a, b) => a.minutesBeforeEntry - b.minutesBeforeEntry)[0]?.trade || null;
}

export function buildCollisionFirstArbitrationPdfWindowReplay(args: Args) {
  const text = readPdfText(args);
  if (!text) throw new Error('Provide --pdf or --pdf-text');
  const replayReports = args.replayReports.length ? args.replayReports : defaultReplayReports();
  const trades = extractProfitablePdfTradesFromText(text, args.startDate, args.endDate) as PdfTrade[];
  const rows = replayReports.flatMap(readRows)
    .filter((row) => row.date >= args.startDate && row.date <= args.endDate);
  const rowsInsidePdfWindow = rows.filter((row) =>
    trades.some((trade) =>
      trade.date === row.date &&
      trade.session === row.session &&
      row.proofTime &&
      sameDayMinuteDelta(trade.entryTimeEt, row.proofTime) >= 0 &&
      sameDayMinuteDelta(trade.entryTimeEt, row.proofTime) <= args.windowMinutes &&
      Math.abs(trade.entry - row.entry) <= args.maxEntryDistancePoints
    )
  );
  const groups = new Map<string, ModelRow[]>();
  rowsInsidePdfWindow.forEach((row) => {
    const key = clusterKey(row);
    groups.set(key, [...(groups.get(key) || []), row]);
  });
  const clusters = [...groups.entries()].map(([key, groupRows]) => {
    const candidates = groupRows.map(rowToCandidate);
    const arbitration = applyCollisionFirstArbitration(candidates);
    const naive = [...candidates].sort((a, b) => scenarioScore(b) - scenarioScore(a))[0] || null;
    const trade = nearestTrade(trades, groupRows, args.windowMinutes);
    return {
      key,
      date: groupRows[0].date,
      session: groupRows[0].session,
      proofTime: groupRows[0].proofTime,
      pdfTradeDirection: trade?.direction || null,
      pdfTradeEntryTime: trade?.entryTimeEt || null,
      rowCount: groupRows.length,
      longRows: groupRows.filter((row) => row.direction === 'LONG').length,
      shortRows: groupRows.filter((row) => row.direction === 'SHORT').length,
      models: groupRows.map((row) => `${row.model}:${row.direction}`),
      naiveDirection: naive?.direction || null,
      collisionState: arbitration.state,
      selectedDirection: arbitration.selectedCandidate?.direction || arbitration.allowedDirection,
      message: arbitration.message,
      preservesWinningSideAsEvidence: Boolean(trade && groupRows.some((row) => row.direction === trade.direction)),
      naiveOppositeSide: Boolean(trade && naive && naive.direction !== trade.direction),
      collisionOppositeSide: Boolean(trade && arbitration.selectedCandidate && arbitration.selectedCandidate.direction !== trade.direction),
    };
  });
  const collisionClusters = clusters.filter((cluster) => cluster.longRows > 0 && cluster.shortRows > 0);
  return {
    reportType: 'collision_first_arbitration_pdf_window_replay',
    generatedAt: new Date().toISOString(),
    authority: {
      localPdfReadOnly: true,
      localReplayArtifactOnly: true,
      noScannerRuntimeChange: true,
      noDiscordPost: true,
      noSupabaseRead: true,
      noSupabaseWrite: true,
      noBridgeRead: true,
      noExecutionApproval: true,
    },
    source: {
      replayReports,
      startDate: args.startDate,
      endDate: args.endDate,
      windowMinutes: args.windowMinutes,
      maxEntryDistancePoints: args.maxEntryDistancePoints,
    },
    summary: {
      profitablePdfTrades: trades.length,
      replayRowsLoaded: rows.length,
      rowsInsidePdfWindow: rowsInsidePdfWindow.length,
      clusters: clusters.length,
      collisionClusters: collisionClusters.length,
      collisionWaitClusters: collisionClusters.filter((cluster) => cluster.collisionState === 'collision_wait').length,
      naiveOppositeSidePromotions: collisionClusters.filter((cluster) => cluster.naiveOppositeSide).length,
      collisionOppositeSidePromotions: collisionClusters.filter((cluster) => cluster.collisionOppositeSide).length,
      winningSideEvidencePreserved: collisionClusters.filter((cluster) => cluster.preservesWinningSideAsEvidence).length,
      recommendation: collisionClusters.some((cluster) => cluster.collisionOppositeSide)
        ? 'inspect_remaining_opposite_side_collisions'
        : 'collision_first_arbitration_ready_for_local_scanner_selection',
    },
    clusters,
  };
}

function writeReport(report: ReturnType<typeof buildCollisionFirstArbitrationPdfWindowReplay>): string {
  const outDir = path.resolve('tools/automation/diagnostic-reports');
  fs.mkdirSync(outDir, { recursive: true });
  const filePath = path.join(outDir, `collision-first-arbitration-pdf-window-replay-${report.source.startDate}-to-${report.source.endDate}-${Date.now()}.json`);
  fs.writeFileSync(filePath, `${JSON.stringify(report, null, 2)}\n`);
  return filePath;
}

if (process.argv[1] && path.basename(process.argv[1]) === 'collision-first-arbitration-pdf-window-replay.ts') {
  const args = parseArgs();
  const report = buildCollisionFirstArbitrationPdfWindowReplay(args);
  const outputPath = writeReport(report);
  const result = { outputPath, status: 'pass', summary: report.summary };
  console.log(args.json ? JSON.stringify(result, null, 2) : `Wrote ${outputPath}\n${JSON.stringify(report.summary, null, 2)}`);
}
