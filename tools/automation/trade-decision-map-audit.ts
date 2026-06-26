import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SETUP_REGISTRY } from '../../src/config/setupRegistry';
import { buildTradeDecisionMapAudit } from '../../src/lib/localScannerEngine';

export interface TradeDecisionMapAuditFinding {
  checkId: string;
  reason: string;
  evidence: string[];
}

export interface Phase9ATradeDecisionMapAuditReport {
  reportType: 'phase_9a_trade_decision_map_audit';
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
  status: 'pass' | 'fail';
  summary: {
    registryEntries: number;
    auditedEntries: number;
    primaryModels: number;
    supportingEvidence: number;
    deprecatedModels: number;
    humanReviewOnly: number;
    executionEligible: number;
  };
  checks: string[];
  findings: TradeDecisionMapAuditFinding[];
  markdown: string;
}

const REQUIRED_ENTRY_FIELDS = [
  'setupType',
  'modelName',
  'sessionWindows',
  'requiredEvidence',
  'rankWeight',
  'watchEligible',
  'planEligible',
  'discordEligible',
  'executionEligible',
  'canExecuteRelationship',
  'knownSuppressionPaths',
] as const;

function authority(): Phase9ATradeDecisionMapAuditReport['authority'] {
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

function finding(checkId: string, reason: string, evidence: string[]): TradeDecisionMapAuditFinding {
  return { checkId, reason, evidence };
}

function normalizeRelative(rootDir: string, filePath: string): string {
  return path.relative(rootDir, filePath).replace(/\\/g, '/');
}

function sourceFiles(rootDir: string): string[] {
  return [
    'src/config/setupRegistry.ts',
    'src/lib/localScannerEngine.ts',
  ]
    .map((relative) => path.join(rootDir, relative))
    .filter((fullPath) => fs.existsSync(fullPath))
    .map((fullPath) => normalizeRelative(rootDir, fullPath));
}

function buildFindings(): TradeDecisionMapAuditFinding[] {
  const audit = buildTradeDecisionMapAudit();
  const findings: TradeDecisionMapAuditFinding[] = [];
  if (audit.sourceOfTruth !== 'setup_registry_trade_decision_map_audit') {
    findings.push(finding('source_of_truth', 'Trade decision map audit sourceOfTruth changed.', [String(audit.sourceOfTruth)]));
  }
  if (audit.generatedFrom !== 'SETUP_REGISTRY') {
    findings.push(finding('source_of_truth', 'Trade decision map audit is not generated from SETUP_REGISTRY.', [String(audit.generatedFrom)]));
  }
  if (audit.tradingLogicChanged !== false) {
    findings.push(finding('authority_boundary', 'Trade decision map audit claims trading logic changed.', [String(audit.tradingLogicChanged)]));
  }
  if (audit.entries.length !== SETUP_REGISTRY.length) {
    findings.push(finding('registry_coverage', 'Audit entry count does not match SETUP_REGISTRY.', [
      `audit=${audit.entries.length}`,
      `registry=${SETUP_REGISTRY.length}`,
    ]));
  }

  const auditedTypes = new Set(audit.entries.map((entry) => entry.setupType));
  for (const registryEntry of SETUP_REGISTRY) {
    if (!auditedTypes.has(registryEntry.setupType)) {
      findings.push(finding('registry_coverage', 'Registry setup type is missing from trade decision map audit.', [registryEntry.setupType]));
    }
  }

  for (const entry of audit.entries) {
    for (const field of REQUIRED_ENTRY_FIELDS) {
      if (!(field in entry)) {
        findings.push(finding('required_fields', `Audit entry is missing ${field}.`, [entry.setupType]));
      }
    }
    if (!entry.modelName) findings.push(finding('required_fields', 'Audit entry model name is empty.', [entry.setupType]));
    if (!entry.sessionWindows.length) findings.push(finding('required_fields', 'Audit entry has no session windows.', [entry.setupType]));
    if (!entry.requiredEvidence.length) findings.push(finding('required_fields', 'Audit entry has no required evidence.', [entry.setupType]));
    if (!Number.isFinite(entry.rankWeight)) findings.push(finding('required_fields', 'Audit entry rank weight is not finite.', [entry.setupType]));
    if (!entry.canExecuteRelationship.includes('canExecute')) {
      findings.push(finding('can_execute_boundary', 'Audit entry does not describe canExecute relationship.', [entry.setupType]));
    }
    if (!entry.knownSuppressionPaths.length) {
      findings.push(finding('suppression_paths', 'Audit entry has no known suppression paths.', [entry.setupType]));
    }
    if (entry.role === 'deprecated' && (entry.discordEligible || entry.executionEligible || entry.planEligible)) {
      findings.push(finding('role_boundary', 'Deprecated setup is incorrectly eligible for plan/Discord/execution.', [entry.setupType]));
    }
    if (entry.role === 'supporting_evidence' && (entry.planEligible || entry.discordEligible || entry.executionEligible)) {
      findings.push(finding('role_boundary', 'Supporting evidence entry is incorrectly eligible for plan/Discord/execution.', [entry.setupType]));
    }
    if (entry.humanReviewOnly && entry.executionEligible) {
      findings.push(finding('execution_boundary', 'Human-review-only setup is execution eligible.', [entry.setupType]));
    }
  }

  if (!audit.entries.some((entry) => entry.role === 'primary_model')) {
    findings.push(finding('role_coverage', 'No primary models found in audit.', []));
  }
  if (!audit.entries.some((entry) => entry.role === 'supporting_evidence')) {
    findings.push(finding('role_coverage', 'No supporting evidence entries found in audit.', []));
  }
  if (!audit.entries.some((entry) => entry.role === 'deprecated')) {
    findings.push(finding('role_coverage', 'No deprecated entries found in audit.', []));
  }

  return findings;
}

function buildSummary(): Phase9ATradeDecisionMapAuditReport['summary'] {
  const entries = buildTradeDecisionMapAudit().entries;
  return {
    registryEntries: SETUP_REGISTRY.length,
    auditedEntries: entries.length,
    primaryModels: entries.filter((entry) => entry.role === 'primary_model').length,
    supportingEvidence: entries.filter((entry) => entry.role === 'supporting_evidence').length,
    deprecatedModels: entries.filter((entry) => entry.role === 'deprecated').length,
    humanReviewOnly: entries.filter((entry) => entry.humanReviewOnly).length,
    executionEligible: entries.filter((entry) => entry.executionEligible).length,
  };
}

function buildMarkdown(report: Omit<Phase9ATradeDecisionMapAuditReport, 'markdown'>): string {
  const lines = [
    '# Phase 9A Trade Decision Map Audit',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: read-only audit. It does not post Discord, write Supabase, change scanner behavior, change trading logic, change canExecute, or change entry/stop/target math.',
    '',
    `Coverage: ${report.summary.auditedEntries}/${report.summary.registryEntries} setup registry entries.`,
    `Primary models: ${report.summary.primaryModels}; supporting evidence: ${report.summary.supportingEvidence}; deprecated: ${report.summary.deprecatedModels}; human-review-only: ${report.summary.humanReviewOnly}; execution-eligible metadata: ${report.summary.executionEligible}.`,
    '',
    'Checks:',
    ...report.checks.map((check) => `- ${check}`),
  ];
  if (report.findings.length) {
    lines.push('', 'Findings:');
    for (const item of report.findings) lines.push(`- ${item.checkId}: ${item.reason}`);
  } else {
    lines.push('', 'Findings: none.');
  }
  return lines.join('\n');
}

export function buildPhase9ATradeDecisionMapAudit(
  rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'),
): Phase9ATradeDecisionMapAuditReport {
  const findings = buildFindings();
  const reportWithoutMarkdown = {
    reportType: 'phase_9a_trade_decision_map_audit' as const,
    generatedAt: new Date().toISOString(),
    authority: authority(),
    rootDir,
    filesScanned: sourceFiles(rootDir),
    status: findings.length ? 'fail' as const : 'pass' as const,
    summary: buildSummary(),
    checks: [
      'Every SETUP_REGISTRY entry appears in buildTradeDecisionMapAudit output.',
      'Every audit entry includes model name, session windows, required evidence, rank weight, eligibility flags, canExecute relationship, and known suppression paths.',
      'Deprecated setups are not plan/Discord/execution eligible.',
      'Supporting evidence can be watch/context only and cannot become plan/Discord/execution eligible.',
      'Human-review-only models remain executionEligible=false.',
      'The audit remains metadata only and reports tradingLogicChanged=false.',
    ],
    findings,
  };
  return {
    ...reportWithoutMarkdown,
    markdown: buildMarkdown(reportWithoutMarkdown),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = buildPhase9ATradeDecisionMapAudit();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(report.markdown);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}
