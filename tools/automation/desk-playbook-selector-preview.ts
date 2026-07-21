import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

type Direction = 'LONG' | 'SHORT';
type SessionName = 'morning' | 'lunch';
type Movement =
  | 'bearish_drive'
  | 'bullish_drive'
  | 'high_raid_reversal_down'
  | 'low_raid_reversal_up'
  | string;

interface SelectedCandidate {
  setupType: string;
  direction: Direction;
  eventTime: string;
  executionStatus?: string;
  candidateState?: string | null;
  confidence?: string;
  rankScore?: number | null;
  modelConfidenceScore?: number | null;
  entry: number;
  stop: number;
  target1: number;
  target2: number;
  riskPoints: number;
  canExecute?: boolean | null;
  discordTradePlanEligible?: boolean | null;
  blockReason?: string | null;
  outcome?: {
    status: string;
    pnl: number;
    r?: number;
  };
  levelContextSummary?: string | null;
}

interface DayByDayRow {
  date: string;
  session: SessionName;
  movement: Movement;
  sessionStats?: {
    open: number;
    high: number;
    low: number;
    close: number;
    range: number;
    net: number;
    trend: string;
    bars: number;
  } | null;
  raids: Record<string, boolean>;
  htf: Record<string, { trend: string; bars?: number }>;
  completeCandidateCount: number;
  selected: SelectedCandidate | null;
}

interface DayByDayReport {
  reportType: string;
  generatedAt: string;
  provenanceSummary?: {
    artifactDates: number;
    currentRunCount: number;
    staleCount: number;
  };
  rows: DayByDayRow[];
}

interface DeskPlaybookTicket {
  date: string;
  session: SessionName;
  decision: 'watch' | 'no_trade';
  direction: Direction | 'NO TRADE';
  primaryModel: string | null;
  marketStory: string;
  primaryPlan: {
    entry: number;
    stop: number;
    riskPoints: number;
    target1: number;
    target2: number;
    proofTime: string;
  } | null;
  opposingScenario: string;
  invalidation: string;
  continuationPlan: string;
  failurePlan: string;
  why: string[];
  suppressedNoise: string[];
  authority: {
    humanReviewOnly: true;
    canExecuteChanged: false;
    discordEligibleChanged: false;
    generatedFromSavedResearch: true;
  };
}

interface DeskPlaybookSelectorPreviewReport {
  reportType: 'desk_playbook_selector_preview';
  generatedAt: string;
  authority: {
    researchOnly: true;
    localOnly: true;
    readsSavedDiagnosticReportOnly: true;
    runsSetupScanner: false;
    postsDiscord: false;
    writesSupabase: false;
    changesTradingRules: false;
    changesCanExecute: false;
    changesDiscordPosting: false;
  };
  source: {
    dayByDayReportPath: string;
  };
  summary: {
    sourceWindows: number;
    previewTickets: number;
    noTradeWindows: number;
    shortTickets: number;
    longTickets: number;
    currentRunArtifacts: number | null;
    staleArtifacts: number | null;
  };
  tickets: DeskPlaybookTicket[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const DRIVE_RAID_MOVEMENTS = new Set([
  'bearish_drive',
  'bullish_drive',
  'high_raid_reversal_down',
  'low_raid_reversal_up',
]);

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function latestDayByDayReport(reportDir: string): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => name.startsWith('ytd-full-scanner-day-by-day-market-move-best-model-map-') && name.endsWith('.json'))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function timeOnly(value: string): string {
  return value.slice(11, 16);
}

function directionForMovement(movement: Movement): Direction | null {
  if (movement === 'bearish_drive' || movement === 'high_raid_reversal_down') return 'SHORT';
  if (movement === 'bullish_drive' || movement === 'low_raid_reversal_up') return 'LONG';
  return null;
}

function activeRaids(row: DayByDayRow): string[] {
  return Object.entries(row.raids || {})
    .filter(([, active]) => active)
    .map(([name]) => name);
}

function htfStory(row: DayByDayRow): string {
  return ['15m', '60m', '120m', '240m']
    .map((tf) => `${tf}:${row.htf?.[tf]?.trend || 'data_limited'}`)
    .join(', ');
}

function htfBias(row: DayByDayRow, direction: Direction): 'supports' | 'mixed' | 'caution' | 'data_limited' {
  const trends = ['15m', '60m', '120m', '240m'].map((tf) => row.htf?.[tf]?.trend || 'data_limited');
  if (trends.some((trend) => trend === 'data_limited')) return 'data_limited';
  const wanted = direction === 'LONG' ? 'bullish' : 'bearish';
  const aligned = trends.filter((trend) => trend === wanted).length;
  const opposed = trends.filter((trend) => trend !== wanted && trend !== 'flat').length;
  if (aligned >= 3) return 'supports';
  if (opposed >= 3) return 'caution';
  return 'mixed';
}

function isCompleteFiveMinuteProof(row: DayByDayRow): boolean {
  const selected = row.selected;
  if (!selected) return false;
  return Number.isFinite(selected.entry)
    && Number.isFinite(selected.stop)
    && Number.isFinite(selected.target1)
    && Number.isFinite(selected.target2)
    && Number.isFinite(selected.riskPoints)
    && Boolean(selected.eventTime);
}

function noTradeTicket(row: DayByDayRow, reason: string): DeskPlaybookTicket {
  return {
    date: row.date,
    session: row.session,
    decision: 'no_trade',
    direction: 'NO TRADE',
    primaryModel: null,
    marketStory: `${row.movement}: ${reason}`,
    primaryPlan: null,
    opposingScenario: 'Wait for a fresh scanner-owned 5M plan before treating this window as actionable.',
    invalidation: 'No execution plan exists.',
    continuationPlan: 'No continuation plan. Market story alone is not execution authority.',
    failurePlan: 'No reversal plan. A failed idea still needs a completed 5M trigger and protected stop.',
    why: [reason],
    suppressedNoise: ['No complete model-backed 5M ticket selected for this window.'],
    authority: {
      humanReviewOnly: true,
      canExecuteChanged: false,
      discordEligibleChanged: false,
      generatedFromSavedResearch: true,
    },
  };
}

function buildTicket(row: DayByDayRow): DeskPlaybookTicket {
  const expectedDirection = directionForMovement(row.movement);
  if (!DRIVE_RAID_MOVEMENTS.has(row.movement)) {
    return noTradeTicket(row, 'Window is not a drive/raid movement state selected for Phase 1.');
  }
  if (!row.selected || !expectedDirection) {
    return noTradeTicket(row, 'No selected scanner candidate is available.');
  }
  if (row.selected.direction !== expectedDirection) {
    return noTradeTicket(row, `Selected model direction ${row.selected.direction} fights ${row.movement}.`);
  }
  if (!isCompleteFiveMinuteProof(row)) {
    return noTradeTicket(row, 'Selected model lacks complete deterministic 5M entry/stop/T1/T2 proof.');
  }
  const selected = row.selected;
  const raids = activeRaids(row);
  const htf = htfBias(row, selected.direction);
  const action = selected.direction === 'LONG' ? 'long' : 'short';
  const opposingAction = selected.direction === 'LONG' ? 'short' : 'long';
  const line = selected.direction === 'LONG' ? selected.stop : selected.stop;
  return {
    date: row.date,
    session: row.session,
    decision: 'watch',
    direction: selected.direction,
    primaryModel: selected.setupType,
    marketStory: [
      `${row.movement} favors ${selected.direction}`,
      raids.length ? `active raids: ${raids.join(', ')}` : 'no major overnight/prior-day raid flagged',
      `HTF map ${htf}: ${htfStory(row)}`,
    ].join(' | '),
    primaryPlan: {
      entry: selected.entry,
      stop: selected.stop,
      riskPoints: selected.riskPoints,
      target1: selected.target1,
      target2: selected.target2,
      proofTime: timeOnly(selected.eventTime),
    },
    opposingScenario: `If price rejects the ${action} path and closes back through the proof area, stand down and require a fresh completed 5M ${opposingAction} trigger.`,
    invalidation: `Invalid if price trades through the protected 5M stop near ${line}.`,
    continuationPlan: `Continuation: only consider the ${action} if price respects the completed 5M proof and entry near ${selected.entry}; app targets remain ${selected.target1} and ${selected.target2}.`,
    failurePlan: `Failure: if the proof fails, do not flip automatically. Wait for the opposing model to produce its own completed 5M entry, protected stop, T1, and T2.`,
    why: [
      `${selected.setupType} is the selected model-backed candidate.`,
      `${row.movement} direction agrees with ${selected.direction}.`,
      `Completed 5M proof exists at ${timeOnly(selected.eventTime)} with entry/stop/T1/T2.`,
      `HTF is ${htf}; HTF remains map/support/caution, not execution authority.`,
    ],
    suppressedNoise: [
      `Other model rows stay internal because the desk preview emits one primary ticket per window.`,
      `Raw canExecute and Discord eligibility are preserved, not changed.`,
    ],
    authority: {
      humanReviewOnly: true,
      canExecuteChanged: false,
      discordEligibleChanged: false,
      generatedFromSavedResearch: true,
    },
  };
}

function buildMarkdown(report: Omit<DeskPlaybookSelectorPreviewReport, 'markdown'>): string {
  const cell = (value: string): string => value.replace(/\|/g, '\\|');
  const rows = report.tickets.map((ticket) => {
    const plan = ticket.primaryPlan
      ? `${ticket.primaryPlan.entry}/${ticket.primaryPlan.stop}/${ticket.primaryPlan.target1}/${ticket.primaryPlan.target2}`
      : '-';
    return `| ${ticket.date} | ${ticket.session} | ${ticket.decision} | ${ticket.direction} | ${ticket.primaryModel || '-'} | ${plan} | ${cell(ticket.marketStory)} |`;
  }).join('\n');
  return [
    '# Desk Playbook Selector Preview',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    'Authority: research-only local preview. It reads a saved diagnostic report and does not run setupScanner, post Discord, write Supabase, change canExecute, or change trading rules.',
    '',
    '## Summary',
    `- Source windows: ${report.summary.sourceWindows}.`,
    `- Preview tickets: ${report.summary.previewTickets}.`,
    `- No-trade windows: ${report.summary.noTradeWindows}.`,
    `- Long tickets: ${report.summary.longTickets}.`,
    `- Short tickets: ${report.summary.shortTickets}.`,
    '',
    '## Preview Tickets',
    '',
    '| Date | Session | Decision | Direction | Primary Model | Entry/Stop/T1/T2 | Market Story |',
    '|---|---|---|---|---|---|---|',
    rows,
  ].join('\n');
}

export function buildDeskPlaybookSelectorPreviewReport(args: {
  dayByDayReportPath: string;
  report?: DayByDayReport;
}, generatedAt = new Date().toISOString()): DeskPlaybookSelectorPreviewReport {
  const sourceReport = args.report ?? JSON.parse(fs.readFileSync(args.dayByDayReportPath, 'utf8')) as DayByDayReport;
  const tickets = sourceReport.rows.map(buildTicket);
  const previewTickets = tickets.filter((ticket) => ticket.decision === 'watch');
  const report: Omit<DeskPlaybookSelectorPreviewReport, 'markdown'> = {
    reportType: 'desk_playbook_selector_preview',
    generatedAt,
    authority: {
      researchOnly: true,
      localOnly: true,
      readsSavedDiagnosticReportOnly: true,
      runsSetupScanner: false,
      postsDiscord: false,
      writesSupabase: false,
      changesTradingRules: false,
      changesCanExecute: false,
      changesDiscordPosting: false,
    },
    source: {
      dayByDayReportPath: args.dayByDayReportPath,
    },
    summary: {
      sourceWindows: sourceReport.rows.length,
      previewTickets: previewTickets.length,
      noTradeWindows: tickets.length - previewTickets.length,
      shortTickets: previewTickets.filter((ticket) => ticket.direction === 'SHORT').length,
      longTickets: previewTickets.filter((ticket) => ticket.direction === 'LONG').length,
      currentRunArtifacts: sourceReport.provenanceSummary?.currentRunCount ?? null,
      staleArtifacts: sourceReport.provenanceSummary?.staleCount ?? null,
    },
    tickets,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

async function main(): Promise<void> {
  const reportDir = path.resolve(readFlag(process.argv, '--report-dir') || DEFAULT_REPORT_DIR);
  const dayByDayReportPath = path.resolve(readFlag(process.argv, '--day-by-day-report') || latestDayByDayReport(reportDir) || '');
  if (!dayByDayReportPath || !fs.existsSync(dayByDayReportPath)) {
    throw new Error(`Missing day-by-day report. Pass --day-by-day-report or place one in ${reportDir}.`);
  }
  const report = buildDeskPlaybookSelectorPreviewReport({ dayByDayReportPath });
  const stamp = Date.now();
  const jsonPath = path.join(reportDir, `desk-playbook-selector-preview-${stamp}.json`);
  const mdPath = path.join(reportDir, `desk-playbook-selector-preview-${stamp}.md`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(mdPath, report.markdown);
  console.log(JSON.stringify({
    status: 'pass',
    jsonPath,
    mdPath,
    summary: report.summary,
  }, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
