import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type Direction = 'LONG' | 'SHORT';
type Recommendation = 'hold_dry_run_preview' | 'candidate_for_scanner_owned_dry_run_contract' | 'fix_inputs';

interface SourceProofTimingRow {
  ticketId: string;
  tradeDate: string;
  session: string;
  setupType: string;
  direction: Direction;
  outcomeBucket: string;
  outcomeLabel: string;
  resolvedOneMesPl: number | null;
  proofTime: string;
  entryHitTime: string | null;
  proofToEntryMinutes: number | null;
  riskPoints: number;
  issueTags: string[];
}

interface SourceProofTimingReport {
  reportType: 'unified_positive_held_local_preview_replay_package_source_proof_timing';
  status: 'pass' | 'fail';
  rows: SourceProofTimingRow[];
}

interface IntakeRow {
  intakeId: string;
  tradeDate: string;
  session: string;
  instrument: string;
  setupType: string;
  direction: Direction;
  firstSeenTime: string;
  entry: number;
  stop: number;
  target1: number;
  target2: number;
  riskPoints: number;
  candidateState?: string | null;
  executionStatus?: string | null;
  detectedStatus?: string | null;
  blockReason?: string | null;
  proofState?: string | null;
}

interface ReplayPackageRow {
  ticketId: string;
  entry: number;
  stop: number;
  t1: number;
  t2: number;
  riskPoints: number;
}

interface ReplayPackageReport {
  reportType: 'unified_positive_held_local_preview_replay_package';
  status: 'pass' | 'fail';
  rows: ReplayPackageRow[];
}

interface ReviewedCaseIntakeReport {
  reportType: 'unified_positive_held_local_preview_reviewed_case_intake';
  status: 'pass' | 'fail';
  rows: IntakeRow[];
}

interface CamouflageRow {
  date: string;
  session: string;
  selectedModel: string | null;
  selectedDirection: Direction | null;
  activeRaids: string[];
  htfAlignment: string;
  movement: string;
  camouflageClass: string;
  complexityScore: number;
}

interface CamouflageAuditReport {
  reportType: 'desk_playbook_selector_camouflage_audit';
  rows: CamouflageRow[];
}

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
  joinStatus: 'joined_ticket_geometry' | 'missing_ticket_geometry';
  issueTags: string[];
}

export interface DeskPlaybookAfterLunchEarliestProofPreviewReport {
  reportType: 'desk_playbook_selector_afterlunch_earliest_proof_preview';
  generatedAt: string;
  status: 'pass' | 'blocked';
  authority: {
    researchOnly: true;
    localOnly: true;
    dryRunPreviewOnly: true;
    readsSavedReportsOnly: true;
    outcomesUsedOnlyForMeasurement: true;
    runsSetupScanner: false;
    postsDiscord: false;
    writesSupabase: false;
    readsLiveBridge: false;
    changesScannerBehavior: false;
    changesTradingRules: false;
    changesCanExecute: false;
    changesEntryStopTargets: false;
  };
  source: {
    sourceProofTimingPath: string | null;
    replayPackagePath: string | null;
    reviewedCaseIntakePath: string | null;
    camouflageAuditPath: string | null;
  };
  summary: {
    sourceRows: number;
    afterLunchRows: number;
    previewTickets: number;
    joinedGeometryTickets: number;
    winners: number;
    losses: number;
    unresolved: number;
    oneMesPl: number | null;
    winRateResolved: number | null;
    livePromotionAllowedRows: 0;
    recommendation: Recommendation;
  };
  tickets: PreviewTicket[];
  blockers: string[];
  recommendations: string[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const SETUP = 'AfterLunchDriveFvgContinuation';

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

function normalizeTime(value: string): string {
  return value.trim().replace(/\.\d+/, '').replace(/(?:Z|[+-]\d{2}:\d{2})$/, '').slice(0, 19);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function sum(values: Array<number | null | undefined>): number | null {
  const numeric = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return numeric.length ? round(numeric.reduce((total, value) => total + value, 0)) : null;
}

function isWinner(row: Pick<PreviewTicket, 'outcomeBucket'>): boolean {
  return row.outcomeBucket.startsWith('winner');
}

function isLoss(row: Pick<PreviewTicket, 'outcomeBucket'>): boolean {
  return row.outcomeBucket.startsWith('loss') || row.outcomeBucket === 'stopped_before_t1';
}

function groupBySlate(rows: SourceProofTimingRow[]): Map<string, SourceProofTimingRow[]> {
  const groups = new Map<string, SourceProofTimingRow[]>();
  for (const row of rows) {
    const slateId = `${row.tradeDate}|${row.session}`;
    groups.set(slateId, [...(groups.get(slateId) || []), row]);
  }
  return groups;
}

function intakeKey(row: Pick<IntakeRow, 'tradeDate' | 'session' | 'setupType' | 'direction' | 'firstSeenTime'>): string {
  return [
    row.tradeDate,
    row.session,
    row.setupType,
    row.direction,
    normalizeTime(row.firstSeenTime),
  ].join('|');
}

function timingKey(row: Pick<SourceProofTimingRow, 'tradeDate' | 'session' | 'setupType' | 'direction' | 'proofTime'>): string {
  return [
    row.tradeDate,
    row.session,
    row.setupType,
    row.direction,
    normalizeTime(row.proofTime),
  ].join('|');
}

function buildPreviewTickets(args: {
  sourceRows: SourceProofTimingRow[];
  replayPackageRows: ReplayPackageRow[];
  intakeRows: IntakeRow[];
  camouflageRows: CamouflageRow[];
}): PreviewTicket[] {
  const packageGeometryByTicket = new Map(args.replayPackageRows.map((row) => [row.ticketId, row]));
  const geometryByKey = new Map(args.intakeRows.map((row) => [intakeKey(row), row]));
  const camouflageBySlate = new Map(
    args.camouflageRows
      .filter((row) => row.session === 'lunch')
      .map((row) => [`${row.date}|${row.session}`, row]),
  );
  return [...groupBySlate(args.sourceRows).entries()]
    .map(([slateId, rows]) => {
      const selected = [...rows].sort((a, b) => normalizeTime(a.proofTime).localeCompare(normalizeTime(b.proofTime)) || a.ticketId.localeCompare(b.ticketId))[0];
      const packageGeometry = packageGeometryByTicket.get(selected.ticketId) || null;
      const intakeGeometry = geometryByKey.get(timingKey(selected)) || null;
      const camouflage = camouflageBySlate.get(slateId) || null;
      return {
        slateId,
        ticketId: selected.ticketId,
        tradeDate: selected.tradeDate,
        session: 'lunch',
        model: SETUP,
        direction: selected.direction,
        proofTime: normalizeTime(selected.proofTime),
        entryHitTime: selected.entryHitTime ? normalizeTime(selected.entryHitTime) : null,
        proofToEntryMinutes: selected.proofToEntryMinutes,
        entry: packageGeometry?.entry ?? intakeGeometry?.entry ?? null,
        stop: packageGeometry?.stop ?? intakeGeometry?.stop ?? null,
        target1: packageGeometry?.t1 ?? intakeGeometry?.target1 ?? null,
        target2: packageGeometry?.t2 ?? intakeGeometry?.target2 ?? null,
        riskPoints: selected.riskPoints,
        outcomeBucket: selected.outcomeBucket,
        outcomeLabel: selected.outcomeLabel,
        oneMesPl: selected.resolvedOneMesPl,
        htfAlignment: camouflage?.htfAlignment ?? null,
        activeRaids: camouflage?.activeRaids ?? [],
        movement: camouflage?.movement ?? null,
        camouflageClass: camouflage?.camouflageClass ?? null,
        joinStatus: packageGeometry || intakeGeometry ? 'joined_ticket_geometry' : 'missing_ticket_geometry',
        issueTags: selected.issueTags || [],
      } satisfies PreviewTicket;
    })
    .sort((a, b) => a.slateId.localeCompare(b.slateId));
}

function buildMarkdown(report: Omit<DeskPlaybookAfterLunchEarliestProofPreviewReport, 'markdown'>): string {
  const rows = report.tickets
    .map((ticket) => `| ${ticket.tradeDate} | ${ticket.direction} | ${ticket.proofTime.slice(11, 16)} | ${ticket.entry ?? '-'} | ${ticket.stop ?? '-'} | ${ticket.target1 ?? '-'} | ${ticket.target2 ?? '-'} | ${ticket.outcomeBucket} | ${ticket.oneMesPl ?? '-'} | ${ticket.htfAlignment ?? '-'} | ${ticket.activeRaids.join('+') || '-'} |`)
    .join('\n');
  return [
    '# Desk Playbook AfterLunch Earliest Proof Preview',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    'Authority: dry-run local preview from saved reports. It selects the earliest completed 5M AfterLunchDriveFvgContinuation proof per lunch slate. It does not run setupScanner, post Discord, write Supabase, read the bridge, change canExecute, or change entry/stop/target/risk behavior.',
    '',
    '## Summary',
    `- Preview tickets: ${report.summary.previewTickets}.`,
    `- Record: ${report.summary.winners}W/${report.summary.losses}L/${report.summary.unresolved}U.`,
    `- Resolved win rate: ${report.summary.winRateResolved ?? '-'}.`,
    `- One-MES P/L: ${report.summary.oneMesPl ?? '-'}.`,
    `- Geometry joined: ${report.summary.joinedGeometryTickets}/${report.summary.previewTickets}.`,
    `- Recommendation: ${report.summary.recommendation}.`,
    '',
    '## Preview Tickets',
    '',
    '| Date | Direction | Proof ET | Entry | Stop | T1 | T2 | Outcome | P/L | HTF | Raids |',
    '|---|---|---:|---:|---:|---:|---:|---|---:|---|---|',
    rows,
    '',
    '## Recommendations',
    ...report.recommendations.map((item) => `- ${item}`),
  ].join('\n');
}

export function buildDeskPlaybookAfterLunchEarliestProofPreviewReport(args: {
  sourceProofTimingPath?: string | null;
  replayPackagePath?: string | null;
  reviewedCaseIntakePath?: string | null;
  camouflageAuditPath?: string | null;
  sourceProofTimingReport?: SourceProofTimingReport | null;
  replayPackageReport?: ReplayPackageReport | null;
  reviewedCaseIntakeReport?: ReviewedCaseIntakeReport | null;
  camouflageAuditReport?: CamouflageAuditReport | null;
}, generatedAt = new Date().toISOString()): DeskPlaybookAfterLunchEarliestProofPreviewReport {
  const sourceProofTimingReport = args.sourceProofTimingReport ?? readJson<SourceProofTimingReport>(args.sourceProofTimingPath ?? null);
  const replayPackageReport = args.replayPackageReport ?? readJson<ReplayPackageReport>(args.replayPackagePath ?? null);
  const reviewedCaseIntakeReport = args.reviewedCaseIntakeReport ?? readJson<ReviewedCaseIntakeReport>(args.reviewedCaseIntakePath ?? null);
  const camouflageAuditReport = args.camouflageAuditReport ?? readJson<CamouflageAuditReport>(args.camouflageAuditPath ?? null);
  const sourceRows = sourceProofTimingReport?.rows || [];
  const afterLunchRows = sourceRows.filter((row) => row.setupType === SETUP && row.session === 'lunch');
  const replayPackageRows = replayPackageReport?.rows || [];
  const intakeRows = reviewedCaseIntakeReport?.rows || [];
  const camouflageRows = camouflageAuditReport?.rows || [];
  const tickets = buildPreviewTickets({ sourceRows: afterLunchRows, replayPackageRows, intakeRows, camouflageRows });
  const winners = tickets.filter(isWinner).length;
  const losses = tickets.filter(isLoss).length;
  const unresolved = tickets.length - winners - losses;
  const resolved = winners + losses;
  const joinedGeometryTickets = tickets.filter((ticket) => ticket.joinStatus === 'joined_ticket_geometry').length;
  const oneMesPl = sum(tickets.map((ticket) => ticket.oneMesPl));
  const blockers = [
    !sourceProofTimingReport ? 'missing source/proof timing report' : null,
    sourceProofTimingReport && sourceProofTimingReport.status !== 'pass' ? `source/proof timing status ${sourceProofTimingReport.status}` : null,
    !replayPackageReport ? 'missing replay package report for preview geometry' : null,
    replayPackageReport && replayPackageReport.status !== 'pass' ? `replay package status ${replayPackageReport.status}` : null,
    reviewedCaseIntakeReport && reviewedCaseIntakeReport.status !== 'pass' ? `reviewed-case intake status ${reviewedCaseIntakeReport.status}` : null,
    afterLunchRows.length === 0 ? 'no AfterLunchDriveFvgContinuation lunch source/proof rows found' : null,
    tickets.length === 0 ? 'no earliest-proof preview tickets produced' : null,
  ].filter((item): item is string => Boolean(item));
  const enoughPreview = tickets.length >= 15 && resolved >= 10 && oneMesPl !== null && oneMesPl > 0 && winners > losses;
  const recommendation: Recommendation = blockers.length
    ? 'fix_inputs'
    : enoughPreview
      ? 'candidate_for_scanner_owned_dry_run_contract'
      : 'hold_dry_run_preview';
  const recommendations = recommendation === 'candidate_for_scanner_owned_dry_run_contract'
    ? [
        'Proceed only to a scanner-owned dry-run contract for one earliest valid completed 5M AfterLunch ticket per lunch slate.',
        'Do not publish live yet; compare the dry-run ticket text against actual scanner state and trader readability first.',
        'Do not add the stopped proof-time enrichment selector; earliest completed 5M proof is the current candidate lane.',
      ]
    : blockers.length
      ? ['Fix saved source/proof timing and reviewed-case intake inputs before using this preview.']
      : ['Keep this preview research-only until a larger/cleaner dry run proves scanner-owned ticket quality.'];

  const base: Omit<DeskPlaybookAfterLunchEarliestProofPreviewReport, 'markdown'> = {
    reportType: 'desk_playbook_selector_afterlunch_earliest_proof_preview',
    generatedAt,
    status: blockers.length ? 'blocked' : 'pass',
    authority: {
      researchOnly: true,
      localOnly: true,
      dryRunPreviewOnly: true,
      readsSavedReportsOnly: true,
      outcomesUsedOnlyForMeasurement: true,
      runsSetupScanner: false,
      postsDiscord: false,
      writesSupabase: false,
      readsLiveBridge: false,
      changesScannerBehavior: false,
      changesTradingRules: false,
      changesCanExecute: false,
      changesEntryStopTargets: false,
    },
    source: {
      sourceProofTimingPath: args.sourceProofTimingPath ?? null,
      replayPackagePath: args.replayPackagePath ?? null,
      reviewedCaseIntakePath: args.reviewedCaseIntakePath ?? null,
      camouflageAuditPath: args.camouflageAuditPath ?? null,
    },
    summary: {
      sourceRows: sourceRows.length,
      afterLunchRows: afterLunchRows.length,
      previewTickets: tickets.length,
      joinedGeometryTickets,
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
  const sourceProofTimingPath = readFlag(args, '--source-proof-timing')
    || latestMatchingFile(reportDir, 'unified-positive-held-local-preview-replay-package-source-proof-timing-');
  const replayPackagePath = readFlag(args, '--replay-package')
    || latestMatchingFile(reportDir, 'raw-ohlc-scanner-artifact-replay-package-')
    || latestMatchingFile(reportDir, 'unified-positive-held-local-preview-replay-package-');
  const reviewedCaseIntakePath = readFlag(args, '--reviewed-case-intake')
    || latestMatchingFile(reportDir, 'unified-positive-held-local-preview-reviewed-case-intake-');
  const camouflageAuditPath = readFlag(args, '--camouflage-audit')
    || latestMatchingFile(reportDir, 'desk-playbook-selector-camouflage-audit-');
  const report = buildDeskPlaybookAfterLunchEarliestProofPreviewReport({
    sourceProofTimingPath,
    replayPackagePath,
    reviewedCaseIntakePath,
    camouflageAuditPath,
  });
  fs.mkdirSync(reportDir, { recursive: true });
  const outPath = path.join(reportDir, `desk-playbook-selector-afterlunch-earliest-proof-preview-${Date.now()}.json`);
  const markdownPath = outPath.replace(/\.json$/, '.md');
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, report.markdown);
  if (args.includes('--json')) {
    console.log(JSON.stringify({ outPath, markdownPath, summary: report.summary, blockers: report.blockers }, null, 2));
  } else {
    console.log(`AfterLunch earliest-proof preview written: ${outPath}`);
    console.log(`Recommendation: ${report.summary.recommendation}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
