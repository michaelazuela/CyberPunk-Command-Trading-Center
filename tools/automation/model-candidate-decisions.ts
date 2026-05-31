import fs from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildModelCandidateReviewLedger,
  type ModelCandidateConceptSummary,
  type ModelCandidateLedgerOptions,
  type ModelCandidateReviewLedger,
} from './model-candidate-ledger';
import type { ResearchDiscordActionRow, ResearchDiscordMessagePayload } from '../../src/agents/researchDiscordReviewQueueAgent';

type Instrument = 'MES' | 'MNQ' | 'ES' | 'NQ';

export type ModelCandidateDecisionLabel =
  | 'approved_for_formal_backtest'
  | 'needs_more_samples'
  | 'rejected_model_candidate'
  | 'hold_for_human_review';

type ModelCandidateDecisionAlias =
  | 'approve_backtest'
  | 'needs_more_samples'
  | 'reject_candidate'
  | 'hold_review';

export interface ModelCandidateDecisionRecord {
  conceptKey: string;
  conceptTitle: string;
  symbol: Instrument;
  from: string;
  to: string;
  weekKey: string;
  ledgerSummarySnapshot: ModelCandidateConceptSummary;
  deskRecommendation: string;
  humanDecision: ModelCandidateDecisionLabel;
  decisionTimestamp: string;
  decisionSource: 'discord' | 'cli' | 'manual';
  reviewedBy: string | null;
  safety: {
    researchOnly: true;
    activatesModel: false;
    approvesExecution: false;
    changesRules: false;
    createsTrades: false;
    changesScanner: false;
    writesRag: false;
    writesJournal: false;
    message: typeof DECISION_SAFETY_MESSAGE;
    backtestApprovalMessage?: typeof BACKTEST_APPROVAL_MESSAGE;
  };
}

export interface ModelCandidateDecisionArtifact {
  reportType: 'model_candidate_promotion_decisions';
  updatedAt: string;
  safety: {
    researchOnly: true;
    activatesModel: false;
    approvesExecution: false;
    changesRules: false;
    createsTrades: false;
    changesScanner: false;
    writesRag: false;
    writesJournal: false;
    message: typeof DECISION_SAFETY_MESSAGE;
  };
  decisions: ModelCandidateDecisionRecord[];
}

export interface ModelCandidateDecisionCustomId {
  namespace: 'model_candidate_decision';
  weekKey: string;
  conceptKey: string;
  actionAlias: ModelCandidateDecisionAlias;
  decision: ModelCandidateDecisionLabel;
}

export interface ModelCandidateDecisionInteractionInput {
  customId: string;
  ledgerPath?: string;
  decisionDir?: string;
  user: { id: string; username?: string | null };
  reviewedAt?: string;
}

export interface ModelCandidateDecisionInteractionResult {
  ok: boolean;
  status: 'recorded' | 'rejected';
  conceptKey: string | null;
  decision: ModelCandidateDecisionLabel | null;
  decisionJsonPath: string | null;
  decisionMarkdownPath: string | null;
  responseContent: string;
  ephemeral: true;
}

export interface ModelCandidateDecisionsCliOptions {
  from: string;
  to: string;
  symbol: Instrument;
  pretty: boolean;
  json: boolean;
  dryRun: boolean;
  reviewPackDir: string;
  outcomeReportDir: string;
  chartDir: string;
  ledgerOutDir: string;
  decisionDir: string;
  ledgerPath: string | null;
  thresholds: ModelCandidateLedgerOptions['thresholds'];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_LEDGER_DIR = path.join(__dirname, 'model-candidate-ledger');
const DEFAULT_REVIEW_PACK_DIR = path.join(__dirname, 'research-review-packs');
const DEFAULT_OUTCOME_REPORT_DIR = path.join(__dirname, 'research-outcome-reports');
const DEFAULT_CHART_DIR = path.join(__dirname, 'research-review-charts', 'price-action-review-cards');
const DEFAULT_DECISION_DIR = path.join(__dirname, 'model-candidate-decisions');
export const DECISION_SAFETY_MESSAGE = 'Research-only decision recorded. This does not approve execution, change rules, or create trades.' as const;
export const BACKTEST_APPROVAL_MESSAGE = 'Approved for formal backtest/design task only. Human approval is still required before any model implementation or live activation.' as const;

const DECISION_TEXT: Record<ModelCandidateDecisionLabel, string> = {
  approved_for_formal_backtest: 'Approve for Formal Backtest',
  needs_more_samples: 'Needs More Samples',
  rejected_model_candidate: 'Reject Candidate',
  hold_for_human_review: 'Hold for Review',
};

const ALIAS_TO_DECISION: Record<ModelCandidateDecisionAlias, ModelCandidateDecisionLabel> = {
  approve_backtest: 'approved_for_formal_backtest',
  needs_more_samples: 'needs_more_samples',
  reject_candidate: 'rejected_model_candidate',
  hold_review: 'hold_for_human_review',
};

const DECISION_TO_ALIAS: Record<ModelCandidateDecisionLabel, ModelCandidateDecisionAlias> = {
  approved_for_formal_backtest: 'approve_backtest',
  needs_more_samples: 'needs_more_samples',
  rejected_model_candidate: 'reject_candidate',
  hold_for_human_review: 'hold_review',
};

const PROHIBITED_KEYS = new Set([
  'canExecute',
  'executionApproved',
  'entry',
  'stop',
  'stopLoss',
  'target',
  'targets',
  'T1',
  'T2',
  'order',
  'orders',
  'orderPayload',
  'alert',
  'alerts',
  'ragPayload',
  'RAG',
  'journalPayload',
  'journal',
]);

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

function todayLocal(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

function requireDate(value: string | null, flag: string): string {
  if (value === 'today' || value === 'auto') return todayLocal();
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${flag} must use YYYY-MM-DD or today.`);
  return value;
}

function parseInstrument(value: string | null): Instrument {
  const symbol = (value || 'MES').toUpperCase();
  if (symbol !== 'MES' && symbol !== 'MNQ') throw new Error('--symbol must be MES or MNQ.');
  return symbol;
}

function numberFlag(args: string[], flag: string, fallback: number): number {
  const value = readFlag(args, flag);
  if (value === null) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(`${flag} must be a non-negative number.`);
  return parsed;
}

export function parseModelCandidateDecisionsArgs(args = process.argv.slice(2)): ModelCandidateDecisionsCliOptions {
  return {
    from: requireDate(readFlag(args, '--from') || '2026-01-01', '--from'),
    to: requireDate(readFlag(args, '--to') || 'today', '--to'),
    symbol: parseInstrument(readFlag(args, '--symbol') || readFlag(args, '--instrument')),
    pretty: hasFlag(args, '--pretty') || !hasFlag(args, '--json'),
    json: hasFlag(args, '--json'),
    dryRun: hasFlag(args, '--dry-run'),
    reviewPackDir: readFlag(args, '--review-pack-dir') || DEFAULT_REVIEW_PACK_DIR,
    outcomeReportDir: readFlag(args, '--outcome-report-dir') || DEFAULT_OUTCOME_REPORT_DIR,
    chartDir: readFlag(args, '--chart-dir') || DEFAULT_CHART_DIR,
    ledgerOutDir: readFlag(args, '--ledger-out') || DEFAULT_LEDGER_DIR,
    decisionDir: readFlag(args, '--decision-dir') || DEFAULT_DECISION_DIR,
    ledgerPath: readFlag(args, '--ledger-path'),
    thresholds: {
      minimumReviewedSamples: numberFlag(args, '--minimum-reviewed-samples', 10),
      minimumApprovalRate: numberFlag(args, '--minimum-approval-rate', 0.7),
    },
  };
}

function emptyArtifact(): ModelCandidateDecisionArtifact {
  return {
    reportType: 'model_candidate_promotion_decisions',
    updatedAt: new Date().toISOString(),
    safety: {
      researchOnly: true,
      activatesModel: false,
      approvesExecution: false,
      changesRules: false,
      createsTrades: false,
      changesScanner: false,
      writesRag: false,
      writesJournal: false,
      message: DECISION_SAFETY_MESSAGE,
    },
    decisions: [],
  };
}

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await fs.readFile(file, 'utf8')) as T;
}

async function readArtifact(file: string): Promise<ModelCandidateDecisionArtifact> {
  try {
    const parsed = await readJson<ModelCandidateDecisionArtifact>(file);
    if (parsed.reportType === 'model_candidate_promotion_decisions' && Array.isArray(parsed.decisions)) {
      return { ...emptyArtifact(), ...parsed, decisions: parsed.decisions };
    }
  } catch {
    // First run has no decision artifact yet.
  }
  return emptyArtifact();
}

function decisionJsonPath(decisionDir: string): string {
  return path.join(decisionDir, 'model-candidate-decisions.json');
}

function decisionMarkdownPath(decisionDir: string): string {
  return path.join(decisionDir, 'model-candidate-decisions.md');
}

export function modelCandidateWeekKey(symbol: string, from: string, to: string): string {
  return `${symbol}_${from}_${to}`.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 36);
}

function compactConceptKey(conceptKey: string): string {
  return conceptKey.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 42);
}

function displayDecision(decision: ModelCandidateDecisionLabel): string {
  return DECISION_TEXT[decision];
}

export function buildModelCandidateDecisionCustomId(args: {
  symbol: string;
  from: string;
  to: string;
  conceptKey: string;
  decision: ModelCandidateDecisionLabel;
}): string {
  const customId = `model_candidate_decision|${modelCandidateWeekKey(args.symbol, args.from, args.to)}|${compactConceptKey(args.conceptKey)}|${DECISION_TO_ALIAS[args.decision]}`;
  if (customId.length > 100) throw new Error(`Model candidate decision custom_id is too long for Discord: ${customId.length}`);
  return customId;
}

export function parseModelCandidateDecisionCustomId(customId: string): ModelCandidateDecisionCustomId {
  const parts = customId.split('|');
  if (parts.length !== 4 || parts[0] !== 'model_candidate_decision') {
    throw new Error('Unsupported model candidate decision custom_id namespace.');
  }
  const [, weekKey, conceptKey, actionAlias] = parts;
  if (!weekKey || !conceptKey) throw new Error('Model candidate decision custom_id is missing weekKey or conceptKey.');
  if (!(actionAlias in ALIAS_TO_DECISION)) throw new Error(`Unsupported model candidate decision action: ${actionAlias}`);
  return {
    namespace: 'model_candidate_decision',
    weekKey,
    conceptKey,
    actionAlias: actionAlias as ModelCandidateDecisionAlias,
    decision: ALIAS_TO_DECISION[actionAlias as ModelCandidateDecisionAlias],
  };
}

export function buildModelCandidateDecisionComponents(ledger: ModelCandidateReviewLedger, summary: ModelCandidateConceptSummary): ResearchDiscordActionRow[] {
  return [{
    type: 1,
    components: ([
      'approved_for_formal_backtest',
      'needs_more_samples',
      'rejected_model_candidate',
      'hold_for_human_review',
    ] as ModelCandidateDecisionLabel[]).map((decision) => ({
      type: 2,
      style: decision === 'approved_for_formal_backtest' ? 3 : decision === 'rejected_model_candidate' ? 4 : 2,
      label: displayDecision(decision),
      custom_id: buildModelCandidateDecisionCustomId({
        symbol: ledger.symbol,
        from: ledger.from,
        to: ledger.to,
        conceptKey: summary.concept,
        decision,
      }),
    })),
  }];
}

export function buildModelCandidateDecisionPostPayload(ledger: ModelCandidateReviewLedger, summary: ModelCandidateConceptSummary): ResearchDiscordMessagePayload {
  const approvalRate = summary.approvalRate === null ? 'n/a' : `${Math.round(summary.approvalRate * 100)}%`;
  const researchRecommendation = (summary as { modelCandidateResearchRecommendation?: ModelCandidateConceptSummary['modelCandidateResearchRecommendation'] }).modelCandidateResearchRecommendation;
  return {
    content: [
      `[MODEL CANDIDATE DECISION] ${summary.conceptTitle}`,
      `Symbol: ${ledger.symbol}`,
      `Date range: ${ledger.from} to ${ledger.to}`,
      `Reviewed samples: ${summary.totalSamplesReviewed}`,
      `Human approved / not approved: ${summary.humanApprovedCount} / ${summary.humanNotApprovedCount}`,
      `Approval rate: ${approvalRate}`,
      `Desk recommendation: ${summary.deskRecommendation}`,
      ...(researchRecommendation ? [
        `Research recommendation: ${researchRecommendation.status}`,
        `Recommendation: ${researchRecommendation.recommendationText}`,
        `Human final decision required: ${researchRecommendation.humanFinalDecisionRequired ? 'yes' : 'no'}`,
      ] : []),
      'Human decision required: choose whether this concept moves to a formal backtest/design task, needs more samples, should be rejected, or should be held for review.',
      DECISION_SAFETY_MESSAGE,
      'No model activation is performed by these buttons.',
    ].join('\n'),
    components: buildModelCandidateDecisionComponents(ledger, summary),
    allowed_mentions: { parse: [] },
  };
}

function researchRecommendationStatus(summary: ModelCandidateConceptSummary): ModelCandidateConceptSummary['modelCandidateResearchRecommendation']['status'] {
  const recommendation = (summary as { modelCandidateResearchRecommendation?: ModelCandidateConceptSummary['modelCandidateResearchRecommendation'] }).modelCandidateResearchRecommendation;
  if (recommendation) return recommendation.status;
  if (summary.candidateReadinessStatus === 'candidate_review_recommended') return 'candidate_review_recommended';
  if (summary.candidateReadinessStatus === 'reject_or_deprioritize') return 'reject_or_deprioritize';
  if (summary.candidateReadinessStatus === 'insufficient_evidence') return 'keep_collecting_evidence';
  return 'watchlist_candidate';
}

function prohibitedPaths(value: unknown, pathName = 'value'): string[] {
  if (!value || typeof value !== 'object') return [];
  const paths: string[] = [];
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const next = `${pathName}.${key}`;
    if (PROHIBITED_KEYS.has(key)) paths.push(next);
    paths.push(...prohibitedPaths(child, next));
  }
  return paths;
}

export function assertNoExecutableDecisionFields(value: unknown): void {
  const paths = prohibitedPaths(value);
  if (paths.length) throw new Error(`Model candidate decision artifact contains prohibited executable field(s): ${paths.join(', ')}`);
}

function findConcept(ledger: ModelCandidateReviewLedger, parsed: ModelCandidateDecisionCustomId): ModelCandidateConceptSummary | null {
  const expectedWeek = modelCandidateWeekKey(ledger.symbol, ledger.from, ledger.to);
  if (parsed.weekKey !== expectedWeek) return null;
  return ledger.conceptSummaries.find((summary) => compactConceptKey(summary.concept) === parsed.conceptKey) || null;
}

function reviewerName(user: { id: string; username?: string | null }): string {
  return user.username?.trim() || user.id;
}

export async function recordModelCandidateDecision(args: {
  ledger: ModelCandidateReviewLedger;
  summary: ModelCandidateConceptSummary;
  decision: ModelCandidateDecisionLabel;
  decisionDir: string;
  decisionSource: 'discord' | 'cli' | 'manual';
  reviewedBy: string | null;
  decisionTimestamp?: string;
}): Promise<{ artifact: ModelCandidateDecisionArtifact; jsonPath: string; markdownPath: string; record: ModelCandidateDecisionRecord }> {
  const jsonPath = decisionJsonPath(args.decisionDir);
  const markdownPath = decisionMarkdownPath(args.decisionDir);
  const artifact = await readArtifact(jsonPath);
  const record: ModelCandidateDecisionRecord = {
    conceptKey: args.summary.concept,
    conceptTitle: args.summary.conceptTitle,
    symbol: args.ledger.symbol,
    from: args.ledger.from,
    to: args.ledger.to,
    weekKey: modelCandidateWeekKey(args.ledger.symbol, args.ledger.from, args.ledger.to),
    ledgerSummarySnapshot: args.summary,
    deskRecommendation: args.summary.deskRecommendation,
    humanDecision: args.decision,
    decisionTimestamp: args.decisionTimestamp || new Date().toISOString(),
    decisionSource: args.decisionSource,
    reviewedBy: args.reviewedBy,
    safety: {
      researchOnly: true,
      activatesModel: false,
      approvesExecution: false,
      changesRules: false,
      createsTrades: false,
      changesScanner: false,
      writesRag: false,
      writesJournal: false,
      message: DECISION_SAFETY_MESSAGE,
      ...(args.decision === 'approved_for_formal_backtest' ? { backtestApprovalMessage: BACKTEST_APPROVAL_MESSAGE } : {}),
    },
  };
  const key = `${record.symbol}|${record.from}|${record.to}|${record.conceptKey}`;
  artifact.decisions = [
    ...artifact.decisions.filter((item) => `${item.symbol}|${item.from}|${item.to}|${item.conceptKey}` !== key),
    record,
  ].sort((left, right) => `${left.symbol}|${left.from}|${left.to}|${left.conceptKey}`.localeCompare(`${right.symbol}|${right.from}|${right.to}|${right.conceptKey}`));
  artifact.updatedAt = record.decisionTimestamp;
  assertNoExecutableDecisionFields(artifact);
  mkdirSync(args.decisionDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
  await fs.writeFile(markdownPath, `${renderModelCandidateDecisionMarkdown(artifact)}\n`, 'utf8');
  return { artifact, jsonPath, markdownPath, record };
}

export async function handleModelCandidateDecisionInteraction(input: ModelCandidateDecisionInteractionInput): Promise<ModelCandidateDecisionInteractionResult> {
  let parsed: ModelCandidateDecisionCustomId;
  try {
    parsed = parseModelCandidateDecisionCustomId(input.customId);
  } catch (error) {
    return rejected(error instanceof Error ? error.message : String(error));
  }
  const ledgerPath = path.resolve(input.ledgerPath || path.join(DEFAULT_LEDGER_DIR, 'model-candidate-review-ledger.json'));
  const decisionDir = path.resolve(input.decisionDir || DEFAULT_DECISION_DIR);
  let ledger: ModelCandidateReviewLedger;
  try {
    ledger = await readJson<ModelCandidateReviewLedger>(ledgerPath);
  } catch {
    return rejected(`Ledger snapshot not found for model-candidate decision: ${ledgerPath}.`);
  }
  const summary = findConcept(ledger, parsed);
  if (!summary) return rejected(`Model-candidate concept not found or stale for ${parsed.conceptKey}. No decision was recorded.`);
  const result = await recordModelCandidateDecision({
    ledger,
    summary,
    decision: parsed.decision,
    decisionDir,
    decisionSource: 'discord',
    reviewedBy: reviewerName(input.user),
    decisionTimestamp: input.reviewedAt,
  });
  const response = [
    `Model candidate decision recorded: ${summary.conceptTitle}`,
    `Human decision: ${displayDecision(parsed.decision)}`,
    `Decision artifact: ${result.jsonPath}`,
    DECISION_SAFETY_MESSAGE,
    ...(parsed.decision === 'approved_for_formal_backtest' ? [BACKTEST_APPROVAL_MESSAGE] : []),
  ].join('\n');
  return {
    ok: true,
    status: 'recorded',
    conceptKey: summary.concept,
    decision: parsed.decision,
    decisionJsonPath: result.jsonPath,
    decisionMarkdownPath: result.markdownPath,
    responseContent: response,
    ephemeral: true,
  };
}

function rejected(reason: string): ModelCandidateDecisionInteractionResult {
  return {
    ok: false,
    status: 'rejected',
    conceptKey: null,
    decision: null,
    decisionJsonPath: null,
    decisionMarkdownPath: null,
    responseContent: [
      `Model candidate decision rejected: ${reason}`,
      DECISION_SAFETY_MESSAGE,
    ].join('\n'),
    ephemeral: true,
  };
}

export function renderModelCandidateDecisionMarkdown(artifact: ModelCandidateDecisionArtifact): string {
  const lines = [
    '# Model Candidate Promotion Decisions',
    '',
    DECISION_SAFETY_MESSAGE,
    'No model activation is performed by this artifact.',
    '',
    `Updated: ${artifact.updatedAt}`,
    '',
    '## Decisions',
    ...(artifact.decisions.length
      ? artifact.decisions.map((decision) => [
        `### ${decision.conceptTitle}`,
        `- Concept key: ${decision.conceptKey}`,
        `- Symbol: ${decision.symbol}`,
        `- Date range: ${decision.from} to ${decision.to}`,
        `- Week key: ${decision.weekKey}`,
        `- Human decision: ${decision.humanDecision}`,
        `- Reviewed by: ${decision.reviewedBy || 'unknown'}`,
        `- Decision timestamp: ${decision.decisionTimestamp}`,
        `- Desk recommendation: ${decision.deskRecommendation}`,
        `- Safety: ${DECISION_SAFETY_MESSAGE}`,
        ...(decision.humanDecision === 'approved_for_formal_backtest' ? [`- ${BACKTEST_APPROVAL_MESSAGE}`] : []),
      ].join('\n'))
      : ['No concept-level model-candidate decisions have been recorded yet.']),
  ];
  return lines.join('\n\n');
}

export async function buildModelCandidateDecisionSummary(options: ModelCandidateDecisionsCliOptions): Promise<{
  ledger: ModelCandidateReviewLedger;
  artifact: ModelCandidateDecisionArtifact;
  jsonPath: string;
  markdownPath: string;
  pendingConcepts: ModelCandidateConceptSummary[];
}> {
  const ledger = options.ledgerPath
    ? await readJson<ModelCandidateReviewLedger>(path.resolve(options.ledgerPath))
    : await buildModelCandidateReviewLedger({
      from: options.from,
      to: options.to,
      symbol: options.symbol,
      reviewPackDir: options.reviewPackDir,
      outcomeReportDir: options.outcomeReportDir,
      chartDir: options.chartDir,
      outDir: options.ledgerOutDir,
      pretty: options.pretty,
      json: options.json,
      thresholds: options.thresholds,
    });
  const jsonPath = decisionJsonPath(path.resolve(options.decisionDir));
  const markdownPath = decisionMarkdownPath(path.resolve(options.decisionDir));
  const artifact = await readArtifact(jsonPath);
  if (!options.dryRun) {
    mkdirSync(path.resolve(options.decisionDir), { recursive: true });
    await fs.writeFile(jsonPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
    await fs.writeFile(markdownPath, `${renderModelCandidateDecisionMarkdown(artifact)}\n`, 'utf8');
  }
  const decided = new Set(artifact.decisions.map((decision) => `${decision.symbol}|${decision.from}|${decision.to}|${decision.conceptKey}`));
  const pendingConcepts = ledger.conceptSummaries.filter((summary) =>
    researchRecommendationStatus(summary) === 'candidate_review_recommended' &&
    !decided.has(`${ledger.symbol}|${ledger.from}|${ledger.to}|${summary.concept}`)
  );
  return { ledger, artifact, jsonPath, markdownPath, pendingConcepts };
}

function renderPrettySummary(result: Awaited<ReturnType<typeof buildModelCandidateDecisionSummary>>): string {
  return [
    '[MODEL CANDIDATE DECISIONS]',
    `Date range: ${result.ledger.from} to ${result.ledger.to}`,
    `Symbol: ${result.ledger.symbol}`,
    `Decision JSON: ${result.jsonPath}`,
    `Decision Markdown: ${result.markdownPath}`,
    `Recorded decisions: ${result.artifact.decisions.length}`,
    `Pending concepts: ${result.pendingConcepts.length}`,
    '',
    'Recorded:',
    ...(result.artifact.decisions.length
      ? result.artifact.decisions.map((decision) => `- ${decision.conceptTitle}: ${decision.humanDecision}`)
      : ['- none']),
    '',
    'Pending:',
    ...(result.pendingConcepts.length
      ? result.pendingConcepts.map((summary) => `- ${summary.conceptTitle}: ${researchRecommendationStatus(summary)}; ${summary.modelCandidateResearchRecommendation?.recommendationText || summary.deskRecommendation}`)
      : ['- none']),
    '',
    DECISION_SAFETY_MESSAGE,
    'No model is activated by this command.',
  ].join('\n');
}

export async function runModelCandidateDecisionsCli(rawArgs = process.argv.slice(2)): Promise<void> {
  const options = parseModelCandidateDecisionsArgs(rawArgs);
  const result = await buildModelCandidateDecisionSummary(options);
  if (options.json) console.log(JSON.stringify(result, null, 2));
  if (options.pretty) console.log(renderPrettySummary(result));
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/tools/automation/model-candidate-decisions.ts')) {
  runModelCandidateDecisionsCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
