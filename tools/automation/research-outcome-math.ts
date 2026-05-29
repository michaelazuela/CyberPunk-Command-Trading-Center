import fs from 'node:fs/promises';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  extractOutcomeInputFromSource,
  runResearchOutcomeMath,
  type ResearchOutcomeMathReport,
  type ResearchOutcomeThresholds,
} from '../../src/agents/researchOutcomeMathAgent';

type Instrument = 'MES' | 'MNQ';

export interface ResearchOutcomeMathCliOptions {
  source: string;
  instrument: Instrument;
  out: string | null;
  json: boolean;
  pretty: boolean;
  thresholds: Partial<ResearchOutcomeThresholds>;
}

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

function numberFlag(args: string[], flag: string): number | undefined {
  const value = readFlag(args, flag);
  if (value === null) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${flag} must be a positive number.`);
  return parsed;
}

export function parseResearchOutcomeMathArgs(args = process.argv.slice(2)): ResearchOutcomeMathCliOptions {
  const source = readFlag(args, '--source');
  if (!source) throw new Error('--source is required.');
  const instrument = (readFlag(args, '--instrument') || 'MES').toUpperCase();
  if (instrument !== 'MES' && instrument !== 'MNQ') throw new Error('--instrument must be MES or MNQ.');
  return {
    source,
    instrument,
    out: readFlag(args, '--out'),
    json: hasFlag(args, '--json'),
    pretty: hasFlag(args, '--pretty') || !hasFlag(args, '--json'),
    thresholds: {
      thresholdOnePoints: numberFlag(args, '--threshold-one'),
      thresholdTwoPoints: numberFlag(args, '--threshold-two'),
      adverseThresholdPoints: numberFlag(args, '--adverse-threshold'),
      observationWindowBars: numberFlag(args, '--observation-bars'),
    },
  };
}

function outputFiles(out: string | null, report: ResearchOutcomeMathReport): { jsonFile: string; markdownFile: string } | null {
  if (!out) return null;
  const resolved = path.resolve(out);
  const date = report.generatedAt.slice(0, 10);
  const base = path.extname(resolved)
    ? resolved.slice(0, -path.extname(resolved).length)
    : path.join(resolved, `research-outcome-math-${report.instrument}-${date}`);
  return {
    jsonFile: `${base}.json`,
    markdownFile: `${base}.md`,
  };
}

function writeReport(out: string | null, report: ResearchOutcomeMathReport): { jsonFile: string; markdownFile: string } | null {
  const files = outputFiles(out, report);
  if (!files) return null;
  mkdirSync(path.dirname(files.jsonFile), { recursive: true });
  writeFileSync(files.jsonFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(files.markdownFile, `${report.markdown}\n`, 'utf8');
  return files;
}

function renderPretty(report: ResearchOutcomeMathReport): string {
  const candidateLevelObservationWindowsUsed = report.candidateOutcomes.filter((outcome) =>
    outcome.dataQualityNotes.some((note) => note.includes('candidate-level post-signal observation window'))
  ).length;
  return [
    `[RESEARCH OUTCOME MATH] ${report.instrument}`,
    `Source: ${report.sourcePath}`,
    `Candidates: ${report.summary.totalCandidates}`,
    `Evaluated: ${report.summary.evaluatedCandidates}`,
    `Insufficient data: ${report.summary.insufficientDataCandidates}`,
    `Candidate-level observation windows used: ${candidateLevelObservationWindowsUsed}`,
    `Threshold one touch rate: ${report.summary.thresholdOneTouchRate ?? 'n/a'}`,
    `Threshold two touch rate: ${report.summary.thresholdTwoTouchRate ?? 'n/a'}`,
    `Adverse threshold touch rate: ${report.summary.adverseThresholdTouchRate ?? 'n/a'}`,
    `Hypothetical favorable continuation: ${report.summary.hypotheticalOverlay.favorableContinuationCount} (${report.summary.hypotheticalOverlay.favorableContinuationRate ?? 'n/a'})`,
    `Hypothetical partial favorable: ${report.summary.hypotheticalOverlay.partialFavorableCount} (${report.summary.hypotheticalOverlay.partialFavorableRate ?? 'n/a'})`,
    `Hypothetical adverse first: ${report.summary.hypotheticalOverlay.adverseFirstCount} (${report.summary.hypotheticalOverlay.adverseFirstRate ?? 'n/a'})`,
    `Hypothetical neutral/no resolution: ${report.summary.hypotheticalOverlay.neutralNoResolutionCount} (${report.summary.hypotheticalOverlay.neutralNoResolutionRate ?? 'n/a'})`,
    `Hypothetical ambiguous same bar: ${report.summary.hypotheticalOverlay.ambiguousSameBarCount} (${report.summary.hypotheticalOverlay.ambiguousSameBarRate ?? 'n/a'})`,
    `Hypothetical insufficient data: ${report.summary.hypotheticalOverlay.insufficientDataCount} (${report.summary.hypotheticalOverlay.insufficientDataRate ?? 'n/a'})`,
    '',
    'Concepts:',
    ...report.conceptSummaries.map((summary) =>
      `- ${summary.concept}: total=${summary.totalCandidates}, evaluated=${summary.evaluatedCandidates}, thresholdOne=${summary.thresholdOneTouchRate ?? 'n/a'}, thresholdTwo=${summary.thresholdTwoTouchRate ?? 'n/a'}, adverse=${summary.adverseThresholdTouchRate ?? 'n/a'}, hypotheticalFavorableContinuation=${summary.hypotheticalOverlay.favorableContinuationCount}, hypotheticalPartial=${summary.hypotheticalOverlay.partialFavorableCount}, hypotheticalAdverseFirst=${summary.hypotheticalOverlay.adverseFirstCount}, medianMFE=${summary.medianMfePoints ?? 'n/a'}, medianMAE=${summary.medianMaePoints ?? 'n/a'}`
    ),
    '',
    'Authority: research-only. Thresholds are not entries, stops, or targets. No execution approval, rule change, or model promotion.',
  ].join('\n');
}

export async function runResearchOutcomeMathCli(rawArgs = process.argv.slice(2)): Promise<void> {
  const options = parseResearchOutcomeMathArgs(rawArgs);
  const sourcePath = path.resolve(options.source);
  const parsed = JSON.parse(await fs.readFile(sourcePath, 'utf8')) as unknown;
  const input = extractOutcomeInputFromSource(sourcePath, parsed, options.instrument);
  const report = runResearchOutcomeMath({
    ...input,
    thresholds: options.thresholds,
  });
  const files = writeReport(options.out, report);
  if (files) {
    console.log(`Research outcome math saved: ${files.jsonFile}`);
    console.log(`Research outcome math markdown saved: ${files.markdownFile}`);
  }
  if (options.json) console.log(JSON.stringify(report, null, 2));
  if (options.pretty) console.log(renderPretty(report));
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1]?.replace(/\\/g, '/').endsWith('/tools/automation/research-outcome-math.ts')) {
  runResearchOutcomeMathCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
