import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface AuthorityLanguageFinding {
  file: string;
  line: number;
  snippet: string;
  reason: string;
}

export interface AuthorityLanguageAuditReport {
  reportType: 'phase_8_5_authority_language_audit';
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
  filesScanned: string[];
  requiredTerms: string[];
  forbiddenPhrases: string[];
  status: 'pass' | 'fail';
  findings: AuthorityLanguageFinding[];
  markdown: string;
}

const DEFAULT_LIVE_SURFACES = [
  'src/lib/localScannerEngine.ts',
  'src/agents/scannerPlanSelectionAgent.ts',
  'tools/automation/discord-alert-format.ts',
  'tools/automation/nt-scanner.ts',
  'tools/automation/discord-scheduler.ts',
  'src/config/responsibilityRegistry.ts',
  'src/config/setupRegistry.ts',
];

const REQUIRED_TERMS = [
  'registeredModel',
  'activeModel',
  'watchEligible',
  'planEligible',
  'discordEligible',
  'executionEligible',
  'humanReviewOnly',
  'canExecute',
];

const FORBIDDEN_PHRASES = [
  'approved model',
  'approved setup',
  'valid trade',
];

function authority(): AuthorityLanguageAuditReport['authority'] {
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

function liveSurfacePaths(rootDir: string, liveSurfaces = DEFAULT_LIVE_SURFACES): string[] {
  return liveSurfaces
    .map((relative) => path.join(rootDir, relative))
    .filter((filePath) => fs.existsSync(filePath));
}

function lineAllowed(line: string): boolean {
  return /@deprecated/i.test(line) || /compatibility alias/i.test(line) || /APPROVED_SETUP_TYPES/.test(line);
}

function scanForbiddenPhrases(rootDir: string, filePath: string): AuthorityLanguageFinding[] {
  const relativeFile = normalizeRelative(rootDir, filePath);
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  const findings: AuthorityLanguageFinding[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (lineAllowed(line)) continue;
    const lower = line.toLowerCase();
    const phrase = FORBIDDEN_PHRASES.find((candidate) => lower.includes(candidate));
    if (!phrase) continue;
    findings.push({
      file: relativeFile,
      line: index + 1,
      snippet: line.trim().slice(0, 220),
      reason: `Live scanner/Discord authority language should use precise terms instead of "${phrase}".`,
    });
  }
  return findings;
}

function renderMarkdown(report: Omit<AuthorityLanguageAuditReport, 'markdown'>): string {
  const lines = [
    '# Phase 8.5 Authority Language Audit',
    '',
    'Read-only audit. This report does not post Discord, write Supabase, change scanner behavior, approve execution, change trading logic, change `canExecute`, or change entries/stops/targets.',
    '',
    '## Summary',
    `- Status: ${report.status}`,
    `- Files scanned: ${report.filesScanned.length}`,
    `- Findings: ${report.findings.length}`,
    `- Required terms: ${report.requiredTerms.join(', ')}`,
    `- Forbidden vague phrases: ${report.forbiddenPhrases.join(', ')}`,
    '',
    '## Findings',
  ];

  if (!report.findings.length) {
    lines.push('- No vague authority phrases found in live scanner/Discord authority surfaces.');
  } else {
    lines.push('| File | Line | Evidence | Reason |');
    lines.push('| --- | ---: | --- | --- |');
    for (const finding of report.findings) {
      lines.push(`| ${finding.file} | ${finding.line} | ${finding.snippet.replace(/\|/g, '\\|')} | ${finding.reason.replace(/\|/g, '\\|')} |`);
    }
  }

  lines.push(
    '',
    '## Authority Boundary',
    '- `registeredModel`, `activeModel`, `watchEligible`, `planEligible`, `discordEligible`, `executionEligible`, and `humanReviewOnly` are descriptive metadata.',
    '- They are not new gates.',
    '- Existing deterministic `canExecute` remains the execution boundary.',
  );

  return `${lines.join('\n')}\n`;
}

export function buildAuthorityLanguageAudit(rootDir = process.cwd(), liveSurfaces = DEFAULT_LIVE_SURFACES): AuthorityLanguageAuditReport {
  const files = liveSurfacePaths(rootDir, liveSurfaces);
  const combined = files.map((filePath) => fs.readFileSync(filePath, 'utf8')).join('\n');
  const missingRequired = REQUIRED_TERMS.filter((term) => !combined.includes(term));
  const findings = files.flatMap((filePath) => scanForbiddenPhrases(rootDir, filePath));
  for (const term of missingRequired) {
    findings.push({
      file: '(live authority surfaces)',
      line: 0,
      snippet: term,
      reason: `Required Phase 8.5 authority metadata term "${term}" is missing from live authority surfaces.`,
    });
  }

  const reportWithoutMarkdown: Omit<AuthorityLanguageAuditReport, 'markdown'> = {
    reportType: 'phase_8_5_authority_language_audit',
    generatedAt: new Date().toISOString(),
    authority: authority(),
    rootDir,
    filesScanned: files.map((filePath) => normalizeRelative(rootDir, filePath)),
    requiredTerms: REQUIRED_TERMS,
    forbiddenPhrases: FORBIDDEN_PHRASES,
    status: findings.length ? 'fail' : 'pass',
    findings,
  };

  return {
    ...reportWithoutMarkdown,
    markdown: renderMarkdown(reportWithoutMarkdown),
  };
}

function argValue(name: string): string | null {
  const prefix = `--${name}=`;
  const exact = `--${name}`;
  for (let index = 2; index < process.argv.length; index += 1) {
    const arg = process.argv[index];
    if (arg.startsWith(prefix)) return arg.slice(prefix.length);
    if (arg === exact) return process.argv[index + 1] ?? null;
  }
  return null;
}

async function main(): Promise<void> {
  const rootDir = path.resolve(argValue('root') || process.cwd());
  const json = process.argv.includes('--json');
  const report = buildAuthorityLanguageAudit(rootDir);
  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(report.markdown);
  }
  if (report.status !== 'pass') process.exit(1);
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
