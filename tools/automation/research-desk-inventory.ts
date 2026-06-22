import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type ResearchStatus = 'proven' | 'promising' | 'needs_more_data' | 'weak' | 'reject' | 'inventory_only';

export interface ResearchArtifactSummary {
  family: string;
  file: string;
  relativePath: string;
  extension: string;
  sizeBytes: number;
  modifiedAt: string;
  reportType: string | null;
  instrument: string | null;
  status: ResearchStatus;
  notes: string[];
}

export interface ResearchFamilySummary {
  family: string;
  root: string;
  exists: boolean;
  files: number;
  jsonFiles: number;
  markdownFiles: number;
  latestModifiedAt: string | null;
  reportTypes: Record<string, number>;
  statuses: Record<ResearchStatus, number>;
  latestArtifacts: ResearchArtifactSummary[];
}

export interface ResearchDeskInventoryReport {
  reportType: 'research_desk_inventory_phase1';
  generatedAt: string;
  root: string;
  outDir: string;
  summary: {
    familiesReviewed: number;
    filesReviewed: number;
    jsonFiles: number;
    markdownFiles: number;
    researchOnlyArtifacts: number;
    promisingArtifacts: number;
    needsMoreDataArtifacts: number;
    weakOrRejectedArtifacts: number;
  };
  families: ResearchFamilySummary[];
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
  };
  markdown: string;
  html: string;
}

interface ResearchDeskInventoryOptions {
  root: string;
  outDir: string;
  json: boolean;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_OUT_DIR = path.join(__dirname, 'research-reports');
const MAX_SAMPLE_BYTES = 128 * 1024;
const MAX_FILES_PER_FAMILY = 2500;

const RESEARCH_FAMILIES = [
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
] as const;

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

export function parseResearchDeskInventoryArgs(args = process.argv.slice(2)): ResearchDeskInventoryOptions {
  const root = path.resolve(readFlag(args, '--root') || DEFAULT_ROOT);
  return {
    root,
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

function matchJsonString(sample: string, key: string): string | null {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = sample.match(new RegExp(`"${escaped}"\\s*:\\s*"([^"]+)"`));
  return match?.[1] || null;
}

function classifyStatus(sample: string, reportType: string | null): { status: ResearchStatus; notes: string[] } {
  const lower = sample.toLowerCase();
  const notes: string[] = [];
  if (/reject|rejected|do not promote|not ready/.test(lower)) {
    notes.push('Contains rejection/not-ready language.');
    return { status: 'reject', notes };
  }
  if (/weak|failed|low confidence/.test(lower)) {
    notes.push('Contains weak/failed language.');
    return { status: 'weak', notes };
  }
  if (/needs more data|continue research|more sample|insufficient sample|research-only|research_only/.test(lower)) {
    notes.push('Research-only or needs-more-data language found.');
    return { status: 'needs_more_data', notes };
  }
  if (/promising|watchlist|candidate|t1 hits|t1 hit|validated/.test(lower)) {
    notes.push('Promising/candidate language found.');
    return { status: 'promising', notes };
  }
  if (/proven|production ready|ready for phase/.test(lower)) {
    notes.push('Proven/ready language found; requires human review before any promotion.');
    return { status: 'proven', notes };
  }
  if (reportType) notes.push(`Detected reportType=${reportType}.`);
  return { status: 'inventory_only', notes };
}

async function summarizeArtifact(root: string, family: string, file: string): Promise<ResearchArtifactSummary> {
  const stat = await fs.stat(file);
  const sample = await readSample(file).catch(() => '');
  const extension = path.extname(file).toLowerCase();
  const reportType = extension === '.json' ? matchJsonString(sample, 'reportType') : null;
  const instrument = matchJsonString(sample, 'instrument');
  const classified = classifyStatus(sample, reportType);
  return {
    family,
    file,
    relativePath: path.relative(root, file).replace(/\\/g, '/'),
    extension,
    sizeBytes: stat.size,
    modifiedAt: stat.mtime.toISOString(),
    reportType,
    instrument,
    status: classified.status,
    notes: classified.notes,
  };
}

function increment<T extends string>(record: Record<T, number>, key: T): void {
  record[key] = (record[key] || 0) + 1;
}

async function summarizeFamily(options: ResearchDeskInventoryOptions, family: typeof RESEARCH_FAMILIES[number]): Promise<ResearchFamilySummary> {
  const familyRoot = path.join(options.root, family.root);
  const files = await listFilesRecursive(familyRoot);
  const artifacts = await Promise.all(files.map((file) => summarizeArtifact(options.root, family.family, file)));
  artifacts.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
  const reportTypes: Record<string, number> = {};
  const statuses: Record<ResearchStatus, number> = {
    proven: 0,
    promising: 0,
    needs_more_data: 0,
    weak: 0,
    reject: 0,
    inventory_only: 0,
  };
  for (const artifact of artifacts) {
    if (artifact.reportType) reportTypes[artifact.reportType] = (reportTypes[artifact.reportType] || 0) + 1;
    increment(statuses, artifact.status);
  }
  return {
    family: family.family,
    root: family.root,
    exists: existsSync(familyRoot),
    files: artifacts.length,
    jsonFiles: artifacts.filter((item) => item.extension === '.json').length,
    markdownFiles: artifacts.filter((item) => item.extension === '.md').length,
    latestModifiedAt: artifacts[0]?.modifiedAt || null,
    reportTypes,
    statuses,
    latestArtifacts: artifacts.slice(0, 8),
  };
}

function findingsFor(report: Omit<ResearchDeskInventoryReport, 'markdown' | 'html' | 'findings'>): string[] {
  const findings: string[] = [];
  if (report.summary.filesReviewed === 0) {
    findings.push('No research artifacts were found in the configured research/report folders.');
  } else {
    findings.push(`${report.summary.filesReviewed} research/report artifacts were inventoried across ${report.summary.familiesReviewed} configured families.`);
  }
  if (report.summary.promisingArtifacts > 0) {
    findings.push(`${report.summary.promisingArtifacts} artifact(s) contain promising/candidate language and deserve a deeper Phase 2 evidence review.`);
  }
  if (report.summary.needsMoreDataArtifacts > 0) {
    findings.push(`${report.summary.needsMoreDataArtifacts} artifact(s) appear research-only or need more data before promotion.`);
  }
  if (report.summary.weakOrRejectedArtifacts > 0) {
    findings.push(`${report.summary.weakOrRejectedArtifacts} artifact(s) contain weak/reject language and should stay out of live scanner changes unless revalidated.`);
  }
  findings.push('This is an inventory/audit only. It does not score, approve, promote, or reject any trading model by itself.');
  findings.push('Next phase should convert selected promising artifacts into an evidence table with sample size, T1/T2/stop/no-confirmation counts, best/worst conditions, and promotion risk.');
  return findings;
}

function markdownFor(report: Omit<ResearchDeskInventoryReport, 'markdown' | 'html'>): string {
  const lines = [
    `# Quant Desk Research Inventory - ${report.generatedAt.slice(0, 10)}`,
    '',
    'Read-only Phase 1 inventory/audit. This report scans local research artifacts and does not post Discord, write Supabase, change scanner state, approve execution, or change trading logic.',
    '',
    '## Summary',
    `- Families reviewed: ${report.summary.familiesReviewed}`,
    `- Files reviewed: ${report.summary.filesReviewed}`,
    `- JSON files: ${report.summary.jsonFiles}`,
    `- Markdown files: ${report.summary.markdownFiles}`,
    `- Research-only / needs-more-data artifacts: ${report.summary.needsMoreDataArtifacts}`,
    `- Promising artifacts: ${report.summary.promisingArtifacts}`,
    `- Weak/rejected artifacts: ${report.summary.weakOrRejectedArtifacts}`,
    '',
    '## Findings',
    ...report.findings.map((finding) => `- ${finding}`),
    '',
    '## Research Families',
    '| Family | Files | JSON | Markdown | Latest | Top Report Types | Status Mix |',
    '| --- | ---: | ---: | ---: | --- | --- | --- |',
    ...report.families.map((family) => {
      const reportTypes = Object.entries(family.reportTypes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([key, value]) => `${key} (${value})`)
        .join(', ') || 'N/A';
      const statuses = Object.entries(family.statuses)
        .filter(([, value]) => value > 0)
        .map(([key, value]) => `${key}=${value}`)
        .join(', ') || 'none';
      return `| ${family.family} | ${family.files} | ${family.jsonFiles} | ${family.markdownFiles} | ${family.latestModifiedAt || 'N/A'} | ${reportTypes.replace(/\|/g, '/')} | ${statuses} |`;
    }),
    '',
    '## Latest Artifacts By Family',
    ...report.families.flatMap((family) => [
      '',
      `### ${family.family}`,
      ...(family.latestArtifacts.length
        ? family.latestArtifacts.map((artifact) => `- ${artifact.relativePath} | ${artifact.status} | ${artifact.reportType || 'no reportType'} | ${artifact.modifiedAt}`)
        : ['- No artifacts found.']),
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
    '- Creates new model: false',
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

function htmlFor(report: Omit<ResearchDeskInventoryReport, 'markdown' | 'html'>): string {
  const familyRows = report.families.map((family) => {
    const reportTypes = Object.entries(family.reportTypes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([key, value]) => `${key} (${value})`)
      .join(', ') || 'N/A';
    const statuses = Object.entries(family.statuses)
      .filter(([, value]) => value > 0)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ') || 'none';
    return [
      '<tr>',
      `<td>${escapeHtml(family.family)}</td>`,
      `<td class="num">${family.files}</td>`,
      `<td class="num">${family.jsonFiles}</td>`,
      `<td class="num">${family.markdownFiles}</td>`,
      `<td>${escapeHtml(family.latestModifiedAt || 'N/A')}</td>`,
      `<td>${escapeHtml(reportTypes)}</td>`,
      `<td>${escapeHtml(statuses)}</td>`,
      '</tr>',
    ].join('');
  });
  const priorityItems = report.families
    .filter((family) => family.statuses.promising > 0)
    .sort((a, b) => b.statuses.promising - a.statuses.promising)
    .slice(0, 8)
    .map((family) => `<li><strong>${escapeHtml(family.family)}</strong>: ${family.statuses.promising} promising artifact(s)</li>`);
  const findings = report.findings.map((finding) => `<li>${escapeHtml(finding)}</li>`);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Quant Desk Research Status</title>
<style>
  :root { color-scheme: dark; --bg:#07100f; --panel:#101a1c; --line:#254146; --text:#eef8f6; --muted:#a8c0c2; --green:#36e07f; --amber:#ffd23f; --red:#ff5b5b; --blue:#55c7ff; }
  body { margin:0; font-family: Segoe UI, Arial, sans-serif; background:var(--bg); color:var(--text); }
  main { max-width:1120px; margin:0 auto; padding:34px 28px 56px; }
  h1 { margin:0 0 6px; font-size:30px; }
  h2 { margin:28px 0 12px; font-size:19px; color:var(--blue); }
  p, li { color:var(--muted); line-height:1.5; }
  .meta { color:var(--muted); font-size:13px; margin-bottom:22px; }
  .banner { border:1px solid var(--line); background:linear-gradient(90deg, rgba(54,224,127,.13), rgba(85,199,255,.08)); padding:16px 18px; border-radius:8px; margin:20px 0; }
  .banner strong, strong { color:var(--text); }
  .grid { display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:12px; margin:18px 0; }
  .card { border:1px solid var(--line); background:var(--panel); border-radius:8px; padding:14px; }
  .label { color:var(--muted); font-size:12px; text-transform:uppercase; letter-spacing:.08em; }
  .value { font-size:28px; font-weight:800; margin-top:4px; }
  .green { color:var(--green); } .red { color:var(--red); } .blue { color:var(--blue); }
  table { width:100%; border-collapse:collapse; border:1px solid var(--line); background:var(--panel); border-radius:8px; overflow:hidden; }
  th, td { padding:10px 12px; border-bottom:1px solid var(--line); text-align:left; vertical-align:top; font-size:13px; }
  th { color:var(--blue); background:#0c1719; }
  .num { text-align:right; font-variant-numeric:tabular-nums; }
  .footer { margin-top:30px; font-size:12px; color:var(--muted); border-top:1px solid var(--line); padding-top:14px; }
</style>
</head>
<body><main>
<h1>Quant Desk Research Status</h1>
<div class="meta">Generated: ${escapeHtml(report.generatedAt)} | Source: read-only local research inventory</div>
<div class="banner"><strong>Bottom line:</strong> Phase 1 inventory is complete. This is not production evidence yet. Use Phase 2 to turn promising artifacts into an evidence table before changing scanner behavior.</div>
<div class="grid">
  <div class="card"><div class="label">Families Reviewed</div><div class="value blue">${report.summary.familiesReviewed}</div></div>
  <div class="card"><div class="label">Files Reviewed</div><div class="value">${report.summary.filesReviewed}</div></div>
  <div class="card"><div class="label">Promising</div><div class="value green">${report.summary.promisingArtifacts}</div></div>
  <div class="card"><div class="label">Weak / Rejected</div><div class="value red">${report.summary.weakOrRejectedArtifacts}</div></div>
</div>
<h2>Findings</h2>
<ul>${findings.join('\n')}</ul>
<h2>Priority Buckets</h2>
<ul>${priorityItems.length ? priorityItems.join('\n') : '<li>No promising artifacts found in this inventory.</li>'}</ul>
<h2>Research Families</h2>
<table><thead><tr><th>Family</th><th class="num">Files</th><th class="num">JSON</th><th class="num">Markdown</th><th>Latest</th><th>Main Report Types</th><th>Status Mix</th></tr></thead><tbody>
${familyRows.join('\n')}
</tbody></table>
<h2>Authority Boundary</h2>
<ul>
  <li>Read-only: true</li>
  <li>Posts Discord: false</li>
  <li>Writes Supabase: false</li>
  <li>Changes scanner state: false</li>
  <li>Changes trading logic / canExecute / entries / stops / targets: false</li>
</ul>
<div class="footer">Decision support only. This report is research inventory, not trade approval or model promotion.</div>
</main></body></html>
`;
}

export async function buildResearchDeskInventoryReport(options: ResearchDeskInventoryOptions): Promise<ResearchDeskInventoryReport> {
  const families = await Promise.all(RESEARCH_FAMILIES.map((family) => summarizeFamily(options, family)));
  const summary = {
    familiesReviewed: families.length,
    filesReviewed: families.reduce((sum, family) => sum + family.files, 0),
    jsonFiles: families.reduce((sum, family) => sum + family.jsonFiles, 0),
    markdownFiles: families.reduce((sum, family) => sum + family.markdownFiles, 0),
    researchOnlyArtifacts: families.reduce((sum, family) => sum + family.statuses.needs_more_data, 0),
    promisingArtifacts: families.reduce((sum, family) => sum + family.statuses.promising, 0),
    needsMoreDataArtifacts: families.reduce((sum, family) => sum + family.statuses.needs_more_data, 0),
    weakOrRejectedArtifacts: families.reduce((sum, family) => sum + family.statuses.weak + family.statuses.reject, 0),
  };
  const baseReport = {
    reportType: 'research_desk_inventory_phase1' as const,
    generatedAt: new Date().toISOString(),
    root: options.root,
    outDir: options.outDir,
    summary,
    families,
    authority: {
      readOnly: true,
      postsDiscord: false,
      writesSupabase: false,
      changesScannerState: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      changesEntriesStopsTargets: false,
      createsNewModel: false,
    } as const,
  };
  const withFindings = {
    ...baseReport,
    findings: findingsFor(baseReport),
  };
  const markdown = markdownFor(withFindings);
  return {
    ...withFindings,
    markdown,
    html: htmlFor(withFindings),
  };
}

async function main() {
  const options = parseResearchDeskInventoryArgs();
  const report = await buildResearchDeskInventoryReport(options);
  await fs.mkdir(options.outDir, { recursive: true });
  const stamp = report.generatedAt.replace(/[:.]/g, '-');
  const base = `desk-research-inventory-${stamp}`;
  const jsonPath = path.join(options.outDir, `${base}.json`);
  const mdPath = path.join(options.outDir, `${base}.md`);
  const htmlPath = path.join(options.outDir, `${base}.html`);
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(mdPath, report.markdown);
  await fs.writeFile(htmlPath, report.html);
  if (options.json) {
    process.stdout.write(`${JSON.stringify({ jsonPath, mdPath, htmlPath, summary: report.summary, findings: report.findings }, null, 2)}\n`);
  } else {
    console.log(`Research inventory written: ${htmlPath}`);
    console.log(`Files reviewed: ${report.summary.filesReviewed}; promising: ${report.summary.promisingArtifacts}; needs-more-data: ${report.summary.needsMoreDataArtifacts}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
