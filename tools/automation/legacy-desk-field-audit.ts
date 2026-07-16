import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type LegacyDeskFieldClassification =
  | 'keep_canonical'
  | 'keep_current_support'
  | 'deprecated_read_only'
  | 'blocked_still_used'
  | 'safe_to_archive_from_artifacts'
  | 'safe_to_delete_code';

export interface LegacyDeskFieldFinding {
  field: string;
  file: string;
  line: number;
  snippet: string;
  classification: LegacyDeskFieldClassification;
  reason: string;
  cleanupAction: string;
}

export interface LegacyDeskFieldAuditReport {
  reportType: 'legacy_desk_field_audit';
  generatedAt: string;
  authority: {
    readOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    changesScannerBehavior: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
  };
  rootDir: string;
  filesScanned: number;
  findings: LegacyDeskFieldFinding[];
  summary: Record<LegacyDeskFieldClassification, number>;
  cleanupPlan: string[];
  markdown: string;
}

interface AuditOptions {
  rootDir: string;
  outDir: string;
  json: boolean;
  includeArtifacts: boolean;
}

interface FieldRule {
  field: string;
  pattern: RegExp;
  reason: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');

const FIELD_RULES: FieldRule[] = [
  {
    field: 'deskPublishDecision',
    pattern: /\bdeskPublishDecision\b|\bDeskPublishDecision\b|\bbuildDeskPublishDecision\b/,
    reason: 'Canonical scanner-owned publish contract.',
  },
  {
    field: 'deskTicket',
    pattern: /\bdeskTicket\b|\bDeskTicket\b/,
    reason: 'Canonical trader-facing DeskTicket contract.',
  },
  {
    field: 'primaryDeskPlay',
    pattern: /\bprimaryDeskPlay\b/,
    reason: 'Legacy/support map that can drift if a consumer uses it as public trade-plan authority.',
  },
  {
    field: 'setupCandidateStatus',
    pattern: /\bsetupCandidateStatus\b/,
    reason: 'Historical scanner tape candidate-status field; should be audit/read-only outside scanner tests.',
  },
  {
    field: 'candidateLifecycleTrace',
    pattern: /\bcandidateLifecycleTrace\b/,
    reason: 'Scanner-owned lifecycle support evidence; not the final trader-facing publish contract.',
  },
  {
    field: 'bestLongPlan/bestShortPlan',
    pattern: /\bbestLongPlan\b|\bbestShortPlan\b/,
    reason: 'Side-map support fields; should not outrank selected canonical DeskTicket/DeskPublishDecision.',
  },
  {
    field: 'legacy plan levels',
    pattern: /\bplan\.(entry|stop|t1|t2)\b/,
    reason: 'Legacy normalized plan levels from audit records; public replay should prefer canonical scanner-owned fields.',
  },
];

const CLASSIFICATIONS: LegacyDeskFieldClassification[] = [
  'keep_canonical',
  'keep_current_support',
  'deprecated_read_only',
  'blocked_still_used',
  'safe_to_archive_from_artifacts',
  'safe_to_delete_code',
];

const SCAN_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.md']);
const SOURCE_ROOTS = ['src', 'tools/automation', 'docs'];
const GENERATED_ARTIFACT_ROOTS = [
  'tools/automation/discord-audit',
  'tools/automation/diagnostic-reports',
  'tools/automation/replay-diagnostics',
  'tools/automation/live-desk-observer-reports',
];

function authority(): LegacyDeskFieldAuditReport['authority'] {
  return {
    readOnly: true,
    postsDiscord: false,
    writesSupabase: false,
    changesScannerBehavior: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
  };
}

function normalizeRelative(rootDir: string, filePath: string): string {
  return path.relative(rootDir, filePath).replace(/\\/g, '/');
}

function isUnder(relativePath: string, root: string): boolean {
  return relativePath === root || relativePath.startsWith(`${root}/`);
}

function shouldSkip(relativePath: string): boolean {
  return relativePath === '.git' ||
    relativePath === 'node_modules' ||
    relativePath === 'dist' ||
    relativePath === 'coverage' ||
    relativePath.includes('/node_modules/') ||
    relativePath.includes('/stale-artifact-archive/');
}

function isGeneratedArtifact(relativePath: string): boolean {
  return GENERATED_ARTIFACT_ROOTS.some((root) => isUnder(relativePath, root));
}

function isSourceCandidate(relativePath: string): boolean {
  return SOURCE_ROOTS.some((root) => isUnder(relativePath, root));
}

function isTestOrAudit(relativePath: string): boolean {
  return /\.test\.(ts|tsx|js|jsx)$/i.test(relativePath) ||
    /(^|\/)([^/]*audit[^/]*|[^/]*research[^/]*|diagnostic-[^/]*)\.(ts|tsx|js|jsx|md)$/i.test(relativePath);
}

function isPublicConsumer(relativePath: string): boolean {
  return /^tools\/automation\/(discord-alert-format|discord-scheduler|chart-markup-renderer|nt-scanner)\.ts$/i.test(relativePath);
}

function classifyFinding(field: string, relativeFile: string): Omit<LegacyDeskFieldFinding, 'field' | 'file' | 'line' | 'snippet' | 'reason'> {
  if (field === 'deskPublishDecision' || field === 'deskTicket') {
    return {
      classification: 'keep_canonical',
      cleanupAction: 'Keep. This is the canonical scanner-owned public contract.',
    };
  }
  if (isGeneratedArtifact(relativeFile)) {
    return {
      classification: 'safe_to_archive_from_artifacts',
      cleanupAction: 'Archive or regenerate generated artifacts; do not use them as current execution truth.',
    };
  }
  if (isPublicConsumer(relativeFile) && (field === 'primaryDeskPlay' || field === 'bestLongPlan/bestShortPlan' || field === 'legacy plan levels')) {
    return {
      classification: 'blocked_still_used',
      cleanupAction: 'Do not delete yet. First route this consumer through DeskTicket/DeskPublishDecision and prove formatter/chart agreement.',
    };
  }
  if (isTestOrAudit(relativeFile) || field === 'setupCandidateStatus' || field === 'legacy plan levels') {
    return {
      classification: 'deprecated_read_only',
      cleanupAction: 'Keep read-only for historical/audit compatibility until replay readers migrate.',
    };
  }
  if (field === 'candidateLifecycleTrace' || field === 'bestLongPlan/bestShortPlan' || field === 'primaryDeskPlay') {
    return {
      classification: 'keep_current_support',
      cleanupAction: 'Keep as internal/supporting scanner state. It must not outrank the canonical ticket.',
    };
  }
  return {
    classification: 'safe_to_delete_code',
    cleanupAction: 'Candidate for deletion after focused tests prove no consumer depends on it.',
  };
}

function walkFiles(rootDir: string, includeArtifacts: boolean): string[] {
  const files: string[] = [];
  const stack = [rootDir];
  while (stack.length) {
    const dir = stack.pop();
    if (!dir) continue;
    const relativeDir = normalizeRelative(rootDir, dir);
    if (relativeDir && shouldSkip(relativeDir)) continue;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relative = normalizeRelative(rootDir, fullPath);
      if (entry.isDirectory()) {
        if (!includeArtifacts && isGeneratedArtifact(relative)) continue;
        if (!shouldSkip(relative)) stack.push(fullPath);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!SCAN_EXTENSIONS.has(path.extname(entry.name))) continue;
      if (!includeArtifacts && isGeneratedArtifact(relative)) continue;
      if (!isSourceCandidate(relative) && !(includeArtifacts && isGeneratedArtifact(relative))) continue;
      files.push(fullPath);
    }
  }
  return files.sort((a, b) => normalizeRelative(rootDir, a).localeCompare(normalizeRelative(rootDir, b)));
}

function scanFile(rootDir: string, filePath: string): LegacyDeskFieldFinding[] {
  const relativeFile = normalizeRelative(rootDir, filePath);
  if (isGeneratedArtifact(relativeFile)) {
    return [{
      field: 'generated artifact legacy fields',
      file: relativeFile,
      line: 1,
      snippet: 'generated artifact path',
      reason: 'Generated historical artifacts may contain old Desk fields from prior scanner versions.',
      ...classifyFinding('generated artifact legacy fields', relativeFile),
    }];
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const findings: LegacyDeskFieldFinding[] = [];
  for (const rule of FIELD_RULES) {
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (!rule.pattern.test(line)) continue;
      findings.push({
        field: rule.field,
        file: relativeFile,
        line: index + 1,
        snippet: line.trim().slice(0, 220),
        reason: rule.reason,
        ...classifyFinding(rule.field, relativeFile),
      });
    }
  }
  return findings;
}

function renderMarkdown(report: Omit<LegacyDeskFieldAuditReport, 'markdown'>): string {
  const lines = [
    '# Legacy Desk Field Audit',
    '',
    'Read-only audit. This report does not post Discord, write Supabase, change scanner behavior, approve execution, change trading logic, change `canExecute`, or change entry/stop/target math.',
    '',
    '## Summary',
    `- Files scanned: ${report.filesScanned}`,
    `- Findings: ${report.findings.length}`,
    ...CLASSIFICATIONS.map((classification) => `- ${classification}: ${report.summary[classification]}`),
    '',
    '## Cleanup Plan',
    ...report.cleanupPlan.map((item) => `- ${item}`),
    '',
    '## Findings',
  ];
  for (const finding of report.findings.slice(0, 200)) {
    lines.push(
      `- ${finding.classification}: \`${finding.field}\` in \`${finding.file}:${finding.line}\` - ${finding.cleanupAction}`,
    );
  }
  if (report.findings.length > 200) {
    lines.push(`- ${report.findings.length - 200} additional finding(s) omitted from markdown; see JSON for full detail.`);
  }
  return `${lines.join('\n')}\n`;
}

export function buildLegacyDeskFieldAudit(rootDir = DEFAULT_ROOT, options: { includeArtifacts?: boolean } = {}): LegacyDeskFieldAuditReport {
  const files = walkFiles(rootDir, Boolean(options.includeArtifacts));
  const findings = files.flatMap((file) => scanFile(rootDir, file));
  const summary = CLASSIFICATIONS.reduce((acc, classification) => {
    acc[classification] = findings.filter((finding) => finding.classification === classification).length;
    return acc;
  }, {} as Record<LegacyDeskFieldClassification, number>);
  const cleanupPlan = [
    summary.blocked_still_used > 0
      ? 'Blocked: public consumers still read legacy/support fields. Migrate those consumers before deleting fields.'
      : 'No blocked public-consumer legacy field reads found.',
    summary.safe_to_archive_from_artifacts > 0
      ? 'Archive/regenerate stale generated artifacts in a separate artifact-only cleanup; do not mix with code deletion.'
      : 'No generated legacy artifacts found in the scanned roots.',
    summary.safe_to_delete_code > 0
      ? 'Delete only safe_to_delete_code entries after focused tests prove behavior is preserved.'
      : 'No code fields are safe to delete in this pass.',
    'Keep canonical DeskTicket and DeskPublishDecision as the only public trade-plan authority.',
  ];
  const partial: Omit<LegacyDeskFieldAuditReport, 'markdown'> = {
    reportType: 'legacy_desk_field_audit',
    generatedAt: new Date().toISOString(),
    authority: authority(),
    rootDir,
    filesScanned: files.length,
    findings,
    summary,
    cleanupPlan,
  };
  return {
    ...partial,
    markdown: renderMarkdown(partial),
  };
}

function argValue(args: string[], name: string): string | null {
  const prefix = `--${name}=`;
  const directIndex = args.indexOf(`--${name}`);
  if (directIndex >= 0 && args[directIndex + 1] && !args[directIndex + 1].startsWith('--')) return args[directIndex + 1];
  const matched = args.find((arg) => arg.startsWith(prefix));
  return matched ? matched.slice(prefix.length) : null;
}

function hasArg(args: string[], name: string): boolean {
  return args.includes(`--${name}`);
}

function parseArgs(args = process.argv.slice(2)): AuditOptions {
  return {
    rootDir: path.resolve(argValue(args, 'root') || DEFAULT_ROOT),
    outDir: path.resolve(argValue(args, 'out-dir') || DEFAULT_OUT_DIR),
    json: hasArg(args, 'json'),
    includeArtifacts: hasArg(args, 'include-artifacts'),
  };
}

async function main() {
  const options = parseArgs();
  const report = buildLegacyDeskFieldAudit(options.rootDir, { includeArtifacts: options.includeArtifacts });
  fs.mkdirSync(options.outDir, { recursive: true });
  const stamp = report.generatedAt.replace(/[:.]/g, '-');
  const jsonPath = path.join(options.outDir, `legacy-desk-field-audit-${stamp}.json`);
  const mdPath = path.join(options.outDir, `legacy-desk-field-audit-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(mdPath, report.markdown);
  if (options.json) {
    console.log(JSON.stringify({ jsonPath, mdPath, summary: report.summary, cleanupPlan: report.cleanupPlan }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`JSON: ${jsonPath}`);
    console.log(`Markdown: ${mdPath}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
