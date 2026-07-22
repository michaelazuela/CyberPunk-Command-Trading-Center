import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

type VisibleDeskOutputState = 'APPROVED_DESK_PLAN' | 'FORMING_DESK_READ';
type DisabledRuntimeState = VisibleDeskOutputState | 'SILENT_INTERNAL';

interface DisabledRuntimeCard {
  cardId: string;
  date: string;
  session: 'morning' | 'lunch';
  state: DisabledRuntimeState;
  model: string | null;
  direction: 'LONG' | 'SHORT' | null;
  proofTime: string | null;
  levels: {
    entry: number | null;
    stop: number | null;
    target1: number | null;
    target2: number | null;
    riskPoints: number | null;
  };
  visibleText: Record<string, string | null>;
  disabledRuntime: true;
  scannerRuntimeWired: false;
  scannerVisibleNow: false;
  publishDiscord: false;
  shouldPostDiscord: false;
  shouldDispatch: false;
  writesSupabase: false;
  readsLiveSupabase: false;
  readsLiveBridge: false;
  changesScannerBehavior: false;
  changesTradingLogic: false;
  changesCanExecute: false;
  canExecute: false;
  canExecuteChanged: false;
  livePromotionAllowed: false;
  noAutomatedOrders: true;
  blockers: string[];
}

interface DisabledRuntimeAdapterPreviewReport {
  reportType: 'unified_desk_output_disabled_runtime_adapter_preview';
  generatedAt: string;
  status: 'pass' | 'blocked';
  source: {
    builderPreviewPath: string;
    sourceRows: number;
  };
  summary: {
    sourceRows: number;
    disabledRuntimeCards: number;
    approvedDeskPlanCards: number;
    formingDeskReadCards: number;
    silentInternalCards: number;
    completePlanCards: number;
    sourcePublishShouldPostRows: number;
    adapterShouldPostDiscordRows: 0;
    adapterWritesSupabaseRows: 0;
    adapterReadsLiveBridgeRows: 0;
    adapterCanExecuteTrueRows: 0;
    canExecuteChangedRows: 0;
    livePromotionAllowedRows: 0;
    noAutomatedOrderRows: number;
    wordingViolationRows: number;
    blockedCards: number;
    recommendation: 'keep_disabled_until_live_gate' | 'hold_for_adapter_contract_fix';
  };
  cards: DisabledRuntimeCard[];
  blockers: string[];
}

interface LiveGateCandidate {
  cardId: string;
  date: string;
  session: 'morning' | 'lunch';
  state: VisibleDeskOutputState;
  model: string;
  direction: 'LONG' | 'SHORT';
  proofTime: string;
  entry: number;
  stop: number;
  target1: number;
  target2: number;
  riskPoints: number;
  scannerVisibleIfExplicitGateApproved: true;
  discordEligibleIfSeparatelyApproved: true;
  supabaseEligibleIfSeparatelyApproved: true;
  canExecuteRemainsExternalGate: true;
}

interface LiveGateReadinessAuditReport {
  reportType: 'unified_desk_output_live_gate_readiness_audit';
  generatedAt: string;
  status: 'pass' | 'blocked';
  authority: {
    localOnly: true;
    readsSavedDisabledAdapterPreviewOnly: true;
    installsRuntimeAdapter: false;
    scannerVisibleNow: false;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    changesScannerBehavior: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    automatedOrders: false;
  };
  source: {
    disabledAdapterPreviewPath: string;
    disabledAdapterStatus: 'pass' | 'blocked';
    sourceRows: number;
  };
  gateContract: {
    allowedPublicStates: VisibleDeskOutputState[];
    silentState: 'SILENT_INTERNAL';
    explicitInstallStillRequired: true;
    scannerVisibilityOnlyCanBeConsideredNext: true;
    discordRequiresSeparateApproval: true;
    supabaseRequiresSeparateApproval: true;
    canExecuteMustRemainExistingDeterministicGate: true;
  };
  summary: {
    disabledRuntimeCards: number;
    approvedDeskPlanCandidates: number;
    formingDeskReadCandidates: number;
    silentInternalRows: number;
    scannerVisibleNowRows: number;
    scannerVisibleIfExplicitGateApprovedRows: number;
    discordPostNowRows: number;
    supabaseWriteNowRows: number;
    liveBridgeReadNowRows: number;
    canExecuteTrueRows: number;
    canExecuteChangedRows: number;
    tradingLogicChangedRows: number;
    incompleteVisiblePlanRows: number;
    wordingViolationRows: number;
    blockedRows: number;
    recommendation: 'ready_for_explicit_scanner_visibility_decision' | 'hold_for_live_gate_contract_fix';
  };
  candidates: LiveGateCandidate[];
  blockers: string[];
  markdown: string;
}

interface CliOptions {
  disabledAdapterPreviewPath: string | null;
  outDir: string;
  json: boolean;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const BLOCKED_WORDING = /human[- ]review|no chase|no-trade|no trade|missed/i;

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function parseArgs(args = process.argv.slice(2)): CliOptions {
  return {
    disabledAdapterPreviewPath: readFlag(args, '--disabled-adapter-preview'),
    outDir: readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR,
    json: args.includes('--json'),
  };
}

function latestMatchingFile(reportDir: string, pattern: RegExp): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => pattern.test(name))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function hasCompletePlan(card: DisabledRuntimeCard): boolean {
  return isFiniteNumber(card.levels.entry) &&
    isFiniteNumber(card.levels.stop) &&
    isFiniteNumber(card.levels.target1) &&
    isFiniteNumber(card.levels.target2) &&
    isFiniteNumber(card.levels.riskPoints);
}

function isVisibleState(state: DisabledRuntimeState): state is VisibleDeskOutputState {
  return state === 'APPROVED_DESK_PLAN' || state === 'FORMING_DESK_READ';
}

function hasBlockedWording(card: DisabledRuntimeCard): boolean {
  return Object.values(card.visibleText).some((value) => BLOCKED_WORDING.test(value || ''));
}

function liveGateCandidate(card: DisabledRuntimeCard): LiveGateCandidate | null {
  if (!isVisibleState(card.state) || !card.model || !card.direction || !card.proofTime || !hasCompletePlan(card) || card.blockers.length) {
    return null;
  }
  return {
    cardId: card.cardId,
    date: card.date,
    session: card.session,
    state: card.state,
    model: card.model,
    direction: card.direction,
    proofTime: card.proofTime,
    entry: card.levels.entry,
    stop: card.levels.stop,
    target1: card.levels.target1,
    target2: card.levels.target2,
    riskPoints: card.levels.riskPoints,
    scannerVisibleIfExplicitGateApproved: true,
    discordEligibleIfSeparatelyApproved: true,
    supabaseEligibleIfSeparatelyApproved: true,
    canExecuteRemainsExternalGate: true,
  };
}

function cardBlockers(card: DisabledRuntimeCard): string[] {
  return [
    card.disabledRuntime ? null : 'Card is not marked as disabled runtime.',
    card.scannerRuntimeWired ? 'Scanner runtime is already wired.' : null,
    card.scannerVisibleNow ? 'Card is already scanner-visible.' : null,
    card.publishDiscord || card.shouldPostDiscord || card.shouldDispatch ? 'Card would post or dispatch Discord now.' : null,
    card.writesSupabase ? 'Card would write Supabase now.' : null,
    card.readsLiveSupabase ? 'Card would read live Supabase now.' : null,
    card.readsLiveBridge ? 'Card would read live bridge now.' : null,
    card.changesScannerBehavior ? 'Card changes scanner behavior.' : null,
    card.changesTradingLogic ? 'Card changes trading logic.' : null,
    card.changesCanExecute || card.canExecuteChanged ? 'Card changes canExecute.' : null,
    card.canExecute ? 'Card has canExecute=true.' : null,
    card.livePromotionAllowed ? 'Card allows live promotion before explicit gate.' : null,
    card.noAutomatedOrders ? null : 'No-automated-orders boundary is missing.',
    isVisibleState(card.state) && !hasCompletePlan(card) ? 'Visible state is missing complete entry/stop/T1/T2/risk.' : null,
    hasBlockedWording(card) ? 'Visible text contains blocked legacy wording.' : null,
    ...card.blockers,
  ].filter((item): item is string => Boolean(item));
}

function buildMarkdown(report: Omit<LiveGateReadinessAuditReport, 'markdown'>): string {
  return [
    '# Unified Desk Output Live-Gate Readiness Audit',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local saved-report audit only. It does not install a runtime adapter, expose scanner-visible cards, post Discord, write Supabase, read live bridge data, change scanner behavior, change trading logic, change canExecute, or place/manage orders.',
    '',
    '## Gate Contract',
    '- Allowed public states after an explicit scanner-visibility gate: APPROVED_DESK_PLAN, FORMING_DESK_READ.',
    '- SILENT_INTERNAL remains internal.',
    '- Discord posting requires a separate approval gate.',
    '- Supabase persistence requires a separate approval gate.',
    '- canExecute remains the existing deterministic gate and is not changed by this path.',
    '',
    '## Summary',
    `- Disabled runtime cards: ${report.summary.disabledRuntimeCards}.`,
    `- Approved Desk Plan candidates: ${report.summary.approvedDeskPlanCandidates}.`,
    `- Forming Desk Read candidates: ${report.summary.formingDeskReadCandidates}.`,
    `- Silent internal rows: ${report.summary.silentInternalRows}.`,
    `- Scanner-visible now rows: ${report.summary.scannerVisibleNowRows}.`,
    `- Scanner-visible if explicit gate approved rows: ${report.summary.scannerVisibleIfExplicitGateApprovedRows}.`,
    `- Discord-post now rows: ${report.summary.discordPostNowRows}.`,
    `- Supabase-write now rows: ${report.summary.supabaseWriteNowRows}.`,
    `- Live-bridge-read now rows: ${report.summary.liveBridgeReadNowRows}.`,
    `- canExecute true rows: ${report.summary.canExecuteTrueRows}.`,
    `- canExecute changed rows: ${report.summary.canExecuteChangedRows}.`,
    `- Trading-logic changed rows: ${report.summary.tradingLogicChangedRows}.`,
    `- Incomplete visible plan rows: ${report.summary.incompleteVisiblePlanRows}.`,
    `- Wording violation rows: ${report.summary.wordingViolationRows}.`,
    `- Blocked rows: ${report.summary.blockedRows}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Candidate Sample',
    '| Date | Session | State | Model | Direction | Proof ET | Entry | Stop | T1 | T2 |',
    '|---|---|---|---|---|---:|---:|---:|---:|---:|',
    ...report.candidates
      .slice(0, 40)
      .map((candidate) => `| ${candidate.date} | ${candidate.session} | ${candidate.state} | ${candidate.model} | ${candidate.direction} | ${candidate.proofTime.slice(11, 16)} | ${candidate.entry} | ${candidate.stop} | ${candidate.target1} | ${candidate.target2} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildUnifiedDeskOutputLiveGateReadinessAuditReport(args: {
  disabledAdapterPreviewPath: string;
  disabledAdapterPreviewReport: DisabledRuntimeAdapterPreviewReport;
}, generatedAt = new Date().toISOString()): LiveGateReadinessAuditReport {
  const cards = args.disabledAdapterPreviewReport.cards;
  const candidates = cards.map(liveGateCandidate).filter((candidate): candidate is LiveGateCandidate => Boolean(candidate));
  const blockers = [
    args.disabledAdapterPreviewReport.status === 'pass' ? null : 'Disabled runtime adapter preview is blocked.',
    args.disabledAdapterPreviewReport.reportType === 'unified_desk_output_disabled_runtime_adapter_preview'
      ? null
      : 'Source report is not the disabled runtime adapter preview.',
    ...cards.flatMap((card) => cardBlockers(card).map((blocker) => `${card.cardId}: ${blocker}`)),
  ].filter((item): item is string => Boolean(item));
  const visibleCards = cards.filter((card) => isVisibleState(card.state));
  const report: Omit<LiveGateReadinessAuditReport, 'markdown'> = {
    reportType: 'unified_desk_output_live_gate_readiness_audit',
    generatedAt,
    status: blockers.length ? 'blocked' : 'pass',
    authority: {
      localOnly: true,
      readsSavedDisabledAdapterPreviewOnly: true,
      installsRuntimeAdapter: false,
      scannerVisibleNow: false,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveSupabase: false,
      readsLiveBridge: false,
      changesScannerBehavior: false,
      changesTradingLogic: false,
      changesCanExecute: false,
      automatedOrders: false,
    },
    source: {
      disabledAdapterPreviewPath: args.disabledAdapterPreviewPath,
      disabledAdapterStatus: args.disabledAdapterPreviewReport.status,
      sourceRows: args.disabledAdapterPreviewReport.source.sourceRows,
    },
    gateContract: {
      allowedPublicStates: ['APPROVED_DESK_PLAN', 'FORMING_DESK_READ'],
      silentState: 'SILENT_INTERNAL',
      explicitInstallStillRequired: true,
      scannerVisibilityOnlyCanBeConsideredNext: true,
      discordRequiresSeparateApproval: true,
      supabaseRequiresSeparateApproval: true,
      canExecuteMustRemainExistingDeterministicGate: true,
    },
    summary: {
      disabledRuntimeCards: cards.length,
      approvedDeskPlanCandidates: candidates.filter((candidate) => candidate.state === 'APPROVED_DESK_PLAN').length,
      formingDeskReadCandidates: candidates.filter((candidate) => candidate.state === 'FORMING_DESK_READ').length,
      silentInternalRows: cards.filter((card) => card.state === 'SILENT_INTERNAL').length,
      scannerVisibleNowRows: cards.filter((card) => card.scannerVisibleNow).length,
      scannerVisibleIfExplicitGateApprovedRows: candidates.length,
      discordPostNowRows: cards.filter((card) => card.publishDiscord || card.shouldPostDiscord || card.shouldDispatch).length,
      supabaseWriteNowRows: cards.filter((card) => card.writesSupabase).length,
      liveBridgeReadNowRows: cards.filter((card) => card.readsLiveBridge).length,
      canExecuteTrueRows: cards.filter((card) => card.canExecute).length,
      canExecuteChangedRows: cards.filter((card) => card.changesCanExecute || card.canExecuteChanged).length,
      tradingLogicChangedRows: cards.filter((card) => card.changesTradingLogic).length,
      incompleteVisiblePlanRows: visibleCards.filter((card) => !hasCompletePlan(card)).length,
      wordingViolationRows: cards.filter(hasBlockedWording).length,
      blockedRows: cards.filter((card) => cardBlockers(card).length > 0).length,
      recommendation: blockers.length ? 'hold_for_live_gate_contract_fix' : 'ready_for_explicit_scanner_visibility_decision',
    },
    candidates,
    blockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeUnifiedDeskOutputLiveGateReadinessAuditReport(report: LiveGateReadinessAuditReport, outDir: string): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `unified-desk-output-live-gate-readiness-audit-${stamp}.json`);
  const markdownPath = path.join(outDir, `unified-desk-output-live-gate-readiness-audit-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const disabledAdapterPreviewPath = path.resolve(options.disabledAdapterPreviewPath ||
    latestMatchingFile(DEFAULT_REPORT_DIR, /^unified-desk-output-disabled-runtime-adapter-preview-\d+\.json$/) ||
    '');
  if (!fs.existsSync(disabledAdapterPreviewPath)) throw new Error('Missing Unified Desk Output disabled runtime adapter preview path.');
  const report = buildUnifiedDeskOutputLiveGateReadinessAuditReport({
    disabledAdapterPreviewPath,
    disabledAdapterPreviewReport: readJson<DisabledRuntimeAdapterPreviewReport>(disabledAdapterPreviewPath),
  });
  const written = writeUnifiedDeskOutputLiveGateReadinessAuditReport(report, path.resolve(options.outDir));
  if (options.json) {
    console.log(JSON.stringify({ ...written, status: report.status, summary: report.summary, blockers: report.blockers.slice(0, 20) }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nJSON: ${written.jsonPath}`);
    console.log(`Markdown: ${written.markdownPath}`);
  }
  process.exitCode = report.status === 'pass' ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
