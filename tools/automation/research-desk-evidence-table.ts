import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type EvidenceStatus = 'ready_for_deeper_review' | 'needs_more_data' | 'keep_out_of_scanner';

export interface ResearchEvidenceRow {
  family: string;
  relativePath: string;
  reportType: string | null;
  instrument: string | null;
  modifiedAt: string;
  sampleSize: number | null;
  t1Hits: number | null;
  t2Hits: number | null;
  stops: number | null;
  noConfirmation: number | null;
  unresolved: number | null;
  promisingSignals: number;
  cautionSignals: number;
  promotionRisk: 'low' | 'medium' | 'high';
  status: EvidenceStatus;
  evidenceNotes: string[];
}

export interface ResearchDeskEvidenceTableReport {
  reportType: 'research_desk_evidence_table_phase2';
  generatedAt: string;
  root: string;
  outDir: string;
  summary: {
    artifactsReviewed: number;
    evidenceRows: number;
    readyForDeeperReview: number;
    needsMoreData: number;
    keepOutOfScanner: number;
    rowsWithOutcomeCounts: number;
  };
  rows: ResearchEvidenceRow[];
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
  };
  markdown: string;
  html: string;
}

interface ResearchDeskEvidenceOptions {
  root: string;
  outDir: string;
  json: boolean;
}

interface ResearchSourceFamily {
  family: string;
  root: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_OUT_DIR = path.join(__dirname, 'research-reports');
const MAX_SAMPLE_BYTES = 256 * 1024;
const MAX_FILES_PER_FAMILY = 2500;

const RESEARCH_FAMILIES: ResearchSourceFamily[] = [
  { family: 'diagnostic_reports', root: 'tools/automation/diagnostic-reports' },
  { family: 'research_reports', root: 'tools/automation/research-reports' },
  { family: 'replay_diagnostics', root: 'tools/automation/replay-diagnostics' },
  { family: 'research_validation_reports', root: 'tools/automation/research-validation-reports' },
  { family: 'research_outcome_reports', root: 'tools/automation/research-outcome-reports' },
  { family: 'research_review_packs', root: 'tools/automation/research-review-packs' },
  { family: 'time_window_liquidity_delivery', root: 'tools/automation/time-window-liquidity-delivery' },
  { family: 'model_candidate_ledger', root: 'tools/automation/model-candidate-ledger' },
  { family: 'model_candidate_decisions', root: 'tools/automation/model-candidate-decisions' },
  { family: 'live_desk_observer_reports', root: 'tools/automation/live-desk-observer-reports' },
  { family: 'discord_audit', root: 'tools/automation/discord-audit' },
];

const GENERATED_META_REPORT_PREFIXES = [
  'desk-research-inventory-',
  'desk-research-evidence-',
  'desk-research-case-review-',
  'quant-desk-research-high-level-review-',
];

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

export function parseResearchDeskEvidenceArgs(args = process.argv.slice(2)): ResearchDeskEvidenceOptions {
  return {
    root: path.resolve(readFlag(args, '--root') || DEFAULT_ROOT),
    outDir: path.resolve(readFlag(args, '--out-dir') || DEFAULT_OUT_DIR),
    json: hasFlag(args, '--json'),
  };
}

async function listFilesRecursive(root: string, limit = MAX_FILES_PER_FAMILY): Promise<string[]> {
  if (!existsSync(root)) return [];
  const files: string[] = [];
  async function walk(dir: string): Promise<void> {
    if (files.length >= limit) return;
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (files.length >= limit) return;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.isFile() && /\.(json|md|txt)$/i.test(entry.name)) {
        if (GENERATED_META_REPORT_PREFIXES.some((prefix) => entry.name.startsWith(prefix))) continue;
        files.push(full);
      }
    }
  }
  await walk(root);
  return files;
}

async function readSample(file: string): Promise<string> {
  const handle = await fs.open(file, 'r');
  try {
    const buffer = Buffer.alloc(MAX_SAMPLE_BYTES);
    const result = await handle.read(buffer, 0, MAX_SAMPLE_BYTES, 0);
    return buffer.subarray(0, result.bytesRead).toString('utf8');
  } finally {
    await handle.close();
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function parseJsonSample(sample: string): Record<string, unknown> | null {
  try {
    return asRecord(JSON.parse(sample));
  } catch {
    return null;
  }
}

function valueAtPath(source: unknown, pathParts: string[]): unknown {
  let current = source;
  for (const part of pathParts) {
    const record = asRecord(current);
    if (!(part in record)) return null;
    current = record[part];
  }
  return current;
}

function numberAtPath(source: unknown, paths: string[][]): number | null {
  for (const pathParts of paths) {
    const value = valueAtPath(source, pathParts);
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return null;
}

function stringAtPath(source: unknown, paths: string[][]): string | null {
  for (const pathParts of paths) {
    const value = valueAtPath(source, pathParts);
    if (typeof value === 'string' && value.trim()) return value;
  }
  return null;
}

function regexNumber(sample: string, patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const match = sample.match(pattern);
    if (!match?.[1]) continue;
    const parsed = Number.parseInt(match[1], 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function countMatches(sample: string, pattern: RegExp): number {
  return [...sample.matchAll(pattern)].length;
}

function extractMetric(json: Record<string, unknown> | null, sample: string, jsonPaths: string[][], textPatterns: RegExp[]): number | null {
  const fromJson = json ? numberAtPath(json, jsonPaths) : null;
  return fromJson ?? regexNumber(sample, textPatterns);
}

function normalizeCount(value: number | null, sampleSize: number | null): number | null {
  if (value === null) return null;
  if (value < 0) return null;
  if (sampleSize !== null && sampleSize > 0 && value > sampleSize) return null;
  return value;
}

function classifyRow(row: Omit<ResearchEvidenceRow, 'promotionRisk' | 'status' | 'evidenceNotes'>, sample: string): Pick<ResearchEvidenceRow, 'promotionRisk' | 'status' | 'evidenceNotes'> {
  const lower = sample.toLowerCase();
  const evidenceNotes: string[] = [];
  const outcomeCountPresent = row.t1Hits !== null || row.t2Hits !== null || row.stops !== null || row.noConfirmation !== null;
  const sampleKnown = row.sampleSize !== null && row.sampleSize > 0;
  if (row.promisingSignals > 0) evidenceNotes.push('Promising/candidate language found.');
  if (outcomeCountPresent) evidenceNotes.push('Outcome counts were detected.');
  if (!sampleKnown) evidenceNotes.push('Sample size is missing or not machine-readable.');
  if (/research-only|research_only|needs more data|insufficient sample|continue research/i.test(sample)) {
    evidenceNotes.push('Artifact asks for more data or explicitly marks itself research-only.');
  }
  if (/reject|rejected|do not promote|not ready|weak|failed|low confidence/i.test(sample)) {
    evidenceNotes.push('Artifact includes caution, weak, reject, or failed language.');
  }

  if (/reject|rejected|do not promote/i.test(lower) || row.cautionSignals >= row.promisingSignals + 2) {
    return { promotionRisk: 'high', status: 'keep_out_of_scanner', evidenceNotes };
  }
  if (row.promisingSignals > 0 && outcomeCountPresent && sampleKnown && !/needs more data|insufficient sample/i.test(lower)) {
    return { promotionRisk: 'medium', status: 'ready_for_deeper_review', evidenceNotes };
  }
  if (row.promisingSignals > 0) {
    return { promotionRisk: 'medium', status: 'needs_more_data', evidenceNotes };
  }
  return { promotionRisk: 'high', status: 'keep_out_of_scanner', evidenceNotes };
}

async function summarizeEvidenceArtifact(root: string, family: string, file: string): Promise<ResearchEvidenceRow | null> {
  const stat = await fs.stat(file);
  const sample = await readSample(file).catch(() => '');
  const lower = sample.toLowerCase();
  const promisingSignals = countMatches(lower, /\b(promising|candidate|watchlist|validated|t1 hit|t1 hits|ready for deeper review)\b/g);
  const cautionSignals = countMatches(lower, /\b(reject|rejected|do not promote|not ready|weak|failed|low confidence|needs more data|insufficient sample|research-only|research_only)\b/g);
  if (promisingSignals === 0 && cautionSignals === 0) return null;

  const json = path.extname(file).toLowerCase() === '.json' ? parseJsonSample(sample) : null;
  const sampleSize = extractMetric(json, sample, [
    ['summary', 'sampleSize'],
    ['summary', 'samples'],
    ['summary', 'opportunities'],
    ['summary', 'eventsReviewed'],
    ['eventCount'],
    ['sampleSize'],
  ], [
    /sample size[:=\s]+(\d+)/i,
    /samples? reviewed[:=\s]+(\d+)/i,
    /opportunit(?:y|ies)[:=\s]+(\d+)/i,
    /events reviewed[:=\s]+(\d+)/i,
  ]);
  const rowBase = {
    family,
    relativePath: path.relative(root, file).replace(/\\/g, '/'),
    reportType: json ? stringAtPath(json, [['reportType']]) : null,
    instrument: json ? stringAtPath(json, [['instrument'], ['summary', 'instrument']]) : null,
    modifiedAt: stat.mtime.toISOString(),
    sampleSize,
    t1Hits: normalizeCount(extractMetric(json, sample, [
      ['summary', 't1Hits'],
      ['summary', 't1Hit'],
      ['summary', 'target1Hits'],
      ['t1Hits'],
    ], [
      /t1 hits?[:=\s]+(\d+)/i,
      /target 1 hits?[:=\s]+(\d+)/i,
    ]), sampleSize),
    t2Hits: normalizeCount(extractMetric(json, sample, [
      ['summary', 't2Hits'],
      ['summary', 't2Hit'],
      ['summary', 'target2Hits'],
      ['t2Hits'],
    ], [
      /t2 hits?[:=\s]+(\d+)/i,
      /target 2 hits?[:=\s]+(\d+)/i,
    ]), sampleSize),
    stops: normalizeCount(extractMetric(json, sample, [
      ['summary', 'stopped'],
      ['summary', 'stops'],
      ['summary', 'stopHits'],
      ['stops'],
    ], [
      /stops?[:=\s]+(\d+)/i,
      /stopped[:=\s]+(\d+)/i,
    ]), sampleSize),
    noConfirmation: normalizeCount(extractMetric(json, sample, [
      ['summary', 'noFiveMinuteConfirmation'],
      ['summary', 'noConfirmation'],
      ['summary', 'noConfirmations'],
    ], [
      /no[-\s]?confirmation[:=\s]+(\d+)/i,
      /no 5m confirmation[:=\s]+(\d+)/i,
    ]), sampleSize),
    unresolved: normalizeCount(extractMetric(json, sample, [
      ['summary', 'unresolved'],
      ['summary', 'noResolution'],
      ['summary', 'noResolutions'],
    ], [
      /unresolved[:=\s]+(\d+)/i,
      /no[-\s]?resolution[:=\s]+(\d+)/i,
    ]), sampleSize),
    promisingSignals,
    cautionSignals,
  };
  return {
    ...rowBase,
    ...classifyRow(rowBase, sample),
  };
}

function findingsFor(report: Omit<ResearchDeskEvidenceTableReport, 'findings' | 'markdown' | 'html'>): string[] {
  const findings: string[] = [];
  findings.push(`${report.summary.evidenceRows} evidence row(s) were built from ${report.summary.artifactsReviewed} reviewed research artifacts.`);
  findings.push(`${report.summary.readyForDeeperReview} row(s) have enough machine-readable evidence to move into deeper human/replay review.`);
  findings.push(`${report.summary.needsMoreData} row(s) remain promising but need better sample/outcome evidence first.`);
  findings.push(`${report.summary.keepOutOfScanner} row(s) should stay out of live scanner changes unless revalidated.`);
  findings.push('Phase 2 is still research-only. It does not promote a model, approve execution, or change Discord/scanner behavior.');
  findings.push('Next phase should deep-review the ready rows and produce case-level evidence before any live behavior discussion.');
  return findings;
}

function fmt(value: number | null): string {
  return value === null ? 'N/A' : String(value);
}

function markdownFor(report: Omit<ResearchDeskEvidenceTableReport, 'markdown' | 'html'>): string {
  const lines = [
    `# Quant Desk Research Evidence Table - ${report.generatedAt.slice(0, 10)}`,
    '',
    'Read-only Phase 2 evidence table. This turns promising inventory artifacts into a review table and does not post Discord, write Supabase, change scanner state, approve execution, or change trading logic.',
    '',
    '## Summary',
    `- Artifacts reviewed: ${report.summary.artifactsReviewed}`,
    `- Evidence rows: ${report.summary.evidenceRows}`,
    `- Ready for deeper review: ${report.summary.readyForDeeperReview}`,
    `- Needs more data: ${report.summary.needsMoreData}`,
    `- Keep out of scanner: ${report.summary.keepOutOfScanner}`,
    `- Rows with outcome counts: ${report.summary.rowsWithOutcomeCounts}`,
    '',
    '## Findings',
    ...report.findings.map((finding) => `- ${finding}`),
    '',
    '## Evidence Table',
    '| Status | Risk | Family | Artifact | Report Type | Sample | T1 | T2 | Stops | No Confirm | Unresolved | Notes |',
    '| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
    ...report.rows.map((row) => `| ${row.status} | ${row.promotionRisk} | ${row.family} | ${row.relativePath.replace(/\|/g, '/')} | ${row.reportType || 'N/A'} | ${fmt(row.sampleSize)} | ${fmt(row.t1Hits)} | ${fmt(row.t2Hits)} | ${fmt(row.stops)} | ${fmt(row.noConfirmation)} | ${fmt(row.unresolved)} | ${row.evidenceNotes.join('; ').replace(/\|/g, '/')} |`),
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
  ];
  return `${lines.join('\n')}\n`;
}

function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function htmlFor(report: Omit<ResearchDeskEvidenceTableReport, 'markdown' | 'html'>): string {
  const rows = report.rows.map((row) => [
    '<tr>',
    `<td><span class="pill ${escapeHtml(row.status)}">${escapeHtml(row.status.replace(/_/g, ' '))}</span></td>`,
    `<td>${escapeHtml(row.promotionRisk)}</td>`,
    `<td>${escapeHtml(row.family)}</td>`,
    `<td>${escapeHtml(row.relativePath)}</td>`,
    `<td>${escapeHtml(row.reportType || 'N/A')}</td>`,
    `<td class="num">${fmt(row.sampleSize)}</td>`,
    `<td class="num">${fmt(row.t1Hits)}</td>`,
    `<td class="num">${fmt(row.t2Hits)}</td>`,
    `<td class="num">${fmt(row.stops)}</td>`,
    `<td class="num">${fmt(row.noConfirmation)}</td>`,
    `<td class="num">${fmt(row.unresolved)}</td>`,
    `<td>${escapeHtml(row.evidenceNotes.join('; ') || 'N/A')}</td>`,
    '</tr>',
  ].join(''));
  const findings = report.findings.map((finding) => `<li>${escapeHtml(finding)}</li>`);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Quant Desk Phase 2 Evidence Table</title>
<style>
  :root { color-scheme: dark; --bg:#07100f; --panel:#101a1c; --line:#254146; --text:#eef8f6; --muted:#a8c0c2; --green:#36e07f; --amber:#ffd23f; --red:#ff5b5b; --blue:#55c7ff; }
  body { margin:0; font-family: Segoe UI, Arial, sans-serif; background:var(--bg); color:var(--text); }
  main { max-width:1240px; margin:0 auto; padding:34px 28px 56px; }
  h1 { margin:0 0 6px; font-size:30px; }
  h2 { margin:28px 0 12px; font-size:19px; color:var(--blue); }
  p, li { color:var(--muted); line-height:1.5; }
  .meta { color:var(--muted); font-size:13px; margin-bottom:22px; }
  .banner { border:1px solid var(--line); background:linear-gradient(90deg, rgba(255,210,63,.13), rgba(85,199,255,.08)); padding:16px 18px; border-radius:8px; margin:20px 0; }
  .grid { display:grid; grid-template-columns:repeat(5, minmax(0, 1fr)); gap:12px; margin:18px 0; }
  .card { border:1px solid var(--line); background:var(--panel); border-radius:8px; padding:14px; }
  .label { color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:.08em; }
  .value { font-size:28px; font-weight:800; margin-top:4px; }
  .green { color:var(--green); } .amber { color:var(--amber); } .red { color:var(--red); } .blue { color:var(--blue); }
  table { width:100%; border-collapse:collapse; border:1px solid var(--line); background:var(--panel); border-radius:8px; overflow:hidden; }
  th, td { padding:9px 10px; border-bottom:1px solid var(--line); text-align:left; vertical-align:top; font-size:12px; }
  th { color:var(--blue); background:#0c1719; position:sticky; top:0; }
  .num { text-align:right; font-variant-numeric:tabular-nums; }
  .pill { display:inline-block; padding:3px 7px; border-radius:999px; font-weight:700; color:#07100f; white-space:nowrap; }
  .ready_for_deeper_review { background:var(--green); }
  .needs_more_data { background:var(--amber); }
  .keep_out_of_scanner { background:var(--red); }
  .footer { margin-top:30px; font-size:12px; color:var(--muted); border-top:1px solid var(--line); padding-top:14px; }
</style>
</head>
<body><main>
<h1>Quant Desk Phase 2 Evidence Table</h1>
<div class="meta">Generated: ${escapeHtml(report.generatedAt)} | Source: read-only local research artifacts</div>
<div class="banner"><strong>Bottom line:</strong> Phase 2 converts promising research into an evidence table. It still does not change scanner behavior. Ready rows need deeper replay/human review before any promotion discussion.</div>
<div class="grid">
  <div class="card"><div class="label">Artifacts Reviewed</div><div class="value blue">${report.summary.artifactsReviewed}</div></div>
  <div class="card"><div class="label">Evidence Rows</div><div class="value">${report.summary.evidenceRows}</div></div>
  <div class="card"><div class="label">Ready Review</div><div class="value green">${report.summary.readyForDeeperReview}</div></div>
  <div class="card"><div class="label">Needs Data</div><div class="value amber">${report.summary.needsMoreData}</div></div>
  <div class="card"><div class="label">Keep Out</div><div class="value red">${report.summary.keepOutOfScanner}</div></div>
</div>
<h2>Findings</h2>
<ul>${findings.join('\n')}</ul>
<h2>Evidence Table</h2>
<table><thead><tr><th>Status</th><th>Risk</th><th>Family</th><th>Artifact</th><th>Report Type</th><th class="num">Sample</th><th class="num">T1</th><th class="num">T2</th><th class="num">Stops</th><th class="num">No Confirm</th><th class="num">Unresolved</th><th>Notes</th></tr></thead><tbody>
${rows.join('\n')}
</tbody></table>
<h2>Authority Boundary</h2>
<ul>
  <li>Read-only: true</li>
  <li>Posts Discord: false</li>
  <li>Writes Supabase: false</li>
  <li>Changes scanner state: false</li>
  <li>Changes trading logic / canExecute / entries / stops / targets: false</li>
  <li>Creates or promotes model: false</li>
</ul>
<div class="footer">Decision support only. This report is a research evidence table, not trade approval or model promotion.</div>
</main></body></html>
`;
}

export async function buildResearchDeskEvidenceTableReport(options: ResearchDeskEvidenceOptions): Promise<ResearchDeskEvidenceTableReport> {
  const reviewedFiles: string[] = [];
  const rows: ResearchEvidenceRow[] = [];
  for (const family of RESEARCH_FAMILIES) {
    const familyRoot = path.join(options.root, family.root);
    const files = await listFilesRecursive(familyRoot);
    reviewedFiles.push(...files);
    const familyRows = await Promise.all(files.map((file) => summarizeEvidenceArtifact(options.root, family.family, file)));
    rows.push(...familyRows.filter((row): row is ResearchEvidenceRow => row !== null));
  }
  rows.sort((a, b) => {
    const statusRank: Record<EvidenceStatus, number> = {
      ready_for_deeper_review: 0,
      needs_more_data: 1,
      keep_out_of_scanner: 2,
    };
    return statusRank[a.status] - statusRank[b.status] || b.modifiedAt.localeCompare(a.modifiedAt);
  });
  const baseReport = {
    reportType: 'research_desk_evidence_table_phase2' as const,
    generatedAt: new Date().toISOString(),
    root: options.root,
    outDir: options.outDir,
    summary: {
      artifactsReviewed: reviewedFiles.length,
      evidenceRows: rows.length,
      readyForDeeperReview: rows.filter((row) => row.status === 'ready_for_deeper_review').length,
      needsMoreData: rows.filter((row) => row.status === 'needs_more_data').length,
      keepOutOfScanner: rows.filter((row) => row.status === 'keep_out_of_scanner').length,
      rowsWithOutcomeCounts: rows.filter((row) => row.t1Hits !== null || row.t2Hits !== null || row.stops !== null || row.noConfirmation !== null).length,
    },
    rows,
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
  const options = parseResearchDeskEvidenceArgs();
  const report = await buildResearchDeskEvidenceTableReport(options);
  await fs.mkdir(options.outDir, { recursive: true });
  const stamp = report.generatedAt.replace(/[:.]/g, '-');
  const base = `desk-research-evidence-${stamp}`;
  const jsonPath = path.join(options.outDir, `${base}.json`);
  const mdPath = path.join(options.outDir, `${base}.md`);
  const htmlPath = path.join(options.outDir, `${base}.html`);
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(mdPath, report.markdown);
  await fs.writeFile(htmlPath, report.html);
  if (options.json) {
    process.stdout.write(`${JSON.stringify({ jsonPath, mdPath, htmlPath, summary: report.summary, findings: report.findings }, null, 2)}\n`);
  } else {
    console.log(`Research evidence table written: ${htmlPath}`);
    console.log(`Evidence rows: ${report.summary.evidenceRows}; ready: ${report.summary.readyForDeeperReview}; needs-data: ${report.summary.needsMoreData}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
