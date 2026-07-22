import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type Direction = 'LONG' | 'SHORT';
type ContractStatus = 'dry_run_review_ticket' | 'blocked_missing_geometry' | 'suppressed_duplicate_slate';
type Recommendation = 'advance_to_local_scanner_snapshot_preview' | 'hold_dry_run_contract' | 'fix_preview_input';

interface PreviewTicket {
  slateId: string;
  ticketId: string;
  tradeDate: string;
  session: 'lunch';
  model: 'AfterLunchDriveFvgContinuation';
  direction: Direction;
  proofTime: string;
  entryHitTime: string | null;
  proofToEntryMinutes: number | null;
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  riskPoints: number;
  outcomeBucket: string;
  outcomeLabel: string;
  oneMesPl: number | null;
  htfAlignment: string | null;
  activeRaids: string[];
  movement: string | null;
  camouflageClass: string | null;
  joinStatus: string;
  issueTags: string[];
}

interface PreviewReport {
  reportType: 'desk_playbook_selector_afterlunch_earliest_proof_preview';
  status: 'pass' | 'blocked';
  summary: {
    previewTickets: number;
    joinedGeometryTickets: number;
    winners: number;
    losses: number;
    unresolved: number;
    oneMesPl: number | null;
    winRateResolved: number | null;
    recommendation: string;
  };
  tickets: PreviewTicket[];
}

interface DryRunContractTicket {
  contractId: string;
  sourceTicketId: string;
  slateId: string;
  tradeDate: string;
  session: 'lunch';
  model: 'AfterLunchDriveFvgContinuation';
  direction: Direction;
  proofTime: string;
  entry: number | null;
  stop: number | null;
  target1: number | null;
  target2: number | null;
  riskPoints: number;
  htfContextStatus: 'supports' | 'mixed' | 'caution' | 'data_limited' | 'none' | 'partial';
  activeRaids: string[];
  movement: string | null;
  outcomeBucket: string;
  oneMesPl: number | null;
  status: ContractStatus;
  canExecute: false;
  publishDiscord: false;
  writeSupabase: false;
  reviewOnly: true;
  livePromotionAllowed: false;
  blockers: string[];
  ticketText: {
    what: string;
    where: string;
    when: string;
    why: string;
    invalidation: string;
    authority: string;
  };
}

export interface DeskPlaybookAfterLunchScannerOwnedDryRunContractReport {
  reportType: 'desk_playbook_selector_afterlunch_scanner_owned_dry_run_contract';
  generatedAt: string;
  status: 'pass' | 'blocked';
  authority: {
    researchOnly: true;
    localOnly: true;
    dryRunContractOnly: true;
    readsSavedPreviewOnly: true;
    outcomesUsedOnlyForMeasurement: true;
    runsSetupScanner: false;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveBridge: false;
    changesScannerBehavior: false;
    changesTradingRules: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
    changesRiskRules: false;
    livePromotionAllowed: false;
  };
  source: {
    earliestProofPreviewPath: string | null;
  };
  contract: {
    model: 'AfterLunchDriveFvgContinuation';
    session: 'lunch';
    selector: 'earliest_valid_completed_5m_proof_per_lunch_slate';
    oneTicketPerSlate: true;
    requireEntryStopTargets: true;
    attachHtfSessionContextWhenAvailable: true;
    publishDiscord: false;
    writeSupabase: false;
    canExecute: false;
    livePromotionAllowed: false;
  };
  summary: {
    sourcePreviewTickets: number;
    contractTickets: number;
    reviewTickets: number;
    blockedMissingGeometry: number;
    duplicateSlatesSuppressed: number;
    contextAttachedTickets: number;
    winners: number;
    losses: number;
    unresolved: number;
    oneMesPl: number | null;
    winRateResolved: number | null;
    livePromotionAllowedRows: 0;
    recommendation: Recommendation;
  };
  tickets: DryRunContractTicket[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
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

function latestMatchingFile(reportDir: string, prefix: string): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => name.startsWith(prefix) && name.endsWith('.json'))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function readJson<T>(filePath: string | null): T | null {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function sum(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function hasGeometry(ticket: PreviewTicket): boolean {
  return ticket.entry !== null && ticket.stop !== null && ticket.target1 !== null && ticket.target2 !== null;
}

function normalizeHtf(status: string | null): DryRunContractTicket['htfContextStatus'] {
  if (status === 'supports' || status === 'mixed' || status === 'caution' || status === 'data_limited' || status === 'none') return status;
  return status ? 'partial' : 'data_limited';
}

function levelText(ticket: PreviewTicket): string {
  return hasGeometry(ticket)
    ? `Entry ${ticket.entry}, stop ${ticket.stop}, T1 ${ticket.target1}, T2 ${ticket.target2}, risk ${ticket.riskPoints} points.`
    : 'Entry, stop, T1, and T2 are incomplete in the saved preview; block this dry-run ticket.';
}

function buildTicketText(ticket: PreviewTicket, blockers: string[]): DryRunContractTicket['ticketText'] {
  const side = ticket.direction === 'LONG' ? 'long' : 'short';
  const raids = ticket.activeRaids.length ? ticket.activeRaids.join(', ') : 'no saved raid context';
  const htf = normalizeHtf(ticket.htfAlignment);
  return {
    what: `AfterLunchDriveFvgContinuation ${side} dry-run review ticket from the first completed 5M proof in the lunch window.`,
    where: levelText(ticket),
    when: `Proof time ${ticket.proofTime} ET. One scanner-owned ticket is allowed for this lunch slate.`,
    why: `Saved context: HTF=${htf}, raids=${raids}, movement=${ticket.movement || 'not saved'}. Outcome is research measurement only.`,
    invalidation: hasGeometry(ticket)
      ? `Invalid if price violates the protected 5M stop line at ${ticket.stop}.`
      : `Invalid until deterministic entry/stop/T1/T2 geometry is present.`,
    authority: blockers.length
      ? `Dry-run blocked. No Discord post, no Supabase write, canExecute=false, and no live behavior changed.`
      : `Dry-run human-review contract only. 5M remains execution authority. HTF/session context is map/support/caution only. No Discord post, no Supabase write, canExecute=false.`,
  };
}

function contractIdFor(ticket: PreviewTicket): string {
  return [
    ticket.tradeDate,
    ticket.session,
    ticket.model,
    ticket.direction,
    ticket.proofTime.replace(/[^0-9T]/g, ''),
    'dry-run',
  ].join('-');
}

function contractTicket(ticket: PreviewTicket, seenSlates: Set<string>): DryRunContractTicket {
  const duplicate = seenSlates.has(ticket.slateId);
  seenSlates.add(ticket.slateId);
  const geometryMissing = !hasGeometry(ticket);
  const blockers = [
    duplicate ? `duplicate slate ${ticket.slateId}; one ticket per lunch slate is already selected` : null,
    geometryMissing ? 'missing deterministic entry/stop/T1/T2 geometry' : null,
  ].filter((item): item is string => Boolean(item));
  const status: ContractStatus = duplicate
    ? 'suppressed_duplicate_slate'
    : geometryMissing
      ? 'blocked_missing_geometry'
      : 'dry_run_review_ticket';
  return {
    contractId: contractIdFor(ticket),
    sourceTicketId: ticket.ticketId,
    slateId: ticket.slateId,
    tradeDate: ticket.tradeDate,
    session: 'lunch',
    model: 'AfterLunchDriveFvgContinuation',
    direction: ticket.direction,
    proofTime: ticket.proofTime,
    entry: ticket.entry,
    stop: ticket.stop,
    target1: ticket.target1,
    target2: ticket.target2,
    riskPoints: ticket.riskPoints,
    htfContextStatus: normalizeHtf(ticket.htfAlignment),
    activeRaids: ticket.activeRaids,
    movement: ticket.movement,
    outcomeBucket: ticket.outcomeBucket,
    oneMesPl: ticket.oneMesPl,
    status,
    canExecute: false,
    publishDiscord: false,
    writeSupabase: false,
    reviewOnly: true,
    livePromotionAllowed: false,
    blockers,
    ticketText: buildTicketText(ticket, blockers),
  };
}

function isWinner(ticket: DryRunContractTicket): boolean {
  return ticket.status === 'dry_run_review_ticket' && ticket.outcomeBucket.startsWith('winner');
}

function isLoss(ticket: DryRunContractTicket): boolean {
  return ticket.status === 'dry_run_review_ticket' && (ticket.outcomeBucket.startsWith('loss') || ticket.outcomeBucket === 'stopped_before_t1');
}

function buildMarkdown(report: Omit<DeskPlaybookAfterLunchScannerOwnedDryRunContractReport, 'markdown'>): string {
  const rows = report.tickets
    .map((ticket) => `| ${ticket.tradeDate} | ${ticket.direction} | ${ticket.proofTime.slice(11, 16)} | ${ticket.entry ?? '-'} | ${ticket.stop ?? '-'} | ${ticket.target1 ?? '-'} | ${ticket.target2 ?? '-'} | ${ticket.htfContextStatus} | ${ticket.status} | ${ticket.oneMesPl ?? '-'} |`)
    .join('\n');
  return [
    '# Desk Playbook AfterLunch Scanner-Owned Dry-Run Contract',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    'Authority: local-only dry-run contract. It does not run setupScanner, post Discord, write Supabase, read the bridge, change canExecute, or change entry/stop/target/risk behavior.',
    '',
    '## Summary',
    `- Source preview tickets: ${report.summary.sourcePreviewTickets}.`,
    `- Contract review tickets: ${report.summary.reviewTickets}.`,
    `- Blocked missing geometry: ${report.summary.blockedMissingGeometry}.`,
    `- Duplicate slates suppressed: ${report.summary.duplicateSlatesSuppressed}.`,
    `- Record: ${report.summary.winners}W/${report.summary.losses}L/${report.summary.unresolved}U.`,
    `- One-MES P/L: ${report.summary.oneMesPl ?? '-'}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Contract Tickets',
    '',
    '| Date | Direction | Proof ET | Entry | Stop | T1 | T2 | HTF | Status | P/L |',
    '|---|---|---:|---:|---:|---:|---:|---|---|---:|',
    rows,
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildDeskPlaybookAfterLunchScannerOwnedDryRunContractReport(args: {
  earliestProofPreviewPath?: string | null;
  earliestProofPreviewReport?: PreviewReport | null;
}, generatedAt = new Date().toISOString()): DeskPlaybookAfterLunchScannerOwnedDryRunContractReport {
  const preview = args.earliestProofPreviewReport ?? readJson<PreviewReport>(args.earliestProofPreviewPath ?? null);
  const sourceTickets = preview?.tickets || [];
  const seenSlates = new Set<string>();
  const tickets = sourceTickets.map((ticket) => contractTicket(ticket, seenSlates));
  const reviewTickets = tickets.filter((ticket) => ticket.status === 'dry_run_review_ticket');
  const blockedMissingGeometry = tickets.filter((ticket) => ticket.status === 'blocked_missing_geometry').length;
  const duplicateSlatesSuppressed = tickets.filter((ticket) => ticket.status === 'suppressed_duplicate_slate').length;
  const winners = reviewTickets.filter(isWinner).length;
  const losses = reviewTickets.filter(isLoss).length;
  const unresolved = reviewTickets.length - winners - losses;
  const resolved = winners + losses;
  const oneMesPl = sum(reviewTickets.map((ticket) => ticket.oneMesPl));
  const contextAttachedTickets = reviewTickets.filter((ticket) => ticket.htfContextStatus !== 'data_limited').length;
  const blockers = [
    !preview ? 'missing AfterLunch earliest-proof preview report' : null,
    preview && preview.status !== 'pass' ? `preview status ${preview.status}` : null,
    preview && preview.summary.recommendation !== 'candidate_for_scanner_owned_dry_run_contract'
      ? `preview recommendation ${preview.summary.recommendation}`
      : null,
    sourceTickets.length === 0 ? 'no preview tickets to contract' : null,
  ].filter((item): item is string => Boolean(item));
  const contractClean = blockers.length === 0 && reviewTickets.length > 0 && blockedMissingGeometry === 0 && duplicateSlatesSuppressed === 0;
  const recommendation: Recommendation = blockers.length
    ? 'fix_preview_input'
    : contractClean && oneMesPl !== null && oneMesPl > 0 && winners > losses
      ? 'advance_to_local_scanner_snapshot_preview'
      : 'hold_dry_run_contract';
  const recommendations = recommendation === 'advance_to_local_scanner_snapshot_preview'
    ? [
        'Advance to a local scanner snapshot preview that proves current scanner-owned builders can produce the same one-ticket contract without live publishing.',
        'Keep Discord posting, Supabase writes, canExecute, ranking, and entry/stop/target/risk behavior disabled until a separate explicit live gate.',
        'Keep one-ticket-per-lunch-slate ownership; repeated proof rows must remain suppressed.',
      ]
    : blockers.length
      ? ['Fix the saved earliest-proof preview before using this dry-run contract.']
      : ['Hold this contract research-only until blocked/duplicate rows are resolved.'];

  const base: Omit<DeskPlaybookAfterLunchScannerOwnedDryRunContractReport, 'markdown'> = {
    reportType: 'desk_playbook_selector_afterlunch_scanner_owned_dry_run_contract',
    generatedAt,
    status: blockers.length ? 'blocked' : 'pass',
    authority: {
      researchOnly: true,
      localOnly: true,
      dryRunContractOnly: true,
      readsSavedPreviewOnly: true,
      outcomesUsedOnlyForMeasurement: true,
      runsSetupScanner: false,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveBridge: false,
      changesScannerBehavior: false,
      changesTradingRules: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
      changesRiskRules: false,
      livePromotionAllowed: false,
    },
    source: {
      earliestProofPreviewPath: args.earliestProofPreviewPath ?? null,
    },
    contract: {
      model: 'AfterLunchDriveFvgContinuation',
      session: 'lunch',
      selector: 'earliest_valid_completed_5m_proof_per_lunch_slate',
      oneTicketPerSlate: true,
      requireEntryStopTargets: true,
      attachHtfSessionContextWhenAvailable: true,
      publishDiscord: false,
      writeSupabase: false,
      canExecute: false,
      livePromotionAllowed: false,
    },
    summary: {
      sourcePreviewTickets: sourceTickets.length,
      contractTickets: tickets.length,
      reviewTickets: reviewTickets.length,
      blockedMissingGeometry,
      duplicateSlatesSuppressed,
      contextAttachedTickets,
      winners,
      losses,
      unresolved,
      oneMesPl,
      winRateResolved: resolved ? round(winners / resolved) : null,
      livePromotionAllowedRows: 0,
      recommendation,
    },
    tickets,
    blockers,
    recommendations,
  };
  return { ...base, markdown: buildMarkdown(base) };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const reportDir = path.resolve(readFlag(args, '--report-dir') || DEFAULT_REPORT_DIR);
  const earliestProofPreviewPath = readFlag(args, '--earliest-proof-preview')
    || latestMatchingFile(reportDir, 'desk-playbook-selector-afterlunch-earliest-proof-preview-');
  const report = buildDeskPlaybookAfterLunchScannerOwnedDryRunContractReport({ earliestProofPreviewPath });
  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `desk-playbook-selector-afterlunch-scanner-owned-dry-run-contract-${Date.now()}.json`);
  const markdownPath = outPath.replace(/\.json$/, '.md');
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, report.markdown);
  if (args.includes('--json')) {
    console.log(JSON.stringify({ outPath, markdownPath, summary: report.summary, blockers: report.blockers }, null, 2));
  } else {
    console.log(`AfterLunch scanner-owned dry-run contract written: ${outPath}`);
    console.log(`Recommendation: ${report.summary.recommendation}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
