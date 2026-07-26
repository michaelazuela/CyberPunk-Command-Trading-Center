import fs from 'node:fs';
import path from 'node:path';

type MatchQuality = 'tight' | 'usable' | 'loose' | 'reject';

interface Args {
  pdfWindowFilterJson: string;
  json: boolean;
}

interface FilterMatch {
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
  bestDetection: null | {
    proofTime: string | null;
    entry: number;
    stop: number;
    target1: number;
    target2: number;
    riskPoints: number;
    failedLevel?: number | null;
    failedLevelLabel?: string | null;
    htfContext: string;
  };
  minutesBeforeEntry: number | null;
  entryDistancePoints: number | null;
  candidateCount: number;
}

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  return args[index + 1] || null;
}

function parseArgs(argv = process.argv.slice(2)): Args {
  const pdfWindowFilterJson = readFlag(argv, '--pdf-window-filter-json');
  if (!pdfWindowFilterJson) throw new Error('--pdf-window-filter-json is required');
  return {
    pdfWindowFilterJson,
    json: argv.includes('--json'),
  };
}

function classify(match: FilterMatch): { quality: MatchQuality; reasons: string[] } {
  if (!match.matched || !match.bestDetection || match.minutesBeforeEntry === null || match.entryDistancePoints === null) {
    return { quality: 'reject', reasons: ['No matched detector proof for profitable PDF trade.'] };
  }
  const reasons = [
    `Proof ${match.minutesBeforeEntry} minutes before entry.`,
    `Detector entry ${match.entryDistancePoints.toFixed(2)} points from PDF entry.`,
    `HTF context ${match.bestDetection.htfContext}.`,
  ];
  if (match.minutesBeforeEntry <= 20 && match.entryDistancePoints <= 3 && match.bestDetection.htfContext !== 'conflict') {
    return { quality: 'tight', reasons };
  }
  if (match.minutesBeforeEntry <= 30 && match.entryDistancePoints <= 5) {
    return { quality: 'usable', reasons };
  }
  if (match.minutesBeforeEntry <= 60 && match.entryDistancePoints <= 12) {
    return { quality: 'loose', reasons };
  }
  return { quality: 'reject', reasons };
}

export function buildFailedBreakoutReversalTightMatchSelector(args: Args) {
  const root = JSON.parse(fs.readFileSync(args.pdfWindowFilterJson, 'utf8')) as { matches?: FilterMatch[]; summary?: Record<string, unknown> };
  const matches = Array.isArray(root.matches) ? root.matches : [];
  const rows = matches.map((match) => {
    const classification = classify(match);
    return {
      ...match,
      quality: classification.quality,
      selectorReasons: classification.reasons,
      scannerInstallEligible: false,
      promotionEligible: false,
      discordEligible: false,
      executionApprovalEligible: false,
    };
  });
  const selected = rows.filter((row) => row.quality === 'tight' || row.quality === 'usable');
  const loose = rows.filter((row) => row.quality === 'loose');
  const rejected = rows.filter((row) => row.quality === 'reject');
  return {
    reportType: 'failed_breakout_reversal_tight_match_selector',
    generatedAt: new Date().toISOString(),
    authority: {
      localFilterArtifactOnly: true,
      noScannerWiring: true,
      noDiscordPost: true,
      noSupabaseRead: true,
      noSupabaseWrite: true,
      noBridgeRead: true,
      noExecutionApproval: true,
    },
    source: {
      pdfWindowFilterJson: args.pdfWindowFilterJson,
    },
    summary: {
      sourceProfitablePdfTrades: root.summary?.profitablePdfTrades ?? null,
      sourceMatchedTrades: root.summary?.matchedTrades ?? null,
      rows: rows.length,
      tightRows: rows.filter((row) => row.quality === 'tight').length,
      usableRows: rows.filter((row) => row.quality === 'usable').length,
      looseRows: loose.length,
      rejectRows: rejected.length,
      selectedRows: selected.length,
      selectedDollars: Math.round(selected.reduce((sum, row) => sum + row.trade.dollars, 0) * 100) / 100,
      looseDollars: Math.round(loose.reduce((sum, row) => sum + row.trade.dollars, 0) * 100) / 100,
      rejectedDollars: Math.round(rejected.reduce((sum, row) => sum + row.trade.dollars, 0) * 100) / 100,
      selectedShortRows: selected.filter((row) => row.trade.direction === 'SHORT').length,
      selectedLongRows: selected.filter((row) => row.trade.direction === 'LONG').length,
      selectedSupportHtfRows: selected.filter((row) => row.bestDetection?.htfContext === 'support').length,
      scannerInstallEligibleRows: 0,
      promotionEligibleRows: 0,
      discordEligibleRows: 0,
      executionApprovalEligibleRows: 0,
    },
    rows,
    recommendation: selected.length
      ? 'continue_replay_only_source_filtering_before_scanner_install'
      : 'do_not_install_detector_without_stricter_filters',
  };
}

function writeReport(report: ReturnType<typeof buildFailedBreakoutReversalTightMatchSelector>): string {
  const outDir = path.resolve('tools/automation/diagnostic-reports');
  fs.mkdirSync(outDir, { recursive: true });
  const filePath = path.join(outDir, `failed-breakout-reversal-tight-match-selector-${Date.now()}.json`);
  fs.writeFileSync(filePath, `${JSON.stringify(report, null, 2)}\n`);
  return filePath;
}

if (process.argv[1] && path.basename(process.argv[1]) === 'failed-breakout-reversal-tight-match-selector.ts') {
  const args = parseArgs();
  const report = buildFailedBreakoutReversalTightMatchSelector(args);
  const outputPath = writeReport(report);
  const result = { outputPath, status: 'pass', summary: report.summary, recommendation: report.recommendation };
  console.log(args.json ? JSON.stringify(result, null, 2) : `Wrote ${outputPath}\n${JSON.stringify(report.summary, null, 2)}`);
}
