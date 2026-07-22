import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

type Direction = 'LONG' | 'SHORT';
type SessionName = 'morning' | 'lunch';
type VisibleDeskOutputState = 'APPROVED_DESK_PLAN' | 'FORMING_DESK_READ';

interface SelectorPreviewRow {
  date: string;
  session: SessionName;
  visibleState: VisibleDeskOutputState;
  model: string;
  direction: Direction;
  proofTime: string;
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  riskPoints: number | null;
  movement: string;
  primaryLane: string;
  supportingModels: string[];
  sourceCandidateRole: 'primary_lane' | 'supporting_lane';
  deskLanguage: {
    headline: string;
    what: string;
    where: string;
    when: string;
    why: string;
    invalidation: string;
    authority: string;
  };
}

interface ScannerDecisionTape {
  reportType?: string;
  createdAt?: string;
  updatedAt?: string;
  tradeDate?: string;
  instrument?: string;
  session?: string;
  events?: Record<string, ScannerDecisionTapeEvent>;
}

interface ScannerDecisionTapeEvent {
  time?: string | null;
  scannerState?: string | null;
  setupCandidateStatus?: {
    selected?: ScannerTapeCandidate | null;
    statuses?: ScannerTapeCandidate[];
  } | null;
  plan?: {
    canExecute?: boolean | null;
  } | null;
  deskPublishDecision?: ScannerTapePublishDecision | null;
  discord?: {
    shouldSend?: boolean | null;
    publishDecision?: ScannerTapePublishDecision | null;
  } | null;
  visibility?: {
    authority?: {
      discordEligible?: boolean | null;
    } | null;
    discordAction?: string | null;
  } | null;
}

interface ScannerTapeCandidate {
  setupType?: string | null;
  direction?: string | null;
  executionStatus?: string | null;
}

interface ScannerTapePublishDecision {
  action?: string | null;
  discordAction?: string | null;
  shouldPost?: boolean | null;
  reason?: string | null;
  direction?: string | null;
  setupType?: string | null;
  entry?: number | null;
  stop?: number | null;
  t1?: number | null;
  t2?: number | null;
  hasCompletePlan?: boolean | null;
  canExecute?: boolean | null;
  invalidationText?: string | null;
  approvalBoundary?: string | null;
}

interface SelectorPreviewReport {
  reportType: 'unified_desk_output_selector_preview';
  generatedAt: string;
  sourceOfTruth: 'current_scanner_feed_adapter';
  source: {
    scannerAuditDir: string;
    scannerDecisionTapePaths: string[];
    instrument: string;
    sessions: SessionName[];
  };
  authority: {
    localOnly: true;
    readsSavedScannerArtifactsOnly: true;
    writesSelectorPreviewOnly: true;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveSupabase: false;
    readsLiveBridge: false;
    changesScannerBehavior: false;
    changesTradingLogic: false;
    changesCanExecute: false;
    automatedOrders: false;
  };
  rows: SelectorPreviewRow[];
}

interface AdapterReport {
  reportType: 'unified_desk_output_current_scanner_feed_adapter';
  generatedAt: string;
  status: 'pass' | 'blocked';
  authority: SelectorPreviewReport['authority'];
  source: SelectorPreviewReport['source'];
  artifacts: {
    selectorPreviewJsonPath: string | null;
  };
  summary: {
    scannerTapeFilesRead: number;
    scannerEventsRead: number;
    completePlanEvents: number;
    sourceShouldPostRows: number;
    selectorRows: number;
    approvedDeskPlanRows: number;
    formingDeskReadRows: number;
    discordPostRows: 0;
    supabaseWriteRows: 0;
    liveSupabaseReadRows: 0;
    liveBridgeReadRows: 0;
    canExecuteTrueRows: number;
    canExecuteChangedRows: 0;
    tradingLogicChangedRows: 0;
    runtimeInstallAllowed: false;
    blockedRows: number;
    recommendation: 'ready_for_fresh_guarded_scanner_output' | 'hold_for_current_scanner_feed_fix';
  };
  rows: SelectorPreviewRow[];
  blockers: string[];
  markdown: string;
}

interface CliOptions {
  scannerAuditDir: string;
  outDir: string;
  instrument: string;
  tradeDate: string | null;
  sessions: SessionName[];
  json: boolean;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const DEFAULT_SCANNER_AUDIT_DIR = path.join(__dirname, 'discord-audit');

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function parseSessions(value: string | null): SessionName[] {
  if (!value) return ['morning', 'lunch'];
  return value.split(',')
    .map((item) => item.trim())
    .filter((item): item is SessionName => item === 'morning' || item === 'lunch');
}

function parseArgs(args = process.argv.slice(2)): CliOptions {
  return {
    scannerAuditDir: readFlag(args, '--scanner-audit-dir') || DEFAULT_SCANNER_AUDIT_DIR,
    outDir: readFlag(args, '--out-dir') || DEFAULT_REPORT_DIR,
    instrument: readFlag(args, '--instrument') || 'MES',
    tradeDate: readFlag(args, '--trade-date'),
    sessions: parseSessions(readFlag(args, '--sessions')),
    json: args.includes('--json'),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function latestTapeFor(args: {
  scannerAuditDir: string;
  tradeDate: string | null;
  instrument: string;
  session: SessionName;
}): string | null {
  if (!fs.existsSync(args.scannerAuditDir)) return null;
  const names = fs.readdirSync(args.scannerAuditDir)
    .filter((name) => name.startsWith('scanner-decision-tape-') && name.endsWith(`-${args.instrument}-${args.session}.json`))
    .filter((name) => !args.tradeDate || name.includes(`-${args.tradeDate}-${args.instrument}-${args.session}.json`));
  return names
    .map((name) => path.join(args.scannerAuditDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function isDirection(value: unknown): value is Direction {
  return value === 'LONG' || value === 'SHORT';
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function hasCompleteGeometry(decision: ScannerTapePublishDecision | null | undefined): decision is ScannerTapePublishDecision {
  return Boolean(decision?.hasCompletePlan) &&
    isDirection(decision?.direction) &&
    numberOrNull(decision?.entry) !== null &&
    numberOrNull(decision?.stop) !== null &&
    numberOrNull(decision?.t1) !== null &&
    numberOrNull(decision?.t2) !== null;
}

function setupTypeFrom(event: ScannerDecisionTapeEvent, decision: ScannerTapePublishDecision): string {
  return decision.setupType ||
    event.setupCandidateStatus?.selected?.setupType ||
    event.setupCandidateStatus?.statuses?.find((candidate) => candidate.direction === decision.direction && candidate.executionStatus === 'Executable')?.setupType ||
    'ScannerOwnedDeskPlan';
}

function visibleStateFrom(event: ScannerDecisionTapeEvent, decision: ScannerTapePublishDecision): VisibleDeskOutputState {
  const scannerPostable = decision.shouldPost === true ||
    event.discord?.shouldSend === true ||
    event.visibility?.authority?.discordEligible === true ||
    event.visibility?.discordAction === 'post_review' ||
    event.visibility?.discordAction === 'post_conditional';
  return scannerPostable ? 'APPROVED_DESK_PLAN' : 'FORMING_DESK_READ';
}

function movementFrom(event: ScannerDecisionTapeEvent, decision: ScannerTapePublishDecision): string {
  const action = decision.discordAction || decision.action || 'scanner_current';
  const state = event.scannerState || 'unknown_state';
  return `${state}:${action}`;
}

function proofTimeFrom(key: string, event: ScannerDecisionTapeEvent): string {
  return event.time || key.replace('.0000000', '');
}

function hhmm(value: string): string {
  return value.slice(11, 16) || value;
}

function buildDeskLanguage(args: {
  rowState: VisibleDeskOutputState;
  date: string;
  session: SessionName;
  model: string;
  direction: Direction;
  proofTime: string;
  entry: number;
  stop: number;
  t1: number;
  t2: number;
  sourceFile: string;
  decision: ScannerTapePublishDecision;
}): SelectorPreviewRow['deskLanguage'] {
  return {
    headline: `${args.rowState === 'APPROVED_DESK_PLAN' ? 'Approved Desk Plan' : 'Forming Desk Read'}: ${args.model} ${args.direction}`,
    what: `${args.session} ${args.direction.toLowerCase()} desk plan from the current saved scanner tape.`,
    where: `Entry ${args.entry}, stop ${args.stop}, T1 ${args.t1}, T2 ${args.t2}.`,
    when: `Completed 5M proof time ${hhmm(args.proofTime)} ET on ${args.date}.`,
    why: `Scanner-owned DeskPublishDecision selected ${args.model}; source artifact ${args.sourceFile}.`,
    invalidation: args.decision.invalidationText || `Invalid if price violates the protected 5M stop line at ${args.stop}.`,
    authority: 'Decision-support desk output only. Existing deterministic gates remain in control. No automated orders.',
  };
}

function rowFromEvent(args: {
  key: string;
  event: ScannerDecisionTapeEvent;
  tape: ScannerDecisionTape;
  sourceFile: string;
}): SelectorPreviewRow | null {
  const decision = args.event.deskPublishDecision || args.event.discord?.publishDecision || null;
  if (!hasCompleteGeometry(decision)) return null;
  const direction = decision.direction;
  if (!isDirection(direction)) return null;
  const entry = numberOrNull(decision.entry);
  const stop = numberOrNull(decision.stop);
  const target1 = numberOrNull(decision.t1);
  const target2 = numberOrNull(decision.t2);
  if (entry === null || stop === null || target1 === null || target2 === null) return null;
  const proofTime = proofTimeFrom(args.key, args.event);
  const date = args.tape.tradeDate || proofTime.slice(0, 10);
  const session = args.tape.session === 'morning' || args.tape.session === 'lunch' ? args.tape.session : null;
  if (!session) return null;
  const model = setupTypeFrom(args.event, decision);
  const riskPoints = Math.abs(entry - stop);
  const visibleState = visibleStateFrom(args.event, decision);
  return {
    date,
    session,
    visibleState,
    model,
    direction,
    proofTime,
    entry,
    stop,
    target1,
    target2,
    riskPoints,
    movement: movementFrom(args.event, decision),
    primaryLane: model,
    supportingModels: (args.event.setupCandidateStatus?.statuses || [])
      .map((candidate) => candidate.setupType)
      .filter((value): value is string => Boolean(value) && value !== model),
    sourceCandidateRole: 'primary_lane',
    deskLanguage: buildDeskLanguage({
      rowState: visibleState,
      date,
      session,
      model,
      direction,
      proofTime,
      entry,
      stop,
      t1: target1,
      t2: target2,
      sourceFile: args.sourceFile,
      decision,
    }),
  };
}

function uniqueRows(rows: SelectorPreviewRow[]): SelectorPreviewRow[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = [
      row.date,
      row.session,
      row.proofTime,
      row.model,
      row.direction,
      row.entry,
      row.stop,
      row.target1,
      row.target2,
    ].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildMarkdown(report: Omit<AdapterReport, 'markdown'>): string {
  return [
    '# Unified Desk Output Current Scanner Feed Adapter',
    '',
    `Status: ${report.status}`,
    '',
    'Authority: local saved scanner-tape read only. It writes a selector-preview artifact for the existing guarded scanner-output chain. It does not post Discord, write Supabase, read live bridge data, change scanner runtime behavior, change trading logic, change canExecute, or place/manage orders.',
    '',
    '## Summary',
    `- Scanner tape files read: ${report.summary.scannerTapeFilesRead}.`,
    `- Scanner events read: ${report.summary.scannerEventsRead}.`,
    `- Complete-plan events: ${report.summary.completePlanEvents}.`,
    `- Source shouldPost rows: ${report.summary.sourceShouldPostRows}.`,
    `- Selector rows: ${report.summary.selectorRows}.`,
    `- Approved Desk Plan rows: ${report.summary.approvedDeskPlanRows}.`,
    `- Forming Desk Read rows: ${report.summary.formingDeskReadRows}.`,
    `- Discord-post rows: ${report.summary.discordPostRows}.`,
    `- Supabase-write rows: ${report.summary.supabaseWriteRows}.`,
    `- Live-bridge-read rows: ${report.summary.liveBridgeReadRows}.`,
    `- canExecute true rows: ${report.summary.canExecuteTrueRows}.`,
    `- canExecute changed rows: ${report.summary.canExecuteChangedRows}.`,
    `- Trading-logic changed rows: ${report.summary.tradingLogicChangedRows}.`,
    `- Runtime install allowed: ${report.summary.runtimeInstallAllowed}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Selector Rows',
    '| Date | Session | State | Model | Direction | Proof ET | Entry | Stop | T1 | T2 |',
    '|---|---|---|---|---|---:|---:|---:|---:|---:|',
    ...report.rows.slice(0, 40).map((row) => `| ${row.date} | ${row.session} | ${row.visibleState} | ${row.model} | ${row.direction} | ${hhmm(row.proofTime)} | ${row.entry ?? '-'} | ${row.stop ?? '-'} | ${row.target1 ?? '-'} | ${row.target2 ?? '-'} |`),
    '',
    '## Blockers',
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`) : ['- None.']),
  ].join('\n');
}

export function buildUnifiedDeskOutputCurrentScannerFeedAdapterReport(args: {
  scannerAuditDir: string;
  tapePaths: string[];
  instrument: string;
  sessions: SessionName[];
}, generatedAt = new Date().toISOString()): AdapterReport {
  const rows: SelectorPreviewRow[] = [];
  let scannerEventsRead = 0;
  let completePlanEvents = 0;
  let sourceShouldPostRows = 0;
  let canExecuteTrueRows = 0;
  const blockers: string[] = [];

  for (const tapePath of args.tapePaths) {
    const tape = readJson<ScannerDecisionTape>(tapePath);
    const events = tape.events || {};
    const sourceFile = path.basename(tapePath);
    for (const [key, event] of Object.entries(events)) {
      scannerEventsRead += 1;
      const decision = event.deskPublishDecision || event.discord?.publishDecision || null;
      if (decision?.hasCompletePlan) completePlanEvents += 1;
      if (decision?.shouldPost || event.discord?.shouldSend) sourceShouldPostRows += 1;
      if (decision?.canExecute || event.plan?.canExecute) canExecuteTrueRows += 1;
      const row = rowFromEvent({ key, event, tape, sourceFile });
      if (row) rows.push(row);
    }
  }

  if (!args.tapePaths.length) blockers.push('No saved scanner decision tape files were found for the requested instrument/session set.');
  if (!rows.length) blockers.push('Saved scanner decision tapes did not contain any complete scanner-owned DeskPublishDecision rows.');
  if (canExecuteTrueRows > 0) blockers.push('Source scanner tape contains canExecute=true rows. Adapter refuses to carry that into the selector-preview contract.');

  const dedupedRows = uniqueRows(rows);
  const report: Omit<AdapterReport, 'markdown'> = {
    reportType: 'unified_desk_output_current_scanner_feed_adapter',
    generatedAt,
    status: blockers.length ? 'blocked' : 'pass',
    authority: {
      localOnly: true,
      readsSavedScannerArtifactsOnly: true,
      writesSelectorPreviewOnly: true,
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
      scannerAuditDir: args.scannerAuditDir,
      scannerDecisionTapePaths: args.tapePaths,
      instrument: args.instrument,
      sessions: args.sessions,
    },
    artifacts: {
      selectorPreviewJsonPath: null,
    },
    summary: {
      scannerTapeFilesRead: args.tapePaths.length,
      scannerEventsRead,
      completePlanEvents,
      sourceShouldPostRows,
      selectorRows: dedupedRows.length,
      approvedDeskPlanRows: dedupedRows.filter((row) => row.visibleState === 'APPROVED_DESK_PLAN').length,
      formingDeskReadRows: dedupedRows.filter((row) => row.visibleState === 'FORMING_DESK_READ').length,
      discordPostRows: 0,
      supabaseWriteRows: 0,
      liveSupabaseReadRows: 0,
      liveBridgeReadRows: 0,
      canExecuteTrueRows,
      canExecuteChangedRows: 0,
      tradingLogicChangedRows: 0,
      runtimeInstallAllowed: false,
      blockedRows: blockers.length,
      recommendation: blockers.length ? 'hold_for_current_scanner_feed_fix' : 'ready_for_fresh_guarded_scanner_output',
    },
    rows: dedupedRows,
    blockers,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

function selectorPreviewFromReport(report: AdapterReport): SelectorPreviewReport {
  return {
    reportType: 'unified_desk_output_selector_preview',
    generatedAt: report.generatedAt,
    sourceOfTruth: 'current_scanner_feed_adapter',
    source: report.source,
    authority: report.authority,
    rows: report.rows,
  };
}

export function writeUnifiedDeskOutputCurrentScannerFeedAdapterReport(report: AdapterReport, outDir: string): {
  jsonPath: string;
  markdownPath: string;
  selectorPreviewJsonPath: string | null;
} {
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = Date.now();
  const selectorPreviewJsonPath = report.status === 'pass'
    ? path.join(outDir, `unified-desk-output-selector-preview-${stamp}.json`)
    : null;
  const completedReport = {
    ...report,
    artifacts: {
      ...report.artifacts,
      selectorPreviewJsonPath,
    },
  };
  const jsonPath = path.join(outDir, `unified-desk-output-current-scanner-feed-adapter-${stamp}.json`);
  const markdownPath = path.join(outDir, `unified-desk-output-current-scanner-feed-adapter-${stamp}.md`);
  if (selectorPreviewJsonPath) {
    fs.writeFileSync(selectorPreviewJsonPath, `${JSON.stringify(selectorPreviewFromReport(completedReport), null, 2)}\n`);
  }
  fs.writeFileSync(jsonPath, `${JSON.stringify(completedReport, null, 2)}\n`);
  fs.writeFileSync(markdownPath, `${completedReport.markdown}\n`);
  return { jsonPath, markdownPath, selectorPreviewJsonPath };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const scannerAuditDir = path.resolve(options.scannerAuditDir);
  const tapePaths = options.sessions
    .map((session) => latestTapeFor({
      scannerAuditDir,
      tradeDate: options.tradeDate,
      instrument: options.instrument,
      session,
    }))
    .filter((item): item is string => Boolean(item));
  const report = buildUnifiedDeskOutputCurrentScannerFeedAdapterReport({
    scannerAuditDir,
    tapePaths,
    instrument: options.instrument,
    sessions: options.sessions,
  });
  const written = writeUnifiedDeskOutputCurrentScannerFeedAdapterReport(report, path.resolve(options.outDir));
  if (options.json) {
    console.log(JSON.stringify({ ...written, status: report.status, summary: report.summary, blockers: report.blockers }, null, 2));
  } else {
    console.log(report.markdown);
    console.log(`\nJSON: ${written.jsonPath}`);
    if (written.selectorPreviewJsonPath) console.log(`Selector preview: ${written.selectorPreviewJsonPath}`);
  }
  process.exitCode = report.status === 'pass' ? 0 : 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
