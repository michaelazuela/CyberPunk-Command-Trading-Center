import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildRawOhlcReplayAdapterReport,
  writeRawOhlcReplayAdapterReport,
} from './raw-ohlc-replay-adapter';
import {
  buildRawOhlcScannerCycleReplayReport,
  writeRawOhlcScannerCycleReplayReport,
} from './raw-ohlc-scanner-cycle-replay';
import {
  buildRawOhlcSourceLoaderReport,
  writeRawOhlcSourceLoaderReport,
} from './raw-ohlc-source-loader';

interface CliOptions {
  startDate: string;
  endDate: string;
  instrument: string;
  auditDir: string;
  outDir: string;
  inputJson: string | null;
  json: boolean;
}

export interface RawOhlcResearchPipelineReport {
  reportType: 'raw_ohlc_research_pipeline';
  generatedAt: string;
  startDate: string;
  endDate: string;
  instrument: string;
  authority: {
    researchOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    runsSetupScanner: false;
    changesTradingRules: false;
    changesCanExecute: false;
    changesBridgeBehavior: false;
    changesScannerBehavior: false;
  };
  assumptions: {
    localInputsOnly: true;
    missingBarsAreNotInvented: true;
    canonicalSourceFeedsDownstreamReports: true;
    pipelineDoesNotPromoteTrades: true;
  };
  artifacts: {
    sourceLoaderJson: string;
    sourceLoaderMarkdown: string;
    canonicalMarketBarsJson: string;
    scannerCycleJson: string;
    scannerCycleMarkdown: string;
    replayAdapterJson: string;
    replayAdapterMarkdown: string;
  };
  summary: {
    sourceTotalBars: number;
    sourceHtfTimeframesWithData: string[];
    scannerCycles: number;
    scannerReadyCycles: number;
    scannerDataLimitedCycles: number;
    replaySessions: number;
    replayReconstructableSessions: number;
    replayBlockedSessions: number;
  };
  recommendations: string[];
  reportMarkdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_AUDIT_DIR = path.join(__dirname, 'discord-audit');
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function assertDate(value: string, flag: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${flag} must use YYYY-MM-DD.`);
  return value;
}

export function parseRawOhlcResearchPipelineArgs(args = process.argv.slice(2)): CliOptions {
  return {
    startDate: assertDate(readFlag(args, '--start-date') || '2026-06-01', '--start-date'),
    endDate: assertDate(readFlag(args, '--end-date') || '2026-07-02', '--end-date'),
    instrument: (readFlag(args, '--instrument') || 'MES').toUpperCase(),
    auditDir: readFlag(args, '--audit-dir') || DEFAULT_AUDIT_DIR,
    outDir: readFlag(args, '--out-dir') || DEFAULT_OUT_DIR,
    inputJson: readFlag(args, '--input-json'),
    json: args.includes('--json'),
  };
}

function recommendations(report: Omit<RawOhlcResearchPipelineReport, 'recommendations' | 'reportMarkdown'>): string[] {
  const lines = [
    'Use this bundle as the local research handoff before any live Supabase or bridge ingestion phase.',
    'Do not compare trade-rule behavior from this bundle unless scanner cycles are ready or explicitly labeled data-limited.',
  ];
  if (report.summary.scannerDataLimitedCycles > 0) {
    lines.push('Load controlled 15M/60M/120M/240M OHLC before asking the Master Desk audit to judge HTF conflict or missed opportunities.');
  }
  if (report.summary.scannerReadyCycles > 0) {
    lines.push('Ready scanner-cycle frames can feed the next scanner-owned DeskPublishDecision replay stage.');
  }
  return lines;
}

function buildMarkdown(report: Omit<RawOhlcResearchPipelineReport, 'reportMarkdown'>): string {
  const lines = [
    `# Raw OHLC Research Pipeline - ${report.instrument} ${report.startDate} to ${report.endDate}`,
    '',
    'Research-only local pipeline bundle. No Discord posts, Supabase reads/writes, bridge reads, setupScanner execution, scanner behavior changes, trading-rule changes, canExecute changes, or invented candles.',
    '',
    '## Summary',
    `- Source bars: ${report.summary.sourceTotalBars}.`,
    `- Source HTF timeframes with data: ${report.summary.sourceHtfTimeframesWithData.join(', ') || 'none'}.`,
    `- Scanner cycles: ${report.summary.scannerCycles}.`,
    `- Scanner ready/data-limited cycles: ${report.summary.scannerReadyCycles}/${report.summary.scannerDataLimitedCycles}.`,
    `- Replay sessions: ${report.summary.replaySessions}.`,
    `- Replay reconstructable/blocked sessions: ${report.summary.replayReconstructableSessions}/${report.summary.replayBlockedSessions}.`,
    '',
    '## Artifacts',
    `- Source loader JSON: ${report.artifacts.sourceLoaderJson}`,
    `- Canonical market bars JSON: ${report.artifacts.canonicalMarketBarsJson}`,
    `- Scanner-cycle JSON: ${report.artifacts.scannerCycleJson}`,
    `- Replay adapter JSON: ${report.artifacts.replayAdapterJson}`,
    '',
    '## Recommendations',
  ];
  for (const item of report.recommendations) lines.push(`- ${item}`);
  return lines.join('\n');
}

export function buildRawOhlcResearchPipelineReport(options: CliOptions, generatedAt = new Date().toISOString()): RawOhlcResearchPipelineReport {
  const sourceReport = buildRawOhlcSourceLoaderReport({
    startDate: options.startDate,
    endDate: options.endDate,
    instrument: options.instrument,
    auditDir: options.auditDir,
    outDir: options.outDir,
    inputJson: options.inputJson,
    json: options.json,
  }, generatedAt);
  const sourcePaths = writeRawOhlcSourceLoaderReport(sourceReport, options.outDir);

  const scannerCycleReport = buildRawOhlcScannerCycleReplayReport({
    startDate: options.startDate,
    endDate: options.endDate,
    instrument: options.instrument,
    marketBarsJson: sourceReport.canonicalMarketBarsPath,
    outDir: options.outDir,
    json: options.json,
  }, generatedAt);
  const scannerCyclePaths = writeRawOhlcScannerCycleReplayReport(scannerCycleReport, options.outDir);

  const replayAdapterReport = buildRawOhlcReplayAdapterReport({
    startDate: options.startDate,
    endDate: options.endDate,
    instrument: options.instrument,
    auditDir: options.auditDir,
    outDir: options.outDir,
    marketBarsJson: sourceReport.canonicalMarketBarsPath,
    json: options.json,
  }, generatedAt);
  const replayAdapterPaths = writeRawOhlcReplayAdapterReport(replayAdapterReport, options.outDir);

  const withoutRecommendationsAndMarkdown: Omit<RawOhlcResearchPipelineReport, 'recommendations' | 'reportMarkdown'> = {
    reportType: 'raw_ohlc_research_pipeline',
    generatedAt,
    startDate: options.startDate,
    endDate: options.endDate,
    instrument: options.instrument,
    authority: {
      researchOnly: true,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      runsSetupScanner: false,
      changesTradingRules: false,
      changesCanExecute: false,
      changesBridgeBehavior: false,
      changesScannerBehavior: false,
    },
    assumptions: {
      localInputsOnly: true,
      missingBarsAreNotInvented: true,
      canonicalSourceFeedsDownstreamReports: true,
      pipelineDoesNotPromoteTrades: true,
    },
    artifacts: {
      sourceLoaderJson: sourcePaths.jsonPath,
      sourceLoaderMarkdown: sourcePaths.markdownPath,
      canonicalMarketBarsJson: sourceReport.canonicalMarketBarsPath,
      scannerCycleJson: scannerCyclePaths.jsonPath,
      scannerCycleMarkdown: scannerCyclePaths.markdownPath,
      replayAdapterJson: replayAdapterPaths.jsonPath,
      replayAdapterMarkdown: replayAdapterPaths.markdownPath,
    },
    summary: {
      sourceTotalBars: sourceReport.summary.totalBars,
      sourceHtfTimeframesWithData: sourceReport.summary.htfTimeframesWithData,
      scannerCycles: scannerCycleReport.summary.totalCycles,
      scannerReadyCycles: scannerCycleReport.summary.readyCycles,
      scannerDataLimitedCycles: scannerCycleReport.summary.dataLimitedCycles,
      replaySessions: replayAdapterReport.summary.totalSessions,
      replayReconstructableSessions: replayAdapterReport.summary.reconstructableSessions,
      replayBlockedSessions: replayAdapterReport.summary.blockedSessions,
    },
  };
  const recs = recommendations(withoutRecommendationsAndMarkdown);
  const withoutMarkdown = { ...withoutRecommendationsAndMarkdown, recommendations: recs };
  return { ...withoutMarkdown, reportMarkdown: buildMarkdown(withoutMarkdown) };
}

export function writeRawOhlcResearchPipelineReport(report: RawOhlcResearchPipelineReport, outDir: string): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `raw-ohlc-research-pipeline-${report.instrument}-${report.startDate}-to-${report.endDate}-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.reportMarkdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export async function runRawOhlcResearchPipelineCli(rawArgs = process.argv.slice(2)): Promise<void> {
  const options = parseRawOhlcResearchPipelineArgs(rawArgs);
  const report = buildRawOhlcResearchPipelineReport(options);
  const paths = writeRawOhlcResearchPipelineReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...paths, summary: report.summary, artifacts: report.artifacts }, null, 2));
  } else {
    console.log(report.reportMarkdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  runRawOhlcResearchPipelineCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
