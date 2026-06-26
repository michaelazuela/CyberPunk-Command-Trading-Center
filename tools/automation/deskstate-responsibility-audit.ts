import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export interface DeskStateResponsibilityFinding {
  checkId: string;
  file: string;
  reason: string;
  evidence: string[];
}

export interface DeskStateResponsibilityAuditReport {
  reportType: 'phase_8_55_deskstate_responsibility_audit';
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
  findings: DeskStateResponsibilityFinding[];
  markdown: string;
}

interface ResponsibilityCheck {
  id: string;
  file: string;
  required?: string[];
  forbiddenImports?: string[];
  note: string;
}

const DEFAULT_CHECKS: ResponsibilityCheck[] = [
  {
    id: 'registry_declares_deskstate_visibility_owner',
    file: 'src/config/responsibilityRegistry.ts',
    required: [
      "key: 'desk_state_visibility_metadata'",
      "authority: 'visibility_authority'",
      "owner: 'src/lib/localScannerEngine.ts'",
      "sharedEntryPoint: 'src/agents/scannerPlanSelectionAgent.ts'",
      'agents, Discord, RAG, and UI may summarize but must not invent, suppress, rerank, or reinterpret active trade candidates',
    ],
    note: 'Responsibility registry names scanner-owned DeskState/visibility metadata as the visibility source of truth.',
  },
  {
    id: 'local_scanner_engine_owns_visibility_state',
    file: 'src/lib/localScannerEngine.ts',
    required: [
      'export interface ScannerVisibilityMetadata',
      'export interface DeskState',
      'export function classifyScannerVisibility',
      'export function buildTradeDecisionMapAudit',
      'export function buildCandidateLifecycleTrace',
      'export function buildDeskState',
      'export function validateDeskStateReplayPath',
    ],
    note: 'Local scanner engine owns the structured visibility state, candidate lifecycle trace, audit map, and replay validation path.',
  },
  {
    id: 'selection_agent_attaches_visibility_metadata',
    file: 'src/agents/scannerPlanSelectionAgent.ts',
    required: [
      'classifyScannerVisibility',
      'visibilityMetadata',
      'sourceOfTruth',
      'scanner_desk_state_visibility_metadata',
    ],
    note: 'Selection agent attaches scanner visibility metadata instead of inventing a competing active trade state.',
  },
  {
    id: 'scanner_persists_deskstate_evidence',
    file: 'tools/automation/nt-scanner.ts',
    required: [
      'visibilityMetadata',
      'candidateLifecycleTrace',
      'tradeDecisionMapAudit',
      'deskState',
      'buildDeskState',
    ],
    note: 'Scanner audit/RAG path carries the same DeskState evidence downstream.',
  },
  {
    id: 'discord_formatter_formats_only',
    file: 'tools/automation/discord-alert-format.ts',
    required: [
      'CompactDeskStateForDiscord',
      'deskState',
      'Decision support only. No automated orders.',
    ],
    forbiddenImports: [
      'src/lib/setupScanner',
      'src/lib/tradeDecisionPipeline',
      'src/lib/conditionalPlanBuilder',
      'src/lib/planEngine',
    ],
    note: 'Discord formatter may format compact DeskState, but must not own setup scanning, trade decision, or conditional-plan building.',
  },
  {
    id: 'discord_scheduler_does_not_own_decisions',
    file: 'tools/automation/discord-scheduler.ts',
    required: [
      'buildAppTradePlan',
      'applyStaleChaseGuard',
      'Decision support only',
    ],
    forbiddenImports: [
      'src/lib/setupScanner',
      'src/lib/tradeDecisionPipeline',
      'src/lib/conditionalPlanBuilder',
    ],
    note: 'Scheduler may build app-owned plans and apply explicit guards, but must not import lower-level scanner/ranking/decision ownership.',
  },
];

function authority(): DeskStateResponsibilityAuditReport['authority'] {
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

function fileText(rootDir: string, relativeFile: string): string | null {
  const fullPath = path.join(rootDir, relativeFile);
  if (!fs.existsSync(fullPath)) return null;
  return fs.readFileSync(fullPath, 'utf8');
}

function importPattern(modulePath: string): RegExp {
  const escaped = modulePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\//g, '[\\\\/]');
  return new RegExp(`from\\s+['"][^'"]*${escaped}['"]|import\\s*\\([^)]*['"][^'"]*${escaped}['"][^)]*\\)`);
}

function buildFinding(check: ResponsibilityCheck, reason: string, evidence: string[]): DeskStateResponsibilityFinding {
  return {
    checkId: check.id,
    file: check.file,
    reason,
    evidence,
  };
}

function evaluateCheck(rootDir: string, check: ResponsibilityCheck): DeskStateResponsibilityFinding[] {
  const text = fileText(rootDir, check.file);
  if (!text) return [buildFinding(check, 'Required responsibility surface is missing.', [check.file])];

  const findings: DeskStateResponsibilityFinding[] = [];
  for (const required of check.required || []) {
    if (!text.includes(required)) {
      findings.push(buildFinding(check, `Missing required responsibility marker: ${required}`, [required]));
    }
  }

  for (const forbidden of check.forbiddenImports || []) {
    if (importPattern(forbidden).test(text)) {
      findings.push(buildFinding(check, `Forbidden ownership import found: ${forbidden}`, [forbidden]));
    }
  }

  return findings;
}

function buildMarkdown(report: Omit<DeskStateResponsibilityAuditReport, 'markdown'>): string {
  const lines = [
    '# Phase 8.55 DeskState Responsibility Audit',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: read-only audit. No Discord posts, Supabase writes, scanner behavior changes, trading logic changes, canExecute changes, or entry/stop/target changes.',
    '',
    'Protected pipeline: NinjaTrader OHLC -> Scanner / Setup Engine -> DeskState / Visibility Policy -> Discord / RAG / UI.',
    '',
    'Checks:',
    ...report.checks.map((check) => `- ${check}`),
  ];

  if (report.findings.length) {
    lines.push('', 'Findings:');
    for (const finding of report.findings) {
      lines.push(`- ${finding.checkId} (${finding.file}): ${finding.reason}`);
    }
  } else {
    lines.push('', 'Findings: none.');
  }

  return lines.join('\n');
}

export function buildDeskStateResponsibilityAudit(
  rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'),
  checks = DEFAULT_CHECKS,
): DeskStateResponsibilityAuditReport {
  const filesScanned = checks
    .map((check) => path.join(rootDir, check.file))
    .filter((fullPath) => fs.existsSync(fullPath))
    .map((fullPath) => normalizeRelative(rootDir, fullPath));
  const findings = checks.flatMap((check) => evaluateCheck(rootDir, check));
  const reportWithoutMarkdown = {
    reportType: 'phase_8_55_deskstate_responsibility_audit' as const,
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
  const json = process.argv.includes('--json');
  const report = buildDeskStateResponsibilityAudit();
  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(report.markdown);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}
