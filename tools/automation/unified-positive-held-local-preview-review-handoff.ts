import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UnifiedPositiveHeldLocalPreviewDecisionSummaryReport } from './unified-positive-held-local-preview-decision-summary';

export interface UnifiedPositiveHeldLocalPreviewReviewHandoffReport {
  reportType: 'unified_positive_held_local_preview_review_handoff';
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
    bundlePath: string | null;
    readinessPath: string | null;
    readinessScreenshotPath: string | null;
    checklistPath: string | null;
    editableNotesPath: string | null;
    noteValidationPath: string | null;
    rollupPath: string | null;
    decisionSummaryPath: string | null;
  };
  summary: {
    decisionRows: number;
    holdForManualReviewRows: number;
    queuedForReplayResearchRows: number;
    livePromotionAllowedRows: number;
    missingArtifacts: number;
  };
  reviewCommands: string[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  const matches = fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return matches[0] || null;
}

function authority(): UnifiedPositiveHeldLocalPreviewReviewHandoffReport['authority'] {
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

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function buildMarkdown(report: Omit<UnifiedPositiveHeldLocalPreviewReviewHandoffReport, 'markdown'>): string {
  return [
    '# Unified Positive Held-Local Preview Review Handoff',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local-only review handoff. It does not post Discord, write Supabase, read live bridge data, run setupScanner, change app runtime behavior, change scanner behavior, change trading logic, change canExecute, change entry/stop/target/risk math, or change Discord posting behavior.',
    '',
    '## Artifacts',
    '| Artifact | Path |',
    '|---|---|',
    `| Embedded preview bundle | ${escapeTable(report.source.bundlePath || '-')} |`,
    `| Readiness audit | ${escapeTable(report.source.readinessPath || '-')} |`,
    `| Readiness screenshot | ${escapeTable(report.source.readinessScreenshotPath || '-')} |`,
    `| Review checklist | ${escapeTable(report.source.checklistPath || '-')} |`,
    `| Editable notes | ${escapeTable(report.source.editableNotesPath || '-')} |`,
    `| Note validation | ${escapeTable(report.source.noteValidationPath || '-')} |`,
    `| Review rollup | ${escapeTable(report.source.rollupPath || '-')} |`,
    `| Decision summary | ${escapeTable(report.source.decisionSummaryPath || '-')} |`,
    '',
    '## Summary',
    `- Decision rows: ${report.summary.decisionRows}.`,
    `- Hold for manual review: ${report.summary.holdForManualReviewRows}.`,
    `- Queued for replay research: ${report.summary.queuedForReplayResearchRows}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Missing artifacts: ${report.summary.missingArtifacts}.`,
    '',
    '## Review Commands',
    ...report.reviewCommands.map((command) => `- \`${command}\``),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildUnifiedPositiveHeldLocalPreviewReviewHandoffReport(args: {
  reportDir: string;
  bundlePath: string | null;
  readinessPath: string | null;
  readinessScreenshotPath: string | null;
  checklistPath: string | null;
  editableNotesPath: string | null;
  noteValidationPath: string | null;
  rollupPath: string | null;
  decisionSummaryPath: string | null;
  decisionSummaryReport: UnifiedPositiveHeldLocalPreviewDecisionSummaryReport | null;
}, generatedAt = new Date().toISOString()): UnifiedPositiveHeldLocalPreviewReviewHandoffReport {
  const missingArtifacts = [
    ['embedded preview bundle', args.bundlePath],
    ['readiness audit', args.readinessPath],
    ['readiness screenshot', args.readinessScreenshotPath],
    ['review checklist', args.checklistPath],
    ['editable notes', args.editableNotesPath],
    ['note validation', args.noteValidationPath],
    ['review rollup', args.rollupPath],
    ['decision summary', args.decisionSummaryPath],
  ].filter(([, artifactPath]) => !artifactPath);
  const decisionSummary = args.decisionSummaryReport?.summary;
  const blockers = [
    !fs.existsSync(args.reportDir) ? `report directory missing: ${args.reportDir}` : null,
    ...missingArtifacts.map(([name]) => `missing ${name}`),
    !args.decisionSummaryReport ? 'missing decision summary report' : null,
    args.decisionSummaryReport && args.decisionSummaryReport.status !== 'pass' ? `decision summary status ${args.decisionSummaryReport.status}` : null,
    decisionSummary && decisionSummary.livePromotionAllowedRows !== 0 ? `decision summary has ${decisionSummary.livePromotionAllowedRows} live-promotion rows` : null,
  ].filter((item): item is string => Boolean(item));
  const base: Omit<UnifiedPositiveHeldLocalPreviewReviewHandoffReport, 'markdown'> = {
    reportType: 'unified_positive_held_local_preview_review_handoff',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      reportDir: args.reportDir,
      bundlePath: args.bundlePath,
      readinessPath: args.readinessPath,
      readinessScreenshotPath: args.readinessScreenshotPath,
      checklistPath: args.checklistPath,
      editableNotesPath: args.editableNotesPath,
      noteValidationPath: args.noteValidationPath,
      rollupPath: args.rollupPath,
      decisionSummaryPath: args.decisionSummaryPath,
    },
    summary: {
      decisionRows: decisionSummary?.rollupRows || 0,
      holdForManualReviewRows: decisionSummary?.holdForManualReviewRows || 0,
      queuedForReplayResearchRows: decisionSummary?.queuedForReplayResearchRows || 0,
      livePromotionAllowedRows: decisionSummary?.livePromotionAllowedRows || 0,
      missingArtifacts: missingArtifacts.length,
    },
    reviewCommands: [
      'npm run diagnostic:held-local-preview-note-ingest-validator -- --json',
      'npm run diagnostic:held-local-preview-review-rollup -- --json',
      'npm run diagnostic:held-local-preview-decision-summary -- --json',
      'npm run diagnostic:held-local-preview-review-handoff -- --json',
    ],
    blockers,
    recommendations: blockers.length
      ? ['Do not start a replay-research phase until the local preview review handoff passes.']
      : ['Review the editable notes file locally, then rerun the review commands. Replay research is only eligible for rows explicitly queued by the decision summary.'],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeUnifiedPositiveHeldLocalPreviewReviewHandoffReport(
  report: UnifiedPositiveHeldLocalPreviewReviewHandoffReport,
  outDir = DEFAULT_REPORT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `unified-positive-held-local-preview-review-handoff-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runUnifiedPositiveHeldLocalPreviewReviewHandoffCli(args = process.argv.slice(2)): void {
  const reportDir = readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR;
  const decisionSummaryPath = readFlag(args, '--decision-summary') || latestMatchingFile(reportDir, /^unified-positive-held-local-preview-decision-summary-\d+\.json$/);
  const decisionSummaryReport = decisionSummaryPath && fs.existsSync(decisionSummaryPath)
    ? JSON.parse(fs.readFileSync(decisionSummaryPath, 'utf8')) as UnifiedPositiveHeldLocalPreviewDecisionSummaryReport
    : null;
  const report = buildUnifiedPositiveHeldLocalPreviewReviewHandoffReport({
    reportDir,
    bundlePath: latestMatchingFile(reportDir, /^unified-positive-held-local-preview-localstorage-loader-\d+\.bundle\.json$/),
    readinessPath: latestMatchingFile(reportDir, /^unified-positive-held-local-preview-readiness-audit-\d+\.json$/),
    readinessScreenshotPath: latestMatchingFile(reportDir, /^unified-positive-held-local-preview-readiness-audit-\d+\.png$/),
    checklistPath: latestMatchingFile(reportDir, /^unified-positive-held-local-preview-review-checklist-\d+\.json$/),
    editableNotesPath: latestMatchingFile(reportDir, /^unified-positive-held-local-preview-note-template-\d+\.editable\.json$/),
    noteValidationPath: latestMatchingFile(reportDir, /^unified-positive-held-local-preview-note-ingest-validator-\d+\.json$/),
    rollupPath: latestMatchingFile(reportDir, /^unified-positive-held-local-preview-review-rollup-\d+\.json$/),
    decisionSummaryPath,
    decisionSummaryReport,
  });
  const paths = writeUnifiedPositiveHeldLocalPreviewReviewHandoffReport(report, reportDir);
  if (args.includes('--json')) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runUnifiedPositiveHeldLocalPreviewReviewHandoffCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
