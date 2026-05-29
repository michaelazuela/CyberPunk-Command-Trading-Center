import fs from 'node:fs/promises';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  runResearchModelValidation,
  type ResearchModelValidationReport,
} from '../../src/agents/researchModelValidationAgent';
import type { ResearchOutcomeMathReport } from '../../src/agents/researchOutcomeMathAgent';
import type { ResearchSampleReviewPack } from '../../src/agents/researchSampleReviewAgent';

export interface ResearchModelValidationCliOptions {
  outcomeReport: string;
  reviewPack: string | null;
  out: string | null;
  json: boolean;
  pretty: boolean;
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

export function parseResearchModelValidationArgs(args = process.argv.slice(2)): ResearchModelValidationCliOptions {
  const outcomeReport = readFlag(args, '--outcome-report');
  if (!outcomeReport) throw new Error('--outcome-report is required.');
  return {
    outcomeReport,
    reviewPack: readFlag(args, '--review-pack'),
    out: readFlag(args, '--out'),
    json: hasFlag(args, '--json'),
    pretty: hasFlag(args, '--pretty') || !hasFlag(args, '--json'),
  };
}

function outputFiles(out: string | null, report: ResearchModelValidationReport): { jsonFile: string; markdownFile: string } | null {
  if (!out) return null;
  const resolved = path.resolve(out);
  const date = report.generatedAt.slice(0, 10);
  const base = path.extname(resolved)
    ? resolved.slice(0, -path.extname(resolved).length)
    : path.join(resolved, `research-model-validation-${date}`);
  return {
    jsonFile: `${base}.json`,
    markdownFile: `${base}.md`,
  };
}

function writeReport(out: string | null, report: ResearchModelValidationReport): { jsonFile: string; markdownFile: string } | null {
  const files = outputFiles(out, report);
  if (!files) return null;
  mkdirSync(path.dirname(files.jsonFile), { recursive: true });
  writeFileSync(files.jsonFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  writeFileSync(files.markdownFile, `${report.markdown}\n`, 'utf8');
  return files;
}

function renderPretty(report: ResearchModelValidationReport): string {
  return [
    '[RESEARCH MODEL VALIDATION]',
    `Outcome report: ${report.outcomeReportPath}`,
    `Review pack: ${report.reviewPackPath || 'not provided'}`,
    `Concepts reviewed: ${report.summary.conceptsReviewed}`,
    `Continue research: ${report.summary.continueResearchCount}`,
    `Needs more human review: ${report.summary.needsMoreHumanReviewCount}`,
    `Needs more outcome data: ${report.summary.needsMoreOutcomeDataCount}`,
    `Human model-design discussion only: ${report.summary.humanModelDesignDiscussionOnlyCount}`,
    `Reject research: ${report.summary.rejectResearchCount}`,
    '',
    'Concepts:',
    ...report.conceptValidations.map((validation) =>
      `- ${validation.concept}: ${validation.researchValidationLabel} (${validation.confidence}) - ${validation.rationale}`
    ),
    '',
    'Authority: research-only. Human model-design discussion is not execution approval. No rule change, executable model, or trade plan.',
  ].join('\n');
}

export async function runResearchModelValidationCli(rawArgs = process.argv.slice(2)): Promise<void> {
  const options = parseResearchModelValidationArgs(rawArgs);
  const outcomePath = path.resolve(options.outcomeReport);
  const outcomeReport = JSON.parse(await fs.readFile(outcomePath, 'utf8')) as ResearchOutcomeMathReport;
  let reviewPack: ResearchSampleReviewPack | null = null;
  let reviewPath: string | undefined;
  if (options.reviewPack) {
    reviewPath = path.resolve(options.reviewPack);
    reviewPack = JSON.parse(await fs.readFile(reviewPath, 'utf8')) as ResearchSampleReviewPack;
  }
  const report = runResearchModelValidation({
    outcomeReport,
    outcomeReportPath: outcomePath,
    reviewPack,
    reviewPackPath: reviewPath,
  });
  const files = writeReport(options.out, report);
  if (files) {
    console.log(`Research model validation saved: ${files.jsonFile}`);
    console.log(`Research model validation markdown saved: ${files.markdownFile}`);
  }
  if (options.json) console.log(JSON.stringify(report, null, 2));
  if (options.pretty) console.log(renderPretty(report));
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1]?.replace(/\\/g, '/').endsWith('/tools/automation/research-model-validation.ts')) {
  runResearchModelValidationCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
