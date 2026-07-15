import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface DeskPublishContractFinding {
  checkId: string;
  file: string;
  reason: string;
  evidence: string[];
}

export interface DeskPublishContractAuditReport {
  reportType: 'phase_3c_desk_publish_contract_audit';
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
  checks: string[];
  status: 'pass' | 'fail';
  findings: DeskPublishContractFinding[];
  markdown: string;
}

interface ContractCheck {
  id: string;
  file: string;
  required?: string[];
  forbidden?: string[];
  forbiddenImports?: string[];
  note: string;
}

const DEFAULT_CHECKS: ContractCheck[] = [
  {
    id: 'scanner_engine_owns_publish_contract',
    file: 'src/lib/localScannerEngine.ts',
    required: [
      'export interface DeskPublishDecision',
      'export function buildDeskPublishDecision',
      "sourceOfTruth: 'scanner_desk_publish_decision'",
      'public output requires canonical selected-candidate ownership or counter-scenario marking',
    ],
    note: 'Local scanner engine owns the canonical publish decision and mismatch blocker.',
  },
  {
    id: 'scanner_artifact_path_enforces_contract',
    file: 'tools/automation/nt-scanner.ts',
    required: [
      'buildDeskPublishDecision',
      'assertScannerDeskPublishArtifactAgreement',
      'DeskPublishDecision artifact agreement failed',
      'chart context line',
      'Canonical DeskPublishDecision line in the sand.',
      'prepareLiveScannerDeskPlayAlertArtifacts',
    ],
    note: 'Scanner artifact creation must use the canonical decision and fail on ticket/chart/payload drift.',
  },
  {
    id: 'formatter_formats_only',
    file: 'tools/automation/discord-alert-format.ts',
    required: [
      'CompactDeskStateForDiscord',
      'deskTicket',
      'Decision support only. No automated orders.',
    ],
    forbidden: [
      'buildDeskPublishDecision',
      'DeskPublishDecision artifact agreement',
    ],
    forbiddenImports: [
      'src/lib/setupScanner',
      'src/lib/tradeDecisionPipeline',
      'src/lib/conditionalPlanBuilder',
    ],
    note: 'Discord formatter may format the canonical ticket, but must not build/rebuild publish decisions or import scanner decision ownership.',
  },
  {
    id: 'scheduler_does_not_publish_scanner_desk_play_directly',
    file: 'tools/automation/discord-scheduler.ts',
    forbidden: [
      'buildDeskPublishDecision',
      'prepareLiveScannerDeskPlayAlertArtifacts',
      'assertScannerDeskPublishArtifactAgreement',
    ],
    forbiddenImports: [
      'src/lib/setupScanner',
      'src/lib/tradeDecisionPipeline',
      'src/lib/conditionalPlanBuilder',
    ],
    note: 'Legacy scheduler jobs must not add a parallel scanner Desk Play publish contract.',
  },
  {
    id: 'alert_regression_covers_canonical_artifacts',
    file: 'tools/automation/nt-scanner-alert.test.ts',
    required: [
      'SCANNER-DESK-PLAY-CANONICAL-LINE-FIXTURE',
      'DeskPublishDecision artifact agreement failed',
      'Canonical DeskPublishDecision held this Desk Play local.',
    ],
    note: 'Regression coverage proves canonical holds, mismatches, and stale chart-line leaks are caught.',
  },
];

function authority(): DeskPublishContractAuditReport['authority'] {
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

function readFile(rootDir: string, relativeFile: string): string | null {
  const fullPath = path.join(rootDir, relativeFile);
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath, 'utf8');
}

function importPattern(modulePath: string): RegExp {
  const escaped = modulePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\//g, '[\\\\/]');
  return new RegExp(`from\\s+['"][^'"]*${escaped}['"]|import\\s*\\([^)]*['"][^'"]*${escaped}['"][^)]*\\)`);
}

function finding(check: ContractCheck, reason: string, evidence: string[]): DeskPublishContractFinding {
  return {
    checkId: check.id,
    file: check.file,
    reason,
    evidence,
  };
}

function evaluateCheck(rootDir: string, check: ContractCheck): DeskPublishContractFinding[] {
  const text = readFile(rootDir, check.file);
  if (!text) return [finding(check, 'Required publish-contract surface is missing.', [check.file])];

  const findings: DeskPublishContractFinding[] = [];
  for (const required of check.required || []) {
    if (!text.includes(required)) findings.push(finding(check, `Missing required publish-contract marker: ${required}`, [required]));
  }
  for (const forbidden of check.forbidden || []) {
    if (text.includes(forbidden)) findings.push(finding(check, `Forbidden publish-contract ownership marker found: ${forbidden}`, [forbidden]));
  }
  for (const forbiddenImport of check.forbiddenImports || []) {
    if (importPattern(forbiddenImport).test(text)) findings.push(finding(check, `Forbidden decision-owner import found: ${forbiddenImport}`, [forbiddenImport]));
  }
  return findings;
}

function buildMarkdown(report: Omit<DeskPublishContractAuditReport, 'markdown'>): string {
  const lines = [
    '# Phase 3C Desk Publish Contract Audit',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: read-only audit. No Discord posts, Supabase writes, scanner behavior changes, trading logic changes, canExecute changes, or entry/stop/target changes.',
    '',
    'Policy: scanner-owned DeskPublishDecision is the only public Desk Play publish contract. Formatters and schedulers may display it, but must not rerank, reinterpret, or rebuild side/line/entry/stop/T1/T2.',
    '',
    'Checks:',
    ...report.checks.map((check) => `- ${check}`),
  ];
  if (report.findings.length) {
    lines.push('', 'Findings:');
    for (const item of report.findings) lines.push(`- ${item.checkId} (${item.file}): ${item.reason}`);
  } else {
    lines.push('', 'Findings: none.');
  }
  return lines.join('\n');
}

export function buildDeskPublishContractAudit(
  rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'),
  checks = DEFAULT_CHECKS,
): DeskPublishContractAuditReport {
  const filesScanned = checks
    .map((check) => path.join(rootDir, check.file))
    .filter((fullPath) => fs.existsSync(fullPath))
    .map((fullPath) => normalizeRelative(rootDir, fullPath));
  const findings = checks.flatMap((check) => evaluateCheck(rootDir, check));
  const reportWithoutMarkdown = {
    reportType: 'phase_3c_desk_publish_contract_audit' as const,
    generatedAt: new Date().toISOString(),
    authority: authority(),
    rootDir,
    filesScanned,
    checks: checks.map((check) => `${check.id}: ${check.note}`),
    status: findings.length ? 'fail' as const : 'pass' as const,
    findings,
  };

  return {
    ...reportWithoutMarkdown,
    markdown: buildMarkdown(reportWithoutMarkdown),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = buildDeskPublishContractAudit();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(report.markdown);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}
