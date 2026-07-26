import fs from 'node:fs';
import path from 'node:path';

type Quality = 'tight' | 'usable' | 'loose' | 'reject';

interface Args {
  selectorJson: string;
  json: boolean;
}

interface SelectorRow {
  trade: {
    date: string;
    session: 'morning' | 'lunch';
    direction: 'LONG' | 'SHORT';
    entryTimeEt: string;
    entry: number;
    exit: number;
    dollars: number;
  };
  matched: boolean;
  quality: Quality;
  bestDetection: null | {
    proofTime: string | null;
    entry: number;
    stop: number;
    target1: number;
    target2: number;
    riskPoints: number;
    htfContext: string;
    raidLevel?: number | null;
    raidLevelLabel?: string | null;
    displacementTime?: string | null;
    displacementQuality?: 'possible' | 'confirmed' | 'high_quality' | null;
    evidence?: string[];
  };
  minutesBeforeEntry: number | null;
  entryDistancePoints: number | null;
  candidateCount: number;
  scannerInstallEligible: false;
  promotionEligible: false;
  discordEligible: false;
  executionApprovalEligible: false;
}

interface SelectorReport {
  reportType?: string;
  source?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  rows?: SelectorRow[];
}

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  return args[index + 1] || null;
}

function parseArgs(argv = process.argv.slice(2)): Args {
  const selectorJson = readFlag(argv, '--selector-json');
  if (!selectorJson) throw new Error('--selector-json is required');
  return {
    selectorJson,
    json: argv.includes('--json'),
  };
}

function readSelector(filePath: string): SelectorReport {
  const root = JSON.parse(fs.readFileSync(filePath, 'utf8')) as SelectorReport;
  return {
    ...root,
    rows: Array.isArray(root.rows) ? root.rows : [],
  };
}

function money(rows: SelectorRow[]): number {
  return Math.round(rows.reduce((sum, row) => sum + row.trade.dollars, 0) * 100) / 100;
}

function riskBucket(riskPoints: number | null | undefined): string {
  if (typeof riskPoints !== 'number' || !Number.isFinite(riskPoints)) return 'missing';
  if (riskPoints <= 8) return 'risk_le_8';
  if (riskPoints <= 16) return 'risk_8_to_16';
  if (riskPoints <= 32) return 'risk_16_to_32';
  return 'risk_gt_32';
}

function proofLeadBucket(minutesBeforeEntry: number | null): string {
  if (typeof minutesBeforeEntry !== 'number' || !Number.isFinite(minutesBeforeEntry)) return 'proof_missing';
  if (minutesBeforeEntry === 0) return 'proof_same_bar';
  if (minutesBeforeEntry <= 10) return 'proof_1_to_10m';
  if (minutesBeforeEntry <= 20) return 'proof_11_to_20m';
  if (minutesBeforeEntry <= 30) return 'proof_21_to_30m';
  return 'proof_gt_30m';
}

function entryDistanceBucket(points: number | null): string {
  if (typeof points !== 'number' || !Number.isFinite(points)) return 'distance_missing';
  if (points <= 1) return 'distance_le_1';
  if (points <= 3) return 'distance_1_to_3';
  if (points <= 5) return 'distance_3_to_5';
  return 'distance_gt_5';
}

function hasEvidence(row: SelectorRow, phrase: string): boolean {
  return Boolean(row.bestDetection?.evidence?.some((line) => line.toLowerCase().includes(phrase)));
}

function clausesFor(row: SelectorRow): string[] {
  const detection = row.bestDetection;
  return [
    `quality=${row.quality}`,
    `session=${row.trade.session}`,
    `direction=${row.trade.direction}`,
    `htf=${detection?.htfContext || 'missing'}`,
    `displacement=${detection?.displacementQuality || 'missing'}`,
    proofLeadBucket(row.minutesBeforeEntry),
    entryDistanceBucket(row.entryDistancePoints),
    riskBucket(detection?.riskPoints),
    `candidate_count=${row.candidateCount}`,
    hasEvidence(row, 'left imbalance') ? 'evidence_left_imbalance' : 'evidence_no_imbalance',
    hasEvidence(row, 'broke structure') ? 'evidence_broke_structure' : 'evidence_no_structure_break',
  ];
}

function groupByClause(rows: SelectorRow[], selected: SelectorRow[]) {
  const allCounts = new Map<string, { clause: string; allRows: number; selectedRows: number; allDollars: number; selectedDollars: number }>();
  const selectedKeys = new Set(selected.map((row) => JSON.stringify(row.trade)));
  for (const row of rows) {
    for (const clause of clausesFor(row)) {
      const current = allCounts.get(clause) || { clause, allRows: 0, selectedRows: 0, allDollars: 0, selectedDollars: 0 };
      current.allRows += 1;
      current.allDollars += row.trade.dollars;
      if (selectedKeys.has(JSON.stringify(row.trade))) {
        current.selectedRows += 1;
        current.selectedDollars += row.trade.dollars;
      }
      allCounts.set(clause, current);
    }
  }
  return [...allCounts.values()]
    .map((item) => ({
      ...item,
      allDollars: Math.round(item.allDollars * 100) / 100,
      selectedDollars: Math.round(item.selectedDollars * 100) / 100,
      selectedRate: item.allRows ? Math.round((item.selectedRows / item.allRows) * 10000) / 10000 : 0,
    }))
    .sort((a, b) =>
      b.selectedRows - a.selectedRows ||
      b.selectedDollars - a.selectedDollars ||
      b.selectedRate - a.selectedRate ||
      a.clause.localeCompare(b.clause)
    );
}

function topConjunctions(selected: SelectorRow[]) {
  const pairs = new Map<string, { clausePair: string; rows: number; dollars: number }>();
  for (const row of selected) {
    const clauses = clausesFor(row).filter((clause) =>
      clause.startsWith('session=') ||
      clause.startsWith('direction=') ||
      clause.startsWith('htf=') ||
      clause.startsWith('displacement=') ||
      clause.startsWith('proof_') ||
      clause.startsWith('distance_') ||
      clause.startsWith('risk_') ||
      clause === 'evidence_left_imbalance' ||
      clause === 'evidence_broke_structure'
    );
    for (let leftIndex = 0; leftIndex < clauses.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < clauses.length; rightIndex += 1) {
        const clausePair = [clauses[leftIndex], clauses[rightIndex]].sort().join(' + ');
        const current = pairs.get(clausePair) || { clausePair, rows: 0, dollars: 0 };
        current.rows += 1;
        current.dollars += row.trade.dollars;
        pairs.set(clausePair, current);
      }
    }
  }
  return [...pairs.values()]
    .map((item) => ({ ...item, dollars: Math.round(item.dollars * 100) / 100 }))
    .sort((a, b) => b.rows - a.rows || b.dollars - a.dollars || a.clausePair.localeCompare(b.clausePair))
    .slice(0, 20);
}

export function buildRaidFailureDisplacementSourceClauseMiner(args: Args) {
  const report = readSelector(args.selectorJson);
  const rows = report.rows || [];
  const selected = rows.filter((row) => row.quality === 'tight' || row.quality === 'usable');
  const tight = rows.filter((row) => row.quality === 'tight');
  const usable = rows.filter((row) => row.quality === 'usable');
  const loose = rows.filter((row) => row.quality === 'loose');
  const rejected = rows.filter((row) => row.quality === 'reject');
  const clauses = groupByClause(rows, selected);
  const conjunctions = topConjunctions(selected);

  return {
    reportType: 'raid_failure_displacement_source_clause_miner',
    generatedAt: new Date().toISOString(),
    authority: {
      localSelectorArtifactOnly: true,
      noScannerWiring: true,
      noDiscordPost: true,
      noSupabaseRead: true,
      noSupabaseWrite: true,
      noBridgeRead: true,
      noExecutionApproval: true,
    },
    source: {
      selectorJson: args.selectorJson,
      selectorReportType: report.reportType || null,
    },
    summary: {
      rows: rows.length,
      selectedRows: selected.length,
      tightRows: tight.length,
      usableRows: usable.length,
      looseRows: loose.length,
      rejectRows: rejected.length,
      selectedDollars: money(selected),
      tightDollars: money(tight),
      usableDollars: money(usable),
      looseDollars: money(loose),
      rejectedDollars: money(rejected),
      shortSelectedRows: selected.filter((row) => row.trade.direction === 'SHORT').length,
      longSelectedRows: selected.filter((row) => row.trade.direction === 'LONG').length,
      morningSelectedRows: selected.filter((row) => row.trade.session === 'morning').length,
      lunchSelectedRows: selected.filter((row) => row.trade.session === 'lunch').length,
      scannerInstallEligibleRows: 0,
      promotionEligibleRows: 0,
      discordEligibleRows: 0,
      executionApprovalEligibleRows: 0,
    },
    topClauses: clauses.slice(0, 30),
    topConjunctions: conjunctions,
    selectedTrades: selected.map((row) => ({
      trade: row.trade,
      quality: row.quality,
      proofLeadBucket: proofLeadBucket(row.minutesBeforeEntry),
      entryDistanceBucket: entryDistanceBucket(row.entryDistancePoints),
      riskBucket: riskBucket(row.bestDetection?.riskPoints),
      htfContext: row.bestDetection?.htfContext || null,
      displacementQuality: row.bestDetection?.displacementQuality || null,
      evidenceLeftImbalance: hasEvidence(row, 'left imbalance'),
      evidenceBrokeStructure: hasEvidence(row, 'broke structure'),
    })),
    recommendation: selected.length
      ? 'draft_scanner_preview_clause_from_high_coverage_pre_entry_fields_only'
      : 'do_not_prepare_scanner_preview_for_this_model',
  };
}

function writeReport(report: ReturnType<typeof buildRaidFailureDisplacementSourceClauseMiner>): string {
  const outDir = path.resolve('tools/automation/diagnostic-reports');
  fs.mkdirSync(outDir, { recursive: true });
  const filePath = path.join(outDir, `raid-failure-displacement-source-clause-miner-${Date.now()}.json`);
  fs.writeFileSync(filePath, `${JSON.stringify(report, null, 2)}\n`);
  return filePath;
}

if (process.argv[1] && path.basename(process.argv[1]) === 'raid-failure-displacement-source-clause-miner.ts') {
  const args = parseArgs();
  const report = buildRaidFailureDisplacementSourceClauseMiner(args);
  const outputPath = writeReport(report);
  const result = { outputPath, status: 'pass', summary: report.summary, recommendation: report.recommendation };
  console.log(args.json ? JSON.stringify(result, null, 2) : `Wrote ${outputPath}\n${JSON.stringify(report.summary, null, 2)}`);
}
