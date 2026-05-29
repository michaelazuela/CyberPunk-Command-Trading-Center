import fs from 'node:fs/promises';
import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyHumanReviewToPack,
  isHumanReviewConfidence,
  isHumanReviewLabel,
  listPendingHumanReviewSamples,
  renderHumanReviewMarkdown,
  summarizeHumanReviewProgress,
  type HumanReviewCaptureResult,
  type HumanReviewConfidence,
  type HumanReviewLabel,
} from '../../src/agents/researchHumanReviewCaptureAgent';
import type { ResearchSampleReviewPack } from '../../src/agents/researchSampleReviewAgent';

export interface ResearchHumanReviewCliOptions {
  reviewPack: string;
  sampleId: string | null;
  label: HumanReviewLabel | null;
  confidence: HumanReviewConfidence | null;
  reviewer: string | null;
  notes: string | null;
  reason: string | null;
  overwrite: boolean;
  listPending: boolean;
  summary: boolean;
  pretty: boolean;
  json: boolean;
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

function parseLabel(value: string | null): HumanReviewLabel | null {
  if (!value) return null;
  if (!isHumanReviewLabel(value)) throw new Error('--label must be a supported human review label.');
  return value;
}

function parseConfidence(value: string | null): HumanReviewConfidence | null {
  if (!value) return null;
  if (!isHumanReviewConfidence(value)) throw new Error('--confidence must be low, medium, or high.');
  return value;
}

export function parseResearchHumanReviewArgs(args = process.argv.slice(2)): ResearchHumanReviewCliOptions {
  const reviewPack = readFlag(args, '--review-pack');
  if (!reviewPack) throw new Error('--review-pack is required.');
  return {
    reviewPack,
    sampleId: readFlag(args, '--sample-id'),
    label: parseLabel(readFlag(args, '--label')),
    confidence: parseConfidence(readFlag(args, '--confidence')),
    reviewer: readFlag(args, '--reviewer'),
    notes: readFlag(args, '--notes'),
    reason: readFlag(args, '--reason'),
    overwrite: hasFlag(args, '--overwrite'),
    listPending: hasFlag(args, '--list-pending'),
    summary: hasFlag(args, '--summary'),
    pretty: hasFlag(args, '--pretty') || !hasFlag(args, '--json'),
    json: hasFlag(args, '--json'),
  };
}

function isReviewPack(value: unknown): value is ResearchSampleReviewPack {
  return Boolean(
    value &&
    typeof value === 'object' &&
    (value as ResearchSampleReviewPack).reportType === 'research_sample_review_pack' &&
    Array.isArray((value as ResearchSampleReviewPack).samples),
  );
}

async function loadReviewPack(file: string): Promise<ResearchSampleReviewPack> {
  const parsed = JSON.parse(await fs.readFile(file, 'utf8')) as unknown;
  if (!isReviewPack(parsed)) throw new Error(`File is not a research sample review pack: ${file}`);
  return parsed;
}

function reviewedJsonPath(file: string, overwrite: boolean): string {
  if (overwrite) return path.resolve(file);
  const parsed = path.parse(path.resolve(file));
  return path.join(parsed.dir, `${parsed.name}.reviewed${parsed.ext || '.json'}`);
}

function writeReviewedPack(file: string, pack: ResearchSampleReviewPack, overwrite: boolean): { jsonFile: string; markdownFile: string } {
  const jsonFile = reviewedJsonPath(file, overwrite);
  const markdownFile = jsonFile.replace(/\.json$/i, '.md');
  writeFileSync(jsonFile, `${JSON.stringify(pack, null, 2)}\n`, 'utf8');
  writeFileSync(markdownFile, `${renderHumanReviewMarkdown(pack)}\n`, 'utf8');
  return { jsonFile, markdownFile };
}

function renderPending(pack: ResearchSampleReviewPack): string {
  const pending = listPendingHumanReviewSamples(pack);
  return [
    `[RESEARCH HUMAN REVIEW PENDING] ${pack.instrument}`,
    `Pending samples: ${pending.length}/${pack.samples.length}`,
    ...pending.slice(0, 25).map((sample) => `- ${sample.sampleId}: ${sample.conceptTitle} ${sample.date} ${sample.time || ''}`),
    ...(pending.length > 25 ? [`- ...${pending.length - 25} additional pending sample(s).`] : []),
    '',
    'Authority: research-only. Pending review does not approve execution.',
  ].join('\n');
}

function renderSummary(pack: ResearchSampleReviewPack): string {
  const summary = summarizeHumanReviewProgress(pack);
  return [
    `[RESEARCH HUMAN REVIEW SUMMARY] ${pack.instrument}`,
    `Total samples: ${summary.totalSamples}`,
    `Reviewed samples: ${summary.reviewedSamples}`,
    `Pending samples: ${summary.pendingSamples}`,
    `Agreement count: ${summary.agreementCount}`,
    `Disagreement count: ${summary.disagreementCount}`,
    `Advisory-only confirmed: ${summary.advisoryOnlyConfirmed ? 'yes' : 'no'}`,
    'Label counts:',
    ...(Object.keys(summary.labelCounts).length
      ? Object.entries(summary.labelCounts).map(([label, count]) => `- ${label}: ${count}`)
      : ['- none']),
    '',
    'Authority: research-only. Human labels do not approve trades or rule changes.',
  ].join('\n');
}

function renderUpdate(result: HumanReviewCaptureResult, sourcePath: string, outputPath: string): string {
  const sample = result.sample;
  return [
    '[RESEARCH HUMAN REVIEW UPDATED]',
    `Review pack: ${sourcePath}`,
    `Sample id: ${sample.sampleId}`,
    `Concept: ${sample.conceptTitle}`,
    `Date/time: ${sample.date} ${sample.time || ''}`,
    `Agent label: ${sample.agentInspectionLabel}`,
    `Human label: ${sample.humanInspectionLabel}`,
    `Agreement: ${String(sample.agentHumanAgreement)}`,
    `Final review label: ${sample.finalReviewLabel}`,
    'Advisory-only: yes',
    `Output path: ${outputPath}`,
    '',
    'Authority: research-only. No execution approval, rule change, or model promotion.',
  ].join('\n');
}

export async function runResearchHumanReviewCli(rawArgs = process.argv.slice(2)): Promise<void> {
  const options = parseResearchHumanReviewArgs(rawArgs);
  const sourcePath = path.resolve(options.reviewPack);
  if (!existsSync(sourcePath)) throw new Error(`Review pack not found: ${sourcePath}`);
  const pack = await loadReviewPack(sourcePath);

  if (options.listPending) {
    const pending = listPendingHumanReviewSamples(pack);
    if (options.json) console.log(JSON.stringify(pending, null, 2));
    if (options.pretty) console.log(renderPending(pack));
    return;
  }

  if (options.summary) {
    const summary = summarizeHumanReviewProgress(pack);
    if (options.json) console.log(JSON.stringify(summary, null, 2));
    if (options.pretty) console.log(renderSummary(pack));
    return;
  }

  if (!options.sampleId || !options.label || !options.confidence || !options.reviewer) {
    throw new Error('--sample-id, --label, --confidence, and --reviewer are required to capture a human review.');
  }

  const result = applyHumanReviewToPack({
    reviewPack: pack,
    sampleId: options.sampleId,
    label: options.label,
    confidence: options.confidence,
    reviewer: options.reviewer,
    notes: options.notes,
    reason: options.reason,
  });
  const files = writeReviewedPack(sourcePath, result.updatedPack, options.overwrite);
  if (options.json) console.log(JSON.stringify(result.updatedPack, null, 2));
  if (options.pretty) console.log(renderUpdate(result, sourcePath, files.jsonFile));
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1]?.replace(/\\/g, '/').endsWith('/tools/automation/research-human-review.ts')) {
  runResearchHumanReviewCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
