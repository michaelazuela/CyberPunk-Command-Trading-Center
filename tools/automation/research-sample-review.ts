import fs from 'node:fs/promises';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createResearchSampleReviewPack,
  type ResearchSampleReviewSourceReport,
  type ResearchSampleReviewPack,
} from '../../src/agents/researchSampleReviewAgent';
import type {
  HistoricalResearchBackfillReport,
  ResearchBackfillConceptSelector,
} from '../../src/agents/historicalResearchBackfillAgent';
import { writeLatestReviewPackManifest } from './research-review-pack-manifest';

type Instrument = 'MES' | 'MNQ';

export interface ResearchSampleReviewCliOptions {
  concept: ResearchBackfillConceptSelector;
  instrument: Instrument;
  sampleSize: number;
  reportDir: string;
  out: string | null;
  json: boolean;
  pretty: boolean;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'research-reports');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  return inline ? inline.slice(prefix.length) : null;
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function assertConcept(value: string | null): ResearchBackfillConceptSelector {
  const concept = (value || 'all').toLowerCase();
  const allowed = [
    'all',
    'time_window_liquidity_delivery',
    'false_run_liquidity_fade',
    'amd_range_model',
    'final_hour_liquidity_draw',
  ];
  if (!allowed.includes(concept)) throw new Error('--concept must be all or a supported research concept id.');
  return concept as ResearchBackfillConceptSelector;
}

export function parseResearchSampleReviewArgs(args = process.argv.slice(2)): ResearchSampleReviewCliOptions {
  const instrument = (readFlag(args, '--instrument') || 'MES').toUpperCase();
  if (instrument !== 'MES' && instrument !== 'MNQ') throw new Error('--instrument must be MES or MNQ.');
  const sampleSizeText = readFlag(args, '--sample-size') || '30';
  const sampleSize = Number.parseInt(sampleSizeText, 10);
  if (!Number.isFinite(sampleSize) || sampleSize < 1) throw new Error('--sample-size must be a positive integer.');
  return {
    concept: assertConcept(readFlag(args, '--concept')),
    instrument,
    sampleSize,
    reportDir: readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR,
    out: readFlag(args, '--out'),
    json: hasFlag(args, '--json'),
    pretty: hasFlag(args, '--pretty') || !hasFlag(args, '--json'),
  };
}

async function walkJsonFiles(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkJsonFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }
  return files.sort();
}

function isBackfillReport(value: unknown): value is HistoricalResearchBackfillReport {
  return Boolean(
    value &&
    typeof value === 'object' &&
    (value as HistoricalResearchBackfillReport).reportType === 'historical_research_backfill' &&
    Array.isArray((value as HistoricalResearchBackfillReport).conceptReports),
  );
}

export async function loadResearchBackfillReports(reportDir: string): Promise<ResearchSampleReviewSourceReport[]> {
  const files = await walkJsonFiles(reportDir);
  const reports: ResearchSampleReviewSourceReport[] = [];
  for (const file of files) {
    try {
      const parsed = JSON.parse(await fs.readFile(file, 'utf8')) as unknown;
      if (isBackfillReport(parsed)) reports.push({ path: file, report: parsed });
    } catch {
      // Ignore generated or partial JSON files that are not readable backfill reports.
    }
  }
  return reports;
}

function outputFiles(options: ResearchSampleReviewCliOptions, pack: ResearchSampleReviewPack): { jsonFile: string; markdownFile: string } | null {
  if (!options.out) return null;
  const resolved = path.resolve(options.out);
  const safeConcept = pack.concept === 'all' ? 'all' : pack.concept;
  const date = pack.generatedAt.slice(0, 10);
  const base = path.extname(resolved)
    ? resolved.slice(0, -path.extname(resolved).length)
    : path.join(resolved, `research-sample-review-${pack.instrument}-${safeConcept}-${date}`);
  return {
    jsonFile: `${base}.json`,
    markdownFile: `${base}.md`,
  };
}

function writeReviewPack(options: ResearchSampleReviewCliOptions, pack: ResearchSampleReviewPack): { jsonFile: string; markdownFile: string } | null {
  const files = outputFiles(options, pack);
  if (!files) return null;
  mkdirSync(path.dirname(files.jsonFile), { recursive: true });
  writeFileSync(files.jsonFile, `${JSON.stringify(pack, null, 2)}\n`, 'utf8');
  writeFileSync(files.markdownFile, `${pack.markdown}\n`, 'utf8');
  return files;
}

function renderPrettySummary(pack: ResearchSampleReviewPack): string {
  return [
    `[RESEARCH SAMPLE REVIEW] ${pack.instrument}`,
    `Concept: ${pack.concept}`,
    `Samples: ${pack.selectedSampleCount}/${pack.requestedSampleSize}`,
    `Sample source: ${pack.sampleSourceMode === 'full_candidate_events' ? 'full candidate events' : 'preview sample events only'}`,
    '',
    'Concepts:',
    ...pack.conceptSummaries.map((summary) =>
      `- ${summary.title}: selected ${summary.selectedSamples}/${summary.availableSamples}; advisory=${summary.classificationCounts.advisoryOnly}; model1-review=${summary.classificationCounts.model1Overlap}; turtle-review=${summary.classificationCounts.turtleSoupOverlap}`
    ),
    '',
    'Agent inspection:',
    ...pack.samples.slice(0, 10).map((sample) => `- ${sample.sampleId} ${sample.date} ${sample.time || ''} ${sample.direction}: ${sample.agentInspectionLabel} (${sample.agentConfidence})`),
    ...(pack.samples.length > 10 ? [`- ...${pack.samples.length - 10} additional sample(s) in JSON/Markdown output.`] : []),
    '',
    'Authority: research-only. Agent inspection does not approve trades, change rules, or promote models.',
  ].join('\n');
}

export async function runResearchSampleReviewCli(rawArgs = process.argv.slice(2)): Promise<void> {
  const options = parseResearchSampleReviewArgs(rawArgs);
  const sourceReports = await loadResearchBackfillReports(options.reportDir);
  const pack = createResearchSampleReviewPack({
    instrument: options.instrument,
    concept: options.concept,
    sampleSize: options.sampleSize,
    sourceReports,
  });
  const files = writeReviewPack(options, pack);
  if (files) {
    writeLatestReviewPackManifest({
      reviewPackPath: files.jsonFile,
      pack,
      sourceAgent: 'researchSampleReviewAgent',
    });
    console.log(`Research sample review saved: ${files.jsonFile}`);
    console.log(`Research sample review markdown saved: ${files.markdownFile}`);
  }
  if (options.json) console.log(JSON.stringify(pack, null, 2));
  if (options.pretty) console.log(renderPrettySummary(pack));
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/tools/automation/research-sample-review.ts')) {
  runResearchSampleReviewCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
