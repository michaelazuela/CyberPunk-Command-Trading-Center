import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });
dotenv.config({ path: '.env.local', override: false, quiet: true });

type Direction = 'LONG' | 'SHORT';
type SessionName = 'morning' | 'lunch';
type RagAdjustment = 'boost' | 'penalty' | 'neutral' | 'insufficient_memory' | 'no_matching_memory';
type WeightedDecision = 'watch_boosted' | 'watch_caution' | 'watch_neutral' | 'watch_insufficient_memory';

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
}

interface RawRagMemoryRow {
  id?: string;
  session?: string;
  session_type?: string;
  setupType?: string;
  setup_type?: string;
  plan_source?: string;
  direction?: string;
  trade_result?: string;
  outcome?: string;
  manual_outcome?: string;
  pnl?: number | string | null;
  pnl_dollars?: number | string | null;
  trade_plan_json?: unknown;
  embedding_text?: string | null;
  notes?: string | null;
}

interface NormalizedRagMemoryRow {
  session: SessionName | null;
  setupType: string | null;
  direction: Direction | null;
  result: 'win' | 'loss' | 'scratch' | 'no_trade' | 'missed_trade' | 'pending' | 'unknown';
  pnlDollars: number | null;
}

interface MemoryStats {
  matchedRows: number;
  completedRows: number;
  wins: number;
  losses: number;
  scratches: number;
  noTrades: number;
  missedTrades: number;
  pending: number;
  averagePnlDollars: number | null;
  winRate: number | null;
}

interface WeightedTicket {
  date: string;
  session: SessionName;
  baseDecision: 'watch';
  weightedDecision: WeightedDecision;
  direction: Direction;
  primaryModel: string;
  entry: number;
  stop: number;
  target1: number;
  target2: number;
  riskPoints: number;
  ragAdjustment: RagAdjustment;
  memoryStats: MemoryStats;
  reason: string;
  authority: {
    researchOnly: true;
    humanReviewOnly: true;
    usesRagAsAdvisoryWeightOnly: true;
    changesCanExecute: false;
    changesTradingRules: false;
    postsDiscord: false;
    writesSupabase: false;
  };
}

interface DeskPlaybookRagWeightingPreviewReport {
  reportType: 'desk_playbook_selector_rag_weighting_preview';
  generatedAt: string;
  authority: {
    researchOnly: true;
    localOnly: true;
    readsSavedPreviewReport: true;
    mayReadSupabaseWhenFlagged: true;
    writesSupabase: false;
    postsDiscord: false;
    runsSetupScanner: false;
    changesTradingRules: false;
    changesCanExecute: false;
    usesRagAsAdvisoryWeightOnly: true;
  };
  source: {
    previewReportPath: string;
    ragMemoryJsonPath: string | null;
    supabaseReadAttempted: boolean;
    supabaseReadSucceeded: boolean;
    supabaseReadError: string | null;
  };
  summary: {
    sourcePreviewTickets: number;
    weightedTickets: number;
    boosted: number;
    penalized: number;
    neutral: number;
    insufficientMemory: number;
    noMatchingMemory: number;
    ragMemoryRowsRead: number;
  };
  tickets: WeightedTicket[];
  markdown: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPORT_DIR = path.join(__dirname, 'diagnostic-reports');
const KNOWN_MODELS = [
  'IntradayMssMicroContinuation',
  'HtfDisplacementMssContinuation',
  'HtfDisplacementFvgContinuation',
  'SweepMssFvgRetrace',
  'OpeningDriveFvgContinuation',
  'AfterLunchDriveFvgContinuation',
  'TurtleSoup',
];

function readFlag(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith('--')) return args[index + 1];
  const prefix = `${flag}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) || null;
}

function hasFlag(args: string[], flag: string): boolean {
  return args.includes(flag);
}

function latestPreviewReport(reportDir: string): string | null {
  if (!fs.existsSync(reportDir)) return null;
  return fs.readdirSync(reportDir)
    .filter((name) => name.startsWith('desk-playbook-selector-preview-') && name.endsWith('.json'))
    .map((name) => path.join(reportDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function nestedString(value: unknown, pathParts: string[]): string | null {
  let current: unknown = value;
  for (const part of pathParts) current = asObject(current)[part];
  return typeof current === 'string' && current.trim() ? current.trim() : null;
}

function normalizeSession(value: string | null | undefined): SessionName | null {
  const normalized = (value || '').toLowerCase();
  if (normalized.includes('morning')) return 'morning';
  if (normalized.includes('lunch') || normalized.includes('pm')) return 'lunch';
  return null;
}

function normalizeDirection(value: string | null | undefined): Direction | null {
  const normalized = (value || '').toUpperCase();
  if (normalized.includes('LONG') || normalized.includes('BULL')) return 'LONG';
  if (normalized.includes('SHORT') || normalized.includes('BEAR')) return 'SHORT';
  return null;
}

function normalizeResult(value: string | null | undefined): NormalizedRagMemoryRow['result'] {
  const normalized = (value || '').toLowerCase();
  if (normalized.includes('scratch') || normalized.includes('breakeven')) return 'scratch';
  if (normalized.includes('missed')) return 'missed_trade';
  if (normalized.includes('no_trade') || normalized.includes('no trade')) return 'no_trade';
  if (normalized.includes('pending') || normalized.includes('open')) return 'pending';
  if (normalized.includes('loss') || normalized.includes('stopped')) return 'loss';
  if (normalized.includes('win') || normalized.includes('t1') || normalized.includes('t2')) return 'win';
  return 'unknown';
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function deriveSetupType(row: RawRagMemoryRow): string | null {
  const json = row.trade_plan_json;
  const explicit = [
    row.setupType,
    row.setup_type,
    row.plan_source,
    nestedString(json, ['workflow_persistence', 'setupSubtype']),
    nestedString(json, ['workflow_persistence', 'selectedSetup', 'setupType']),
    nestedString(json, ['normalized_plan', 'setupType']),
  ].find((value) => value && value.trim());
  if (explicit) return explicit;
  const text = `${row.embedding_text || ''} ${row.notes || ''}`;
  return KNOWN_MODELS.find((model) => text.includes(model)) || null;
}

function deriveDirection(row: RawRagMemoryRow): Direction | null {
  const json = row.trade_plan_json;
  return normalizeDirection(row.direction)
    || normalizeDirection(nestedString(json, ['workflow_persistence', 'selectedSetup', 'direction']))
    || normalizeDirection(nestedString(json, ['finalTradePlan', 'direction']))
    || normalizeDirection(`${row.embedding_text || ''} ${row.notes || ''}`);
}

function normalizeMemoryRow(row: RawRagMemoryRow): NormalizedRagMemoryRow {
  return {
    session: normalizeSession(row.session_type || row.session),
    setupType: deriveSetupType(row),
    direction: deriveDirection(row),
    result: normalizeResult(row.trade_result || row.outcome || row.manual_outcome),
    pnlDollars: normalizeNumber(row.pnl_dollars ?? row.pnl),
  };
}

function memoryStatsForTicket(ticket: DeskPlaybookTicket, memoryRows: NormalizedRagMemoryRow[]): MemoryStats {
  if (ticket.decision !== 'watch' || ticket.direction === 'NO TRADE' || !ticket.primaryModel) {
    throw new Error('RAG weighting only accepts watch tickets.');
  }
  const matches = memoryRows.filter((row) => row.session === ticket.session
    && row.setupType === ticket.primaryModel
    && row.direction === ticket.direction);
  const completed = matches.filter((row) => row.result === 'win' || row.result === 'loss' || row.result === 'scratch');
  const pnlValues = completed
    .map((row) => row.pnlDollars)
    .filter((value): value is number => value !== null);
  const wins = completed.filter((row) => row.result === 'win').length;
  const losses = completed.filter((row) => row.result === 'loss').length;
  const scratches = completed.filter((row) => row.result === 'scratch').length;
  return {
    matchedRows: matches.length,
    completedRows: completed.length,
    wins,
    losses,
    scratches,
    noTrades: matches.filter((row) => row.result === 'no_trade').length,
    missedTrades: matches.filter((row) => row.result === 'missed_trade').length,
    pending: matches.filter((row) => row.result === 'pending' || row.result === 'unknown').length,
    averagePnlDollars: pnlValues.length
      ? Number((pnlValues.reduce((sum, value) => sum + value, 0) / pnlValues.length).toFixed(2))
      : null,
    winRate: completed.length ? Number((wins / completed.length).toFixed(4)) : null,
  };
}

function classifyAdjustment(stats: MemoryStats): { adjustment: RagAdjustment; decision: WeightedDecision; reason: string } {
  if (stats.matchedRows === 0) {
    return {
      adjustment: 'no_matching_memory',
      decision: 'watch_insufficient_memory',
      reason: 'No matching RAG outcome rows for this session/model/direction.',
    };
  }
  if (stats.completedRows < 3) {
    return {
      adjustment: 'insufficient_memory',
      decision: 'watch_insufficient_memory',
      reason: `Only ${stats.completedRows} completed matching outcome rows; keep as unweighted review.`,
    };
  }
  if ((stats.winRate ?? 0) >= 0.7 && (stats.averagePnlDollars ?? 0) >= 0) {
    return {
      adjustment: 'boost',
      decision: 'watch_boosted',
      reason: `RAG memory supports this lane: ${stats.wins}-${stats.losses}-${stats.scratches}, avg P/L ${stats.averagePnlDollars}.`,
    };
  }
  if ((stats.winRate ?? 1) <= 0.4 || (stats.averagePnlDollars ?? 0) < 0) {
    return {
      adjustment: 'penalty',
      decision: 'watch_caution',
      reason: `RAG memory cautions this lane: ${stats.wins}-${stats.losses}-${stats.scratches}, avg P/L ${stats.averagePnlDollars}.`,
    };
  }
  return {
    adjustment: 'neutral',
    decision: 'watch_neutral',
    reason: `RAG memory is mixed: ${stats.wins}-${stats.losses}-${stats.scratches}, avg P/L ${stats.averagePnlDollars}.`,
  };
}

function weightTicket(ticket: DeskPlaybookTicket, memoryRows: NormalizedRagMemoryRow[]): WeightedTicket | null {
  if (ticket.decision !== 'watch' || ticket.direction === 'NO TRADE' || !ticket.primaryModel || !ticket.primaryPlan) return null;
  const stats = memoryStatsForTicket(ticket, memoryRows);
  const classification = classifyAdjustment(stats);
  return {
    date: ticket.date,
    session: ticket.session,
    baseDecision: 'watch',
    weightedDecision: classification.decision,
    direction: ticket.direction,
    primaryModel: ticket.primaryModel,
    entry: ticket.primaryPlan.entry,
    stop: ticket.primaryPlan.stop,
    target1: ticket.primaryPlan.target1,
    target2: ticket.primaryPlan.target2,
    riskPoints: ticket.primaryPlan.riskPoints,
    ragAdjustment: classification.adjustment,
    memoryStats: stats,
    reason: classification.reason,
    authority: {
      researchOnly: true,
      humanReviewOnly: true,
      usesRagAsAdvisoryWeightOnly: true,
      changesCanExecute: false,
      changesTradingRules: false,
      postsDiscord: false,
      writesSupabase: false,
    },
  };
}

async function readSupabaseRagRows(args: {
  instrument: string;
  limit: number;
}): Promise<{ rows: RawRagMemoryRow[]; error: string | null }> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const userId = process.env.DISCORD_RAG_USER_ID || '';
  if (!supabaseUrl || !serviceRoleKey || !userId) {
    return {
      rows: [],
      error: 'Missing SUPABASE_URL/VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or DISCORD_RAG_USER_ID.',
    };
  }
  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client
    .from('trade_embeddings')
    .select([
      'id',
      'session_type',
      'trade_date',
      'instrument',
      'trade_result',
      'outcome',
      'pnl_dollars',
      'pnl_ticks',
      'entry_price',
      'stop_price',
      'target_1_price',
      'target_2_price',
      'risk_points',
      'plan_source',
      'embedding_text',
      'notes',
      'trade_plan_json',
      'source',
      'analysis_mode',
    ].join(','))
    .eq('user_id', userId)
    .eq('instrument', args.instrument)
    .order('created_at', { ascending: false })
    .limit(args.limit);
  if (error) return { rows: [], error: error.message };
  return { rows: (data || []) as RawRagMemoryRow[], error: null };
}

function buildMarkdown(report: Omit<DeskPlaybookRagWeightingPreviewReport, 'markdown'>): string {
  const cell = (value: string): string => value.replace(/\|/g, '\\|');
  const rows = report.tickets.map((ticket) => {
    const stats = ticket.memoryStats;
    return [
      `| ${ticket.date}`,
      ticket.session,
      ticket.direction,
      ticket.primaryModel,
      ticket.weightedDecision,
      ticket.ragAdjustment,
      `${stats.wins}-${stats.losses}-${stats.scratches}`,
      String(stats.noTrades),
      String(stats.missedTrades),
      stats.averagePnlDollars === null ? '-' : String(stats.averagePnlDollars),
      `${ticket.entry}/${ticket.stop}/${ticket.target1}/${ticket.target2}`,
      `${cell(ticket.reason)} |`,
    ].join(' | ');
  }).join('\n');
  return [
    '# Desk Playbook Selector RAG Weighting Preview',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    'Authority: research-only local preview. RAG/outcome memory is advisory weighting only; this does not approve trades, change canExecute, post Discord, write Supabase, run setupScanner, or change trading rules.',
    '',
    '## Summary',
    `- Source preview tickets: ${report.summary.sourcePreviewTickets}.`,
    `- Weighted tickets: ${report.summary.weightedTickets}.`,
    `- Boosted: ${report.summary.boosted}.`,
    `- Penalized: ${report.summary.penalized}.`,
    `- Neutral: ${report.summary.neutral}.`,
    `- Insufficient memory: ${report.summary.insufficientMemory}.`,
    `- No matching memory: ${report.summary.noMatchingMemory}.`,
    `- RAG memory rows read: ${report.summary.ragMemoryRowsRead}.`,
    '',
    '## Weighted Tickets',
    '',
    '| Date | Session | Direction | Primary Model | Weighted Decision | RAG Adjustment | W-L-S | No Trade | Missed | Avg P/L | Entry/Stop/T1/T2 | Reason |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|',
    rows,
  ].join('\n');
}

export async function buildDeskPlaybookRagWeightingPreviewReport(args: {
  previewReportPath: string;
  previewReport?: DeskPlaybookSelectorPreviewReport;
  ragMemoryRows?: RawRagMemoryRow[];
  ragMemoryJsonPath?: string | null;
  readSupabase?: boolean;
  instrument?: string;
  limit?: number;
}, generatedAt = new Date().toISOString()): Promise<DeskPlaybookRagWeightingPreviewReport> {
  const previewReport = args.previewReport ?? readJsonFile<DeskPlaybookSelectorPreviewReport>(args.previewReportPath);
  const localRows = args.ragMemoryRows ?? (args.ragMemoryJsonPath ? readJsonFile<RawRagMemoryRow[]>(args.ragMemoryJsonPath) : []);
  let supabaseRows: RawRagMemoryRow[] = [];
  let supabaseReadError: string | null = null;
  if (args.readSupabase) {
    const result = await readSupabaseRagRows({
      instrument: args.instrument || 'MES',
      limit: args.limit || 500,
    });
    supabaseRows = result.rows;
    supabaseReadError = result.error;
  }
  const rawMemoryRows = [...localRows, ...supabaseRows];
  const memoryRows = rawMemoryRows.map(normalizeMemoryRow);
  const tickets = previewReport.tickets
    .map((ticket) => weightTicket(ticket, memoryRows))
    .filter((ticket): ticket is WeightedTicket => Boolean(ticket));
  const report: Omit<DeskPlaybookRagWeightingPreviewReport, 'markdown'> = {
    reportType: 'desk_playbook_selector_rag_weighting_preview',
    generatedAt,
    authority: {
      researchOnly: true,
      localOnly: true,
      readsSavedPreviewReport: true,
      mayReadSupabaseWhenFlagged: true,
      writesSupabase: false,
      postsDiscord: false,
      runsSetupScanner: false,
      changesTradingRules: false,
      changesCanExecute: false,
      usesRagAsAdvisoryWeightOnly: true,
    },
    source: {
      previewReportPath: args.previewReportPath,
      ragMemoryJsonPath: args.ragMemoryJsonPath || null,
      supabaseReadAttempted: Boolean(args.readSupabase),
      supabaseReadSucceeded: Boolean(args.readSupabase) && !supabaseReadError,
      supabaseReadError,
    },
    summary: {
      sourcePreviewTickets: previewReport.summary.previewTickets,
      weightedTickets: tickets.length,
      boosted: tickets.filter((ticket) => ticket.ragAdjustment === 'boost').length,
      penalized: tickets.filter((ticket) => ticket.ragAdjustment === 'penalty').length,
      neutral: tickets.filter((ticket) => ticket.ragAdjustment === 'neutral').length,
      insufficientMemory: tickets.filter((ticket) => ticket.ragAdjustment === 'insufficient_memory').length,
      noMatchingMemory: tickets.filter((ticket) => ticket.ragAdjustment === 'no_matching_memory').length,
      ragMemoryRowsRead: rawMemoryRows.length,
    },
    tickets,
  };
  return { ...report, markdown: buildMarkdown(report) };
}

async function main(): Promise<void> {
  const reportDir = path.resolve(readFlag(process.argv, '--report-dir') || DEFAULT_REPORT_DIR);
  const previewReportPath = path.resolve(readFlag(process.argv, '--preview-report') || latestPreviewReport(reportDir) || '');
  if (!previewReportPath || !fs.existsSync(previewReportPath)) {
    throw new Error(`Missing desk selector preview report. Pass --preview-report or place one in ${reportDir}.`);
  }
  const ragMemoryJsonFlag = readFlag(process.argv, '--rag-memory-json');
  const report = await buildDeskPlaybookRagWeightingPreviewReport({
    previewReportPath,
    ragMemoryJsonPath: ragMemoryJsonFlag ? path.resolve(ragMemoryJsonFlag) : null,
    readSupabase: hasFlag(process.argv, '--read-supabase'),
    instrument: readFlag(process.argv, '--instrument') || 'MES',
    limit: Number(readFlag(process.argv, '--limit') || 500),
  });
  const stamp = Date.now();
  const jsonPath = path.join(reportDir, `desk-playbook-selector-rag-weighting-preview-${stamp}.json`);
  const mdPath = path.join(reportDir, `desk-playbook-selector-rag-weighting-preview-${stamp}.md`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(mdPath, report.markdown);
  console.log(JSON.stringify({
    status: report.source.supabaseReadError ? 'warning' : 'pass',
    jsonPath,
    mdPath,
    summary: report.summary,
    supabase: {
      attempted: report.source.supabaseReadAttempted,
      succeeded: report.source.supabaseReadSucceeded,
      error: report.source.supabaseReadError,
    },
  }, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
