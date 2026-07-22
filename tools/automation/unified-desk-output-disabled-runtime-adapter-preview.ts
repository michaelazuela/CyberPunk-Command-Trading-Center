import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

type VisibleDeskOutputState = 'APPROVED_DESK_PLAN' | 'FORMING_DESK_READ';
type DisabledRuntimeState = VisibleDeskOutputState | 'SILENT_INTERNAL';

interface BuilderPreviewRow {
  date: string;
  session: 'morning' | 'lunch';
  requestedVisibleState: VisibleDeskOutputState;
  builderVisibleState: DisabledRuntimeState;
  model: string;
  direction: 'LONG' | 'SHORT';
  proofTime: string;
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  riskPoints: number | null;
  movement: string;
  primaryLane: string;
  supportingModels: string[];
  publishHasCompletePlan: boolean;
  publishShouldPost: boolean;
  publishCanExecute: boolean;
  noAutomatedOrders: boolean;
  canExecuteChanged: false;
  livePromotionAllowed: false;
  visibleHeadline: string | null;
  visibleWhat: string | null;
  visibleWhere: string | null;
  visibleWhen: string | null;
  visibleWhy: string | null;
  visibleInvalidation: string | null;
  visibleAuthority: string | null;
  blockers: string[];
}

interface BuilderPreviewReport {
  reportType: 'unified_desk_output_local_scanner_builder_preview';
  generatedAt: string;
  rows: BuilderPreviewRow[];
}

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
  context: {
    movement: string | null;
    primaryLane: string | null;
    supportingModels: string[];
  };
  visibleText: {
    headline: string | null;
    what: string | null;
    where: string | null;
    when: string | null;
    why: string | null;
    invalidation: string | null;
    authority: string | null;
  };
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
  authority: {
    localOnly: true;
    researchOnly: true;
    readsSavedBuilderPreviewOnly: true;
    runtimeAdapterDisabled: true;
    scannerRuntimeWired: false;
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
    builderPreviewPath: string;
    sourceRows: number;
  };
  installState: {
    adapterPreviewCreated: true;
    runtimeAdapterInstalled: false;
    scannerRuntimeWired: false;
    scannerVisibleNow: false;
    discordPostingEnabled: false;
    supabasePersistenceEnabled: false;
    bridgeReadsEnabled: false;
    canExecuteChanged: false;
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
  markdown: string;
}

interface CliOptions {
  builderPreviewPath: string | null;
  outDir: string;
  json: boolean;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function parseArgs(args = process.argv.slice(2)): CliOptions {
  return {
    builderPreviewPath: readFlag(args, '--builder-preview'),
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

function textHasBlockedWording(card: DisabledRuntimeCard): boolean {
  return Object.values(card.visibleText).some((value) => /human[- ]review|no chase|no-trade|no trade|missed/i.test(value || ''));
}

function completePlan(card: DisabledRuntimeCard): boolean {
  const { entry, stop, target1, target2, riskPoints } = card.levels;
  return [entry, stop, target1, target2, riskPoints].every((value) => typeof value === 'number' && Number.isFinite(value));
}

function cardForRow(row: BuilderPreviewRow): DisabledRuntimeCard {
  const state = row.blockers.length ? 'SILENT_INTERNAL' : row.builderVisibleState;
  const visible = state === 'SILENT_INTERNAL'
    ? { headline: null, what: null, where: null, when: null, why: null, invalidation: null, authority: null }
    : {
      headline: row.visibleHeadline,
      what: row.visibleWhat,
      where: row.visibleWhere,
      when: row.visibleWhen,
      why: row.visibleWhy,
      invalidation: row.visibleInvalidation,
      authority: row.visibleAuthority,
    };
  const card: DisabledRuntimeCard = {
    cardId: `unified-desk-output-disabled|${row.date}|${row.session}|${state}|${row.model}|${row.direction}|${row.proofTime}`,
    date: row.date,
    session: row.session,
    state,
    model: state === 'SILENT_INTERNAL' ? null : row.model,
    direction: state === 'SILENT_INTERNAL' ? null : row.direction,
    proofTime: state === 'SILENT_INTERNAL' ? null : row.proofTime,
    levels: {
      entry: state === 'SILENT_INTERNAL' ? null : row.entry,
      stop: state === 'SILENT_INTERNAL' ? null : row.stop,
      target1: state === 'SILENT_INTERNAL' ? null : row.target1,
      target2: state === 'SILENT_INTERNAL' ? null : row.target2,
      riskPoints: state === 'SILENT_INTERNAL' ? null : row.riskPoints,
    },
    context: {
      movement: state === 'SILENT_INTERNAL' ? null : row.movement,
      primaryLane: state === 'SILENT_INTERNAL' ? null : row.primaryLane,
      supportingModels: state === 'SILENT_INTERNAL' ? [] : [...row.supportingModels],
    },
    visibleText: visible,
    disabledRuntime: true,
    scannerRuntimeWired: false,
    scannerVisibleNow: false,
    publishDiscord: false,
    shouldPostDiscord: false,
    shouldDispatch: false,
    writesSupabase: false,
    readsLiveSupabase: false,
    readsLiveBridge: false,
    changesScannerBehavior: false,
    changesTradingLogic: false,
    changesCanExecute: false,
    canExecute: false,
    canExecuteChanged: false,
    livePromotionAllowed: false,
    noAutomatedOrders: true,
    blockers: [...row.blockers],
  };
  if (state !== 'SILENT_INTERNAL' && !completePlan(card)) card.blockers.push('Visible adapter card is missing complete plan levels.');
  if (textHasBlockedWording(card)) card.blockers.push('Visible adapter card contains blocked legacy status wording.');
  return card;
}

function buildMarkdown(report: Omit<DisabledRuntimeAdapterPreviewReport, 'markdown'>): string {
  return [
    '# Unified Desk Output Disabled Runtime Adapter Preview',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: disabled local runtime-adapter preview only. It does not wire scanner runtime, expose scanner-visible cards, post Discord, write Supabase, read live Supabase, read live bridge data, change canExecute, change trading logic, or place/manage orders.',
    '',
    '## Summary',
    `- Source rows: ${report.summary.sourceRows}.`,
    `- Disabled runtime cards: ${report.summary.disabledRuntimeCards}.`,
    `- Approved Desk Plan cards: ${report.summary.approvedDeskPlanCards}.`,
    `- Forming Desk Read cards: ${report.summary.formingDeskReadCards}.`,
    `- Silent internal cards: ${report.summary.silentInternalCards}.`,
    `- Complete-plan cards: ${report.summary.completePlanCards}.`,
    `- Source publishShouldPost rows: ${report.summary.sourcePublishShouldPostRows}.`,
    `- Adapter Discord-post rows: ${report.summary.adapterShouldPostDiscordRows}.`,
    `- Adapter Supabase-write rows: ${report.summary.adapterWritesSupabaseRows}.`,
    `- Adapter live-bridge-read rows: ${report.summary.adapterReadsLiveBridgeRows}.`,
    `- Adapter canExecute true rows: ${report.summary.adapterCanExecuteTrueRows}.`,
    `- canExecute changed rows: ${report.summary.canExecuteChangedRows}.`,
    `- Live promotion allowed rows: ${report.summary.livePromotionAllowedRows}.`,
    `- No automated order rows: ${report.summary.noAutomatedOrderRows}.`,
    `- Wording violation rows: ${report.summary.wordingViolationRows}.`,
    `- Blocked cards: ${report.summary.blockedCards}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Sample Disabled Cards',
    '| Date | Session | State | Model | Direction | Proof ET | Entry | Stop | T1 | T2 | Scanner Visible | Discord | Supabase |',
    '|---|---|---|---|---|---:|---:|---:|---:|---:|---|---|---|',
    ...report.cards
      .filter((card) => card.state !== 'SILENT_INTERNAL')
      .slice(0, 40)
      .map((card) => `| ${card.date} | ${card.session} | ${card.state} | ${card.model ?? '-'} | ${card.direction ?? '-'} | ${card.proofTime?.slice(11, 16) ?? '-'} | ${card.levels.entry ?? '-'} | ${card.levels.stop ?? '-'} | ${card.levels.target1 ?? '-'} | ${card.levels.target2 ?? '-'} | ${card.scannerVisibleNow} | ${card.publishDiscord} | ${card.writesSupabase} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildUnifiedDeskOutputDisabledRuntimeAdapterPreviewReport(args: {
  builderPreviewPath: string;
  builderPreviewReport: BuilderPreviewReport;
}, generatedAt = new Date().toISOString()): DisabledRuntimeAdapterPreviewReport {
  const cards = args.builderPreviewReport.rows.map(cardForRow);
  const blockers = cards.flatMap((card) => card.blockers.map((blocker) => `${card.cardId}: ${blocker}`));
  const report: Omit<DisabledRuntimeAdapterPreviewReport, 'markdown'> = {
    reportType: 'unified_desk_output_disabled_runtime_adapter_preview',
    generatedAt,
    status: blockers.length ? 'blocked' : 'pass',
    authority: {
      localOnly: true,
      researchOnly: true,
      readsSavedBuilderPreviewOnly: true,
      runtimeAdapterDisabled: true,
      scannerRuntimeWired: false,
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
      builderPreviewPath: args.builderPreviewPath,
      sourceRows: args.builderPreviewReport.rows.length,
    },
    installState: {
      adapterPreviewCreated: true,
      runtimeAdapterInstalled: false,
      scannerRuntimeWired: false,
      scannerVisibleNow: false,
      discordPostingEnabled: false,
      supabasePersistenceEnabled: false,
      bridgeReadsEnabled: false,
      canExecuteChanged: false,
    },
    summary: {
      sourceRows: args.builderPreviewReport.rows.length,
      disabledRuntimeCards: cards.length,
      approvedDeskPlanCards: cards.filter((card) => card.state === 'APPROVED_DESK_PLAN').length,
      formingDeskReadCards: cards.filter((card) => card.state === 'FORMING_DESK_READ').length,
      silentInternalCards: cards.filter((card) => card.state === 'SILENT_INTERNAL').length,
      completePlanCards: cards.filter(completePlan).length,
      sourcePublishShouldPostRows: args.builderPreviewReport.rows.filter((row) => row.publishShouldPost).length,
      adapterShouldPostDiscordRows: 0,
      adapterWritesSupabaseRows: 0,
      adapterReadsLiveBridgeRows: 0,
      adapterCanExecuteTrueRows: 0,
      canExecuteChangedRows: 0,
      livePromotionAllowedRows: 0,
      noAutomatedOrderRows: cards.filter((card) => card.noAutomatedOrders).length,
      wordingViolationRows: cards.filter(textHasBlockedWording).length,
      blockedCards: cards.filter((card) => card.blockers.length > 0).length,
      recommendation: blockers.length ? 'hold_for_adapter_contract_fix' : 'keep_disabled_until_live_gate',
    },
    cards,
    blockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

export function writeUnifiedDeskOutputDisabledRuntimeAdapterPreviewReport(report: DisabledRuntimeAdapterPreviewReport, outDir: string): { jsonPath: string; markdownPath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const jsonPath = path.join(outDir, `unified-desk-output-disabled-runtime-adapter-preview-${stamp}.json`);
  const markdownPath = path.join(outDir, `unified-desk-output-disabled-runtime-adapter-preview-${stamp}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${report.markdown}\n`);
  return { jsonPath, markdownPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const builderPreviewPath = path.resolve(options.builderPreviewPath ||
    latestMatchingFile(DEFAULT_REPORT_DIR, /^unified-desk-output-local-scanner-builder-preview-\d+\.json$/) ||
    '');
  if (!fs.existsSync(builderPreviewPath)) throw new Error('Missing Unified Desk Output local scanner-builder preview path.');
  const report = buildUnifiedDeskOutputDisabledRuntimeAdapterPreviewReport({
    builderPreviewPath,
    builderPreviewReport: readJson<BuilderPreviewReport>(builderPreviewPath),
  });
  const written = writeUnifiedDeskOutputDisabledRuntimeAdapterPreviewReport(report, path.resolve(options.outDir));
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
