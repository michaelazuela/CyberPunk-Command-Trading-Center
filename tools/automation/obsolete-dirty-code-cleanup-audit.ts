import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type CleanupClassification = 'protected_current_contract' | 'defer_for_review' | 'removal_ready';

export interface CleanupAuditFinding {
  ruleId: string;
  file: string;
  line: number;
  snippet: string;
  classification: CleanupClassification;
  reason: string;
  requiredProof: string;
}

export interface CleanupAuditReport {
  reportType: 'phase_8_45_obsolete_dirty_code_cleanup_audit';
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
  findings: CleanupAuditFinding[];
  summary: {
    protectedCurrentContract: number;
    deferredForReview: number;
    removalReady: number;
  };
  removalPlan: string[];
  deferredCleanupCandidates: string[];
  markdown: string;
}

interface AuditRule {
  id: string;
  pattern: RegExp;
  include: RegExp;
  exclude?: RegExp;
  classification: CleanupClassification;
  reason: string;
  requiredProof: string;
}

const TEXT_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.md']);

const IGNORED_DIR_SEGMENTS = new Set([
  '.git',
  'node_modules',
  'dist',
  'coverage',
  'replay-diagnostics',
  'discord-audit',
  'diagnostic-reports',
  'research-reports',
  'research-outcome-reports',
  'research-validation-reports',
  'weekly-reports',
]);

const RULES: AuditRule[] = [
  {
    id: 'legacy-approved-authority-language',
    pattern: /\bapproved (model|setup)\b/i,
    include: /^(src|tools|docs)[\\/].+\.(ts|tsx|js|jsx|md)$/i,
    exclude: /^(docs[\\/]PROJECT_STATUS\.md|tools[\\/]automation[\\/]obsolete-dirty-code-cleanup-audit\.ts|tools[\\/]automation[\\/]obsolete-dirty-code-cleanup-audit\.test\.ts)$/i,
    classification: 'defer_for_review',
    reason: 'Legacy approved-model/setup wording can blur registry, watch, plan, Discord, and execution authority.',
    requiredProof: 'Phase 8.5 should replace vague wording with registeredModel, activeModel, watchEligible, planEligible, discordEligible, executionEligible, or canExecute without changing gates.',
  },
  {
    id: 'formatter-no-trade-collapse-risk',
    pattern: /NO TRADE|no active executable plan|Stand down\. Recheck/i,
    include: /^tools[\\/]automation[\\/]discord-alert-format\.ts$/i,
    classification: 'defer_for_review',
    reason: 'Discord formatters may legitimately render no-trade, but Phase 8.45 tracks every branch that could flatten a watch or conditional plan into no-trade language.',
    requiredProof: 'Before deleting or changing any branch, prove scanner-owned visibility metadata and DeskState still distinguish watch, conditional, review, hold, no-trade, and data-quality blocker states.',
  },
  {
    id: 'obsolete-desk-play-wording-guarded',
    pattern: /Desk Play - Conditional Planning Levels|conditional app-owned planning levels|Desk Play - Conditional Levels|CONDITIONAL DESK PLAN ONLY/i,
    include: /^(src|tools)[\\/].+\.(ts|tsx|js|jsx)$/i,
    exclude: /(\.test\.ts$|tools[\\/]automation[\\/]obsolete-dirty-code-cleanup-audit\.ts)$/i,
    classification: 'removal_ready',
    reason: 'This wording was superseded by review-level Desk Map language and is already treated as obsolete by the architecture guard.',
    requiredProof: 'If present, remove after confirming chart renderer and scanner tests still pass and review-only authority wording remains intact.',
  },
  {
    id: 'local-rag-persistence-duplication',
    pattern: /discordRagServiceHeaders|supabaseRagHeaders|\/rest\/v1\/trade_embeddings\?user_id=eq\./i,
    include: /^tools[\\/]automation[\\/](nt-scanner|discord-scheduler)\.ts$/i,
    classification: 'removal_ready',
    reason: 'Discord/RAG persistence must use the shared discord-rag-persistence helper rather than local duplicate write code.',
    requiredProof: 'If present, remove only after discord-rag-persistence tests and scanner/Discord persistence tests prove equivalent receipts and RAG records.',
  },
  {
    id: 'automation-gemini-active-path-risk',
    pattern: /src\/lib\/gemini|\/api\/gemini|GEMINI_API_KEY|generativelanguage\.googleapis\.com/i,
    include: /^tools[\\/]automation[\\/](nt-scanner|discord-scheduler|discord-alert-format)\.ts$/i,
    classification: 'removal_ready',
    reason: 'Scanner and Discord automation must stay OHLC/app-owned; Gemini may not become glue for active scanner visibility.',
    requiredProof: 'If present, remove or isolate behind advisory-only health messaging, then run architecture and Gemini prompt safety guards.',
  },
  {
    id: 'hardcoded-active-window-risk',
    pattern: /\b(09:15|12:00|16:00|4:00 PM|18:45|6:45|22:15|10:15)\b/i,
    include: /^(src|tools)[\\/].+\.(ts|tsx|js|jsx)$/i,
    exclude: /^(src[\\/]config[\\/]timeWindows\.ts|src[\\/]config[\\/]timeWindows\.test\.ts|tools[\\/]automation[\\/]obsolete-dirty-code-cleanup-audit\.ts|tools[\\/]automation[\\/]obsolete-dirty-code-cleanup-audit\.test\.ts)$/i,
    classification: 'defer_for_review',
    reason: 'Hardcoded active-window strings can compete with src/config/timeWindows.ts if they drive behavior instead of display, tests, or examples.',
    requiredProof: 'Trace each occurrence before changing it; display/test fixtures may stay, behavior logic should consume canonical timeWindows helpers.',
  },
];

function authority(): CleanupAuditReport['authority'] {
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

function shouldIgnore(filePath: string): boolean {
  const segments = filePath.split(/[\\/]+/);
  return segments.some((segment) => IGNORED_DIR_SEGMENTS.has(segment));
}

function walkFiles(rootDir: string): string[] {
  const files: string[] = [];
  const stack = [rootDir];
  while (stack.length) {
    const dir = stack.pop();
    if (!dir || shouldIgnore(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!shouldIgnore(fullPath)) stack.push(fullPath);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!TEXT_EXTENSIONS.has(path.extname(entry.name))) continue;
      files.push(fullPath);
    }
  }
  return files.sort();
}

function includedBy(rule: AuditRule, relativeFile: string): boolean {
  if (!rule.include.test(relativeFile)) return false;
  if (rule.exclude?.test(relativeFile)) return false;
  return true;
}

function scanFile(rootDir: string, filePath: string): CleanupAuditFinding[] {
  const relativeFile = normalizeRelative(rootDir, filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  const findings: CleanupAuditFinding[] = [];
  const lines = content.split(/\r?\n/);
  for (const rule of RULES) {
    if (!includedBy(rule, relativeFile)) continue;
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (!rule.pattern.test(line)) continue;
      findings.push({
        ruleId: rule.id,
        file: relativeFile,
        line: index + 1,
        snippet: line.trim().slice(0, 220),
        classification: rule.classification,
        reason: rule.reason,
        requiredProof: rule.requiredProof,
      });
    }
  }
  return findings;
}

function renderMarkdown(report: Omit<CleanupAuditReport, 'markdown'>): string {
  const lines = [
    '# Phase 8.45 Obsolete And Dirty Code Cleanup Audit',
    '',
    'Read-only audit. This report does not post Discord, write Supabase, change scanner behavior, approve execution, change trading logic, change `canExecute`, or change entries/stops/targets.',
    '',
    '## Summary',
    `- Files scanned: ${report.filesScanned}`,
    `- Findings: ${report.findings.length}`,
    `- Protected/current-contract findings: ${report.summary.protectedCurrentContract}`,
    `- Deferred cleanup candidates: ${report.summary.deferredForReview}`,
    `- Removal-ready candidates: ${report.summary.removalReady}`,
    '',
    '## Removal Plan',
    ...(
      report.removalPlan.length
        ? report.removalPlan.map((item) => `- ${item}`)
        : ['- No code removal was performed in this phase. Removal requires proof that the path is unused, superseded, duplicated, or unsafe.']
    ),
    '',
    '## Deferred Cleanup Candidates',
    ...(
      report.deferredCleanupCandidates.length
        ? report.deferredCleanupCandidates.map((item) => `- ${item}`)
        : ['- None.']
    ),
    '',
    '## Findings',
  ];

  if (!report.findings.length) {
    lines.push('- No obsolete/dirty-code candidates found by the Phase 8.45 scanner.');
  } else {
    lines.push('| Rule | Classification | File | Line | Evidence |');
    lines.push('| --- | --- | --- | ---: | --- |');
    for (const finding of report.findings) {
      lines.push(`| ${finding.ruleId} | ${finding.classification} | ${finding.file} | ${finding.line} | ${finding.snippet.replace(/\|/g, '\\|')} |`);
    }
  }

  lines.push(
    '',
    '## Authority Boundary',
    '- NinjaTrader OHLC remains source of truth.',
    '- 5M remains execution authority.',
    '- This audit does not loosen `canExecute`.',
    '- Deferred findings are review inventory, not permission to delete or change behavior.',
  );
  return `${lines.join('\n')}\n`;
}

export function buildObsoleteDirtyCodeCleanupAudit(rootDir = process.cwd()): CleanupAuditReport {
  const files = walkFiles(rootDir).filter((filePath) => {
    const relative = normalizeRelative(rootDir, filePath);
    return /^(src|tools|docs|scripts)[\\/]/i.test(relative.replace(/\//g, path.sep));
  });
  const findings = files.flatMap((filePath) => scanFile(rootDir, filePath));
  const summary = {
    protectedCurrentContract: findings.filter((finding) => finding.classification === 'protected_current_contract').length,
    deferredForReview: findings.filter((finding) => finding.classification === 'defer_for_review').length,
    removalReady: findings.filter((finding) => finding.classification === 'removal_ready').length,
  };
  const removalReady = findings.filter((finding) => finding.classification === 'removal_ready');
  const deferred = findings.filter((finding) => finding.classification === 'defer_for_review');
  const reportWithoutMarkdown: Omit<CleanupAuditReport, 'markdown'> = {
    reportType: 'phase_8_45_obsolete_dirty_code_cleanup_audit',
    generatedAt: new Date().toISOString(),
    authority: authority(),
    rootDir,
    filesScanned: files.length,
    findings,
    summary,
    removalPlan: removalReady.length
      ? Array.from(new Set(removalReady.map((finding) => `${finding.file}:${finding.line} ${finding.ruleId} - ${finding.requiredProof}`)))
      : [],
    deferredCleanupCandidates: Array.from(new Set(deferred.map((finding) => `${finding.file}:${finding.line} ${finding.ruleId} - ${finding.requiredProof}`))),
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
  const outDir = path.resolve(argValue('out-dir') || path.join(rootDir, 'tools', 'automation', 'diagnostic-reports'));
  const json = process.argv.includes('--json');
  const write = process.argv.includes('--write');
  const report = buildObsoleteDirtyCodeCleanupAudit(rootDir);
  if (write) {
    fs.mkdirSync(outDir, { recursive: true });
    const base = `phase-8-45-obsolete-dirty-code-cleanup-audit`;
    fs.writeFileSync(path.join(outDir, `${base}.json`), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    fs.writeFileSync(path.join(outDir, `${base}.md`), report.markdown, 'utf8');
  }
  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(report.markdown);
  }
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
