import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NoChaseRebuiltReviewApprovalContractReport } from './no-chase-rebuilt-review-approval-contract';
import type { NoChaseRebuiltReviewLiveProposalReport } from './no-chase-rebuilt-review-live-proposal';

interface CliOptions {
  proposal: string;
  approvalContract: string;
  outDir: string;
  json: boolean;
}

export interface NoChaseRebuiltReviewDisabledPreviewCard {
  previewId: string;
  tradeDate: string;
  sessionType: string;
  setupType: string;
  direction: string;
  state: 'DISABLED_LOCAL_REVIEW_PREVIEW';
  scannerVisible: false;
  previewOnly: true;
  reviewOnly: true;
  humanReviewOnly: true;
  canExecute: false;
  publishDiscord: false;
  shouldPost: false;
  shouldDispatch: false;
  writesSupabase: false;
  readsLiveSupabase: false;
  readsLiveBridge: false;
  noAutomatedOrders: true;
  levels: {
    entry: number;
    stop: number;
    target1: number;
    target2: number;
  };
  proof: {
    proofBarTime: string | null;
    htfReliability: string;
    htfContextUse: 'support_caution_only';
  };
  replay: {
    outcome: string;
    outcomeTime: string | null;
    oneMesGross: number;
  };
  deskText: {
    what: string;
    where: string;
    when: string;
    why: string;
    invalidation: string;
  };
  warnings: string[];
}

export interface NoChaseRebuiltReviewDisabledLocalAdapterPreviewReport {
  reportType: 'no_chase_rebuilt_review_disabled_local_adapter_preview';
  generatedAt: string;
  status: 'pass' | 'fail';
  authority: {
    readOnly: true;
    localOnly: true;
    researchOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    runsSetupScanner: false;
    changesScannerBehavior: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
    changesRiskRules: false;
    changesBridgeBehavior: false;
    changesDiscordPosting: false;
    changesAppRuntime: false;
  };
  source: {
    proposalPath: string;
    approvalContractPath: string;
  };
  installState: {
    adapterPreviewCreated: boolean;
    scannerRuntimeWired: false;
    scannerVisibleNow: false;
    discordPostingEnabled: false;
    supabasePersistenceEnabled: false;
    canExecuteChanged: false;
  };
  summary: {
    proposalTickets: number;
    previewCards: number;
    disabledPreviewCards: number;
    humanReviewOnlyCards: number;
    completePlanCards: number;
    htfSufficientCards: number;
    canExecuteFalseCards: number;
    publishDiscordFalseCards: number;
    scannerVisibleRows: 0;
    livePromotionAllowedRows: 0;
    replayGrossOneMes: number;
    failedGateCount: number;
    recommendation: 'keep_disabled_local_preview' | 'fix_inputs';
  };
  previewCards: NoChaseRebuiltReviewDisabledPreviewCard[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_OUT_DIR = path.join(__dirname, 'diagnostic-reports');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

export function parseNoChaseRebuiltReviewDisabledLocalAdapterPreviewArgs(args = process.argv.slice(2)): CliOptions {
  const proposal = readFlag(args, '--proposal');
  const approvalContract = readFlag(args, '--approval-contract');
  if (!proposal) throw new Error('--proposal is required.');
  if (!approvalContract) throw new Error('--approval-contract is required.');
  return {
    proposal,
    approvalContract,
    outDir: readFlag(args, '--out-dir') || DEFAULT_OUT_DIR,
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function authority(): NoChaseRebuiltReviewDisabledLocalAdapterPreviewReport['authority'] {
  return {
    readOnly: true,
    localOnly: true,
    researchOnly: true,
    postsDiscord: false,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: false,
    runsSetupScanner: false,
    changesScannerBehavior: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    changesEntryStopTargets: false,
    changesRiskRules: false,
    changesBridgeBehavior: false,
    changesDiscordPosting: false,
    changesAppRuntime: false,
  };
}

function price(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : 'not set';
}

function escapeTable(value: string): string {
  return value.replace(/\|/g, '/').replace(/\r?\n/g, ' ');
}

function completePlan(card: NoChaseRebuiltReviewDisabledPreviewCard): boolean {
  const levels = card.levels;
  return [levels.entry, levels.stop, levels.target1, levels.target2].every((value) => Number.isFinite(value)) &&
    (card.direction === 'LONG'
      ? levels.stop < levels.entry && levels.entry < levels.target1 && levels.target1 <= levels.target2
      : levels.stop > levels.entry && levels.entry > levels.target1 && levels.target1 >= levels.target2);
}

function previewCardForTicket(
  ticket: NoChaseRebuiltReviewLiveProposalReport['tickets'][number],
): NoChaseRebuiltReviewDisabledPreviewCard {
  const side = ticket.direction.toUpperCase();
  const proofTime = ticket.proofBarTime || 'completed 5M proof time unavailable';
  return {
    previewId: `no-chase-disabled-preview|${ticket.tradeDate}|${ticket.sessionType}|${ticket.setupType}|${side}|${proofTime}`,
    tradeDate: ticket.tradeDate,
    sessionType: ticket.sessionType,
    setupType: ticket.setupType,
    direction: side,
    state: 'DISABLED_LOCAL_REVIEW_PREVIEW',
    scannerVisible: false,
    previewOnly: true,
    reviewOnly: true,
    humanReviewOnly: true,
    canExecute: false,
    publishDiscord: false,
    shouldPost: false,
    shouldDispatch: false,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: false,
    noAutomatedOrders: true,
    levels: {
      entry: ticket.entry,
      stop: ticket.stop,
      target1: ticket.target1,
      target2: ticket.target2,
    },
    proof: {
      proofBarTime: ticket.proofBarTime,
      htfReliability: ticket.htfReliability,
      htfContextUse: 'support_caution_only',
    },
    replay: {
      outcome: ticket.replayOutcome,
      outcomeTime: ticket.replayOutcomeTime,
      oneMesGross: ticket.replayOneMesGross,
    },
    deskText: {
      what: `${ticket.setupType} ${side} rebuilt from a prior no-chase state for local review only.`,
      where: `Entry ${price(ticket.entry)}, protected stop ${price(ticket.stop)}, T1 ${price(ticket.target1)}, T2 ${price(ticket.target2)}.`,
      when: `Use only after the completed 5M proof bar at ${proofTime}; this preview does not approve live execution.`,
      why: `The saved proposal shows completed 5M proof, complete deterministic plan fields, and structured HTF context available for review.`,
      invalidation: `The protected stop at ${price(ticket.stop)} remains the invalidation reference; do not treat HTF context as execution authority.`,
    },
    warnings: [
      'Disabled local preview only.',
      'canExecute remains false.',
      'Discord publish remains false.',
      'Supabase writes remain disabled.',
      'Scanner visibility remains disabled.',
      'HTF context is support/caution only; 5M remains execution authority.',
    ],
  };
}

function buildMarkdown(report: Omit<NoChaseRebuiltReviewDisabledLocalAdapterPreviewReport, 'markdown'>): string {
  return [
    '# No-Chase Rebuilt Review Disabled Local Adapter Preview',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local saved-report preview only. It does not wire scanner runtime, post Discord, write Supabase, read live Supabase, read live bridge data, run setupScanner, change canExecute, change entry/stop/target/risk math, or change trading logic.',
    '',
    '## Summary',
    `- Proposal tickets: ${report.summary.proposalTickets}.`,
    `- Preview cards: ${report.summary.previewCards}.`,
    `- Disabled preview cards: ${report.summary.disabledPreviewCards}.`,
    `- Human-review-only cards: ${report.summary.humanReviewOnlyCards}.`,
    `- Complete-plan cards: ${report.summary.completePlanCards}.`,
    `- HTF sufficient cards: ${report.summary.htfSufficientCards}.`,
    `- canExecute=false cards: ${report.summary.canExecuteFalseCards}.`,
    `- publishDiscord=false cards: ${report.summary.publishDiscordFalseCards}.`,
    `- Scanner-visible rows: ${report.summary.scannerVisibleRows}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- Replay gross one-MES P/L: $${report.summary.replayGrossOneMes.toFixed(2)}.`,
    `- Failed gate count: ${report.summary.failedGateCount}.`,
    '',
    '## Preview Cards',
    '| Date | Session | Setup | Side | Entry | Stop | T1 | T2 | Proof Time | Outcome | P/L | State |',
    '|---|---|---|---|---:|---:|---:|---:|---|---|---:|---|',
    ...report.previewCards.map((card) => `| ${card.tradeDate} | ${card.sessionType} | ${escapeTable(card.setupType)} | ${card.direction} | ${card.levels.entry} | ${card.levels.stop} | ${card.levels.target1} | ${card.levels.target2} | ${card.proof.proofBarTime || '-'} | ${escapeTable(card.replay.outcome)}${card.replay.outcomeTime ? ` @ ${card.replay.outcomeTime}` : ''} | $${card.replay.oneMesGross.toFixed(2)} | ${card.state} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildNoChaseRebuiltReviewDisabledLocalAdapterPreviewReport(args: {
  proposalPath: string;
  approvalContractPath: string;
  proposal: NoChaseRebuiltReviewLiveProposalReport | null;
  approvalContract: NoChaseRebuiltReviewApprovalContractReport | null;
}, generatedAt = new Date().toISOString()): NoChaseRebuiltReviewDisabledLocalAdapterPreviewReport {
  const cards = (args.proposal?.tickets || []).map(previewCardForTicket);
  const failedContractGates = args.approvalContract?.approvalContract.gates.filter((item) => item.required && item.status === 'fail') || [];
  const blockers = [
    !args.proposal ? 'missing no-chase rebuilt review proposal report' : null,
    !args.approvalContract ? 'missing no-chase rebuilt review approval contract report' : null,
    args.proposal && args.proposal.status !== 'pass' ? `proposal status ${args.proposal.status}` : null,
    args.approvalContract && args.approvalContract.status !== 'pass' ? `approval contract status ${args.approvalContract.status}` : null,
    args.approvalContract && args.approvalContract.summary.proposalReady !== true ? 'approval contract proposalReady is not true' : null,
    args.approvalContract && args.approvalContract.summary.failedGateCount !== 0 ? `approval contract failedGateCount ${args.approvalContract.summary.failedGateCount}` : null,
    ...failedContractGates.map((gate) => `approval gate failed: ${gate.name}`),
    args.proposal && args.proposal.summary.simulatedArtifacts !== 3 ? `proposal simulatedArtifacts ${args.proposal.summary.simulatedArtifacts}` : null,
    args.proposal && args.proposal.summary.htfSufficientArtifacts !== args.proposal.summary.simulatedArtifacts ? 'not all proposal artifacts are HTF sufficient' : null,
    args.proposal && args.proposal.summary.completePlanArtifacts !== args.proposal.summary.simulatedArtifacts ? 'not all proposal artifacts have complete plan fields' : null,
    args.proposal && args.proposal.summary.canExecuteFalseArtifacts !== args.proposal.summary.simulatedArtifacts ? 'proposal canExecute=false boundary not preserved' : null,
    args.proposal && args.proposal.summary.publishDiscordFalseArtifacts !== args.proposal.summary.simulatedArtifacts ? 'proposal publishDiscord=false boundary not preserved' : null,
    args.proposal && args.proposal.summary.htfPromotionEvidenceAllowed !== 0 ? `proposal htfPromotionEvidenceAllowed ${args.proposal.summary.htfPromotionEvidenceAllowed}` : null,
    args.proposal && args.proposal.summary.livePromotionAllowedRows !== 0 ? `proposal livePromotionAllowedRows ${args.proposal.summary.livePromotionAllowedRows}` : null,
    cards.length === 0 ? 'no preview cards created' : null,
    ...cards.flatMap((card) => [
      card.scannerVisible !== false ? `${card.previewId} scannerVisible is not false` : null,
      card.previewOnly !== true ? `${card.previewId} previewOnly is not true` : null,
      card.humanReviewOnly !== true ? `${card.previewId} humanReviewOnly is not true` : null,
      card.canExecute !== false ? `${card.previewId} canExecute is not false` : null,
      card.publishDiscord !== false ? `${card.previewId} publishDiscord is not false` : null,
      card.shouldPost !== false ? `${card.previewId} shouldPost is not false` : null,
      card.shouldDispatch !== false ? `${card.previewId} shouldDispatch is not false` : null,
      card.writesSupabase !== false ? `${card.previewId} writesSupabase is not false` : null,
      card.readsLiveSupabase !== false ? `${card.previewId} readsLiveSupabase is not false` : null,
      card.readsLiveBridge !== false ? `${card.previewId} readsLiveBridge is not false` : null,
      card.proof.htfReliability !== 'structured_context_available' ? `${card.previewId} HTF reliability ${card.proof.htfReliability}` : null,
      !completePlan(card) ? `${card.previewId} plan geometry is incomplete or directionally invalid` : null,
    ]),
  ].filter((item): item is string => Boolean(item));
  const base: Omit<NoChaseRebuiltReviewDisabledLocalAdapterPreviewReport, 'markdown'> = {
    reportType: 'no_chase_rebuilt_review_disabled_local_adapter_preview',
    generatedAt,
    status: blockers.length ? 'fail' : 'pass',
    authority: authority(),
    source: {
      proposalPath: args.proposalPath,
      approvalContractPath: args.approvalContractPath,
    },
    installState: {
      adapterPreviewCreated: true,
      scannerRuntimeWired: false,
      scannerVisibleNow: false,
      discordPostingEnabled: false,
      supabasePersistenceEnabled: false,
      canExecuteChanged: false,
    },
    summary: {
      proposalTickets: args.proposal?.tickets.length || 0,
      previewCards: cards.length,
      disabledPreviewCards: cards.filter((card) => card.state === 'DISABLED_LOCAL_REVIEW_PREVIEW' && card.scannerVisible === false).length,
      humanReviewOnlyCards: cards.filter((card) => card.humanReviewOnly === true).length,
      completePlanCards: cards.filter(completePlan).length,
      htfSufficientCards: cards.filter((card) => card.proof.htfReliability === 'structured_context_available').length,
      canExecuteFalseCards: cards.filter((card) => card.canExecute === false).length,
      publishDiscordFalseCards: cards.filter((card) => card.publishDiscord === false).length,
      scannerVisibleRows: 0,
      livePromotionAllowedRows: 0,
      replayGrossOneMes: cards.reduce((sum, card) => sum + card.replay.oneMesGross, 0),
      failedGateCount: blockers.length,
      recommendation: blockers.length ? 'fix_inputs' : 'keep_disabled_local_preview',
    },
    previewCards: cards,
    blockers,
    recommendations: blockers.length
      ? ['Do not use the disabled adapter preview until all proposal, approval-contract, and preview-card boundary checks pass.']
      : [
        'Keep this as a local disabled preview surface only.',
        'Do not wire scanner visibility, Discord posting, Supabase persistence, or canExecute from this adapter preview.',
        'Use the three preview cards as the next review surface before any separately approved scanner-visible implementation.',
      ],
  };
  return { ...base, markdown: buildMarkdown(base) };
}

export function writeNoChaseRebuiltReviewDisabledLocalAdapterPreviewReport(
  report: NoChaseRebuiltReviewDisabledLocalAdapterPreviewReport,
  outDir = DEFAULT_OUT_DIR,
): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const base = `no-chase-rebuilt-review-disabled-local-adapter-preview-${Date.now()}`;
  const jsonPath = path.join(outDir, `${base}.json`);
  const markdownPath = path.join(outDir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownPath, `${report.markdown}\n`, 'utf8');
  return { jsonPath, markdownPath };
}

export function runNoChaseRebuiltReviewDisabledLocalAdapterPreviewCli(args = process.argv.slice(2)): void {
  const options = parseNoChaseRebuiltReviewDisabledLocalAdapterPreviewArgs(args);
  const report = buildNoChaseRebuiltReviewDisabledLocalAdapterPreviewReport({
    proposalPath: options.proposal,
    approvalContractPath: options.approvalContract,
    proposal: fs.existsSync(options.proposal) ? readJson(options.proposal) : null,
    approvalContract: fs.existsSync(options.approvalContract) ? readJson(options.approvalContract) : null,
  });
  const paths = writeNoChaseRebuiltReviewDisabledLocalAdapterPreviewReport(report, options.outDir);
  if (options.json) {
    console.log(JSON.stringify({ ...paths, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nReport JSON: ${paths.jsonPath}`);
    console.log(`Report Markdown: ${paths.markdownPath}`);
  }
  if (report.status !== 'pass') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    runNoChaseRebuiltReviewDisabledLocalAdapterPreviewCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
