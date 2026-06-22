import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildResearchDeskEvidenceTableReport,
  type ResearchEvidenceRow,
} from './research-desk-evidence-table';

type CaseReviewStatus = 'candidate_for_manual_replay' | 'manual_validation_required' | 'blocked_from_promotion';

export interface ResearchDeskCaseReview {
  caseId: string;
  row: ResearchEvidenceRow;
  status: CaseReviewStatus;
  strengths: string[];
  blockers: string[];
  missingEvidence: string[];
  nextAction: string;
  excerpt: string;
}

export interface ResearchDeskCaseReviewReport {
  reportType: 'research_desk_case_review_phase3';
  generatedAt: string;
  root: string;
  outDir: string;
  summary: {
    readyRowsReviewed: number;
    candidateForManualReplay: number;
    manualValidationRequired: number;
    blockedFromPromotion: number;
  };
  cases: ResearchDeskCaseReview[];
  findings: string[];
  authority: {
    readOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    changesScannerState: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    changesEntriesStopsTargets: false;
    createsNewModel: false;
    promotesModel: false;
    changesDiscordBehavior: false;
  };
  markdown: string;
  html: string;
}

interface ResearchDeskCaseReviewOptions {
  root: string;
  outDir: string;
  json: boolean;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_OUT_DIR = path.join(__dirname, 'research-reports');
const MAX_EXCERPT_BYTES = 16 * 1024;

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

export function parseResearchDeskCaseReviewArgs(args = process.argv.slice(2)): ResearchDeskCaseReviewOptions {
  return {
    root: path.resolve(readFlag(args, '--root') || DEFAULT_ROOT),
    outDir: path.resolve(readFlag(args, '--out-dir') || DEFAULT_OUT_DIR),
    json: hasFlag(args, '--json'),
  };
}

async function readExcerpt(file: string): Promise<string> {
  const handle = await fs.open(file, 'r');
  try {
    const buffer = Buffer.alloc(MAX_EXCERPT_BYTES);
    const result = await handle.read(buffer, 0, MAX_EXCERPT_BYTES, 0);
    return buffer.subarray(0, result.bytesRead).toString('utf8').trim();
  } catch {
    return '';
  } finally {
    await handle.close().catch(() => undefined);
  }
}

function excerptForDisplay(sample: string): string {
  return sample
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .slice(0, 18)
    .join('\n')
    .slice(0, 4000);
}

function reviewRow(row: ResearchEvidenceRow, excerpt: string, index: number): ResearchDeskCaseReview {
  const strengths: string[] = [];
  const blockers: string[] = [];
  const missingEvidence: string[] = [];

  if (row.sampleSize !== null) strengths.push(`Machine-readable sample size: ${row.sampleSize}.`);
  if (row.t1Hits !== null) strengths.push(`Machine-readable T1 hits: ${row.t1Hits}.`);
  if (row.t2Hits !== null) strengths.push(`Machine-readable T2 hits: ${row.t2Hits}.`);
  if (row.stops !== null) strengths.push(`Machine-readable stops: ${row.stops}.`);
  if (row.noConfirmation !== null) strengths.push(`Machine-readable no-confirmation count: ${row.noConfirmation}.`);
  if (row.promisingSignals > 0) strengths.push(`Promising language signals: ${row.promisingSignals}.`);

  if (row.sampleSize === null) missingEvidence.push('Sample size is missing.');
  if (row.t1Hits === null) missingEvidence.push('T1 count is missing.');
  if (row.t2Hits === null) missingEvidence.push('T2 count is missing.');
  if (row.stops === null) missingEvidence.push('Stop count is missing.');
  if (row.noConfirmation === null) missingEvidence.push('No-confirmation count is missing.');
  if (row.unresolved === null) missingEvidence.push('Unresolved count is missing.');

  if (/1m close evidence is not available|1 minute evidence is not available|not available in scanner decision tape/i.test(excerpt)) {
    blockers.push('1M confirmation evidence is not available in the source artifact.');
  }
  if (/research-only|read-only research only/i.test(excerpt)) {
    blockers.push('Source artifact explicitly marks itself research-only.');
  }
  if (/do not change canExecute|do not change.*risk gates|do not change.*model definitions/i.test(excerpt)) {
    blockers.push('Source artifact explicitly prohibits live rule changes from this evidence alone.');
  }
  if (row.sampleSize !== null && row.sampleSize < 20) {
    blockers.push('Sample size is too small for promotion discussion.');
  }

  let status: CaseReviewStatus = 'candidate_for_manual_replay';
  if (blockers.length > 0 || missingEvidence.length > 2) status = 'manual_validation_required';
  if (row.status !== 'ready_for_deeper_review') status = 'blocked_from_promotion';

  const nextAction = status === 'candidate_for_manual_replay'
    ? 'Run deeper replay and case-level chart review before discussing any scanner or Discord behavior.'
    : status === 'manual_validation_required'
      ? 'Do not promote. Fill missing evidence and manually validate source cases first.'
      : 'Keep out of scanner changes unless a future evidence pass revalidates this artifact.';

  return {
    caseId: `P3-${String(index + 1).padStart(2, '0')}`,
    row,
    status,
    strengths,
    blockers,
    missingEvidence,
    nextAction,
    excerpt: excerptForDisplay(excerpt),
  };
}

function findingsFor(report: Omit<ResearchDeskCaseReviewReport, 'findings' | 'markdown' | 'html'>): string[] {
  const findings = [
    `${report.summary.readyRowsReviewed} Phase 2 ready row(s) were reviewed case by case.`,
    `${report.summary.candidateForManualReplay} case(s) are clean enough to move into manual replay review.`,
    `${report.summary.manualValidationRequired} case(s) require manual validation or missing evidence before any promotion discussion.`,
    `${report.summary.blockedFromPromotion} case(s) are blocked from promotion in this pass.`,
    'Phase 3 remains research-only and does not change scanner, Discord, execution approval, entries, stops, targets, or risk gates.',
  ];
  if (report.summary.readyRowsReviewed === 0) {
    findings.push('No Phase 2 ready rows were available. Stay in evidence collection before discussing live behavior.');
  }
  return findings;
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function markdownFor(report: Omit<ResearchDeskCaseReviewReport, 'markdown' | 'html'>): string {
  const lines = [
    `# Quant Desk Research Case Review - ${report.generatedAt.slice(0, 10)}`,
    '',
    'Read-only Phase 3 case review. This report deep-reviews Phase 2 ready rows and does not post Discord, write Supabase, change scanner state, approve execution, or change trading logic.',
    '',
    '## Summary',
    `- Ready rows reviewed: ${report.summary.readyRowsReviewed}`,
    `- Candidate for manual replay: ${report.summary.candidateForManualReplay}`,
    `- Manual validation required: ${report.summary.manualValidationRequired}`,
    `- Blocked from promotion: ${report.summary.blockedFromPromotion}`,
    '',
    '## Findings',
    ...report.findings.map((finding) => `- ${finding}`),
    '',
    '## Cases',
    ...report.cases.flatMap((item) => [
      '',
      `### ${item.caseId} - ${item.status}`,
      `- Artifact: ${item.row.relativePath}`,
      `- Report type: ${item.row.reportType || 'N/A'}`,
      `- Sample: ${item.row.sampleSize ?? 'N/A'} | T1: ${item.row.t1Hits ?? 'N/A'} | T2: ${item.row.t2Hits ?? 'N/A'} | Stops: ${item.row.stops ?? 'N/A'} | No confirmation: ${item.row.noConfirmation ?? 'N/A'} | Unresolved: ${item.row.unresolved ?? 'N/A'}`,
      `- Strengths: ${item.strengths.join(' ') || 'N/A'}`,
      `- Blockers: ${item.blockers.join(' ') || 'None identified.'}`,
      `- Missing evidence: ${item.missingEvidence.join(' ') || 'None identified.'}`,
      `- Next action: ${item.nextAction}`,
    ]),
    '',
    '## Authority Boundary',
    '- Read-only: true',
    '- Posts Discord: false',
    '- Writes Supabase: false',
    '- Changes scanner state: false',
    '- Changes trading logic: false',
    '- Changes canExecute: false',
    '- Changes entries/stops/targets: false',
    '- Creates/promotes model: false',
    '- Changes Discord behavior: false',
  ];
  return `${lines.join('\n')}\n`;
}

function htmlFor(report: Omit<ResearchDeskCaseReviewReport, 'markdown' | 'html'>): string {
  const findings = report.findings.map((finding) => `<li>${escapeHtml(finding)}</li>`).join('\n');
  const cases = report.cases.map((item) => `<section class="case">
<h3>${escapeHtml(item.caseId)} - ${escapeHtml(item.status.replace(/_/g, ' '))}</h3>
<p><strong>Artifact:</strong> ${escapeHtml(item.row.relativePath)}</p>
<div class="metrics">
  <span>Sample: ${escapeHtml(item.row.sampleSize ?? 'N/A')}</span>
  <span>T1: ${escapeHtml(item.row.t1Hits ?? 'N/A')}</span>
  <span>T2: ${escapeHtml(item.row.t2Hits ?? 'N/A')}</span>
  <span>Stops: ${escapeHtml(item.row.stops ?? 'N/A')}</span>
  <span>No confirmation: ${escapeHtml(item.row.noConfirmation ?? 'N/A')}</span>
  <span>Unresolved: ${escapeHtml(item.row.unresolved ?? 'N/A')}</span>
</div>
<h4>Strengths</h4>
<ul>${(item.strengths.length ? item.strengths : ['N/A']).map((value) => `<li>${escapeHtml(value)}</li>`).join('\n')}</ul>
<h4>Blockers</h4>
<ul>${(item.blockers.length ? item.blockers : ['None identified.']).map((value) => `<li>${escapeHtml(value)}</li>`).join('\n')}</ul>
<h4>Missing Evidence</h4>
<ul>${(item.missingEvidence.length ? item.missingEvidence : ['None identified.']).map((value) => `<li>${escapeHtml(value)}</li>`).join('\n')}</ul>
<p><strong>Next action:</strong> ${escapeHtml(item.nextAction)}</p>
<details><summary>Source excerpt</summary><pre>${escapeHtml(item.excerpt || 'N/A')}</pre></details>
</section>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Quant Desk Phase 3 Case Review</title>
<style>
  :root { color-scheme: dark; --bg:#07100f; --panel:#101a1c; --line:#254146; --text:#eef8f6; --muted:#a8c0c2; --green:#36e07f; --amber:#ffd23f; --red:#ff5b5b; --blue:#55c7ff; }
  body { margin:0; font-family: Segoe UI, Arial, sans-serif; background:var(--bg); color:var(--text); }
  main { max-width:1120px; margin:0 auto; padding:34px 28px 56px; }
  h1 { margin:0 0 6px; font-size:30px; }
  h2 { margin:28px 0 12px; font-size:19px; color:var(--blue); }
  h3 { margin:0 0 10px; color:var(--green); }
  h4 { margin:14px 0 6px; color:var(--blue); }
  p, li { color:var(--muted); line-height:1.5; }
  .meta { color:var(--muted); font-size:13px; margin-bottom:22px; }
  .banner { border:1px solid var(--line); background:linear-gradient(90deg, rgba(54,224,127,.12), rgba(85,199,255,.08)); padding:16px 18px; border-radius:8px; margin:20px 0; }
  .grid { display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:12px; margin:18px 0; }
  .card, .case { border:1px solid var(--line); background:var(--panel); border-radius:8px; padding:14px; }
  .case { margin:14px 0; }
  .label { color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:.08em; }
  .value { font-size:28px; font-weight:800; margin-top:4px; }
  .green { color:var(--green); } .amber { color:var(--amber); } .red { color:var(--red); } .blue { color:var(--blue); }
  .metrics { display:flex; flex-wrap:wrap; gap:8px; margin:10px 0; }
  .metrics span { border:1px solid var(--line); border-radius:6px; padding:5px 8px; color:var(--text); background:#0c1719; }
  pre { white-space:pre-wrap; color:var(--muted); background:#081113; border:1px solid var(--line); border-radius:6px; padding:10px; max-height:360px; overflow:auto; }
  summary { cursor:pointer; color:var(--blue); }
  .footer { margin-top:30px; font-size:12px; color:var(--muted); border-top:1px solid var(--line); padding-top:14px; }
</style>
</head>
<body><main>
<h1>Quant Desk Phase 3 Case Review</h1>
<div class="meta">Generated: ${escapeHtml(report.generatedAt)} | Source: Phase 2 ready rows</div>
<div class="banner"><strong>Bottom line:</strong> Phase 3 reviews the ready rows case by case. It still does not change scanner or Discord behavior.</div>
<div class="grid">
  <div class="card"><div class="label">Rows Reviewed</div><div class="value blue">${report.summary.readyRowsReviewed}</div></div>
  <div class="card"><div class="label">Manual Replay</div><div class="value green">${report.summary.candidateForManualReplay}</div></div>
  <div class="card"><div class="label">Needs Validation</div><div class="value amber">${report.summary.manualValidationRequired}</div></div>
  <div class="card"><div class="label">Blocked</div><div class="value red">${report.summary.blockedFromPromotion}</div></div>
</div>
<h2>Findings</h2>
<ul>${findings}</ul>
<h2>Cases</h2>
${cases || '<p>No ready rows were available for Phase 3 review.</p>'}
<h2>Authority Boundary</h2>
<ul>
  <li>Read-only: true</li>
  <li>Posts Discord: false</li>
  <li>Writes Supabase: false</li>
  <li>Changes scanner, Discord, canExecute, entries, stops, targets, risk, or model behavior: false</li>
</ul>
<div class="footer">Decision support only. This is research review, not trade approval or model promotion.</div>
</main></body></html>
`;
}

export async function buildResearchDeskCaseReviewReport(options: ResearchDeskCaseReviewOptions): Promise<ResearchDeskCaseReviewReport> {
  const evidence = await buildResearchDeskEvidenceTableReport({
    root: options.root,
    outDir: options.outDir,
    json: false,
  });
  const readyRows = evidence.rows.filter((row) => row.status === 'ready_for_deeper_review');
  const cases: ResearchDeskCaseReview[] = [];
  for (const [index, row] of readyRows.entries()) {
    const artifactPath = path.join(options.root, row.relativePath);
    const excerpt = await readExcerpt(artifactPath);
    cases.push(reviewRow(row, excerpt, index));
  }
  const baseReport = {
    reportType: 'research_desk_case_review_phase3' as const,
    generatedAt: new Date().toISOString(),
    root: options.root,
    outDir: options.outDir,
    summary: {
      readyRowsReviewed: cases.length,
      candidateForManualReplay: cases.filter((item) => item.status === 'candidate_for_manual_replay').length,
      manualValidationRequired: cases.filter((item) => item.status === 'manual_validation_required').length,
      blockedFromPromotion: cases.filter((item) => item.status === 'blocked_from_promotion').length,
    },
    cases,
    authority: {
      readOnly: true,
      postsDiscord: false,
      writesSupabase: false,
      changesScannerState: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      changesEntriesStopsTargets: false,
      createsNewModel: false,
      promotesModel: false,
      changesDiscordBehavior: false,
    } as const,
  };
  const withFindings = {
    ...baseReport,
    findings: findingsFor(baseReport),
  };
  return {
    ...withFindings,
    markdown: markdownFor(withFindings),
    html: htmlFor(withFindings),
  };
}

async function main() {
  const options = parseResearchDeskCaseReviewArgs();
  const report = await buildResearchDeskCaseReviewReport(options);
  await fs.mkdir(options.outDir, { recursive: true });
  const stamp = report.generatedAt.replace(/[:.]/g, '-');
  const base = `desk-research-case-review-${stamp}`;
  const jsonPath = path.join(options.outDir, `${base}.json`);
  const mdPath = path.join(options.outDir, `${base}.md`);
  const htmlPath = path.join(options.outDir, `${base}.html`);
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(mdPath, report.markdown);
  await fs.writeFile(htmlPath, report.html);
  if (options.json) {
    process.stdout.write(`${JSON.stringify({ jsonPath, mdPath, htmlPath, summary: report.summary, findings: report.findings }, null, 2)}\n`);
  } else {
    console.log(`Research case review written: ${htmlPath}`);
    console.log(`Ready rows reviewed: ${report.summary.readyRowsReviewed}; manual validation: ${report.summary.manualValidationRequired}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
