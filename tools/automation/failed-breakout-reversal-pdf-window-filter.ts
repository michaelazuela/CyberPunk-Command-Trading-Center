import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

type SessionName = 'morning' | 'lunch';
type Direction = 'LONG' | 'SHORT';

interface Args {
  pdfPath: string | null;
  pdfTextPath: string | null;
  replayProofJson: string;
  startDate: string;
  endDate: string;
  windowMinutes: number;
  maxEntryDistancePoints: number;
  json: boolean;
}

interface PdfTrade {
  date: string;
  session: SessionName;
  direction: Direction;
  entryTimeEt: string;
  exitTimeEt: string;
  entry: number;
  exit: number;
  points: number;
  dollars: number;
  qty: number;
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
  failedLevel: number | null;
  failedLevelLabel: string | null;
  htfContext: string;
  evidence: string[];
}

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  return args[index + 1] || null;
}

function parseArgs(argv = process.argv.slice(2)): Args {
  const replayProofJson = readFlag(argv, '--replay-proof-json');
  if (!replayProofJson) throw new Error('--replay-proof-json is required');
  return {
    pdfPath: readFlag(argv, '--pdf'),
    pdfTextPath: readFlag(argv, '--pdf-text'),
    replayProofJson,
    startDate: readFlag(argv, '--start-date') || '2026-06-08',
    endDate: readFlag(argv, '--end-date') || '2026-06-28',
    windowMinutes: Number(readFlag(argv, '--window-minutes') || 60),
    maxEntryDistancePoints: Number(readFlag(argv, '--max-entry-distance-points') || 12),
    json: argv.includes('--json'),
  };
}

function minutesOfDay(isoOrLocal: string): number {
  const match = /T(\d{2}):(\d{2})/.exec(isoOrLocal);
  if (!match) return -1;
  return Number(match[1]) * 60 + Number(match[2]);
}

function sessionFromEt(iso: string): SessionName | null {
  const minutes = minutesOfDay(iso);
  if (minutes >= 9 * 60 + 15 && minutes <= 12 * 60) return 'morning';
  if (minutes >= 12 * 60 && minutes <= 16 * 60) return 'lunch';
  return null;
}

function sameDayMinuteDelta(later: string, earlier: string): number {
  return minutesOfDay(later) - minutesOfDay(earlier);
}

function extractTextFromPdf(pdfPath: string): string {
  const script = [
    'import sys',
    'from pypdf import PdfReader',
    'reader = PdfReader(sys.argv[1])',
    "print('\\n'.join(page.extract_text() or '' for page in reader.pages))",
  ].join('\n');
  return execFileSync('python', ['-c', script, pdfPath], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
}

export function extractProfitablePdfTradesFromText(text: string, startDate: string, endDate: string): PdfTrade[] {
  const pattern = /(\d{2}\/\d{2}\/2026)\s+(\d{2}:\d{2}:\d{2})\s+(AM|PM)\(GMT\)\s+FILL\s+([\d-]+)\s+([\d-]+)\s+([\d.]+)\s+([\d,]+)/g;
  const fills: Array<{ et: string; date: string; buyQty: number; sellQty: number; price: number }> = [];
  for (const match of text.matchAll(pattern)) {
    const [, dateRaw, timeRaw, ampm, buyRaw, sellRaw, priceRaw] = match;
    const [month, day, year] = dateRaw.split('/').map(Number);
    const [hourRaw, minute, second] = timeRaw.split(':').map(Number);
    const hour24 = (hourRaw % 12) + (ampm === 'PM' ? 12 : 0);
    const gmt = new Date(Date.UTC(year, month - 1, day, hour24, minute, second));
    const et = new Date(gmt.getTime() - 4 * 60 * 60 * 1000);
    const iso = et.toISOString().replace('.000Z', '');
    fills.push({
      et: iso,
      date: iso.slice(0, 10),
      buyQty: buyRaw === '-' ? 0 : Number(buyRaw),
      sellQty: sellRaw === '-' ? 0 : Number(sellRaw),
      price: Number(priceRaw),
    });
  }

  const openLots: Array<{ side: 'BUY' | 'SELL'; qty: number; price: number; et: string; date: string }> = [];
  const trades: PdfTrade[] = [];
  for (const fill of fills) {
    let qty = fill.buyQty || fill.sellQty;
    const side: 'BUY' | 'SELL' = fill.buyQty ? 'BUY' : 'SELL';
    while (
      qty > 0 &&
      openLots.length &&
      ((openLots[0].side === 'BUY' && side === 'SELL') || (openLots[0].side === 'SELL' && side === 'BUY'))
    ) {
      const lot = openLots[0];
      const closeQty = Math.min(qty, lot.qty);
      const direction: Direction = lot.side === 'BUY' ? 'LONG' : 'SHORT';
      const points = direction === 'LONG' ? fill.price - lot.price : lot.price - fill.price;
      const session = sessionFromEt(lot.et);
      if (session && lot.date >= startDate && lot.date <= endDate && points > 0) {
        trades.push({
          date: lot.date,
          session,
          direction,
          entryTimeEt: lot.et,
          exitTimeEt: fill.et,
          entry: lot.price,
          exit: fill.price,
          points: Math.round(points * 100) / 100,
          dollars: Math.round(points * 5 * closeQty * 100) / 100,
          qty: closeQty,
        });
      }
      lot.qty -= closeQty;
      qty -= closeQty;
      if (lot.qty === 0) openLots.shift();
    }
    if (qty > 0) {
      openLots.push({ side, qty, price: fill.price, et: fill.et, date: fill.date });
    }
  }
  return trades;
}

function readReplayRows(filePath: string): ReplayRow[] {
  const root = JSON.parse(fs.readFileSync(filePath, 'utf8')) as { rows?: ReplayRow[] };
  return Array.isArray(root.rows) ? root.rows : [];
}

export function buildFailedBreakoutReversalPdfWindowFilter(args: Args) {
  const text = args.pdfTextPath
    ? fs.readFileSync(args.pdfTextPath, 'utf8')
    : args.pdfPath
      ? extractTextFromPdf(args.pdfPath)
      : '';
  if (!text) throw new Error('Provide --pdf or --pdf-text');
  const trades = extractProfitablePdfTradesFromText(text, args.startDate, args.endDate);
  const replayRows = readReplayRows(args.replayProofJson);
  const matches = trades.map((trade) => {
    const candidates = replayRows
      .filter((row) => row.date === trade.date && row.session === trade.session && row.direction === trade.direction && row.proofTime)
      .map((row) => ({
        row,
        minutesBeforeEntry: sameDayMinuteDelta(trade.entryTimeEt, row.proofTime || ''),
        entryDistancePoints: Math.abs(trade.entry - row.entry),
      }))
      .filter((item) =>
        item.minutesBeforeEntry >= 0 &&
        item.minutesBeforeEntry <= args.windowMinutes &&
        item.entryDistancePoints <= args.maxEntryDistancePoints
      )
      .sort((a, b) => a.minutesBeforeEntry - b.minutesBeforeEntry || a.entryDistancePoints - b.entryDistancePoints);
    return {
      trade,
      matched: candidates.length > 0,
      bestDetection: candidates[0]?.row || null,
      minutesBeforeEntry: candidates[0]?.minutesBeforeEntry ?? null,
      entryDistancePoints: candidates[0]?.entryDistancePoints ?? null,
      candidateCount: candidates.length,
    };
  });
  const matched = matches.filter((item) => item.matched);
  return {
    reportType: 'failed_breakout_reversal_pdf_window_filter',
    generatedAt: new Date().toISOString(),
    authority: {
      localPdfReadOnly: true,
      localReplayArtifactOnly: true,
      noScannerWiring: true,
      noDiscordPost: true,
      noSupabaseRead: true,
      noSupabaseWrite: true,
      noBridgeRead: true,
      noExecutionApproval: true,
    },
    source: {
      pdfPath: args.pdfPath,
      pdfTextPath: args.pdfTextPath,
      replayProofJson: args.replayProofJson,
      startDate: args.startDate,
      endDate: args.endDate,
      windowMinutes: args.windowMinutes,
      maxEntryDistancePoints: args.maxEntryDistancePoints,
    },
    summary: {
      profitablePdfTrades: trades.length,
      replayDetections: replayRows.length,
      matchedTrades: matched.length,
      unmatchedTrades: trades.length - matched.length,
      matchedLongTrades: matched.filter((item) => item.trade.direction === 'LONG').length,
      matchedShortTrades: matched.filter((item) => item.trade.direction === 'SHORT').length,
      matchedDollars: Math.round(matched.reduce((sum, item) => sum + item.trade.dollars, 0) * 100) / 100,
      totalProfitableDollars: Math.round(trades.reduce((sum, item) => sum + item.dollars, 0) * 100) / 100,
      supportHtfMatches: matched.filter((item) => item.bestDetection?.htfContext === 'support').length,
      conflictHtfMatches: matched.filter((item) => item.bestDetection?.htfContext === 'conflict').length,
    },
    matches,
  };
}

function writeReport(report: ReturnType<typeof buildFailedBreakoutReversalPdfWindowFilter>): string {
  const outDir = path.resolve('tools/automation/diagnostic-reports');
  fs.mkdirSync(outDir, { recursive: true });
  const filePath = path.join(
    outDir,
    `failed-breakout-reversal-pdf-window-filter-${report.source.startDate}-to-${report.source.endDate}-${Date.now()}.json`
  );
  fs.writeFileSync(filePath, `${JSON.stringify(report, null, 2)}\n`);
  return filePath;
}

if (process.argv[1] && path.basename(process.argv[1]) === 'failed-breakout-reversal-pdf-window-filter.ts') {
  const args = parseArgs();
  const report = buildFailedBreakoutReversalPdfWindowFilter(args);
  const outputPath = writeReport(report);
  const result = { outputPath, status: 'pass', summary: report.summary };
  console.log(args.json ? JSON.stringify(result, null, 2) : `Wrote ${outputPath}\n${JSON.stringify(report.summary, null, 2)}`);
}
